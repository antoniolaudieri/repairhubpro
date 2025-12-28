import { useState, useEffect, useMemo } from "react";
import { Wallet, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FinancialMovementsList } from "@/components/centro/finance/FinancialMovementsList";
import { FinancialBalance } from "@/components/centro/finance/FinancialBalance";
import { FinancialReport } from "@/components/centro/finance/FinancialReport";
import { AddMovementDialog } from "@/components/centro/finance/AddMovementDialog";

export default function CentroFinanza() {
  const { user } = useAuth();
  const [centroId, setCentroId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("movimenti");
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });

  useEffect(() => {
    const fetchCentroId = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("centri_assistenza")
        .select("id")
        .eq("owner_user_id", user.id)
        .single();
      if (data) setCentroId(data.id);
    };
    fetchCentroId();
  }, [user]);

  // Load quick stats for current month
  useEffect(() => {
    if (!centroId) return;
    
    const loadStats = async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data } = await supabase
        .from("centro_financial_movements")
        .select("type, amount")
        .eq("centro_id", centroId)
        .gte("movement_date", startOfMonth.toISOString().split("T")[0]);
      
      if (data) {
        const income = data.filter(m => m.type === "income").reduce((sum, m) => sum + Number(m.amount), 0);
        const expense = data.filter(m => m.type === "expense").reduce((sum, m) => sum + Number(m.amount), 0);
        setStats({ income, expense, balance: income - expense });
      }
    };
    
    loadStats();
  }, [centroId, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (!centroId) {
    return (
      <CentroLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </CentroLayout>
    );
  }

  const statCards = [
    {
      title: "Entrate",
      value: stats.income,
      icon: TrendingUp,
      bgLight: "bg-gradient-to-br from-emerald-500/15 to-green-500/10",
      iconBg: "bg-gradient-to-br from-emerald-500 to-green-500",
      textColor: "text-emerald-600",
    },
    {
      title: "Uscite",
      value: stats.expense,
      icon: TrendingDown,
      bgLight: "bg-gradient-to-br from-red-500/15 to-rose-500/10",
      iconBg: "bg-gradient-to-br from-red-500 to-rose-500",
      textColor: "text-red-600",
    },
    {
      title: "Bilancio",
      value: stats.balance,
      icon: Wallet,
      bgLight: stats.balance >= 0 ? "bg-gradient-to-br from-blue-500/15 to-cyan-500/10" : "bg-gradient-to-br from-orange-500/15 to-red-500/10",
      iconBg: stats.balance >= 0 ? "bg-gradient-to-br from-blue-500 to-cyan-500" : "bg-gradient-to-br from-orange-500 to-red-500",
      textColor: stats.balance >= 0 ? "text-blue-600" : "text-orange-600",
    },
  ];

  return (
    <CentroLayout>
      <PageTransition>
        <motion.div 
          className="p-4 md:p-6 space-y-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-sm">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">Finanza</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">Gestione entrate e uscite</p>
              </div>
            </div>
            <Button 
              onClick={() => setIsAddDialogOpen(true)} 
              className="gap-2 shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-primary to-primary/80"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuovo Movimento</span>
              <span className="sm:hidden">Nuovo</span>
            </Button>
          </motion.div>

          {/* Quick Stats Cards - Compact for all screens */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2">
            {statCards.map((card, index) => {
              const IconComponent = card.icon;
              return (
                <Card
                  key={index}
                  className={`relative overflow-hidden border-0 shadow-sm ${card.bgLight}`}
                >
                  <div className="p-2.5 sm:p-3">
                    <div className={`p-1.5 sm:p-2 rounded-lg ${card.iconBg} shadow-sm w-fit mb-1.5`}>
                      <IconComponent className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                    </div>
                    <p className={`text-sm sm:text-lg font-bold ${card.textColor} truncate`}>
                      €{Math.abs(card.value).toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[9px] sm:text-xs text-muted-foreground truncate">{card.title}</p>
                  </div>
                </Card>
              );
            })}
          </motion.div>

          {/* Tabs */}
          <motion.div variants={itemVariants}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="bg-card border shadow-sm p-1 h-auto w-full grid grid-cols-3">
                <TabsTrigger 
                  value="movimenti" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 text-xs md:text-sm"
                >
                  Movimenti
                </TabsTrigger>
                <TabsTrigger 
                  value="bilancio"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 text-xs md:text-sm"
                >
                  Bilancio
                </TabsTrigger>
                <TabsTrigger 
                  value="report"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 text-xs md:text-sm"
                >
                  Report
                </TabsTrigger>
              </TabsList>

              <TabsContent value="movimenti" className="mt-0">
                <FinancialMovementsList key={`movements-${refreshKey}`} centroId={centroId} onRefresh={handleRefresh} />
              </TabsContent>

              <TabsContent value="bilancio" className="mt-0">
                <FinancialBalance key={`balance-${refreshKey}`} centroId={centroId} />
              </TabsContent>

              <TabsContent value="report" className="mt-0">
                <FinancialReport key={`report-${refreshKey}`} centroId={centroId} />
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Add Movement Dialog */}
          <AddMovementDialog
            centroId={centroId}
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onSuccess={() => {
              setActiveTab("movimenti");
              handleRefresh();
            }}
          />
        </motion.div>
      </PageTransition>
    </CentroLayout>
  );
}