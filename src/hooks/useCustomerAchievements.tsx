import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Achievement {
  id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_description: string | null;
  achievement_icon: string | null;
  progress: number;
  target: number;
  xp_reward: number;
  is_unlocked: boolean;
  unlocked_at: string | null;
}

interface GamificationStats {
  id: string;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_sync_date: string | null;
  total_syncs: number;
}

interface UseCustomerAchievementsOptions {
  customerId?: string;
  centroId?: string;
  enabled?: boolean;
}

// Achievement definitions
export const ACHIEVEMENT_DEFINITIONS = [
  {
    type: 'first_sync',
    name: 'Primo Check-up',
    description: 'Completa la prima sincronizzazione',
    icon: '🎯',
    target: 1,
    xp: 50
  },
  {
    type: 'sync_streak_3',
    name: 'Costante',
    description: '3 giorni consecutivi di sync',
    icon: '🔥',
    target: 3,
    xp: 75
  },
  {
    type: 'sync_streak_7',
    name: 'Settimana Perfetta',
    description: '7 giorni consecutivi di sync',
    icon: '⭐',
    target: 7,
    xp: 150
  },
  {
    type: 'sync_streak_30',
    name: 'Maratoneta',
    description: '30 giorni consecutivi di sync',
    icon: '🏆',
    target: 30,
    xp: 500
  },
  {
    type: 'health_master',
    name: 'Dispositivo Sano',
    description: 'Mantieni health score > 80% per 7 giorni',
    icon: '💚',
    target: 7,
    xp: 200
  },
  {
    type: 'battery_champion',
    name: 'Campione Batteria',
    description: 'Mai sotto 20% per una settimana',
    icon: '🔋',
    target: 7,
    xp: 100
  },
  {
    type: 'storage_cleaner',
    name: 'Pulizia Esperta',
    description: 'Libera 2GB di spazio',
    icon: '🧹',
    target: 2,
    xp: 75
  },
  {
    type: 'loyal_customer',
    name: 'Cliente Fedele',
    description: '3 riparazioni completate',
    icon: '🎖️',
    target: 3,
    xp: 300
  },
  {
    type: 'total_syncs_10',
    name: 'Monitoraggio Regolare',
    description: '10 sincronizzazioni totali',
    icon: '📊',
    target: 10,
    xp: 100
  },
  {
    type: 'total_syncs_50',
    name: 'Utente Esperto',
    description: '50 sincronizzazioni totali',
    icon: '🌟',
    target: 50,
    xp: 250
  }
];

// Level thresholds
export const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, name: 'Novizio' },
  { level: 2, xp: 100, name: 'Apprendista' },
  { level: 3, xp: 250, name: 'Esploratore' },
  { level: 4, xp: 500, name: 'Praticante' },
  { level: 5, xp: 800, name: 'Esperto' },
  { level: 6, xp: 1200, name: 'Veterano' },
  { level: 7, xp: 1800, name: 'Maestro' },
  { level: 8, xp: 2500, name: 'Campione' },
  { level: 9, xp: 3500, name: 'Leggenda' },
  { level: 10, xp: 5000, name: 'Eroe' }
];

