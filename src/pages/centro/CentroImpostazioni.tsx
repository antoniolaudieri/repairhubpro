import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Settings,
  Building2,
  MapPin,
  Phone,
  Mail,
  Save
} from "lucide-react";
import { toast } from "sonner";

interface Centro {
  id: string;
  business_name: string;
  address: string;
  phone: string;
  email: string;
  vat_number: string | null;
  latitude: number | null;
  longitude: number | null;
  commission_rate: number;
  notes: string | null;
}

export default function CentroImpostazioni() {
  const { user } = useAuth();
  const [centro, setCentro] = useState<Centro | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    business_name: "",
    address: "",
    phone: "",
    email: "",
    vat_number: "",
    notes: "",
  });

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: centroData, error: centroError } = await supabase
        .from("centri_assistenza")
        .select("*")
        .eq("owner_user_id", user.id)
        .single();

      if (centroError) throw centroError;
      setCentro(centroData);
      
      setFormData({
        business_name: centroData.business_name || "",
        address: centroData.address || "",
        phone: centroData.phone || "",
        email: centroData.email || "",
        vat_number: centroData.vat_number || "",
        notes: centroData.notes || "",
      });
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

  const handleSave = async () => {
    if (!centro) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("centri_assistenza")
        .update({
          business_name: formData.business_name,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          vat_number: formData.vat_number || null,
          notes: formData.notes || null,
        })
        .eq("id", centro.id);

      if (error) throw error;
      toast.success("Impostazioni salvate");
      fetchData();
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error("Errore nel salvataggio");
    } finally {
      setIsSaving(false);
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
        <div className="space-y-6 max-w-2xl">
          <div>
            <h1 className="text-2xl font-bold">Impostazioni</h1>
            <p className="text-muted-foreground">
              Gestisci le informazioni del tuo centro assistenza
            </p>
          </div>

          {/* Business Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informazioni Azienda
              </CardTitle>
              <CardDescription>
                Modifica i dati della tua attività
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome Attività *</Label>
                <Input
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  placeholder="Nome del centro assistenza"
                />
              </div>

              <div>
                <Label>Partita IVA</Label>
                <Input
                  value={formData.vat_number}
                  onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                  placeholder="IT01234567890"
                />
              </div>

              <div>
                <Label>Note</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Note aggiuntive..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contatti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Indirizzo *</Label>
                <div className="flex gap-2">
                  <MapPin className="h-4 w-4 mt-3 text-muted-foreground" />
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Via, numero civico, città"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Telefono *</Label>
                  <div className="flex gap-2">
                    <Phone className="h-4 w-4 mt-3 text-muted-foreground" />
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+39 123 456 7890"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Email *</Label>
                  <div className="flex gap-2">
                    <Mail className="h-4 w-4 mt-3 text-muted-foreground" />
                    <Input
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commission Info (Read Only) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Commissioni
              </CardTitle>
              <CardDescription>
                Le tue commissioni sono gestite dalla piattaforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Tua Quota Commissione</p>
                    <p className="text-sm text-muted-foreground">
                      Percentuale del margine lordo che ricevi per ogni lavoro
                    </p>
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    {centro?.commission_rate || 70}%
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Per modificare la tua commissione, contatta l'amministratore della piattaforma.
              </p>
            </CardContent>
          </Card>

          {/* Location Info */}
          {centro?.latitude && centro?.longitude && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Posizione
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Latitudine:</span>{" "}
                    {centro.latitude.toFixed(6)}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Longitudine:</span>{" "}
                    {centro.longitude.toFixed(6)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvataggio..." : "Salva Modifiche"}
            </Button>
          </div>
        </div>
      </PageTransition>
    </CentroLayout>
  );
}