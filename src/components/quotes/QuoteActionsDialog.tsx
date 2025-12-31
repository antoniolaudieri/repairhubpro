import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Euro, 
  Smartphone, 
  User, 
  ShoppingCart, 
  Bell,
  MessageCircle,
  Mail,
  CheckCircle,
  Package,
  Loader2,
  Wrench
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Quote {
  id: string;
  customer_id: string;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  issue_description: string;
  total_cost: number;
  status: string;
  signed_at: string | null;
  deposit_amount?: number;
  deposit_paid_at?: string;
  device_location?: string;
  parts_ordered_at?: string;
  parts_arrived_at?: string;
  customer_notified_at?: string;
  linked_order_id?: string;
  items?: any;
  customers: {
    name: string;
    email: string | null;
    phone: string;
  } | null;
}

interface QuoteActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote;
  centroId: string | null;
  onSuccess: () => void;
}

export function QuoteActionsDialog({ 
  open, 
  onOpenChange, 
  quote, 
  centroId,
  onSuccess 
}: QuoteActionsDialogProps) {
  const [depositAmount, setDepositAmount] = useState(quote.deposit_amount || 0);
  const [deviceWithCustomer, setDeviceWithCustomer] = useState(quote.device_location === 'with_customer');
  const [isSaving, setIsSaving] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  const handleSaveDeposit = async () => {
    setIsSaving(true);
    try {
      const updates: any = {
        deposit_amount: depositAmount,
        device_location: deviceWithCustomer ? 'with_customer' : 'in_lab',
      };

      if (depositAmount > 0 && !quote.deposit_paid_at) {
        updates.deposit_paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("quotes")
        .update(updates)
        .eq("id", quote.id);

      if (error) throw error;

      toast.success("Dati salvati");
      onSuccess();
    } catch (error: any) {
      console.error("Error saving deposit:", error);
      toast.error("Errore nel salvataggio");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOrderParts = async () => {
    if (!centroId) return;

    setIsOrdering(true);
    try {
      // Parse items from quote
      const quoteItems = typeof quote.items === 'string' 
        ? JSON.parse(quote.items) 
        : (quote.items || []);
      
      const parts = quoteItems.filter((item: any) => item.type === 'part');
      
      if (parts.length === 0) {
        toast.error("Nessun ricambio nel preventivo");
        setIsOrdering(false);
        return;
      }

      // Generate order number
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

      // Create order linked to quote
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          status: "pending",
          supplier: "Utopya",
          customer_id: quote.customer_id,
          quote_id: quote.id,
          total_amount: parts.reduce((sum: number, p: any) => sum + (p.purchaseCost || p.unitPrice) * p.quantity, 0),
          notes: `Ordine per preventivo - ${quote.device_type} ${quote.device_brand || ''} ${quote.device_model || ''}`
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = parts.map((part: any) => ({
        order_id: order.id,
        product_name: part.description,
        quantity: part.quantity,
        unit_cost: part.purchaseCost || part.unitPrice,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update quote with order link and status
      const { error: updateError } = await supabase
        .from("quotes")
        .update({
          linked_order_id: order.id,
          parts_ordered_at: new Date().toISOString(),
          status: 'parts_ordered'
        })
        .eq("id", quote.id);

      if (updateError) throw updateError;

      toast.success(`Ordine ${orderNumber} creato`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast.error("Errore nella creazione ordine");
    } finally {
      setIsOrdering(false);
    }
  };

  const handleNotifyCustomer = async (method: 'email' | 'whatsapp') => {
    if (!quote.customers) return;

    setIsNotifying(true);
    try {
      const message = `Buongiorno ${quote.customers.name},\n\nI ricambi per la riparazione del suo ${quote.device_type} ${quote.device_brand || ''} ${quote.device_model || ''} sono arrivati!\n\nPuò portare il dispositivo quando preferisce.\n\nGrazie.`;

      if (method === 'whatsapp') {
        const phone = quote.customers.phone?.replace(/\D/g, '') || '';
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      } else if (method === 'email' && quote.customers.email && centroId) {
        const { error } = await supabase.functions.invoke('send-email-smtp', {
          body: {
            to: quote.customers.email,
            subject: `Ricambi arrivati - ${quote.device_type} ${quote.device_brand || ''}`,
            html: `<p>${message.replace(/\n/g, '<br/>')}</p>`,
            centro_id: centroId
          }
        });
        if (error) throw error;
      }

      // Update quote
      await supabase
        .from("quotes")
        .update({
          customer_notified_at: new Date().toISOString(),
          status: 'customer_notified'
        })
        .eq("id", quote.id);

      toast.success("Cliente avvisato");
      onSuccess();
    } catch (error: any) {
      console.error("Error notifying customer:", error);
      toast.error("Errore nell'invio notifica");
    } finally {
      setIsNotifying(false);
    }
  };

  const handleDeviceReceived = async () => {
    setIsSaving(true);
    try {
      await supabase
        .from("quotes")
        .update({
          device_location: 'in_lab',
          status: 'device_received'
        })
        .eq("id", quote.id);

      toast.success("Dispositivo registrato in laboratorio");
      onSuccess();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Errore");
    } finally {
      setIsSaving(false);
    }
  };

  const canOrderParts = quote.signed_at && !quote.parts_ordered_at;
  const canNotify = quote.parts_arrived_at && !quote.customer_notified_at;
  const canReceiveDevice = quote.device_location === 'with_customer' && quote.customer_notified_at;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Gestione Preventivo
          </DialogTitle>
          <DialogDescription>
            {quote.customers?.name} - {quote.device_type} {quote.device_brand} {quote.device_model}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Timeline */}
          <div className="flex items-center gap-2 flex-wrap">
            {quote.signed_at && (
              <Badge className="bg-emerald-500/20 text-emerald-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Firmato
              </Badge>
            )}
            {quote.deposit_paid_at && (
              <Badge className="bg-blue-500/20 text-blue-600">
                <Euro className="h-3 w-3 mr-1" />
                Acconto €{quote.deposit_amount}
              </Badge>
            )}
            {quote.device_location === 'with_customer' && (
              <Badge className="bg-amber-500/20 text-amber-600">
                <User className="h-3 w-3 mr-1" />
                Disp. c/o Cliente
              </Badge>
            )}
            {quote.parts_ordered_at && (
              <Badge className="bg-purple-500/20 text-purple-600">
                <ShoppingCart className="h-3 w-3 mr-1" />
                Ordinato
              </Badge>
            )}
            {quote.parts_arrived_at && (
              <Badge className="bg-teal-500/20 text-teal-600">
                <Package className="h-3 w-3 mr-1" />
                Ricambi Arrivati
              </Badge>
            )}
            {quote.customer_notified_at && (
              <Badge className="bg-indigo-500/20 text-indigo-600">
                <Bell className="h-3 w-3 mr-1" />
                Cliente Avvisato
              </Badge>
            )}
          </div>

          <Separator />

          {/* Deposit & Device Location */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="device-with-customer" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Dispositivo presso il cliente
                </Label>
                <Switch
                  id="device-with-customer"
                  checked={deviceWithCustomer}
                  onCheckedChange={setDeviceWithCustomer}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit">Acconto ricevuto</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="deposit"
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                      className="pl-10"
                      placeholder="0.00"
                    />
                  </div>
                  <Button onClick={handleSaveDeposit} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salva"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Totale preventivo: €{quote.total_cost.toFixed(2)} | 
                  Saldo: €{(quote.total_cost - depositAmount).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Order Parts */}
          {canOrderParts && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Ordina Ricambi
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Crea un ordine con i ricambi del preventivo
                    </p>
                  </div>
                  <Button onClick={handleOrderParts} disabled={isOrdering}>
                    {isOrdering ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 mr-2" />
                    )}
                    Ordina
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notify Customer */}
          {canNotify && (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Avvisa il Cliente
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      I ricambi sono arrivati! Avvisa {quote.customers?.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleNotifyCustomer('whatsapp')}
                      disabled={isNotifying}
                      className="flex-1"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      WhatsApp
                    </Button>
                    {quote.customers?.email && (
                      <Button 
                        variant="outline" 
                        onClick={() => handleNotifyCustomer('email')}
                        disabled={isNotifying}
                        className="flex-1"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Device Received */}
          {canReceiveDevice && (
            <Card className="border-teal-500/30 bg-teal-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Dispositivo Ricevuto
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Il cliente ha portato il dispositivo
                    </p>
                  </div>
                  <Button onClick={handleDeviceReceived} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conferma"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
