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
    default: "bg-gradient-to-br from-card to-muted/30 border-primary/20 hover:border-primary/40",
    success: "bg-gradient-to-br from-success/10 via-success/5 to-card border-success/30 hover:border-success/50",
    warning: "bg-gradient-to-br from-warning/10 via-warning/5 to-card border-warning/30 hover:border-warning/50",
    info: "bg-gradient-to-br from-info/10 via-info/5 to-card border-info/30 hover:border-info/50",
  };

  const iconBgStyles = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
  };

  return (
    <Card className={cn(
      "p-5 lg:p-6 border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] group overflow-hidden relative",
      variantStyles[variant]
    )}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-full h-full" />
      </div>
      
      <div className="relative flex items-start justify-between mb-3">
        <div className={cn(
          "p-3 rounded-xl transition-all duration-300 group-hover:scale-110",
          iconBgStyles[variant]
        )}>
          <Icon className="h-6 w-6 lg:h-7 lg:w-7" />
        </div>
      </div>
      
      <div className="relative">
        <p className="text-xs lg:text-sm text-muted-foreground mb-1.5 font-medium">{title}</p>
        <p className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">{value}</p>
      </div>
    </Card>
  );
};
