import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Ban, Wallet } from "lucide-react";

interface CreditStatusBannerProps {
  paymentStatus: string;
  creditBalance: number;
  onRequestTopup?: () => void;
}

export function CreditStatusBanner({
  paymentStatus,
  creditBalance,
  onRequestTopup,
}: CreditStatusBannerProps) {
  if (paymentStatus === "good_standing") return null;

  if (paymentStatus === "suspended") {
    return (
      <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
        <Ban className="h-4 w-4" />
        <AlertTitle className="font-semibold">Account Sospeso</AlertTitle>
        <AlertDescription className="mt-2">
          <p>
            Il tuo account è sospeso per credito esaurito. Non puoi creare nuove riparazioni.
          </p>
          <p className="font-medium mt-1">
            Importo da ricaricare: €{Math.abs(creditBalance).toFixed(2)}
          </p>
          {onRequestTopup && (
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-3 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={onRequestTopup}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Ricarica Ora
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (paymentStatus === "warning") {
    return (
      <Alert className="border-warning/50 bg-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertTitle className="font-semibold text-warning">Saldo Basso</AlertTitle>
        <AlertDescription className="mt-2">
          <p>
            Il tuo credito sta per esaurirsi. Ricarica per evitare la sospensione dell'account.
          </p>
          <p className="font-medium mt-1">
            Saldo attuale: €{creditBalance.toFixed(2)}
          </p>
          {onRequestTopup && (
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-3 border-warning/30 text-warning hover:bg-warning/10"
              onClick={onRequestTopup}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Ricarica Credito
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
