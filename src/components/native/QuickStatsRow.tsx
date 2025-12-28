import { motion } from "framer-motion";
import { Battery, HardDrive, Cpu, Wifi } from "lucide-react";

interface QuickStatsRowProps {
  batteryLevel: number | null;
  storagePercent: number | null;
  ramPercent: number | null;
  isOnline: boolean;
  connectionType?: string | null;
}

export const QuickStatsRow = ({
  batteryLevel,
  storagePercent,
  ramPercent,
  isOnline,
  connectionType,
}: QuickStatsRowProps) => {
  const getStatusColor = (value: number | null, thresholds: { good: number; warning: number }) => {
    if (value === null) return "text-muted-foreground bg-muted/50";
    if (value >= thresholds.good) return "text-green-600 bg-green-100 dark:bg-green-900/30";
    if (value >= thresholds.warning) return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
    return "text-red-600 bg-red-100 dark:bg-red-900/30";
  };

  const getInverseStatusColor = (value: number | null, thresholds: { good: number; warning: number }) => {
    if (value === null) return "text-muted-foreground bg-muted/50";
    if (value <= thresholds.good) return "text-green-600 bg-green-100 dark:bg-green-900/30";
    if (value <= thresholds.warning) return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
    return "text-red-600 bg-red-100 dark:bg-red-900/30";
  };

  const stats = [
    {
      icon: Battery,
      label: "Batteria",
      value: batteryLevel !== null ? `${Math.round(batteryLevel)}%` : "--",
      colorClass: getStatusColor(batteryLevel, { good: 50, warning: 25 }),
    },
    {
      icon: HardDrive,
      label: "Storage",
      value: storagePercent !== null ? `${Math.round(100 - storagePercent)}%` : "--",
      colorClass: getInverseStatusColor(storagePercent, { good: 70, warning: 85 }),
    },
    {
      icon: Cpu,
      label: "RAM",
      value: ramPercent !== null ? `${Math.round(100 - ramPercent)}%` : "--",
      colorClass: getInverseStatusColor(ramPercent, { good: 70, warning: 85 }),
    },
    {
      icon: Wifi,
      label: "Rete",
      value: connectionType?.toUpperCase() || (isOnline ? "Online" : "Offline"),
      colorClass: isOnline 
        ? "text-green-600 bg-green-100 dark:bg-green-900/30" 
        : "text-red-600 bg-red-100 dark:bg-red-900/30",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          className={`flex flex-col items-center p-3 rounded-xl ${stat.colorClass}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <stat.icon className="h-5 w-5 mb-1" />
          <span className="text-sm font-bold">{stat.value}</span>
          <span className="text-[10px] opacity-70">{stat.label}</span>
        </motion.div>
      ))}
    </div>
  );
};
