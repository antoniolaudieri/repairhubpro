import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import { FileText, Download, Calendar, TrendingUp, TrendingDown, Wallet, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface Movement {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  subcategory: string | null;
  description: string | null;
  payment_method: string;
  movement_date: string;
}

interface FinancialReportProps {
  centroId: string;
}

export function FinancialReport({ centroId }: FinancialReportProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [centroInfo, setCentroInfo] = useState<{ business_name: string; address: string } | null>(null);

  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      options.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy", { locale: it }),
      });
    }
    return options;
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [year, month] = selectedMonth.split("-").map(Number);
        const startDate = startOfMonth(new Date(year, month - 1));
        const endDate = endOfMonth(startDate);

        const [{ data: movementsData }, { data: centroData }] = await Promise.all([
          supabase
            .from("centro_financial_movements")
            .select("*")
            .eq("centro_id", centroId)
            .gte("movement_date", format(startDate, "yyyy-MM-dd"))
            .lte("movement_date", format(endDate, "yyyy-MM-dd"))
            .order("movement_date", { ascending: true }),
          supabase
            .from("centri_assistenza")
            .select("business_name, address")
            .eq("id", centroId)
            .single(),
        ]);

        setMovements(movementsData || []);
        setCentroInfo(centroData);
      } catch (error) {
        console.error("Error loading report data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [centroId, selectedMonth]);

  const stats = useMemo(() => {
    const income = movements.filter(m => m.type === "income").reduce((sum, m) => sum + Number(m.amount), 0);
    const expense = movements.filter(m => m.type === "expense").reduce((sum, m) => sum + Number(m.amount), 0);
    
    const byCategory: Record<string, { income: number; expense: number }> = {};
    movements.forEach((m) => {
      if (!byCategory[m.category]) byCategory[m.category] = { income: 0, expense: 0 };
      byCategory[m.category][m.type] += Number(m.amount);
    });

    const byPaymentMethod: Record<string, number> = {};
    movements.filter(m => m.type === "income").forEach((m) => {
      byPaymentMethod[m.payment_method] = (byPaymentMethod[m.payment_method] || 0) + Number(m.amount);
    });

    return { income, expense, balance: income - expense, byCategory, byPaymentMethod };
  }, [movements]);

  const generatePDF = () => {
    const doc = new jsPDF();
    const monthLabel = monthOptions.find(o => o.value === selectedMonth)?.label || selectedMonth;

    // Header
    doc.setFontSize(18);
    doc.text("Report Finanziario", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(centroInfo?.business_name || "Centro Assistenza", 105, 28, { align: "center" });
    doc.setFontSize(10);
    doc.text(monthLabel, 105, 35, { align: "center" });

    // Summary
    doc.setFontSize(14);
    doc.text("Riepilogo", 20, 50);
    doc.setFontSize(10);
    doc.text(`Entrate Totali: €${stats.income.toFixed(2)}`, 20, 60);
    doc.text(`Uscite Totali: €${stats.expense.toFixed(2)}`, 20, 67);
    doc.text(`Bilancio Netto: €${stats.balance.toFixed(2)}`, 20, 74);
    doc.text(`Numero Movimenti: ${movements.length}`, 20, 81);

    // Category breakdown
    doc.setFontSize(14);
    doc.text("Ripartizione per Categoria", 20, 95);
    let yPos = 105;
    doc.setFontSize(9);
    Object.entries(stats.byCategory).forEach(([category, data]) => {
      doc.text(`${category}: +€${data.income.toFixed(2)} / -€${data.expense.toFixed(2)}`, 25, yPos);
      yPos += 7;
    });

    // Movements table
    yPos += 10;
    doc.setFontSize(14);
    doc.text("Dettaglio Movimenti", 20, yPos);
    yPos += 10;

    doc.setFontSize(8);
    doc.text("Data", 20, yPos);
    doc.text("Categoria", 45, yPos);
    doc.text("Descrizione", 85, yPos);
    doc.text("Importo", 160, yPos);
    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 5;

    movements.slice(0, 30).forEach((m) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(format(new Date(m.movement_date), "dd/MM/yy"), 20, yPos);
      doc.text(m.category.substring(0, 20), 45, yPos);
      doc.text((m.description || "-").substring(0, 35), 85, yPos);
      doc.text(`${m.type === "income" ? "+" : "-"}€${Number(m.amount).toFixed(2)}`, 160, yPos);
      yPos += 6;
    });

    // Footer
    doc.setFontSize(8);
    doc.text(`Generato il ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 105, 285, { align: "center" });

    doc.save(`report-finanziario-${selectedMonth}.pdf`);
    toast.success("Report PDF generato");
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
      {/* Period & Actions */}
      <Card className="shadow-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[200px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={generatePDF} className="gap-2">
                <Download className="h-4 w-4" />
                Esporta PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Riepilogo Mensile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-accent/10">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="text-foreground">Entrate Totali</span>
              </div>
              <span className="font-bold text-accent">€{stats.income.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-destructive/10">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <span className="text-foreground">Uscite Totali</span>
              </div>
              <span className="font-bold text-destructive">€{stats.expense.toFixed(2)}</span>
            </div>
            <div className={`flex justify-between items-center p-3 rounded-lg ${stats.balance >= 0 ? "bg-primary/10" : "bg-warning/10"}`}>
              <div className="flex items-center gap-2">
                <Wallet className={`h-4 w-4 ${stats.balance >= 0 ? "text-primary" : "text-warning"}`} />
                <span className="font-medium text-foreground">Bilancio Netto</span>
              </div>
              <span className={`font-bold ${stats.balance >= 0 ? "text-primary" : "text-warning"}`}>
                €{stats.balance.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
              <span className="text-foreground">Numero Movimenti</span>
              <Badge variant="secondary">{movements.length}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Per Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.byCategory).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nessun movimento</p>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats.byCategory).map(([category, data]) => (
                  <div key={category} className="flex justify-between items-center p-2.5 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium text-foreground">{category}</span>
                    <div className="flex gap-3 text-sm">
                      {data.income > 0 && (
                        <span className="text-accent font-medium">+€{data.income.toFixed(2)}</span>
                      )}
                      {data.expense > 0 && (
                        <span className="text-destructive font-medium">-€{data.expense.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Dettaglio Movimenti</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessun movimento per il mese selezionato</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead>Metodo</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(m.movement_date), "dd MMM", { locale: it })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {m.description || "-"}
                      </TableCell>
                      <TableCell className="capitalize">{m.payment_method}</TableCell>
                      <TableCell className={`text-right font-medium ${m.type === "income" ? "text-accent" : "text-destructive"}`}>
                        {m.type === "income" ? "+" : "-"}€{Number(m.amount).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
