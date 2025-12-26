import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Zap, Target, Flame, Award, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface GamificationStats {
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  total_syncs: number;
}

interface CustomerAchievement {
  id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_icon: string | null;
  is_unlocked: boolean;
  progress: number;
  target: number;
}

interface CustomerGamificationBadgeProps {
  customerId: string;
  centroId: string;
  compact?: boolean;
  showCard?: boolean;
}

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5000];

const getLevelName = (level: number): string => {
  const names = [
    'Novizio', 'Apprendista', 'Esperto', 'Veterano', 'Maestro',
    'Campione', 'Leggenda', 'Eroe', 'Mito', 'Divinità'
  ];
  return names[Math.min(level - 1, names.length - 1)] || 'Novizio';
};

const getLevelColor = (level: number): string => {
  if (level >= 8) return 'from-purple-500 to-pink-500';
  if (level >= 6) return 'from-amber-400 to-orange-500';
  if (level >= 4) return 'from-blue-400 to-cyan-500';
  if (level >= 2) return 'from-green-400 to-emerald-500';
  return 'from-gray-400 to-gray-500';
};

export const CustomerGamificationBadge = ({
  customerId,
  centroId,
  compact = false,
  showCard = false
}: CustomerGamificationBadgeProps) => {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [achievements, setAchievements] = useState<CustomerAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!customerId || !centroId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch stats
        const { data: statsData } = await supabase
          .from('customer_gamification_stats')
          .select('*')
          .eq('customer_id', customerId)
          .eq('centro_id', centroId)
          .maybeSingle();

        if (statsData) {
          setStats(statsData);
        }

        // Fetch achievements
        const { data: achievementsData } = await supabase
          .from('customer_achievements')
          .select('*')
          .eq('customer_id', customerId)
          .eq('centro_id', centroId)
          .order('is_unlocked', { ascending: false });

        if (achievementsData) {
          setAchievements(achievementsData);
        }
      } catch (error) {
        console.error('[GamificationBadge] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId, centroId]);

  if (loading || !stats) {
    if (compact) return null;
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        <Trophy className="h-3 w-3 mr-1" />
        --
      </Badge>
    );
  }

  const unlockedCount = achievements.filter(a => a.is_unlocked).length;
  const xpForNextLevel = LEVEL_THRESHOLDS[Math.min(stats.level, LEVEL_THRESHOLDS.length - 1)] || 5000;
  const xpForCurrentLevel = LEVEL_THRESHOLDS[Math.min(stats.level - 1, LEVEL_THRESHOLDS.length - 1)] || 0;
  const progressToNext = ((stats.total_xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs gap-1 cursor-help",
                stats.level >= 5 && "border-amber-500/50 bg-amber-500/10 text-amber-600"
              )}
            >
              <Trophy className="h-3 w-3" />
              Lv.{stats.level}
              {stats.current_streak > 0 && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <Flame className="h-3 w-3 text-orange-500" />
                  {stats.current_streak}
                </>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="w-64 p-0" side="bottom">
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{getLevelName(stats.level)}</span>
                <span className="text-sm text-muted-foreground">{stats.total_xp} XP</span>
              </div>
              <Progress value={progressToNext} className="h-1.5" />
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="font-medium">{stats.level}</p>
                  <p className="text-muted-foreground">Livello</p>
                </div>
                <div>
                  <p className="font-medium">{stats.current_streak}</p>
                  <p className="text-muted-foreground">Streak</p>
                </div>
                <div>
                  <p className="font-medium">{unlockedCount}</p>
                  <p className="text-muted-foreground">Badge</p>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (showCard) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Gamification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Level & XP */}
          <div className="flex items-center gap-4">
            <div className={cn(
              "h-14 w-14 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg",
              getLevelColor(stats.level)
            )}>
              <span className="text-2xl font-bold text-white">{stats.level}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">{getLevelName(stats.level)}</span>
                <span className="text-sm text-muted-foreground">{stats.total_xp} XP</span>
              </div>
              <Progress value={progressToNext} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(xpForNextLevel - stats.total_xp)} XP al prossimo livello
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-muted/30 rounded-lg p-2">
              <Star className="h-4 w-4 mx-auto mb-1 text-amber-500" />
              <p className="text-lg font-bold">{stats.total_xp}</p>
              <p className="text-xs text-muted-foreground">XP Totali</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2">
              <Flame className="h-4 w-4 mx-auto mb-1 text-orange-500" />
              <p className="text-lg font-bold">{stats.current_streak}</p>
              <p className="text-xs text-muted-foreground">Streak</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <p className="text-lg font-bold">{stats.longest_streak}</p>
              <p className="text-xs text-muted-foreground">Max Streak</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2">
              <Zap className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <p className="text-lg font-bold">{stats.total_syncs}</p>
              <p className="text-xs text-muted-foreground">Sync</p>
            </div>
          </div>

          {/* Achievements */}
          {achievements.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Badge ({unlockedCount}/{achievements.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {achievements.slice(0, 8).map((achievement) => (
                  <TooltipProvider key={achievement.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-sm",
                          achievement.is_unlocked 
                            ? "bg-amber-500/20 text-amber-600" 
                            : "bg-muted/50 text-muted-foreground opacity-50"
                        )}>
                          {achievement.achievement_icon || <Award className="h-4 w-4" />}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{achievement.achievement_name}</p>
                        {!achievement.is_unlocked && (
                          <p className="text-xs text-muted-foreground">
                            {achievement.progress}/{achievement.target}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default medium size
  return (
    <div className="inline-flex items-center gap-2">
      <Badge 
        variant="outline" 
        className={cn(
          "gap-1.5 py-1",
          stats.level >= 5 && "border-amber-500/50 bg-amber-500/10 text-amber-600"
        )}
      >
        <div className={cn(
          "h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br",
          getLevelColor(stats.level)
        )}>
          {stats.level}
        </div>
        <span className="font-medium">{getLevelName(stats.level)}</span>
        <span className="text-muted-foreground">•</span>
        <span>{stats.total_xp} XP</span>
      </Badge>
      {stats.current_streak > 0 && (
        <Badge variant="secondary" className="gap-1">
          <Flame className="h-3 w-3 text-orange-500" />
          {stats.current_streak} giorni
        </Badge>
      )}
      {unlockedCount > 0 && (
        <Badge variant="secondary" className="gap-1">
          <Award className="h-3 w-3 text-amber-500" />
          {unlockedCount} badge
        </Badge>
      )}
    </div>
  );
};
