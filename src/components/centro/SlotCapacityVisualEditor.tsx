import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Smartphone, Tablet, Laptop, Monitor, X, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlotCapacity } from "./MultiShelfEditor";

interface SlotCapacityVisualEditorProps {
  capacity: SlotCapacity;
  onChange: (capacity: SlotCapacity) => void;
  shelfColor: string;
}

const DEVICE_TYPES = [
  { key: 'smartphone' as const, icon: Smartphone, emoji: '📱', label: 'Smartphone', size: 1 },
  { key: 'tablet' as const, icon: Tablet, emoji: '📲', label: 'Tablet', size: 1.5 },
  { key: 'notebook' as const, icon: Laptop, emoji: '💻', label: 'Notebook', size: 2 },
  { key: 'pc' as const, icon: Monitor, emoji: '🖥️', label: 'PC', size: 3 },
];

export function SlotCapacityVisualEditor({ capacity, onChange, shelfColor }: SlotCapacityVisualEditorProps) {
  const [draggedType, setDraggedType] = useState<keyof SlotCapacity | null>(null);

  // Calculate visual fill percentage
  const calculateFill = () => {
    const totalUnits = 
      capacity.smartphone * 1 + 
      capacity.tablet * 1.5 + 
      capacity.notebook * 2 + 
      capacity.pc * 3;
    return Math.min(totalUnits / 10, 1); // Max 10 units for visual
  };

  const handleDragStart = (type: keyof SlotCapacity) => {
    setDraggedType(type);
  };

  const handleDragEnd = () => {
    setDraggedType(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedType) {
      const maxValues = { smartphone: 10, tablet: 6, notebook: 4, pc: 2 };
      if (capacity[draggedType] < maxValues[draggedType]) {
        onChange({
          ...capacity,
          [draggedType]: capacity[draggedType] + 1
        });
      }
    }
    setDraggedType(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRemove = (type: keyof SlotCapacity) => {
    if (capacity[type] > 0) {
      onChange({
        ...capacity,
        [type]: capacity[type] - 1
      });
    }
  };

  const handleAdd = (type: keyof SlotCapacity) => {
    const maxValues = { smartphone: 10, tablet: 6, notebook: 4, pc: 2 };
    if (capacity[type] < maxValues[type]) {
      onChange({
        ...capacity,
        [type]: capacity[type] + 1
      });
    }
  };

  const fill = calculateFill();

  return (
    <div className="space-y-3">
      {/* Header with label */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Capacità per tipo dispositivo</span>
        <span className="text-xs text-muted-foreground">Trascina o usa +/-</span>
      </div>

      {/* Device palette - drag from here */}
      <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-muted/30">
        {DEVICE_TYPES.map(device => (
          <motion.div
            key={device.key}
            draggable
            onDragStart={() => handleDragStart(device.key)}
            onDragEnd={handleDragEnd}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "cursor-grab active:cursor-grabbing p-2 rounded-lg transition-colors",
              "bg-background border border-border hover:border-primary/50",
              draggedType === device.key && "opacity-50"
            )}
            title={`Trascina ${device.label}`}
          >
            <device.icon className="h-5 w-5" />
          </motion.div>
        ))}
      </div>

      {/* Visual Slot representation */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={cn(
          "relative min-h-[120px] rounded-xl border-2 border-dashed transition-all overflow-hidden",
          draggedType ? "border-primary bg-primary/5 scale-[1.02]" : "border-border/50 bg-muted/20"
        )}
      >
        {/* Fill indicator */}
        <div 
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t transition-all duration-300",
            shelfColor
          )}
          style={{ height: `${fill * 100}%`, opacity: 0.2 }}
        />

        {/* Slot content */}
        <div className="relative p-3 flex flex-wrap gap-2 items-end justify-center min-h-[120px]">
          <AnimatePresence>
            {DEVICE_TYPES.map(device => (
              Array.from({ length: capacity[device.key] }).map((_, i) => (
                <motion.div
                  key={`${device.key}-${i}`}
                  initial={{ scale: 0, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0, y: -20 }}
                  className={cn(
                    "relative group flex items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-md",
                    shelfColor,
                    device.size === 1 && "h-10 w-8",
                    device.size === 1.5 && "h-12 w-10",
                    device.size === 2 && "h-10 w-14",
                    device.size === 3 && "h-14 w-12"
                  )}
                >
                  <device.icon className={cn(
                    "text-white/90",
                    device.size <= 1.5 ? "h-4 w-4" : "h-5 w-5"
                  )} />
                  {/* Remove button on hover */}
                  <button
                    onClick={() => handleRemove(device.key)}
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </motion.div>
              ))
            ))}
          </AnimatePresence>

          {/* Empty state */}
          {Object.values(capacity).every(v => v === 0) && (
            <div className="text-muted-foreground text-sm text-center py-6">
              Trascina i dispositivi qui
            </div>
          )}
        </div>

        {/* Drop indicator */}
        {draggedType && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-primary/50 font-medium text-sm animate-pulse">
              Rilascia per aggiungere
            </div>
          </div>
        )}
      </div>

      {/* Quick controls - main interaction */}
      <div className="grid grid-cols-1 gap-2">
        {DEVICE_TYPES.map(device => (
          <div key={device.key} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
            <div className={cn(
              "flex-shrink-0 flex items-center justify-center rounded-md p-2",
              shelfColor, "text-white"
            )}>
              <device.icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium flex-1 min-w-0">{device.label}</span>
            <div className="flex-shrink-0 flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleRemove(device.key)}
                disabled={capacity[device.key] === 0}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-base font-bold w-6 text-center">{capacity[device.key]}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleAdd(device.key)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Total capacity summary */}
      <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-primary/10 text-primary text-sm">
        <span className="font-medium">Totale:</span>
        <span>📱{capacity.smartphone}</span>
        <span>📲{capacity.tablet}</span>
        <span>💻{capacity.notebook}</span>
        <span>🖥️{capacity.pc}</span>
      </div>
    </div>
  );
}
