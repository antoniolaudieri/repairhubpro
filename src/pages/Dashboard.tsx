import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Smartphone, Wrench, Package, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatsCard } from "@/components/dashboard/StatsCard";

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pendingRepairs: 0,
    inProgressRepairs: 0,
    completedToday: 0,
    lowStockItems: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data: repairs } = await supabase
      .from("repairs")
      .select("status, created_at");

    const { data: spareParts } = await supabase
      .from("spare_parts")
      .select("stock_quantity, minimum_stock");

    const pending = repairs?.filter((r) => r.status === "pending").length || 0;
    const inProgress = repairs?.filter((r) => r.status === "in_progress").length || 0;
    
    const today = new Date().toISOString().split("T")[0];
    const completedToday = repairs?.filter(
      (r) => r.status === "completed" && r.created_at?.startsWith(today)
    ).length || 0;

    const lowStock = spareParts?.filter(
      (sp) => sp.stock_quantity <= sp.minimum_stock
    ).length || 0;

    setStats({
      pendingRepairs: pending,
      inProgressRepairs: inProgress,
      completedToday,
      lowStockItems: lowStock,
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Gestione riparazioni e magazzino</p>
          </div>
          <Button
            onClick={() => navigate("/new-repair")}
            size="lg"
            className="bg-gradient-primary hover:opacity-90 transition-opacity"
          >
            <Plus className="mr-2 h-5 w-5" />
            Nuovo Ritiro
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Riparazioni in Attesa"
            value={stats.pendingRepairs}
            icon={Smartphone}
            variant="default"
          />
          <StatsCard
            title="In Lavorazione"
            value={stats.inProgressRepairs}
            icon={Wrench}
            variant="info"
          />
          <StatsCard
            title="Completate Oggi"
            value={stats.completedToday}
            icon={Package}
            variant="success"
          />
          <StatsCard
            title="Scorte Basse"
            value={stats.lowStockItems}
            icon={ShoppingCart}
            variant="warning"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Accesso Rapido</h2>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/repairs")}
              >
                <Wrench className="mr-2 h-4 w-4" />
                Gestione Riparazioni
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/customers")}
              >
                <Smartphone className="mr-2 h-4 w-4" />
                Clienti
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/inventory")}
              >
                <Package className="mr-2 h-4 w-4" />
                Magazzino
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/orders")}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Ordini Ricambi
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Attività Recenti</h2>
            <div className="text-muted-foreground text-center py-8">
              Nessuna attività recente
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
