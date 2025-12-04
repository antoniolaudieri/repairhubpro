import { useEffect, useState } from "react";
import { CornerLayout } from "@/layouts/CornerLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, MapPin, Save, Loader2 } from "lucide-react";

interface CornerData {
  id: string;
  business_name: string;
  address: string;
  phone: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
}

export default function CornerImpostazioni() {
  const { user } = useAuth();
  const [corner, setCorner] = useState<CornerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  // Form state
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchCornerData();
    }
  }, [user]);

  const fetchCornerData = async () => {
    try {
      const { data, error } = await supabase
        .from("corners")
        .select("id, business_name, address, phone, email, latitude, longitude")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;

      setCorner(data);
      setAddress(data.address || "");
      setLatitude(data.latitude);
      setLongitude(data.longitude);
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
        </div>
      </PageTransition>
    </CornerLayout>
  );
}
