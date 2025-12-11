import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Send, 
  Mail, 
  MessageCircle, 
  User, 
  Smartphone, 
  Euro, 
  Plus, 
  Trash2,
  Sparkles,
  Search,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Tablet,
  Laptop,
  Monitor,
  HelpCircle,
  Package,
  Wrench,
  Headphones,
  Save
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QuotePDFPreview } from "./QuotePDFPreview";

interface CreateQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centroId: string | null;
  onSuccess: () => void;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
}

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: 'part' | 'labor' | 'service';
  purchaseCost?: number;
}

interface CentroInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  vatNumber?: string;
  logoUrl?: string;
}

interface DetectedDeviceInfo {
  fullName?: string;
  year?: string;
  imageUrl?: string;
  specs?: {
    ram?: string;
    storage?: string;
    display?: string;
    processor?: string;
  };
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

const deviceTypes = [
  { value: "Smartphone", icon: Smartphone },
  { value: "Tablet", icon: Tablet },
  { value: "Laptop", icon: Laptop },
  { value: "PC", icon: Monitor },
  { value: "Altro", icon: HelpCircle },
];

export function CreateQuoteDialog({ open, onOpenChange, centroId, onSuccess }: CreateQuoteDialogProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  const [deviceType, setDeviceType] = useState("Smartphone");
  const [deviceBrand, setDeviceBrand] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  
  // AI Device Info
  const [detectedDevice, setDetectedDevice] = useState<DetectedDeviceInfo | null>(null);
  const [isLookingUpDevice, setIsLookingUpDevice] = useState(false);
  
  // Items with type support
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [markupPercentage, setMarkupPercentage] = useState(40);
  
  // Data for tabs
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [laborPrices, setLaborPrices] = useState<LaborPrice[]>([]);
  const [availableServices, setAvailableServices] = useState<AdditionalService[]>([]);
  
  // Search states
  const [utopyaSearchQuery, setUtopyaSearchQuery] = useState("");
  const [utopyaSearchResults, setUtopyaSearchResults] = useState<any[]>([]);
  const [utopyaSearchLoading, setUtopyaSearchLoading] = useState(false);
  const [inventorySearch, setInventorySearch] = useState("");
  
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [centroInfo, setCentroInfo] = useState<CentroInfo | null>(null);

  useEffect(() => {
    if (open && centroId) {
      loadCustomers();
      loadCentroInfo();
      loadData();
    }
  }, [open, centroId]);

  useEffect(() => {
    if (customerSearch) {
      const filtered = customers.filter(c => 
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch)
      );
      setFilteredCustomers(filtered);
      setShowCustomerDropdown(true);
    } else {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
    }
  }, [customerSearch, customers]);

  // AI Device Lookup
  const lookupDevice = useCallback(async () => {
    if (!deviceBrand.trim() || !deviceModel.trim()) return;
    
    setIsLookingUpDevice(true);
    try {
      const { data, error } = await supabase.functions.invoke('lookup-device', {
        body: { brand: deviceBrand, model: deviceModel }
      });

      if (error) throw error;

      if (data?.device_info) {
        setDetectedDevice(data.device_info);
      }
    } catch (error) {
      console.error('Device lookup error:', error);
    } finally {
      setIsLookingUpDevice(false);
    }
  }, [deviceBrand, deviceModel]);

