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

// Base64URL encode
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Base64URL decode
function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

// Create VAPID JWT token
async function createVapidJwt(
  audience: string,
  subject: string,
  publicKeyBase64: string,
  privateKeyBase64: string
): Promise<{ token: string; publicKey: string }> {
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key as JWK
  const privateKeyBytes = base64UrlDecode(privateKeyBase64);
  const publicKeyBytes = base64UrlDecode(publicKeyBase64);
  
  // Create JWK from raw keys (VAPID keys are raw 32-byte values)
  // Public key is 65 bytes (uncompressed point: 0x04 || x || y)
  // Private key is 32 bytes (d value)
  
  // Extract x and y from public key (skip the 0x04 prefix if present)
  const pubKeyData = publicKeyBytes.length === 65 ? publicKeyBytes.slice(1) : publicKeyBytes;
  const x = base64UrlEncode(pubKeyData.slice(0, 32));
  const y = base64UrlEncode(pubKeyData.slice(32, 64));
  const d = base64UrlEncode(privateKeyBytes);

  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x,
    y,
    d,
  };

  const privateKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert from DER to raw signature format (r || s)
  const signature = new Uint8Array(signatureBuffer);
  const signatureB64 = base64UrlEncode(signature);

  return {
    token: `${unsignedToken}.${signatureB64}`,
    publicKey: publicKeyBase64,
  };
}

serve(async (req) => {
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

    const requestBody = await req.json();
    
    let payload: PushPayload;
    let targetUserIds: string[] = [];
    
    if (requestBody.payload) {
      payload = requestBody.payload;
      targetUserIds = requestBody.user_ids || (requestBody.user_id ? [requestBody.user_id] : []);
    } else {
      payload = {
        title: requestBody.title,
        body: requestBody.body,
        icon: requestBody.icon,
        badge: requestBody.badge,
        data: requestBody.data,
        tag: requestBody.tag,
      };
      const userId = requestBody.userId || requestBody.user_id;
      targetUserIds = requestBody.user_ids || (userId ? [userId] : []);
    }

    if (!payload.title || !payload.body) {
      throw new Error("Missing required payload fields (title, body)");
    }

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
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscription(s)`);

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/pwa-192x192.png",
      badge: payload.badge || "/pwa-192x192.png",
      data: payload.data || {},
      tag: payload.tag,
    });

    // Send push notifications with VAPID authentication
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const endpoint = new URL(sub.endpoint);
          const audience = `${endpoint.protocol}//${endpoint.host}`;

          // Create VAPID JWT
          const { token, publicKey } = await createVapidJwt(
            audience,
            "mailto:noreply@lablinkriparo.it",
            vapidPublicKey,
            vapidPrivateKey
          );

          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "TTL": "86400",
              "Authorization": `vapid t=${token}, k=${publicKey}`,
            },
            body: notificationPayload,
          });

          if (response.ok || response.status === 201) {
            console.log(`Push sent successfully to ${sub.endpoint.substring(0, 50)}...`);
            return { success: true, subscription_id: sub.id, user_id: sub.user_id };
          } else {
            const errorText = await response.text();
            console.error(`Push failed for ${sub.endpoint.substring(0, 50)}: ${response.status} - ${errorText}`);
            
            if (response.status === 410 || response.status === 404) {
              return { success: false, error: "subscription_expired", subscription_id: sub.id, user_id: sub.user_id };
            }
            
            return { success: false, error: `${response.status}: ${errorText}`, subscription_id: sub.id, user_id: sub.user_id };
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Push failed for ${sub.endpoint.substring(0, 50)}:`, errorMessage);
          return { success: false, error: errorMessage, subscription_id: sub.id, user_id: sub.user_id };
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
