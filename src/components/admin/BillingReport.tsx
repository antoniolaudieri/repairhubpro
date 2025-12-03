import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Building2, 
  Store, 
  Euro, 
  Calendar,
  FileText,
  TrendingUp,
  Download,
  CheckCircle2,
  Clock,
  Filter
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Commission {
  id: string;
  centro_id: string | null;
  corner_id: string | null;
  gross_revenue: number;
  parts_cost: number;
  gross_margin: number;
  platform_commission: number;
  platform_rate: number;
  corner_commission: number | null;
  corner_rate: number | null;
  platform_paid: boolean;
  platform_paid_at: string | null;
  corner_paid: boolean;
  corner_paid_at: string | null;
  created_at: string;
  centro?: { business_name: string };
  corner?: { business_name: string };
}

type PaymentFilter = "all" | "unpaid" | "paid";

export function BillingReport() {
  const [selectedMonth, setSelectedMonth] = useState<string>("current");
  const [platformFilter, setPlatformFilter] = useState<PaymentFilter>("all");
  const [cornerFilter, setCornerFilter] = useState<PaymentFilter>("all");
  const queryClient = useQueryClient();

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

  const { start, end } = getMonthRange(selectedMonth);
  const monthLabel = format(start, "MMMM yyyy", { locale: it });

  // Fetch all commissions with details
  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ["admin-commissions", selectedMonth],
    queryFn: async () => {
      const { start, end } = getMonthRange(selectedMonth);
      
      const { data, error } = await supabase
        .from("commission_ledger")
        .select(`
          *,
          centro:centri_assistenza!commission_ledger_centro_id_fkey(business_name),
          corner:corners!commission_ledger_corner_id_fkey(business_name)
        `)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Commission[];
    },
  });

  // Update payment status mutation
  const updatePaymentMutation = useMutation({
    mutationFn: async ({ 
      id, 
      field, 
      value 
    }: { 
      id: string; 
      field: "platform_paid" | "corner_paid"; 
      value: boolean 
    }) => {
      const timestampField = field === "platform_paid" ? "platform_paid_at" : "corner_paid_at";
      const { error } = await supabase
        .from("commission_ledger")
        .update({
          [field]: value,
          [timestampField]: value ? new Date().toISOString() : null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
      toast.success("Stato pagamento aggiornato");
    },
    onError: () => {
      toast.error("Errore nell'aggiornamento");
    },
  });

  // Bulk update mutations
  const markAllPlatformPaid = useMutation({
    mutationFn: async () => {
      const unpaidIds = commissions
        .filter(c => !c.platform_paid && c.centro_id)
        .map(c => c.id);
      
      if (unpaidIds.length === 0) return;
      
      const { error } = await supabase
        .from("commission_ledger")
        .update({
          platform_paid: true,
          platform_paid_at: new Date().toISOString(),
        })
        .in("id", unpaidIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
      toast.success("Tutte le commissioni piattaforma segnate come pagate");
    },
  });

  const markAllCornerPaid = useMutation({
    mutationFn: async () => {
      const unpaidIds = commissions
        .filter(c => !c.corner_paid && c.corner_id)
        .map(c => c.id);
      
      if (unpaidIds.length === 0) return;
      
      const { error } = await supabase
        .from("commission_ledger")
        .update({
          corner_paid: true,
          corner_paid_at: new Date().toISOString(),
        })
        .in("id", unpaidIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
      toast.success("Tutte le commissioni corner segnate come pagate");
    },
  });

  // Filter commissions
  const filteredCommissions = commissions.filter(c => {
    if (platformFilter === "paid" && !c.platform_paid) return false;
    if (platformFilter === "unpaid" && c.platform_paid) return false;
    if (cornerFilter === "paid" && c.corner_id && !c.corner_paid) return false;
    if (cornerFilter === "unpaid" && c.corner_id && c.corner_paid) return false;
    return true;
  });

  // Calculate totals
  const platformTotal = commissions.reduce((sum, c) => sum + c.platform_commission, 0);
  const platformPaid = commissions.filter(c => c.platform_paid).reduce((sum, c) => sum + c.platform_commission, 0);
  const platformUnpaid = platformTotal - platformPaid;

  const cornerTotal = commissions.filter(c => c.corner_id).reduce((sum, c) => sum + (c.corner_commission || 0), 0);
  const cornerPaid = commissions.filter(c => c.corner_id && c.corner_paid).reduce((sum, c) => sum + (c.corner_commission || 0), 0);
  const cornerUnpaid = cornerTotal - cornerPaid;

  const exportCSV = () => {
    const headers = ["Data", "Centro", "Corner", "Fatturato", "Margine", "Comm. Piattaforma", "Piatt. Pagata", "Comm. Corner", "Corner Pagata"];
    const rows = filteredCommissions.map(c => [
      format(new Date(c.created_at), "dd/MM/yyyy"),
      c.centro?.business_name || "-",
      c.corner?.business_name || "-",
      c.gross_revenue.toFixed(2),
      c.gross_margin.toFixed(2),
      c.platform_commission.toFixed(2),
      c.platform_paid ? "Sì" : "No",
      (c.corner_commission || 0).toFixed(2),
      c.corner_id ? (c.corner_paid ? "Sì" : "No") : "-",
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `commissioni-${format(start, "yyyy-MM")}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gestione Pagamenti Commissioni
          </h2>
          <p className="text-muted-foreground text-sm">
            Gestisci lo stato dei pagamenti per piattaforma e corner
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Euro className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">€{platformUnpaid.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Piattaforma Da Incassare</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">€{platformPaid.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Piattaforma Incassato</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Store className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">€{cornerUnpaid.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Corner Da Pagare</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-500">€{cornerPaid.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Corner Pagato</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Bulk Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtri:</span>
              </div>
              <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as PaymentFilter)}>
                <SelectTrigger className="w-[160px]">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Piattaforma: Tutti</SelectItem>
                  <SelectItem value="unpaid">Piattaforma: Non pagati</SelectItem>
                  <SelectItem value="paid">Piattaforma: Pagati</SelectItem>
                </SelectContent>
              </Select>
              <Select value={cornerFilter} onValueChange={(v) => setCornerFilter(v as PaymentFilter)}>
                <SelectTrigger className="w-[160px]">
                  <Store className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Corner: Tutti</SelectItem>
                  <SelectItem value="unpaid">Corner: Non pagati</SelectItem>
                  <SelectItem value="paid">Corner: Pagati</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => markAllPlatformPaid.mutate()}
                disabled={markAllPlatformPaid.isPending || platformUnpaid === 0}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Segna Tutti Piattaforma
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => markAllCornerPaid.mutate()}
                disabled={markAllCornerPaid.isPending || cornerUnpaid === 0}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Segna Tutti Corner
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commission List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Dettaglio Commissioni - {monthLabel} ({filteredCommissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredCommissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Euro className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessuna commissione trovata</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCommissions.map((commission) => (
                <div
                  key={commission.id}
                  className="p-4 rounded-lg border border-border bg-card/50"
                >
                  <div className="flex flex-col gap-4">
                    {/* Header row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(commission.created_at), "dd MMM yyyy", { locale: it })}
                        </span>
                        {commission.centro && (
                          <Badge variant="outline" className="text-primary border-primary/30">
                            <Building2 className="h-3 w-3 mr-1" />
                            {commission.centro.business_name}
                          </Badge>
                        )}
                        {commission.corner && (
                          <Badge variant="outline" className="text-blue-500 border-blue-500/30">
                            <Store className="h-3 w-3 mr-1" />
                            {commission.corner.business_name}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Fatturato: €{commission.gross_revenue.toFixed(2)} | Margine: €{commission.gross_margin.toFixed(2)}
                      </div>
                    </div>

                    {/* Payment controls */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-3 border-t border-border/50">
                      {/* Platform payment */}
                      <div className="flex-1 flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={commission.platform_paid}
                            onCheckedChange={(checked) => {
                              updatePaymentMutation.mutate({
                                id: commission.id,
                                field: "platform_paid",
                                value: checked as boolean,
                              });
                            }}
                            disabled={updatePaymentMutation.isPending}
                          />
                          <div>
                            <p className="text-sm font-medium">Commissione Piattaforma</p>
                            <p className="text-xs text-muted-foreground">
                              {commission.platform_paid && commission.platform_paid_at
                                ? `Pagato il ${format(new Date(commission.platform_paid_at), "dd/MM/yyyy")}`
                                : "Non pagato"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">€{commission.platform_commission.toFixed(2)}</span>
                          {commission.platform_paid ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Pagato
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-warning border-warning/30">
                              <Clock className="h-3 w-3 mr-1" />
                              Da pagare
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Corner payment (if applicable) */}
                      {commission.corner_id && (
                        <div className="flex-1 flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={commission.corner_paid}
                              onCheckedChange={(checked) => {
                                updatePaymentMutation.mutate({
                                  id: commission.id,
                                  field: "corner_paid",
                                  value: checked as boolean,
                                });
                              }}
                              disabled={updatePaymentMutation.isPending}
                            />
                            <div>
                              <p className="text-sm font-medium">Commissione Corner</p>
                              <p className="text-xs text-muted-foreground">
                                {commission.corner_paid && commission.corner_paid_at
                                  ? `Pagato il ${format(new Date(commission.corner_paid_at), "dd/MM/yyyy")}`
                                  : "Non pagato"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">€{(commission.corner_commission || 0).toFixed(2)}</span>
                            {commission.corner_paid ? (
                              <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Pagato
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-warning border-warning/30">
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
  );
}
