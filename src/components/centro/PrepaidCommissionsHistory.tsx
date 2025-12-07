import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CreditCard, 
  Calendar, 
  FileText, 
  ChevronRight,
  Sparkles,
  TrendingDown
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface PrepaidCommission {
  id: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
  quote_id?: string;
  customer_name?: string;
  device_info?: string;
}

interface PrepaidCommissionsHistoryProps {
  centroId: string;
}

export function PrepaidCommissionsHistory({ centroId }: PrepaidCommissionsHistoryProps) {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<PrepaidCommission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPrepaid, setTotalPrepaid] = useState(0);

  useEffect(() => {
    if (centroId) {
      loadPrepaidCommissions();
    }
  }, [centroId]);

  const loadPrepaidCommissions = async () => {
    try {
      // Fetch prepaid commission transactions
      const { data: transactionsData, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("entity_type", "centro")
        .eq("entity_id", centroId)
        .eq("transaction_type", "commission_prepaid")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch quotes with prepaid commissions for additional details
      const { data: quotesData } = await supabase
        .from("quotes")
        .select(`
          id,
          commission_prepaid_at,
          commission_prepaid_amount,
          device_type,
          device_brand,
          device_model,
          customer:customers(name)
        `)
        .eq("created_by", (await supabase.auth.getUser()).data.user?.id)
        .not("commission_prepaid_at", "is", null)
        .order("commission_prepaid_at", { ascending: false })
        .limit(10);

      // Map transactions with quote details
      const enrichedTransactions: PrepaidCommission[] = (transactionsData || []).map(tx => {
        // Extract quote ID from description
        const quoteIdMatch = tx.description?.match(/#([a-f0-9-]+)/i);
        const quoteId = quoteIdMatch ? quoteIdMatch[1] : undefined;
        
        // Find matching quote
        const quote = quotesData?.find(q => q.id.startsWith(quoteId || ''));
        
        return {
          id: tx.id,
          amount: Math.abs(tx.amount),
          balance_after: tx.balance_after,
          description: tx.description || '',
          created_at: tx.created_at,
          quote_id: quoteId,
          customer_name: (quote?.customer as any)?.name,
          device_info: quote ? `${quote.device_brand || ''} ${quote.device_model || ''}`.trim() : undefined
        };
      });

      setTransactions(enrichedTransactions);
      setTotalPrepaid(enrichedTransactions.reduce((sum, t) => sum + t.amount, 0));
    } catch (error) {
      console.error("Error loading prepaid commissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                <CreditCard className="h-4 w-4 text-white" />
              </div>
              <span>Commissioni Anticipate</span>
            </CardTitle>
            <Badge 
              variant="secondary" 
              className="bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/30"
            >
              <TrendingDown className="h-3 w-3 mr-1" />
              €{totalPrepaid.toFixed(2)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Commissioni addebitate automaticamente all'accettazione dei preventivi
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[280px]">
            <div className="divide-y divide-border">
              {transactions.map((tx, index) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 sm:p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 shrink-0">
                      <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {tx.customer_name || "Cliente"}
                          </p>
                          {tx.device_info && (
                            <p className="text-xs text-muted-foreground truncate">
                              {tx.device_info}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-red-600 dark:text-red-400">
                            -€{tx.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Saldo: €{tx.balance_after.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), "d MMM yyyy, HH:mm", { locale: it })}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Automatico
                        </Badge>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-3 border-t bg-muted/30">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-between text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/centro/commissioni")}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Vedi report completo
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
