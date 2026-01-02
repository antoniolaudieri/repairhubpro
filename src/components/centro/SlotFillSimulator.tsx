import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Smartphone, 
  Tablet, 
  Laptop, 
  Monitor, 
  X, 
  RotateCcw,
  Info,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SlotCapacity {
  smartphone: number;
  tablet: number;
  notebook: number;
  pc: number;
}

interface ShelfConfig {
  id: string;
  name: string;
  prefix: string;
  rows: number;
  columns: number;
  start_number: number;
  color: string;
  slotCapacity?: SlotCapacity;
}

interface PlacedDevice {
  type: keyof SlotCapacity;
  slotNumber: number;
}

interface SlotFillSimulatorProps {
  shelf: ShelfConfig;
  onClose?: () => void;
}

const DEVICE_TYPES = [
  { key: 'smartphone' as const, icon: Smartphone, label: 'Smartphone', size: 1 },
  { key: 'tablet' as const, icon: Tablet, label: 'Tablet', size: 1.5 },
  { key: 'notebook' as const, icon: Laptop, label: 'Notebook', size: 2 },
  { key: 'pc' as const, icon: Monitor, label: 'PC', size: 3 },
];

const DEFAULT_CAPACITY: SlotCapacity = { smartphone: 3, tablet: 2, notebook: 1, pc: 1 };

