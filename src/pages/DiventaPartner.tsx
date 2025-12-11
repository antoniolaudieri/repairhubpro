import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Monitor,
  Bell,
  Gift,
  Megaphone,
  BookOpen,
  FileText,
  BarChart3,
  Brain,
  ShoppingCart,
  Wallet,
  MapPin,
  Clock,
  Eye,
  Calendar,
  Star,
  GraduationCap,
  Handshake,
  ChevronDown,
  ChevronUp,
  Play,
} from "lucide-react";

type ProviderType = "corner" | "riparatore" | "centro";

// Detailed features for each provider type
const centroFeatures = [
  { icon: Brain, title: "Preventivi con IA", description: "Preventivi automatici con suggerimenti intelligenti su ricambi, manodopera e servizi." },
  { icon: Monitor, title: "Display Pubblicitario", description: "Display interno per pubblicità personalizzate e monetizzazione degli spazi di attesa." },
  { icon: FileText, title: "Firma Digitale GDPR", description: "Firma innovativa con compliance GDPR a norma di legge italiana ed europea." },
  { icon: Bell, title: "Notifiche Automatiche", description: "Notifiche push ed email automatiche ai clienti sull'avanzamento riparazione." },
  { icon: Gift, title: "Programma Fedeltà", description: "Premia i clienti con bonus e punti fedeltà per aumentare la fidelizzazione." },
  { icon: Megaphone, title: "Marketing Innovativo", description: "Sistema di marketing integrato per promuovere servizi e raggiungere nuovi clienti." },
  { icon: BookOpen, title: "Guide Auto-Generate", description: "Guide di riparazione collaborative create dalla community di laboratori." },
  { icon: Wallet, title: "Gestione Perizie", description: "Strumenti dedicati per perizie e valutazioni tecniche professionali." },
  { icon: ShoppingCart, title: "Marketplace Usato IA", description: "Gestione usato con valutazione istantanea IA per prezzi di mercato." },
  { icon: BarChart3, title: "Analytics Predittivo", description: "Agente IA che analizza dati per prevedere trend, ingressi e riparazioni." },
  { icon: Settings, title: "Suggerimenti Acquisti", description: "Consigli automatici sui prodotti e ricambi per ogni riparazione." },
  { icon: Handshake, title: "Community Connessa", description: "Nuove funzionalità sviluppate insieme alla community LabLinkPro." },
];

const cornerFeatures = [
  { icon: TrendingUp, title: "Aumenta Scontrino", description: "Guadagna commissioni consigliando servizi di riparazione ai tuoi clienti." },
  { icon: Smartphone, title: "Portale Semplice", description: "Gestione semplice e funzionale attraverso un portale dedicato intuitivo." },
  { icon: ShoppingCart, title: "Pubblica Usato", description: "Aggiungi dispositivi usati nel marketplace per guadagni extra." },
  { icon: Eye, title: "Tracking Real-time", description: "I clienti seguono le riparazioni in tempo reale dalla loro dashboard." },
  { icon: Calendar, title: "Prenotazioni Online", description: "I clienti prenotano riparazioni o visionano dispositivi direttamente online." },
  { icon: Bell, title: "Notifiche Marketplace", description: "Avvisi automatici ai clienti quando nuovi dispositivi vengono aggiunti." },
];

const riparatoreFeatures = [
  { icon: GraduationCap, title: "Formazione Completa", description: "Supporto completo anche senza esperienza per diventare un riparatore." },
  { icon: MapPin, title: "Lavori in Zona", description: "Richieste geolocalizzate nella tua area per ottimizzare spostamenti." },
  { icon: Clock, title: "Flessibilità Totale", description: "Gestisci i tuoi orari accettando lavori quando preferisci." },
  { icon: BookOpen, title: "Guide e Supporto", description: "Guide dettagliate e supporto community per ogni intervento." },
  { icon: Wallet, title: "Pagamenti Sicuri", description: "Commissioni chiare e trasferimenti rapidi garantiti." },
  { icon: Star, title: "Crescita Professionale", description: "Costruisci reputazione con feedback e specializzazioni." },
];

