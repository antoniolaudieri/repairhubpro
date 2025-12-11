import { supabase } from "@/integrations/supabase/client";

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Send push notification to specific user(s) via edge function
 * Works even when app is closed (real push notification)
 */
export async function sendPushNotification(
  userIds: string[],
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  console.log("[PushService] sendPushNotification called with:", { userIds, payload });
  
  if (!userIds || userIds.length === 0) {
    console.error("[PushService] No userIds provided");
    return { success: false, error: "No userIds provided" };
  }
  
  try {
    console.log("[PushService] Invoking send-push-notification edge function...");
    const { data, error } = await supabase.functions.invoke("send-push-notification", {
      body: {
        user_ids: userIds,
        payload,
      },
    });

    if (error) {
      console.error("[PushService] Edge function error:", error);
      return { success: false, error: error.message };
    }

    console.log("[PushService] Edge function response:", data);
    return { success: true };
  } catch (err) {
    console.error("[PushService] Exception:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Get user_id for a Centro by centro_id
 */
export async function getCentroUserId(centroId: string): Promise<string | null> {
  const { data } = await supabase
    .from("centri_assistenza")
    .select("owner_user_id")
    .eq("id", centroId)
    .single();
  
  return data?.owner_user_id || null;
}

/**
 * Get user_id for a Corner by corner_id
 */
export async function getCornerUserId(cornerId: string): Promise<string | null> {
  const { data } = await supabase
    .from("corners")
    .select("user_id")
    .eq("id", cornerId)
    .single();
  
  return data?.user_id || null;
}

/**
 * Get user_id for a customer by email (if they have an account)
 */
export async function getCustomerUserId(email: string): Promise<string | null> {
  // Find user with customer role matching this email
  const { data: roles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "customer");
  
  if (!roles || roles.length === 0) return null;
  
  // Check push_subscriptions to find if any of these users have the matching email
  // Since we can't query auth.users directly, we check subscriptions
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id")
    .in("user_id", roles.map(r => r.user_id));
  
  // Return first matching user_id that has a subscription
  return subs?.[0]?.user_id || null;
}

/**
 * Status labels for notifications
 */
const statusLabels: Record<string, string> = {
  pending: "In Attesa",
  "in-progress": "In Lavorazione",
  waiting_for_parts: "In Attesa Ricambi",
  completed: "Completata",
  delivered: "Consegnata",
  cancelled: "Annullata",
  forfeited: "Alienata",
};

/**
 * Get notification message based on status
 */
function getStatusNotificationMessage(status: string, deviceName: string): { title: string; body: string } {
  switch (status) {
    case "pending":
      return {
        title: "📱 Riparazione Registrata",
        body: `La tua riparazione per ${deviceName} è stata registrata. Ti aggiorneremo sullo stato.`,
      };
    case "in-progress":
      return {
        title: "🔧 Riparazione in Corso",
        body: `Stiamo lavorando al tuo ${deviceName}. Ti avviseremo appena completata.`,
      };
    case "waiting_for_parts":
      return {
        title: "📦 In Attesa Ricambi",
        body: `Stiamo aspettando i ricambi per il tuo ${deviceName}. Ti avviseremo appena arrivano.`,
      };
    case "completed":
      return {
        title: "✅ Riparazione Completata!",
        body: `Il tuo ${deviceName} è pronto per il ritiro! Passa a ritirarlo.`,
      };
    case "delivered":
      return {
        title: "🎉 Dispositivo Consegnato",
        body: `Grazie per aver scelto il nostro servizio! Speriamo di rivederti presto.`,
      };
    case "cancelled":
      return {
        title: "❌ Riparazione Annullata",
        body: `La riparazione del tuo ${deviceName} è stata annullata.`,
      };
    default:
      return {
        title: "📱 Aggiornamento Riparazione",
        body: `Lo stato della riparazione del tuo ${deviceName} è cambiato: ${statusLabels[status] || status}`,
      };
  }
}

/**
 * Send notification to customer when repair status changes
 */
export async function notifyCustomerStatusChange(
  repairId: string,
  newStatus: string,
  customerEmail?: string | null
): Promise<void> {
  try {
    // Get repair details with device info
    const { data: repair } = await supabase
      .from("repairs")
      .select(`
        id,
        customer_email,
        device:devices (
          brand,
          model,
          device_type,
          customer:customers (
            email,
            name
          )
        )
      `)
      .eq("id", repairId)
      .single();

    if (!repair) {
      console.log("[PushService] Repair not found:", repairId);
      return;
    }

    const device = repair.device as any;
    const email = customerEmail || repair.customer_email || device?.customer?.email;
    
    if (!email) {
      console.log("[PushService] No customer email found for repair:", repairId);
      return;
    }

    const deviceName = `${device?.brand || ""} ${device?.model || device?.device_type || "dispositivo"}`.trim();
    const { title, body } = getStatusNotificationMessage(newStatus, deviceName);

    // Try to find user_id for push notification
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "customer");

    if (userRoles && userRoles.length > 0) {
      // Check which user has push subscription
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("user_id")
        .in("user_id", userRoles.map(r => r.user_id));

      if (subs && subs.length > 0) {
        // Send push to all customer subscriptions (they'll filter by email match on their end)
        const userIds = [...new Set(subs.map(s => s.user_id))];
        
        await sendPushNotification(userIds, {
          title,
          body,
          data: { 
            url: "/customer",
            repairId,
            status: newStatus,
          },
        });
        
        console.log("[PushService] Customer push notification sent for repair:", repairId);
      }
    }

    // Also create in-app notification
    await supabase.from("customer_notifications").insert({
      customer_email: email,
      title,
      message: body,
      type: "repair_status",
      data: { repairId, status: newStatus },
    });

    console.log("[PushService] Customer notification created for:", email);
  } catch (error) {
    console.error("[PushService] Error notifying customer:", error);
  }
}
