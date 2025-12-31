import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Archive, 
  MapPin, 
  Grid3X3, 
  Plus,
  Check,
  AlertTriangle,
  Loader2,
  X,
  Package,
  Layers
} from "lucide-react";
import { useStorageSlots, MultiShelfConfig, ShelfConfig } from "@/hooks/useStorageSlots";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    getMultiShelfConfig,
    getAvailableSlots, 
    getOccupiedSlots,
    assignStorageSlot, 
    releaseStorageSlot,
    formatSlotWithShelf,
    getSlotsStats,
    getTotalSlots
  } = useStorageSlots(centroId);
  
  const isMobile = useIsMobile();
  const [config, setConfig] = useState<MultiShelfConfig | null>(null);
  const [availableSlots, setAvailableSlots] = useState<number[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [stats, setStats] = useState<{ occupied: number; total: number; percentage: number } | null>(null);
  const [activeShelfTab, setActiveShelfTab] = useState<string>("");

  useEffect(() => {
    loadData();
  }, [centroId, currentSlot]);

  const loadData = async () => {
    if (!centroId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const cfg = await getMultiShelfConfig();
    setConfig(cfg);

    if (cfg?.enabled && cfg.shelves.length > 0) {
      const available = await getAvailableSlots();
      const occupied = await getOccupiedSlots();
      const statsData = await getSlotsStats();
      
      setAvailableSlots(available);
      setOccupiedSlots(occupied.filter(s => s !== currentSlot));
      setStats(statsData);
      setActiveShelfTab(cfg.shelves[0]?.id || "");
    }
    setLoading(false);
  };

  const handleAssign = async (slot: number) => {
    setAssigning(true);
    const success = await assignStorageSlot(repairId, slot);
    if (success) {
      setShowPicker(false);
      onSlotAssigned?.(slot);
      await loadData();
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
      onSlotAssigned?.(0);
      await loadData();
    }
    setAssigning(false);
  };

  const findShelfForSlot = (slot: number): ShelfConfig | null => {
    if (!config?.shelves) return null;
    for (const shelf of config.shelves) {
      const shelfSlots = shelf.rows * shelf.columns;
      if (slot >= shelf.start_number && slot < shelf.start_number + shelfSlots) {
        return shelf;
      }
    }
    return null;
  };

  const getSlotPositionInShelf = (slot: number, shelf: ShelfConfig): { row: number; col: number } => {
    const localSlot = slot - shelf.start_number;
    const row = Math.floor(localSlot / shelf.columns);
    const col = localSlot % shelf.columns;
    return { row, col };
  };

  const formatCurrentSlot = (): string => {
    if (!currentSlot || !config?.shelves) return "";
    const shelf = findShelfForSlot(currentSlot);
    if (!shelf) return `#${currentSlot}`;
    const position = getSlotPositionInShelf(currentSlot, shelf);
    return `${shelf.prefix}${position.row + 1}-${position.col + 1}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!config?.enabled || !centroId || config.shelves.length === 0) {
    return null;
  }

  const currentShelf = currentSlot ? findShelfForSlot(currentSlot) : null;
  const currentPosition = currentSlot && currentShelf ? getSlotPositionInShelf(currentSlot, currentShelf) : null;

  // Render a single shelf visual grid
  const renderShelfGrid = (shelf: ShelfConfig, compact: boolean = false) => {
    const cellSize = compact ? 'h-4 w-4' : 'h-8 w-8 sm:h-10 sm:w-10';
    const gap = compact ? 'gap-0.5' : 'gap-1';
    
    return (
      <div className={`grid ${gap}`} style={{ gridTemplateColumns: `repeat(${shelf.columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: shelf.rows * shelf.columns }, (_, i) => {
          const slotNum = shelf.start_number + i;
          const row = Math.floor(i / shelf.columns);
          const col = i % shelf.columns;
          const isCurrentSlot = slotNum === currentSlot;
          const isOccupied = occupiedSlots.includes(slotNum);

          return (
            <motion.div
              key={slotNum}
              initial={false}
              animate={isCurrentSlot ? {
                scale: [1, 1.1, 1],
                opacity: 1
              } : { opacity: 1 }}
              transition={isCurrentSlot ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
              className={`
                ${cellSize} rounded-sm flex items-center justify-center relative
                ${isCurrentSlot 
                  ? 'ring-2 ring-primary shadow-lg z-10' 
                  : isOccupied 
                    ? 'bg-muted/60' 
                    : 'bg-accent/40'
                }
              `}
              style={isCurrentSlot ? { 
                backgroundColor: shelf.color || 'hsl(var(--primary))'
              } : {}}
            >
              {!compact && (
                <span className={`text-[9px] sm:text-[10px] font-medium ${
                  isCurrentSlot ? 'text-white' : 'text-muted-foreground'
                }`}>
                  {row + 1}-{col + 1}
                </span>
              )}
              {isCurrentSlot && (
                <motion.div
                  className="absolute inset-0 rounded-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ backgroundColor: shelf.color || 'hsl(var(--primary))' }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderPickerContent = () => (
    <div className="space-y-4">
      {stats && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{stats.total - stats.occupied}</span> slot liberi su {stats.total}
            </span>
          </div>
          {stats.percentage >= 80 && (
            <Badge variant={stats.percentage >= 90 ? "destructive" : "secondary"} className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {stats.percentage}%
            </Badge>
          )}
        </div>
      )}

      <Tabs value={activeShelfTab} onValueChange={setActiveShelfTab}>
        <TabsList className="w-full grid" style={{ gridTemplateColumns: `repeat(${config.shelves.length}, 1fr)` }}>
          {config.shelves.map((shelf) => (
            <TabsTrigger 
              key={shelf.id} 
              value={shelf.id}
              className="gap-1.5 px-2"
            >
              <div 
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: shelf.color || 'hsl(var(--primary))' }}
              />
              <span className="truncate text-xs sm:text-sm">{shelf.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {config.shelves.map((shelf) => (
          <TabsContent key={shelf.id} value={shelf.id} className="mt-4">
            <div 
              className="p-4 rounded-xl border-2 bg-gradient-to-b from-background to-muted/30"
              style={{ borderColor: `${shelf.color || 'hsl(var(--primary))'}40` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4" style={{ color: shelf.color || 'hsl(var(--primary))' }} />
                  <span className="font-medium">{shelf.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {shelf.rows} × {shelf.columns}
                </span>
              </div>

              <ScrollArea className="max-h-[280px] sm:max-h-[320px]">
                <div 
                  className="grid gap-1.5 sm:gap-2"
                  style={{ gridTemplateColumns: `repeat(${shelf.columns}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: shelf.rows * shelf.columns }, (_, i) => {
                    const slotNum = shelf.start_number + i;
                    const row = Math.floor(i / shelf.columns);
                    const col = i % shelf.columns;
                    const isCurrentSlot = slotNum === currentSlot;
                    const isOccupied = occupiedSlots.includes(slotNum) && !isCurrentSlot;
                    const isSelected = selectedSlot === slotNum;
                    const isAvailable = !isOccupied;
                    const label = `${row + 1}-${col + 1}`;

                    return (
                      <motion.button
                        key={slotNum}
                        whileHover={isAvailable ? { scale: 1.05, y: -2 } : {}}
                        whileTap={isAvailable ? { scale: 0.95 } : {}}
                        onClick={() => isAvailable && setSelectedSlot(slotNum)}
                        disabled={isOccupied}
                        className={`
                          aspect-square rounded-lg flex flex-col items-center justify-center font-medium
                          transition-all shadow-sm min-h-[44px] sm:min-h-[52px]
                          ${isCurrentSlot 
                            ? 'text-white shadow-md' 
                            : isSelected
                              ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2'
                              : isOccupied 
                                ? 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed' 
                                : 'bg-card hover:bg-accent border border-border/50 hover:border-primary/30 cursor-pointer'
                          }
                        `}
                        style={isCurrentSlot ? { 
                          backgroundColor: shelf.color || 'hsl(var(--primary))'
                        } : {}}
                      >
                        {isCurrentSlot ? (
                          <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : isSelected ? (
                          <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <>
                            <span className="text-[10px] sm:text-xs font-bold">{shelf.prefix}</span>
                            <span className="text-[10px] sm:text-xs">{label}</span>
                          </>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-2 border-t">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-card border border-border/50" />
          <span className="text-muted-foreground">Libero</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-muted/50" />
          <span className="text-muted-foreground">Occupato</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-primary" />
          <span className="text-muted-foreground">Selezionato</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => setShowPicker(false)} className="w-full sm:w-auto">
          Annulla
        </Button>
        <Button 
          onClick={() => selectedSlot && handleAssign(selectedSlot)}
          disabled={!selectedSlot || assigning}
          className="gap-2 w-full sm:w-auto"
        >
          {assigning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {selectedSlot ? `Conferma posizione` : 'Seleziona uno slot'}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-primary" />
            Posizione Scaffale
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {currentSlot && currentShelf && currentPosition ? (
            // Assigned state - show visual position
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                {/* Visual indicator */}
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="shrink-0"
                >
                  <div 
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex flex-col items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: currentShelf.color || 'hsl(var(--primary))' }}
                  >
                    <span className="text-xs opacity-80">{currentShelf.prefix}</span>
                    <span className="text-xl sm:text-2xl font-bold leading-none">
                      {currentPosition.row + 1}-{currentPosition.col + 1}
                    </span>
                  </div>
                </motion.div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <p className="font-semibold text-foreground">{currentShelf.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Riga {currentPosition.row + 1}, Colonna {currentPosition.col + 1}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowPicker(true)}
                      className="gap-1.5"
                    >
                      <Grid3X3 className="h-3.5 w-3.5" />
                      Cambia
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleRelease}
                      disabled={assigning}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                    >
                      {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                      Rimuovi
                    </Button>
                  </div>
                </div>
              </div>

              {/* Mini shelf map */}
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${currentShelf.color || 'hsl(var(--primary))'}10` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Vista scaffale</span>
                </div>
                {renderShelfGrid(currentShelf, true)}
              </div>
            </div>
          ) : (
            // Unassigned state - show all shelves overview
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                  <Archive className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Nessuna posizione</p>
                  <p className="text-sm text-muted-foreground">
                    {stats ? `${stats.total - stats.occupied} slot disponibili` : 'Assegna uno slot'}
                  </p>
                </div>
              </div>

              {/* Shelves overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {config.shelves.map((shelf) => {
                  const shelfTotal = shelf.rows * shelf.columns;
                  const shelfOccupied = occupiedSlots.filter(s => 
                    s >= shelf.start_number && s < shelf.start_number + shelfTotal
                  ).length;

                  return (
                    <div 
                      key={shelf.id}
                      className="p-3 rounded-lg border"
                      style={{ borderColor: `${shelf.color || 'hsl(var(--primary))'}30` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: shelf.color || 'hsl(var(--primary))' }}
                          />
                          <span className="text-sm font-medium">{shelf.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {shelfTotal - shelfOccupied}/{shelfTotal}
                        </span>
                      </div>
                      {renderShelfGrid(shelf, true)}
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleAutoAssign}
                  disabled={assigning || availableSlots.length === 0}
                  className="flex-1 gap-2"
                >
                  {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Assegna automatico
                </Button>
                <Button 
                  onClick={() => setShowPicker(true)}
                  disabled={availableSlots.length === 0}
                  className="flex-1 gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  Scegli posizione
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Picker - Drawer on mobile, Dialog on desktop */}
      {isMobile ? (
        <Drawer open={showPicker} onOpenChange={setShowPicker}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Seleziona Posizione
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-y-auto">
              {renderPickerContent()}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={showPicker} onOpenChange={setShowPicker}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Seleziona Posizione Scaffale
              </DialogTitle>
            </DialogHeader>
            {renderPickerContent()}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
