import { useState, useEffect } from "react";
import { Wallet, TrendingUp, TrendingDown, FileText, Plus, Calendar, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { CentroLayout } from "@/layouts/CentroLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <Wallet className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Centro Finanza</h1>
              <p className="text-sm text-muted-foreground">Gestione entrate, uscite e bilancio</p>
            </div>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuovo Movimento
          </Button>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="movimenti" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Movimenti</span>
            </TabsTrigger>
            <TabsTrigger value="bilancio" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Bilancio</span>
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Report</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="movimenti">
            <FinancialMovementsList centroId={centroId} onRefresh={() => {}} />
          </TabsContent>

          <TabsContent value="bilancio">
            <FinancialBalance centroId={centroId} />
          </TabsContent>

          <TabsContent value="report">
            <FinancialReport centroId={centroId} />
          </TabsContent>
        </Tabs>

        {/* Add Movement Dialog */}
        <AddMovementDialog
          centroId={centroId}
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSuccess={() => setActiveTab("movimenti")}
        />
      </div>
    </CentroLayout>
  );
}
