import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Clock, CheckCircle, Wallet } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";

interface CommissionEntry {
  id: string;
  gross_revenue: number;
  gross_margin: number;
  corner_commission: number;
  corner_rate: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  corner_paid: boolean;
  corner_paid_at: string | null;
}

interface CommissionHistoryProps {
  commissions: CommissionEntry[];
  isLoading: boolean;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending: { label: "Da Pagare", variant: "outline", icon: Clock },
  approved: { label: "Approvato", variant: "secondary", icon: CheckCircle },
  paid: { label: "Pagato", variant: "default", icon: CheckCircle },
};

export const CommissionHistory = ({ commissions, isLoading }: CommissionHistoryProps) => {
  // Total earned = all commissions
  const totalEarned = commissions.reduce((sum, c) => sum + (c.corner_commission || 0), 0);

  // Paid = corner_paid is true
  const totalPaid = commissions
    .filter((c) => c.corner_paid)
    .reduce((sum, c) => sum + (c.corner_commission || 0), 0);

  // Pending = corner_paid is false
  const totalPending = commissions
    .filter((c) => !c.corner_paid)
    .reduce((sum, c) => sum + (c.corner_commission || 0), 0);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
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
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Storico Commissioni
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/20"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-violet-500" />
              <span className="text-xs text-muted-foreground">Totale Guadagnato</span>
            </div>
            <p className="text-xl font-bold bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent mt-1">
              €{totalEarned.toFixed(2)}
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/10 border border-emerald-500/20"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Ricevuto</span>
            </div>
            <p className="text-xl font-bold text-emerald-500 mt-1">
              €{totalPaid.toFixed(2)}
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Da Ricevere</span>
            </div>
            <p className="text-xl font-bold text-amber-500 mt-1">
              €{totalPending.toFixed(2)}
            </p>
          </motion.div>
        </div>

        {/* Commission List */}
        {commissions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Nessuna commissione registrata ancora.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Le commissioni appariranno qui quando le tue segnalazioni verranno completate.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {commissions.map((commission, index) => {
              const isPaid = commission.corner_paid;
              const StatusIcon = isPaid ? CheckCircle : Clock;

              return (
                <motion.div
                  key={commission.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          variant={isPaid ? "default" : "outline"} 
                          className={`text-xs ${isPaid ? 'bg-emerald-500 hover:bg-emerald-600' : 'text-amber-600 border-amber-500/50'}`}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {isPaid ? "Ricevuto" : "Da Ricevere"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(commission.created_at), "dd MMM yyyy", { locale: it })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>Fatturato: €{commission.gross_revenue?.toFixed(2) || "0.00"}</span>
                        <span>•</span>
                        <span>Margine: €{commission.gross_margin?.toFixed(2) || "0.00"}</span>
                        <span>•</span>
                        <span>{commission.corner_rate}%</span>
                      </div>
                      {commission.corner_paid_at && (
                        <p className="text-xs text-emerald-500">
                          ✓ Ricevuto il {format(new Date(commission.corner_paid_at), "dd MMM yyyy", { locale: it })}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${isPaid ? 'text-emerald-500' : 'text-primary'}`}>
                        +€{commission.corner_commission?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};