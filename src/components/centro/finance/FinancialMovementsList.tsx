import { useState, useEffect } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { 
  TrendingUp, TrendingDown, Search, Trash2, MoreHorizontal, 
  ExternalLink, RefreshCw, Filter, ChevronRight,
  Building2, Zap, Users, FileText, Briefcase, Wrench, ShoppingBag, 
  CreditCard, Truck, Package, Shield, Landmark, FolderOpen, Wallet, Receipt
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
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

// Icon mapping for categories
const getCategoryIcon = (category: string): React.ElementType => {
  const iconMap: Record<string, React.ElementType> = {
    "Riparazione": Wrench, "Riparazioni": Wrench,
    "Vendita Usato": ShoppingBag, "Vendite Usato": ShoppingBag,
    "Tessera Fedeltà": CreditCard, "Programma Fedeltà": CreditCard,
    "Vendita Accessori": Package, "Consulenza": Briefcase,
    "Altro Incasso": Wallet, "Acconti": Receipt,
    "Affitto Locale": Building2, "Affitto": Building2,
    "Utenze": Zap, "Manutenzione Locale": Wrench, "Manutenzione": Wrench,
    "Stipendi": Users, "Contributi INPS": Landmark, "INAIL": Shield,
    "F24": FileText, "Tasse": FileText, "Tasse Locali": Landmark, "Imposte Varie": Receipt,
    "Commercialista": Briefcase, "Consulenti": Users,
    "Ricambi": Package, "Attrezzatura": Wrench, "Software/Abbonamenti": FolderOpen,
    "Marketing": TrendingUp, "Trasporti": Truck, "Spedizioni": Package,
    "Assicurazione": Shield, "Banca": Landmark, "Varie": FolderOpen,
    "Commissioni": Receipt, "Conto Vendita": Receipt, "Pagamenti": Receipt,
  };
  return iconMap[category] || FolderOpen;
};

const referenceTypeLabels: Record<string, string> = {
  "repair": "Riparazione",
  "commission": "Commissione",
  "used_sale": "Vendita Usato",
  "used_payout": "Payout",
  "used_commission": "Comm. Usato",
  "used_device": "Usato",
  "loyalty_card": "Tessera",
  "quote": "Preventivo",
  "corner_referral": "Corner",
  "manual": "Manuale",
};

export function FinancialMovementsList({ centroId, onRefresh }: FinancialMovementsListProps) {
  const navigate = useNavigate();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const loadMovements = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("centro_financial_movements")
        .select("*")
        .eq("centro_id", centroId)
        .order("movement_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterType === "income" || filterType === "expense") {
        query = query.eq("type", filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error("Error loading movements:", error);
      toast.error("Errore nel caricamento");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, [centroId, filterType]);

  const handleDelete = async (id: string, referenceType: string | null) => {
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
      case "used_device":
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

  // Group by date
  const groupedMovements = filteredMovements.reduce((acc, movement) => {
    const date = movement.movement_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(movement);
    return acc;
  }, {} as Record<string, Movement[]>);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search and Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-card"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-28 h-10 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="income">Entrate</SelectItem>
            <SelectItem value="expense">Uscite</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="h-10 w-10" onClick={loadMovements}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Movements List */}
      {filteredMovements.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">Nessun movimento</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              I movimenti appariranno qui
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-380px)] md:h-[500px]">
          <div className="space-y-4 pr-2">
            {Object.entries(groupedMovements).map(([date, dayMovements]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {format(new Date(date), "EEEE d MMMM", { locale: it })}
                  </p>
                </div>
                
                {/* Day Movements */}
                <div className="space-y-2">
                  <AnimatePresence>
                    {dayMovements.map((movement, index) => {
                      const IconComponent = getCategoryIcon(movement.category);
                      const isIncome = movement.type === "income";
                      const isAutomatic = movement.reference_type && movement.reference_type !== "manual";
                      
                      return (
                        <motion.div
                          key={movement.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: index * 0.02 }}
                        >
                          <Card className={`overflow-hidden transition-all hover:shadow-md ${
                            isIncome 
                              ? "border-l-4 border-l-emerald-500" 
                              : "border-l-4 border-l-red-500"
                          }`}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                {/* Icon */}
                                <div className={`p-2 rounded-lg shrink-0 ${
                                  isIncome 
                                    ? "bg-gradient-to-br from-emerald-500/20 to-green-500/10" 
                                    : "bg-gradient-to-br from-red-500/20 to-rose-500/10"
                                }`}>
                                  <IconComponent className={`h-4 w-4 ${isIncome ? "text-emerald-600" : "text-red-600"}`} />
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-sm text-foreground truncate">
                                      {movement.category}
                                    </span>
                                    {movement.subcategory && (
                                      <span className="text-xs text-muted-foreground">
                                        • {movement.subcategory}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {isAutomatic && (
                                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                        {referenceTypeLabels[movement.reference_type!] || "Auto"}
                                      </Badge>
                                    )}
                                    {movement.description && (
                                      <span className="text-xs text-muted-foreground truncate">
                                        {movement.description.slice(0, 30)}{movement.description.length > 30 ? "..." : ""}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Amount */}
                                <div className="text-right shrink-0">
                                  <span className={`font-bold text-sm ${
                                    isIncome ? "text-emerald-600" : "text-red-600"
                                  }`}>
                                    {isIncome ? "+" : "-"}€{Number(movement.amount).toFixed(2)}
                                  </span>
                                </div>
                                
                                {/* Actions */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {isAutomatic && movement.reference_id && (
                                      <DropdownMenuItem 
                                        onClick={() => navigateToReference(movement.reference_type, movement.reference_id)}
                                      >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Vedi dettaglio
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem 
                                      onClick={() => handleDelete(movement.id, movement.reference_type)}
                                      className="text-destructive focus:text-destructive"
                                      disabled={isAutomatic}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      {isAutomatic ? "Non eliminabile" : "Elimina"}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
      
      {/* Count badge */}
      {filteredMovements.length > 0 && (
        <div className="text-center">
          <Badge variant="outline" className="text-xs">
            {filteredMovements.length} movimenti
          </Badge>
        </div>
      )}
    </div>
  );
}