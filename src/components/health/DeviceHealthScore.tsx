import { cn } from "@/lib/utils";
import { Battery, HardDrive, Cpu, Activity } from "lucide-react";
import { motion } from "framer-motion";

interface DeviceHealthScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function DeviceHealthScore({ 
  score, 
  size = "md", 
  showLabel = true,
  className 
}: DeviceHealthScoreProps) {
  const getScoreColor = () => {
    if (score >= 80) return "text-accent";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getScoreGradient = () => {
    if (score >= 80) return "from-accent to-accent-glow";
    if (score >= 60) return "from-warning to-yellow-400";
    return "from-destructive to-red-400";
  };

  const getScoreLabel = () => {
    if (score >= 80) return "Ottimo";
    if (score >= 60) return "Buono";
    if (score >= 40) return "Attenzione";
    return "Critico";
  };

  const sizeClasses = {
    sm: "h-16 w-16 text-lg",
    md: "h-24 w-24 text-2xl",
    lg: "h-32 w-32 text-3xl"
  };

  const strokeWidth = size === "sm" ? 4 : size === "md" ? 6 : 8;
  const radius = size === "sm" ? 28 : size === "md" ? 40 : 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className={cn("relative flex items-center justify-center", sizeClasses[size])}>
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/30"
          />
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className={cn("stop-current", getScoreColor())} />
              <stop offset="100%" className={cn("stop-current", getScoreColor(), "opacity-70")} />
            </linearGradient>
          </defs>
        </svg>
        <motion.span 
          className={cn("font-bold", getScoreColor())}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          {score}
        </motion.span>
      </div>
      {showLabel && (
        <span className={cn("text-xs font-medium", getScoreColor())}>
          {getScoreLabel()}
        </span>
      )}
    </div>
  );
}

interface DeviceMetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  status?: "good" | "warning" | "critical";
  detail?: string;
  className?: string;
}

export function DeviceMetricCard({
  icon,
  label,
  value,
  unit,
  status = "good",
  detail,
  className
}: DeviceMetricCardProps) {
  const statusColors = {
    good: "bg-accent/10 text-accent border-accent/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    critical: "bg-destructive/10 text-destructive border-destructive/20"
  };

  const iconBgColors = {
    good: "bg-accent/20",
    warning: "bg-warning/20",
    critical: "bg-destructive/20"
  };

  return (
    <motion.div
      className={cn(
        "p-4 rounded-xl border transition-all",
        statusColors[status],
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", iconBgColors[status])}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">
            {value}{unit && <span className="text-sm font-normal ml-1">{unit}</span>}
          </p>
          {detail && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{detail}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface DeviceHealthSummaryProps {
  healthLog: {
    health_score: number | null;
    battery_level: number | null;
    battery_health: string | null;
    storage_percent_used: number | null;
    storage_available_gb: number | null;
    ram_percent_used: number | null;
    ram_available_mb: number | null;
    created_at: string;
    device_model_info?: string | null;
    os_version?: string | null;
  };
  className?: string;
}

export function DeviceHealthSummary({ healthLog, className }: DeviceHealthSummaryProps) {
  const getStatus = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return "critical";
    if (value >= thresholds.warning) return "warning";
    return "good";
  };

  const batteryStatus = healthLog.battery_health === "good" ? "good" : 
    healthLog.battery_health === "dead" ? "critical" : "warning";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DeviceHealthScore 
            score={healthLog.health_score || 0} 
            size="md" 
          />
          <div>
            <h3 className="font-semibold">Punteggio Salute</h3>
            <p className="text-xs text-muted-foreground">
              Aggiornato: {new Date(healthLog.created_at).toLocaleDateString("it-IT", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </p>
            {healthLog.device_model_info && (
              <p className="text-xs text-muted-foreground">{healthLog.device_model_info}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DeviceMetricCard
          icon={<Battery className="h-4 w-4" />}
          label="Batteria"
          value={healthLog.battery_level || 0}
          unit="%"
          status={batteryStatus}
          detail={healthLog.battery_health ? `Stato: ${healthLog.battery_health}` : undefined}
        />
        <DeviceMetricCard
          icon={<HardDrive className="h-4 w-4" />}
          label="Storage"
          value={healthLog.storage_percent_used?.toFixed(0) || 0}
          unit="% usato"
          status={getStatus(healthLog.storage_percent_used || 0, { warning: 80, critical: 95 })}
          detail={healthLog.storage_available_gb ? `${healthLog.storage_available_gb.toFixed(1)} GB liberi` : undefined}
        />
        <DeviceMetricCard
          icon={<Cpu className="h-4 w-4" />}
          label="RAM"
          value={healthLog.ram_percent_used?.toFixed(0) || 0}
          unit="% usata"
          status={getStatus(healthLog.ram_percent_used || 0, { warning: 80, critical: 95 })}
          detail={healthLog.ram_available_mb ? `${(healthLog.ram_available_mb / 1024).toFixed(1)} GB liberi` : undefined}
        />
        <DeviceMetricCard
          icon={<Activity className="h-4 w-4" />}
          label="Sistema"
          value={healthLog.os_version || "N/D"}
          status="good"
        />
      </div>
    </div>
  );
}
