import { motion } from "framer-motion";
import { Trophy, Flame, Zap, ChevronRight, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface GamificationPreviewProps {
  level: number;
  levelName: string;
  xp: number;
  progress: number;
  streak: number;
  nextAchievement?: {
    name: string;
    icon: string;
    progress: number;
    target: number;
  };
  onViewAll: () => void;
}

export const GamificationPreview = ({
  level,
  levelName,
  xp,
  progress,
  streak,
  nextAchievement,
  onViewAll,
}: GamificationPreviewProps) => {
  const getLevelGradient = (lvl: number) => {
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
    return gradients[Math.min(lvl - 1, gradients.length - 1)] || gradients[0];
  };

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="p-4">
        {/* Header with level and streak */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <motion.div
              className={`h-12 w-12 rounded-full bg-gradient-to-br ${getLevelGradient(level)} flex items-center justify-center shadow-lg`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-lg font-bold text-white">{level}</span>
            </motion.div>
            <div>
              <p className="font-semibold text-sm">{levelName}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="h-3 w-3 text-yellow-500" />
                <span>{xp} XP</span>
              </div>
            </div>
          </div>

          {streak > 0 ? (
            <motion.div
              className="flex items-center gap-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-full"
              animate={{
                boxShadow: [
                  "0 0 0px rgba(251, 146, 60, 0)",
                  "0 0 12px rgba(251, 146, 60, 0.4)",
                  "0 0 0px rgba(251, 146, 60, 0)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Flame className="h-4 w-4" />
              <span className="font-bold text-sm">{streak}</span>
            </motion.div>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Inizia oggi!
            </Badge>
          )}
        </div>

        {/* XP Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Prossimo livello</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Next Achievement */}
        {nextAchievement && (
          <motion.button
            onClick={onViewAll}
            className="w-full flex items-center gap-3 p-3 bg-background/50 rounded-xl border border-border/50 text-left"
            whileTap={{ scale: 0.98 }}
          >
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
              {nextAchievement.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Target className="h-3 w-3 text-primary" />
                <span className="text-xs text-primary font-medium">Prossimo Obiettivo</span>
              </div>
              <p className="text-sm font-medium truncate">{nextAchievement.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Progress 
                  value={(nextAchievement.progress / nextAchievement.target) * 100} 
                  className="h-1 flex-1" 
                />
                <span className="text-[10px] text-muted-foreground">
                  {nextAchievement.progress}/{nextAchievement.target}
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        )}

        {/* View all button */}
        <motion.button
          onClick={onViewAll}
          className="w-full mt-3 flex items-center justify-center gap-2 text-sm text-primary font-medium"
          whileTap={{ scale: 0.98 }}
        >
          <Trophy className="h-4 w-4" />
          Vedi tutti i progressi
          <ChevronRight className="h-4 w-4" />
        </motion.button>
      </CardContent>
    </Card>
  );
};
