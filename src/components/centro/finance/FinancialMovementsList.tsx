import { useState, useEffect } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { TrendingUp, TrendingDown, Search, Filter, Trash2, Edit, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Movement {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  subcategory: string | null;
  description: string | null;
  payment_method: string;
  reference_type: string | null;
  movement_date: string;
  created_at: string;
}

interface FinancialMovementsListProps {
  centroId: string;
  onRefresh: () => void;
}

const categoryIcons: Record<string, string> = {
  "Riparazione": "🔧",
  "Vendita Usato": "📱",
  "Tessera Fedeltà": "💳",
  "Altro Incasso": "💰",
  "Ricambi": "🔩",
  "Affitto": "🏠",
  "Utenze": "💡",
  "Stipendi": "👤",
  "Marketing": "📢",
  "Altra Spesa": "📝",
};

export function FinancialMovementsList({ centroId, onRefresh }: FinancialMovementsListProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const loadMovements = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("centro_financial_movements")
        .select("*")
        .eq("centro_id", centroId)
        .order("movement_date", { ascending: false });

      if (filterType === "income" || filterType === "expense") {
        query = query.eq("type", filterType);
      }
      if (filterCategory !== "all") {
        query = query.eq("category", filterCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error("Error loading movements:", error);
      toast.error("Errore nel caricamento dei movimenti");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, [centroId, filterType, filterCategory]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("centro_financial_movements")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Movimento eliminato");
      loadMovements();
    } catch (error) {
      console.error("Error deleting movement:", error);
      toast.error("Errore nell'eliminazione");
    }
  };

  const filteredMovements = movements.filter((m) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.category.toLowerCase().includes(query) ||
      m.description?.toLowerCase().includes(query) ||
      m.subcategory?.toLowerCase().includes(query)
    );
  });

  const totalIncome = filteredMovements
    .filter((m) => m.type === "income")
    .reduce((sum, m) => sum + Number(m.amount), 0);

  const totalExpense = filteredMovements
    .filter((m) => m.type === "expense")
    .reduce((sum, m) => sum + Number(m.amount), 0);

  const categories = [...new Set(movements.map((m) => m.category))];

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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-emerald-500/10 border-emerald-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Entrate</p>
                <p className="text-xl font-bold text-emerald-500">€{totalIncome.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uscite</p>
                <p className="text-xl font-bold text-red-500">€{totalExpense.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className={totalIncome - totalExpense >= 0 ? "bg-primary/10 border-primary/20" : "bg-orange-500/10 border-orange-500/20"}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${totalIncome - totalExpense >= 0 ? "bg-primary/20" : "bg-orange-500/20"}`}>
                <TrendingUp className={`h-5 w-5 ${totalIncome - totalExpense >= 0 ? "text-primary" : "text-orange-500"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className={`text-xl font-bold ${totalIncome - totalExpense >= 0 ? "text-primary" : "text-orange-500"}`}>
                  €{(totalIncome - totalExpense).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca movimenti..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="income">Entrate</SelectItem>
                <SelectItem value="expense">Uscite</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Movements List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registro Movimenti</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMovements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nessun movimento registrato</p>
              <p className="text-sm mt-1">Aggiungi il primo movimento cliccando "Nuovo Movimento"</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                <AnimatePresence>
                  {filteredMovements.map((movement, index) => (
                    <motion.div
                      key={movement.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.03 }}
                      className={`p-3 rounded-lg border ${
                        movement.type === "income"
                          ? "bg-emerald-500/5 border-emerald-500/20"
                          : "bg-red-500/5 border-red-500/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-2xl">{categoryIcons[movement.category] || "📋"}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{movement.category}</span>
                              {movement.subcategory && (
                                <Badge variant="outline" className="text-xs">{movement.subcategory}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {movement.description || format(new Date(movement.movement_date), "d MMMM yyyy", { locale: it })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-bold whitespace-nowrap ${
                            movement.type === "income" ? "text-emerald-500" : "text-red-500"
                          }`}>
                            {movement.type === "income" ? "+" : "-"}€{Number(movement.amount).toFixed(2)}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleDelete(movement.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Elimina
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
