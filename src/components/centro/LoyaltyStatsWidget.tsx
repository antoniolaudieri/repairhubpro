import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  Target,
  Euro,
  Plus,
  Check,
  X,
  Calendar,
  CalendarDays,
  CalendarRange,
  Trophy,
  Star,
  Zap,
  Flame,
  Settings,
  Users,
  Gift
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";

interface LoyaltyStats {
  activeCards: number;
  expiringCards: number;
  totalRevenue: number;
  centroRevenue: number;
  platformCommission: number;
  thisMonthCards: number;
  lastMonthCards: number;
}

interface PeriodStats {
  count: number;
  target: number;
  progress: number;
  remaining: number;
  daysLeft: number;
}

interface LoyaltyStatsWidgetProps {
  centroId: string;
}

export function LoyaltyStatsWidget({ centroId }: LoyaltyStatsWidgetProps) {
  const [stats, setStats] = useState<LoyaltyStats>({
    activeCards: 0,
    expiringCards: 0,
    totalRevenue: 0,
    centroRevenue: 0,
    platformCommission: 0,
    thisMonthCards: 0,
    lastMonthCards: 0,
  });
  const [dailyStats, setDailyStats] = useState<PeriodStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<PeriodStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<PeriodStats | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    loadData();
  }, [centroId]);

  const loadData = async () => {
    try {
      await Promise.all([loadStats(), loadGoalSettings()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGoalSettings = async () => {
    const { data: centro } = await supabase
      .from("centri_assistenza")
      .select("settings")
      .eq("id", centroId)
      .single();
    
    const settings = centro?.settings as Record<string, any> | null;
    const goal = settings?.loyalty_monthly_goal || 0;
    setMonthlyGoal(goal);
    setGoalInput(goal.toString());
    
    if (goal > 0) {
      await calculatePeriodStats(goal);
    }
  };

  const loadStats = async () => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    const startOfMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const { data: activeCards } = await supabase
      .from("loyalty_cards")
      .select("id, expires_at, centro_revenue, platform_commission, amount_paid, activated_at")
      .eq("centro_id", centroId)
      .eq("status", "active");

    const expiringCount = activeCards?.filter(card => {
      if (!card.expires_at) return false;
      const expiresAt = new Date(card.expires_at);
      return expiresAt <= thirtyDaysFromNow && expiresAt > now;
    }).length || 0;

    const thisMonthCount = activeCards?.filter(card => {
      if (!card.activated_at) return false;
      const activatedAt = new Date(card.activated_at);
      return activatedAt >= startOfMonthDate;
    }).length || 0;

    const { count: lastMonthCount } = await supabase
      .from("loyalty_cards")
      .select("*", { count: "exact", head: true })
      .eq("centro_id", centroId)
      .eq("status", "active")
      .gte("activated_at", startOfLastMonth.toISOString())
      .lte("activated_at", endOfLastMonth.toISOString());

    const totalRevenue = activeCards?.reduce((sum, card) => sum + (card.amount_paid || 0), 0) || 0;
    const centroRevenue = activeCards?.reduce((sum, card) => sum + (card.centro_revenue || 0), 0) || 0;
    const platformCommission = activeCards?.reduce((sum, card) => sum + (card.platform_commission || 0), 0) || 0;

    setStats({
      activeCards: activeCards?.length || 0,
      expiringCards: expiringCount,
      totalRevenue,
      centroRevenue,
      platformCommission,
      thisMonthCards: thisMonthCount,
      lastMonthCards: lastMonthCount || 0,
    });
  };

  const calculatePeriodStats = async (goal: number) => {
    const now = new Date();
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
    const workDaysInMonth = Math.round(daysInMonth * (5 / 7));
    const dailyTarget = Math.max(1, Math.round(goal / workDaysInMonth));
    const weeklyTarget = Math.max(1, Math.round(dailyTarget * 5));

    const [dailyRes, weeklyRes, monthlyRes] = await Promise.all([
      supabase
        .from("loyalty_cards")
        .select("id", { count: "exact", head: true })
        .eq("centro_id", centroId)
        .eq("status", "active")
        .gte("activated_at", dayStart.toISOString())
        .lte("activated_at", dayEnd.toISOString()),
      supabase
        .from("loyalty_cards")
        .select("id", { count: "exact", head: true })
        .eq("centro_id", centroId)
        .eq("status", "active")
        .gte("activated_at", weekStart.toISOString())
        .lte("activated_at", weekEnd.toISOString()),
      supabase
        .from("loyalty_cards")
        .select("id", { count: "exact", head: true })
        .eq("centro_id", centroId)
        .eq("status", "active")
        .gte("activated_at", monthStart.toISOString())
        .lte("activated_at", monthEnd.toISOString()),
    ]);

    const dailyCount = dailyRes.count || 0;
    const weeklyCount = weeklyRes.count || 0;
    const monthlyCount = monthlyRes.count || 0;

    const daysLeftInWeek = differenceInDays(weekEnd, now) + 1;
    const daysLeftInMonth = differenceInDays(monthEnd, now) + 1;

    setDailyStats({
      count: dailyCount,
      target: dailyTarget,
      progress: Math.min((dailyCount / dailyTarget) * 100, 100),
      remaining: Math.max(dailyTarget - dailyCount, 0),
      daysLeft: 1,
    });

    setWeeklyStats({
      count: weeklyCount,
      target: weeklyTarget,
      progress: Math.min((weeklyCount / weeklyTarget) * 100, 100),
      remaining: Math.max(weeklyTarget - weeklyCount, 0),
      daysLeft: daysLeftInWeek,
    });

    setMonthlyStats({
      count: monthlyCount,
      target: goal,
      progress: Math.min((monthlyCount / goal) * 100, 100),
      remaining: Math.max(goal - monthlyCount, 0),
      daysLeft: daysLeftInMonth,
    });
  };

  const handleSaveGoal = async () => {
    const newGoal = parseInt(goalInput);
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
            loyalty_monthly_goal: newGoal,
          },
        })
        .eq("id", centroId);

      if (error) throw error;

      toast.success("Obiettivo tessere salvato!");
      setMonthlyGoal(newGoal);
      setIsEditing(false);
      await calculatePeriodStats(newGoal);
    } catch (error) {
      console.error("Error saving goal:", error);
      toast.error("Errore nel salvataggio");
    } finally {
      setSavingGoal(false);
    }
  };

  const getMotivationalMessage = () => {
    if (!monthlyStats) return "Imposta un obiettivo per monitorare i progressi";
    
    const progress = monthlyStats.progress;
    if (progress >= 100) return "Obiettivo raggiunto! Campione delle tessere!";
    if (progress >= 90) return "Quasi al traguardo! Continua così!";
    if (progress >= 75) return "Ottimo lavoro! Sei sulla strada giusta!";
    if (progress >= 50) return "Buon progresso! Mantieni il ritmo!";
    if (progress >= 25) return "Buon inizio! Accelera per raggiungere l'obiettivo!";
    return "È il momento di proporre le tessere!";
  };

  const growthPercentage = stats.lastMonthCards > 0 
    ? Math.round(((stats.thisMonthCards - stats.lastMonthCards) / stats.lastMonthCards) * 100)
    : stats.thisMonthCards > 0 ? 100 : 0;

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary/20 border-t-primary" />
        </div>
      </Card>
    );
  }

  // Empty goal state
  if (monthlyGoal <= 0) {
    return (
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Obiettivi Tessere Fedeltà</h3>
              <p className="text-xs text-muted-foreground">Imposta il tuo traguardo mensile</p>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-background/50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-foreground">{stats.activeCards}</p>
              <p className="text-[10px] text-muted-foreground">Attive</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-amber-500">{stats.expiringCards}</p>
              <p className="text-[10px] text-muted-foreground">In scadenza</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-emerald-500">€{stats.centroRevenue.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">Guadagni</p>
            </div>
          </div>
          
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="10"
                  className="text-lg font-semibold"
                  autoFocus
                />
                <span className="text-sm text-muted-foreground">tessere/mese</span>
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
              onClick={() => { setGoalInput("10"); setIsEditing(true); }}
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

  return (
    <Card className="overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
              <CreditCard className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{getMotivationalMessage()}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  Obiettivo: {monthlyGoal} tessere/mese
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
          <div className="text-right">
            <p className="text-lg font-bold text-emerald-500">€{stats.centroRevenue.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">guadagnati</p>
          </div>
        </div>
      </div>

      {/* Edit mode */}
      {isEditing && (
        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="10"
              className="text-lg font-semibold"
              autoFocus
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">tessere</span>
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

      {/* Goals Grid - same style as GoalsWidget */}
      <div className="grid grid-cols-3 divide-x divide-border">
        {/* Daily */}
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
              <span className="text-lg font-bold text-foreground">{dailyStats.count}</span>
              <span className="text-[10px] text-muted-foreground ml-1">/ {dailyStats.target}</span>
            </div>
            
            <Progress value={dailyStats.progress} className="h-1.5" />
            
            <p className="text-[10px] text-muted-foreground truncate">
              {dailyStats.progress >= 100 ? "Raggiunto!" : `${dailyStats.remaining} da fare`}
            </p>
          </div>
        )}

        {/* Weekly */}
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
              <span className="text-lg font-bold text-foreground">{weeklyStats.count}</span>
              <span className="text-[10px] text-muted-foreground ml-1">/ {weeklyStats.target}</span>
            </div>
            
            <Progress value={weeklyStats.progress} className="h-1.5" />
            
            <p className="text-[10px] text-muted-foreground truncate">
              {weeklyStats.progress >= 100 ? "Raggiunto!" : `${weeklyStats.remaining} da fare`}
            </p>
          </div>
        )}

        {/* Monthly */}
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
              <span className="text-lg font-bold text-foreground">{monthlyStats.count}</span>
              <span className="text-[10px] text-muted-foreground ml-1">/ {monthlyStats.target}</span>
            </div>
            
            <Progress value={monthlyStats.progress} className="h-1.5" />
            
            <p className="text-[10px] text-muted-foreground truncate">
              {monthlyStats.progress >= 100 ? "Campione!" : `${monthlyStats.daysLeft}gg rimasti`}
            </p>
          </div>
        )}
      </div>

      {/* Info Cards Row */}
      <div className="grid grid-cols-2 gap-2 p-3 border-t bg-muted/10">
        <div className="flex items-center gap-2 bg-background/60 rounded-lg p-2">
          <Users className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">{stats.activeCards}</p>
            <p className="text-[10px] text-muted-foreground">Tessere attive</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-background/60 rounded-lg p-2">
          <AlertTriangle className={`h-4 w-4 ${stats.expiringCards > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          <div>
            <p className="text-sm font-semibold">{stats.expiringCards}</p>
            <p className="text-[10px] text-muted-foreground">In scadenza (30gg)</p>
          </div>
        </div>
      </div>

      {/* Dynamic Tips - same style as GoalsWidget */}
      {monthlyStats && (
        <div className="px-4 py-3 border-t bg-muted/20 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-xs font-medium text-foreground">Suggerimenti per raggiungere l'obiettivo</span>
          </div>
          
          {(() => {
            const suggestions: { icon: React.ReactNode; text: string; priority: number }[] = [];
            const remaining = monthlyStats.remaining;
            const daysLeft = monthlyStats.daysLeft;
            const progress = monthlyStats.progress;
            
            if (progress >= 100) {
              suggestions.push({
                icon: <Trophy className="h-3 w-3 text-amber-500" />,
                text: "Obiettivo raggiunto! Punta a superarlo per un bonus extra.",
                priority: 1
              });
            } else if (progress >= 80) {
              suggestions.push({
                icon: <Star className="h-3 w-3 text-green-500" />,
                text: `Sei al ${Math.round(progress)}%! Mancano solo ${remaining} tessere per raggiungere l'obiettivo.`,
                priority: 1
              });
            } else if (progress >= 50) {
              const perDay = Math.ceil(remaining / Math.max(daysLeft, 1));
              suggestions.push({
                icon: <Zap className="h-3 w-3 text-amber-500" />,
                text: `Attiva ${perDay} tessera${perDay > 1 ? 'e' : ''} al giorno per centrare l'obiettivo.`,
                priority: 1
              });
            } else if (progress >= 30) {
              suggestions.push({
                icon: <Gift className="h-3 w-3 text-orange-500" />,
                text: `Proponi la tessera a ogni cliente in riparazione. Mancano ${remaining} attivazioni.`,
                priority: 1
              });
            } else {
              suggestions.push({
                icon: <Flame className="h-3 w-3 text-rose-500" />,
                text: "Inizia a proporre le tessere a ogni cliente. Evidenzia lo sconto sulle riparazioni future!",
                priority: 1
              });
            }

            // Expiring cards tip
            if (stats.expiringCards > 0) {
              suggestions.push({
                icon: <AlertTriangle className="h-3 w-3 text-amber-500" />,
                text: `${stats.expiringCards} tessere in scadenza: contatta i clienti per il rinnovo anticipato.`,
                priority: 2
              });
            }

            // Growth tip
            if (growthPercentage < 0) {
              suggestions.push({
                icon: <TrendingUp className="h-3 w-3 text-blue-500" />,
                text: "Le attivazioni sono in calo rispetto al mese scorso. Proponi promozioni speciali!",
                priority: 3
              });
            }
            
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
}