  // Trigger lookup when brand/model change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (deviceBrand && deviceModel) {
        lookupDevice();
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [deviceBrand, deviceModel, lookupDevice]);

  const loadCustomers = async () => {
    const { data } = await supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("centro_id", centroId)
      .order("name");
    
    if (data) setCustomers(data);
  };

  const loadCentroInfo = async () => {
    const { data } = await supabase
      .from("centri_assistenza")
      .select("business_name, address, phone, email, vat_number, logo_url")
      .eq("id", centroId)
      .single();
    
    if (data) {
      setCentroInfo({
        name: data.business_name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        vatNumber: data.vat_number || undefined,
        logoUrl: data.logo_url || undefined,
      });
    }
  };

  const loadData = async () => {
    await Promise.all([loadSpareParts(), loadLaborPrices(), loadServices()]);
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

  // Cost calculations
  const getPartsCost = () => items.filter(i => i.type === 'part').reduce((sum, i) => sum + i.total, 0);
  const getLaborCost = () => items.filter(i => i.type === 'labor').reduce((sum, i) => sum + i.total, 0);
  const getServicesCost = () => items.filter(i => i.type === 'service').reduce((sum, i) => sum + i.total, 0);
  const getTotalCost = () => items.reduce((sum, i) => sum + i.total, 0);
  const getPartsPurchaseCost = () => items.filter(i => i.type === 'part').reduce((sum, i) => sum + ((i.purchaseCost || 0) * i.quantity), 0);

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
    return !lp.device_type || !deviceType || lp.device_type.toLowerCase() === deviceType.toLowerCase();
  });

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setDeviceType("Smartphone");
    setDeviceBrand("");
    setDeviceModel("");
    setIssueDescription("");
    setDiagnosis("");
    setNotes("");
    setValidUntil("");
    setDetectedDevice(null);
    setItems([]);
    setMarkupPercentage(40);
    setShowPreview(false);
    setUtopyaSearchQuery("");
    setUtopyaSearchResults([]);
    setInventorySearch("");
  };

  const handleShowPreview = () => {
    if (!selectedCustomer || !centroId) {
      toast.error("Seleziona un cliente");
      return;
    }

    if (items.length === 0) {
      toast.error("Aggiungi almeno un articolo");
      return;
    }

    if (!issueDescription.trim()) {
      toast.error("Inserisci la descrizione del problema");
      return;
    }

    setShowPreview(true);
  };

  const handleSendQuote = async (sendMethod: "email" | "whatsapp") => {
    if (!selectedCustomer) return;

    setIsSending(true);
    try {
      const partsPurchaseCost = getPartsPurchaseCost();
      const laborCost = getLaborCost() + getServicesCost();
      const totalCost = getTotalCost();

      const quoteValidUntil = validUntil 
        ? validUntil
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const quoteItems = items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
        type: i.type,
        purchaseCost: i.purchaseCost || 0,
      }));

      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          customer_id: selectedCustomer.id,
          device_type: deviceType,
          device_brand: deviceBrand || null,
          device_model: deviceModel || null,
          issue_description: issueDescription,
          diagnosis: diagnosis || null,
          notes: notes || null,
          items: JSON.stringify(quoteItems),
          labor_cost: laborCost,
          parts_cost: partsPurchaseCost,
          total_cost: totalCost,
          valid_until: quoteValidUntil,
          status: "pending"
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      const deviceName = detectedDevice?.fullName || `${deviceType} ${deviceBrand} ${deviceModel}`.trim();

      if (sendMethod === "email" && selectedCustomer.email) {
        const { error: emailError } = await supabase.functions.invoke("send-email-smtp", {
          body: {
            to: selectedCustomer.email,
            subject: `Preventivo per ${deviceName}`,
            html: generateEmailHTML(deviceName),
            centro_id: centroId
          }
        });

        if (emailError) {
          console.error("Email error:", emailError);
          toast.warning("Preventivo creato ma errore nell'invio email");
        } else {
          toast.success("Preventivo inviato via email");
        }
      } else if (sendMethod === "whatsapp") {
        const message = generateWhatsAppMessage(deviceName);
        const phone = selectedCustomer.phone.replace(/\D/g, '');
        const whatsappPhone = phone.startsWith('39') ? phone : `39${phone}`;
        window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`, '_blank');
        toast.success("Preventivo aperto su WhatsApp");
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating quote:", error);
      toast.error("Errore nella creazione del preventivo");
    } finally {
      setIsSending(false);
    }
  };

  const generateEmailHTML = (deviceName: string) => {
    const totalCost = getTotalCost();
    const deviceImage = detectedDevice?.imageUrl 
      ? `<img src="${detectedDevice.imageUrl}" alt="${deviceName}" style="width: 80px; height: 80px; object-fit: contain; border-radius: 8px; background: #f1f5f9;" />`
      : '';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #60a5fa); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Preventivo Riparazione</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">${centroInfo?.name || ''}</p>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 12px 12px;">
          <p style="color: #334155; font-size: 16px;">Gentile <strong>${selectedCustomer?.name}</strong>,</p>
          <p style="color: #64748b;">Le inviamo il preventivo per la riparazione del suo dispositivo:</p>
          
          <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0; display: flex; gap: 16px; align-items: center;">
            ${deviceImage}
            <div>
              <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: #1e293b;">${deviceName}</p>
              ${detectedDevice?.year && detectedDevice.year !== 'N/A' ? `<p style="margin: 0 0 4px 0; color: #64748b; font-size: 14px;">Anno: ${detectedDevice.year}</p>` : ''}
              <p style="margin: 0; color: #f59e0b; font-size: 14px;">⚠️ ${issueDescription}</p>
            </div>
          </div>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <h3 style="margin: 0 0 15px 0; color: #1e293b;">Dettaglio Costi</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${items.map(i => `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #475569;">${i.description} ${i.quantity > 1 ? `(x${i.quantity})` : ''}</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; color: #1e293b;">€${i.total.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr>
                <td style="padding: 12px 0; font-weight: bold; font-size: 18px; color: #1e293b;">TOTALE</td>
                <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 20px; color: #3b82f6;">€${totalCost.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          ${notes ? `<p style="color: #64748b; font-style: italic; background: #fef3c7; padding: 12px; border-radius: 6px;"><strong>Note:</strong> ${notes}</p>` : ''}
          
          <p style="color: #64748b; margin-top: 20px;">Per accettare o rifiutare il preventivo, acceda al suo portale cliente.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Grazie per aver scelto i nostri servizi.</p>
            ${centroInfo ? `<p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">${centroInfo.name}</p>` : ''}
          </div>
        </div>
      </div>
    `;
  };

  const generateWhatsAppMessage = (deviceName: string) => {
    const totalCost = getTotalCost();
    return `*📋 PREVENTIVO RIPARAZIONE*\n\n` +
      `Gentile ${selectedCustomer?.name},\n` +
      `Le inviamo il preventivo per:\n\n` +
      `📱 *Dispositivo:* ${deviceName}\n` +
      `${detectedDevice?.year && detectedDevice.year !== 'N/A' ? `📅 *Anno:* ${detectedDevice.year}\n` : ''}` +
      `🔧 *Problema:* ${issueDescription}\n` +
      `${diagnosis ? `📝 *Diagnosi:* ${diagnosis}\n` : ''}` +
      `\n*DETTAGLIO COSTI:*\n` +
      items.map(i => `• ${i.description}${i.quantity > 1 ? ` (x${i.quantity})` : ''}: €${i.total.toFixed(2)}`).join('\n') +
      `\n\n💰 *TOTALE: €${totalCost.toFixed(2)}*\n\n` +
      `${notes ? `📌 Note: ${notes}\n\n` : ''}` +
      `Per confermare risponda a questo messaggio.\n` +
      `${centroInfo ? `\n_${centroInfo.name}_` : ''}`;
  };

  return (
    <>
      <Dialog open={open && !showPreview} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              Nuovo Preventivo
            </DialogTitle>
            <DialogDescription>
              Crea un nuovo preventivo per il cliente selezionato
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 px-4 pb-4 sm:px-6 sm:pb-6" style={{ maxHeight: 'calc(90vh - 100px)' }}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-4"
            >
              {/* Customer Selection */}
              <Card className="border-primary/20">
                <CardContent className="p-3 sm:p-4">
                  <Label className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-primary" />
                    Cliente
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cerca cliente..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-10"
                    />
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <Card className="absolute z-50 w-full mt-1 shadow-lg">
                        <CardContent className="p-1 max-h-40 overflow-y-auto">
                          {filteredCustomers.map((customer) => (
                            <button
                              key={customer.id}
                              onClick={() => handleSelectCustomer(customer)}
                              className="w-full text-left p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                              <p className="font-medium text-sm">{customer.name}</p>
                              <p className="text-xs text-muted-foreground">{customer.phone}</p>
                            </button>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  {selectedCustomer && (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {selectedCustomer.name}
                      </Badge>
                      {selectedCustomer.email && (
                        <Badge variant="outline" className="text-xs">
                          <Mail className="h-3 w-3 mr-1" />
                          <span className="truncate max-w-[120px]">{selectedCustomer.email}</span>
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Device Info */}
              <Card className="border-primary/20">
                <CardContent className="p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-primary" />
                      Dispositivo
                    </Label>
                    {isLookingUpDevice && (
                      <Badge variant="outline" className="text-xs animate-pulse">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Riconoscimento...
                      </Badge>
                    )}
                  </div>
                  
                  {/* Device Type Selection */}
                  <div className="flex flex-wrap gap-2">
                    {deviceTypes.map(({ value, icon: Icon }) => (
                      <Button
                        key={value}
                        type="button"
                        variant={deviceType === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDeviceType(value)}
                        className="flex-1 min-w-[80px]"
                      >
                        <Icon className="h-4 w-4 mr-1" />
                        {value}
                      </Button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Marca</Label>
                      <Input 
                        placeholder="es. Apple" 
                        value={deviceBrand}
                        onChange={(e) => setDeviceBrand(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Modello</Label>
                      <Input 
                        placeholder="es. iPhone 14" 
                        value={deviceModel}
                        onChange={(e) => setDeviceModel(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* AI Detected Info */}
                  <AnimatePresence>
                    {detectedDevice && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20"
                      >
                        {detectedDevice.imageUrl && (
                          <img 
                            src={detectedDevice.imageUrl} 
                            alt={detectedDevice.fullName}
                            className="w-12 h-12 object-contain rounded-lg bg-white"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{detectedDevice.fullName}</p>
                          {detectedDevice.year && detectedDevice.year !== 'N/A' && (
                            <p className="text-xs text-muted-foreground">Anno: {detectedDevice.year}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>

              {/* Issue Description */}
              <Card className="border-primary/20">
                <CardContent className="p-3 sm:p-4 space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Problema riscontrato *</Label>
                    <Textarea 
                      placeholder="Descrivi il problema..." 
                      value={issueDescription}
                      onChange={(e) => setIssueDescription(e.target.value)}
                      className="min-h-[60px]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Diagnosi (opzionale)</Label>
                    <Textarea 
                      placeholder="Diagnosi tecnica..." 
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      className="min-h-[40px]"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Markup Percentage */}
              <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-500/5">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Euro className="h-4 w-4 text-amber-600" />
                      <Label className="text-sm font-medium">Ricarico %</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={markupPercentage}
                        onChange={(e) => setMarkupPercentage(Number(e.target.value))}
                        className="w-20 text-center"
                        min={0}
                        max={200}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Items Selection with Tabs */}
              <Card className="border-primary/20">
                <CardContent className="p-3 sm:p-4">
                  <Label className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-primary" />
                    Aggiungi Articoli
                  </Label>

                  <Tabs defaultValue="utopya" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 h-auto">
                      <TabsTrigger value="utopya" className="text-xs px-2 py-1.5">
                        <Search className="h-3 w-3 mr-1" />
                        Utopya
                      </TabsTrigger>
                      <TabsTrigger value="inventory" className="text-xs px-2 py-1.5">
                        <Package className="h-3 w-3 mr-1" />
                        Inventario
                      </TabsTrigger>
                      <TabsTrigger value="labor" className="text-xs px-2 py-1.5">
                        <Wrench className="h-3 w-3 mr-1" />
                        Lavorazioni
                      </TabsTrigger>
                      <TabsTrigger value="services" className="text-xs px-2 py-1.5">
                        <Headphones className="h-3 w-3 mr-1" />
                        Servizi
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="utopya" className="mt-3 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Cerca su Utopya..."
                          value={utopyaSearchQuery}
                          onChange={(e) => setUtopyaSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && searchUtopya()}
                        />
                        <Button 
                          onClick={searchUtopya} 
                          disabled={utopyaSearchLoading}
                          size="sm"
                        >
                          {utopyaSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                      </div>
                      <ScrollArea className="h-[150px]">
                        <div className="space-y-1">
                          {utopyaSearchResults.map((product, idx) => (
                            <div 
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                              onClick={() => addUtopyaProduct(product)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{product.name}</p>
                                <p className="text-xs text-muted-foreground">€{product.priceNumeric?.toFixed(2) || '0.00'}</p>
                              </div>
                              <Plus className="h-4 w-4 text-primary shrink-0" />
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="inventory" className="mt-3 space-y-2">
                      <Input
                        placeholder="Cerca nell'inventario..."
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                      />
                      <ScrollArea className="h-[150px]">
                        <div className="space-y-1">
                          {filteredInventory.map((part) => (
                            <div 
                              key={part.id}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                              onClick={() => addInventoryPart(part)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{part.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  €{(part.selling_price || part.cost || 0).toFixed(2)} - Qta: {part.stock_quantity}
                                </p>
                              </div>
                              <Plus className="h-4 w-4 text-primary shrink-0" />
                            </div>
                          ))}
                          {inventorySearch && filteredInventory.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">Nessun risultato</p>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="labor" className="mt-3">
                      <ScrollArea className="h-[150px]">
                        <div className="space-y-1">
                          {filteredLaborPrices.map((labor) => (
                            <div 
                              key={labor.id}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                              onClick={() => addLabor(labor)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{labor.name}</p>
                                <p className="text-xs text-muted-foreground">{labor.category}</p>
                              </div>
                              <Badge variant="secondary">€{labor.price.toFixed(2)}</Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="services" className="mt-3">
                      <ScrollArea className="h-[150px]">
                        <div className="space-y-1">
                          {availableServices.map((service) => (
                            <div 
                              key={service.id}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                              onClick={() => addService(service)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{service.name}</p>
                                {service.description && (
                                  <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                                )}
                              </div>
                              <Badge variant="secondary">€{service.price.toFixed(2)}</Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Selected Items */}
              {items.length > 0 && (
                <Card className="border-emerald-500/30">
                  <CardContent className="p-3 sm:p-4">
                    <Label className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Articoli Selezionati ({items.length})
                    </Label>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div 
                          key={item.id}
                          className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                        >
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {item.type === 'part' ? 'Ricambio' : item.type === 'labor' ? 'Lavorazione' : 'Servizio'}
                          </Badge>
                          <p className="flex-1 text-sm truncate">{item.description}</p>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.id, Number(e.target.value))}
                              className="w-14 h-7 text-center text-xs"
                              min={1}
                            />
                            <span className="text-xs text-muted-foreground">x</span>
                            <Input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateItemPrice(item.id, Number(e.target.value))}
                              className="w-20 h-7 text-center text-xs"
                              step={0.01}
                            />
                          </div>
                          <p className="text-sm font-medium w-16 text-right">€{item.total.toFixed(2)}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cost Summary */}
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ricambi:</span>
                      <span>€{getPartsCost().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Lavorazioni:</span>
                      <span>€{getLaborCost().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Servizi:</span>
                      <span>€{getServicesCost().toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Totale:</span>
                      <span className="text-primary">€{getTotalCost().toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card className="border-primary/20">
                <CardContent className="p-3 sm:p-4">
                  <Label className="text-xs text-muted-foreground">Note aggiuntive</Label>
                  <Textarea 
                    placeholder="Note per il cliente..." 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[40px]"
                  />
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => { onOpenChange(false); resetForm(); }}
                  className="flex-1"
                >
                  Annulla
                </Button>
                <Button 
                  onClick={handleShowPreview}
                  className="flex-1 bg-gradient-to-r from-primary to-primary-glow"
                  disabled={!selectedCustomer || items.length === 0}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Anteprima
                </Button>
              </div>
            </motion.div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* PDF Preview */}
      {showPreview && selectedCustomer && (
        <QuotePDFPreview
          open={showPreview}
          onOpenChange={(o) => setShowPreview(o)}
          customer={selectedCustomer}
          deviceType={deviceType}
          deviceBrand={deviceBrand}
          deviceModel={deviceModel}
          issueDescription={issueDescription}
          diagnosis={diagnosis}
          notes={notes}
          items={items.map(i => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          }))}
          laborCost={getLaborCost() + getServicesCost()}
          partsCost={getPartsPurchaseCost()}
          totalCost={getTotalCost()}
          centroInfo={centroInfo || undefined}
          deviceInfo={detectedDevice}
          onSend={handleSendQuote}
          isSending={isSending}
        />
      )}
    </>
  );
}
