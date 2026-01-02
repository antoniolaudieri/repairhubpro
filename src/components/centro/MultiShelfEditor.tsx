import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Archive, 
  Grid3X3, 
  Palette,
  Check,
  X,
  Merge,
  Unlink
} from "lucide-react";
import { toast } from "sonner";

// Merged slot: defines a slot that spans multiple columns
export interface MergedSlot {
  startSlot: number; // Starting slot number
  span: number; // How many columns it spans (2 = double width)
}

export interface ShelfConfig {
  id: string;
  name: string;
  prefix: string;
  rows: number;
  columns: number;
  start_number: number;
  color: string;
  mergedSlots?: MergedSlot[]; // Optional array of merged slots
}

export interface MultiShelfConfig {
  enabled: boolean;
  shelves: ShelfConfig[];
}

const SHELF_COLORS = [
  { name: "Blu", value: "from-blue-500 to-blue-600", bg: "bg-blue-500/20", border: "border-blue-500/30", text: "text-blue-600" },
  { name: "Verde", value: "from-emerald-500 to-emerald-600", bg: "bg-emerald-500/20", border: "border-emerald-500/30", text: "text-emerald-600" },
  { name: "Viola", value: "from-violet-500 to-violet-600", bg: "bg-violet-500/20", border: "border-violet-500/30", text: "text-violet-600" },
  { name: "Arancione", value: "from-orange-500 to-orange-600", bg: "bg-orange-500/20", border: "border-orange-500/30", text: "text-orange-600" },
  { name: "Rosa", value: "from-pink-500 to-pink-600", bg: "bg-pink-500/20", border: "border-pink-500/30", text: "text-pink-600" },
  { name: "Ciano", value: "from-cyan-500 to-cyan-600", bg: "bg-cyan-500/20", border: "border-cyan-500/30", text: "text-cyan-600" },
];

function getColorClasses(colorValue: string) {
  return SHELF_COLORS.find(c => c.value === colorValue) || SHELF_COLORS[0];
}

interface MultiShelfEditorProps {
  config: MultiShelfConfig;
  onChange: (config: MultiShelfConfig) => void;
  occupiedSlots?: { shelfId: string; slot: number }[];
}

