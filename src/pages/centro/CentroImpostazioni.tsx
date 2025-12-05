import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { 
  Settings,
  Building2,
  MapPin,
  Phone,
  Mail,
  Save,
  Upload,
  Image as ImageIcon,
  Trash2,
  Receipt
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface CentroSettings {
  disable_diagnostic_fee?: boolean;
  [key: string]: boolean | string | number | undefined;
}

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
  logo_url: string | null;
  settings: CentroSettings | null;
}

export default function CentroImpostazioni() {
  const { user } = useAuth();
  const [centro, setCentro] = useState<Centro | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [disableDiagnosticFee, setDisableDiagnosticFee] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
      
      const settings = centroData.settings as CentroSettings | null;
      setDisableDiagnosticFee(settings?.disable_diagnostic_fee || false);
      
      setCentro({
        id: centroData.id,
        business_name: centroData.business_name,
        address: centroData.address,
        phone: centroData.phone,
        email: centroData.email,
        vat_number: centroData.vat_number,
        latitude: centroData.latitude,
        longitude: centroData.longitude,
        commission_rate: centroData.commission_rate,
        notes: centroData.notes,
        logo_url: centroData.logo_url,
        settings: settings,
      });
      
      setLatitude(centroData.latitude);
      setLongitude(centroData.longitude);
      
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
      const newSettings: CentroSettings = {
        ...(centro.settings as CentroSettings || {}),
        disable_diagnostic_fee: disableDiagnosticFee,
      };
      
      const { error } = await supabase
        .from("centri_assistenza")
        .update({
          business_name: formData.business_name,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          vat_number: formData.vat_number || null,
          notes: formData.notes || null,
          latitude,
          longitude,
          settings: newSettings,
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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !centro) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Seleziona un file immagine");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Il file deve essere inferiore a 2MB");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${centro.id}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('centro-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('centro-logos')
        .getPublicUrl(filePath);

      // Update centro record with logo URL
      const { error: updateError } = await supabase
        .from('centri_assistenza')
        .update({ logo_url: publicUrl })
        .eq('id', centro.id);

      if (updateError) throw updateError;

      toast.success("Logo caricato con successo");
      fetchData();
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error("Errore nel caricamento del logo");
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!centro) return;

    setIsUploadingLogo(true);
    try {
      // Remove from storage
      const fileName = centro.logo_url?.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('centro-logos')
          .remove([fileName]);
      }

      // Update centro record
      const { error } = await supabase
        .from('centri_assistenza')
        .update({ logo_url: null })
        .eq('id', centro.id);

      if (error) throw error;

      toast.success("Logo rimosso");
      fetchData();
    } catch (error: any) {
      console.error("Error removing logo:", error);
      toast.error("Errore nella rimozione del logo");
    } finally {
      setIsUploadingLogo(false);
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

          {/* Logo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Logo Attività
              </CardTitle>
              <CardDescription>
                Carica il logo della tua attività (max 2MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative">
                  {centro?.logo_url ? (
                    <div className="h-24 w-24 rounded-xl overflow-hidden border-2 border-border shadow-md">
                      <img 
                        src={centro.logo_url} 
                        alt="Logo" 
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-24 w-24 rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
                      <Building2 className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploadingLogo ? "Caricamento..." : "Carica Logo"}
                  </Button>
                  {centro?.logo_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      disabled={isUploadingLogo}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Rimuovi
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

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

          {/* Diagnostic Fee Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Fee Diagnostico
              </CardTitle>
              <CardDescription>
                Gestisci il fee diagnostico di €15 applicato ai nuovi ritiri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Disabilita Fee Diagnostico</p>
                  <p className="text-sm text-muted-foreground">
                    Se attivo, i nuovi ritiri non avranno il fee di €15
                  </p>
                </div>
                <Switch
                  checked={disableDiagnosticFee}
                  onCheckedChange={setDisableDiagnosticFee}
                />
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

          {/* Location Picker */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Posizione sulla Mappa
              </CardTitle>
              <CardDescription>
                Clicca sulla mappa per posizionare il tuo centro o usa il pulsante per rilevare la posizione
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LocationPicker
                latitude={latitude}
                longitude={longitude}
                onLocationChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                onGeolocate={() => {
                  setGeoLoading(true);
                  if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        setLatitude(position.coords.latitude);
                        setLongitude(position.coords.longitude);
                        setGeoLoading(false);
                        toast.success("Posizione rilevata");
                      },
                      (error) => {
                        console.error("Geolocation error:", error);
                        toast.error("Impossibile rilevare la posizione");
                        setGeoLoading(false);
                      }
                    );
                  } else {
                    toast.error("Geolocalizzazione non supportata");
                    setGeoLoading(false);
                  }
                }}
                geoLoading={geoLoading}
              />
            </CardContent>
          </Card>

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