const providerTypes = [
  {
    type: "centro" as const,
    title: "Centro Assistenza",
    subtitle: "Laboratorio Professionale",
    description: "Gestisci un laboratorio di riparazioni? Espandi la tua clientela, collabora con Corner e Riparatori, e ottieni gli strumenti per gestire tutto il tuo business.",
    icon: Building2,
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/40",
    gradientFrom: "from-success/20",
    gradientVia: "via-success/10",
    gradientTo: "to-success/5",
    accentColor: "hsl(142 76% 36%)",
    commission: "Fino al 80% sul margine",
    features: centroFeatures,
    benefits: ["Gestionale completo incluso", "Rete di Corner per nuovi clienti", "Marketplace dispositivi usati", "Reportistica e analytics avanzati"],
  },
  {
    type: "corner" as const,
    title: "Corner",
    subtitle: "Punto di Raccolta",
    description: "Sei un negozio di telefonia, tabaccheria o attività commerciale? Diventa un punto di raccolta dispositivi e guadagna segnalando riparazioni ai nostri centri partner.",
    icon: Store,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/40",
    gradientFrom: "from-primary/20",
    gradientVia: "via-primary/10",
    gradientTo: "to-primary/5",
    accentColor: "hsl(217 91% 60%)",
    commission: "10% sul margine",
    features: cornerFeatures,
    benefits: ["Nessun investimento iniziale", "Guadagno su ogni riparazione", "Aumenti traffico nel negozio", "Formazione e supporto inclusi"],
  },
  {
    type: "riparatore" as const,
    title: "Riparatore",
    subtitle: "Tecnico Indipendente",
    description: "Sei un tecnico specializzato in riparazioni? Unisciti alla nostra rete e ricevi lavori nella tua zona, gestisci i tuoi orari e massimizza i tuoi guadagni.",
    icon: Wrench,
    color: "text-info",
    bgColor: "bg-info/10",
    borderColor: "border-info/40",
    gradientFrom: "from-info/20",
    gradientVia: "via-info/10",
    gradientTo: "to-info/5",
    accentColor: "hsl(199 89% 48%)",
    commission: "60% sul margine",
    features: riparatoreFeatures,
    benefits: ["Lavori nella tua zona", "Flessibilità totale sugli orari", "Accesso a ricambi scontati", "Pagamenti rapidi e sicuri"],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } }
};

const scaleVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const } }
};