export function MultiShelfEditor({ config, onChange, occupiedSlots = [] }: MultiShelfEditorProps) {
  const [editingShelf, setEditingShelf] = useState<ShelfConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleAddShelf = () => {
    const newShelf: ShelfConfig = {
      id: `shelf-${Date.now()}`,
      name: `Scaffale ${config.shelves.length + 1}`,
      prefix: String.fromCharCode(65 + config.shelves.length), // A, B, C...
      rows: 5,
      columns: 10,
      start_number: 1,
      color: SHELF_COLORS[config.shelves.length % SHELF_COLORS.length].value,
    };
    setEditingShelf(newShelf);
    setIsCreating(true);
  };

  const handleSaveShelf = (shelf: ShelfConfig) => {
    if (isCreating) {
      onChange({
        ...config,
        shelves: [...config.shelves, shelf],
      });
    } else {
      onChange({
        ...config,
        shelves: config.shelves.map(s => s.id === shelf.id ? shelf : s),
      });
    }
    setEditingShelf(null);
    setIsCreating(false);
  };

  const handleDeleteShelf = (shelfId: string) => {
    onChange({
      ...config,
      shelves: config.shelves.filter(s => s.id !== shelfId),
    });
  };

  const getShelfOccupancy = (shelfId: string) => {
    const shelf = config.shelves.find(s => s.id === shelfId);
    if (!shelf) return { occupied: 0, total: 0 };
    const total = shelf.rows * shelf.columns;
    const occupied = occupiedSlots.filter(o => o.shelfId === shelfId).length;
    return { occupied, total };
  };

  return (
    <div className="space-y-4">
      {/* Shelves Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {config.shelves.map((shelf, index) => {
            const colorClasses = getColorClasses(shelf.color);
            const { occupied, total } = getShelfOccupancy(shelf.id);
            
            return (
              <motion.div
                key={shelf.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                layout
              >
                <Card className={cn(
                  "relative overflow-hidden border-2 transition-all hover:shadow-lg",
                  colorClasses.border
                )}>
                  {/* Color Header */}
                  <div className={cn(
                    "h-2 bg-gradient-to-r",
                    shelf.color
                  )} />
                  
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center bg-gradient-to-br",
                          shelf.color
                        )}>
                          <Archive className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">{shelf.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            Prefisso: <span className="font-mono font-bold">{shelf.prefix}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingShelf(shelf);
                            setIsCreating(false);
                          }}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteShelf(shelf.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Mini Preview Grid with Merged Slots */}
                    <div className="rounded-lg bg-muted/30 p-2">
                      <div 
                        className="grid gap-0.5"
                        style={{ 
                          gridTemplateColumns: `repeat(${Math.min(shelf.columns, 10)}, 1fr)` 
                        }}
                      >
                        {(() => {
                          const elements: JSX.Element[] = [];
                          const mergedSlots = shelf.mergedSlots || [];
                          const maxSlots = Math.min(shelf.rows * shelf.columns, 30);
                          let skipUntil = -1;
                          
                          for (let i = 0; i < maxSlots; i++) {
                            const slotNum = shelf.start_number + i;
                            
                            // Skip slots that are part of a merge (not the start)
                            if (slotNum <= skipUntil) continue;
                            
                            // Check if this slot is merged
                            const mergeInfo = mergedSlots.find(m => m.startSlot === slotNum);
                            const isOccupied = occupiedSlots.some(o => o.shelfId === shelf.id && o.slot === slotNum);
                            
                            if (mergeInfo) {
                              // This is a merged slot
                              skipUntil = slotNum + mergeInfo.span - 1;
                              const actualSpan = Math.min(mergeInfo.span, 10 - (i % shelf.columns));
                              elements.push(
                                <div
                                  key={i}
                                  className={cn(
                                    "rounded-sm transition-colors bg-gradient-to-r border border-white/30",
                                    shelf.color,
                                    isOccupied && "ring-1 ring-destructive"
                                  )}
                                  style={{ 
                                    gridColumn: `span ${actualSpan}`,
                                    aspectRatio: `${actualSpan}/1`
                                  }}
                                />
                              );
                            } else {
                              // Regular slot
                              elements.push(
                                <div
                                  key={i}
                                  className={cn(
                                    "aspect-square rounded-sm transition-colors",
                                    isOccupied 
                                      ? "bg-destructive/40" 
                                      : colorClasses.bg
                                  )}
                                />
                              );
                            }
                          }
                          return elements;
                        })()}
                      </div>
                      {shelf.rows * shelf.columns > 30 && (
                        <p className="text-[10px] text-muted-foreground text-center mt-1">
                          +{shelf.rows * shelf.columns - 30} slot
                        </p>
                      )}
                    </div>
                    
                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Grid3X3 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{shelf.rows} × {shelf.columns} = {shelf.rows * shelf.columns} slot</span>
                      </div>
                      <Badge 
                        variant={occupied / total >= 0.9 ? "destructive" : "secondary"}
                        className="text-[10px]"
                      >
                        {occupied}/{total}
                      </Badge>
                    </div>
                    
                    {/* Slot Range */}
                    <p className="text-xs text-muted-foreground text-center">
                      Slot: <span className="font-mono">{shelf.prefix}{shelf.start_number}</span> → <span className="font-mono">{shelf.prefix}{shelf.start_number + shelf.rows * shelf.columns - 1}</span>
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Add New Shelf Button */}
        <motion.div layout>
          <Card 
            className="border-2 border-dashed border-border/50 hover:border-primary/50 transition-colors cursor-pointer h-full min-h-[200px] flex items-center justify-center"
            onClick={handleAddShelf}
          >
            <div className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Aggiungi Scaffalatura
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Edit/Create Dialog */}
      <ShelfEditorDialog
        shelf={editingShelf}
        isOpen={editingShelf !== null}
        onClose={() => {
          setEditingShelf(null);
          setIsCreating(false);
        }}
        onSave={handleSaveShelf}
        isCreating={isCreating}
      />
    </div>
  );
}

interface ShelfEditorDialogProps {
  shelf: ShelfConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (shelf: ShelfConfig) => void;
  isCreating: boolean;
}

