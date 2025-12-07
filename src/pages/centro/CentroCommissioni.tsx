import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Building2,
  Store,
  FileText,
  Wallet,
  CreditCard,
  Smartphone,
  User,
  ExternalLink,
  Sparkles,
  ArrowUpRight,
  Receipt,
  PiggyBank
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";

interface Centro {
  id: string;
  business_name: string;
  commission_rate: number;
}

interface RepairInfo {
  id: string;
  device_type?: string;
  device_brand?: string;
  device_model?: string;
  issue_description?: string;
  customer_name?: string;
  source: 'direct' | 'corner';
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
  payment_collection_method?: string | null;
  repair_info?: RepairInfo | null;
}

export default function CentroCommissioni() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [centro, setCentro] = useState<Centro | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("current");

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
        
        const commissionsWithDetails = await Promise.all(
          (commissionsData || []).map(async (commission) => {
            let payment_collection_method: string | null = null;
            let repair_info: RepairInfo | null = null;

            if (commission.repair_id) {
              const { data: repairData } = await supabase
                .from("repairs")
                .select(`
                  id,
                  device:devices(
                    device_type,
                    brand,
                    model,
                    reported_issue,
                    customer:customers(name)
                  )
                `)
                .eq("id", commission.repair_id)
                .single();
              
              if (repairData?.device) {
                const device = repairData.device as any;
                repair_info = {
                  id: repairData.id,
                  device_type: device.device_type,
                  device_brand: device.brand,
                  device_model: device.model,
                  issue_description: device.reported_issue,
                  customer_name: device.customer?.name,
                  source: 'direct'
                };
              }
            } else if (commission.repair_request_id) {
              const { data: requestData } = await supabase
                .from("repair_requests")
                .select(`
                  id,
                  device_type,
                  device_brand,
                  device_model,
                  issue_description,
                  customer:customers(name)
                `)
                .eq("id", commission.repair_request_id)
                .single();
              
              if (requestData) {
                repair_info = {
                  id: requestData.id,
                  device_type: requestData.device_type,
                  device_brand: requestData.device_brand || undefined,
                  device_model: requestData.device_model || undefined,
                  issue_description: requestData.issue_description,
                  customer_name: (requestData.customer as any)?.name,
                  source: 'corner'
                };
              }

              if (commission.corner_id) {
                const { data: quoteData } = await supabase
                  .from("quotes")
                  .select("payment_collection_method")
                  .eq("repair_request_id", commission.repair_request_id)
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .maybeSingle();
                
                payment_collection_method = quoteData?.payment_collection_method || 'direct';
              }
            }

            return {
              ...commission,
              payment_collection_method,
              repair_info
            };
          })
        );
        
        setCommissions(commissionsWithDetails);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkCornerPaid = async (commissionId: string) => {
    try {
      const { error } = await supabase
        .from("commission_ledger")
        .update({ 
          corner_paid: true, 
          corner_paid_at: new Date().toISOString() 
        })
        .eq("id", commissionId);

      if (error) throw error;
      toast.success("Commissione Corner segnata come pagata");
      fetchData();
    } catch (error: any) {
      console.error("Error marking corner paid:", error);
      toast.error("Errore nell'aggiornamento");
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, selectedMonth]);

  // Calcoli per il report mensile
  const totalRevenue = commissions.reduce((sum, c) => sum + c.gross_revenue, 0);
  const totalPartsCost = commissions.reduce((sum, c) => sum + c.parts_cost, 0);
  const totalMargin = commissions.reduce((sum, c) => sum + c.gross_margin, 0);
  
  const platformCommissionDue = commissions
    .filter(c => !c.platform_paid)
    .reduce((sum, c) => sum + c.platform_commission, 0);
  
  const platformCommissionPaid = commissions
    .filter(c => c.platform_paid)
    .reduce((sum, c) => sum + c.platform_commission, 0);
  
  const cornerCommissionsViaCorner = commissions
    .filter(c => c.corner_id && c.payment_collection_method === 'via_corner')
    .reduce((sum, c) => sum + (c.corner_commission || 0), 0);
  
  const cornerCommissionDue = commissions
    .filter(c => c.corner_id && c.payment_collection_method !== 'via_corner' && !c.corner_paid)
    .reduce((sum, c) => sum + (c.corner_commission || 0), 0);
  
  const cornerCommissionPaid = commissions
    .filter(c => c.corner_id && c.payment_collection_method !== 'via_corner' && c.corner_paid)
    .reduce((sum, c) => sum + (c.corner_commission || 0), 0);
  
  const totalDue = platformCommissionDue + cornerCommissionDue;
  const centroNetEarnings = commissions.reduce((sum, c) => sum + (c.centro_commission || 0), 0);

  const { start } = getMonthRange(selectedMonth);
  const monthLabel = format(start, "MMMM yyyy", { locale: it });

  if (isLoading) {
    return (
      <CentroLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">Caricamento report...</p>
          </div>
        </div>
      </CentroLayout>
    );
  }

  return (
    <CentroLayout>
      <PageTransition>
        <div className="space-y-4 sm:space-y-6 pb-8">
          {/* Hero Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 p-4 sm:p-6 text-white"
          >
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            <div className="relative">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Report Commissioni</h1>
                  </div>
                  <p className="text-white/80 text-sm sm:text-base">Riepilogo fatturazione B2B mensile</p>
                </div>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-white/20 border-white/30 text-white hover:bg-white/30">
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

              {/* Quick Stats in Hero */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 sm:mt-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-white/70" />
                    <span className="text-xs text-white/70">Fatturato</span>
                  </div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">€{totalRevenue.toFixed(0)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-white/70" />
                    <span className="text-xs text-white/70">Margine</span>
                  </div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">€{totalMargin.toFixed(0)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <PiggyBank className="h-4 w-4 text-white/70" />
                    <span className="text-xs text-white/70">Guadagno</span>
                  </div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">€{centroNetEarnings.toFixed(0)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt className="h-4 w-4 text-white/70" />
                    <span className="text-xs text-white/70">Riparazioni</span>
                  </div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">{commissions.length}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Alert commissioni da pagare */}
          {totalDue > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shrink-0 self-start sm:self-center">
                      <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-amber-700 dark:text-amber-400">
                        Commissioni da Pagare - {monthLabel}
                      </p>
                      <p className="text-sm text-amber-600/70 dark:text-amber-400/70">
                        Riceverai fattura a fine mese
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
                        €{totalDue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Commissioni Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="overflow-hidden border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Commissioni - {monthLabel}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  {/* Platform Commission Card */}
                  <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-primary/20">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">Piattaforma</p>
                          <p className="text-xs text-muted-foreground">20% del margine</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 rounded-lg bg-background/50">
                          <span className="text-sm text-muted-foreground">Da pagare</span>
                          <span className="text-lg font-bold text-amber-600">€{platformCommissionDue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg bg-background/50">
                          <span className="text-sm text-muted-foreground">Già pagato</span>
                          <span className="text-lg font-medium text-green-600">€{platformCommissionPaid.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Corner Commission Card */}
                  <div className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-500/10 p-4">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                          <Store className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-semibold">Corner</p>
                          <p className="text-xs text-muted-foreground">10% del margine</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {cornerCommissionsViaCorner > 0 && (
                          <div className="flex justify-between items-center p-2 rounded-lg bg-background/50">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Wallet className="h-3 w-3" />
                              Incassato Corner
                            </span>
                            <span className="text-lg font-medium text-emerald-600">€{cornerCommissionsViaCorner.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center p-2 rounded-lg bg-background/50">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            Da pagare
                          </span>
                          <span className="text-lg font-bold text-amber-600">€{cornerCommissionDue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg bg-background/50">
                          <span className="text-sm text-muted-foreground">Già pagato</span>
                          <span className="text-lg font-medium text-green-600">€{cornerCommissionPaid.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-muted/80 to-muted/50 border border-border">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-base sm:text-lg">Totale da Pagare</span>
                    <span className="text-2xl sm:text-3xl font-bold">€{totalDue.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Dettaglio Riparazioni */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="overflow-hidden border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  Dettaglio Riparazioni
                  <Badge variant="secondary" className="ml-2">{commissions.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {commissions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <DollarSign className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-medium text-muted-foreground mb-2">Nessuna riparazione</p>
                    <p className="text-sm text-muted-foreground">Nessuna riparazione completata in {monthLabel}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {commissions.map((commission, index) => (
                      <motion.div
                        key={commission.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-card to-card/80 hover:shadow-md transition-all duration-300"
                      >
                        <div className="p-3 sm:p-4">
                          {/* Header with badges */}
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            {commission.corner_id ? (
                              <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30 text-xs">
                                <Store className="h-3 w-3 mr-1" />
                                Via Corner
                              </Badge>
                            ) : (
                              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                                <Building2 className="h-3 w-3 mr-1" />
                                Diretto
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(commission.created_at), "dd MMM yyyy", { locale: it })}
                            </span>
                          </div>

                          {/* Device & Customer Info */}
                          {commission.repair_info && (
                            <div className="mb-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                                      <Smartphone className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="font-medium text-sm sm:text-base truncate">
                                      {commission.repair_info.device_type}
                                      {commission.repair_info.device_brand && ` ${commission.repair_info.device_brand}`}
                                      {commission.repair_info.device_model && ` ${commission.repair_info.device_model}`}
                                    </span>
                                  </div>
                                  {commission.repair_info.customer_name && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground pl-8">
                                      <User className="h-3 w-3" />
                                      <span className="truncate">{commission.repair_info.customer_name}</span>
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="shrink-0 gap-1.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                                  onClick={() => {
                                    if (commission.repair_info?.source === 'corner') {
                                      navigate(`/centro/lavori-corner`);
                                    } else {
                                      navigate(`/centro/lavori/${commission.repair_info?.id}`);
                                    }
                                  }}
                                >
                                  <span className="hidden sm:inline">Vedi Lavoro</span>
                                  <ArrowUpRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Financial Grid - Mobile Optimized */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3">
                            <div className="p-2 sm:p-3 rounded-lg bg-muted/30 text-center sm:text-left">
                              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Fatturato</p>
                              <p className="text-sm sm:text-base font-semibold">€{commission.gross_revenue.toFixed(2)}</p>
                            </div>
                            <div className="p-2 sm:p-3 rounded-lg bg-muted/30 text-center sm:text-left">
                              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Ricambi</p>
                              <p className="text-sm sm:text-base font-semibold">€{commission.parts_cost.toFixed(2)}</p>
                            </div>
                            <div className="p-2 sm:p-3 rounded-lg bg-muted/30 text-center sm:text-left">
                              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Margine</p>
                              <p className="text-sm sm:text-base font-semibold">€{commission.gross_margin.toFixed(2)}</p>
                            </div>
                            <div className="p-2 sm:p-3 rounded-lg bg-green-500/10 text-center sm:text-left">
                              <p className="text-[10px] sm:text-xs text-green-600 uppercase tracking-wide">Guadagno</p>
                              <p className="text-sm sm:text-base font-bold text-green-600">€{(commission.centro_commission || 0).toFixed(2)}</p>
                            </div>
                          </div>

                          {/* Payment Status - Mobile Stacked */}
                          <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border/50">
                            {/* Platform Status */}
                            <div className="flex items-center justify-between gap-2 flex-1 p-2 sm:p-3 rounded-lg bg-muted/20">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                <span className="text-xs sm:text-sm">Piattaforma</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-medium text-primary">€{commission.platform_commission.toFixed(2)}</span>
                                {commission.platform_paid ? (
                                  <Badge className="bg-green-500/20 text-green-600 text-[10px] sm:text-xs px-1.5 py-0.5">
                                    <CheckCircle2 className="h-3 w-3 mr-0.5" />
                                    Pagato
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-500/20 text-amber-600 text-[10px] sm:text-xs px-1.5 py-0.5">
                                    <Clock className="h-3 w-3 mr-0.5" />
                                    Pending
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Corner Status */}
                            {commission.corner_id && (
                              <div className="flex items-center justify-between gap-2 flex-1 p-2 sm:p-3 rounded-lg bg-muted/20">
                                <div className="flex items-center gap-2">
                                  <Store className="h-4 w-4 text-blue-500" />
                                  <span className="text-xs sm:text-sm">Corner</span>
                                </div>
                                <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
                                  <span className="text-xs sm:text-sm font-medium text-blue-500">€{(commission.corner_commission || 0).toFixed(2)}</span>
                                  {commission.payment_collection_method === 'via_corner' ? (
                                    <Badge className="bg-emerald-500/20 text-emerald-600 text-[10px] sm:text-xs px-1.5 py-0.5">
                                      <Wallet className="h-3 w-3 mr-0.5" />
                                      <span className="hidden sm:inline">Incassato</span>
                                    </Badge>
                                  ) : commission.corner_paid ? (
                                    <Badge className="bg-green-500/20 text-green-600 text-[10px] sm:text-xs px-1.5 py-0.5">
                                      <CheckCircle2 className="h-3 w-3 mr-0.5" />
                                      Pagato
                                    </Badge>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <Badge className="bg-amber-500/20 text-amber-600 text-[10px] sm:text-xs px-1.5 py-0.5">
                                        <Clock className="h-3 w-3 mr-0.5" />
                                        Pending
                                      </Badge>
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-6 px-2 text-[10px] sm:text-xs hover:bg-green-500/20 hover:text-green-600"
                                        onClick={() => handleMarkCornerPaid(commission.id)}
                                      >
                                        <CheckCircle2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </PageTransition>
    </CentroLayout>
  );
}
