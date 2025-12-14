import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  User, 
  Phone as PhoneIcon, 
  CheckCircle2, 
  Wrench,
  Cpu,
  Shield,
  AlertTriangle,
  Maximize,
  Minimize,
  Sparkles,
  ClipboardCheck,
  Store,
  QrCode,
  Megaphone
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { CountdownTimer } from "@/components/ads/CountdownTimer";
import { ScrollingTicker } from "@/components/display/ScrollingTicker";
import { DisplayUsedDevicesStrip } from "@/components/display/DisplayUsedDevicesStrip";

interface TickerMessage {
  id: string;
  text: string;
  emoji?: string;
}

type DisplayMode = "standby" | "confirm_data" | "completed";

interface CustomerData {
  name: string;
  phone: string;
  email?: string;
}

interface DeviceData {
  brand: string;
  model: string;
  device_type: string;
  issue_description: string;
}

interface SessionData {
  sessionId: string;
  mode: DisplayMode;
  customer: CustomerData;
  device: DeviceData;
}

interface DisplayAd {
  id: string;
  title: string;
  description: string;
  gradient: string;
  icon: string;
  imageUrl?: string;
  type?: 'gradient' | 'image' | 'qr_promo';
  imagePosition?: 'center' | 'top' | 'bottom';
  textAlign?: 'left' | 'center' | 'right';
  textPosition?: 'bottom' | 'center' | 'top';
  titleFont?: string;
  descriptionFont?: string;
  // Styling options
  fontFamily?: string;
  titleColor?: string;
  descriptionColor?: string;
  emoji?: string;
  // Duration in milliseconds for this specific ad
  displayMs?: number;
  // Enhanced features
  campaignId?: string;
  countdownEnabled?: boolean;
  countdownEndDate?: string;
  countdownText?: string;
  companyLogoUrl?: string;
  qrEnabled?: boolean;
  qrDestinationUrl?: string;
}

const defaultAdvertisements: DisplayAd[] = [
  {
    id: "default-1",
    title: "Consegna Veloce",
    description: "Lascia il tuo dispositivo e ritiralo riparato",
    icon: "smartphone",
    gradient: "from-blue-600 via-blue-500 to-cyan-400",
    type: "gradient",
    textAlign: "center",
    textPosition: "center"
  },
  {
    id: "default-2",
    title: "Partner Certificato",
    description: "Riparazioni garantite da tecnici qualificati",
    icon: "shield",
    gradient: "from-emerald-600 via-green-500 to-teal-400",
    type: "gradient",
    textAlign: "center",
    textPosition: "center"
  },
  {
    id: "default-3",
    title: "Preventivo Gratuito",
    description: "Ricevi un preventivo senza impegno",
    icon: "wrench",
    gradient: "from-violet-600 via-purple-500 to-fuchsia-400",
    type: "gradient",
    textAlign: "center",
    textPosition: "center"
  }
];

const getIconComponent = (iconName: string) => {
  const icons: Record<string, any> = {
    smartphone: Smartphone,
    wrench: Wrench,
    shield: Shield,
    cpu: Cpu,
    tablet: Tablet,
    monitor: Monitor,
    zap: AlertTriangle,
    star: Shield,
    store: Store,
  };
  return icons[iconName] || Smartphone;
};

