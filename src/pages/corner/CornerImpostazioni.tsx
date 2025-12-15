import { useEffect, useState, useRef, useMemo } from "react";
import { CornerLayout } from "@/layouts/CornerLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
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
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, MapPin, Save, Loader2, Upload, Store, X, Image as ImageIcon, Monitor, Plus, Trash2, Edit, ExternalLink, Copy, QrCode, Eye, Play, Pause, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Megaphone, Smartphone, Wrench, Shield, Cpu, Tablet, Zap, Star
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface TickerMessage {
  id: string;
  text: string;
  emoji?: string;
  source?: string;
}

interface ActiveCampaign {
  id: string;
  ad_title: string;
  ad_description: string | null;
  ad_image_url: string | null;
  ad_gradient: string | null;
  ad_icon: string | null;
  ad_emoji: string | null;
  ad_font: string | null;
  ad_title_color: string | null;
  ad_description_color: string | null;
  company_logo_url: string | null;
  advertiser_company: string | null;
  display_seconds: number;
  qr_enabled: boolean;
  qr_destination_url: string | null;
  countdown_enabled: boolean;
  countdown_end_date: string | null;
  countdown_text: string | null;
}

// Unified playlist item (either custom ad or campaign)
interface PlaylistItem {
  id: string;
  type: 'custom' | 'campaign';
  data: DisplayAd | ActiveCampaign;
}

