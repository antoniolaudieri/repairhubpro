import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wrench,
  Store,
  Building2,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Users,
  TrendingUp,
  Shield,
  Zap,
  Award,
  Smartphone,
  Settings,
  Globe,
  HeartHandshake,
  Sparkles,
} from "lucide-react";

type ProviderType = "corner" | "riparatore" | "centro";

const providerTypes = [
  {
    type: "corner" as const,
    title: "Corner",
    subtitle: "Punto di Raccolta",
    description: "Sei un negozio di telefonia, tabaccheria o attività commerciale? Diventa un punto di raccolta dispositivi e guadagna segnalando riparazioni ai nostri centri partner.",
    icon: Store,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    commission: "10% sul margine",
    benefits: [
      "Nessun investimento iniziale",
      "Guadagno su ogni riparazione segnalata",
      "Aumenti il traffico nel tuo negozio",
      "Formazione e supporto inclusi",
    ],
  },
  {
    type: "riparatore" as const,
    title: "Riparatore",
    subtitle: "Tecnico Indipendente",
    description: "Sei un tecnico specializzato in riparazioni? Unisciti alla nostra rete e ricevi lavori nella tua zona, gestisci i tuoi orari e massimizza i tuoi guadagni.",
    icon: Wrench,
    color: "text-info",
    bgColor: "bg-info/10",
    borderColor: "border-info/30",
    commission: "60% sul margine",
    benefits: [
      "Lavori nella tua zona",
      "Flessibilità totale sugli orari",
      "Accesso a ricambi scontati",
      "Pagamenti rapidi e sicuri",
    ],
  },
  {
    type: "centro" as const,
    title: "Centro Assistenza",
    subtitle: "Laboratorio Professionale",
    description: "Gestisci un laboratorio di riparazioni? Espandi la tua clientela, collabora con Corner e Riparatori, e ottieni gli strumenti per gestire tutto il tuo business.",
    icon: Building2,
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/30",
    commission: "Fino al 70% sul margine",
    benefits: [
      "Gestionale completo incluso",
      "Rete di Corner per nuovi clienti",
      "Marketplace dispositivi usati",
      "Reportistica e analytics avanzati",
    ],
  },
];

const platformFeatures = [
  {
    icon: Smartphone,
    title: "Gestionale Completo",
    description: "Software professionale per gestire riparazioni, clienti, inventario e ordini.",
  },
  {
    icon: Users,
    title: "Rete di Partner",
    description: "Connettiti con Corner, Riparatori e Centri nella tua zona per crescere insieme.",
  },
  {
    icon: TrendingUp,
    title: "Crescita Garantita",
    description: "Aumenta i tuoi guadagni grazie alla nostra rete e agli strumenti di marketing.",
  },
  {
    icon: Shield,
    title: "Pagamenti Sicuri",
    description: "Sistema di commissioni trasparente con pagamenti tracciati e puntuali.",
  },
  {
    icon: Settings,
    title: "Automazione AI",
    description: "Preventivi automatici, suggerimenti ricambi e guide di riparazione intelligenti.",
  },
  {
    icon: Globe,
    title: "Visibilità Online",
    description: "I tuoi dispositivi usati visibili a migliaia di potenziali acquirenti.",
  },
];

