import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Search, Package, Headphones, Smartphone, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SparePart {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  cost: number | null;
  selling_price: number | null;
  stock_quantity: number;
  supplier_code: string | null;
}

interface OrderItemInput {
  id: string;
  product_name: string;
  product_code: string;
  quantity: number;
  unit_cost: number;
  spare_part_id: string | null;
}

interface NewOrderDialogProps {
  onOrderCreated: () => void;
  trigger?: React.ReactNode;
}

export function NewOrderDialog({ onOrderCreated, trigger }: NewOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<OrderItemInput[]>([]);
  const [supplier, setSupplier] = useState("utopya");
  const [notes, setNotes] = useState("");
  
  // Custom item form
  const [customName, setCustomName] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [customQuantity, setCustomQuantity] = useState(1);
  const [customCost, setCustomCost] = useState(0);

  useEffect(() => {
    if (open) {
      loadSpareParts();
    }
  }, [open]);

  const loadSpareParts = async () => {
    const { data, error } = await supabase
      .from("spare_parts")
      .select("id, name, category, brand, cost, selling_price, stock_quantity, supplier_code")
      .order("name");
    
    if (!error && data) {
      setSpareParts(data);
    }
  };

  const filteredParts = spareParts.filter(part => {
    if (!searchTerm) return false;
    const term = searchTerm.toLowerCase();
    return (
      part.name.toLowerCase().includes(term) ||
      part.category.toLowerCase().includes(term) ||
      (part.brand && part.brand.toLowerCase().includes(term)) ||
      (part.supplier_code && part.supplier_code.toLowerCase().includes(term))
    );
  });

  const addPartToOrder = (part: SparePart) => {
    if (items.some(i => i.spare_part_id === part.id)) {
      toast.info("Articolo già aggiunto");
      return;
    }
    
    setItems([...items, {
      id: `part-${Date.now()}`,
      product_name: part.name,
      product_code: part.supplier_code || "",
      quantity: 1,
      unit_cost: part.cost || 0,
      spare_part_id: part.id,
    }]);
    setSearchTerm("");
  };

  const addCustomItem = () => {
    if (!customName.trim()) {
      toast.error("Inserisci il nome del prodotto");
      return;
    }
    
    setItems([...items, {
      id: `custom-${Date.now()}`,
      product_name: customName,
      product_code: customCode,
      quantity: customQuantity,
      unit_cost: customCost,
      spare_part_id: null,
    }]);
    
    // Reset form
    setCustomName("");
    setCustomCode("");
    setCustomQuantity(1);
    setCustomCost(0);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItemQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(items.map(i => i.id === id ? { ...i, quantity } : i));
  };

  const updateItemCost = (id: string, cost: number) => {
    setItems(items.map(i => i.id === id ? { ...i, unit_cost: cost } : i));
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);
  };

  const handleCreateOrder = async () => {
    if (items.length === 0) {
      toast.error("Aggiungi almeno un articolo");
      return;
    }

    setLoading(true);
    try {
      // Generate order number
      const orderNumber = `ORD-${Date.now()}`;
      
      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          supplier,
          status: "draft",
          total_amount: getTotalAmount(),
          notes: notes || null,
          repair_id: null,
          customer_id: null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_name: item.product_name,
        product_code: item.product_code || null,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        spare_part_id: item.spare_part_id,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success("Ordine creato con successo");
      setOpen(false);
      resetForm();
      onOrderCreated();
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast.error("Errore nella creazione dell'ordine");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setItems([]);
    setSupplier("utopya");
    setNotes("");
    setSearchTerm("");
    setCustomName("");
    setCustomCode("");
    setCustomQuantity(1);
    setCustomCost(0);
  };

  const getCategoryIcon = (category: string) => {
    if (category === "Accessori") return <Headphones className="h-3 w-3" />;
    if (category === "Dispositivi") return <Smartphone className="h-3 w-3" />;
    return null;
  };

  const getCategoryStyle = (category: string) => {
    if (category === "Accessori") return "border-purple-500/50 text-purple-600 bg-purple-500/10";
    if (category === "Dispositivi") return "border-cyan-500/50 text-cyan-600 bg-cyan-500/10";
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuovo Ordine
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Nuovo Ordine Indipendente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Supplier */}
          <div className="space-y-2">
            <Label>Fornitore</Label>
            <Select value={supplier} onValueChange={setSupplier}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utopya">Utopya</SelectItem>
                <SelectItem value="altro">Altro Fornitore</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search from inventory */}
          <div className="space-y-2">
            <Label>Cerca nell'inventario</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, categoria, codice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {filteredParts.length > 0 && (
              <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
                {filteredParts.slice(0, 10).map(part => (
                  <div
                    key={part.id}
                    className="p-2 hover:bg-accent/50 cursor-pointer flex items-center justify-between gap-2"
                    onClick={() => addPartToOrder(part)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{part.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className={cn("text-[10px] flex items-center gap-1", getCategoryStyle(part.category))}>
                          {getCategoryIcon(part.category)}
                          {part.category}
                        </Badge>
                        {part.supplier_code && <span>Cod: {part.supplier_code}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">€{(part.cost || 0).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Stock: {part.stock_quantity}</p>
                    </div>
                    <Plus className="h-4 w-4 text-primary shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom item */}
          <div className="p-4 border border-dashed rounded-lg bg-muted/30 space-y-3">
            <Label className="text-sm font-medium">Aggiungi articolo personalizzato</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome Prodotto *</Label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="es. Cover iPhone 15"
                />
              </div>
              <div>
                <Label className="text-xs">Codice</Label>
                <Input
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  placeholder="SKU"
                />
              </div>
              <div>
                <Label className="text-xs">Quantità</Label>
                <Input
                  type="number"
                  min={1}
                  value={customQuantity}
                  onChange={(e) => setCustomQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label className="text-xs">Costo Unitario (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={customCost}
                  onChange={(e) => setCustomCost(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addCustomItem} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Articolo
            </Button>
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="space-y-2">
              <Label>Articoli nell'ordine ({items.length})</Label>
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {items.map(item => (
                  <div key={item.id} className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product_name}</p>
                      {item.product_code && (
                        <p className="text-xs text-muted-foreground">Cod: {item.product_code}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={item.unit_cost}
                          onChange={(e) => updateItemCost(item.id, parseFloat(e.target.value) || 0)}
                          className="h-7 text-xs text-right"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm text-muted-foreground">Totale Ordine</span>
                <span className="text-lg font-bold text-primary">€{getTotalAmount().toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Note (opzionale)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note per l'ordine..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Annulla
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleCreateOrder}
              disabled={loading || items.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creazione...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crea Ordine
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
