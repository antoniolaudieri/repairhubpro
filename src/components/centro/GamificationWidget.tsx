import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, Star, Zap, Target, Flame, Award, 
  TrendingUp, Users, Wrench, Crown, Sparkles,
  Medal, Gift, Rocket, Heart
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress: number;
  target: number;
  category: "repairs" | "customers" | "revenue" | "special";
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface GamificationWidgetProps {
  centroId: string;
}

export function GamificationWidget({ centroId }: GamificationWidgetProps) {
  const [stats, setStats] = useState({
    totalRepairs: 0,
    completedToday: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    streak: 0,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    loadStats();
  }, [centroId]);

  const loadStats = async () => {
    try {
      // Fetch repairs count
      const { data: customers } = await supabase
        .from("customers")
        .select("id")
        .eq("centro_id", centroId);

      const customerIds = customers?.map(c => c.id) || [];

      // Fetch devices with repairs
      const { data: devices } = await supabase
        .from("devices")
        .select(`
          id,
          customer_id,
          repairs (
            id,
            status,
            final_cost,
            estimated_cost,
            created_at,
            completed_at
          )
        `)
        .in("customer_id", customerIds.length > 0 ? customerIds : ['no-match']);

      const allRepairs = devices?.flatMap(d => d.repairs) || [];
      const completedRepairs = allRepairs.filter(r => r.status === "completed" || r.status === "delivered");
      
      // Today's repairs
      const today = new Date().toISOString().split('T')[0];
      const completedToday = completedRepairs.filter(r => 
        r.completed_at?.startsWith(today)
      ).length;

      // Calculate total revenue
      const totalRevenue = allRepairs.reduce((sum, r) => 
        sum + (r.final_cost || r.estimated_cost || 0), 0
      );

      // Calculate streak (consecutive days with completed repairs)
      const streak = calculateStreak(completedRepairs);

      // Calculate level and XP
      const xp = completedRepairs.length * 50 + Math.floor(totalRevenue / 10);
      const level = Math.floor(xp / 500) + 1;
      const xpInCurrentLevel = xp % 500;
      const xpToNextLevel = 500;

      setStats({
        totalRepairs: allRepairs.length,
        completedToday,
        totalCustomers: customers?.length || 0,
        totalRevenue,
        streak,
        level,
        xp: xpInCurrentLevel,
        xpToNextLevel,
      });

      // Generate achievements based on stats
      generateAchievements(allRepairs.length, completedRepairs.length, customers?.length || 0, totalRevenue, streak);
    } catch (error) {
      console.error("Error loading gamification stats:", error);
    }
  };

  const calculateStreak = (repairs: any[]) => {
    if (repairs.length === 0) return 0;
    
    const dates = repairs
      .filter(r => r.completed_at)
      .map(r => r.completed_at.split('T')[0])
      .sort((a, b) => b.localeCompare(a));
    
    if (dates.length === 0) return 0;
    
    let streak = 1;
    let currentDate = new Date(dates[0]);
    
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(currentDate);
      prevDate.setDate(prevDate.getDate() - 1);
      
      if (dates[i] === prevDate.toISOString().split('T')[0]) {
        streak++;
        currentDate = prevDate;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const generateAchievements = (
    totalRepairs: number, 
    completedRepairs: number, 
    totalCustomers: number, 
    totalRevenue: number,
    streak: number
  ) => {
    const achievementsList: Achievement[] = [
      {
        id: "first_repair",
        name: "Prima Riparazione",
        description: "Completa la tua prima riparazione",
        icon: <Wrench className="h-5 w-5" />,
        unlocked: completedRepairs >= 1,
        progress: Math.min(completedRepairs, 1),
        target: 1,
        category: "repairs",
        rarity: "common",
      },
      {
        id: "repair_10",
        name: "Tecnico Esperto",
        description: "Completa 10 riparazioni",
        icon: <Star className="h-5 w-5" />,
        unlocked: completedRepairs >= 10,
        progress: Math.min(completedRepairs, 10),
        target: 10,
        category: "repairs",
        rarity: "common",
      },
      {
        id: "repair_50",
        name: "Maestro Riparatore",
        description: "Completa 50 riparazioni",
        icon: <Trophy className="h-5 w-5" />,
        unlocked: completedRepairs >= 50,
        progress: Math.min(completedRepairs, 50),
        target: 50,
        category: "repairs",
        rarity: "rare",
      },
      {
        id: "repair_100",
        name: "Leggenda",
        description: "Completa 100 riparazioni",
        icon: <Crown className="h-5 w-5" />,
        unlocked: completedRepairs >= 100,
        progress: Math.min(completedRepairs, 100),
        target: 100,
        category: "repairs",
        rarity: "legendary",
      },
      {
        id: "customers_10",
        name: "Costruttore di Relazioni",
        description: "Raggiungi 10 clienti",
        icon: <Users className="h-5 w-5" />,
        unlocked: totalCustomers >= 10,
        progress: Math.min(totalCustomers, 10),
        target: 10,
        category: "customers",
        rarity: "common",
      },
      {
        id: "customers_50",
        name: "Community Leader",
        description: "Raggiungi 50 clienti",
        icon: <Heart className="h-5 w-5" />,
        unlocked: totalCustomers >= 50,
        progress: Math.min(totalCustomers, 50),
        target: 50,
        category: "customers",
        rarity: "rare",
      },
      {
        id: "revenue_1000",
        name: "Primo Traguardo",
        description: "Raggiungi €1.000 di fatturato",
        icon: <Target className="h-5 w-5" />,
        unlocked: totalRevenue >= 1000,
        progress: Math.min(totalRevenue, 1000),
        target: 1000,
        category: "revenue",
        rarity: "common",
      },
      {
        id: "revenue_10000",
        name: "Business in Crescita",
        description: "Raggiungi €10.000 di fatturato",
        icon: <TrendingUp className="h-5 w-5" />,
        unlocked: totalRevenue >= 10000,
        progress: Math.min(totalRevenue, 10000),
        target: 10000,
        category: "revenue",
        rarity: "epic",
      },
      {
        id: "streak_3",
        name: "In Forma",
        description: "3 giorni consecutivi con riparazioni",
        icon: <Flame className="h-5 w-5" />,
        unlocked: streak >= 3,
        progress: Math.min(streak, 3),
        target: 3,
        category: "special",
        rarity: "common",
      },
      {
        id: "streak_7",
        name: "Settimana Perfetta",
        description: "7 giorni consecutivi con riparazioni",
        icon: <Zap className="h-5 w-5" />,
        unlocked: streak >= 7,
        progress: Math.min(streak, 7),
        target: 7,
        category: "special",
        rarity: "rare",
      },
      {
        id: "streak_30",
        name: "Inarrestabile",
        description: "30 giorni consecutivi con riparazioni",
        icon: <Rocket className="h-5 w-5" />,
        unlocked: streak >= 30,
        progress: Math.min(streak, 30),
        target: 30,
        category: "special",
        rarity: "legendary",
      },
    ];

    setAchievements(achievementsList);
  };

  const getRarityColor = (rarity: Achievement["rarity"]) => {
    switch (rarity) {
      case "common": return "from-slate-400 to-slate-500";
      case "rare": return "from-blue-400 to-blue-600";
      case "epic": return "from-purple-400 to-purple-600";
      case "legendary": return "from-amber-400 to-orange-500";
    }
  };

  const getRarityBg = (rarity: Achievement["rarity"], unlocked: boolean) => {
    if (!unlocked) return "bg-muted/30";
    switch (rarity) {
      case "common": return "bg-slate-500/10 border-slate-500/30";
      case "rare": return "bg-blue-500/10 border-blue-500/30";
      case "epic": return "bg-purple-500/10 border-purple-500/30";
      case "legendary": return "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30";
    }
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="space-y-4">
      {/* Level & XP Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden border-primary/20">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg">
                    {stats.level}
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Livello</p>
                  <h3 className="text-lg font-bold">
                    {stats.level < 5 ? "Apprendista" : 
                     stats.level < 10 ? "Tecnico" : 
                     stats.level < 20 ? "Esperto" : 
                     stats.level < 50 ? "Maestro" : "Leggenda"}
                  </h3>
                </div>
              </div>
              
              {stats.streak > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="font-bold text-orange-500">{stats.streak}</span>
                  <span className="text-xs text-orange-500/80">giorni</span>
                </div>
              )}
            </div>
            
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">XP</span>
                <span className="font-medium">{stats.xp} / {stats.xpToNextLevel}</span>
              </div>
              <Progress value={(stats.xp / stats.xpToNextLevel) * 100} className="h-2" />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-2 gap-3"
      >
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Oggi</p>
              <p className="text-lg font-bold">{stats.completedToday}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Award className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Achievement</p>
              <p className="text-lg font-bold">{unlockedCount}/{achievements.length}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Achievements */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Achievement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {achievements.slice(0, 6).map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-lg border transition-all",
                  getRarityBg(achievement.rarity, achievement.unlocked),
                  achievement.unlocked ? "hover:scale-[1.02]" : "opacity-60"
                )}
              >
                <div className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center",
                  achievement.unlocked 
                    ? `bg-gradient-to-br ${getRarityColor(achievement.rarity)} text-white shadow-md` 
                    : "bg-muted text-muted-foreground"
                )}>
                  {achievement.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "font-medium text-sm truncate",
                      !achievement.unlocked && "text-muted-foreground"
                    )}>
                      {achievement.name}
                    </p>
                    {achievement.unlocked && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-green-500/10 text-green-600 border-green-500/20">
                        ✓
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{achievement.description}</p>
                  
                  {!achievement.unlocked && (
                    <div className="mt-1.5">
                      <Progress 
                        value={(achievement.progress / achievement.target) * 100} 
                        className="h-1"
                      />
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {achievement.progress} / {achievement.target}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Achievement Celebration Modal */}
      <AnimatePresence>
        {showCelebration && newAchievement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setShowCelebration(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-card border rounded-2xl p-6 shadow-2xl max-w-sm mx-4 text-center"
            >
              <div className={cn(
                "h-20 w-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-gradient-to-br shadow-lg",
                getRarityColor(newAchievement.rarity)
              )}>
                <div className="text-white scale-150">
                  {newAchievement.icon}
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">🎉 Achievement Sbloccato!</h3>
              <p className="text-lg font-semibold text-primary">{newAchievement.name}</p>
              <p className="text-sm text-muted-foreground mt-1">{newAchievement.description}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
