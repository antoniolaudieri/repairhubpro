import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, 
  ChevronRight, 
  CreditCard, 
  Users, 
  Battery, 
  HardDrive, 
  Brain,
  AlertTriangle,
  RefreshCw,
  Euro,
  Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface Opportunity {
  type: string;
  label: string;
  icon: React.ElementType;
  count: number;
  estimatedValue: number;
  color: string;
  bgColor: string;
}

interface RevenueOpportunitiesWidgetProps {
  centroId: string;
}

const OPPORTUNITY_CONFIG: Record<string, { label: string; icon: React.ElementType; unitValue: number; color: string; bgColor: string }> = {
  expiring_loyalty: { label: "Tessere in scadenza", icon: CreditCard, unitValue: 30, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  inactive_high_value: { label: "Clienti inattivi", icon: Users, unitValue: 50, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  degraded_battery: { label: "Batterie degradate", icon: Battery, unitValue: 60, color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  critical_storage: { label: "Storage critici", icon: HardDrive, unitValue: 30, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30" },
  ai_maintenance: { label: "Manutenzioni AI", icon: Brain, unitValue: 40, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
  high_churn_risk: { label: "Rischio abbandono", icon: AlertTriangle, unitValue: 25, color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  expiring_devices: { label: "Dispositivi in scadenza", icon: Clock, unitValue: 45, color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-950/30" },
};

export function RevenueOpportunitiesWidget({ centroId }: RevenueOpportunitiesWidgetProps) {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    if (centroId) {
      loadOpportunities();
    }
  }, [centroId]);

  const loadOpportunities = async () => {
    setIsLoading(true);
    try {
      const results: Opportunity[] = [];

      // 1. Tessere fedeltà in scadenza (entro 30 giorni)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { count: expiringCards } = await supabase
        .from("loyalty_cards")
        .select("*", { count: "exact", head: true })
        .eq("centro_id", centroId)
        .eq("status", "active")
        .lte("expires_at", thirtyDaysFromNow.toISOString())
        .gte("expires_at", new Date().toISOString());

      if (expiringCards && expiringCards > 0) {
        const config = OPPORTUNITY_CONFIG.expiring_loyalty;
        results.push({
          type: "expiring_loyalty",
          label: config.label,
          icon: config.icon,
          count: expiringCards,
          estimatedValue: expiringCards * config.unitValue,
          color: config.color,
          bgColor: config.bgColor,
        });
      }

      // 2. Clienti inattivi ad alto valore (>90 giorni, ltv_score > 100)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const { count: inactiveHighValue } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("centro_id", centroId)
        .lt("last_interaction_at", ninetyDaysAgo.toISOString())
        .gt("ltv_score", 100);

      if (inactiveHighValue && inactiveHighValue > 0) {
        const config = OPPORTUNITY_CONFIG.inactive_high_value;
        results.push({
          type: "inactive_high_value",
          label: config.label,
          icon: config.icon,
          count: inactiveHighValue,
          estimatedValue: inactiveHighValue * config.unitValue,
          color: config.color,
          bgColor: config.bgColor,
        });
      }

      // 3. Batterie degradate (battery_health = 'poor' o battery_level < 30)
      const { count: degradedBatteries } = await supabase
        .from("device_health_readings")
        .select("*", { count: "exact", head: true })
        .eq("centro_id", centroId)
        .or("battery_health.eq.poor,battery_level.lt.30");

      if (degradedBatteries && degradedBatteries > 0) {
        const config = OPPORTUNITY_CONFIG.degraded_battery;
        results.push({
          type: "degraded_battery",
          label: config.label,
          icon: config.icon,
          count: degradedBatteries,
          estimatedValue: degradedBatteries * config.unitValue,
          color: config.color,
          bgColor: config.bgColor,
        });
      }

      // 4. Storage critici (>90%)
      const { count: criticalStorage } = await supabase
        .from("device_health_readings")
        .select("*", { count: "exact", head: true })
        .eq("centro_id", centroId)
        .gt("storage_percent_used", 90);

      if (criticalStorage && criticalStorage > 0) {
        const config = OPPORTUNITY_CONFIG.critical_storage;
        results.push({
          type: "critical_storage",
          label: config.label,
          icon: config.icon,
          count: criticalStorage,
          estimatedValue: criticalStorage * config.unitValue,
          color: config.color,
          bgColor: config.bgColor,
        });
      }

      // 5. Manutenzioni suggerite dall'AI
      const { count: aiMaintenances } = await supabase
        .from("maintenance_predictions")
        .select("*", { count: "exact", head: true })
        .eq("centro_id", centroId)
        .eq("status", "pending");

      if (aiMaintenances && aiMaintenances > 0) {
        const config = OPPORTUNITY_CONFIG.ai_maintenance;
        results.push({
          type: "ai_maintenance",
          label: config.label,
          icon: config.icon,
          count: aiMaintenances,
          estimatedValue: aiMaintenances * config.unitValue,
          color: config.color,
          bgColor: config.bgColor,
        });
      }

      // 6. Clienti ad alto rischio churn
      const { count: churnRisk } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("centro_id", centroId)
        .gt("churn_risk_score", 0.7);

      if (churnRisk && churnRisk > 0) {
        const config = OPPORTUNITY_CONFIG.high_churn_risk;
        results.push({
          type: "high_churn_risk",
          label: config.label,
          icon: config.icon,
          count: churnRisk,
          estimatedValue: churnRisk * config.unitValue,
          color: config.color,
          bgColor: config.bgColor,
        });
      }

      // 7. Dispositivi in scadenza (completati da >14 giorni, non ritirati)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      
      const { count: expiringDevices } = await supabase
        .from("repairs")
        .select("*, devices!inner(customer_id, customers!inner(centro_id))", { count: "exact", head: true })
        .eq("devices.customers.centro_id", centroId)
        .eq("status", "completed")
        .lt("updated_at", fourteenDaysAgo.toISOString());

      if (expiringDevices && expiringDevices > 0) {
        const config = OPPORTUNITY_CONFIG.expiring_devices;
        results.push({
          type: "expiring_devices",
          label: config.label,
          icon: config.icon,
          count: expiringDevices,
          estimatedValue: expiringDevices * config.unitValue,
          color: config.color,
          bgColor: config.bgColor,
        });
      }

      // Ordina per valore stimato decrescente
      results.sort((a, b) => b.estimatedValue - a.estimatedValue);
      
      setOpportunities(results);
      setTotalValue(results.reduce((sum, o) => sum + o.estimatedValue, 0));
    } catch (error) {
      console.error("Error loading opportunities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <TrendingUp className="h-4 w-4" />
            </div>
            <CardTitle className="text-base font-semibold">Opportunità Revenue</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={loadOpportunities}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/centro/opportunita")}
              className="h-7 text-xs gap-1"
            >
              Dettagli
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {totalValue > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Potenziale totale</span>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                <Euro className="h-4 w-4" />
                {totalValue.toLocaleString('it-IT')}
              </div>
            </div>
          </motion.div>
        )}

        {opportunities.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nessuna opportunità rilevata</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Ottimo! I tuoi clienti sono attivi</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {opportunities.slice(0, 5).map((opportunity, index) => {
                const Icon = opportunity.icon;
                return (
                  <motion.div
                    key={opportunity.type}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center justify-between p-3 rounded-xl ${opportunity.bgColor} cursor-pointer hover:scale-[1.02] transition-transform`}
                    onClick={() => navigate(`/centro/opportunita?type=${opportunity.type}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-background/80 ${opportunity.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{opportunity.label}</p>
                        <p className="text-xs text-muted-foreground">{opportunity.count} rilevati</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-semibold">
                      +€{opportunity.estimatedValue}
                    </Badge>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
