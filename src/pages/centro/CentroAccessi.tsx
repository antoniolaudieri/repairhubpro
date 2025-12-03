import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Share2,
  Eye,
  Package,
  Trash2,
  User
} from "lucide-react";
import { toast } from "sonner";

interface Centro {
  id: string;
  business_name: string;
}

interface InventoryAccess {
  id: string;
  can_view: boolean;
  can_reserve: boolean;
  is_active: boolean;
  riparatori: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  };
}

interface Riparatore {
  id: string;
  full_name: string;
  email: string;
}

export default function CentroAccessi() {
  const { user } = useAuth();
  const [centro, setCentro] = useState<Centro | null>(null);
  const [accesses, setAccesses] = useState<InventoryAccess[]>([]);
  const [availableRiparatori, setAvailableRiparatori] = useState<Riparatore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    riparatore_id: "",
    can_view: true,
    can_reserve: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: centroData, error: centroError } = await supabase
        .from("centri_assistenza")
        .select("id, business_name")
        .eq("owner_user_id", user.id)
        .single();

      if (centroError) throw centroError;
      setCentro(centroData);

      if (centroData) {
        // Fetch inventory accesses
        const { data: accessesData, error: accessesError } = await supabase
          .from("inventory_access")
          .select(`
            *,
            riparatori (id, full_name, email, phone)
          `)
          .eq("centro_id", centroData.id)
          .order("created_at", { ascending: false });

        if (accessesError) throw accessesError;
        setAccesses(accessesData || []);

        // Fetch available riparatori
        const existingRiparatoriIds = (accessesData || []).map((a) => a.riparatori?.id).filter(Boolean);

        const { data: riparatoriData } = await supabase
          .from("riparatori")
          .select("id, full_name, email")
          .eq("status", "approved")
          .not("id", "in", existingRiparatoriIds.length > 0 ? `(${existingRiparatoriIds.join(",")})` : "(00000000-0000-0000-0000-000000000000)");

        setAvailableRiparatori(riparatoriData || []);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAddAccess = async () => {
    if (!centro || !formData.riparatore_id) {
      toast.error("Seleziona un riparatore");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("inventory_access").insert({
        centro_id: centro.id,
        riparatore_id: formData.riparatore_id,
        can_view: formData.can_view,
        can_reserve: formData.can_reserve,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Accesso condiviso");
      setIsAddDialogOpen(false);
      setFormData({ riparatore_id: "", can_view: true, can_reserve: false });
      fetchData();
    } catch (error: any) {
      console.error("Error adding access:", error);
      toast.error("Errore nella condivisione");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAccess = async (accessId: string, updates: Partial<InventoryAccess>) => {
    try {
      const { error } = await supabase
        .from("inventory_access")
        .update(updates)
        .eq("id", accessId);

      if (error) throw error;
      toast.success("Accesso aggiornato");
      fetchData();
    } catch (error: any) {
      console.error("Error updating access:", error);
      toast.error("Errore nell'aggiornamento");
    }
  };

  const handleDeleteAccess = async (accessId: string) => {
    if (!confirm("Sei sicuro di voler revocare questo accesso?")) return;

    try {
      const { error } = await supabase.from("inventory_access").delete().eq("id", accessId);
      if (error) throw error;
      toast.success("Accesso revocato");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting access:", error);
      toast.error("Errore nella revoca");
    }
  };

  if (isLoading) {
    return (
      <CentroLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </CentroLayout>
    );
  }

  return (
    <CentroLayout>
      <PageTransition>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Accessi Condivisi</h1>
              <p className="text-muted-foreground">
                Gestisci l'accesso al tuo inventario da parte di riparatori esterni
              </p>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Condividi Accesso
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Condividi Accesso Inventario</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Seleziona Riparatore *</Label>
                    <Select
                      value={formData.riparatore_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, riparatore_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona un riparatore" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRiparatori.length === 0 ? (
                          <SelectItem value="none" disabled>
                            Nessun riparatore disponibile
                          </SelectItem>
                        ) : (
                          availableRiparatori.map((rip) => (
                            <SelectItem key={rip.id} value={rip.id}>
                              {rip.full_name} - {rip.email}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Può visualizzare inventario</Label>
                        <p className="text-xs text-muted-foreground">
                          Permette di vedere i ricambi disponibili
                        </p>
                      </div>
                      <Switch
                        checked={formData.can_view}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, can_view: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Può prenotare ricambi</Label>
                        <p className="text-xs text-muted-foreground">
                          Permette di riservare ricambi per i propri lavori
                        </p>
                      </div>
                      <Switch
                        checked={formData.can_reserve}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, can_reserve: checked })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Annulla
                    </Button>
                    <Button onClick={handleAddAccess} disabled={isSaving}>
                      {isSaving ? "Condivisione..." : "Condividi"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Info Card */}
          <Card className="border-blue-500/50 bg-blue-500/10">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Share2 className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-600">Condivisione Inventario</p>
                  <p className="text-sm text-muted-foreground">
                    Puoi condividere l'accesso al tuo inventario con riparatori esterni.
                    Loro potranno visualizzare i tuoi ricambi disponibili e, se abilitati,
                    prenotarli per i propri lavori.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Share2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{accesses.length}</p>
                    <p className="text-xs text-muted-foreground">Accessi Totali</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Eye className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {accesses.filter((a) => a.is_active && a.can_view).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Con Visualizzazione</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Package className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {accesses.filter((a) => a.is_active && a.can_reserve).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Con Prenotazione</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Accesses List */}
          <Card>
            <CardHeader>
              <CardTitle>Accessi Condivisi ({accesses.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {accesses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Share2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun accesso condiviso</p>
                  <p className="text-sm">Condividi l'accesso al tuo inventario con riparatori</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accesses.map((access) => (
                    <div
                      key={access.id}
                      className={`p-4 rounded-lg border border-border transition-colors ${
                        access.is_active ? "bg-card/50" : "bg-muted/30 opacity-60"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-full bg-muted">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {access.riparatori?.full_name || "N/D"}
                              </span>
                              {!access.is_active && (
                                <Badge variant="secondary">Inattivo</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {access.riparatori?.email}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={access.can_view}
                                  onCheckedChange={(checked) =>
                                    handleUpdateAccess(access.id, { can_view: checked })
                                  }
                                />
                                <span className="text-sm">Visualizza</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={access.can_reserve}
                                  onCheckedChange={(checked) =>
                                    handleUpdateAccess(access.id, { can_reserve: checked })
                                  }
                                />
                                <span className="text-sm">Prenota</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleUpdateAccess(access.id, { is_active: !access.is_active })
                            }
                          >
                            {access.is_active ? "Disattiva" : "Riattiva"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAccess(access.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </CentroLayout>
  );
}