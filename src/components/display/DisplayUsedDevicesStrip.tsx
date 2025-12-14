import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Laptop, Tablet, Watch, Headphones, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UsedDevice {
  id: string;
  device_type: string;
  brand: string;
  model: string;
  condition: string;
  price: number;
  photos: string[] | null;
  original_price?: number | null;
}

interface DisplayUsedDevicesStripProps {
  cornerId: string;
}

const conditionLabels: Record<string, string> = {
  ricondizionato: "Ricondizionato",
  usato_ottimo: "Ottimo",
  usato_buono: "Buono",
  usato_discreto: "Discreto",
  alienato: "Usato"
};

const getDeviceIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'smartphone': return Smartphone;
    case 'laptop': return Laptop;
    case 'tablet': return Tablet;
    case 'smartwatch': return Watch;
    case 'cuffie': return Headphones;
    default: return Smartphone;
  }
};

export function DisplayUsedDevicesStrip({ cornerId }: DisplayUsedDevicesStripProps) {
  const [devices, setDevices] = useState<UsedDevice[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const itemsPerView = 4;

  useEffect(() => {
    const fetchDevices = async () => {
      const { data, error } = await supabase
        .from('used_devices')
        .select('id, device_type, brand, model, condition, price, photos, original_price')
        .eq('corner_id', cornerId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(12);

      if (!error && data) {
        setDevices(data);
      }
      setIsLoading(false);
    };

    fetchDevices();

    // Real-time subscription
    const channel = supabase
      .channel(`display-used-devices-${cornerId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'used_devices',
        filter: `corner_id=eq.${cornerId}`
      }, () => {
        fetchDevices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cornerId]);

  // Auto-rotation
  useEffect(() => {
    if (devices.length <= itemsPerView) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const maxIndex = Math.max(0, devices.length - itemsPerView);
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [devices.length]);

  if (isLoading || devices.length === 0) return null;

  const visibleDevices = devices.slice(currentIndex, currentIndex + itemsPerView);
  // If we need to wrap around
  const remaining = itemsPerView - visibleDevices.length;
  if (remaining > 0 && devices.length > itemsPerView) {
    visibleDevices.push(...devices.slice(0, remaining));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-white/80">Dispositivi Ricondizionati</span>
        </div>
        <div className="flex gap-1">
          {devices.length > itemsPerView && Array.from({ length: Math.ceil(devices.length / itemsPerView) }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                Math.floor(currentIndex / itemsPerView) === i ? 'bg-emerald-400' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-4 gap-3">
          <AnimatePresence mode="popLayout">
            {visibleDevices.map((device, idx) => {
              const Icon = getDeviceIcon(device.device_type);
              const discount = device.original_price && device.original_price > device.price
                ? Math.round(((device.original_price - device.price) / device.original_price) * 100)
                : null;

              return (
                <motion.div
                  key={`${device.id}-${currentIndex}-${idx}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="relative bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10 hover:border-white/20 transition-all"
                >
                  {/* Discount Badge */}
                  {discount && discount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                      -{discount}%
                    </div>
                  )}

                  <div className="flex gap-3">
                    {/* Image/Icon */}
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {device.photos && device.photos.length > 0 ? (
                        <img
                          src={device.photos[0]}
                          alt={device.model}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Icon className="w-7 h-7 text-white/50" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/50 uppercase tracking-wider truncate">
                        {device.brand}
                      </p>
                      <p className="text-sm font-semibold text-white truncate">
                        {device.model}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-emerald-400 font-bold text-base">
                          €{device.price}
                        </span>
                        {device.original_price && device.original_price > device.price && (
                          <span className="text-white/30 text-xs line-through">
                            €{device.original_price}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Condition Badge */}
                  <div className="mt-2">
                    <span className="inline-block text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                      {conditionLabels[device.condition] || device.condition}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
