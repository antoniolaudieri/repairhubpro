import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PenTool, FileText, ArrowRight, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PendingQuote {
  id: string;
  total_cost: number;
  customer: {
    name: string;
  };
  repair_request: {
    id: string;
    device_type: string;
    device_brand: string | null;
    device_model: string | null;
  };
}

export function PendingQuotesBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingQuotes, setPendingQuotes] = useState<PendingQuote[]>([]);
  const [cornerId, setCornerId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchCornerAndQuotes = async () => {
      // Get corner ID
      const { data: corner } = await supabase
        .from("corners")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!corner) return;
      setCornerId(corner.id);

      // Fetch pending quotes for this corner's repair requests
      const { data: quotes, error } = await supabase
        .from("quotes")
        .select(`
          id,
          total_cost,
          status,
          signature_data,
          customer:customers(name),
          repair_request:repair_requests!inner(
            id,
            device_type,
            device_brand,
            device_model,
            corner_id
          )
        `)
        .eq("status", "pending")
        .is("signature_data", null);

      console.log("PendingQuotesBanner - Raw quotes:", quotes, "Error:", error);

      // Filter for this corner's quotes client-side (more reliable)
      const filteredQuotes = (quotes || []).filter(
        (q: any) => q.repair_request?.corner_id === corner.id
      );
      
      console.log("PendingQuotesBanner - Filtered for corner:", corner.id, filteredQuotes);

      setPendingQuotes(filteredQuotes as unknown as PendingQuote[]);
    };

    fetchCornerAndQuotes();

    // Subscribe to quote changes
    const channel = supabase
      .channel("corner-pending-quotes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quotes",
        },
        () => {
          fetchCornerAndQuotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (pendingQuotes.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Card className="border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 p-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-amber-500/20 animate-pulse">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">Preventivi da Far Firmare</h3>
                <Badge variant="destructive" className="animate-pulse">
                  {pendingQuotes.length}
                </Badge>
              </div>
              
              <p className="text-muted-foreground text-sm mb-4">
                Ci sono preventivi in attesa della firma del cliente. Fai firmare il cliente mentre è ancora presente!
              </p>

              <div className="space-y-2">
                {pendingQuotes.slice(0, 3).map((quote) => (
                  <div
                    key={quote.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{quote.customer?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {quote.repair_request?.device_brand} {quote.repair_request?.device_model} - €{quote.total_cost?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-500/50">
                      <PenTool className="h-3 w-3 mr-1" />
                      Da firmare
                    </Badge>
                  </div>
                ))}
                
                {pendingQuotes.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    e altri {pendingQuotes.length - 3} preventivi...
                  </p>
                )}
              </div>

              <Button
                onClick={() => navigate("/corner/segnalazioni")}
                className="mt-4 w-full sm:w-auto"
                variant="default"
              >
                <PenTool className="h-4 w-4 mr-2" />
                Vai alle Segnalazioni
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
