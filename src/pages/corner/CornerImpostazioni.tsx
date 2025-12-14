import { useEffect, useState, useRef, useMemo } from "react";
import { CornerLayout } from "@/layouts/CornerLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { PushNotificationSettings } from "@/components/notifications/PushNotificationSettings";
import { DymoPrinterSettings } from "@/components/settings/DymoPrinterSettings";
import { OpeningHoursEditor, OpeningHours, defaultOpeningHours } from "@/components/settings/OpeningHoursEditor";
import { UnsavedChangesDialog } from "@/components/settings/UnsavedChangesDialog";
import { DisplayAdEditor, DisplayAd } from "@/components/centro/DisplayAdEditor";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { LabelFormat } from "@/utils/labelTemplates";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, MapPin, Save, Loader2, Upload, Store, X, Image as ImageIcon, Monitor, Plus, Trash2, Edit, ExternalLink, Copy, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface CornerSettings {
  display_ads?: DisplayAd[];
  slide_interval?: number;
}

interface CornerData {
  id: string;
  business_name: string;
  address: string;
  phone: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  opening_hours: OpeningHours | null;
  settings: CornerSettings | null;
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
  const [openingHours, setOpeningHours] = useState<OpeningHours | null>(null);
  
  // Display settings
  const [displayAds, setDisplayAds] = useState<DisplayAd[]>([]);
  const [slideInterval, setSlideInterval] = useState(5000);
  const [editingAd, setEditingAd] = useState<DisplayAd | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  
  // Track original values for change detection
  const [originalValues, setOriginalValues] = useState<{
    address: string;
    latitude: number | null;
    longitude: number | null;
    logoUrl: string | null;
    openingHours: string;
    displayAds: string;
    slideInterval: number;
  } | null>(null);

  // Detect unsaved changes
  const hasChanges = useMemo(() => {
    if (!originalValues || !corner) return false;
    return (
      address !== originalValues.address ||
      latitude !== originalValues.latitude ||
      longitude !== originalValues.longitude ||
      logoUrl !== originalValues.logoUrl ||
      JSON.stringify(openingHours) !== originalValues.openingHours ||
      JSON.stringify(displayAds) !== originalValues.displayAds ||
      slideInterval !== originalValues.slideInterval
    );
  }, [address, latitude, longitude, logoUrl, openingHours, displayAds, slideInterval, originalValues, corner]);

  const { showDialog, closeDialog } = useUnsavedChanges(hasChanges);
  // Dymo state (stored in localStorage for Corner)
  const [dymoEnabled, setDymoEnabled] = useState(() => {
    const saved = localStorage.getItem('corner_dymo_enabled');
    return saved === 'true';
  });
  const [dymoPrinter, setDymoPrinter] = useState<string | null>(() => {
    return localStorage.getItem('corner_dymo_printer');
  });
  const [dymoLabelFormat, setDymoLabelFormat] = useState<LabelFormat>(() => {
    return (localStorage.getItem('corner_dymo_format') as LabelFormat) || '30252';
  });

  // Persist Dymo settings to localStorage
  useEffect(() => {
    localStorage.setItem('corner_dymo_enabled', String(dymoEnabled));
  }, [dymoEnabled]);

  useEffect(() => {
    if (dymoPrinter) {
      localStorage.setItem('corner_dymo_printer', dymoPrinter);
    }
  }, [dymoPrinter]);

  useEffect(() => {
    localStorage.setItem('corner_dymo_format', dymoLabelFormat);
  }, [dymoLabelFormat]);

  useEffect(() => {
    if (user) {
      fetchCornerData();
    }
  }, [user]);

