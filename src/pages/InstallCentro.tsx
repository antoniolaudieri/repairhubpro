import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { 
  Download, Smartphone, Share2, CheckCircle2, 
  ChevronRight, Apple, Bot, Loader2
} from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { motion } from "framer-motion";

interface CentroInfo {
  id: string;
  business_name: string;
  logo_url: string | null;
  address: string;
  phone: string;
}

export default function InstallCentro() {
  const { centroId } = useParams<{ centroId: string }>();
  const navigate = useNavigate();
  const [centro, setCentro] = useState<CentroInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { isInstallable, isInstalled, promptInstall, isIOS, isAndroid, isMobile } = useInstallPrompt();
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (centroId) {
      fetchCentroInfo();
    }
  }, [centroId]);

  const fetchCentroInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("centri_assistenza")
        .select("id, business_name, logo_url, address, phone")
        .eq("id", centroId)
        .single();

      if (error) throw error;
      setCentro(data);
    } catch (error) {
      console.error("Error fetching centro:", error);
      toast.error("Centro non trovato");
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const result = await promptInstall();
      if (result) {
        toast.success("App installata con successo!");
      }
    } catch (error) {
      console.error("Install error:", error);
    } finally {
      setInstalling(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${centro?.business_name} - App Diagnostica`,
          text: `Installa l'app per la diagnostica del tuo dispositivo presso ${centro?.business_name}`,
          url: shareUrl
        });
      } catch (error) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiato negli appunti!");
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Skeleton className="h-24 w-24 rounded-2xl mx-auto mb-4" />
              <Skeleton className="h-6 w-48 mx-auto mb-2" />
              <Skeleton className="h-4 w-32 mx-auto" />
            </CardHeader>
          </Card>
        </div>
      </PageTransition>
    );
  }

  if (!centro) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-8 pb-8">
              <p className="text-muted-foreground mb-4">Centro non trovato</p>
              <Button onClick={() => navigate("/")} variant="outline">
                Torna alla Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  const installUrl = window.location.href;

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background p-4">
        <div className="max-w-md mx-auto pt-8 space-y-6">
          {/* Centro Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/20 flex items-center justify-center mx-auto mb-4 overflow-hidden shadow-lg">
              {centro.logo_url ? (
                <img 
                  src={centro.logo_url} 
                  alt={centro.business_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Smartphone className="h-10 w-10 text-primary" />
              )}
            </div>
            <h1 className="text-2xl font-bold">{centro.business_name}</h1>
            <p className="text-muted-foreground text-sm mt-1">{centro.address}</p>
          </motion.div>

          {/* Install Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-2 border-primary/20 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Download className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold">Installa l'App</h2>
                    <p className="text-sm text-muted-foreground">
                      Diagnostica e monitoraggio dispositivo
                    </p>
                  </div>
                </div>

                {isInstalled ? (
                  <div className="flex items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-600">App già installata!</span>
                  </div>
                ) : isIOS ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Apple className="h-5 w-5" />
                      <span className="font-medium">iPhone / iPad</span>
                    </div>
                    <ol className="space-y-3 text-sm">
                      <li className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5 shrink-0">1</Badge>
                        <span>Tocca l'icona <strong>Condividi</strong> <Share2 className="h-4 w-4 inline" /> in basso</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5 shrink-0">2</Badge>
                        <span>Scorri e seleziona <strong>"Aggiungi a Home"</strong></span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5 shrink-0">3</Badge>
                        <span>Conferma toccando <strong>"Aggiungi"</strong></span>
                      </li>
                    </ol>
                    <div className="pt-2">
                      <Button onClick={handleShare} variant="outline" className="w-full">
                        <Share2 className="h-4 w-4 mr-2" />
                        Condividi Link
                      </Button>
                    </div>
                  </div>
                ) : isInstallable ? (
                  <Button 
                    onClick={handleInstall}
                    disabled={installing}
                    className="w-full h-12"
                    size="lg"
                  >
                    {installing ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-5 w-5 mr-2" />
                    )}
                    Installa App
                  </Button>
                ) : isAndroid ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Bot className="h-5 w-5" />
                      <span className="font-medium">Android</span>
                    </div>
                    <ol className="space-y-3 text-sm">
                      <li className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5 shrink-0">1</Badge>
                        <span>Tocca il menu <strong>⋮</strong> in alto a destra</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5 shrink-0">2</Badge>
                        <span>Seleziona <strong>"Installa app"</strong> o <strong>"Aggiungi a Home"</strong></span>
                      </li>
                    </ol>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    L'installazione PWA è supportata solo su dispositivi mobili.
                  </p>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cosa puoi fare con l'app</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <FeatureItem 
                  title="Diagnostica Automatica"
                  description="Analisi hardware completa del tuo dispositivo"
                />
                <FeatureItem 
                  title="Monitoraggio Batteria"
                  description="Controlla lo stato di salute della batteria"
                />
                <FeatureItem 
                  title="Analisi AI"
                  description="Consigli personalizzati basati sui dati rilevati"
                />
                <FeatureItem 
                  title="Punti Fedeltà"
                  description="Guadagna punti per ogni check-up completato"
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* QR Code for sharing */}
          {!isMobile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="pb-2 text-center">
                  <CardTitle className="text-base">Scansiona con il telefono</CardTitle>
                  <CardDescription>
                    Apri la fotocamera e inquadra il QR code
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pb-6">
                  <div className="p-4 bg-white rounded-xl">
                    <QRCodeSVG 
                      value={installUrl}
                      size={180}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Continue to app */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button 
              onClick={() => navigate("/auth")}
              variant="ghost"
              className="w-full"
            >
              Continua senza installare
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <CheckCircle2 className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
