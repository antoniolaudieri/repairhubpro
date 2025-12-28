import { useState, useEffect } from "react";
import { Wallet, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
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

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
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

  return (
    <CentroLayout>
      <PageTransition>
        <div className="p-4 md:p-6 space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 shadow-sm">
                <Wallet className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Centro Finanza</h1>
                <p className="text-sm text-muted-foreground">Gestione entrate, uscite e bilancio</p>
              </div>
            </div>
            <Button 
              onClick={() => setIsAddDialogOpen(true)} 
              className="gap-2 shadow-md hover:shadow-lg transition-shadow"
            >
              <Plus className="h-4 w-4" />
              Nuovo Movimento
            </Button>
          </motion.div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-card border shadow-sm p-1 h-auto">
              <TabsTrigger 
                value="movimenti" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
              >
                Movimenti
              </TabsTrigger>
              <TabsTrigger 
                value="bilancio"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
              >
                Bilancio
              </TabsTrigger>
              <TabsTrigger 
                value="report"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
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
        </div>
      </PageTransition>
    </CentroLayout>
  );
}
