import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CornerLayout } from "@/layouts/CornerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Euro, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { it } from "date-fns/locale";

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
}

export default function CornerCommissioni() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("current");
  const [cornerId, setCornerId] = useState<string | null>(null);

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

    const { data, error } = await supabase
      .from("commission_ledger")
      .select("*")
      .eq("corner_id", cornerId)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading commissions:", error);
      return;
    }

    setCommissions(data || []);
  };

  const totalCommission = commissions.reduce((sum, c) => sum + (c.corner_commission || 0), 0);
  const paidCommission = commissions
    .filter((c) => c.corner_paid)
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
                <span className="text-sm">In Attesa</span>
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
              riparazione completata che hai segnalato. La commissione viene calcolata automaticamente
              quando il Centro completa la riparazione.
            </p>
          </CardContent>
        </Card>

        {/* Commission List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dettaglio Commissioni</CardTitle>
          </CardHeader>
          <CardContent>
            {commissions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nessuna commissione per questo periodo
              </p>
            ) : (
              <div className="space-y-3">
                {commissions.map((commission) => (
                  <div
                    key={commission.id}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg border gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          Riparazione #{commission.repair_request_id?.slice(0, 8)}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            commission.corner_paid
                              ? "bg-green-500/10 text-green-700 border-green-500/30"
                              : "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
                          }
                        >
                          {commission.corner_paid ? "Pagato" : "In Attesa"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(commission.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        Fatturato: €{commission.gross_revenue.toFixed(2)} | Margine: €
                        {commission.gross_margin.toFixed(2)}
                      </div>
                      <div className="text-lg font-bold text-primary">
                        +€{(commission.corner_commission || 0).toFixed(2)}
                        <span className="text-sm font-normal text-muted-foreground ml-1">
                          ({commission.corner_rate}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CornerLayout>
  );
}
