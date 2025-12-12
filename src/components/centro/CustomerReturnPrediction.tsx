import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar, Clock, AlertTriangle, Sparkles } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";

interface CustomerReturnPredictionProps {
  predictedReturn: string | null;
  avgInterval: number | null;
  daysOverdue: number | null;
  repairCount: number;
}

export function CustomerReturnPrediction({
  predictedReturn,
  avgInterval,
  daysOverdue,
  repairCount,
}: CustomerReturnPredictionProps) {
  // Not enough data
  if (repairCount < 2 || !predictedReturn) {
    return (
      <Badge variant="secondary" className="gap-1.5 bg-muted/50 text-muted-foreground text-[10px] px-2 py-0.5">
        <Sparkles className="h-3 w-3" />
        Nuovo cliente
      </Badge>
    );
  }

  const predictedDate = new Date(predictedReturn);
  const today = new Date();
  const daysUntilReturn = differenceInDays(predictedDate, today);

  // Overdue
  if (daysOverdue && daysOverdue > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="secondary" 
              className="gap-1.5 bg-red-500/10 text-red-600 border-red-500/20 text-[10px] px-2 py-0.5 animate-pulse"
            >
              <AlertTriangle className="h-3 w-3" />
              Ritardo {daysOverdue}g
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-center">
            <p className="font-medium">In ritardo di {daysOverdue} giorni</p>
            <p className="text-xs text-muted-foreground">
              Doveva tornare il {format(predictedDate, "d MMMM", { locale: it })}
            </p>
            <p className="text-xs text-muted-foreground">
              Intervallo medio: ogni {avgInterval} giorni
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Coming soon (within 7 days)
  if (daysUntilReturn <= 7 && daysUntilReturn >= 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="secondary" 
              className="gap-1.5 bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] px-2 py-0.5"
            >
              <Clock className="h-3 w-3" />
              Tra {daysUntilReturn === 0 ? "oggi" : `${daysUntilReturn}g`}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-center">
            <p className="font-medium">Ritorno previsto presto</p>
            <p className="text-xs text-muted-foreground">
              {format(predictedDate, "EEEE d MMMM", { locale: it })}
            </p>
            <p className="text-xs text-muted-foreground">
              Intervallo medio: ogni {avgInterval} giorni
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Normal prediction
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className="gap-1.5 bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] px-2 py-0.5"
          >
            <Calendar className="h-3 w-3" />
            {format(predictedDate, "d MMM", { locale: it })}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-center">
          <p className="font-medium">Ritorno previsto</p>
          <p className="text-xs text-muted-foreground">
            {format(predictedDate, "EEEE d MMMM yyyy", { locale: it })}
          </p>
          <p className="text-xs text-muted-foreground">
            Intervallo medio: ogni {avgInterval} giorni
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
