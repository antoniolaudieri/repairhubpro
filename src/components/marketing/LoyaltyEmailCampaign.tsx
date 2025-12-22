import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Mail, Send, Users, CheckCircle2, Loader2, Sparkles } from "lucide-react";
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

type EmailTemplate = "diagnosis" | "friendly" | "urgency" | "value" | "exclusive" | "prevention" | "custom";

const getFirstName = (fullName: string): string => {
  return fullName.split(" ")[0];
};

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
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>("diagnosis");

  const emailTemplates = {
    diagnosis: {
      name: "📱 Diagnosi Gratuita",
      description: "Focus sulla webapp di diagnosi dispositivi - NOVITÀ",
      subject: `{{nome}}, scopri lo stato di salute del tuo smartphone GRATIS! 📱`,
      getMessage: () => `Ciao {{nome}}!\n\n🆕 GRANDE NOVITÀ: Abbiamo lanciato un nuovo servizio esclusivo!\n\nCon la Tessera Fedeltà ${centroName} hai accesso alla nostra WEBAPP DI DIAGNOSI DISPOSITIVI - un'applicazione intelligente che monitora la salute del tuo smartphone in tempo reale!\n\n📊 COSA FA LA WEBAPP:\n• Analisi stato batteria e cicli di ricarica\n• Controllo memoria e storage disponibile\n• Monitoraggio prestazioni del sistema\n• Alert automatici quando c'è un problema\n• Report dettagliato sulla salute del dispositivo\n\n🎁 CON LA TESSERA OTTIENI:\n✅ DIAGNOSI GRATUITA per ${settings?.max_devices || 3} dispositivi (valore €${(settings?.diagnostic_fee || 15) * (settings?.max_devices || 3)}!)\n✅ ${settings?.repair_discount_percent || 10}% di sconto su TUTTE le riparazioni\n✅ Accesso illimitato alla webapp di monitoraggio\n✅ Alert preventivi per evitare guasti\n\n💰 TUTTO QUESTO A SOLI €${settings?.annual_price || 30}/ANNO!\n\nNon aspettare che il tuo telefono si rompa - previeni i problemi!\n\n${centroName}`
    },
    friendly: {
      name: "💝 Amichevole",
      description: "Tono caldo e personale con focus diagnosi",
      subject: `${centroName} - Un regalo speciale per te! 🎁`,
      getMessage: () => `Ciao {{nome}}!\n\nCome stai? Spero tutto bene con i tuoi dispositivi! 😊\n\nVolevo parlarti di una novità pensata proprio per clienti speciali come te: la nostra Tessera Fedeltà!\n\n🆕 NOVITÀ ESCLUSIVA: Con la tessera hai accesso alla nostra webapp di DIAGNOSI SMART che monitora la salute del tuo smartphone!\n\nCon soli €${settings?.annual_price || 30} all'anno avrai:\n📱 DIAGNOSI GRATUITA per ${settings?.max_devices || 3} dispositivi (normalmente €${(settings?.diagnostic_fee || 15) * (settings?.max_devices || 3)}!)\n✨ ${settings?.repair_discount_percent || 10}% di sconto su TUTTE le riparazioni\n📊 Webapp per controllare lo stato del tuo telefono\n🔔 Alert automatici prima che qualcosa si rompa\n\nÈ un piccolo investimento che si ripaga già con la prima diagnosi!\n\nTi aspetto in negozio o clicca il bottone qui sotto per attivare subito la tua tessera 🤗\n\nA presto!\n${centroName}`
    },
    urgency: {
      name: "⚡ Urgenza",
      description: "Crea senso di urgenza",
      subject: `⚡ {{nome}}, offerta limitata - Diagnosi GRATIS per 3 dispositivi!`,
      getMessage: () => `{{nome}}, non perdere questa occasione!\n\nSolo per un periodo limitato, puoi attivare la Tessera Fedeltà ${centroName} e ottenere la DIAGNOSI GRATUITA per ${settings?.max_devices || 3} dispositivi!\n\n🔥 COSA OTTIENI SUBITO:\n📱 DIAGNOSI INCLUSA per ${settings?.max_devices || 3} dispositivi (risparmio di €${(settings?.diagnostic_fee || 15) * (settings?.max_devices || 3)}!)\n📊 Accesso alla WEBAPP di monitoraggio salute dispositivi\n💰 ${settings?.repair_discount_percent || 10}% di sconto immediato su ogni riparazione\n🔔 Alert automatici per prevenire guasti\n\n💡 PERCHÉ È IMPORTANTE:\nLa nostra webapp analizza batteria, memoria e prestazioni. Ti avvisa PRIMA che il dispositivo si guasti - risparmiando centinaia di euro in riparazioni d'emergenza!\n\nIl prezzo? Solo €${settings?.annual_price || 30}/anno.\nIl valore? Oltre €${(settings?.diagnostic_fee || 15) * (settings?.max_devices || 3) + 50}!\n\n⏰ Non aspettare che sia troppo tardi - clicca il bottone e attiva ORA!\n\n${centroName}`
    },
    value: {
      name: "💰 Valore",
      description: "Focus sui vantaggi economici",
      subject: `{{nome}}, ecco quanto risparmi con la Tessera 💰`,
      getMessage: () => `Ciao {{nome}},\n\nFacciamo due conti insieme?\n\n📱 Hai uno smartphone, tablet o PC? Prima o poi avrai bisogno di controllarne lo stato o ripararlo.\n\n❌ SENZA TESSERA:\n• Diagnosi singola: €${settings?.diagnostic_fee || 15}\n• Per 3 dispositivi: €${(settings?.diagnostic_fee || 15) * 3}\n• Riparazione media: €80\n• Totale potenziale: €${(settings?.diagnostic_fee || 15) * 3 + 80}\n\n✅ CON LA TESSERA FEDELTÀ (€${settings?.annual_price || 30}/anno):\n• DIAGNOSI ${settings?.max_devices || 3} DISPOSITIVI: €0 (GRATIS!)\n• Webapp monitoraggio: INCLUSA\n• Riparazione con ${settings?.repair_discount_percent || 10}% sconto: €72\n• TOTALE: €${settings?.annual_price || 30} + €72 = €${(settings?.annual_price || 30) + 72}\n\n💵 RISPARMIO: €${(settings?.diagnostic_fee || 15) * 3 + 80 - ((settings?.annual_price || 30) + 72)}!\n\nE la webapp ti avvisa quando c'è un problema - PRIMA che si rompa tutto!\n\nÈ matematica: conviene. Punto.\n\nClicca il bottone qui sotto e attiva subito!\n\n${centroName}`
    },
    exclusive: {
      name: "⭐ Esclusività",
      description: "Fai sentire il cliente speciale",
      subject: `{{nome}}, accesso VIP alla nuova tecnologia di diagnosi ⭐`,
      getMessage: () => `Gentile {{nome}},\n\nSei tra i clienti che apprezziamo di più, e per questo vogliamo offrirti qualcosa di speciale.\n\nAbbiamo lanciato una TECNOLOGIA ESCLUSIVA: una webapp di diagnosi che monitora la salute dei tuoi dispositivi in tempo reale!\n\n🌟 VANTAGGI RISERVATI AI MEMBRI:\n📱 DIAGNOSI GRATUITA per ${settings?.max_devices || 3} dispositivi\n📊 Accesso ESCLUSIVO alla webapp di monitoraggio\n🔔 Alert intelligenti che prevengono guasti costosi\n💰 ${settings?.repair_discount_percent || 10}% di sconto permanente su ogni intervento\n⚡ Priorità nelle riparazioni\n\nLa webapp analizza:\n• Stato batteria e cicli di ricarica\n• Memoria e spazio disponibile\n• Prestazioni generali del sistema\n• Potenziali problemi prima che si verifichino\n\nQuesto programma non è per tutti - è pensato per chi, come te, vuole proteggere i propri dispositivi.\n\nL'investimento? Solo €${settings?.annual_price || 30}/anno.\nIl valore? Inestimabile.\n\nSarebbe un piacere averti nel nostro club di clienti premium.\n\nCon stima,\n${centroName}`
    },
    prevention: {
      name: "🛡️ Prevenzione",
      description: "Focus sulla prevenzione guasti",
      subject: `{{nome}}, previeni i guasti del tuo smartphone - Costa meno! 🛡️`,
      getMessage: () => `Ciao {{nome}},\n\n❓ Lo sapevi che la maggior parte dei guasti smartphone si può PREVENIRE?\n\nBatteria che si scarica velocemente, telefono che rallenta, memoria piena... Sono tutti segnali che qualcosa non va. Ma spesso ce ne accorgiamo troppo tardi!\n\n🆕 ECCO LA SOLUZIONE:\n\nCon la Tessera Fedeltà ${centroName} hai accesso alla nostra webapp di DIAGNOSI SMART che:\n\n📊 Monitora la salute del dispositivo in tempo reale\n🔋 Controlla lo stato della batteria e cicli di ricarica\n💾 Analizza memoria e storage\n🔔 Ti avvisa PRIMA che qualcosa si rompa\n\n🎁 COSA INCLUDE LA TESSERA:\n✅ Diagnosi GRATUITA per ${settings?.max_devices || 3} dispositivi (valore €${(settings?.diagnostic_fee || 15) * (settings?.max_devices || 3)})\n✅ Accesso illimitato alla webapp\n✅ ${settings?.repair_discount_percent || 10}% sconto su tutte le riparazioni\n✅ Alert preventivi automatici\n\n💡 PREVENIRE costa €${settings?.annual_price || 30}/anno\n❌ RIPARARE costa centinaia di euro + stress!\n\nLa scelta è facile. Attiva ora la tua tessera!\n\n${centroName}`
    },
    custom: {
      name: "✏️ Personalizzato",
      description: "Scrivi il tuo messaggio",
      subject: `${centroName} - Tessera Fedeltà con Diagnosi Inclusa`,
      getMessage: () => `Gentile {{nome}},\n\n[Scrivi qui il tuo messaggio personalizzato]\n\nRicorda di menzionare:\n• Diagnosi GRATUITA per ${settings?.max_devices || 3} dispositivi\n• Webapp di monitoraggio salute dispositivi\n• ${settings?.repair_discount_percent || 10}% sconto riparazioni\n• Costo: solo €${settings?.annual_price || 30}/anno\n\nCordiali saluti,\n${centroName}`
    }
  };

  const fetchCustomers = async () => {
    if (!centroId) return;
    setLoading(true);

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

    const { data: loyaltyCards } = await supabase
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
    if (settings) {
      applyTemplate(selectedTemplate);
    }
  }, [settings, centroName]);

  const applyTemplate = (template: EmailTemplate) => {
    const t = emailTemplates[template];
    setCustomSubject(t.subject);
    setCustomMessage(t.getMessage());
    setSelectedTemplate(template);
  };

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

  const generateEmailHtml = (customerName: string, customerId: string, customerEmail: string, trackingId: string) => {
    const firstName = getFirstName(customerName);
    const personalizedMessage = customMessage.replace(/\{\{nome\}\}/g, firstName);
    
    // Convert message to HTML paragraphs (avoid long lines)
    const messageParagraphs = personalizedMessage
      .split('\n\n')
      .map(para => para.trim())
      .filter(para => para.length > 0)
      .map(para => {
        // Skip greeting lines that will be duplicated
        if (para.match(/^(Ciao|Gentile)\s/i)) {
          return '';
        }
        return `<p style="margin:0 0 12px 0;">${para.replace(/\n/g, '<br>')}</p>`;
      })
      .filter(p => p.length > 0)
      .join('\n');
    
    const baseUrl = window.location.origin;
    const checkoutUrl = [
      baseUrl,
      '/attiva-tessera?customer_id=', customerId,
      '&centro_id=', centroId,
      '&email=', encodeURIComponent(customerEmail || ''),
      '&centro=', encodeURIComponent(centroName),
      '&track=', trackingId
    ].join('');
    
    const unsubUrl = [
      baseUrl,
      '/disiscrizione?email=', encodeURIComponent(customerEmail || ''),
      '&centro=', centroId,
      '&nome=', encodeURIComponent(centroName)
    ].join('');
    
    // Build HTML with short lines to avoid quoted-printable encoding issues
    const parts = [
      '<!DOCTYPE html>',
      '<html>',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1.0">',
      '</head>',
      '<body style="margin:0;padding:0;background:#f8fafc;">',
      '<table width="100%" cellpadding="0" cellspacing="0" border="0">',
      '<tr><td align="center" style="padding:20px;">',
      '<table width="600" cellpadding="0" cellspacing="0" border="0"',
      ' style="max-width:600px;width:100%;font-family:Arial,sans-serif;">',
      
      // Header
      '<tr><td style="background:#f59e0b;padding:30px;text-align:center;',
      'border-radius:16px 16px 0 0;">',
      '<h1 style="color:#fff;margin:0;font-size:24px;">',
      '&#127873; Tessera Fedelt&agrave;</h1>',
      '<p style="color:#fff;margin:10px 0 0;opacity:0.9;">',
      centroName,
      '</p></td></tr>',
      
      // Content
      '<tr><td style="background:#fff;padding:30px;',
      'border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">',
      '<p style="font-size:16px;margin:0 0 20px;">',
      'Ciao <strong>', firstName, '</strong>!</p>',
      '<div style="margin:0 0 20px;line-height:1.6;color:#333;">',
      messageParagraphs,
      '</div>',
      '</td></tr>',
      
      // WebApp section
      '<tr><td style="background:#3b82f6;padding:25px;color:#fff;">',
      '<p style="text-align:center;font-size:40px;margin:0 0 15px;">',
      '&#128241;</p>',
      '<h3 style="margin:0 0 12px;text-align:center;font-size:18px;">',
      '&#127381; NOVIT&Agrave;: WebApp Diagnosi Smart</h3>',
      '<p style="margin:0;text-align:center;font-size:14px;opacity:0.9;">',
      'Monitora la salute dei tuoi dispositivi!</p>',
      '</td></tr>',
      
      // Benefits
      '<tr><td style="background:#fef3c7;padding:25px;',
      'border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">',
      '<h3 style="margin:0 0 15px;color:#92400e;text-align:center;">',
      '&#10024; I tuoi vantaggi esclusivi</h3>',
      '<table width="100%" cellpadding="10" cellspacing="0">',
      '<tr>',
      '<td width="50%" style="text-align:center;">',
      '<div style="font-size:28px;">&#128241;</div>',
      '<div style="font-weight:bold;color:#92400e;">DIAGNOSI GRATIS</div>',
      '<div style="font-size:13px;color:#78350f;">',
      'Per ', String(settings?.max_devices || 3), ' dispositivi</div></td>',
      '<td width="50%" style="text-align:center;">',
      '<div style="font-size:28px;">&#128176;</div>',
      '<div style="font-weight:bold;color:#92400e;">',
      String(settings?.repair_discount_percent || 10), '% SCONTO</div>',
      '<div style="font-size:13px;color:#78350f;">',
      'Su tutte le riparazioni</div></td>',
      '</tr>',
      '</table>',
      '<div style="text-align:center;margin-top:15px;padding:15px;',
      'background:#92400e;border-radius:12px;">',
      '<span style="color:#fef3c7;font-size:14px;">TUTTO QUESTO A SOLI</span>',
      '<div style="color:#fff;font-size:32px;font-weight:bold;">',
      '&euro;', String(settings?.annual_price || 30), '/anno</div>',
      '</div></td></tr>',
      
      // CTA
      '<tr><td style="background:#fff;padding:30px;text-align:center;',
      'border-radius:0 0 16px 16px;',
      'border:1px solid #e5e7eb;border-top:none;">',
      '<a href="', checkoutUrl, '"',
      ' style="display:inline-block;background:#f59e0b;color:#fff;',
      'text-decoration:none;padding:18px 40px;border-radius:12px;',
      'font-size:18px;font-weight:bold;">',
      '&#127873; ATTIVA ORA LA TUA TESSERA</a>',
      '<p style="margin:15px 0 0;font-size:13px;color:#6b7280;">',
      'Pagamento sicuro con Stripe</p>',
      '</td></tr>',
      
      // Footer
      '<tr><td style="padding:20px;text-align:center;">',
      '<p style="color:#6b7280;font-size:12px;margin:0 0 10px;">',
      centroName, ' - Email inviata perch&eacute; sei un nostro cliente.',
      '</p>',
      '<p style="font-size:11px;margin:0;">',
      '<a href="', unsubUrl, '"',
      ' style="color:#9ca3af;text-decoration:underline;">',
      'Annulla iscrizione</a>',
      ' | GDPR: puoi revocare il consenso in qualsiasi momento.',
      '</p></td></tr>',
      
      '</table>',
      '</td></tr></table>',
      '</body></html>'
    ];
    
    return parts.join('\n');
  };

  const getPersonalizedSubject = (customerName: string) => {
    return customSubject.replace(/\{\{nome\}\}/g, getFirstName(customerName));
  };

  const sendEmails = async () => {
    if (selectedCustomers.length === 0) return;
    
    setSending(true);
    
    // Check for unsubscribed customers first
    const customerEmails = selectedCustomers.map(c => c.email).filter(Boolean);
    const { data: unsubscribed } = await supabase
      .from("email_unsubscribes")
      .select("email")
      .eq("centro_id", centroId)
      .in("email", customerEmails);
    
    const unsubscribedEmails = new Set(unsubscribed?.map(u => u.email) || []);
    
    // Also check customer_profiles for email_consent = false
    const customerIds = selectedCustomers.map(c => c.id);
    const { data: profiles } = await supabase
      .from("customer_profiles")
      .select("customer_id, email_consent")
      .eq("centro_id", centroId)
      .in("customer_id", customerIds)
      .eq("email_consent", false);
    
    const noConsentCustomerIds = new Set(profiles?.map(p => p.customer_id) || []);
    
    // Filter out unsubscribed customers
    const eligibleCustomers = selectedCustomers.filter(c => 
      c.email && 
      !unsubscribedEmails.has(c.email) && 
      !noConsentCustomerIds.has(c.id)
    );
    
    const skipped = selectedCustomers.length - eligibleCustomers.length;
    
    setSendProgress({ sent: 0, total: eligibleCustomers.length, failed: 0 });

    let sent = 0;
    let failed = 0;

    for (const customer of eligibleCustomers) {
      try {
        // Create tracking record first
        const { data: trackingRecord, error: trackingError } = await supabase
          .from("email_campaign_clicks")
          .insert({
            centro_id: centroId,
            customer_id: customer.id,
            campaign_type: "loyalty_promotion",
            email_template: selectedTemplate,
          })
          .select("id")
          .single();

        if (trackingError) {
          console.error("Error creating tracking record:", trackingError);
          throw trackingError;
        }

        const trackingId = trackingRecord.id;

        const { error } = await supabase.functions.invoke("send-email-smtp", {
          body: {
            centro_id: centroId,
            to: customer.email,
            subject: getPersonalizedSubject(customer.name),
            html: generateEmailHtml(customer.name, customer.id, customer.email || '', trackingId),
            customer_id: customer.id,
            template_name: "loyalty_proposal",
            metadata: { campaign: "loyalty_mass_email", tracking_id: trackingId }
          }
        });

        if (error) throw error;
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${customer.email}:`, err);
        failed++;
      }
      
      setSendProgress({ sent, total: eligibleCustomers.length, failed });
    }

    setSending(false);
    setShowEmailDialog(false);
    
    if (skipped > 0) {
      toast.info(`${skipped} clienti esclusi (disiscritti o senza consenso)`);
    }
    
    if (failed === 0 && sent > 0) {
      toast.success(`${sent} email inviate con successo!`);
    } else if (sent > 0) {
      toast.warning(`${sent} email inviate, ${failed} fallite`);
    } else if (sent === 0 && skipped > 0) {
      toast.warning("Nessuna email inviata - tutti i clienti selezionati sono disiscritti");
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
              <label className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Template Email Persuasivo
              </label>
              <Select value={selectedTemplate} onValueChange={(v) => applyTemplate(v as EmailTemplate)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(emailTemplates).map(([key, template]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex flex-col">
                        <span className="font-medium">{template.name}</span>
                        <span className="text-xs text-muted-foreground">{template.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Oggetto Email</label>
              <Input
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Oggetto dell'email..."
              />
              <p className="text-xs text-muted-foreground">Usa {"{{nome}}"} per inserire il nome del cliente</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Messaggio</label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Usa {"{{nome}}"} per personalizzare con il nome del cliente</p>
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
