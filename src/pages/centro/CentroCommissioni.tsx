import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Centro {
  id: string;
  business_name: string;
  commission_rate: number;
}

interface Commission {
  id: string;
  gross_revenue: number;
  parts_cost: number;
  gross_margin: number;
  centro_commission: number | null;
  centro_rate: number | null;
  platform_commission: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "In Attesa", color: "bg-yellow-500/20 text-yellow-600" },
  approved: { label: "Approvato", color: "bg-blue-500/20 text-blue-600" },
  paid: { label: "Pagato", color: "bg-green-500/20 text-green-600" },
};

export default function CentroCommissioni() {
  const { user } = useAuth();
  const [centro, setCentro] = useState<Centro | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: centroData, error: centroError } = await supabase
        .from("centri_assistenza")
        .select("id, business_name, commission_rate")
        .eq("owner_user_id", user.id)
        .single();

      if (centroError) throw centroError;
      setCentro(centroData);

      if (centroData) {
        const { data: commissionsData, error: commissionsError } = await supabase
          .from("commission_ledger")
          .select("*")
          .eq("centro_id", centroData.id)
          .order("created_at", { ascending: false });

        if (commissionsError) throw commissionsError;
        setCommissions(commissionsData || []);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const totalEarnings = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + (c.centro_commission || 0), 0);

  const pendingEarnings = commissions
    .filter((c) => c.status === "pending" || c.status === "approved")
    .reduce((sum, c) => sum + (c.centro_commission || 0), 0);

  const totalRevenue = commissions.reduce((sum, c) => sum + c.gross_revenue, 0);

  if (isLoading) {
    return (
      <CentroLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </CentroLayout>
    );
  }

  return (
    <CentroLayout>
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Commissioni</h1>
            <p className="text-muted-foreground">
              Visualizza i tuoi guadagni e le commissioni
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">€{totalEarnings.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Guadagni Totali</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <Clock className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">€{pendingEarnings.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">In Attesa</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">€{totalRevenue.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Fatturato Totale</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <CheckCircle2 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{centro?.commission_rate || 70}%</p>
                    <p className="text-xs text-muted-foreground">Tua Commissione</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Commission Breakdown Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Come Funzionano le Commissioni</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="font-medium mb-1">Il Tuo Guadagno</p>
                  <p className="text-2xl font-bold text-green-600">{centro?.commission_rate || 70}%</p>
                  <p className="text-muted-foreground">del margine lordo</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="font-medium mb-1">Commissione Piattaforma</p>
                  <p className="text-2xl font-bold text-primary">20%</p>
                  <p className="text-muted-foreground">del margine lordo</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="font-medium mb-1">Corner (se presente)</p>
                  <p className="text-2xl font-bold text-blue-600">10%</p>
                  <p className="text-muted-foreground">del margine lordo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commissions List */}
          <Card>
            <CardHeader>
              <CardTitle>Storico Commissioni ({commissions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {commissions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna commissione registrata</p>
                  <p className="text-sm">Le commissioni appariranno qui quando completerai lavori</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {commissions.map((commission) => (
                    <div
                      key={commission.id}
                      className="p-4 rounded-lg border border-border bg-card/50"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={statusConfig[commission.status]?.color || "bg-muted"}>
                              {statusConfig[commission.status]?.label || commission.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(commission.created_at), "dd MMM yyyy", { locale: it })}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Fatturato</p>
                              <p className="font-medium">€{commission.gross_revenue.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Costo Ricambi</p>
                              <p className="font-medium">€{commission.parts_cost.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Margine</p>
                              <p className="font-medium">€{commission.gross_margin.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Tua Commissione</p>
                              <p className="font-medium text-green-600">
                                €{(commission.centro_commission || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                        {commission.paid_at && (
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">Pagato il</p>
                            <p className="font-medium">
                              {format(new Date(commission.paid_at), "dd/MM/yyyy", { locale: it })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </CentroLayout>
  );
}