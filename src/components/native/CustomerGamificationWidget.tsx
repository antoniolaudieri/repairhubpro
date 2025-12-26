import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Flame, 
  Star, 
  Zap,
  ChevronRight,
  Sparkles,
  Target,
  Award,
  TrendingUp,
  Gift
} from "lucide-react";
import { useCustomerAchievements, LEVEL_THRESHOLDS, ACHIEVEMENT_DEFINITIONS } from "@/hooks/useCustomerAchievements";
import { motion, AnimatePresence } from "framer-motion";

interface CustomerGamificationWidgetProps {
  customerId?: string;
  centroId?: string;
  compact?: boolean;
  showAllAchievements?: boolean;
}

const getLevelGradient = (level: number) => {
  const gradients = [
    'from-gray-400 to-gray-600',        // Level 1
    'from-green-400 to-green-600',      // Level 2
    'from-blue-400 to-blue-600',        // Level 3
    'from-purple-400 to-purple-600',    // Level 4
    'from-yellow-400 to-orange-500',    // Level 5
    'from-pink-400 to-rose-600',        // Level 6
    'from-cyan-400 to-teal-600',        // Level 7
    'from-amber-400 to-red-500',        // Level 8
    'from-violet-400 to-indigo-600',    // Level 9
    'from-yellow-300 via-amber-500 to-red-600', // Level 10
  ];
  return gradients[Math.min(level - 1, gradients.length - 1)] || gradients[0];
};

