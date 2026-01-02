import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Copy,
  Move,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import { 
  VisualSlotEditor, 
  SlotData, 
  mergedSlotsToSlotData, 
  slotDataToMergedSlots 
} from "./VisualSlotEditor";

// Merged slot: defines a slot that spans multiple columns
export interface MergedSlot {
  startSlot: number; // Starting slot number
  span: number; // How many columns it spans (2 = double width)
}

export interface SlotCapacity {
  smartphone: number;
  tablet: number;
  notebook: number;
  pc: number;
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
  slotCapacity?: SlotCapacity; // Max devices per type that can fit in each slot
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
      slotCapacity: { smartphone: 3, tablet: 2, notebook: 1, pc: 1 },
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

  const handleDuplicateShelf = (shelf: ShelfConfig) => {
    const newShelf: ShelfConfig = {
      ...shelf,
      id: crypto.randomUUID(),
      name: `${shelf.name} (copia)`,
      prefix: shelf.prefix.length < 5 ? `${shelf.prefix}2` : shelf.prefix,
    };
    onChange({
      ...config,
      shelves: [...config.shelves, newShelf],
    });
    toast.success("Scaffale duplicato");
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
                          title="Modifica"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDuplicateShelf(shelf)}
                          title="Duplica"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteShelf(shelf.id)}
                          title="Elimina"
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

                    {/* Capacity Info */}
                    {shelf.slotCapacity && (
                      <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                        <span title="Smartphone per slot">📱{shelf.slotCapacity.smartphone}</span>
                        <span title="Tablet per slot">📲{shelf.slotCapacity.tablet}</span>
                        <span title="Notebook per slot">💻{shelf.slotCapacity.notebook}</span>
                        <span title="PC per slot">🖥️{shelf.slotCapacity.pc}</span>
                      </div>
                    )}
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
  const [slotData, setSlotData] = useState<SlotData[]>([]);
  const [activeTab, setActiveTab] = useState<string>("settings");

  // Reset form when shelf changes
  useEffect(() => {
    if (shelf) {
      setFormData({ ...shelf, mergedSlots: shelf.mergedSlots || [] });
      setSlotData(
        mergedSlotsToSlotData(
          shelf.rows,
          shelf.columns,
          shelf.start_number,
          shelf.mergedSlots || []
        )
      );
      setActiveTab("settings");
    } else {
      setFormData(null);
      setSlotData([]);
    }
  }, [shelf]);

  // Regenerate slot data when grid dimensions change
  useEffect(() => {
    if (formData) {
      const newSlotData = mergedSlotsToSlotData(
        formData.rows,
        formData.columns,
        formData.start_number,
        formData.mergedSlots || []
      );
      setSlotData(newSlotData);
    }
  }, [formData?.rows, formData?.columns, formData?.start_number]);

  // Update merged slots when slot data changes
  const handleSlotDataChange = (newSlotData: SlotData[]) => {
    setSlotData(newSlotData);
    if (formData) {
      const mergedSlots = slotDataToMergedSlots(newSlotData);
      setFormData({ ...formData, mergedSlots });
    }
  };
  
  if (!formData) return null;

  const totalSlots = formData.rows * formData.columns;
  const colorClasses = getColorClasses(formData.color);
  const mergedSlots = formData.mergedSlots || [];

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

              {/* Slot Capacity by Device Type */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Capacità per tipo dispositivo
                </Label>
                <p className="text-xs text-muted-foreground">
                  Quanti dispositivi per tipo possono stare in ogni slot
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      📱 Smartphone
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={formData.slotCapacity?.smartphone ?? 1}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        slotCapacity: { 
                          ...formData.slotCapacity, 
                          smartphone: parseInt(e.target.value) || 1,
                          tablet: formData.slotCapacity?.tablet ?? 1,
                          notebook: formData.slotCapacity?.notebook ?? 1,
                          pc: formData.slotCapacity?.pc ?? 1
                        } 
                      })}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      📲 Tablet
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={formData.slotCapacity?.tablet ?? 1}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        slotCapacity: { 
                          smartphone: formData.slotCapacity?.smartphone ?? 1,
                          tablet: parseInt(e.target.value) || 1,
                          notebook: formData.slotCapacity?.notebook ?? 1,
                          pc: formData.slotCapacity?.pc ?? 1
                        } 
                      })}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      💻 Notebook
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={formData.slotCapacity?.notebook ?? 1}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        slotCapacity: { 
                          smartphone: formData.slotCapacity?.smartphone ?? 1,
                          tablet: formData.slotCapacity?.tablet ?? 1,
                          notebook: parseInt(e.target.value) || 1,
                          pc: formData.slotCapacity?.pc ?? 1
                        } 
                      })}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      🖥️ PC
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      value={formData.slotCapacity?.pc ?? 1}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        slotCapacity: { 
                          smartphone: formData.slotCapacity?.smartphone ?? 1,
                          tablet: formData.slotCapacity?.tablet ?? 1,
                          notebook: formData.slotCapacity?.notebook ?? 1,
                          pc: parseInt(e.target.value) || 1
                        } 
                      })}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Visual Slot Editor */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Move className="h-4 w-4" />
                Editor Visuale Slot
              </Label>
              
              <VisualSlotEditor
                rows={formData.rows}
                columns={formData.columns}
                startNumber={formData.start_number}
                prefix={formData.prefix}
                color={formData.color}
                colorClasses={colorClasses}
                slots={slotData}
                onChange={handleSlotDataChange}
              />
              
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Badge className={cn("bg-gradient-to-r text-white border-0", formData.color)}>
                  {totalSlots} slot totali
                </Badge>
                {mergedSlots.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Merge className="h-3 w-3 mr-1" />
                    {mergedSlots.length} slot uniti
                  </Badge>
                )}
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
