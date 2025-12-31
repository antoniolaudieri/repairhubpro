import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CentroLayout } from "@/layouts/CentroLayout";
import { LoyaltyProgramConfigurator } from "@/components/marketing/LoyaltyProgramConfigurator";
import { ActiveLoyaltyCardsList } from "@/components/marketing/ActiveLoyaltyCardsList";
import { LoyaltyEmailCampaign } from "@/components/marketing/LoyaltyEmailCampaign";
import { EmailCampaignAnalytics } from "@/components/marketing/EmailCampaignAnalytics";
import { PromoManager } from "@/components/marketing/PromoManager";
import WhatsAppCampaign from "@/components/marketing/WhatsAppCampaign";
import { useLoyaltyProgramSettings } from "@/hooks/useLoyaltyProgramSettings";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, CreditCard, TrendingUp, Users, Euro, BarChart3, Mail, Tag, Settings, UserCheck, Send, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LoyaltyStats {
  totalCards: number;
  activeCards: number;
  expiredCards: number;
  totalRevenue: number;
  thisMonthCards: number;
  avgDevicesUsed: number;
  totalSavings: number;
}

export default function CentroMarketing() {
  const { user } = useAuth();
  const { settings, loading, saving, saveSettings, centroId, getEffectiveSettings } = useLoyaltyProgramSettings();
  const [centroInfo, setCentroInfo] = useState<{ business_name: string; logo_url: string | null } | null>(null);
  const [stats, setStats] = useState<LoyaltyStats>({
    totalCards: 0,
    activeCards: 0,
    expiredCards: 0,
    totalRevenue: 0,
    thisMonthCards: 0,
    avgDevicesUsed: 0,
    totalSavings: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [loyaltyTab, setLoyaltyTab] = useState("config");
  const [emailTab, setEmailTab] = useState("send");

  const effectiveSettings = getEffectiveSettings();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch centro info
      const { data: centro } = await supabase
        .from("centri_assistenza")
        .select("id, business_name, logo_url")
        .eq("owner_user_id", user.id)
        .single();

      if (centro) {
        setCentroInfo(centro);

        // Fetch loyalty stats
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: cards } = await supabase
          .from("loyalty_cards")
          .select("*")
          .eq("centro_id", centro.id);

        if (cards) {
          const activeCards = cards.filter(c => c.status === 'active');
          const expiredCards = cards.filter(c => c.status === 'expired');
          const thisMonthCards = activeCards.filter(c => 
            new Date(c.activated_at || c.created_at) >= startOfMonth
          );
          const totalRevenue = cards
            .filter(c => ['active', 'expired'].includes(c.status))
            .reduce((sum, c) => sum + (c.centro_revenue || 0), 0);
          const avgDevices = activeCards.length > 0
            ? activeCards.reduce((sum, c) => sum + (c.devices_used || 0), 0) / activeCards.length
            : 0;

          // Fetch savings from loyalty_card_usages
          const { data: usages } = await supabase
            .from("loyalty_card_usages")
            .select("savings")
            .in("loyalty_card_id", cards.map(c => c.id));
          
          const totalSavings = usages?.reduce((sum, u) => sum + (u.savings || 0), 0) || 0;

          setStats({
            totalCards: activeCards.length + expiredCards.length, // Only count activated cards
            activeCards: activeCards.length,
            expiredCards: expiredCards.length,
            totalRevenue,
            thisMonthCards: thisMonthCards.length,
            avgDevicesUsed: avgDevices,
            totalSavings,
          });
        }
      }
      setLoadingStats(false);
    };

    fetchData();
  }, [user]);

  if (loading || loadingStats) {
    return (
      <CentroLayout>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </CentroLayout>
    );
  }

  return (
    <CentroLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-primary" />
              Marketing
            </h1>
            <p className="text-muted-foreground">
              Gestisci programmi fedeltà e promozioni
            </p>
          </div>
          <Badge variant={effectiveSettings.is_active ? "default" : "secondary"} className="text-sm">
            {effectiveSettings.is_active ? "Programma Attivo" : "Programma Disattivo"}
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/20">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Attive</span>
              </div>
              <p className="text-2xl font-bold mt-2">{stats.activeCards}</p>
              <p className="text-xs text-muted-foreground">tessere attive</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20">
                  <Euro className="h-4 w-4 text-amber-500" />
                </div>
                <span className="text-xs text-muted-foreground">Ricavi</span>
              </div>
              <p className="text-2xl font-bold mt-2">€{stats.totalRevenue.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">ricavo netto</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-green-500/20">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <span className="text-xs text-muted-foreground">Mese</span>
              </div>
              <p className="text-2xl font-bold mt-2">{stats.thisMonthCards}</p>
              <p className="text-xs text-muted-foreground">nuove questo mese</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/20">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                </div>
                <span className="text-xs text-muted-foreground">Utilizzo</span>
              </div>
              <p className="text-2xl font-bold mt-2">{stats.avgDevicesUsed.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">dispositivi medi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/20">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                </div>
                <span className="text-xs text-muted-foreground">Storico</span>
              </div>
              <p className="text-2xl font-bold mt-2">{stats.totalCards}</p>
              <p className="text-xs text-muted-foreground">tessere emesse</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-500/20">
                  <Tag className="h-4 w-4 text-rose-500" />
                </div>
                <span className="text-xs text-muted-foreground">Risparmi</span>
              </div>
              <p className="text-2xl font-bold mt-2">€{stats.totalSavings.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">risparmiati dai clienti</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="loyalty" className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            <TabsTrigger value="loyalty" className="flex items-center gap-1">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Fedeltà</span>
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger value="promos" className="flex items-center gap-1">
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">Promo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="loyalty" className="mt-6">
            {/* Sub-tabs for Loyalty */}
            <Tabs value={loyaltyTab} onValueChange={setLoyaltyTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="config" className="flex items-center gap-1">
                  <Settings className="h-4 w-4" />
                  Configurazione
                </TabsTrigger>
                <TabsTrigger value="members" className="flex items-center gap-1">
                  <UserCheck className="h-4 w-4" />
                  Membri Attivi
                  {stats.activeCards > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">{stats.activeCards}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="config">
                {centroInfo && (
                  <LoyaltyProgramConfigurator
                    settings={settings}
                    centroName={centroInfo.business_name}
                    centroLogo={centroInfo.logo_url}
                    onSave={saveSettings}
                    saving={saving}
                  />
                )}
              </TabsContent>

              <TabsContent value="members">
                <ActiveLoyaltyCardsList centroId={centroId} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-6">
            <WhatsAppCampaign />
          </TabsContent>

          <TabsContent value="email" className="mt-6">
            {/* Sub-tabs for Email */}
            <Tabs value={emailTab} onValueChange={setEmailTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="send" className="flex items-center gap-1">
                  <Send className="h-4 w-4" />
                  Invia Email
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="send">
                {centroInfo && (
                  <LoyaltyEmailCampaign
                    centroId={centroId}
                    centroName={centroInfo.business_name}
                    settings={settings}
                  />
                )}
              </TabsContent>

              <TabsContent value="analytics">
                <EmailCampaignAnalytics centroId={centroId} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="promos" className="mt-6">
            <PromoManager centroId={centroId} />
          </TabsContent>
        </Tabs>
      </div>
    </CentroLayout>
  );
}
