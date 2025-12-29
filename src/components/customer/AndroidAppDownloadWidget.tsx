import { motion } from "framer-motion";
import {
  Smartphone,
  Download,
  Shield,
  Battery,
  Cpu,
  CheckCircle,
  Star,
  Gift,
  Clock,
  Sparkles,
  BadgeCheck,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AndroidAppDownloadWidgetProps {
  hasActiveCard: boolean;
  onActivateCard?: () => void;
  loyaltyPrice?: number;
  apkDownloadUrl?: string;
}

export const AndroidAppDownloadWidget = ({
  hasActiveCard,
  onActivateCard,
  loyaltyPrice = 9.99,
  apkDownloadUrl = "#",
}: AndroidAppDownloadWidgetProps) => {
  const handleDownload = () => {
    if (apkDownloadUrl && apkDownloadUrl !== "#") {
      window.open(apkDownloadUrl, "_blank");
    } else {
      console.log("APK download triggered");
    }
  };

  // Premium widget for customers WITH active loyalty card
  if (hasActiveCard) {
    return (
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500/20 via-green-500/15 to-teal-500/10">
        <CardContent className="p-5">
          {/* Badge incluso nella tessera */}
          <div className="absolute top-3 right-3">
            <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 gap-1">
              <BadgeCheck className="h-3 w-3" />
              Incluso nella Tessera
            </Badge>
          </div>

          <div className="flex items-start gap-4">
            {/* Animated Android Icon */}
            <motion.div
              className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg"
              animate={{ 
                y: [0, -5, 0],
                scale: [1, 1.02, 1],
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <Smartphone className="h-10 w-10 text-white" />
              <motion.div
                className="absolute inset-0 rounded-2xl bg-white/20"
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>

            <div className="flex-1 pt-6">
              <h3 className="text-lg font-bold mb-1">
                App di Diagnosi Premium
              </h3>
              <p className="text-sm text-muted-foreground">
                Monitora la salute del tuo dispositivo
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            {[
              { icon: Shield, label: "Scanner Malware", color: "text-red-500" },
              { icon: Battery, label: "Stato Batteria", color: "text-yellow-500" },
              { icon: Cpu, label: "Test Hardware", color: "text-blue-500" },
              { icon: Activity, label: "Monitoraggio Salute", color: "text-green-500" },
            ].map((feature, i) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-2 p-2 bg-background/60 rounded-xl"
              >
                <feature.icon className={`h-4 w-4 ${feature.color}`} />
                <span className="text-xs font-medium">{feature.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Download Button */}
          <Button
            onClick={handleDownload}
            className="w-full mt-4 h-12 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg"
          >
            <Download className="h-5 w-5 mr-2" />
            Scarica l'App Android
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-2">
            Compatibile con Android 8.0+
          </p>
        </CardContent>
      </Card>
    );
  }

  // Proposal widget for customers WITHOUT loyalty card
  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500/20 via-pink-500/15 to-orange-500/10">
      <CardContent className="p-5">
        {/* Decorative Elements */}
        <motion.div
          className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/20 blur-2xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        <div className="flex items-start gap-4 mb-4">
          {/* Gift Icon */}
          <motion.div
            className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Gift className="h-8 w-8 text-white" />
          </motion.div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                Offerta Esclusiva
              </span>
            </div>
            <h3 className="text-lg font-bold">
              Attiva la Tessera Fedeltà
            </h3>
            <p className="text-sm text-muted-foreground">
              Sblocca funzionalità premium
            </p>
          </div>
        </div>

        {/* Benefits List */}
        <div className="space-y-2 mb-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Vantaggi inclusi:
          </h4>
          
          {[
            { icon: Shield, text: "Scanner Malware e Spyware avanzato" },
            { icon: Cpu, text: "Test completo componenti hardware" },
            { icon: Activity, text: "Monitoraggio salute dispositivo 24/7" },
            { icon: Star, text: "Sconto 10% su tutte le riparazioni" },
            { icon: Clock, text: "Priorità nelle code di riparazione" },
            { icon: CheckCircle, text: "Prenotazione checkup diretta dall'app" },
          ].map((benefit, i) => (
            <motion.div
              key={benefit.text}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 p-2 bg-background/60 rounded-xl"
            >
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <benefit.icon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm">{benefit.text}</span>
            </motion.div>
          ))}
        </div>

        {/* Price and CTA */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Tessera Annuale</span>
            <div className="text-right">
              <span className="text-2xl font-bold">€{loyaltyPrice.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground">/anno</span>
            </div>
          </div>
          
          <Button
            onClick={onActivateCard}
            className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg"
          >
            <Star className="h-5 w-5 mr-2" />
            Attiva Ora
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Smartphone className="h-3 w-3" />
          <span>Include accesso completo all'App Android</span>
        </div>
      </CardContent>
    </Card>
  );
};
