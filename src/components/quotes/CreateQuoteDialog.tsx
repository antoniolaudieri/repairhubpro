import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  
  const [items, setItems] = useState<QuoteItem[]>([
    { description: "", quantity: 1, unitPrice: 0 }
  ]);
  const [laborCost, setLaborCost] = useState(0);
  
  const [sendMethod, setSendMethod] = useState<"email" | "whatsapp" | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [step, setStep] = useState<"form" | "send">("form");

  useEffect(() => {
    if (open && centroId) {
      loadCustomers();
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

  const loadCustomers = async () => {
    const { data } = await supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("centro_id", centroId)
      .order("name");
    
    if (data) setCustomers(data);
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
    setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
    setLaborCost(0);
    setSendMethod(null);
    setStep("form");
  };

  const handleCreateQuote = async () => {
    if (!selectedCustomer || !centroId) {
      toast.error("Seleziona un cliente");
      return;
    }

    if (totalCost <= 0) {
      toast.error("Il totale deve essere maggiore di zero");
      return;
    }

    setStep("send");
  };

  const handleSendQuote = async () => {
    if (!selectedCustomer || !sendMethod) return;

    setIsSending(true);
    try {
      // Create the quote
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

      if (sendMethod === "email" && selectedCustomer.email) {
        // Send email via edge function
        const { error: emailError } = await supabase.functions.invoke("send-email-smtp", {
          body: {
            to: selectedCustomer.email,
            subject: `Preventivo per ${deviceType} ${deviceBrand} ${deviceModel}`,
            html: `
              <h2>Preventivo Riparazione</h2>
              <p>Gentile ${selectedCustomer.name},</p>
              <p>Le inviamo il preventivo per la riparazione del suo dispositivo:</p>
              <ul>
                <li><strong>Dispositivo:</strong> ${deviceType} ${deviceBrand} ${deviceModel}</li>
                <li><strong>Problema:</strong> ${issueDescription}</li>
                ${diagnosis ? `<li><strong>Diagnosi:</strong> ${diagnosis}</li>` : ''}
              </ul>
              <h3>Dettaglio Costi</h3>
              <table style="border-collapse: collapse; width: 100%;">
                ${items.filter(i => i.description).map(i => `
                  <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${i.description}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">€${(i.quantity * i.unitPrice).toFixed(2)}</td>
                  </tr>
                `).join('')}
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">Manodopera</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">€${laborCost.toFixed(2)}</td>
                </tr>
                <tr style="font-weight: bold; background: #f5f5f5;">
                  <td style="border: 1px solid #ddd; padding: 8px;">TOTALE</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">€${totalCost.toFixed(2)}</td>
                </tr>
              </table>
              <p style="margin-top: 20px;">Per accettare o rifiutare il preventivo, acceda al suo portale cliente.</p>
              ${notes ? `<p><em>Note: ${notes}</em></p>` : ''}
            `,
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
        // Open WhatsApp with pre-filled message
        const message = encodeURIComponent(
          `*Preventivo Riparazione*\n\n` +
          `Gentile ${selectedCustomer.name},\n` +
          `Le inviamo il preventivo per:\n` +
          `📱 ${deviceType} ${deviceBrand} ${deviceModel}\n` +
          `🔧 ${issueDescription}\n\n` +
          `*Totale: €${totalCost.toFixed(2)}*\n\n` +
          `Per confermare risponda a questo messaggio.`
        );
        const phone = selectedCustomer.phone.replace(/\D/g, '');
        const whatsappPhone = phone.startsWith('39') ? phone : `39${phone}`;
        window.open(`https://wa.me/${whatsappPhone}?text=${message}`, '_blank');
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

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            {step === "form" ? "Nuovo Preventivo" : "Invia Preventivo"}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "form" ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Customer Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Cliente
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca cliente per nome o telefono..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-10"
                  />
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <Card className="absolute z-50 w-full mt-1 shadow-lg">
                      <CardContent className="p-1 max-h-48 overflow-y-auto">
                        {filteredCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => handleSelectCustomer(customer)}
                            className="w-full text-left p-2 hover:bg-muted rounded-lg transition-colors"
                          >
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">{customer.phone}</p>
                          </button>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
                {selectedCustomer && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {selectedCustomer.name}
                    </Badge>
                    {selectedCustomer.email && (
                      <Badge variant="outline" className="text-xs">
                        <Mail className="h-3 w-3 mr-1" />
                        {selectedCustomer.email}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Device Info */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Tipo
                  </Label>
                  <Select value={deviceType} onValueChange={setDeviceType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Smartphone">Smartphone</SelectItem>
                      <SelectItem value="Tablet">Tablet</SelectItem>
                      <SelectItem value="Laptop">Laptop</SelectItem>
                      <SelectItem value="Smartwatch">Smartwatch</SelectItem>
                      <SelectItem value="Console">Console</SelectItem>
                      <SelectItem value="Altro">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input
                    placeholder="Es. Apple"
                    value={deviceBrand}
                    onChange={(e) => setDeviceBrand(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modello</Label>
                  <Input
                    placeholder="Es. iPhone 15"
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                  />
                </div>
              </div>

              {/* Issue & Diagnosis */}
              <div className="space-y-2">
                <Label>Problema Segnalato</Label>
                <Textarea
                  placeholder="Descrivi il problema..."
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Diagnosi</Label>
                <Textarea
                  placeholder="Diagnosi tecnica (opzionale)..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Quote Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Euro className="h-4 w-4" />
                    Voci di Costo
                  </Label>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Aggiungi
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2"
                    >
                      <Input
                        placeholder="Descrizione"
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Qtà"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                        className="w-16"
                        min={1}
                      />
                      <div className="relative w-24">
                        <Euro className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="Prezzo"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="pl-7"
                          step="0.01"
                        />
                      </div>
                      {items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Labor Cost */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Label className="flex-1">Manodopera</Label>
                  <div className="relative w-32">
                    <Euro className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={laborCost}
                      onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                      className="pl-7"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Note (opzionale)</Label>
                <Textarea
                  placeholder="Note aggiuntive per il cliente..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Total */}
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">Totale Preventivo</span>
                    <span className="text-3xl font-bold text-primary">€{totalCost.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ricambi: €{partsCost.toFixed(2)} + Manodopera: €{laborCost.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Button 
                onClick={handleCreateQuote} 
                className="w-full h-12 text-lg"
                disabled={!selectedCustomer || totalCost <= 0}
              >
                <Send className="h-5 w-5 mr-2" />
                Procedi all'Invio
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="send"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Summary */}
              <Card className="bg-muted/50">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold">{selectedCustomer?.name}</p>
                      <p className="text-sm text-muted-foreground">{deviceType} {deviceBrand} {deviceModel}</p>
                    </div>
                    <span className="text-2xl font-bold text-primary">€{totalCost.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Send Method Selection */}
              <div className="space-y-3">
                <Label>Come vuoi inviare il preventivo?</Label>
                
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSendMethod("email")}
                    disabled={!selectedCustomer?.email}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      sendMethod === "email" 
                        ? "border-primary bg-primary/10" 
                        : "border-muted hover:border-primary/50"
                    } ${!selectedCustomer?.email ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <Mail className={`h-8 w-8 mx-auto mb-2 ${sendMethod === "email" ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="font-semibold">Email</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedCustomer?.email || "Email non disponibile"}
                    </p>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSendMethod("whatsapp")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      sendMethod === "whatsapp" 
                        ? "border-green-500 bg-green-500/10" 
                        : "border-muted hover:border-green-500/50"
                    }`}
                  >
                    <MessageCircle className={`h-8 w-8 mx-auto mb-2 ${sendMethod === "whatsapp" ? "text-green-500" : "text-muted-foreground"}`} />
                    <p className="font-semibold">WhatsApp</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedCustomer?.phone}
                    </p>
                  </motion.button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("form")}
                  className="flex-1"
                >
                  Indietro
                </Button>
                <Button
                  onClick={handleSendQuote}
                  disabled={!sendMethod || isSending}
                  className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
                >
                  {isSending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Invia Preventivo
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}