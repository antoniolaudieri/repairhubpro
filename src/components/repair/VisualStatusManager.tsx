import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Clock, 
  Check, 
  Truck, 
  Search, 
  Package, 
  Wrench, 
  CheckCircle2, 
  Store,
  User,
  FileText,
  ChevronRight,
  AlertTriangle,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";

export interface StatusConfig {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

// Stati validi nel database: pending, in_progress, waiting_for_parts, completed, delivered, cancelled
export const DIRECT_REPAIR_STATUSES: StatusConfig[] = [
  { 
    id: 'pending', 
    label: 'In Attesa', 
    shortLabel: 'Attesa',
    icon: Clock, 
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500',
  },
  { 
    id: 'in_progress', 
    label: 'In Lavorazione', 
    shortLabel: 'Lavoro',
    icon: Wrench, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
  },
  { 
    id: 'waiting_for_parts', 
    label: 'Attesa Ricambi', 
    shortLabel: 'Ricambi',
    icon: Package, 
    color: 'text-orange-600',
    bgColor: 'bg-orange-500',
  },
  { 
    id: 'parts_arrived', 
    label: 'Ricambi Arrivati', 
    shortLabel: 'Arrivati',
    icon: CheckCircle2, 
    color: 'text-teal-600',
    bgColor: 'bg-teal-500',
  },
  {
    id: 'completed', 
    label: 'Completato', 
    shortLabel: 'Pronto',
    icon: CheckCircle2, 
    color: 'text-green-600',
    bgColor: 'bg-green-500',
  },
  { 
    id: 'delivered', 
    label: 'Consegnato', 
    shortLabel: 'Consegna',
    icon: User, 
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500',
  },
  { 
    id: 'cancelled', 
    label: 'Annullato', 
    shortLabel: 'Annullato',
    icon: XCircle, 
    color: 'text-red-600',
    bgColor: 'bg-red-500',
  },
];

export const CORNER_REPAIR_STATUSES: StatusConfig[] = [
  { 
    id: 'pending', 
    label: 'In Attesa', 
    shortLabel: 'Attesa',
    icon: Clock, 
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500',
  },
  { 
    id: 'quote_sent', 
    label: 'Preventivo Inviato', 
    shortLabel: 'Preventivo',
    icon: FileText, 
    color: 'text-purple-600',
    bgColor: 'bg-purple-500',
  },
  { 
    id: 'quote_accepted', 
    label: 'Preventivo Accettato', 
    shortLabel: 'Accettato',
    icon: Check, 
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500',
  },
  { 
    id: 'awaiting_pickup', 
    label: 'In Attesa Ritiro', 
    shortLabel: 'Ritiro',
    icon: Truck, 
    color: 'text-orange-600',
    bgColor: 'bg-orange-500',
  },
  { 
    id: 'picked_up', 
    label: 'Ritirato', 
    shortLabel: 'Ritirato',
    icon: Truck, 
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-500',
  },
  { 
    id: 'in_diagnosis', 
    label: 'In Diagnosi', 
    shortLabel: 'Diagnosi',
    icon: Search, 
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-500',
  },
  { 
    id: 'waiting_for_parts', 
    label: 'Attesa Ricambi', 
    shortLabel: 'Ricambi',
    icon: Package, 
    color: 'text-amber-600',
    bgColor: 'bg-amber-500',
  },
  { 
    id: 'in_repair', 
    label: 'In Riparazione', 
    shortLabel: 'Riparazione',
    icon: Wrench, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
  },
  { 
    id: 'repair_completed', 
    label: 'Riparazione Completata', 
    shortLabel: 'Riparato',
    icon: CheckCircle2, 
    color: 'text-teal-600',
    bgColor: 'bg-teal-500',
  },
  { 
    id: 'ready_for_return', 
    label: 'Pronto Consegna', 
    shortLabel: 'Pronto',
    icon: Store, 
    color: 'text-lime-600',
    bgColor: 'bg-lime-500',
  },
  { 
    id: 'at_corner', 
    label: 'Al Corner', 
    shortLabel: 'Corner',
    icon: Store, 
    color: 'text-violet-600',
    bgColor: 'bg-violet-500',
  },
  { 
    id: 'delivered', 
    label: 'Consegnato', 
    shortLabel: 'Consegna',
    icon: User, 
    color: 'text-green-600',
    bgColor: 'bg-green-500',
  },
];

interface VisualStatusManagerProps {
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
  statuses?: StatusConfig[];
  readOnly?: boolean;
  compact?: boolean;
  timestamps?: Record<string, string | null>;
}

export function VisualStatusManager({ 
  currentStatus, 
  onStatusChange, 
  statuses = DIRECT_REPAIR_STATUSES,
  readOnly = false,
  compact = false,
  timestamps = {}
}: VisualStatusManagerProps) {
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);
  const [terminalConfirmDialog, setTerminalConfirmDialog] = useState<{ open: boolean; statusId: string | null }>({ open: false, statusId: null });
  
