import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Trash2, Package } from "lucide-react";
import { toast } from "sonner";

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
}

interface SelectedPart {
  spare_part_id: string;
  name: string;
  quantity: number;
  unit_cost: number;
}

interface SparePartsStepProps {
  deviceBrand?: string;
  deviceModel?: string;
  selectedParts: SelectedPart[];
  onPartsChange: (parts: SelectedPart[]) => void;
}

export const SparePartsStep = ({
  deviceBrand,
  deviceModel,
  selectedParts,
  onPartsChange,
}: SparePartsStepProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [filteredParts, setFilteredParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSpareParts();
  }, []);

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

    // Filtra per compatibilità con brand/model se disponibili
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

    // Filtra per termine di ricerca
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
    // Controlla se già selezionato
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

    onPartsChange([...selectedParts, newPart]);
    toast.success(`${part.name} aggiunto`);
  };

  const removePart = (partId: string) => {
    onPartsChange(selectedParts.filter((p) => p.spare_part_id !== partId));
  };

  const updateQuantity = (partId: string, quantity: number) => {
    if (quantity < 1) return;
    onPartsChange(
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Ricambi Necessari</h3>
        <p className="text-sm text-muted-foreground">
          Cerca e seleziona i ricambi necessari per questa riparazione
          {deviceBrand && ` (Compatibili con ${deviceBrand})`}
        </p>
      </div>

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
                Totale Stimato: €{getTotalCost().toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ricerca Ricambi */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cerca ricambi per nome, categoria, codice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{part.name}</p>
                        {part.brand && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {part.brand}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
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
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Aggiungi
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedParts.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Puoi procedere senza selezionare ricambi e aggiungerli in seguito
        </p>
      )}
    </div>
  );
};
