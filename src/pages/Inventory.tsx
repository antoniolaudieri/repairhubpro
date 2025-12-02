import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Package, 
  Search, 
  Plus, 
  AlertTriangle, 
  CheckCircle2,
  XCircle,
  Filter,
  LayoutGrid,
  List,
  ExternalLink,
  Pencil,
  Trash2,
  MoreHorizontal
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AddSparePartDialog from "@/components/inventory/AddSparePartDialog";
import EditSparePartDialog from "@/components/inventory/EditSparePartDialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface SparePart {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  cost: number | null;
  selling_price: number | null;
  stock_quantity: number;
  minimum_stock: number | null;
  image_url: string | null;
  model_compatibility: string | null;
  supplier: string | null;
  supplier_code: string | null;
  notes: string | null;
}

const CATEGORIES = [
  "Tutti",
  "Schermo",
  "Batteria",
  "Connettore",
  "Fotocamera",
  "Speaker",
  "Microfono",
  "Tasto",
  "Cover",
  "Vetro",
  "Flex",
  "Altro"
];

export default function Inventory() {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tutti");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partToDelete, setPartToDelete] = useState<SparePart | null>(null);
  const [linkedRepairs, setLinkedRepairs] = useState<any[]>([]);
  const [checkingLinks, setCheckingLinks] = useState(false);

  const fetchParts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("spare_parts")
      .select("*")
      .order("name");
    
    if (!error && data) {
      setParts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchParts();
  }, []);

  const checkLinkedRepairs = async (part: SparePart) => {
    setCheckingLinks(true);
    setPartToDelete(part);
    
    const { data } = await supabase
      .from("repair_parts")
      .select(`
        id,
        quantity,
        repair:repairs(
          id,
          status,
          created_at,
          device:devices(
            brand,
            model,
            customer:customers(name)
          )
        )
      `)
      .eq("spare_part_id", part.id);
    
    setLinkedRepairs(data || []);
    setCheckingLinks(false);
    setDeleteDialogOpen(true);
  };

  const handleDeletePart = async () => {
    if (!partToDelete) return;
    
    const { error } = await supabase
      .from("spare_parts")
      .delete()
      .eq("id", partToDelete.id);
    
    if (error) {
      if (error.code === '23503') {
        toast.error("Impossibile eliminare: questo ricambio è utilizzato in una o più riparazioni");
      } else {
        toast.error("Errore durante l'eliminazione");
      }
      console.error(error);
    } else {
      toast.success("Ricambio eliminato");
      fetchParts();
    }
    
    setDeleteDialogOpen(false);
    setPartToDelete(null);
    setLinkedRepairs([]);
  };

  const filteredParts = parts.filter(part => {
    const matchesSearch = 
      part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.model_compatibility?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "Tutti" || part.category === categoryFilter;
    
    const matchesStock = 
      stockFilter === "all" ||
      (stockFilter === "low" && part.stock_quantity > 0 && part.stock_quantity <= (part.minimum_stock || 5)) ||
      (stockFilter === "out" && part.stock_quantity === 0);
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  const getStockStatus = (part: SparePart) => {
    if (part.stock_quantity === 0) return "out";
    if (part.stock_quantity <= (part.minimum_stock || 5)) return "low";
    return "ok";
  };

  const stats = {
    total: parts.length,
    lowStock: parts.filter(p => p.stock_quantity > 0 && p.stock_quantity <= (p.minimum_stock || 5)).length,
    outOfStock: parts.filter(p => p.stock_quantity === 0).length,
    totalValue: parts.reduce((acc, p) => acc + (p.selling_price || 0) * p.stock_quantity, 0)
  };

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Magazzino</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Gestisci i ricambi e monitora le scorte
            </p>
          </div>
          <AddSparePartDialog 
            onPartAdded={fetchParts}
            trigger={
              <Button className="bg-gradient-primary hover:opacity-90 shadow-md">
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Ricambio
              </Button>
            }
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card className="p-4 bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Totale</p>
                  <p className="text-xl font-bold text-foreground">{stats.total}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-4 bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Scorta Bassa</p>
                  <p className="text-xl font-bold text-warning">{stats.lowStock}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-4 bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Esaurito</p>
                  <p className="text-xl font-bold text-destructive">{stats.outOfStock}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-4 bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valore</p>
                  <p className="text-xl font-bold text-success">€{stats.totalValue.toFixed(0)}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <Card className="p-4 bg-card/80 backdrop-blur-sm border-border/50">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca ricambi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le scorte</SelectItem>
                  <SelectItem value="low">Scorta bassa</SelectItem>
                  <SelectItem value="out">Esaurito</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex border border-border rounded-md overflow-hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-none",
                    viewMode === "grid" && "bg-primary/10 text-primary"
                  )}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-none",
                    viewMode === "list" && "bg-primary/10 text-primary"
                  )}
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredParts.length === 0 ? (
          <Card className="p-12 text-center bg-card/80 backdrop-blur-sm border-border/50">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-foreground">Nessun ricambio trovato</h2>
            <p className="text-muted-foreground mb-4">
              {parts.length === 0 
                ? "Inizia aggiungendo il tuo primo ricambio al magazzino"
                : "Prova a modificare i filtri di ricerca"}
            </p>
            {parts.length === 0 && (
              <AddSparePartDialog 
                onPartAdded={fetchParts}
                trigger={
                  <Button className="bg-gradient-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi Ricambio
                  </Button>
                }
              />
            )}
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredParts.map((part, index) => {
                const status = getStockStatus(part);
                return (
                  <motion.div
                    key={part.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Card className="overflow-hidden bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-card-hover transition-all group">
                      <div className="aspect-square relative bg-muted/30 overflow-hidden">
                        {part.image_url ? (
                          <img 
                            src={part.image_url} 
                            alt={part.name}
                            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-16 w-16 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <Badge 
                            variant={status === "ok" ? "default" : status === "low" ? "secondary" : "destructive"}
                            className={cn(
                              status === "ok" && "bg-success/90 text-success-foreground",
                              status === "low" && "bg-warning/90 text-warning-foreground"
                            )}
                          >
                            {part.stock_quantity} pz
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-foreground line-clamp-2 text-sm">
                            {part.name}
                          </h3>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {part.category}
                          </Badge>
                          {part.brand && (
                            <Badge variant="outline" className="text-xs bg-primary/5">
                              {part.brand}
                            </Badge>
                          )}
                        </div>

                        {part.model_compatibility && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {part.model_compatibility}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <div>
                            {part.selling_price && (
                              <p className="font-bold text-primary">
                                €{part.selling_price.toFixed(2)}
                              </p>
                            )}
                            {part.cost && (
                              <p className="text-xs text-muted-foreground">
                                Costo: €{part.cost.toFixed(2)}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="border-primary/50 hover:bg-primary hover:text-primary-foreground"
                            >
                              <a 
                                href={`https://www.utopya.it/ricerca?q=${encodeURIComponent(part.name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <EditSparePartDialog
                                  part={part}
                                  onPartUpdated={fetchParts}
                                  trigger={
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Modifica
                                    </DropdownMenuItem>
                                  }
                                />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={() => checkLinkedRepairs(part)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Elimina
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <Card className="overflow-hidden bg-card/80 backdrop-blur-sm border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="hidden lg:table-cell">Brand</TableHead>
                  <TableHead className="text-center">Scorta</TableHead>
                  <TableHead className="text-right">Prezzo</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map((part) => {
                  const status = getStockStatus(part);
                  return (
                    <TableRow key={part.id} className="group">
                      <TableCell>
                        <div className="w-10 h-10 rounded-md bg-muted/30 overflow-hidden flex items-center justify-center">
                          {part.image_url ? (
                            <img 
                              src={part.image_url} 
                              alt={part.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Package className="h-4 w-4 text-muted-foreground/50" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">{part.name}</p>
                        {part.model_compatibility && (
                          <p className="text-xs text-muted-foreground">{part.model_compatibility}</p>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{part.category}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {part.brand || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={status === "ok" ? "default" : status === "low" ? "secondary" : "destructive"}
                          className={cn(
                            status === "ok" && "bg-success/90",
                            status === "low" && "bg-warning/90"
                          )}
                        >
                          {part.stock_quantity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {part.selling_price ? (
                          <span className="font-bold text-primary">€{part.selling_price.toFixed(2)}</span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a 
                              href={`https://www.utopya.it/ricerca?q=${encodeURIComponent(part.name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <EditSparePartDialog
                            part={part}
                            onPartUpdated={fetchParts}
                            trigger={
                              <Button variant="ghost" size="sm">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => checkLinkedRepairs(part)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Results count */}
        {filteredParts.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            {filteredParts.length} ricambi trovati
          </p>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) {
          setLinkedRepairs([]);
          setPartToDelete(null);
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {linkedRepairs.length > 0 ? "Attenzione" : "Conferma Eliminazione"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {linkedRepairs.length > 0 ? (
                  <>
                    <p>
                      Il ricambio <strong className="text-foreground">{partToDelete?.name}</strong> è utilizzato in {linkedRepairs.length} riparazion{linkedRepairs.length === 1 ? 'e' : 'i'}:
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {linkedRepairs.map((rp) => (
                        <Link
                          key={rp.id}
                          to={`/repairs/${rp.repair?.id}`}
                          className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors text-sm"
                          onClick={() => setDeleteDialogOpen(false)}
                        >
                          <div>
                            <p className="font-medium text-foreground">
                              {rp.repair?.device?.brand} {rp.repair?.device?.model}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {rp.repair?.device?.customer?.name} • Qtà: {rp.quantity}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {rp.repair?.status}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                    <p className="text-destructive text-sm font-medium">
                      Non puoi eliminare questo ricambio finché è collegato a delle riparazioni.
                    </p>
                  </>
                ) : (
                  <p>
                    Sei sicuro di voler eliminare <strong className="text-foreground">{partToDelete?.name}</strong>? 
                    Questa azione non può essere annullata.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            {linkedRepairs.length === 0 && (
              <AlertDialogAction
                onClick={handleDeletePart}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Elimina
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
