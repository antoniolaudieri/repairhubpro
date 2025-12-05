import { Card, CardContent } from "@/components/ui/card";
import { FileText, DollarSign, Clock, CheckCircle, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface CornerStatsProps {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  totalCommissions: number;
}

export const CornerStats = ({
  totalRequests,
  pendingRequests,
  completedRequests,
  totalCommissions,
}: CornerStatsProps) => {
  const stats = [
    {
      label: "Segnalazioni Totali",
      value: totalRequests,
      icon: FileText,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-500/20 to-cyan-500/10",
    },
    {
      label: "In Attesa",
      value: pendingRequests,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-500/20 to-orange-500/10",
    },
    {
      label: "Completate",
      value: completedRequests,
      icon: CheckCircle,
      gradient: "from-emerald-500 to-green-500",
      bgGradient: "from-emerald-500/20 to-green-500/10",
    },
    {
      label: "Commissioni Totali",
      value: `€${totalCommissions.toFixed(2)}`,
      icon: TrendingUp,
      gradient: "from-violet-500 to-purple-500",
      bgGradient: "from-violet-500/20 to-purple-500/10",
      highlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className={`relative overflow-hidden border-0 bg-gradient-to-br ${stat.bgGradient} backdrop-blur-sm hover:shadow-lg transition-all duration-300`}>
            <div className={`absolute inset-0 bg-gradient-to-r ${stat.gradient} opacity-5`} />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};