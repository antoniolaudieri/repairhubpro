import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Mail, Send, Users, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  hasLoyaltyCard: boolean;
}

interface LoyaltyEmailCampaignProps {
  centroId: string | null;
  centroName: string;
  settings: {
    annual_price: number;
    diagnostic_fee: number;
    repair_discount_percent: number;
    max_devices: number;
    promo_tagline?: string;
  } | null;
}

export function LoyaltyEmailCampaign({ centroId, centroName, settings }: LoyaltyEmailCampaignProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0, failed: 0 });
  const [customSubject, setCustomSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");

  const fetchCustomers = async () => {
    if (!centroId) return;
    setLoading(true);

    // Fetch all customers for this centro
    const { data: allCustomers, error: customersError } = await supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("centro_id", centroId)
      .not("email", "is", null)
      .order("name");

    if (customersError) {
      console.error("Error fetching customers:", customersError);
      setLoading(false);
      return;
    }

    // Fetch active loyalty cards for this centro
    const { data: loyaltyCards, error: cardsError } = await supabase
      .from("loyalty_cards")
      .select("customer_id")
      .eq("centro_id", centroId)
      .eq("status", "active");

    const loyaltyCustomerIds = new Set(loyaltyCards?.map(c => c.customer_id) || []);

    const customersWithStatus = (allCustomers || []).map(c => ({
      ...c,
      hasLoyaltyCard: loyaltyCustomerIds.has(c.id)
    }));

    setCustomers(customersWithStatus);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [centroId]);

  useEffect(() => {
    // Set default email content when settings load
    if (settings) {
      setCustomSubject(`${centroName} - Scopri la nostra Tessera Fedeltà! 🎁`);
      setCustomMessage(
        `Gentile Cliente,\n\n` +
        `Siamo lieti di presentarti la nostra nuova Tessera Fedeltà!\n\n` +
        `Con soli €${settings.annual_price}/anno potrai usufruire di:\n` +
        `• Diagnostica a soli €${settings.diagnostic_fee} (invece di €15)\n` +
        `• ${settings.repair_discount_percent}% di sconto su tutte le riparazioni\n` +
        `• Valida per ${settings.max_devices} dispositivi\n\n` +
        (settings.promo_tagline ? `${settings.promo_tagline}\n\n` : '') +
        `Non perdere questa opportunità!\n\n` +
        `Cordiali saluti,\n${centroName}`
      );
    }
  }, [settings, centroName]);

  const filteredCustomers = customers.filter(c => {
    const search = searchTerm.toLowerCase();
    return (
      c.name?.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.phone?.includes(search)
    );
  });

  const customersWithoutCard = filteredCustomers.filter(c => !c.hasLoyaltyCard && c.email);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === customersWithoutCard.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customersWithoutCard.map(c => c.id)));
    }
  };

  const selectedCustomers = customersWithoutCard.filter(c => selectedIds.has(c.id));

  const generateEmailHtml = (customerName: string) => {
    const messageHtml = customMessage.replace(/\n/g, '<br/>');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎁 Tessera Fedeltà</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${centroName}</p>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
          <p style="font-size: 16px;">Gentile <strong>${customerName}</strong>,</p>
          <div style="margin: 20px 0;">
            ${messageHtml.replace(`Gentile Cliente,<br/><br/>`, '')}
          </div>
          <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #92400e;">I tuoi vantaggi:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #78350f;">
              <li style="margin-bottom: 8px;">Diagnostica a €${settings?.diagnostic_fee || 10}</li>
              <li style="margin-bottom: 8px;">${settings?.repair_discount_percent || 10}% sconto riparazioni</li>
              <li>Valida per ${settings?.max_devices || 3} dispositivi</li>
            </ul>
            <p style="margin: 15px 0 0 0; font-size: 24px; font-weight: bold; color: #92400e; text-align: center;">
              Solo €${settings?.annual_price || 30}/anno
            </p>
          </div>
        </div>
        <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px;">
          ${centroName} - Questa email è stata inviata perché sei un nostro cliente.
        </p>
      </body>
      </html>
    `.trim();
  };

  const sendEmails = async () => {
    if (selectedCustomers.length === 0) return;
    
    setSending(true);
    setSendProgress({ sent: 0, total: selectedCustomers.length, failed: 0 });

    let sent = 0;
    let failed = 0;

    for (const customer of selectedCustomers) {
      try {
        const { error } = await supabase.functions.invoke("send-email-smtp", {
          body: {
            centro_id: centroId,
            to: customer.email,
            subject: customSubject,
            html: generateEmailHtml(customer.name),
            customer_id: customer.id,
            template_name: "loyalty_proposal",
            metadata: { campaign: "loyalty_mass_email" }
          }
        });

        if (error) throw error;
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${customer.email}:`, err);
        failed++;
      }
      
      setSendProgress({ sent, total: selectedCustomers.length, failed });
    }

    setSending(false);
    setShowEmailDialog(false);
    
    if (failed === 0) {
      toast.success(`${sent} email inviate con successo!`);
    } else {
      toast.warning(`${sent} email inviate, ${failed} fallite`);
    }
    
    setSelectedIds(new Set());
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Campagna Email Tessera Fedeltà
          </CardTitle>
          <CardDescription>
            Seleziona i clienti a cui proporre la tessera fedeltà
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca clienti..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={selectAll}
              disabled={customersWithoutCard.length === 0}
            >
              {selectedIds.size === customersWithoutCard.length && customersWithoutCard.length > 0
                ? "Deseleziona tutti"
                : "Seleziona tutti"}
            </Button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                {customersWithoutCard.length} clienti senza tessera
              </span>
              {selectedIds.size > 0 && (
                <Badge variant="secondary">
                  {selectedIds.size} selezionati
                </Badge>
              )}
            </div>
            <Button 
              onClick={() => setShowEmailDialog(true)}
              disabled={selectedIds.size === 0}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Invia Email ({selectedIds.size})
            </Button>
          </div>

          <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
            {customersWithoutCard.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                <p>Tutti i tuoi clienti hanno già la tessera fedeltà!</p>
              </div>
            ) : (
              customersWithoutCard.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                  onClick={() => toggleSelect(customer.id)}
                >
                  <Checkbox
                    checked={selectedIds.has(customer.id)}
                    onCheckedChange={() => toggleSelect(customer.id)}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-muted text-xs">
                      {customer.name?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{customer.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Email Preview Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invia Email Promozionale
            </DialogTitle>
            <DialogDescription>
              Verifica e personalizza il contenuto dell'email prima dell'invio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {selectedCustomers.length} destinatari selezionati
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Oggetto Email</label>
              <Input
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Oggetto dell'email..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Messaggio</label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            {sending && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">
                    Invio in corso... {sendProgress.sent}/{sendProgress.total}
                  </span>
                </div>
                <div className="h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(sendProgress.sent / sendProgress.total) * 100}%` }}
                  />
                </div>
                {sendProgress.failed > 0 && (
                  <p className="text-xs text-destructive mt-2">
                    {sendProgress.failed} email fallite
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)} disabled={sending}>
              Annulla
            </Button>
            <Button onClick={sendEmails} disabled={sending} className="gap-2">
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Invio...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Invia {selectedCustomers.length} Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
