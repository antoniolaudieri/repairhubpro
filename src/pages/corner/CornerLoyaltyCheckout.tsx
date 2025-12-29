import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  CreditCard, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Smartphone,
  Shield,
  Percent,
  Users,
  Clock,
  Wrench
} from "lucide-react";

interface Centro {
  id: string;
  business_name: string;
  address: string;
  phone: string;
}

export default function CornerLoyaltyCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const cancelled = searchParams.get("cancelled");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<any>(null);
  const [centri, setCentri] = useState<Centro[]>([]);
  const [selectedCentroId, setSelectedCentroId] = useState<string>("");

  useEffect(() => {
    if (token) {
      loadInvitation();
    } else {
      setError("Link non valido");
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (cancelled === "true") {
      toast.error("Pagamento annullato");
    }
  }, [cancelled]);

  const loadInvitation = async () => {
    try {
      // Get invitation
      const { data: inviteData, error: inviteError } = await supabase
        .from("corner_loyalty_invitations")
        .select("*, corner:corners(id, business_name, address)")
        .eq("invitation_token", token)
        .single();

      if (inviteError || !inviteData) {
        setError("Invito non trovato o scaduto");
        return;
      }

      if (inviteData.status === "paid") {
        setError("Questa tessera è già stata attivata");
        return;
      }

      if (new Date(inviteData.expires_at) < new Date()) {
        setError("Questo invito è scaduto");
        return;
      }

      setInvitation(inviteData);

      // Load available centri
      const { data: centriData } = await supabase
        .from("centri_assistenza")
        .select("id, business_name, address, phone")
        .eq("status", "approved")
        .order("business_name");

      setCentri(centriData || []);
      if (centriData && centriData.length === 1) {
        setSelectedCentroId(centriData[0].id);
      }

    } catch (err) {
      console.error("Error loading invitation:", err);
      setError("Errore nel caricamento dell'invito");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedCentroId) {
      toast.error("Seleziona un Centro di Assistenza");
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-corner-loyalty-checkout", {
        body: {
          invitation_token: token,
          centro_id: selectedCentroId
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error(err instanceof Error ? err.message : "Errore nel checkout");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Oops!</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate("/")} variant="outline">
              Torna alla Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 mb-4">
            <CreditCard className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Tessera Fedeltà</h1>
          <p className="text-muted-foreground">
            Proposta da <span className="font-medium text-foreground">{invitation?.corner?.business_name}</span>
          </p>
        </div>

        {/* Welcome Card */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Ciao {invitation?.customer_name}!
            </CardTitle>
            <CardDescription>
              Sei stato invitato ad attivare la Tessera Fedeltà con accesso all'App di Diagnostica Android
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>Cosa Include</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">App Android</p>
                  <p className="text-sm text-muted-foreground">Diagnostica completa del dispositivo</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium">Scanner Malware</p>
                  <p className="text-sm text-muted-foreground">Protezione da minacce</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                  <Percent className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Sconti Riparazioni</p>
                  <p className="text-sm text-muted-foreground">Risparmia su ogni intervento</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Fino a 3 Dispositivi</p>
                  <p className="text-sm text-muted-foreground">Proteggi tutta la famiglia</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium">Priorità</p>
                  <p className="text-sm text-muted-foreground">Code accelerate</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                  <Wrench className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Check-up Gratuiti</p>
                  <p className="text-sm text-muted-foreground">Diagnosi periodiche incluse</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Centro Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Seleziona Centro di Assistenza</CardTitle>
            <CardDescription>
              La tessera sarà attivata presso il centro selezionato
            </CardDescription>
          </CardHeader>
          <CardContent>
            {centri.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nessun centro disponibile al momento
              </p>
            ) : (
              <RadioGroup value={selectedCentroId} onValueChange={setSelectedCentroId}>
                <div className="space-y-3">
                  {centri.map((centro) => (
                    <div key={centro.id} className="flex items-center space-x-3">
                      <RadioGroupItem value={centro.id} id={centro.id} />
                      <Label htmlFor={centro.id} className="flex-1 cursor-pointer">
                        <div className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <p className="font-medium">{centro.business_name}</p>
                          <p className="text-sm text-muted-foreground">{centro.address}</p>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}
          </CardContent>
        </Card>

        {/* Price & Checkout */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground mb-2">Prezzo annuale</p>
              <p className="text-5xl font-bold text-primary">€40</p>
              <Badge variant="outline" className="mt-2">Validità 12 mesi</Badge>
            </div>

            <Button 
              onClick={handleCheckout} 
              className="w-full h-14 text-lg"
              disabled={!selectedCentroId || processing}
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Reindirizzamento...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Paga con Stripe
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Pagamento sicuro tramite Stripe. Nessun dato della carta viene salvato sui nostri server.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
