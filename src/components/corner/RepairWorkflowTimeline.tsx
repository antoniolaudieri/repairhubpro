import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Check, 
  Truck, 
  Building2, 
  Search, 
  Package, 
  Wrench, 
  CheckCircle2, 
  Store,
  User,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface WorkflowStep {
  id: string;
  label: string;
  icon: React.ElementType;
  status: 'completed' | 'current' | 'upcoming';
  timestamp?: string | null;
}

interface StatusTimestamps {
  created_at?: string;
  quote_sent_at?: string | null;
  quote_accepted_at?: string | null;
  awaiting_pickup_at?: string | null;
  picked_up_at?: string | null;
  in_diagnosis_at?: string | null;
  waiting_for_parts_at?: string | null;
  in_repair_at?: string | null;
  repair_completed_at?: string | null;
  ready_for_return_at?: string | null;
  at_corner_at?: string | null;
  delivered_at?: string | null;
}

interface RepairWorkflowTimelineProps {
  currentStatus: string;
  compact?: boolean;
  timestamps?: StatusTimestamps;
}

const getTimestampForStatus = (statusId: string, timestamps?: StatusTimestamps): string | null => {
  if (!timestamps) return null;
  
  const timestampMap: Record<string, keyof StatusTimestamps> = {
    'quote_sent': 'quote_sent_at',
    'quote_accepted': 'quote_accepted_at',
    'awaiting_pickup': 'awaiting_pickup_at',
    'picked_up': 'picked_up_at',
    'in_diagnosis': 'in_diagnosis_at',
    'waiting_for_parts': 'waiting_for_parts_at',
    'in_repair': 'in_repair_at',
    'in_progress': 'in_repair_at', // Alias
    'repair_completed': 'repair_completed_at',
    'ready_for_return': 'ready_for_return_at',
    'at_corner': 'at_corner_at',
    'delivered': 'delivered_at',
    'completed': 'delivered_at', // Alias
  };
  
  const field = timestampMap[statusId];
  return field ? (timestamps[field] as string | null) : null;
};

const getWorkflowSteps = (currentStatus: string, timestamps?: StatusTimestamps): WorkflowStep[] => {
  // Normalize status aliases
  const normalizedStatus = currentStatus === 'completed' ? 'delivered' : 
                          currentStatus === 'in_progress' ? 'in_repair' : 
                          currentStatus;
  
  const statusOrder = [
    { id: 'quote_sent', label: 'Preventivo Inviato', icon: FileText },
    { id: 'quote_accepted', label: 'Preventivo Accettato', icon: Check },
    { id: 'awaiting_pickup', label: 'In Attesa Ritiro', icon: Truck },
    { id: 'picked_up', label: 'Ritirato', icon: Truck },
    { id: 'in_diagnosis', label: 'In Diagnosi', icon: Search },
    { id: 'waiting_for_parts', label: 'Attesa Ricambi', icon: Package },
    { id: 'in_repair', label: 'In Riparazione', icon: Wrench },
    { id: 'repair_completed', label: 'Riparato', icon: CheckCircle2 },
    { id: 'ready_for_return', label: 'Pronto Consegna', icon: Store },
    { id: 'at_corner', label: 'Al Corner', icon: Store },
    { id: 'delivered', label: 'Consegnato', icon: User },
  ];

  const currentIndex = statusOrder.findIndex(s => s.id === normalizedStatus);
  
  return statusOrder.map((step, index) => ({
    ...step,
    status: index < currentIndex ? 'completed' : index === currentIndex ? 'current' : 'upcoming',
    timestamp: getTimestampForStatus(step.id, timestamps)
  }));
};

const formatTimestamp = (timestamp: string | null | undefined): string => {
  if (!timestamp) return '';
  try {
    return format(new Date(timestamp), "d MMM HH:mm", { locale: it });
  } catch {
    return '';
  }
};

