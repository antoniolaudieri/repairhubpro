import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface CommissionEntry {
  id: string;
  gross_revenue: number;
  corner_commission: number;
  corner_rate: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

interface CommissionHistoryProps {
  commissions: CommissionEntry[];
  isLoading: boolean;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending: { label: "In Attesa", variant: "secondary", icon: Clock },
  approved: { label: "Approvato", variant: "outline", icon: CheckCircle },
  paid: { label: "Pagato", variant: "default", icon: CheckCircle },
};

export const CommissionHistory = ({ commissions, isLoading }: CommissionHistoryProps) => {
  const totalEarned = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + (c.corner_commission || 0), 0);

  const totalPending = commissions
    .filter((c) => c.status === "pending" || c.status === "approved")
    .reduce((sum, c) => sum + (c.corner_commission || 0), 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Storico Commissioni
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Storico Commissioni
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Guadagnato</span>
            </div>
            <p className="text-2xl font-bold text-green-500 mt-1">
              €{totalEarned.toFixed(2)}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="text-sm text-muted-foreground">In Attesa</span>
            </div>
            <p className="text-2xl font-bold text-amber-500 mt-1">
              €{totalPending.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Commission List */}
        {commissions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nessuna commissione registrata ancora.
          </p>
        ) : (
          <div className="space-y-3">
            {commissions.map((commission) => {
              const status = statusConfig[commission.status] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <div
                  key={commission.id}
                  className="p-4 rounded-lg border border-border bg-card/50 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={status.variant} className="text-xs">
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(commission.created_at), "dd MMM yyyy", { locale: it })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Fatturato: €{commission.gross_revenue?.toFixed(2) || "0.00"} • 
                      Tasso: {commission.corner_rate}%
                    </p>
                    {commission.paid_at && (
                      <p className="text-xs text-green-500">
                        Pagato il {format(new Date(commission.paid_at), "dd MMM yyyy", { locale: it })}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      +€{commission.corner_commission?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
