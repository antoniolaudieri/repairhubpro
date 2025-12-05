import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { usePushNotifications } from "./usePushNotifications";

export interface CentroNotification {
  id: string;
  type: "new_job_offer" | "repair_assigned" | "order_received" | "awaiting_pickup";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  linkTo?: string;
  data?: any;
}

export function useCentroNotifications() {
  const { user, isCentroAdmin } = useAuth();
  const { sendNotification, isGranted } = usePushNotifications();
  const [notifications, setNotifications] = useState<CentroNotification[]>([]);
  const [centroId, setCentroId] = useState<string | null>(null);

  // Fetch centro ID
  useEffect(() => {
    const fetchCentroId = async () => {
      if (!user || !isCentroAdmin) return;

      const { data } = await supabase
        .from("centri_assistenza")
        .select("id")
        .eq("owner_user_id", user.id)
        .single();

      if (data) {
        setCentroId(data.id);
      }
    };

    fetchCentroId();
  }, [user, isCentroAdmin]);

  useEffect(() => {
    if (!user || !isCentroAdmin || !centroId) return;

    // Listen for new job offers assigned to this Centro
    const jobOffersChannel = supabase
      .channel("centro-job-offers")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "job_offers",
        },
        async (payload) => {
          // Check if this job offer is for our Centro
          if (payload.new.provider_type === "centro" && payload.new.provider_id === centroId) {
            console.log("New job offer for Centro:", payload);

            // Fetch repair request details
            const { data: repairRequest } = await supabase
              .from("repair_requests")
              .select(`
                id,
                device_type,
                device_brand,
                device_model,
                issue_description,
                estimated_cost,
                corner:corners(business_name)
              `)
              .eq("id", payload.new.repair_request_id)
              .single();

            if (repairRequest) {
              const cornerName = (repairRequest.corner as any)?.business_name || "Corner";
              const title = "🔔 Nuovo Lavoro da Corner!";
              const message = `${cornerName} ti ha assegnato: ${repairRequest.device_brand || ""} ${repairRequest.device_model || repairRequest.device_type} - ${repairRequest.issue_description?.substring(0, 50)}...`;

              const notification: CentroNotification = {
                id: `job-offer-${payload.new.id}-${Date.now()}`,
                type: "new_job_offer",
                title,
                message,
                timestamp: new Date(),
                read: false,
                linkTo: `/centro/lavori`,
                data: {
                  jobOfferId: payload.new.id,
                  repairRequestId: payload.new.repair_request_id,
                  estimatedCost: repairRequest.estimated_cost,
                },
              };

              setNotifications((prev) => [notification, ...prev]);

              // Toast prominente
              toast.success(title, { 
                description: message,
                duration: 10000,
                action: {
                  label: "Vedi",
                  onClick: () => window.location.href = "/centro/lavori",
                },
              });

              // Push notification browser
              if (isGranted) {
                sendNotification(title, {
                  body: message,
                  tag: `job-offer-${payload.new.id}`,
                  data: { url: `/centro/lavori` },
                });
              }
            }
          }
        }
      )
      .subscribe();

    // Listen for repair requests directly assigned to this Centro (INSERT for new requests from Corner)
    const repairRequestsInsertChannel = supabase
      .channel("centro-repair-requests-insert")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "repair_requests",
        },
        async (payload) => {
          // Check if this repair request is assigned to our Centro from a Corner
          if (
            payload.new.assigned_provider_type === "centro" &&
            payload.new.assigned_provider_id === centroId &&
            payload.new.corner_id
          ) {
            console.log("New repair request from Corner:", payload);

            const { data: repairRequest } = await supabase
              .from("repair_requests")
              .select(`
                id,
                device_type,
                device_brand,
                device_model,
                issue_description,
                estimated_cost,
                corner:corners(business_name)
              `)
              .eq("id", payload.new.id)
              .single();

            if (repairRequest) {
              const cornerName = (repairRequest.corner as any)?.business_name || "Corner";
              const title = "🔔 Nuovo Lavoro da Corner!";
              const message = `${cornerName} ti ha assegnato: ${repairRequest.device_brand || ""} ${repairRequest.device_model || repairRequest.device_type} - ${repairRequest.issue_description?.substring(0, 50)}...`;

              const notification: CentroNotification = {
                id: `corner-request-${payload.new.id}-${Date.now()}`,
                type: "new_job_offer",
                title,
                message,
                timestamp: new Date(),
                read: false,
                linkTo: `/centro/lavori-corner`,
                data: {
                  repairRequestId: payload.new.id,
                  estimatedCost: repairRequest.estimated_cost,
                },
              };

              setNotifications((prev) => [notification, ...prev]);

              // Toast prominente
              toast.success(title, { 
                description: message,
                duration: 10000,
                action: {
                  label: "Vedi",
                  onClick: () => window.location.href = "/centro/lavori-corner",
                },
              });

              // Push notification browser
              if (isGranted) {
                sendNotification(title, {
                  body: message,
                  tag: `corner-request-${payload.new.id}`,
                  data: { url: `/centro/lavori-corner` },
                });
              }
            }
          }
        }
      )
      .subscribe();

    // Listen for repair requests UPDATE (for status changes)
    const repairRequestsUpdateChannel = supabase
      .channel("centro-repair-requests-update")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "repair_requests",
        },
        async (payload) => {
          // Check if status changed to awaiting_pickup (customer signed quote, Centro needs to pick up)
          if (
            payload.new.assigned_provider_type === "centro" &&
            payload.new.assigned_provider_id === centroId &&
            payload.new.status === "awaiting_pickup" &&
            payload.old.status !== "awaiting_pickup"
          ) {
            console.log("Quote signed - awaiting pickup:", payload);

            const { data: repairRequest } = await supabase
              .from("repair_requests")
              .select(`
                id,
                device_type,
                device_brand,
                device_model,
                issue_description,
                corner:corners(business_name, address)
              `)
              .eq("id", payload.new.id)
              .single();

            if (repairRequest) {
              const cornerName = (repairRequest.corner as any)?.business_name || "Corner";
              const cornerAddress = (repairRequest.corner as any)?.address || "";
              const title = "✅ Preventivo Firmato - Ritira il Dispositivo!";
              const message = `Il cliente ha firmato il preventivo. Ritira il dispositivo presso ${cornerName}${cornerAddress ? ` (${cornerAddress})` : ""}`;

              const detailUrl = `/centro/lavori-corner?highlight=${payload.new.id}`;
              
              const notification: CentroNotification = {
                id: `awaiting-pickup-${payload.new.id}-${Date.now()}`,
                type: "awaiting_pickup",
                title,
                message,
                timestamp: new Date(),
                read: false,
                linkTo: detailUrl,
                data: {
                  repairRequestId: payload.new.id,
                  cornerName,
                  cornerAddress,
                },
              };

              setNotifications((prev) => [notification, ...prev]);

              toast.success(title, { 
                description: message,
                duration: 15000,
                action: {
                  label: "Gestisci Ritiro",
                  onClick: () => window.location.href = detailUrl,
                },
              });

              if (isGranted) {
                sendNotification(title, {
                  body: message,
                  tag: `awaiting-pickup-${payload.new.id}`,
                  data: { url: detailUrl },
                });
              }
            }
          }

          // Check if this repair request is newly assigned to our Centro
          if (
            payload.new.assigned_provider_type === "centro" &&
            payload.new.assigned_provider_id === centroId &&
            payload.new.corner_id &&
            (payload.old.assigned_provider_id !== centroId || !payload.old.assigned_provider_id)
          ) {
            console.log("Repair request assigned to Centro:", payload);

            const { data: repairRequest } = await supabase
              .from("repair_requests")
              .select(`
                id,
                device_type,
                device_brand,
                device_model,
                issue_description,
                estimated_cost,
                corner:corners(business_name)
              `)
              .eq("id", payload.new.id)
              .single();

            if (repairRequest) {
              const cornerName = (repairRequest.corner as any)?.business_name || "Corner";
              const title = "🔔 Nuovo Lavoro da Corner!";
              const message = `${cornerName} ti ha assegnato: ${repairRequest.device_brand || ""} ${repairRequest.device_model || repairRequest.device_type}`;

              const notification: CentroNotification = {
                id: `repair-assigned-${payload.new.id}-${Date.now()}`,
                type: "repair_assigned",
                title,
                message,
                timestamp: new Date(),
                read: false,
                linkTo: `/centro/lavori-corner`,
              };

              setNotifications((prev) => [notification, ...prev]);

              toast.success(title, { 
                description: message,
                duration: 8000,
              });

              if (isGranted) {
                sendNotification(title, {
                  body: message,
                  tag: `repair-${payload.new.id}`,
                  data: { url: `/centro/lavori-corner` },
                });
              }
            }
          }
        }
      )
      .subscribe();

    // Listen for orders received
    const ordersChannel = supabase
      .channel("centro-orders-received")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        async (payload) => {
          if (payload.old.status !== "received" && payload.new.status === "received") {
            const title = "📦 Ordine Ricevuto";
            const message = `Ordine #${payload.new.order_number} - Ricambi arrivati!`;

            const notification: CentroNotification = {
              id: `order-received-${payload.new.id}-${Date.now()}`,
              type: "order_received",
              title,
              message,
              timestamp: new Date(),
              read: false,
              linkTo: `/centro/ordini`,
            };

            setNotifications((prev) => [notification, ...prev]);

            toast.success(title, { description: message });

            if (isGranted) {
              sendNotification(title, {
                body: message,
                tag: `order-${payload.new.id}`,
                data: { url: `/centro/ordini` },
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobOffersChannel);
      supabase.removeChannel(repairRequestsInsertChannel);
      supabase.removeChannel(repairRequestsUpdateChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [user, isCentroAdmin, centroId, isGranted, sendNotification]);

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
    centroId,
  };
}
