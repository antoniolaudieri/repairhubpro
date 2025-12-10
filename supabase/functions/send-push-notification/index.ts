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

// Base64URL encode/decode utilities
function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

// Concatenate Uint8Arrays
function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// Convert Uint8Array to ArrayBuffer (fixes type issues)
function toBuffer(arr: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(arr.length);
  new Uint8Array(buffer).set(arr);
  return buffer;
}

// HKDF implementation using Web Crypto
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    toBuffer(ikm),
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );
  
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: toBuffer(salt),
      info: toBuffer(info),
    },
    key,
    length * 8
  );
  
  return new Uint8Array(bits);
}

// Create VAPID JWT
async function createVapidJwt(
  audience: string,
  subject: string,
  publicKey: string,
  privateKey: string
): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Decode VAPID keys
  const pubKeyBytes = base64UrlDecode(publicKey);
  const privKeyBytes = base64UrlDecode(privateKey);

  // Create JWK for signing
  const x = base64UrlEncode(pubKeyBytes.slice(1, 33));
  const y = base64UrlEncode(pubKeyBytes.slice(33, 65));
  const d = base64UrlEncode(privKeyBytes);

  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x,
    y,
    d,
  };

  const signingKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert signature to compact format
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  return `${unsignedToken}.${signatureB64}`;
}

// Encrypt push message using Web Push encryption (aes128gcm)
async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const payloadBytes = new TextEncoder().encode(payload);
  
  // Decode subscription keys
  const userPublicKeyBytes = base64UrlDecode(p256dh);
  const userAuthBytes = base64UrlDecode(auth);
  
  // Generate local key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  
  // Export local public key
  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);
  
  // Import user's public key
  const userPublicKey = await crypto.subtle.importKey(
    'raw',
    toBuffer(userPublicKeyBytes),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  
  // Derive shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: userPublicKey },
    localKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);
  
  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Create info strings
  const keyInfoStr = 'WebPush: info\x00';
  const keyInfo = concat(
    new TextEncoder().encode(keyInfoStr),
    userPublicKeyBytes,
    localPublicKey
  );
  
  // Derive IKM using HKDF
  const ikm = await hkdf(userAuthBytes, sharedSecret, keyInfo, 32);
  
  // Derive content encryption key and nonce
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\x00');
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\x00');
  
  const cek = await hkdf(salt, ikm, cekInfo, 16);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);
  
  // Pad payload (add delimiter)
  const paddedPayload = concat(payloadBytes, new Uint8Array([2]));
  
  // Encrypt with AES-GCM
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    toBuffer(cek),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBuffer(nonce) },
    cryptoKey,
    toBuffer(paddedPayload)
  );
  
  return {
    ciphertext: new Uint8Array(encrypted),
    salt,
    localPublicKey,
  };
}

// Build aes128gcm encrypted body
function buildAes128GcmBody(
  ciphertext: Uint8Array,
  salt: Uint8Array,
  localPublicKey: Uint8Array
): Uint8Array {
  // aes128gcm format: salt (16) || rs (4) || idlen (1) || keyid (65) || ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false); // record size
  
  const idlen = new Uint8Array([65]); // length of public key
  
  return concat(salt, rs, idlen, localPublicKey, ciphertext);
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

    // Send push notifications with proper encryption
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const endpoint = new URL(sub.endpoint);
          const audience = `${endpoint.protocol}//${endpoint.host}`;

          // Create VAPID JWT
          const jwt = await createVapidJwt(
            audience,
            "mailto:noreply@lablinkriparo.it",
            vapidPublicKey,
            vapidPrivateKey
          );

          // Encrypt the payload
          const { ciphertext, salt, localPublicKey } = await encryptPayload(
            notificationPayload,
            sub.p256dh,
            sub.auth
          );

          // Build the encrypted body
          const body = buildAes128GcmBody(ciphertext, salt, localPublicKey);

          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Encoding": "aes128gcm",
              "Content-Length": body.length.toString(),
              "TTL": "86400",
              "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
            },
            body: toBuffer(body),
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
