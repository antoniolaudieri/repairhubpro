import { Euro, Wrench, Clock, TrendingUp, Calendar, Target, Star, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface CustomerStatsProps {
  totalRepairs: number;
  totalSpent: number;
  avgRepairTime: number;
  completionRate: number;
  pendingRepairs?: number;
  inProgressRepairs?: number;
  lastRepairDate?: string | null;
}

export function CustomerStats({ 
  totalRepairs, 
  totalSpent, 
  avgRepairTime, 
  completionRate,
  pendingRepairs = 0,
  inProgressRepairs = 0,
  lastRepairDate
}: CustomerStatsProps) {
  const getCompletionColor = () => {
    if (completionRate >= 80) return "text-accent";
    if (completionRate >= 50) return "text-warning";
    return "text-destructive";
  };

  const getTimeColor = () => {
    if (avgRepairTime <= 3) return "text-accent";
    if (avgRepairTime <= 7) return "text-warning";
    return "text-destructive";
  };

  const formatLastRepair = () => {
    if (!lastRepairDate) return "Mai";
    const date = new Date(lastRepairDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Oggi";
    if (diffDays === 1) return "Ieri";
    if (diffDays < 7) return `${diffDays} giorni fa`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} settimane fa`;
    return `${Math.floor(diffDays / 30)} mesi fa`;
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Total Repairs */}
      <Card className="overflow-hidden">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                Riparazioni
              </p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1">{totalRepairs}</p>
              <div className="flex items-center gap-1 mt-2">
                {pendingRepairs > 0 && (
                  <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-medium">
                    {pendingRepairs} attesa
                  </span>
                )}
                {inProgressRepairs > 0 && (
                  <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {inProgressRepairs} corso
                  </span>
                )}
              </div>
            </div>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Spent */}
      <Card className="overflow-hidden">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                Spesa Totale
              </p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 text-gradient">
                €{totalSpent.toFixed(0)}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                Media: €{totalRepairs > 0 ? (totalSpent / totalRepairs).toFixed(0) : 0}/riparaz.
              </p>
            </div>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Euro className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avg Repair Time */}
      <Card className="overflow-hidden">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                Tempo Medio
              </p>
              <p className={`text-xl sm:text-2xl lg:text-3xl font-bold mt-1 ${getTimeColor()}`}>
                {avgRepairTime}
                <span className="text-sm sm:text-base font-normal ml-1">gg</span>
              </p>
              <div className="mt-2">
                <Progress 
                  value={Math.min(100, (avgRepairTime / 14) * 100)} 
                  className="h-1.5"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {avgRepairTime <= 3 ? "Veloce" : avgRepairTime <= 7 ? "Normale" : "Lungo"}
                </p>
              </div>
            </div>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-info/10 flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-info" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completion Rate */}
      <Card className="overflow-hidden">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                Completamento
              </p>
              <p className={`text-xl sm:text-2xl lg:text-3xl font-bold mt-1 ${getCompletionColor()}`}>
                {completionRate}%
              </p>
              <div className="mt-2">
                <Progress 
                  value={completionRate} 
                  className="h-1.5"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Ultima: {formatLastRepair()}
                </p>
              </div>
            </div>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
