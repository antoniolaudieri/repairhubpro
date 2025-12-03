import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Wallet, Plus, TrendingUp, TrendingDown, AlertTriangle, Ban } from "lucide-react";
import { TopupRequestDialog } from "./TopupRequestDialog";
import { CreditTransactionsDialog } from "./CreditTransactionsDialog";

interface CreditBalanceWidgetProps {
  entityType: "centro" | "corner";
  entityId: string;
  creditBalance: number;
  warningThreshold: number;
  paymentStatus: string;
  onTopupSuccess?: () => void;
}

export function CreditBalanceWidget({
  entityType,
  entityId,
  creditBalance,
  warningThreshold,
  paymentStatus,
  onTopupSuccess,
}: CreditBalanceWidgetProps) {
  const [showTopupDialog, setShowTopupDialog] = useState(false);
  const [showTransactionsDialog, setShowTransactionsDialog] = useState(false);

  const getStatusConfig = () => {
    switch (paymentStatus) {
      case "suspended":
        return {
          color: "bg-destructive/20 text-destructive border-destructive/30",
          icon: Ban,
          label: "Sospeso",
          gradient: "from-destructive/20 to-destructive/5",
        };
      case "warning":
        return {
          color: "bg-warning/20 text-warning border-warning/30",
          icon: AlertTriangle,
          label: "Saldo Basso",
          gradient: "from-warning/20 to-warning/5",
        };
      default:
        return {
          color: "bg-success/20 text-success border-success/30",
          icon: TrendingUp,
          label: "Regolare",
          gradient: "from-success/20 to-success/5",
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  // Calculate progress percentage (100 = at threshold, 200 = double threshold)
  const progressValue = Math.min(100, Math.max(0, (creditBalance / (warningThreshold * 2)) * 100));

  return (
    <>
      <Card className={`bg-gradient-to-br ${statusConfig.gradient} border-border/50`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Credito Disponibile
            </CardTitle>
            <Badge className={statusConfig.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-bold ${creditBalance < 0 ? "text-destructive" : ""}`}>
              €{creditBalance.toFixed(2)}
            </span>
            {creditBalance < warningThreshold && (
              <span className="text-xs text-muted-foreground">
                (soglia: €{warningThreshold})
              </span>
            )}
          </div>

          <Progress 
            value={progressValue} 
            className={`h-2 ${paymentStatus === "suspended" ? "[&>div]:bg-destructive" : paymentStatus === "warning" ? "[&>div]:bg-warning" : "[&>div]:bg-success"}`}
          />

          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => setShowTopupDialog(true)}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-1" />
              Ricarica
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowTransactionsDialog(true)}
            >
              Movimenti
            </Button>
          </div>

          {paymentStatus === "suspended" && (
            <p className="text-xs text-destructive">
              Account sospeso per credito esaurito. Ricarica per riattivare.
            </p>
          )}
          {paymentStatus === "warning" && (
            <p className="text-xs text-warning">
              Saldo basso. Ricarica per evitare interruzioni del servizio.
            </p>
          )}
        </CardContent>
      </Card>

      <TopupRequestDialog
        open={showTopupDialog}
        onOpenChange={setShowTopupDialog}
        entityType={entityType}
        entityId={entityId}
        currentBalance={creditBalance}
        onSuccess={() => {
          setShowTopupDialog(false);
          onTopupSuccess?.();
        }}
      />

      <CreditTransactionsDialog
        open={showTransactionsDialog}
        onOpenChange={setShowTransactionsDialog}
        entityType={entityType}
        entityId={entityId}
      />
    </>
  );
}
