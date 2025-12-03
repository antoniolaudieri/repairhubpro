import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Package,
  Edit,
  Trash2,
  AlertTriangle,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";

interface Centro {
  id: string;
  business_name: string;
}

interface SparePart {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  model_compatibility: string | null;
  cost: number | null;
  selling_price: number | null;
  stock_quantity: number;
  minimum_stock: number | null;
  supplier: string | null;
  supplier_code: string | null;
  image_url: string | null;
}

const categories = [
  "Display",
  "Batteria",
  "Scheda Madre",
  "Fotocamera",
  "Altoparlante",
  "Microfono",
  "Connettore",
  "Vetro",
  "Cover",
  "Altro",
];

export default function CentroInventario() {
  const { user } = useAuth();
  const [centro, setCentro] = useState<Centro | null>(null);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  
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
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: centroData, error: centroError } = await supabase
        .from("centri_assistenza")
        .select("id, business_name")
        .eq("owner_user_id", user.id)
        .single();

      if (centroError) throw centroError;
      setCentro(centroData);

      if (centroData) {
        const { data: partsData, error: partsError } = await supabase
          .from("spare_parts")
          .select("*")
          .eq("centro_id", centroData.id)
          .order("name");

        if (partsError) throw partsError;
        setSpareParts(partsData || []);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
  };

  const handleSave = async () => {
    if (!centro || !formData.name || !formData.category) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    setIsSaving(true);
    try {
      const partData = {
        centro_id: centro.id,
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
      setEditingPart(null);
      resetForm();
      fetchData();
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

  const handleDelete = async (partId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo ricambio?")) return;

    try {
      const { error } = await supabase.from("spare_parts").delete().eq("id", partId);
      if (error) throw error;
      toast.success("Ricambio eliminato");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting part:", error);
      toast.error("Errore nell'eliminazione");
    }
  };

  const filteredParts = spareParts.filter((part) => {
    const matchesSearch =
      part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.model_compatibility?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === "all" || part.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const lowStockParts = spareParts.filter(
    (part) => part.stock_quantity <= (part.minimum_stock || 5)
  );

  if (isLoading) {
    return (
      <CentroLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </CentroLayout>
    );
  }

  return (
    <CentroLayout>
      <PageTransition>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Inventario Ricambi</h1>
              <p className="text-muted-foreground">
                Gestisci i ricambi del tuo centro
              </p>
            </div>

            <Dialog 
              open={isCreateDialogOpen} 
              onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (!open) {
                  setEditingPart(null);
                  resetForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Ricambio
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
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
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

          {/* Low Stock Alert */}
          {lowStockParts.length > 0 && (
            <Card className="border-yellow-500/50 bg-yellow-500/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-600">
                      {lowStockParts.length} ricambi con stock basso
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {lowStockParts.map((p) => p.name).join(", ")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, marca o modello..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{spareParts.length}</p>
                    <p className="text-xs text-muted-foreground">Totale Ricambi</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Package className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {spareParts.reduce((sum, p) => sum + p.stock_quantity, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Pezzi in Stock</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{lowStockParts.length}</p>
                    <p className="text-xs text-muted-foreground">Stock Basso</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Package className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {new Set(spareParts.map((p) => p.category)).size}
                    </p>
                    <p className="text-xs text-muted-foreground">Categorie</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Parts List */}
          <Card>
            <CardHeader>
              <CardTitle>Ricambi ({filteredParts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredParts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun ricambio trovato</p>
                  <p className="text-sm">Aggiungi il tuo primo ricambio</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredParts.map((part) => (
                    <div
                      key={part.id}
                      className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          {part.image_url ? (
                            <img
                              src={part.image_url}
                              alt={part.name}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{part.name}</span>
                              <Badge variant="outline">{part.category}</Badge>
                              {part.stock_quantity <= (part.minimum_stock || 5) && (
                                <Badge variant="destructive" className="text-xs">
                                  Stock Basso
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {part.brand && <span>{part.brand}</span>}
                              {part.model_compatibility && (
                                <span> - {part.model_compatibility}</span>
                              )}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span>
                                Stock: <strong>{part.stock_quantity}</strong>
                              </span>
                              {part.cost && (
                                <span className="text-muted-foreground">
                                  Costo: €{part.cost.toFixed(2)}
                                </span>
                              )}
                              {part.selling_price && (
                                <span className="text-green-600">
                                  Vendita: €{part.selling_price.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {part.supplier === "utopya" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                window.open(
                                  `https://www.utopya.it/catalogsearch/result/?q=${encodeURIComponent(
                                    part.name
                                  )}`,
                                  "_blank"
                                )
                              }
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Utopya
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(part)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(part.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </CentroLayout>
  );
}