export function SlotFillSimulator({ shelf, onClose }: SlotFillSimulatorProps) {
  const [placedDevices, setPlacedDevices] = useState<PlacedDevice[]>([]);
  const [draggedType, setDraggedType] = useState<keyof SlotCapacity | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);

  const capacity = shelf.slotCapacity || DEFAULT_CAPACITY;
  const totalSlots = shelf.rows * shelf.columns;

  // Count devices in a specific slot
  const getSlotDevices = (slotNumber: number) => {
    return placedDevices.filter(d => d.slotNumber === slotNumber);
  };

  // Check if a slot can accept more devices of a type
  const canAddToSlot = (slotNumber: number, type: keyof SlotCapacity) => {
    const slotDevices = getSlotDevices(slotNumber);
    const typeCount = slotDevices.filter(d => d.type === type).length;
    return typeCount < capacity[type];
  };

  // Check if slot is full
  const isSlotFull = (slotNumber: number) => {
    const slotDevices = getSlotDevices(slotNumber);
    return DEVICE_TYPES.every(dt => {
      const count = slotDevices.filter(d => d.type === dt.key).length;
      return count >= capacity[dt.key];
    });
  };

  // Handle drag start
  const handleDragStart = (type: keyof SlotCapacity) => {
    setDraggedType(type);
  };

  const handleDragEnd = () => {
    setDraggedType(null);
    setHoveredSlot(null);
  };

  // Handle drop on slot
  const handleDrop = (slotNumber: number) => {
    if (draggedType && canAddToSlot(slotNumber, draggedType)) {
      setPlacedDevices(prev => [...prev, { type: draggedType, slotNumber }]);
    }
    setDraggedType(null);
    setHoveredSlot(null);
  };

  // Handle drag over slot
  const handleDragOver = (e: React.DragEvent, slotNumber: number) => {
    e.preventDefault();
    setHoveredSlot(slotNumber);
  };

  // Remove a device from slot
  const handleRemoveDevice = (slotNumber: number, type: keyof SlotCapacity) => {
    setPlacedDevices(prev => {
      const idx = prev.findIndex(d => d.slotNumber === slotNumber && d.type === type);
      if (idx > -1) {
        const newArr = [...prev];
        newArr.splice(idx, 1);
        return newArr;
      }
      return prev;
    });
  };

  // Reset simulation
  const handleReset = () => {
    setPlacedDevices([]);
  };

  // Get color classes for shelf
  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; border: string }> = {
      'from-blue-500 to-blue-600': { bg: 'bg-blue-500/20', border: 'border-blue-500/50' },
      'from-emerald-500 to-emerald-600': { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50' },
      'from-violet-500 to-violet-600': { bg: 'bg-violet-500/20', border: 'border-violet-500/50' },
      'from-orange-500 to-orange-600': { bg: 'bg-orange-500/20', border: 'border-orange-500/50' },
      'from-pink-500 to-pink-600': { bg: 'bg-pink-500/20', border: 'border-pink-500/50' },
      'from-cyan-500 to-cyan-600': { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50' },
    };
    return colorMap[color] || { bg: 'bg-primary/20', border: 'border-primary/50' };
  };

  const colorClasses = getColorClasses(shelf.color);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Simulatore Riempimento: {shelf.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Capacity info */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-xs">
        <Info className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Capacità per slot:</span>
        {DEVICE_TYPES.map(dt => (
          <Badge key={dt.key} variant="outline" className="text-[10px]">
            <dt.icon className="h-3 w-3 mr-1" />
            {capacity[dt.key]}
          </Badge>
        ))}
      </div>

      {/* Device palette - drag from here */}
      <div className="flex items-center justify-center gap-3 p-3 rounded-lg bg-muted/30 border border-dashed border-border">
        <span className="text-sm text-muted-foreground mr-2">Trascina sugli slot:</span>
        {DEVICE_TYPES.map(device => (
          <TooltipProvider key={device.key}>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  draggable
                  onDragStart={() => handleDragStart(device.key)}
                  onDragEnd={handleDragEnd}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "cursor-grab active:cursor-grabbing p-3 rounded-lg transition-all",
                    "bg-background border-2 border-border hover:border-primary shadow-sm hover:shadow-md",
                    draggedType === device.key && "opacity-50 scale-95"
                  )}
                >
                  <device.icon className="h-6 w-6" />
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{device.label} (max {capacity[device.key]} per slot)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {/* Slot Grid */}
      <div 
        className={cn(
          "grid gap-2 p-4 rounded-xl border-2",
          colorClasses.bg,
          colorClasses.border
        )}
        style={{ gridTemplateColumns: `repeat(${Math.min(shelf.columns, 10)}, 1fr)` }}
      >
        {Array.from({ length: Math.min(totalSlots, 50) }).map((_, i) => {
          const slotNumber = shelf.start_number + i;
          const slotDevices = getSlotDevices(slotNumber);
          const isFull = isSlotFull(slotNumber);
          const isHovered = hoveredSlot === slotNumber;
          const canDrop = draggedType ? canAddToSlot(slotNumber, draggedType) : false;

          return (
            <motion.div
              key={slotNumber}
              onDrop={() => handleDrop(slotNumber)}
              onDragOver={(e) => handleDragOver(e, slotNumber)}
              onDragLeave={() => setHoveredSlot(null)}
              className={cn(
                "relative min-h-[60px] rounded-lg border-2 transition-all p-1",
                "flex flex-col items-center justify-center gap-0.5",
                isFull 
                  ? "bg-muted/50 border-muted-foreground/20" 
                  : cn("bg-background", colorClasses.border),
                isHovered && canDrop && "ring-2 ring-primary ring-offset-2 scale-105 bg-primary/10",
                isHovered && !canDrop && draggedType && "ring-2 ring-destructive ring-offset-2 bg-destructive/10",
                !draggedType && "hover:shadow-md"
              )}
            >
              {/* Slot number */}
              <span className="absolute top-0.5 left-1 text-[9px] font-mono text-muted-foreground">
                {shelf.prefix}{slotNumber}
              </span>

              {/* Placed devices */}
              <div className="flex flex-wrap gap-0.5 justify-center items-center mt-2">
                <AnimatePresence>
                  {slotDevices.map((device, idx) => {
                    const dt = DEVICE_TYPES.find(d => d.key === device.type)!;
                    return (
                      <motion.div
                        key={`${device.type}-${idx}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className={cn(
                          "relative group rounded p-0.5 bg-gradient-to-br text-white cursor-pointer",
                          shelf.color
                        )}
                        onClick={() => handleRemoveDevice(slotNumber, device.type)}
                        title="Clicca per rimuovere"
                      >
                        <dt.icon className="h-3 w-3" />
                        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <X className="h-2 w-2" />
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Empty state / capacity hint */}
              {slotDevices.length === 0 && (
                <span className="text-[10px] text-muted-foreground/50">
                  {isFull ? 'Pieno' : 'Vuoto'}
                </span>
              )}

              {/* Drop hint */}
              {isHovered && draggedType && (
                <span className="absolute bottom-0.5 text-[8px] font-medium">
                  {canDrop ? '✓' : '✗'}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {placedDevices.length} dispositivi posizionati
        </span>
        <span>
          {totalSlots > 50 && `Mostrati 50 di ${totalSlots} slot`}
        </span>
      </div>
    </div>
  );
}
