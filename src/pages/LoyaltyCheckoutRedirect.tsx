import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Gift, Shield, CheckCircle } from "lucide-react";

export default function LoyaltyCheckoutRedirect() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const customerId = searchParams.get("customer_id");
  const centroId = searchParams.get("centro_id");
  const customerEmail = searchParams.get("email");
  const centroName = searchParams.get("centro") || "Centro Assistenza";

  useEffect(() => {
    const initiateCheckout = async () => {
      if (!customerId || !centroId) {
        setError("Parametri mancanti. Link non valido.");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke("create-loyalty-checkout", {
          body: { customer_id: customerId, centro_id: centroId, customer_email: customerEmail },
        });

        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        if (data?.url) {
          window.location.href = data.url;
        } else {
          setError("Impossibile creare la sessione di pagamento.");
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Checkout error:", err);
        if (err.message?.includes("already has an active")) {
          setError("Hai già una tessera fedeltà attiva per questo centro!");
        } else {
          setError(err.message || "Errore durante la creazione del checkout.");
        }
        setLoading(false);
      }
    };

    initiateCheckout();
  }, [customerId, centroId, customerEmail]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Preparazione Pagamento...</h2>
            <p className="text-muted-foreground">Stai per essere reindirizzato alla pagina di pagamento sicuro.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              {error.includes("attiva") ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <CreditCard className="h-8 w-8 text-amber-600" />
              )}
            </div>
            <CardTitle>{error.includes("attiva") ? "Tessera Già Attiva!" : "Attenzione"}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => window.close()} variant="outline">Chiudi</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Gift className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Tessera Fedeltà {centroName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Diagnostica Ridotta</p>
                <p className="text-sm text-muted-foreground">€10 invece di €15 (-€5)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Gift className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">10% Sconto Riparazioni</p>
                <p className="text-sm text-muted-foreground">Su manodopera e servizi (max 3 dispositivi/anno)</p>
              </div>
            </div>
          </div>
          <div className="text-center p-4 bg-primary/5 rounded-lg mb-4">
            <p className="text-sm text-muted-foreground">Costo annuale</p>
            <p className="text-3xl font-bold text-primary">€30</p>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Pagamento sicuro tramite Stripe
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
