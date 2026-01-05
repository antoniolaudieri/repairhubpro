import { LucideIcon } from "lucide-react";
import ReactGridLayout from "react-grid-layout";

export type Layout = ReactGridLayout.Layout;
export type Layouts = ReactGridLayout.Layouts;

export type WidgetType = 
  | 'stat-pending'
  | 'stat-in-progress'
  | 'stat-completed'
  | 'stat-low-stock'
  | 'stat-forfeitures'
  | 'stat-customers'
  | 'stat-revenue'
  | 'stat-active'
  | 'chart-weekly'
  | 'recent-repairs'
  | 'quick-access'
  | 'alerts';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  config?: Record<string, any>;
}

export interface WidgetConfig {
  type: WidgetType;
  title: string;
  description: string;
  icon: LucideIcon;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
}

export interface DashboardStats {
  pendingRepairs: number;
  inProgressRepairs: number;
  completedToday: number;
  lowStockItems: number;
  totalCustomers: number;
  totalRevenue: number;
  forfeitureWarnings: number;
}

export interface RecentRepair {
  id: string;
  status: string;
  created_at: string;
  device: {
    brand: string;
    model: string;
    photo_url: string | null;
    device_type: string;
  };
  customer: {
    name: string;
  };
}

export interface ForfeitureWarning {
  id: string;
  completed_at: string;
  daysLeft: number;
  device: {
    brand: string;
    model: string;
  };
  customer: {
    name: string;
    phone: string;
  };
}

export interface WeeklyData {
  day: string;
  riparazioni: number;
  completate: number;
}

export interface DashboardContextValue {
  stats: DashboardStats;
  recentRepairs: RecentRepair[];
  forfeitureWarnings: ForfeitureWarning[];
  weeklyData: WeeklyData[];
  loading: boolean;
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
}

export interface SavedDashboardLayout {
  widgets: DashboardWidget[];
  layouts: Layouts;
}