function ShelfEditorDialog({ shelf, isOpen, onClose, onSave, isCreating }: ShelfEditorDialogProps) {
  const [formData, setFormData] = useState<ShelfConfig | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [mergeMode, setMergeMode] = useState(false);

  // Reset form when shelf changes
  useState(() => {
    if (shelf) {
      setFormData({ ...shelf, mergedSlots: shelf.mergedSlots || [] });
    }
  });

  // Update form when dialog opens
  if (shelf && !formData) {
    setFormData({ ...shelf, mergedSlots: shelf.mergedSlots || [] });
  }
  
  if (!formData) return null;

  const totalSlots = formData.rows * formData.columns;
  const colorClasses = getColorClasses(formData.color);
  const mergedSlots = formData.mergedSlots || [];

  // Check if a slot is part of a merged group
  const getSlotMergeInfo = (slotNum: number): { isMerged: boolean; isStart: boolean; span: number; mergeGroup?: MergedSlot } => {
    for (const merge of mergedSlots) {
      if (slotNum === merge.startSlot) {
        return { isMerged: true, isStart: true, span: merge.span, mergeGroup: merge };
      }
      if (slotNum > merge.startSlot && slotNum < merge.startSlot + merge.span) {
        return { isMerged: true, isStart: false, span: 0, mergeGroup: merge };
      }
    }
    return { isMerged: false, isStart: false, span: 1 };
  };

  // Check if slots can be merged (must be adjacent horizontally in same row)
  const canMergeSelected = (): boolean => {
    if (selectedSlots.length < 2) return false;
    
    const sorted = [...selectedSlots].sort((a, b) => a - b);
    
    // Check if all in same row
    const firstRow = Math.floor((sorted[0] - formData.start_number) / formData.columns);
    for (const slot of sorted) {
      const row = Math.floor((slot - formData.start_number) / formData.columns);
      if (row !== firstRow) return false;
    }
    
    // Check if consecutive
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) return false;
    }
    
    // Check none are already merged
    for (const slot of sorted) {
      const info = getSlotMergeInfo(slot);
      if (info.isMerged) return false;
    }
    
    return true;
  };

  const handleSlotClick = (slotNum: number) => {
    if (!mergeMode) return;
    
    const info = getSlotMergeInfo(slotNum);
    
    // If clicking on a merged slot, unmerge it
    if (info.isMerged && info.mergeGroup) {
      const newMerged = mergedSlots.filter(m => m.startSlot !== info.mergeGroup!.startSlot);
      setFormData({ ...formData, mergedSlots: newMerged });
      toast.success("Slot separati");
      return;
    }
    
    // Toggle selection
    if (selectedSlots.includes(slotNum)) {
      setSelectedSlots(selectedSlots.filter(s => s !== slotNum));
    } else {
      setSelectedSlots([...selectedSlots, slotNum]);
    }
  };

  const handleMergeSelected = () => {
    if (!canMergeSelected()) return;
    
    const sorted = [...selectedSlots].sort((a, b) => a - b);
    const newMerge: MergedSlot = {
      startSlot: sorted[0],
      span: sorted.length
    };
    
    setFormData({
      ...formData,
      mergedSlots: [...mergedSlots, newMerge]
    });
    setSelectedSlots([]);
    toast.success(`${sorted.length} slot uniti`);
  };

  const toggleMergeMode = () => {
    setMergeMode(!mergeMode);
    setSelectedSlots([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center bg-gradient-to-br", formData.color)}>
              <Archive className="h-4 w-4 text-white" />
            </div>
            {isCreating ? "Nuova Scaffalatura" : `Modifica ${formData.name}`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="grid gap-6 py-4 md:grid-cols-2">
            {/* Left Column - Settings */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome scaffalatura</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="es. Scaffale Principale"
                />
              </div>

              <div className="space-y-2">
                <Label>Prefisso slot</Label>
                <Input
                  value={formData.prefix}
                  onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                  placeholder="es. A, B, SCAFF-"
                  maxLength={5}
                />
                <p className="text-xs text-muted-foreground">
                  Esempio: <span className="font-mono">{formData.prefix}1</span>, <span className="font-mono">{formData.prefix}2</span>...
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Righe: {formData.rows}</Label>
                  <Slider
                    value={[formData.rows]}
                    onValueChange={([v]) => setFormData({ ...formData, rows: v })}
                    min={1}
                    max={20}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Colonne: {formData.columns}</Label>
                  <Slider
                    value={[formData.columns]}
                    onValueChange={([v]) => setFormData({ ...formData, columns: v })}
                    min={1}
                    max={20}
                    step={1}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Numero iniziale</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.start_number}
                  onChange={(e) => setFormData({ ...formData, start_number: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Colore
                </Label>
                <div className="flex flex-wrap gap-2">
                  {SHELF_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={cn(
                        "h-8 w-8 rounded-full bg-gradient-to-br transition-transform hover:scale-110",
                        color.value,
                        formData.color === color.value && "ring-2 ring-offset-2 ring-primary"
                      )}
                      title={color.name}
                    >
                      {formData.color === color.value && (
                        <Check className="h-4 w-4 text-white mx-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Visual Preview with Merge */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Anteprima Scaffalatura</Label>
                <Button
                  variant={mergeMode ? "default" : "outline"}
                  size="sm"
                  onClick={toggleMergeMode}
                  className="h-7 text-xs"
                >
                  {mergeMode ? (
                    <>
                      <X className="h-3 w-3 mr-1" />
                      Esci
                    </>
                  ) : (
                    <>
                      <Merge className="h-3 w-3 mr-1" />
                      Unisci Slot
                    </>
                  )}
                </Button>
              </div>
              
              {mergeMode && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 space-y-1">
                  <p>• Clicca sugli slot adiacenti per selezionarli</p>
                  <p>• Clicca su uno slot unito per separarlo</p>
                  {selectedSlots.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                      <span>{selectedSlots.length} slot selezionati</span>
                      <Button
                        size="sm"
                        className="h-6 text-xs"
                        disabled={!canMergeSelected()}
                        onClick={handleMergeSelected}
                      >
                        <Merge className="h-3 w-3 mr-1" />
                        Unisci
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              <div className={cn(
                "rounded-xl border-2 p-4 overflow-hidden",
                colorClasses.border
              )}>
                <div className={cn("h-1.5 -mx-4 -mt-4 mb-4 bg-gradient-to-r", formData.color)} />
                
                <div 
                  className="grid gap-1 max-h-[250px] overflow-auto"
                  style={{ 
                    gridTemplateColumns: `repeat(${formData.columns}, 1fr)` 
                  }}
                >
                  {(() => {
                    const slots: JSX.Element[] = [];
                    let skipUntil = -1;
                    
                    for (let i = 0; i < Math.min(totalSlots, 100); i++) {
                      const slotNum = formData.start_number + i;
                      
                      // Skip slots that are part of a merge (not the start)
                      if (slotNum <= skipUntil) continue;
                      
                      const mergeInfo = getSlotMergeInfo(slotNum);
                      const isSelected = selectedSlots.includes(slotNum);
                      
                      if (mergeInfo.isMerged && mergeInfo.isStart) {
                        // This is a merged slot start
                        skipUntil = slotNum + mergeInfo.span - 1;
                        slots.push(
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.005 }}
                            onClick={() => handleSlotClick(slotNum)}
                            className={cn(
                              "rounded flex items-center justify-center text-[8px] font-mono font-medium relative",
                              "bg-gradient-to-r",
                              formData.color,
                              "text-white border-2 border-white/30",
                              mergeMode && "cursor-pointer hover:opacity-80",
                              mergeMode && "ring-2 ring-offset-1 ring-primary/50"
                            )}
                            style={{ 
                              gridColumn: `span ${mergeInfo.span}`,
                              aspectRatio: `${mergeInfo.span}/1`
                            }}
                          >
                            <Merge className="h-2.5 w-2.5 absolute top-0.5 right-0.5 opacity-60" />
                            {formData.prefix}{slotNum}-{slotNum + mergeInfo.span - 1}
                          </motion.div>
                        );
                      } else if (!mergeInfo.isMerged) {
                        // Regular slot
                        slots.push(
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.005 }}
                            onClick={() => handleSlotClick(slotNum)}
                            className={cn(
                              "aspect-square rounded flex items-center justify-center text-[8px] font-mono font-medium transition-all",
                              colorClasses.bg,
                              colorClasses.text,
                              colorClasses.border,
                              "border",
                              mergeMode && "cursor-pointer hover:ring-2 hover:ring-primary/50",
                              isSelected && "ring-2 ring-primary bg-primary/20"
                            )}
                          >
                            {formData.prefix}{slotNum}
                          </motion.div>
                        );
                      }
                    }
                    return slots;
                  })()}
                </div>
                
                {totalSlots > 100 && (
                  <p className="text-[10px] text-muted-foreground text-center mt-2">
                    Mostrando 100 di {totalSlots} slot
                  </p>
                )}
                
                <div className="mt-4 pt-3 border-t flex items-center justify-center gap-2 flex-wrap">
                  <Badge className={cn("bg-gradient-to-r text-white border-0", formData.color)}>
                    {totalSlots} slot totali
                  </Badge>
                  {mergedSlots.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <Merge className="h-3 w-3 mr-1" />
                      {mergedSlots.length} unioni
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t shrink-0 flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" />
            Annulla
          </Button>
          <Button 
            onClick={() => {
              onSave(formData);
              setFormData(null);
            }}
            className={cn("bg-gradient-to-r text-white w-full sm:w-auto", formData.color)}
          >
            <Check className="h-4 w-4 mr-2" />
            {isCreating ? "Crea" : "Salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { getColorClasses, SHELF_COLORS };