export const CustomerGamificationWidget = ({
  customerId,
  centroId,
  compact = false,
  showAllAchievements = false
}: CustomerGamificationWidgetProps) => {
  const [showAchievementList, setShowAchievementList] = useState(showAllAchievements);
  const [celebratingAchievement, setCelebratingAchievement] = useState<string | null>(null);
  
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

  // Celebrate newly unlocked achievements
  useEffect(() => {
    const recentlyUnlocked = achievements.find(a => {
      if (!a.is_unlocked || !a.unlocked_at) return false;
      const unlockedTime = new Date(a.unlocked_at).getTime();
      const now = Date.now();
      return (now - unlockedTime) < 60000; // Within last minute
    });
    
    if (recentlyUnlocked && celebratingAchievement !== recentlyUnlocked.id) {
      setCelebratingAchievement(recentlyUnlocked.id);
      setTimeout(() => setCelebratingAchievement(null), 5000);
    }
  }, [achievements, celebratingAchievement]);

  if (loading || !customerId || !centroId) {
    return null;
  }

  // Find next achievement to unlock (closest to completion)
  const nextAchievement = achievements
    .filter(a => !a.is_unlocked)
    .sort((a, b) => (b.progress / b.target) - (a.progress / a.target))[0];

  // Get all achievements sorted by unlock status and progress
  const sortedAchievements = [...achievements].sort((a, b) => {
    if (a.is_unlocked && !b.is_unlocked) return -1;
    if (!a.is_unlocked && b.is_unlocked) return 1;
    return (b.progress / b.target) - (a.progress / a.target);
  });

  const levelGradient = getLevelGradient(levelInfo.level);

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div 
                className={`h-12 w-12 rounded-full bg-gradient-to-br ${levelGradient} flex items-center justify-center shadow-lg`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-lg font-bold text-white">{levelInfo.level}</span>
              </motion.div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{levelInfo.name}</span>
                  <Badge variant="secondary" className="text-xs bg-primary/10">
                    <Zap className="h-3 w-3 mr-1 text-yellow-500" />
                    {levelInfo.xp} XP
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                  {stats?.current_streak && stats.current_streak > 0 ? (
                    <div className="flex items-center gap-1 text-orange-500">
                      <Flame className="h-4 w-4" />
                      <span className="font-medium">{stats.current_streak} giorni</span>
                    </div>
                  ) : (
                    <span className="text-xs">Inizia la tua streak!</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">{unlockedCount}/{totalAchievements}</span>
              </div>
              <Progress 
                value={levelInfo.progress} 
                className="h-1.5 w-16" 
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden relative">
      {/* Celebration overlay */}
      <AnimatePresence>
        {celebratingAchievement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-amber-500/10 to-orange-500/20 z-10 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <Sparkles className="h-12 w-12 text-yellow-500" />
              <span className="text-lg font-bold text-yellow-600">Achievement Sbloccato!</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`h-2 bg-gradient-to-r ${levelGradient}`} />
      
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            I Tuoi Progressi
          </div>
          <Badge variant="outline" className="font-normal">
            <TrendingUp className="h-3 w-3 mr-1" />
            Livello {levelInfo.level}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Level & XP Hero Section */}
        <div className={`bg-gradient-to-br ${levelGradient} rounded-xl p-4 text-white shadow-lg`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <motion.div 
                className="h-14 w-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center ring-2 ring-white/30"
                animate={{ 
                  scale: [1, 1.05, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <span className="text-2xl font-bold">{levelInfo.level}</span>
              </motion.div>
              <div>
                <p className="font-bold text-lg">{levelInfo.name}</p>
                <div className="flex items-center gap-1 text-sm opacity-90">
                  <Zap className="h-4 w-4" />
                  {levelInfo.xp} XP totali
                </div>
              </div>
            </div>
            
            {stats?.current_streak && stats.current_streak > 0 ? (
              <motion.div 
                className="text-right bg-white/20 backdrop-blur rounded-lg px-3 py-2"
                animate={{ 
                  boxShadow: ['0 0 0px rgba(255,255,255,0)', '0 0 20px rgba(255,255,255,0.3)', '0 0 0px rgba(255,255,255,0)']
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="flex items-center gap-1">
                  <Flame className="h-5 w-5" />
                  <span className="font-bold text-xl">{stats.current_streak}</span>
                </div>
                <p className="text-xs opacity-80">giorni streak</p>
              </motion.div>
            ) : (
              <div className="text-right bg-white/20 backdrop-blur rounded-lg px-3 py-2">
                <Gift className="h-5 w-5 mb-1 mx-auto" />
                <p className="text-xs opacity-80">Sincronizza ogni giorno!</p>
              </div>
            )}
          </div>
          
          {/* Progress to next level */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm opacity-90">
              <span>Prossimo: {levelInfo.nextLevelName}</span>
              <span className="font-medium">{Math.round(levelInfo.progress)}%</span>
            </div>
            <Progress 
              value={levelInfo.progress} 
              className="h-2.5 bg-white/20" 
            />
            <p className="text-xs opacity-75 text-right">
              {levelInfo.xpInCurrentLevel}/{levelInfo.xpNeededForNext} XP
            </p>
          </div>
        </div>

        {/* Achievements Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Badge ({unlockedCount}/{totalAchievements})
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowAchievementList(!showAchievementList)}
            >
              {showAchievementList ? 'Nascondi' : 'Vedi tutti'}
              <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${showAchievementList ? 'rotate-90' : ''}`} />
            </Button>
          </div>
          
          {/* Quick Badge Preview */}
          <div className="flex flex-wrap gap-2 mb-3">
            {sortedAchievements.slice(0, showAchievementList ? sortedAchievements.length : 6).map((achievement) => (
              <motion.div
                key={achievement.id}
                className={`relative h-12 w-12 rounded-xl flex items-center justify-center text-xl shadow-sm transition-all ${
                  achievement.is_unlocked 
                    ? 'bg-gradient-to-br from-yellow-100 to-amber-200 border-2 border-yellow-400' 
                    : 'bg-muted/50 border-2 border-dashed border-muted-foreground/20'
                }`}
                whileHover={{ scale: 1.1, rotate: achievement.is_unlocked ? 5 : 0 }}
                whileTap={{ scale: 0.95 }}
                title={`${achievement.achievement_name}${achievement.is_unlocked ? ' ✓' : ` (${achievement.progress}/${achievement.target})`}`}
              >
                <span className={achievement.is_unlocked ? '' : 'opacity-40 grayscale'}>
                  {achievement.achievement_icon}
                </span>
                {achievement.is_unlocked && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
                {!achievement.is_unlocked && achievement.progress > 0 && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-1 bg-primary/50 rounded-b-lg"
                    style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                  />
                )}
              </motion.div>
            ))}
          </div>

          {/* Detailed Achievement List */}
          <AnimatePresence>
            {showAchievementList && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {sortedAchievements.map((achievement) => (
                  <div 
                    key={achievement.id}
                    className={`p-3 rounded-lg border ${
                      achievement.is_unlocked 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800'
                        : 'bg-muted/30 border-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg ${
                        achievement.is_unlocked ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'
                      }`}>
                        {achievement.achievement_icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{achievement.achievement_name}</p>
                          <Badge variant={achievement.is_unlocked ? "default" : "secondary"} className="text-xs">
                            +{achievement.xp_reward} XP
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{achievement.achievement_description}</p>
                        {!achievement.is_unlocked && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <Progress 
                              value={(achievement.progress / achievement.target) * 100} 
                              className="h-1.5 flex-1" 
                            />
                            <span className="text-xs text-muted-foreground">
                              {achievement.progress}/{achievement.target}
                            </span>
                          </div>
                        )}
                      </div>
                      {achievement.is_unlocked && (
                        <div className="h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Next Achievement Highlight */}
        {nextAchievement && !showAchievementList && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Prossimo Obiettivo
              </p>
              <Badge className="bg-primary/20 text-primary border-0">
                +{nextAchievement.xp_reward} XP
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <motion.div 
                className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {nextAchievement.achievement_icon}
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{nextAchievement.achievement_name}</p>
                <p className="text-xs text-muted-foreground">{nextAchievement.achievement_description}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{nextAchievement.progress}/{nextAchievement.target}</span>
              </div>
              <Progress 
                value={(nextAchievement.progress / nextAchievement.target) * 100} 
                className="h-2" 
              />
            </div>
          </div>
        )}

        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-3 gap-2">
            <motion.div 
              className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-3 text-center"
              whileHover={{ scale: 1.02 }}
            >
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.total_syncs}</p>
              <p className="text-xs text-muted-foreground">Sync totali</p>
            </motion.div>
            <motion.div 
              className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-3 text-center"
              whileHover={{ scale: 1.02 }}
            >
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{stats.longest_streak}</p>
              <p className="text-xs text-muted-foreground">Record streak</p>
            </motion.div>
            <motion.div 
              className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-3 text-center"
              whileHover={{ scale: 1.02 }}
            >
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{unlockedCount}</p>
              <p className="text-xs text-muted-foreground">Badge</p>
            </motion.div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
