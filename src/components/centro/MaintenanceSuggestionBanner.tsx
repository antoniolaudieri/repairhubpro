import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface MaintenanceSuggestionBannerProps {
  customerId: string | null;
  customerName?: string;
}

export function MaintenanceSuggestionBanner({ 
  customerId, 
  customerName 
}: MaintenanceSuggestionBannerProps) {
  const [count, setCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!customerId) {
      setCount(0);
      return;
    }

    const loadSuggestions = async () => {
      const { count: suggestionCount, error } = await supabase
        .from("maintenance_predictions")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .in("status", ["pending", "notified"]);

      if (!error) {
        setCount(suggestionCount || 0);
      }
    };

    loadSuggestions();
    setDismissed(false);
  }, [customerId]);

  if (!customerId || count === 0 || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        <Alert className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">
              <strong>{customerName || "Questo cliente"}</strong> ha{" "}
              <strong className="text-primary">{count} manutenzioni suggerite</strong> dall'AI.
              Proponi durante il ritiro!
            </span>
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => navigate(`/centro/clienti/${customerId}`)}
              >
                Vedi dettagli
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setDismissed(true)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
}
