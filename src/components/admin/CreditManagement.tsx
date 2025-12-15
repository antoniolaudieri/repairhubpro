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
  Minus,
  Loader2,
  Euro,
  Percent,
  Settings
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
  commission_rate: number;
  direct_to_centro_multiplier?: number;
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
  const [activeTab, setActiveTab] = useState("entities");
  const [selectedEntity, setSelectedEntity] = useState<EntityCredit | null>(null);
  const [manualAmount, setManualAmount] = useState("");
  const [showManualTopup, setShowManualTopup] = useState(false);
  const [showManualDeduct, setShowManualDeduct] = useState(false);
  const [deductReason, setDeductReason] = useState("");
  const [showEditCommission, setShowEditCommission] = useState(false);
  const [newCommissionRate, setNewCommissionRate] = useState("");
  const [newDirectMultiplier, setNewDirectMultiplier] = useState("");

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

      // Fetch centri
      const { data: centri } = await supabase
        .from("centri_assistenza")
        .select("id, business_name, credit_balance, payment_status, last_credit_update, commission_rate")
        .eq("status", "approved");

      centri?.forEach((c: any) => {
        result.push({
          id: c.id,
          name: c.business_name,
          type: "centro",
          credit_balance: c.credit_balance || 0,
          payment_status: c.payment_status || "good_standing",
          last_credit_update: c.last_credit_update,
          commission_rate: c.commission_rate || 70,
        });
      });

      // Fetch corners
      const { data: corners } = await supabase
        .from("corners")
        .select("id, business_name, credit_balance, payment_status, last_credit_update, commission_rate, direct_to_centro_multiplier")
        .eq("status", "approved");

      corners?.forEach((c: any) => {
        result.push({
          id: c.id,
          name: c.business_name,
          type: "corner",
          credit_balance: c.credit_balance || 0,
          payment_status: c.payment_status || "good_standing",
          last_credit_update: c.last_credit_update,
          commission_rate: c.commission_rate || 10,
          direct_to_centro_multiplier: c.direct_to_centro_multiplier ?? 50,
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

  // Manual deduct mutation
  const manualDeductMutation = useMutation({
    mutationFn: async ({ entity, amount, reason }: { entity: EntityCredit; amount: number; reason: string }) => {
      const table = entity.type === "centro" ? "centri_assistenza" : "corners";
      const newBalance = entity.credit_balance - amount;
      
      // Update balance
      const { error: updateError } = await supabase
        .from(table)
        .update({ 
          credit_balance: newBalance,
          last_credit_update: new Date().toISOString(),
          payment_status: newBalance <= 0 ? 'suspended' : newBalance < 50 ? 'warning' : 'good_standing'
        })
        .eq("id", entity.id);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: txError } = await supabase
        .from("credit_transactions")
        .insert({
          entity_type: entity.type,
          entity_id: entity.id,
          transaction_type: "manual_deduction",
          amount: -amount,
          balance_after: newBalance,
          description: reason || "Deduzione manuale da admin",
          created_by: user?.id
        });

      if (txError) throw txError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-credit-entities"] });
      toast.success("Credito rimosso con successo");
      setShowManualDeduct(false);
      setSelectedEntity(null);
      setManualAmount("");
      setDeductReason("");
    },
    onError: () => {
      toast.error("Errore nella rimozione del credito");
    },
  });

  // Update commission rate mutation
  const updateCommissionMutation = useMutation({
    mutationFn: async ({ entity, rate, directMultiplier }: { entity: EntityCredit; rate: number; directMultiplier?: number }) => {
      const table = entity.type === "centro" ? "centri_assistenza" : "corners";
      const updateData: any = { commission_rate: rate };
      
      // Only corners have direct_to_centro_multiplier
      if (entity.type === "corner" && directMultiplier !== undefined) {
        updateData.direct_to_centro_multiplier = directMultiplier;
      }
      
      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq("id", entity.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-credit-entities"] });
      toast.success("Commissione aggiornata");
      setShowEditCommission(false);
      setSelectedEntity(null);
      setNewCommissionRate("");
      setNewDirectMultiplier("");
    },
    onError: () => {
      toast.error("Errore nell'aggiornamento della commissione");
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

  const handleManualDeduct = () => {
    if (!selectedEntity || !manualAmount) return;
    const amount = parseFloat(manualAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Inserisci un importo valido");
      return;
    }
    manualDeductMutation.mutate({ entity: selectedEntity, amount, reason: deductReason });
  };

  const handleUpdateCommission = () => {
    if (!selectedEntity || !newCommissionRate) return;
    const rate = parseFloat(newCommissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Inserisci una percentuale valida (0-100)");
      return;
    }
    
    let directMultiplier: number | undefined;
    if (selectedEntity.type === "corner" && newDirectMultiplier) {
      directMultiplier = parseFloat(newDirectMultiplier);
      if (isNaN(directMultiplier) || directMultiplier < 0 || directMultiplier > 100) {
        toast.error("Inserisci un moltiplicatore valido (0-100)");
        return;
      }
    }
    
    updateCommissionMutation.mutate({ entity: selectedEntity, rate, directMultiplier });
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
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="capitalize">{entity.type}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Percent className="h-3 w-3" />
                                {entity.commission_rate}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-end md:items-center gap-2">
                          <div className="text-right">
                            <p className={`font-bold text-lg ${entity.credit_balance < 0 ? "text-destructive" : ""}`}>
                              {entity.credit_balance < 0 ? "Debito: " : ""}€{Math.abs(entity.credit_balance).toFixed(2)}
                            </p>
                            <Badge className={statusColors[entity.payment_status]}>
                              {statusLabels[entity.payment_status]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedEntity(entity);
                                setNewCommissionRate(entity.commission_rate.toString());
                                setNewDirectMultiplier(entity.direct_to_centro_multiplier?.toString() || "50");
                                setShowEditCommission(true);
                              }}
                              title="Modifica commissione"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedEntity(entity);
                                setManualAmount("");
                                setShowManualTopup(true);
                              }}
                              className="text-success border-success/30 hover:bg-success/10"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Aggiungi
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedEntity(entity);
                                setManualAmount("");
                                setDeductReason("");
                                setShowManualDeduct(true);
                              }}
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            >
                              <Minus className="h-4 w-4 mr-1" />
                              Togli
                            </Button>
                          </div>
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

      {/* Manual Deduct Dialog */}
      <Dialog open={showManualDeduct} onOpenChange={setShowManualDeduct}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Rimuovi Credito Manualmente</DialogTitle>
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
                <Label>Importo da rimuovere</Label>
                <Input
                  type="number"
                  placeholder="50.00"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  min={1}
                  step={10}
                />
              </div>

              <div className="space-y-2">
                <Label>Motivo (opzionale)</Label>
                <Input
                  placeholder="Es: Rettifica saldo, penale, ecc."
                  value={deductReason}
                  onChange={(e) => setDeductReason(e.target.value)}
                />
              </div>

              <Card className="bg-destructive/5 border-destructive/20">
                <CardContent className="p-3 text-sm text-destructive">
                  ⚠️ Questa operazione rimuoverà €{manualAmount || "0"} dal saldo. Il nuovo saldo sarà: €{(selectedEntity.credit_balance - (parseFloat(manualAmount) || 0)).toFixed(2)}
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualDeduct(false)}>
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleManualDeduct} 
              disabled={manualDeductMutation.isPending}
            >
              {manualDeductMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Rimuovi Credito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Commission Dialog */}
      <Dialog open={showEditCommission} onOpenChange={setShowEditCommission}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Commissione</DialogTitle>
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
                        Commissione attuale: {selectedEntity.commission_rate}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label>
                  {selectedEntity.type === "centro" 
                    ? "Commissione Centro (% del margine)" 
                    : "Commissione Corner (% del margine)"}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder={selectedEntity.type === "centro" ? "70" : "10"}
                    value={newCommissionRate}
                    onChange={(e) => setNewCommissionRate(e.target.value)}
                    min={0}
                    max={100}
                    step={1}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedEntity.type === "centro" 
                    ? "Percentuale del margine lordo che il Centro guadagna (default: 70%)"
                    : "Percentuale del margine lordo che il Corner guadagna come referral (default: 10%)"}
                </p>
              </div>

              {/* Direct to Centro Multiplier - Only for Corners */}
              {selectedEntity.type === "corner" && (
                <div className="space-y-2">
                  <Label>Moltiplicatore Consegna Diretta (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="50"
                      value={newDirectMultiplier}
                      onChange={(e) => setNewDirectMultiplier(e.target.value)}
                      min={0}
                      max={100}
                      step={5}
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Percentuale della commissione Corner quando il cliente va direttamente al Centro (default: 50% = metà commissione)
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditCommission(false)}>
              Annulla
            </Button>
            <Button onClick={handleUpdateCommission} disabled={updateCommissionMutation.isPending}>
              {updateCommissionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salva Commissione
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
