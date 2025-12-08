import { useState, useEffect, useRef } from "react";
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
  AlertTriangle
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

// Default advertisements for standby mode
const defaultAdvertisements = [
  {
    id: "default-1",
    title: "Riparazione Express",
    description: "Riparazioni smartphone in meno di 1 ora",
    icon: "wrench",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    id: "default-2",
    title: "Garanzia 12 Mesi",
    description: "Su tutti i ricambi originali",
    icon: "shield",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    id: "default-3",
    title: "Diagnosi Gratuita",
    description: "Per preventivi superiori a €100",
    icon: "cpu",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    id: "default-4",
    title: "Recupero Dati",
    description: "Servizio professionale di recupero dati",
    icon: "smartphone",
    gradient: "from-orange-500 to-red-500"
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
  const [advertisements, setAdvertisements] = useState(defaultAdvertisements);
  const sigCanvas = useRef<SignatureCanvas>(null);

  // Fetch custom ads from centro settings
  useEffect(() => {
    if (!centroId) return;
    
    const fetchCentroAds = async () => {
      const { data } = await supabase
        .from("centri_assistenza")
        .select("settings")
        .eq("id", centroId)
        .single();
      
      if (data?.settings) {
        const settings = data.settings as { display_ads?: typeof defaultAdvertisements };
        if (settings.display_ads && settings.display_ads.length > 0) {
          setAdvertisements(settings.display_ads);
        }
      }
    };
    
    fetchCentroAds();
  }, [centroId]);

  // Rotate ads in standby mode
  useEffect(() => {
    if (mode !== "standby") return;
    
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % advertisements.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [mode, advertisements.length]);

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

  // Standby mode with rotating ads
  if (mode === "standby") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentAdIndex}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl w-full"
          >
            <Card className={`p-12 bg-gradient-to-br ${advertisements[currentAdIndex].gradient} border-0 shadow-2xl`}>
              <div className="text-center text-white space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-24 h-24 mx-auto rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center"
                >
                  {(() => {
                    const IconComponent = getIconComponent(advertisements[currentAdIndex].icon);
                    return <IconComponent className="h-12 w-12 text-white" />;
                  })()}
                </motion.div>
                <h1 className="text-4xl md:text-5xl font-bold">
                  {advertisements[currentAdIndex].title}
                </h1>
                <p className="text-xl md:text-2xl text-white/80">
                  {advertisements[currentAdIndex].description}
                </p>
              </div>
            </Card>
            
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
      </div>
    );
  }

  // Completed mode
  if (mode === "completed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 flex items-center justify-center p-8">
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="flex justify-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Monitor className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            {mode === "confirm_data" && "Conferma i Tuoi Dati"}
            {mode === "enter_password" && "Inserisci Password Dispositivo"}
            {mode === "signature" && "Firma per Accettazione"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {mode === "confirm_data" && "Verifica che le informazioni siano corrette"}
            {mode === "enter_password" && "Inserisci la password per sbloccare il dispositivo"}
            {mode === "signature" && "Firma per accettare i termini del servizio"}
          </p>
        </motion.div>

        {session && (
          <>
            {/* Data Confirmation Mode */}
            {mode === "confirm_data" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Customer Info */}
                <Card className="p-6 border-2 border-primary/20">
                  <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Dati Cliente
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Nome</p>
                        <p className="text-lg font-semibold">{session.customer.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <PhoneIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Telefono</p>
                        <p className="text-lg font-semibold">{session.customer.phone}</p>
                      </div>
                    </div>
                    {session.customer.email && (
                      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-lg font-semibold">{session.customer.email}</p>
                        </div>
                      </div>
                    )}
                    {session.customer.address && (
                      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Indirizzo</p>
                          <p className="text-lg font-semibold">{session.customer.address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Device Info */}
                <Card className="p-6 border-2 border-accent/20">
                  <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-accent" />
                    Dispositivo
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Marca e Modello</p>
                      <p className="text-lg font-semibold">
                        {session.device.brand} {session.device.model}
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Tipo</p>
                      <p className="text-lg font-semibold capitalize">{session.device.device_type}</p>
                    </div>
                    <div className="md:col-span-2 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <p className="text-xs text-amber-600">Problema Segnalato</p>
                      <p className="text-lg font-semibold text-amber-700">{session.device.reported_issue}</p>
                    </div>
                  </div>
                </Card>

                {/* Estimated Cost */}
                <Card className="p-6 border-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Preventivo Stimato</p>
                    <p className="text-5xl font-bold text-primary">
                      €{(session.estimatedCost + session.diagnosticFee).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Da pagare ora: €{session.amountDueNow.toFixed(2)}
                    </p>
                  </div>
                </Card>

                {/* Confirm Button */}
                <div className="flex gap-4">
                  <Button
                    onClick={handleConfirmData}
                    disabled={dataConfirmed}
                    className="flex-1 h-16 text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90"
                  >
                    {dataConfirmed ? (
                      <>
                        <CheckCircle2 className="mr-3 h-6 w-6" />
                        Dati Confermati
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-3 h-6 w-6" />
                        Conferma Dati
                      </>
                    )}
                  </Button>
                </div>

                {dataConfirmed && (
                  <Alert className="border-green-500/30 bg-green-500/10">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <AlertDescription className="text-green-700 text-base">
                      Dati confermati. In attesa del prossimo passaggio...
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

            {/* Signature Mode */}
            {mode === "signature" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Quote Details */}
                {session.quoteItems && session.quoteItems.length > 0 && (
                  <Card className="p-6 border-2 border-accent/20">
                    <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-accent" />
                      Dettaglio Preventivo
                    </h2>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {session.quoteItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              item.type === 'part' ? 'bg-blue-500/20 text-blue-600' :
                              item.type === 'service' ? 'bg-purple-500/20 text-purple-600' :
                              'bg-green-500/20 text-green-600'
                            }`}>
                              {item.type === 'part' ? 'Ricambio' : item.type === 'service' ? 'Servizio' : 'Manodopera'}
                            </span>
                            <span className="font-medium">{item.name}</span>
                            {item.quantity > 1 && (
                              <span className="text-muted-foreground text-sm">x{item.quantity}</span>
                            )}
                          </div>
                          <span className="font-semibold">€{item.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Totals breakdown */}
                    <div className="mt-4 pt-4 border-t border-border space-y-2">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotale lavori</span>
                        <span>€{session.estimatedCost.toFixed(2)}</span>
                      </div>
                      {session.diagnosticFee > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Gestione diagnosi</span>
                          <span>€{session.diagnosticFee.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xl font-bold text-primary pt-2 border-t border-border">
                        <span>Totale Preventivo</span>
                        <span>€{(session.estimatedCost + session.diagnosticFee).toFixed(2)}</span>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Amount to pay now */}
                <Card className="p-6 border-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Importo da Pagare Ora</p>
                    <p className="text-5xl font-bold text-primary">
                      €{session.amountDueNow.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.amountDueNow < (session.estimatedCost + session.diagnosticFee) 
                        ? `Saldo rimanente: €${((session.estimatedCost + session.diagnosticFee) - session.amountDueNow).toFixed(2)} al ritiro`
                        : "Pagamento completo"}
                    </p>
                  </div>
                </Card>

                {/* Disclaimer */}
                <Card className="p-4 border border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <h4 className="font-semibold text-foreground">Informativa</h4>
                  </div>
                  <ScrollArea className="h-[100px]">
                    <div className="space-y-2 text-sm text-muted-foreground pr-2">
                      <p>
                        <strong>Esonero Responsabilità:</strong> Il laboratorio è esonerato da responsabilità 
                        per perdita dati, danni preesistenti non dichiarati.
                      </p>
                      <p className="text-rose-600">
                        <strong>Clausola Alienazione:</strong> Dispositivi non ritirati entro 30 giorni 
                        diventeranno proprietà del laboratorio (Art. 2756 c.c.).
                      </p>
                    </div>
                  </ScrollArea>
                </Card>

                {/* Signature Canvas */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold flex items-center gap-2">
                      <FileSignature className="h-5 w-5 text-primary" />
                      La Tua Firma
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSignature}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancella
                    </Button>
                  </div>

                  <Card className="p-1 bg-white border-2 border-dashed border-primary/40">
                    <SignatureCanvas
                      ref={sigCanvas}
                      canvasProps={{
                        className: "w-full h-56 md:h-64 rounded cursor-crosshair",
                        style: { touchAction: "none" }
                      }}
                      backgroundColor="white"
                      penColor="#000000"
                    />
                  </Card>

                  <p className="text-sm text-center text-muted-foreground">
                    Firma nell'area sopra usando il dito o lo stilo
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmitSignature}
                  disabled={isSubmitting}
                  className="w-full h-16 text-xl font-bold bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                      Invio in corso...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-3 h-6 w-6" />
                      Conferma e Firma
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  La firma digitale è valida ai sensi del Regolamento eIDAS e del CAD
                </p>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}