export default function DiventaPartner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<ProviderType | null>(null);

  const handleProceed = (type: ProviderType) => {
    if (user) {
      // User is logged in, go directly to registration with type
      navigate(`/provider-registration?type=${type}`);
    } else {
      // User not logged in, go to auth with redirect
      navigate(`/auth?redirect=/provider-registration?type=${type}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Aurora Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh animate-aurora" />
        <div className="absolute inset-0 bg-pattern-dots opacity-30" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-float-medium" />
      </div>

      {/* Navigation */}
      <nav className="border-b border-border/50 bg-background/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="relative">
              <div className="p-2.5 bg-gradient-primary rounded-xl shadow-glow">
                <Wrench className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <span className="font-bold text-xl text-foreground">LabLinkRiparo</span>
          </motion.div>

          <div className="flex gap-2 items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Torna alla Home</span>
            </Button>
            {!user && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/auth")}
                className="gap-2"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Accedi</span>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border-primary/20 mb-6"
              animate={{ boxShadow: ["0 0 20px hsl(217 91% 60% / 0.2)", "0 0 30px hsl(217 91% 60% / 0.4)", "0 0 20px hsl(217 91% 60% / 0.2)"] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="h-4 w-4 text-primary animate-bounce-gentle" />
              <span className="text-sm font-medium text-primary">Unisciti alla Rete</span>
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Diventa Partner di{" "}
              <span className="text-gradient">LabLinkRiparo</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
              La piattaforma che connette negozi, riparatori e centri assistenza per offrire 
              il miglior servizio di riparazione dispositivi in Italia.
            </p>
          </motion.div>

          {/* What is LabLinkRiparo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-20"
          >
            <Card className="bg-card/50 backdrop-blur border-border/50 overflow-hidden">
              <div className="grid lg:grid-cols-2 gap-0">
                <div className="p-8 lg:p-12 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-primary rounded-lg">
                      <HeartHandshake className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h2 className="text-2xl font-bold">Cos'è LabLinkRiparo?</h2>
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    LabLinkRiparo è un ecosistema completo per il mondo delle riparazioni di dispositivi elettronici. 
                    Mettiamo in contatto <strong>negozi di telefonia</strong> (Corner), <strong>tecnici indipendenti</strong> (Riparatori) 
                    e <strong>laboratori professionali</strong> (Centri Assistenza) per creare una rete efficiente 
                    che garantisce riparazioni rapide, professionali e convenienti.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success shrink-0" />
                      <span className="text-sm">Gestionale professionale incluso</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success shrink-0" />
                      <span className="text-sm">Commissioni trasparenti e competitive</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success shrink-0" />
                      <span className="text-sm">Supporto e formazione continua</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success shrink-0" />
                      <span className="text-sm">Marketplace dispositivi usati</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-primary/10 via-accent/10 to-info/10 p-8 lg:p-12 flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                    {platformFeatures.slice(0, 4).map((feature, index) => (
                      <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="p-4 rounded-xl bg-background/80 backdrop-blur border border-border/50 text-center"
                      >
                        <feature.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <p className="text-xs font-medium">{feature.title}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Partner Types */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-20"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-3">Scegli il tuo ruolo</h2>
              <p className="text-muted-foreground">
                Ogni ruolo ha i suoi vantaggi. Scegli quello più adatto alla tua attività.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {providerTypes.map((provider, index) => (
                <motion.div
                  key={provider.type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <Card 
                    className={`h-full cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl bg-card/50 backdrop-blur border-2 ${
                      selectedType === provider.type 
                        ? `${provider.borderColor} shadow-lg` 
                        : 'border-border/50 hover:border-border'
                    }`}
                    onClick={() => setSelectedType(provider.type)}
                  >
                    <CardHeader className="text-center pb-4">
                      <div className={`w-16 h-16 rounded-2xl ${provider.bgColor} flex items-center justify-center mx-auto mb-4`}>
                        <provider.icon className={`h-8 w-8 ${provider.color}`} />
                      </div>
                      <CardTitle className="text-xl">{provider.title}</CardTitle>
                      <p className={`text-sm font-medium ${provider.color}`}>{provider.subtitle}</p>
                      <CardDescription className="text-sm mt-2">
                        {provider.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-success/10 text-success text-sm font-semibold">
                          {provider.commission}
                        </span>
                      </div>
                      
                      <div className="space-y-2 pt-2">
                        {provider.benefits.map((benefit, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-success shrink-0" />
                            <span>{benefit}</span>
                          </div>
                        ))}
                      </div>

                      <Button
                        className="w-full mt-4"
                        variant={selectedType === provider.type ? "default" : "outline"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProceed(provider.type);
                        }}
                      >
                        {user ? "Invia Candidatura" : "Registrati ora"}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Platform Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mb-20"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-3">Cosa ti offriamo</h2>
              <p className="text-muted-foreground">
                Strumenti professionali per far crescere la tua attività
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {platformFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                >
                  <Card className="h-full bg-card/30 backdrop-blur border-border/50 hover:bg-card/50 transition-colors">
                    <CardContent className="p-6">
                      <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center"
          >
            <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-info/10 border-primary/20">
              <CardContent className="p-8 lg:p-12">
                <Award className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h2 className="text-2xl lg:text-3xl font-bold mb-3">
                  Pronto a iniziare?
                </h2>
                <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                  Unisciti a centinaia di partner che hanno già scelto LabLinkRiparo 
                  per far crescere il loro business nel mondo delle riparazioni.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {user ? (
                    <Button 
                      size="lg" 
                      onClick={() => navigate("/provider-registration")}
                      className="gap-2"
                    >
                      <Zap className="h-5 w-5" />
                      Invia la tua Candidatura
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  ) : (
                    <>
                      <Button 
                        size="lg" 
                        onClick={() => navigate("/auth?redirect=/provider-registration")}
                        className="gap-2"
                      >
                        <Zap className="h-5 w-5" />
                        Registrati e Candidati
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                      <Button 
                        size="lg" 
                        variant="outline"
                        onClick={() => navigate("/auth?redirect=/provider-registration")}
                        className="gap-2"
                      >
                        <Shield className="h-5 w-5" />
                        Accedi se hai già un account
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 bg-background/60 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="p-1.5 bg-gradient-primary rounded-lg">
              <Wrench className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">LabLinkRiparo</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Gestionale Riparazioni • info@lablinkriparo.it
          </p>
        </div>
      </footer>
    </div>
  );
}
