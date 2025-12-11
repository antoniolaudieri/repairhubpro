import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Store, CheckCircle, XCircle, MapPin, Phone, Mail, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { PlatformAdminLayout } from "@/layouts/PlatformAdminLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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

interface Corner {
  id: string;
  user_id: string;
  business_name: string;
  address: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
  commission_rate: number;
}

interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
}

export default function AdminCorners() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedCorner, setSelectedCorner] = useState<Corner | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { data: corners = [], isLoading } = useQuery({
    queryKey: ["admin-corners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("corners")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Corner[];
    },
  });

  // Fetch all users (profiles) for assignment
  const { data: availableUsers = [] } = useQuery({
    queryKey: ["admin-available-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .order("full_name");
      if (error) throw error;
      return data as Profile[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === "approved") {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user?.id;
      }
      
      const { error } = await supabase.from("corners").update(updateData).eq("id", id);
      if (error) throw error;

      if (status === "approved") {
        const corner = corners.find(c => c.id === id);
        if (corner?.user_id) {
          await supabase.from("user_roles").upsert({ user_id: corner.user_id, role: "corner" }, { onConflict: "user_id,role" });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-corners"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-counts"] });
      toast.success("Stato aggiornato con successo");
    },
    onError: () => toast.error("Errore nell'aggiornamento"),
  });

  const assignUserMutation = useMutation({
    mutationFn: async ({ cornerId, userId }: { cornerId: string; userId: string }) => {
      // Update corner with new user_id
      const { error } = await supabase
        .from("corners")
        .update({ user_id: userId })
        .eq("id", cornerId);
      if (error) throw error;

      // Assign corner role to new user
      await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: "corner" }, { onConflict: "user_id,role" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-corners"] });
      toast.success("Utente assegnato con successo");
      setAssignDialogOpen(false);
      setSelectedCorner(null);
      setSelectedUserId("");
    },
    onError: () => toast.error("Errore nell'assegnazione"),
  });

  const handleOpenAssignDialog = (corner: Corner) => {
    setSelectedCorner(corner);
    setSelectedUserId(corner.user_id || "");
    setAssignDialogOpen(true);
  };

  const pendingCount = corners.filter(c => c.status === "pending").length;

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
            <div className="p-2 rounded-xl bg-primary/10">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Gestione Corner</h1>
              <p className="text-sm text-muted-foreground">{corners.length} registrati</p>
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
        ) : corners.length === 0 ? (
          <Card className="bg-card/50">
            <CardContent className="p-12 text-center text-muted-foreground">
              <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessun corner registrato</p>
            </CardContent>
          </Card>
        ) : (
          <motion.div 
            className="grid gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.05 }}
          >
            {corners.map((corner, index) => (
              <motion.div
                key={corner.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-card/50 backdrop-blur border-border/50 hover:shadow-md transition-all">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-lg">{corner.business_name}</h3>
                          <Badge className={statusColors[corner.status]}>
                            {statusLabels[corner.status]}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{corner.address}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{corner.phone}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{corner.email}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>Commissione: {corner.commission_rate}%</span>
                          <span>Registrato: {format(new Date(corner.created_at), "dd MMM yyyy", { locale: it })}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {corner.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-success border-success/30 hover:bg-success/10"
                              onClick={() => updateStatusMutation.mutate({ id: corner.id, status: "approved" })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approva
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => updateStatusMutation.mutate({ id: corner.id, status: "suspended" })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rifiuta
                            </Button>
                          </>
                        )}
                        {corner.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => updateStatusMutation.mutate({ id: corner.id, status: "suspended" })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Sospendi
                          </Button>
                        )}
                        {corner.status === "suspended" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success border-success/30 hover:bg-success/10"
                            onClick={() => updateStatusMutation.mutate({ id: corner.id, status: "approved" })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Riattiva
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAssignDialog(corner)}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Assegna Utente
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Assign User Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assegna Utente a {selectedCorner?.business_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Seleziona Utente</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un utente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name} {u.phone && `(${u.phone})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                  Annulla
                </Button>
                <Button
                  onClick={() => {
                    if (selectedCorner && selectedUserId) {
                      assignUserMutation.mutate({
                        cornerId: selectedCorner.id,
                        userId: selectedUserId,
                      });
                    }
                  }}
                  disabled={!selectedUserId || assignUserMutation.isPending}
                >
                  Assegna
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PlatformAdminLayout>
  );
}
