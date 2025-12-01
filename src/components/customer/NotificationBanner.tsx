import { motion } from "framer-motion";
import { AlertCircle, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface NotificationBannerProps {
  repair: {
    id: string;
    final_cost: number;
    device: {
      brand: string;
      model: string;
    };
  };
  onAccept: () => void;
}

export function NotificationBanner({ repair, onAccept }: NotificationBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <Card className="p-6 bg-gradient-to-br from-accent/20 via-primary/10 to-accent/20 border-2 border-accent/40 shadow-lg relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 animate-gradient-x" />
        
        <div className="relative z-10 flex items-start gap-4">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1
            }}
            className="flex-shrink-0"
          >
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
          </motion.div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-semibold uppercase tracking-wide">
                  <span className="h-2 w-2 bg-accent rounded-full animate-pulse" />
                  Richiesta Azione
                </span>
              </motion.div>
            </div>

            <h3 className="text-xl font-bold text-foreground">
              Costo Finale Disponibile
            </h3>
            
            <p className="text-muted-foreground">
              Il costo finale per la riparazione del tuo{" "}
              <span className="font-semibold text-foreground">
                {repair.device.brand} {repair.device.model}
              </span>{" "}
              è stato determinato. È necessaria la tua approvazione per procedere.
            </p>

            <div className="flex items-center gap-4 pt-2">
              <div className="text-3xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                €{repair.final_cost.toFixed(2)}
              </div>
              
              <Button
                onClick={onAccept}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg"
                size="lg"
              >
                <FileSignature className="mr-2 h-5 w-5" />
                Visualizza e Accetta
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
