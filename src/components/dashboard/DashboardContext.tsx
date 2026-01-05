import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardContextValue, DashboardStats, RecentRepair, ForfeitureWarning, WeeklyData } from "./types";

const DashboardContext = createContext<DashboardContextValue | null>(null);

export const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboardContext must be used within DashboardProvider");
  }
  return context;
};

interface DashboardProviderProps {
  children: ReactNode;
}

export const DashboardProvider = ({ children }: DashboardProviderProps) => {
  const [stats, setStats] = useState<DashboardStats>({
    pendingRepairs: 0,
    inProgressRepairs: 0,
    completedToday: 0,
    lowStockItems: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    forfeitureWarnings: 0,
  });
  const [recentRepairs, setRecentRepairs] = useState<RecentRepair[]>([]);
  const [forfeitureWarnings, setForfeitureWarnings] = useState<ForfeitureWarning[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      try {
        await Promise.all([
          loadStats(),
          loadRecentRepairs(),
          loadForfeitureWarnings(),
          loadWeeklyData(),
        ]);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const loadStats = async () => {
    try {
      const { data: repairs } = await supabase
        .from("repairs")
        .select("status, created_at, final_cost, completed_at, delivered_at");

      const { data: spareParts } = await supabase
        .from("spare_parts")
        .select("stock_quantity, minimum_stock");

      const { count: customerCount } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });

      const pending = repairs?.filter((r) => r.status === "pending").length || 0;
      const inProgress = repairs?.filter((r) => r.status === "in_progress").length || 0;
      
      const today = new Date().toISOString().split("T")[0];
      const completedToday = repairs?.filter(
        (r) => r.status === "completed" && r.created_at?.startsWith(today)
      ).length || 0;

      const lowStock = spareParts?.filter(
        (sp) => sp.stock_quantity <= sp.minimum_stock
      ).length || 0;

      const totalRevenue = repairs?.reduce((sum, r) => sum + (r.final_cost || 0), 0) || 0;

      const now = new Date();
      const forfeitureCount = repairs?.filter((r) => {
        if (r.status !== "completed" || r.delivered_at || !r.completed_at) return false;
        const completedAt = new Date(r.completed_at);
        const daysSinceCompletion = Math.floor((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceCompletion >= 23;
      }).length || 0;

      setStats({
        pendingRepairs: pending,
        inProgressRepairs: inProgress,
        completedToday,
        lowStockItems: lowStock,
        totalCustomers: customerCount || 0,
        totalRevenue,
        forfeitureWarnings: forfeitureCount,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadWeeklyData = async () => {
    try {
      const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 6);

      const { data: repairs } = await supabase
        .from("repairs")
        .select("created_at, status, completed_at")
        .gte("created_at", weekAgo.toISOString());

      const weekData: WeeklyData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = days[date.getDay()];
        
        const created = repairs?.filter(r => r.created_at.startsWith(dateStr)).length || 0;
        const completed = repairs?.filter(r => r.completed_at?.startsWith(dateStr)).length || 0;
        
        weekData.push({
          day: dayName,
          riparazioni: created,
          completate: completed
        });
      }
      setWeeklyData(weekData);
    } catch (error) {
      console.error("Error loading weekly data:", error);
    }
  };

  const loadForfeitureWarnings = async () => {
    try {
      const { data } = await supabase
        .from("repairs")
        .select(`
          id,
          completed_at,
          delivered_at,
          status,
          device:devices (
            brand,
            model,
            customer:customers (
              name,
              phone
            )
          )
        `)
        .eq("status", "completed")
        .is("delivered_at", null)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: true });

      if (data) {
        const now = new Date();
        const warnings = data
          .map((r: any) => {
            if (!r.device) return null;
            const completedAt = new Date(r.completed_at);
            const daysSinceCompletion = Math.floor((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24));
            const daysLeft = 30 - daysSinceCompletion;
            return {
              id: r.id,
              completed_at: r.completed_at,
              daysLeft,
              device: {
                brand: r.device.brand,
                model: r.device.model,
              },
              customer: r.device.customer,
            };
          })
          .filter((r: ForfeitureWarning | null): r is ForfeitureWarning => r !== null && r.daysLeft <= 7 && r.daysLeft > 0)
          .sort((a: ForfeitureWarning, b: ForfeitureWarning) => a.daysLeft - b.daysLeft);

        setForfeitureWarnings(warnings);
      }
    } catch (error) {
      console.error("Error loading forfeiture warnings:", error);
    }
  };

  const loadRecentRepairs = async () => {
    try {
      const { data } = await supabase
        .from("repairs")
        .select(`
          id,
          status,
          created_at,
          device:devices (
            brand,
            model,
            photo_url,
            device_type,
            customer:customers (
              name
            )
          )
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) {
        setRecentRepairs(data.map((r: any) => ({
          id: r.id,
          status: r.status,
          created_at: r.created_at,
          device: r.device ? {
            brand: r.device.brand,
            model: r.device.model,
            photo_url: r.device.photo_url,
            device_type: r.device.device_type,
          } : { brand: "N/A", model: "N/A", photo_url: null, device_type: "smartphone" },
          customer: r.device?.customer || { name: "N/A" },
        })));
      }
    } catch (error) {
      console.error("Error loading recent repairs:", error);
    }
  };

  return (
    <DashboardContext.Provider value={{
      stats,
      recentRepairs,
      forfeitureWarnings,
      weeklyData,
      loading,
      isEditMode,
      setIsEditMode,
    }}>
      {children}
    </DashboardContext.Provider>
  );
};
