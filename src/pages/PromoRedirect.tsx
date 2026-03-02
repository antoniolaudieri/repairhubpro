import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Gift, CheckCircle, ExternalLink, Copy, Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const DESTINATION_URL = "https://ricondizionati.evolutionlevel.it";
const COUPON_CODE = "EVLZBANT";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function PromoRedirect() {
  const [searchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [redirectPaused, setRedirectPaused] = useState(false);
  const [tracked, setTracked] = useState(false);
  const [shared, setShared] = useState(false);
  const trackingId = searchParams.get("t");

  const trackCopy = useCallback(async () => {
    if (!trackingId || tracked) return;
    setTracked(true);
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/ricondizionati-track?a=copy&t=${trackingId}`);
    } catch { /* ignore */ }
  }, [trackingId, tracked]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(COUPON_CODE);
      setCopied(true);
      trackCopy();
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = COUPON_CODE;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (ok) { setCopied(true); trackCopy(); return true; }
      } catch { /* ignore */ }
    }
    return false;
  }, [trackCopy]);

  // Try auto-copy on mount
  useEffect(() => {
    copyToClipboard();
  }, [copyToClipboard]);

  // Redirect after delay, but pause if user hasn't copied yet
  useEffect(() => {
    const timer = setTimeout(() => {
      if (copied) {
        window.location.href = DESTINATION_URL;
      } else {
        setRedirectPaused(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleManualCopy = async () => {
    await copyToClipboard();
    setCopied(true);
    setTimeout(() => {
      window.location.href = DESTINATION_URL;
    }, 1000);
  };

  const handleShare = async () => {
    const shareData = {
      title: "🎁 Sconto 10€ su Ricondizionati Certificati!",
      text: `Usa il codice ${COUPON_CODE} al checkout su Evolution Level per ricevere subito 10€ di sconto sui ricondizionati certificati DEKA con 24 mesi di garanzia! Lo sconto è illimitato e senza scadenza. 🛒`,
      url: DESTINATION_URL,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShared(true);
      } else {
        // Fallback: copy share text
        await navigator.clipboard.writeText(
          `${shareData.text}\n\n👉 ${shareData.url}`
        );
        setShared(true);
      }
    } catch { /* user cancelled */ }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="text-center space-y-6 max-w-md w-full">
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
          <Gift className="h-10 w-10 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-foreground">
          🎉 Il tuo sconto è pronto!
        </h1>

        <div className="bg-card border rounded-xl p-6 shadow-lg space-y-3">
          {copied ? (
            <div className="flex items-center justify-center gap-2 text-primary">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Coupon copiato!</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Copia il codice prima di continuare</p>
          )}
          <div className="bg-muted rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Il tuo codice sconto</p>
            <p className="text-3xl font-mono font-bold tracking-widest text-foreground select-all">{COUPON_CODE}</p>
            <p className="text-sm text-primary font-semibold mt-1">-10€ sul tuo ordine</p>
          </div>

          {/* Explicit instructions */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg p-4 text-left">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-2">📋 Come utilizzare lo sconto:</p>
            <ol className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-decimal list-inside">
              <li>Apri il catalogo ricondizionati</li>
              <li>Scegli il dispositivo e aggiungilo al carrello</li>
              <li>Al checkout, inserisci il codice <strong className="font-mono text-sm">{COUPON_CODE}</strong></li>
              <li>Clicca <strong>"Applica"</strong> per ricevere subito <strong>10€ di sconto</strong></li>
            </ol>
          </div>

          {!copied && (
            <Button onClick={handleManualCopy} className="w-full gap-2" size="lg">
              <Copy className="h-4 w-4" />
              Copia Codice Sconto
            </Button>
          )}
        </div>

        {copied && !redirectPaused ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground animate-pulse">
            <ExternalLink className="h-4 w-4" />
            <p className="text-sm">Ti stiamo reindirizzando al negozio...</p>
          </div>
        ) : redirectPaused && !copied ? (
          <p className="text-sm text-muted-foreground">Copia il coupon, poi verrai reindirizzato automaticamente</p>
        ) : null}

        <a
          href={DESTINATION_URL}
          className="inline-block text-sm text-primary underline hover:text-primary/80"
        >
          Clicca qui se non vieni reindirizzato
        </a>

        {/* Share with friends section */}
        <div className="bg-card border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h3 className="font-bold text-foreground">Non ti interessa? Condividilo!</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Lo sconto è <strong className="text-foreground">illimitato e senza scadenza</strong>. 
            Condividilo con amici e familiari — anche chi lo riceve avrà lo stesso vantaggio e potrà 
            condividerlo a sua volta. <strong className="text-foreground">Più persone lo usano, più tutti risparmiano!</strong>
          </p>
          <Button
            variant="outline"
            onClick={handleShare}
            className="w-full gap-2 border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30"
          >
            <Share2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            {shared ? "✅ Condiviso!" : "Condividi con un Amico"}
          </Button>
        </div>
      </div>
    </div>
  );
}
