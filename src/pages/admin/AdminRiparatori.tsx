import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wrench, CheckCircle, XCircle, MapPin, Phone, Mail } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { PlatformAdminLayout } from "@/layouts/PlatformAdminLayout";

const statusColors: Record<string, string> = {
  pending: "bg-warning/20 text-warning border-warning/30",
  approved: "bg-success/20 text-success border-success/30",
  suspended: "bg-destructive/20 text-destructive border-destructive/30",
};

const statusLabels: Record<string, string> = {
  pending: "In Attesa",
  approved: "Approvato",
  suspended: "Sospeso",
};

interface Riparatore {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string | null;
  service_radius_km: number;
  is_mobile: boolean;
  status: string;
  created_at: string;
  commission_rate: number;
}

export default function AdminRiparatori() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: riparatori = [], isLoading } = useQuery({
    queryKey: ["admin-riparatori"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("riparatori")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Riparatore[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === "approved") {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user?.id;
      }
      
      const { error } = await supabase.from("riparatori").update(updateData).eq("id", id);
      if (error) throw error;

      if (status === "approved") {
        const riparatore = riparatori.find(r => r.id === id);
        if (riparatore?.user_id) {
          await supabase.from("user_roles").upsert({ user_id: riparatore.user_id, role: "riparatore" }, { onConflict: "user_id,role" });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-riparatori"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-counts"] });
      toast.success("Stato aggiornato con successo");
    },
    onError: () => toast.error("Errore nell'aggiornamento"),
  });

  const pendingCount = riparatori.filter(r => r.status === "pending").length;

  return (
    <PlatformAdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Wrench className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Gestione Riparatori</h1>
              <p className="text-sm text-muted-foreground">{riparatori.length} registrati</p>
            </div>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-warning/20 text-warning border-warning/30 self-start sm:self-auto">
              {pendingCount} in attesa
            </Badge>
          )}
        </motion.div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : riparatori.length === 0 ? (
          <Card className="bg-card/50">
            <CardContent className="p-12 text-center text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessun riparatore registrato</p>
            </CardContent>
          </Card>
        ) : (
          <motion.div 
            className="grid gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {riparatori.map((riparatore, index) => (
              <motion.div
                key={riparatore.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-card/50 backdrop-blur border-border/50 hover:shadow-md transition-all">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-lg">{riparatore.full_name}</h3>
                          <Badge className={statusColors[riparatore.status]}>
                            {statusLabels[riparatore.status]}
                          </Badge>
                          {riparatore.is_mobile && (
                            <Badge variant="outline" className="text-xs">Domicilio</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          {riparatore.address && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">{riparatore.address}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{riparatore.phone}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{riparatore.email}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>Commissione: {riparatore.commission_rate}%</span>
                          <span>Raggio: {riparatore.service_radius_km} km</span>
                          <span>Registrato: {format(new Date(riparatore.created_at), "dd MMM yyyy", { locale: it })}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {riparatore.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-success border-success/30 hover:bg-success/10"
                              onClick={() => updateStatusMutation.mutate({ id: riparatore.id, status: "approved" })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approva
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => updateStatusMutation.mutate({ id: riparatore.id, status: "suspended" })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rifiuta
                            </Button>
                          </>
                        )}
                        {riparatore.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => updateStatusMutation.mutate({ id: riparatore.id, status: "suspended" })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Sospendi
                          </Button>
                        )}
                        {riparatore.status === "suspended" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success border-success/30 hover:bg-success/10"
                            onClick={() => updateStatusMutation.mutate({ id: riparatore.id, status: "approved" })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Riattiva
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </PlatformAdminLayout>
  );
}
