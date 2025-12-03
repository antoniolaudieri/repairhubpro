import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ArrowUpCircle, ArrowDownCircle, RefreshCcw, Settings } from "lucide-react";

interface CreditTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "centro" | "corner";
  entityId: string;
}

interface CreditTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

const transactionConfig: Record<string, { icon: typeof ArrowUpCircle; color: string; label: string }> = {
  topup: { icon: ArrowUpCircle, color: "text-success", label: "Ricarica" },
  commission_debit: { icon: ArrowDownCircle, color: "text-destructive", label: "Commissione" },
  refund: { icon: RefreshCcw, color: "text-info", label: "Rimborso" },
  adjustment: { icon: Settings, color: "text-muted-foreground", label: "Rettifica" },
};

export function CreditTransactionsDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
}: CreditTransactionsDialogProps) {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["credit-transactions", entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as CreditTransaction[];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Storico Movimenti</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : transactions?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ArrowDownCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Nessun movimento registrato</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions?.map((tx) => {
                const config = transactionConfig[tx.transaction_type] || transactionConfig.adjustment;
                const Icon = config.icon;
                const isPositive = tx.amount > 0;

                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-2 rounded-full bg-muted ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{config.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {format(new Date(tx.created_at), "dd MMM", { locale: it })}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {tx.description || "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isPositive ? "text-success" : "text-destructive"}`}>
                        {isPositive ? "+" : ""}€{tx.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Saldo: €{tx.balance_after.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
