import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Sparkles,
  AlertTriangle,
  XCircle,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

export interface StatusConfig {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  glowColor: string;
}

export const DIRECT_REPAIR_STATUSES: StatusConfig[] = [
  { 
    id: 'pending', 
    label: 'In Attesa', 
    shortLabel: 'Attesa',
    icon: Clock, 
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500',
    glowColor: 'shadow-yellow-500/50'
  },
  { 
    id: 'in_progress', 
    label: 'In Lavorazione', 
    shortLabel: 'Lavoro',
    icon: Wrench, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    glowColor: 'shadow-blue-500/50'
  },
  { 
    id: 'waiting_parts', 
    label: 'Attesa Ricambi',
    shortLabel: 'Ricambi',
    icon: Package, 
    color: 'text-orange-600',
    bgColor: 'bg-orange-500',
    glowColor: 'shadow-orange-500/50'
  },
  { 
    id: 'completed', 
    label: 'Completato', 
    shortLabel: 'Pronto',
    icon: CheckCircle2, 
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    glowColor: 'shadow-green-500/50'
  },
  { 
    id: 'delivered', 
    label: 'Consegnato', 
    shortLabel: 'Consegna',
    icon: User, 
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500',
    glowColor: 'shadow-emerald-500/50'
  },
  { 
    id: 'cancelled', 
    label: 'Annullato', 
    shortLabel: 'Annullato',
    icon: XCircle, 
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    glowColor: 'shadow-red-500/50'
  },
  { 
    id: 'forfeited', 
    label: 'Alienato', 
    shortLabel: 'Alienato',
    icon: AlertTriangle, 
    color: 'text-rose-600',
    bgColor: 'bg-rose-600',
    glowColor: 'shadow-rose-600/50'
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
    glowColor: 'shadow-yellow-500/50'
  },
  { 
    id: 'quote_sent', 
    label: 'Preventivo Inviato', 
    shortLabel: 'Preventivo',
    icon: FileText, 
    color: 'text-purple-600',
    bgColor: 'bg-purple-500',
    glowColor: 'shadow-purple-500/50'
  },
  { 
    id: 'quote_accepted', 
    label: 'Preventivo Accettato', 
    shortLabel: 'Accettato',
    icon: Check, 
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500',
    glowColor: 'shadow-emerald-500/50'
  },
  { 
    id: 'awaiting_pickup', 
    label: 'In Attesa Ritiro', 
    shortLabel: 'Ritiro',
    icon: Truck, 
    color: 'text-orange-600',
    bgColor: 'bg-orange-500',
    glowColor: 'shadow-orange-500/50'
  },
  { 
    id: 'picked_up', 
    label: 'Ritirato', 
    shortLabel: 'Ritirato',
    icon: Truck, 
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-500',
    glowColor: 'shadow-cyan-500/50'
  },
  { 
    id: 'in_diagnosis', 
    label: 'In Diagnosi', 
    shortLabel: 'Diagnosi',
    icon: Search, 
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-500',
    glowColor: 'shadow-indigo-500/50'
  },
  { 
    id: 'waiting_for_parts', 
    label: 'Attesa Ricambi', 
    shortLabel: 'Ricambi',
    icon: Package, 
    color: 'text-amber-600',
    bgColor: 'bg-amber-500',
    glowColor: 'shadow-amber-500/50'
  },
  { 
    id: 'in_repair', 
    label: 'In Riparazione', 
    shortLabel: 'Riparazione',
    icon: Wrench, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    glowColor: 'shadow-blue-500/50'
  },
  { 
    id: 'repair_completed', 
    label: 'Riparazione Completata', 
    shortLabel: 'Riparato',
    icon: CheckCircle2, 
    color: 'text-teal-600',
    bgColor: 'bg-teal-500',
    glowColor: 'shadow-teal-500/50'
  },
  { 
    id: 'ready_for_return', 
    label: 'Pronto Consegna', 
    shortLabel: 'Pronto',
    icon: Store, 
    color: 'text-lime-600',
    bgColor: 'bg-lime-500',
    glowColor: 'shadow-lime-500/50'
  },
  { 
    id: 'at_corner', 
    label: 'Al Corner', 
    shortLabel: 'Corner',
    icon: Store, 
    color: 'text-violet-600',
    bgColor: 'bg-violet-500',
    glowColor: 'shadow-violet-500/50'
  },
  { 
    id: 'delivered', 
    label: 'Consegnato', 
    shortLabel: 'Consegna',
    icon: User, 
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    glowColor: 'shadow-green-500/50'
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
  
  const currentIndex = statuses.findIndex(s => s.id === currentStatus);
  const currentConfig = statuses.find(s => s.id === currentStatus);
  
  const getStatusState = (index: number) => {
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
    if (readOnly || !onStatusChange) return;
    // Allow moving forward or one step back
    if (index <= currentIndex + 1 && index >= currentIndex - 1) {
      onStatusChange(statusId);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {statuses.map((status, index) => {
          const state = getStatusState(index);
          const Icon = status.icon;
          const isClickable = !readOnly && onStatusChange && 
            (index <= currentIndex + 1 && index >= currentIndex - 1);
          
          return (
            <motion.div
              key={status.id}
              className="flex items-center"
              initial={false}
            >
              <motion.button
                disabled={!isClickable}
                onClick={() => handleStatusClick(status.id, index)}
                onMouseEnter={() => setHoveredStatus(status.id)}
                onMouseLeave={() => setHoveredStatus(null)}
                className={cn(
                  "relative flex items-center justify-center rounded-full transition-all duration-300",
                  state === 'completed' && "bg-emerald-500 text-white",
                  state === 'current' && cn(status.bgColor, "text-white shadow-lg", status.glowColor),
                  state === 'upcoming' && "bg-muted text-muted-foreground",
                  isClickable && "cursor-pointer hover:scale-110",
                  !isClickable && "cursor-default",
                  compact ? "h-7 w-7" : "h-8 w-8"
                )}
                whileHover={isClickable ? { scale: 1.15 } : {}}
                whileTap={isClickable ? { scale: 0.95 } : {}}
                animate={state === 'current' ? {
                  boxShadow: [
                    "0 0 0 0 rgba(var(--primary), 0.4)",
                    "0 0 0 8px rgba(var(--primary), 0)",
                  ]
                } : {}}
                transition={state === 'current' ? {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut"
                } : {}}
              >
                {state === 'completed' ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </motion.button>
              
              {index < statuses.length - 1 && (
                <motion.div 
                  className={cn(
                    "h-0.5 mx-0.5 transition-colors duration-300",
                    state === 'completed' ? "bg-emerald-400" : "bg-muted",
                    compact ? "w-3" : "w-4"
                  )}
                  initial={false}
                  animate={{
                    backgroundColor: state === 'completed' ? "#34d399" : undefined
                  }}
                />
              )}
            </motion.div>
          );
        })}
        
        {/* Status label tooltip */}
        <AnimatePresence>
          {hoveredStatus && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="ml-2"
            >
              <Badge variant="secondary" className="text-xs">
                {statuses.find(s => s.id === hoveredStatus)?.label}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Check if current status is a terminal state (cancelled/forfeited)
  const isTerminalState = currentStatus === 'cancelled' || currentStatus === 'forfeited';
  
  // Filter statuses for display - show main workflow + current terminal if applicable
  const displayStatuses = isTerminalState 
    ? statuses.filter(s => !['cancelled', 'forfeited'].includes(s.id) || s.id === currentStatus)
    : statuses.filter(s => !['cancelled', 'forfeited'].includes(s.id));

  const displayIndex = displayStatuses.findIndex(s => s.id === currentStatus);

  return (
    <Card className="overflow-hidden border-border/50 shadow-lg">
      {/* Header with gradient */}
      <div className={cn(
        "px-5 py-4 border-b border-border/30",
        isTerminalState 
          ? currentStatus === 'cancelled' 
            ? "bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent"
            : "bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent"
          : "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
                currentConfig?.bgColor,
                currentConfig?.glowColor
              )}
              animate={!isTerminalState ? {
                scale: [1, 1.05, 1],
              } : {}}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {currentConfig && <currentConfig.icon className="h-6 w-6" />}
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Stato Attuale</p>
                {isTerminalState && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide",
                      currentStatus === 'cancelled' ? "bg-red-500/20 text-red-600" : "bg-rose-500/20 text-rose-600"
                    )}
                  >
                    Terminato
                  </motion.span>
                )}
              </div>
              <p className={cn(
                "text-lg font-bold",
                currentConfig?.color
              )}>{currentConfig?.label}</p>
            </div>
          </div>
          
          {!readOnly && onStatusChange && !isTerminalState && currentIndex < statuses.length - 1 && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="sm"
                onClick={() => handleStatusClick(statuses[currentIndex + 1].id, currentIndex + 1)}
                className="gap-2 shadow-md"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Avanza
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Info banner for terminal states */}
        <AnimatePresence>
          {isTerminalState && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                currentStatus === 'cancelled' 
                  ? "bg-red-500/5 border-red-500/20 text-red-700"
                  : "bg-rose-500/5 border-rose-500/20 text-rose-700"
              )}
            >
              <Info className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">
                {currentStatus === 'cancelled' 
                  ? "Questa riparazione è stata annullata e non può essere più modificata."
                  : "Il dispositivo è stato alienato dopo il termine di 30 giorni."
                }
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Bar */}
        <div className="relative pt-2">
          <div className="h-3 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm">
            <motion.div
              className={cn(
                "h-full rounded-full bg-gradient-to-r",
                isTerminalState 
                  ? currentStatus === 'cancelled' ? "from-red-400 to-red-500" : "from-rose-400 to-rose-500"
                  : "from-primary/80 to-primary"
              )}
              initial={{ width: 0 }}
              animate={{ 
                width: isTerminalState 
                  ? '100%' 
                  : `${((displayIndex + 1) / displayStatuses.length) * 100}%` 
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          
          <div className="absolute -top-1 left-0 right-0 flex justify-between">
            {displayStatuses.map((status, index) => {
              const state = isTerminalState && status.id === currentStatus 
                ? 'current' 
                : index < displayIndex ? 'completed' 
                : index === displayIndex ? 'current' 
                : 'upcoming';
              const Icon = status.icon;
              const isClickable = !readOnly && onStatusChange && !isTerminalState &&
                (index <= displayIndex + 1 && index >= displayIndex - 1);
              const timestamp = timestamps[`${status.id}_at`] || timestamps[status.id];
              
              return (
                <motion.div
                  key={status.id}
                  className="relative flex flex-col items-center"
                  style={{ width: `${100 / displayStatuses.length}%` }}
                >
                  <motion.button
                    disabled={!isClickable}
                    onClick={() => isClickable && handleStatusClick(status.id, statuses.findIndex(s => s.id === status.id))}
                    onMouseEnter={() => setHoveredStatus(status.id)}
                    onMouseLeave={() => setHoveredStatus(null)}
                    className={cn(
                      "relative h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 border-2",
                      state === 'completed' && "bg-emerald-500 border-emerald-400 text-white shadow-md",
                      state === 'current' && cn(
                        status.bgColor, 
                        "text-white border-white/50 shadow-xl",
                        "ring-4 ring-offset-2 ring-offset-background",
                        status.glowColor.replace('shadow-', 'ring-').replace('/50', '/30')
                      ),
                      state === 'upcoming' && "bg-card border-border text-muted-foreground shadow-sm",
                      isClickable && "cursor-pointer hover:scale-110 hover:shadow-lg",
                      !isClickable && "cursor-default"
                    )}
                    whileHover={isClickable ? { scale: 1.12, y: -3 } : {}}
                    whileTap={isClickable ? { scale: 0.95 } : {}}
                    animate={state === 'current' && !isTerminalState ? {
                      y: [0, -4, 0],
                    } : {}}
                    transition={state === 'current' && !isTerminalState ? {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    } : {}}
                  >
                    {state === 'completed' ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      >
                        <Check className="h-5 w-5" />
                      </motion.div>
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </motion.button>
                  
                  {/* Always show labels */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute top-12 whitespace-nowrap"
                  >
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        "text-xs font-semibold transition-colors",
                        state === 'current' && status.color,
                        state === 'completed' && "text-emerald-600",
                        state === 'upcoming' && "text-muted-foreground"
                      )}>
                        {status.shortLabel}
                      </span>
                      <AnimatePresence>
                        {timestamp && (hoveredStatus === status.id || state === 'current') && (
                          <motion.span 
                            initial={{ opacity: 0, y: -3 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -3 }}
                            className="text-[10px] text-muted-foreground font-medium"
                          >
                            {formatTimestamp(timestamp)}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Spacer for labels */}
        <div className="h-8" />

        {/* Quick actions for non-terminal states */}
        {!readOnly && onStatusChange && !isTerminalState && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between pt-3 border-t border-border/50"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span>Clicca sugli stati per avanzare o retrocedere</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                onClick={() => onStatusChange('cancelled')}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Annulla
              </Button>
            </div>
          </motion.div>
        )}
      </div>
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
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        config.bgColor.replace('bg-', 'bg-') + '/15',
        config.color
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </motion.div>
  );
}
