import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { sendPushNotification, getCornerUserId } from "@/services/pushNotificationService";

interface CornerNotification {
  id: string;
  type: "new_quote" | "quote_accepted" | "repair_completed" | "at_corner";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

export function useCornerNotifications() {
  const { user } = useAuth();
  const [cornerId, setCornerId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<CornerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch corner ID
  useEffect(() => {
    const fetchCornerId = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("corners")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setCornerId(data.id);
      }
    };

    fetchCornerId();
  }, [user]);

  // Subscribe to quotes for Corner's repair_requests
  useEffect(() => {
    if (!cornerId) return;

    const channel = supabase
      .channel(`corner-quotes-${cornerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quotes",
        },
        async (payload) => {
          // Check if this quote is for one of our repair_requests
          const quoteData = payload.new as any;
          
          if (quoteData.repair_request_id) {
            // Verify this repair_request belongs to our corner
            const { data: request } = await supabase
              .from("repair_requests")
              .select("id, corner_id, device_brand, device_model, customer:customers(name)")
              .eq("id", quoteData.repair_request_id)
              .eq("corner_id", cornerId)
              .maybeSingle();

            if (request) {
              const notification: CornerNotification = {
                id: `quote-${quoteData.id}`,
                type: "new_quote",
                title: "Nuovo Preventivo Ricevuto",
                message: `Preventivo di €${quoteData.total_cost?.toFixed(2)} per ${request.device_brand || ""} ${request.device_model || ""} - Cliente: ${(request.customer as any)?.name || "N/A"}`,
                timestamp: new Date(),
                read: false,
                data: { quoteId: quoteData.id, requestId: request.id },
              };

              setNotifications((prev) => [notification, ...prev]);
              setUnreadCount((prev) => prev + 1);

              // Show toast notification
              toast.success(notification.title, {
                description: notification.message,
                duration: 8000,
                action: {
                  label: "Visualizza",
                  onClick: () => {
                    window.location.href = "/corner/segnalazioni";
                  },
                },
              });

              // Send real push notification to Corner user
              const cornerUserId = await getCornerUserId(cornerId);
              if (cornerUserId) {
                sendPushNotification([cornerUserId], {
                  title: notification.title,
                  body: notification.message,
                  data: { url: "/corner/segnalazioni" },
                });
              }
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "repair_requests",
        },
        async (payload) => {
          const requestData = payload.new as any;
          const oldData = payload.old as any;

          // Only process if this is our corner's request
          if (requestData.corner_id !== cornerId) return;

          // Notify when status changes to at_corner
          if (requestData.status === "at_corner" && oldData.status !== "at_corner") {
            const { data: customer } = await supabase
              .from("customers")
              .select("name")
              .eq("id", requestData.customer_id)
              .maybeSingle();

            const notification: CornerNotification = {
              id: `at-corner-${requestData.id}`,
              type: "at_corner",
              title: "Dispositivo Pronto al Corner",
              message: `${requestData.device_brand || ""} ${requestData.device_model || ""} è pronto per il ritiro - Cliente: ${customer?.name || "N/A"}`,
              timestamp: new Date(),
              read: false,
              data: { requestId: requestData.id },
            };

            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);

            toast.success(notification.title, {
              description: notification.message,
              duration: 8000,
            });

            // Send real push notification
            const cornerUserId = await getCornerUserId(cornerId);
            if (cornerUserId) {
              sendPushNotification([cornerUserId], {
                title: notification.title,
                body: notification.message,
                data: { url: "/corner/segnalazioni" },
              });
            }
          }

          // Notify when repair is completed
          if (requestData.status === "repair_completed" && oldData.status !== "repair_completed") {
            const notification: CornerNotification = {
              id: `completed-${requestData.id}`,
              type: "repair_completed",
              title: "Riparazione Completata",
              message: `${requestData.device_brand || ""} ${requestData.device_model || ""} è stato riparato`,
              timestamp: new Date(),
              read: false,
              data: { requestId: requestData.id },
            };

            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);

            toast.info(notification.title, {
              description: notification.message,
            });

            // Send real push notification
            const cornerUserId = await getCornerUserId(cornerId);
            if (cornerUserId) {
              sendPushNotification([cornerUserId], {
                title: notification.title,
                body: notification.message,
                data: { url: "/corner/segnalazioni" },
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cornerId]);

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}
