import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Building2,
  Store,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { it } from "date-fns/locale";

interface Centro {
  id: string;
  business_name: string;
  commission_rate: number;
}

interface Commission {
  id: string;
  repair_id: string | null;
  repair_request_id: string | null;
  gross_revenue: number;
  parts_cost: number;
  gross_margin: number;
  centro_commission: number | null;
  centro_rate: number | null;
  platform_commission: number;
  platform_rate: number;
  corner_commission: number | null;
  corner_rate: number | null;
  corner_id: string | null;
  status: string;
  paid_at: string | null;
  platform_paid: boolean;
  platform_paid_at: string | null;
  corner_paid: boolean;
  corner_paid_at: string | null;
  created_at: string;
}

export default function CentroCommissioni() {
  const { user } = useAuth();
  const [centro, setCentro] = useState<Centro | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("current");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const getMonthRange = (monthKey: string) => {
    const now = new Date();
    let targetDate = now;
    
    if (monthKey === "current") {
      targetDate = now;
    } else if (monthKey === "previous") {
      targetDate = subMonths(now, 1);
    } else if (monthKey === "2months") {
      targetDate = subMonths(now, 2);
    }
    
    return {
      start: startOfMonth(targetDate),
      end: endOfMonth(targetDate),
    };
  };

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
        const { start, end } = getMonthRange(selectedMonth);
        
        const { data: commissionsData, error: commissionsError } = await supabase
          .from("commission_ledger")
          .select("*")
          .eq("centro_id", centroData.id)
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString())
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
  }, [user, selectedMonth]);

  const handleTogglePlatformPaid = async (commission: Commission) => {
    setUpdatingId(commission.id);
    try {
      const newValue = !commission.platform_paid;
      const { error } = await supabase
        .from("commission_ledger")
        .update({
          platform_paid: newValue,
          platform_paid_at: newValue ? new Date().toISOString() : null,
        })
        .eq("id", commission.id);

      if (error) throw error;
      
      setCommissions(prev => prev.map(c => 
        c.id === commission.id 
          ? { ...c, platform_paid: newValue, platform_paid_at: newValue ? new Date().toISOString() : null }
          : c
      ));
      
      toast.success(newValue ? "Commissione piattaforma segnata come pagata" : "Commissione piattaforma segnata come non pagata");
    } catch (error) {
      console.error("Error updating platform paid:", error);
      toast.error("Errore nell'aggiornamento");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleCornerPaid = async (commission: Commission) => {
    setUpdatingId(commission.id);
    try {
      const newValue = !commission.corner_paid;
      const { error } = await supabase
        .from("commission_ledger")
        .update({
          corner_paid: newValue,
          corner_paid_at: newValue ? new Date().toISOString() : null,
        })
        .eq("id", commission.id);

      if (error) throw error;
      
      setCommissions(prev => prev.map(c => 
        c.id === commission.id 
          ? { ...c, corner_paid: newValue, corner_paid_at: newValue ? new Date().toISOString() : null }
          : c
      ));
      
      toast.success(newValue ? "Commissione corner segnata come pagata" : "Commissione corner segnata come non pagata");
    } catch (error) {
      console.error("Error updating corner paid:", error);
      toast.error("Errore nell'aggiornamento");
    } finally {
      setUpdatingId(null);
    }
  };

  // Calcoli per il report mensile
  const totalRevenue = commissions.reduce((sum, c) => sum + c.gross_revenue, 0);
  const totalPartsCost = commissions.reduce((sum, c) => sum + c.parts_cost, 0);
  const totalMargin = commissions.reduce((sum, c) => sum + c.gross_margin, 0);
  
  // Commissione dovuta alla piattaforma (non pagata)
  const platformCommissionDue = commissions
    .filter(c => !c.platform_paid)
    .reduce((sum, c) => sum + c.platform_commission, 0);
  
  // Commissione già pagata alla piattaforma
  const platformCommissionPaid = commissions
    .filter(c => c.platform_paid)
    .reduce((sum, c) => sum + c.platform_commission, 0);
  
  // Commissione dovuta ai Corner (non pagata)
  const cornerCommissionDue = commissions
    .filter(c => c.corner_id && !c.corner_paid)
    .reduce((sum, c) => sum + (c.corner_commission || 0), 0);
  
  // Commissione già pagata ai Corner
  const cornerCommissionPaid = commissions
    .filter(c => c.corner_id && c.corner_paid)
    .reduce((sum, c) => sum + (c.corner_commission || 0), 0);
  
  // Totale da pagare
  const totalDue = platformCommissionDue + cornerCommissionDue;
  
  // Guadagno netto del Centro
  const centroNetEarnings = commissions.reduce((sum, c) => sum + (c.centro_commission || 0), 0);

  const { start, end } = getMonthRange(selectedMonth);
  const monthLabel = format(start, "MMMM yyyy", { locale: it });

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Report Commissioni B2B</h1>
              <p className="text-muted-foreground">
                Riepilogo fatturazione mensile
              </p>
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Seleziona mese" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Mese Corrente</SelectItem>
                <SelectItem value="previous">Mese Scorso</SelectItem>
                <SelectItem value="2months">2 Mesi Fa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Alert commissioni da pagare */}
          {totalDue > 0 && (
            <Card className="border-warning/50 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-warning" />
                  <div className="flex-1">
                    <p className="font-semibold text-warning">Commissioni da Pagare - {monthLabel}</p>
                    <p className="text-sm text-muted-foreground">
                      Riceverai fattura per €{totalDue.toFixed(2)} a fine mese
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-warning">€{totalDue.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats mensili */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <DollarSign className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">€{totalMargin.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Margine Lordo</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">€{centroNetEarnings.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Tuo Guadagno</p>
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
                    <p className="text-2xl font-bold">{commissions.length}</p>
                    <p className="text-xs text-muted-foreground">Riparazioni</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Riepilogo commissioni dovute */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Commissioni - {monthLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-border bg-card/50">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <p className="font-medium">Commissione Piattaforma</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">20% del margine lordo</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Da pagare:</span>
                      <span className="text-xl font-bold text-warning">€{platformCommissionDue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Già pagato:</span>
                      <span className="text-lg font-medium text-green-600">€{platformCommissionPaid.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg border border-border bg-card/50">
                  <div className="flex items-center gap-3 mb-2">
                    <Store className="h-5 w-5 text-blue-500" />
                    <p className="font-medium">Commissione Corner</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">10% del margine (se segnalazione)</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Da pagare:</span>
                      <span className="text-xl font-bold text-warning">€{cornerCommissionDue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Già pagato:</span>
                      <span className="text-lg font-medium text-green-600">€{cornerCommissionPaid.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Totale da Pagare</span>
                  <span className="text-2xl font-bold">€{totalDue.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dettaglio riparazioni */}
          <Card>
            <CardHeader>
              <CardTitle>Dettaglio Riparazioni ({commissions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {commissions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna riparazione completata in {monthLabel}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {commissions.map((commission) => (
                    <div
                      key={commission.id}
                      className="p-4 rounded-lg border border-border bg-card/50"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {commission.corner_id && (
                                <Badge variant="outline" className="text-blue-500 border-blue-500/30">
                                  <Store className="h-3 w-3 mr-1" />
                                  Via Corner
                                </Badge>
                              )}
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
                                <p className="text-muted-foreground">Ricambi</p>
                                <p className="font-medium">€{commission.parts_cost.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Margine</p>
                                <p className="font-medium">€{commission.gross_margin.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Tuo Guadagno</p>
                                <p className="font-medium text-green-600">€{(commission.centro_commission || 0).toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Payment tracking */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-3 border-t border-border/50">
                          {/* Platform commission */}
                          <div className="flex items-center justify-between sm:justify-start gap-3 flex-1 p-3 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`platform-${commission.id}`}
                                checked={commission.platform_paid}
                                onCheckedChange={() => handleTogglePlatformPaid(commission)}
                                disabled={updatingId === commission.id}
                              />
                              <label 
                                htmlFor={`platform-${commission.id}`}
                                className="text-sm cursor-pointer flex items-center gap-2"
                              >
                                <Building2 className="h-4 w-4 text-primary" />
                                Piattaforma
                              </label>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-primary">€{commission.platform_commission.toFixed(2)}</p>
                              {commission.platform_paid ? (
                                <Badge className="bg-green-500/20 text-green-600 text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Pagato
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-500/20 text-yellow-600 text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Da pagare
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Corner commission (if applicable) */}
                          {commission.corner_id && (
                            <div className="flex items-center justify-between sm:justify-start gap-3 flex-1 p-3 rounded-lg bg-muted/30">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`corner-${commission.id}`}
                                  checked={commission.corner_paid}
                                  onCheckedChange={() => handleToggleCornerPaid(commission)}
                                  disabled={updatingId === commission.id}
                                />
                                <label 
                                  htmlFor={`corner-${commission.id}`}
                                  className="text-sm cursor-pointer flex items-center gap-2"
                                >
                                  <Store className="h-4 w-4 text-blue-500" />
                                  Corner
                                </label>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-blue-500">€{(commission.corner_commission || 0).toFixed(2)}</p>
                                {commission.corner_paid ? (
                                  <Badge className="bg-green-500/20 text-green-600 text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Pagato
                                  </Badge>
                                ) : (
                                  <Badge className="bg-yellow-500/20 text-yellow-600 text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Da pagare
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
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
