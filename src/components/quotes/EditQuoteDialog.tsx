import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, Loader2, Search, Package, Wrench, Headphones, Send, Save, Eye, Mail, MessageCircle, Download, ChevronLeft, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { generateQuotePDF, downloadQuotePDF, getQuotePDFDataUrl } from "./QuotePDFGenerator";

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

interface Quote {
  id: string;
  customer_id: string;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  issue_description: string;
  diagnosis: string | null;
  notes: string | null;
  items: any;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  status: string;
  valid_until: string | null;
  repair_request_id: string | null;
  customers?: {
    name: string;
    email: string | null;
    phone: string;
  } | null;
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

interface CentroInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  vatNumber?: string;
  logoUrl?: string;
}

interface EditQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote;
  onSuccess: () => void;
  centroId?: string | null;
}

export function EditQuoteDialog({
  open,
  onOpenChange,
  quote,
  onSuccess,
  centroId
}: EditQuoteDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [markupPercentage, setMarkupPercentage] = useState(40);
  const [step, setStep] = useState<'edit' | 'preview'>('edit');
  
  // Centro info
  const [centroInfo, setCentroInfo] = useState<CentroInfo | null>(null);
  const [customerInfo, setCustomerInfo] = useState<{ name: string; email: string | null; phone: string } | null>(null);
  
  // Data
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [laborPrices, setLaborPrices] = useState<LaborPrice[]>([]);
  const [availableServices, setAvailableServices] = useState<AdditionalService[]>([]);
  
  // Utopya search
  const [utopyaSearchQuery, setUtopyaSearchQuery] = useState("");
  const [utopyaSearchResults, setUtopyaSearchResults] = useState<any[]>([]);
  const [utopyaSearchLoading, setUtopyaSearchLoading] = useState(false);
  
  // Inventory search
  const [inventorySearch, setInventorySearch] = useState("");

  // Preview states
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [sendMethod, setSendMethod] = useState<"email" | "whatsapp" | null>(null);
  const [showSendOptions, setShowSendOptions] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const form = useForm({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      deviceType: quote.device_type,
      deviceBrand: quote.device_brand || "",
      deviceModel: quote.device_model || "",
      issueDescription: quote.issue_description,
      diagnosis: quote.diagnosis || "",
      notes: quote.notes || "",
      validUntil: quote.valid_until || "",
    },
  });

  useEffect(() => {
    if (open && quote) {
      setStep('edit');
      form.reset({
        deviceType: quote.device_type,
        deviceBrand: quote.device_brand || "",
        deviceModel: quote.device_model || "",
        issueDescription: quote.issue_description,
        diagnosis: quote.diagnosis || "",
        notes: quote.notes || "",
        validUntil: quote.valid_until || "",
      });
      
      // Parse items
      try {
        const parsedItems = typeof quote.items === 'string' 
          ? JSON.parse(quote.items) 
          : quote.items;
        
        const loadedItems: QuoteItem[] = (parsedItems || []).map((item: any, index: number) => ({
          id: `existing-${index}`,
          description: item.description,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice,
          total: item.total || item.unitPrice * (item.quantity || 1),
          type: item.type || 'part',
          purchaseCost: item.purchaseCost,
        }));
        setItems(loadedItems);
      } catch (e) {
        console.error("Error parsing items:", e);
        setItems([]);
      }
      
      // Set customer info
      if (quote.customers) {
        setCustomerInfo(quote.customers);
      } else {
        loadCustomerInfo();
      }
      
      loadData();
      loadCentroInfo();
    }
  }, [open, quote]);

  const loadCustomerInfo = async () => {
    if (!quote.customer_id) return;
    const { data } = await supabase
      .from("customers")
      .select("name, email, phone")
      .eq("id", quote.customer_id)
      .single();
    if (data) setCustomerInfo(data);
  };

  const loadCentroInfo = async () => {
    if (!centroId) return;
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
      toast.info("Ricambio gia aggiunto");
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
      toast.info("Lavorazione gia aggiunta");
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
      toast.info("Servizio gia aggiunto");
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
    const deviceType = form.watch("deviceType");
    return !lp.device_type || !deviceType || lp.device_type.toLowerCase() === deviceType.toLowerCase();
  });

  const handleSave = async (data: z.infer<typeof quoteSchema>, goToPreview: boolean = false) => {
    if (items.length === 0) {
      toast.error("Aggiungi almeno un articolo");
      return;
    }

    setLoading(true);
    try {
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

      const updateData: any = {
        device_type: data.deviceType,
        device_brand: data.deviceBrand || null,
        device_model: data.deviceModel || null,
        issue_description: data.issueDescription,
        diagnosis: data.diagnosis || null,
        items: JSON.stringify(quoteItems),
        labor_cost: laborCost,
        parts_cost: partsPurchaseCost,
        total_cost: totalCost,
        notes: data.notes || null,
        valid_until: validUntil,
        status: 'pending',
      };

      const { error } = await supabase
        .from("quotes")
        .update(updateData)
        .eq("id", quote.id);

      if (error) throw error;

      toast.success("Preventivo salvato");
      
      if (goToPreview) {
        setStep('preview');
        generatePdfPreview(data);
      } else {
        onSuccess();
        onOpenChange(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Errore nel salvataggio");
    } finally {
      setLoading(false);
    }
  };

  const getPdfData = () => {
    const data = form.getValues();
    return {
      customerName: customerInfo?.name || "Cliente",
      customerEmail: customerInfo?.email || undefined,
      customerPhone: customerInfo?.phone || "",
      deviceType: data.deviceType,
      deviceBrand: data.deviceBrand || "",
      deviceModel: data.deviceModel || "",
      issueDescription: data.issueDescription,
      diagnosis: data.diagnosis || undefined,
      notes: data.notes || undefined,
      items: items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      laborCost: getLaborCost() + getServicesCost(),
      partsCost: getPartsPurchaseCost(),
      totalCost: getTotalCost(),
      centroInfo: centroInfo || undefined,
      quoteNumber: `PRV-${quote.id.slice(0, 8).toUpperCase()}`,
    };
  };

  const generatePdfPreview = async (data?: z.infer<typeof quoteSchema>) => {
    setIsGeneratingPdf(true);
    try {
      const pdfData = getPdfData();
      const url = await getQuotePDFDataUrl(pdfData);
      setPdfUrl(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Errore nella generazione del PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownload = () => {
    downloadQuotePDF(getPdfData(), `preventivo_${customerInfo?.name || 'cliente'}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl);
      printWindow?.print();
    }
  };

  const handleSendEmail = async () => {
    if (!customerInfo?.email) {
      toast.error("Il cliente non ha un indirizzo email");
      return;
    }

    setIsSending(true);
    try {
      // Generate PDF as base64
      const pdfDoc = await generateQuotePDF(getPdfData());
      const pdfBase64 = pdfDoc.output('datauristring').split(',')[1];

      const deviceName = `${form.getValues('deviceBrand')} ${form.getValues('deviceModel')}`.trim() || form.getValues('deviceType');

      const { error } = await supabase.functions.invoke("send-email-smtp", {
        body: {
          centro_id: centroId,
          to: customerInfo.email,
          subject: `Preventivo per ${deviceName} - ${centroInfo?.name || 'LabLinkRiparo'}`,
          html: generateEmailHtml(deviceName),
          attachments: [{
            filename: `preventivo_${customerInfo.name.replace(/\s+/g, '_')}.pdf`,
            content: pdfBase64,
            contentType: 'application/pdf',
          }]
        }
      });

      if (error) throw error;

      // Update quote status
      if (quote.repair_request_id) {
        await supabase
          .from("repair_requests")
          .update({ status: "quote_sent" })
          .eq("id", quote.repair_request_id);
      }

      toast.success("Preventivo inviato via email con PDF allegato");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Email error:", error);
      toast.error("Errore nell'invio email: " + (error.message || "Riprova"));
    } finally {
      setIsSending(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!customerInfo?.phone) {
      toast.error("Il cliente non ha un numero di telefono");
      return;
    }

    const deviceName = `${form.getValues('deviceBrand')} ${form.getValues('deviceModel')}`.trim() || form.getValues('deviceType');
    const message = generateWhatsAppMessage(deviceName);
    const phone = customerInfo.phone.replace(/\D/g, '');
    const whatsappPhone = phone.startsWith('39') ? phone : `39${phone}`;
    
    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`, '_blank');
    
    // Also download PDF
    handleDownload();
    
    toast.success("WhatsApp aperto - PDF scaricato da allegare manualmente");
  };

  const generateEmailHtml = (deviceName: string) => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Preventivo Riparazione</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">${centroInfo?.name || 'LabLinkRiparo'}</p>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 12px 12px;">
          <p style="color: #334155; font-size: 16px;">Gentile <strong>${customerInfo?.name}</strong>,</p>
          <p style="color: #64748b;">In allegato trova il preventivo per la riparazione del suo dispositivo <strong>${deviceName}</strong>.</p>
          
          <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <h3 style="margin: 0 0 15px 0; color: #1e293b;">Riepilogo</h3>
            <p style="color: #64748b; margin: 5px 0;">Problema: ${form.getValues('issueDescription')}</p>
            <p style="color: #1e293b; font-size: 24px; font-weight: bold; margin: 15px 0 0 0;">Totale: €${getTotalCost().toFixed(2)}</p>
          </div>
          
          <p style="color: #64748b;">Per accettare il preventivo puo rispondere a questa email o contattarci direttamente.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Cordiali saluti,</p>
            <p style="color: #64748b; font-size: 14px; margin: 5px 0 0 0;">${centroInfo?.name || 'LabLinkRiparo'}</p>
            ${centroInfo?.phone ? `<p style="color: #94a3b8; font-size: 12px; margin: 2px 0;">Tel: ${centroInfo.phone}</p>` : ''}
            ${centroInfo?.email ? `<p style="color: #94a3b8; font-size: 12px; margin: 2px 0;">${centroInfo.email}</p>` : ''}
          </div>
        </div>
      </div>
    `;
  };

  const generateWhatsAppMessage = (deviceName: string) => {
    return `*PREVENTIVO RIPARAZIONE*\n\n` +
      `Gentile ${customerInfo?.name},\n` +
      `Le inviamo il preventivo per:\n\n` +
      `*Dispositivo:* ${deviceName}\n` +
      `*Problema:* ${form.getValues('issueDescription')}\n` +
      `${form.getValues('diagnosis') ? `*Diagnosi:* ${form.getValues('diagnosis')}\n` : ''}` +
      `\n*DETTAGLIO COSTI:*\n` +
      items.map(i => `• ${i.description}: €${i.total.toFixed(2)}`).join('\n') +
      `\n\n*TOTALE: €${getTotalCost().toFixed(2)}*\n\n` +
      `${form.getValues('notes') ? `Note: ${form.getValues('notes')}\n\n` : ''}` +
      `Per confermare risponda a questo messaggio.\n` +
      `\n_${centroInfo?.name || 'LabLinkRiparo'}_`;
  };

  const resetDialog = () => {
    setStep('edit');
    setPdfUrl(null);
    setSendMethod(null);
    setShowSendOptions(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetDialog(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 sm:p-6 border-b">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Package className="h-6 w-6" />
            {step === 'edit' ? 'Modifica Preventivo' : 'Anteprima e Invio'}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'edit' ? (
            <motion.div
              key="edit"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 overflow-hidden"
            >
              <ScrollArea className="h-full max-h-[calc(90vh-140px)]">
                <form onSubmit={form.handleSubmit((data) => handleSave(data, false))} className="p-4 sm:p-6 space-y-6">
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
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="smartphone">Smartphone</SelectItem>
                            <SelectItem value="tablet">Tablet</SelectItem>
                            <SelectItem value="laptop">Laptop</SelectItem>
                            <SelectItem value="desktop">Desktop</SelectItem>
                          </SelectContent>
                        </Select>
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
                        rows={2}
                        {...form.register("issueDescription")}
                      />
                    </div>
                  </div>

                  {/* Markup */}
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
                    <div className="flex items-center gap-4">
                      <Label className="font-semibold">Markup sui ricambi</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={markupPercentage}
                          onChange={(e) => setMarkupPercentage(Number(e.target.value))}
                          className="w-20"
                          min={0}
                          max={200}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Add Items Tabs */}
                  <Tabs defaultValue="utopya" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="utopya">Utopya</TabsTrigger>
                      <TabsTrigger value="inventory">Inventario</TabsTrigger>
                      <TabsTrigger value="labor">Lavorazioni</TabsTrigger>
                      <TabsTrigger value="services">Servizi</TabsTrigger>
                    </TabsList>

                    <TabsContent value="utopya" className="space-y-4">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Cerca su Utopya..."
                            value={utopyaSearchQuery}
                            onChange={(e) => setUtopyaSearchQuery(e.target.value)}
                            className="pl-10"
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchUtopya())}
                          />
                        </div>
                        <Button type="button" onClick={searchUtopya} disabled={utopyaSearchLoading}>
                          {utopyaSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                      </div>
                      
                      {utopyaSearchResults.length > 0 && (
                        <div className="grid gap-2 max-h-48 overflow-y-auto">
                          {utopyaSearchResults.slice(0, 10).map((product, idx) => (
                            <Card key={idx} className="p-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {product.imageUrl && (
                                  <img src={product.imageUrl} alt="" className="w-10 h-10 object-contain rounded" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{product.name}</p>
                                  <p className="text-xs text-muted-foreground">SKU: {product.sku || 'N/A'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-primary">€{product.priceNumeric?.toFixed(2) || 'N/A'}</span>
                                <Button type="button" size="sm" onClick={() => addUtopyaProduct(product)}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="inventory" className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Cerca nell'inventario..."
                          value={inventorySearch}
                          onChange={(e) => setInventorySearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      {filteredInventory.length > 0 && (
                        <div className="grid gap-2 max-h-48 overflow-y-auto">
                          {filteredInventory.map((part) => (
                            <Card key={part.id} className="p-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{part.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="outline" className="text-xs">{part.category}</Badge>
                                    <span>Stock: {part.stock_quantity}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-primary">€{(part.selling_price || part.cost || 0).toFixed(2)}</span>
                                <Button type="button" size="sm" onClick={() => addInventoryPart(part)} disabled={part.stock_quantity === 0}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="labor" className="space-y-4">
                      <div className="grid gap-2 max-h-48 overflow-y-auto">
                        {filteredLaborPrices.map((labor) => (
                          <Card key={labor.id} className="p-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="h-10 w-10 rounded bg-amber-100 flex items-center justify-center">
                                <Wrench className="h-5 w-5 text-amber-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">{labor.name}</p>
                                <Badge variant="outline" className="text-xs">{labor.category}</Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-primary">€{labor.price.toFixed(2)}</span>
                              <Button type="button" size="sm" onClick={() => addLabor(labor)}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="services" className="space-y-4">
                      <div className="grid gap-2 max-h-48 overflow-y-auto">
                        {availableServices.map((service) => (
                          <Card key={service.id} className="p-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="h-10 w-10 rounded bg-purple-100 flex items-center justify-center">
                                <Headphones className="h-5 w-5 text-purple-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">{service.name}</p>
                                {service.description && (
                                  <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-primary">€{service.price.toFixed(2)}</span>
                              <Button type="button" size="sm" onClick={() => addService(service)}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Selected Items */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      Articoli Selezionati
                      <Badge variant="secondary">{items.length}</Badge>
                    </h3>
                    
                    {items.length === 0 ? (
                      <Card className="p-6 text-center text-muted-foreground">
                        Nessun articolo selezionato
                      </Card>
                    ) : (
                      <div className="space-y-2">
                        {items.map((item) => (
                          <Card key={item.id} className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded flex items-center justify-center bg-muted">
                                {item.type === 'part' && <Package className="h-4 w-4 text-blue-600" />}
                                {item.type === 'labor' && <Wrench className="h-4 w-4 text-amber-600" />}
                                {item.type === 'service' && <Headphones className="h-4 w-4 text-purple-600" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateItemQuantity(item.id, Number(e.target.value))}
                                  className="w-14 h-8 text-center"
                                  min={1}
                                />
                                <span className="text-xs">×</span>
                                <Input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => updateItemPrice(item.id, Number(e.target.value))}
                                  className="w-20 h-8"
                                  step={0.01}
                                />
                                <span className="font-semibold text-primary w-16 text-right">€{item.total.toFixed(2)}</span>
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Ricambi</span>
                        <span>€{getPartsCost().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Lavorazioni + Servizi</span>
                        <span>€{(getLaborCost() + getServicesCost()).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Totale</span>
                        <span className="text-primary">€{getTotalCost().toFixed(2)}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>Diagnosi / Note</Label>
                    <Textarea
                      placeholder="Note tecniche..."
                      rows={2}
                      {...form.register("diagnosis")}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 justify-end sticky bottom-0 bg-background py-3">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Annulla
                    </Button>
                    <Button type="submit" variant="secondary" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Salva
                    </Button>
                    <Button 
                      type="button" 
                      onClick={form.handleSubmit((data) => handleSave(data, true))} 
                      disabled={loading || items.length === 0}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                      Anteprima e Invia
                    </Button>
                  </div>
                </form>
              </ScrollArea>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 overflow-hidden flex flex-col lg:flex-row"
            >
              {/* PDF Preview */}
              <div className="hidden lg:flex flex-1 bg-muted/30 p-4 overflow-hidden">
                <div className="h-full w-full rounded-xl overflow-hidden shadow-lg border bg-white">
                  {isGeneratingPdf ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Generazione PDF...</p>
                      </div>
                    </div>
                  ) : pdfUrl ? (
                    <iframe src={pdfUrl} className="w-full h-full" title="Anteprima PDF" />
                  ) : null}
                </div>
              </div>

              {/* Send Options Sidebar */}
              <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l flex-1 lg:flex-none overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    <Button variant="ghost" onClick={() => setStep('edit')} className="mb-2">
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Torna alla modifica
                    </Button>

                    {/* Quick Info */}
                    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                      <CardContent className="p-4">
                        <p className="font-semibold">{customerInfo?.name}</p>
                        <p className="text-sm text-muted-foreground">{customerInfo?.phone}</p>
                        {customerInfo?.email && (
                          <p className="text-xs text-muted-foreground">{customerInfo.email}</p>
                        )}
                        <div className="mt-3 pt-3 border-t border-primary/20">
                          <span className="text-2xl font-bold text-primary">€{getTotalCost().toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Azioni</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" onClick={handleDownload} disabled={isGeneratingPdf}>
                          <Download className="h-4 w-4 mr-2" />
                          Scarica
                        </Button>
                        <Button variant="outline" onClick={handlePrint} disabled={isGeneratingPdf || !pdfUrl}>
                          <Printer className="h-4 w-4 mr-2" />
                          Stampa
                        </Button>
                      </div>
                    </div>

                    {/* Send Options */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Invia al Cliente</p>
                      
                      <Button
                        className="w-full h-12"
                        onClick={handleSendEmail}
                        disabled={isSending || !customerInfo?.email}
                      >
                        {isSending ? (
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        ) : (
                          <Mail className="h-5 w-5 mr-2" />
                        )}
                        Invia Email con PDF
                      </Button>
                      
                      {!customerInfo?.email && (
                        <p className="text-xs text-amber-600">Cliente senza email</p>
                      )}

                      <Button
                        variant="outline"
                        className="w-full h-12 border-green-500 text-green-600 hover:bg-green-50"
                        onClick={handleSendWhatsApp}
                        disabled={!customerInfo?.phone}
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        WhatsApp + Scarica PDF
                      </Button>
                      
                      <p className="text-xs text-muted-foreground">
                        WhatsApp aprira con messaggio precompilato. Il PDF verra scaricato da allegare manualmente.
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
