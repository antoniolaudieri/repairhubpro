import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  CalendarDays, 
  CalendarRange,
  Trophy,
  Flame,
  Zap,
  Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";

interface GoalsWidgetProps {
  centroId: string;
  monthlyGoal: number;
}

interface PeriodStats {
  revenue: number;
  target: number;
  progress: number;
  remaining: number;
  daysLeft: number;
  dailyNeeded: number;
}

export const GoalsWidget = ({ centroId, monthlyGoal }: GoalsWidgetProps) => {
  const [dailyStats, setDailyStats] = useState<PeriodStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<PeriodStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<PeriodStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (centroId && monthlyGoal > 0) {
      calculateStats();
    } else {
      setLoading(false);
    }
  }, [centroId, monthlyGoal]);

  const calculateStats = async () => {
    try {
      const now = new Date();
      const dayStart = startOfDay(now);
      const dayEnd = endOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Calculate targets based on monthly goal
      const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
      const workDaysInMonth = Math.round(daysInMonth * (5 / 7)); // Assume 5 work days per week
      const dailyTarget = monthlyGoal / workDaysInMonth;
      const weeklyTarget = dailyTarget * 5; // 5 work days per week

      // Fetch revenue for each period
      const [dailyRes, weeklyRes, monthlyRes] = await Promise.all([
        supabase
          .from("commission_ledger")
          .select("gross_revenue")
          .eq("centro_id", centroId)
          .gte("created_at", dayStart.toISOString())
          .lte("created_at", dayEnd.toISOString()),
        supabase
          .from("commission_ledger")
          .select("gross_revenue")
          .eq("centro_id", centroId)
          .gte("created_at", weekStart.toISOString())
          .lte("created_at", weekEnd.toISOString()),
        supabase
          .from("commission_ledger")
          .select("gross_revenue")
          .eq("centro_id", centroId)
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString()),
      ]);

      const dailyRevenue = dailyRes.data?.reduce((sum, r) => sum + (r.gross_revenue || 0), 0) || 0;
      const weeklyRevenue = weeklyRes.data?.reduce((sum, r) => sum + (r.gross_revenue || 0), 0) || 0;
      const monthlyRevenue = monthlyRes.data?.reduce((sum, r) => sum + (r.gross_revenue || 0), 0) || 0;

      // Days remaining calculations
      const daysLeftInWeek = differenceInDays(weekEnd, now) + 1;
      const daysLeftInMonth = differenceInDays(monthEnd, now) + 1;

      setDailyStats({
        revenue: dailyRevenue,
        target: dailyTarget,
        progress: Math.min((dailyRevenue / dailyTarget) * 100, 100),
        remaining: Math.max(dailyTarget - dailyRevenue, 0),
        daysLeft: 1,
        dailyNeeded: Math.max(dailyTarget - dailyRevenue, 0),
      });

      setWeeklyStats({
        revenue: weeklyRevenue,
        target: weeklyTarget,
        progress: Math.min((weeklyRevenue / weeklyTarget) * 100, 100),
        remaining: Math.max(weeklyTarget - weeklyRevenue, 0),
        daysLeft: daysLeftInWeek,
        dailyNeeded: daysLeftInWeek > 0 ? Math.max((weeklyTarget - weeklyRevenue) / daysLeftInWeek, 0) : 0,
      });

      setMonthlyStats({
        revenue: monthlyRevenue,
        target: monthlyGoal,
        progress: Math.min((monthlyRevenue / monthlyGoal) * 100, 100),
        remaining: Math.max(monthlyGoal - monthlyRevenue, 0),
        daysLeft: daysLeftInMonth,
        dailyNeeded: daysLeftInMonth > 0 ? Math.max((monthlyGoal - monthlyRevenue) / daysLeftInMonth, 0) : 0,
      });

      // Calculate streak (consecutive days meeting daily target)
      calculateStreak(dailyTarget);
    } catch (error) {
      console.error("Error calculating goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = async (dailyTarget: number) => {
    try {
      let currentStreak = 0;
      const today = new Date();
      
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        
        const dayStart = startOfDay(checkDate);
        const dayEnd = endOfDay(checkDate);
        
        const { data } = await supabase
          .from("commission_ledger")
          .select("gross_revenue")
          .eq("centro_id", centroId)
          .gte("created_at", dayStart.toISOString())
          .lte("created_at", dayEnd.toISOString());
        
        const dayRevenue = data?.reduce((sum, r) => sum + (r.gross_revenue || 0), 0) || 0;
        
        if (dayRevenue >= dailyTarget) {
          currentStreak++;
        } else if (i > 0) {
          break;
        }
      }
      
      setStreak(currentStreak);
    } catch (error) {
      console.error("Error calculating streak:", error);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-success";
    if (progress >= 75) return "bg-primary";
    if (progress >= 50) return "bg-warning";
    return "bg-muted-foreground";
  };

  const getMotivationalMessage = () => {
    if (!monthlyStats) return "";
    
    const progress = monthlyStats.progress;
    if (progress >= 100) return "🎉 Obiettivo raggiunto! Sei un campione!";
    if (progress >= 90) return "🔥 Quasi al traguardo! Continua così!";
    if (progress >= 75) return "💪 Ottimo lavoro! Sei sulla strada giusta!";
    if (progress >= 50) return "📈 Buon progresso! Mantieni il ritmo!";
    if (progress >= 25) return "🚀 Buon inizio! Accelera per raggiungere l'obiettivo!";
    return "💡 È il momento di partire forte!";
  };

  if (monthlyGoal <= 0) {
    return (
      <Card className="p-6 bg-gradient-to-br from-card to-muted/30">
        <div className="text-center space-y-3">
          <Target className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="font-semibold text-lg">Imposta i tuoi Obiettivi</h3>
          <p className="text-sm text-muted-foreground">
            Vai nelle impostazioni per definire il tuo obiettivo mensile di fatturato
          </p>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Motivational Header */}
      <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{getMotivationalMessage()}</p>
              <p className="text-xs text-muted-foreground">
                Obiettivo mensile: €{monthlyGoal.toLocaleString('it-IT')}
              </p>
            </div>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-warning/20 rounded-full">
              <Flame className="h-4 w-4 text-warning" />
              <span className="text-sm font-bold text-warning">{streak}</span>
              <span className="text-xs text-warning">giorni</span>
            </div>
          )}
        </div>
      </Card>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily Goal */}
        {dailyStats && (
          <Card className="p-4 relative overflow-hidden group hover:shadow-lg transition-shadow">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500/10 rounded">
                    <Calendar className="h-4 w-4 text-blue-500" />
                  </div>
                  <span className="text-sm font-medium">Oggi</span>
                </div>
                {dailyStats.progress >= 100 && (
                  <Star className="h-5 w-5 text-yellow-500 animate-pulse" />
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">
                    €{dailyStats.revenue.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / €{dailyStats.target.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                
                <Progress 
                  value={dailyStats.progress} 
                  className={`h-2 ${getProgressColor(dailyStats.progress)}`}
                />
                
                <p className="text-xs text-muted-foreground">
                  {dailyStats.progress >= 100 
                    ? "Obiettivo raggiunto! 🎯" 
                    : `Mancano €${dailyStats.remaining.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Weekly Goal */}
        {weeklyStats && (
          <Card className="p-4 relative overflow-hidden group hover:shadow-lg transition-shadow">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-500/10 rounded">
                    <CalendarDays className="h-4 w-4 text-green-500" />
                  </div>
                  <span className="text-sm font-medium">Settimana</span>
                </div>
                {weeklyStats.progress >= 100 && (
                  <Zap className="h-5 w-5 text-yellow-500 animate-pulse" />
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">
                    €{weeklyStats.revenue.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / €{weeklyStats.target.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                
                <Progress 
                  value={weeklyStats.progress} 
                  className={`h-2 ${getProgressColor(weeklyStats.progress)}`}
                />
                
                <p className="text-xs text-muted-foreground">
                  {weeklyStats.progress >= 100 
                    ? "Obiettivo raggiunto! 🏆" 
                    : `€${weeklyStats.dailyNeeded.toLocaleString('it-IT', { maximumFractionDigits: 0 })}/giorno per ${weeklyStats.daysLeft}gg`}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Monthly Goal */}
        {monthlyStats && (
          <Card className="p-4 relative overflow-hidden group hover:shadow-lg transition-shadow">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-500/10 rounded">
                    <CalendarRange className="h-4 w-4 text-purple-500" />
                  </div>
                  <span className="text-sm font-medium">{format(new Date(), 'MMMM', { locale: it })}</span>
                </div>
                {monthlyStats.progress >= 100 && (
                  <Trophy className="h-5 w-5 text-yellow-500 animate-pulse" />
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">
                    €{monthlyStats.revenue.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / €{monthlyStats.target.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                
                <Progress 
                  value={monthlyStats.progress} 
                  className={`h-2 ${getProgressColor(monthlyStats.progress)}`}
                />
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {monthlyStats.progress >= 100 
                      ? "Campione del mese! 🥇" 
                      : `€${monthlyStats.dailyNeeded.toLocaleString('it-IT', { maximumFractionDigits: 0 })}/giorno`}
                  </span>
                  <span>{monthlyStats.daysLeft} giorni rimasti</span>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Tips Card */}
      {monthlyStats && monthlyStats.progress < 50 && (
        <Card className="p-4 bg-muted/30 border-dashed">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Suggerimento</p>
              <p className="text-xs text-muted-foreground">
                Per raggiungere l'obiettivo, concentrati su riparazioni ad alto margine e proponi servizi aggiuntivi ai clienti.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
