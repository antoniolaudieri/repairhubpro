import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { FeatureShowcase } from "@/components/partner/FeatureShowcase";
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
  Rocket,
  Target,
  Crown,
  Tv,
} from "lucide-react";

type ProviderType = "corner" | "riparatore" | "centro";

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
  { icon: Tv, title: "Pubblicità DOOH", description: "Monetizza il tuo monitor vendendo spazi pubblicitari settimanali ad attività locali della tua zona." },
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
    borderColor: "border-success/30",
    glowColor: "shadow-[0_0_60px_hsl(142_76%_36%/0.2)]",
    commission: "Fino al 80% sul margine",
    features: centroFeatures,
    benefits: ["Gestionale completo incluso", "Rete di Corner per nuovi clienti", "Marketplace dispositivi usati", "Reportistica e analytics avanzati"],
  },
  {
    type: "corner" as const,
    title: "Corner",
    subtitle: "Punto di Raccolta",
    description: "Sei un negozio di telefonia, tabaccheria o attività commerciale? Diventa un punto di raccolta dispositivi, guadagna segnalando riparazioni e monetizza il tuo monitor con pubblicità locali.",
    icon: Store,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    glowColor: "shadow-[0_0_60px_hsl(217_91%_60%/0.2)]",
    commission: "10% sul margine",
    features: cornerFeatures,
    benefits: ["Nessun investimento iniziale", "Guadagno su ogni riparazione", "Guadagna dalla pubblicità locale", "Aumenti traffico nel negozio", "Formazione e supporto inclusi"],
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
    glowColor: "shadow-[0_0_60px_hsl(199_89%_48%/0.2)]",
    commission: "60% sul margine",
    features: riparatoreFeatures,
    benefits: ["Lavori nella tua zona", "Flessibilità totale sugli orari", "Accesso a ricambi scontati", "Pagamenti rapidi e sicuri"],
  },
];

