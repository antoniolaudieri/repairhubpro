import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Copy,
  Check,
  Tag,
  Gift,
  ShieldCheck,
  ExternalLink,
  Sparkles,
} from "lucide-react";

const COUPON_CODE = "EVLZBANT";
const BASE_URL = "https://ricondizionati.evolutionlevel.it";

export function RicondizionatiSection() {
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  const handleCopyCoupon = async () => {
    try {
      await navigator.clipboard.writeText(COUPON_CODE);
      setCopiedCoupon(true);
      toast({ title: "Coupon copiato!", description: `Codice ${COUPON_CODE} copiato negli appunti` });
      setTimeout(() => setCopiedCoupon(false), 2000);
    } catch {
      toast({ title: "Copia il codice manualmente", description: COUPON_CODE, variant: "destructive" });
    }
  };

  const handleOpenShop = async () => {
    try {
      await supabase.from("affiliate_clicks" as any).insert({
        affiliate_program: "evolution_level",
        coupon_code: COUPON_CODE,
        category_clicked: "catalogo_completo",
        destination_url: BASE_URL,
        user_agent: navigator.userAgent,
      });
    } catch (e) {
      console.error("Click tracking error:", e);
    }
    window.open(BASE_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-8">
      {/* Coupon Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="overflow-hidden border-primary/30 bg-gradient-to-r from-primary/10 via-card to-primary/5">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-lg opacity-40" />
                  <div className="relative p-4 bg-gradient-primary rounded-2xl">
                    <Gift className="h-10 w-10 text-primary-foreground" />
                  </div>
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl font-bold mb-1 text-foreground">
                  Sconto Esclusivo di €10!
                </h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Usa il codice coupon al checkout su Evolution Level per ottenere
                  subito <strong className="text-primary">€10 di sconto</strong> sul tuo ricondizionato.
                </p>
                <div className="flex items-center gap-3 justify-center sm:justify-start">
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted border-2 border-dashed border-primary/40">
                    <Tag className="h-4 w-4 text-primary" />
                    <span className="font-mono font-bold text-lg tracking-wider text-foreground">
                      {COUPON_CODE}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCoupon}
                    className="gap-2 rounded-xl border-primary/30 hover:bg-primary/10"
                  >
                    {copiedCoupon ? (
                      <>
                        <Check className="h-4 w-4 text-success" />
                        Copiato!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copia
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="hidden lg:flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  Garanzia 12 mesi
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  Spedizione gratuita
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  Reso 14 giorni
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Big CTA to open shop */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="flex flex-col items-center gap-4"
      >
        <Button
          size="lg"
          onClick={handleOpenShop}
          className="gap-3 text-lg px-8 py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
        >
          <Sparkles className="h-5 w-5" />
          Sfoglia il Catalogo Ricondizionati
          <ExternalLink className="h-5 w-5" />
        </Button>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Verrai reindirizzato al sito Evolution Level. Ricorda di applicare il coupon <strong className="text-primary">{COUPON_CODE}</strong> al carrello per lo sconto di €10!
        </p>
      </motion.div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-border/30 bg-muted/30">
          <CardContent className="p-6">
            <h3 className="font-bold text-foreground mb-4 text-center">Come funziona?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: "1", title: "Scegli il prodotto", desc: "Sfoglia il catalogo e trova il ricondizionato perfetto per te" },
                { step: "2", title: "Applica il coupon", desc: `Inserisci il codice ${COUPON_CODE} al checkout per lo sconto di €10` },
                { step: "3", title: "Ricevi a casa", desc: "Spedizione veloce con garanzia 12 mesi inclusa" },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary text-primary-foreground font-bold flex items-center justify-center mx-auto mb-3 text-lg">
                    {item.step}
                  </div>
                  <h4 className="font-semibold text-sm mb-1 text-foreground">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
