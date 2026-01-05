import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { 
  Clock, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle,
  Users,
  Euro,
  TrendingUp,
} from "lucide-react";
import { useDashboardContext } from "../DashboardContext";
import { WidgetType } from "../types";
import { cn } from "@/lib/utils";

interface StatWidgetProps {
  type: WidgetType;
  onRemove?: (id: string) => void;
}

interface StatConfig {
  getValue: (stats: any) => any;
  title: string;
  icon: typeof Clock;
  iconBg: string;
  iconColor?: string;
  path: string;
  highlight?: (stats: any) => boolean;
}

const statConfigs: Record<string, StatConfig> = {
  'stat-pending': {
    getValue: (stats: any) => stats.pendingRepairs,
    title: 'In Attesa',
    icon: Clock,
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
    path: '/repairs?status=pending',
  },
  'stat-in-progress': {
    getValue: (stats: any) => stats.inProgressRepairs,
    title: 'In Lavorazione',
    icon: Wrench,
    iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    path: '/repairs?status=in_progress',
  },
  'stat-completed': {
    getValue: (stats: any) => stats.completedToday,
    title: 'Completate Oggi',
    icon: CheckCircle2,
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
    path: '/repairs?status=completed',
  },
  'stat-low-stock': {
    getValue: (stats: any) => stats.lowStockItems,
    title: 'Scorte Basse',
    icon: AlertTriangle,
    iconBg: 'bg-gradient-to-br from-red-500 to-rose-500',
    path: '/inventory?low_stock=true',
  },
  'stat-forfeitures': {
    getValue: (stats: any) => stats.forfeitureWarnings,
    title: 'In Scadenza',
    icon: Clock,
    iconBg: 'bg-gradient-to-br from-rose-600 to-rose-800',
    path: '/repairs?status=completed',
    highlight: (stats: any) => stats.forfeitureWarnings > 0,
  },
  'stat-customers': {
    getValue: (stats: any) => stats.totalCustomers,
    title: 'Clienti',
    icon: Users,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    path: '/customers',
  },
  'stat-revenue': {
    getValue: (stats: any) => `€${stats.totalRevenue.toFixed(0)}`,
    title: 'Fatturato',
    icon: Euro,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    path: '/centro/finanza',
  },
  'stat-active': {
    getValue: (stats: any) => stats.pendingRepairs + stats.inProgressRepairs,
    title: 'Attive',
    icon: TrendingUp,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    path: '/repairs',
  },
};

export const StatWidget = ({ type }: StatWidgetProps) => {
  const navigate = useNavigate();
  const { stats, isEditMode } = useDashboardContext();
  
  const config = statConfigs[type as keyof typeof statConfigs];
  if (!config) return null;

  const value = config.getValue(stats);
  const Icon = config.icon;
  const isHighlighted = 'highlight' in config && config.highlight?.(stats);
  const isSmallVariant = ['stat-customers', 'stat-revenue', 'stat-active'].includes(type);

  const handleClick = () => {
    if (!isEditMode) {
      navigate(config.path);
    }
  };

  if (isSmallVariant) {
    return (
      <div 
        className={cn(
          "h-full flex items-center cursor-pointer p-4",
          !isEditMode && "hover:bg-muted/30 transition-colors"
        )}
        onClick={handleClick}
      >
        <div className="flex items-center gap-3 w-full">
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center",
            config.iconBg
          )}>
            <Icon className={cn("h-4 w-4", config.iconColor || 'text-white')} />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{config.title}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "h-full flex items-center cursor-pointer p-4 transition-all duration-200",
        !isEditMode && "hover:shadow-md",
        isHighlighted && "bg-rose-50/50"
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3 w-full">
        <div className={cn(
          "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0",
          config.iconBg
        )}>
          <Icon className={cn("h-4 w-4", config.iconColor || 'text-white')} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{config.title}</p>
        </div>
      </div>
    </div>
  );
};
