import { Card, CardContent } from "@/components/ui/card";
import { FileText, DollarSign, Clock, CheckCircle } from "lucide-react";

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
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "In Attesa",
      value: pendingRequests,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Completate",
      value: completedRequests,
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Commissioni Totali",
      value: `€${totalCommissions.toFixed(2)}`,
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
