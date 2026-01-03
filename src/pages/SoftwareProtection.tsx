import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  Shield, 
  Smartphone, 
  Sparkles, 
  Check, 
  ArrowLeft, 
  Clock,
  Zap,
  Activity,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const SoftwareProtection = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [subscription, setSubscription] = useState<{
    subscribed: boolean;
    subscription_end: string | null;
  } | null>(null);

  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  useEffect(() => {
    if (success) {
      toast.success("Abbonamento attivato con successo!");
    }
    if (canceled) {
      toast.info("Pagamento annullato");
    }
  }, [success, canceled]);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setCheckingSubscription(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setCheckingSubscription(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke("check-software-subscription", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) throw error;
        setSubscription(data);
      } catch (error) {
        console.error("Error checking subscription:", error);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [user, success]);

  const handleSubscribe = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessione scaduta, effettua di nuovo il login");
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-software-checkout", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error("Errore durante la creazione del pagamento");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Activity,
      title: "Monitoraggio Salute",
      desc: "Controlla in tempo reale batteria, memoria e prestazioni del tuo dispositivo",
    },
    {
      icon: Shield,
      title: "Antivirus Avanzato",
      desc: "Protezione completa contro malware, virus e minacce informatiche",
    },
    {
      icon: Calendar,
      title: "Prenotazioni In-App",
      desc: "Prenota riparazioni direttamente dall'app con priorità garantita",
    },
    {
      icon: Sparkles,
      title: "Sconto 10% Riparazioni",
      desc: "Risparmia su tutte le riparazioni per un anno intero",
    },
    {
      icon: Zap,
      title: "Notifiche Proattive",
      desc: "Ricevi avvisi prima che i problemi diventino critici",
    },
    {
      icon: Clock,
      title: "Supporto Prioritario",
      desc: "Assistenza dedicata e tempi di risposta ridotti",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Protezione Dispositivo</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Proteggi il Tuo Dispositivo
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Un abbonamento, protezione completa. Monitora la salute del tuo telefono, 
            proteggi dai virus e risparmia sulle riparazioni.
          </p>
        </motion.div>

        {/* Subscription Status */}
        {subscription?.subscribed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
          >
            <Card className="border-2 border-primary bg-primary/5">
              <CardContent className="py-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Check className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Abbonamento Attivo</h3>
                      <p className="text-muted-foreground">
                        {subscription.subscription_end && (
                          <>
                            Valido fino al{" "}
                            {format(new Date(subscription.subscription_end), "d MMMM yyyy", {
                              locale: it,
                            })}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge variant="default" className="text-sm px-4 py-1">
                    Premium
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-2 gap-4 mb-12"
        >
          {features.map((feature, idx) => (
            <Card key={idx} className="border-border/50">
              <CardContent className="py-5">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Pricing Card */}
        {!subscription?.subscribed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-2 border-primary shadow-lg shadow-primary/10">
              <CardHeader className="text-center pb-2">
                <Badge className="w-fit mx-auto mb-2">Offerta Lancio</Badge>
                <CardTitle className="text-2xl">Abbonamento Annuale</CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <div className="mb-6">
                  <span className="text-5xl font-bold">€30</span>
                  <span className="text-muted-foreground">/anno</span>
                </div>
                
                <ul className="text-left max-w-sm mx-auto space-y-3 mb-8">
                  {[
                    "Monitoraggio salute dispositivo 24/7",
                    "Antivirus e protezione malware",
                    "Prenotazione riparazioni in-app",
                    "Sconto 10% su tutte le riparazioni",
                    "Notifiche proattive problemi",
                    "Supporto prioritario",
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  size="lg"
                  className="w-full max-w-sm text-lg py-6"
                  onClick={handleSubscribe}
                  disabled={loading || checkingSubscription}
                >
                  {loading ? (
                    "Caricamento..."
                  ) : !user ? (
                    "Accedi per Abbonarti"
                  ) : (
                    <>
                      <Smartphone className="mr-2 h-5 w-5" />
                      Abbonati Ora
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground mt-4">
                  Pagamento sicuro con Stripe. Rinnovo automatico annuale.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default SoftwareProtection;
