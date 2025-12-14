import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Megaphone, Building2, Mail, Phone, User, 
  Calendar, MapPin, Check, CreditCard, ArrowLeft,
  ArrowRight, Sparkles, Image, Palette, Type, Upload, Loader2,
  Tag, Percent, Clock, Video, Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
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
  // New styling options
  ad_font: string;
  ad_title_color: string;
  ad_description_color: string;
  ad_bg_color: string;
  ad_emoji: string;
}

interface DurationPackage {
  id: string;
  label: string;
  days: number;
  discount: number; // percentage discount
  badge?: string;
}

const durationPackages: DurationPackage[] = [
  { id: '7days', label: '1 Settimana', days: 7, discount: 0 },
  { id: '1month', label: '1 Mese', days: 30, discount: 10, badge: '-10%' },
  { id: '3months', label: '3 Mesi', days: 90, discount: 20, badge: '-20%' },
  { id: '1year', label: '1 Anno', days: 365, discount: 35, badge: 'Best Value -35%' },
];

// Volume discounts based on number of corners
const getVolumeDiscount = (cornerCount: number): number => {
  if (cornerCount >= 10) return 25;
  if (cornerCount >= 5) return 15;
  if (cornerCount >= 3) return 10;
  return 0;
};

// Display seconds pricing multiplier (base is 5 seconds = 1x)
const getDisplaySecondsMultiplier = (seconds: number): number => {
  // Each additional second above 5 adds 10% to the price
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

const iconOptions = ['Megaphone', 'Sparkles', 'Gift', 'Star', 'Heart', 'Zap'];

const fontOptions = [
  { id: 'sans', label: 'Sans', className: 'font-sans' },
  { id: 'serif', label: 'Serif', className: 'font-serif' },
  { id: 'mono', label: 'Mono', className: 'font-mono' },
];

const emojiOptions = ['', '🔥', '⭐', '💥', '🎁', '💰', '🛒', '📱', '✨', '🚀', '❤️', '👍', '🎉', '💎', '🏷️', '⚡'];

const colorPresets = [
  '#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', 
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // New styling options
    ad_font: 'sans',
    ad_title_color: '#ffffff',
    ad_description_color: '#ffffff',
    ad_bg_color: '',
    ad_emoji: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load corners
      const { data: cornersData } = await supabase
        .from('corners')
        .select('id, business_name, address, latitude, longitude')
        .eq('status', 'approved');
      
      setCorners(cornersData || []);

      // Load pricing settings
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
    
    // Base price without discounts (at 5 seconds)
    const basePriceAt5Sec = pricing.pricePerWeek * campaignData.corner_ids.length * weeks;
    
    // Apply display seconds multiplier
    const displaySecondsMultiplier = getDisplaySecondsMultiplier(campaignData.display_seconds);
    const basePrice = basePriceAt5Sec * displaySecondsMultiplier;
    const displaySecondsExtra = basePrice - basePriceAt5Sec;
    
    // Get duration discount
    const selectedPackage = durationPackages.find(p => p.id === campaignData.duration_package);
    const durationDiscountPercent = selectedPackage?.discount || 0;
    
    // Get volume discount
    const volumeDiscountPercent = getVolumeDiscount(campaignData.corner_ids.length);
    
    // Calculate discounts (they stack)
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
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Il file deve essere un\'immagine');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('L\'immagine non può superare 5MB');
        return;
      }

      // Validate image dimensions
      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      
      img.onload = async () => {
        URL.revokeObjectURL(img.src);
        
        if (img.width < MIN_IMAGE_WIDTH || img.height < MIN_IMAGE_HEIGHT) {
          toast.error(`L'immagine deve essere almeno ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT} pixel. La tua immagine è ${img.width}x${img.height}`);
          return;
        }

        await uploadFile(file, 'ad_image_url');
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        toast.error('Errore nel caricamento dell\'immagine');
      };
    } else {
      // Video validation
      if (!file.type.startsWith('video/')) {
        toast.error('Il file deve essere un video');
        return;
      }

      // Validate file size (max 50MB for video)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Il video non può superare 50MB');
        return;
      }

      await uploadFile(file, 'ad_video_url');
    }
  };

  const uploadFile = async (file: File, field: 'ad_image_url' | 'ad_video_url') => {
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
      toast.success(field === 'ad_image_url' ? 'Immagine caricata con successo' : 'Video caricato con successo');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Errore nel caricamento del file');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!campaignData.advertiser_name || !campaignData.advertiser_email || 
        !campaignData.ad_title || !campaignData.start_date || 
        !campaignData.end_date || campaignData.corner_ids.length === 0) {
      toast.error('Compila tutti i campi obbligatori');
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
      toast.error('Errore nella creazione del pagamento');
    } finally {
      setSubmitting(false);
    }
  };

  const { total, weeks, basePrice, durationDiscount, volumeDiscount, totalDiscount, durationDiscountPercent, volumeDiscountPercent, displaySecondsExtra } = calculatePrice();
  const videoInputRef = useRef<HTMLInputElement>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-2xl mb-4">
            <Megaphone className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Pubblicizza la tua Attività</h1>
          <p className="text-muted-foreground">
            Raggiungi clienti nei punti LabLinkRiparo della tua zona
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {step > s ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-12 h-1 mx-2 rounded ${step > s ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    I tuoi dati
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome e Cognome *</Label>
                      <Input
                        value={campaignData.advertiser_name}
                        onChange={(e) => setCampaignData(prev => ({ ...prev, advertiser_name: e.target.value }))}
                        placeholder="Mario Rossi"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Azienda</Label>
                      <Input
                        value={campaignData.advertiser_company}
                        onChange={(e) => setCampaignData(prev => ({ ...prev, advertiser_company: e.target.value }))}
                        placeholder="Nome azienda"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={campaignData.advertiser_email}
                        onChange={(e) => setCampaignData(prev => ({ ...prev, advertiser_email: e.target.value }))}
                        placeholder="email@esempio.it"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefono</Label>
                      <Input
                        value={campaignData.advertiser_phone}
                        onChange={(e) => setCampaignData(prev => ({ ...prev, advertiser_phone: e.target.value }))}
                        placeholder="+39 123 456 7890"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setStep(2)} disabled={!campaignData.advertiser_name || !campaignData.advertiser_email}>
                      Avanti <ArrowRight className="ml-2 h-4 w-4" />
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Crea la tua Pubblicità
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Ad Type */}
                  <div className="space-y-2">
                    <Label>Tipo di annuncio</Label>
                    <RadioGroup
                      value={campaignData.ad_type}
                      onValueChange={(value: 'gradient' | 'image' | 'video') => setCampaignData(prev => ({ ...prev, ad_type: value }))}
                      className="flex flex-wrap gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="gradient" id="gradient" />
                        <Label htmlFor="gradient" className="flex items-center gap-1 cursor-pointer">
                          <Palette className="h-4 w-4" /> Gradiente
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="image" id="image" />
                        <Label htmlFor="image" className="flex items-center gap-1 cursor-pointer">
                          <Image className="h-4 w-4" /> Immagine
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="video" id="video" />
                        <Label htmlFor="video" className="flex items-center gap-1 cursor-pointer">
                          <Video className="h-4 w-4" /> Video
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Display Seconds Selector */}
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Timer className="h-4 w-4" />
                        Durata visualizzazione
                      </Label>
                      <span className="text-lg font-bold text-primary">{campaignData.display_seconds} secondi</span>
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
                    {campaignData.display_seconds > MIN_DISPLAY_SECONDS && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        +{(campaignData.display_seconds - MIN_DISPLAY_SECONDS) * 10}% sul prezzo per {campaignData.display_seconds - MIN_DISPLAY_SECONDS} secondi extra
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Titolo *</Label>
                        <Input
                          value={campaignData.ad_title}
                          onChange={(e) => setCampaignData(prev => ({ ...prev, ad_title: e.target.value }))}
                          placeholder="Sconto 20% su tutti i prodotti!"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Descrizione</Label>
                        <Textarea
                          value={campaignData.ad_description}
                          onChange={(e) => setCampaignData(prev => ({ ...prev, ad_description: e.target.value }))}
                          placeholder="Approfitta della nostra offerta speciale..."
                          rows={3}
                        />
                      </div>

                      {/* Emoji Selector */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Emoji
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {emojiOptions.map((emoji) => (
                            <button
                              key={emoji || 'none'}
                              onClick={() => setCampaignData(prev => ({ ...prev, ad_emoji: emoji }))}
                              className={`w-10 h-10 text-xl rounded-lg border-2 transition-all flex items-center justify-center ${
                                campaignData.ad_emoji === emoji 
                                  ? 'border-primary bg-primary/10' 
                                  : 'border-muted hover:border-muted-foreground/50'
                              }`}
                            >
                              {emoji || '✕'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Font Selector */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Type className="h-4 w-4" />
                          Font
                        </Label>
                        <div className="flex gap-2">
                          {fontOptions.map((font) => (
                            <button
                              key={font.id}
                              onClick={() => setCampaignData(prev => ({ ...prev, ad_font: font.id }))}
                              className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all ${font.className} ${
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
                      <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                        <Label className="flex items-center gap-2 mb-2">
                          <Palette className="h-4 w-4" />
                          Colori Testo
                        </Label>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Titolo</Label>
                            <div className="flex gap-1.5 flex-wrap">
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
                          
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Descrizione</Label>
                            <div className="flex gap-1.5 flex-wrap">
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

                      {campaignData.ad_type === 'gradient' && (
                        <>
                          <div className="space-y-2">
                            <Label>Gradiente Sfondo</Label>
                            <div className="grid grid-cols-3 gap-2">
                              {gradientOptions.map((gradient) => (
                                <button
                                  key={gradient}
                                  onClick={() => setCampaignData(prev => ({ ...prev, ad_gradient: gradient }))}
                                  className={`h-12 rounded-lg bg-gradient-to-r ${gradient} transition-all ${
                                    campaignData.ad_gradient === gradient ? 'ring-2 ring-primary ring-offset-2' : ''
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {campaignData.ad_type === 'image' && (
                        <div className="space-y-3">
                          <Label>Immagine Pubblicità</Label>
                          <p className="text-xs text-muted-foreground">
                            Dimensione minima: {MIN_IMAGE_WIDTH}x{MIN_IMAGE_HEIGHT} pixel (16:9). Max 5MB.
                          </p>
                          
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleMediaUpload(e, 'image')}
                            className="hidden"
                          />
                          
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="w-full"
                          >
                            {uploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Caricamento...
                              </>
                            ) : (
                              <>
                                <Upload className="mr-2 h-4 w-4" />
                                {campaignData.ad_image_url ? 'Cambia immagine' : 'Carica immagine'}
                              </>
                            )}
                          </Button>
                          
                          {campaignData.ad_image_url && (
                            <p className="text-xs text-green-600 flex items-center gap-1">
                              <Check className="h-3 w-3" /> Immagine caricata
                            </p>
                          )}
                        </div>
                      )}

                      {campaignData.ad_type === 'video' && (
                        <div className="space-y-3">
                          <Label>Video Pubblicità</Label>
                          <p className="text-xs text-muted-foreground">
                            Formato: MP4, MOV, WEBM. Max 50MB. <span className="font-medium text-amber-600">L'audio verrà disattivato.</span>
                          </p>
                          
                          <input
                            ref={videoInputRef}
                            type="file"
                            accept="video/mp4,video/mov,video/webm,video/*"
                            onChange={(e) => handleMediaUpload(e, 'video')}
                            className="hidden"
                          />
                          
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => videoInputRef.current?.click()}
                            disabled={uploading}
                            className="w-full"
                          >
                            {uploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Caricamento...
                              </>
                            ) : (
                              <>
                                <Video className="mr-2 h-4 w-4" />
                                {campaignData.ad_video_url ? 'Cambia video' : 'Carica video'}
                              </>
                            )}
                          </Button>
                          
                          {campaignData.ad_video_url && (
                            <p className="text-xs text-green-600 flex items-center gap-1">
                              <Check className="h-3 w-3" /> Video caricato (riprodotto senza audio)
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Preview */}
                    <div className="space-y-2">
                      <Label>Anteprima</Label>
                      <div className="aspect-video rounded-xl overflow-hidden relative">
                        {campaignData.ad_type === 'video' && campaignData.ad_video_url ? (
                          <div className="relative w-full h-full">
                            <video 
                              src={campaignData.ad_video_url}
                              className="w-full h-full object-cover"
                              autoPlay
                              loop
                              muted
                              playsInline
                            />
                            {/* Text overlay on video */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-center p-6 pointer-events-none">
                              <div className={`text-center ${fontOptions.find(f => f.id === campaignData.ad_font)?.className || 'font-sans'}`}>
                                {campaignData.ad_emoji && (
                                  <span className="text-4xl mb-2 block">{campaignData.ad_emoji}</span>
                                )}
                                <h3 
                                  className="text-xl font-bold mb-1 drop-shadow-lg"
                                  style={{ color: campaignData.ad_title_color }}
                                >
                                  {campaignData.ad_title || 'Il tuo titolo'}
                                </h3>
                                {campaignData.ad_description && (
                                  <p 
                                    className="text-sm drop-shadow-md"
                                    style={{ color: campaignData.ad_description_color, opacity: 0.9 }}
                                  >
                                    {campaignData.ad_description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : campaignData.ad_type === 'image' && campaignData.ad_image_url ? (
                          <div className="relative w-full h-full">
                            <img 
                              src={campaignData.ad_image_url} 
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                            {/* Text overlay on image */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-center p-6">
                              <div className={`text-center ${fontOptions.find(f => f.id === campaignData.ad_font)?.className || 'font-sans'}`}>
                                {campaignData.ad_emoji && (
                                  <span className="text-4xl mb-2 block">{campaignData.ad_emoji}</span>
                                )}
                                <h3 
                                  className="text-xl font-bold mb-1 drop-shadow-lg"
                                  style={{ color: campaignData.ad_title_color }}
                                >
                                  {campaignData.ad_title || 'Il tuo titolo'}
                                </h3>
                                {campaignData.ad_description && (
                                  <p 
                                    className="text-sm drop-shadow-md"
                                    style={{ color: campaignData.ad_description_color, opacity: 0.9 }}
                                  >
                                    {campaignData.ad_description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${campaignData.ad_gradient} flex items-center justify-center p-4`}>
                            <div className={`text-center ${fontOptions.find(f => f.id === campaignData.ad_font)?.className || 'font-sans'}`}>
                              {campaignData.ad_emoji ? (
                                <span className="text-5xl mb-3 block">{campaignData.ad_emoji}</span>
                              ) : (
                                <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-80" style={{ color: campaignData.ad_title_color }} />
                              )}
                              <h3 
                                className="text-xl font-bold mb-2"
                                style={{ color: campaignData.ad_title_color }}
                              >
                                {campaignData.ad_title || 'Il tuo titolo'}
                              </h3>
                              {campaignData.ad_description && (
                                <p 
                                  className="text-sm"
                                  style={{ color: campaignData.ad_description_color, opacity: 0.8 }}
                                >
                                  {campaignData.ad_description}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                    </Button>
                    <Button onClick={() => setStep(3)} disabled={!campaignData.ad_title}>
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Durata e Posizionamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Duration Packages */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Scegli la Durata
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {durationPackages.map((pkg) => (
                        <button
                          key={pkg.id}
                          onClick={() => selectDurationPackage(pkg)}
                          className={`relative p-4 rounded-xl border-2 text-center transition-all ${
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
                          <p className="font-semibold text-lg">{pkg.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {pkg.days} giorni
                          </p>
                          {campaignData.duration_package === pkg.id && (
                            <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                    
                    {/* Custom dates option */}
                    <div className="pt-2">
                      <p className="text-sm text-muted-foreground mb-2">Oppure scegli date personalizzate:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Data Inizio</Label>
                          <Input
                            type="date"
                            value={campaignData.start_date}
                            onChange={(e) => setCampaignData(prev => ({ 
                              ...prev, 
                              start_date: e.target.value,
                              duration_package: null 
                            }))}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Data Fine</Label>
                          <Input
                            type="date"
                            value={campaignData.end_date}
                            onChange={(e) => setCampaignData(prev => ({ 
                              ...prev, 
                              end_date: e.target.value,
                              duration_package: null 
                            }))}
                            min={campaignData.start_date || new Date().toISOString().split('T')[0]}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Corner Selection with Volume Discount Info */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Scegli i Corner ({campaignData.corner_ids.length} selezionati)
                      </Label>
                      {campaignData.corner_ids.length > 0 && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          getVolumeDiscount(campaignData.corner_ids.length) > 0 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {getVolumeDiscount(campaignData.corner_ids.length) > 0 
                            ? `Sconto volume: -${getVolumeDiscount(campaignData.corner_ids.length)}%` 
                            : 'Aggiungi 3+ corner per sconti'}
                        </span>
                      )}
                    </div>
                    
                    {/* Volume discount tiers */}
                    <div className="flex gap-2 text-xs">
                      <span className={`px-2 py-1 rounded ${campaignData.corner_ids.length >= 3 ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                        3+ corner: -10%
                      </span>
                      <span className={`px-2 py-1 rounded ${campaignData.corner_ids.length >= 5 ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                        5+ corner: -15%
                      </span>
                      <span className={`px-2 py-1 rounded ${campaignData.corner_ids.length >= 10 ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                        10+ corner: -25%
                      </span>
                    </div>

                    {/* Interactive Map */}
                    <CornerSelectionMap 
                      corners={corners}
                      selectedIds={campaignData.corner_ids}
                      onToggle={toggleCorner}
                    />

                    {/* Corner List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                      {corners.map((corner) => (
                        <button
                          key={corner.id}
                          onClick={() => toggleCorner(corner.id)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            campaignData.corner_ids.includes(corner.id)
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-sm">{corner.business_name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{corner.address}</p>
                            </div>
                            {campaignData.corner_ids.includes(corner.id) && (
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Select All / Deselect All */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCampaignData(prev => ({ ...prev, corner_ids: corners.map(c => c.id) }))}
                      >
                        Seleziona Tutti
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCampaignData(prev => ({ ...prev, corner_ids: [] }))}
                      >
                        Deseleziona Tutti
                      </Button>
                    </div>
                  </div>

                  {corners.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nessun Corner disponibile al momento
                    </p>
                  )}

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                    </Button>
                    <Button 
                      onClick={() => setStep(4)} 
                      disabled={campaignData.corner_ids.length === 0 || !campaignData.start_date || !campaignData.end_date}
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Riepilogo e Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Summary */}
                    <div className="space-y-4">
                      <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                        <h4 className="font-medium">Dettagli Campagna</h4>
                        <div className="text-sm space-y-1">
                          <p><span className="text-muted-foreground">Titolo:</span> {campaignData.ad_title}</p>
                          <p><span className="text-muted-foreground">Tipo:</span> {campaignData.ad_type === 'gradient' ? 'Gradiente' : campaignData.ad_type === 'image' ? 'Immagine' : 'Video'}</p>
                          <p><span className="text-muted-foreground">Periodo:</span> {campaignData.start_date} → {campaignData.end_date}</p>
                          <p><span className="text-muted-foreground">Durata:</span> {weeks} settimane</p>
                          <p><span className="text-muted-foreground">Visualizzazione:</span> {campaignData.display_seconds} secondi</p>
                          <p><span className="text-muted-foreground">Corner:</span> {campaignData.corner_ids.length}</p>
                        </div>
                      </div>

                      {/* Pricing Breakdown */}
                      <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          Riepilogo Prezzi
                        </h4>
                        <div className="text-sm space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Prezzo base ({MIN_DISPLAY_SECONDS}s)</span>
                            <span>€{(basePrice - (displaySecondsExtra || 0)).toFixed(2)}</span>
                          </div>
                          
                          {displaySecondsExtra > 0 && (
                            <div className="flex justify-between text-amber-600">
                              <span className="flex items-center gap-1">
                                <Timer className="h-3 w-3" />
                                Extra {campaignData.display_seconds - MIN_DISPLAY_SECONDS}s (+{(campaignData.display_seconds - MIN_DISPLAY_SECONDS) * 10}%)
                              </span>
                              <span>+€{displaySecondsExtra.toFixed(2)}</span>
                            </div>
                          )}
                          
                          {durationDiscount > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span className="flex items-center gap-1">
                                <Percent className="h-3 w-3" />
                                Sconto durata ({durationDiscountPercent}%)
                              </span>
                              <span>-€{durationDiscount.toFixed(2)}</span>
                            </div>
                          )}
                          
                          {volumeDiscount > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span className="flex items-center gap-1">
                                <Percent className="h-3 w-3" />
                                Sconto volume ({volumeDiscountPercent}%)
                              </span>
                              <span>-€{volumeDiscount.toFixed(2)}</span>
                            </div>
                          )}
                          
                          {totalDiscount > 0 && (
                            <div className="border-t pt-2 mt-2 flex justify-between font-medium text-green-600">
                              <span>Risparmi</span>
                              <span>-€{totalDiscount.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                        <div className="flex items-center justify-between text-lg font-bold">
                          <span>Totale</span>
                          <div className="text-right">
                            {totalDiscount > 0 && (
                              <span className="text-sm line-through text-muted-foreground mr-2">
                                €{basePrice.toFixed(2)}
                              </span>
                            )}
                            <span className="text-primary">€{total.toFixed(2)}</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          €{pricing.pricePerWeek}/corner/settimana × {campaignData.corner_ids.length} corner × {weeks} settimane
                        </p>
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="space-y-2">
                      <Label>Anteprima Pubblicità</Label>
                      <div className="aspect-video rounded-xl overflow-hidden">
                        {campaignData.ad_type === 'image' && campaignData.ad_image_url ? (
                          <div className="relative w-full h-full">
                            <img 
                              src={campaignData.ad_image_url} 
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                            {/* Text overlay on image */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-center p-4">
                              <div className="text-center text-white">
                                <h3 className="text-lg font-bold drop-shadow-lg">{campaignData.ad_title}</h3>
                                {campaignData.ad_description && (
                                  <p className="text-sm opacity-90 mt-1 drop-shadow-md">{campaignData.ad_description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${campaignData.ad_gradient} flex items-center justify-center p-4`}>
                            <div className="text-center text-white">
                              <Megaphone className="h-10 w-10 mx-auto mb-2 opacity-80" />
                              <h3 className="text-lg font-bold">{campaignData.ad_title}</h3>
                              {campaignData.ad_description && (
                                <p className="text-sm opacity-80 mt-1">{campaignData.ad_description}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setStep(3)}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                      {submitting ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                          Elaborazione...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          Paga €{total.toFixed(2)}
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
    </div>
  );
}