export default function CornerDisplay() {
  const { cornerId } = useParams();
  const [mode, setMode] = useState<DisplayMode>("standby");
  const [session, setSession] = useState<SessionData | null>(null);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [advertisements, setAdvertisements] = useState<DisplayAd[]>(defaultAdvertisements);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [slideInterval, setSlideInterval] = useState(5000);
  const [cornerLogo, setCornerLogo] = useState<string | null>(null);
  const [cornerName, setCornerName] = useState<string>("");
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [tickerMessages, setTickerMessages] = useState<TickerMessage[]>([
    { id: 'default-1', text: 'Benvenuto! Riparazioni veloci e garantite', emoji: '👋' },
    { id: 'default-2', text: 'Preventivi gratuiti su tutti i dispositivi', emoji: '💰' },
    { id: 'default-3', text: 'Tecnici certificati e ricambi originali', emoji: '✅' },
  ]);
  const [tickerEnabled, setTickerEnabled] = useState(true);
  const [tickerSpeed, setTickerSpeed] = useState(30);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Error entering fullscreen:', err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error('Error exiting fullscreen:', err);
      }
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Fetch corner data and active paid ads
  const fetchCornerData = useCallback(async () => {
    if (!cornerId) return;
    
    // Fetch corner settings
    const { data } = await supabase
      .from("corners")
      .select("settings, logo_url, business_name")
      .eq("id", cornerId)
      .single();
    
    // Fetch active paid campaigns for this corner
    const today = new Date().toISOString().split('T')[0];
    const { data: campaigns } = await supabase
      .from("display_ad_campaign_corners")
      .select(`
        campaign_id,
        display_ad_campaigns!inner (
          id,
          ad_title,
          ad_description,
          ad_image_url,
          ad_gradient,
          ad_icon,
          ad_type,
          ad_font,
          ad_title_color,
          ad_description_color,
          ad_emoji,
          display_seconds,
          status,
          start_date,
          end_date,
          countdown_enabled,
          countdown_end_date,
          countdown_text,
          company_logo_url,
          qr_enabled,
          qr_destination_url
        )
      `)
      .eq("corner_id", cornerId);
    
    // Process corner settings for custom ads
    let customAds: DisplayAd[] = [];
    if (data) {
      setCornerLogo(data.logo_url);
      setCornerName(data.business_name || "");
      
    if (data.settings) {
        const settings = data.settings as { 
          display_ads?: DisplayAd[]; 
          slide_interval?: number;
          ticker_enabled?: boolean;
          ticker_speed?: number;
          ticker_messages?: TickerMessage[];
          ticker_rss_url?: string;
          ticker_rss_enabled?: boolean;
        };
        if (settings.display_ads && settings.display_ads.length > 0) {
          customAds = settings.display_ads;
        }
        // Ticker settings
        if (typeof settings.ticker_enabled === 'boolean') {
          setTickerEnabled(settings.ticker_enabled);
        }
        if (settings.ticker_speed) {
          setTickerSpeed(settings.ticker_speed);
        }
        
        // Start with custom messages or defaults
        let allTickerMessages: TickerMessage[] = [];
        if (settings.ticker_messages && settings.ticker_messages.length > 0) {
          allTickerMessages = [...settings.ticker_messages];
        } else {
          allTickerMessages = [
            { id: '1', text: 'Benvenuto! Riparazioni veloci e garantite', emoji: '👋' },
            { id: '2', text: 'Preventivi gratuiti su tutti i dispositivi', emoji: '💰' },
            { id: '3', text: 'Tecnici certificati e ricambi originali', emoji: '✅' },
          ];
        }
        
        // Fetch RSS feed if enabled
        if (settings.ticker_rss_enabled && settings.ticker_rss_url) {
          try {
            const { data: rssData } = await supabase.functions.invoke('fetch-rss-feed', {
              body: { feedUrl: settings.ticker_rss_url, maxItems: 5 }
            });
            if (rssData?.success && rssData?.items?.length > 0) {
              allTickerMessages = [...allTickerMessages, ...rssData.items];
              console.log('[CornerDisplay] Loaded RSS items:', rssData.items.length);
            }
          } catch (rssError) {
            console.error('[CornerDisplay] Error fetching RSS:', rssError);
          }
        }
        
        setTickerMessages(allTickerMessages);
        
        if (settings.slide_interval) {
          setSlideInterval(settings.slide_interval);
        }
      }
    }
    
    // Process paid campaigns
    const paidAds: DisplayAd[] = (campaigns || [])
      .filter((c: any) => {
        const campaign = c.display_ad_campaigns;
        return campaign.status === 'active' && 
               campaign.start_date <= today && 
               campaign.end_date >= today;
      })
      .map((c: any) => {
        const campaign = c.display_ad_campaigns;
        return {
          id: `paid-${campaign.id}`,
          campaignId: campaign.id,
          title: campaign.ad_title,
          description: campaign.ad_description || "",
          gradient: campaign.ad_gradient || "from-blue-600 via-blue-500 to-cyan-400",
          icon: campaign.ad_icon || "megaphone",
          imageUrl: campaign.ad_image_url,
          type: campaign.ad_type === 'image' ? 'image' : 'gradient',
          textAlign: 'center' as const,
          textPosition: 'center' as const,
          // Styling options from campaign
          fontFamily: campaign.ad_font || 'sans',
          titleColor: campaign.ad_title_color || '#ffffff',
          descriptionColor: campaign.ad_description_color || '#ffffff',
          emoji: campaign.ad_emoji || '',
          // Duration in milliseconds for this ad
          displayMs: (campaign.display_seconds || 5) * 1000,
          // Enhanced features
          countdownEnabled: campaign.countdown_enabled || false,
          countdownEndDate: campaign.countdown_end_date,
          countdownText: campaign.countdown_text || 'Offerta valida ancora',
          companyLogoUrl: campaign.company_logo_url,
          qrEnabled: campaign.qr_enabled || false,
          qrDestinationUrl: campaign.qr_destination_url
        };
      });
    
    // Build "Spazio Disponibile" QR promo slide
    const qrPromoSlide: DisplayAd = {
      id: "qr-promo",
      title: "Vuoi pubblicizzarti qui?",
      description: "Scansiona il QR per acquistare uno spazio pubblicitario",
      gradient: "from-amber-600 via-orange-500 to-red-500",
      icon: "megaphone",
      type: "qr_promo",
      textAlign: "center",
      textPosition: "center"
    };
    
    // Combine: custom ads + paid ads + QR promo
    const allAds = customAds.length > 0 ? customAds : defaultAdvertisements;
    setAdvertisements([...allAds, ...paidAds, qrPromoSlide]);
    setCurrentAdIndex(0);
  }, [cornerId]);

  useEffect(() => {
    fetchCornerData();
  }, [fetchCornerData]);

  // Polling fallback - refresh every 30 seconds to catch any missed realtime updates
  // This is needed because RLS policies may prevent unauthenticated users from receiving realtime events
  useEffect(() => {
    if (!cornerId) return;
    
    const pollInterval = setInterval(() => {
      console.log('[CornerDisplay] Polling for campaign updates...');
      fetchCornerData();
    }, 30000); // 30 seconds
    
    return () => clearInterval(pollInterval);
  }, [cornerId, fetchCornerData]);

  // Real-time subscription for campaign updates - auto-refresh when campaigns are modified
  useEffect(() => {
    if (!cornerId) return;

    console.log('[CornerDisplay] Setting up real-time campaign subscription for corner:', cornerId);
    
    const channel = supabase
      .channel(`display-ad-campaigns-${cornerId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'display_ad_campaigns'
        },
        (payload) => {
          console.log('[CornerDisplay] Campaign change detected:', payload.eventType, payload);
          // Refresh ads when any campaign is modified (status change, blocked, approved, etc.)
          fetchCornerData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'display_ad_campaign_corners'
        },
        (payload) => {
          console.log('[CornerDisplay] Campaign corner assignment change:', payload.eventType, payload);
          // @ts-ignore - payload.new/old contains the row data
          const relevantCornerId = payload.new?.corner_id || payload.old?.corner_id;
          if (relevantCornerId === cornerId) {
            fetchCornerData();
          }
        }
      )
      .subscribe((status) => {
        console.log('[CornerDisplay] Campaign subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[CornerDisplay] Real-time subscription active - display will auto-update');
        }
      });

    return () => {
      console.log('[CornerDisplay] Removing campaign subscription');
      supabase.removeChannel(channel);
    };
  }, [cornerId, fetchCornerData]);

  // Advertisement rotation with dynamic duration per ad
  useEffect(() => {
    if (mode !== "standby" || advertisements.length === 0) return;
    
    // Get duration for current ad (use ad-specific duration or fallback to global slideInterval)
    const currentAd = advertisements[currentAdIndex];
    const duration = currentAd?.displayMs || slideInterval;
    
    const timeout = setTimeout(() => {
      setCurrentAdIndex((prev) => (prev + 1) % advertisements.length);
    }, duration);

    return () => clearTimeout(timeout);
  }, [mode, advertisements, currentAdIndex, slideInterval]);

  // Realtime channel for display communication
  useEffect(() => {
    if (!cornerId) return;

    console.log('[CornerDisplay] Setting up channel listener for corner:', cornerId);
    
    let channel = supabase.channel(`display-corner-${cornerId}`, {
      config: {
        broadcast: { self: false, ack: true }
      }
    });
    
    let isActive = true;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const setupChannel = () => {
      if (!isActive) return;
      
      channel
        .on('broadcast', { event: 'session_started' }, (payload) => {
          console.log('[CornerDisplay] Session started:', payload);
          const sessionData = payload.payload as SessionData;
          if (sessionData) {
            setSession(sessionData);
            setMode("confirm_data");
          }
        })
        .on('broadcast', { event: 'session_update' }, (payload) => {
          console.log('[CornerDisplay] Session update:', payload);
          const updateData = payload.payload;
          if (updateData) {
            setSession(prev => prev ? { ...prev, ...updateData } : null);
          }
        })
        .on('broadcast', { event: 'session_cancelled' }, () => {
          console.log('[CornerDisplay] Session cancelled');
          resetToStandby();
        })
        .on('broadcast', { event: 'session_completed' }, () => {
          console.log('[CornerDisplay] Session completed');
          setMode("completed");
          setTimeout(() => resetToStandby(), 8000);
        })
        .subscribe((status) => {
          console.log('[CornerDisplay] Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
          } else if (status === 'CHANNEL_ERROR' && isActive) {
            setConnectionStatus('disconnected');
            console.log('[CornerDisplay] Channel error, reconnecting in 2s...');
            reconnectTimeout = setTimeout(() => {
              setConnectionStatus('connecting');
              supabase.removeChannel(channel);
              channel = supabase.channel(`display-corner-${cornerId}`, {
                config: { broadcast: { self: false, ack: true } }
              });
              setupChannel();
            }, 2000);
          } else if (status === 'CLOSED') {
            setConnectionStatus('disconnected');
          }
        });
    };

    setupChannel();

    return () => {
      console.log('[CornerDisplay] Removing channel');
      isActive = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      supabase.removeChannel(channel);
    };
  }, [cornerId]);

  const resetToStandby = () => {
    setMode("standby");
    setSession(null);
  };

  const handleConfirmData = async () => {
    if (!cornerId || !session) return;
    
    const channel = supabase.channel(`corner-intake-${cornerId}`);
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'customer_confirmed_data',
      payload: { sessionId: session.sessionId, confirmed: true }
    });
    supabase.removeChannel(channel);
    
    setMode("completed");
    setTimeout(() => resetToStandby(), 8000);
  };

  const ConnectionIndicator = () => (
    <div className="fixed top-3 left-3 z-50 flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
      <div className={`w-2.5 h-2.5 rounded-full ${
        connectionStatus === 'connected' 
          ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' 
          : connectionStatus === 'connecting'
          ? 'bg-yellow-500 animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.6)]'
          : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
      }`} />
      <span className="text-xs text-white/80 font-medium">
        {connectionStatus === 'connected' ? 'Connesso' : connectionStatus === 'connecting' ? 'Connessione...' : 'Disconnesso'}
      </span>
    </div>
  );

  const FullscreenButton = () => (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleFullscreen}
      className="fixed top-3 right-3 z-50 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md border border-white/10"
    >
      {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
    </Button>
  );

  // ============ STANDBY MODE ============
  if (mode === "standby") {
    const currentAd = advertisements[currentAdIndex];
    const isImageAd = currentAd.type === 'image' && currentAd.imageUrl;
    const isQrPromo = currentAd.type === 'qr_promo';
    
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
      bottom: 'justify-end pb-12',
      center: 'justify-center',
      top: 'justify-start pt-12'
    }[currentAd.textPosition || 'bottom'];
    
    // Font family mapping
    const fontFamilyClass = {
      sans: 'font-sans',
      serif: 'font-serif',
      mono: 'font-mono'
    }[currentAd.fontFamily || 'sans'] || 'font-sans';
    
    // QR code URL for advertising purchase
    const qrUrl = `${window.location.origin}/ads/acquista?corner=${cornerId}`;
    
    return (
      <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6 pt-32 overflow-hidden">
        <ConnectionIndicator />
        <FullscreenButton />
        
        {/* Used Devices Carousel Strip */}
        {cornerId && <DisplayUsedDevicesStrip cornerId={cornerId} />}
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-amber-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentAdIndex}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-4xl w-full relative z-10"
          >
            {isQrPromo ? (
              // QR Promo Slide - "Spazio Disponibile"
              <Card className={`p-12 md:p-16 bg-gradient-to-br ${currentAd.gradient} border-0 shadow-2xl rounded-3xl overflow-hidden relative`}>
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
                
                <div className="text-white flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 relative z-10">
                  {/* Left side - Text */}
                  <div className="space-y-6 text-center md:text-left">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20"
                    >
                      <Megaphone className="h-6 w-6" />
                      <span className="text-lg font-semibold">Spazio Disponibile</span>
                    </motion.div>
                    <motion.h1 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-4xl md:text-5xl font-bold drop-shadow-lg"
                    >
                      {currentAd.title}
                    </motion.h1>
                    <motion.p 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-xl md:text-2xl text-white/80"
                    >
                      {currentAd.description}
                    </motion.p>
                  </div>
                  
                  {/* Right side - QR Code */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                    className="bg-white p-6 rounded-3xl shadow-2xl"
                  >
                    <QRCodeSVG 
                      value={qrUrl}
                      size={200}
                      level="H"
                      includeMargin={false}
                    />
                  </motion.div>
                </div>
              </Card>
            ) : isImageAd ? (
              <Card className="border-0 shadow-2xl overflow-hidden rounded-3xl">
                <div className="relative aspect-video">
                  <img 
                    src={currentAd.imageUrl} 
                    alt={currentAd.title}
                    className={`w-full h-full object-cover ${imagePositionClass}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <div className={`absolute inset-0 flex flex-col px-10 ${textAlignClass} ${textPositionClass}`}>
                    {currentAd.emoji && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="text-6xl md:text-8xl mb-4"
                      >
                        {currentAd.emoji}
                      </motion.span>
                    )}
                    <motion.h1 
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className={`text-4xl md:text-6xl font-bold drop-shadow-lg ${fontFamilyClass}`}
                      style={{ color: currentAd.titleColor || '#ffffff' }}
                    >
                      {currentAd.title}
                    </motion.h1>
                    <motion.p 
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className={`text-xl md:text-2xl mt-3 ${fontFamilyClass}`}
                      style={{ color: currentAd.descriptionColor || '#ffffff', opacity: 0.8 }}
                    >
                      {currentAd.description}
                    </motion.p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className={`p-12 md:p-16 bg-gradient-to-br ${currentAd.gradient} border-0 shadow-2xl rounded-3xl overflow-hidden relative`}>
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
                
                <div className={`space-y-8 flex flex-col ${textAlignClass} relative z-10`}>
                  {currentAd.emoji ? (
                    <motion.span
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="text-7xl md:text-8xl"
                    >
                      {currentAd.emoji}
                    </motion.span>
                  ) : (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="w-28 h-28 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl border border-white/20"
                    >
                      {(() => {
                        const IconComponent = getIconComponent(currentAd.icon);
                        return <IconComponent className="h-14 w-14" style={{ color: currentAd.titleColor || '#ffffff' }} />;
                      })()}
                    </motion.div>
                  )}
                  <motion.h1 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className={`text-4xl md:text-6xl font-bold drop-shadow-lg ${fontFamilyClass}`}
                    style={{ color: currentAd.titleColor || '#ffffff' }}
                  >
                    {currentAd.title}
                  </motion.h1>
                  <motion.p 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className={`text-xl md:text-2xl ${fontFamilyClass}`}
                    style={{ color: currentAd.descriptionColor || '#ffffff', opacity: 0.8 }}
                  >
                    {currentAd.description}
                  </motion.p>
                </div>
              </Card>
            )}
            
            {/* Enhanced Features Overlay for paid ads */}
            {currentAd.campaignId && (currentAd.companyLogoUrl || currentAd.countdownEnabled || currentAd.qrEnabled) && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Company Logo - Top Left */}
                {currentAd.companyLogoUrl && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-xl"
                  >
                    <img 
                      src={currentAd.companyLogoUrl} 
                      alt="Logo" 
                      className="h-12 md:h-16 w-auto object-contain"
                    />
                  </motion.div>
                )}
                
                {/* Countdown Timer - Top Right */}
                {currentAd.countdownEnabled && currentAd.countdownEndDate && (
                  <div className="absolute top-6 right-6">
                    <CountdownTimer 
                      endDate={currentAd.countdownEndDate}
                      text={currentAd.countdownText}
                    />
                  </div>
                )}
                
                {/* QR Code - Bottom Right */}
                {currentAd.qrEnabled && currentAd.qrDestinationUrl && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="absolute bottom-6 right-6 bg-white p-4 rounded-2xl shadow-2xl"
                  >
                    <QRCodeSVG 
                      value={`${window.location.origin}/ads/qr?campaign=${currentAd.campaignId}&corner=${cornerId}&url=${encodeURIComponent(currentAd.qrDestinationUrl)}`}
                      size={100}
                      level="H"
                    />
                    <p className="text-xs text-center mt-2 text-gray-600 font-medium">Scansiona</p>
                  </motion.div>
                )}
              </div>
            )}
            
            {/* Ad indicators */}
            <div className="flex justify-center gap-3 mt-10">
              {advertisements.map((_, idx) => (
                <motion.div
                  key={idx}
                  animate={{ scale: idx === currentAdIndex ? 1.3 : 1 }}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    idx === currentAdIndex 
                      ? "bg-white shadow-lg shadow-white/30" 
                      : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
        
        {/* Logo and branding */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="fixed bottom-16 right-5 flex items-center gap-3 bg-white/5 backdrop-blur-xl rounded-2xl px-5 py-3 border border-white/10"
        >
          {cornerLogo ? (
            <img 
              src={cornerLogo} 
              alt={cornerName} 
              className="h-10 w-10 object-contain rounded-lg"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Store className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="text-white text-right">
            {cornerName && <p className="text-sm font-medium">{cornerName}</p>}
            <p className="text-xs text-white/50">Powered by LabLinkRiparo</p>
          </div>
        </motion.div>
        
        {/* Scrolling Ticker */}
        {tickerEnabled && tickerMessages.length > 0 && (
          <ScrollingTicker 
            messages={tickerMessages} 
            speed={tickerSpeed}
            backgroundColor="rgba(0,0,0,0.9)"
            textColor="#ffffff"
          />
        )}
      </div>
    );
  }

  // ============ COMPLETED MODE ============
  if (mode === "completed") {
    return (
      <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-emerald-950 via-green-900 to-teal-950 flex items-center justify-center p-8 overflow-hidden">
        <ConnectionIndicator />
        <FullscreenButton />
        
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-white space-y-8 relative z-10"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
            className="w-36 h-36 mx-auto rounded-full bg-gradient-to-br from-white to-green-100 flex items-center justify-center shadow-2xl shadow-green-500/30"
          >
            <CheckCircle2 className="h-20 w-20 text-green-600" />
          </motion.div>
          
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <h1 className="text-6xl font-bold bg-gradient-to-r from-white to-green-200 bg-clip-text text-transparent">
              Grazie!
            </h1>
            <p className="text-2xl text-white/80 max-w-md mx-auto">
              La tua segnalazione è stata registrata
            </p>
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-2 text-white/60"
          >
            <Sparkles className="h-5 w-5" />
            <p className="text-lg">Riceverai presto un preventivo</p>
          </motion.div>
          
          {/* Scrolling Ticker */}
          {tickerEnabled && tickerMessages.length > 0 && (
            <ScrollingTicker 
              messages={tickerMessages} 
              speed={tickerSpeed}
              backgroundColor="rgba(0,0,0,0.9)"
              textColor="#ffffff"
            />
          )}
        </motion.div>
      </div>
    );
  }

  // ============ CONFIRM DATA MODE ============
  return (
    <div ref={containerRef} className="h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <ConnectionIndicator />
      <FullscreenButton />
      
      {session && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-full flex flex-col p-4 sm:p-6 md:p-8 relative overflow-hidden"
        >
          {/* Animated background effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-3xl" />
            <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-gradient-to-tl from-amber-500/20 to-transparent rounded-full blur-3xl" />
          </div>

          {/* Header */}
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center mb-4 sm:mb-6 relative z-10"
          >
            <div className="inline-flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 mb-3">
              <ClipboardCheck className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400" />
              <span className="text-sm sm:text-base text-white/70 font-medium">Verifica i tuoi dati</span>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-orange-100 to-white bg-clip-text text-transparent">
              Conferma i Tuoi Dati
            </h1>
          </motion.div>
          
          {/* Content */}
          <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-5 md:gap-6 min-h-0 relative z-10">
            {/* Left - Device Info */}
            <motion.div
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="lg:w-1/3 flex items-center justify-center"
            >
              <Card className="p-4 sm:p-6 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl w-full h-full flex flex-col items-center justify-center">
                <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-3xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border border-white/10">
                  <Smartphone className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 text-white/40" />
                </div>
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 text-center"
                >
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                    {session.device.brand} {session.device.model}
                  </p>
                  <p className="text-sm sm:text-base text-white/60 mt-1 capitalize">
                    {session.device.device_type}
                  </p>
                </motion.div>
              </Card>
            </motion.div>

            {/* Right - Customer & Problem Details */}
            <motion.div
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="lg:flex-1 flex flex-col gap-4"
            >
              {/* Customer Info */}
              <Card className="p-4 sm:p-6 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="p-3 sm:p-4 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-2xl border border-orange-500/20"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-orange-500/30 flex items-center justify-center">
                        <User className="h-4 w-4 text-orange-400" />
                      </div>
                      <p className="text-xs sm:text-sm text-orange-400/80 font-medium">Cliente</p>
                    </div>
                    <p className="font-bold text-base sm:text-lg text-white truncate">{session.customer.name}</p>
                  </motion.div>
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="p-3 sm:p-4 bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-2xl border border-amber-500/20"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/30 flex items-center justify-center">
                        <PhoneIcon className="h-4 w-4 text-amber-400" />
                      </div>
                      <p className="text-xs sm:text-sm text-amber-400/80 font-medium">Telefono</p>
                    </div>
                    <p className="font-bold text-base sm:text-lg text-white truncate">{session.customer.phone}</p>
                  </motion.div>
                </div>
              </Card>

              {/* Problem Details */}
              <Card className="p-4 sm:p-6 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl flex-1">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 bg-gradient-to-br from-rose-500/20 to-rose-600/10 rounded-2xl border border-rose-500/20 h-full"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/30 flex items-center justify-center">
                      <Wrench className="h-4 w-4 text-rose-400" />
                    </div>
                    <p className="text-xs sm:text-sm text-rose-400/80 font-medium">Problema Segnalato</p>
                  </div>
                  <p className="font-semibold text-sm sm:text-base text-white">{session.device.issue_description}</p>
                </motion.div>
              </Card>
            </motion.div>
          </div>

          {/* Confirm Button */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="relative z-10 mt-4"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleConfirmData}
                className="w-full py-6 sm:py-8 text-xl sm:text-2xl font-bold rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:via-amber-600 hover:to-orange-600 shadow-2xl shadow-orange-500/30 border-0"
              >
                <CheckCircle2 className="h-7 w-7 mr-3" />
                Confermo i Dati
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}

      {/* Scrolling Ticker - always visible at bottom */}
      {tickerEnabled && tickerMessages.length > 0 && (
        <ScrollingTicker 
          messages={tickerMessages} 
          speed={tickerSpeed}
          backgroundColor="rgba(0,0,0,0.85)"
          textColor="#ffffff"
        />
      )}
    </div>
  );
}
