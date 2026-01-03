import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Eye, Edit, Trash2, DollarSign, Smartphone, Tablet, Laptop, 
  Monitor, Watch, HelpCircle, Handshake, ShoppingCart, Clock, Bell, Users 
} from "lucide-react";
import { useDeviceInterestCount } from "@/hooks/useDeviceInterestCount";
interface UsatoDeviceCardProps {
  device: {
    id: string;
    brand: string;
    model: string;
    device_type: string;
    storage_capacity?: string;
    color?: string;
    condition: string;
    price: number;
    original_price?: number;
    status: string;
    sale_type?: string;
    photos?: string[];
    owner_payout?: number;
    centro_net_margin?: number;
  };
  onEdit: (device: any) => void;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkAsSold: (id: string) => void;
  onNotifyInterested?: (device: any, matchingInterests: number) => void;
}

const conditionLabels: Record<string, { label: string; color: string }> = {
  ricondizionato: { label: "Ricondizionato", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  usato_ottimo: { label: "Ottimo", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  usato_buono: { label: "Buono", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  usato_discreto: { label: "Discreto", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  alienato: { label: "Alienato", color: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
};

const saleTypeLabels: Record<string, { label: string; icon: typeof ShoppingCart }> = {
  acquistato: { label: "Acquistato", icon: ShoppingCart },
  alienato: { label: "Alienato", icon: Clock },
  conto_vendita: { label: "Conto Vendita", icon: Handshake },
};

const getDeviceIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'smartphone': return Smartphone;
    case 'tablet': return Tablet;
    case 'laptop': return Laptop;
    case 'pc': return Monitor;
    case 'smartwatch': return Watch;
    default: return HelpCircle;
  }
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'draft': return { label: 'Bozza', className: 'bg-muted text-muted-foreground' };
    case 'published': return { label: 'Pubblicato', className: 'bg-emerald-500 text-white' };
    case 'reserved': return { label: 'Prenotato', className: 'bg-amber-500 text-white' };
    case 'sold': return { label: 'Venduto', className: 'bg-primary text-primary-foreground' };
    default: return { label: status, className: 'bg-muted text-muted-foreground' };
  }
};

export function UsatoDeviceCard({ device, onEdit, onPublish, onDelete, onMarkAsSold, onNotifyInterested }: UsatoDeviceCardProps) {
  const DeviceIcon = getDeviceIcon(device.device_type);
  const conditionConfig = conditionLabels[device.condition] || { label: device.condition, color: 'bg-muted' };
  const saleType = saleTypeLabels[device.sale_type || 'acquistato'];
  const SaleIcon = saleType?.icon || ShoppingCart;
  const statusConfig = getStatusConfig(device.status);
  
  const { matchingInterests, notifiedCount } = useDeviceInterestCount(
    device.device_type,
    device.brand,
    device.price,
    device.status
  );
  
  const discount = device.original_price && device.original_price > device.price
    ? Math.round(((device.original_price - device.price) / device.original_price) * 100)
    : null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-lg transition-all"
    >
      {/* Status badge */}
      <div className="absolute top-3 right-3 z-10">
        <Badge className={`${statusConfig.className} text-[10px] px-2`}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Discount badge */}
      {discount && discount > 0 && (
        <div className="absolute top-3 left-3 z-10">
          <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] px-2 border-0">
            -{discount}%
          </Badge>
        </div>
      )}

      {/* Image / Icon */}
      <div className="relative h-32 bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center overflow-hidden">
        {device.photos && device.photos.length > 0 ? (
          <img 
            src={device.photos[0]} 
            alt={`${device.brand} ${device.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <DeviceIcon className="h-10 w-10" />
            <span className="text-[10px] uppercase tracking-wider font-medium">{device.brand}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{device.brand}</p>
          <h3 className="font-semibold text-sm line-clamp-1">{device.model}</h3>
          {(device.storage_capacity || device.color) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {[device.storage_capacity, device.color].filter(Boolean).join(' • ')}
            </p>
          )}
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${conditionConfig.color}`}>
            {conditionConfig.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
            <SaleIcon className="h-2.5 w-2.5" />
            {saleType?.label}
          </Badge>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-primary">€{device.price.toLocaleString()}</span>
          {device.original_price && device.original_price > device.price && (
            <span className="text-xs text-muted-foreground line-through">€{device.original_price}</span>
          )}
        </div>

        {/* Interest notifications badge - Only for published devices */}
        {device.status === 'published' && matchingInterests > 0 && (
          <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-muted-foreground">Interessati:</span>
              <span className="font-semibold text-violet-600">{matchingInterests}</span>
            </div>
            <div className="flex items-center gap-2">
              {notifiedCount > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-0.5 bg-emerald-500/10 text-emerald-600">
                  <Bell className="h-2.5 w-2.5" />
                  {notifiedCount}
                </Badge>
              )}
              {onNotifyInterested && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px] text-violet-600 hover:text-violet-700 hover:bg-violet-500/20"
                  onClick={() => onNotifyInterested(device, matchingInterests)}
                >
                  <Bell className="h-3 w-3 mr-1" />
                  Notifica
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Sold margin info */}
        {device.status === 'sold' && device.centro_net_margin && device.centro_net_margin > 0 && (
          <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-muted-foreground">Netto:</span>
            <span className="font-semibold text-emerald-600">€{device.centro_net_margin.toFixed(2)}</span>
          </div>
        )}

        {/* Consignment payout info */}
        {device.sale_type === 'conto_vendita' && device.status === 'sold' && device.owner_payout && device.owner_payout > 0 && (
          <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-primary/10 border border-primary/20">
            <span className="text-muted-foreground">Cliente:</span>
            <span className="font-semibold">€{device.owner_payout.toFixed(2)}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {device.status === 'draft' && (
            <Button 
              size="sm" 
              variant="default" 
              onClick={() => onPublish(device.id)} 
              className="flex-1 h-8 text-xs gap-1"
            >
              <Eye className="h-3 w-3" />
              Pubblica
            </Button>
          )}
          {(device.status === 'published' || device.status === 'reserved') && (
            <Button 
              size="sm" 
              onClick={() => onMarkAsSold(device.id)} 
              className="flex-1 h-8 text-xs gap-1 bg-emerald-500 hover:bg-emerald-600"
            >
              <DollarSign className="h-3 w-3" />
              Venduto
            </Button>
          )}
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => onEdit(device)}
            className="h-8 w-8"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          {device.status !== 'sold' && (
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => onDelete(device.id)}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
