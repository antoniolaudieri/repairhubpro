import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Store, 
  Euro, 
  Calendar,
  FileText,
  TrendingUp,
  Download
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";

interface CommissionSummary {
  centro_id: string;
  centro_name: string;
  total_revenue: number;
  total_parts_cost: number;
  total_margin: number;
  platform_commission: number;
  repairs_count: number;
}

interface CornerSummary {
  corner_id: string;
  corner_name: string;
  total_commission: number;
  referrals_count: number;
}

export function BillingReport() {
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

  const { start, end } = getMonthRange(selectedMonth);
  const monthLabel = format(start, "MMMM yyyy", { locale: it });

  // Fetch commission data for all Centri
  const { data: centroSummaries = [], isLoading: loadingCentri } = useQuery({
    queryKey: ["billing-centri", selectedMonth],
    queryFn: async () => {
      const { start, end } = getMonthRange(selectedMonth);
      
      // Get all commissions for the month
      const { data: commissions, error } = await supabase
        .from("commission_ledger")
        .select(`
          centro_id,
          gross_revenue,
          parts_cost,
          gross_margin,
          platform_commission,
          status
        `)
        .not("centro_id", "is", null)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (error) throw error;

      // Get centro names
      const centroIds = [...new Set(commissions?.map(c => c.centro_id).filter(Boolean))];
      const { data: centri } = await supabase
        .from("centri_assistenza")
        .select("id, business_name")
        .in("id", centroIds);

      const centroMap = new Map(centri?.map(c => [c.id, c.business_name]) || []);

      // Aggregate by centro
      const summaryMap = new Map<string, CommissionSummary>();
      
      commissions?.forEach(c => {
        if (!c.centro_id) return;
        
        const existing = summaryMap.get(c.centro_id) || {
          centro_id: c.centro_id,
          centro_name: centroMap.get(c.centro_id) || "Centro Sconosciuto",
          total_revenue: 0,
          total_parts_cost: 0,
          total_margin: 0,
          platform_commission: 0,
          repairs_count: 0,
        };
        
        existing.total_revenue += c.gross_revenue || 0;
        existing.total_parts_cost += c.parts_cost || 0;
        existing.total_margin += c.gross_margin || 0;
        existing.platform_commission += c.platform_commission || 0;
        existing.repairs_count += 1;
        
        summaryMap.set(c.centro_id, existing);
      });

      return Array.from(summaryMap.values()).sort((a, b) => b.platform_commission - a.platform_commission);
    },
  });

  // Fetch commission data for all Corners
  const { data: cornerSummaries = [], isLoading: loadingCorners } = useQuery({
    queryKey: ["billing-corners", selectedMonth],
    queryFn: async () => {
      const { start, end } = getMonthRange(selectedMonth);
      
      const { data: commissions, error } = await supabase
        .from("commission_ledger")
        .select(`
          corner_id,
          corner_commission
        `)
        .not("corner_id", "is", null)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (error) throw error;

      // Get corner names
      const cornerIds = [...new Set(commissions?.map(c => c.corner_id).filter(Boolean))];
      const { data: corners } = await supabase
        .from("corners")
        .select("id, business_name")
        .in("id", cornerIds);

      const cornerMap = new Map(corners?.map(c => [c.id, c.business_name]) || []);

      // Aggregate by corner
      const summaryMap = new Map<string, CornerSummary>();
      
      commissions?.forEach(c => {
        if (!c.corner_id) return;
        
        const existing = summaryMap.get(c.corner_id) || {
          corner_id: c.corner_id,
          corner_name: cornerMap.get(c.corner_id) || "Corner Sconosciuto",
          total_commission: 0,
          referrals_count: 0,
        };
        
        existing.total_commission += c.corner_commission || 0;
        existing.referrals_count += 1;
        
        summaryMap.set(c.corner_id, existing);
      });

      return Array.from(summaryMap.values()).sort((a, b) => b.total_commission - a.total_commission);
    },
  });

  const totalPlatformCommission = centroSummaries.reduce((sum, c) => sum + c.platform_commission, 0);
  const totalCornerCommission = cornerSummaries.reduce((sum, c) => sum + c.total_commission, 0);
  const totalRepairs = centroSummaries.reduce((sum, c) => sum + c.repairs_count, 0);

  const exportCSV = () => {
    const headers = ["Centro", "Riparazioni", "Fatturato", "Costi Ricambi", "Margine", "Commissione da Fatturare"];
    const rows = centroSummaries.map(c => [
      c.centro_name,
      c.repairs_count,
      c.total_revenue.toFixed(2),
      c.total_parts_cost.toFixed(2),
      c.total_margin.toFixed(2),
      c.platform_commission.toFixed(2),
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `fatturazione-${format(start, "yyyy-MM")}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Fatturazione Mensile
          </h2>
          <p className="text-muted-foreground text-sm">
            Commissioni da fatturare ai Centri e dovute ai Corner
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Euro className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">€{totalPlatformCommission.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Da Fatturare ai Centri (20%)</p>
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
                <p className="text-2xl font-bold text-blue-500">€{totalCornerCommission.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Commissioni Corner (10%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRepairs}</p>
                <p className="text-xs text-muted-foreground">Riparazioni Completate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Centri Billing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Fatturazione Centri - {monthLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCentri ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : centroSummaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessuna commissione da fatturare in {monthLabel}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {centroSummaries.map((centro) => (
                <div
                  key={centro.centro_id}
                  className="p-4 rounded-lg border border-border bg-card/50"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold">{centro.centro_name}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Riparazioni</p>
                          <p className="font-medium">{centro.repairs_count}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Fatturato</p>
                          <p className="font-medium">€{centro.total_revenue.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Margine</p>
                          <p className="font-medium">€{centro.total_margin.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ricambi</p>
                          <p className="font-medium">€{centro.total_parts_cost.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-sm">Da Fatturare</p>
                      <p className="text-xl font-bold text-primary">€{centro.platform_commission.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Corner Commissions */}
      {cornerSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Store className="h-5 w-5" />
              Commissioni Corner - {monthLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCorners ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {cornerSummaries.map((corner) => (
                  <div
                    key={corner.corner_id}
                    className="p-4 rounded-lg border border-border bg-card/50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{corner.corner_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {corner.referrals_count} segnalazioni
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground text-sm">Commissione</p>
                        <p className="text-xl font-bold text-blue-500">€{corner.total_commission.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
