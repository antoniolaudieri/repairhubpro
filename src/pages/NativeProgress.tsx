import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Flame, 
  Zap, 
  Star, 
  Target, 
  Award,
  TrendingUp,
  Calendar,
  Gift,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCustomerAchievements, LEVEL_THRESHOLDS } from "@/hooks/useCustomerAchievements";

interface NativeProgressProps {
  user: User;
  customerId: string;
  centroId: string;
}

export const NativeProgress = ({ user, customerId, centroId }: NativeProgressProps) => {
  const [celebratingAchievement, setCelebratingAchievement] = useState<string | null>(null);

  const {
    achievements,
    stats,
    levelInfo,
    unlockedCount,
    totalAchievements,
  } = useCustomerAchievements({
    customerId,
    centroId,
    enabled: !!customerId && !!centroId,
  });

  // Get sorted achievements
  const sortedAchievements = [...achievements].sort((a, b) => {
    if (a.is_unlocked && !b.is_unlocked) return -1;
    if (!a.is_unlocked && b.is_unlocked) return 1;
    return b.progress / b.target - a.progress / a.target;
  });

  const getLevelGradient = (level: number) => {
    const gradients = [
      "from-gray-400 to-gray-600",
      "from-green-400 to-green-600",
      "from-blue-400 to-blue-600",
      "from-purple-400 to-purple-600",
      "from-yellow-400 to-orange-500",
      "from-pink-400 to-rose-600",
      "from-cyan-400 to-teal-600",
      "from-amber-400 to-red-500",
      "from-violet-400 to-indigo-600",
      "from-yellow-300 via-amber-500 to-red-600",
    ];
    return gradients[Math.min(level - 1, gradients.length - 1)] || gradients[0];
  };

  // Generate streak calendar (last 7 days)
  const generateStreakCalendar = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = date.toLocaleDateString("it-IT", { weekday: "short" }).charAt(0).toUpperCase();
      
      // Check if this day is part of the current streak
      const isInStreak = stats?.current_streak ? i < stats.current_streak : false;
      const isToday = i === 0;
      
      days.push({ dayName, isInStreak, isToday });
    }
    
    return days;
  };

  const streakCalendar = generateStreakCalendar();

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-24 space-y-6">
        {/* Level Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={`overflow-hidden bg-gradient-to-br ${getLevelGradient(levelInfo.level)} text-white shadow-xl`}>
            <CardContent className="p-6">
              {/* Level Display */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <motion.div
                    className="h-20 w-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center ring-4 ring-white/30"
                    animate={{
                      scale: [1, 1.05, 1],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <span className="text-4xl font-bold">{levelInfo.level}</span>
                  </motion.div>
                  <div>
                    <p className="text-2xl font-bold">{levelInfo.name}</p>
                    <div className="flex items-center gap-2 mt-1 opacity-90">
                      <Zap className="h-5 w-5" />
                      <span className="text-lg font-medium">{levelInfo.xp} XP totali</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <TrendingUp className="h-8 w-8 opacity-50" />
                </div>
              </div>

              {/* Progress to Next Level */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm opacity-90">
                  <span>Prossimo: {levelInfo.nextLevelName}</span>
                  <span className="font-medium">{Math.round(levelInfo.progress)}%</span>
                </div>
                <Progress value={levelInfo.progress} className="h-3 bg-white/20" />
                <p className="text-xs opacity-75 text-right">
                  {levelInfo.xpInCurrentLevel}/{levelInfo.xpNeededForNext} XP per il prossimo livello
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Streak Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Streak Giornaliera
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <motion.div
                  className="flex items-center gap-3"
                  animate={stats?.current_streak && stats.current_streak > 0 ? {
                    scale: [1, 1.02, 1],
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${
                    stats?.current_streak && stats.current_streak > 0
                      ? "bg-gradient-to-br from-orange-400 to-red-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    <div className="text-center">
                      <Flame className="h-6 w-6 mx-auto mb-0.5" />
                      <span className="text-lg font-bold">{stats?.current_streak || 0}</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">
                      {stats?.current_streak && stats.current_streak > 0
                        ? `${stats.current_streak} giorni consecutivi!`
                        : "Nessuna streak attiva"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Record: {stats?.longest_streak || 0} giorni
                    </p>
                  </div>
                </motion.div>
                
                {stats?.current_streak && stats.current_streak >= 7 && (
                  <Badge className="bg-gradient-to-r from-orange-400 to-red-500 text-white">
                    🔥 On Fire!
                  </Badge>
                )}
              </div>

              {/* 7-day Calendar */}
              <div className="grid grid-cols-7 gap-2">
                {streakCalendar.map((day, index) => (
                  <motion.div
                    key={index}
                    className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                      day.isInStreak
                        ? "bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30"
                        : "bg-muted/50"
                    } ${day.isToday ? "ring-2 ring-primary" : ""}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <span className="text-xs text-muted-foreground">{day.dayName}</span>
                    <motion.div
                      className={`w-4 h-4 rounded-full mt-1 ${
                        day.isInStreak ? "bg-orange-500" : "bg-muted-foreground/20"
                      }`}
                      animate={day.isInStreak ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    />
                  </motion.div>
                ))}
              </div>

              <p className="text-xs text-center text-muted-foreground mt-3">
                Sincronizza ogni giorno per mantenere la tua streak!
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Badges Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Badge
                </div>
                <Badge variant="secondary">
                  {unlockedCount}/{totalAchievements}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Badge Grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {sortedAchievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center p-2 transition-all ${
                      achievement.is_unlocked
                        ? "bg-gradient-to-br from-yellow-100 to-amber-200 dark:from-yellow-900/30 dark:to-amber-800/30 border-2 border-yellow-400"
                        : "bg-muted/50 border-2 border-dashed border-muted-foreground/20"
                    }`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className={`text-2xl ${achievement.is_unlocked ? "" : "opacity-40 grayscale"}`}>
                      {achievement.achievement_icon}
                    </span>
                    <p className={`text-[10px] text-center mt-1 font-medium truncate w-full ${
                      achievement.is_unlocked ? "" : "text-muted-foreground"
                    }`}>
                      {achievement.achievement_name}
                    </p>
                    
                    {/* Unlocked checkmark */}
                    {achievement.is_unlocked && (
                      <motion.div
                        className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500 }}
                      >
                        <span className="text-white text-xs">✓</span>
                      </motion.div>
                    )}
                    
                    {/* Progress indicator for locked */}
                    {!achievement.is_unlocked && achievement.progress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/30 rounded-b-2xl overflow-hidden">
                        <motion.div
                          className="h-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                          transition={{ delay: 0.3 }}
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Achievement Details */}
              <div className="space-y-2">
                {sortedAchievements.slice(0, 3).map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`p-3 rounded-xl border ${
                      achievement.is_unlocked
                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                        : "bg-muted/30 border-muted"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl ${
                        achievement.is_unlocked ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
                      }`}>
                        {achievement.achievement_icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{achievement.achievement_name}</p>
                          <Badge variant={achievement.is_unlocked ? "default" : "secondary"} className="text-xs shrink-0">
                            +{achievement.xp_reward} XP
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {achievement.achievement_description}
                        </p>
                        {!achievement.is_unlocked && (
                          <div className="flex items-center gap-2 mt-1">
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
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-5 w-5 text-purple-500" />
                Statistiche
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <motion.div
                  className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-4 text-center"
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {stats?.total_syncs || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Sync Totali</p>
                </motion.div>
                <motion.div
                  className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-2xl p-4 text-center"
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {stats?.longest_streak || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Record Streak</p>
                </motion.div>
                <motion.div
                  className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl p-4 text-center"
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {unlockedCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Badge</p>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Level Roadmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Percorso Livelli
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {LEVEL_THRESHOLDS.slice(0, 5).map((threshold, index) => {
                  const isCurrentLevel = levelInfo.level === threshold.level;
                  const isUnlocked = levelInfo.level >= threshold.level;
                  
                  return (
                    <motion.div
                      key={threshold.level}
                      className={`flex items-center gap-3 p-2 rounded-xl ${
                        isCurrentLevel
                          ? "bg-primary/10 ring-2 ring-primary"
                          : isUnlocked
                          ? "bg-green-50 dark:bg-green-900/20"
                          : "bg-muted/30"
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br ${getLevelGradient(threshold.level)}`}>
                        {threshold.level}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{threshold.name}</p>
                        <p className="text-xs text-muted-foreground">{threshold.xp} XP</p>
                      </div>
                      {isUnlocked && (
                        <Badge variant="default" className="bg-green-500">
                          ✓
                        </Badge>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ScrollArea>
  );
};
