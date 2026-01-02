import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { GripVertical, Plus, Minus } from "lucide-react";
import { toast } from "sonner";

export interface SlotData {
  id: string;
  slotNum: number;
  row: number;
  col: number;
  span: number; // Width in columns (1 = normal, 2+ = merged)
}

interface VisualSlotEditorProps {
  rows: number;
  columns: number;
  startNumber: number;
  prefix: string;
  color: string;
  colorClasses: {
    bg: string;
    border: string;
    text: string;
  };
  slots: SlotData[];
  onChange: (slots: SlotData[]) => void;
}

export function VisualSlotEditor({
  rows,
  columns,
  startNumber,
  prefix,
  color,
  colorClasses,
  slots,
  onChange,
}: VisualSlotEditorProps) {
  const [draggedSlot, setDraggedSlot] = useState<SlotData | null>(null);
  const [resizingSlot, setResizingSlot] = useState<SlotData | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ row: number; col: number } | null>(null);
  const [resizePreview, setResizePreview] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Build a grid representation
  const getSlotAt = useCallback((row: number, col: number): SlotData | null => {
    for (const slot of slots) {
      if (slot.row === row && col >= slot.col && col < slot.col + slot.span) {
        return slot;
      }
    }
    return null;
  }, [slots]);

  // Check if a cell is available (not occupied by any slot span)
  const isCellAvailable = useCallback((row: number, col: number, excludeSlotId?: string): boolean => {
    for (const slot of slots) {
      if (excludeSlotId && slot.id === excludeSlotId) continue;
      if (slot.row === row && col >= slot.col && col < slot.col + slot.span) {
        return false;
      }
    }
    return col < columns;
  }, [slots, columns]);

  // Can slot move to target position?
  const canMoveTo = useCallback((slot: SlotData, targetRow: number, targetCol: number): boolean => {
    if (targetCol < 0 || targetCol + slot.span > columns || targetRow < 0 || targetRow >= rows) {
      return false;
    }
    for (let c = targetCol; c < targetCol + slot.span; c++) {
      if (!isCellAvailable(targetRow, c, slot.id)) {
        return false;
      }
    }
    return true;
  }, [columns, rows, isCellAvailable]);

  // Calculate max possible span at position (now can merge with adjacent slots)
  const getMaxSpanWithMerge = useCallback((row: number, startCol: number, currentSlotId: string): number => {
    // Can extend up to the end of the row
    return columns - startCol;
  }, [columns]);

  // Get slots that would be absorbed by extending to newSpan
  const getSlotsToAbsorb = useCallback((slot: SlotData, newSpan: number): SlotData[] => {
    const absorbed: SlotData[] = [];
    for (let c = slot.col + slot.span; c < slot.col + newSpan; c++) {
      const slotAtCol = slots.find(s => 
        s.id !== slot.id && 
        s.row === slot.row && 
        c >= s.col && c < s.col + s.span
      );
      if (slotAtCol && !absorbed.find(a => a.id === slotAtCol.id)) {
        absorbed.push(slotAtCol);
      }
    }
    return absorbed;
  }, [slots]);

  // Handle expand slot (merge with next)
  const handleExpandSlot = useCallback((slot: SlotData) => {
    const newSpan = slot.span + 1;
    if (slot.col + newSpan > columns) {
      toast.error("Non puoi allargare oltre la riga");
      return;
    }
    
    const slotsToAbsorb = getSlotsToAbsorb(slot, newSpan);
    const newSlots = slots
      .filter(s => !slotsToAbsorb.find(a => a.id === s.id))
      .map(s => s.id === slot.id ? { ...s, span: newSpan } : s);
    
    onChange(newSlots);
    if (slotsToAbsorb.length > 0) {
      toast.success(`Slot unito con ${slotsToAbsorb.length} adiacente`);
    } else {
      toast.success(`Slot allargato`);
    }
  }, [slots, columns, getSlotsToAbsorb, onChange]);

  // Handle shrink slot (split off last column)
  const handleShrinkSlot = useCallback((slot: SlotData) => {
    if (slot.span <= 1) return;
    
    const newSpan = slot.span - 1;
    const newSlotNum = slot.slotNum + newSpan;
    const newSlot: SlotData = {
      id: `slot-${newSlotNum}-${Date.now()}`,
      slotNum: newSlotNum,
      row: slot.row,
      col: slot.col + newSpan,
      span: 1,
    };
    
    const newSlots = [
      ...slots.map(s => s.id === slot.id ? { ...s, span: newSpan } : s),
      newSlot
    ];
    
    onChange(newSlots);
    toast.success(`Slot separato`);
  }, [slots, onChange, startNumber, columns]);

  // Handle drag start
  const handleDragStart = (slot: SlotData) => {
    setDraggedSlot(slot);
  };

  // Handle drag over cell
  const handleDragOver = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    setDragOverCell({ row, col });
  };

  // Handle drop on empty cell
  const handleDropOnEmpty = (row: number, col: number) => {
    if (!draggedSlot) return;
    
    if (canMoveTo(draggedSlot, row, col)) {
      const newSlots = slots.map(s => 
        s.id === draggedSlot.id 
          ? { ...s, row, col, slotNum: startNumber + row * columns + col }
          : s
      );
      onChange(newSlots);
      toast.success("Slot spostato");
    }
    
    setDraggedSlot(null);
    setDragOverCell(null);
  };

  // Handle drop on another slot (swap)
  const handleDropOnSlot = (targetSlot: SlotData) => {
    if (!draggedSlot || draggedSlot.id === targetSlot.id) {
      setDraggedSlot(null);
      setDragOverCell(null);
      return;
    }
    
    // Swap positions
    const newSlots = slots.map(s => {
      if (s.id === draggedSlot.id) {
        return { 
          ...s, 
          row: targetSlot.row, 
          col: targetSlot.col, 
          slotNum: targetSlot.slotNum 
        };
      }
      if (s.id === targetSlot.id) {
        return { 
          ...s, 
          row: draggedSlot.row, 
          col: draggedSlot.col, 
          slotNum: draggedSlot.slotNum 
        };
      }
      return s;
    });
    
    onChange(newSlots);
    toast.success("Slot scambiati");
    
    setDraggedSlot(null);
    setDragOverCell(null);
  };

  // Handle resize start - now can merge with adjacent slots
  const handleResizeStart = (e: React.MouseEvent, slot: SlotData) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingSlot(slot);
    setResizePreview(slot.span);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!gridRef.current) return;
      
      const rect = gridRef.current.getBoundingClientRect();
      const cellWidth = rect.width / columns;
      const mouseX = moveEvent.clientX - rect.left;
      const slotStartX = slot.col * cellWidth;
      const newSpan = Math.max(1, Math.round((mouseX - slotStartX) / cellWidth));
      const maxSpan = getMaxSpanWithMerge(slot.row, slot.col, slot.id);
      
      setResizePreview(Math.min(newSpan, maxSpan));
    };

    const handleMouseUp = () => {
      setResizingSlot(null);
      setResizePreview((currentPreview) => {
        if (currentPreview !== null && currentPreview !== slot.span) {
          let newSlots: SlotData[];
          
          if (currentPreview > slot.span) {
            // Expanding: absorb adjacent slots
            const slotsToAbsorb = getSlotsToAbsorb(slot, currentPreview);
            newSlots = slots
              .filter(s => !slotsToAbsorb.find(a => a.id === s.id))
              .map(s => s.id === slot.id ? { ...s, span: currentPreview } : s);
            
            if (slotsToAbsorb.length > 0) {
              toast.success(`Uniti ${slotsToAbsorb.length + 1} slot`);
            } else {
              toast.success(`Slot allargato a ${currentPreview} colonne`);
            }
          } else {
            // Shrinking: create new slots for freed space
            const freedSlots: SlotData[] = [];
            for (let c = slot.col + currentPreview; c < slot.col + slot.span; c++) {
              const newSlotNum = startNumber + slot.row * columns + c;
              freedSlots.push({
                id: `slot-${newSlotNum}-${Date.now()}`,
                slotNum: newSlotNum,
                row: slot.row,
                col: c,
                span: 1,
              });
            }
            
            newSlots = [
              ...slots.map(s => s.id === slot.id ? { ...s, span: currentPreview } : s),
              ...freedSlots
            ];
            
            toast.success(`Slot separati (${freedSlots.length} nuovi slot creati)`);
          }
          
          onChange(newSlots);
        }
        return null;
      });
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Build grid cells
  const renderGrid = () => {
    const cells: JSX.Element[] = [];
    const renderedSlots = new Set<string>();

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const slot = getSlotAt(row, col);
        const isDropTarget = dragOverCell?.row === row && dragOverCell?.col === col;
        
        if (slot && slot.col === col && !renderedSlots.has(slot.id)) {
          // Render the slot
          renderedSlots.add(slot.id);
          const isBeingDragged = draggedSlot?.id === slot.id;
          const isBeingResized = resizingSlot?.id === slot.id;
          const currentSpan = isBeingResized && resizePreview !== null ? resizePreview : slot.span;
          
          cells.push(
            <motion.div
              key={slot.id}
              draggable
              onDragStart={() => handleDragStart(slot)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCell({ row: slot.row, col: slot.col });
              }}
              onDrop={() => handleDropOnSlot(slot)}
              onDragEnd={() => {
                setDraggedSlot(null);
                setDragOverCell(null);
              }}
              className={cn(
                "relative rounded-lg flex items-center justify-center text-xs font-mono font-medium transition-all",
                "border-2 select-none group",
                currentSpan > 1
                  ? cn("bg-gradient-to-r text-white border-white/30", color)
                  : cn(colorClasses.bg, colorClasses.text, colorClasses.border),
                isBeingDragged && "opacity-50 scale-95",
                isDropTarget && draggedSlot && draggedSlot.id !== slot.id && "ring-2 ring-primary ring-offset-2",
                "cursor-grab active:cursor-grabbing hover:shadow-lg hover:z-10"
              )}
              style={{
                gridColumn: `${col + 1} / span ${currentSpan}`,
                gridRow: row + 1,
                aspectRatio: `${currentSpan}/1`,
              }}
              layout
            >
              {/* Drag handle */}
              <GripVertical className="absolute left-1 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
              
              {/* Slot label */}
              <span className="pointer-events-none">
                {prefix}{slot.slotNum}
                {currentSpan > 1 && `-${slot.slotNum + currentSpan - 1}`}
              </span>
              
              {/* Expand/Shrink buttons */}
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {currentSpan > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShrinkSlot(slot);
                    }}
                    className="p-0.5 rounded bg-white/20 hover:bg-white/40 transition-colors"
                    title="Riduci slot"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                )}
                {slot.col + currentSpan < columns && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExpandSlot(slot);
                    }}
                    className="p-0.5 rounded bg-white/20 hover:bg-white/40 transition-colors"
                    title="Allarga slot (unisci con adiacente)"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>
            </motion.div>
          );
        } else if (!slot) {
          // Render empty cell
          cells.push(
            <div
              key={`empty-${row}-${col}`}
              onDragOver={(e) => handleDragOver(e, row, col)}
              onDrop={() => handleDropOnEmpty(row, col)}
              className={cn(
                "rounded-lg border-2 border-dashed border-border/50 transition-all",
                "flex items-center justify-center text-[10px] text-muted-foreground/50",
                isDropTarget && draggedSlot && canMoveTo(draggedSlot, row, col) &&
                  "border-primary bg-primary/10 ring-2 ring-primary/30"
              )}
              style={{
                gridColumn: col + 1,
                gridRow: row + 1,
                aspectRatio: "1/1",
              }}
            >
              {startNumber + row * columns + col}
            </div>
          );
        }
      }
    }

    return cells;
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 space-y-1">
        <p>• <strong>Clicca +</strong> su uno slot per unirlo con quello adiacente</p>
        <p>• <strong>Clicca -</strong> per separare uno slot unito</p>
        <p>• <strong>Trascina</strong> uno slot su un altro per scambiarli</p>
      </div>
      
      <div
        ref={gridRef}
        className={cn("rounded-xl border-2 p-4 overflow-auto", colorClasses.border)}
      >
        <div className={cn("h-1.5 -mx-4 -mt-4 mb-4 bg-gradient-to-r", color)} />
        
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {renderGrid()}
        </div>
      </div>
    </div>
  );
}

