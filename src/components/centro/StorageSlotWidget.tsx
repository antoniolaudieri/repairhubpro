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
  Layers,
  Edit3
} from "lucide-react";
import { useStorageSlots, MultiShelfConfig, ShelfConfig } from "@/hooks/useStorageSlots";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Same color definitions as in MultiShelfEditor for consistency
const SHELF_COLORS = [
  { name: "Blu", value: "from-blue-500 to-blue-600", bg: "bg-blue-500/20", border: "border-blue-500/30", text: "text-blue-600", solid: "bg-blue-500" },
  { name: "Verde", value: "from-emerald-500 to-emerald-600", bg: "bg-emerald-500/20", border: "border-emerald-500/30", text: "text-emerald-600", solid: "bg-emerald-500" },
  { name: "Viola", value: "from-violet-500 to-violet-600", bg: "bg-violet-500/20", border: "border-violet-500/30", text: "text-violet-600", solid: "bg-violet-500" },
  { name: "Arancione", value: "from-orange-500 to-orange-600", bg: "bg-orange-500/20", border: "border-orange-500/30", text: "text-orange-600", solid: "bg-orange-500" },
  { name: "Rosa", value: "from-pink-500 to-pink-600", bg: "bg-pink-500/20", border: "border-pink-500/30", text: "text-pink-600", solid: "bg-pink-500" },
  { name: "Ciano", value: "from-cyan-500 to-cyan-600", bg: "bg-cyan-500/20", border: "border-cyan-500/30", text: "text-cyan-600", solid: "bg-cyan-500" },
];

