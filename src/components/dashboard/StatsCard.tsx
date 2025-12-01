import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "info";
}

export const StatsCard = ({ title, value, icon: Icon, variant = "default" }: StatsCardProps) => {
  const variantStyles = {
    default: "bg-card border-border",
    success: "bg-gradient-to-br from-success/10 to-success/5 border-success/20",
    warning: "bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20",
    info: "bg-gradient-to-br from-info/10 to-info/5 border-info/20",
  };

  const iconStyles = {
    default: "text-primary",
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
  };

  return (
    <Card className={cn("p-6 border-2 transition-all hover:shadow-md", variantStyles[variant])}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={cn("h-8 w-8", iconStyles[variant])} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className="text-3xl font-bold text-foreground">{value}</p>
      </div>
    </Card>
  );
};
