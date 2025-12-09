import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
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
  Flame
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
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="h-full"
    >
      <Card 
        className="group h-full overflow-hidden cursor-pointer border-border/40 hover:border-primary/40 bg-card hover:shadow-card-hover transition-all duration-300 rounded-2xl"
        onClick={() => navigate(`/usato/${device.id}`)}
      >
        {/* Image Section */}
        <div className="relative aspect-square bg-gradient-to-br from-muted/30 via-muted/50 to-muted/30 overflow-hidden">
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
          
          {displayImage && !imageError ? (
            <img 
              src={displayImage} 
              alt={`${device.brand} ${device.model}`}
              className="w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-500"
              onError={handleImageError}
            />
          ) : isLookingUp ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <DeviceIcon className="relative h-12 w-12 text-muted-foreground/50 animate-pulse" />
              </div>
              <span className="text-xs text-muted-foreground">Caricamento...</span>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <div className="p-4 rounded-2xl bg-muted/50">
                <DeviceIcon className="h-12 w-12 text-muted-foreground/40" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">{device.brand}</span>
            </div>
          )}
          
          {/* Top Badges Row */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-20">
            {/* Left: Condition + Discount */}
            <div className="flex flex-col gap-1.5">
              <Badge className={`${conditionInfo.bgClass} ${conditionInfo.textClass} border-0 font-medium text-xs`}>
                {conditionInfo.label}
              </Badge>
              {discountPercent > 0 && (
                <Badge className="bg-destructive/90 text-destructive-foreground border-0 font-bold text-xs">
                  -{discountPercent}%
                </Badge>
              )}
            </div>

            {/* Right: Warranty */}
            {device.warranty_months > 0 && (
              <Badge className="bg-card/90 backdrop-blur-sm text-foreground border border-border/50 gap-1 font-medium text-xs">
                <Shield className="h-3 w-3 text-success" />
                {device.warranty_months}m
              </Badge>
            )}
          </div>
          
          {/* Bottom Badges Row */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between z-20">
            {/* AI Badge */}
            {showAiBadge && (
              <Badge className="bg-primary/90 text-primary-foreground border-0 gap-1 text-xs">
                <Sparkles className="h-3 w-3" />
                AI
              </Badge>
            )}
            
            {/* Interest + Views */}
            <div className="flex flex-col gap-1.5 items-end ml-auto">
              {hasInterest && (
                <Badge className="bg-orange-500/90 text-white border-0 gap-1 text-xs animate-pulse">
                  <Flame className="h-3 w-3" />
                  {device.reservation_count} {device.reservation_count === 1 ? 'richiesta' : 'richieste'}
                </Badge>
              )}
              <Badge className="bg-card/80 backdrop-blur-sm text-muted-foreground border border-border/50 gap-1 text-xs">
                <Eye className="h-3 w-3" />
                {device.views_count}
              </Badge>
            </div>
          </div>
        </div>

        <CardContent className={compact ? "p-3" : "p-4"}>
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
            <p className="text-[10px] text-primary uppercase tracking-wider font-semibold">
              {device.brand}
            </p>
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
              <p className={`font-bold text-gradient ${compact ? "text-xl" : "text-2xl"}`}>
                €{device.price.toLocaleString()}
              </p>
              {device.original_price && device.original_price > device.price && (
                <p className="text-xs text-muted-foreground line-through">
                  €{device.original_price.toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs font-medium">Scopri</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
