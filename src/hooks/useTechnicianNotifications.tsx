import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { usePushNotifications } from "./usePushNotifications";

export interface TechNotification {
  id: string;
  type: "new_repair" | "new_order" | "order_received" | "appointment";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  linkTo?: string;
}

export function useTechnicianNotifications() {
  const { user, userRole } = useAuth();
  const { sendNotification, isGranted } = usePushNotifications();
  const [notifications, setNotifications] = useState<TechNotification[]>([]);

  useEffect(() => {
    // Solo per tecnici e admin
    if (!user || (userRole !== "technician" && userRole !== "admin")) return;

    // Ascolta nuove riparazioni
    const repairsChannel = supabase
      .channel("tech-new-repairs")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "repairs",
        },
        async (payload) => {
          console.log("New repair detected:", payload);

          // Ottieni info dispositivo e cliente
          const { data: device } = await supabase
            .from("devices")
            .select("brand, model, customer:customers(name)")
            .eq("id", payload.new.device_id)
            .single();

          if (device) {
            const title = "🔧 Nuovo Ritiro";
            const message = `${(device.customer as any)?.name} - ${device.brand} ${device.model}`;

            const notification: TechNotification = {
              id: `new-repair-${payload.new.id}-${Date.now()}`,
              type: "new_repair",
              title,
              message,
              timestamp: new Date(),
              read: false,
              linkTo: `/repairs/${payload.new.id}`,
            };

            setNotifications((prev) => [notification, ...prev]);

            // Toast in-app
            toast.success(title, { description: message });

            // Push notification browser
            if (isGranted) {
              sendNotification(title, {
                body: message,
                tag: `repair-${payload.new.id}`,
                data: { url: `/repairs/${payload.new.id}` },
              });
            }
          }
        }
      )
      .subscribe();

    // Ascolta ordini ricevuti
    const ordersChannel = supabase
      .channel("tech-orders-received")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        async (payload) => {
          // Solo quando lo stato cambia a "received"
          if (payload.old.status !== "received" && payload.new.status === "received") {
            console.log("Order received:", payload);

            const title = "📦 Ordine Ricevuto";
            const message = `Ordine #${payload.new.order_number} - Ricambi arrivati!`;

            const notification: TechNotification = {
              id: `order-received-${payload.new.id}-${Date.now()}`,
              type: "order_received",
              title,
              message,
              timestamp: new Date(),
              read: false,
              linkTo: `/orders`,
            };

            setNotifications((prev) => [notification, ...prev]);

            toast.success(title, { description: message });

            if (isGranted) {
              sendNotification(title, {
                body: message,
                tag: `order-${payload.new.id}`,
                data: { url: `/orders` },
              });
            }
          }
        }
      )
      .subscribe();

    // Ascolta nuovi appuntamenti
    const appointmentsChannel = supabase
      .channel("tech-appointments")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "appointments",
        },
        async (payload) => {
          console.log("New appointment:", payload);

          const title = "📅 Nuovo Appuntamento";
          const message = `${payload.new.customer_name} - ${payload.new.preferred_date} alle ${payload.new.preferred_time}`;

          const notification: TechNotification = {
            id: `appointment-${payload.new.id}-${Date.now()}`,
            type: "appointment",
            title,
            message,
            timestamp: new Date(),
            read: false,
            linkTo: `/appointments`,
          };

          setNotifications((prev) => [notification, ...prev]);

          toast.info(title, { description: message });

          if (isGranted) {
            sendNotification(title, {
              body: message,
              tag: `appointment-${payload.new.id}`,
              data: { url: `/appointments` },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(repairsChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(appointmentsChannel);
    };
  }, [user, userRole, isGranted, sendNotification]);

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
  };
}
