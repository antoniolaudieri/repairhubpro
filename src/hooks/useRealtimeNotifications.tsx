import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface Notification {
  id: string;
  type: "repair_status" | "parts_received" | "forfeiture_warning" | "forfeited" | "new_device" | "general";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  repairId?: string;
  data?: any;
}

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load existing notifications from database
  useEffect(() => {
    if (!user?.email) return;

    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from("customer_notifications")
        .select("*")
        .ilike("customer_email", user.email!)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        const dbNotifications: Notification[] = data.map((n: any) => ({
          id: n.id,
          type: n.type as Notification["type"],
          title: n.title,
          message: n.message,
          timestamp: new Date(n.created_at),
          read: n.read,
          data: n.data,
        }));
        setNotifications(dbNotifications);
      }
    };

    loadNotifications();
  }, [user?.email]);

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
                delivered: "Consegnata",
                forfeited: "Alienato"
              };

              // Check if device was forfeited
              if (payload.new.status === "forfeited") {
                const notification: Notification = {
                  id: `forfeited-${payload.new.id}-${Date.now()}`,
                  type: "forfeited",
                  title: "⚠️ Dispositivo Alienato",
                  message: `Il tuo ${device.brand} ${device.model} è stato alienato per mancato ritiro entro 30 giorni.`,
                  timestamp: new Date(),
                  read: false,
                  repairId: payload.new.id,
                };

                setNotifications((prev) => [notification, ...prev]);

                toast({
                  title: notification.title,
                  description: notification.message,
                  variant: "destructive",
                });
              } else {
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

            // Check for forfeiture warning
            if (!payload.old.forfeiture_warning_sent_at && payload.new.forfeiture_warning_sent_at) {
              const notification: Notification = {
                id: `warning-${payload.new.id}-${Date.now()}`,
                type: "forfeiture_warning",
                title: "⚠️ Avviso Importante",
                message: `Ritira il tuo ${device.brand} ${device.model} entro 7 giorni o verrà alienato!`,
                timestamp: new Date(),
                read: false,
                repairId: payload.new.id,
              };

              setNotifications((prev) => [notification, ...prev]);

              toast({
                title: notification.title,
                description: notification.message,
                variant: "destructive",
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

    // Listen for new customer_notifications
    const customerNotifChannel = supabase
      .channel("customer-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "customer_notifications",
        },
        (payload) => {
          if ((payload.new as any).customer_email === user.email) {
            const n = payload.new as any;
            const notification: Notification = {
              id: n.id,
              type: n.type as Notification["type"],
              title: n.title,
              message: n.message,
              timestamp: new Date(n.created_at),
              read: false,
              data: n.data,
            };

            setNotifications((prev) => [notification, ...prev]);

            toast({
              title: notification.title,
              description: notification.message,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(repairsChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(customerNotifChannel);
    };
  }, [user?.email]);

  const markAsRead = async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    
    // Update in database if it's a DB notification (UUID format)
    if (notificationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      await supabase
        .from("customer_notifications")
        .update({ read: true })
        .eq("id", notificationId);
    }
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