  const fetchCornerData = async () => {
    try {
      const { data, error } = await supabase
        .from("corners")
        .select("id, business_name, address, phone, email, latitude, longitude, logo_url, opening_hours, settings")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;

      setCorner({
        ...data,
        opening_hours: data.opening_hours as unknown as OpeningHours | null,
        settings: data.settings as unknown as CornerSettings | null,
      });
      setAddress(data.address || "");
      setLatitude(data.latitude);
      setLongitude(data.longitude);
      setLogoUrl(data.logo_url);
      setOpeningHours(data.opening_hours as unknown as OpeningHours | null);
      
      // Load display settings
      const settings = data.settings as unknown as CornerSettings | null;
      if (settings?.display_ads) {
        setDisplayAds(settings.display_ads);
      }
      if (settings?.slide_interval) {
        setSlideInterval(settings.slide_interval);
      }
      
      // Store original values for change detection
      setOriginalValues({
        address: data.address || "",
        latitude: data.latitude,
        longitude: data.longitude,
        logoUrl: data.logo_url,
        openingHours: JSON.stringify(data.opening_hours),
        displayAds: JSON.stringify(settings?.display_ads || []),
        slideInterval: settings?.slide_interval || 5000,
      });
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
      const newSettings: CornerSettings = {
        display_ads: displayAds,
        slide_interval: slideInterval,
      };
      
      const { error } = await supabase
        .from("corners")
        .update({
          address,
          latitude,
          longitude,
          logo_url: logoUrl,
          opening_hours: openingHours as any,
          settings: newSettings as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", corner.id);

      if (error) throw error;

      // Update original values after successful save
      setOriginalValues({
        address,
        latitude,
        longitude,
        logoUrl,
        openingHours: JSON.stringify(openingHours),
        displayAds: JSON.stringify(displayAds),
        slideInterval,
      });

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

            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-primary" />
                Display Esterno
              </CardTitle>
              <CardDescription>
                Configura le pubblicità da mostrare sul display esterno per i clienti
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Display URL */}
              {corner && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Link Display</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const url = `${window.location.origin}/display/corner/${corner.id}`;
                          navigator.clipboard.writeText(url);
                          toast.success("Link copiato!");
                        }}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copia
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowQRCode(!showQRCode)}
                      >
                        <QrCode className="h-4 w-4 mr-1" />
                        QR
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/display/corner/${corner.id}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Apri
                      </Button>
                    </div>
                  </div>
                  <code className="text-xs text-muted-foreground block truncate">
                    {window.location.origin}/display/corner/{corner.id}
                  </code>
                  {showQRCode && (
                    <div className="flex justify-center p-4 bg-white rounded-lg">
                      <QRCodeSVG value={`${window.location.origin}/display/corner/${corner.id}`} size={150} />
                    </div>
                  )}
                </div>
              )}

              {/* Slide Interval */}
              <div className="space-y-3">
                <Label>Intervallo Slide: {slideInterval / 1000}s</Label>
                <Slider
                  value={[slideInterval]}
                  onValueChange={(value) => setSlideInterval(value[0])}
                  min={3000}
                  max={15000}
                  step={1000}
                />
              </div>

              {/* Ads List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Slide Pubblicità ({displayAds.length})</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newAd: DisplayAd = {
                        id: `ad-${Date.now()}`,
                        title: "Nuova Slide",
                        description: "Descrizione della slide",
                        gradient: "from-orange-500 to-amber-500",
                        icon: "smartphone",
                        type: "gradient",
                        textAlign: "center",
                        textPosition: "center"
                      };
                      setDisplayAds([...displayAds, newAd]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Aggiungi
                  </Button>
                </div>
                
                {displayAds.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nessuna slide configurata. Verranno usate le slide predefinite.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {displayAds.map((ad) => (
                      <div key={ad.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${ad.gradient} flex items-center justify-center shrink-0`}>
                          {ad.imageUrl ? (
                            <img src={ad.imageUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Monitor className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{ad.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{ad.description}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditingAd(ad)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive"
                            onClick={() => setDisplayAds(displayAds.filter(a => a.id !== ad.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Display Ad Editor Dialog */}
          {editingAd && corner && (
            <DisplayAdEditor
              ad={editingAd}
              open={!!editingAd}
              onClose={() => setEditingAd(null)}
              onSave={(updatedAd) => {
                setDisplayAds(displayAds.map(a => a.id === updatedAd.id ? updatedAd : a));
                setEditingAd(null);
              }}
              cornerId={corner.id}
            />
          )}

          {/* Opening Hours */}
          <OpeningHoursEditor
            value={openingHours}
            onChange={setOpeningHours}
          />

          {/* Dymo Printer Settings */}
          <DymoPrinterSettings
            enabled={dymoEnabled}
            onEnabledChange={setDymoEnabled}
            selectedPrinter={dymoPrinter}
            onPrinterChange={setDymoPrinter}
            labelFormat={dymoLabelFormat}
            onLabelFormatChange={setDymoLabelFormat}
          />

          {/* Push Notifications */}
          <PushNotificationSettings />

          {/* Save Button - Global */}
          <div className="flex justify-end sticky bottom-4 pt-4">
            <Button onClick={handleSave} disabled={isSaving} size="lg" className="shadow-lg">
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salva Modifiche
            </Button>
          </div>

          {/* Unsaved Changes Dialog */}
          <UnsavedChangesDialog
            open={showDialog}
            onSave={async () => {
              await handleSave();
              closeDialog();
            }}
            onDiscard={closeDialog}
            onCancel={closeDialog}
            isSaving={isSaving}
          />
        </div>
      </PageTransition>
    </CornerLayout>
  );
}
