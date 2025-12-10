// VAPID Public Key for Web Push notifications
// IMPORTANTE: Sostituisci questa stringa con la tua VAPID Public Key generata da https://vapidkeys.com/
// La chiave privata è già salvata nei secrets di Lovable Cloud
export const VAPID_PUBLIC_KEY =
  "BIkb7HBQksUUY7Q23mAIVqNLexWzlEuEp7MtkRaUR_VkSepJM_Jw0kqqMkGHYvHSnAScnXSD9ep7fg9uVaB_VSs";

// Convert VAPID key from base64 to Uint8Array for PushManager
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
