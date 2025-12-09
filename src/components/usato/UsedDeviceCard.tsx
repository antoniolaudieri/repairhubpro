import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Smartphone, 
  Tablet, 
  Laptop, 
  Monitor, 
  Shield, 
  Eye,
  ArrowRight,
  Sparkles
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
  centro?: {
    business_name: string;
    logo_url: string | null;
  };
}

interface UsedDeviceCardProps {
  device: UsedDevice;
  compact?: boolean;
}

const conditionLabels: Record<string, { label: string; color: string }> = {
  ricondizionato: { label: "Ricondizionato", color: "bg-success text-success-foreground" },
  usato_ottimo: { label: "Usato Ottimo", color: "bg-primary text-primary-foreground" },
  usato_buono: { label: "Usato Buono", color: "bg-info text-info-foreground" },
  usato_discreto: { label: "Usato Discreto", color: "bg-warning text-warning-foreground" },
  alienato: { label: "Alienato", color: "bg-muted text-muted-foreground" },
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

const getFallbackImageUrls = (brand: string, deviceType: string): string[] => {
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
  const conditionInfo = conditionLabels[device.condition] || conditionLabels.usato_buono;
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
    const fallbacks = getFallbackImageUrls(device.brand, device.device_type);
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

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card 
        className="group overflow-hidden cursor-pointer border-border/50 hover:border-primary/50 hover:shadow-elegant transition-all duration-300"
        onClick={() => navigate(`/usato/${device.id}`)}
      >
        {/* Image Section */}
        <div className="relative aspect-square bg-gradient-to-br from-muted/50 to-muted overflow-hidden">
          {displayImage && !imageError ? (
            <img 
              src={displayImage} 
              alt={`${device.brand} ${device.model}`}
              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
              onError={handleImageError}
            />
          ) : isLookingUp ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <div className="animate-pulse">
                <DeviceIcon className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <span className="text-xs text-muted-foreground">Caricamento...</span>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <DeviceIcon className="h-16 w-16 text-muted-foreground/50" />
              <span className="text-xs text-muted-foreground font-medium">{device.brand}</span>
            </div>
          )}
          
          {/* AI Badge */}
          {showAiBadge && (
            <div className="absolute bottom-2 left-2">
              <Badge variant="secondary" className="gap-1 text-xs bg-primary/10 text-primary border-primary/20">
                <Sparkles className="h-3 w-3" />
                AI
              </Badge>
            </div>
          )}
          
          {/* Badges Overlay */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <Badge className={conditionInfo.color}>
              {conditionInfo.label}
            </Badge>
            {discountPercent > 0 && (
              <Badge className="bg-destructive text-destructive-foreground">
                -{discountPercent}%
              </Badge>
            )}
          </div>

          {/* Warranty Badge */}
          {device.warranty_months > 0 && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" />
                {device.warranty_months}m
              </Badge>
            </div>
          )}

          {/* Views */}
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="gap-1 text-xs opacity-80">
              <Eye className="h-3 w-3" />
              {device.views_count}
            </Badge>
          </div>
        </div>

        <CardContent className={compact ? "p-3" : "p-4"}>
          {/* Centro Badge */}
          {device.centro && (
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
              {device.centro.logo_url ? (
                <img 
                  src={device.centro.logo_url} 
                  alt={device.centro.business_name}
                  className="h-5 w-5 rounded object-contain"
                />
              ) : (
                <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary">
                    {device.centro.business_name.charAt(0)}
                  </span>
                </div>
              )}
              <span className="text-[10px] text-muted-foreground truncate">
                {device.centro.business_name}
              </span>
            </div>
          )}
          
          {/* Brand & Model */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {device.brand}
            </p>
            <h3 className={`font-semibold text-foreground line-clamp-1 ${compact ? "text-sm" : "text-base"}`}>
              {device.model}
            </h3>
            {device.storage_capacity && (
              <p className="text-xs text-muted-foreground">
                {device.storage_capacity} {device.color && `• ${device.color}`}
              </p>
            )}
          </div>

          {/* Price */}
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className={`font-bold text-primary ${compact ? "text-lg" : "text-xl"}`}>
                €{device.price.toLocaleString()}
              </p>
              {device.original_price && device.original_price > device.price && (
                <p className="text-xs text-muted-foreground line-through">
                  €{device.original_price.toLocaleString()}
                </p>
              )}
            </div>
            <Button size="sm" variant="ghost" className="gap-1 group-hover:text-primary">
              <span className="text-xs">Dettagli</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