export const useCustomerAchievements = ({
  customerId,
  centroId,
  enabled = true
}: UseCustomerAchievementsOptions) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  const getLevelInfo = useCallback((xp: number) => {
    let currentLevel = LEVEL_THRESHOLDS[0];
    let nextLevel = LEVEL_THRESHOLDS[1];
    
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i].xp) {
        currentLevel = LEVEL_THRESHOLDS[i];
        nextLevel = LEVEL_THRESHOLDS[i + 1] || currentLevel;
        break;
      }
    }
    
    const xpInCurrentLevel = xp - currentLevel.xp;
    const xpNeededForNext = nextLevel.xp - currentLevel.xp;
    const progress = xpNeededForNext > 0 ? (xpInCurrentLevel / xpNeededForNext) * 100 : 100;
    
    return {
      level: currentLevel.level,
      name: currentLevel.name,
      xp,
      xpInCurrentLevel,
      xpNeededForNext,
      progress,
      nextLevelName: nextLevel.name
    };
  }, []);

  const fetchAchievements = useCallback(async () => {
    if (!customerId || !centroId || !enabled) {
      setLoading(false);
      return;
    }

    try {
      // Fetch achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('customer_achievements')
        .select('*')
        .eq('customer_id', customerId)
        .eq('centro_id', centroId);

      if (achievementsError) throw achievementsError;

      // Fetch stats
      const { data: statsData, error: statsError } = await supabase
        .from('customer_gamification_stats')
        .select('*')
        .eq('customer_id', customerId)
        .eq('centro_id', centroId)
        .maybeSingle();

      if (statsError) throw statsError;

      setAchievements(achievementsData || []);
      setStats(statsData);
    } catch (error) {
      console.error('[Achievements] Error fetching:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId, centroId, enabled]);

  // Initialize achievements for new customer
  const initializeAchievements = useCallback(async () => {
    if (!customerId || !centroId) return;

    try {
      // Check if already initialized
      const { data: existing } = await supabase
        .from('customer_achievements')
        .select('id')
        .eq('customer_id', customerId)
        .eq('centro_id', centroId)
        .limit(1);

      if (existing && existing.length > 0) return;

      // Create all achievement records
      const achievementsToInsert = ACHIEVEMENT_DEFINITIONS.map(def => ({
        customer_id: customerId,
        centro_id: centroId,
        achievement_type: def.type,
        achievement_name: def.name,
        achievement_description: def.description,
        achievement_icon: def.icon,
        target: def.target,
        xp_reward: def.xp,
        progress: 0,
        is_unlocked: false
      }));

      await supabase.from('customer_achievements').insert(achievementsToInsert);

      // Create stats record
      await supabase.from('customer_gamification_stats').insert({
        customer_id: customerId,
        centro_id: centroId,
        total_xp: 0,
        level: 1,
        current_streak: 0,
        longest_streak: 0,
        total_syncs: 0
      });

      await fetchAchievements();
    } catch (error) {
      console.error('[Achievements] Error initializing:', error);
    }
  }, [customerId, centroId, fetchAchievements]);

  // Update progress for an achievement
  const updateProgress = useCallback(async (achievementType: string, newProgress: number) => {
    if (!customerId || !centroId) return;

    try {
      const achievement = achievements.find(a => a.achievement_type === achievementType);
      if (!achievement || achievement.is_unlocked) return;

      const isNowUnlocked = newProgress >= achievement.target;
      
      await supabase
        .from('customer_achievements')
        .update({
          progress: Math.min(newProgress, achievement.target),
          is_unlocked: isNowUnlocked,
          unlocked_at: isNowUnlocked ? new Date().toISOString() : null
        })
        .eq('id', achievement.id);

      // If unlocked, add XP
      if (isNowUnlocked && stats) {
        const newXp = stats.total_xp + achievement.xp_reward;
        const newLevel = getLevelInfo(newXp).level;
        
        await supabase
          .from('customer_gamification_stats')
          .update({
            total_xp: newXp,
            level: newLevel
          })
          .eq('id', stats.id);
      }

      await fetchAchievements();
    } catch (error) {
      console.error('[Achievements] Error updating progress:', error);
    }
  }, [customerId, centroId, achievements, stats, fetchAchievements, getLevelInfo]);

  // Record a sync and update streak
  const recordSync = useCallback(async () => {
    if (!customerId || !centroId) return;

    try {
      // Get or create stats
      let currentStats = stats;
      
      if (!currentStats) {
        // Try to fetch first
        const { data: existingStats } = await supabase
          .from('customer_gamification_stats')
          .select('*')
          .eq('customer_id', customerId)
          .eq('centro_id', centroId)
          .maybeSingle();
        
        if (existingStats) {
          currentStats = existingStats;
        } else {
          const { data: newStats } = await supabase
            .from('customer_gamification_stats')
            .insert({
              customer_id: customerId,
              centro_id: centroId,
              total_xp: 0,
              level: 1,
              current_streak: 0,
              longest_streak: 0,
              total_syncs: 0
            })
            .select()
            .single();
          
          currentStats = newStats;
        }
      }

      if (!currentStats) {
        console.error('[Achievements] Could not get/create stats');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const lastSync = currentStats.last_sync_date;
      
      let newStreak = currentStats.current_streak;
      let isNewDay = true;
      
      if (lastSync) {
        const lastDate = new Date(lastSync);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          // Same day, don't change streak but still count sync
          isNewDay = false;
        } else if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      const newLongestStreak = Math.max(newStreak, currentStats.longest_streak);
      const newTotalSyncs = currentStats.total_syncs + 1;
      
      // Add XP for sync (10 XP per sync + bonus for streak)
      const syncXp = 10 + (newStreak > 1 ? Math.min(newStreak * 2, 20) : 0);
      const newXp = currentStats.total_xp + syncXp;
      const newLevel = getLevelInfo(newXp).level;

      const { error: updateError } = await supabase
        .from('customer_gamification_stats')
        .update({
          current_streak: newStreak,
          longest_streak: newLongestStreak,
          last_sync_date: today,
          total_syncs: newTotalSyncs,
          total_xp: newXp,
          level: newLevel
        })
        .eq('id', currentStats.id);

      if (updateError) {
        console.error('[Achievements] Error updating stats:', updateError);
        return;
      }

      console.log(`[Achievements] Sync recorded: +${syncXp} XP, streak: ${newStreak}, total syncs: ${newTotalSyncs}`);

      // Update achievements based on new stats
      // First sync
      if (newTotalSyncs === 1) {
        await updateProgress('first_sync', 1);
      }
      
      // Streak achievements
      if (newStreak >= 3) await updateProgress('sync_streak_3', newStreak);
      if (newStreak >= 7) await updateProgress('sync_streak_7', newStreak);
      if (newStreak >= 30) await updateProgress('sync_streak_30', newStreak);
      
      // Total syncs achievements
      if (newTotalSyncs >= 10) await updateProgress('total_syncs_10', newTotalSyncs);
      if (newTotalSyncs >= 50) await updateProgress('total_syncs_50', newTotalSyncs);

      await fetchAchievements();
    } catch (error) {
      console.error('[Achievements] Error recording sync:', error);
    }
  }, [customerId, centroId, stats, updateProgress, fetchAchievements, getLevelInfo]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  // Initialize on first load if needed
  useEffect(() => {
    if (!loading && achievements.length === 0 && customerId && centroId) {
      initializeAchievements();
    }
  }, [loading, achievements.length, customerId, centroId, initializeAchievements]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!customerId || !enabled) return;

    const channel = supabase
      .channel(`achievements:${customerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_achievements',
          filter: `customer_id=eq.${customerId}`
        },
        () => {
          fetchAchievements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, enabled, fetchAchievements]);

  const unlockedCount = achievements.filter(a => a.is_unlocked).length;
  const levelInfo = stats ? getLevelInfo(stats.total_xp) : getLevelInfo(0);

  return {
    achievements,
    stats,
    loading,
    levelInfo,
    unlockedCount,
    totalAchievements: ACHIEVEMENT_DEFINITIONS.length,
    recordSync,
    updateProgress,
    initializeAchievements,
    refresh: fetchAchievements
  };
};
