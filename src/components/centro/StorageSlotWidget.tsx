import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Archive, 
  MapPin, 
  Grid3X3, 
  ChevronRight,
  Plus,
  Check,
  AlertTriangle,
  Loader2,
  X
} from "lucide-react";
import { useStorageSlots } from "@/hooks/useStorageSlots";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface StorageSlotWidgetProps {
  repairId: string;
  centroId: string | null;
  currentSlot: number | null;
  onSlotAssigned?: (slot: number) => void;
}

export function StorageSlotWidget({ 
  repairId, 
  centroId, 
  currentSlot,
  onSlotAssigned 
}: StorageSlotWidgetProps) {
  const { 
    getConfig, 
    getAvailableSlots, 
    getOccupiedSlots,
    assignStorageSlot, 
    releaseStorageSlot,
    formatSlotNumber,
    getSlotsStats
  } = useStorageSlots(centroId);
  
  const [config, setConfig] = useState<{ enabled: boolean; max_slots: number; prefix: string } | null>(null);
  const [availableSlots, setAvailableSlots] = useState<number[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [stats, setStats] = useState<{ occupied: number; total: number; percentage: number } | null>(null);

  useEffect(() => {
    loadData();
  }, [centroId, currentSlot]);

  const loadData = async () => {
    if (!centroId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const cfg = await getConfig();
    setConfig(cfg);

    if (cfg?.enabled) {
      const available = await getAvailableSlots();
      const occupied = await getOccupiedSlots();
      const statsData = await getSlotsStats();
      
      setAvailableSlots(available);
      setOccupiedSlots(occupied.filter(s => s !== currentSlot)); // Exclude current slot from occupied
      setStats(statsData);
    }
    setLoading(false);
  };

  const handleAssign = async (slot: number) => {
    setAssigning(true);
    const success = await assignStorageSlot(repairId, slot);
    if (success) {
      setShowPicker(false);
      onSlotAssigned?.(slot);
    }
    setAssigning(false);
  };

  const handleAutoAssign = async () => {
    if (availableSlots.length === 0) {
      toast.error("Nessuno slot disponibile");
      return;
    }
    await handleAssign(availableSlots[0]);
  };

  const handleRelease = async () => {
    setAssigning(true);
    const success = await releaseStorageSlot(repairId);
    if (success) {
      onSlotAssigned?.(0); // 0 means no slot
    }
    setAssigning(false);
  };

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!config?.enabled || !centroId) {
    return null;
  }

  const columns = config.max_slots <= 20 ? 5 : config.max_slots <= 50 ? 10 : 10;

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                currentSlot 
                  ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {currentSlot ? (
                  <span className="text-lg font-bold">{formatSlotNumber(currentSlot, config.prefix)}</span>
                ) : (
                  <Archive className="h-6 w-6" />
                )}
              </div>
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  Posizione Scaffale
                  {currentSlot && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      Assegnato
                    </Badge>
                  )}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {currentSlot 
                    ? `Slot ${formatSlotNumber(currentSlot, config.prefix)}` 
                    : 'Nessuna posizione assegnata'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentSlot ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowPicker(true)}
                    className="gap-2"
                  >
                    <Grid3X3 className="h-4 w-4" />
                    Cambia
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleRelease}
                    disabled={assigning}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleAutoAssign}
                    disabled={assigning || availableSlots.length === 0}
                    className="gap-2"
                  >
                    {assigning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Auto
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => setShowPicker(true)}
                    disabled={availableSlots.length === 0}
                    className="gap-2"
                  >
                    <MapPin className="h-4 w-4" />
                    Scegli
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Visual mini-map */}
          {currentSlot && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 pt-4 border-t"
            >
              <div className="flex items-center gap-2 mb-2">
                <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Posizione sulla scaffalatura</span>
              </div>
              <div 
                className="grid gap-1 p-2 bg-muted/50 rounded-lg"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: Math.min(config.max_slots, 50) }, (_, i) => i + 1).map((slot) => {
                  const isCurrentSlot = slot === currentSlot;
                  const isOccupied = occupiedSlots.includes(slot);

                  return (
                    <motion.div
                      key={slot}
                      animate={isCurrentSlot ? {
                        scale: [1, 1.2, 1],
                        boxShadow: [
                          '0 0 0 0 rgba(var(--primary), 0.4)',
                          '0 0 0 8px rgba(var(--primary), 0)',
                          '0 0 0 0 rgba(var(--primary), 0)'
                        ]
                      } : {}}
                      transition={isCurrentSlot ? { duration: 2, repeat: Infinity } : {}}
                      className={`
                        aspect-square rounded text-[8px] flex items-center justify-center font-medium
                        ${isCurrentSlot 
                          ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground ring-2 ring-primary ring-offset-1' 
                          : isOccupied 
                            ? 'bg-amber-500/20 text-amber-600' 
                            : 'bg-emerald-500/20 text-emerald-600'
                        }
                      `}
                    >
                      {slot}
                    </motion.div>
                  );
                })}
              </div>
              {config.max_slots > 50 && (
                <p className="text-[10px] text-muted-foreground text-center mt-1">
                  Vista ridotta (50/{config.max_slots} slot)
                </p>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Slot Picker Dialog */}
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Seleziona Posizione Scaffale
            </DialogTitle>
          </DialogHeader>

          {stats && (
            <div className="flex items-center justify-between text-sm mb-4">
              <span className="text-muted-foreground">
                Slot disponibili: <span className="font-semibold text-foreground">{stats.total - stats.occupied}</span>
              </span>
              {stats.percentage >= 90 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Quasi pieno
                </Badge>
              )}
            </div>
          )}

          <div 
            className="grid gap-2 p-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 rounded-xl border-2 border-slate-300 dark:border-slate-700 max-h-[400px] overflow-auto"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: config.max_slots }, (_, i) => i + 1).map((slot) => {
              const isCurrentSlot = slot === currentSlot;
              const isOccupied = occupiedSlots.includes(slot) && !isCurrentSlot;
              const isSelected = selectedSlot === slot;
              const isAvailable = !isOccupied;

              return (
                <motion.button
                  key={slot}
                  whileHover={isAvailable ? { scale: 1.1 } : {}}
                  whileTap={isAvailable ? { scale: 0.95 } : {}}
                  onClick={() => isAvailable && setSelectedSlot(slot)}
                  disabled={isOccupied}
                  className={`
                    aspect-square rounded-lg text-xs flex items-center justify-center font-bold
                    transition-all
                    ${isCurrentSlot 
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white ring-2 ring-blue-400' 
                      : isSelected
                        ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground ring-2 ring-primary'
                        : isOccupied 
                          ? 'bg-slate-400/50 text-slate-500 cursor-not-allowed' 
                          : 'bg-gradient-to-br from-emerald-400 to-green-500 text-white hover:shadow-lg cursor-pointer'
                    }
                  `}
                >
                  {isCurrentSlot ? (
                    <MapPin className="h-4 w-4" />
                  ) : isSelected ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    formatSlotNumber(slot, config.prefix)
                  )}
                </motion.button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-xs mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gradient-to-br from-emerald-400 to-green-500" />
              <span className="text-muted-foreground">Disponibile</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-slate-400/50" />
              <span className="text-muted-foreground">Occupato</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gradient-to-br from-blue-500 to-indigo-500" />
              <span className="text-muted-foreground">Attuale</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowPicker(false)}>
              Annulla
            </Button>
            <Button 
              onClick={() => selectedSlot && handleAssign(selectedSlot)}
              disabled={!selectedSlot || assigning}
              className="gap-2"
            >
              {assigning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Assegna Slot {selectedSlot && formatSlotNumber(selectedSlot, config.prefix)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
