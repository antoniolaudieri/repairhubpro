import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Monitor, Brain, Users, Package, BarChart3, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DashboardMockup,
  AIQuotesMockup,
  CustomerAnalyticsMockup,
  InventoryMockup,
  DisplayAdsMockup,
  MarketplaceMockup,
} from "./CentroFeatureMockups";

const features = [
  {
    id: "dashboard",
    title: "Dashboard Completa",
    subtitle: "Tutto sotto controllo",
    description: "Monitora riparazioni, fatturato, clienti e obiettivi in tempo reale con grafici intuitivi e widget personalizzabili.",
    icon: BarChart3,
    color: "primary",
    component: DashboardMockup,
  },
  {
    id: "ai-quotes",
    title: "Preventivi con IA",
    subtitle: "Intelligenza artificiale al servizio",
    description: "L'IA suggerisce automaticamente ricambi, manodopera e servizi aggiuntivi basandosi sul problema segnalato.",
    icon: Brain,
    color: "success",
    component: AIQuotesMockup,
  },
  {
    id: "analytics",
    title: "Analytics Clienti IA",
    subtitle: "Predici il futuro",
    description: "Scoring clienti, predizioni di ritorno e agente IA per analizzare comportamenti e massimizzare la retention.",
    icon: Users,
    color: "info",
    component: CustomerAnalyticsMockup,
  },
  {
    id: "inventory",
    title: "Inventario & Ordini",
    subtitle: "Gestione intelligente",
    description: "Gestisci ricambi, scorte e ordini con integrazione diretta Utopya per acquisti rapidi e automatizzati.",
    icon: Package,
    color: "warning",
    component: InventoryMockup,
  },
  {
    id: "display",
    title: "Display Pubblicitario",
    subtitle: "Monetizza l'attesa",
    description: "Schermo esterno per pubblicità personalizzate che intrattiene i clienti e genera revenue aggiuntive.",
    icon: Monitor,
    color: "destructive",
    component: DisplayAdsMockup,
  },
  {
    id: "marketplace",
    title: "Marketplace Usato",
    subtitle: "Seconda vita ai device",
    description: "Pubblica dispositivi usati con valutazione IA istantanea e raggiungi clienti interessati automaticamente.",
    icon: ShoppingCart,
    color: "primary",
    component: MarketplaceMockup,
  },
];

export function FeatureShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % features.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % features.length);
  };

  const goToPrev = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + features.length) % features.length);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  const currentFeature = features[currentIndex];
  const CurrentComponent = currentFeature.component;

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-transparent to-muted/20" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 px-4 py-1.5">
            <Monitor className="h-3.5 w-3.5 mr-2" />
            Anteprima Funzionalità
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Scopri il <span className="text-gradient-accent">Gestionale</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Esplora le funzionalità avanzate che trasformeranno il tuo centro assistenza
          </p>
        </motion.div>

        {/* Carousel */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Side - Info */}
          <motion.div
            key={currentFeature.id + "-info"}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.4 }}
            className="order-2 lg:order-1"
          >
            <div className="space-y-6">
              {/* Feature Badge */}
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl bg-${currentFeature.color}/10 border border-${currentFeature.color}/20`}>
                  <currentFeature.icon className={`h-6 w-6 text-${currentFeature.color}`} />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {currentIndex + 1} / {features.length}
                </Badge>
              </div>

              {/* Title */}
              <div>
                <h3 className="text-3xl sm:text-4xl font-bold mb-2">{currentFeature.title}</h3>
                <p className={`text-lg text-${currentFeature.color}`}>{currentFeature.subtitle}</p>
              </div>

              {/* Description */}
              <p className="text-muted-foreground text-lg leading-relaxed">
                {currentFeature.description}
              </p>

              {/* Navigation */}
              <div className="flex items-center gap-4 pt-4">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={goToPrev}
                  className="rounded-xl h-12 w-12 border-2 hover:bg-muted/50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={goToNext}
                  className="rounded-xl h-12 w-12 border-2 hover:bg-muted/50"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>

                {/* Dots */}
                <div className="flex items-center gap-2 ml-4">
                  {features.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        index === currentIndex 
                          ? 'w-8 bg-primary' 
                          : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Auto-play indicator */}
              {isAutoPlaying && (
                <motion.div 
                  className="h-1 bg-primary/20 rounded-full overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div 
                    className="h-full bg-primary rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 6, ease: "linear" }}
                    key={currentIndex}
                  />
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Right Side - Mockup */}
          <motion.div
            key={currentFeature.id + "-mockup"}
            initial={{ opacity: 0, x: 30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -30, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="order-1 lg:order-2"
          >
            <div className="relative">
              {/* Glow effect */}
              <div className={`absolute inset-0 bg-${currentFeature.color}/10 blur-3xl rounded-3xl`} />
              
              {/* Mockup Component */}
              <div className="relative">
                <CurrentComponent />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Feature Quick Nav */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-16 grid grid-cols-3 md:grid-cols-6 gap-3"
        >
          {features.map((feature, index) => (
            <button
              key={feature.id}
              onClick={() => goToSlide(index)}
              className={`p-4 rounded-xl border transition-all duration-300 text-center ${
                index === currentIndex
                  ? `bg-${feature.color}/10 border-${feature.color}/30 shadow-lg`
                  : 'bg-muted/30 border-border/30 hover:bg-muted/50'
              }`}
            >
              <feature.icon className={`h-5 w-5 mx-auto mb-2 ${
                index === currentIndex ? `text-${feature.color}` : 'text-muted-foreground'
              }`} />
              <div className="text-xs font-medium truncate">{feature.title}</div>
            </button>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
