import { useState, useEffect } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { TrendingUp, TrendingDown, Search, Trash2, MoreHorizontal, Wallet, ExternalLink, RefreshCw } from "lucide-react";
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
import { useNavigate } from "react-router-dom";

interface Movement {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  subcategory: string | null;
  description: string | null;
  payment_method: string;
  reference_type: string | null;
  reference_id: string | null;
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
  "Vendita Accessori": "🎧",
  "Consulenza": "💬",
  "Altro Incasso": "💰",
  "Ricambi": "🔩",
  "Affitto": "🏠",
  "Utenze": "💡",
  "Stipendi": "👤",
  "Marketing": "📢",
  "Attrezzatura": "🛠️",
  "Software/Abbonamenti": "💻",
  "Tasse": "📋",
  "Assicurazione": "🛡️",
  "Manutenzione": "⚙️",
  "Altra Spesa": "📝",
  "Commissioni": "🏛️",
  "Pagamenti": "💸",
};

const referenceTypeLabels: Record<string, string> = {
  "repair": "Riparazione",
  "commission": "Commissione",
  "used_sale": "Vendita Usato",
  "used_payout": "Pagamento Proprietario",
  "used_commission": "Commissione Usato",
  "loyalty_card": "Tessera Fedeltà",
  "corner_referral": "Segnalazione Corner",
  "manual": "Manuale",
};

export function FinancialMovementsList({ centroId, onRefresh }: FinancialMovementsListProps) {
  const navigate = useNavigate();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");

  const loadMovements = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("centro_financial_movements")
        .select("*")
        .eq("centro_id", centroId)
        .order("movement_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filterType === "income" || filterType === "expense") {
        query = query.eq("type", filterType);
      }
      if (filterCategory !== "all") {
        query = query.eq("category", filterCategory);
      }
      if (filterSource !== "all") {
        if (filterSource === "manual") {
          query = query.or("reference_type.eq.manual,reference_type.is.null");
        } else {
          query = query.eq("reference_type", filterSource);
        }
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
  }, [centroId, filterType, filterCategory, filterSource]);

  const handleDelete = async (id: string, referenceType: string | null) => {
    // Don't allow deletion of automatic movements
    if (referenceType && referenceType !== "manual") {
      toast.error("Non puoi eliminare movimenti automatici");
      return;
    }
    
    try {
      const { error } = await supabase
        .from("centro_financial_movements")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Movimento eliminato");
      loadMovements();
      onRefresh();
    } catch (error) {
      console.error("Error deleting movement:", error);
      toast.error("Errore nell'eliminazione");
    }
  };

  const navigateToReference = (referenceType: string | null, referenceId: string | null) => {
    if (!referenceType || !referenceId) return;
    
    switch (referenceType) {
      case "repair":
        navigate(`/centro/lavori/${referenceId}`);
        break;
      case "used_sale":
      case "used_payout":
      case "used_commission":
        navigate(`/centro/usato`);
        break;
      case "loyalty_card":
        navigate(`/centro/marketing`);
        break;
      default:
        break;
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
  const sources = [...new Set(movements.map((m) => m.reference_type).filter(Boolean))];

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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-sm border-border/50 overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Entrate</p>
                <p className="text-xl font-bold text-accent">€{totalIncome.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-sm border-border/50 overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-destructive/20 to-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uscite</p>
                <p className="text-xl font-bold text-destructive">€{totalExpense.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="shadow-sm border-border/50 overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${totalIncome - totalExpense >= 0 
                ? "bg-gradient-to-br from-primary/20 to-primary/10" 
                : "bg-gradient-to-br from-warning/20 to-warning/10"}`}>
                <Wallet className={`h-5 w-5 ${totalIncome - totalExpense >= 0 ? "text-primary" : "text-warning"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className={`text-xl font-bold ${totalIncome - totalExpense >= 0 ? "text-primary" : "text-warning"}`}>
                  €{(totalIncome - totalExpense).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca movimenti..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[130px] bg-background">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="income">Entrate</SelectItem>
                  <SelectItem value="expense">Uscite</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[150px] bg-background">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-[150px] bg-background">
                  <SelectValue placeholder="Origine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  <SelectItem value="manual">Manuale</SelectItem>
                  <SelectItem value="repair">Riparazioni</SelectItem>
                  <SelectItem value="used_sale">Vendite Usato</SelectItem>
                  <SelectItem value="loyalty_card">Tessere</SelectItem>
                  <SelectItem value="commission">Commissioni</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={loadMovements} title="Aggiorna">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movements List */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Registro Movimenti</CardTitle>
            <Badge variant="secondary">{filteredMovements.length} movimenti</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMovements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Nessun movimento registrato</p>
              <p className="text-sm mt-1">I movimenti appariranno automaticamente quando completi riparazioni, vendi usato, attivi tessere, ecc.</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-2">
                <AnimatePresence>
                  {filteredMovements.map((movement, index) => (
                    <motion.div
                      key={movement.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.02 }}
                      className={`p-3 rounded-lg border transition-colors ${
                        movement.type === "income"
                          ? "bg-accent/5 border-accent/20 hover:bg-accent/10"
                          : "bg-destructive/5 border-destructive/20 hover:bg-destructive/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <span className="text-2xl mt-0.5">{categoryIcons[movement.category] || "📋"}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">{movement.category}</span>
                              {movement.subcategory && (
                                <Badge variant="outline" className="text-xs">{movement.subcategory}</Badge>
                              )}
                              {movement.reference_type && movement.reference_type !== "manual" && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  {referenceTypeLabels[movement.reference_type] || movement.reference_type}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {movement.description || format(new Date(movement.movement_date), "d MMMM yyyy", { locale: it })}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(movement.movement_date), "d MMM yyyy", { locale: it })}
                              {movement.payment_method && ` • ${movement.payment_method}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className={`font-bold whitespace-nowrap ${
                              movement.type === "income" ? "text-accent" : "text-destructive"
                            }`}>
                              {movement.type === "income" ? "+" : "-"}€{Number(movement.amount).toFixed(2)}
                            </span>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {movement.reference_type && movement.reference_id && movement.reference_type !== "manual" && (
                                <DropdownMenuItem 
                                  onClick={() => navigateToReference(movement.reference_type, movement.reference_id)}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Vai al dettaglio
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleDelete(movement.id, movement.reference_type)}
                                className="text-destructive focus:text-destructive"
                                disabled={movement.reference_type !== null && movement.reference_type !== "manual"}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {movement.reference_type && movement.reference_type !== "manual" 
                                  ? "Non eliminabile" 
                                  : "Elimina"}
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
