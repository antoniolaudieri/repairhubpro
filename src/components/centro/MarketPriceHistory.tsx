import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  BarChart3, 
  Smartphone,
  Calendar,
  ChevronRight,
  Sparkles,
  RefreshCw,
  LineChart as LineChartIcon
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";

interface DeviceValuation {
  id: string;
  brand: string;
  model: string;
  storage: string | null;
  original_price: number | null;
  grade_b: number | null;
  grade_a: number | null;
  grade_aa: number | null;
  grade_aaa: number | null;
  trend: string | null;
  trend_reason: string | null;
  created_at: string;
}

interface PopularDevice {
  brand: string;
  model: string;
  count: number;
  latestValuation: DeviceValuation;
  avgGradeA: number;
  priceChange: number | null; // % change from first to last valuation
}

export default function MarketPriceHistory() {
  const [loading, setLoading] = useState(true);
  const [popularDevices, setPopularDevices] = useState<PopularDevice[]>([]);
  const [recentValuations, setRecentValuations] = useState<DeviceValuation[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [deviceHistory, setDeviceHistory] = useState<DeviceValuation[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all valuations
      const { data: valuations, error } = await supabase
        .from("device_price_valuations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      if (valuations && valuations.length > 0) {
        // Process popular devices
        const deviceMap = new Map<string, DeviceValuation[]>();
        
        for (const v of valuations) {
          const key = `${v.brand}|${v.model}`;
          if (!deviceMap.has(key)) {
            deviceMap.set(key, []);
          }
          deviceMap.get(key)!.push(v);
        }

        const popular: PopularDevice[] = [];
        deviceMap.forEach((vals, key) => {
          const [brand, model] = key.split('|');
          const latest = vals[0];
          const oldest = vals[vals.length - 1];
          
          // Calculate average grade A price
          const gradeAPrices = vals.filter(v => v.grade_a).map(v => v.grade_a!);
          const avgGradeA = gradeAPrices.length > 0 
            ? gradeAPrices.reduce((a, b) => a + b, 0) / gradeAPrices.length 
            : 0;

          // Calculate price change %
          let priceChange: number | null = null;
          if (vals.length > 1 && oldest.grade_a && latest.grade_a) {
            priceChange = ((latest.grade_a - oldest.grade_a) / oldest.grade_a) * 100;
          }

          popular.push({
            brand,
            model,
            count: vals.length,
            latestValuation: latest,
            avgGradeA: Math.round(avgGradeA),
            priceChange
          });
        });

        // Sort by count (most valued)
        popular.sort((a, b) => b.count - a.count);
        setPopularDevices(popular.slice(0, 10));

        // Recent valuations (last 10)
        setRecentValuations(valuations.slice(0, 10));
      }
    } catch (error) {
      console.error("Error fetching valuations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeviceHistory = async (brand: string, model: string) => {
    const key = `${brand}|${model}`;
    if (selectedDevice === key) {
      setSelectedDevice(null);
      setDeviceHistory([]);
      return;
    }

    setSelectedDevice(key);
    try {
      const { data, error } = await supabase
        .from("device_price_valuations")
        .select("*")
        .eq("brand", brand)
        .eq("model", model)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setDeviceHistory(data || []);
    } catch (error) {
      console.error("Error fetching device history:", error);
    }
  };

  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case 'alto': return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'basso': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-amber-500" />;
    }
  };

  const getTrendColor = (trend: string | null) => {
    switch (trend) {
      case 'alto': return 'text-emerald-600 bg-emerald-500/10';
      case 'basso': return 'text-red-600 bg-red-500/10';
      default: return 'text-amber-600 bg-amber-500/10';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Storico Prezzi di Mercato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (popularDevices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Storico Prezzi di Mercato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nessuna valutazione AI ancora salvata.</p>
            <p className="text-sm mt-1">Le valutazioni verranno salvate automaticamente quando crei nuovi dispositivi usati.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Storico Prezzi di Mercato
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Popular Devices */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Dispositivi Più Valutati
          </h4>
          
          <div className="space-y-2">
            {popularDevices.map((device) => {
              const isSelected = selectedDevice === `${device.brand}|${device.model}`;
              
              return (
                <div key={`${device.brand}-${device.model}`}>
                  <motion.button
                    onClick={() => fetchDeviceHistory(device.brand, device.model)}
                    className={`
                      w-full p-3 rounded-lg border text-left transition-all
                      ${isSelected 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'bg-card hover:bg-muted/50 border-border'}
                    `}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{device.brand} {device.model}</span>
                          <span className="text-xs text-muted-foreground">
                            {device.count} valutazioni
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-bold text-primary">€{device.avgGradeA}</div>
                          <div className="text-xs text-muted-foreground">media A</div>
                        </div>
                        
                        {device.priceChange !== null && (
                          <Badge 
                            variant="outline" 
                            className={`
                              ${device.priceChange >= 0 
                                ? 'text-emerald-600 border-emerald-500/30' 
                                : 'text-red-600 border-red-500/30'}
                            `}
                          >
                            {device.priceChange >= 0 ? '+' : ''}{device.priceChange.toFixed(1)}%
                          </Badge>
                        )}
                        
                        {getTrendIcon(device.latestValuation.trend)}
                        
                        <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </motion.button>
                  
                  {/* Expanded History with Chart */}
                  <AnimatePresence>
                    {isSelected && deviceHistory.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 py-4 space-y-4 border-l-2 border-primary/20 ml-4 mt-2">
                          {/* Price Trend Chart */}
                          {deviceHistory.length >= 2 && (
                            <div className="bg-muted/20 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <LineChartIcon className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Andamento Prezzi</span>
                              </div>
                              <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart
                                    data={[...deviceHistory].reverse().map(v => ({
                                      date: format(new Date(v.created_at), 'dd/MM', { locale: it }),
                                      fullDate: format(new Date(v.created_at), 'dd MMM yyyy', { locale: it }),
                                      storage: v.storage,
                                      B: v.grade_b,
                                      A: v.grade_a,
                                      AA: v.grade_aa,
                                      AAA: v.grade_aaa
                                    }))}
                                    margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
                                  >
                                    <defs>
                                      <linearGradient id="colorAAA" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                      </linearGradient>
                                      <linearGradient id="colorAA" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                      </linearGradient>
                                      <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis 
                                      dataKey="date" 
                                      tick={{ fontSize: 10 }}
                                      className="text-muted-foreground"
                                    />
                                    <YAxis 
                                      tick={{ fontSize: 10 }}
                                      tickFormatter={(v) => `€${v}`}
                                      className="text-muted-foreground"
                                    />
                                    <Tooltip 
                                      contentStyle={{ 
                                        backgroundColor: 'hsl(var(--card))', 
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                      }}
                                      formatter={(value: number, name: string) => [`€${value}`, `Grado ${name}`]}
                                      labelFormatter={(_, payload) => {
                                        if (payload && payload[0]) {
                                          const data = payload[0].payload;
                                          return `${data.fullDate}${data.storage ? ` (${data.storage})` : ''}`;
                                        }
                                        return '';
                                      }}
                                    />
                                    <Legend 
                                      wrapperStyle={{ fontSize: '11px' }}
                                      formatter={(value) => `Grado ${value}`}
                                    />
                                    <Area 
                                      type="monotone" 
                                      dataKey="AAA" 
                                      stroke="hsl(var(--primary))" 
                                      fillOpacity={1}
                                      fill="url(#colorAAA)"
                                      strokeWidth={2}
                                    />
                                    <Area 
                                      type="monotone" 
                                      dataKey="AA" 
                                      stroke="#10b981" 
                                      fillOpacity={1}
                                      fill="url(#colorAA)"
                                      strokeWidth={2}
                                    />
                                    <Area 
                                      type="monotone" 
                                      dataKey="A" 
                                      stroke="#eab308" 
                                      fillOpacity={1}
                                      fill="url(#colorA)"
                                      strokeWidth={2}
                                    />
                                    <Line 
                                      type="monotone" 
                                      dataKey="B" 
                                      stroke="#f97316" 
                                      strokeWidth={2}
                                      dot={{ fill: '#f97316', strokeWidth: 0, r: 3 }}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          )}
                          
                          {/* History List */}
                          <div className="space-y-2">
                            {deviceHistory.map((val) => (
                              <div 
                                key={val.id} 
                                className="flex items-center justify-between text-sm p-2 rounded bg-muted/30"
                              >
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">
                                    {format(new Date(val.created_at), 'dd MMM yyyy', { locale: it })}
                                  </span>
                                  {val.storage && (
                                    <Badge variant="secondary" className="text-xs">
                                      {val.storage}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="grid grid-cols-4 gap-2 text-xs">
                                    <span className="text-orange-500">B: €{val.grade_b}</span>
                                    <span className="text-yellow-500">A: €{val.grade_a}</span>
                                    <span className="text-emerald-500">AA: €{val.grade_aa}</span>
                                    <span className="text-primary">AAA: €{val.grade_aaa}</span>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-xs ${getTrendColor(val.trend)}`}>
                                    {val.trend === 'alto' ? '↑' : val.trend === 'basso' ? '↓' : '→'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Valuations */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4" />
            Ultime Valutazioni
          </h4>
          
          <div className="space-y-1">
            {recentValuations.slice(0, 5).map((val) => (
              <div 
                key={val.id}
                className="flex items-center justify-between text-sm py-2 px-3 rounded hover:bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{val.brand} {val.model}</span>
                  {val.storage && (
                    <Badge variant="outline" className="text-xs">{val.storage}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-primary font-medium">€{val.grade_a}</span>
                  {getTrendIcon(val.trend)}
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(val.created_at), 'dd/MM', { locale: it })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
