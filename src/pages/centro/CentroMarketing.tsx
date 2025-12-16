import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CentroLayout } from "@/layouts/CentroLayout";
import { LoyaltyProgramConfigurator } from "@/components/marketing/LoyaltyProgramConfigurator";
import { useLoyaltyProgramSettings } from "@/hooks/useLoyaltyProgramSettings";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, CreditCard, TrendingUp, Users, Euro, BarChart3, Mail, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LoyaltyStats {
  totalCards: number;
  activeCards: number;
  totalRevenue: number;
  thisMonthCards: number;
  avgDevicesUsed: number;
}

export default function CentroMarketing() {
  const { user } = useAuth();
  const { settings, loading, saving, saveSettings, centroId } = useLoyaltyProgramSettings();
  const [centroInfo, setCentroInfo] = useState<{ business_name: string; logo_url: string | null } | null>(null);
  const [stats, setStats] = useState<LoyaltyStats>({
    totalCards: 0,
    activeCards: 0,
    totalRevenue: 0,
    thisMonthCards: 0,
    avgDevicesUsed: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

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
          const thisMonthCards = cards.filter(c => 
            new Date(c.created_at) >= startOfMonth
          );
          const totalRevenue = cards
            .filter(c => c.status === 'active')
            .reduce((sum, c) => sum + (c.centro_revenue || 0), 0);
          const avgDevices = activeCards.length > 0
            ? activeCards.reduce((sum, c) => sum + (c.devices_used || 0), 0) / activeCards.length
            : 0;

          setStats({
            totalCards: cards.length,
            activeCards: activeCards.length,
            totalRevenue,
            thisMonthCards: thisMonthCards.length,
            avgDevicesUsed: avgDevices,
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
      <div className="space-y-6">
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
          <Badge variant={settings?.is_active ? "default" : "secondary"} className="text-sm">
            {settings?.is_active ? "Programma Attivo" : "Programma Disattivo"}
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Tessere Totali</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.totalCards}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Tessere Attive</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.activeCards}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Ricavo Netto</span>
              </div>
              <p className="text-2xl font-bold mt-1">€{stats.totalRevenue.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Questo Mese</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.thisMonthCards}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Media Dispositivi</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.avgDevicesUsed.toFixed(1)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="loyalty" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="loyalty" className="flex items-center gap-1">
              <CreditCard className="h-4 w-4" />
              Tessera Fedeltà
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-1" disabled>
              <Mail className="h-4 w-4" />
              Email
              <Badge variant="outline" className="ml-1 text-xs">Soon</Badge>
            </TabsTrigger>
            <TabsTrigger value="promos" className="flex items-center gap-1" disabled>
              <Tag className="h-4 w-4" />
              Promo
              <Badge variant="outline" className="ml-1 text-xs">Soon</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="loyalty" className="mt-6">
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

          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>Email Marketing</CardTitle>
                <CardDescription>Prossimamente: Campagne email automatiche e newsletter</CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>

          <TabsContent value="promos">
            <Card>
              <CardHeader>
                <CardTitle>Promozioni</CardTitle>
                <CardDescription>Prossimamente: Gestione offerte speciali e codici sconto</CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CentroLayout>
  );
}
