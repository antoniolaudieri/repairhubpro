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
