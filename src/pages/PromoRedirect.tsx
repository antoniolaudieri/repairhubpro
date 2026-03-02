import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Gift, CheckCircle, ExternalLink } from "lucide-react";

const DESTINATION_URL = "https://ricondizionati.evolutionlevel.it";
const COUPON_CODE = "EVLZBANT";

export default function PromoRedirect() {
  const [searchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const trackingId = searchParams.get("t");

  useEffect(() => {
    // Copy coupon to clipboard
    navigator.clipboard.writeText(COUPON_CODE).then(() => {
      setCopied(true);
    }).catch(() => {
      setCopied(true); // proceed anyway
    });

    // Redirect after 2.5 seconds
    const timer = setTimeout(() => {
      window.location.href = DESTINATION_URL;
    }, 2500);

    return () => clearTimeout(timer);
  }, [trackingId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
          <Gift className="h-10 w-10 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-foreground">
          🎉 Il tuo sconto è pronto!
        </h1>

        <div className="bg-card border rounded-xl p-6 shadow-lg space-y-3">
          <div className="flex items-center justify-center gap-2 text-primary">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">Coupon copiato negli appunti!</span>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Il tuo codice sconto</p>
            <p className="text-3xl font-mono font-bold tracking-widest text-foreground">{COUPON_CODE}</p>
            <p className="text-sm text-primary font-semibold mt-1">-10€ sul tuo ordine</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-muted-foreground animate-pulse">
          <ExternalLink className="h-4 w-4" />
          <p className="text-sm">Ti stiamo reindirizzando al negozio...</p>
        </div>

        <a
          href={DESTINATION_URL}
          className="inline-block text-sm text-primary underline hover:text-primary/80"
        >
          Clicca qui se non vieni reindirizzato
        </a>
      </div>
    </div>
  );
}
