import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CreditCard, Smartphone, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CornerLoyaltySuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cardId = searchParams.get("card_id");
  const [loading, setLoading] = useState(true);
  const [cardInfo, setCardInfo] = useState<any>(null);
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const [loadingApk, setLoadingApk] = useState(false);

  useEffect(() => {
    if (cardId) {
      verifyAndLoadCard();
    } else {
      setLoading(false);
    }
  }, [cardId]);

  const verifyAndLoadCard = async () => {
    try {
      // Verify payment and activate card via confirm-loyalty-payment logic
      // The webhook should have already activated it, but let's verify
      const { data: card } = await supabase
        .from("loyalty_cards")
        .select(`
          *,
          centro:centri_assistenza(business_name, phone, email),
          customer:customers(name, email)
        `)
        .eq("id", cardId)
        .single();

      if (card) {
        setCardInfo(card);
        
        // If still pending, try to activate (webhook might not have fired yet)
        if (card.status === "pending_payment") {
          // Give webhook a moment
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: updatedCard } = await supabase
            .from("loyalty_cards")
            .select(`
              *,
              centro:centri_assistenza(business_name, phone, email),
              customer:customers(name, email)
            `)
            .eq("id", cardId)
            .single();
          
          if (updatedCard) {
            setCardInfo(updatedCard);
          }
        }
      }
    } catch (error) {
      console.error("Error loading card:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestApk = async () => {
    setLoadingApk(true);
    try {
      const response = await fetch(
        "https://api.github.com/repos/antoniolaudieri/repairhubpro/releases/latest",
        { headers: { Accept: "application/vnd.github.v3+json" } }
      );

      if (!response.ok) throw new Error("Failed to fetch release");

      const release = await response.json();
      const apkAsset = release.assets?.find((asset: any) =>
        asset.name.endsWith(".apk")
      );

      if (apkAsset?.browser_download_url) {
        setApkUrl(apkAsset.browser_download_url);
        window.open(apkAsset.browser_download_url, "_blank");
        toast.success("Download avviato!");
      } else {
        throw new Error("APK not found");
      }
    } catch (error) {
      console.error("Error fetching APK:", error);
      toast.error("Impossibile scaricare l'app. Riprova più tardi.");
    } finally {
      setLoadingApk(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
        <Loader2 className="w-12 h-12 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 p-4">
      <div className="max-w-lg mx-auto pt-12">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-center text-white">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Pagamento Completato!</h1>
            <p className="text-green-100">La tua Tessera Fedeltà è stata attivata</p>
          </div>

          <CardContent className="p-6 space-y-6">
            {cardInfo && (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Numero Tessera</p>
                <p className="text-2xl font-mono font-bold text-primary">
                  {cardInfo.card_number || "In attivazione..."}
                </p>
                <p className="text-sm text-muted-foreground">
                  Centro: {cardInfo.centro?.business_name}
                </p>
              </div>
            )}

            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-start gap-3">
                <Smartphone className="w-8 h-8 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-medium mb-1">Scarica l'App Android</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Scarica l'app per accedere a tutte le funzionalità della tessera: 
                    scanner malware, diagnostica dispositivo e molto altro.
                  </p>
                  <Button onClick={fetchLatestApk} disabled={loadingApk} className="w-full">
                    {loadingApk ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Download in corso...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Scarica App Android
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Riceverai una email con tutti i dettagli della tua tessera.
              </p>
              <Button variant="outline" onClick={() => navigate("/auth")}>
                Accedi al tuo Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