export function RepairWorkflowTimeline({ currentStatus, compact = false, timestamps }: RepairWorkflowTimelineProps) {
  // Don't show timeline for early statuses
  if (['pending', 'assigned'].includes(currentStatus)) {
    return null;
  }

  const steps = getWorkflowSteps(currentStatus, timestamps);
  
  // Filter to show only relevant steps based on current status
  const visibleSteps = steps.filter(step => {
    // Always show completed and current
    if (step.status === 'completed' || step.status === 'current') return true;
    // Show next 2 upcoming steps
    const currentIndex = steps.findIndex(s => s.status === 'current');
    const stepIndex = steps.findIndex(s => s.id === step.id);
    return stepIndex <= currentIndex + 2;
  });

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {visibleSteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                  step.status === 'completed' && "bg-emerald-100 text-emerald-700",
                  step.status === 'current' && "bg-primary text-primary-foreground",
                  step.status === 'upcoming' && "bg-muted text-muted-foreground"
                )}
                title={step.timestamp ? formatTimestamp(step.timestamp) : undefined}
              >
                <Icon className="h-3 w-3" />
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {index < visibleSteps.length - 1 && (
                <div className={cn(
                  "w-4 h-0.5 mx-0.5",
                  step.status === 'completed' ? "bg-emerald-300" : "bg-muted"
                )} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stato Lavorazione</p>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-muted" />
        
        <div className="space-y-3">
          {visibleSteps.map((step) => {
            const Icon = step.icon;
            const formattedTime = formatTimestamp(step.timestamp);
            return (
              <div key={step.id} className="flex items-start gap-3 relative">
                <div
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center z-10 shrink-0 mt-0.5",
                    step.status === 'completed' && "bg-emerald-500 text-white",
                    step.status === 'current' && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    step.status === 'upcoming' && "bg-muted text-muted-foreground"
                  )}
                >
                  {step.status === 'completed' ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      "text-sm block",
                      step.status === 'completed' && "text-emerald-700",
                      step.status === 'current' && "font-semibold text-foreground",
                      step.status === 'upcoming' && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                  {formattedTime && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {formattedTime}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: "In Attesa",
    assigned: "Assegnata",
    quote_sent: "Preventivo Inviato",
    quote_accepted: "Preventivo Accettato",
    awaiting_pickup: "In Attesa Ritiro",
    picked_up: "Ritirato dal Corner",
    in_diagnosis: "In Diagnosi",
    waiting_for_parts: "Attesa Ricambi",
    in_repair: "In Riparazione",
    repair_completed: "Riparazione Completata",
    ready_for_return: "Pronto per Consegna",
    at_corner: "Al Corner",
    delivered: "Consegnato al Cliente",
    completed: "Completato",
    cancelled: "Annullata",
  };
  return labels[status] || status;
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
    assigned: "bg-blue-500/20 text-blue-700 border-blue-500/30",
    quote_sent: "bg-purple-500/20 text-purple-700 border-purple-500/30",
    quote_accepted: "bg-emerald-500/20 text-emerald-700 border-emerald-500/30",
    awaiting_pickup: "bg-orange-500/20 text-orange-700 border-orange-500/30",
    picked_up: "bg-cyan-500/20 text-cyan-700 border-cyan-500/30",
    in_diagnosis: "bg-indigo-500/20 text-indigo-700 border-indigo-500/30",
    waiting_for_parts: "bg-amber-500/20 text-amber-700 border-amber-500/30",
    in_repair: "bg-blue-500/20 text-blue-700 border-blue-500/30",
    in_progress: "bg-blue-500/20 text-blue-700 border-blue-500/30",
    repair_completed: "bg-teal-500/20 text-teal-700 border-teal-500/30",
    ready_for_return: "bg-lime-500/20 text-lime-700 border-lime-500/30",
    at_corner: "bg-violet-500/20 text-violet-700 border-violet-500/30",
    delivered: "bg-green-500/20 text-green-700 border-green-500/30",
    completed: "bg-green-500/20 text-green-700 border-green-500/30",
    cancelled: "bg-red-500/20 text-red-700 border-red-500/30",
  };
  return colors[status] || "bg-gray-500/20 text-gray-700 border-gray-500/30";
};