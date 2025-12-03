import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { 
  Wallet, 
  Building2, 
  Store, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Ban,
  TrendingUp,
  Plus,
  Loader2,
  Euro
} from "lucide-react";

interface TopupRequest {
  id: string;
  entity_type: "centro" | "corner";
  entity_id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  entity_name?: string;
}

interface EntityCredit {
  id: string;
  name: string;
  type: "centro" | "corner";
  credit_balance: number;
  payment_status: string;
  last_credit_update: string | null;
}

const statusColors: Record<string, string> = {
  good_standing: "bg-success/20 text-success border-success/30",
  warning: "bg-warning/20 text-warning border-warning/30",
  suspended: "bg-destructive/20 text-destructive border-destructive/30",
};

const statusLabels: Record<string, string> = {
  good_standing: "Regolare",
  warning: "Saldo Basso",
  suspended: "Sospeso",
};

export function CreditManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("requests");
  const [selectedEntity, setSelectedEntity] = useState<EntityCredit | null>(null);
  const [manualAmount, setManualAmount] = useState("");
  const [showManualTopup, setShowManualTopup] = useState(false);

  // Fetch pending topup requests
  const { data: pendingRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ["admin-topup-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topup_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch entity names
      const requests = data as TopupRequest[];
      for (const req of requests) {
        if (req.entity_type === "centro") {
          const { data: centro } = await supabase
            .from("centri_assistenza")
            .select("business_name")
            .eq("id", req.entity_id)
            .single();
          req.entity_name = centro?.business_name || "N/A";
        } else {
          const { data: corner } = await supabase
            .from("corners")
            .select("business_name")
            .eq("id", req.entity_id)
            .single();
          req.entity_name = corner?.business_name || "N/A";
        }
      }
      return requests;
    },
  });

  // Fetch all entities with credit info
  const { data: entities = [], isLoading: loadingEntities } = useQuery({
    queryKey: ["admin-credit-entities"],
    queryFn: async () => {
      const result: EntityCredit[] = [];

      const { data: centri } = await supabase
        .from("centri_assistenza")
        .select("id, business_name, credit_balance, payment_status, last_credit_update")
        .eq("status", "approved");

      centri?.forEach((c: any) => {
        result.push({
          id: c.id,
          name: c.business_name,
          type: "centro",
          credit_balance: c.credit_balance || 0,
          payment_status: c.payment_status || "good_standing",
          last_credit_update: c.last_credit_update,
        });
      });

      const { data: corners } = await supabase
        .from("corners")
        .select("id, business_name, credit_balance, payment_status, last_credit_update")
        .eq("status", "approved");

      corners?.forEach((c: any) => {
        result.push({
          id: c.id,
          name: c.business_name,
          type: "corner",
          credit_balance: c.credit_balance || 0,
          payment_status: c.payment_status || "good_standing",
          last_credit_update: c.last_credit_update,
        });
      });

      return result.sort((a, b) => a.credit_balance - b.credit_balance);
    },
  });

  // Confirm topup mutation
  const confirmTopupMutation = useMutation({
    mutationFn: async (topupId: string) => {
      const { error } = await supabase.rpc("confirm_topup", {
        p_topup_id: topupId,
        p_confirmed_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-topup-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-credit-entities"] });
      toast.success("Ricarica confermata con successo");
    },
    onError: () => {
      toast.error("Errore nella conferma della ricarica");
    },
  });

  // Reject topup mutation
  const rejectTopupMutation = useMutation({
    mutationFn: async (topupId: string) => {
      const { error } = await supabase
        .from("topup_requests")
        .update({ status: "rejected" })
        .eq("id", topupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-topup-requests"] });
      toast.success("Richiesta rifiutata");
    },
    onError: () => {
      toast.error("Errore nel rifiuto della richiesta");
    },
  });

  // Manual topup mutation
  const manualTopupMutation = useMutation({
    mutationFn: async ({ entity, amount }: { entity: EntityCredit; amount: number }) => {
      // Create a pending topup request and immediately confirm it
      const { data: topupReq, error: insertError } = await supabase
        .from("topup_requests")
        .insert({
          entity_type: entity.type,
          entity_id: entity.id,
          amount: amount,
          payment_method: "manual",
          notes: "Ricarica manuale da admin",
          status: "pending",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { error: confirmError } = await supabase.rpc("confirm_topup", {
        p_topup_id: topupReq.id,
        p_confirmed_by: user?.id,
      });

      if (confirmError) throw confirmError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-credit-entities"] });
      toast.success("Credito aggiunto con successo");
      setShowManualTopup(false);
      setSelectedEntity(null);
      setManualAmount("");
    },
    onError: () => {
      toast.error("Errore nell'aggiunta del credito");
    },
  });

  const handleManualTopup = () => {
    if (!selectedEntity || !manualAmount) return;
    const amount = parseFloat(manualAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Inserisci un importo valido");
      return;
    }
    manualTopupMutation.mutate({ entity: selectedEntity, amount });
  };

  // Stats
  const totalCredit = entities.reduce((sum, e) => sum + e.credit_balance, 0);
  const suspendedCount = entities.filter((e) => e.payment_status === "suspended").length;
  const warningCount = entities.filter((e) => e.payment_status === "warning").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{totalCredit.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Credito Totale</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
                <p className="text-xs text-muted-foreground">Richieste Pendenti</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{warningCount}</p>
                <p className="text-xs text-muted-foreground">Saldo Basso</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Ban className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{suspendedCount}</p>
                <p className="text-xs text-muted-foreground">Sospesi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests" className="relative">
            <Clock className="h-4 w-4 mr-2" />
            Richieste Ricarica
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-warning text-warning-foreground text-xs flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="entities">
            <Building2 className="h-4 w-4 mr-2" />
            Gestione Saldi
          </TabsTrigger>
        </TabsList>

        {/* Pending Requests Tab */}
        <TabsContent value="requests" className="mt-4">
          {loadingRequests ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <Card className="bg-card/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nessuna richiesta di ricarica in attesa</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <Card key={req.id} className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {req.entity_type === "centro" ? (
                            <Building2 className="h-4 w-4 text-primary" />
                          ) : (
                            <Store className="h-4 w-4 text-primary" />
                          )}
                          <span className="font-semibold">{req.entity_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {req.entity_type === "centro" ? "Centro" : "Corner"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">€{req.amount.toFixed(2)}</span>
                          <span>{req.payment_method || "N/A"}</span>
                          {req.payment_reference && <span>Rif: {req.payment_reference}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(req.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                          {req.notes && ` • ${req.notes}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-success border-success/30 hover:bg-success/10"
                          onClick={() => confirmTopupMutation.mutate(req.id)}
                          disabled={confirmTopupMutation.isPending}
                        >
                          {confirmTopupMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          )}
                          Conferma
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => rejectTopupMutation.mutate(req.id)}
                          disabled={rejectTopupMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rifiuta
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Entities Tab */}
        <TabsContent value="entities" className="mt-4">
          {loadingEntities ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {entities.map((entity) => (
                  <Card key={entity.id} className="bg-card/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${entity.type === "centro" ? "bg-primary/10" : "bg-info/10"}`}>
                            {entity.type === "centro" ? (
                              <Building2 className="h-5 w-5 text-primary" />
                            ) : (
                              <Store className="h-5 w-5 text-info" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{entity.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{entity.type}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`font-bold text-lg ${entity.credit_balance < 0 ? "text-destructive" : ""}`}>
                              €{entity.credit_balance.toFixed(2)}
                            </p>
                            <Badge className={statusColors[entity.payment_status]}>
                              {statusLabels[entity.payment_status]}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedEntity(entity);
                              setShowManualTopup(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Aggiungi
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Manual Topup Dialog */}
      <Dialog open={showManualTopup} onOpenChange={setShowManualTopup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi Credito Manualmente</DialogTitle>
          </DialogHeader>
          {selectedEntity && (
            <div className="space-y-4 py-4">
              <Card className="bg-muted/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {selectedEntity.type === "centro" ? (
                      <Building2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Store className="h-5 w-5 text-info" />
                    )}
                    <div>
                      <p className="font-medium">{selectedEntity.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Saldo attuale: €{selectedEntity.credit_balance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label>Importo da aggiungere</Label>
                <Input
                  type="number"
                  placeholder="100.00"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  min={1}
                  step={10}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualTopup(false)}>
              Annulla
            </Button>
            <Button onClick={handleManualTopup} disabled={manualTopupMutation.isPending}>
              {manualTopupMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aggiungi Credito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