function getColorClasses(colorValue: string) {
  return SHELF_COLORS.find(c => c.value === colorValue) || SHELF_COLORS[0];
}

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
  const currentColorClasses = currentShelf ? getColorClasses(currentShelf.color) : null;

  // Render mini preview grid (same style as settings)
  const renderMiniPreviewGrid = (shelf: ShelfConfig) => {
    const colorClasses = getColorClasses(shelf.color);
    const totalSlots = shelf.rows * shelf.columns;
    const maxDisplay = Math.min(totalSlots, 30);
    
    return (
      <div className="rounded-lg bg-muted/30 p-2">
        <div 
          className="grid gap-0.5"
          style={{ 
            gridTemplateColumns: `repeat(${Math.min(shelf.columns, 10)}, 1fr)` 
          }}
        >
          {Array.from({ length: maxDisplay }, (_, i) => {
            const slotNum = shelf.start_number + i;
            const isCurrentSlot = slotNum === currentSlot;
            const isOccupied = occupiedSlots.includes(slotNum) && !isCurrentSlot;
            
            return (
              <motion.div
                key={i}
                animate={isCurrentSlot ? { scale: [1, 1.2, 1] } : {}}
                transition={isCurrentSlot ? { duration: 2, repeat: Infinity } : {}}
                className={cn(
                  "aspect-square rounded-sm transition-colors",
                  isCurrentSlot 
                    ? cn("bg-gradient-to-br ring-2 ring-offset-1 ring-offset-background", shelf.color, "ring-foreground/50")
                    : isOccupied 
                      ? "bg-muted-foreground/30" 
                      : colorClasses.bg
                )}
              />
            );
          })}
        </div>
        {totalSlots > 30 && (
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            +{totalSlots - 30} slot
          </p>
        )}
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
          {config.shelves.map((shelf) => {
            const colorClasses = getColorClasses(shelf.color);
            return (
              <TabsTrigger 
                key={shelf.id} 
                value={shelf.id}
                className="gap-1.5 px-2"
              >
                <div className={cn("w-2.5 h-2.5 rounded-full shrink-0 bg-gradient-to-br", shelf.color)} />
                <span className="truncate text-xs sm:text-sm">{shelf.name}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {config.shelves.map((shelf) => {
          const colorClasses = getColorClasses(shelf.color);
          
          return (
            <TabsContent key={shelf.id} value={shelf.id} className="mt-4">
              <div className={cn(
                "rounded-xl border-2 overflow-hidden",
                colorClasses.border
              )}>
                {/* Color Header Bar */}
                <div className={cn("h-1.5 bg-gradient-to-r", shelf.color)} />
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center bg-gradient-to-br",
                        shelf.color
                      )}>
                        <Archive className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <span className="font-semibold text-sm">{shelf.name}</span>
                        <p className="text-xs text-muted-foreground">
                          Prefisso: <span className="font-mono font-bold">{shelf.prefix}</span>
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {shelf.rows} × {shelf.columns}
                    </Badge>
                  </div>

                  <ScrollArea className="max-h-[280px] sm:max-h-[320px]">
                    <div 
                      className="grid gap-1"
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
                        const label = `${shelf.prefix}${row + 1}-${col + 1}`;

                        return (
                          <motion.button
                            key={slotNum}
                            whileHover={isAvailable ? { scale: 1.05 } : {}}
                            whileTap={isAvailable ? { scale: 0.95 } : {}}
                            onClick={() => isAvailable && setSelectedSlot(slotNum)}
                            disabled={isOccupied}
                            className={cn(
                              "aspect-square rounded flex flex-col items-center justify-center text-[8px] sm:text-[10px] font-mono transition-all border",
                              isCurrentSlot 
                                ? cn("bg-gradient-to-br text-white border-transparent", shelf.color)
                                : isSelected
                                  ? cn("bg-gradient-to-br text-white border-transparent ring-2 ring-offset-2", shelf.color, "ring-foreground/50")
                                  : isOccupied 
                                    ? "bg-muted/50 text-muted-foreground/40 cursor-not-allowed border-transparent" 
                                    : cn("cursor-pointer", colorClasses.bg, colorClasses.border, colorClasses.text, "hover:opacity-80")
                            )}
                          >
                            {isCurrentSlot ? (
                              <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                            ) : isSelected ? (
                              <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                            ) : (
                              <span className="font-medium">{label}</span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-2 border-t">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500/30" />
          <span className="text-muted-foreground">Libero</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-muted/50" />
          <span className="text-muted-foreground">Occupato</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-blue-600" />
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
      <Card className={cn(
        "border-2 transition-all",
        currentColorClasses?.border || "border-border"
      )}>
        {/* Color Header Bar (matching settings) */}
        {currentShelf && (
          <div className={cn("h-1.5 bg-gradient-to-r", currentShelf.color)} />
        )}
        
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center bg-gradient-to-br",
              currentShelf?.color || "from-indigo-500 to-violet-500"
            )}>
              <Archive className="h-4 w-4 text-white" />
            </div>
            Posizione Scaffale
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-0">
          {currentSlot && currentShelf && currentPosition && currentColorClasses ? (
            // Assigned state - matching settings style
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                {/* Visual indicator box - matching settings card style */}
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn(
                    "shrink-0 rounded-xl border-2 overflow-hidden",
                    currentColorClasses.border
                  )}
                >
                  <div className={cn("h-1 bg-gradient-to-r", currentShelf.color)} />
                  <div className={cn(
                    "w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center",
                    currentColorClasses.bg
                  )}>
                    <span className={cn("text-xs font-medium", currentColorClasses.text)}>
                      {currentShelf.prefix}
                    </span>
                    <span className={cn("text-xl sm:text-2xl font-bold leading-none", currentColorClasses.text)}>
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
                      <Edit3 className="h-3.5 w-3.5" />
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

              {/* Mini shelf preview - same style as settings */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Grid3X3 className={cn("h-3.5 w-3.5", currentColorClasses.text)} />
                  <span className="text-xs text-muted-foreground">
                    {currentShelf.rows} × {currentShelf.columns} = {currentShelf.rows * currentShelf.columns} slot
                  </span>
                </div>
                {renderMiniPreviewGrid(currentShelf)}
              </div>
            </div>
          ) : (
            // Unassigned state - show shelves overview like settings
            <div className="space-y-4">
              <div className="text-center py-2">
                <p className="font-medium text-muted-foreground">Nessuna posizione assegnata</p>
              </div>
              
              {/* Show all shelves preview - matching settings grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                {config.shelves.slice(0, 4).map((shelf) => {
                  const colorClasses = getColorClasses(shelf.color);
                  const shelfSlots = shelf.rows * shelf.columns;
                  const occupiedInShelf = occupiedSlots.filter(s => 
                    s >= shelf.start_number && s < shelf.start_number + shelfSlots
                  ).length;
                  
                  return (
                    <div 
                      key={shelf.id} 
                      className={cn(
                        "rounded-lg border-2 overflow-hidden",
                        colorClasses.border
                      )}
                    >
                      <div className={cn("h-1 bg-gradient-to-r", shelf.color)} />
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-6 w-6 rounded flex items-center justify-center bg-gradient-to-br",
                            shelf.color
                          )}>
                            <Archive className="h-3 w-3 text-white" />
                          </div>
                          <span className="font-medium text-sm truncate">{shelf.name}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{shelf.rows} × {shelf.columns}</span>
                          <Badge 
                            variant={occupiedInShelf / shelfSlots >= 0.9 ? "destructive" : "secondary"}
                            className="text-[10px]"
                          >
                            {occupiedInShelf}/{shelfSlots}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {config.shelves.length > 4 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{config.shelves.length - 4} altre scaffalature
                </p>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={handleAutoAssign}
                  disabled={assigning || availableSlots.length === 0}
                  className={cn("flex-1 gap-2 bg-gradient-to-r text-white border-0", 
                    config.shelves[0]?.color || "from-indigo-500 to-violet-500"
                  )}
                >
                  {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Assegna automatico
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPicker(true)}
                  className="flex-1 gap-2"
                >
                  <Grid3X3 className="h-4 w-4" />
                  Scegli posizione
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Picker Modal */}
      {isMobile ? (
        <Drawer open={showPicker} onOpenChange={setShowPicker}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Grid3X3 className="h-5 w-5" />
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
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Grid3X3 className="h-5 w-5" />
                Seleziona Posizione
              </DialogTitle>
            </DialogHeader>
            {renderPickerContent()}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
