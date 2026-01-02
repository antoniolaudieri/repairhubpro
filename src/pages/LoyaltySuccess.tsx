import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, XCircle, Gift } from "lucide-react";

const LoyaltySuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cardId = searchParams.get("card_id");
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [card, setCard] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (cardId) {
      activateCard();
    } else {
      setStatus("error");
      setErrorMessage("Nessun ID tessera trovato");
    }
  }, [cardId]);

  const activateCard = async () => {
    try {
      // First check current status
      const { data: existingCard, error: fetchError } = await supabase
        .from("loyalty_cards")
        .select(`
          *,
          centro:centri_assistenza(business_name, phone, email),
          customer:customers(name, email)
        `)
        .eq("id", cardId)
        .single();

      if (fetchError) throw fetchError;

      // If already active, just show success
      if (existingCard.status === "active") {
        setCard(existingCard);
        setStatus("success");
        return;
      }

      // Activate the card if still pending
      if (existingCard.status === "pending_payment") {
        const { error: updateError } = await supabase
          .from("loyalty_cards")
          .update({
            status: "active",
            activated_at: new Date().toISOString(),
          })
          .eq("id", cardId);

        if (updateError) throw updateError;

        // Fetch updated card
        const { data: updatedCard } = await supabase
          .from("loyalty_cards")
          .select(`
            *,
            centro:centri_assistenza(business_name, phone, email),
            customer:customers(name, email)
          `)
          .eq("id", cardId)
          .single();

        setCard(updatedCard);
      } else {
        setCard(existingCard);
      }

      setStatus("success");
    } catch (error: any) {
      console.error("Error activating card:", error);
      setErrorMessage(error.message || "Errore durante l'attivazione");
      setStatus("error");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Attivazione tessera in corso...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Errore</h2>
            <p className="text-muted-foreground mb-6">{errorMessage}</p>
            <Button onClick={() => navigate("/")}>Torna alla Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 rounded-full bg-green-100 p-3 w-fit">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-700">
            Tessera Attivata!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            Grazie {card?.customer?.name}! La tua tessera fedeltà è ora attiva.
          </p>

          {card?.centro && (
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="font-medium">{card.centro.business_name}</p>
              {card.centro.phone && (
                <p className="text-sm text-muted-foreground">{card.centro.phone}</p>
              )}
            </div>
          )}

          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Gift className="h-5 w-5 text-primary" />
              <span className="font-medium">I tuoi vantaggi:</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ 10% di sconto su tutte le riparazioni</li>
              <li>✓ Diagnosi a soli €10 (invece di €15)</li>
              <li>✓ Fino a {card?.max_devices || 3} dispositivi coperti</li>
              <li>✓ Validità 12 mesi</li>
            </ul>
          </div>

          {card?.card_number && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Numero Tessera</p>
              <p className="font-mono text-lg font-bold">{card.card_number}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => navigate("/customer-dashboard")}
              className="w-full"
            >
              Vai alla Dashboard
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/")}
              className="w-full"
            >
              Torna alla Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoyaltySuccess;
