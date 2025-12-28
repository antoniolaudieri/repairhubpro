import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, subMonths, eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import { it } from "date-fns/locale";
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

interface Movement {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  movement_date: string;
}

interface FinancialBalanceProps {
  centroId: string;
}

type PeriodType = "week" | "month" | "quarter" | "year";

export function FinancialBalance({ centroId }: FinancialBalanceProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>("month");

  useEffect(() => {
    const loadMovements = async () => {
      setIsLoading(true);
      try {
        let startDate: Date;
        const endDate = new Date();

        switch (period) {
          case "week":
            startDate = startOfWeek(endDate, { locale: it });
            break;
          case "month":
            startDate = startOfMonth(endDate);
            break;
          case "quarter":
            startDate = subMonths(startOfMonth(endDate), 2);
            break;
          case "year":
            startDate = startOfYear(endDate);
            break;
        }

        const { data, error } = await supabase
          .from("centro_financial_movements")
          .select("id, type, amount, category, movement_date")
          .eq("centro_id", centroId)
          .gte("movement_date", format(startDate, "yyyy-MM-dd"))
          .lte("movement_date", format(endDate, "yyyy-MM-dd"))
          .order("movement_date", { ascending: true });

        if (error) throw error;
        setMovements(data || []);
      } catch (error) {
        console.error("Error loading balance data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMovements();
  }, [centroId, period]);

  const stats = useMemo(() => {
    const income = movements.filter(m => m.type === "income").reduce((sum, m) => sum + Number(m.amount), 0);
    const expense = movements.filter(m => m.type === "expense").reduce((sum, m) => sum + Number(m.amount), 0);
    return { income, expense, balance: income - expense };
  }, [movements]);

  const chartData = useMemo(() => {
    if (movements.length === 0) return [];

    const groupedByDate: Record<string, { income: number; expense: number }> = {};
    
    movements.forEach((m) => {
      const dateKey = period === "year" 
        ? format(new Date(m.movement_date), "MMM", { locale: it })
        : format(new Date(m.movement_date), "dd/MM");
      
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = { income: 0, expense: 0 };
      }
      
      if (m.type === "income") {
        groupedByDate[dateKey].income += Number(m.amount);
      } else {
        groupedByDate[dateKey].expense += Number(m.amount);
      }
    });

    return Object.entries(groupedByDate).map(([date, data]) => ({
      date,
      entrate: data.income,
      uscite: data.expense,
      saldo: data.income - data.expense,
    }));
  }, [movements, period]);

  const categoryData = useMemo(() => {
    const byCategory: Record<string, { income: number; expense: number }> = {};
    
    movements.forEach((m) => {
      if (!byCategory[m.category]) {
        byCategory[m.category] = { income: 0, expense: 0 };
      }
      if (m.type === "income") {
        byCategory[m.category].income += Number(m.amount);
      } else {
        byCategory[m.category].expense += Number(m.amount);
      }
    });

    return Object.entries(byCategory)
      .map(([category, data]) => ({
        category,
        entrate: data.income,
        uscite: data.expense,
      }))
      .sort((a, b) => (b.entrate + b.uscite) - (a.entrate + a.uscite))
      .slice(0, 6);
  }, [movements]);

  const periodLabels: Record<PeriodType, string> = {
    week: "Questa Settimana",
    month: "Questo Mese",
    quarter: "Ultimo Trimestre",
    year: "Quest'Anno",
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{periodLabels[period]}</span>
            </div>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Questa Settimana</SelectItem>
                <SelectItem value="month">Questo Mese</SelectItem>
                <SelectItem value="quarter">Ultimo Trimestre</SelectItem>
                <SelectItem value="year">Quest'Anno</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Card className="bg-emerald-500/10 border-emerald-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/20">
                  <TrendingUp className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entrate Totali</p>
                  <p className="text-2xl font-bold text-emerald-500">€{stats.income.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-red-500/20">
                  <TrendingDown className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Uscite Totali</p>
                  <p className="text-2xl font-bold text-red-500">€{stats.expense.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
          <Card className={stats.balance >= 0 ? "bg-primary/10 border-primary/20" : "bg-orange-500/10 border-orange-500/20"}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${stats.balance >= 0 ? "bg-primary/20" : "bg-orange-500/20"}`}>
                  <BarChart3 className={`h-6 w-6 ${stats.balance >= 0 ? "text-primary" : "text-orange-500"}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bilancio Netto</p>
                  <p className={`text-2xl font-bold ${stats.balance >= 0 ? "text-primary" : "text-orange-500"}`}>
                    €{stats.balance.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Andamento Entrate vs Uscite
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nessun dato per il periodo selezionato
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `€${v}`} />
                <Tooltip
                  formatter={(value: number) => [`€${value.toFixed(2)}`, ""]}
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px" 
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="entrate"
                  stackId="1"
                  stroke="hsl(142, 76%, 36%)"
                  fill="hsl(142, 76%, 36%)"
                  fillOpacity={0.3}
                  name="Entrate"
                />
                <Area
                  type="monotone"
                  dataKey="uscite"
                  stackId="2"
                  stroke="hsl(0, 84%, 60%)"
                  fill="hsl(0, 84%, 60%)"
                  fillOpacity={0.3}
                  name="Uscite"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Ripartizione per Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Nessun dato per il periodo selezionato
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tickFormatter={(v) => `€${v}`} className="text-xs" />
                <YAxis type="category" dataKey="category" className="text-xs" width={100} />
                <Tooltip
                  formatter={(value: number) => [`€${value.toFixed(2)}`, ""]}
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px" 
                  }}
                />
                <Legend />
                <Bar dataKey="entrate" fill="hsl(142, 76%, 36%)" name="Entrate" radius={[0, 4, 4, 0]} />
                <Bar dataKey="uscite" fill="hsl(0, 84%, 60%)" name="Uscite" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