interface CornerSettings {
  display_ads?: DisplayAd[];
  slide_interval?: number;
  ticker_enabled?: boolean;
  ticker_speed?: number;
  ticker_messages?: TickerMessage[];
  ticker_rss_url?: string;
  ticker_rss_enabled?: boolean;
  ad_playlist_order?: string[]; // IDs of ads/campaigns in display order
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
    title: "Punto di Raccolta",
    description: "Lascia qui il tuo dispositivo per la riparazione",
    icon: "smartphone",
    gradient: "from-blue-500 to-cyan-500",
    type: "gradient",
    textAlign: "center",
    textPosition: "center",
    titleFont: "font-sans",
    descriptionFont: "font-sans"
  },
  {
    id: "default-2",
    title: "Ritiro Gratuito",
    description: "Il centro di assistenza ritirerà il tuo dispositivo",
    icon: "wrench",
    gradient: "from-green-500 to-emerald-500",
    type: "gradient",
    textAlign: "center",
    textPosition: "center",
    titleFont: "font-sans",
    descriptionFont: "font-sans"
  },
  {
    id: "default-3",
    title: "Tracciamento Live",
    description: "Segui lo stato della riparazione in tempo reale",
    icon: "cpu",
    gradient: "from-purple-500 to-pink-500",
    type: "gradient",
    textAlign: "center",
    textPosition: "center",
    titleFont: "font-sans",
    descriptionFont: "font-sans"
  }
];

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
  const [activeCampaigns, setActiveCampaigns] = useState<ActiveCampaign[]>([]);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [slideInterval, setSlideInterval] = useState(5); // seconds
  const [editingAd, setEditingAd] = useState<DisplayAd | null>(null);
  const [previewAdIndex, setPreviewAdIndex] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  
  // Ticker settings
  const [tickerEnabled, setTickerEnabled] = useState(true);
  const [tickerSpeed, setTickerSpeed] = useState(50);
  const [tickerMessages, setTickerMessages] = useState<TickerMessage[]>([
    { id: '1', text: 'Benvenuto! Riparazioni veloci e garantite', emoji: '👋' },
    { id: '2', text: 'Preventivi gratuiti su tutti i dispositivi', emoji: '💰' },
    { id: '3', text: 'Tecnici certificati e ricambi originali', emoji: '✅' },
  ]);
  const [newTickerText, setNewTickerText] = useState("");
  const [newTickerEmoji, setNewTickerEmoji] = useState("");
  const [tickerRssUrl, setTickerRssUrl] = useState("");
  const [tickerRssEnabled, setTickerRssEnabled] = useState(false);
  const [testingRss, setTestingRss] = useState(false);
  
  // Preview ads rotation
  const previewAds = displayAds.length > 0 ? displayAds : defaultAdvertisements;
  
  useEffect(() => {
    if (!isPreviewPlaying || previewAds.length <= 1) return;
    
    const interval = setInterval(() => {
      setPreviewAdIndex((prev) => (prev + 1) % previewAds.length);
    }, slideInterval * 1000);
    
    return () => clearInterval(interval);
  }, [isPreviewPlaying, previewAds.length, slideInterval]);
  
  // Track original values for change detection
  const [originalValues, setOriginalValues] = useState<{
    address: string;
    latitude: number | null;
    longitude: number | null;
    logoUrl: string | null;
    openingHours: string;
    displayAds: string;
    slideInterval: number;
    tickerEnabled: boolean;
    tickerSpeed: number;
    tickerMessages: string;
    tickerRssUrl: string;
    tickerRssEnabled: boolean;
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
      slideInterval !== originalValues.slideInterval ||
      tickerEnabled !== originalValues.tickerEnabled ||
      tickerSpeed !== originalValues.tickerSpeed ||
      JSON.stringify(tickerMessages) !== originalValues.tickerMessages ||
      tickerRssUrl !== originalValues.tickerRssUrl ||
      tickerRssEnabled !== originalValues.tickerRssEnabled
    );
  }, [address, latitude, longitude, logoUrl, openingHours, displayAds, slideInterval, tickerEnabled, tickerSpeed, tickerMessages, originalValues, corner]);


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
      // slide_interval is stored in ms, convert to seconds for the UI
      if (settings?.slide_interval) {
        setSlideInterval(settings.slide_interval / 1000);
      }
      // Ticker settings
      if (typeof settings?.ticker_enabled === 'boolean') {
        setTickerEnabled(settings.ticker_enabled);
      }
      if (settings?.ticker_speed) {
        setTickerSpeed(settings.ticker_speed);
      }
      if (settings?.ticker_messages && settings.ticker_messages.length > 0) {
        setTickerMessages(settings.ticker_messages);
      }
      if (settings?.ticker_rss_url) {
        setTickerRssUrl(settings.ticker_rss_url);
      }
      if (typeof settings?.ticker_rss_enabled === 'boolean') {
        setTickerRssEnabled(settings.ticker_rss_enabled);
      }
      
      // Fetch active advertising campaigns for this corner
      const { data: campaignsData } = await supabase
        .from("display_ad_campaign_corners")
        .select(`
          campaign_id,
          display_ad_campaigns (
            id,
            ad_title,
            ad_description,
            ad_image_url,
            ad_gradient,
            ad_icon,
            ad_emoji,
            ad_font,
            ad_title_color,
            ad_description_color,
            company_logo_url,
            advertiser_company,
            display_seconds,
            qr_enabled,
            qr_destination_url,
            countdown_enabled,
            countdown_end_date,
            countdown_text,
            status,
            start_date,
            end_date
          )
        `)
        .eq("corner_id", data.id);
      
      // Filter only active campaigns (status=active and within date range)
      const now = new Date().toISOString();
      const activeCampaignsData = (campaignsData || [])
        .map(c => c.display_ad_campaigns)
        .filter((campaign: any) => 
          campaign && 
          campaign.status === 'active' && 
          campaign.start_date <= now && 
          campaign.end_date >= now
        ) as ActiveCampaign[];
      
      setActiveCampaigns(activeCampaignsData);
      
      // Build initial playlist based on saved order or default
      const savedOrder = settings?.ad_playlist_order;
      const customAdsItems: PlaylistItem[] = (settings?.display_ads || []).map(ad => ({
        id: `custom-${ad.id}`,
        type: 'custom' as const,
        data: ad
      }));
      const campaignItems: PlaylistItem[] = activeCampaignsData.map(c => ({
        id: `campaign-${c.id}`,
        type: 'campaign' as const,
        data: c
      }));
      
      if (savedOrder && savedOrder.length > 0) {
        // Restore saved order
        const allItems = [...customAdsItems, ...campaignItems];
        const orderedPlaylist: PlaylistItem[] = [];
        savedOrder.forEach(id => {
          const item = allItems.find(i => i.id === id);
          if (item) orderedPlaylist.push(item);
        });
        // Add any new items not in saved order
        allItems.forEach(item => {
          if (!orderedPlaylist.find(p => p.id === item.id)) {
            orderedPlaylist.push(item);
          }
        });
        setPlaylist(orderedPlaylist);
      } else {
        // Default: alternate custom ads and campaigns
        const interleavedPlaylist: PlaylistItem[] = [];
        const maxLen = Math.max(customAdsItems.length, campaignItems.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < customAdsItems.length) interleavedPlaylist.push(customAdsItems[i]);
          if (i < campaignItems.length) interleavedPlaylist.push(campaignItems[i]);
        }
        setPlaylist(interleavedPlaylist);
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
        tickerEnabled: settings?.ticker_enabled ?? true,
        tickerSpeed: settings?.ticker_speed ?? 50,
        tickerMessages: JSON.stringify(settings?.ticker_messages || []),
        tickerRssUrl: settings?.ticker_rss_url || "",
        tickerRssEnabled: settings?.ticker_rss_enabled ?? false,
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
        slide_interval: slideInterval * 1000, // Convert seconds to ms for storage
        ticker_enabled: tickerEnabled,
        ticker_speed: tickerSpeed,
        ticker_messages: tickerMessages,
        ticker_rss_url: tickerRssUrl,
        ticker_rss_enabled: tickerRssEnabled,
        ad_playlist_order: playlist.map(p => p.id), // Save playlist order
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
        tickerEnabled,
        tickerSpeed,
        tickerMessages: JSON.stringify(tickerMessages),
        tickerRssUrl,
        tickerRssEnabled,
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

          {/* Display URL and QR */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Link Display Cliente
              </CardTitle>
              <CardDescription>
                Usa questo link per aprire il display cliente su un dispositivo esterno (tablet, monitor).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {corner && (
                <>
                  {/* QR Code */}
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-xl border-2 border-primary/20 shadow-lg">
                      <QRCodeSVG 
                        value={`${window.location.origin}/display/corner/${corner.id}`}
                        size={150}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-center text-muted-foreground">
                    Scansiona il QR code con il dispositivo dedicato
                  </p>

                  {/* URL Display */}
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">URL Display:</p>
                    <p className="text-xs font-mono break-all">
                      {window.location.origin}/display/corner/{corner.id}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/display/corner/${corner.id}`);
                        toast.success("Link copiato!");
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copia Link
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(`/display/corner/${corner.id}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Apri Display
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Anteprima Live Display
              </CardTitle>
              <CardDescription>
                Ecco come appare il display cliente con le tue pubblicità
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
                  {/* Corner Logo */}
                  {logoUrl && (
                    <div className="h-6 w-6 rounded overflow-hidden bg-white/10 backdrop-blur-sm border border-white/20">
                      <img 
                        src={logoUrl} 
                        alt={corner?.business_name}
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

          {/* Display Ads Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Pubblicità Display
              </CardTitle>
              <CardDescription>
                Personalizza le pubblicità mostrate in modalità standby sul display cliente. Usa le frecce per riordinarle.
                {activeCampaigns.length > 0 && (
                  <span className="block mt-1 text-amber-600">
                    📢 Hai {activeCampaigns.length} inserti pubblicitari attivi da inserzionisti
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Playlist Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Ordine di Riproduzione
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {playlist.length} slide totali
                  </span>
                </div>
                
                {playlist.length === 0 && displayAds.length === 0 && activeCampaigns.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg space-y-3">
                    <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nessuna pubblicità configurata</p>
                      <p className="text-xs text-muted-foreground/70">Verranno mostrate le pubblicità predefinite sul display cliente</p>
                    </div>
                  </div>
                )}
                
                <div className="grid gap-2">
                  {playlist.map((item, index) => {
                    const isCustom = item.type === 'custom';
                    const customAd = isCustom ? item.data as DisplayAd : null;
                    const campaign = !isCustom ? item.data as ActiveCampaign : null;
                    const IconComponent = isCustom && customAd ? getIconComponent(customAd.icon) : null;
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`border rounded-lg overflow-hidden bg-card hover:border-primary/50 transition-colors group ${
                          !isCustom ? 'border-amber-500/50 bg-amber-500/5' : ''
                        }`}
                      >
                        <div className="flex">
                          {/* Order Controls */}
                          <div className="flex flex-col items-center justify-center px-2 bg-muted/30 border-r gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={index === 0}
                              onClick={() => {
                                if (index > 0) {
                                  const newPlaylist = [...playlist];
                                  [newPlaylist[index - 1], newPlaylist[index]] = [newPlaylist[index], newPlaylist[index - 1]];
                                  setPlaylist(newPlaylist);
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
                              disabled={index === playlist.length - 1}
                              onClick={() => {
                                if (index < playlist.length - 1) {
                                  const newPlaylist = [...playlist];
                                  [newPlaylist[index], newPlaylist[index + 1]] = [newPlaylist[index + 1], newPlaylist[index]];
                                  setPlaylist(newPlaylist);
                                }
                              }}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Preview */}
                          <div className="relative w-32 h-20 flex-shrink-0">
                            {isCustom && customAd ? (
                              customAd.type === 'image' && customAd.imageUrl ? (
                                <div className="relative h-full">
                                  <img 
                                    src={customAd.imageUrl} 
                                    alt={customAd.title} 
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                </div>
                              ) : (
                                <div className={`h-full bg-gradient-to-br ${customAd.gradient} flex items-center justify-center`}>
                                  {IconComponent && (
                                    <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                                      <IconComponent className="h-4 w-4 text-white" />
                                    </div>
                                  )}
                                </div>
                              )
                            ) : campaign ? (
                              campaign.ad_image_url ? (
                                <div className="relative h-full">
                                  <img 
                                    src={campaign.ad_image_url} 
                                    alt={campaign.ad_title} 
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                </div>
                              ) : (
                                <div className={`h-full bg-gradient-to-br ${campaign.ad_gradient || 'from-amber-500 to-orange-500'} flex items-center justify-center`}>
                                  <span className="text-2xl">{campaign.ad_emoji || '📢'}</span>
                                </div>
                              )
                            ) : null}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 p-2 flex flex-col justify-center min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {isCustom ? (customAd?.title || "Senza titolo") : (campaign?.ad_title || "Inserto")}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {isCustom ? (customAd?.description || "Nessuna descrizione") : (campaign?.ad_description || campaign?.advertiser_company || "Pubblicità")}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                isCustom 
                                  ? 'bg-blue-500/10 text-blue-600' 
                                  : 'bg-amber-500/10 text-amber-600'
                              }`}>
                                {isCustom ? '🏠 Tua' : '📢 Inserto'}
                              </span>
                              {!isCustom && campaign && (
                                <span className="text-xs text-muted-foreground">
                                  {campaign.display_seconds}s
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1 pr-2">
                            {isCustom && customAd && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setEditingAd(customAd)}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setDisplayAds(prev => prev.filter(a => a.id !== customAd.id));
                                    setPlaylist(prev => prev.filter(p => p.id !== item.id));
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {!isCustom && (
                              <span className="text-xs text-amber-600 px-2">
                                A pagamento
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Active Campaigns Info */}
              {activeCampaigns.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Megaphone className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-700 dark:text-amber-400">
                      <p className="font-medium">Inserti pubblicitari attivi: {activeCampaigns.length}</p>
                      <p className="mt-1">Gli inserti sono pubblicità a pagamento di inserzionisti esterni. Puoi riordinarli nella playlist per alternarli con le tue slide personalizzate.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Add Custom Ad Buttons */}
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
                      // Also add to playlist
                      const newPlaylistItems: PlaylistItem[] = copiedAds.map(ad => ({
                        id: `custom-${ad.id}`,
                        type: 'custom' as const,
                        data: ad
                      }));
                      setPlaylist(prev => [...newPlaylistItems, ...prev.filter(p => p.type === 'campaign')]);
                      toast.success("Slide predefinite copiate! Ora puoi modificarle.");
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copia Predefinite
                  </Button>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                Le pubblicità verranno mostrate a rotazione ogni {slideInterval} secondi sul display cliente.
                <br />
                {playlist.length === 0 ? (
                  <span className="text-amber-600">⚠️ Clicca "Copia Predefinite" per modificare le slide o "Aggiungi" per crearne di nuove.</span>
                ) : (
                  <span className="text-green-600">✓ {playlist.filter(p => p.type === 'custom').length} slide personalizzate + {playlist.filter(p => p.type === 'campaign').length} inserti configurati</span>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Display Ad Editor Dialog */}
          {editingAd && corner && (
            <DisplayAdEditor
              ad={editingAd}
              open={!!editingAd}
              onClose={() => setEditingAd(null)}
              onSave={(updatedAd) => {
                // Check if it's a new ad or an existing one
                const existingIndex = displayAds.findIndex(a => a.id === updatedAd.id);
                if (existingIndex >= 0) {
                  setDisplayAds(displayAds.map(a => a.id === updatedAd.id ? updatedAd : a));
                  // Also update in playlist
                  setPlaylist(prev => prev.map(p => 
                    p.id === `custom-${updatedAd.id}` 
                      ? { ...p, data: updatedAd } 
                      : p
                  ));
                } else {
                  setDisplayAds([...displayAds, updatedAd]);
                  // Add to playlist at the end of custom ads (before campaigns)
                  const newPlaylistItem: PlaylistItem = {
                    id: `custom-${updatedAd.id}`,
                    type: 'custom',
                    data: updatedAd
                  };
                  setPlaylist(prev => {
                    const customItems = prev.filter(p => p.type === 'custom');
                    const campaignItems = prev.filter(p => p.type === 'campaign');
                    return [...customItems, newPlaylistItem, ...campaignItems];
                  });
                }
                setEditingAd(null);
              }}
              cornerId={corner.id}
            />
          )}

          {/* Scrolling Ticker Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">📜</span>
                Feed a Scorrimento
              </CardTitle>
              <CardDescription>
                Configura i messaggi che scorrono nella barra in basso del display
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Toggle and Speed */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant={tickerEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTickerEnabled(!tickerEnabled)}
                  >
                    {tickerEnabled ? "✅ Attivo" : "❌ Disattivato"}
                  </Button>
                </div>
                
                {tickerEnabled && (
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm">Velocità scorrimento</Label>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">🐢 Lento</span>
                      <Slider
                        value={[tickerSpeed]}
                        onValueChange={([v]) => setTickerSpeed(v)}
                        min={20}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground">🐇 Veloce</span>
                    </div>
                  </div>
                )}
              </div>
              
              {tickerEnabled && (
                <>
                  {/* Messages List */}
                  <div className="space-y-2">
                    <Label>Messaggi</Label>
                    <div className="space-y-2">
                      {tickerMessages.map((msg, index) => (
                        <div key={msg.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                          <span className="text-xl w-8 text-center">{msg.emoji || "💬"}</span>
                          <Input
                            value={msg.text}
                            onChange={(e) => {
                              const newMessages = [...tickerMessages];
                              newMessages[index] = { ...msg, text: e.target.value };
                              setTickerMessages(newMessages);
                            }}
                            className="flex-1"
                            placeholder="Testo del messaggio..."
                          />
                          <Input
                            value={msg.emoji || ""}
                            onChange={(e) => {
                              const newMessages = [...tickerMessages];
                              newMessages[index] = { ...msg, emoji: e.target.value };
                              setTickerMessages(newMessages);
                            }}
                            className="w-16 text-center"
                            placeholder="🔥"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setTickerMessages(prev => prev.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Add new message */}
                  <div className="flex gap-2">
                    <Input
                      value={newTickerEmoji}
                      onChange={(e) => setNewTickerEmoji(e.target.value)}
                      className="w-16 text-center"
                      placeholder="🔥"
                    />
                    <Input
                      value={newTickerText}
                      onChange={(e) => setNewTickerText(e.target.value)}
                      className="flex-1"
                      placeholder="Aggiungi un nuovo messaggio..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTickerText.trim()) {
                          setTickerMessages([...tickerMessages, {
                            id: `ticker-${Date.now()}`,
                            text: newTickerText.trim(),
                            emoji: newTickerEmoji || undefined
                          }]);
                          setNewTickerText("");
                          setNewTickerEmoji("");
                        }
                      }}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (newTickerText.trim()) {
                          setTickerMessages([...tickerMessages, {
                            id: `ticker-${Date.now()}`,
                            text: newTickerText.trim(),
                            emoji: newTickerEmoji || undefined
                          }]);
                          setNewTickerText("");
                          setNewTickerEmoji("");
                        }
                      }}
                      disabled={!newTickerText.trim()}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Aggiungi
                    </Button>
                  </div>
                  
                  {/* RSS Feed Section */}
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📡</span>
                        <Label>Feed RSS Notizie</Label>
                      </div>
                      <Button
                        variant={tickerRssEnabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTickerRssEnabled(!tickerRssEnabled)}
                      >
                        {tickerRssEnabled ? "✅ Attivo" : "Disattivato"}
                      </Button>
                    </div>
                    
                    {tickerRssEnabled && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            value={tickerRssUrl}
                            onChange={(e) => setTickerRssUrl(e.target.value)}
                            placeholder="https://esempio.it/feed.rss"
                            className="flex-1"
                          />
                          <Button
                            variant="secondary"
                            disabled={!tickerRssUrl.trim() || testingRss}
                            onClick={async () => {
                              if (!tickerRssUrl.trim()) return;
                              setTestingRss(true);
                              try {
                                const { data, error } = await supabase.functions.invoke('fetch-rss-feed', {
                                  body: { feedUrl: tickerRssUrl, maxItems: 3 }
                                });
                                if (error) throw error;
                                if (data.success && data.items?.length > 0) {
                                  toast.success(`✅ Feed valido: "${data.feedTitle}" - ${data.items.length} notizie trovate`);
                                } else {
                                  toast.error("Nessuna notizia trovata nel feed");
                                }
                              } catch (err) {
                                toast.error("Errore nel caricamento del feed RSS");
                              } finally {
                                setTestingRss(false);
                              }
                            }}
                          >
                            {testingRss ? <Loader2 className="h-4 w-4 animate-spin" /> : "Testa Feed"}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          📰 Le notizie dal feed RSS verranno aggiunte automaticamente al ticker. Funziona con la maggior parte dei siti di notizie (es. ANSA, Repubblica, ecc.)
                        </p>
                        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          <strong>Feed consigliati:</strong><br/>
                          • ANSA: https://www.ansa.it/sito/ansait_rss.xml<br/>
                          • Rai News: https://www.rainews.it/rss/ultimora<br/>
                          • Gazzetta Sport: https://www.gazzetta.it/dynamic-feed/rss/section/last.xml<br/>
                          • Corriere: https://xml2.corriereobjects.it/rss/homepage.xml<br/>
                          • Repubblica: https://www.repubblica.it/rss/homepage/rss2.0.xml
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    💡 I messaggi scorreranno continuamente in basso sul display Corner. Usa emoji per attirare l'attenzione!
                  </p>
                </>
              )}
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
