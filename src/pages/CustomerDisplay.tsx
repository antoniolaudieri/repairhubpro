import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  User, 
  Phone as PhoneIcon, 
  CheckCircle2, 
  FileSignature, 
  X, 
  Lock,
  Eye,
  EyeOff,
  Shield,
  Loader2,
  Wrench,
  Cpu,
  AlertTriangle,
  Maximize,
  Minimize,
  Euro,
  Sparkles,
  ClipboardCheck,
  Scale
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import SignatureCanvas from "react-signature-canvas";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DisplayMode = "standby" | "confirm_data" | "enter_password" | "signature" | "completed";

interface CustomerData {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

interface DeviceData {
  brand: string;
  model: string;
  device_type: string;
  reported_issue: string;
  imei?: string;
  serial_number?: string;
}

interface QuoteItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: 'part' | 'service' | 'labor';
}

interface IntakeSession {
  sessionId: string;
  mode: DisplayMode;
  customer: CustomerData;
  device: DeviceData;
  estimatedCost: number;
  diagnosticFee: number;
  amountDueNow: number;
  quoteItems?: QuoteItem[];
  laborCost?: number;
}

interface DisplayAd {
  id: string;
  title: string;
  description: string;
  gradient: string;
  icon: string;
  imageUrl?: string;
  type?: 'gradient' | 'image';
  imagePosition?: 'center' | 'top' | 'bottom';
  textAlign?: 'left' | 'center' | 'right';
  textPosition?: 'bottom' | 'center' | 'top';
  titleFont?: string;
  descriptionFont?: string;
}

const defaultAdvertisements: DisplayAd[] = [
  {
    id: "default-1",
    title: "Riparazione Express",
    description: "Riparazioni smartphone in meno di 1 ora",
    icon: "wrench",
    gradient: "from-blue-600 via-blue-500 to-cyan-400",
    type: "gradient",
    textAlign: "center",
    textPosition: "center"
  },
  {
    id: "default-2",
    title: "Garanzia 12 Mesi",
    description: "Su tutti i ricambi originali",
    icon: "shield",
    gradient: "from-emerald-600 via-green-500 to-teal-400",
    type: "gradient",
    textAlign: "center",
    textPosition: "center"
  },
  {
    id: "default-3",
    title: "Diagnosi Gratuita",
    description: "Per preventivi superiori a €100",
    icon: "cpu",
    gradient: "from-violet-600 via-purple-500 to-fuchsia-400",
    type: "gradient",
    textAlign: "center",
    textPosition: "center"
  },
  {
    id: "default-4",
    title: "Recupero Dati",
    description: "Servizio professionale di recupero dati",
    icon: "smartphone",
    gradient: "from-orange-600 via-red-500 to-rose-400",
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
  };
  return icons[iconName] || Smartphone;
};