export default function DiventaPartner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expandedType, setExpandedType] = useState<ProviderType | null>("centro");

  const handleProceed = (type: ProviderType) => {
    if (user) {
      navigate(`/provider-registration?type=${type}`);
    } else {
      navigate(`/auth?redirect=/provider-registration?type=${type}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Aurora Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh animate-aurora" />
        <div className="absolute inset-0 bg-pattern-dots opacity-20" />
        <motion.div 
          className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[100px]"
          animate={{ 
            x: [0, 30, 0], 
            y: [0, -20, 0],
            scale: [1, 1.1, 1] 
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-success/8 rounded-full blur-[80px]"
          animate={{ 
            x: [0, -20, 0], 
            y: [0, 30, 0],
            scale: [1, 1.15, 1] 
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-info/6 rounded-full blur-[60px]"
          animate={{ 
            x: [0, 40, 0], 
            y: [0, -40, 0] 
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Navigation */}
      <nav className="border-b border-border/40 bg-background/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate("/")}
          >
            <div className="relative">
              <div className="p-2.5 bg-gradient-primary rounded-xl shadow-glow group-hover:shadow-glow-lg transition-shadow">
                <Wrench className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <span className="font-bold text-xl text-foreground">LabLinkRiparo</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-2 items-center"
          >
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2 hover:bg-primary/5">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Button>
            {!user && (
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")} className="gap-2 border-primary/30 hover:border-primary hover:bg-primary/5">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Accedi</span>
              </Button>
            )}
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 lg:py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="text-center max-w-4xl mx-auto mb-20"
          >
            <motion.div variants={itemVariants} className="mb-8">
              <motion.div 
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-card border border-primary/20 mb-6"
                animate={{ boxShadow: ["0 0 20px hsl(217 91% 60% / 0.15)", "0 0 35px hsl(217 91% 60% / 0.25)", "0 0 20px hsl(217 91% 60% / 0.15)"] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Sparkles className="h-4 w-4 text-primary animate-bounce-gentle" />
                <span className="text-sm font-semibold text-primary">Unisciti alla Rete Professionale</span>
              </motion.div>
            </motion.div>

            <motion.h1 
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight"
            >
              Diventa Partner di{" "}
              <span className="text-gradient-accent">LabLinkRiparo</span>
            </motion.h1>
            
            <motion.p 
              variants={itemVariants}
              className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto"
            >
              La piattaforma che connette negozi, riparatori e centri assistenza per offrire 
              il miglior servizio di riparazione dispositivi in Italia.
            </motion.p>

            <motion.div variants={itemVariants} className="mt-10 flex flex-wrap justify-center gap-4">
              <Button size="lg" onClick={() => document.getElementById('partner-types')?.scrollIntoView({ behavior: 'smooth' })} className="gap-2 shadow-lg hover:shadow-xl transition-shadow">
                <Play className="h-4 w-4" />
                Scopri i Ruoli
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate(user ? "/provider-registration" : "/auth?redirect=/provider-registration")} className="gap-2 border-primary/30 hover:border-primary">
                <Zap className="h-4 w-4" />
                {user ? "Candidati Ora" : "Registrati"}
              </Button>
            </motion.div>
          </motion.div>

          {/* What is LabLinkRiparo & Founder Story Combined */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
            className="grid lg:grid-cols-2 gap-6 mb-20"
          >
            {/* What is LabLinkRiparo */}
            <motion.div variants={scaleVariants}>
              <Card className="h-full glass-card-strong border-border/40 overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-primary rounded-xl shadow-md">
                      <HeartHandshake className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Cos'è LabLinkRiparo?</h2>
                      <p className="text-sm text-muted-foreground">Ecosistema completo per riparazioni</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
                    Mettiamo in contatto <strong className="text-foreground">negozi</strong>, 
                    <strong className="text-foreground"> tecnici</strong> e 
                    <strong className="text-foreground"> laboratori</strong> per creare una rete efficiente 
                    che garantisce riparazioni rapide e professionali.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Smartphone, text: "Gestionale Pro" },
                      { icon: TrendingUp, text: "Commissioni Chiare" },
                      { icon: Users, text: "Rete Partner" },
                      { icon: Globe, text: "Marketplace" },
                    ].map((item, i) => (
                      <motion.div 
                        key={item.text}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-success/5 border border-success/20"
                      >
                        <item.icon className="h-4 w-4 text-success" />
                        <span className="text-xs font-medium">{item.text}</span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Founder Story */}
            <motion.div variants={scaleVariants}>
              <Card className="h-full glass-card-strong border-border/40 overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <motion.div 
                      className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow shrink-0"
                      whileHover={{ scale: 1.05 }}
                    >
                      <span className="text-xl font-bold text-primary-foreground">RC</span>
                    </motion.div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="h-4 w-4 text-warning" />
                        <span className="text-xs text-warning font-medium">Fondatore</span>
                      </div>
                      <h3 className="text-lg font-bold">Riccardo Casagrande</h3>
                      <p className="text-xs text-muted-foreground">Imperia, dal 2012 nel settore</p>
                    </div>
                  </div>
                  <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      <strong className="text-foreground">Nel 2012</strong> ho fondato il mio laboratorio partendo dal nulla. 
                      Anni di esperienza mi hanno insegnato le sfide quotidiane dei riparatori.
                    </p>
                    <motion.blockquote 
                      className="border-l-4 border-primary/50 pl-4 py-3 bg-primary/5 rounded-r-lg italic"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                    >
                      "LabLinkRiparo racchiude tutta la passione che dedico da anni. 
                      Sono sicuro aiuterà a incrementare fatturato e benessere di tutti i partner."
                    </motion.blockquote>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Partner Types Section */}
          <motion.div
            id="partner-types"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={containerVariants}
            className="mb-20"
          >
            <motion.div variants={itemVariants} className="text-center mb-12">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
                <Sparkles className="h-3 w-3 mr-1" />
                3 Ruoli Disponibili
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">Scegli il tuo ruolo</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Ogni ruolo ha vantaggi unici. Scopri tutte le funzionalità esclusive per ogni categoria.
              </p>
            </motion.div>

            <div className="space-y-6">
              {providerTypes.map((provider, index) => (
                <motion.div
                  key={provider.type}
                  variants={itemVariants}
                  layout
                >
                  <Card 
                    className={`overflow-hidden transition-all duration-300 cursor-pointer border-2 ${
                      expandedType === provider.type 
                        ? `${provider.borderColor} shadow-xl glass-card-strong` 
                        : 'border-border/40 hover:border-border glass-card hover:shadow-lg'
                    }`}
                    onClick={() => setExpandedType(expandedType === provider.type ? null : provider.type)}
                  >
                    {/* Header - Always visible */}
                    <div className={`p-6 lg:p-8 bg-gradient-to-r ${provider.gradientFrom} ${provider.gradientVia} ${provider.gradientTo}`}>
                      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                        <div className="flex items-center gap-4 flex-1">
                          <motion.div 
                            className={`w-16 h-16 lg:w-20 lg:h-20 rounded-2xl ${provider.bgColor} flex items-center justify-center border ${provider.borderColor}`}
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <provider.icon className={`h-8 w-8 lg:h-10 lg:w-10 ${provider.color}`} />
                          </motion.div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-2xl lg:text-3xl font-bold">{provider.title}</h3>
                              <Badge className={`${provider.bgColor} ${provider.color} border-0`}>
                                {provider.subtitle}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm lg:text-base line-clamp-2">
                              {provider.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 lg:gap-4">
                          <motion.div 
                            className="px-5 py-2.5 rounded-full bg-success/15 border border-success/30"
                            whileHover={{ scale: 1.05 }}
                          >
                            <span className="text-success font-bold text-sm lg:text-base">{provider.commission}</span>
                          </motion.div>
                          
                          <Button
                            size="lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProceed(provider.type);
                            }}
                            className="gap-2 shadow-md hover:shadow-lg"
                          >
                            {user ? "Candidati" : "Registrati"}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedType(expandedType === provider.type ? null : provider.type);
                            }}
                            className={`${provider.bgColor} hover:${provider.bgColor}`}
                          >
                            {expandedType === provider.type ? (
                              <ChevronUp className={`h-5 w-5 ${provider.color}`} />
                            ) : (
                              <ChevronDown className={`h-5 w-5 ${provider.color}`} />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Content */}
                    <AnimatePresence>
                      {expandedType === provider.type && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <CardContent className="p-6 lg:p-8 border-t border-border/40">
                            {/* Features Grid */}
                            <div className="mb-8">
                              <div className="flex items-center gap-2 mb-6">
                                <div className={`p-2 rounded-lg ${provider.bgColor}`}>
                                  <Sparkles className={`h-5 w-5 ${provider.color}`} />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-lg">Funzionalità Esclusive</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Scopri cosa puoi fare come {provider.title}
                                  </p>
                                </div>
                              </div>

                              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {provider.features.map((feature, i) => (
                                  <motion.div
                                    key={feature.title}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={`p-4 rounded-xl border bg-gradient-to-br ${provider.gradientFrom} ${provider.gradientTo} border-border/30 hover:shadow-md transition-all group`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="p-2.5 rounded-lg bg-background/80 border border-border/50 group-hover:border-border transition-colors shrink-0">
                                        <feature.icon className={`h-5 w-5 ${provider.color}`} />
                                      </div>
                                      <div>
                                        <h5 className="font-semibold text-sm mb-1">{feature.title}</h5>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>

                            {/* Quick Benefits */}
                            <div className="pt-6 border-t border-border/40">
                              <p className="text-sm font-medium mb-4 text-muted-foreground">Vantaggi Principali:</p>
                              <div className="flex flex-wrap gap-3">
                                {provider.benefits.map((benefit, i) => (
                                  <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3 + i * 0.1 }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 border border-border/50 hover:border-success/50 hover:bg-success/5 transition-colors"
                                  >
                                    <CheckCircle className="h-4 w-4 text-success shrink-0" />
                                    <span className="text-sm font-medium">{benefit}</span>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={scaleVariants}
            className="text-center"
          >
            <Card className="overflow-hidden glass-card-strong border-primary/20">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-success/5 to-info/5" />
              <CardContent className="relative p-10 lg:p-16">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Award className="h-16 w-16 mx-auto mb-6 text-primary drop-shadow-glow" />
                </motion.div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                  Pronto a iniziare?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-lg mx-auto text-lg">
                  Unisciti a centinaia di partner che hanno già scelto LabLinkRiparo 
                  per far crescere il loro business.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {user ? (
                    <Button size="lg" onClick={() => navigate("/provider-registration")} className="gap-2 shadow-lg hover:shadow-xl text-lg px-8">
                      <Zap className="h-5 w-5" />
                      Invia la tua Candidatura
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  ) : (
                    <>
                      <Button size="lg" onClick={() => navigate("/auth?redirect=/provider-registration")} className="gap-2 shadow-lg hover:shadow-xl text-lg px-8">
                        <Zap className="h-5 w-5" />
                        Registrati e Candidati
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                      <Button size="lg" variant="outline" onClick={() => navigate("/auth?redirect=/provider-registration")} className="gap-2 border-primary/30 hover:border-primary text-lg px-8">
                        <Shield className="h-5 w-5" />
                        Accedi
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
      <footer className="border-t border-border/40 py-10 bg-background/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.div 
            className="flex items-center justify-center gap-2 mb-3"
            whileHover={{ scale: 1.05 }}
          >
            <div className="p-2 bg-gradient-primary rounded-lg shadow-glow">
              <Wrench className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">LabLinkRiparo</span>
          </motion.div>
          <p className="text-sm text-muted-foreground">
            Gestionale Riparazioni • info@lablinkriparo.it
          </p>
        </div>
      </footer>
    </div>
  );
}
