import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { UsedDeviceCard } from "./UsedDeviceCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  ArrowRight,
  Smartphone,
  TrendingUp,
  Shield,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export function UsedDevicesCarousel() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState({ total: 0, avgDiscount: 0 });

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from("used_devices")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(8);

      if (error) throw error;
      
      const devicesWithReservations = data || [];
      
      // Calculate stats
      const avgDiscount = devicesWithReservations.reduce((acc, d) => {
        if (d.original_price && d.price < d.original_price) {
          return acc + ((d.original_price - d.price) / d.original_price * 100);
        }
        return acc;
      }, 0) / Math.max(devicesWithReservations.length, 1);
      
      setStats({ 
        total: devicesWithReservations.length,
        avgDiscount: Math.round(avgDiscount)
      });
      setDevices(devicesWithReservations);
    } catch (error) {
      console.error("Error fetching used devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const itemsPerView = 4;
  const maxIndex = Math.max(0, devices.length - itemsPerView);

  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(maxIndex, prev + 1));
  };

  if (loading) {
    return (
      <section className="py-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-12 w-72" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square rounded-2xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (devices.length === 0) {
    return null;
  }

  const features = [
    { icon: Shield, label: "Garanzia inclusa" },
    { icon: TrendingUp, label: "Prezzi competitivi" },
    { icon: Zap, label: "Consegna rapida" },
  ];

  return (
    <section className="py-12 relative overflow-hidden">
      {/* Animated background decorations */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Badge 
                variant="outline" 
                className="px-4 py-1.5 bg-primary/10 border-primary/20 text-primary gap-2 text-sm font-medium"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Marketplace Usato
              </Badge>
            </motion.div>
            
            {/* Title */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              Dispositivi{" "}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                Ricondizionati
              </span>
            </h2>
            
            {/* Subtitle with stats */}
            <p className="text-muted-foreground max-w-lg">
              Scopri smartphone e tablet verificati dai nostri tecnici. 
              {stats.avgDiscount > 0 && (
                <span className="text-primary font-medium"> Risparmia fino al {stats.avgDiscount}%</span>
              )}
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2">
              {features.map((feature, idx) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                >
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 text-xs text-muted-foreground">
                    <feature.icon className="h-3 w-3 text-primary" />
                    {feature.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Navigation Controls */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-3"
          >
            {/* Carousel navigation */}
            <div className="hidden md:flex items-center gap-2 p-1 rounded-full bg-muted/50 border border-border/50">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="h-8 w-8 rounded-full hover:bg-background disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {/* Progress dots */}
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(devices.length, 4) }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentIndex 
                        ? "w-4 bg-primary" 
                        : "w-1.5 bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                disabled={currentIndex >= maxIndex}
                className="h-8 w-8 rounded-full hover:bg-background disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* CTA Button */}
            <Button 
              onClick={() => navigate("/usato")}
              className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
            >
              <Smartphone className="h-4 w-4" />
              Esplora Tutto
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>

        {/* Devices Carousel */}
        <div className="relative">
          {/* Gradient overlays for scroll indication */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none hidden md:block" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none hidden md:block" />
          
          <motion.div 
            className="flex gap-4"
            animate={{ x: -currentIndex * (100 / itemsPerView + 1) + "%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {devices.map((device, index) => (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 200,
                  damping: 20
                }}
                whileHover={{ y: -4 }}
                className="flex-shrink-0 w-[calc(50%-8px)] md:w-[calc(25%-12px)]"
              >
                <UsedDeviceCard device={device} compact />
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Mobile scroll hint */}
        <div className="flex md:hidden justify-center mt-6">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ChevronLeft className="h-3 w-3" />
            <span>Scorri per vedere altri</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </div>

        {/* Bottom CTA for mobile */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 flex md:hidden justify-center"
        >
          <Button 
            onClick={() => navigate("/usato")}
            size="lg"
            className="w-full max-w-sm gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
          >
            <Smartphone className="h-5 w-5" />
            Esplora il Marketplace
            <ArrowRight className="h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
