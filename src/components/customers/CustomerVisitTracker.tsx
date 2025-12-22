import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Clock, LogIn, LogOut, Timer, CalendarDays, Loader2 
} from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { it } from "date-fns/locale";

interface CustomerVisitTrackerProps {
  customerId: string;
  centroId: string;
  customerName: string;
}

interface Visit {
  id: string;
  check_in_at: string;
  check_out_at: string | null;
  duration_minutes: number | null;
  visit_type: string;
}

const VISIT_TYPES = [
  { value: "repair", label: "Riparazione" },
  { value: "pickup", label: "Ritiro" },
  { value: "inquiry", label: "Informazioni" },
  { value: "purchase", label: "Acquisto" },
  { value: "quote", label: "Preventivo" },
];

export function CustomerVisitTracker({ 
  customerId, 
  centroId, 
  customerName 
}: CustomerVisitTrackerProps) {
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [visitType, setVisitType] = useState("repair");

  useEffect(() => {
    fetchVisits();
  }, [customerId]);

  const fetchVisits = async () => {
    setLoading(true);
    try {
      // Check for active visit (no checkout)
      const { data: active } = await supabase
        .from("customer_visits")
        .select("*")
        .eq("customer_id", customerId)
        .is("check_out_at", null)
        .order("check_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setActiveVisit(active);

      // Get recent completed visits
      const { data: recent } = await supabase
        .from("customer_visits")
        .select("*")
        .eq("customer_id", customerId)
        .not("check_out_at", "is", null)
        .order("check_in_at", { ascending: false })
        .limit(5);

      setRecentVisits(recent || []);
    } catch (error) {
      console.error("Error fetching visits:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkIn = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from("customer_visits")
        .insert({
          customer_id: customerId,
          centro_id: centroId,
          visit_type: visitType,
        })
        .select()
        .single();

      if (error) throw error;
      
      setActiveVisit(data);
      toast.success(`${customerName} registrato in negozio`);
    } catch (error: any) {
      toast.error(error.message || "Errore durante il check-in");
    } finally {
      setActionLoading(false);
    }
  };

  const checkOut = async () => {
    if (!activeVisit) return;

    setActionLoading(true);
    try {
      const checkOutTime = new Date();
      const duration = differenceInMinutes(checkOutTime, new Date(activeVisit.check_in_at));

      const { error } = await supabase
        .from("customer_visits")
        .update({
          check_out_at: checkOutTime.toISOString(),
          duration_minutes: duration,
        })
        .eq("id", activeVisit.id);

      if (error) throw error;

      // Calculate and update avg visit duration in profile
      try {
        const { data: allVisits } = await supabase
          .from("customer_visits")
          .select("duration_minutes")
          .eq("customer_id", customerId)
          .not("duration_minutes", "is", null);

        if (allVisits && allVisits.length > 0) {
          const avgDuration = Math.round(
            allVisits.reduce((sum, v) => sum + (v.duration_minutes || 0), 0) / allVisits.length
          );
          await supabase
            .from("customer_profiles")
            .update({ avg_visit_duration_minutes: avgDuration })
            .eq("customer_id", customerId);
        }
      } catch (e) {
        // Ignore if profile doesn't exist
      }

      setActiveVisit(null);
      fetchVisits();
      toast.success(`${customerName} checkout completato (${duration} min)`);
    } catch (error: any) {
      toast.error(error.message || "Errore durante il checkout");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Presenza in Negozio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Visit */}
        {activeVisit ? (
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="text-sm font-medium text-accent">In negozio</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {VISIT_TYPES.find(t => t.value === activeVisit.visit_type)?.label || activeVisit.visit_type}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Check-in: {format(new Date(activeVisit.check_in_at), "HH:mm", { locale: it })}
              {" • "}
              Durata: {differenceInMinutes(new Date(), new Date(activeVisit.check_in_at))} min
            </p>
            <Button
              onClick={checkOut}
              disabled={actionLoading}
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
            >
              {actionLoading ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <LogOut className="h-3 w-3 mr-1" />
              )}
              Checkout
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Select value={visitType} onValueChange={setVisitType}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={checkIn}
              disabled={actionLoading}
              size="sm"
              className="w-full h-8 text-xs"
            >
              {actionLoading ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <LogIn className="h-3 w-3 mr-1" />
              )}
              Registra Check-in
            </Button>
          </div>
        )}

        {/* Recent Visits */}
        {recentVisits.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Visite Recenti</p>
            <div className="space-y-1.5">
              {recentVisits.map(visit => (
                <div 
                  key={visit.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3 w-3 text-muted-foreground" />
                    <span>{format(new Date(visit.check_in_at), "dd MMM HH:mm", { locale: it })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {VISIT_TYPES.find(t => t.value === visit.visit_type)?.label || visit.visit_type}
                    </Badge>
                    {visit.duration_minutes && (
                      <span className="text-muted-foreground flex items-center gap-0.5">
                        <Timer className="h-3 w-3" />
                        {visit.duration_minutes}m
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}