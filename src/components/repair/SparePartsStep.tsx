import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Trash2, Package, Wrench, Check, Sparkles, Loader2 } from "lucide-react";
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

interface SelectedService {
  id: string;
  name: string;
  price: number;
}

interface AISuggestion {
  partName: string;
  reason: string;
  matchedPart?: SparePart;
}

const AVAILABLE_SERVICES = [
  { id: "data_transfer", name: "Trasferimento Dati", price: 25 },
  { id: "password_recovery", name: "Recupero Password", price: 15 },
  { id: "full_backup", name: "Backup Completo", price: 20 },
  { id: "software_cleanup", name: "Pulizia Software", price: 10 },
  { id: "screen_protector", name: "Applicazione Pellicola", price: 5 },
  { id: "deep_cleaning", name: "Pulizia Profonda", price: 15 },
];

interface SparePartsStepProps {
  deviceBrand?: string;
  deviceModel?: string;
  reportedIssue?: string;
  selectedParts: SelectedPart[];
  onPartsChange: (parts: SelectedPart[]) => void;
  selectedServices?: SelectedService[];
  onServicesChange?: (services: SelectedService[]) => void;
}

export const SparePartsStep = ({
  deviceBrand,
  deviceModel,
  reportedIssue,
  selectedParts,
  onPartsChange,
  selectedServices = [],
  onServicesChange,
}: SparePartsStepProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [filteredParts, setFilteredParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [hasFetchedSuggestions, setHasFetchedSuggestions] = useState(false);

  const toggleService = (service: typeof AVAILABLE_SERVICES[0]) => {
    if (!onServicesChange) return;
    
    const isSelected = selectedServices.some(s => s.id === service.id);
    if (isSelected) {
      onServicesChange(selectedServices.filter(s => s.id !== service.id));
    } else {
      onServicesChange([...selectedServices, service]);
    }
  };

  const getServicesTotalCost = () => {
    return selectedServices.reduce((sum, service) => sum + service.price, 0);
  };

  useEffect(() => {
    loadSpareParts();
  }, []);

  useEffect(() => {
    filterParts();
  }, [searchTerm, spareParts, deviceBrand, deviceModel]);

  // Fetch AI suggestions when reportedIssue is available
  useEffect(() => {
    if (reportedIssue && spareParts.length > 0 && !hasFetchedSuggestions) {
      fetchAISuggestions();
    }
  }, [reportedIssue, spareParts, hasFetchedSuggestions]);

  const fetchAISuggestions = async () => {
    if (!reportedIssue) return;
    
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-spare-parts", {
        body: {
          deviceBrand,
          deviceModel,
          reportedIssue,
          availableParts: spareParts.map(p => ({ name: p.name, category: p.category })),
        },
      });

      if (error) throw error;

      if (data?.suggestions) {
        // Match suggested parts with actual inventory
        const matchedSuggestions: AISuggestion[] = data.suggestions.map((suggestion: any) => {
          const matchedPart = spareParts.find(p => 
            p.name.toLowerCase().includes(suggestion.partName.toLowerCase()) ||
            suggestion.partName.toLowerCase().includes(p.name.toLowerCase()) ||
            p.category.toLowerCase().includes(suggestion.partName.toLowerCase())
          );
          return {
            ...suggestion,
            matchedPart,
          };
        });
        setAiSuggestions(matchedSuggestions);
      }
      setHasFetchedSuggestions(true);
    } catch (error: any) {
      console.error("Error fetching AI suggestions:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

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

  const getGrandTotal = () => {
    return getTotalCost() + getServicesTotalCost();
  };

  return (
    <div className="space-y-6">
      {/* Servizi Aggiuntivi */}
      <div className="space-y-3">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Servizi Aggiuntivi
          </h3>
          <p className="text-sm text-muted-foreground">
            Seleziona i servizi extra richiesti dal cliente
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {AVAILABLE_SERVICES.map((service) => {
            const isSelected = selectedServices.some(s => s.id === service.id);
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => toggleService(service)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected 
                    ? "border-primary bg-primary/10 ring-1 ring-primary" 
                    : "border-border hover:border-primary/50 hover:bg-accent/5"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{service.name}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                </div>
                <span className="text-sm text-primary font-semibold">€{service.price.toFixed(2)}</span>
              </button>
            );
          })}
        </div>

        {selectedServices.length > 0 && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm font-medium">
              Servizi selezionati: {selectedServices.length} • Totale: €{getServicesTotalCost().toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* AI Suggestions Section */}
      {reportedIssue && (
        <div className="border-t border-border pt-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Suggerimenti IA</h3>
              {loadingSuggestions && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <p className="text-sm text-muted-foreground">
              Ricambi suggeriti in base al difetto: "{reportedIssue}"
            </p>
            
            {loadingSuggestions ? (
              <div className="p-4 text-center text-muted-foreground bg-muted/30 rounded-lg">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Analisi del difetto in corso...
              </div>
            ) : aiSuggestions.length > 0 ? (
              <div className="grid gap-2">
                {aiSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-3 border border-primary/30 rounded-lg bg-primary/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{suggestion.partName}</p>
                        <p className="text-xs text-muted-foreground mt-1">{suggestion.reason}</p>
                      </div>
                      {suggestion.matchedPart ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => addPart(suggestion.matchedPart!)}
                          disabled={selectedParts.some(p => p.spare_part_id === suggestion.matchedPart!.id)}
                          className="shrink-0"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {selectedParts.some(p => p.spare_part_id === suggestion.matchedPart!.id) ? "Aggiunto" : "Aggiungi"}
                        </Button>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded shrink-0">
                          Non in magazzino
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : hasFetchedSuggestions ? (
              <div className="p-4 text-center text-muted-foreground bg-muted/30 rounded-lg">
                Nessun suggerimento specifico per questo difetto
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div className="border-t border-border pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Ricambi Necessari</h3>
            <p className="text-sm text-muted-foreground">
              Cerca e seleziona i ricambi necessari per questa riparazione
              {deviceBrand && ` (Compatibili con ${deviceBrand})`}
            </p>
          </div>
          <AddSparePartDialog onPartAdded={loadSpareParts} />
        </div>
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
                Totale Ricambi: €{getTotalCost().toFixed(2)}
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
      </div>

      {selectedParts.length === 0 && selectedServices.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Puoi procedere senza selezionare ricambi o servizi e aggiungerli in seguito
        </p>
      )}

      {/* Totale Complessivo */}
      {(selectedParts.length > 0 || selectedServices.length > 0) && (
        <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
          <p className="text-base font-bold text-right">
            Totale Complessivo: €{getGrandTotal().toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
};
