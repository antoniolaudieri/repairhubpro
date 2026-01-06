import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, TrendingUp, ArrowRight, ChevronRight, Loader2 
} from "lucide-react";

type FunnelStage = {
  id: string;
  name: string;
  description: string | null;
  stage_order: number;
  color: string;
  auto_advance_after_days: number | null;
  auto_advance_condition: string | null;
  leadCount?: number;
};

export function FunnelTab() {
  // Fetch funnel stages
  const { data: stages = [], isLoading: stagesLoading } = useQuery({
    queryKey: ["marketing-funnel-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_funnel_stages")
        .select("*")
        .order("stage_order");
      if (error) throw error;
      return data as FunnelStage[];
    },
  });

  // Fetch leads count by funnel stage
  const { data: leadCounts = {} } = useQuery({
    queryKey: ["marketing-leads-by-funnel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_leads")
        .select("funnel_stage_id");
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(lead => {
        if (lead.funnel_stage_id) {
          counts[lead.funnel_stage_id] = (counts[lead.funnel_stage_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  // Total leads for percentage calculation
  const totalLeads = Object.values(leadCounts).reduce((sum, count) => sum + count, 0);

  // Calculate conversion rates
  const stagesWithData = stages.map((stage, index) => {
    const count = leadCounts[stage.id] || 0;
    const previousCount = index > 0 ? (leadCounts[stages[index - 1].id] || 0) : count;
    const conversionRate = previousCount > 0 ? (count / previousCount) * 100 : 0;
    return {
      ...stage,
      leadCount: count,
      percentage: totalLeads > 0 ? (count / totalLeads) * 100 : 0,
      conversionRate: index > 0 ? conversionRate : 100,
    };
  });

  if (stagesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Funnel di Conversione</h2>
        <p className="text-sm text-muted-foreground">
          Visualizza il percorso dei lead attraverso gli stadi del funnel
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-sm text-muted-foreground">Lead totali nel funnel</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {stagesWithData.find(s => s.name === "Converted")?.leadCount || 0}
            </div>
            <p className="text-sm text-muted-foreground">Conversioni totali</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">
              {totalLeads > 0 
                ? ((stagesWithData.find(s => s.name === "Converted")?.leadCount || 0) / totalLeads * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-sm text-muted-foreground">Tasso conversione globale</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {stages.length}
            </div>
            <p className="text-sm text-muted-foreground">Stadi del funnel</p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Funnel Visuale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stagesWithData.map((stage, index) => (
              <div key={stage.id} className="relative">
                {/* Connection Arrow */}
                {index > 0 && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <ChevronRight className="h-5 w-5 text-muted-foreground rotate-90" />
                  </div>
                )}
                
                {/* Stage Card */}
                <div 
                  className="relative overflow-hidden rounded-lg border p-4"
                  style={{ 
                    borderLeftWidth: "4px",
                    borderLeftColor: stage.color 
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-10 w-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${stage.color}20` }}
                      >
                        <Users className="h-5 w-5" style={{ color: stage.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{stage.name}</h3>
                        {stage.description && (
                          <p className="text-sm text-muted-foreground">{stage.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{stage.leadCount}</div>
                      <p className="text-sm text-muted-foreground">
                        {stage.percentage.toFixed(1)}% del totale
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <Progress 
                    value={stage.percentage} 
                    className="h-2"
                    style={{ 
                      "--progress-background": stage.color 
                    } as React.CSSProperties}
                  />

                  {/* Conversion Rate Badge */}
                  {index > 0 && (
                    <div className="absolute top-2 right-2">
                      <Badge 
                        variant={stage.conversionRate >= 50 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {stage.conversionRate.toFixed(0)}% conversione
                      </Badge>
                    </div>
                  )}

                  {/* Auto-advance info */}
                  {stage.auto_advance_after_days && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Avanzamento automatico dopo {stage.auto_advance_after_days} giorni
                      {stage.auto_advance_condition && ` (condizione: ${stage.auto_advance_condition})`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Funnel Stages Detail */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stagesWithData.map((stage) => (
          <Card key={stage.id}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <h3 className="font-medium">{stage.name}</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lead</span>
                  <span className="font-medium">{stage.leadCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">% del totale</span>
                  <span className="font-medium">{stage.percentage.toFixed(1)}%</span>
                </div>
                {stage.auto_advance_after_days && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Auto-avanza</span>
                    <span className="font-medium">{stage.auto_advance_after_days}g</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
