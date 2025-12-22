import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { MailX, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function Disiscrizione() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");
  const centroId = searchParams.get("centro");
  const centroName = searchParams.get("nome") || "il centro";

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaignType, setCampaignType] = useState<string>("all");
  const [reason, setReason] = useState("");

  const handleUnsubscribe = async () => {
    if (!email || !centroId) {
      setError("Parametri mancanti. Link non valido.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: fnError } = await supabase.functions.invoke("unsubscribe-email", {
        body: {
          email,
          centro_id: centroId,
          campaign_type: campaignType,
          reason: reason || null,
        },
      });

      if (fnError) throw fnError;

      setSuccess(true);
    } catch (err: any) {
      console.error("Unsubscribe error:", err);
      setError("Si è verificato un errore. Riprova più tardi.");
    } finally {
      setLoading(false);
    }
  };

  if (!email || !centroId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Link non valido</h1>
          <p className="text-muted-foreground">
            Il link di disiscrizione non è valido o è scaduto.
          </p>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Disiscrizione completata</h1>
          <p className="text-muted-foreground mb-4">
            Non riceverai più email {campaignType === "all" ? "promozionali" : "di questo tipo"} da {centroName}.
          </p>
          <p className="text-sm text-muted-foreground">
            Puoi chiudere questa pagina.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6">
        <div className="text-center mb-6">
          <MailX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Disiscrizione Newsletter</h1>
          <p className="text-muted-foreground">
            Stai per disiscriverti dalle comunicazioni di <strong>{centroName}</strong>
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Email: <strong>{email}</strong>
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Cosa vuoi fare?
            </Label>
            <RadioGroup value={campaignType} onValueChange={setCampaignType}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex-1 cursor-pointer">
                  <span className="font-medium">Disiscrivimi da tutte le email</span>
                  <span className="block text-sm text-muted-foreground">
                    Non riceverai più nessuna comunicazione promozionale
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                <RadioGroupItem value="loyalty_promotion" id="loyalty" />
                <Label htmlFor="loyalty" className="flex-1 cursor-pointer">
                  <span className="font-medium">Solo promozioni tessera fedeltà</span>
                  <span className="block text-sm text-muted-foreground">
                    Continuerai a ricevere altre comunicazioni
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="reason" className="text-sm font-medium mb-2 block">
              Motivo (opzionale)
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Dicci perché ti stai disiscrivendo..."
              rows={3}
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button
            onClick={handleUnsubscribe}
            disabled={loading}
            className="w-full"
            variant="destructive"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Elaborazione...
              </>
            ) : (
              "Conferma disiscrizione"
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Ai sensi del GDPR e del D.Lgs. 196/2003, hai il diritto di revocare 
            il consenso alle comunicazioni marketing in qualsiasi momento.
          </p>
        </div>
      </Card>
    </div>
  );
}