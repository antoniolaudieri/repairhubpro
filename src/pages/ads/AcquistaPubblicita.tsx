import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Megaphone, Building2, Mail, Phone, User, 
  Calendar, MapPin, Check, CreditCard, ArrowLeft,
  ArrowRight, Sparkles, Image, Palette, Type, Upload, Loader2,
  Tag, Percent, Clock, Video, Timer, Link, QrCode, Building,
  Wand2, Eye, EyeOff, ChevronDown, ChevronUp
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { CountdownTimer } from '@/components/ads/CountdownTimer';
import { AITextGeneratorDialog } from '@/components/ads/AITextGeneratorDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CornerSelectionMap } from '@/components/ads/CornerSelectionMap';

interface Corner {
  id: string;
  business_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface CampaignData {
  advertiser_name: string;
  advertiser_email: string;
  advertiser_phone: string;
  advertiser_company: string;
  ad_title: string;
  ad_description: string;
  ad_image_url: string;
  ad_gradient: string;
  ad_icon: string;
  ad_type: 'gradient' | 'image' | 'video';
  ad_video_url: string;
  display_seconds: number;
  start_date: string;
  end_date: string;
  corner_ids: string[];
  duration_package: string | null;
  ad_font: string;
  ad_title_color: string;
  ad_description_color: string;
  ad_bg_color: string;
  ad_emoji: string;
  countdown_enabled: boolean;
  countdown_end_date: string;
  countdown_text: string;
  company_logo_url: string;
  qr_enabled: boolean;
  qr_destination_url: string;
}

interface DurationPackage {
  id: string;
  label: string;
  days: number;
  discount: number;
  badge?: string;
  emoji: string;
}

const durationPackages: DurationPackage[] = [
  { id: '7days', label: '1 Settimana', days: 7, discount: 0, emoji: '📅' },
  { id: '1month', label: '1 Mese', days: 30, discount: 10, badge: '-10%', emoji: '🗓️' },
  { id: '3months', label: '3 Mesi', days: 90, discount: 20, badge: '-20%', emoji: '⏳' },
  { id: '1year', label: '1 Anno', days: 365, discount: 35, badge: '🏆 Best Value', emoji: '🎯' },
];

const getVolumeDiscount = (cornerCount: number): number => {
  if (cornerCount >= 10) return 25;
  if (cornerCount >= 5) return 15;
  if (cornerCount >= 3) return 10;
  return 0;
};

const getDisplaySecondsMultiplier = (seconds: number): number => {
  const extraSeconds = seconds - 5;
  return 1 + (extraSeconds * 0.10);
};

const MIN_DISPLAY_SECONDS = 5;
const MAX_DISPLAY_SECONDS = 15;

const gradientOptions = [
  'from-blue-600 via-purple-600 to-pink-600',
  'from-green-500 via-teal-500 to-cyan-500',
  'from-orange-500 via-red-500 to-pink-500',
  'from-indigo-600 via-purple-600 to-blue-600',
  'from-yellow-400 via-orange-500 to-red-500',
  'from-emerald-500 via-green-500 to-lime-500',
];

const fontOptions = [
  { id: 'sans', label: 'Sans', className: 'font-sans' },
  { id: 'serif', label: 'Serif', className: 'font-serif' },
  { id: 'mono', label: 'Mono', className: 'font-mono' },
];

// Extended emoji options grouped by category
const emojiCategories = [
  { 
    name: '🔥 Promozioni', 
    emojis: ['🔥', '⭐', '💥', '🎁', '💰', '🏷️', '⚡', '🆕', '✨', '💎', '🎉', '🏆']
  },
  { 
    name: '🍕 Food & Drink', 
    emojis: ['🍕', '☕', '🍔', '🍷', '🍰', '🍣', '🥗', '🍺']
  },
  { 
    name: '🛍️ Shopping', 
    emojis: ['🛍️', '👗', '👟', '💄', '🎧', '📱', '💻', '🎮']
  },
  { 
    name: '💇 Servizi', 
    emojis: ['💇', '💅', '🏋️', '🚗', '🏠', '✂️', '💊', '🔧']
  },
  { 
    name: '❤️ Generici', 
    emojis: ['❤️', '👍', '🎯', '💪', '📣', '🔔', '💡', '✅']
  },
];

const colorPresets = [
  '#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', 
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

const stepInfo = [
  { num: 1, emoji: '👤', label: 'Dati' },
  { num: 2, emoji: '🎨', label: 'Crea' },
  { num: 3, emoji: '📍', label: 'Dove' },
  { num: 4, emoji: '💳', label: 'Paga' },
];

export default function AcquistaPubblicita() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCornerId = searchParams.get('corner');
  
  const [step, setStep] = useState(1);
  const [corners, setCorners] = useState<Corner[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pricing, setPricing] = useState({ pricePerWeek: 5, cornerPercentage: 50 });
  const [showPreview, setShowPreview] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const MIN_IMAGE_WIDTH = 1200;
  const MIN_IMAGE_HEIGHT = 675;
  
  const [campaignData, setCampaignData] = useState<CampaignData>({
    advertiser_name: '',
    advertiser_email: '',
    advertiser_phone: '',
    advertiser_company: '',
    ad_title: '',
    ad_description: '',
    ad_image_url: '',
    ad_gradient: gradientOptions[0],
    ad_icon: 'Megaphone',
    ad_type: 'gradient',
    ad_video_url: '',
    display_seconds: MIN_DISPLAY_SECONDS,
    start_date: '',
    end_date: '',
    corner_ids: initialCornerId ? [initialCornerId] : [],
    duration_package: null,
    ad_font: 'sans',
    ad_title_color: '#ffffff',
    ad_description_color: '#ffffff',
    ad_bg_color: '',
    ad_emoji: '',
    countdown_enabled: false,
    countdown_end_date: '',
    countdown_text: 'Offerta valida ancora',
    company_logo_url: '',
    qr_enabled: false,
    qr_destination_url: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: cornersData } = await supabase
        .from('corners')
        .select('id, business_name, address, latitude, longitude')
        .eq('status', 'approved');
      
      setCorners(cornersData || []);

      const { data: settings } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['ad_price_per_corner_per_week', 'ad_corner_revenue_percentage']);

      if (settings) {
        const pricePerWeek = settings.find(s => s.key === 'ad_price_per_corner_per_week')?.value || 5;
        const cornerPercentage = settings.find(s => s.key === 'ad_corner_revenue_percentage')?.value || 50;
        setPricing({ pricePerWeek, cornerPercentage });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = () => {
    if (!campaignData.start_date || !campaignData.end_date || campaignData.corner_ids.length === 0) {
      return { total: 0, weeks: 0, basePrice: 0, durationDiscount: 0, volumeDiscount: 0, totalDiscount: 0, displaySecondsExtra: 0 };
    }
    const start = new Date(campaignData.start_date);
    const end = new Date(campaignData.end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.max(1, Math.ceil(days / 7));
    
    const basePriceAt5Sec = pricing.pricePerWeek * campaignData.corner_ids.length * weeks;
    const displaySecondsMultiplier = getDisplaySecondsMultiplier(campaignData.display_seconds);
    const basePrice = basePriceAt5Sec * displaySecondsMultiplier;
    const displaySecondsExtra = basePrice - basePriceAt5Sec;
    
    const selectedPackage = durationPackages.find(p => p.id === campaignData.duration_package);
    const durationDiscountPercent = selectedPackage?.discount || 0;
    const volumeDiscountPercent = getVolumeDiscount(campaignData.corner_ids.length);
    
    const durationDiscount = basePrice * (durationDiscountPercent / 100);
    const priceAfterDuration = basePrice - durationDiscount;
    const volumeDiscount = priceAfterDuration * (volumeDiscountPercent / 100);
    const totalDiscount = durationDiscount + volumeDiscount;
    
    const total = basePrice - totalDiscount;
    
    return { 
      total, 
      weeks, 
      basePrice, 
      durationDiscount, 
      volumeDiscount, 
      totalDiscount,
      durationDiscountPercent,
      volumeDiscountPercent,
      displaySecondsExtra
    };
  };

  const selectDurationPackage = (pkg: DurationPackage) => {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + pkg.days);
    
    setCampaignData(prev => ({
      ...prev,
      duration_package: pkg.id,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    }));
  };

  const toggleCorner = (cornerId: string) => {
    setCampaignData(prev => ({
      ...prev,
      corner_ids: prev.corner_ids.includes(cornerId)
        ? prev.corner_ids.filter(id => id !== cornerId)
        : [...prev.corner_ids, cornerId]
    }));
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'image') {
      if (!file.type.startsWith('image/')) {
        toast.error('❌ Il file deve essere un\'immagine');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('❌ L\'immagine non può superare 5MB');
        return;
      }

      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      
      img.onload = async () => {
        URL.revokeObjectURL(img.src);
        if (img.width < MIN_IMAGE_WIDTH || img.height < MIN_IMAGE_HEIGHT) {
          toast.error(`❌ Immagine troppo piccola! Minimo ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}px`);
          return;
        }
        await uploadFile(file, 'ad_image_url');
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        toast.error('❌ Errore nel caricamento');
      };
    } else {
      if (!file.type.startsWith('video/')) {
        toast.error('❌ Il file deve essere un video');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error('❌ Il video non può superare 50MB');
        return;
      }
      await uploadFile(file, 'ad_video_url');
    }
  };

  const uploadFile = async (file: File, field: 'ad_image_url' | 'ad_video_url' | 'company_logo_url') => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `ad-${Date.now()}.${fileExt}`;
      const filePath = `ads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ad-creatives')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('ad-creatives')
        .getPublicUrl(filePath);

      setCampaignData(prev => ({ ...prev, [field]: publicUrl }));
      const messages: Record<string, string> = {
        ad_image_url: '✅ Immagine caricata!',
        ad_video_url: '✅ Video caricato!',
        company_logo_url: '✅ Logo caricato!'
      };
      toast.success(messages[field]);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('❌ Errore nel caricamento');
    } finally {
      setUploading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('❌ Il file deve essere un\'immagine');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('❌ Il logo non può superare 2MB');
      return;
    }
    await uploadFile(file, 'company_logo_url');
  };

  const handleSubmit = async () => {
    if (!campaignData.advertiser_name || !campaignData.advertiser_email || 
        !campaignData.ad_title || !campaignData.start_date || 
        !campaignData.end_date || campaignData.corner_ids.length === 0) {
      toast.error('⚠️ Compila tutti i campi obbligatori');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-ad-checkout', {
        body: {
          ...campaignData,
          success_url: `${window.location.origin}/ads/successo`,
          cancel_url: `${window.location.origin}/ads/acquista`
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast.error('❌ Errore nella creazione del pagamento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAISelect = (title: string, description: string) => {
    setCampaignData(prev => ({ ...prev, ad_title: title, ad_description: description }));
  };

  const { total, weeks, basePrice, durationDiscount, volumeDiscount, totalDiscount, durationDiscountPercent, volumeDiscountPercent, displaySecondsExtra } = calculatePrice();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">✨ Caricamento...</p>
        </div>
      </div>
    );
  }

  // Preview component
  const AdPreview = () => (
    <div className={`aspect-video rounded-xl overflow-hidden shadow-xl relative ${
      fontOptions.find(f => f.id === campaignData.ad_font)?.className || 'font-sans'
    }`}>
      {campaignData.ad_type === 'video' && campaignData.ad_video_url ? (
        <video 
          src={campaignData.ad_video_url} 
          className="w-full h-full object-cover"
          autoPlay 
          muted 
          loop 
          playsInline
        />
      ) : campaignData.ad_type === 'image' && campaignData.ad_image_url ? (
        <div className="relative w-full h-full">
          <img 
            src={campaignData.ad_image_url} 
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-center p-4">
            <div className="text-center">
              <h3 className="text-lg sm:text-xl font-bold drop-shadow-lg" style={{ color: campaignData.ad_title_color }}>
                {campaignData.ad_emoji} {campaignData.ad_title || 'Il tuo titolo'}
              </h3>
              {campaignData.ad_description && (
                <p className="text-sm opacity-90 mt-1 drop-shadow-md" style={{ color: campaignData.ad_description_color }}>
                  {campaignData.ad_description}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${campaignData.ad_gradient} flex items-center justify-center p-4`}>
          <div className="text-center">
            {campaignData.ad_emoji ? (
              <span className="text-4xl sm:text-5xl mb-3 block">{campaignData.ad_emoji}</span>
            ) : (
              <Megaphone className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-80" style={{ color: campaignData.ad_title_color }} />
            )}
            <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: campaignData.ad_title_color }}>
              {campaignData.ad_title || 'Il tuo titolo'}
            </h3>
            {campaignData.ad_description && (
              <p className="text-sm" style={{ color: campaignData.ad_description_color, opacity: 0.8 }}>
                {campaignData.ad_description}
              </p>
            )}
          </div>
        </div>
      )}
      
      {campaignData.company_logo_url && (
        <div className="absolute top-2 left-2 z-10">
          <img src={campaignData.company_logo_url} alt="Logo" className="h-8 w-auto object-contain bg-white/90 rounded-lg p-1 shadow-lg" />
        </div>
      )}
      
      {campaignData.countdown_enabled && campaignData.countdown_end_date && (
        <div className="absolute top-2 right-2 z-10">
          <CountdownTimer endDate={campaignData.countdown_end_date} text={campaignData.countdown_text} className="scale-75 origin-top-right" />
        </div>
      )}
      
      {campaignData.qr_enabled && campaignData.qr_destination_url && (
        <div className="absolute bottom-2 right-2 z-10 bg-white p-1.5 rounded-lg shadow-lg">
          <QRCodeSVG value={campaignData.qr_destination_url} size={50} level="M" />
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-8"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-primary to-primary/60 rounded-2xl mb-3 sm:mb-4">
            <Megaphone className="h-7 w-7 sm:h-8 sm:w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">📺 Pubblicizza la tua Attività</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            ✨ Raggiungi clienti nei Corner della tua zona
          </p>
        </motion.div>

        {/* Progress Steps - Mobile Optimized */}
        <div className="mb-6 sm:mb-8">
          {/* Mobile: Compact progress bar */}
          <div className="sm:hidden">
            <div className="flex items-center justify-between mb-2">
              {stepInfo.map((s, idx) => (
                <div key={s.num} className="flex items-center">
                  <motion.div 
                    className={`w-10 h-10 rounded-full flex flex-col items-center justify-center text-xs font-medium transition-all ${
                      step >= s.num ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                    animate={step === s.num ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {step > s.num ? <Check className="h-4 w-4" /> : <span className="text-base">{s.emoji}</span>}
                  </motion.div>
                  {idx < stepInfo.length - 1 && (
                    <div className={`w-6 h-1 mx-1 rounded ${step > s.num ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-sm font-medium text-primary">
              {stepInfo[step - 1].emoji} {stepInfo[step - 1].label}
            </p>
          </div>

          {/* Desktop: Full progress */}
          <div className="hidden sm:flex justify-center">
            {stepInfo.map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <motion.div 
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all ${
                      step >= s.num ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                    animate={step === s.num ? { scale: [1, 1.05, 1] } : {}}
                  >
                    {step > s.num ? <Check className="h-5 w-5" /> : <span className="text-xl">{s.emoji}</span>}
                  </motion.div>
                  <span className={`text-xs mt-1 ${step >= s.num ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < stepInfo.length - 1 && (
                  <div className={`w-16 h-1 mx-2 rounded ${step > s.num ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Advertiser Info */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="border-2">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <span className="text-2xl">👤</span>
                    I tuoi dati
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Nome e Cognome *</Label>
                      <Input
                        value={campaignData.advertiser_name}
                        onChange={(e) => setCampaignData(prev => ({ ...prev, advertiser_name: e.target.value }))}
                        placeholder="Mario Rossi"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Azienda</Label>
                      <Input
                        value={campaignData.advertiser_company}
                        onChange={(e) => setCampaignData(prev => ({ ...prev, advertiser_company: e.target.value }))}
                        placeholder="Nome azienda"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">📧 Email *</Label>
                      <Input
                        type="email"
                        value={campaignData.advertiser_email}
                        onChange={(e) => setCampaignData(prev => ({ ...prev, advertiser_email: e.target.value }))}
                        placeholder="email@esempio.it"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">📱 Telefono</Label>
                      <Input
                        value={campaignData.advertiser_phone}
                        onChange={(e) => setCampaignData(prev => ({ ...prev, advertiser_phone: e.target.value }))}
                        placeholder="+39 123 456 7890"
                        className="h-11"
                      />
                    </div>
                  </div>

                  {/* Mobile sticky buttons */}
                  <div className="flex justify-end pt-4 sm:pt-6">
                    <Button 
                      onClick={() => setStep(2)} 
                      disabled={!campaignData.advertiser_name || !campaignData.advertiser_email}
                      className="w-full sm:w-auto h-12 text-base"
                    >
                      Avanti <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Creative */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="border-2">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <span className="text-2xl">🎨</span>
                    Crea la tua Pubblicità
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Mobile Preview Toggle */}
                  <div className="sm:hidden">
                    <Button
                      variant="outline"
                      onClick={() => setShowPreview(!showPreview)}
                      className="w-full mb-3"
                    >
                      {showPreview ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                      {showPreview ? 'Nascondi Anteprima' : 'Mostra Anteprima'}
                    </Button>
                    {showPreview && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mb-4"
                      >
                        <Label className="text-sm mb-2 block">📺 Anteprima</Label>
                        <AdPreview />
                      </motion.div>
                    )}
                  </div>

                  {/* Ad Type */}
                  <div className="space-y-2">
                    <Label className="text-sm">Tipo di annuncio</Label>
                    <RadioGroup
                      value={campaignData.ad_type}
                      onValueChange={(value: 'gradient' | 'image' | 'video') => setCampaignData(prev => ({ ...prev, ad_type: value }))}
                      className="flex flex-wrap gap-2 sm:gap-4"
                    >
                      {[
                        { value: 'gradient', icon: Palette, label: '🎨 Gradiente' },
                        { value: 'image', icon: Image, label: '🖼️ Immagine' },
                        { value: 'video', icon: Video, label: '🎬 Video' },
                      ].map((opt) => (
                        <div key={opt.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={opt.value} id={opt.value} />
                          <Label htmlFor={opt.value} className="flex items-center gap-1 cursor-pointer text-sm">
                            {opt.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Display Seconds */}
                  <div className="space-y-3 p-3 sm:p-4 bg-muted/50 rounded-xl border">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm">
                        <Timer className="h-4 w-4" />
                        ⏱️ Durata visualizzazione
                      </Label>
                      <span className="text-lg font-bold text-primary">{campaignData.display_seconds}s</span>
                    </div>
                    <Slider
                      value={[campaignData.display_seconds]}
                      onValueChange={(value) => setCampaignData(prev => ({ ...prev, display_seconds: value[0] }))}
                      min={MIN_DISPLAY_SECONDS}
                      max={MAX_DISPLAY_SECONDS}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{MIN_DISPLAY_SECONDS}s (base)</span>
                      <span>{MAX_DISPLAY_SECONDS}s (+{(MAX_DISPLAY_SECONDS - MIN_DISPLAY_SECONDS) * 10}%)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="space-y-4">
                      {/* Title & Description with AI */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">📝 Titolo *</Label>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setAiDialogOpen(true)}
                            className="h-8 text-xs bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:border-purple-500/50"
                          >
                            <Wand2 className="mr-1 h-3 w-3" />
                            ✨ Genera con AI
                          </Button>
                        </div>
                        <Input
                          value={campaignData.ad_title}
                          onChange={(e) => setCampaignData(prev => ({ ...prev, ad_title: e.target.value }))}
                          placeholder="Sconto 20% su tutti i prodotti!"
                          className="h-11"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm">📄 Descrizione</Label>
                        <Textarea
                          value={campaignData.ad_description}
                          onChange={(e) => setCampaignData(prev => ({ ...prev, ad_description: e.target.value }))}
                          placeholder="Approfitta della nostra offerta speciale..."
                          rows={2}
                        />
                      </div>

                      {/* Emoji Selector - Horizontal Scroll */}
                      <div className="space-y-2">
                        <Label className="text-sm flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Emoji
                        </Label>
                        <div className="space-y-2">
                          {emojiCategories.map((cat) => (
                            <div key={cat.name}>
                              <p className="text-xs text-muted-foreground mb-1">{cat.name}</p>
                              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                                {cat.emojis.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => setCampaignData(prev => ({ ...prev, ad_emoji: emoji }))}
                                    className={`flex-shrink-0 w-9 h-9 text-lg rounded-lg border-2 transition-all flex items-center justify-center ${
                                      campaignData.ad_emoji === emoji 
                                        ? 'border-primary bg-primary/10 scale-110' 
                                        : 'border-muted hover:border-muted-foreground/50'
                                    }`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => setCampaignData(prev => ({ ...prev, ad_emoji: '' }))}
                            className={`w-9 h-9 text-sm rounded-lg border-2 transition-all ${
                              campaignData.ad_emoji === '' 
                                ? 'border-primary bg-primary/10' 
                                : 'border-muted hover:border-muted-foreground/50'
                            }`}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Font Selector */}
                      <div className="space-y-2">
                        <Label className="text-sm">🔤 Font</Label>
                        <div className="flex gap-2">
                          {fontOptions.map((font) => (
                            <button
                              key={font.id}
                              onClick={() => setCampaignData(prev => ({ ...prev, ad_font: font.id }))}
                              className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all text-sm ${font.className} ${
                                campaignData.ad_font === font.id 
                                  ? 'border-primary bg-primary/10' 
                                  : 'border-muted hover:border-muted-foreground/50'
                              }`}
                            >
                              {font.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Color Controls */}
                      <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                        <Label className="text-sm">🎨 Colori Testo</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Titolo</Label>
                            <div className="flex gap-1 flex-wrap">
                              {colorPresets.slice(0, 5).map((color) => (
                                <button
                                  key={`title-${color}`}
                                  onClick={() => setCampaignData(prev => ({ ...prev, ad_title_color: color }))}
                                  className={`w-6 h-6 rounded border-2 transition-all ${
                                    campaignData.ad_title_color === color ? 'ring-2 ring-primary ring-offset-1' : 'border-muted'
                                  }`}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                              <input
                                type="color"
                                value={campaignData.ad_title_color}
                                onChange={(e) => setCampaignData(prev => ({ ...prev, ad_title_color: e.target.value }))}
                                className="w-6 h-6 rounded cursor-pointer"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Descrizione</Label>
                            <div className="flex gap-1 flex-wrap">
                              {colorPresets.slice(0, 5).map((color) => (
                                <button
                                  key={`desc-${color}`}
                                  onClick={() => setCampaignData(prev => ({ ...prev, ad_description_color: color }))}
                                  className={`w-6 h-6 rounded border-2 transition-all ${
                                    campaignData.ad_description_color === color ? 'ring-2 ring-primary ring-offset-1' : 'border-muted'
                                  }`}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                              <input
                                type="color"
                                value={campaignData.ad_description_color}
                                onChange={(e) => setCampaignData(prev => ({ ...prev, ad_description_color: e.target.value }))}
                                className="w-6 h-6 rounded cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Gradient/Image/Video Upload */}
                      {campaignData.ad_type === 'gradient' && (
                        <div className="space-y-2">
                          <Label className="text-sm">🌈 Gradiente Sfondo</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {gradientOptions.map((gradient) => (
                              <button
                                key={gradient}
                                onClick={() => setCampaignData(prev => ({ ...prev, ad_gradient: gradient }))}
                                className={`h-10 rounded-lg bg-gradient-to-r ${gradient} transition-all ${
                                  campaignData.ad_gradient === gradient ? 'ring-2 ring-primary ring-offset-2' : ''
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {campaignData.ad_type === 'image' && (
                        <div className="space-y-2">
                          <Label className="text-sm">🖼️ Immagine Pubblicità</Label>
                          <p className="text-xs text-muted-foreground">Min: {MIN_IMAGE_WIDTH}x{MIN_IMAGE_HEIGHT}px (16:9). Max 5MB.</p>
                          <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleMediaUpload(e, 'image')} className="hidden" />
                          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full h-11">
                            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            {campaignData.ad_image_url ? '✅ Cambia immagine' : 'Carica immagine'}
                          </Button>
                        </div>
                      )}

                      {campaignData.ad_type === 'video' && (
                        <div className="space-y-2">
                          <Label className="text-sm">🎬 Video Pubblicità</Label>
                          <p className="text-xs text-muted-foreground">MP4, MOV, WEBM. Max 50MB. 🔇 Audio disattivato</p>
                          <input ref={videoInputRef} type="file" accept="video/*" onChange={(e) => handleMediaUpload(e, 'video')} className="hidden" />
                          <Button variant="outline" onClick={() => videoInputRef.current?.click()} disabled={uploading} className="w-full h-11">
                            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
                            {campaignData.ad_video_url ? '✅ Cambia video' : 'Carica video'}
                          </Button>
                        </div>
                      )}

                      {/* Advanced Features - Collapsible */}
                      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between h-11">
                            <span className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4" />
                              ✨ Funzionalità Avanzate
                            </span>
                            {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4 pt-3">
                          {/* Logo Upload */}
                          <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                            <Label className="text-sm flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              🏢 Logo Azienda
                            </Label>
                            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                            <div className="flex gap-2 items-center">
                              <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploading}>
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
                                {campaignData.company_logo_url ? 'Cambia' : 'Carica'}
                              </Button>
                              {campaignData.company_logo_url && (
                                <img src={campaignData.company_logo_url} alt="Logo" className="h-8 w-auto rounded" />
                              )}
                            </div>
                          </div>

                          {/* Countdown */}
                          <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm">⏰ Countdown Offerta</Label>
                              <Switch
                                checked={campaignData.countdown_enabled}
                                onCheckedChange={(checked) => setCampaignData(prev => ({ ...prev, countdown_enabled: checked }))}
                              />
                            </div>
                            {campaignData.countdown_enabled && (
                              <div className="space-y-2 pt-2">
                                <Input
                                  type="datetime-local"
                                  value={campaignData.countdown_end_date}
                                  onChange={(e) => setCampaignData(prev => ({ ...prev, countdown_end_date: e.target.value }))}
                                  className="h-10"
                                />
                                <Input
                                  value={campaignData.countdown_text}
                                  onChange={(e) => setCampaignData(prev => ({ ...prev, countdown_text: e.target.value }))}
                                  placeholder="Offerta valida ancora"
                                  className="h-10"
                                />
                              </div>
                            )}
                          </div>

                          {/* QR Code */}
                          <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm">📲 QR Code</Label>
                              <Switch
                                checked={campaignData.qr_enabled}
                                onCheckedChange={(checked) => setCampaignData(prev => ({ ...prev, qr_enabled: checked }))}
                              />
                            </div>
                            {campaignData.qr_enabled && (
                              <Input
                                type="url"
                                value={campaignData.qr_destination_url}
                                onChange={(e) => setCampaignData(prev => ({ ...prev, qr_destination_url: e.target.value }))}
                                placeholder="https://tuosito.it/offerta"
                                className="h-10 mt-2"
                              />
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>

                    {/* Desktop Preview */}
                    <div className="hidden lg:block space-y-2 sticky top-4">
                      <Label className="text-sm">📺 Anteprima Live</Label>
                      <AdPreview />
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                    <Button variant="outline" onClick={() => setStep(1)} className="h-11 order-2 sm:order-1">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                    </Button>
                    <Button onClick={() => setStep(3)} disabled={!campaignData.ad_title} className="h-11 order-1 sm:order-2">
                      Avanti <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Duration & Corner Selection */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="border-2">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <span className="text-2xl">📍</span>
                    Durata e Posizionamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Duration Packages */}
                  <div className="space-y-3">
                    <Label className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      ⏰ Scegli la Durata
                    </Label>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                      {durationPackages.map((pkg) => (
                        <button
                          key={pkg.id}
                          onClick={() => selectDurationPackage(pkg)}
                          className={`relative p-3 sm:p-4 rounded-xl border-2 text-center transition-all ${
                            campaignData.duration_package === pkg.id
                              ? 'border-primary bg-primary/10 shadow-lg'
                              : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          }`}
                        >
                          {pkg.badge && (
                            <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs font-bold rounded-full whitespace-nowrap ${
                              pkg.id === '1year' 
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' 
                                : 'bg-green-500 text-white'
                            }`}>
                              {pkg.badge}
                            </span>
                          )}
                          <span className="text-2xl block mb-1">{pkg.emoji}</span>
                          <p className="font-semibold text-sm sm:text-base">{pkg.label}</p>
                          <p className="text-xs text-muted-foreground">{pkg.days} giorni</p>
                          {campaignData.duration_package === pkg.id && (
                            <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                    
                    {/* Custom dates */}
                    <div className="pt-2">
                      <p className="text-sm text-muted-foreground mb-2">📆 Oppure date personalizzate:</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Inizio</Label>
                          <Input
                            type="date"
                            value={campaignData.start_date}
                            onChange={(e) => setCampaignData(prev => ({ ...prev, start_date: e.target.value, duration_package: null }))}
                            min={new Date().toISOString().split('T')[0]}
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Fine</Label>
                          <Input
                            type="date"
                            value={campaignData.end_date}
                            onChange={(e) => setCampaignData(prev => ({ ...prev, end_date: e.target.value, duration_package: null }))}
                            min={campaignData.start_date || new Date().toISOString().split('T')[0]}
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Corner Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Label className="text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        📍 Scegli i Corner ({campaignData.corner_ids.length})
                      </Label>
                      {campaignData.corner_ids.length > 0 && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          getVolumeDiscount(campaignData.corner_ids.length) > 0 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {getVolumeDiscount(campaignData.corner_ids.length) > 0 
                            ? `🎉 Sconto: -${getVolumeDiscount(campaignData.corner_ids.length)}%` 
                            : 'Aggiungi 3+ per sconti'}
                        </span>
                      )}
                    </div>
                    
                    {/* Volume discount tiers */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                      {[
                        { min: 3, discount: 10 },
                        { min: 5, discount: 15 },
                        { min: 10, discount: 25 },
                      ].map((tier) => (
                        <span 
                          key={tier.min}
                          className={`px-2 py-1 rounded whitespace-nowrap ${
                            campaignData.corner_ids.length >= tier.min 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {tier.min}+ corner: -{tier.discount}%
                        </span>
                      ))}
                    </div>

                    <CornerSelectionMap 
                      corners={corners}
                      selectedIds={campaignData.corner_ids}
                      onToggle={toggleCorner}
                    />

                    {/* Corner List - Horizontal scroll on mobile */}
                    <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-2 overflow-x-auto pb-2 sm:overflow-visible sm:max-h-48 sm:overflow-y-auto">
                      {corners.map((corner) => (
                        <button
                          key={corner.id}
                          onClick={() => toggleCorner(corner.id)}
                          className={`flex-shrink-0 w-48 sm:w-auto p-3 rounded-lg border text-left transition-all ${
                            campaignData.corner_ids.includes(corner.id)
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{corner.business_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{corner.address}</p>
                            </div>
                            {campaignData.corner_ids.includes(corner.id) && (
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCampaignData(prev => ({ ...prev, corner_ids: corners.map(c => c.id) }))}>
                        Seleziona Tutti
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCampaignData(prev => ({ ...prev, corner_ids: [] }))}>
                        Deseleziona
                      </Button>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                    <Button variant="outline" onClick={() => setStep(2)} className="h-11 order-2 sm:order-1">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                    </Button>
                    <Button 
                      onClick={() => setStep(4)} 
                      disabled={campaignData.corner_ids.length === 0 || !campaignData.start_date || !campaignData.end_date}
                      className="h-11 order-1 sm:order-2"
                    >
                      Avanti <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Summary & Payment */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="border-2">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <span className="text-2xl">💳</span>
                    Riepilogo e Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Summary */}
                    <div className="space-y-4">
                      <div className="p-4 bg-muted/50 rounded-xl space-y-2">
                        <h4 className="font-medium flex items-center gap-2">📋 Dettagli Campagna</h4>
                        <div className="text-sm space-y-1">
                          <p><span className="text-muted-foreground">Titolo:</span> {campaignData.ad_emoji} {campaignData.ad_title}</p>
                          <p><span className="text-muted-foreground">Tipo:</span> {campaignData.ad_type === 'gradient' ? '🎨 Gradiente' : campaignData.ad_type === 'image' ? '🖼️ Immagine' : '🎬 Video'}</p>
                          <p><span className="text-muted-foreground">Periodo:</span> {campaignData.start_date} → {campaignData.end_date}</p>
                          <p><span className="text-muted-foreground">Durata:</span> {weeks} settimane</p>
                          <p><span className="text-muted-foreground">Visualizzazione:</span> {campaignData.display_seconds}s</p>
                          <p><span className="text-muted-foreground">Corner:</span> {campaignData.corner_ids.length} 📍</p>
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          💰 Riepilogo Prezzi
                        </h4>
                        <div className="text-sm space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Prezzo base ({MIN_DISPLAY_SECONDS}s)</span>
                            <span>€{(basePrice - (displaySecondsExtra || 0)).toFixed(2)}</span>
                          </div>
                          
                          {displaySecondsExtra > 0 && (
                            <div className="flex justify-between text-amber-600">
                              <span className="flex items-center gap-1">⏱️ Extra {campaignData.display_seconds - MIN_DISPLAY_SECONDS}s</span>
                              <span>+€{displaySecondsExtra.toFixed(2)}</span>
                            </div>
                          )}
                          
                          {durationDiscount > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>🎉 Sconto durata ({durationDiscountPercent}%)</span>
                              <span>-€{durationDiscount.toFixed(2)}</span>
                            </div>
                          )}
                          
                          {volumeDiscount > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>🎉 Sconto volume ({volumeDiscountPercent}%)</span>
                              <span>-€{volumeDiscount.toFixed(2)}</span>
                            </div>
                          )}
                          
                          {totalDiscount > 0 && (
                            <div className="border-t pt-2 mt-2 flex justify-between font-medium text-green-600">
                              <span>💚 Risparmi</span>
                              <span>-€{totalDiscount.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                        <div className="flex items-center justify-between text-lg font-bold">
                          <span>💳 Totale</span>
                          <div className="text-right">
                            {totalDiscount > 0 && (
                              <span className="text-sm line-through text-muted-foreground mr-2">€{basePrice.toFixed(2)}</span>
                            )}
                            <span className="text-primary text-xl">€{total.toFixed(2)}</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          €{pricing.pricePerWeek}/corner/settimana × {campaignData.corner_ids.length} corner × {weeks} settimane
                        </p>
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="space-y-2">
                      <Label className="text-sm">📺 Anteprima Finale</Label>
                      <AdPreview />
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                    <Button variant="outline" onClick={() => setStep(3)} className="h-11 order-2 sm:order-1">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                    </Button>
                    <Button 
                      onClick={handleSubmit} 
                      disabled={submitting} 
                      className="h-12 text-base gap-2 order-1 sm:order-2 bg-gradient-to-r from-primary to-primary/80"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Elaborazione...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-5 w-5" />
                          💳 Paga €{total.toFixed(2)}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Dialog */}
      <AITextGeneratorDialog
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        onSelect={handleAISelect}
        companyName={campaignData.advertiser_company}
      />
    </div>
  );
}
