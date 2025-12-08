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
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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

export function UsedDeviceCard({ device, compact = false }: UsedDeviceCardProps) {
  const navigate = useNavigate();
  const DeviceIcon = getDeviceIcon(device.device_type);
  const conditionInfo = conditionLabels[device.condition] || conditionLabels.usato_buono;
  const discountPercent = device.original_price 
    ? Math.round((1 - device.price / device.original_price) * 100) 
    : 0;

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
          {device.photos && device.photos.length > 0 ? (
            <img 
              src={device.photos[0]} 
              alt={`${device.brand} ${device.model}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <DeviceIcon className="h-16 w-16 text-muted-foreground/50" />
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