// Helper function to convert merged slots format to SlotData array
export function mergedSlotsToSlotData(
  rows: number,
  columns: number,
  startNumber: number,
  mergedSlots: { startSlot: number; span: number }[]
): SlotData[] {
  const result: SlotData[] = [];
  const mergedStarts = new Set(mergedSlots.map(m => m.startSlot));
  const mergedCovered = new Set<number>();
  
  // Mark all slots covered by merges
  for (const merge of mergedSlots) {
    for (let i = 1; i < merge.span; i++) {
      mergedCovered.add(merge.startSlot + i);
    }
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const slotNum = startNumber + row * columns + col;
      
      // Skip if this slot is covered by a merge (but not the start)
      if (mergedCovered.has(slotNum)) continue;
      
      // Check if this is a merged slot start
      const merge = mergedSlots.find(m => m.startSlot === slotNum);
      
      result.push({
        id: `slot-${slotNum}`,
        slotNum,
        row,
        col,
        span: merge ? merge.span : 1,
      });
    }
  }

  return result;
}

// Helper function to convert SlotData array back to merged slots format
export function slotDataToMergedSlots(slots: SlotData[]): { startSlot: number; span: number }[] {
  return slots
    .filter(slot => slot.span > 1)
    .map(slot => ({
      startSlot: slot.slotNum,
      span: slot.span,
    }));
}
