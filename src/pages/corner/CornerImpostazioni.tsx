import { useEffect, useState, useRef, useMemo } from "react";
import { CornerLayout } from "@/layouts/CornerLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { PushNotificationSettings } from "@/components/notifications/PushNotificationSettings";
import { DymoPrinterSettings } from "@/components/settings/DymoPrinterSettings";
import { OpeningHoursEditor, OpeningHours } from "@/components/settings/OpeningHoursEditor";
import { UnsavedChangesDialog } from "@/components/settings/UnsavedChangesDialog";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { LabelFormat } from "@/utils/labelTemplates";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { motion } from "framer-motion";
import { 
  Settings, MapPin, Save, Loader2, Upload, Store, X, Image as ImageIcon,
  Mail, Server, Lock, Send, CheckCircle2, XCircle, HelpCircle, ChevronDown, Info
} from "lucide-react";

interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from_name: string;
  from_email: string;
}

interface CornerSettings {
  smtp_config?: SmtpConfig;
  [key: string]: any;
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
  
  // SMTP Configuration State
  const [smtpEnabled, setSmtpEnabled] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    enabled: false,
    host: "",
    port: 587,
    secure: true,
    user: "",
    password: "",
    from_name: "",
    from_email: "",
  });
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSmtpGuide, setShowSmtpGuide] = useState(false);
  
  // Track original values for change detection
  const [originalValues, setOriginalValues] = useState<{
    address: string;
    latitude: number | null;
    longitude: number | null;
    logoUrl: string | null;
    openingHours: string;
    smtpEnabled: boolean;
    smtpConfig: SmtpConfig | null;
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
      smtpEnabled !== originalValues.smtpEnabled ||
      JSON.stringify(smtpConfig) !== JSON.stringify(originalValues.smtpConfig)
    );
  }, [address, latitude, longitude, logoUrl, openingHours, smtpEnabled, smtpConfig, originalValues, corner]);

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

      const settings = data.settings as CornerSettings | null;
      
      setCorner({
        ...data,
        opening_hours: data.opening_hours as unknown as OpeningHours | null,
        settings,
      });
      setAddress(data.address || "");
      setLatitude(data.latitude);
      setLongitude(data.longitude);
      setLogoUrl(data.logo_url);
      setOpeningHours(data.opening_hours as unknown as OpeningHours | null);
      
      // Load SMTP config
      if (settings?.smtp_config) {
        setSmtpEnabled(settings.smtp_config.enabled || false);
        setSmtpConfig({
          ...settings.smtp_config,
          password: settings.smtp_config.password ? "••••••••" : "",
        });
      }
      
      // Store original values for change detection
      setOriginalValues({
        address: data.address || "",
        latitude: data.latitude,
        longitude: data.longitude,
        logoUrl: data.logo_url,
        openingHours: JSON.stringify(data.opening_hours),
        smtpEnabled: settings?.smtp_config?.enabled || false,
        smtpConfig: settings?.smtp_config ? { ...settings.smtp_config, password: settings.smtp_config.password ? "••••••••" : "" } : null,
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

    if (!file.type.startsWith("image/")) {
      toast.error("Seleziona un file immagine valido");
      return;
    }

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

  // SMTP Preset configurations
  const smtpPresets: Record<string, Partial<SmtpConfig>> = {
    gmail: { host: "smtp.gmail.com", port: 587, secure: true },
    outlook: { host: "smtp.office365.com", port: 587, secure: true },
    yahoo: { host: "smtp.mail.yahoo.com", port: 587, secure: true },
    aruba: { host: "smtps.aruba.it", port: 465, secure: true },
  };

  const applySmtpPreset = (preset: string) => {
    const config = smtpPresets[preset];
    if (config) {
      setSmtpConfig(prev => ({ ...prev, ...config }));
      toast.success(`Preset ${preset.charAt(0).toUpperCase() + preset.slice(1)} applicato`);
    }
  };

  const testSmtpConnection = async () => {
    if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.password || !smtpConfig.from_email) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    setIsTestingSmtp(true);
    setSmtpTestResult(null);

    try {
      const testEmail = corner?.email || smtpConfig.from_email;
      
      // Get the real password if masked
      const passwordToSend = smtpConfig.password === "••••••••"
        ? corner?.settings?.smtp_config?.password || ""
        : smtpConfig.password;

      const response = await supabase.functions.invoke("test-smtp-config", {
        body: {
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          user: smtpConfig.user,
          password: passwordToSend,
          from_name: smtpConfig.from_name || corner?.business_name,
          from_email: smtpConfig.from_email,
          test_email: testEmail,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.success) {
        setSmtpTestResult({ success: true, message: `Email di test inviata a ${testEmail}` });
        toast.success("Test SMTP riuscito!");
      } else {
        setSmtpTestResult({ success: false, message: response.data.error || "Errore sconosciuto" });
        toast.error(response.data.error || "Errore nel test SMTP");
      }
    } catch (error: any) {
      console.error("SMTP test error:", error);
      setSmtpTestResult({ success: false, message: error.message });
      toast.error(error.message);
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleSave = async () => {
    if (!corner) return;

    setIsSaving(true);
    try {
      // Prepare SMTP config (only save password if changed)
      const smtpToSave: SmtpConfig = {
        ...smtpConfig,
        enabled: smtpEnabled,
        password: smtpConfig.password === "••••••••" 
          ? (corner.settings?.smtp_config?.password || "") 
          : smtpConfig.password,
      };

      const newSettings = {
        ...(corner.settings || {}),
        smtp_config: smtpToSave,
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
        smtpEnabled,
        smtpConfig,
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

          {/* Opening Hours */}
          <OpeningHoursEditor
            value={openingHours}
            onChange={setOpeningHours}
          />

          {/* Email Notifications (SMTP) */}
          <Card className="border border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-white" />
                </div>
                Email Notifiche
              </CardTitle>
              <CardDescription className="text-xs">
                Configura l'invio email dalla tua email aziendale
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium text-sm">Usa Email Personalizzata</p>
                  <p className="text-xs text-muted-foreground">
                    Invia notifiche dalla tua email
                  </p>
                </div>
                <Switch
                  checked={smtpEnabled}
                  onCheckedChange={setSmtpEnabled}
                />
              </div>

              {smtpEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  {/* Provider Presets */}
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Provider Email</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applySmtpPreset("gmail")}
                        className="flex items-center gap-1.5"
                      >
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500" />
                        Gmail
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applySmtpPreset("outlook")}
                        className="flex items-center gap-1.5"
                      >
                        <div className="w-4 h-4 rounded-full bg-blue-600" />
                        Outlook
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applySmtpPreset("yahoo")}
                        className="flex items-center gap-1.5"
                      >
                        <div className="w-4 h-4 rounded-full bg-purple-600" />
                        Yahoo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applySmtpPreset("aruba")}
                        className="flex items-center gap-1.5"
                      >
                        <div className="w-4 h-4 rounded-full bg-orange-500" />
                        Aruba
                      </Button>
                    </div>
                  </div>

                  {/* SMTP Server Config */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Server SMTP *</Label>
                      <div className="flex gap-2">
                        <Server className="h-4 w-4 mt-3 text-muted-foreground" />
                        <Input
                          value={smtpConfig.host}
                          onChange={(e) => setSmtpConfig(prev => ({ ...prev, host: e.target.value }))}
                          placeholder="smtp.gmail.com"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Porta *</Label>
                      <Input
                        type="number"
                        value={smtpConfig.port}
                        onChange={(e) => setSmtpConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 587 }))}
                        placeholder="587"
                      />
                    </div>
                  </div>

                  {/* TLS Toggle */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Connessione Sicura (TLS/STARTTLS)</p>
                    </div>
                    <Switch
                      checked={smtpConfig.secure}
                      onCheckedChange={(checked) => setSmtpConfig(prev => ({ ...prev, secure: checked }))}
                    />
                  </div>

                  {/* Credentials */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Email/Username *</Label>
                      <Input
                        value={smtpConfig.user}
                        onChange={(e) => setSmtpConfig(prev => ({ ...prev, user: e.target.value }))}
                        placeholder="info@miocorner.it"
                      />
                    </div>
                    <div>
                      <Label>Password App *</Label>
                      <Input
                        type="password"
                        value={smtpConfig.password}
                        onChange={(e) => setSmtpConfig(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {/* From Config */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Nome Mittente</Label>
                      <Input
                        value={smtpConfig.from_name}
                        onChange={(e) => setSmtpConfig(prev => ({ ...prev, from_name: e.target.value }))}
                        placeholder={corner?.business_name || "Il mio Corner"}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Se vuoto, usa il nome dell'attività
                      </p>
                    </div>
                    <div>
                      <Label>Email Mittente *</Label>
                      <Input
                        value={smtpConfig.from_email}
                        onChange={(e) => setSmtpConfig(prev => ({ ...prev, from_email: e.target.value }))}
                        placeholder="info@miocorner.it"
                      />
                    </div>
                  </div>

                  {/* Test Button & Result */}
                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={testSmtpConnection}
                      disabled={isTestingSmtp}
                      className="w-full"
                    >
                      {isTestingSmtp ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Test in corso...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Invia Email di Test
                        </>
                      )}
                    </Button>

                    {smtpTestResult && (
                      <div className={`p-3 rounded-lg flex items-center gap-2 ${
                        smtpTestResult.success 
                          ? "bg-green-500/10 text-green-700 dark:text-green-400" 
                          : "bg-red-500/10 text-red-700 dark:text-red-400"
                      }`}>
                        {smtpTestResult.success ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        <span className="text-sm">{smtpTestResult.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Gmail App Password Guide */}
                  <Collapsible open={showSmtpGuide} onOpenChange={setShowSmtpGuide}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
                        <span className="flex items-center gap-2">
                          <HelpCircle className="h-4 w-4" />
                          Come creare una Password App Gmail
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showSmtpGuide ? "rotate-180" : ""}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 bg-muted/50 rounded-lg mt-2 space-y-3 text-sm">
                        <p className="font-medium">Per Gmail, devi usare una "Password per le app":</p>
                        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                          <li>Vai su <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">myaccount.google.com/security</a></li>
                          <li>Attiva la <strong>Verifica in 2 passaggi</strong> se non l'hai già fatto</li>
                          <li>Vai su <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">myaccount.google.com/apppasswords</a></li>
                          <li>Seleziona "Posta" come app e "Altro" come dispositivo</li>
                          <li>Copia la password generata (16 caratteri) e usala qui</li>
                        </ol>
                        <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded text-amber-700 dark:text-amber-400">
                          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <p className="text-xs">Non usare la tua password Gmail normale. Usa solo la Password App.</p>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </motion.div>
              )}

              {!smtpEnabled && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Quando disattivato, le email verranno inviate dalla piattaforma LabLinkRiparo.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

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
