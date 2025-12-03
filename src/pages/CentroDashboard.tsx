import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { CentroStats } from "@/components/centro/CentroStats";
import { CollaboratorsList } from "@/components/centro/CollaboratorsList";
import { InventoryAccessList } from "@/components/centro/InventoryAccessList";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Clock, Smartphone, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Centro {
  id: string;
  business_name: string;
  status: string;
}

export default function CentroDashboard() {
  const { user } = useAuth();
  const [centro, setCentro] = useState<Centro | null>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [inventoryAccesses, setInventoryAccesses] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCentroData = async () => {
    if (!user) return;

    try {
      // Fetch centro profile
      const { data: centroData, error: centroError } = await supabase
        .from("centri_assistenza")
        .select("id, business_name, status")
        .eq("owner_user_id", user.id)
        .single();

      if (centroError) throw centroError;
      setCentro(centroData);

      if (centroData) {
        // Fetch collaborators
        const { data: collaboratorsData } = await supabase
          .from("centro_collaboratori")
          .select(`
            *,
            riparatori (id, full_name, phone, email)
          `)
          .eq("centro_id", centroData.id)
          .eq("is_active", true);

        setCollaborators(collaboratorsData || []);

        // Fetch inventory accesses
        const { data: accessesData } = await supabase
          .from("inventory_access")
          .select(`
            *,
            riparatori (id, full_name, email)
          `)
          .eq("centro_id", centroData.id)
          .eq("is_active", true);

        setInventoryAccesses(accessesData || []);

        // Fetch active jobs (repair requests assigned to this centro)
        const { data: jobsData } = await supabase
          .from("repair_requests")
          .select(`
            *,
            customers (name, phone)
          `)
          .eq("assigned_provider_id", centroData.id)
          .eq("assigned_provider_type", "centro")
          .in("status", ["assigned", "in_progress"])
          .order("assigned_at", { ascending: false });

        setActiveJobs(jobsData || []);

        // Fetch commissions
        const { data: commissionsData } = await supabase
          .from("commission_ledger")
          .select("*")
          .eq("centro_id", centroData.id)
          .order("created_at", { ascending: false });

        setCommissions(commissionsData || []);

        // Fetch inventory count
        const { count } = await supabase
          .from("spare_parts")
          .select("*", { count: "exact", head: true })
          .eq("centro_id", centroData.id);

        setInventoryCount(count || 0);
      }
    } catch (error: any) {
      console.error("Error fetching centro data:", error);
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCentroData();
  }, [user]);

  // Set up realtime subscription for repair_requests and job_offers
  useEffect(() => {
    if (!centro) return;

    const repairChannel = supabase
      .channel("centro-repair-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "repair_requests",
          filter: `assigned_provider_id=eq.${centro.id}`,
        },
        (payload) => {
          console.log("Repair request updated:", payload);
          fetchCentroData();
        }
      )
      .subscribe();

    const jobOffersChannel = supabase
      .channel("centro-job-offers")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "job_offers",
          filter: `provider_id=eq.${centro.id}`,
        },
        (payload) => {
          console.log("New job offer:", payload);
          toast.info("Nuova offerta di lavoro ricevuta!");
          fetchCentroData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(repairChannel);
      supabase.removeChannel(jobOffersChannel);
    };
  }, [centro]);

  // Calculate stats
  const stats = {
    totalCollaborators: collaborators.length,
    totalInventoryItems: inventoryCount,
    activeJobs: activeJobs.length,
    totalEarnings: commissions
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + (c.centro_commission || 0), 0),
  };

  if (!centro && !isLoading) {
    return (
      <CentroLayout>
        <PageTransition>
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Centro Non Trovato</h2>
              <p className="text-muted-foreground">
                Il tuo centro assistenza non è stato ancora approvato o non esiste.
              </p>
            </div>
          </div>
        </PageTransition>
      </CentroLayout>
    );
  }

  if (centro?.status !== "approved" && !isLoading) {
    return (
      <CentroLayout>
        <PageTransition>
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">In Attesa di Approvazione</h2>
              <p className="text-muted-foreground">
                La tua richiesta è in fase di revisione.
                <br />
                Riceverai una notifica quando sarà approvata.
              </p>
            </div>
          </div>
        </PageTransition>
      </CentroLayout>
    );
  }

  return (
    <CentroLayout>
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">{centro?.business_name}</h1>
            <p className="text-muted-foreground">
              Gestisci il tuo centro assistenza, collaboratori e inventario
            </p>
          </div>

          <CentroStats {...stats} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Jobs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Lavori Attivi ({activeJobs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeJobs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nessun lavoro attivo al momento.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activeJobs.slice(0, 5).map((job) => (
                      <div
                        key={job.id}
                        className="p-3 rounded-lg border border-border bg-card/50"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {job.device_brand} {job.device_model}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {job.status === "assigned" ? "Assegnato" : "In Corso"}
                          </Badge>
                        </div>
                        {job.customers && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            {job.customers.name}
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {job.issue_description}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                          <Clock className="h-3 w-3" />
                          {format(new Date(job.assigned_at), "dd MMM HH:mm", { locale: it })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Collaborators */}
            <CollaboratorsList
              collaborators={collaborators}
              centroId={centro?.id || ""}
              isLoading={isLoading}
              onRefresh={fetchCentroData}
            />
          </div>

          {/* Inventory Access */}
          <InventoryAccessList
            accesses={inventoryAccesses}
            centroId={centro?.id || ""}
            isLoading={isLoading}
            onRefresh={fetchCentroData}
          />
        </div>
      </PageTransition>
    </CentroLayout>
  );
}
