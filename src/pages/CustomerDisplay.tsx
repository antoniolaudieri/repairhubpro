import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  User, 
  Phone as PhoneIcon, 
  Mail, 
  MapPin,
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
  Minimize
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

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

// Default advertisements for standby mode
const defaultAdvertisements: DisplayAd[] = [
  {
    id: "default-1",
    title: "Riparazione Express",
    description: "Riparazioni smartphone in meno di 1 ora",
    icon: "wrench",
    gradient: "from-blue-500 to-cyan-500",
    type: "gradient",
    textAlign: "center",
    textPosition: "center"
  },
  {
    id: "default-2",
    title: "Garanzia 12 Mesi",
    description: "Su tutti i ricambi originali",
    icon: "shield",
    gradient: "from-green-500 to-emerald-500",
    type: "gradient",
    textAlign: "center",
    textPosition: "center"
  },
  {
    id: "default-3",
    title: "Diagnosi Gratuita",
    description: "Per preventivi superiori a €100",
    icon: "cpu",
    gradient: "from-purple-500 to-pink-500",
    type: "gradient",
    textAlign: "center",
    textPosition: "center"
  },
  {
    id: "default-4",
    title: "Recupero Dati",
    description: "Servizio professionale di recupero dati",
    icon: "smartphone",
    gradient: "from-orange-500 to-red-500",
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

  // Fullscreen toggle
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

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  // Fetch custom ads and centro info from settings
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
            console.log('Loading ads from settings:', settings.display_ads);
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

  // Rotate ads in standby mode
  useEffect(() => {
    if (mode !== "standby") return;
    
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % advertisements.length);
    }, slideInterval);

    return () => clearInterval(interval);
  }, [mode, advertisements.length, slideInterval]);

  // Listen for intake sessions via Supabase Realtime
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
        // Only go back to standby after completion, with longer delay
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
    
    // Notify the main intake that customer confirmed data
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
      
      // Don't auto-return to standby - wait for intake_completed event from main app
    } catch (error) {
      console.error("Error submitting signature:", error);
      toast.error("Errore durante l'invio della firma");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fullscreen button component
  const FullscreenButton = () => (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleFullscreen}
      className="fixed top-4 right-4 z-50 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm"
    >
      {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
    </Button>
  );

  // Standby mode with rotating ads
  if (mode === "standby") {
    const currentAd = advertisements[currentAdIndex];
    const isImageAd = currentAd.type === 'image' && currentAd.imageUrl;
    
    // Dynamic positioning classes
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
      bottom: 'justify-end pb-8',
      center: 'justify-center',
      top: 'justify-start pt-8'
    }[currentAd.textPosition || 'bottom'];
    
    return (
      <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
        <FullscreenButton />
        <AnimatePresence mode="wait">
          <motion.div
            key={currentAdIndex}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl w-full"
          >
            {isImageAd ? (
              <Card className="border-0 shadow-2xl overflow-hidden">
                <div className="relative aspect-video">
                  <img 
                    src={currentAd.imageUrl} 
                    alt={currentAd.title}
                    className={`w-full h-full object-cover ${imagePositionClass}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className={`absolute inset-0 flex flex-col px-8 ${textAlignClass} ${textPositionClass}`}>
                    <motion.h1 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className={`text-4xl md:text-5xl font-bold text-white ${currentAd.titleFont || 'font-sans'}`}
                    >
                      {currentAd.title}
                    </motion.h1>
                    <motion.p 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className={`text-xl md:text-2xl text-white/80 mt-2 ${currentAd.descriptionFont || 'font-sans'}`}
                    >
                      {currentAd.description}
                    </motion.p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className={`p-12 bg-gradient-to-br ${currentAd.gradient} border-0 shadow-2xl`}>
                <div className={`text-white space-y-6 flex flex-col ${textAlignClass}`}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center"
                  >
                    {(() => {
                      const IconComponent = getIconComponent(currentAd.icon);
                      return <IconComponent className="h-12 w-12 text-white" />;
                    })()}
                  </motion.div>
                  <h1 className={`text-4xl md:text-5xl font-bold ${currentAd.titleFont || 'font-sans'}`}>
                    {currentAd.title}
                  </h1>
                  <p className={`text-xl md:text-2xl text-white/80 ${currentAd.descriptionFont || 'font-sans'}`}>
                    {currentAd.description}
                  </p>
                </div>
              </Card>
            )}
            
            {/* Ad indicators */}
            <div className="flex justify-center gap-2 mt-8">
              {advertisements.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-3 h-3 rounded-full transition-all ${
                    idx === currentAdIndex ? "bg-white scale-125" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
        
        {/* Logo and branding in bottom right */}
        <div className="fixed bottom-4 right-4 flex items-center gap-3 bg-black/30 backdrop-blur-sm rounded-lg px-4 py-2">
          {centroLogo && (
            <img 
              src={centroLogo} 
              alt={centroName} 
              className="h-10 w-10 object-contain rounded"
            />
          )}
          <div className="text-white text-right">
            {centroName && <p className="text-sm font-medium">{centroName}</p>}
            <p className="text-xs text-white/60">Powered by RepairHubPro</p>
          </div>
        </div>
      </div>
    );
  }

  // Completed mode
  if (mode === "completed") {
    return (
      <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 flex items-center justify-center p-8">
        <FullscreenButton />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center text-white space-y-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-32 h-32 mx-auto rounded-full bg-white flex items-center justify-center"
          >
            <CheckCircle2 className="h-20 w-20 text-green-600" />
          </motion.div>
          <h1 className="text-5xl font-bold">Grazie!</h1>
          <p className="text-2xl text-white/80">
            Il tuo dispositivo è stato registrato correttamente
          </p>
          <p className="text-lg text-white/60">
            Riceverai aggiornamenti sullo stato della riparazione
          </p>
        </motion.div>
      </div>
    );
  }

  // Active session modes (confirm_data, enter_password, signature)
  return (
    <div ref={containerRef} className="h-screen overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5 p-2 sm:p-4 md:p-8">
      <FullscreenButton />
      <div className="max-w-4xl mx-auto space-y-2 sm:space-y-4 md:space-y-6">
        {/* Header - hidden on very small screens, compact otherwise */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center hidden sm:block"
        >
          <h1 className="text-lg sm:text-xl md:text-3xl font-bold text-foreground">
            {mode === "confirm_data" && "Conferma i Tuoi Dati"}
            {mode === "enter_password" && "Inserisci Password"}
            {mode === "signature" && "Firma per Accettazione"}
          </h1>
        </motion.div>

        {session && (
          <>
            {/* Data Confirmation Mode */}
            {mode === "confirm_data" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2 sm:space-y-3 md:space-y-6"
              >
                {/* Combined Customer & Device Info for small screens */}
                <Card className="p-2 sm:p-3 md:p-6 border-2 border-primary/20">
                  <div className="grid grid-cols-2 gap-1 sm:gap-2 md:gap-4 text-xs sm:text-sm">
                    <div className="p-1.5 sm:p-2 md:p-4 bg-muted/50 rounded">
                      <p className="text-[8px] sm:text-[10px] md:text-xs text-muted-foreground">Cliente</p>
                      <p className="font-semibold truncate">{session.customer.name}</p>
                    </div>
                    <div className="p-1.5 sm:p-2 md:p-4 bg-muted/50 rounded">
                      <p className="text-[8px] sm:text-[10px] md:text-xs text-muted-foreground">Telefono</p>
                      <p className="font-semibold truncate">{session.customer.phone}</p>
                    </div>
                    <div className="p-1.5 sm:p-2 md:p-4 bg-muted/50 rounded">
                      <p className="text-[8px] sm:text-[10px] md:text-xs text-muted-foreground">Dispositivo</p>
                      <p className="font-semibold truncate">{session.device.brand} {session.device.model}</p>
                    </div>
                    <div className="p-1.5 sm:p-2 md:p-4 bg-muted/50 rounded">
                      <p className="text-[8px] sm:text-[10px] md:text-xs text-muted-foreground">Tipo</p>
                      <p className="font-semibold capitalize truncate">{session.device.device_type}</p>
                    </div>
                    <div className="col-span-2 p-1.5 sm:p-2 md:p-4 bg-amber-500/10 border border-amber-500/30 rounded">
                      <p className="text-[8px] sm:text-[10px] md:text-xs text-amber-600">Problema</p>
                      <p className="font-semibold text-amber-700 line-clamp-2">{session.device.reported_issue}</p>
                    </div>
                  </div>
                </Card>

                {/* Estimated Cost - Compact */}
                <Card className="p-2 sm:p-3 md:p-6 border-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5">
                  <div className="flex items-center justify-between sm:flex-col sm:text-center gap-1">
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Preventivo</p>
                    <p className="text-xl sm:text-3xl md:text-5xl font-bold text-primary">
                      €{(session.estimatedCost + session.diagnosticFee).toFixed(2)}
                    </p>
                    <p className="text-[8px] sm:text-[10px] md:text-xs text-muted-foreground">
                      Ora: €{session.amountDueNow.toFixed(2)}
                    </p>
                  </div>
                </Card>

                {/* Confirm Button */}
                <Button
                  onClick={handleConfirmData}
                  disabled={dataConfirmed}
                  className="w-full h-10 sm:h-12 md:h-16 text-sm sm:text-base md:text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  {dataConfirmed ? "Confermato ✓" : "Conferma Dati"}
                </Button>

                {dataConfirmed && (
                  <Alert className="border-green-500/30 bg-green-500/10 py-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700 text-xs sm:text-sm">
                      In attesa...
                    </AlertDescription>
                  </Alert>
                )}
              </motion.div>
            )}

            {/* Password Entry Mode */}
            {mode === "enter_password" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Card className="p-8 border-2 border-primary/30">
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <Lock className="h-10 w-10 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bold">Password Dispositivo</h2>
                      <p className="text-muted-foreground mt-2">
                        Inserisci la password, PIN o pattern per sbloccare il dispositivo
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="password" className="text-lg">Password / PIN</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Inserisci qui la password..."
                          className="h-16 text-2xl text-center pr-14"
                          autoComplete="off"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-6 w-6" />
                          ) : (
                            <Eye className="h-6 w-6" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <Alert className="border-amber-500/30 bg-amber-500/10">
                      <Shield className="h-5 w-5 text-amber-600" />
                      <AlertDescription className="text-amber-700">
                        La password verrà utilizzata solo per la diagnosi e sarà trattata in modo confidenziale.
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-4 pt-4">
                      <Button
                        onClick={handleSkipPassword}
                        variant="outline"
                        className="flex-1 h-14 text-lg"
                      >
                        Salta
                      </Button>
                      <Button
                        onClick={handleSubmitPassword}
                        disabled={isSubmitting || !password.trim()}
                        className="flex-1 h-14 text-lg font-bold bg-primary hover:bg-primary/90"
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

            {/* Signature Mode - Ultra compact for small screens */}
            {mode === "signature" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1.5 sm:space-y-3 md:space-y-6"
              >
                {/* Quote Details - very compact */}
                {session.quoteItems && session.quoteItems.length > 0 && (
                  <Card className="p-1.5 sm:p-3 md:p-6 border border-accent/20">
                    <div className="space-y-1 max-h-16 sm:max-h-24 md:max-h-48 overflow-y-auto text-[10px] sm:text-xs md:text-sm">
                      {session.quoteItems.slice(0, 3).map((item, index) => (
                        <div key={index} className="flex justify-between items-center px-1.5 py-1 bg-muted/50 rounded">
                          <span className="truncate flex-1">{item.name}</span>
                          <span className="font-semibold ml-1">€{item.total.toFixed(0)}</span>
                        </div>
                      ))}
                      {session.quoteItems.length > 3 && (
                        <p className="text-center text-muted-foreground">+{session.quoteItems.length - 3} altri...</p>
                      )}
                    </div>
                    <div className="flex justify-between font-bold text-primary pt-1 mt-1 border-t text-xs sm:text-base md:text-xl">
                      <span>Totale</span>
                      <span>€{(session.estimatedCost + session.diagnosticFee).toFixed(2)}</span>
                    </div>
                  </Card>
                )}

                {/* Amount to pay - inline on small screens */}
                <div className="flex items-center justify-between p-2 sm:p-3 md:p-6 rounded-lg border-2 border-primary bg-primary/5">
                  <span className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Da pagare ora</span>
                  <span className="text-lg sm:text-2xl md:text-5xl font-bold text-primary">€{session.amountDueNow.toFixed(2)}</span>
                </div>

                {/* Disclaimer - single line on small screens */}
                <div className="flex items-center gap-1 p-1.5 sm:p-2 md:p-4 rounded bg-amber-500/5 border border-amber-500/30 text-[8px] sm:text-[10px] md:text-sm text-muted-foreground">
                  <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500 shrink-0" />
                  <span>Esonero responsabilità dati • <span className="text-rose-600">30gg non ritiro = proprietà lab</span></span>
                </div>

                {/* Signature Canvas - shorter on small screens */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm md:text-lg font-semibold flex items-center gap-1">
                      <FileSignature className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary" />
                      Firma qui
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSignature}
                      className="h-6 sm:h-8 px-1 sm:px-2 text-[10px] sm:text-xs"
                    >
                      <X className="h-3 w-3 mr-0.5" />
                      Cancella
                    </Button>
                  </div>

                  <Card className="p-0.5 sm:p-1 bg-white border-2 border-dashed border-primary/40">
                    <SignatureCanvas
                      ref={sigCanvas}
                      canvasProps={{
                        className: "w-full h-20 sm:h-32 md:h-56 rounded cursor-crosshair",
                        style: { touchAction: "none" }
                      }}
                      backgroundColor="white"
                      penColor="#000000"
                    />
                  </Card>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmitSignature}
                  disabled={isSubmitting}
                  className="w-full h-10 sm:h-12 md:h-16 text-sm sm:text-base md:text-xl font-bold bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      Conferma
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}