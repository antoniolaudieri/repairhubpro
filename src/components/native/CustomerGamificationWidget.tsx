import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Flame, 
  Star, 
  Zap,
  ChevronRight
} from "lucide-react";
import { useCustomerAchievements, LEVEL_THRESHOLDS } from "@/hooks/useCustomerAchievements";

interface CustomerGamificationWidgetProps {
  customerId?: string;
  centroId?: string;
  compact?: boolean;
}

export const CustomerGamificationWidget = ({
  customerId,
  centroId,
  compact = false
}: CustomerGamificationWidgetProps) => {
  const {
    achievements,
    stats,
    loading,
    levelInfo,
    unlockedCount,
    totalAchievements
  } = useCustomerAchievements({
    customerId,
    centroId,
    enabled: !!customerId && !!centroId
  });

  if (loading || !customerId || !centroId) {
    return null;
  }

  // Find next achievement to unlock
  const nextAchievement = achievements
    .filter(a => !a.is_unlocked)
    .sort((a, b) => (b.progress / b.target) - (a.progress / a.target))[0];

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Livello {levelInfo.level}</span>
                  <Badge variant="outline" className="text-xs">{levelInfo.name}</Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  {levelInfo.xp} XP
                  {stats?.current_streak && stats.current_streak > 0 && (
                    <>
                      <span className="mx-1">•</span>
                      <Flame className="h-3 w-3 text-orange-500" />
                      {stats.current_streak} giorni
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium">{unlockedCount}/{totalAchievements}</span>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </div>
          </div>
          <Progress 
            value={levelInfo.progress} 
            className="h-1.5 mt-2" 
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-primary via-yellow-500 to-orange-500" />
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Gamification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Level & XP */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/30">
                <span className="text-xl font-bold">{levelInfo.level}</span>
              </div>
              <div>
                <p className="font-semibold">{levelInfo.name}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  {levelInfo.xp} XP totali
                </div>
              </div>
            </div>
            {stats?.current_streak && stats.current_streak > 0 && (
              <div className="text-right">
                <div className="flex items-center gap-1 text-orange-500">
                  <Flame className="h-5 w-5" />
                  <span className="font-bold text-lg">{stats.current_streak}</span>
                </div>
                <p className="text-xs text-muted-foreground">giorni streak</p>
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Prossimo livello: {levelInfo.nextLevelName}</span>
              <span className="font-medium">{Math.round(levelInfo.progress)}%</span>
            </div>
            <Progress value={levelInfo.progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {levelInfo.xpInCurrentLevel}/{levelInfo.xpNeededForNext} XP
            </p>
          </div>
        </div>

        {/* Achievements Preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Badge Sbloccati</p>
            <Badge variant="secondary" className="text-xs">
              {unlockedCount}/{totalAchievements}
            </Badge>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {achievements
              .filter(a => a.is_unlocked)
              .slice(0, 8)
              .map((achievement) => (
                <div
                  key={achievement.id}
                  className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg border-2 border-primary/30"
                  title={achievement.achievement_name}
                >
                  {achievement.achievement_icon}
                </div>
              ))}
            {achievements.filter(a => a.is_unlocked).length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nessun badge sbloccato ancora. Sincronizza per iniziare!
              </p>
            )}
          </div>
        </div>

        {/* Next Achievement */}
        {nextAchievement && (
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Prossimo obiettivo</p>
              <Badge variant="outline" className="text-xs">
                +{nextAchievement.xp_reward} XP
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xl opacity-60">
                {nextAchievement.achievement_icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{nextAchievement.achievement_name}</p>
                <p className="text-xs text-muted-foreground">{nextAchievement.achievement_description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <Progress 
              value={(nextAchievement.progress / nextAchievement.target) * 100} 
              className="h-1.5 mt-2" 
            />
            <p className="text-xs text-muted-foreground text-right mt-1">
              {nextAchievement.progress}/{nextAchievement.target}
            </p>
          </div>
        )}

        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted/30 rounded-lg p-2">
              <p className="text-lg font-bold">{stats.total_syncs}</p>
              <p className="text-xs text-muted-foreground">Sync totali</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2">
              <p className="text-lg font-bold">{stats.longest_streak}</p>
              <p className="text-xs text-muted-foreground">Record streak</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2">
              <p className="text-lg font-bold">{unlockedCount}</p>
              <p className="text-xs text-muted-foreground">Badge</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
