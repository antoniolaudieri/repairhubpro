import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Trash2, Package, Wrench, Check, Sparkles, Loader2, Hammer, ExternalLink, Pencil, Headphones, Smartphone } from "lucide-react";
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
  unit_cost: number; // Prezzo vendita al cliente
  purchase_cost?: number; // Costo acquisto fornitore (opzionale)
}

interface SelectedService {
  id: string;
  name: string;
  price: number;
}

interface LaborPrice {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  device_type: string | null;
}

interface SelectedLabor {
  id: string;
  name: string;
  price: number;
}

interface AdditionalServiceDB {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
}

interface AISuggestion {
  partName: string;
  reason: string;
  estimatedPrice: number;
  category: string;
  imageUrl?: string;
  inStock: boolean;
  matchedPartId?: string;
  stockQuantity: number;
  actualPrice?: number;
  utopyaUrl?: string;
  utopyaName?: string;
  hasUtopyaMatch?: boolean;
}

interface SparePartsStepProps {
  deviceBrand?: string;
  deviceModel?: string;
  deviceType?: string;
  reportedIssue?: string;
  selectedParts: SelectedPart[];
  onPartsChange: (parts: SelectedPart[]) => void;
  selectedServices?: SelectedService[];
  onServicesChange?: (services: SelectedService[]) => void;
  selectedLabors?: SelectedLabor[];
  onLaborsChange?: (labors: SelectedLabor[]) => void;
  laborCost?: number;
  onLaborCostChange?: (cost: number) => void;
}

