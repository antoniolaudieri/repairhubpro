import { Card } from "@/components/ui/card";
import { Users, UserCheck, Star, Calendar, Trophy } from "lucide-react";
import { motion } from "framer-motion";

interface MarketingStatsProps {
  stats: {
    total: number;
    new: number;
    contacted: number;
    interested: number;
    demo: number;
    converted: number;
  };
}

export function MarketingStats({ stats }: MarketingStatsProps) {
  const conversionRate = stats.total > 0 
    ? ((stats.converted / stats.total) * 100).toFixed(1) 
    : "0";

  const statCards = [
    {
      title: "Totale Lead",
      value: stats.total,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Nuovi",
      value: stats.new,
      icon: Star,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Interessati",
      value: stats.interested,
      icon: UserCheck,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Demo Programmate",
      value: stats.demo,
      icon: Calendar,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Convertiti",
      value: stats.converted,
      icon: Trophy,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Tasso Conversione",
      value: `${conversionRate}%`,
      icon: Trophy,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
