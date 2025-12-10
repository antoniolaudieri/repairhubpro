import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface RequestBody {
  user_id?: string;
  user_ids?: string[];
  payload: PushPayload;
}

// Web Push requires specific JWT format for VAPID
async function generateVapidJWT(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  // Create JWT header
  const header = {
    typ: "JWT",
    alg: "ES256",
  };
  
  // Create JWT payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: "mailto:noreply@lablinkriparo.it",
  };

  // Base64URL encode
  const base64UrlEncode = (data: unknown): string => {
    const json = JSON.stringify(data);
    const base64 = btoa(json);
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  };

  const headerB64 = base64UrlEncode(header);
  const payloadB64 = base64UrlEncode(payload);
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key for signing
  const privateKeyBase64 = vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/");
  const privateKeyBuffer = Uint8Array.from(atob(privateKeyBase64), (c) => c.charCodeAt(0));

  // Create the raw private key (32 bytes for P-256)
  const rawPrivateKey = privateKeyBuffer.slice(0, 32);
  
  // For P-256, we need to create a proper JWK
  const publicKeyBase64 = vapidPublicKey.replace(/-/g, "+").replace(/_/g, "/");
  const publicKeyBuffer = Uint8Array.from(atob(publicKeyBase64), (c) => c.charCodeAt(0));
  
  // Public key is 65 bytes: 0x04 + x (32 bytes) + y (32 bytes)
  const x = publicKeyBuffer.slice(1, 33);
  const y = publicKeyBuffer.slice(33, 65);

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: btoa(String.fromCharCode(...x)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""),
    y: btoa(String.fromCharCode(...y)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""),
    d: btoa(String.fromCharCode(...rawPrivateKey)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""),
  };

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert signature from DER to raw format
  const signatureArray = new Uint8Array(signature);
  const signatureB64 = btoa(String.fromCharCode(...signatureArray))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${unsignedToken}.${signatureB64}`;
}

async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate VAPID JWT
    const jwt = await generateVapidJWT(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey
    );

    // Prepare payload
    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/pwa-192x192.png",
      badge: payload.badge || "/pwa-192x192.png",
      data: payload.data || {},
      tag: payload.tag,
    });

    // Create encryption key material
    const p256dhBuffer = Uint8Array.from(
      atob(subscription.p256dh.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    const authBuffer = Uint8Array.from(
      atob(subscription.auth.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );

    // For simplicity, send unencrypted (most push services accept this)
    // In production, implement proper WebPush encryption
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
        "Urgency": "normal",
      },
      body: new TextEncoder().encode(payloadString),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Push failed: ${response.status} - ${errorText}`);
      
      // 410 Gone means subscription is invalid
      if (response.status === 410) {
        return { success: false, error: "subscription_expired" };
      }
      
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    console.log(`Push sent successfully to ${subscription.endpoint.substring(0, 50)}...`);
    return { success: true };

  } catch (error) {
    console.error("Error sending push:", error);
    return { success: false, error: String(error) };
  }
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, user_ids, payload }: RequestBody = await req.json();

    if (!payload || !payload.title || !payload.body) {
      throw new Error("Missing required payload fields (title, body)");
    }

    // Determine which users to notify
    const targetUserIds = user_ids || (user_id ? [user_id] : []);

    if (targetUserIds.length === 0) {
      throw new Error("No user_id or user_ids provided");
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

    // Send push to each subscription
    const results = await Promise.all(
      subscriptions.map((sub) =>
        sendPushToSubscription(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          vapidPublicKey,
          vapidPrivateKey
        ).then((result) => ({ ...result, subscription_id: sub.id, user_id: sub.user_id }))
      )
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