  // Filter out terminal states for the main workflow
  const workflowStatuses = statuses.filter(s => s.id !== 'cancelled');
  const terminalStatuses = statuses.filter(s => s.id === 'cancelled');
  
  const currentIndex = workflowStatuses.findIndex(s => s.id === currentStatus);
  const currentConfig = statuses.find(s => s.id === currentStatus);
  const isTerminalState = currentStatus === 'cancelled';
  
  const getStatusState = (index: number) => {
    if (isTerminalState) return 'disabled';
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'upcoming';
  };

  const formatTimestamp = (timestamp: string | null | undefined): string => {
    if (!timestamp) return '';
    try {
      return format(new Date(timestamp), "d MMM HH:mm", { locale: it });
    } catch {
      return '';
    }
  };

  const handleStatusClick = (statusId: string, index: number) => {
    if (readOnly || !onStatusChange || isTerminalState) return;
    if (index <= currentIndex + 1 && index >= currentIndex - 1) {
      onStatusChange(statusId);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {workflowStatuses.map((status, index) => {
          const state = getStatusState(index);
          const Icon = status.icon;
          const isClickable = !readOnly && onStatusChange && !isTerminalState &&
            (index <= currentIndex + 1 && index >= currentIndex - 1);
          
          return (
            <div key={status.id} className="flex items-center">
              <button
                disabled={!isClickable}
                onClick={() => handleStatusClick(status.id, index)}
                onMouseEnter={() => setHoveredStatus(status.id)}
                onMouseLeave={() => setHoveredStatus(null)}
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center transition-all duration-200",
                  state === 'completed' && "bg-primary text-primary-foreground",
                  state === 'current' && cn(status.bgColor, "text-white ring-2 ring-offset-1 ring-offset-background ring-primary/30"),
                  state === 'upcoming' && "bg-muted text-muted-foreground",
                  state === 'disabled' && "bg-muted/50 text-muted-foreground/50",
                  isClickable && "cursor-pointer hover:scale-110"
                )}
              >
                {state === 'completed' ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
              </button>
              
              {index < workflowStatuses.length - 1 && (
                <div className={cn(
                  "w-3 h-0.5 mx-0.5",
                  state === 'completed' ? "bg-primary" : "bg-border"
                )} />
              )}
            </div>
          );
        })}
        
        {hoveredStatus && (
          <Badge variant="secondary" className="ml-2 text-xs">
            {statuses.find(s => s.id === hoveredStatus)?.label}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/5 to-transparent px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center text-white",
                currentConfig?.bgColor || "bg-muted"
              )}
              animate={!isTerminalState ? { scale: [1, 1.03, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {currentConfig && <currentConfig.icon className="h-6 w-6" />}
            </motion.div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Stato Attuale
              </p>
              <p className={cn("text-lg font-semibold", currentConfig?.color)}>
                {currentConfig?.label || currentStatus}
              </p>
            </div>
          </div>
          
          {!readOnly && onStatusChange && !isTerminalState && currentIndex < workflowStatuses.length - 1 && (
            <Button
              size="sm"
              onClick={() => handleStatusClick(workflowStatuses[currentIndex + 1].id, currentIndex + 1)}
              className="gap-1.5"
            >
              Avanza
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Terminal state banner */}
        {isTerminalState && (
          <div className="flex items-center gap-3 p-4 rounded-lg border bg-red-50 border-red-200 text-red-800">
            <XCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              Questa riparazione è stata annullata.
            </p>
          </div>
        )}

        {/* Workflow Progress */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Progressione Lavoro</p>
          
          <div className="relative">
            {/* Progress bar background */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ 
                  width: isTerminalState 
                    ? '0%' 
                    : `${((currentIndex + 1) / workflowStatuses.length) * 100}%` 
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            {/* Status nodes */}
            <div className="flex justify-between mt-4">
              {workflowStatuses.map((status, index) => {
                const state = getStatusState(index);
                const Icon = status.icon;
                const isClickable = !readOnly && onStatusChange && !isTerminalState &&
                  (index <= currentIndex + 1 && index >= currentIndex - 1);
                const timestamp = timestamps[`${status.id}_at`] || timestamps[status.id];
                const isHovered = hoveredStatus === status.id;
                const isCurrent = state === 'current';
                
                return (
                  <div 
                    key={status.id}
                    className="flex flex-col items-center"
                    style={{ width: `${100 / workflowStatuses.length}%` }}
                  >
                    <motion.button
                      disabled={!isClickable}
                      onClick={() => handleStatusClick(status.id, index)}
                      onMouseEnter={() => setHoveredStatus(status.id)}
                      onMouseLeave={() => setHoveredStatus(null)}
                      className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center transition-all duration-200 border-2",
                        state === 'completed' && "bg-primary border-primary text-primary-foreground",
                        state === 'current' && cn(status.bgColor, "border-transparent text-white shadow-md"),
                        state === 'upcoming' && "bg-card border-border text-muted-foreground",
                        state === 'disabled' && "bg-muted/30 border-border/50 text-muted-foreground/50",
                        isClickable && "cursor-pointer hover:scale-105 hover:shadow-md"
                      )}
                      whileTap={isClickable ? { scale: 0.95 } : {}}
                    >
                      {state === 'completed' ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </motion.button>
                    
                    {/* Label */}
                    <div className={cn(
                      "mt-2 text-center transition-all duration-200",
                      (isCurrent || isHovered) ? "opacity-100" : "opacity-70"
                    )}>
                      <p className={cn(
                        "text-xs font-medium leading-tight",
                        state === 'current' && status.color,
                        state === 'completed' && "text-primary",
                        state === 'upcoming' && "text-muted-foreground",
                        state === 'disabled' && "text-muted-foreground/50"
                      )}>
                        {status.shortLabel}
                      </p>
                      {timestamp && (isCurrent || isHovered) && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatTimestamp(timestamp)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Terminal states selector (only if not already terminal and not readonly) */}
        {!readOnly && onStatusChange && !isTerminalState && terminalStatuses.length > 0 && (
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-3">Stati Speciali</p>
            <div className="flex gap-2">
              {terminalStatuses.map((status) => {
                const Icon = status.icon;
                return (
                  <Button
                    key={status.id}
                    variant="outline"
                    size="sm"
                    onClick={() => setTerminalConfirmDialog({ open: true, statusId: status.id })}
                    className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {status.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Terminal state confirmation dialog */}
      <AlertDialog 
        open={terminalConfirmDialog.open} 
        onOpenChange={(open) => setTerminalConfirmDialog({ open, statusId: open ? terminalConfirmDialog.statusId : null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Conferma Annullamento
            </AlertDialogTitle>
            <AlertDialogDescription>
              Stai per annullare questa riparazione. Questa azione è irreversibile e la riparazione non potrà più essere modificata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (terminalConfirmDialog.statusId && onStatusChange) {
                  onStatusChange(terminalConfirmDialog.statusId);
                }
                setTerminalConfirmDialog({ open: false, statusId: null });
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Simple badge for lists
export function StatusBadge({ status, statuses = DIRECT_REPAIR_STATUSES }: { status: string; statuses?: StatusConfig[] }) {
  const config = statuses.find(s => s.id === status);
  if (!config) {
    return <Badge variant="secondary">{status}</Badge>;
  }
  
  const Icon = config.icon;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
      config.bgColor.replace('bg-', 'bg-') + '/10',
      config.color
    )}>
      <Icon className="h-3 w-3" />
      {config.shortLabel}
    </span>
  );
}
