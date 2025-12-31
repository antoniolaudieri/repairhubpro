import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  Grid3X3, 
  Search, 
  Smartphone, 
  MapPin, 
  LayoutGrid,
  Maximize2,
  Minimize2,
  Eye,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStorageSlots } from "@/hooks/useStorageSlots";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

interface SlotData {
  slot: number;
  repair?: {
    id: string;
    device_type: string;
    device_brand: string;
    device_model: string;
    customer_name: string;
    status: string;
  };
}

interface ShelfMapViewProps {
  centroId: string;
  highlightSlot?: number | null;
  onSlotClick?: (slot: number, repair?: SlotData['repair']) => void;
  compact?: boolean;
}

export function ShelfMapView({ 
  centroId, 
  highlightSlot, 
  onSlotClick,
  compact = false 
}: ShelfMapViewProps) {
  const navigate = useNavigate();
  const { getConfig, formatSlotNumber, getSlotsStats } = useStorageSlots(centroId);
  const [config, setConfig] = useState<{ enabled: boolean; max_slots: number; prefix: string } | null>(null);
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<number | null>(null);
  const [columns, setColumns] = useState(10);
  const [selectedSlot, setSelectedSlot] = useState<SlotData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stats, setStats] = useState<{ occupied: number; total: number; percentage: number } | null>(null);

  useEffect(() => {
    loadData();
  }, [centroId]);

  const loadData = async () => {
    setLoading(true);
    const cfg = await getConfig();
    setConfig(cfg);

    if (cfg?.enabled && cfg.max_slots > 0) {
      // Get devices and repairs - simplified to avoid TS depth issues
      const { data: devicesData } = await (supabase as any)
        .from('devices')
        .select('id, device_type, brand, model, customer_id')
        .eq('centro_id', centroId);

      const devices = (devicesData || []) as Array<{id: string; device_type: string; brand: string; model: string; customer_id: string}>;
      
      // Get customer names
      const customerIds = [...new Set(devices.map(d => d.customer_id).filter(Boolean))];
      let customersMap: Record<string, string> = {};
      if (customerIds.length > 0) {
        const { data: customersData } = await (supabase as any)
          .from('customers')
          .select('id, name')
          .in('id', customerIds);
        (customersData || []).forEach((c: any) => {
          customersMap[c.id] = c.name;
        });
      }

      // Get repairs with storage slots
      const deviceIds = devices.map(d => d.id);
      let repairs: Array<{id: string; storage_slot: number; status: string; device_id: string}> = [];
      if (deviceIds.length > 0) {
        const { data } = await (supabase as any)
          .from('repairs')
          .select('id, storage_slot, status, device_id')
          .in('device_id', deviceIds)
          .not('storage_slot', 'is', null)
          .not('status', 'in', '("delivered","completed","cancelled")');
        repairs = data || [];
      }

      // Build slots array
      const slotsArray: SlotData[] = [];
      for (let i = 1; i <= cfg.max_slots; i++) {
        const repair = repairs.find(r => r.storage_slot === i);
        const device = repair ? devices.find(d => d.id === repair.device_id) : null;
        
        slotsArray.push({
          slot: i,
          repair: repair && device ? {
            id: repair.id,
            device_type: device.device_type || '',
            device_brand: device.brand || '',
            device_model: device.model || '',
            customer_name: customersMap[device.customer_id] || 'N/A',
            status: repair.status
          } : undefined
        });
      }
      setSlots(slotsArray);

      const statsData = await getSlotsStats();
      setStats(statsData);

      // Auto-adjust columns based on total slots
      if (cfg.max_slots <= 20) setColumns(5);
      else if (cfg.max_slots <= 50) setColumns(10);
      else setColumns(Math.min(15, Math.ceil(Math.sqrt(cfg.max_slots))));
    }
    setLoading(false);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResult(null);
      return;
    }

    // Search by slot number, customer name, or device
    const query = searchQuery.toLowerCase();
    const found = slots.find(s => 
      s.slot.toString() === query ||
      s.repair?.customer_name.toLowerCase().includes(query) ||
      s.repair?.device_brand.toLowerCase().includes(query) ||
      s.repair?.device_model.toLowerCase().includes(query)
    );

    setSearchResult(found?.slot || null);
  };

  const handleSlotClick = (slotData: SlotData) => {
    if (onSlotClick) {
      onSlotClick(slotData.slot, slotData.repair);
    } else if (slotData.repair) {
      setSelectedSlot(slotData);
    }
  };

  const getSlotColor = (slotData: SlotData, isHighlighted: boolean, isSearchResult: boolean) => {
    if (isHighlighted) return "from-amber-400 to-orange-500";
    if (isSearchResult) return "from-blue-400 to-cyan-500";
    if (slotData.repair) {
      switch (slotData.repair.status) {
        case 'pending': return "from-yellow-400 to-amber-500";
        case 'in_progress': return "from-blue-400 to-indigo-500";
        case 'waiting_parts': return "from-purple-400 to-pink-500";
        case 'ready': return "from-green-400 to-emerald-500";
        default: return "from-red-400 to-rose-500";
      }
    }
    return "from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800";
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'smartphone':
      case 'phone':
        return '📱';
      case 'tablet':
        return '📱';
      case 'laptop':
        return '💻';
      case 'computer':
      case 'desktop':
        return '🖥️';
      case 'smartwatch':
        return '⌚';
      case 'console':
        return '🎮';
      default:
        return '📱';
    }
  };

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Grid3X3 className="h-8 w-8 text-muted-foreground" />
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  if (!config?.enabled) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Sistema scaffalatura non abilitato</p>
          <p className="text-sm text-muted-foreground">Attivalo dalle impostazioni</p>
        </CardContent>
      </Card>
    );
  }

  const rows = Math.ceil(slots.length / columns);

  const gridContent = (
    <>
      {/* Header with stats and search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Grid3X3 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Mappa Scaffalatura</h3>
            {stats && (
              <Badge variant={stats.percentage > 90 ? "destructive" : stats.percentage > 70 ? "secondary" : "outline"}>
                {stats.occupied}/{stats.total} occupati
              </Badge>
            )}
          </div>
          {stats && (
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/70"
                initial={{ width: 0 }}
                animate={{ width: `${stats.percentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca slot, cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-8"
            />
          </div>
          <Button size="icon" variant="outline" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
          {!compact && (
            <Button 
              size="icon" 
              variant="outline" 
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Column slider */}
      {!compact && (
        <div className="flex items-center gap-4 mb-4">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">Colonne: {columns}</Label>
          <Slider
            value={[columns]}
            onValueChange={([value]) => setColumns(value)}
            min={3}
            max={20}
            step={1}
            className="w-32"
          />
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800" />
          <span className="text-muted-foreground">Libero</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-yellow-400 to-amber-500" />
          <span className="text-muted-foreground">In attesa</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-blue-400 to-indigo-500" />
          <span className="text-muted-foreground">In lavorazione</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-purple-400 to-pink-500" />
          <span className="text-muted-foreground">Attesa ricambi</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-green-400 to-emerald-500" />
          <span className="text-muted-foreground">Pronto</span>
        </div>
      </div>

      {/* Shelf Grid */}
      <div 
        className="grid gap-2 p-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 rounded-xl border-4 border-slate-300 dark:border-slate-700 shadow-inner"
        style={{ 
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        <AnimatePresence>
          {slots.map((slotData, index) => {
            const isHighlighted = highlightSlot === slotData.slot;
            const isSearchResult = searchResult === slotData.slot;
            const isOccupied = !!slotData.repair;

            return (
              <motion.div
                key={slotData.slot}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  ...(isHighlighted || isSearchResult ? {
                    scale: [1, 1.1, 1],
                    transition: { 
                      scale: { repeat: Infinity, duration: 1.5 }
                    }
                  } : {})
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.01, duration: 0.2 }}
                whileHover={{ scale: 1.05, zIndex: 10 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSlotClick(slotData)}
                className={`
                  relative aspect-square rounded-lg cursor-pointer
                  bg-gradient-to-br ${getSlotColor(slotData, isHighlighted, isSearchResult)}
                  shadow-md hover:shadow-xl transition-shadow
                  flex flex-col items-center justify-center
                  min-w-[40px] min-h-[40px]
                  ${isHighlighted || isSearchResult ? 'ring-4 ring-white dark:ring-slate-900 ring-offset-2' : ''}
                  ${isOccupied ? 'text-white' : 'text-slate-600 dark:text-slate-400'}
                `}
              >
                {/* Slot number */}
                <span className="text-[10px] font-bold opacity-80 absolute top-0.5 left-1">
                  {formatSlotNumber(slotData.slot, config.prefix)}
                </span>

                {/* Content */}
                {isOccupied ? (
                  <>
                    <span className="text-lg sm:text-2xl">
                      {getDeviceIcon(slotData.repair!.device_type)}
                    </span>
                    <span className="text-[8px] sm:text-[10px] font-medium truncate max-w-full px-0.5 text-center leading-tight mt-0.5">
                      {slotData.repair!.device_brand}
                    </span>
                  </>
                ) : (
                  <span className="text-lg opacity-30">·</span>
                )}

                {/* Highlight pulse effect */}
                {(isHighlighted || isSearchResult) && (
                  <motion.div
                    className="absolute inset-0 rounded-lg bg-white/30"
                    animate={{ opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}

                {/* Glow effect for occupied slots */}
                {isOccupied && (
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-black/20 to-transparent" />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Shelf legs decoration */}
      <div className="flex justify-between mt-2 px-4">
        {Array.from({ length: Math.min(columns, 8) }).map((_, i) => (
          <div 
            key={i} 
            className="w-3 h-6 bg-gradient-to-b from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700 rounded-b-sm"
          />
        ))}
      </div>
    </>
  );

  return (
    <>
      <Card className={compact ? "border-none shadow-none" : ""}>
        {!compact && (
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Vista Scaffalatura
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={compact ? "p-0" : ""}>
          {gridContent}
        </CardContent>
      </Card>

      {/* Fullscreen modal */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Mappa Scaffalatura - Vista Completa
            </DialogTitle>
          </DialogHeader>
          {gridContent}
        </DialogContent>
      </Dialog>

      {/* Slot detail dialog */}
      <Dialog open={!!selectedSlot} onOpenChange={() => setSelectedSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Slot {selectedSlot && formatSlotNumber(selectedSlot.slot, config?.prefix || '')}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSlot?.repair && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg">
                <div className="text-4xl">
                  {getDeviceIcon(selectedSlot.repair.device_type)}
                </div>
                <div>
                  <h4 className="font-semibold">
                    {selectedSlot.repair.device_brand} {selectedSlot.repair.device_model}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Cliente: {selectedSlot.repair.customer_name}
                  </p>
                  <Badge className="mt-1" variant="outline">
                    {selectedSlot.repair.status === 'pending' && 'In attesa'}
                    {selectedSlot.repair.status === 'in_progress' && 'In lavorazione'}
                    {selectedSlot.repair.status === 'waiting_parts' && 'Attesa ricambi'}
                    {selectedSlot.repair.status === 'ready' && 'Pronto'}
                  </Badge>
                </div>
              </div>

              <Button 
                className="w-full"
                onClick={() => {
                  navigate(`/centro/lavori/${selectedSlot.repair!.id}`);
                  setSelectedSlot(null);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Vai al Dettaglio Riparazione
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
