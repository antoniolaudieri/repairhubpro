import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, MousePointer, ShoppingCart, TrendingUp, Mail, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface EmailClick {
  id: string;
  customer_id: string;
  campaign_type: string;
  email_template: string;
  created_at: string;
  clicked_at: string | null;
  converted: boolean;
  converted_at: string | null;
  customer?: {
    name: string;
    email: string | null;
  };
}

interface CampaignStats {
  totalSent: number;
  totalClicked: number;
  totalConverted: number;
  clickRate: number;
  conversionRate: number;
}

interface EmailCampaignAnalyticsProps {
  centroId: string | null;
}

export function EmailCampaignAnalytics({ centroId }: EmailCampaignAnalyticsProps) {
  const [clicks, setClicks] = useState<EmailClick[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CampaignStats>({
    totalSent: 0,
    totalClicked: 0,
    totalConverted: 0,
    clickRate: 0,
    conversionRate: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!centroId) return;
      setLoading(true);

      const { data, error } = await supabase
        .from("email_campaign_clicks")
        .select(`
          *,
          customer:customers(name, email)
        `)
        .eq("centro_id", centroId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching campaign analytics:", error);
        setLoading(false);
        return;
      }

      const emailClicks = (data || []) as EmailClick[];
      setClicks(emailClicks);

      // Calculate stats
      const totalSent = emailClicks.length;
      const totalClicked = emailClicks.filter(c => c.clicked_at).length;
      const totalConverted = emailClicks.filter(c => c.converted).length;

      setStats({
        totalSent,
        totalClicked,
        totalConverted,
        clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
        conversionRate: totalClicked > 0 ? (totalConverted / totalClicked) * 100 : 0,
      });

      setLoading(false);
    };

    fetchData();
  }, [centroId]);

  const getTemplateLabel = (template: string) => {
    const labels: Record<string, string> = {
      diagnosis: "📱 Diagnosi",
      friendly: "💝 Amichevole",
      urgency: "⚡ Urgenza",
      value: "💰 Valore",
      exclusive: "⭐ Esclusività",
      prevention: "🛡️ Prevenzione",
      custom: "✏️ Personalizzato",
    };
    return labels[template] || template;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/20">
                <Mail className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-xs text-muted-foreground">Inviate</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.totalSent}</p>
            <p className="text-xs text-muted-foreground">email totali</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20">
                <MousePointer className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-xs text-muted-foreground">Click</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.totalClicked}</p>
            <p className="text-xs text-muted-foreground">{stats.clickRate.toFixed(1)}% tasso click</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-500/20">
                <ShoppingCart className="h-4 w-4 text-green-500" />
              </div>
              <span className="text-xs text-muted-foreground">Conversioni</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.totalConverted}</p>
            <p className="text-xs text-muted-foreground">acquisti completati</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/20">
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </div>
              <span className="text-xs text-muted-foreground">Conv. Rate</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.conversionRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">click → acquisto</p>
          </CardContent>
        </Card>
      </div>

      {/* Clicks List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Dettaglio Campagne
          </CardTitle>
          <CardDescription>
            Storico email inviate e interazioni
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clicks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nessuna campagna email ancora inviata</p>
              <p className="text-sm">Invia la tua prima email dalla tab "Invia Email"</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clicks.map((click) => (
                <div
                  key={click.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{click.customer?.name || "Cliente"}</span>
                      <span className="text-xs text-muted-foreground">{click.customer?.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getTemplateLabel(click.email_template)}
                    </Badge>

                    {click.converted ? (
                      <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Acquistato
                      </Badge>
                    ) : click.clicked_at ? (
                      <Badge variant="secondary" className="bg-amber-500/20 text-amber-700">
                        <MousePointer className="h-3 w-3 mr-1" />
                        Click
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-muted-foreground">
                        Inviata
                      </Badge>
                    )}

                    <span className="text-xs text-muted-foreground ml-2">
                      {format(new Date(click.created_at), "dd MMM", { locale: it })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
