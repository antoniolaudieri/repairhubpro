import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Users,
  Plus,
  CheckCircle2,
  Clock,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface LoyaltyStats {
  activeCards: number;
  expiringCards: number;
  totalRevenue: number;
  centroRevenue: number;
  platformCommission: number;
  thisMonthCards: number;
  lastMonthCards: number;
}

interface Goal {
  id: string;
  goal_type: string;
  period: string;
  target_value: number;
  current_value: number;
  period_start: string;
  period_end: string;
  is_achieved: boolean;
}

interface LoyaltyStatsWidgetProps {
  centroId: string;
}

export function LoyaltyStatsWidget({ centroId }: LoyaltyStatsWidgetProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<LoyaltyStats>({
    activeCards: 0,
    expiringCards: 0,
    totalRevenue: 0,
    centroRevenue: 0,
    platformCommission: 0,
    thisMonthCards: 0,
    lastMonthCards: 0,
  });
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [newGoal, setNewGoal] = useState({
    goal_type: 'loyalty_cards',
    period: 'monthly',
    target_value: 10,
  });

  useEffect(() => {
    loadData();
  }, [centroId]);

  const loadData = async () => {
    try {
      await Promise.all([loadStats(), loadGoals()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Fetch active cards
    const { data: activeCards } = await supabase
      .from("loyalty_cards")
      .select("id, expires_at, centro_revenue, platform_commission, amount_paid, activated_at")
      .eq("centro_id", centroId)
      .eq("status", "active");

    // Count expiring cards (within 30 days)
    const expiringCount = activeCards?.filter(card => {
      if (!card.expires_at) return false;
      const expiresAt = new Date(card.expires_at);
      return expiresAt <= thirtyDaysFromNow && expiresAt > now;
    }).length || 0;

    // This month cards
    const thisMonthCount = activeCards?.filter(card => {
      if (!card.activated_at) return false;
      const activatedAt = new Date(card.activated_at);
      return activatedAt >= startOfMonth;
    }).length || 0;

    // Last month cards
    const { count: lastMonthCount } = await supabase
      .from("loyalty_cards")
      .select("*", { count: "exact", head: true })
      .eq("centro_id", centroId)
      .eq("status", "active")
      .gte("activated_at", startOfLastMonth.toISOString())
      .lte("activated_at", endOfLastMonth.toISOString());

    // Calculate totals
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

  const loadGoals = async () => {
    const now = new Date();
    const { data } = await supabase
      .from("centro_goals")
      .select("*")
      .eq("centro_id", centroId)
      .eq("goal_type", "loyalty_cards")
      .lte("period_start", now.toISOString())
      .gte("period_end", now.toISOString())
      .order("period", { ascending: true });

    if (data) {
      setGoals(data);
    }
  };

  const createGoal = async () => {
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    switch (newGoal.period) {
      case 'daily':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodStart.getDate() + 6);
        periodEnd.setHours(23, 59, 59);
        break;
      case 'monthly':
      default:
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
    }

    // Count current progress for loyalty cards
    const { count } = await supabase
      .from("loyalty_cards")
      .select("*", { count: "exact", head: true })
      .eq("centro_id", centroId)
      .eq("status", "active")
      .gte("activated_at", periodStart.toISOString())
      .lte("activated_at", periodEnd.toISOString());

    const { error } = await supabase
      .from("centro_goals")
      .upsert({
        centro_id: centroId,
        goal_type: newGoal.goal_type,
        period: newGoal.period,
        target_value: newGoal.target_value,
        current_value: count || 0,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        is_achieved: (count || 0) >= newGoal.target_value,
        achieved_at: (count || 0) >= newGoal.target_value ? new Date().toISOString() : null,
      }, { 
        onConflict: 'centro_id,goal_type,period,period_start' 
      });

    if (error) {
      toast.error("Errore nel creare l'obiettivo");
      console.error(error);
    } else {
      toast.success("Obiettivo creato!");
      setShowGoalDialog(false);
      loadGoals();
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'daily': return 'Giornaliero';
      case 'weekly': return 'Settimanale';
      case 'monthly': return 'Mensile';
      default: return period;
    }
  };

  const getProgressPercentage = (goal: Goal) => {
    if (goal.target_value === 0) return 0;
    return Math.min(100, (goal.current_value / goal.target_value) * 100);
  };

  const growthPercentage = stats.lastMonthCards > 0 
    ? Math.round(((stats.thisMonthCards - stats.lastMonthCards) / stats.lastMonthCards) * 100)
    : stats.thisMonthCards > 0 ? 100 : 0;

  if (isLoading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Tessere Fedeltà</h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/centro/marketing')}
          className="text-muted-foreground"
        >
          Gestisci
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
          <div className="flex items-center gap-2 text-primary mb-2">
            <CreditCard className="h-4 w-4" />
            <span className="text-sm font-medium">Attive</span>
          </div>
          <p className="text-2xl font-bold">{stats.activeCards}</p>
        </div>

        <div className={`rounded-xl p-4 border ${stats.expiringCards > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-muted/50 border-border'}`}>
          <div className={`flex items-center gap-2 mb-2 ${stats.expiringCards > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">In Scadenza</span>
          </div>
          <p className="text-2xl font-bold">{stats.expiringCards}</p>
          {stats.expiringCards > 0 && (
            <p className="text-xs text-muted-foreground mt-1">entro 30 giorni</p>
          )}
        </div>

        <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
          <div className="flex items-center gap-2 text-emerald-500 mb-2">
            <Euro className="h-4 w-4" />
            <span className="text-sm font-medium">Guadagni</span>
          </div>
          <p className="text-2xl font-bold">€{stats.centroRevenue.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-1">netti da tessere</p>
        </div>

        <div className="bg-muted/50 rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Questo Mese</span>
          </div>
          <p className="text-2xl font-bold">{stats.thisMonthCards}</p>
          {growthPercentage !== 0 && (
            <Badge variant={growthPercentage > 0 ? "default" : "destructive"} className="mt-1">
              {growthPercentage > 0 ? '+' : ''}{growthPercentage}%
            </Badge>
          )}
        </div>
      </div>

      {/* Goals Section */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="font-medium">Obiettivi Tessere</span>
          </div>
          <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nuovo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crea Obiettivo Tessere</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Periodo</Label>
                  <Select 
                    value={newGoal.period} 
                    onValueChange={(v) => setNewGoal({...newGoal, period: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Giornaliero</SelectItem>
                      <SelectItem value="weekly">Settimanale</SelectItem>
                      <SelectItem value="monthly">Mensile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Obiettivo (numero tessere)</Label>
                  <Input 
                    type="number"
                    min="1"
                    value={newGoal.target_value}
                    onChange={(e) => setNewGoal({...newGoal, target_value: parseInt(e.target.value) || 1})}
                  />
                </div>
                <Button onClick={createGoal} className="w-full">
                  Crea Obiettivo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nessun obiettivo impostato</p>
            <p className="text-xs">Imposta obiettivi per monitorare i progressi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => (
              <div key={goal.id} className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getPeriodLabel(goal.period)}
                    </Badge>
                    {goal.is_achieved && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                  </div>
                  <span className="text-sm font-medium">
                    {goal.current_value} / {goal.target_value}
                  </span>
                </div>
                <Progress 
                  value={getProgressPercentage(goal)} 
                  className={`h-2 ${goal.is_achieved ? '[&>div]:bg-emerald-500' : ''}`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