export default function CustomerDisplay() {
  const { centroId } = useParams();
  const [mode, setMode] = useState<DisplayMode>("standby");
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataConfirmed, setDataConfirmed] = useState(false);
  const [advertisements, setAdvertisements] = useState<DisplayAd[]>(defaultAdvertisements);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [slideInterval, setSlideInterval] = useState(5000);
  const [centroLogo, setCentroLogo] = useState<string | null>(null);
  const [centroName, setCentroName] = useState<string>("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);
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

  useEffect(() => {
    if (!centroId) return;
    
    const fetchCentroData = async () => {
      const { data } = await supabase
        .from("centri_assistenza")
        .select("settings, logo_url, business_name")
        .eq("id", centroId)
        .single();
      
      if (data) {
        setCentroLogo(data.logo_url);
        setCentroName(data.business_name || "");
        
        if (data.settings) {
          const settings = data.settings as { 
            display_ads?: DisplayAd[]; 
            slide_interval?: number;
          };
          if (settings.display_ads && settings.display_ads.length > 0) {
            setAdvertisements(settings.display_ads);
          }
          if (settings.slide_interval) {
            setSlideInterval(settings.slide_interval);
          }
        }
      }
    };
    
    fetchCentroData();
  }, [centroId]);

  useEffect(() => {
    if (mode !== "standby") return;
    
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % advertisements.length);
    }, slideInterval);

    return () => clearInterval(interval);
  }, [mode, advertisements.length, slideInterval]);

  useEffect(() => {
    if (!centroId) return;

    const channel = supabase.channel(`display-${centroId}`);
    
    channel
      .on('broadcast', { event: 'intake_started' }, (payload) => {
        console.log('Intake started:', payload);
        setSession(payload.payload as IntakeSession);
        setMode("confirm_data");
        setDataConfirmed(false);
        setPassword("");
      })
      .on('broadcast', { event: 'intake_update' }, (payload) => {
        console.log('Intake update:', payload);
        setSession(prev => prev ? { ...prev, ...payload.payload } : null);
      })
      .on('broadcast', { event: 'request_password' }, () => {
        console.log('Password requested');
        setMode("enter_password");
      })
      .on('broadcast', { event: 'request_signature' }, () => {
        console.log('Signature requested');
        setMode("signature");
      })
      .on('broadcast', { event: 'intake_cancelled' }, () => {
        console.log('Intake cancelled');
        resetToStandby();
      })
      .on('broadcast', { event: 'intake_completed' }, () => {
        console.log('Intake completed');
        setMode("completed");
        setTimeout(() => resetToStandby(), 10000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [centroId]);

  const resetToStandby = () => {
    setMode("standby");
    setSession(null);
    setPassword("");
    setDataConfirmed(false);
    setPrivacyConsent(false);
    sigCanvas.current?.clear();
  };

  const handleConfirmData = async () => {
    if (!centroId || !session) return;
    
    setDataConfirmed(true);
    
    const channel = supabase.channel(`intake-${centroId}`);
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'customer_confirmed_data',
      payload: { sessionId: session.sessionId, confirmed: true }
    });
    supabase.removeChannel(channel);
    
    toast.success("Dati confermati!");
  };

  const handleSubmitPassword = async () => {
    if (!centroId || !session || !password.trim()) {
      toast.error("Inserisci la password del dispositivo");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const channel = supabase.channel(`intake-${centroId}`);
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'password_submitted',
        payload: { 
          sessionId: session.sessionId, 
          password: password 
        }
      });
      supabase.removeChannel(channel);
      
      toast.success("Password salvata!");
      setMode("signature");
    } catch (error) {
      console.error("Error submitting password:", error);
      toast.error("Errore durante l'invio");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipPassword = async () => {
    if (!centroId || !session) return;
    
    const channel = supabase.channel(`intake-${centroId}`);
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'password_skipped',
      payload: { sessionId: session.sessionId }
    });
    supabase.removeChannel(channel);
    
    setMode("signature");
  };

  const handleClearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSubmitSignature = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      toast.error("Per favore, firma prima di confermare");
      return;
    }

    if (!centroId || !session) return;

    setIsSubmitting(true);

    try {
      const signatureData = sigCanvas.current.toDataURL();
      
      const channel = supabase.channel(`intake-${centroId}`);
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'signature_submitted',
        payload: { 
          sessionId: session.sessionId, 
          signatureData 
        }
      });
      supabase.removeChannel(channel);
      
      setMode("completed");
      toast.success("Firma registrata con successo!");
    } catch (error) {
      console.error("Error submitting signature:", error);
      toast.error("Errore durante l'invio della firma");
    } finally {
      setIsSubmitting(false);
    }
  };

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
    
    return (
      <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6 overflow-hidden">
        <FullscreenButton />
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
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
            {isImageAd ? (
              <Card className="border-0 shadow-2xl overflow-hidden rounded-3xl">
                <div className="relative aspect-video">
                  <img 
                    src={currentAd.imageUrl} 
                    alt={currentAd.title}
                    className={`w-full h-full object-cover ${imagePositionClass}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <div className={`absolute inset-0 flex flex-col px-10 ${textAlignClass} ${textPositionClass}`}>
                    <motion.h1 
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className={`text-4xl md:text-6xl font-bold text-white drop-shadow-lg ${currentAd.titleFont || 'font-sans'}`}
                    >
                      {currentAd.title}
                    </motion.h1>
                    <motion.p 
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className={`text-xl md:text-2xl text-white/80 mt-3 ${currentAd.descriptionFont || 'font-sans'}`}
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
                
                <div className={`text-white space-y-8 flex flex-col ${textAlignClass} relative z-10`}>
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="w-28 h-28 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl border border-white/20"
                  >
                    {(() => {
                      const IconComponent = getIconComponent(currentAd.icon);
                      return <IconComponent className="h-14 w-14 text-white" />;
                    })()}
                  </motion.div>
                  <motion.h1 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className={`text-4xl md:text-6xl font-bold drop-shadow-lg ${currentAd.titleFont || 'font-sans'}`}
                  >
                    {currentAd.title}
                  </motion.h1>
                  <motion.p 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className={`text-xl md:text-2xl text-white/80 ${currentAd.descriptionFont || 'font-sans'}`}
                  >
                    {currentAd.description}
                  </motion.p>
                </div>
              </Card>
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
          className="fixed bottom-5 right-5 flex items-center gap-3 bg-white/5 backdrop-blur-xl rounded-2xl px-5 py-3 border border-white/10"
        >
          {centroLogo && (
            <img 
              src={centroLogo} 
              alt={centroName} 
              className="h-10 w-10 object-contain rounded-lg"
            />
          )}
          <div className="text-white text-right">
            {centroName && <p className="text-sm font-medium">{centroName}</p>}
            <p className="text-xs text-white/50">Powered by RepairHubPro</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============ COMPLETED MODE ============
  if (mode === "completed") {
    return (
      <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-emerald-950 via-green-900 to-teal-950 flex items-center justify-center p-8 overflow-hidden">
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
              Il tuo dispositivo è stato registrato correttamente
            </p>
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-2 text-white/60"
          >
            <Sparkles className="h-5 w-5" />
            <p className="text-lg">Riceverai aggiornamenti sullo stato della riparazione</p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ============ ACTIVE SESSION MODES ============
  return (
    <div ref={containerRef} className="h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <FullscreenButton />
      
      {session && (
        <>
          {/* ============ CONFIRM DATA MODE ============ */}
          {mode === "confirm_data" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col p-4 sm:p-6 md:p-8 relative overflow-hidden"
            >
              {/* Animated background effects */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-gradient-to-tl from-violet-500/20 to-transparent rounded-full blur-3xl" />
                <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl" />
              </div>

              {/* Header */}
              <motion.div
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center mb-4 sm:mb-6 relative z-10"
              >
                <div className="inline-flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 mb-3">
                  <ClipboardCheck className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
                  <span className="text-sm sm:text-base text-white/70 font-medium">Verifica i tuoi dati</span>
                </div>
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                  Conferma i Tuoi Dati
                </h1>
              </motion.div>
              
              {/* Content */}
              <div className="flex-1 flex flex-col gap-4 sm:gap-5 md:gap-6 min-h-0 relative z-10">
                {/* Customer & Device Info */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="p-4 sm:p-6 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.15 }}
                        className="p-3 sm:p-5 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-2xl border border-blue-500/20"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/30 flex items-center justify-center">
                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                          </div>
                          <p className="text-xs sm:text-sm text-blue-400/80 font-medium">Cliente</p>
                        </div>
                        <p className="font-bold text-base sm:text-xl text-white truncate">{session.customer.name}</p>
                      </motion.div>
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="p-3 sm:p-5 bg-gradient-to-br from-violet-500/20 to-violet-600/10 rounded-2xl border border-violet-500/20"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-violet-500/30 flex items-center justify-center">
                            <PhoneIcon className="h-4 w-4 sm:h-5 sm:w-5 text-violet-400" />
                          </div>
                          <p className="text-xs sm:text-sm text-violet-400/80 font-medium">Telefono</p>
                        </div>
                        <p className="font-bold text-base sm:text-xl text-white truncate">{session.customer.phone}</p>
                      </motion.div>
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.25 }}
                        className="p-3 sm:p-5 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl border border-emerald-500/20"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/30 flex items-center justify-center">
                            <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                          </div>
                          <p className="text-xs sm:text-sm text-emerald-400/80 font-medium">Dispositivo</p>
                        </div>
                        <p className="font-bold text-base sm:text-xl text-white truncate">{session.device.brand} {session.device.model}</p>
                      </motion.div>
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="p-3 sm:p-5 bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-2xl border border-amber-500/20"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/30 flex items-center justify-center">
                            <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
                          </div>
                          <p className="text-xs sm:text-sm text-amber-400/80 font-medium">Problema</p>
                        </div>
                        <p className="font-bold text-sm sm:text-lg text-white line-clamp-2">{session.device.reported_issue}</p>
                      </motion.div>
                    </div>
                  </Card>
                </motion.div>

                {/* Estimated Cost - Premium */}
                <motion.div
                  initial={{ y: 30, opacity: 0, scale: 0.95 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="flex-1 flex items-center justify-center"
                >
                  <div className="w-full relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 rounded-3xl blur-2xl opacity-40" />
                    <Card className="w-full p-5 sm:p-8 md:p-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 border-0 shadow-2xl rounded-3xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                      <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-white/5 rounded-full" />
                      
                      <div className="text-center relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-4">
                          <Euro className="h-5 w-5 sm:h-6 sm:w-6 text-white/90" />
                          <p className="text-sm sm:text-lg text-white/90 font-semibold">Preventivo Totale</p>
                        </div>
                        <motion.p 
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.4, type: "spring" }}
                          className="text-5xl sm:text-7xl md:text-8xl font-black text-white drop-shadow-2xl tracking-tight"
                        >
                          €{(session.estimatedCost + session.diagnosticFee).toFixed(2)}
                        </motion.p>
                        <motion.div 
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          className="mt-4 sm:mt-6 px-5 py-3 bg-white/20 rounded-2xl inline-block backdrop-blur-sm border border-white/20"
                        >
                          <p className="text-base sm:text-lg md:text-xl text-white font-bold">
                            💰 Da pagare ora: €{session.amountDueNow.toFixed(2)}
                          </p>
                        </motion.div>
                      </div>
                    </Card>
                  </div>
                </motion.div>

                {/* Confirm Button */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35 }}
                >
                  <motion.div
                    whileHover={{ scale: dataConfirmed ? 1 : 1.02 }}
                    whileTap={{ scale: dataConfirmed ? 1 : 0.98 }}
                  >
                    <Button
                      onClick={handleConfirmData}
                      disabled={dataConfirmed}
                      className={`w-full h-16 sm:h-20 text-xl sm:text-2xl font-bold rounded-2xl shadow-2xl transition-all duration-300 relative overflow-hidden ${
                        dataConfirmed 
                          ? "bg-emerald-600 hover:bg-emerald-600" 
                          : "bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500"
                      }`}
                    >
                      {!dataConfirmed && (
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      )}
                      <CheckCircle2 className="mr-3 h-7 w-7 sm:h-8 sm:w-8" />
                      {dataConfirmed ? "✓ Dati Confermati" : "Conferma Dati"}
                    </Button>
                  </motion.div>
                  
                  {dataConfirmed && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 bg-emerald-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center gap-3 border border-emerald-500/30"
                    >
                      <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" />
                      <p className="text-emerald-300 font-semibold text-base sm:text-lg">In attesa del prossimo passaggio...</p>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ============ PASSWORD MODE ============ */}
          {mode === "enter_password" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden"
            >
              {/* Background effects */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-indigo-500/20 to-transparent rounded-full blur-3xl" />
              </div>

              <Card className="w-full max-w-lg p-6 sm:p-10 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl relative z-10">
                <div className="space-y-6 sm:space-y-8">
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-5 shadow-2xl shadow-blue-500/30"
                    >
                      <Lock className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                    </motion.div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">Password Dispositivo</h2>
                    <p className="text-white/60 mt-2 text-sm sm:text-base">
                      Inserisci la password, PIN o pattern per sbloccare
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="password" className="text-base sm:text-lg font-medium text-white/80">Password / PIN</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-14 sm:h-16 text-xl sm:text-2xl text-center pr-14 rounded-xl border-2 border-white/20 bg-white/10 text-white placeholder:text-white/30 focus:border-blue-500"
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white hover:bg-white/10"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-500/10 backdrop-blur-sm rounded-xl border border-amber-500/30">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-200/80">
                        La password verrà utilizzata solo per la diagnosi e sarà trattata in modo confidenziale.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 sm:gap-4">
                    <Button
                      onClick={handleSkipPassword}
                      variant="outline"
                      className="flex-1 h-12 sm:h-14 text-base sm:text-lg rounded-xl border-2 border-white/20 bg-white/5 text-white hover:bg-white/10"
                    >
                      Salta
                    </Button>
                    <Button
                      onClick={handleSubmitPassword}
                      disabled={isSubmitting || !password.trim()}
                      className="flex-1 h-12 sm:h-14 text-base sm:text-lg font-bold rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500"
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                      )}
                      Conferma
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* ============ SIGNATURE MODE ============ */}
          {mode === "signature" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col p-4 sm:p-6 md:p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden"
            >
              {/* Animated background effects */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-tl from-violet-500/20 to-transparent rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-emerald-500/5 to-transparent rounded-full" />
              </div>

              {/* Amount to pay - Premium Hero */}
              <motion.div
                initial={{ y: -30, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 100 }}
                className="mb-4 sm:mb-6 relative z-10"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl blur-xl opacity-50" />
                  <Card className="p-4 sm:p-6 md:p-8 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 border-0 shadow-2xl rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 relative z-10">
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30"
                      >
                        <Euro className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                      </motion.div>
                      <div className="text-center sm:text-left">
                        <p className="text-sm sm:text-lg text-white/80 font-medium mb-1">Importo da pagare ora</p>
                        <motion.p 
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.3, type: "spring" }}
                          className="text-4xl sm:text-5xl md:text-7xl font-black text-white drop-shadow-2xl tracking-tight"
                        >
                          €{session.amountDueNow.toFixed(2)}
                        </motion.p>
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>

              {/* Signature Area - Premium Glass Card */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="flex-1 flex flex-col min-h-0 mb-4 relative z-10"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30"
                    >
                      <FileSignature className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </motion.div>
                    <div>
                      <span className="text-lg sm:text-xl font-bold text-white block">
                        Firma qui sotto
                      </span>
                      <span className="text-xs sm:text-sm text-white/60">
                        Usa il dito o una penna touch
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearSignature}
                    className="h-10 px-4 text-sm rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancella
                  </Button>
                </div>
                
                <Card className="flex-1 p-2 bg-white/95 backdrop-blur-xl border-2 border-white/50 rounded-3xl shadow-2xl shadow-black/20 min-h-0 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/80 pointer-events-none" />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-slate-300 text-sm font-medium pointer-events-none z-0">
                    ✍️ Firma qui
                  </div>
                  <SignatureCanvas
                    ref={sigCanvas}
                    canvasProps={{
                      className: "w-full h-full rounded-2xl cursor-crosshair relative z-10",
                      style: { touchAction: "none" }
                    }}
                    backgroundColor="rgba(255,255,255,0)"
                    penColor="#1e3a8a"
                    minWidth={2}
                    maxWidth={4}
                  />
                </Card>
              </motion.div>

              {/* Privacy Consent + Disclaimer + Button - Premium */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="space-y-3 sm:space-y-4 relative z-10"
              >
                {/* Privacy Info */}
                <div className="px-4 py-3 bg-blue-500/10 backdrop-blur-sm rounded-2xl border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="h-4 w-4 text-blue-400" />
                    <span className="text-xs sm:text-sm font-semibold text-blue-200">Informativa Privacy (GDPR)</span>
                  </div>
                  <p className="text-xs text-blue-200/80 leading-relaxed">
                    I tuoi dati saranno trattati per la gestione della riparazione (Art. 13 GDPR). 
                    Hai diritto di accesso, rettifica e cancellazione.
                  </p>
                </div>

                {/* Privacy Checkbox */}
                <div className={`flex items-center gap-3 px-4 py-3 backdrop-blur-sm rounded-2xl border transition-colors ${
                  privacyConsent 
                    ? "bg-green-500/10 border-green-500/30" 
                    : "bg-white/10 border-white/20"
                }`}>
                  <Checkbox 
                    id="privacy-consent-display"
                    checked={privacyConsent}
                    onCheckedChange={(checked) => setPrivacyConsent(checked === true)}
                    className="h-6 w-6 border-2 border-white/50 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                  <Label htmlFor="privacy-consent-display" className="text-sm text-white/90 cursor-pointer leading-relaxed">
                    Accetto l'informativa privacy e il trattamento dei dati <span className="text-red-400">*</span>
                  </Label>
                </div>

                {/* Disclaimer */}
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 backdrop-blur-sm rounded-2xl border border-amber-500/30">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  </div>
                  <p className="text-xs sm:text-sm text-amber-200/90 leading-relaxed">
                    Firmando accetti i termini del servizio, l'esonero responsabilità per i dati e la clausola di decadenza per dispositivi non ritirati entro 30 giorni.
                  </p>
                </div>

                <motion.div
                  whileHover={{ scale: privacyConsent ? 1.02 : 1 }}
                  whileTap={{ scale: privacyConsent ? 0.98 : 1 }}
                >
                  <Button
                    onClick={handleSubmitSignature}
                    disabled={isSubmitting || !privacyConsent}
                    className="w-full h-16 sm:h-20 text-xl sm:text-2xl font-bold rounded-2xl shadow-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-400 hover:via-green-400 hover:to-teal-400 border-0 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    {isSubmitting ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="mr-3 h-7 w-7 sm:h-8 sm:w-8" />
                        Firma e Conferma
                        <Sparkles className="ml-3 h-5 w-5 sm:h-6 sm:w-6 opacity-70" />
                      </>
                    )}
                  </Button>
                  {!privacyConsent && (
                    <p className="text-xs text-center text-red-400 mt-2">
                      Devi accettare l'informativa privacy per procedere
                    </p>
                  )}
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
