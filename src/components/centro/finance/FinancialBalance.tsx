import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, startOfWeek, startOfYear, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import { TrendingUp, TrendingDown, Calendar, BarChart3, Wallet } from "lucide-react";
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
      <Card className="shadow-sm border-border/50">
        <CardContent className="p-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <Card className="shadow-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-foreground">{periodLabels[period]}</span>
            </div>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
              <SelectTrigger className="w-[180px] bg-background">
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

      {/* Summary Cards - Compact grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-sm border-border/50 h-full">
            <CardContent className="p-3 sm:p-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 w-fit mb-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
              </div>
              <p className="text-xs text-muted-foreground mb-0.5">Entrate</p>
              <p className="text-sm sm:text-lg font-bold text-accent truncate">€{stats.income.toFixed(0)}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-sm border-border/50 h-full">
            <CardContent className="p-3 sm:p-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-destructive/20 to-destructive/10 w-fit mb-2">
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              </div>
              <p className="text-xs text-muted-foreground mb-0.5">Uscite</p>
              <p className="text-sm sm:text-lg font-bold text-destructive truncate">€{stats.expense.toFixed(0)}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
          <Card className="shadow-sm border-border/50 h-full">
            <CardContent className="p-3 sm:p-4">
              <div className={`p-2 rounded-lg w-fit mb-2 ${stats.balance >= 0 
                ? "bg-gradient-to-br from-primary/20 to-primary/10" 
                : "bg-gradient-to-br from-warning/20 to-warning/10"}`}>
                <Wallet className={`h-4 w-4 sm:h-5 sm:w-5 ${stats.balance >= 0 ? "text-primary" : "text-warning"}`} />
              </div>
              <p className="text-xs text-muted-foreground mb-0.5">Bilancio</p>
              <p className={`text-sm sm:text-lg font-bold truncate ${stats.balance >= 0 ? "text-primary" : "text-warning"}`}>
                €{stats.balance.toFixed(0)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Trend Chart */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Andamento Entrate vs Uscite
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
              <p>Nessun dato per il periodo selezionato</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorEntrate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUscite" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `€${v}`} />
                <Tooltip
                  formatter={(value: number) => [`€${value.toFixed(2)}`, ""]}
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "var(--shadow-md)"
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Area
                  type="monotone"
                  dataKey="entrate"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  fill="url(#colorEntrate)"
                  name="Entrate"
                />
                <Area
                  type="monotone"
                  dataKey="uscite"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  fill="url(#colorUscite)"
                  name="Uscite"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Ripartizione per Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length === 0 ? (
            <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
              <p>Nessun dato per il periodo selezionato</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `€${v}`} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={100} />
                <Tooltip
                  formatter={(value: number) => [`€${value.toFixed(2)}`, ""]}
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "var(--shadow-md)"
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend />
                <Bar dataKey="entrate" fill="hsl(var(--accent))" name="Entrate" radius={[0, 4, 4, 0]} />
                <Bar dataKey="uscite" fill="hsl(var(--destructive))" name="Uscite" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
