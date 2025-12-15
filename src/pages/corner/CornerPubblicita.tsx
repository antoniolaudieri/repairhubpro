import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Megaphone, Euro, Calendar, TrendingUp, Eye, Send, CheckCircle, Clock, Loader2,
  Monitor, Plus, Trash2, Edit, ExternalLink, Copy, Play, Pause, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Smartphone, Wrench, Shield, Cpu, Tablet, Zap, Star, Save
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { DisplayAdEditor, DisplayAd } from '@/components/centro/DisplayAdEditor';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CornerLayout } from '@/layouts/CornerLayout';
import { PageTransition } from '@/components/PageTransition';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

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

interface PlaylistItem {
  id: string;
  type: 'custom' | 'campaign';
  data: DisplayAd | ActiveCampaign;
}

interface CampaignCorner {
  id: string;
  corner_revenue: number;
  impressions_count: number;
  payment_status: string | null;
  payment_requested_at: string | null;
  payment_paid_at: string | null;
  campaign: {
    id: string;
    ad_title: string;
    ad_description: string | null;
    ad_type: string;
    ad_gradient: string;
    ad_image_url: string | null;
    advertiser_name: string;
    advertiser_company: string | null;
    start_date: string;
    end_date: string;
    status: string;
  };
}

interface CornerSettings {
  display_ads?: DisplayAd[];
  slide_interval?: number;
  ticker_enabled?: boolean;
  ticker_speed?: number;
  ticker_messages?: TickerMessage[];
  ticker_rss_url?: string;
  ticker_rss_enabled?: boolean;
  ad_playlist_order?: string[];
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

export default function CornerPubblicita() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignCorner[]>([]);
  const [loading, setLoading] = useState(true);
  const [cornerId, setCornerId] = useState<string | null>(null);
  const [requestingPayment, setRequestingPayment] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  // Display settings
  const [displayAds, setDisplayAds] = useState<DisplayAd[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<ActiveCampaign[]>([]);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [slideInterval, setSlideInterval] = useState(5);
  const [editingAd, setEditingAd] = useState<DisplayAd | null>(null);
  const [previewAdIndex, setPreviewAdIndex] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [usedDevices, setUsedDevices] = useState<{brand: string; model: string; price: number}[]>([]);
  
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
  
  const previewAds = displayAds.length > 0 ? displayAds : defaultAdvertisements;

  useEffect(() => {
    if (!isPreviewPlaying || previewAds.length <= 1) return;
    const interval = setInterval(() => {
      setPreviewAdIndex((prev) => (prev + 1) % previewAds.length);
    }, slideInterval * 1000);
    return () => clearInterval(interval);
  }, [isPreviewPlaying, previewAds.length, slideInterval]);

  useEffect(() => {
    if (user) {
      loadCornerAndCampaigns();
    }
  }, [user]);

  const loadCornerAndCampaigns = async () => {
    try {
      const { data: corner } = await supabase
        .from('corners')
        .select('id, logo_url, settings')
        .eq('user_id', user!.id)
        .single();

      if (!corner) return;
      setCornerId(corner.id);
      setLogoUrl(corner.logo_url);
      
      // Load display settings
      const settings = corner.settings as unknown as CornerSettings | null;
      if (settings?.display_ads) setDisplayAds(settings.display_ads);
      if (settings?.slide_interval) setSlideInterval(settings.slide_interval / 1000);
      if (typeof settings?.ticker_enabled === 'boolean') setTickerEnabled(settings.ticker_enabled);
      if (settings?.ticker_speed) setTickerSpeed(settings.ticker_speed);
      if (settings?.ticker_messages?.length) setTickerMessages(settings.ticker_messages);
      if (settings?.ticker_rss_url) setTickerRssUrl(settings.ticker_rss_url);
      if (typeof settings?.ticker_rss_enabled === 'boolean') setTickerRssEnabled(settings.ticker_rss_enabled);

      // Load revenue campaigns
      const { data, error } = await supabase
        .from('display_ad_campaign_corners')
        .select(`
          id,
          corner_revenue,
          impressions_count,
          payment_status,
          payment_requested_at,
          payment_paid_at,
          campaign:display_ad_campaigns(
            id, ad_title, ad_description, ad_type, ad_gradient, ad_image_url,
            advertiser_name, advertiser_company, start_date, end_date, status
          )
        `)
        .eq('corner_id', corner.id);

      if (error) throw error;
      setCampaigns((data as any[]) || []);
      
      // Load active campaigns for playlist
      const { data: campaignsData } = await supabase
        .from("display_ad_campaign_corners")
        .select(`
          campaign_id,
          display_ad_campaigns (
            id, ad_title, ad_description, ad_image_url, ad_gradient, ad_icon, ad_emoji,
            ad_font, ad_title_color, ad_description_color, company_logo_url, advertiser_company,
            display_seconds, qr_enabled, qr_destination_url, countdown_enabled, countdown_end_date,
            countdown_text, status, start_date, end_date
          )
        `)
        .eq("corner_id", corner.id);
      
      const now = new Date().toISOString();
      const activeCampaignsData = (campaignsData || [])
        .map(c => c.display_ad_campaigns)
        .filter((campaign: any) => 
          campaign && campaign.status === 'active' && campaign.start_date <= now && campaign.end_date >= now
        ) as ActiveCampaign[];
      
      setActiveCampaigns(activeCampaignsData);
      
      // Load used devices for preview
      const { data: devicesData } = await supabase
        .from('used_devices')
        .select('brand, model, price')
        .eq('corner_id', corner.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(4);
      
      setUsedDevices(devicesData || []);
      const savedOrder = settings?.ad_playlist_order;
      const customAdsItems: PlaylistItem[] = (settings?.display_ads || []).map(ad => ({
        id: `custom-${ad.id}`, type: 'custom' as const, data: ad
      }));
      const campaignItems: PlaylistItem[] = activeCampaignsData.map(c => ({
        id: `campaign-${c.id}`, type: 'campaign' as const, data: c
      }));
      
      if (savedOrder?.length) {
        const allItems = [...customAdsItems, ...campaignItems];
        const orderedPlaylist: PlaylistItem[] = [];
        savedOrder.forEach(id => {
          const item = allItems.find(i => i.id === id);
          if (item) orderedPlaylist.push(item);
        });
        allItems.forEach(item => {
          if (!orderedPlaylist.find(p => p.id === item.id)) orderedPlaylist.push(item);
        });
        setPlaylist(orderedPlaylist);
      } else {
        const interleavedPlaylist: PlaylistItem[] = [];
        const maxLen = Math.max(customAdsItems.length, campaignItems.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < customAdsItems.length) interleavedPlaylist.push(customAdsItems[i]);
          if (i < campaignItems.length) interleavedPlaylist.push(campaignItems[i]);
        }
        setPlaylist(interleavedPlaylist);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDisplaySettings = async () => {
    if (!cornerId) return;
    setIsSaving(true);
    try {
      const { data: currentCorner } = await supabase
        .from('corners')
        .select('settings')
        .eq('id', cornerId)
        .single();
      
      const currentSettings = (currentCorner?.settings as CornerSettings) || {};
      const newSettings: CornerSettings = {
        ...currentSettings,
        display_ads: displayAds,
        slide_interval: slideInterval * 1000,
        ticker_enabled: tickerEnabled,
        ticker_speed: tickerSpeed,
        ticker_messages: tickerMessages,
        ticker_rss_url: tickerRssUrl,
        ticker_rss_enabled: tickerRssEnabled,
        ad_playlist_order: playlist.map(p => p.id),
      };
      
      const { error } = await supabase
        .from('corners')
        .update({ settings: newSettings as any, updated_at: new Date().toISOString() })
        .eq('id', cornerId);
      
      if (error) throw error;
      toast.success('Impostazioni display salvate');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestPayment = async (campaignCorner: CampaignCorner) => {
    setRequestingPayment(campaignCorner.id);
    try {
      const { error } = await supabase.functions.invoke('request-corner-ad-payment', {
        body: { campaign_corner_id: campaignCorner.id, corner_id: cornerId, campaign_id: campaignCorner.campaign?.id }
      });
      if (error) throw error;
      toast.success('Richiesta pagamento inviata!');
      loadCornerAndCampaigns();
    } catch (error) {
      console.error('Error requesting payment:', error);
      toast.error('Errore invio richiesta');
    } finally {
      setRequestingPayment(null);
    }
  };

  const totalRevenue = campaigns.reduce((sum, c) => sum + (c.corner_revenue || 0), 0);
  const pendingRevenue = campaigns.filter(c => c.payment_status !== 'paid' && c.campaign?.status === 'active').reduce((sum, c) => sum + (c.corner_revenue || 0), 0);
  const paidRevenue = campaigns.filter(c => c.payment_status === 'paid').reduce((sum, c) => sum + (c.corner_revenue || 0), 0);
  const activeCampaignsCount = campaigns.filter(c => c.campaign?.status === 'active').length;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      active: { variant: 'default', label: 'Attiva' },
      completed: { variant: 'secondary', label: 'Completata' },
      pending_approval: { variant: 'outline', label: 'In Approvazione' }
    };
    const { variant, label } = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getPaymentBadge = (status: string | null) => {
    if (status === 'paid') return <Badge className="bg-green-500">Pagato</Badge>;
    if (status === 'requested') return <Badge variant="outline" className="border-amber-500 text-amber-600">Richiesto</Badge>;
    return <Badge variant="outline" className="border-gray-300">Da Richiedere</Badge>;
  };

  const canRequestPayment = (item: CampaignCorner) => {
    return item.campaign?.status === 'active' && item.payment_status !== 'paid' && item.payment_status !== 'requested' && item.corner_revenue > 0;
  };

  if (loading) {
    return (
      <CornerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </CornerLayout>
    );
  }

  return (
    <CornerLayout>
      <PageTransition>
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="h-6 w-6" />
              Pubblicità Display
            </h1>
            <p className="text-muted-foreground">
              Gestisci il tuo display cliente e guadagna con le pubblicità
            </p>
          </div>

          {/* Revenue Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-green-100 rounded-lg w-fit">
                    <Euro className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-lg sm:text-2xl font-bold">€{totalRevenue.toFixed(2)}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Totale</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-amber-200 rounded-lg w-fit">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-lg sm:text-2xl font-bold text-amber-700">€{pendingRevenue.toFixed(2)}</p>
                    <p className="text-xs sm:text-sm text-amber-600/80">Da Incassare</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-green-200 rounded-lg w-fit">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-lg sm:text-2xl font-bold text-green-700">€{paidRevenue.toFixed(2)}</p>
                    <p className="text-xs sm:text-sm text-green-600/80">Incassato</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg w-fit">
                    <Megaphone className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg sm:text-2xl font-bold">{activeCampaignsCount}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Attive</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Display URL and QR */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Link Display Cliente
              </CardTitle>
              <CardDescription>
                Usa questo link per aprire il display cliente su un dispositivo esterno
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {cornerId && (
                <>
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-xl border-2 border-primary/20 shadow-lg">
                      <QRCodeSVG 
                        value={`${window.location.origin}/display/corner/${cornerId}`}
                        size={150}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    Scansiona il QR code con il dispositivo dedicato
                  </p>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">URL Display:</p>
                    <p className="text-xs font-mono break-all">
                      {window.location.origin}/display/corner/{cornerId}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/display/corner/${cornerId}`);
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
                      onClick={() => window.open(`/display/corner/${cornerId}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Apri Display
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Live Preview - Full Display */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Anteprima Live Display
              </CardTitle>
              <CardDescription>
                Anteprima fedele di come appare il display - mostra solo elementi attivi
                {usedDevices.length === 0 && <span className="block text-xs text-amber-500 mt-1">Nessun dispositivo usato pubblicato - la strip non sarà visibile</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              <div className="relative bg-slate-900 rounded-lg overflow-hidden border-4 border-slate-700 shadow-2xl" style={{ aspectRatio: '16/9' }}>
                {/* Used Devices Strip - Top (only if devices exist) */}
                {usedDevices.length > 0 && (
                  <div className="absolute top-0 left-0 right-0 z-20 bg-black/40 backdrop-blur-xl border-b border-white/10">
                    <div className="flex items-center justify-between px-3 py-1 border-b border-white/5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-[8px] font-medium text-white/80">Dispositivi Ricondizionati</span>
                      </div>
                      <div className="flex gap-0.5">
                        {[1].map((i) => (
                          <div key={i} className="w-1 h-1 rounded-full bg-emerald-400" />
                        ))}
                      </div>
                    </div>
                    <div className="px-2 py-1.5">
                      <div className={`grid gap-1.5 ${usedDevices.length === 1 ? 'grid-cols-1' : usedDevices.length === 2 ? 'grid-cols-2' : usedDevices.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                        {usedDevices.slice(0, 4).map((device, idx) => (
                          <div key={idx} className="bg-white/5 backdrop-blur rounded-md p-1.5 border border-white/10">
                            <div className="flex gap-1.5">
                              <div className="w-6 h-6 rounded bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center flex-shrink-0">
                                <Smartphone className="w-3 h-3 text-white/50" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[6px] text-white/50 uppercase truncate">{device.brand}</p>
                                <p className="text-[8px] font-semibold text-white truncate">{device.model}</p>
                                <span className="text-emerald-400 font-bold text-[9px]">€{device.price}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Ad Slides - Center */}
                <div className={`absolute inset-0 ${usedDevices.length > 0 ? 'pt-[72px]' : 'pt-0'} ${tickerEnabled ? 'pb-10' : 'pb-0'}`}>
                  <AnimatePresence mode="wait">
                    {previewAds.length > 0 && (
                      <motion.div
                        key={previewAdIndex}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                        className={`absolute inset-0 ${usedDevices.length > 0 ? 'pt-[72px]' : 'pt-0'} ${tickerEnabled ? 'pb-10' : 'pb-0'}`}
                      >
                        {(() => {
                          const currentAd = previewAds[previewAdIndex];
                          const IconComponent = getIconComponent(currentAd.icon);
                          const imagePositionClass = { center: 'object-center', top: 'object-top', bottom: 'object-bottom' }[currentAd.imagePosition || 'center'];
                          const textAlignClass = { left: 'text-left items-start', center: 'text-center items-center', right: 'text-right items-end' }[currentAd.textAlign || 'center'];
                          const textPositionClass = { bottom: 'justify-end pb-4', center: 'justify-center', top: 'justify-start pt-4' }[currentAd.textPosition || 'center'];
                          
                          if (currentAd.type === 'image' && currentAd.imageUrl) {
                            return (
                              <div className="relative h-full">
                                <img src={currentAd.imageUrl} alt={currentAd.title} className={`w-full h-full object-cover ${imagePositionClass}`} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                                <div className={`absolute inset-0 flex flex-col px-4 ${textAlignClass} ${textPositionClass}`}>
                                  <h3 className={`text-lg font-bold text-white ${currentAd.titleFont || 'font-sans'}`}>{currentAd.title || "Titolo"}</h3>
                                  <p className={`text-[10px] text-white/80 mt-0.5 ${currentAd.descriptionFont || 'font-sans'}`}>{currentAd.description || "Descrizione"}</p>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div className={`h-full bg-gradient-to-br ${currentAd.gradient} flex flex-col text-white p-4 ${textAlignClass} ${textPositionClass}`}>
                              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center mb-2">
                                <IconComponent className="h-5 w-5 text-white" />
                              </div>
                              <h3 className={`text-lg font-bold ${currentAd.titleFont || 'font-sans'}`}>{currentAd.title || "Titolo"}</h3>
                              <p className={`text-[10px] text-white/80 mt-1 max-w-[70%] ${currentAd.descriptionFont || 'font-sans'}`}>{currentAd.description || "Descrizione"}</p>
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Slide indicators */}
                <div className={`absolute ${tickerEnabled ? 'bottom-12' : 'bottom-3'} left-0 right-0 flex justify-center gap-1 z-30`}>
                  {previewAds.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPreviewAdIndex(idx)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${idx === previewAdIndex ? "bg-white scale-125" : "bg-white/40 hover:bg-white/60"}`}
                    />
                  ))}
                </div>

                {/* Corner Logo - Bottom Left */}
                {logoUrl && (
                  <div className={`absolute ${tickerEnabled ? 'bottom-12' : 'bottom-3'} left-3 z-30`}>
                    <div className="h-8 w-8 rounded-lg overflow-hidden bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
                      <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                    </div>
                  </div>
                )}

                {/* LabLinkRiparo Branding - Bottom Right */}
                <div className={`absolute ${tickerEnabled ? 'bottom-12' : 'bottom-3'} right-3 z-30`}>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10">
                    <Wrench className="h-3 w-3 text-white/70" />
                    <span className="text-[9px] font-medium text-white/70">LabLinkRiparo</span>
                  </div>
                </div>

                {/* Scrolling Ticker - Bottom (only if enabled) */}
                {tickerEnabled && tickerMessages.length > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/85 h-10 flex items-center overflow-hidden">
                    <div className="flex items-center whitespace-nowrap animate-marquee">
                      {[...tickerMessages, ...tickerMessages].map((msg, idx) => (
                        <span key={idx} className="flex items-center gap-2 text-sm font-medium px-4 text-white">
                          {msg.emoji && <span className="text-base">{msg.emoji}</span>}
                          <span>{msg.text}</span>
                          <span className="mx-4 text-white/40">•</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Badge */}
                <div className={`absolute ${usedDevices.length > 0 ? 'top-[76px]' : 'top-3'} left-3 z-30`}>
                  <span className={`text-[8px] px-2 py-0.5 rounded-full backdrop-blur ${displayAds.length > 0 ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {displayAds.length > 0 ? `${displayAds.length} slide` : 'Default'}
                  </span>
                </div>

                {/* Preview Controls Overlay */}
                <div className={`absolute ${usedDevices.length > 0 ? 'top-[76px]' : 'top-3'} right-3 z-30 flex items-center gap-1`}>
                  <select
                    value={slideInterval}
                    onChange={(e) => setSlideInterval(Number(e.target.value))}
                    className="h-5 text-[8px] bg-white/20 text-white border-0 rounded px-1 focus:ring-0 cursor-pointer"
                  >
                    <option value={3} className="text-black">3s</option>
                    <option value={5} className="text-black">5s</option>
                    <option value={7} className="text-black">7s</option>
                    <option value={10} className="text-black">10s</option>
                    <option value={15} className="text-black">15s</option>
                  </select>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-white hover:bg-white/20" onClick={() => setPreviewAdIndex(prev => (prev - 1 + previewAds.length) % previewAds.length)}>
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-white hover:bg-white/20" onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}>
                    {isPreviewPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-white hover:bg-white/20" onClick={() => setPreviewAdIndex(prev => (prev + 1) % previewAds.length)}>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display Ads Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Gestione Slide
              </CardTitle>
              <CardDescription>
                Personalizza le pubblicità mostrate in modalità standby. Usa le frecce per riordinarle.
                {activeCampaigns.length > 0 && (
                  <span className="block mt-1 text-amber-600">
                    📢 Hai {activeCampaigns.length} inserti pubblicitari attivi da inserzionisti
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Ordine di Riproduzione
                  </h4>
                  <span className="text-xs text-muted-foreground">{playlist.length} slide totali</span>
                </div>
                
                {playlist.length === 0 && displayAds.length === 0 && activeCampaigns.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg space-y-3">
                    <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nessuna pubblicità configurata</p>
                      <p className="text-xs text-muted-foreground/70">Verranno mostrate le pubblicità predefinite</p>
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
                      <div key={item.id} className={`border rounded-lg overflow-hidden bg-card hover:border-primary/50 transition-colors group ${!isCustom ? 'border-amber-500/50 bg-amber-500/5' : ''}`}>
                        <div className="flex">
                          <div className="flex flex-col items-center justify-center px-2 bg-muted/30 border-r gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0} onClick={() => {
                              if (index > 0) {
                                const newPlaylist = [...playlist];
                                [newPlaylist[index - 1], newPlaylist[index]] = [newPlaylist[index], newPlaylist[index - 1]];
                                setPlaylist(newPlaylist);
                              }
                            }}>
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <div className="text-xs font-bold text-muted-foreground">{index + 1}</div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === playlist.length - 1} onClick={() => {
                              if (index < playlist.length - 1) {
                                const newPlaylist = [...playlist];
                                [newPlaylist[index], newPlaylist[index + 1]] = [newPlaylist[index + 1], newPlaylist[index]];
                                setPlaylist(newPlaylist);
                              }
                            }}>
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="relative w-32 h-20 flex-shrink-0">
                            {isCustom && customAd ? (
                              customAd.type === 'image' && customAd.imageUrl ? (
                                <div className="relative h-full">
                                  <img src={customAd.imageUrl} alt={customAd.title} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                </div>
                              ) : (
                                <div className={`h-full bg-gradient-to-br ${customAd.gradient} flex items-center justify-center`}>
                                  {IconComponent && <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center"><IconComponent className="h-4 w-4 text-white" /></div>}
                                </div>
                              )
                            ) : campaign ? (
                              campaign.ad_image_url ? (
                                <div className="relative h-full">
                                  <img src={campaign.ad_image_url} alt={campaign.ad_title} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                </div>
                              ) : (
                                <div className={`h-full bg-gradient-to-br ${campaign.ad_gradient || 'from-amber-500 to-orange-500'} flex items-center justify-center`}>
                                  <span className="text-2xl">{campaign.ad_emoji || '📢'}</span>
                                </div>
                              )
                            ) : null}
                          </div>
                          
                          <div className="flex-1 p-2 flex flex-col justify-center min-w-0">
                            <p className="font-semibold text-sm truncate">{isCustom ? (customAd?.title || "Senza titolo") : (campaign?.ad_title || "Inserto")}</p>
                            <p className="text-xs text-muted-foreground truncate">{isCustom ? (customAd?.description || "Nessuna descrizione") : (campaign?.ad_description || campaign?.advertiser_company || "Pubblicità")}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${isCustom ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                {isCustom ? '🏠 Tua' : '📢 Inserto'}
                              </span>
                              {!isCustom && campaign && <span className="text-xs text-muted-foreground">{campaign.display_seconds}s</span>}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 pr-2">
                            {isCustom && customAd && (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingAd(customAd)}><Edit className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => {
                                  setDisplayAds(prev => prev.filter(a => a.id !== customAd.id));
                                  setPlaylist(prev => prev.filter(p => p.id !== item.id));
                                }}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </>
                            )}
                            {!isCustom && <span className="text-xs text-amber-600 px-2">A pagamento</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {activeCampaigns.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Megaphone className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-700 dark:text-amber-400">
                      <p className="font-medium">Inserti pubblicitari attivi: {activeCampaigns.length}</p>
                      <p className="mt-1">Puoi riordinarli nella playlist per alternarli con le tue slide.</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => {
                  const newAd: DisplayAd = { id: `ad-${Date.now()}`, title: "", description: "", gradient: "from-blue-500 to-cyan-500", icon: "smartphone", type: "gradient" };
                  setEditingAd(newAd);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Pubblicità
                </Button>
                {displayAds.length === 0 && (
                  <Button variant="secondary" onClick={() => {
                    const copiedAds = defaultAdvertisements.map(ad => ({ ...ad, id: `ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }));
                    setDisplayAds(copiedAds);
                    const newPlaylistItems: PlaylistItem[] = copiedAds.map(ad => ({ id: `custom-${ad.id}`, type: 'custom' as const, data: ad }));
                    setPlaylist(prev => [...newPlaylistItems, ...prev.filter(p => p.type === 'campaign')]);
                    toast.success("Slide predefinite copiate!");
                  }}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copia Predefinite
                  </Button>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                Le pubblicità verranno mostrate a rotazione ogni {slideInterval} secondi.
                {playlist.length === 0 ? (
                  <span className="text-amber-600 block">⚠️ Clicca "Copia Predefinite" per iniziare</span>
                ) : (
                  <span className="text-green-600 block">✓ {playlist.filter(p => p.type === 'custom').length} slide + {playlist.filter(p => p.type === 'campaign').length} inserti</span>
                )}
              </p>
            </CardContent>
          </Card>

          {editingAd && cornerId && (
            <DisplayAdEditor
              ad={editingAd}
              open={!!editingAd}
              onClose={() => setEditingAd(null)}
              onSave={(updatedAd) => {
                const existingIndex = displayAds.findIndex(a => a.id === updatedAd.id);
                if (existingIndex >= 0) {
                  setDisplayAds(displayAds.map(a => a.id === updatedAd.id ? updatedAd : a));
                  setPlaylist(prev => prev.map(p => p.id === `custom-${updatedAd.id}` ? { ...p, data: updatedAd } : p));
                } else {
                  setDisplayAds([...displayAds, updatedAd]);
                  const newPlaylistItem: PlaylistItem = { id: `custom-${updatedAd.id}`, type: 'custom', data: updatedAd };
                  setPlaylist(prev => {
                    const customItems = prev.filter(p => p.type === 'custom');
                    const campaignItems = prev.filter(p => p.type === 'campaign');
                    return [...customItems, newPlaylistItem, ...campaignItems];
                  });
                }
                setEditingAd(null);
              }}
              cornerId={cornerId}
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
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3">
                  <Button variant={tickerEnabled ? "default" : "outline"} size="sm" onClick={() => setTickerEnabled(!tickerEnabled)}>
                    {tickerEnabled ? "✅ Attivo" : "❌ Disattivato"}
                  </Button>
                </div>
                {tickerEnabled && (
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm">Velocità scorrimento</Label>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">🐢 Lento</span>
                      <Slider value={[tickerSpeed]} onValueChange={([v]) => setTickerSpeed(v)} min={20} max={100} step={5} className="flex-1" />
                      <span className="text-xs text-muted-foreground">🐇 Veloce</span>
                    </div>
                  </div>
                )}
              </div>
              
              {tickerEnabled && (
                <>
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
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setTickerMessages(prev => prev.filter((_, i) => i !== index))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input value={newTickerEmoji} onChange={(e) => setNewTickerEmoji(e.target.value)} className="w-16 text-center" placeholder="🔥" />
                    <Input
                      value={newTickerText}
                      onChange={(e) => setNewTickerText(e.target.value)}
                      className="flex-1"
                      placeholder="Aggiungi un nuovo messaggio..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTickerText.trim()) {
                          setTickerMessages([...tickerMessages, { id: `ticker-${Date.now()}`, text: newTickerText.trim(), emoji: newTickerEmoji || undefined }]);
                          setNewTickerText("");
                          setNewTickerEmoji("");
                        }
                      }}
                    />
                    <Button variant="secondary" onClick={() => {
                      if (newTickerText.trim()) {
                        setTickerMessages([...tickerMessages, { id: `ticker-${Date.now()}`, text: newTickerText.trim(), emoji: newTickerEmoji || undefined }]);
                        setNewTickerText("");
                        setNewTickerEmoji("");
                      }
                    }} disabled={!newTickerText.trim()}>
                      <Plus className="h-4 w-4 mr-1" />
                      Aggiungi
                    </Button>
                  </div>
                  
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📡</span>
                        <Label>Feed RSS Notizie</Label>
                      </div>
                      <Button variant={tickerRssEnabled ? "default" : "outline"} size="sm" onClick={() => setTickerRssEnabled(!tickerRssEnabled)}>
                        {tickerRssEnabled ? "✅ Attivo" : "Disattivato"}
                      </Button>
                    </div>
                    
                    {tickerRssEnabled && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input value={tickerRssUrl} onChange={(e) => setTickerRssUrl(e.target.value)} placeholder="https://esempio.it/feed.rss" className="flex-1" />
                          <Button
                            variant="secondary"
                            disabled={!tickerRssUrl.trim() || testingRss}
                            onClick={async () => {
                              if (!tickerRssUrl.trim()) return;
                              setTestingRss(true);
                              try {
                                const { data, error } = await supabase.functions.invoke('fetch-rss-feed', { body: { feedUrl: tickerRssUrl, maxItems: 3 } });
                                if (error) throw error;
                                if (data.success && data.items?.length > 0) {
                                  toast.success(`✅ Feed valido: "${data.feedTitle}" - ${data.items.length} notizie`);
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
                        <p className="text-xs text-muted-foreground">📰 Le notizie dal feed RSS verranno aggiunte automaticamente al ticker.</p>
                        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          <strong>Feed consigliati:</strong><br/>
                          • ANSA: https://www.ansa.it/sito/ansait_rss.xml<br/>
                          • Rai News: https://www.rainews.it/rss/ultimora<br/>
                          • Gazzetta Sport: https://www.gazzetta.it/dynamic-feed/rss/section/last.xml
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground">💡 I messaggi scorreranno continuamente in basso sul display Corner.</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Campaigns Revenue */}
          <Card>
            <CardHeader>
              <CardTitle>Guadagni Campagne</CardTitle>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna campagna pubblicitaria ancora</p>
                  <p className="text-sm mt-1">Gli inserzionisti possono acquistare spazi pubblicitari sul tuo display</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((item) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                      <div className="w-full sm:w-28 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                        {item.campaign?.ad_type === 'image' && item.campaign?.ad_image_url ? (
                          <img src={item.campaign.ad_image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${item.campaign?.ad_gradient} flex items-center justify-center p-2`}>
                            <p className="text-white text-xs font-medium text-center line-clamp-2">{item.campaign?.ad_title}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-medium truncate">{item.campaign?.ad_title}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {item.campaign?.advertiser_name}{item.campaign?.advertiser_company && ` · ${item.campaign.advertiser_company}`}
                            </p>
                          </div>
                          <div className="flex gap-1.5 flex-wrap">
                            {item.campaign?.status && getStatusBadge(item.campaign.status)}
                            {getPaymentBadge(item.payment_status)}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            {item.campaign?.start_date && format(new Date(item.campaign.start_date), 'dd/MM', { locale: it })} - {item.campaign?.end_date && format(new Date(item.campaign.end_date), 'dd/MM', { locale: it })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            {item.impressions_count} views
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3">
                          <span className="text-lg font-bold text-green-600">+€{item.corner_revenue?.toFixed(2)}</span>
                          {canRequestPayment(item) && (
                            <Button size="sm" onClick={() => handleRequestPayment(item)} disabled={requestingPayment === item.id} className="gap-2 w-full sm:w-auto">
                              {requestingPayment === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                              Richiedi Pagamento
                            </Button>
                          )}
                          {item.payment_status === 'requested' && <span className="text-xs sm:text-sm text-amber-600 flex items-center gap-1"><Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />In attesa</span>}
                          {item.payment_status === 'paid' && item.payment_paid_at && <span className="text-xs sm:text-sm text-green-600 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />{format(new Date(item.payment_paid_at), 'dd/MM/yy', { locale: it })}</span>}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end sticky bottom-4 pt-4">
            <Button onClick={handleSaveDisplaySettings} disabled={isSaving} size="lg" className="shadow-lg">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salva Impostazioni Display
            </Button>
          </div>
        </div>
      </PageTransition>
    </CornerLayout>
  );
}
