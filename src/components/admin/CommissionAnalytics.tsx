import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { Euro, TrendingUp, Users, Percent } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--warning))"];

export function CommissionAnalytics() {
  const { data: commissions = [] } = useQuery({
    queryKey: ["admin-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_ledger")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: repairRequests = [] } = useQuery({
    queryKey: ["admin-repair-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Calculate totals
  const totalRevenue = commissions.reduce((sum, c) => sum + (c.gross_revenue || 0), 0);
  const totalPlatformCommission = commissions.reduce((sum, c) => sum + (c.platform_commission || 0), 0);
  const totalCornerCommission = commissions.reduce((sum, c) => sum + (c.corner_commission || 0), 0);
  const totalRiparatoreCommission = commissions.reduce((sum, c) => sum + (c.riparatore_commission || 0), 0);
  const totalCentroCommission = commissions.reduce((sum, c) => sum + (c.centro_commission || 0), 0);

  // Pie chart data
  const pieData = [
    { name: "Piattaforma", value: totalPlatformCommission },
    { name: "Corner", value: totalCornerCommission },
    { name: "Riparatori", value: totalRiparatoreCommission },
    { name: "Centri", value: totalCentroCommission },
  ].filter(d => d.value > 0);

  // Status distribution
  const statusCounts = repairRequests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    status: status === "pending" ? "In Attesa" :
            status === "assigned" ? "Assegnato" :
            status === "in_progress" ? "In Corso" :
            status === "completed" ? "Completato" : status,
    count,
  }));

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Euro className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{totalRevenue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Fatturato Totale</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{totalPlatformCommission.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Commissioni Piattaforma</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Users className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{repairRequests.length}</p>
                <p className="text-xs text-muted-foreground">Riparazioni Totali</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Percent className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{commissions.length}</p>
                <p className="text-xs text-muted-foreground">Commissioni Registrate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Commission Distribution Pie */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Distribuzione Commissioni</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `€${value.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nessuna commissione registrata
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution Bar */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Stato Riparazioni</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="status" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nessuna riparazione registrata
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
