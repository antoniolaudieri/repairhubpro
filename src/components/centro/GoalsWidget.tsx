import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  CalendarDays, 
  CalendarRange,
  Trophy,
  Flame,
  Zap,
  Star,
  Settings,
  Check,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

interface GoalsWidgetProps {
  centroId: string;
  monthlyGoal: number;
  onGoalUpdate?: (newGoal: number) => void;
}

interface PeriodStats {
  revenue: number;
  target: number;
  progress: number;
  remaining: number;
  daysLeft: number;
  dailyNeeded: number;
}

export const GoalsWidget = ({ centroId, monthlyGoal, onGoalUpdate }: GoalsWidgetProps) => {
  const [dailyStats, setDailyStats] = useState<PeriodStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<PeriodStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<PeriodStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [goalInput, setGoalInput] = useState(monthlyGoal.toString());
  const [savingGoal, setSavingGoal] = useState(false);

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

  const handleSaveGoal = async () => {
    const newGoal = parseFloat(goalInput);
    if (isNaN(newGoal) || newGoal <= 0) {
      toast.error("Inserisci un obiettivo valido");
      return;
    }

    setSavingGoal(true);
    try {
      const { data: centro } = await supabase
        .from("centri_assistenza")
        .select("settings")
        .eq("id", centroId)
        .single();

      const currentSettings = (centro?.settings as Record<string, any>) || {};
      
      const { error } = await supabase
        .from("centri_assistenza")
        .update({
          settings: {
            ...currentSettings,
            monthly_goal: newGoal,
          },
        })
        .eq("id", centroId);

      if (error) throw error;

      toast.success("Obiettivo salvato!");
      setIsEditing(false);
      onGoalUpdate?.(newGoal);
    } catch (error) {
      console.error("Error saving goal:", error);
      toast.error("Errore nel salvataggio");
    } finally {
      setSavingGoal(false);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-emerald-500";
    if (progress >= 75) return "bg-primary";
    if (progress >= 50) return "bg-amber-500";
    return "bg-muted-foreground/50";
  };

  const getMotivationalMessage = () => {
    if (!monthlyStats) return "";
    
    const progress = monthlyStats.progress;
    if (progress >= 100) return "Obiettivo raggiunto! Sei un campione!";
    if (progress >= 90) return "Quasi al traguardo! Continua così!";
    if (progress >= 75) return "Ottimo lavoro! Sei sulla strada giusta!";
    if (progress >= 50) return "Buon progresso! Mantieni il ritmo!";
    if (progress >= 25) return "Buon inizio! Accelera per raggiungere l'obiettivo!";
    return "È il momento di partire forte!";
  };

  // Empty state - allow setting goal from here
  if (monthlyGoal <= 0) {
    return (
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Obiettivi</h3>
              <p className="text-xs text-muted-foreground">Imposta il tuo traguardo mensile</p>
            </div>
          </div>
          
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium text-muted-foreground">€</span>
                <Input
                  type="number"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="30000"
                  className="text-lg font-semibold"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveGoal} 
                  disabled={savingGoal}
                  className="flex-1 gap-2"
                >
                  <Check className="h-4 w-4" />
                  Salva
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                  className="px-3"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              onClick={() => { setGoalInput(""); setIsEditing(true); }}
              className="w-full gap-2"
              variant="outline"
            >
              <Target className="h-4 w-4" />
              Imposta Obiettivo Mensile
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary/20 border-t-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header with gradient matching dashboard cards */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <Trophy className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{getMotivationalMessage()}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  Obiettivo: €{monthlyGoal.toLocaleString('it-IT')}
                </p>
                <button 
                  onClick={() => { setGoalInput(monthlyGoal.toString()); setIsEditing(true); }}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Settings className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full border border-amber-500/30">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-bold text-amber-600">{streak}gg</span>
            </div>
          )}
        </div>
      </div>

      {/* Edit mode */}
      {isEditing && (
        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-muted-foreground">€</span>
            <Input
              type="number"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="30000"
              className="text-lg font-semibold"
              autoFocus
            />
            <Button 
              size="sm"
              onClick={handleSaveGoal} 
              disabled={savingGoal}
              className="gap-1"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button 
              size="sm"
              variant="ghost" 
              onClick={() => setIsEditing(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Goals Grid - compact design */}
      <div className="grid grid-cols-3 divide-x divide-border">
        {/* Daily Goal */}
        {dailyStats && (
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs font-medium text-muted-foreground">Oggi</span>
              </div>
              {dailyStats.progress >= 100 && (
                <Star className="h-3.5 w-3.5 text-amber-500" />
              )}
            </div>
            
            <div>
              <span className="text-lg font-bold text-foreground">
                €{dailyStats.revenue.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] text-muted-foreground ml-1">
                / €{dailyStats.target.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
              </span>
            </div>
            
            <Progress 
              value={dailyStats.progress} 
              className="h-1.5"
            />
            
            <p className="text-[10px] text-muted-foreground truncate">
              {dailyStats.progress >= 100 
                ? "Raggiunto!" 
                : `-€${dailyStats.remaining.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`}
            </p>
          </div>
        )}

        {/* Weekly Goal */}
        {weeklyStats && (
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-medium text-muted-foreground">Settimana</span>
              </div>
              {weeklyStats.progress >= 100 && (
                <Zap className="h-3.5 w-3.5 text-amber-500" />
              )}
            </div>
            
            <div>
              <span className="text-lg font-bold text-foreground">
                €{weeklyStats.revenue.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] text-muted-foreground ml-1">
                / €{weeklyStats.target.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
              </span>
            </div>
            
            <Progress 
              value={weeklyStats.progress} 
              className="h-1.5"
            />
            
            <p className="text-[10px] text-muted-foreground truncate">
              {weeklyStats.progress >= 100 
                ? "Raggiunto!" 
                : `€${weeklyStats.dailyNeeded.toLocaleString('it-IT', { maximumFractionDigits: 0 })}/g`}
            </p>
          </div>
        )}

        {/* Monthly Goal */}
        {monthlyStats && (
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CalendarRange className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground capitalize">{format(new Date(), 'MMM', { locale: it })}</span>
              </div>
              {monthlyStats.progress >= 100 && (
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
              )}
            </div>
            
            <div>
              <span className="text-lg font-bold text-foreground">
                €{monthlyStats.revenue.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] text-muted-foreground ml-1">
                / €{monthlyStats.target.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
              </span>
            </div>
            
            <Progress 
              value={monthlyStats.progress} 
              className="h-1.5"
            />
            
            <p className="text-[10px] text-muted-foreground truncate">
              {monthlyStats.progress >= 100 
                ? "Campione!" 
                : `${monthlyStats.daysLeft}gg rimasti`}
            </p>
          </div>
        )}
      </div>

      {/* Dynamic Tips - always show */}
      {monthlyStats && dailyStats && (
        <div className="px-4 py-3 border-t bg-muted/20 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-medium text-foreground">Suggerimenti per raggiungere l'obiettivo</span>
          </div>
          
          {(() => {
            const suggestions: { icon: React.ReactNode; text: string; priority: number }[] = [];
            const dailyNeeded = monthlyStats.dailyNeeded;
            const remaining = monthlyStats.remaining;
            const daysLeft = monthlyStats.daysLeft;
            const progress = monthlyStats.progress;
            const avgRepairValue = 80; // Stima valore medio riparazione
            const avgServiceValue = 15; // Stima valore medio servizio aggiuntivo
            
            // Calcola quante riparazioni servono
            const repairsNeeded = Math.ceil(remaining / avgRepairValue);
            const repairsPerDay = Math.ceil(repairsNeeded / Math.max(daysLeft, 1));
            
            // Suggerimento basato su urgenza
            if (progress >= 100) {
              suggestions.push({
                icon: <Trophy className="h-3 w-3 text-amber-500" />,
                text: "Obiettivo raggiunto! Punta a superarlo del 10% per un margine extra.",
                priority: 1
              });
            } else if (progress >= 80) {
              suggestions.push({
                icon: <Star className="h-3 w-3 text-green-500" />,
                text: `Sei al ${Math.round(progress)}%! Mancano solo €${remaining.toLocaleString('it-IT', { maximumFractionDigits: 0 })} (~${Math.ceil(remaining / avgRepairValue)} riparazioni).`,
                priority: 1
              });
            } else if (progress >= 50) {
              suggestions.push({
                icon: <Zap className="h-3 w-3 text-amber-500" />,
                text: `Completa ${repairsPerDay} riparazion${repairsPerDay === 1 ? 'e' : 'i'} al giorno per raggiungere €${monthlyStats.target.toLocaleString('it-IT', { maximumFractionDigits: 0 })}.`,
                priority: 1
              });
            } else if (progress >= 30) {
              suggestions.push({
                icon: <TrendingUp className="h-3 w-3 text-orange-500" />,
                text: `Intensifica il ritmo: servono ~€${dailyNeeded.toLocaleString('it-IT', { maximumFractionDigits: 0 })}/giorno (${repairsPerDay} riparazioni).`,
                priority: 1
              });
            } else {
              suggestions.push({
                icon: <Flame className="h-3 w-3 text-rose-500" />,
                text: `Focus massimo: €${dailyNeeded.toLocaleString('it-IT', { maximumFractionDigits: 0 })}/giorno per recuperare. Proponi servizi aggiuntivi su ogni riparazione.`,
                priority: 1
              });
            }
            
            // Suggerimenti tattici basati sulla situazione
            if (progress < 80 && daysLeft <= 10) {
              suggestions.push({
                icon: <Calendar className="h-3 w-3 text-purple-500" />,
                text: `${daysLeft} giorni rimasti: contatta clienti con riparazioni in sospeso e proponi ritiro.`,
                priority: 2
              });
            }
            
            if (dailyStats.progress < 50 && new Date().getHours() >= 14) {
              const remainingToday = dailyStats.remaining;
              suggestions.push({
                icon: <Zap className="h-3 w-3 text-blue-500" />,
                text: `Oggi mancano €${remainingToday.toLocaleString('it-IT', { maximumFractionDigits: 0 })}. Proponi pellicole, backup o pulizia software.`,
                priority: 3
              });
            }
            
            // Ordina per priorità e mostra max 2 suggerimenti
            return suggestions
              .sort((a, b) => a.priority - b.priority)
              .slice(0, 2)
              .map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">{s.icon}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
                </div>
              ));
          })()}
        </div>
      )}
    </Card>
  );
};