export const SparePartsStep = ({
  deviceBrand,
  deviceModel,
  deviceType,
  reportedIssue,
  selectedParts,
  onPartsChange,
  selectedServices = [],
  onServicesChange,
  selectedLabors = [],
  onLaborsChange,
  laborCost = 0,
  onLaborCostChange,
}: SparePartsStepProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [filteredParts, setFilteredParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiLaborSuggestions, setAiLaborSuggestions] = useState<{ laborName: string; reason: string; matched: boolean; matchedId: string | null; price: number; category: string | null }[]>([]);
  const [aiServiceSuggestions, setAiServiceSuggestions] = useState<{ serviceName: string; reason: string; matched: boolean; matchedId: string | null; price: number }[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [hasFetchedSuggestions, setHasFetchedSuggestions] = useState(false);
  const [laborPrices, setLaborPrices] = useState<LaborPrice[]>([]);
  const [customLaborCost, setCustomLaborCost] = useState<number>(0);
  const [availableServices, setAvailableServices] = useState<AdditionalServiceDB[]>([]);
  const [markupPercentage, setMarkupPercentage] = useState<number>(40);
  
  // Utopya manual search
  const [utopyaSearchQuery, setUtopyaSearchQuery] = useState("");
  const [utopyaSearchResults, setUtopyaSearchResults] = useState<any[]>([]);
  const [utopyaSearchLoading, setUtopyaSearchLoading] = useState(false);

  const searchUtopya = async () => {
    if (!utopyaSearchQuery.trim()) {
      toast.error("Inserisci un termine di ricerca");
      return;
    }
    
    setUtopyaSearchLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-utopya', {
        body: { searchQuery: utopyaSearchQuery.trim() }
      });
      
      if (error) throw error;
      
      if (data?.products && data.products.length > 0) {
        setUtopyaSearchResults(data.products);
        toast.success(`Trovati ${data.products.length} prodotti su Utopya`);
      } else {
        setUtopyaSearchResults([]);
        toast.info("Nessun prodotto trovato su Utopya");
      }
    } catch (err: any) {
      console.error("Utopya search error:", err);
      toast.error("Errore nella ricerca su Utopya");
      setUtopyaSearchResults([]);
    } finally {
      setUtopyaSearchLoading(false);
    }
  };

  const addUtopyaProduct = (product: any) => {
    const price = product.priceNumeric || 0;
    const sellingPrice = price * (1 + markupPercentage / 100);
    
    const newPart: SelectedPart = {
      spare_part_id: `utopya-${Date.now()}`,
      name: product.name,
      quantity: 1,
      unit_cost: Math.round(sellingPrice * 100) / 100,
      purchase_cost: price,
    };
    
    onPartsChange([...selectedParts, newPart]);
    toast.success(`${product.name} aggiunto`);
  };

  const toggleService = (service: AdditionalServiceDB) => {
    if (!onServicesChange) return;
    
    const isSelected = selectedServices.some(s => s.id === service.id);
    if (isSelected) {
      onServicesChange(selectedServices.filter(s => s.id !== service.id));
    } else {
      onServicesChange([...selectedServices, { id: service.id, name: service.name, price: service.price }]);
    }
  };

  const getServicesTotalCost = () => {
    return selectedServices.reduce((sum, service) => sum + service.price, 0);
  };

  useEffect(() => {
    loadSpareParts();
    loadLaborPrices();
    loadServices();
  }, []);

  useEffect(() => {
    filterParts();
  }, [searchTerm, spareParts, deviceBrand, deviceModel]);

  // Update total labor cost when selectedLabors or customLaborCost changes
  useEffect(() => {
    const laborsTotal = selectedLabors.reduce((sum, l) => sum + l.price, 0);
    const total = laborsTotal + customLaborCost;
    onLaborCostChange?.(total);
  }, [selectedLabors, customLaborCost]);

  const loadLaborPrices = async () => {
    try {
      const { data, error } = await supabase
        .from("labor_prices")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setLaborPrices(data || []);
    } catch (error: any) {
      console.error("Error loading labor prices:", error);
    }
  };

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from("additional_services")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setAvailableServices(data || []);
    } catch (error: any) {
      console.error("Error loading services:", error);
    }
  };

  const toggleLabor = (labor: LaborPrice) => {
    if (!onLaborsChange) return;
    
    const isSelected = selectedLabors.some(l => l.id === labor.id);
    if (isSelected) {
      onLaborsChange(selectedLabors.filter(l => l.id !== labor.id));
    } else {
      onLaborsChange([...selectedLabors, { id: labor.id, name: labor.name, price: labor.price }]);
    }
  };

  const getLaborsTotalCost = () => {
    return selectedLabors.reduce((sum, labor) => sum + labor.price, 0) + customLaborCost;
  };

  // Filter labor prices by device type
  const filteredLaborPrices = laborPrices.filter(lp => 
    !lp.device_type || !deviceType || 
    lp.device_type.toLowerCase() === deviceType.toLowerCase()
  );

  // Fetch AI suggestions when reportedIssue is available (even without inventory)
  useEffect(() => {
    if (reportedIssue && !hasFetchedSuggestions && !loading) {
      fetchAISuggestions();
    }
  }, [reportedIssue, hasFetchedSuggestions, loading]);

  const fetchAISuggestions = async () => {
    if (!reportedIssue) return;
    
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-spare-parts", {
        body: {
          deviceBrand,
          deviceModel,
          deviceType,
          reportedIssue,
          availableParts: spareParts.map(p => ({ 
            id: p.id,
            name: p.name, 
            category: p.category,
            stock_quantity: p.stock_quantity,
            selling_price: p.selling_price,
            cost: p.cost,
          })),
        },
      });

      if (error) throw error;

      if (data?.suggestions) {
        setAiSuggestions(data.suggestions);
      }
      if (data?.laborSuggestions) {
        setAiLaborSuggestions(data.laborSuggestions);
      }
      if (data?.serviceSuggestions) {
        setAiServiceSuggestions(data.serviceSuggestions);
      }
      setHasFetchedSuggestions(true);
    } catch (error: any) {
      console.error("Error fetching AI suggestions:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const addSuggestedLabor = (suggestion: { laborName: string; matchedId: string | null; price: number }) => {
    if (!onLaborsChange || !suggestion.matchedId) return;
    
    const isSelected = selectedLabors.some(l => l.id === suggestion.matchedId);
    if (isSelected) {
      toast.info("Lavorazione già aggiunta");
      return;
    }
    
    onLaborsChange([...selectedLabors, { id: suggestion.matchedId, name: suggestion.laborName, price: suggestion.price }]);
    toast.success(`${suggestion.laborName} aggiunta`);
  };

  const addSuggestedService = (suggestion: { serviceName: string; matchedId: string | null; price: number }) => {
    if (!onServicesChange || !suggestion.matchedId) return;
    
    const isSelected = selectedServices.some(s => s.id === suggestion.matchedId);
    if (isSelected) {
      toast.info("Servizio già aggiunto");
      return;
    }
    
    onServicesChange([...selectedServices, { id: suggestion.matchedId, name: suggestion.serviceName, price: suggestion.price }]);
    toast.success(`${suggestion.serviceName} aggiunto`);
  };

  const addSuggestedPart = (suggestion: AISuggestion) => {
    // Check if already added
    const existingPart = selectedParts.find(p => 
      p.name.toLowerCase().includes(suggestion.partName.toLowerCase()) ||
      (suggestion.matchedPartId && p.spare_part_id === suggestion.matchedPartId)
    );
    
    if (existingPart) {
      toast.info("Ricambio già aggiunto");
      return;
    }

    // Prezzo Utopya = costo acquisto
    const utopyaPrice = suggestion.actualPrice || suggestion.estimatedPrice;
    
    // Trova il ricambio nel magazzino per vedere se c'è già un prezzo vendita
    const matchedPart = spareParts.find(p => p.id === suggestion.matchedPartId);
    
    // Prezzo vendita = prezzo magazzino se esiste, altrimenti applica markup del 40%
    const sellingPrice = matchedPart?.selling_price || utopyaPrice * (1 + markupPercentage / 100);

    const newPart: SelectedPart = {
      spare_part_id: suggestion.matchedPartId || `suggested-${Date.now()}`,
      name: suggestion.partName,
      quantity: 1,
      unit_cost: sellingPrice, // Prezzo vendita al cliente (modificabile)
      purchase_cost: utopyaPrice, // Costo acquisto da Utopya
    };

    onPartsChange([...selectedParts, newPart]);
    toast.success(`${suggestion.partName} aggiunto - Imposta il prezzo di vendita`);
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
      unit_cost: part.selling_price || part.cost || 0, // Prezzo vendita
      purchase_cost: part.cost || 0, // Costo acquisto
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

  const updatePurchaseCost = (partId: string, purchaseCost: number) => {
    // Aggiorna lo stato locale
    onPartsChange(
      selectedParts.map((p) =>
        p.spare_part_id === partId ? { ...p, purchase_cost: purchaseCost } : p
      )
    );
  };

  const updateUnitCost = (partId: string, unitCost: number) => {
    onPartsChange(
      selectedParts.map((p) =>
        p.spare_part_id === partId ? { ...p, unit_cost: unitCost } : p
      )
    );
  };

  // Salva il costo d'acquisto nel database (on blur)
  const savePurchaseCostToDb = async (partId: string, purchaseCost: number) => {
    // Salta se è un part suggerito (non nel database)
    if (partId.startsWith('suggested-')) return;
    
    try {
      const { error } = await supabase
        .from("spare_parts")
        .update({ cost: purchaseCost })
        .eq("id", partId);
      
      if (error) {
        console.error("Errore salvataggio costo:", error);
      } else {
        toast.success("Costo acquisto salvato nell'inventario", { duration: 2000 });
      }
    } catch (err) {
      console.error("Errore salvataggio costo:", err);
    }
  };

  const getTotalCost = () => {
    return selectedParts.reduce(
      (sum, part) => sum + part.unit_cost * part.quantity,
      0
    );
  };

  const getGrandTotal = () => {
    return getTotalCost() + getServicesTotalCost() + getLaborsTotalCost();
  };

  return (
    <div className="space-y-6">
      {/* Markup Configuration - Prominent at top */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              📊 Ricarico Predefinito
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Applicato automaticamente ai nuovi ricambi aggiunti
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="500"
              value={markupPercentage}
              onChange={(e) => setMarkupPercentage(parseFloat(e.target.value) || 0)}
              className="w-20 h-9 text-center font-semibold"
            />
            <span className="text-sm font-medium">%</span>
          </div>
        </div>
      </div>

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
        
        {availableServices.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {availableServices.map((service) => {
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
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            Nessun servizio disponibile
          </p>
        )}

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
              <div className="grid gap-3">
                {aiSuggestions.map((suggestion, index) => {
                  const isAdded = selectedParts.some(p => 
                    p.name.toLowerCase().includes(suggestion.partName.toLowerCase()) ||
                    (suggestion.matchedPartId && p.spare_part_id === suggestion.matchedPartId)
                  );
                  
                  return (
                    <div
                      key={index}
                      className="p-4 border border-primary/30 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5"
                    >
                      <div className="flex gap-4">
                        {/* Image */}
                        <div className="shrink-0">
                          {suggestion.imageUrl ? (
                            <img 
                              src={suggestion.imageUrl} 
                              alt={suggestion.partName}
                              className="w-20 h-20 object-cover rounded-lg border border-border bg-background"
                              onError={(e) => {
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400';
                              }}
                            />
                          ) : (
                            <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-sm">{suggestion.partName}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
                                  suggestion.category === "Accessori" ? "bg-purple-500/10 text-purple-600" :
                                  suggestion.category === "Dispositivi" ? "bg-cyan-500/10 text-cyan-600" :
                                  "bg-primary/10 text-primary"
                                }`}>
                                  {suggestion.category === "Accessori" && <Headphones className="h-3 w-3" />}
                                  {suggestion.category === "Dispositivi" && <Smartphone className="h-3 w-3" />}
                                  {suggestion.category}
                                </span>
                                {suggestion.hasUtopyaMatch && (
                                  <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    Utopya
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-muted-foreground">Costo Utopya:</p>
                              <p className="font-bold text-lg text-primary">
                                €{(suggestion.actualPrice || suggestion.estimatedPrice).toFixed(2)}
                              </p>
                              {suggestion.inStock ? (
                                <span className="text-xs text-green-600">
                                  In magazzino ({suggestion.stockQuantity})
                                </span>
                              ) : (
                                <span className="text-xs text-amber-600">
                                  Da ordinare
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{suggestion.reason}</p>
                          {suggestion.utopyaName && (
                            <p className="text-xs text-primary/70 mt-1">
                              Utopya: {suggestion.utopyaName}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap gap-2 mt-3">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => addSuggestedPart(suggestion)}
                              disabled={isAdded}
                              className="w-full sm:w-auto"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              {isAdded ? "Aggiunto" : "Aggiungi alla riparazione"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              asChild
                              className="w-full sm:w-auto border-primary/50 hover:bg-primary/10"
                            >
                              <a 
                                href={suggestion.utopyaUrl || `https://www.utopya.it/catalogsearch/result/?q=${encodeURIComponent(suggestion.partName)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                {suggestion.hasUtopyaMatch ? "Vedi su Utopya" : "Cerca su Utopya"}
                              </a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : hasFetchedSuggestions && aiLaborSuggestions.length === 0 && aiServiceSuggestions.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground bg-muted/30 rounded-lg">
                Nessun suggerimento specifico per questo difetto
              </div>
            ) : null}

            {/* Manual Utopya Search */}
            <div className="mt-6 p-4 border border-dashed border-border rounded-lg bg-muted/20">
              <div className="flex items-center gap-2 mb-3">
                <Search className="h-5 w-5 text-primary" />
                <h4 className="text-base font-semibold">Cerca su Utopya</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Non trovi il ricambio? Cerca manualmente nel catalogo Utopya
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Es: iPhone 14 Pro display OLED"
                  value={utopyaSearchQuery}
                  onChange={(e) => setUtopyaSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUtopya()}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={searchUtopya}
                  disabled={utopyaSearchLoading}
                >
                  {utopyaSearchLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Search Results */}
              {utopyaSearchResults.length > 0 && (
                <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
                  <p className="text-xs text-muted-foreground mb-2">
                    {utopyaSearchResults.length} risultati trovati
                  </p>
                  {utopyaSearchResults.map((product, index) => {
                    const isAdded = selectedParts.some(p => 
                      p.name.toLowerCase() === product.name?.toLowerCase()
                    );
                    return (
                      <div
                        key={index}
                        className="p-3 border border-border rounded-lg bg-background flex gap-3 items-center"
                      >
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name}
                            className="w-14 h-14 object-cover rounded border"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-14 h-14 bg-muted rounded flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          {product.sku && (
                            <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {product.priceNumeric > 0 ? (
                              <span className="text-sm font-bold text-primary">
                                €{product.priceNumeric.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600">Prezzo su richiesta</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => addUtopyaProduct(product)}
                            disabled={isAdded || product.priceNumeric <= 0}
                            className="text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {isAdded ? "Aggiunto" : "Aggiungi"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            asChild
                            className="text-xs"
                          >
                            <a href={product.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Vedi
                            </a>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AI Labor Suggestions */}
            {aiLaborSuggestions.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Hammer className="h-5 w-5 text-amber-500" />
                  <h4 className="text-base font-semibold">Manodopera Suggerita</h4>
                </div>
                <div className="grid gap-3">
                  {aiLaborSuggestions.map((suggestion, index) => {
                    const isAdded = selectedLabors.some(l => l.id === suggestion.matchedId);
                    return (
                      <div
                        key={index}
                        className="p-4 border border-amber-500/30 rounded-lg bg-gradient-to-r from-amber-500/5 to-orange-500/5"
                      >
                        <div className="flex gap-4">
                          {/* Icon */}
                          <div className="shrink-0">
                            <div className="w-16 h-16 bg-amber-500/10 rounded-lg flex items-center justify-center">
                              <Hammer className="h-8 w-8 text-amber-500" />
                            </div>
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-sm">{suggestion.laborName}</p>
                                {suggestion.category && (
                                  <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded mt-1 inline-block">
                                    {suggestion.category}
                                  </span>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                {suggestion.matched ? (
                                  <>
                                    <p className="font-bold text-lg text-amber-600">
                                      €{suggestion.price.toFixed(2)}
                                    </p>
                                    <span className="text-xs text-green-600">
                                      Disponibile
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    Non in listino
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{suggestion.reason}</p>
                            
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => addSuggestedLabor(suggestion)}
                              disabled={isAdded || !suggestion.matched}
                              className="mt-3 w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              {isAdded ? "Aggiunta" : "Aggiungi alla riparazione"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Service Suggestions */}
            {aiServiceSuggestions.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" />
                  Servizi Suggeriti
                </p>
                <div className="grid gap-2">
                  {aiServiceSuggestions.map((suggestion, index) => {
                    const isAdded = selectedServices.some(s => s.id === suggestion.matchedId);
                    return (
                      <div
                        key={index}
                        className="p-3 border border-green-500/30 rounded-lg bg-gradient-to-r from-green-500/5 to-emerald-500/5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{suggestion.serviceName}</p>
                            <p className="text-xs text-muted-foreground mt-1">{suggestion.reason}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {suggestion.matched && (
                              <span className="font-bold text-green-600">€{suggestion.price.toFixed(2)}</span>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => addSuggestedService(suggestion)}
                              disabled={isAdded || !suggestion.matched}
                              className="border-green-500/50 hover:bg-green-500/10"
                            >
                              {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <h4 className="font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Ricambi Selezionati ({selectedParts.length})
            </h4>
            {/* Applica Ricarico button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const partsWithCost = selectedParts.filter(p => p.purchase_cost && p.purchase_cost > 0);
                if (partsWithCost.length === 0) {
                  toast.error("Imposta prima il costo d'acquisto dei ricambi");
                  return;
                }
                const updatedParts = selectedParts.map(p => {
                  if (p.purchase_cost && p.purchase_cost > 0) {
                    return { ...p, unit_cost: Math.round(p.purchase_cost * (1 + markupPercentage / 100) * 100) / 100 };
                  }
                  return p;
                });
                onPartsChange(updatedParts);
                toast.success(`Ricarico ${markupPercentage}% applicato a ${partsWithCost.length} ricambi`);
              }}
              className="h-8 text-xs"
            >
              Applica Ricarico {markupPercentage}%
            </Button>
          </div>
          <div className="space-y-2">
            {selectedParts.map((part) => {
              const hasCost = part.purchase_cost && part.purchase_cost > 0;
              return (
                <div
                  key={part.spare_part_id}
                  className={`flex flex-col gap-3 p-3 bg-background rounded border ${!hasCost ? 'border-warning/50' : 'border-border'}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{part.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">
                          Prezzo cliente:
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">€</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={part.unit_cost || ''}
                            onChange={(e) => updateUnitCost(part.spare_part_id, parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-20 h-6 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
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
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        asChild
                        className="border-primary/50 hover:bg-primary/10"
                      >
                      <a 
                        href={`https://www.utopya.it/catalogsearch/result/?q=${encodeURIComponent(part.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Acquista</span>
                        </a>
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
                  {/* Costo acquisto inline */}
                  <div className={`flex items-center gap-2 pt-2 border-t ${!hasCost ? 'border-warning/30' : 'border-border/50'}`}>
                    <label className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                      {!hasCost && <span className="text-warning">⚠</span>}
                      Costo acquisto:
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs">€</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={part.purchase_cost || ''}
                        onChange={(e) => updatePurchaseCost(part.spare_part_id, parseFloat(e.target.value) || 0)}
                        onBlur={(e) => {
                          const cost = parseFloat(e.target.value) || 0;
                          if (cost > 0) {
                            savePurchaseCostToDb(part.spare_part_id, cost);
                          }
                        }}
                        placeholder="0.00"
                        className={`w-20 h-7 text-xs ${!hasCost ? 'border-warning/50 focus-visible:ring-warning' : ''}`}
                      />
                    </div>
                    {hasCost && part.purchase_cost && part.purchase_cost > 0 && (
                      <span className="text-xs text-success ml-auto">
                        Margine: €{((part.unit_cost - part.purchase_cost) * part.quantity).toFixed(2)} ({(((part.unit_cost - part.purchase_cost) / part.purchase_cost) * 100).toFixed(0)}%)
                      </span>
                    )}
                    {!hasCost && (
                      <span className="text-xs text-warning ml-auto">
                        Imposta per calcolo margine
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
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
                        <span className={`flex items-center gap-1 ${
                          part.category === "Accessori" ? "text-purple-600" : 
                          part.category === "Dispositivi" ? "text-cyan-600" : ""
                        }`}>
                          {part.category === "Accessori" && <Headphones className="h-3 w-3" />}
                          {part.category === "Dispositivi" && <Smartphone className="h-3 w-3" />}
                          {part.category}
                        </span>
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

      {/* Manodopera */}
      <div className="border-t border-border pt-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Hammer className="h-5 w-5" />
              Manodopera
            </h3>
            <p className="text-sm text-muted-foreground">
              Seleziona le lavorazioni predefinite o inserisci un importo personalizzato
            </p>
          </div>

          {/* Predefined Labor Prices */}
          {filteredLaborPrices.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Lavorazioni Predefinite</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {filteredLaborPrices.map((labor) => {
                  const isSelected = selectedLabors.some(l => l.id === labor.id);
                  return (
                    <button
                      key={labor.id}
                      type="button"
                      onClick={() => toggleLabor(labor)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        isSelected 
                          ? "border-primary bg-primary/10 ring-1 ring-primary" 
                          : "border-border hover:border-primary/50 hover:bg-accent/5"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm block truncate">{labor.name}</span>
                          {labor.description && (
                            <span className="text-xs text-muted-foreground block truncate">{labor.description}</span>
                          )}
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                      <span className="text-sm text-primary font-semibold mt-1 block">€{labor.price.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Labors Summary */}
          {selectedLabors.length > 0 && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="space-y-1">
                {selectedLabors.map((labor) => (
                  <div key={labor.id} className="flex justify-between text-sm">
                    <span>{labor.name}</span>
                    <span className="font-medium">€{labor.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 mt-2 border-t border-primary/20">
                <p className="text-sm font-semibold flex justify-between">
                  <span>Subtotale Lavorazioni:</span>
                  <span>€{selectedLabors.reduce((sum, l) => sum + l.price, 0).toFixed(2)}</span>
                </p>
              </div>
            </div>
          )}

          {/* Custom Labor Cost */}
          <div className="flex items-center gap-3 pt-2">
            <span className="text-sm text-muted-foreground">Manodopera aggiuntiva:</span>
            <span className="text-lg font-medium">€</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={customLaborCost || ""}
              onChange={(e) => setCustomLaborCost(parseFloat(e.target.value) || 0)}
              className="w-28 text-base font-semibold"
            />
          </div>

          {getLaborsTotalCost() > 0 && (
            <div className="p-3 bg-accent/10 rounded-lg">
              <p className="text-sm font-semibold flex justify-between">
                <span>Totale Manodopera:</span>
                <span className="text-primary">€{getLaborsTotalCost().toFixed(2)}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Totale Complessivo */}
      {(selectedParts.length > 0 || selectedServices.length > 0 || getLaborsTotalCost() > 0) && (
        <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
          <div className="space-y-1 text-sm text-muted-foreground mb-2">
            {selectedParts.length > 0 && (
              <div className="flex justify-between">
                <span>Ricambi:</span>
                <span>€{getTotalCost().toFixed(2)}</span>
              </div>
            )}
            {selectedServices.length > 0 && (
              <div className="flex justify-between">
                <span>Servizi:</span>
                <span>€{getServicesTotalCost().toFixed(2)}</span>
              </div>
            )}
            {getLaborsTotalCost() > 0 && (
              <div className="flex justify-between">
                <span>Manodopera:</span>
                <span>€{getLaborsTotalCost().toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-primary/20">
            <p className="text-lg font-bold text-right">
              Totale Preventivo: €{getGrandTotal().toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
