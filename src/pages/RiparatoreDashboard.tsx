import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { RiparatoreLayout } from "@/layouts/RiparatoreLayout";
import { RiparatoreStats } from "@/components/riparatore/RiparatoreStats";
import { JobOfferCard } from "@/components/riparatore/JobOfferCard";
import { ActiveJobsList } from "@/components/riparatore/ActiveJobsList";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Bell } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";

interface Riparatore {
  id: string;
  full_name: string;
  status: string;
}

export default function RiparatoreDashboard() {
  const { user } = useAuth();
  const [riparatore, setRiparatore] = useState<Riparatore | null>(null);
  const [jobOffers, setJobOffers] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchRiparatoreData = async () => {
    if (!user) return;

    try {
      // Fetch riparatore profile
      const { data: riparatoreData, error: riparatoreError } = await supabase
        .from("riparatori")
        .select("id, full_name, status")
        .eq("user_id", user.id)
        .single();

      if (riparatoreError) throw riparatoreError;
      setRiparatore(riparatoreData);

      if (riparatoreData) {
        // Fetch pending job offers
        const { data: offersData, error: offersError } = await supabase
          .from("job_offers")
          .select(`
            *,
            repair_requests (
              *,
              customers (name, phone)
            )
          `)
          .eq("provider_id", riparatoreData.id)
          .eq("provider_type", "riparatore")
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false });

        if (offersError) throw offersError;
        setJobOffers(offersData || []);

        // Fetch assigned/active jobs
        const { data: jobsData, error: jobsError } = await supabase
          .from("repair_requests")
          .select(`
            *,
            customers (name, phone)
          `)
          .eq("assigned_provider_id", riparatoreData.id)
          .eq("assigned_provider_type", "riparatore")
          .in("status", ["assigned", "in_progress"])
          .order("assigned_at", { ascending: false });

        if (jobsError) throw jobsError;
        setActiveJobs(jobsData || []);

        // Fetch commissions
        const { data: commissionsData, error: commissionsError } = await supabase
          .from("commission_ledger")
          .select("*")
          .eq("riparatore_id", riparatoreData.id)
          .order("created_at", { ascending: false });

        if (commissionsError) throw commissionsError;
        setCommissions(commissionsData || []);
      }
    } catch (error: any) {
      console.error("Error fetching riparatore data:", error);
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    if (!riparatore) return;
    setIsProcessing(true);

    try {
      const response = await supabase.functions.invoke("dispatch-repair", {
        body: {
          action: "accept",
          job_offer_id: offerId,
          provider_id: riparatore.id,
          provider_type: "riparatore",
        },
      });

      if (response.error) throw response.error;

      toast.success("Lavoro accettato con successo!");
      fetchRiparatoreData();
    } catch (error: any) {
      console.error("Error accepting offer:", error);
      toast.error(error.message || "Errore nell'accettazione dell'offerta");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineOffer = async (offerId: string) => {
    setIsProcessing(true);

    try {
      const response = await supabase.functions.invoke("dispatch-repair", {
        body: {
          action: "decline",
          job_offer_id: offerId,
        },
      });

      if (response.error) throw response.error;

      toast.success("Offerta rifiutata");
      setJobOffers((prev) => prev.filter((o) => o.id !== offerId));
    } catch (error: any) {
      console.error("Error declining offer:", error);
      toast.error("Errore nel rifiuto dell'offerta");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from("repair_requests")
        .update({ status: "completed" })
        .eq("id", jobId);

      if (error) throw error;

      toast.success("Lavoro completato!");
      fetchRiparatoreData();
    } catch (error: any) {
      console.error("Error completing job:", error);
      toast.error("Errore nel completamento del lavoro");
    }
  };

  useEffect(() => {
    fetchRiparatoreData();
  }, [user]);

  // Set up realtime subscription for new job offers
  useEffect(() => {
    if (!riparatore) return;

    const channel = supabase
      .channel("job-offers")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "job_offers",
          filter: `provider_id=eq.${riparatore.id}`,
        },
        (payload) => {
          console.log("New job offer received:", payload);
          fetchRiparatoreData();
          toast.info("Nuova offerta di lavoro ricevuta!");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [riparatore]);

  // Calculate stats
  const stats = {
    pendingOffers: jobOffers.length,
    activeJobs: activeJobs.length,
    completedJobs: commissions.filter((c) => c.status === "paid").length,
    totalEarnings: commissions
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + (c.riparatore_commission || 0), 0),
  };

  if (!riparatore && !isLoading) {
    return (
      <RiparatoreLayout>
        <PageTransition>
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Account Riparatore Non Trovato</h2>
              <p className="text-muted-foreground">
                Il tuo account riparatore non è stato ancora approvato o non esiste.
              </p>
            </div>
          </div>
        </PageTransition>
      </RiparatoreLayout>
    );
  }

  if (riparatore?.status !== "approved" && !isLoading) {
    return (
      <RiparatoreLayout>
        <PageTransition>
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Account in Attesa di Approvazione</h2>
              <p className="text-muted-foreground">
                La tua richiesta di registrazione come Riparatore è in fase di revisione.
                <br />
                Riceverai una notifica quando sarà approvata.
              </p>
            </div>
          </div>
        </PageTransition>
      </RiparatoreLayout>
    );
  }

  return (
    <RiparatoreLayout>
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Ciao, {riparatore?.full_name}</h1>
            <p className="text-muted-foreground">
              Gestisci le tue offerte di lavoro e monitora i guadagni
            </p>
          </div>

          <RiparatoreStats {...stats} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Job Offers Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Offerte di Lavoro
                  </span>
                  {jobOffers.length > 0 && (
                    <Badge variant="destructive" className="animate-pulse">
                      <Bell className="h-3 w-3 mr-1" />
                      {jobOffers.length} nuove
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {jobOffers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nessuna offerta disponibile al momento.
                    <br />
                    <span className="text-sm">Rimani in attesa di nuove richieste!</span>
                  </p>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence>
                      {jobOffers.map((offer) => (
                        <JobOfferCard
                          key={offer.id}
                          offer={offer}
                          onAccept={handleAcceptOffer}
                          onDecline={handleDeclineOffer}
                          isProcessing={isProcessing}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Jobs Section */}
            <ActiveJobsList
              jobs={activeJobs}
              isLoading={isLoading}
              onComplete={handleCompleteJob}
            />
          </div>
        </div>
      </PageTransition>
    </RiparatoreLayout>
  );
}
