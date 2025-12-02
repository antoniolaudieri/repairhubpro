import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import AddSparePartDialog from "@/components/inventory/AddSparePartDialog";

interface SparePart {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  stock_quantity: number;
  cost: number | null;
  selling_price: number | null;
  supplier_code: string | null;
  model_compatibility: string | null;
  image_url: string | null;
}

interface SelectedPart {
  spare_part_id: string;
  name: string;
  quantity: number;
  unit_cost: number;
}

interface AddRepairPartsDialogProps {
  repairId: string;
  deviceBrand?: string;
  deviceModel?: string;
  onPartsAdded: () => void;
}

export default function AddRepairPartsDialog({
  repairId,
  deviceBrand,
  deviceModel,
  onPartsAdded,
}: AddRepairPartsDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [filteredParts, setFilteredParts] = useState<SparePart[]>([]);
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadSpareParts();
    }
  }, [open]);

  useEffect(() => {
    filterParts();
  }, [searchTerm, spareParts, deviceBrand, deviceModel]);

  const loadSpareParts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("spare_parts")
        .select("*")
        .order("name");

      if (error) throw error;
      setSpareParts(data || []);
    } catch (error: any) {
      console.error("Error loading spare parts:", error);
      toast.error("Errore nel caricamento ricambi");
    } finally {
      setLoading(false);
    }
  };

  const filterParts = () => {
    let filtered = spareParts;

    if (deviceBrand) {
      filtered = filtered.filter(
        (part) =>
          !part.brand ||
          part.brand.toLowerCase().includes(deviceBrand.toLowerCase()) ||
          (part.model_compatibility &&
            part.model_compatibility
              .toLowerCase()
              .includes(deviceBrand.toLowerCase()))
      );
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (part) =>
          part.name.toLowerCase().includes(term) ||
          part.category.toLowerCase().includes(term) ||
          (part.brand && part.brand.toLowerCase().includes(term)) ||
          (part.supplier_code &&
            part.supplier_code.toLowerCase().includes(term))
      );
    }

    setFilteredParts(filtered);
  };

  const addPart = (part: SparePart) => {
    if (selectedParts.some((p) => p.spare_part_id === part.id)) {
      toast.info("Ricambio già aggiunto");
      return;
    }

    const newPart: SelectedPart = {
      spare_part_id: part.id,
      name: part.name,
      quantity: 1,
      unit_cost: part.cost || part.selling_price || 0,
    };

    setSelectedParts([...selectedParts, newPart]);
    toast.success(`${part.name} aggiunto`);
  };

  const removePart = (partId: string) => {
    setSelectedParts(selectedParts.filter((p) => p.spare_part_id !== partId));
  };

  const updateQuantity = (partId: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedParts(
      selectedParts.map((p) =>
        p.spare_part_id === partId ? { ...p, quantity } : p
      )
    );
  };

  const getTotalCost = () => {
    return selectedParts.reduce(
      (sum, part) => sum + part.unit_cost * part.quantity,
      0
    );
  };

  const handleSave = async () => {
    if (selectedParts.length === 0) {
      toast.error("Seleziona almeno un ricambio");
      return;
    }

    setSaving(true);
    try {
      // Inserisci i ricambi nella tabella repair_parts
      const { error: repairPartsError } = await supabase
        .from("repair_parts")
        .insert(
          selectedParts.map((part) => ({
            repair_id: repairId,
            spare_part_id: part.spare_part_id,
            quantity: part.quantity,
            unit_cost: part.unit_cost,
          }))
        );

      if (repairPartsError) throw repairPartsError;

      // Trova o crea un ordine per questa riparazione
      const { data: existingOrders, error: ordersError } = await supabase
        .from("orders")
        .select("id, order_number")
        .eq("repair_id", repairId)
        .eq("status", "draft")
        .limit(1);

      if (ordersError) throw ordersError;

      let orderId: string;
      
      if (existingOrders && existingOrders.length > 0) {
        // Usa l'ordine esistente
        orderId = existingOrders[0].id;
      } else {
        // Crea un nuovo ordine
        const orderNumber = `ORD-${Date.now()}`;
        const { data: newOrder, error: createOrderError } = await supabase
          .from("orders")
          .insert({
            order_number: orderNumber,
            repair_id: repairId,
            status: "draft",
            supplier: "utopya",
            total_amount: getTotalCost(),
          })
          .select()
          .single();

        if (createOrderError) throw createOrderError;
        orderId = newOrder.id;
      }

      // Aggiungi gli item all'ordine
      const { error: orderItemsError } = await supabase
        .from("order_items")
        .insert(
          selectedParts.map((part) => ({
            order_id: orderId,
            spare_part_id: part.spare_part_id,
            product_name: part.name,
            quantity: part.quantity,
            unit_cost: part.unit_cost,
          }))
        );

      if (orderItemsError) throw orderItemsError;

      // Aggiorna il totale dell'ordine
      const { error: updateOrderError } = await supabase
        .from("orders")
        .update({ total_amount: getTotalCost() })
        .eq("id", orderId);

      if (updateOrderError) throw updateOrderError;

      toast.success(`${selectedParts.length} ricambi aggiunti alla riparazione`);
      setSelectedParts([]);
      setSearchTerm("");
      setOpen(false);
      onPartsAdded();
    } catch (error: any) {
      console.error("Error adding parts:", error);
      toast.error("Errore nell'aggiungere i ricambi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Ricambi
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aggiungi Ricambi alla Riparazione</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Ricambi Selezionati */}
          {selectedParts.length > 0 && (
            <div className="p-4 border border-border rounded-lg bg-accent/5">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Ricambi Selezionati ({selectedParts.length})
              </h4>
              <div className="space-y-2">
                {selectedParts.map((part) => (
                  <div
                    key={part.spare_part_id}
                    className="flex items-center gap-3 p-2 bg-background rounded border border-border"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{part.name}</p>
                      <p className="text-xs text-muted-foreground">
                        €{part.unit_cost.toFixed(2)} cad.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateQuantity(part.spare_part_id, part.quantity - 1)
                        }
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{part.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateQuantity(part.spare_part_id, part.quantity + 1)
                        }
                      >
                        +
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePart(part.spare_part_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-border">
                  <p className="text-sm font-semibold text-right">
                    Totale: €{getTotalCost().toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ricerca Ricambi */}
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cerca ricambi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <AddSparePartDialog onPartAdded={loadSpareParts} />
          </div>

          {/* Lista Ricambi */}
          <div className="border border-border rounded-lg max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                Caricamento ricambi...
              </div>
            ) : filteredParts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nessun ricambio trovato
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredParts.map((part) => (
                  <div
                    key={part.id}
                    className="p-3 hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {part.image_url && (
                        <img 
                          src={part.image_url} 
                          alt={part.name}
                          className="h-16 w-16 object-contain rounded border bg-background shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{part.name}</p>
                          {part.brand && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              {part.brand}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span>{part.category}</span>
                          {part.supplier_code && (
                            <span className="text-xs">
                              Cod: {part.supplier_code}
                            </span>
                          )}
                          <span
                            className={
                              part.stock_quantity > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            Stock: {part.stock_quantity}
                          </span>
                        </div>
                        {part.selling_price && (
                          <p className="text-sm font-medium mt-1">
                            €{part.selling_price.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addPart(part)}
                        disabled={selectedParts.some(
                          (p) => p.spare_part_id === part.id
                        )}
                        className="shrink-0"
                      >
                        <Plus className="h-4 w-4 md:mr-1" />
                        <span className="hidden md:inline">Aggiungi</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Azioni */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || selectedParts.length === 0}
            >
              {saving ? "Salvataggio..." : `Aggiungi ${selectedParts.length} Ricambi`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
