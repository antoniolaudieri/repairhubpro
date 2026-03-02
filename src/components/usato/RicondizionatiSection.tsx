import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Smartphone,
  Tablet,
  Laptop,
  Gamepad2,
  Watch,
  Headphones,
  ExternalLink,
  Copy,
  Check,
  Tag,
  Gift,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Truck,
  ClipboardCheck,
} from "lucide-react";

const COUPON_CODE = "EVLZBANT";
const BASE_URL = "https://ricondizionati.evolutionlevel.it";

const categories = [
  {
    id: "iphone",
    label: "iPhone",
    icon: Smartphone,
    url: `${BASE_URL}/collections/iphone`,
    description: "iPhone ricondizionati certificati Deka",
    color: "from-slate-600 to-slate-800",
  },
  {
    id: "samsung",
    label: "Samsung Galaxy",
    icon: Smartphone,
    url: `${BASE_URL}/collections/samsung`,
    description: "Galaxy S e A Series ricondizionati",
    color: "from-blue-600 to-blue-800",
  },
  {
    id: "ipad",
    label: "iPad",
    icon: Tablet,
    url: `${BASE_URL}/collections/ipad`,
    description: "iPad ricondizionati per ogni esigenza",
    color: "from-gray-600 to-gray-800",
  },
  {
    id: "macbook",
    label: "MacBook",
    icon: Laptop,
    url: `${BASE_URL}/collections/macbook`,
    description: "MacBook Air e Pro ricondizionati",
    color: "from-zinc-600 to-zinc-800",
  },
  {
    id: "console",
    label: "Console",
    icon: Gamepad2,
    url: `${BASE_URL}/collections/console`,
    description: "PlayStation, Xbox, Nintendo ricondizionate",
    color: "from-indigo-600 to-indigo-800",
  },
  {
    id: "smartwatch",
    label: "Smartwatch",
    icon: Watch,
    url: `${BASE_URL}/collections/smartwatch`,
    description: "Apple Watch e smartwatch ricondizionati",
    color: "from-emerald-600 to-emerald-800",
  },
  {
    id: "airpods",
    label: "AirPods & Audio",
    icon: Headphones,
    url: `${BASE_URL}/collections/airpods`,
    description: "AirPods e cuffie ricondizionate",
    color: "from-violet-600 to-violet-800",
  },
  {
    id: "tutti",
    label: "Tutti i Prodotti",
    icon: Sparkles,
    url: BASE_URL,
    description: "Scopri l'intero catalogo ricondizionati",
    color: "from-primary to-primary/80",
  },
];

const guarantees = [
  {
    icon: ShieldCheck,
    title: "Garanzia 24 Mesi",
    desc: "Copertura completa per 2 anni su ogni dispositivo",
  },
  {
    icon: ClipboardCheck,
    title: "56 Controlli Deka",
    desc: "Ogni dispositivo supera 56 test di qualità certificati",
  },
  {
    icon: Truck,
    title: "Spedizione Gratuita",
    desc: "Consegna rapida senza costi aggiuntivi",
  },
  {
    icon: RefreshCw,
    title: "Sostituzione Diretta",
    desc: "In caso di problemi, sostituzione immediata nei 24 mesi",
  },
];

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
      await navigator.clipboard.writeText(COUPON_CODE);
      toast({
        title: "✅ Coupon EVLZBANT copiato!",
        description: "Ricordati di incollarlo al carrello per ottenere €10 di sconto",
      });
    } catch {
      toast({
        title: "Codice sconto: EVLZBANT",
        description: "Copialo e incollalo al carrello per €10 di sconto",
        variant: "destructive",
      });
    }
    try {
      await supabase.from("affiliate_clicks" as any).insert({
        affiliate_program: "evolution_level",
        coupon_code: COUPON_CODE,
        category_clicked: "shop_cta",
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
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Guarantees Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {guarantees.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
          >
            <Card className="h-full border-border/50 bg-card hover:border-primary/30 transition-colors">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-bold text-sm text-foreground">{item.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-center"
      >
        <Button
          size="lg"
          onClick={handleOpenShop}
          className="gap-3 text-lg px-10 py-7 rounded-2xl bg-gradient-primary hover:opacity-90 shadow-lg"
        >
          <ExternalLink className="h-6 w-6" />
          Apri il Catalogo Ricondizionati
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          Il coupon <strong>EVLZBANT</strong> verrà copiato automaticamente nei tuoi appunti
        </p>
      </motion.div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="border-border/30 bg-muted/30">
          <CardContent className="p-6">
            <h3 className="font-bold text-foreground mb-4 text-center">Come funziona?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: "1", title: "Clicca il pulsante", desc: "Premi 'Apri il Catalogo' e il coupon viene copiato in automatico" },
                { step: "2", title: "Scegli il prodotto", desc: "Sfoglia il catalogo e aggiungi al carrello il ricondizionato che preferisci" },
                { step: "3", title: "Incolla il coupon", desc: `Al checkout incolla il codice ${COUPON_CODE} per ottenere subito €10 di sconto` },
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
