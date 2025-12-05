import { 
  Clock, 
  Wrench, 
  Package, 
  CheckCircle2, 
  User,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DirectRepairTimelineProps {
  status: string;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  deliveredAt?: string | null;
  className?: string;
}

interface TimelineStep {
  id: string;
  label: string;
  icon: React.ElementType;
  timestamp?: string | null;
  status: 'completed' | 'current' | 'pending';
}

const getTimelineSteps = (
  currentStatus: string,
  createdAt: string,
  startedAt?: string | null,
  completedAt?: string | null,
  deliveredAt?: string | null
): TimelineStep[] => {
  const statusOrder = ['pending', 'in_progress', 'waiting_parts', 'completed', 'delivered'];
  const currentIndex = statusOrder.indexOf(currentStatus);
  
  // Handle cancelled/forfeited statuses
  if (currentStatus === 'cancelled' || currentStatus === 'forfeited') {
    return [
      {
        id: 'pending',
        label: 'Accettato',
        icon: Clock,
        timestamp: createdAt,
        status: 'completed'
      },
      {
        id: currentStatus,
        label: currentStatus === 'cancelled' ? 'Annullato' : 'Alienato',
        icon: AlertCircle,
        timestamp: null,
        status: 'current'
      }
    ];
  }

  const steps: TimelineStep[] = [
    {
      id: 'pending',
      label: 'Accettato',
      icon: Clock,
      timestamp: createdAt,
      status: currentIndex >= 0 ? 'completed' : 'current'
    },
    {
      id: 'in_progress',
      label: 'In Lavorazione',
      icon: Wrench,
      timestamp: startedAt,
      status: currentIndex > 0 ? (currentIndex === 1 ? 'current' : 'completed') : 'pending'
    }
  ];

  // Add waiting_parts step only if currently in that status
  if (currentStatus === 'waiting_parts') {
    steps.push({
      id: 'waiting_parts',
      label: 'Attesa Ricambi',
      icon: Package,
      timestamp: null,
      status: 'current'
    });
  }

  steps.push(
    {
      id: 'completed',
      label: 'Completato',
      icon: CheckCircle2,
      timestamp: completedAt,
      status: currentIndex >= 3 ? (currentIndex === 3 ? 'current' : 'completed') : 'pending'
    },
    {
      id: 'delivered',
      label: 'Consegnato',
      icon: User,
      timestamp: deliveredAt,
      status: currentIndex >= 4 ? 'current' : 'pending'
    }
  );

  return steps;
};

export function DirectRepairTimeline({
  status,
  createdAt,
  startedAt,
  completedAt,
  deliveredAt,
  className
}: DirectRepairTimelineProps) {
  const steps = getTimelineSteps(status, createdAt, startedAt, completedAt, deliveredAt);

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-start justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.id} className="flex flex-col items-center relative flex-1">
              {/* Connector Line */}
              {!isLast && (
                <div 
                  className={cn(
                    "absolute top-5 left-1/2 w-full h-0.5 z-0",
                    step.status === 'completed' ? "bg-primary" : "bg-border"
                  )}
                />
              )}
              
              {/* Icon Circle */}
              <div
                className={cn(
                  "relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  step.status === 'completed' && "bg-primary border-primary text-primary-foreground",
                  step.status === 'current' && "bg-primary/20 border-primary text-primary animate-pulse",
                  step.status === 'pending' && "bg-muted border-border text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              
              {/* Label */}
              <span 
                className={cn(
                  "mt-2 text-xs font-medium text-center leading-tight max-w-[70px]",
                  step.status === 'current' ? "text-primary" : 
                  step.status === 'completed' ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              
              {/* Timestamp */}
              {step.timestamp && (
                <span className="mt-0.5 text-[10px] text-muted-foreground text-center">
                  {format(new Date(step.timestamp), "dd MMM HH:mm", { locale: it })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
