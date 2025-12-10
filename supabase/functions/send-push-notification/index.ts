import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  tag?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID keys not configured");
    }

    // Configure web-push with VAPID details
    webpush.setVapidDetails(
      "mailto:noreply@lablinkriparo.it",
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody = await req.json();
    
    // Support both formats:
    // 1. { payload: { title, body }, user_id/user_ids }
    // 2. { title, body, userId/user_id/user_ids } (flat format from frontend)
    let payload: PushPayload;
    let targetUserIds: string[] = [];
    
    if (requestBody.payload) {
      // Nested format
      payload = requestBody.payload;
      targetUserIds = requestBody.user_ids || (requestBody.user_id ? [requestBody.user_id] : []);
    } else {
      // Flat format from frontend
      payload = {
        title: requestBody.title,
        body: requestBody.body,
        icon: requestBody.icon,
        badge: requestBody.badge,
        data: requestBody.data,
        tag: requestBody.tag,
      };
      // Support both userId (camelCase) and user_id (snake_case)
      const userId = requestBody.userId || requestBody.user_id;
      targetUserIds = requestBody.user_ids || (userId ? [userId] : []);
    }

    if (!payload.title || !payload.body) {
      throw new Error("Missing required payload fields (title, body)");
    }

    // If no specific users, get all users with subscriptions
    if (targetUserIds.length === 0) {
      console.log("No specific user_id provided, fetching all subscribed users");
      const { data: allSubs } = await supabase
        .from("push_subscriptions")
        .select("user_id")
        .not("user_id", "is", null);
      
      if (allSubs && allSubs.length > 0) {
        targetUserIds = [...new Set(allSubs.map(s => s.user_id).filter(Boolean))] as string[];
      }
    }

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending push to ${targetUserIds.length} user(s):`, targetUserIds);

    // Get subscriptions for target users
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds);

    if (fetchError) {
      throw new Error(`Error fetching subscriptions: ${fetchError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for target users");
      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: 0, 
          message: "No subscriptions found" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscription(s)`);

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/pwa-192x192.png",
      badge: payload.badge || "/pwa-192x192.png",
      data: payload.data || {},
      tag: payload.tag,
    });

    // Send push to each subscription using web-push library
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          await webpush.sendNotification(pushSubscription, notificationPayload);
          console.log(`Push sent successfully to ${sub.endpoint.substring(0, 50)}...`);
          return { success: true, subscription_id: sub.id, user_id: sub.user_id };
        } catch (error: any) {
          console.error(`Push failed for ${sub.endpoint.substring(0, 50)}:`, error.message);
          
          // 410 Gone or 404 means subscription is invalid/expired
          if (error.statusCode === 410 || error.statusCode === 404) {
            return { success: false, error: "subscription_expired", subscription_id: sub.id, user_id: sub.user_id };
          }
          
          return { success: false, error: error.message, subscription_id: sub.id, user_id: sub.user_id };
        }
      })
    );

    // Clean up expired subscriptions
    const expiredSubs = results.filter((r) => r.error === "subscription_expired");
    if (expiredSubs.length > 0) {
      console.log(`Removing ${expiredSubs.length} expired subscription(s)`);
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", expiredSubs.map((s) => s.subscription_id));
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(`Push results: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        total: subscriptions.length,
        results: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});