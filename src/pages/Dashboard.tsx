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
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Gestione riparazioni e magazzino</p>
          </div>
          <Button
            onClick={() => navigate("/new-repair")}
            size="lg"
            className="w-full sm:w-auto shadow-md hover:shadow-lg transition-shadow"
          >
            <Plus className="mr-2 h-5 w-5" />
            Nuovo Ritiro
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
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

        {/* Quick Access & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <Card className="p-5 lg:p-6 shadow-card hover:shadow-card-hover transition-shadow bg-gradient-card border-border/50">
            <h2 className="text-lg lg:text-xl font-semibold mb-4 text-foreground">Accesso Rapido</h2>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start h-12 font-medium hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all"
                onClick={() => navigate("/repairs")}
              >
                <Wrench className="mr-3 h-5 w-5" />
                Gestione Riparazioni
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-12 font-medium hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all"
                onClick={() => navigate("/customers")}
              >
                <Smartphone className="mr-3 h-5 w-5" />
                Clienti
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-12 font-medium hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all"
                onClick={() => navigate("/inventory")}
              >
                <Package className="mr-3 h-5 w-5" />
                Magazzino
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-12 font-medium hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all"
                onClick={() => navigate("/orders")}
              >
                <ShoppingCart className="mr-3 h-5 w-5" />
                Ordini Ricambi
              </Button>
            </div>
          </Card>

          <Card className="p-5 lg:p-6 shadow-card hover:shadow-card-hover transition-shadow bg-gradient-card border-border/50">
            <h2 className="text-lg lg:text-xl font-semibold mb-4 text-foreground">Attività Recenti</h2>
            <div className="text-muted-foreground text-center py-12 text-sm">
              Nessuna attività recente
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
