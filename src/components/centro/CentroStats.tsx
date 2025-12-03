import { Card, CardContent } from "@/components/ui/card";
import { Users, Package, Briefcase, DollarSign } from "lucide-react";

interface CentroStatsProps {
  totalCollaborators: number;
  totalInventoryItems: number;
  activeJobs: number;
  totalEarnings: number;
}

export const CentroStats = ({
  totalCollaborators,
  totalInventoryItems,
  activeJobs,
  totalEarnings,
}: CentroStatsProps) => {
  const stats = [
    {
      label: "Collaboratori",
      value: totalCollaborators,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Articoli Inventario",
      value: totalInventoryItems,
      icon: Package,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Lavori Attivi",
      value: activeJobs,
      icon: Briefcase,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Guadagni Totali",
      value: `€${totalEarnings.toFixed(2)}`,
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
