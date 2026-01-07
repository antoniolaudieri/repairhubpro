import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, CheckCircle, XCircle, MapPin, Phone, Mail, Trash2 } from "lucide-react";
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

interface Centro {
  id: string;
  owner_user_id: string;
  business_name: string;
  vat_number: string | null;
  address: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
  commission_rate: number;
}

export default function AdminCentri() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: centri = [], isLoading } = useQuery({
    queryKey: ["admin-centri"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centri_assistenza")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Centro[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === "approved") {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user?.id;
      }
      
      const { error } = await supabase.from("centri_assistenza").update(updateData).eq("id", id);
      if (error) throw error;

      if (status === "approved") {
        const centro = centri.find(c => c.id === id);
        if (centro?.owner_user_id) {
          await supabase.from("user_roles").upsert({ user_id: centro.owner_user_id, role: "centro_admin" }, { onConflict: "user_id,role" });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-centri"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-counts"] });
      toast.success("Stato aggiornato con successo");
    },
    onError: () => toast.error("Errore nell'aggiornamento"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const centro = centri.find(c => c.id === id);
      
      // Delete user role first
      if (centro?.owner_user_id) {
        await supabase.from("user_roles").delete()
          .eq("user_id", centro.owner_user_id)
          .eq("role", "centro_admin");
      }
      
      // Delete centro
      const { error } = await supabase.from("centri_assistenza").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-centri"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-counts"] });
      toast.success("Centro eliminato con successo");
    },
    onError: () => toast.error("Errore nell'eliminazione"),
  });

  const pendingCount = centri.filter(c => c.status === "pending").length;

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
            <div className="p-2 rounded-xl bg-green-500/10">
              <Building2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Gestione Centri</h1>
              <p className="text-sm text-muted-foreground">{centri.length} registrati</p>
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
        ) : centri.length === 0 ? (
          <Card className="bg-card/50">
            <CardContent className="p-12 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessun centro assistenza registrato</p>
            </CardContent>
          </Card>
        ) : (
          <motion.div 
            className="grid gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {centri.map((centro, index) => (
              <motion.div
                key={centro.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-card/50 backdrop-blur border-border/50 hover:shadow-md transition-all">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-lg">{centro.business_name}</h3>
                          <Badge className={statusColors[centro.status]}>
                            {statusLabels[centro.status]}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{centro.address}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{centro.phone}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{centro.email}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {centro.vat_number && <span>P.IVA: {centro.vat_number}</span>}
                          <span>Commissione: {centro.commission_rate}%</span>
                          <span>Registrato: {format(new Date(centro.created_at), "dd MMM yyyy", { locale: it })}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {centro.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-success border-success/30 hover:bg-success/10"
                              onClick={() => updateStatusMutation.mutate({ id: centro.id, status: "approved" })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approva
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => updateStatusMutation.mutate({ id: centro.id, status: "suspended" })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rifiuta
                            </Button>
                          </>
                        )}
                        {centro.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => updateStatusMutation.mutate({ id: centro.id, status: "suspended" })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Sospendi
                          </Button>
                        )}
                        {centro.status === "suspended" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success border-success/30 hover:bg-success/10"
                            onClick={() => updateStatusMutation.mutate({ id: centro.id, status: "approved" })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Riattiva
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Sei sicuro di voler eliminare "${centro.business_name}"? Questa azione non può essere annullata.`)) {
                              deleteMutation.mutate(centro.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Elimina
                        </Button>
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