export default function DiventaPartner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expandedType, setExpandedType] = useState<ProviderType | null>("centro");
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  const handleProceed = (type: ProviderType) => {
    if (user) {
      navigate(`/provider-registration?type=${type}`);
    } else {
      navigate(`/auth?redirect=/provider-registration?type=${type}`);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Premium Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(217_91%_60%/0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(142_76%_36%/0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(199_89%_48%/0.06),transparent_50%)]" />
        
        {/* Animated orbs */}
        <motion.div 
          className="absolute top-[10%] left-[15%] w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(217 91% 60% / 0.08) 0%, transparent 70%)" }}
          animate={{ 
            x: [0, 50, 0], 
            y: [0, -30, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-[5%] right-[10%] w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(142 76% 36% / 0.06) 0%, transparent 70%)" }}
          animate={{ 
            x: [0, -40, 0], 
            y: [0, 40, 0],
            scale: [1, 1.15, 1]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(hsl(217_91%_60%/0.02)_1px,transparent_1px),linear-gradient(90deg,hsl(217_91%_60%/0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* Navigation */}
      <nav className="border-b border-border/30 bg-background/60 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate("/")}
          >
            <div className="relative">
              <motion.div 
                className="absolute inset-0 bg-primary/30 rounded-2xl blur-xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <div className="relative p-3 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                <Wrench className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <span className="font-bold text-xl text-foreground tracking-tight">LabLinkRiparo</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-3 items-center"
          >
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2 hover:bg-muted/50 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Button>
            {!user && (
              <Button size="sm" onClick={() => navigate("/auth")} className="gap-2 rounded-xl shadow-md hover:shadow-lg transition-all">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Accedi</span>
              </Button>
            )}
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-4xl mx-auto mb-24"
          >
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-primary/5 border border-primary/20 mb-8"
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-4 w-4 text-primary" />
              </motion.div>
              <span className="text-sm font-semibold text-primary">La Rete Professionale delle Riparazioni</span>
            </motion.div>

            {/* Title */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-8 leading-[1.1] tracking-tight"
            >
              Diventa Partner di
              <br />
              <span className="relative inline-block mt-2">
                <span className="text-gradient-accent">LabLinkRiparo</span>
                <motion.span 
                  className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                />
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto"
            >
              La piattaforma che connette negozi, riparatori e centri assistenza per offrire 
              il miglior servizio di riparazione dispositivi in Italia.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-12 flex flex-wrap justify-center gap-4"
            >
              <Button 
                size="lg" 
                onClick={() => document.getElementById('partner-types')?.scrollIntoView({ behavior: 'smooth' })} 
                className="gap-3 h-14 px-8 text-base rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
              >
                <Rocket className="h-5 w-5" />
                Scopri i Ruoli
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate(user ? "/provider-registration" : "/auth?redirect=/provider-registration")} 
                className="gap-3 h-14 px-8 text-base rounded-2xl border-2 hover:bg-muted/50 transition-all duration-300"
              >
                <Zap className="h-5 w-5" />
                {user ? "Candidati Ora" : "Registrati Gratis"}
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
            >
              {[
                { value: "500+", label: "Partner Attivi" },
                { value: "15K+", label: "Riparazioni/Mese" },
                { value: "98%", label: "Soddisfazione" },
              ].map((stat, i) => (
                <motion.div 
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + i * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl sm:text-4xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Info Cards */}
          <div className="grid lg:grid-cols-2 gap-6 mb-24">
            {/* What is LabLinkRiparo */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="h-full bg-card/50 backdrop-blur-xl border-border/40 overflow-hidden group hover:shadow-xl hover:shadow-primary/5 transition-all duration-500">
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <motion.div 
                        className="absolute inset-0 bg-primary/20 rounded-2xl blur-lg"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      />
                      <div className="relative p-4 bg-gradient-to-br from-primary to-primary/80 rounded-2xl">
                        <HeartHandshake className="h-7 w-7 text-primary-foreground" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Cos'è LabLinkRiparo?</h2>
                      <p className="text-muted-foreground">Ecosistema completo per riparazioni</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-8 leading-relaxed text-lg">
                    Mettiamo in contatto <strong className="text-foreground">negozi</strong>, 
                    <strong className="text-foreground"> tecnici</strong> e 
                    <strong className="text-foreground"> laboratori</strong> per creare una rete efficiente 
                    che garantisce riparazioni rapide e professionali.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { icon: Smartphone, text: "Gestionale Pro", color: "primary" },
                      { icon: TrendingUp, text: "Commissioni Chiare", color: "success" },
                      { icon: Users, text: "Rete Partner", color: "info" },
                      { icon: Globe, text: "Marketplace", color: "warning" },
                    ].map((item, i) => (
                      <motion.div 
                        key={item.text}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className={`flex items-center gap-3 p-4 rounded-xl bg-${item.color}/5 border border-${item.color}/20 cursor-default`}
                      >
                        <div className={`p-2 rounded-lg bg-${item.color}/10`}>
                          <item.icon className={`h-5 w-5 text-${item.color}`} />
                        </div>
                        <span className="font-medium">{item.text}</span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Founder Story */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="h-full bg-card/50 backdrop-blur-xl border-border/40 overflow-hidden group hover:shadow-xl hover:shadow-warning/5 transition-all duration-500">
                <CardContent className="p-8">
                  <div className="flex items-start gap-5 mb-8">
                    <motion.div 
                      className="relative shrink-0"
                      whileHover={{ scale: 1.05 }}
                    >
                      <motion.div 
                        className="absolute inset-0 bg-warning/20 rounded-2xl blur-lg"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      />
                      <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-warning to-warning/80 flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-warning-foreground">RC</span>
                      </div>
                      <div className="absolute -bottom-1 -right-1 p-1.5 bg-card rounded-lg border border-border shadow-sm">
                        <Crown className="h-4 w-4 text-warning" />
                      </div>
                    </motion.div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-warning/10 text-warning border-warning/20 hover:bg-warning/10">
                          <Award className="h-3 w-3 mr-1" />
                          Fondatore
                        </Badge>
                      </div>
                      <h3 className="text-2xl font-bold">Riccardo Casagrande</h3>
                      <p className="text-muted-foreground">Imperia • Nel settore dal 2012</p>
                    </div>
                  </div>
                  <div className="space-y-5 text-muted-foreground leading-relaxed">
                    <p className="text-lg">
                      <strong className="text-foreground">Nel 2012</strong> ho fondato il mio laboratorio partendo dal nulla. 
                      Anni di esperienza mi hanno insegnato le sfide quotidiane dei riparatori.
                    </p>
                    <motion.blockquote 
                      className="relative border-l-4 border-warning/50 pl-6 py-4 bg-warning/5 rounded-r-xl italic text-lg"
                      whileHover={{ x: 5 }}
                    >
                      <span className="absolute -left-3 -top-2 text-4xl text-warning/30">"</span>
                      LabLinkRiparo racchiude tutta la passione che dedico da anni. 
                      Sono sicuro aiuterà a incrementare fatturato e benessere di tutti i partner.
                    </motion.blockquote>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Section */}
      <FeatureShowcase />

      {/* Partner Types Section */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div id="partner-types" className="mb-24">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <Badge className="mb-4 px-4 py-2 text-sm bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                <Target className="h-4 w-4 mr-2" />
                Scegli il Tuo Ruolo
              </Badge>
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
                Tre Modi per <span className="text-gradient-accent">Crescere</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Ogni ruolo offre opportunità uniche per aumentare i tuoi guadagni
              </p>
            </motion.div>

            <div className="space-y-6">
              {providerTypes.map((provider, index) => {
                const isExpanded = expandedType === provider.type;
                const Icon = provider.icon;

                return (
                  <motion.div
                    key={provider.type}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.15 }}
                  >
                    <Card 
                      className={`
                        relative overflow-hidden transition-all duration-500 cursor-pointer
                        bg-card/60 backdrop-blur-xl border-2
                        ${isExpanded ? `${provider.borderColor} ${provider.glowColor}` : 'border-border/40 hover:border-border'}
                      `}
                      onClick={() => setExpandedType(isExpanded ? null : provider.type)}
                    >
                      {/* Background gradient when expanded */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`absolute inset-0 ${provider.bgColor} pointer-events-none`}
                          />
                        )}
                      </AnimatePresence>

                      <CardContent className="relative p-6 sm:p-8">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-5">
                            <motion.div 
                              className={`relative p-4 rounded-2xl ${provider.bgColor} border ${provider.borderColor}`}
                              whileHover={{ scale: 1.05, rotate: 5 }}
                            >
                              <Icon className={`h-8 w-8 ${provider.color}`} />
                            </motion.div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-2xl font-bold">{provider.title}</h3>
                                <Badge className={`${provider.bgColor} ${provider.color} border-0 font-semibold`}>
                                  {provider.commission}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground">{provider.subtitle}</p>
                            </div>
                          </div>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            className={`p-2 rounded-xl ${provider.bgColor} shrink-0`}
                          >
                            <ChevronDown className={`h-6 w-6 ${provider.color}`} />
                          </motion.div>
                        </div>

                        <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
                          {provider.description}
                        </p>

                        {/* Quick benefits */}
                        <div className="flex flex-wrap gap-2 mt-5">
                          {provider.benefits.map((benefit, i) => (
                            <motion.div
                              key={benefit}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-sm"
                            >
                              <CheckCircle className={`h-4 w-4 ${provider.color}`} />
                              <span>{benefit}</span>
                            </motion.div>
                          ))}
                        </div>

                        {/* Expanded Features */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden"
                            >
                              <div className="pt-8 mt-8 border-t border-border/50">
                                <h4 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                  <Sparkles className={`h-5 w-5 ${provider.color}`} />
                                  Funzionalità Incluse
                                </h4>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {provider.features.map((feature, i) => {
                                    const FeatureIcon = feature.icon;
                                    return (
                                      <motion.div
                                        key={feature.title}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        onMouseEnter={() => setHoveredFeature(feature.title)}
                                        onMouseLeave={() => setHoveredFeature(null)}
                                        className={`
                                          group/feature p-5 rounded-2xl border transition-all duration-300
                                          ${hoveredFeature === feature.title 
                                            ? `${provider.bgColor} ${provider.borderColor} shadow-lg` 
                                            : 'bg-muted/30 border-border/30 hover:border-border/50'
                                          }
                                        `}
                                      >
                                        <div className="flex items-start gap-4">
                                          <div className={`p-2.5 rounded-xl ${provider.bgColor} shrink-0 group-hover/feature:scale-110 transition-transform`}>
                                            <FeatureIcon className={`h-5 w-5 ${provider.color}`} />
                                          </div>
                                          <div>
                                            <h5 className="font-semibold mb-1">{feature.title}</h5>
                                            <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                                          </div>
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                                </div>

                                {/* CTA Button */}
                                <motion.div 
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.3 }}
                                  className="mt-8 flex justify-center"
                                >
                                  <Button 
                                    size="lg" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleProceed(provider.type);
                                    }}
                                    className={`gap-3 h-14 px-10 text-base rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300`}
                                  >
                                    <Zap className="h-5 w-5" />
                                    Diventa {provider.title}
                                    <ArrowRight className="h-5 w-5" />
                                  </Button>
                                </motion.div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Community CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 border border-primary/20 p-10 sm:p-16 text-center"
          >
            <motion.div 
              className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl"
              animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
              transition={{ duration: 10, repeat: Infinity }}
            />
            <motion.div 
              className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl"
              animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
              transition={{ duration: 12, repeat: Infinity }}
            />
            
            <div className="relative">
              <motion.div 
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary/80 shadow-xl shadow-primary/20 mb-8"
              >
                <Users className="h-10 w-10 text-primary-foreground" />
              </motion.div>
              
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Unisciti alla Community <span className="text-gradient-accent">LabLinkPro</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                Siamo una rete di laboratori connessi che crescono insieme. 
                Le nuove funzionalità vengono sviluppate ascoltando i partner.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4">
                <Button 
                  size="lg" 
                  onClick={() => navigate(user ? "/provider-registration" : "/auth?redirect=/provider-registration")}
                  className="gap-3 h-14 px-10 text-base rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                >
                  <Rocket className="h-5 w-5" />
                  Inizia Ora
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-background/60 backdrop-blur-xl py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-xl">
                <Wrench className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">LabLinkRiparo</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              © {new Date().getFullYear()} LabLinkRiparo. Tutti i diritti riservati.
            </p>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
              Torna alla Home
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
