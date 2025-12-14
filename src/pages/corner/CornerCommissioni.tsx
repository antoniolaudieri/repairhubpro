import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CornerLayout } from "@/layouts/CornerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Euro, TrendingUp, Clock, CheckCircle, Send, Wallet, Percent, Info, ArrowUpRight, Sparkles } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { sendPushNotification, getCentroUserId } from "@/services/pushNotificationService";

interface Commission {
  id: string;
  gross_revenue: number;
  gross_margin: number;
  corner_commission: number;
  corner_rate: number;
  corner_paid: boolean;
  corner_paid_at: string | null;
  created_at: string;
  repair_request_id: string | null;
  payment_collection_method: string | null;
  centro_id: string | null;
  centro_name?: string;
  corner_direct_to_centro?: boolean;
  customer_paid_at?: string | null;
}

export default function CornerCommissioni() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("current");
  const [cornerId, setCornerId] = useState<string | null>(null);
  const [cornerRate, setCornerRate] = useState<number>(10);
  const [requestingPayment, setRequestingPayment] = useState<string | null>(null);

  const getMonthRange = () => {
    const now = new Date();
    switch (selectedMonth) {
      case "previous":
        return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case "2months":
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(subMonths(now, 2)) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  useEffect(() => {
    if (user) {
      loadCornerAndCommissions();
    }
  }, [user, selectedMonth]);

  const loadCornerAndCommissions = async () => {
    try {
      const { data: corner } = await supabase
        .from("corners")
        .select("id, credit_balance, commission_rate")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (corner) {
        setCornerId(corner.id);
        setCornerRate(corner.commission_rate || 10);
        await loadCommissions(corner.id);
      }
    } catch (error) {
      console.error("Error loading corner:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCommissions = async (cornerId: string) => {
    const { start, end } = getMonthRange();

    const { data, error } = await supabase
      .from("commission_ledger")
      .select(`
        *,
        repair_requests!commission_ledger_repair_request_id_fkey (
          corner_direct_to_centro,
          customer_paid_at,
          quotes (payment_collection_method)
        ),
        centri_assistenza!commission_ledger_centro_id_fkey (
          business_name
        )
      `)
      .eq("corner_id", cornerId)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading commissions:", error);
      return;
    }

    const mappedCommissions = (data || []).map((c: any) => ({
      ...c,
      payment_collection_method: c.repair_requests?.quotes?.[0]?.payment_collection_method || 'direct',
      centro_name: c.centri_assistenza?.business_name || 'Centro',
      corner_direct_to_centro: c.repair_requests?.corner_direct_to_centro || false,
      customer_paid_at: c.repair_requests?.customer_paid_at || null
    }));

    setCommissions(mappedCommissions);
  };

  const handleRequestPayment = async (commission: Commission) => {
    if (!commission.centro_id) {
      toast.error("Centro non trovato per questa commissione");
      return;
    }

    setRequestingPayment(commission.id);
    try {
      // Get Corner name for notification
      const { data: corner } = await supabase
        .from("corners")
        .select("business_name")
        .eq("id", cornerId)
        .single();

      const cornerName = corner?.business_name || "Corner";

      // Get Centro user_id for push notification
      const centroUserId = await getCentroUserId(commission.centro_id);

      if (centroUserId) {
        await sendPushNotification([centroUserId], {
          title: "💰 Richiesta Pagamento Commissione",
          body: `${cornerName} richiede il pagamento di €${commission.corner_commission?.toFixed(2)} per la commissione maturata.`,
          data: {
            url: "/centro/commissioni",
            type: "commission_payment_request",
            commissionId: commission.id,
            cornerId: cornerId,
          },
        });
      }

      toast.success(`Richiesta di pagamento inviata a ${commission.centro_name}`, {
        description: `Importo: €${commission.corner_commission?.toFixed(2)}`
      });
    } catch (error) {
      console.error("Error requesting payment:", error);
      toast.error("Errore nell'invio della richiesta");
    } finally {
      setRequestingPayment(null);
    }
  };

  const isCommissionReceived = (commission: Commission) => {
    if (commission.payment_collection_method === 'via_corner') {
      return true;
    }
    return commission.corner_paid;
  };

  // For direct-to-centro: check if customer has paid before commission is claimable
  const getCommissionStatus = (commission: Commission): 'received' | 'claimable' | 'awaiting_payment' => {
    if (commission.payment_collection_method === 'via_corner') {
      return 'received';
    }
    if (commission.corner_paid) {
      return 'received';
    }
    // Direct-to-centro: must wait for customer payment before claiming
    if (commission.corner_direct_to_centro && !commission.customer_paid_at) {
      return 'awaiting_payment';
    }
    return 'claimable';
  };

  const awaitingPaymentCommission = commissions
    .filter((c) => getCommissionStatus(c) === 'awaiting_payment')
    .reduce((sum, c) => sum + (c.corner_commission || 0), 0);

  const totalCommission = commissions.reduce((sum, c) => sum + (c.corner_commission || 0), 0);
  const paidCommission = commissions
    .filter((c) => isCommissionReceived(c))
    .reduce((sum, c) => sum + (c.corner_commission || 0), 0);
  const claimableCommission = commissions
    .filter((c) => getCommissionStatus(c) === 'claimable')
    .reduce((sum, c) => sum + (c.corner_commission || 0), 0);
  const pendingCommission = claimableCommission + awaitingPaymentCommission;
  const totalReferrals = commissions.length;

  const { start } = getMonthRange();
  const monthLabel = format(start, "MMMM yyyy", { locale: it });

  if (loading) {
    return (
      <CornerLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </CornerLayout>
    );
  }

  return (
    <CornerLayout>
      <PageTransition>
        <div className="space-y-6 p-4 md:p-6">
          {/* Hero Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 p-6 md:p-8 text-white"
          >
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
            
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-6 w-6" />
                    <h1 className="text-2xl md:text-3xl font-bold">Le Tue Commissioni</h1>
                  </div>
                  <p className="text-white/80">
                    Report commissioni per {monthLabel}
                  </p>
                </div>

                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px] bg-white/20 border-white/30 text-white hover:bg-white/30">
                    <SelectValue placeholder="Seleziona mese" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Mese corrente</SelectItem>
                    <SelectItem value="previous">Mese scorso</SelectItem>
                    <SelectItem value="2months">2 mesi fa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Commission Rate Badge */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-6 inline-flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/30"
              >
                <div className="h-12 w-12 rounded-full bg-white/30 flex items-center justify-center">
                  <Percent className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-white/80">La tua percentuale commissione</p>
                  <p className="text-2xl font-bold">{cornerRate}% del margine lordo</p>
                </div>
                <Sparkles className="h-5 w-5 text-yellow-300 ml-2" />
              </motion.div>

              {/* Quick Stats in Header */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <p className="text-3xl md:text-4xl font-bold">{totalReferrals}</p>
                  <p className="text-sm text-white/70">Segnalazioni</p>
                </div>
                <div className="text-center border-x border-white/20">
                  <p className="text-3xl md:text-4xl font-bold">€{totalCommission.toFixed(2)}</p>
                  <p className="text-sm text-white/70">Totale Mese</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl md:text-4xl font-bold text-yellow-300">€{pendingCommission.toFixed(2)}</p>
                  <p className="text-sm text-white/70">Da Richiedere</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">Segnalazioni</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{totalReferrals}</div>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">questo mese</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Euro className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">Totale</span>
                  </div>
                  <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">€{totalCommission.toFixed(2)}</div>
                  <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">commissioni maturate</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">Ricevuto</span>
                  </div>
                  <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">€{paidCommission.toFixed(2)}</div>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">già incassato</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Clock className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">In Attesa</span>
                  </div>
                  <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">€{pendingCommission.toFixed(2)}</div>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">da richiedere</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Commission Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1">Come funziona il tuo guadagno</h3>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                      Ricevi il <strong className="text-emerald-900 dark:text-emerald-200">{cornerRate}%</strong> del margine lordo per ogni riparazione completata. 
                      Se il cliente paga tramite te ("Incasso tramite Corner"), la commissione è già tua. 
                      Altrimenti, puoi richiedere il pagamento al Centro partner.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Commission List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Dettaglio Commissioni
                  {commissions.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{commissions.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {commissions.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <Euro className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Nessuna commissione per questo periodo</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Le commissioni appariranno qui quando completerai delle segnalazioni
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {commissions.map((commission, index) => {
                      const status = getCommissionStatus(commission);
                      const isViaCorner = commission.payment_collection_method === 'via_corner';
                      const isDirectToCentro = commission.corner_direct_to_centro;

                      return (
                        <motion.div
                          key={commission.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className={`p-4 hover:bg-muted/50 transition-colors ${
                            status === 'received' ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''
                          } ${status === 'awaiting_payment' ? 'bg-orange-50/30 dark:bg-orange-950/20' : ''}`}
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">
                                  Riparazione #{commission.repair_request_id?.slice(0, 8)}
                                </span>
                                {isDirectToCentro && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
                                    Diretto al Centro
                                  </Badge>
                                )}
                                {isViaCorner ? (
                                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">
                                    <Wallet className="h-3 w-3 mr-1" />
                                    Incassato
                                  </Badge>
                                ) : status === 'received' ? (
                                  <Badge className="bg-green-500 hover:bg-green-600 text-white">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Pagato
                                  </Badge>
                                ) : status === 'awaiting_payment' ? (
                                  <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-500/30">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Attesa Pagamento Cliente
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Da Richiedere
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                                <span>{format(new Date(commission.created_at), "dd MMM yyyy HH:mm", { locale: it })}</span>
                                {commission.centro_name && (
                                  <>
                                    <span>•</span>
                                    <span className="font-medium">{commission.centro_name}</span>
                                  </>
                                )}
                              </div>
                              {isViaCorner && (
                                <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Hai trattenuto la tua commissione dall'incasso cliente
                                </div>
                              )}
                              {status === 'awaiting_payment' && (
                                <div className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                  <Info className="h-3 w-3" />
                                  Il Centro deve confermare il pagamento del cliente prima di poter richiedere
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground mb-1">
                                  Fatturato €{commission.gross_revenue.toFixed(2)} → Margine €{commission.gross_margin.toFixed(2)}
                                </div>
                                <div className={`text-xl font-bold flex items-center justify-end gap-1 ${
                                  status === 'received' ? 'text-emerald-600 dark:text-emerald-400' : 
                                  status === 'awaiting_payment' ? 'text-orange-600 dark:text-orange-400' : 'text-primary'
                                }`}>
                                  <ArrowUpRight className="h-4 w-4" />
                                  €{(commission.corner_commission || 0).toFixed(2)}
                                  <span className="text-sm font-normal text-muted-foreground">
                                    ({commission.corner_rate}%)
                                  </span>
                                </div>
                              </div>

                              {status === 'claimable' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleRequestPayment(commission)}
                                  disabled={requestingPayment === commission.id}
                                  className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white"
                                >
                                  <Send className="h-4 w-4 mr-1" />
                                  Richiedi
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </PageTransition>
    </CornerLayout>
  );
}
