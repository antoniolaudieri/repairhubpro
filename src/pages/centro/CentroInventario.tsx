import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MoreHorizontal,
  Headphones,
  Smartphone
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { UtopyaPriceLookup } from "@/components/inventory/UtopyaPriceLookup";

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
  "Display",
  "Batteria",
  "Connettore",
  "Fotocamera",
  "Altoparlante",
  "Microfono",
  "Tasto",
  "Cover",
  "Vetro",
  "Flex",
  "Scheda Madre",
  "Accessori",
  "Dispositivi",
  "Altro"
];

export default function CentroInventario() {
  const { user } = useAuth();
  const [centroId, setCentroId] = useState<string | null>(null);
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
  
  // Form state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "Display",
    brand: "",
    model_compatibility: "",
    cost: "",
    selling_price: "",
    stock_quantity: "0",
    minimum_stock: "5",
    supplier: "utopya",
    supplier_code: "",
    image_url: "",
  });

  const fetchParts = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data: centro } = await supabase
        .from("centri_assistenza")
        .select("id")
        .eq("owner_user_id", user.id)
        .single();

      if (!centro) {
        setLoading(false);
        return;
      }
      setCentroId(centro.id);

      const { data, error } = await supabase
        .from("spare_parts")
        .select("*")
        .eq("centro_id", centro.id)
        .order("name");
      
      if (!error && data) {
        setParts(data);
      }
    } catch (error) {
      console.error("Error fetching parts:", error);
      toast.error("Errore nel caricamento ricambi");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchParts();
  }, [user]);

  const resetForm = () => {
    setFormData({
      name: "",
      category: "Display",
      brand: "",
      model_compatibility: "",
      cost: "",
      selling_price: "",
      stock_quantity: "0",
      minimum_stock: "5",
      supplier: "utopya",
      supplier_code: "",
      image_url: "",
    });
    setEditingPart(null);
  };

  const handleSave = async () => {
    if (!centroId || !formData.name || !formData.category) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    setIsSaving(true);
    try {
      const partData = {
        centro_id: centroId,
        name: formData.name,
        category: formData.category,
        brand: formData.brand || null,
        model_compatibility: formData.model_compatibility || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        minimum_stock: parseInt(formData.minimum_stock) || 5,
        supplier: formData.supplier || null,
        supplier_code: formData.supplier_code || null,
        image_url: formData.image_url || null,
      };

      if (editingPart) {
        const { error } = await supabase
          .from("spare_parts")
          .update(partData)
          .eq("id", editingPart.id);
        if (error) throw error;
        toast.success("Ricambio aggiornato");
      } else {
        const { error } = await supabase.from("spare_parts").insert(partData);
        if (error) throw error;
        toast.success("Ricambio aggiunto");
      }

      setIsCreateDialogOpen(false);
      resetForm();
      fetchParts();
    } catch (error: any) {
      console.error("Error saving part:", error);
      toast.error("Errore nel salvataggio");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (part: SparePart) => {
    setEditingPart(part);
    setFormData({
      name: part.name,
      category: part.category,
      brand: part.brand || "",
      model_compatibility: part.model_compatibility || "",
      cost: part.cost?.toString() || "",
      selling_price: part.selling_price?.toString() || "",
      stock_quantity: part.stock_quantity.toString(),
      minimum_stock: part.minimum_stock?.toString() || "5",
      supplier: part.supplier || "utopya",
      supplier_code: part.supplier_code || "",
      image_url: part.image_url || "",
    });
    setIsCreateDialogOpen(true);
  };

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

  const allRepairsCompleted = linkedRepairs.length > 0 && linkedRepairs.every(
    rp => rp.repair?.status === 'completed' || rp.repair?.status === 'delivered'
  );

  const handleDeletePart = async () => {
    if (!partToDelete) return;
    
    if (linkedRepairs.length > 0 && allRepairsCompleted) {
      const { error: deleteLinksError } = await supabase
        .from("repair_parts")
        .delete()
        .eq("spare_part_id", partToDelete.id);
      
      if (deleteLinksError) {
        toast.error("Errore durante la rimozione dei collegamenti");
        return;
      }
    }
    
    const { error } = await supabase
      .from("spare_parts")
      .delete()
      .eq("id", partToDelete.id);
    
    if (error) {
      if (error.code === '23503') {
        toast.error("Impossibile eliminare: ricambio utilizzato in riparazioni attive");
      } else {
        toast.error("Errore durante l'eliminazione");
      }
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

  if (loading) {
    return (
      <CentroLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </CentroLayout>
    );
  }

  return (
    <CentroLayout>
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
            <div className="flex gap-2">
              <UtopyaPriceLookup 
                trigger={
                  <Button variant="outline" className="gap-2 border-orange-500/30 text-orange-600 hover:bg-orange-500/10">
                    <ExternalLink className="h-4 w-4" />
                    <span className="hidden sm:inline">Prezzi Utopya</span>
                  </Button>
                }
              />
              <Dialog 
                open={isCreateDialogOpen} 
                onOpenChange={(open) => {
                  setIsCreateDialogOpen(open);
                  if (!open) resetForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button className="bg-gradient-primary hover:opacity-90 shadow-md">
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Nuovo Ricambio</span>
                    <span className="sm:hidden">Nuovo</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPart ? "Modifica Ricambio" : "Aggiungi Ricambio"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Nome *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="es. Display iPhone 14 Pro"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Categoria *</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.filter(c => c !== "Tutti").map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Marca</Label>
                        <Input
                          value={formData.brand}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          placeholder="es. Apple"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Compatibilità Modelli</Label>
                      <Input
                        value={formData.model_compatibility}
                        onChange={(e) => setFormData({ ...formData, model_compatibility: e.target.value })}
                        placeholder="es. iPhone 14, iPhone 14 Pro"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Costo Acquisto (€)</Label>
                        <Input
                          type="number"
                          value={formData.cost}
                          onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Prezzo Vendita (€)</Label>
                        <Input
                          type="number"
                          value={formData.selling_price}
                          onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Quantità in Stock</Label>
                        <Input
                          type="number"
                          value={formData.stock_quantity}
                          onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Stock Minimo</Label>
                        <Input
                          type="number"
                          value={formData.minimum_stock}
                          onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Fornitore</Label>
                        <Input
                          value={formData.supplier}
                          onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                          placeholder="es. Utopya"
                        />
                      </div>
                      <div>
                        <Label>Codice Fornitore</Label>
                        <Input
                          value={formData.supplier_code}
                          onChange={(e) => setFormData({ ...formData, supplier_code: e.target.value })}
                          placeholder="SKU"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>URL Immagine</Label>
                      <Input
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Annulla
                      </Button>
                      <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? "Salvataggio..." : editingPart ? "Aggiorna" : "Aggiungi"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="p-4 bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-card-hover transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Scorta Bassa</p>
                    <p className="text-xl font-bold text-yellow-500">{stats.lowStock}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="p-4 bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-card-hover transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valore</p>
                    <p className="text-xl font-bold text-green-500">€{stats.totalValue.toFixed(0)}</p>
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
                    className={cn("rounded-none", viewMode === "grid" && "bg-primary/10 text-primary")}
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("rounded-none", viewMode === "list" && "bg-primary/10 text-primary")}
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Content */}
          {filteredParts.length === 0 ? (
            <Card className="p-12 text-center bg-card/80 backdrop-blur-sm border-border/50">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-foreground">Nessun ricambio trovato</h2>
              <p className="text-muted-foreground mb-4">
                {parts.length === 0 
                  ? "Inizia aggiungendo il tuo primo ricambio al magazzino"
                  : "Prova a modificare i filtri di ricerca"}
              </p>
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
                                status === "ok" && "bg-green-500/90 text-white",
                                status === "low" && "bg-yellow-500/90 text-white"
                              )}
                            >
                              {part.stock_quantity} pz
                            </Badge>
                          </div>
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-foreground line-clamp-2 text-sm">{part.name}</h3>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(part)}>
                                  <Pencil className="h-4 w-4 mr-2" /> Modifica
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive" 
                                  onClick={() => checkLinkedRepairs(part)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Elimina
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={cn(
                              "text-xs flex items-center gap-1",
                              part.category === "Accessori" && "border-purple-500/50 text-purple-600 bg-purple-500/10",
                              part.category === "Dispositivi" && "border-cyan-500/50 text-cyan-600 bg-cyan-500/10"
                            )}>
                              {part.category === "Accessori" && <Headphones className="h-3 w-3" />}
                              {part.category === "Dispositivi" && <Smartphone className="h-3 w-3" />}
                              {part.category}
                            </Badge>
                            {part.brand && (
                              <Badge variant="outline" className="text-xs bg-primary/5">{part.brand}</Badge>
                            )}
                          </div>
                          {part.model_compatibility && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{part.model_compatibility}</p>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="text-xs text-muted-foreground">
                              {part.cost ? `€${part.cost.toFixed(2)}` : "-"}
                            </div>
                            <div className="font-semibold text-primary">
                              {part.selling_price ? `€${part.selling_price.toFixed(2)}` : "-"}
                            </div>
                          </div>
                          {part.supplier_code && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full mt-2 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              onClick={() => window.open(`https://www.utopya.it/catalogsearch/result/?q=${encodeURIComponent(part.name)}`, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" /> Acquista su Utopya
                            </Button>
                          )}
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
                    <TableHead>Ricambio</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Vendita</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParts.map((part) => {
                    const status = getStockStatus(part);
                    return (
                      <TableRow key={part.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                              {part.image_url ? (
                                <img src={part.image_url} alt="" className="w-full h-full object-contain" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="h-4 w-4 text-muted-foreground/50" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{part.name}</p>
                              {part.brand && <p className="text-xs text-muted-foreground">{part.brand}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "text-xs flex items-center gap-1 w-fit",
                            part.category === "Accessori" && "border-purple-500/50 text-purple-600 bg-purple-500/10",
                            part.category === "Dispositivi" && "border-cyan-500/50 text-cyan-600 bg-cyan-500/10"
                          )}>
                            {part.category === "Accessori" && <Headphones className="h-3 w-3" />}
                            {part.category === "Dispositivi" && <Smartphone className="h-3 w-3" />}
                            {part.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={status === "ok" ? "default" : status === "low" ? "secondary" : "destructive"}
                            className={cn(
                              status === "ok" && "bg-green-500/90 text-white",
                              status === "low" && "bg-yellow-500/90 text-white"
                            )}
                          >
                            {part.stock_quantity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {part.cost ? `€${part.cost.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {part.selling_price ? `€${part.selling_price.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(part)}>
                                <Pencil className="h-4 w-4 mr-2" /> Modifica
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive" 
                                onClick={() => checkLinkedRepairs(part)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Elimina
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina ricambio</AlertDialogTitle>
            <AlertDialogDescription>
              {linkedRepairs.length > 0 ? (
                allRepairsCompleted ? (
                  <>
                    Questo ricambio è stato utilizzato in {linkedRepairs.length} riparazione/i completata/e.
                    Procedendo verranno rimossi anche i collegamenti. Vuoi continuare?
                  </>
                ) : (
                  <>
                    <span className="text-destructive font-medium">
                      Impossibile eliminare: questo ricambio è utilizzato in {linkedRepairs.length} riparazione/i ancora attiva/e.
                    </span>
                  </>
                )
              ) : (
                "Sei sicuro di voler eliminare questo ricambio? L'azione non può essere annullata."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            {(linkedRepairs.length === 0 || allRepairsCompleted) && (
              <AlertDialogAction 
                onClick={handleDeletePart}
                className="bg-destructive hover:bg-destructive/90"
              >
                Elimina
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CentroLayout>
  );
}
