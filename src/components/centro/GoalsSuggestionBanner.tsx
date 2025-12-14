import { useState, useEffect } from "react";
import { 
  Target, 
  TrendingUp, 
  Flame,
  Trophy,
  Zap,
  Star,
  Lightbulb,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, differenceInDays } from "date-fns";

interface GoalsSuggestionBannerProps {
  centroId: string;
  estimatedRevenue?: number;
}

export const GoalsSuggestionBanner = ({ centroId, estimatedRevenue = 0 }: GoalsSuggestionBannerProps) => {
  const [suggestion, setSuggestion] = useState<{ icon: React.ReactNode; text: string; color: string } | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dailyNeeded, setDailyNeeded] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (centroId) {
      loadGoalData();
    }
  }, [centroId]);

  useEffect(() => {
    if (monthlyGoal > 0) {
      generateSuggestion();
    }
  }, [monthlyGoal, progress, dailyNeeded, estimatedRevenue]);

  const loadGoalData = async () => {
    try {
      // Fetch centro settings for monthly goal
      const { data: centroData } = await supabase
        .from("centri_assistenza")
        .select("settings")
        .eq("id", centroId)
        .single();

      const settings = centroData?.settings as { monthly_goal?: number } | null;
      const goal = settings?.monthly_goal || 0;
      setMonthlyGoal(goal);

      if (goal <= 0) {
        setLoading(false);
        return;
      }

      // Calculate current progress
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const daysLeft = differenceInDays(monthEnd, now) + 1;

      const { data: revenueData } = await supabase
        .from("commission_ledger")
        .select("gross_revenue")
        .eq("centro_id", centroId)
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());

      const monthlyRevenue = revenueData?.reduce((sum, r) => sum + (r.gross_revenue || 0), 0) || 0;
      const currentProgress = Math.min((monthlyRevenue / goal) * 100, 100);
      const remaining = Math.max(goal - monthlyRevenue, 0);
      const neededPerDay = daysLeft > 0 ? remaining / daysLeft : 0;

      setProgress(currentProgress);
      setDailyNeeded(neededPerDay);
    } catch (error) {
      console.error("Error loading goal data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestion = () => {
    if (monthlyGoal <= 0) {
      setSuggestion(null);
      return;
    }

    const avgRepairValue = 80;
    const repairsNeeded = Math.ceil(dailyNeeded / avgRepairValue);

    // Dynamic suggestions based on current state
    if (progress >= 100) {
      setSuggestion({
        icon: <Trophy className="h-4 w-4" />,
        text: "Obiettivo raggiunto! Ogni riparazione extra è puro bonus. 🎯",
        color: "text-amber-500"
      });
    } else if (progress >= 80) {
      const remaining = monthlyGoal * (1 - progress / 100);
      setSuggestion({
        icon: <Star className="h-4 w-4" />,
        text: `Quasi al traguardo! Mancano €${remaining.toLocaleString('it-IT', { maximumFractionDigits: 0 })}. Aggiungi servizi extra a questa riparazione.`,
        color: "text-green-500"
      });
    } else if (progress >= 50) {
      setSuggestion({
        icon: <Zap className="h-4 w-4" />,
        text: `Obiettivo giornaliero: €${dailyNeeded.toLocaleString('it-IT', { maximumFractionDigits: 0 })}. Proponi pellicola, backup o pulizia!`,
        color: "text-amber-500"
      });
    } else if (progress >= 30) {
      setSuggestion({
        icon: <TrendingUp className="h-4 w-4" />,
        text: `Servono ~${repairsNeeded} riparazion${repairsNeeded === 1 ? 'e' : 'i'} al giorno. Massimizza il margine con servizi aggiuntivi!`,
        color: "text-orange-500"
      });
    } else {
      setSuggestion({
        icon: <Flame className="h-4 w-4" />,
        text: `Focus profitti: proponi SEMPRE pellicola (€5-15) e backup (€20) su ogni ritiro!`,
        color: "text-rose-500"
      });
    }
  };

  if (loading || !suggestion || monthlyGoal <= 0 || dismissed) {
    return null;
  }

  return (
    <div className="relative flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4">
      <div className={`shrink-0 ${suggestion.color}`}>
        <Lightbulb className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`${suggestion.color}`}>{suggestion.icon}</span>
          <span className="text-xs font-medium text-foreground">Suggerimento Obiettivo</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {suggestion.text}
        </p>
        {estimatedRevenue > 0 && (
          <p className="text-xs text-primary font-medium mt-1">
            Questa riparazione: +€{estimatedRevenue.toLocaleString('it-IT', { maximumFractionDigits: 0 })} verso l'obiettivo
          </p>
        )}
      </div>
      <button 
        onClick={() => setDismissed(true)}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
