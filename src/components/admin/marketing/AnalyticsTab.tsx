import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { 
  TrendingUp, Users, Mail, Target, MapPin, Loader2, 
  Calendar, ArrowUpRight, ArrowDownRight 
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { it } from "date-fns/locale";

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function AnalyticsTab() {
  // Fetch leads stats over time
  const { data: leadStats, isLoading: leadsLoading } = useQuery({
    queryKey: ["marketing-analytics-leads"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data, error } = await supabase
        .from("marketing_leads")
        .select("created_at, source, status, business_type")
        .gte("created_at", thirtyDaysAgo.toISOString());
      if (error) throw error;
      return data;
    },
  });

  // Fetch email stats
  const { data: emailStats, isLoading: emailsLoading } = useQuery({
    queryKey: ["marketing-analytics-emails"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data, error } = await supabase
        .from("marketing_email_queue")
        .select("status, sent_at, opened_at, clicked_at, created_at")
        .gte("created_at", thirtyDaysAgo.toISOString());
      if (error) throw error;
      return data;
    },
  });

  // Fetch zones stats
  const { data: zoneStats } = useQuery({
    queryKey: ["marketing-analytics-zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_scan_zones")
        .select("name, total_leads_found, last_scanned_at, is_active");
      if (error) throw error;
      return data;
    },
  });

  // Process leads by day
  const leadsByDay = (() => {
    if (!leadStats) return [];
    const days: Record<string, { date: string; manual: number; auto: number }> = {};
    
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), "dd/MM");
      days[date] = { date, manual: 0, auto: 0 };
    }

    leadStats.forEach(lead => {
      const date = format(new Date(lead.created_at), "dd/MM");
      if (days[date]) {
        if (lead.source === "auto_scan") {
          days[date].auto++;
        } else {
          days[date].manual++;
        }
      }
    });

    return Object.values(days);
  })();

  // Process leads by status
  const leadsByStatus = (() => {
    if (!leadStats) return [];
    const counts: Record<string, number> = {};
    leadStats.forEach(lead => {
      counts[lead.status] = (counts[lead.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  // Process leads by type
  const leadsByType = (() => {
    if (!leadStats) return [];
    const counts: Record<string, number> = {};
    leadStats.forEach(lead => {
      counts[lead.business_type] = (counts[lead.business_type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  // Email performance metrics
  const emailMetrics = (() => {
    if (!emailStats) return { sent: 0, opened: 0, clicked: 0, openRate: 0, clickRate: 0 };
    const sent = emailStats.filter(e => e.status === "sent").length;
    const opened = emailStats.filter(e => e.opened_at).length;
    const clicked = emailStats.filter(e => e.clicked_at).length;
    return {
      sent,
      opened,
      clicked,
      openRate: sent > 0 ? (opened / sent) * 100 : 0,
      clickRate: opened > 0 ? (clicked / opened) * 100 : 0,
    };
  })();

  // Top zones
  const topZones = (zoneStats || [])
    .sort((a, b) => (b.total_leads_found || 0) - (a.total_leads_found || 0))
    .slice(0, 5);

  // Calculate growth
  const last7Days = leadStats?.filter(l => 
    new Date(l.created_at) >= subDays(new Date(), 7)
  ).length || 0;
  const previous7Days = leadStats?.filter(l => {
    const date = new Date(l.created_at);
    return date >= subDays(new Date(), 14) && date < subDays(new Date(), 7);
  }).length || 0;
  const growthRate = previous7Days > 0 
    ? ((last7Days - previous7Days) / previous7Days) * 100 
    : 0;

  if (leadsLoading || emailsLoading) {
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
        <h2 className="text-lg font-semibold">Analytics Marketing</h2>
        <p className="text-sm text-muted-foreground">
          Panoramica delle performance degli ultimi 30 giorni
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lead Totali</p>
                <div className="text-2xl font-bold">{leadStats?.length || 0}</div>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              {growthRate >= 0 ? (
                <>
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">+{growthRate.toFixed(0)}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">{growthRate.toFixed(0)}%</span>
                </>
              )}
              <span className="text-muted-foreground">vs settimana prec.</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Email Inviate</p>
                <div className="text-2xl font-bold">{emailMetrics.sent}</div>
              </div>
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Open rate: {emailMetrics.openRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lead Auto-scan</p>
                <div className="text-2xl font-bold">
                  {leadStats?.filter(l => l.source === "auto_scan").length || 0}
                </div>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {leadStats && leadStats.length > 0 
                ? ((leadStats.filter(l => l.source === "auto_scan").length / leadStats.length) * 100).toFixed(0)
                : 0}% del totale
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversioni</p>
                <div className="text-2xl font-bold text-green-600">
                  {leadStats?.filter(l => l.status === "converted").length || 0}
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Tasso: {leadStats && leadStats.length > 0 
                ? ((leadStats.filter(l => l.status === "converted").length / leadStats.length) * 100).toFixed(1)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lead Generation Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Generati (ultimi 30 giorni)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={leadsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="auto" name="Auto-scan" fill="#3b82f6" stackId="a" />
                <Bar dataKey="manual" name="Manuali" fill="#22c55e" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead per Stato</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={leadsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leadsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead per Tipologia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={leadsByType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Zones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Zone Più Produttive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topZones.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessuna zona configurata
                </p>
              ) : (
                topZones.map((zone, index) => (
                  <div key={zone.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{zone.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {zone.is_active ? "Attiva" : "Inattiva"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-sm">
                      {zone.total_leads_found || 0} lead
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Email</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{emailMetrics.sent}</div>
              <p className="text-sm text-muted-foreground">Inviate</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{emailMetrics.opened}</div>
              <p className="text-sm text-muted-foreground">Aperte</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{emailMetrics.clicked}</div>
              <p className="text-sm text-muted-foreground">Cliccate</p>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {emailMetrics.openRate.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">Open Rate</p>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {emailMetrics.clickRate.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">Click Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
