import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Users,
  User,
  Phone,
  Mail,
  Edit,
  Trash2,
  UserCheck
} from "lucide-react";
import { toast } from "sonner";

interface Centro {
  id: string;
  business_name: string;
}

interface Collaborator {
  id: string;
  role: string;
  commission_share: number | null;
  is_active: boolean;
  user_id: string | null;
  riparatore_id: string | null;
  riparatori: {
    id: string;
    full_name: string;
    phone: string;
    email: string;
  } | null;
}

interface Riparatore {
  id: string;
  full_name: string;
  phone: string;
  email: string;
}

const roleLabels: Record<string, string> = {
  employee: "Dipendente",
  technician: "Tecnico",
  manager: "Responsabile",
};

export default function CentroCollaboratori() {
  const { user } = useAuth();
  const [centro, setCentro] = useState<Centro | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [availableRiparatori, setAvailableRiparatori] = useState<Riparatore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    riparatore_id: "",
    role: "technician",
    commission_share: "0",
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
        // Fetch collaborators
        const { data: collaboratorsData, error: collaboratorsError } = await supabase
          .from("centro_collaboratori")
          .select(`
            *,
            riparatori (id, full_name, phone, email)
          `)
          .eq("centro_id", centroData.id)
          .order("created_at", { ascending: false });

        if (collaboratorsError) throw collaboratorsError;
        setCollaborators(collaboratorsData || []);

        // Fetch available riparatori (approved ones not already collaborating)
        const existingRiparatoriIds = (collaboratorsData || [])
          .filter((c) => c.riparatore_id)
          .map((c) => c.riparatore_id);

        const { data: riparatoriData } = await supabase
          .from("riparatori")
          .select("id, full_name, phone, email")
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

  const handleAddCollaborator = async () => {
    if (!centro || !formData.riparatore_id) {
      toast.error("Seleziona un riparatore");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("centro_collaboratori").insert({
        centro_id: centro.id,
        riparatore_id: formData.riparatore_id,
        role: formData.role,
        commission_share: parseFloat(formData.commission_share) || 0,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Collaboratore aggiunto");
      setIsAddDialogOpen(false);
      setFormData({ riparatore_id: "", role: "technician", commission_share: "0" });
      fetchData();
    } catch (error: any) {
      console.error("Error adding collaborator:", error);
      toast.error("Errore nell'aggiunta del collaboratore");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (collaboratorId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("centro_collaboratori")
        .update({ is_active: !isActive })
        .eq("id", collaboratorId);

      if (error) throw error;
      toast.success(isActive ? "Collaboratore disattivato" : "Collaboratore riattivato");
      fetchData();
    } catch (error: any) {
      console.error("Error updating collaborator:", error);
      toast.error("Errore nell'aggiornamento");
    }
  };

  const handleDelete = async (collaboratorId: string) => {
    if (!confirm("Sei sicuro di voler rimuovere questo collaboratore?")) return;

    try {
      const { error } = await supabase
        .from("centro_collaboratori")
        .delete()
        .eq("id", collaboratorId);

      if (error) throw error;
      toast.success("Collaboratore rimosso");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting collaborator:", error);
      toast.error("Errore nella rimozione");
    }
  };

  const filteredCollaborators = collaborators.filter((collab) => {
    const name = collab.riparatori?.full_name || "";
    const email = collab.riparatori?.email || "";
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

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
              <h1 className="text-2xl font-bold">Collaboratori</h1>
              <p className="text-muted-foreground">
                Gestisci i tecnici e collaboratori del tuo centro
              </p>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Collaboratore
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Aggiungi Collaboratore</DialogTitle>
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

                  <div>
                    <Label>Ruolo</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technician">Tecnico</SelectItem>
                        <SelectItem value="employee">Dipendente</SelectItem>
                        <SelectItem value="manager">Responsabile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Quota Commissione (%)</Label>
                    <Input
                      type="number"
                      value={formData.commission_share}
                      onChange={(e) =>
                        setFormData({ ...formData, commission_share: e.target.value })
                      }
                      placeholder="0"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Percentuale della commissione del centro da condividere
                    </p>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Annulla
                    </Button>
                    <Button onClick={handleAddCollaborator} disabled={isSaving}>
                      {isSaving ? "Aggiunta..." : "Aggiungi"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{collaborators.length}</p>
                    <p className="text-xs text-muted-foreground">Totale Collaboratori</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <UserCheck className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {collaborators.filter((c) => c.is_active).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Attivi</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{availableRiparatori.length}</p>
                    <p className="text-xs text-muted-foreground">Disponibili</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca collaboratore..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Collaborators List */}
          <Card>
            <CardHeader>
              <CardTitle>Collaboratori ({filteredCollaborators.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredCollaborators.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun collaboratore trovato</p>
                  <p className="text-sm">Aggiungi collaboratori per gestire il tuo team</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCollaborators.map((collab) => (
                    <div
                      key={collab.id}
                      className={`p-4 rounded-lg border border-border transition-colors ${
                        collab.is_active ? "bg-card/50" : "bg-muted/30 opacity-60"
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
                                {collab.riparatori?.full_name || "N/D"}
                              </span>
                              <Badge variant="outline">{roleLabels[collab.role] || collab.role}</Badge>
                              {!collab.is_active && (
                                <Badge variant="secondary">Inattivo</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              {collab.riparatori?.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {collab.riparatori.email}
                                </span>
                              )}
                              {collab.riparatori?.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {collab.riparatori.phone}
                                </span>
                              )}
                            </div>
                            {collab.commission_share > 0 && (
                              <p className="text-sm text-green-600 mt-1">
                                Quota commissione: {collab.commission_share}%
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(collab.id, collab.is_active)}
                          >
                            {collab.is_active ? "Disattiva" : "Riattiva"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(collab.id)}
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