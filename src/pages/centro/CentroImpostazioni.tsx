import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { DisplayAdEditor, DisplayAd } from "@/components/centro/DisplayAdEditor";
import { DymoPrinterSettings } from "@/components/settings/DymoPrinterSettings";
import { LabelFormat } from "@/utils/labelTemplates";
import { PushNotificationSettings } from "@/components/notifications/PushNotificationSettings";
import { OpeningHoursEditor, OpeningHours } from "@/components/settings/OpeningHoursEditor";
import { UnsavedChangesDialog } from "@/components/settings/UnsavedChangesDialog";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import EmailTemplateEditor, { EmailTemplates } from "@/components/centro/EmailTemplateEditor";
import { DeviceHealthSettings } from "@/components/centro/DeviceHealthSettings";
import { StorageSlotsSettings } from "@/components/centro/StorageSlotsSettings";
import { MultiShelfConfig } from "@/hooks/useStorageSlots";
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
  Receipt,
  Search,
  Loader2,
  Monitor,
  Copy,
  ExternalLink,
  QrCode,
  Plus,
  Megaphone,
  Zap,
  Star,
  Edit,
  Smartphone,
  Wrench,
  Shield,
  Cpu,
  Tablet,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Eye,
  Send,
  Server,
  Lock,
  CheckCircle2,
  XCircle,
  Info,
  HelpCircle,
  Target,
  Euro
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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

interface DymoConfig {
  enabled: boolean;
  printer_name: string | null;
  label_format: '30252' | '99012' | '11354' | '30336';
}

interface CentroSettings {
  disable_diagnostic_fee?: boolean;
  display_ads?: DisplayAd[];
  slide_interval?: number;
  smtp_config?: SmtpConfig;
  dymo_config?: DymoConfig;
  monthly_goal?: number;
  email_templates?: Partial<EmailTemplates>;
  storage_slots?: { enabled: boolean; max_slots: number; prefix: string };
  multi_shelf?: MultiShelfConfig;
  [key: string]: any;
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
  opening_hours: OpeningHours | null;
}

const getIconComponent = (iconName: string) => {
  const icons: Record<string, any> = {
    smartphone: Smartphone,
    wrench: Wrench,
    shield: Shield,
    cpu: Cpu,
    tablet: Tablet,
    monitor: Monitor,
    zap: Zap,
    star: Star,
  };
  return icons[iconName] || Smartphone;
};

// Default advertisements for preview
const defaultAdvertisements: DisplayAd[] = [
  {
    id: "default-1",
    title: "Riparazione Express",
    description: "Riparazioni smartphone in meno di 1 ora",
    icon: "wrench",
    gradient: "from-blue-500 to-cyan-500",
    type: "gradient",
    textAlign: "center",
    textPosition: "center",
    titleFont: "font-sans",
    descriptionFont: "font-sans"
  },
  {
    id: "default-2",
    title: "Garanzia 12 Mesi",
    description: "Su tutti i ricambi originali",
    icon: "shield",
    gradient: "from-green-500 to-emerald-500",
    type: "gradient",
    textAlign: "center",
    textPosition: "center",
    titleFont: "font-sans",
    descriptionFont: "font-sans"
  },
  {
    id: "default-3",
    title: "Diagnosi Gratuita",
    description: "Per preventivi superiori a €100",
    icon: "cpu",
    gradient: "from-purple-500 to-pink-500",
    type: "gradient",
    textAlign: "center",
    textPosition: "center",
    titleFont: "font-sans",
    descriptionFont: "font-sans"
  }
];

