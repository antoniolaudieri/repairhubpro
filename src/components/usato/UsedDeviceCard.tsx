import { useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, 
  Tablet, 
  Laptop, 
  Monitor, 
  Shield, 
  Eye,
  ArrowRight,
  Sparkles,
  Users,
  Flame,
  Heart
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface UsedDevice {
  id: string;
  device_type: string;
  brand: string;
  model: string;
  color?: string;
  storage_capacity?: string;
  condition: string;
  price: number;
  original_price?: number;
  photos: string[];
  warranty_months: number;
  views_count: number;
  reservation_count?: number;
  centro?: {
    business_name: string;
    logo_url: string | null;
  };
}

interface UsedDeviceCardProps {
  device: UsedDevice;
  compact?: boolean;
}

const conditionConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
  ricondizionato: { 
    label: "Ricondizionato", 
    bgClass: "bg-success/15",
    textClass: "text-success"
  },
  usato_ottimo: { 
    label: "Ottimo", 
    bgClass: "bg-primary/15",
    textClass: "text-primary"
  },
  usato_buono: { 
    label: "Buono", 
    bgClass: "bg-info/15",
    textClass: "text-info"
  },
  usato_discreto: { 
    label: "Discreto", 
    bgClass: "bg-warning/15",
    textClass: "text-warning"
  },
  alienato: { 
    label: "Alienato", 
    bgClass: "bg-muted",
    textClass: "text-muted-foreground"
  },
};

const getDeviceIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "smartphone": return Smartphone;
    case "tablet": return Tablet;
    case "laptop": return Laptop;
    case "pc": return Monitor;
    default: return Smartphone;
  }
};

// Brand logo fallback URLs
const brandLogos: Record<string, string> = {
  apple: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
  samsung: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg",
  huawei: "https://upload.wikimedia.org/wikipedia/en/0/04/Huawei_Standard_logo.svg",
  xiaomi: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg",
  oppo: "https://upload.wikimedia.org/wikipedia/commons/0/0a/OPPO_LOGO_2019.svg",
  google: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
  oneplus: "https://upload.wikimedia.org/wikipedia/commons/d/d8/OnePlus_logo.svg",
  motorola: "https://upload.wikimedia.org/wikipedia/commons/4/45/Motorola_logo.svg",
  sony: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Sony_logo.svg",
  lg: "https://upload.wikimedia.org/wikipedia/commons/b/bf/LG_logo_%282015%29.svg",
};

const getFallbackImageUrls = (brand: string): string[] => {
  const urls: string[] = [];
  const brandLower = brand.toLowerCase();
  
  if (brandLogos[brandLower]) {
    urls.push(brandLogos[brandLower]);
  }
  
  return urls;
};

