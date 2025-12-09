import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Building2,
  Store,
  FileText,
  Wallet,
  CreditCard,
  Smartphone,
  Receipt,
  PiggyBank,
  Filter,
  CheckCheck
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

interface PlatformSettings {
  platform_commission_rate: number;
  default_corner_commission_rate: number;
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
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({ 
    platform_commission_rate: 10, 
    default_corner_commission_rate: 10 
  });

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
      // Fetch platform settings
      const { data: settingsData } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["platform_commission_rate", "default_corner_commission_rate"]);
      
      if (settingsData) {
        const settings: PlatformSettings = { 
          platform_commission_rate: 10, 
          default_corner_commission_rate: 10 
        };
        settingsData.forEach(s => {
          if (s.key === "platform_commission_rate") settings.platform_commission_rate = s.value;
          if (s.key === "default_corner_commission_rate") settings.default_corner_commission_rate = s.value;
        });
        setPlatformSettings(settings);
      }

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

  const handleMarkAllCornerPaid = async () => {
    const unpaidCornerCommissions = commissions.filter(
      c => c.corner_id && c.payment_collection_method !== 'via_corner' && !c.corner_paid
    );

    if (unpaidCornerCommissions.length === 0) {
      toast.info("Nessuna commissione Corner da pagare");
      return;
    }

    try {
      const { error } = await supabase
        .from("commission_ledger")
        .update({ 
          corner_paid: true, 
          corner_paid_at: new Date().toISOString() 
        })
        .in("id", unpaidCornerCommissions.map(c => c.id));

      if (error) throw error;
      toast.success(`${unpaidCornerCommissions.length} commissioni Corner segnate come pagate`);
      fetchData();
    } catch (error: any) {
      console.error("Error marking all corner paid:", error);
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

  const unpaidCornerCommissions = commissions.filter(
    c => c.corner_id && c.payment_collection_method !== 'via_corner' && !c.corner_paid
  );

  const filteredCommissions = showOnlyUnpaid ? unpaidCornerCommissions : commissions;

  const { start } = getMonthRange(selectedMonth);
  const monthLabel = format(start, "MMMM yyyy", { locale: it });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const statsCards = [
    {
      title: "Fatturato",
      value: `€${totalRevenue.toFixed(2)}`,
      icon: TrendingUp,
      iconBg: "bg-gradient-to-br from-primary to-primary/80",
    },
    {
      title: "Margine Lordo",
      value: `€${totalMargin.toFixed(2)}`,
      icon: DollarSign,
      iconBg: "bg-gradient-to-br from-blue-500 to-cyan-500",
    },
    {
      title: "Tuo Guadagno",
      value: `€${centroNetEarnings.toFixed(2)}`,
      icon: PiggyBank,
      iconBg: "bg-gradient-to-br from-emerald-500 to-green-500",
    },
    {
      title: "Riparazioni",
      value: commissions.length,
      icon: Receipt,
      iconBg: "bg-gradient-to-br from-violet-500 to-purple-500",
    },
  ];

  if (isLoading) {
    return (
      <CentroLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary mx-auto" />
            <p className="text-muted-foreground text-sm mt-3">Caricamento...</p>
          </motion.div>
        </div>
      </CentroLayout>
    );
  }

  return (
    <CentroLayout>
      <PageTransition>
        <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-foreground">Report Commissioni</h1>
              <p className="text-xs md:text-sm text-muted-foreground">Riepilogo fatturazione B2B - {monthLabel}</p>
            </div>
            <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
              {[
                { value: 'current', label: 'Corrente' },
                { value: 'previous', label: 'Scorso' },
                { value: '2months', label: '2 Mesi Fa' },
              ].map((period) => (
                <button
                  key={period.value}
                  onClick={() => setSelectedMonth(period.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    selectedMonth === period.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4"
          >
            {statsCards.map((card) => (
              <motion.div key={card.title} variants={itemVariants}>
                <Card className="p-3 md:p-4 border-border/50 hover:border-border transition-colors">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className={`h-8 w-8 md:h-10 md:w-10 rounded-lg ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <card.icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base md:text-xl font-bold text-foreground leading-none">{card.value}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{card.title}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Alert commissioni da pagare */}
          {totalDue > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-4 border-amber-200 bg-amber-50/50">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-amber-800 text-sm">Commissioni da Pagare</h3>
                    <p className="text-xs text-amber-600">Riceverai fattura a fine mese</p>
                  </div>
                  <p className="text-xl md:text-2xl font-bold text-amber-600">€{totalDue.toFixed(2)}</p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Commissioni Breakdown */}
          <Card className="border-border/50">
            <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-medium text-foreground">Dettaglio Commissioni</h2>
            </div>
            <div className="p-3 md:p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                {/* Platform Commission Card */}
                <Card className="p-3 md:p-4 border-border/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Piattaforma</p>
                      <p className="text-xs text-muted-foreground">{platformSettings.platform_commission_rate}% del margine</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                      <span className="text-xs text-muted-foreground">Da pagare</span>
                      <span className="text-sm font-bold text-amber-600">€{platformCommissionDue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                      <span className="text-xs text-muted-foreground">Già pagato</span>
                      <span className="text-sm font-medium text-green-600">€{platformCommissionPaid.toFixed(2)}</span>
                    </div>
                  </div>
                </Card>

                {/* Corner Commission Card */}
                <Card className="p-3 md:p-4 border-border/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <Store className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Corner</p>
                      <p className="text-xs text-muted-foreground">{platformSettings.default_corner_commission_rate}% del margine</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {cornerCommissionsViaCorner > 0 && (
                      <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Wallet className="h-3 w-3" />
                          Incassato Corner
                        </span>
                        <span className="text-sm font-medium text-emerald-600">€{cornerCommissionsViaCorner.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        Da pagare
                      </span>
                      <span className="text-sm font-bold text-amber-600">€{cornerCommissionDue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                      <span className="text-xs text-muted-foreground">Già pagato</span>
                      <span className="text-sm font-medium text-green-600">€{cornerCommissionPaid.toFixed(2)}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Card>

          {/* Dettaglio Riparazioni */}
          <Card className="border-border/50">
            <div className="px-4 py-3 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-medium text-foreground">Dettaglio Riparazioni</h2>
                <Badge variant="secondary" className="text-xs">{showOnlyUnpaid ? unpaidCornerCommissions.length : commissions.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowOnlyUnpaid(!showOnlyUnpaid)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    showOnlyUnpaid
                      ? 'bg-amber-500/10 text-amber-600 border border-amber-200'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Filter className="h-3 w-3" />
                  Da Pagare
                </button>
                {cornerCommissionDue > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMarkAllCornerPaid}
                    className="h-7 text-xs gap-1.5 bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Paga Tutti
                  </Button>
                )}
              </div>
            </div>
            <div className="p-3 md:p-4">
              {filteredCommissions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                    <DollarSign className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {showOnlyUnpaid ? "Nessuna commissione da pagare" : "Nessuna riparazione"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {showOnlyUnpaid ? "Tutte le commissioni Corner sono state pagate" : `Nessuna riparazione completata in ${monthLabel}`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCommissions.map((commission) => (
                    <Card
                      key={commission.id}
                      className="p-3 border-border/50 hover:border-border transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div 
                          className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
                          onClick={() => {
                            if (commission.repair_info?.source === 'corner') {
                              navigate(`/centro/lavori-corner`);
                            } else if (commission.repair_info?.id) {
                              navigate(`/centro/lavori/${commission.repair_info.id}`);
                            }
                          }}
                        >
                          <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">
                                {commission.repair_info?.device_brand} {commission.repair_info?.device_model}
                              </span>
                              {commission.corner_id ? (
                                <Badge variant="outline" className="text-[10px] h-5 bg-blue-500/10 text-blue-600 border-blue-200">
                                  Corner
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] h-5">
                                  Diretto
                                </Badge>
                              )}
                              {commission.corner_id && commission.payment_collection_method !== 'via_corner' && (
                                commission.corner_paid ? (
                                  <Badge variant="outline" className="text-[10px] h-5 bg-green-500/10 text-green-600 border-green-200">
                                    Corner Pagato
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 text-amber-600 border-amber-200">
                                    Corner: €{(commission.corner_commission || 0).toFixed(2)}
                                  </Badge>
                                )
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {commission.repair_info?.customer_name} • {format(new Date(commission.created_at), "dd MMM", { locale: it })}
                            </p>
                            
                            {/* Commission breakdown */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 p-2 rounded-lg bg-muted/30">
                              <div>
                                <p className="text-[10px] text-muted-foreground">Totale Cliente</p>
                                <p className="text-xs font-semibold">€{commission.gross_revenue.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground">Costo Ricambi</p>
                                <p className="text-xs font-medium text-red-500">-€{commission.parts_cost.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground">Margine</p>
                                <p className="text-xs font-medium">€{commission.gross_margin.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground">Comm. Piattaforma</p>
                                <p className="text-xs font-medium text-amber-600">
                                  -€{commission.platform_commission.toFixed(2)} 
                                  <span className="text-[9px] text-muted-foreground ml-0.5">({commission.platform_rate}%)</span>
                                </p>
                              </div>
                              {commission.corner_id && commission.corner_commission && commission.corner_commission > 0 && (
                                <div>
                                  <p className="text-[10px] text-muted-foreground">Comm. Corner</p>
                                  <p className="text-xs font-medium text-blue-600">
                                    -€{commission.corner_commission.toFixed(2)}
                                    <span className="text-[9px] text-muted-foreground ml-0.5">({commission.corner_rate}%)</span>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground">Tuo Guadagno</p>
                            <p className="text-lg font-bold text-green-600">€{(commission.centro_commission || 0).toFixed(2)}</p>
                          </div>
                          {commission.corner_id && commission.payment_collection_method !== 'via_corner' && !commission.corner_paid && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkCornerPaid(commission.id);
                              }}
                              className="px-2 py-1 text-[10px] font-medium rounded-md bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors"
                            >
                              Segna Pagato
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </PageTransition>
    </CentroLayout>
  );
}
