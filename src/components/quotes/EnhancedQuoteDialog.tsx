import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, Sparkles, Loader2, Search, ExternalLink, Package, Wrench, Check, Headphones, Smartphone, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const quoteSchema = z.object({
  deviceType: z.string().min(1, "Tipo dispositivo richiesto"),
  deviceBrand: z.string().optional(),
  deviceModel: z.string().optional(),
  issueDescription: z.string().min(10, "Descrizione minimo 10 caratteri"),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  validUntil: z.string().optional(),
});

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: 'part' | 'labor' | 'service';
  purchaseCost?: number;
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

interface LaborPrice {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  device_type: string | null;
}

interface AdditionalService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
}

interface SparePart {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  stock_quantity: number;
  cost: number | null;
  selling_price: number | null;
  supplier_code: string | null;
  image_url: string | null;
}

interface EnhancedQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  onSuccess: () => void;
  initialDeviceType?: string;
  initialDeviceBrand?: string;
  initialDeviceModel?: string;
  initialIssueDescription?: string;
  centroId?: string | null;
  repairRequestId?: string | null;
}

export function EnhancedQuoteDialog({
  open,
  onOpenChange,
  customerId,
  onSuccess,
  initialDeviceType = "",
  initialDeviceBrand = "",
  initialDeviceModel = "",
  initialIssueDescription = "",
  centroId,
  repairRequestId
}: EnhancedQuoteDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [markupPercentage, setMarkupPercentage] = useState(40);
  
  // AI Suggestions
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiLaborSuggestions, setAiLaborSuggestions] = useState<any[]>([]);
  const [aiServiceSuggestions, setAiServiceSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [hasFetchedSuggestions, setHasFetchedSuggestions] = useState(false);
  
  // Data
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [laborPrices, setLaborPrices] = useState<LaborPrice[]>([]);
  const [availableServices, setAvailableServices] = useState<AdditionalService[]>([]);
  
  // Commission rates
  const [centroCommissionRate, setCentroCommissionRate] = useState<number>(70);
  const [cornerCommissionRate, setCornerCommissionRate] = useState<number>(10);
  const [platformCommissionRate, setPlatformCommissionRate] = useState<number>(20);
  
  // Payment collection method for Corner jobs
  const [paymentCollectionMethod, setPaymentCollectionMethod] = useState<'direct' | 'via_corner'>('direct');
  
  // Utopya search
  const [utopyaSearchQuery, setUtopyaSearchQuery] = useState("");
  const [utopyaSearchResults, setUtopyaSearchResults] = useState<any[]>([]);
  const [utopyaSearchLoading, setUtopyaSearchLoading] = useState(false);
  
  // Inventory search
  const [inventorySearch, setInventorySearch] = useState("");

  const form = useForm({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      deviceType: initialDeviceType,
      deviceBrand: initialDeviceBrand,
      deviceModel: initialDeviceModel,
      issueDescription: initialIssueDescription,
      diagnosis: "",
      notes: "",
      validUntil: "",
    },
  });

  // Reset form when dialog opens with new values
  useEffect(() => {
    if (open) {
      form.reset({
        deviceType: initialDeviceType,
        deviceBrand: initialDeviceBrand,
        deviceModel: initialDeviceModel,
        issueDescription: initialIssueDescription,
        diagnosis: "",
        notes: "",
        validUntil: "",
      });
      setItems([]);
      setAiSuggestions([]);
      setAiLaborSuggestions([]);
      setAiServiceSuggestions([]);
      setHasFetchedSuggestions(false);
      loadData();
    }
  }, [open, initialDeviceType, initialDeviceBrand, initialDeviceModel, initialIssueDescription]);

  const loadData = async () => {
    await Promise.all([loadSpareParts(), loadLaborPrices(), loadServices(), loadCommissionRates()]);
  };
  
  const loadCommissionRates = async () => {
    // Load platform commission rate
    const { data: platformSettings } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "platform_commission_rate")
      .single();
    
    if (platformSettings) {
      setPlatformCommissionRate(platformSettings.value);
    }
    
    // Load centro commission rate if centroId provided
    if (centroId) {
      const { data: centro } = await supabase
        .from("centri_assistenza")
        .select("commission_rate")
        .eq("id", centroId)
        .single();
      
      if (centro) {
        setCentroCommissionRate(centro.commission_rate);
      }
    }
    
    // Load default corner commission rate
    const { data: cornerSettings } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "default_corner_commission_rate")
      .single();
    
    if (cornerSettings) {
      setCornerCommissionRate(cornerSettings.value);
    }
  };

  const loadSpareParts = async () => {
    let query = supabase
      .from("spare_parts")
      .select("id, name, brand, category, stock_quantity, cost, selling_price, supplier_code, image_url")
      .order("name");
    
    if (centroId) {
      query = query.eq("centro_id", centroId);
    }
    
    const { data } = await query;
    setSpareParts(data || []);
  };

  const loadLaborPrices = async () => {
    const { data } = await supabase
      .from("labor_prices")
      .select("*")
      .order("category")
      .order("name");
    setLaborPrices(data || []);
  };

  const loadServices = async () => {
    const { data } = await supabase
      .from("additional_services")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    setAvailableServices(data || []);
  };

  // Fetch AI suggestions
  const fetchAISuggestions = async () => {
    const issueDescription = form.getValues("issueDescription");
    if (!issueDescription || issueDescription.length < 10) {
      toast.error("Inserisci una descrizione del problema più dettagliata");
      return;
    }
    
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-spare-parts", {
        body: {
          deviceBrand: form.getValues("deviceBrand"),
          deviceModel: form.getValues("deviceModel"),
          deviceType: form.getValues("deviceType"),
          reportedIssue: issueDescription,
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

      if (data?.suggestions) setAiSuggestions(data.suggestions);
      if (data?.laborSuggestions) setAiLaborSuggestions(data.laborSuggestions);
      if (data?.serviceSuggestions) setAiServiceSuggestions(data.serviceSuggestions);
      setHasFetchedSuggestions(true);
      toast.success("Suggerimenti AI caricati");
    } catch (error: any) {
      console.error("Error fetching AI suggestions:", error);
      toast.error("Errore nel caricamento suggerimenti AI");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Utopya search
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
    
    setItems([...items, {
      id: `utopya-${Date.now()}`,
      description: product.name,
      quantity: 1,
      unitPrice: Math.round(sellingPrice * 100) / 100,
      total: Math.round(sellingPrice * 100) / 100,
      type: 'part',
      purchaseCost: price,
    }]);
    toast.success(`${product.name} aggiunto`);
  };

  const addSuggestedPart = (suggestion: AISuggestion) => {
    if (items.some(i => i.description.toLowerCase() === suggestion.partName.toLowerCase())) {
      toast.info("Ricambio già aggiunto");
      return;
    }

    const utopyaPrice = suggestion.actualPrice || suggestion.estimatedPrice;
    const matchedPart = spareParts.find(p => p.id === suggestion.matchedPartId);
    const sellingPrice = matchedPart?.selling_price || utopyaPrice * (1 + markupPercentage / 100);

    setItems([...items, {
      id: `ai-${Date.now()}`,
      description: suggestion.partName,
      quantity: 1,
      unitPrice: sellingPrice,
      total: sellingPrice,
      type: 'part',
      purchaseCost: utopyaPrice,
    }]);
    toast.success(`${suggestion.partName} aggiunto`);
  };

  const addSuggestedLabor = (suggestion: any) => {
    if (items.some(i => i.id === suggestion.matchedId)) {
      toast.info("Lavorazione già aggiunta");
      return;
    }
    
    setItems([...items, {
      id: suggestion.matchedId || `labor-${Date.now()}`,
      description: suggestion.laborName,
      quantity: 1,
      unitPrice: suggestion.price,
      total: suggestion.price,
      type: 'labor',
    }]);
    toast.success(`${suggestion.laborName} aggiunta`);
  };

  const addSuggestedService = (suggestion: any) => {
    if (items.some(i => i.id === suggestion.matchedId)) {
      toast.info("Servizio già aggiunto");
      return;
    }
    
    setItems([...items, {
      id: suggestion.matchedId || `service-${Date.now()}`,
      description: suggestion.serviceName,
      quantity: 1,
      unitPrice: suggestion.price,
      total: suggestion.price,
      type: 'service',
    }]);
    toast.success(`${suggestion.serviceName} aggiunto`);
  };

  const addInventoryPart = (part: SparePart) => {
    if (items.some(i => i.id === part.id)) {
      toast.info("Ricambio già aggiunto");
      return;
    }
    
    const price = part.selling_price || part.cost || 0;
    setItems([...items, {
      id: part.id,
      description: part.name,
      quantity: 1,
      unitPrice: price,
      total: price,
      type: 'part',
      purchaseCost: part.cost || 0,
    }]);
    toast.success(`${part.name} aggiunto`);
  };

  const addLabor = (labor: LaborPrice) => {
    if (items.some(i => i.id === labor.id)) {
      toast.info("Lavorazione già aggiunta");
      return;
    }
    
    setItems([...items, {
      id: labor.id,
      description: labor.name,
      quantity: 1,
      unitPrice: labor.price,
      total: labor.price,
      type: 'labor',
    }]);
    toast.success(`${labor.name} aggiunta`);
  };

  const addService = (service: AdditionalService) => {
    if (items.some(i => i.id === service.id)) {
      toast.info("Servizio già aggiunto");
      return;
    }
    
    setItems([...items, {
      id: service.id,
      description: service.name,
      quantity: 1,
      unitPrice: service.price,
      total: service.price,
      type: 'service',
    }]);
    toast.success(`${service.name} aggiunto`);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItemQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(items.map(i => 
      i.id === id ? { ...i, quantity, total: i.unitPrice * quantity } : i
    ));
  };

  const updateItemPrice = (id: string, price: number) => {
    setItems(items.map(i => 
      i.id === id ? { ...i, unitPrice: price, total: price * i.quantity } : i
    ));
  };

  const getPartsCost = () => items.filter(i => i.type === 'part').reduce((sum, i) => sum + i.total, 0);
  const getLaborCost = () => items.filter(i => i.type === 'labor').reduce((sum, i) => sum + i.total, 0);
  const getServicesCost = () => items.filter(i => i.type === 'service').reduce((sum, i) => sum + i.total, 0);
  const getTotalCost = () => items.reduce((sum, i) => sum + i.total, 0);
  
  // Commission calculations for Corner jobs (using dynamic rates from database)
  const getPartsPurchaseCost = () => items.filter(i => i.type === 'part').reduce((sum, i) => sum + ((i.purchaseCost || 0) * i.quantity), 0);
  const getGrossMargin = () => getTotalCost() - getPartsPurchaseCost();
  const getCentroCommission = () => getGrossMargin() * (centroCommissionRate / 100);
  const getCornerCommission = () => getGrossMargin() * (cornerCommissionRate / 100);

  const filteredInventory = spareParts.filter(part => {
    if (!inventorySearch) return false;
    const term = inventorySearch.toLowerCase();
    return (
      part.name.toLowerCase().includes(term) ||
      part.category.toLowerCase().includes(term) ||
      (part.brand && part.brand.toLowerCase().includes(term))
    );
  });

  const filteredLaborPrices = laborPrices.filter(lp => {
    const deviceType = form.watch("deviceType");
    return !lp.device_type || !deviceType || lp.device_type.toLowerCase() === deviceType.toLowerCase();
  });

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

  const onSubmit = async (data: z.infer<typeof quoteSchema>) => {
    if (items.length === 0) {
      toast.error("Aggiungi almeno un articolo");
      return;
    }

    setLoading(true);
    try {
      // Store the actual purchase cost for commission calculation
      const partsPurchaseCost = getPartsPurchaseCost();
      const laborCost = getLaborCost() + getServicesCost();
      const totalCost = getTotalCost();

      const validUntil = data.validUntil 
        ? data.validUntil
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const quoteItems = items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
        type: i.type,
        purchaseCost: i.purchaseCost || 0,
      }));

      const { error } = await supabase.from("quotes").insert({
        customer_id: customerId,
        device_type: data.deviceType,
        device_brand: data.deviceBrand || null,
        device_model: data.deviceModel || null,
        issue_description: data.issueDescription,
        diagnosis: data.diagnosis || null,
        items: quoteItems,
        labor_cost: laborCost,
        parts_cost: partsPurchaseCost, // Store purchase cost for commission calculation
        total_cost: totalCost,
        notes: data.notes || null,
        valid_until: validUntil,
        created_by: user?.id,
        repair_request_id: repairRequestId || null,
        payment_collection_method: repairRequestId ? paymentCollectionMethod : null,
      });

      if (error) throw error;

      toast.success("Preventivo creato con successo");
      form.reset();
      setItems([]);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Errore nella creazione del preventivo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Package className="h-6 w-6" />
            Crea Preventivo con AI
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Device Info */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-xl">
            <h3 className="font-semibold text-lg">Informazioni Dispositivo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Tipo Dispositivo *</Label>
                <Select
                  value={form.watch("deviceType")}
                  onValueChange={(value) => form.setValue("deviceType", value)}
                >
                  <SelectTrigger className={form.formState.errors.deviceType ? "border-destructive" : ""}>
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smartphone">Smartphone</SelectItem>
                    <SelectItem value="tablet">Tablet</SelectItem>
                    <SelectItem value="laptop">Laptop</SelectItem>
                    <SelectItem value="desktop">Desktop</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.deviceType && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.deviceType.message}</p>
                )}
              </div>
              <div>
                <Label>Marca</Label>
                <Input placeholder="es. Apple, Samsung" {...form.register("deviceBrand")} />
              </div>
              <div>
                <Label>Modello</Label>
                <Input placeholder="es. iPhone 14" {...form.register("deviceModel")} />
              </div>
            </div>
            <div>
              <Label>Descrizione Problema *</Label>
              <Textarea
                placeholder="Descrivi il problema del dispositivo..."
                rows={3}
                className={form.formState.errors.issueDescription ? "border-destructive" : ""}
                {...form.register("issueDescription")}
              />
              {form.formState.errors.issueDescription && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.issueDescription.message}</p>
              )}
            </div>
          </div>

          {/* Markup Configuration */}
          <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  📊 Ricarico Predefinito
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Applicato ai ricambi da Utopya/AI
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="200"
                  value={markupPercentage}
                  onChange={(e) => setMarkupPercentage(parseInt(e.target.value) || 0)}
                  className="w-20 text-center font-bold"
                />
                <span className="text-sm font-medium">%</span>
              </div>
            </div>
          </div>

          {/* AI Suggestions Button */}
          <div className="flex justify-center">
            <Button
              type="button"
              onClick={fetchAISuggestions}
              disabled={loadingSuggestions}
              className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
            >
              {loadingSuggestions ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loadingSuggestions ? "Analisi in corso..." : "Genera Suggerimenti AI"}
            </Button>
          </div>

          {/* AI Suggestions */}
          {hasFetchedSuggestions && (aiSuggestions.length > 0 || aiLaborSuggestions.length > 0 || aiServiceSuggestions.length > 0) && (
            <div className="space-y-4 p-4 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 rounded-xl border border-violet-200 dark:border-violet-800">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-600" />
                Suggerimenti AI
              </h3>
              
              {/* Part Suggestions */}
              {aiSuggestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Ricambi Suggeriti</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {aiSuggestions.map((suggestion, idx) => (
                      <Card key={idx} className="p-3 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{suggestion.partName}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{suggestion.reason}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                €{suggestion.actualPrice || suggestion.estimatedPrice}
                              </Badge>
                              {suggestion.inStock && (
                                <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                                  In stock
                                </Badge>
                              )}
                              {suggestion.hasUtopyaMatch && (
                                <a
                                  href={suggestion.utopyaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  Utopya <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => addSuggestedPart(suggestion)}
                            className="shrink-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Labor Suggestions */}
              {aiLaborSuggestions.filter(s => s.matched).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Lavorazioni Suggerite</h4>
                  <div className="flex flex-wrap gap-2">
                    {aiLaborSuggestions.filter(s => s.matched).map((suggestion, idx) => (
                      <Button
                        key={idx}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addSuggestedLabor(suggestion)}
                        className="gap-2"
                      >
                        <Wrench className="h-3 w-3" />
                        {suggestion.laborName} - €{suggestion.price}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Service Suggestions */}
              {aiServiceSuggestions.filter(s => s.matched).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Servizi Suggeriti</h4>
                  <div className="flex flex-wrap gap-2">
                    {aiServiceSuggestions.filter(s => s.matched).map((suggestion, idx) => (
                      <Button
                        key={idx}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addSuggestedService(suggestion)}
                        className="gap-2"
                      >
                        <Check className="h-3 w-3" />
                        {suggestion.serviceName} - €{suggestion.price}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabs for manual selection */}
          <Tabs defaultValue="utopya" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="utopya">Utopya</TabsTrigger>
              <TabsTrigger value="inventory">Inventario</TabsTrigger>
              <TabsTrigger value="labor">Lavorazioni</TabsTrigger>
              <TabsTrigger value="services">Servizi</TabsTrigger>
            </TabsList>

            {/* Utopya Search */}
            <TabsContent value="utopya" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Cerca su Utopya..."
                  value={utopyaSearchQuery}
                  onChange={(e) => setUtopyaSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchUtopya())}
                />
                <Button type="button" onClick={searchUtopya} disabled={utopyaSearchLoading}>
                  {utopyaSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {utopyaSearchResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {utopyaSearchResults.map((product, idx) => (
                    <Card key={idx} className="p-3 hover:shadow-md transition-shadow cursor-pointer" onClick={() => addUtopyaProduct(product)}>
                      <div className="flex items-center gap-3">
                        {product.imageUrl && (
                          <img src={product.imageUrl} alt="" className="w-12 h-12 object-cover rounded" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <p className="text-xs text-primary font-semibold">€{product.priceNumeric || product.price}</p>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Inventory Search */}
            <TabsContent value="inventory" className="space-y-4">
              <Input
                placeholder="Cerca nell'inventario..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
              />
              {filteredInventory.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {filteredInventory.map((part) => (
                    <Card key={part.id} className="p-3 hover:shadow-md transition-shadow cursor-pointer" onClick={() => addInventoryPart(part)}>
                      <div className="flex items-center gap-3">
                        {part.image_url && (
                          <img src={part.image_url} alt="" className="w-12 h-12 object-cover rounded" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{part.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs ${getCategoryStyle(part.category)}`}>
                              {getCategoryIcon(part.category)}
                              {part.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">Stock: {part.stock_quantity}</span>
                          </div>
                          <p className="text-xs text-primary font-semibold">€{part.selling_price || part.cost || 0}</p>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Labor Prices */}
            <TabsContent value="labor" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {filteredLaborPrices.map((labor) => (
                  <Card key={labor.id} className="p-3 hover:shadow-md transition-shadow cursor-pointer" onClick={() => addLabor(labor)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{labor.name}</p>
                        <Badge variant="outline" className="text-xs">{labor.category}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">€{labor.price}</span>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Services */}
            <TabsContent value="services" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {availableServices.map((service) => (
                  <Card key={service.id} className="p-3 hover:shadow-md transition-shadow cursor-pointer" onClick={() => addService(service)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{service.name}</p>
                        {service.description && <p className="text-xs text-muted-foreground">{service.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">€{service.price}</span>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Selected Items */}
          {items.length > 0 && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-xl">
              <h3 className="font-semibold text-lg">Articoli Selezionati ({items.length})</h3>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-card rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{item.description}</p>
                        <Badge variant="outline" className="text-xs">
                          {item.type === 'part' ? 'Ricambio' : item.type === 'labor' ? 'Lavorazione' : 'Servizio'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-16 text-center"
                      />
                      <span className="text-muted-foreground">×</span>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">€</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      </div>
                      <span className="font-semibold min-w-[60px] text-right">€{item.total.toFixed(2)}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="p-4 bg-muted/30 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span>Ricambi:</span>
              <span>€{getPartsCost().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Lavorazioni + Servizi:</span>
              <span>€{(getLaborCost() + getServicesCost()).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Totale Preventivo:</span>
              <span className="text-primary">€{getTotalCost().toFixed(2)}</span>
            </div>
            
            {/* Commission breakdown for Corner jobs */}
            {repairRequestId && items.length > 0 && (
              <div className="mt-4 pt-4 border-t border-dashed space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  📊 Ripartizione Guadagni
                </h4>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Costo Acquisto Ricambi:</span>
                  <span>- €{getPartsPurchaseCost().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Margine Lordo:</span>
                  <span>€{getGrossMargin().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                  <span>🏪 Tuo Guadagno (Centro {centroCommissionRate}%):</span>
                  <span className="font-semibold">€{getCentroCommission().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400">
                  <span>📍 Guadagno Corner ({cornerCommissionRate}%):</span>
                  <span className="font-semibold">€{getCornerCommission().toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  * Piattaforma: {platformCommissionRate}% del margine
                </p>
              </div>
            )}
          </div>

          {/* Payment Collection Method for Corner jobs */}
          {repairRequestId && (
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl border border-amber-200 dark:border-amber-800 space-y-4">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                💰 Modalità di Incasso
              </h4>
              
              <RadioGroup 
                value={paymentCollectionMethod} 
                onValueChange={(value: 'direct' | 'via_corner') => setPaymentCollectionMethod(value)}
                className="space-y-3"
              >
                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="direct" id="direct" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="direct" className="font-medium cursor-pointer">
                      Incasso Diretto dal Cliente
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Il cliente paga direttamente a te (€{getTotalCost().toFixed(2)}). Dovrai poi versare al Corner la sua commissione di €{getCornerCommission().toFixed(2)}.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="via_corner" id="via_corner" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="via_corner" className="font-medium cursor-pointer">
                      Incasso tramite Corner
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Il Corner incassa dal cliente (€{getTotalCost().toFixed(2)}), trattiene la sua commissione (€{getCornerCommission().toFixed(2)}) e ti versa €{(getTotalCost() - getCornerCommission()).toFixed(2)}.
                    </p>
                  </div>
                </div>
              </RadioGroup>
              
              {/* Legal Disclaimer */}
              <div className="flex items-start gap-2 p-3 bg-amber-100/50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  <strong>Nota legale:</strong> La fatturazione, la gestione fiscale e gli adempimenti tributari relativi ai compensi percepiti sono interamente a carico tuo, come previsto dalla normativa fiscale vigente. La piattaforma non è sostituto d'imposta.
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>Diagnosi / Note</Label>
            <Textarea
              placeholder="Note tecniche o diagnosi per il cliente..."
              rows={2}
              {...form.register("diagnosis")}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4">
            {items.length === 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                ⚠️ Aggiungi almeno un articolo (ricambio, lavorazione o servizio) prima di creare il preventivo
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Annulla
              </Button>
              <Button type="submit" disabled={loading || items.length === 0} className="min-w-[150px]">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvataggio...
                  </>
                ) : (
                  "Crea Preventivo"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