export function UsedDeviceCard({ device, compact = false }: UsedDeviceCardProps) {
  const navigate = useNavigate();
  const DeviceIcon = getDeviceIcon(device.device_type);
  const conditionInfo = conditionConfig[device.condition] || conditionConfig.usato_buono;
  const discountPercent = device.original_price 
    ? Math.round((1 - device.price / device.original_price) * 100) 
    : 0;

  const [lookupImage, setLookupImage] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [hasLookedUp, setHasLookedUp] = useState(false);

  // Parallax effect state
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x, { stiffness: 500, damping: 50 });
  const mouseYSpring = useSpring(y, { stiffness: 500, damping: 50 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);
  const glowX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glowY = useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const hasPhotos = device.photos && device.photos.length > 0;

  // Lookup device image if no photos
  const lookupDeviceImage = useCallback(async () => {
    if (hasPhotos || hasLookedUp || !device.brand || !device.model) return;
    
    setIsLookingUp(true);
    setHasLookedUp(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('lookup-device', {
        body: { brand: device.brand, model: device.model }
      });
      
      if (!error && data?.imageUrl) {
        setLookupImage(data.imageUrl);
      }
    } catch (err) {
      console.error("Device lookup error:", err);
    } finally {
      setIsLookingUp(false);
    }
  }, [device.brand, device.model, hasPhotos, hasLookedUp]);

  useEffect(() => {
    if (!hasPhotos) {
      lookupDeviceImage();
    }
  }, [hasPhotos, lookupDeviceImage]);

  const handleImageError = () => {
    const fallbacks = getFallbackImageUrls(device.brand);
    if (fallbackIndex < fallbacks.length) {
      setLookupImage(fallbacks[fallbackIndex]);
      setFallbackIndex(prev => prev + 1);
    } else {
      setImageError(true);
    }
  };

  // Determine which image to show
  const displayImage = hasPhotos ? device.photos[0] : lookupImage;
  const showAiBadge = !hasPhotos && lookupImage && !imageError;
  const hasInterest = device.reservation_count && device.reservation_count > 0;

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="h-full perspective-1000"
    >
      <Card 
        className="group h-full overflow-hidden cursor-pointer border-border/40 bg-card transition-all duration-500 rounded-2xl relative"
        style={{ transformStyle: "preserve-3d" }}
        onClick={() => navigate(`/usato/${device.id}`)}
      >
        {/* Dynamic glow effect */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0"
          style={{
            background: `radial-gradient(circle at ${glowX} ${glowY}, hsl(var(--primary) / 0.15) 0%, transparent 60%)`,
          }}
        />
        
        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-[-1px] rounded-2xl bg-gradient-to-br from-primary/30 via-transparent to-accent/30 blur-sm" />
        </div>

        {/* Image Section */}
        <div className="relative aspect-square bg-gradient-to-br from-muted/20 via-muted/40 to-muted/20 overflow-hidden">
          {/* Animated mesh gradient background */}
          <div className="absolute inset-0 opacity-50">
            <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:translate-x-4 group-hover:translate-y-4 transition-transform duration-700" />
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl group-hover:-translate-x-4 group-hover:-translate-y-4 transition-transform duration-700" />
          </div>
          
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-0 group-hover:opacity-80 transition-opacity duration-500 z-10" />
          
          {displayImage && !imageError ? (
            <motion.img 
              src={displayImage} 
              alt={`${device.brand} ${device.model}`}
              className="w-full h-full object-contain p-6 relative z-[5]"
              style={{ transform: "translateZ(20px)" }}
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.5 }}
              onError={handleImageError}
            />
          ) : isLookingUp ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 relative z-[5]">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <DeviceIcon className="relative h-12 w-12 text-muted-foreground/50 animate-pulse" />
              </div>
              <span className="text-xs text-muted-foreground">Caricamento...</span>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 relative z-[5]">
              <motion.div 
                className="p-4 rounded-2xl bg-muted/50 backdrop-blur-sm"
                whileHover={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.5 }}
              >
                <DeviceIcon className="h-12 w-12 text-muted-foreground/40" />
              </motion.div>
              <span className="text-xs text-muted-foreground font-medium">{device.brand}</span>
            </div>
          )}
          
          {/* Top Badges Row */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-20">
            {/* Left: Condition + Discount */}
            <motion.div 
              className="flex flex-col gap-1.5"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Badge className={`${conditionInfo.bgClass} ${conditionInfo.textClass} border-0 font-medium text-xs shadow-sm`}>
                {conditionInfo.label}
              </Badge>
              {discountPercent > 0 && (
                <Badge className="bg-destructive text-destructive-foreground border-0 font-bold text-xs shadow-lg animate-pulse">
                  -{discountPercent}%
                </Badge>
              )}
            </motion.div>

            {/* Right: Warranty */}
            {device.warranty_months > 0 && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Badge className="bg-card/90 backdrop-blur-md text-foreground border border-border/50 gap-1 font-medium text-xs shadow-sm">
                  <Shield className="h-3 w-3 text-success" />
                  {device.warranty_months}m
                </Badge>
              </motion.div>
            )}
          </div>
          
          {/* Bottom Badges Row */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between z-20">
            {/* AI Badge */}
            {showAiBadge && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.3 }}
              >
                <Badge className="bg-primary/90 text-primary-foreground border-0 gap-1 text-xs shadow-lg">
                  <Sparkles className="h-3 w-3" />
                  AI
                </Badge>
              </motion.div>
            )}
            
            {/* Interest + Views */}
            <div className="flex flex-col gap-1.5 items-end ml-auto">
              {hasInterest && (
                <motion.div
                  initial={{ scale: 0, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", delay: 0.2 }}
                >
                  <Badge className="bg-gradient-to-r from-orange-500 to-rose-500 text-white border-0 gap-1.5 text-xs shadow-lg font-semibold px-2.5 py-1">
                    <Heart className="h-3 w-3 fill-white" />
                    {device.reservation_count} {device.reservation_count === 1 ? 'interessato' : 'interessati'}
                  </Badge>
                </motion.div>
              )}
              <Badge className="bg-card/80 backdrop-blur-md text-muted-foreground border border-border/50 gap-1 text-xs">
                <Eye className="h-3 w-3" />
                {device.views_count}
              </Badge>
            </div>
          </div>
        </div>

        <CardContent className={`${compact ? "p-3" : "p-4"} relative z-10`}>
          {/* Centro Badge */}
          {device.centro && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/30">
              {device.centro.logo_url ? (
                <img 
                  src={device.centro.logo_url} 
                  alt={device.centro.business_name}
                  className="h-5 w-5 rounded-md object-contain"
                />
              ) : (
                <div className="h-5 w-5 rounded-md bg-gradient-primary flex items-center justify-center">
                  <span className="text-[9px] font-bold text-primary-foreground">
                    {device.centro.business_name.charAt(0)}
                  </span>
                </div>
              )}
              <span className="text-[11px] text-muted-foreground truncate font-medium">
                {device.centro.business_name}
              </span>
            </div>
          )}
          
          {/* Brand & Model */}
          <div className="space-y-1.5 mb-4">
            <motion.p 
              className="text-[10px] text-primary uppercase tracking-wider font-semibold"
              style={{ transform: "translateZ(10px)" }}
            >
              {device.brand}
            </motion.p>
            <h3 className={`font-bold text-foreground line-clamp-1 ${compact ? "text-sm" : "text-base"}`}>
              {device.model}
            </h3>
            {device.storage_capacity && (
              <p className="text-xs text-muted-foreground">
                {device.storage_capacity} {device.color && `• ${device.color}`}
              </p>
            )}
          </div>

          {/* Price & CTA */}
          <div className="flex items-end justify-between">
            <div>
              <motion.p 
                className={`font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent ${compact ? "text-xl" : "text-2xl"}`}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                €{device.price.toLocaleString()}
              </motion.p>
              {device.original_price && device.original_price > device.price && (
                <p className="text-xs text-muted-foreground line-through">
                  €{device.original_price.toLocaleString()}
                </p>
              )}
            </div>
            <motion.div 
              className="flex items-center gap-1 text-primary"
              initial={{ opacity: 0, x: -10 }}
              whileHover={{ x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">Scopri</span>
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
