import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { UsedDeviceCard } from "./UsedDeviceCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  ArrowRight 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export function UsedDevicesCarousel() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

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
      setDevices(data || []);
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
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square rounded-xl" />
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

  return (
    <section className="py-16 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wide">
                Marketplace
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Dispositivi Usati & Ricondizionati
            </h2>
          </motion.div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="hidden md:flex"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={currentIndex >= maxIndex}
              className="hidden md:flex"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="glow" 
              onClick={() => navigate("/usato")}
              className="gap-2"
            >
              Vedi Tutti
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Carousel */}
        <div className="relative">
          <motion.div 
            className="flex gap-4"
            animate={{ x: -currentIndex * (100 / itemsPerView + 1) + "%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {devices.map((device, index) => (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex-shrink-0 w-[calc(50%-8px)] md:w-[calc(25%-12px)]"
              >
                <UsedDeviceCard device={device} compact />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}