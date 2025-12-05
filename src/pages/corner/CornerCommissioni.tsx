import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CornerLayout } from "@/layouts/CornerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Euro, TrendingUp, Clock, CheckCircle, Send, Wallet } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

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
}

export default function CornerCommissioni() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("current");
  const [cornerId, setCornerId] = useState<string | null>(null);
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
        .select("id, credit_balance")
        .eq("user_id", user?.id)
        .single();

      if (corner) {
        setCornerId(corner.id);
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

    // Get commissions with related quote payment method
    const { data, error } = await supabase
      .from("commission_ledger")
      .select(`
        *,
        repair_requests!commission_ledger_repair_request_id_fkey (
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

    // Map with payment collection method
    const mappedCommissions = (data || []).map((c: any) => ({
      ...c,
      payment_collection_method: c.repair_requests?.quotes?.[0]?.payment_collection_method || 'direct',
      centro_name: c.centri_assistenza?.business_name || 'Centro'
    }));

    setCommissions(mappedCommissions);
  };

  const handleRequestPayment = async (commission: Commission) => {
    setRequestingPayment(commission.id);
    try {
      // Here you could send a notification to the Centro
      // For now, we'll just show a toast confirming the request
      toast.success(`Richiesta di pagamento inviata a ${commission.centro_name}`, {
        description: `Importo: €${commission.corner_commission?.toFixed(2)}`
      });
    } catch (error) {
      toast.error("Errore nell'invio della richiesta");
    } finally {
      setRequestingPayment(null);
    }
  };

  // Determine if commission is "received" based on payment method or corner_paid flag
  const isCommissionReceived = (commission: Commission) => {
    // If payment_collection_method is 'via_corner', Corner already collected the money
    if (commission.payment_collection_method === 'via_corner') {
      return true;
    }
    // Otherwise, check the corner_paid flag
    return commission.corner_paid;
  };

  const totalCommission = commissions.reduce((sum, c) => sum + (c.corner_commission || 0), 0);
  const paidCommission = commissions
    .filter((c) => isCommissionReceived(c))
    .reduce((sum, c) => sum + (c.corner_commission || 0), 0);
  const pendingCommission = totalCommission - paidCommission;
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Commissioni</h1>
            <p className="text-muted-foreground">Report commissioni per {monthLabel}</p>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleziona mese" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Mese corrente</SelectItem>
              <SelectItem value="previous">Mese scorso</SelectItem>
              <SelectItem value="2months">2 mesi fa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Segnalazioni</span>
              </div>
              <div className="text-2xl font-bold">{totalReferrals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Euro className="h-4 w-4" />
                <span className="text-sm">Commissione Totale</span>
              </div>
              <div className="text-2xl font-bold text-primary">€{totalCommission.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Ricevuto</span>
              </div>
              <div className="text-2xl font-bold text-green-600">€{paidCommission.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Da Richiedere</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">€{pendingCommission.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Commission Info */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-sm">
              <strong>Come funziona:</strong> Ricevi il <strong>10%</strong> del margine lordo per ogni
              riparazione completata. Se il cliente paga tramite te ("Incasso tramite Corner"), la commissione
              è già tua. Altrimenti, puoi richiedere il pagamento al Centro.
            </p>
          </CardContent>
        </Card>

        {/* Commission List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Dettaglio Commissioni
            </CardTitle>
          </CardHeader>
          <CardContent>
            {commissions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nessuna commissione per questo periodo
              </p>
            ) : (
              <div className="space-y-3">
                {commissions.map((commission) => {
                  const received = isCommissionReceived(commission);
                  const isViaCorner = commission.payment_collection_method === 'via_corner';

                  return (
                    <div
                      key={commission.id}
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg border gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            Riparazione #{commission.repair_request_id?.slice(0, 8)}
                          </span>
                          {isViaCorner ? (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">
                              <Wallet className="h-3 w-3 mr-1" />
                              Incassato
                            </Badge>
                          ) : received ? (
                            <Badge className="bg-green-500 hover:bg-green-600 text-white">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Pagato
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                              <Clock className="h-3 w-3 mr-1" />
                              Da Richiedere
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(commission.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                          {commission.centro_name && (
                            <span className="ml-2">• {commission.centro_name}</span>
                          )}
                        </div>
                        {isViaCorner && (
                          <div className="text-xs text-emerald-600">
                            💰 Hai trattenuto la tua commissione dall'incasso cliente
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            Fatturato: €{commission.gross_revenue.toFixed(2)} | Margine: €
                            {commission.gross_margin.toFixed(2)}
                          </div>
                          <div className={`text-lg font-bold ${received ? 'text-emerald-600' : 'text-primary'}`}>
                            +€{(commission.corner_commission || 0).toFixed(2)}
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              ({commission.corner_rate}%)
                            </span>
                          </div>
                        </div>

                        {/* Request Payment Button for unpaid direct commissions */}
                        {!received && !isViaCorner && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRequestPayment(commission)}
                            disabled={requestingPayment === commission.id}
                            className="shrink-0"
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Richiedi
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CornerLayout>
  );
}
