import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface Notification {
  id: string;
  type: "repair_status" | "parts_received";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  repairId?: string;
}

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user?.email) return;

    // Crea i canali per ascoltare i cambi
    const repairsChannel = supabase
      .channel("repairs-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "repairs",
        },
        async (payload) => {
          console.log("Repair change detected:", payload);
          
          // Verifica se la riparazione appartiene al cliente
          const { data: device } = await supabase
            .from("devices")
            .select("customer_id, brand, model, customers!inner(email)")
            .eq("id", payload.new.device_id)
            .single();

          if (device && (device.customers as any)?.email === user.email) {
            // Crea notifica per cambio stato
            if (payload.old.status !== payload.new.status) {
              const statusLabels: Record<string, string> = {
                pending: "In attesa",
                in_progress: "In corso",
                completed: "Completata",
                waiting_parts: "In attesa ricambi",
                waiting_for_approval: "In attesa approvazione",
                ready_for_pickup: "Pronta per il ritiro",
                delivered: "Consegnata"
              };

              const notification: Notification = {
                id: `repair-${payload.new.id}-${Date.now()}`,
                type: "repair_status",
                title: "Cambio Stato Riparazione",
                message: `La riparazione del tuo ${device.brand} ${device.model} è ora: ${statusLabels[payload.new.status] || payload.new.status}`,
                timestamp: new Date(),
                read: false,
                repairId: payload.new.id,
              };

              setNotifications((prev) => [notification, ...prev]);

              toast({
                title: notification.title,
                description: notification.message,
              });
            }
          }
        }
      )
      .subscribe();

    const ordersChannel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        async (payload) => {
          console.log("Order change detected:", payload);
          
          // Verifica se l'ordine è collegato a una riparazione del cliente
          if (payload.new.repair_id) {
            const { data: repair } = await supabase
              .from("repairs")
              .select(`
                id,
                device:devices!inner(
                  brand,
                  model,
                  customer:customers!inner(email)
                )
              `)
              .eq("id", payload.new.repair_id)
              .single();

            if (repair && (repair.device as any)?.customer?.email === user.email) {
              // Notifica quando i ricambi sono ricevuti
              if (payload.old.status !== "received" && payload.new.status === "received") {
                const notification: Notification = {
                  id: `order-${payload.new.id}-${Date.now()}`,
                  type: "parts_received",
                  title: "Ricambi Ricevuti",
                  message: `I ricambi per la riparazione del tuo ${(repair.device as any).brand} ${(repair.device as any).model} sono arrivati`,
                  timestamp: new Date(),
                  read: false,
                  repairId: payload.new.repair_id,
                };

                setNotifications((prev) => [notification, ...prev]);

                toast({
                  title: notification.title,
                  description: notification.message,
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(repairsChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [user?.email]);

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      )
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