export default function CentroImpostazioni() {
  const { user } = useAuth();
  const [centro, setCentro] = useState<Centro | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [disableDiagnosticFee, setDisableDiagnosticFee] = useState(false);
  const [displayAds, setDisplayAds] = useState<DisplayAd[]>([]);
  const [editingAd, setEditingAd] = useState<DisplayAd | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [previewAdIndex, setPreviewAdIndex] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [slideInterval, setSlideInterval] = useState(5); // seconds
  const fileInputRef = useRef<HTMLInputElement>(null);
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Dymo Configuration State
  const [dymoEnabled, setDymoEnabled] = useState(false);
  const [dymoPrinter, setDymoPrinter] = useState<string | null>(null);
  const [dymoLabelFormat, setDymoLabelFormat] = useState<LabelFormat>('30252');
  
  // Goals Configuration State
  const [monthlyGoal, setMonthlyGoal] = useState<number>(0);
  
  // Email Templates State
  const [emailTemplates, setEmailTemplates] = useState<Partial<EmailTemplates>>({});
  
  // Storage Slots State (Multi-shelf)
  const [storageSlotsConfig, setStorageSlotsConfig] = useState<MultiShelfConfig>({
    enabled: false,
    shelves: [],
  });
  
  // Opening Hours State
  const [openingHours, setOpeningHours] = useState<OpeningHours | null>(null);
  
  // Track original values for change detection
  const [originalValues, setOriginalValues] = useState<string>("");
  
  // Preview ads rotation
  const previewAds = displayAds.length > 0 ? displayAds : defaultAdvertisements;
  
  useEffect(() => {
    if (!isPreviewPlaying || previewAds.length <= 1) return;
    
    const interval = setInterval(() => {
      setPreviewAdIndex((prev) => (prev + 1) % previewAds.length);
    }, slideInterval * 1000);
    
    return () => clearInterval(interval);
  }, [isPreviewPlaying, previewAds.length, slideInterval]);

  // Geocode address to coordinates
  const geocodeAddress = useCallback(async (address: string) => {
    if (!address || address.length < 5) return;
    
    setIsGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=it`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setLatitude(parseFloat(lat));
        setLongitude(parseFloat(lon));
        toast.success("Posizione trovata sulla mappa");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Reverse geocode coordinates to address
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        // Extract a cleaner address format
        const parts = [];
        if (data.address) {
          if (data.address.road) parts.push(data.address.road);
          if (data.address.house_number) parts[0] = `${parts[0]} ${data.address.house_number}`;
          if (data.address.city || data.address.town || data.address.village) {
            parts.push(data.address.city || data.address.town || data.address.village);
          }
          if (data.address.postcode) parts.push(data.address.postcode);
        }
        const newAddress = parts.length > 0 ? parts.join(", ") : data.display_name;
        setFormData(prev => ({ ...prev, address: newAddress }));
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    }
  }, []);

  // Handle address search button click
  const handleSearchAddress = () => {
    if (formData.address) {
      geocodeAddress(formData.address);
    }
  };
  
  const [formData, setFormData] = useState({
    business_name: "",
    address: "",
    phone: "",
    email: "",
    vat_number: "",
    notes: "",
  });

  // Detect unsaved changes (placed after formData is defined)
  const hasChanges = useMemo(() => {
    if (!centro || !originalValues) return false;
    const currentValues = JSON.stringify({
      formData,
      latitude,
      longitude,
      openingHours,
      disableDiagnosticFee,
      displayAds,
      slideInterval,
      smtpEnabled,
      smtpConfig,
      dymoEnabled,
      dymoPrinter,
      dymoLabelFormat,
      monthlyGoal,
      storageSlotsConfig,
    });
    return currentValues !== originalValues;
  }, [formData, latitude, longitude, openingHours, disableDiagnosticFee, displayAds, slideInterval, smtpEnabled, smtpConfig, dymoEnabled, dymoPrinter, dymoLabelFormat, monthlyGoal, storageSlotsConfig, originalValues, centro]);

  const { showDialog, closeDialog } = useUnsavedChanges(hasChanges);

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
      setDisplayAds(settings?.display_ads || []);
      // slide_interval is stored in ms, convert to seconds for the UI
      setSlideInterval(settings?.slide_interval ? settings.slide_interval / 1000 : 5);
      
      // Load SMTP config
      if (settings?.smtp_config) {
        setSmtpEnabled(settings.smtp_config.enabled || false);
        setSmtpConfig({
          ...settings.smtp_config,
          password: settings.smtp_config.password ? "••••••••" : "", // Mask password
        });
      }
      
      // Load Dymo config
      if (settings?.dymo_config) {
        setDymoEnabled(settings.dymo_config.enabled || false);
        setDymoPrinter(settings.dymo_config.printer_name || null);
        setDymoLabelFormat(settings.dymo_config.label_format || '30252');
      }
      
      // Load Goals config
      setMonthlyGoal(settings?.monthly_goal || 0);
      
      // Load Email Templates
      setEmailTemplates(settings?.email_templates || {});
      
      // Load Storage Slots config (multi-shelf or legacy)
      if (settings?.multi_shelf) {
        setStorageSlotsConfig(settings.multi_shelf);
      } else if (settings?.storage_slots?.enabled) {
        // Convert legacy format to multi-shelf
        const legacy = settings.storage_slots;
        setStorageSlotsConfig({
          enabled: true,
          shelves: [{
            id: 'legacy-shelf',
            name: 'Scaffale Principale',
            prefix: legacy.prefix || '',
            rows: Math.ceil((legacy.max_slots || 50) / 10),
            columns: 10,
            start_number: 1,
            color: 'from-blue-500 to-blue-600',
          }],
        });
      }
      
      // Load Opening Hours
      setOpeningHours(centroData.opening_hours as unknown as OpeningHours | null);
      
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
        opening_hours: centroData.opening_hours as unknown as OpeningHours | null,
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

      // Store original values for change detection
      setOriginalValues(JSON.stringify({
        formData: {
          business_name: centroData.business_name || "",
          address: centroData.address || "",
          phone: centroData.phone || "",
          email: centroData.email || "",
          vat_number: centroData.vat_number || "",
          notes: centroData.notes || "",
        },
        latitude: centroData.latitude,
        longitude: centroData.longitude,
        openingHours: centroData.opening_hours,
        disableDiagnosticFee: settings?.disable_diagnostic_fee || false,
        displayAds: settings?.display_ads || [],
        slideInterval: settings?.slide_interval ? settings.slide_interval / 1000 : 5,
        smtpEnabled: settings?.smtp_config?.enabled || false,
        smtpConfig: settings?.smtp_config ? { ...settings.smtp_config, password: settings.smtp_config.password ? "••••••••" : "" } : null,
        dymoEnabled: settings?.dymo_config?.enabled || false,
        dymoPrinter: settings?.dymo_config?.printer_name || null,
        dymoLabelFormat: settings?.dymo_config?.label_format || '30252',
        monthlyGoal: settings?.monthly_goal || 0,
        storageSlotsConfig: settings?.multi_shelf || { enabled: false, shelves: [] },
      }));
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
      // Prepare SMTP config (only save password if changed)
      const smtpToSave: SmtpConfig = {
        ...smtpConfig,
        enabled: smtpEnabled,
        password: smtpConfig.password === "••••••••" 
          ? (centro.settings?.smtp_config?.password || "") 
          : smtpConfig.password,
      };

      const newSettings = {
        ...(centro.settings || {}),
        disable_diagnostic_fee: disableDiagnosticFee,
        display_ads: displayAds,
        slide_interval: slideInterval * 1000, // Save in milliseconds
        smtp_config: smtpToSave,
        dymo_config: {
          enabled: dymoEnabled,
          printer_name: dymoPrinter,
          label_format: dymoLabelFormat,
        },
        monthly_goal: monthlyGoal,
        email_templates: emailTemplates,
        multi_shelf: storageSlotsConfig,
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
          opening_hours: openingHours as any,
          settings: newSettings as any,
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
      const testEmail = formData.email || smtpConfig.from_email;
      
      // Get the real password if masked
      const passwordToSend = smtpConfig.password === "••••••••"
        ? centro?.settings?.smtp_config?.password || ""
        : smtpConfig.password;

      const response = await supabase.functions.invoke("test-smtp-config", {
        body: {
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          user: smtpConfig.user,
          password: passwordToSend,
          from_name: smtpConfig.from_name || formData.business_name,
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

  if (isLoading) {
    return (
      <CentroLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </CentroLayout>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <CentroLayout>
      <PageTransition>
        <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
                <Settings className="h-6 w-6 text-primary" />
                Impostazioni
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Gestisci le informazioni del tuo centro assistenza
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="gap-2 shadow-sm"
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">{isSaving ? "Salvataggio..." : "Salva"}</span>
            </Button>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >

            {/* Left Column */}
            <div className="space-y-6">
              {/* Logo Upload */}
              <motion.div variants={itemVariants}>
                <Card className="border border-border/50 hover:border-border transition-colors">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-white" />
                      </div>
                      Logo Attività
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Carica il logo della tua attività (max 2MB)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        {centro?.logo_url ? (
                          <div className="h-20 w-20 rounded-xl overflow-hidden border-2 border-border shadow-md">
                            <img 
                              src={centro.logo_url} 
                              alt="Logo" 
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
                            <Building2 className="h-8 w-8 text-muted-foreground" />
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
                          className="h-8 text-xs"
                        >
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
                          {isUploadingLogo ? "..." : "Carica"}
                        </Button>
                        {centro?.logo_url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveLogo}
                            disabled={isUploadingLogo}
                            className="h-8 text-xs text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Rimuovi
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Business Info */}
              <motion.div variants={itemVariants}>
                <Card className="border border-border/50 hover:border-border transition-colors">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-white" />
                      </div>
                      Informazioni Azienda
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Modifica i dati della tua attività
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs">Nome Attività *</Label>
                      <Input
                        value={formData.business_name}
                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                        placeholder="Nome del centro assistenza"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Partita IVA</Label>
                      <Input
                        value={formData.vat_number}
                        onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                        placeholder="IT01234567890"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Note</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Note aggiuntive..."
                        rows={2}
                        className="mt-1.5"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Contact Info */}
              <motion.div variants={itemVariants}>
                <Card className="border border-border/50 hover:border-border transition-colors">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                        <Phone className="h-4 w-4 text-white" />
                      </div>
                      Contatti
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs">Indirizzo *</Label>
                      <div className="flex gap-2 mt-1.5">
                        <MapPin className="h-4 w-4 mt-2.5 text-muted-foreground" />
                        <Input
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Via, numero civico, città"
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSearchAddress();
                            }
                          }}
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          onClick={handleSearchAddress}
                          disabled={isGeocoding || !formData.address}
                        >
                          {isGeocoding ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Premi Invio o clicca la lente per trovare sulla mappa
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Telefono *</Label>
                        <div className="flex gap-2 mt-1.5">
                          <Phone className="h-4 w-4 mt-2.5 text-muted-foreground" />
                          <Input
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+39 123 456 7890"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Email *</Label>
                        <div className="flex gap-2 mt-1.5">
                          <Mail className="h-4 w-4 mt-2.5 text-muted-foreground" />
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
              </motion.div>

              {/* Diagnostic Fee Settings */}
              <motion.div variants={itemVariants}>
                <Card className="border border-border/50 hover:border-border transition-colors">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <Receipt className="h-4 w-4 text-white" />
                      </div>
                      Fee Diagnostico
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Gestisci il fee diagnostico di €15 applicato ai nuovi ritiri
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">Disabilita Fee Diagnostico</p>
                        <p className="text-xs text-muted-foreground">
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
              </motion.div>

              {/* Storage Slots Settings */}
              <motion.div variants={itemVariants}>
                <StorageSlotsSettings
                  centroId={centro?.id || null}
                  config={storageSlotsConfig}
                  onChange={setStorageSlotsConfig}
                />
              </motion.div>

              {/* Monthly Revenue Goal */}
              <motion.div variants={itemVariants}>
                <Card className="border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent hover:border-emerald-500/50 transition-colors">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                        <Target className="h-4 w-4 text-white" />
                      </div>
                      Obiettivo Mensile
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Imposta il tuo obiettivo di fatturato mensile
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="monthlyGoal" className="text-xs">Obiettivo Fatturato (€)</Label>
                      <div className="relative mt-1.5">
                        <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="monthlyGoal"
                          type="number"
                          value={monthlyGoal || ""}
                          onChange={(e) => setMonthlyGoal(Number(e.target.value))}
                          placeholder="Es. 10000"
                          className="pl-9"
                          min={0}
                          step={500}
                        />
                      </div>
                    </div>
                    
                    {monthlyGoal > 0 && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Giornaliero</p>
                            <p className="text-sm font-bold text-emerald-600">
                              €{Math.round(monthlyGoal / 22).toLocaleString('it-IT')}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Settimanale</p>
                            <p className="text-sm font-bold text-emerald-600">
                              €{Math.round(monthlyGoal / 4).toLocaleString('it-IT')}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Mensile</p>
                            <p className="text-sm font-bold text-emerald-600">
                              €{monthlyGoal.toLocaleString('it-IT')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Email Notifications (SMTP) */}
              <motion.div variants={itemVariants}>
                <Card className="border border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent hover:border-blue-500/50 transition-colors">
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
                        placeholder="info@miocentro.it"
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
                        placeholder={formData.business_name || "Centro Riparazioni"}
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
                        placeholder="info@miocentro.it"
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
            </motion.div>

              {/* Commission Info (Read Only) */}
              <motion.div variants={itemVariants}>
                <Card className="border border-border/50 hover:border-border transition-colors">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                        <Settings className="h-4 w-4 text-white" />
                      </div>
                      Commissioni
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Le tue commissioni sono gestite dalla piattaforma
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">Tua Quota Commissione</p>
                          <p className="text-xs text-muted-foreground">
                            Percentuale del margine lordo per ogni lavoro
                          </p>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {centro?.commission_rate || 70}%
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Per modificare, contatta l'amministratore della piattaforma.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Customer Display */}
              <motion.div variants={itemVariants}>
                <Card className="border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                        <Monitor className="h-4 w-4 text-white" />
                      </div>
                      Display Cliente
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Schermo per tablet o monitor esterno
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Il display mostrerà i dati in tempo reale durante il ritiro e pubblicità quando non in uso.
                    </p>
                    
                    {centro && (
                      <div className="space-y-3">
                        {/* QR Code */}
                        <div className="flex justify-center">
                          <div className="p-3 bg-white rounded-xl border-2 border-primary/20 shadow-md">
                            <QRCodeSVG 
                              value={`${window.location.origin}/display/${centro.id}`}
                              size={120}
                              level="H"
                              includeMargin={true}
                            />
                          </div>
                        </div>
                        
                        <p className="text-[10px] text-center text-muted-foreground">
                          Scansiona il QR con il dispositivo dedicato
                        </p>

                        {/* URL Display */}
                        <div className="p-2 bg-muted rounded-lg">
                          <p className="text-[10px] font-mono break-all text-center">
                            {window.location.origin}/display/{centro.id}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/display/${centro.id}`);
                              toast.success("Link copiato!");
                            }}
                          >
                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                            Copia
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={() => window.open(`/display/${centro.id}`, '_blank')}
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            Apri
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Live Preview */}
              <motion.div variants={itemVariants}>
                <Card className="overflow-hidden border border-border/50 hover:border-border transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                        <Eye className="h-4 w-4 text-white" />
                      </div>
                      Anteprima Live
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Come appare il display con le tue pubblicità
                    </CardDescription>
                  </CardHeader>
            <CardContent className="p-0">
              {/* Preview Container - simulates display aspect ratio */}
              <div className="relative bg-slate-900 aspect-video max-h-[300px] overflow-hidden">
                <AnimatePresence mode="wait">
                  {previewAds.length > 0 && (
                    <motion.div
                      key={previewAdIndex}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0"
                    >
                    {(() => {
                      const currentAd = previewAds[previewAdIndex];
                      const IconComponent = getIconComponent(currentAd.icon);
                      
                      const imagePositionClass = {
                        center: 'object-center',
                        top: 'object-top',
                        bottom: 'object-bottom'
                      }[currentAd.imagePosition || 'center'];
                      
                      const textAlignClass = {
                        left: 'text-left items-start',
                        center: 'text-center items-center',
                        right: 'text-right items-end'
                      }[currentAd.textAlign || 'center'];
                      
                      const textPositionClass = {
                        bottom: 'justify-end pb-6',
                        center: 'justify-center',
                        top: 'justify-start pt-6'
                      }[currentAd.textPosition || 'bottom'];
                      
                      if (currentAd.type === 'image' && currentAd.imageUrl) {
                        return (
                          <div className="relative h-full">
                            <img 
                              src={currentAd.imageUrl} 
                              alt={currentAd.title}
                              className={`w-full h-full object-cover ${imagePositionClass}`}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                            <div className={`absolute inset-0 flex flex-col px-6 ${textAlignClass} ${textPositionClass}`}>
                              <h3 className={`text-2xl font-bold text-white ${currentAd.titleFont || 'font-sans'}`}>
                                {currentAd.title || "Titolo"}
                              </h3>
                              <p className={`text-sm text-white/80 mt-1 ${currentAd.descriptionFont || 'font-sans'}`}>
                                {currentAd.description || "Descrizione"}
                              </p>
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div className={`h-full bg-gradient-to-br ${currentAd.gradient} flex flex-col text-white p-6 ${textAlignClass} ${textPositionClass}`}>
                          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4">
                            <IconComponent className="h-8 w-8 text-white" />
                          </div>
                          <h3 className={`text-2xl font-bold ${currentAd.titleFont || 'font-sans'}`}>
                            {currentAd.title || "Titolo"}
                          </h3>
                          <p className={`text-sm text-white/80 mt-2 ${currentAd.descriptionFont || 'font-sans'}`}>
                            {currentAd.description || "Descrizione"}
                          </p>
                        </div>
                      );
                    })()}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Preview Controls Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="flex items-center justify-between">
                    {/* Slide indicators */}
                    <div className="flex gap-1.5">
                      {previewAds.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setPreviewAdIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === previewAdIndex ? "bg-white scale-125" : "bg-white/40 hover:bg-white/60"
                          }`}
                        />
                      ))}
                    </div>
                    
                    {/* Playback controls */}
                    <div className="flex items-center gap-1">
                      {/* Timing selector */}
                      <select
                        value={slideInterval}
                        onChange={(e) => setSlideInterval(Number(e.target.value))}
                        className="h-6 text-[10px] bg-white/20 text-white border-0 rounded px-1 focus:ring-0 cursor-pointer"
                      >
                        <option value={3} className="text-black">3s</option>
                        <option value={5} className="text-black">5s</option>
                        <option value={7} className="text-black">7s</option>
                        <option value={10} className="text-black">10s</option>
                        <option value={15} className="text-black">15s</option>
                      </select>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-white hover:bg-white/20"
                        onClick={() => setPreviewAdIndex(prev => (prev - 1 + previewAds.length) % previewAds.length)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-white hover:bg-white/20"
                        onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
                      >
                        {isPreviewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-white hover:bg-white/20"
                        onClick={() => setPreviewAdIndex(prev => (prev + 1) % previewAds.length)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Badge */}
                <div className="absolute top-3 left-3">
                  <span className={`text-xs px-2 py-1 rounded-full backdrop-blur ${displayAds.length > 0 ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {displayAds.length > 0 ? `${displayAds.length} slide personalizzate` : 'Slide predefinite'}
                  </span>
                </div>
                
                {/* Logos - Bottom Right Corner */}
                <div className="absolute bottom-2 right-2 flex items-center gap-2">
                  {/* Centro Logo */}
                  {centro?.logo_url && (
                    <div className="h-6 w-6 rounded overflow-hidden bg-white/10 backdrop-blur-sm border border-white/20">
                      <img 
                        src={centro.logo_url} 
                        alt={centro.business_name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Platform Logo */}
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/30 backdrop-blur-sm">
                    <Wrench className="h-2.5 w-2.5 text-white/70" />
                    <span className="text-[8px] font-medium text-white/70">Powered by LabLinkRiparo</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

          {/* Display Ads Management */}
          <Card className="border border-border/50 hover:border-border transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Pubblicità Display
              </CardTitle>
              <CardDescription>
                Personalizza le pubblicità mostrate in modalità standby sul display cliente. Usa le frecce per riordinarle.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {displayAds.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed rounded-lg space-y-3">
                  <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Nessuna pubblicità personalizzata</p>
                    <p className="text-xs text-muted-foreground/70">Verranno mostrate le pubblicità predefinite sul display cliente</p>
                  </div>
                </div>
              )}
              
              <div className="grid gap-3">
                {displayAds.map((ad, index) => {
                  const IconComponent = getIconComponent(ad.icon);
                  return (
                    <div 
                      key={ad.id} 
                      className="border rounded-lg overflow-hidden bg-card hover:border-primary/50 transition-colors group"
                    >
                      <div className="flex">
                        {/* Drag Handle & Order Controls */}
                        <div className="flex flex-col items-center justify-center px-2 bg-muted/30 border-r gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={index === 0}
                            onClick={() => {
                              if (index > 0) {
                                const newAds = [...displayAds];
                                [newAds[index - 1], newAds[index]] = [newAds[index], newAds[index - 1]];
                                setDisplayAds(newAds);
                              }
                            }}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <div className="text-xs font-bold text-muted-foreground">{index + 1}</div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={index === displayAds.length - 1}
                            onClick={() => {
                              if (index < displayAds.length - 1) {
                                const newAds = [...displayAds];
                                [newAds[index], newAds[index + 1]] = [newAds[index + 1], newAds[index]];
                                setDisplayAds(newAds);
                              }
                            }}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Preview */}
                        <div className="relative w-40 h-24 flex-shrink-0">
                          {ad.type === 'image' && ad.imageUrl ? (
                            <div className="relative h-full">
                              <img 
                                src={ad.imageUrl} 
                                alt={ad.title} 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            </div>
                          ) : (
                            <div className={`h-full bg-gradient-to-br ${ad.gradient} flex items-center justify-center`}>
                              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                <IconComponent className="h-5 w-5 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
                          <p className="font-semibold text-sm truncate">{ad.title || "Senza titolo"}</p>
                          <p className="text-xs text-muted-foreground truncate">{ad.description || "Nessuna descrizione"}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${ad.type === 'image' ? 'bg-blue-500/10 text-blue-600' : 'bg-purple-500/10 text-purple-600'}`}>
                              {ad.type === 'image' ? 'Immagine' : 'Gradiente'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1 pr-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingAd(ad)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDisplayAds(prev => prev.filter(a => a.id !== ad.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const newAd: DisplayAd = {
                      id: `ad-${Date.now()}`,
                      title: "",
                      description: "",
                      gradient: "from-blue-500 to-cyan-500",
                      icon: "smartphone",
                      type: "gradient"
                    };
                    setEditingAd(newAd);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Pubblicità
                </Button>
                
                {displayAds.length === 0 && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      // Copy default ads as custom ones with new IDs
                      const copiedAds = defaultAdvertisements.map(ad => ({
                        ...ad,
                        id: `ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                      }));
                      setDisplayAds(copiedAds);
                      toast.success("Slide predefinite copiate! Ora puoi modificarle.");
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copia Predefinite
                  </Button>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                Le pubblicità verranno mostrate a rotazione ogni 5 secondi sul display cliente.
                <br />
                {displayAds.length === 0 ? (
                  <span className="text-amber-600">⚠️ Clicca "Copia Predefinite" per modificare le slide o "Aggiungi" per crearne di nuove.</span>
                ) : (
                  <span className="text-green-600">✓ Ricorda di cliccare "Salva Modifiche" in fondo alla pagina per salvare.</span>
                )}
              </p>
            </CardContent>
          </Card>
          
          {/* Ad Editor Dialog */}
          {editingAd && centro && (
            <DisplayAdEditor
              ad={editingAd}
              open={!!editingAd}
              onClose={() => setEditingAd(null)}
              centroId={centro.id}
              onSave={(updatedAd) => {
                setDisplayAds(prev => {
                  const exists = prev.find(a => a.id === updatedAd.id);
                  if (exists) {
                    return prev.map(a => a.id === updatedAd.id ? updatedAd : a);
                  }
                  return [...prev, updatedAd];
                });
                setEditingAd(null);
              }}
            />
          )}

          {/* Push Notifications */}
          <PushNotificationSettings />

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
                  reverseGeocode(lat, lng);
                }}
                onGeolocate={() => {
                  setGeoLoading(true);
                  if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        setLatitude(lat);
                        setLongitude(lng);
                        reverseGeocode(lat, lng);
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

          {/* Email Templates Editor */}
          <EmailTemplateEditor
            templates={emailTemplates}
            onSave={(templates) => {
              setEmailTemplates(templates);
              toast.success("Template email aggiornati - ricorda di salvare le impostazioni");
            }}
            centroName={centro?.business_name || "Il tuo Centro"}
            centroLogo={centro?.logo_url}
          />

          {/* Device Health Settings */}
          {centro && (
            <DeviceHealthSettings centroId={centro.id} />
          )}

            </div>
          </motion.div>

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
    </CentroLayout>
  );
}