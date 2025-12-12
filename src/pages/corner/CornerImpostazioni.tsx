import { useEffect, useState, useRef } from "react";
import { CornerLayout } from "@/layouts/CornerLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { PushNotificationSettings } from "@/components/notifications/PushNotificationSettings";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, MapPin, Save, Loader2, Upload, Store, X, Image as ImageIcon } from "lucide-react";

interface CornerData {
  id: string;
  business_name: string;
  address: string;
  phone: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
}

export default function CornerImpostazioni() {
  const { user } = useAuth();
  const [corner, setCorner] = useState<CornerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchCornerData();
    }
  }, [user]);

  const fetchCornerData = async () => {
    try {
      const { data, error } = await supabase
        .from("corners")
        .select("id, business_name, address, phone, email, latitude, longitude, logo_url")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;

      setCorner(data);
      setAddress(data.address || "");
      setLatitude(data.latitude);
      setLongitude(data.longitude);
      setLogoUrl(data.logo_url);
    } catch (error) {
      console.error("Error fetching corner data:", error);
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeolocate = () => {
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
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !corner) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Seleziona un file immagine valido");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Il file deve essere inferiore a 2MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `corner-${corner.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("centro-logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("centro-logos")
        .getPublicUrl(fileName);

      setLogoUrl(urlData.publicUrl);
      toast.success("Logo caricato con successo");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Errore nel caricamento del logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = () => {
    setLogoUrl(null);
  };

  const handleSave = async () => {
    if (!corner) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("corners")
        .update({
          address,
          latitude,
          longitude,
          logo_url: logoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", corner.id);

      if (error) throw error;

      toast.success("Impostazioni salvate con successo");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Errore nel salvataggio");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <CornerLayout>
        <PageTransition>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </PageTransition>
      </CornerLayout>
    );
  }

  return (
    <CornerLayout>
      <PageTransition>
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Impostazioni</h1>
              <p className="text-muted-foreground">
                Gestisci le informazioni del tuo Corner
              </p>
            </div>
          </div>

          {/* Logo Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                Logo Attività
              </CardTitle>
              <CardDescription>
                Carica il logo del tuo Corner per personalizzare il tuo profilo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                {/* Logo Preview */}
                <div className="relative">
                  {logoUrl ? (
                    <div className="relative group">
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="w-24 h-24 rounded-xl object-cover border-2 border-border shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
                      <Store className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div className="flex-1 space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="gap-2"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {logoUrl ? "Cambia Logo" : "Carica Logo"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">
                    Formati: JPG, PNG, WebP. Max 2MB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Posizione e Indirizzo
              </CardTitle>
              <CardDescription>
                Aggiorna la posizione del tuo Corner per ricevere segnalazioni dai clienti vicini
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Business Name (read-only) */}
              <div className="space-y-2">
                <Label>Nome Attività</Label>
                <Input value={corner?.business_name || ""} disabled className="bg-muted" />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Indirizzo</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Via, Numero, Città"
                />
              </div>

              {/* Location Picker */}
              <div className="space-y-2">
                <Label>Posizione sulla Mappa</Label>
                <LocationPicker
                  latitude={latitude}
                  longitude={longitude}
                  onLocationChange={handleLocationChange}
                  onGeolocate={handleGeolocate}
                  geoLoading={geoLoading}
                />
              </div>

              {/* Contact Info (read-only) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={corner?.email || ""} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Telefono</Label>
                  <Input value={corner?.phone || ""} disabled className="bg-muted" />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salva Modifiche
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Push Notifications */}
          <PushNotificationSettings />
        </div>
      </PageTransition>
    </CornerLayout>
  );
}
