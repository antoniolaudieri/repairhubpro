import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AppointmentNotification {
  id: string;
  type: "new_appointment";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

export function useCornerAppointmentNotifications() {
  const { user } = useAuth();
  const [cornerId, setCornerId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppointmentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingAppointmentsCount, setPendingAppointmentsCount] = useState(0);

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

  // Fetch pending appointments count
  useEffect(() => {
    if (!cornerId) return;

    const fetchPendingCount = async () => {
      const { count } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("corner_id", cornerId)
        .eq("status", "pending");

      setPendingAppointmentsCount(count || 0);
    };

    fetchPendingCount();
  }, [cornerId]);

  // Subscribe to new appointments
  useEffect(() => {
    if (!cornerId) return;

    const channel = supabase
      .channel(`corner-appointments-notifications-${cornerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "appointments",
          filter: `corner_id=eq.${cornerId}`,
        },
        (payload) => {
          const appointmentData = payload.new as any;

          const notification: AppointmentNotification = {
            id: `appointment-${appointmentData.id}`,
            type: "new_appointment",
            title: "Nuova Prenotazione",
            message: `${appointmentData.customer_name} ha prenotato per il ${appointmentData.preferred_date} alle ${appointmentData.preferred_time}`,
            timestamp: new Date(),
            read: false,
            data: { appointmentId: appointmentData.id },
          };

          setNotifications((prev) => [notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
          setPendingAppointmentsCount((prev) => prev + 1);

          // Show toast notification
          toast.success(notification.title, {
            description: notification.message,
            duration: 10000,
            action: {
              label: "Visualizza",
              onClick: () => {
                window.location.href = "/corner/prenotazioni";
              },
            },
          });

          // Browser push notification
          if (Notification.permission === "granted") {
            new Notification(notification.title, {
              body: notification.message,
              icon: "/favicon.ico",
              tag: notification.id,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "appointments",
          filter: `corner_id=eq.${cornerId}`,
        },
        (payload) => {
          const oldData = payload.old as any;
          const newData = payload.new as any;

          // Update pending count when status changes
          if (oldData.status === "pending" && newData.status !== "pending") {
            setPendingAppointmentsCount((prev) => Math.max(0, prev - 1));
          } else if (oldData.status !== "pending" && newData.status === "pending") {
            setPendingAppointmentsCount((prev) => prev + 1);
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
    pendingAppointmentsCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}