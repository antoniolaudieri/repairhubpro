import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  HelpCircle
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
  description: string;
  quantity: number;
  unitPrice: number;
}

interface CentroInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
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
  
  // AI Device Info
  const [detectedDevice, setDetectedDevice] = useState<DetectedDeviceInfo | null>(null);
  const [isLookingUpDevice, setIsLookingUpDevice] = useState(false);
  
  const [items, setItems] = useState<QuoteItem[]>([
    { description: "", quantity: 1, unitPrice: 0 }
  ]);
  const [laborCost, setLaborCost] = useState(0);
  
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [centroInfo, setCentroInfo] = useState<CentroInfo | null>(null);

  useEffect(() => {
    if (open && centroId) {
      loadCustomers();
      loadCentroInfo();
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
      .select("business_name, address, phone, email")
      .eq("id", centroId)
      .single();
    
    if (data) {
      setCentroInfo({
        name: data.business_name,
        address: data.address,
        phone: data.phone,
        email: data.email
      });
    }
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const partsCost = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalCost = partsCost + laborCost;

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
    setDetectedDevice(null);
    setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
    setLaborCost(0);
    setShowPreview(false);
  };

  const handleShowPreview = () => {
    if (!selectedCustomer || !centroId) {
      toast.error("Seleziona un cliente");
      return;
    }

    if (totalCost <= 0) {
      toast.error("Il totale deve essere maggiore di zero");
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
          items: items.filter(i => i.description).map(i => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.quantity * i.unitPrice
          })),
          labor_cost: laborCost,
          parts_cost: partsCost,
          total_cost: totalCost,
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
            centroId
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
              ${items.filter(i => i.description).map(i => `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #475569;">${i.description}</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; color: #1e293b;">€${(i.quantity * i.unitPrice).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #475569;">Manodopera</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; color: #1e293b;">€${laborCost.toFixed(2)}</td>
              </tr>
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
    return `*📋 PREVENTIVO RIPARAZIONE*\n\n` +
      `Gentile ${selectedCustomer?.name},\n` +
      `Le inviamo il preventivo per:\n\n` +
      `📱 *Dispositivo:* ${deviceName}\n` +
      `${detectedDevice?.year && detectedDevice.year !== 'N/A' ? `📅 *Anno:* ${detectedDevice.year}\n` : ''}` +
      `🔧 *Problema:* ${issueDescription}\n` +
      `${diagnosis ? `📝 *Diagnosi:* ${diagnosis}\n` : ''}` +
      `\n*DETTAGLIO COSTI:*\n` +
      items.filter(i => i.description).map(i => `• ${i.description}: €${(i.quantity * i.unitPrice).toFixed(2)}`).join('\n') +
      `\n• Manodopera: €${laborCost.toFixed(2)}\n\n` +
      `💰 *TOTALE: €${totalCost.toFixed(2)}*\n\n` +
      `${notes ? `📌 Note: ${notes}\n\n` : ''}` +
      `Per confermare risponda a questo messaggio.\n` +
      `${centroInfo ? `\n_${centroInfo.name}_` : ''}`;
  };

  return (
    <>
      <Dialog open={open && !showPreview} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              Nuovo Preventivo
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 px-4 pb-4 sm:px-6 sm:pb-6" style={{ maxHeight: 'calc(90vh - 80px)' }}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 sm:space-y-6 pt-4"
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
                      <Badge variant="secondary" className="text-xs">
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Ricerca AI...
                      </Badge>
                    )}
                  </div>

                  {/* AI Detected Device Preview */}
                  {detectedDevice && (detectedDevice.imageUrl || detectedDevice.specs) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20"
                    >
                      <div className="flex gap-3">
                        {detectedDevice.imageUrl && (
                          <div className="relative flex-shrink-0">
                            <img
                              src={detectedDevice.imageUrl}
                              alt={`${deviceBrand} ${deviceModel}`}
                              className="h-16 w-16 sm:h-20 sm:w-20 object-contain rounded-lg bg-white p-1 shadow-sm"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <Badge 
                              variant="secondary" 
                              className="absolute -top-1 -right-1 text-[8px] px-1 py-0 bg-primary text-primary-foreground"
                            >
                              <Sparkles className="h-2 w-2" />
                            </Badge>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">
                            {detectedDevice.fullName || `${deviceBrand} ${deviceModel}`}
                          </h4>
                          {detectedDevice.year && detectedDevice.year !== "N/A" && (
                            <p className="text-xs text-muted-foreground">Anno: {detectedDevice.year}</p>
                          )}
                          {detectedDevice.specs && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {detectedDevice.specs.storage && detectedDevice.specs.storage !== "N/A" && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{detectedDevice.specs.storage}</Badge>
                              )}
                              {detectedDevice.specs.ram && detectedDevice.specs.ram !== "N/A" && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{detectedDevice.specs.ram}</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Device Type Grid - Mobile optimized */}
                  <div className="grid grid-cols-5 gap-1 sm:gap-2">
                    {deviceTypes.map((type) => {
                      const Icon = type.icon;
                      const isSelected = deviceType === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setDeviceType(type.value)}
                          className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg border-2 transition-all ${
                            isSelected 
                              ? "border-primary bg-primary/10 text-primary" 
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          <span className="text-[8px] sm:text-[10px] font-medium mt-0.5">{type.value}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Brand & Model - Responsive */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Marca</Label>
                      <Input
                        placeholder="Es. Apple"
                        value={deviceBrand}
                        onChange={(e) => setDeviceBrand(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Modello</Label>
                      <Input
                        placeholder="Es. iPhone 15"
                        value={deviceModel}
                        onChange={(e) => setDeviceModel(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Issue & Diagnosis */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Problema Segnalato *</Label>
                  <Textarea
                    placeholder="Descrivi il problema..."
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Diagnosi (opzionale)</Label>
                  <Textarea
                    placeholder="Diagnosi tecnica..."
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>
              </div>

              {/* Quote Items */}
              <Card className="border-primary/20">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="flex items-center gap-2">
                      <Euro className="h-4 w-4 text-primary" />
                      Voci di Costo
                    </Label>
                    <Button variant="outline" size="sm" onClick={addItem} className="h-7 text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Aggiungi
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-2 items-start"
                      >
                        <div className="flex-1">
                          <Input
                            placeholder="Descrizione..."
                            value={item.description}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="w-14 sm:w-16">
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                            className="h-9 text-sm text-center"
                          />
                        </div>
                        <div className="w-20 sm:w-24">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="€"
                            value={item.unitPrice || ""}
                            onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="h-9 w-9 text-muted-foreground hover:text-destructive flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>

                  {/* Labor Cost */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    <Label className="text-xs flex-shrink-0">Manodopera:</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={laborCost || ""}
                      onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                      className="h-9 w-24 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">€</span>
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t bg-primary/5 -mx-3 sm:-mx-4 px-3 sm:px-4 py-3 -mb-3 sm:-mb-4 rounded-b-lg">
                    <span className="font-semibold text-sm">Totale:</span>
                    <span className="text-xl sm:text-2xl font-bold text-primary">€ {totalCost.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <div>
                <Label className="text-xs text-muted-foreground">Note aggiuntive</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Note per il cliente..."
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>

              {/* Actions */}
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
                  disabled={!selectedCustomer || totalCost <= 0}
                  className="flex-1 gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Anteprima PDF
                </Button>
              </div>
            </motion.div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <QuotePDFPreview
        open={showPreview}
        onOpenChange={setShowPreview}
        customer={selectedCustomer!}
        deviceType={deviceType}
        deviceBrand={deviceBrand}
        deviceModel={deviceModel}
        issueDescription={issueDescription}
        diagnosis={diagnosis}
        notes={notes}
        items={items}
        laborCost={laborCost}
        partsCost={partsCost}
        totalCost={totalCost}
        centroInfo={centroInfo || undefined}
        deviceInfo={detectedDevice}
        onSend={handleSendQuote}
        isSending={isSending}
      />
    </>
  );
}
