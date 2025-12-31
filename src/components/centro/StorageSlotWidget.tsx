import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
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
  ChevronDown,
  ChevronUp
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
  const [showMiniMap, setShowMiniMap] = useState(false);
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

  // Find which shelf contains the current slot
  const findShelfForSlot = (slot: number): ShelfConfig | null => {
    if (!config?.shelves) return null;
    
    let runningTotal = 0;
    for (const shelf of config.shelves) {
      const shelfSlots = shelf.rows * shelf.columns;
      if (slot >= shelf.start_number && slot < shelf.start_number + shelfSlots) {
        return shelf;
      }
      runningTotal += shelfSlots;
    }
    return null;
  };

  // Get slot position within a shelf
  const getSlotPositionInShelf = (slot: number, shelf: ShelfConfig): { row: number; col: number } => {
    const localSlot = slot - shelf.start_number;
    const row = Math.floor(localSlot / shelf.columns);
    const col = localSlot % shelf.columns;
    return { row, col };
  };

  // Format display for current slot
  const formatCurrentSlot = (): string => {
    if (!currentSlot || !config?.shelves) return "";
    
    const shelf = findShelfForSlot(currentSlot);
    if (!shelf) return `#${currentSlot}`;
    
    const position = getSlotPositionInShelf(currentSlot, shelf);
    return `${shelf.prefix}${position.row + 1}-${position.col + 1}`;
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

  if (!config?.enabled || !centroId || config.shelves.length === 0) {
    return null;
  }

  const currentShelf = currentSlot ? findShelfForSlot(currentSlot) : null;
  const totalSlots = getTotalSlots(config);

  const renderShelfMiniMap = (shelf: ShelfConfig, isExpanded: boolean = false) => {
    const slots = [];
    for (let row = 0; row < shelf.rows; row++) {
      for (let col = 0; col < shelf.columns; col++) {
        const slotNum = shelf.start_number + (row * shelf.columns) + col;
        const isCurrentSlot = slotNum === currentSlot;
        const isOccupied = occupiedSlots.includes(slotNum);

        slots.push(
          <motion.div
            key={slotNum}
            animate={isCurrentSlot ? {
              scale: [1, 1.15, 1],
            } : {}}
            transition={isCurrentSlot ? { duration: 1.5, repeat: Infinity } : {}}
            className={`
              ${isExpanded ? 'aspect-square min-h-[24px]' : 'aspect-square min-h-[12px]'}
              rounded-sm flex items-center justify-center
              ${isCurrentSlot 
                ? 'ring-2 ring-primary ring-offset-1' 
                : ''
              }
            `}
            style={{
              backgroundColor: isCurrentSlot 
                ? shelf.color || 'hsl(var(--primary))' 
                : isOccupied 
                  ? 'hsl(var(--muted))' 
                  : 'hsl(var(--accent))'
            }}
          >
            {isExpanded && (
              <span className="text-[8px] font-bold text-foreground/70">
                {row + 1}-{col + 1}
              </span>
            )}
          </motion.div>
        );
      }
    }

    return (
      <div 
        className={`grid gap-0.5 p-2 rounded-lg`}
        style={{ 
          gridTemplateColumns: `repeat(${shelf.columns}, minmax(0, 1fr))`,
          backgroundColor: `${shelf.color || 'hsl(var(--primary))'}20`
        }}
      >
        {slots}
      </div>
    );
  };

  const renderPickerContent = () => (
    <div className="space-y-4">
      {stats && (
        <div className="flex items-center justify-between text-sm px-1">
          <span className="text-muted-foreground">
            Disponibili: <span className="font-semibold text-foreground">{stats.total - stats.occupied}/{stats.total}</span>
          </span>
          {stats.percentage >= 90 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Quasi pieno
            </Badge>
          )}
        </div>
      )}

      <Tabs value={activeShelfTab} onValueChange={setActiveShelfTab} className="w-full">
        <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
          {config.shelves.map((shelf) => (
            <TabsTrigger 
              key={shelf.id} 
              value={shelf.id}
              className="flex-1 min-w-[80px] gap-1.5 data-[state=active]:shadow-sm"
              style={{ 
                borderLeft: `3px solid ${shelf.color || 'hsl(var(--primary))'}` 
              }}
            >
              <span className="font-bold">{shelf.prefix}</span>
              <span className="text-muted-foreground text-xs hidden sm:inline">{shelf.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {config.shelves.map((shelf) => {
          const shelfSlots = [];
          for (let row = 0; row < shelf.rows; row++) {
            for (let col = 0; col < shelf.columns; col++) {
              const slotNum = shelf.start_number + (row * shelf.columns) + col;
              const isCurrentSlot = slotNum === currentSlot;
              const isOccupied = occupiedSlots.includes(slotNum) && !isCurrentSlot;
              const isSelected = selectedSlot === slotNum;
              const isAvailable = !isOccupied;
              const label = `${shelf.prefix}${row + 1}-${col + 1}`;

              shelfSlots.push(
                <motion.button
                  key={slotNum}
                  whileHover={isAvailable ? { scale: 1.05 } : {}}
                  whileTap={isAvailable ? { scale: 0.95 } : {}}
                  onClick={() => isAvailable && setSelectedSlot(slotNum)}
                  disabled={isOccupied}
                  className={`
                    aspect-square rounded-lg text-xs sm:text-sm flex items-center justify-center font-bold
                    transition-all min-h-[40px] sm:min-h-[48px]
                    ${isCurrentSlot 
                      ? 'text-white ring-2 ring-offset-1' 
                      : isSelected
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                        : isOccupied 
                          ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50' 
                          : 'bg-accent hover:bg-accent/80 cursor-pointer'
                    }
                  `}
                  style={isCurrentSlot ? { 
                    backgroundColor: shelf.color || 'hsl(var(--primary))'
                  } : {}}
                >
                  {isCurrentSlot ? (
                    <MapPin className="h-4 w-4" />
                  ) : isSelected ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    label
                  )}
                </motion.button>
              );
            }
          }

          return (
            <TabsContent key={shelf.id} value={shelf.id} className="mt-3">
              <div 
                className="p-3 rounded-xl border-2"
                style={{ 
                  borderColor: `${shelf.color || 'hsl(var(--primary))'}50`,
                  backgroundColor: `${shelf.color || 'hsl(var(--primary))'}10`
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: shelf.color || 'hsl(var(--primary))' }}
                  />
                  <span className="font-medium text-sm">{shelf.name}</span>
                  <span className="text-muted-foreground text-xs">
                    ({shelf.rows}x{shelf.columns} = {shelf.rows * shelf.columns} slot)
                  </span>
                </div>
                <ScrollArea className="max-h-[300px]">
                  <div 
                    className="grid gap-1.5"
                    style={{ gridTemplateColumns: `repeat(${shelf.columns}, minmax(0, 1fr))` }}
                  >
                    {shelfSlots}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="flex flex-wrap items-center gap-3 text-xs px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-accent" />
          <span className="text-muted-foreground">Disponibile</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-muted opacity-50" />
          <span className="text-muted-foreground">Occupato</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary" />
          <span className="text-muted-foreground">Attuale</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
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
          {selectedSlot ? `Assegna ${formatSlotWithShelf(
            findShelfForSlot(selectedSlot)?.id || '', 
            selectedSlot, 
            config
          )}` : 'Seleziona slot'}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-3 sm:p-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <motion.div 
                animate={currentSlot ? { 
                  boxShadow: ['0 0 0 0 rgba(var(--primary), 0)', '0 0 0 8px rgba(var(--primary), 0.2)', '0 0 0 0 rgba(var(--primary), 0)']
                } : {}}
                transition={currentSlot ? { duration: 2, repeat: Infinity } : {}}
                className={`h-12 w-12 sm:h-14 sm:w-14 rounded-xl flex items-center justify-center shrink-0 ${
                  currentSlot 
                    ? 'text-white' 
                    : 'bg-muted text-muted-foreground'
                }`}
                style={currentSlot && currentShelf ? { 
                  backgroundColor: currentShelf.color || 'hsl(var(--primary))'
                } : {}}
              >
                {currentSlot ? (
                  <span className="text-sm sm:text-lg font-bold">{formatCurrentSlot()}</span>
                ) : (
                  <Archive className="h-5 w-5 sm:h-6 sm:w-6" />
                )}
              </motion.div>
              <div className="min-w-0">
                <h4 className="font-semibold flex items-center gap-2 flex-wrap">
                  <span className="truncate">Posizione</span>
                  {currentSlot && currentShelf && (
                    <Badge 
                      variant="secondary" 
                      className="text-xs"
                      style={{ 
                        backgroundColor: `${currentShelf.color || 'hsl(var(--primary))'}20`,
                        color: currentShelf.color || 'hsl(var(--primary))'
                      }}
                    >
                      {currentShelf.name}
                    </Badge>
                  )}
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {currentSlot && currentShelf
                    ? `Scaffale ${currentShelf.prefix} • Slot ${formatCurrentSlot()}` 
                    : `${config.shelves.length} scaffali configurati`
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {currentSlot ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowPicker(true)}
                    className="gap-1.5 text-xs sm:text-sm"
                  >
                    <Grid3X3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Cambia</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleRelease}
                    disabled={assigning}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleAutoAssign}
                    disabled={assigning || availableSlots.length === 0}
                    className="gap-1.5 text-xs sm:text-sm"
                  >
                    {assigning ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Auto
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => setShowPicker(true)}
                    disabled={availableSlots.length === 0}
                    className="gap-1.5 text-xs sm:text-sm"
                  >
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Scegli
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Visual Mini-map */}
          {currentSlot && currentShelf && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 sm:mt-4"
            >
              <button
                onClick={() => setShowMiniMap(!showMiniMap)}
                className="w-full flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Vista scaffale {currentShelf.name}
                  </span>
                </div>
                {showMiniMap ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              <AnimatePresence>
                {showMiniMap && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3">
                      {renderShelfMiniMap(currentShelf, true)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Multi-shelf overview when no slot assigned */}
          {!currentSlot && config.shelves.length > 1 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Scaffali disponibili</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {config.shelves.map((shelf) => (
                  <div 
                    key={shelf.id}
                    className="p-2 rounded-lg border"
                    style={{ 
                      borderColor: `${shelf.color || 'hsl(var(--primary))'}50`,
                      backgroundColor: `${shelf.color || 'hsl(var(--primary))'}10`
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: shelf.color || 'hsl(var(--primary))' }}
                      />
                      <span className="text-xs font-medium truncate">{shelf.name}</span>
                    </div>
                    {renderShelfMiniMap(shelf)}
                  </div>
                ))}
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
                <MapPin className="h-5 w-5" />
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
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
