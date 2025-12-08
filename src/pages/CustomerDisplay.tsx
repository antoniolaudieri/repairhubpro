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
  Sparkles
} from "lucide-react";
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
    <div ref={containerRef} className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <FullscreenButton />
      
      {session && (
        <>
          {/* ============ CONFIRM DATA MODE ============ */}
          {mode === "confirm_data" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col p-3 sm:p-6 md:p-8"
            >
              {/* Header */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center mb-4 sm:mb-6"
              >
                <h1 className="text-xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  Conferma i Tuoi Dati
                </h1>
              </motion.div>
              
              {/* Content */}
              <div className="flex-1 flex flex-col gap-3 sm:gap-4 md:gap-6 min-h-0">
                {/* Customer & Device Info */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="p-3 sm:p-5 md:p-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-0 shadow-xl rounded-2xl">
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <div className="p-2.5 sm:p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                          <p className="text-[10px] sm:text-xs text-blue-600/80 font-medium">Cliente</p>
                        </div>
                        <p className="font-bold text-sm sm:text-lg text-slate-800 dark:text-white truncate">{session.customer.name}</p>
                      </div>
                      <div className="p-2.5 sm:p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <PhoneIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-600" />
                          <p className="text-[10px] sm:text-xs text-violet-600/80 font-medium">Telefono</p>
                        </div>
                        <p className="font-bold text-sm sm:text-lg text-slate-800 dark:text-white truncate">{session.customer.phone}</p>
                      </div>
                      <div className="p-2.5 sm:p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
                          <p className="text-[10px] sm:text-xs text-emerald-600/80 font-medium">Dispositivo</p>
                        </div>
                        <p className="font-bold text-sm sm:text-lg text-slate-800 dark:text-white truncate">{session.device.brand} {session.device.model}</p>
                      </div>
                      <div className="p-2.5 sm:p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
                          <p className="text-[10px] sm:text-xs text-amber-600/80 font-medium">Problema</p>
                        </div>
                        <p className="font-bold text-sm sm:text-base text-slate-800 dark:text-white line-clamp-2">{session.device.reported_issue}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Estimated Cost */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex-1 flex items-center justify-center"
                >
                  <Card className="w-full p-4 sm:p-8 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 border-0 shadow-2xl rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-xl translate-y-1/2 -translate-x-1/2" />
                    
                    <div className="text-center relative z-10">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Euro className="h-5 w-5 sm:h-6 sm:w-6 text-white/80" />
                        <p className="text-sm sm:text-lg text-white/80 font-medium">Preventivo Totale</p>
                      </div>
                      <p className="text-4xl sm:text-6xl md:text-7xl font-bold text-white drop-shadow-lg">
                        €{(session.estimatedCost + session.diagnosticFee).toFixed(2)}
                      </p>
                      <div className="mt-3 px-4 py-2 bg-white/20 rounded-full inline-block backdrop-blur-sm">
                        <p className="text-sm sm:text-base text-white font-medium">
                          Da pagare ora: €{session.amountDueNow.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Confirm Button */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    onClick={handleConfirmData}
                    disabled={dataConfirmed}
                    className={`w-full h-14 sm:h-16 md:h-20 text-lg sm:text-xl md:text-2xl font-bold rounded-2xl shadow-xl transition-all duration-300 ${
                      dataConfirmed 
                        ? "bg-emerald-500 hover:bg-emerald-500" 
                        : "bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:shadow-2xl hover:scale-[1.02]"
                    }`}
                  >
                    <CheckCircle2 className="mr-3 h-6 w-6 sm:h-7 sm:w-7" />
                    {dataConfirmed ? "Dati Confermati ✓" : "Conferma Dati"}
                  </Button>
                  
                  {dataConfirmed && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center gap-2"
                    >
                      <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
                      <p className="text-emerald-700 dark:text-emerald-400 font-medium">In attesa del prossimo passaggio...</p>
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
              className="h-full flex items-center justify-center p-4 sm:p-8"
            >
              <Card className="w-full max-w-lg p-6 sm:p-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-0 shadow-2xl rounded-3xl">
                <div className="space-y-6 sm:space-y-8">
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-5 shadow-xl"
                    >
                      <Lock className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                    </motion.div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">Password Dispositivo</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm sm:text-base">
                      Inserisci la password, PIN o pattern per sbloccare
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="password" className="text-base sm:text-lg font-medium">Password / PIN</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-14 sm:h-16 text-xl sm:text-2xl text-center pr-14 rounded-xl border-2 focus:border-blue-500"
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        La password verrà utilizzata solo per la diagnosi e sarà trattata in modo confidenziale.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 sm:gap-4">
                    <Button
                      onClick={handleSkipPassword}
                      variant="outline"
                      className="flex-1 h-12 sm:h-14 text-base sm:text-lg rounded-xl border-2"
                    >
                      Salta
                    </Button>
                    <Button
                      onClick={handleSubmitPassword}
                      disabled={isSubmitting || !password.trim()}
                      className="flex-1 h-12 sm:h-14 text-base sm:text-lg font-bold rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600"
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
              className="h-full flex flex-col p-3 sm:p-5"
            >
              {/* Amount to pay - Hero */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-3 sm:mb-4"
              >
                <Card className="p-3 sm:p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 border-0 shadow-xl rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                  <div className="flex items-center justify-center gap-3 relative z-10">
                    <Euro className="h-6 w-6 sm:h-8 sm:w-8 text-white/80" />
                    <span className="text-base sm:text-xl text-white/80 font-medium">Da pagare:</span>
                    <span className="text-3xl sm:text-5xl md:text-6xl font-bold text-white drop-shadow-lg">
                      €{session.amountDueNow.toFixed(2)}
                    </span>
                  </div>
                </Card>
              </motion.div>

              {/* Signature Area */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex-1 flex flex-col min-h-0 mb-3 sm:mb-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <FileSignature className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <span className="text-sm sm:text-lg font-bold text-slate-800 dark:text-white">
                      Firma qui sotto
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearSignature}
                    className="h-8 sm:h-9 px-3 text-xs sm:text-sm rounded-lg"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Cancella
                  </Button>
                </div>
                
                <Card className="flex-1 p-1 bg-white border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-2xl shadow-inner min-h-0 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20 pointer-events-none" />
                  <SignatureCanvas
                    ref={sigCanvas}
                    canvasProps={{
                      className: "w-full h-full rounded-xl cursor-crosshair relative z-10",
                      style: { touchAction: "none" }
                    }}
                    backgroundColor="white"
                    penColor="#1e40af"
                  />
                </Card>
              </motion.div>

              {/* Disclaimer + Button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-2 sm:space-y-3"
              >
                <div className="flex items-center gap-2 px-3 py-2 sm:py-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-400">
                    Esonero responsabilità dati • Dispositivi non ritirati entro 30gg diventano proprietà del laboratorio
                  </p>
                </div>

                <Button
                  onClick={handleSubmitSignature}
                  disabled={isSubmitting}
                  className="w-full h-14 sm:h-16 text-lg sm:text-xl font-bold rounded-2xl shadow-xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:shadow-2xl hover:scale-[1.01] transition-all duration-300"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-6 w-6" />
                      Firma e Conferma
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
