import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Send, Eye, MousePointer, BarChart3, Loader2, Smartphone, RefreshCw, UserX } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CampaignDetailDialog } from "./CampaignDetailDialog";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const COUPON = "EVLZBANT";

const EMAIL_TEMPLATES = [
  {
    id: "promo_standard",
    name: "🔄 Promo Standard",
    subject: "🎁 10€ di sconto sui Ricondizionati Certificati!",
    buildHtml: (name: string, clickLink: string, openPixel: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f4f4f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;"><tr><td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:32px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:24px;">🔄 Ricondizionati Certificati</h1><p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Qualità garantita, prezzo imbattibile</p></td></tr><tr><td style="padding:32px;"><h2 style="color:#18181b;margin:0 0 16px;font-size:20px;">Ciao ${name}!</h2><p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 24px;">Abbiamo una promozione esclusiva per te sui nostri dispositivi <strong>ricondizionati certificati DEKA</strong> con <strong>24 mesi di garanzia</strong>!</p><div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:2px solid #10b981;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center;"><p style="color:#065f46;margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:1px;">IL TUO CODICE SCONTO</p><p style="color:#047857;margin:0 0 8px;font-size:40px;font-weight:700;font-family:monospace;letter-spacing:4px;">${COUPON}</p><p style="color:#059669;margin:0;font-size:18px;font-weight:600;">-10€ sul tuo ordine</p></div><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="${clickLink}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:600;font-size:16px;">Scopri le Offerte →</a></td></tr></table><p style="color:#71717a;font-size:13px;margin:24px 0 0;text-align:center;">Il coupon verrà copiato automaticamente quando clicchi.</p></td></tr><tr><td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e4e4e7;"><p style="color:#a1a1aa;margin:0;font-size:11px;">Ricevi questa email perché sei cliente del nostro centro.</p></td></tr></table></td></tr></table><img src="${openPixel}" width="1" height="1" style="display:none;" alt="" /></body></html>`,
  },
  {
    id: "urgenza",
    name: "⚡ Offerta Lampo",
    subject: "⚡ Solo per oggi: 10€ di sconto sui Ricondizionati!",
    buildHtml: (name: string, clickLink: string, openPixel: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f4f4f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;"><tr><td style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);padding:32px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:28px;">⚡ OFFERTA LAMPO</h1><p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:16px;font-weight:600;">Disponibilità limitata!</p></td></tr><tr><td style="padding:32px;"><h2 style="color:#18181b;margin:0 0 16px;font-size:20px;">Ciao ${name}!</h2><p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 16px;">Non farti scappare questa occasione! Abbiamo un <strong>codice sconto esclusivo</strong> per te sui nostri ricondizionati certificati DEKA.</p><div style="background:#fef2f2;border:2px dashed #ef4444;border-radius:12px;padding:24px;margin:0 0 16px;text-align:center;"><p style="color:#991b1b;margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:2px;">CODICE ESCLUSIVO</p><p style="color:#dc2626;margin:0 0 8px;font-size:44px;font-weight:800;font-family:monospace;letter-spacing:4px;">${COUPON}</p><p style="color:#b91c1c;margin:0;font-size:20px;font-weight:700;">RISPARMIA 10€ SUBITO</p></div><ul style="color:#52525b;font-size:14px;line-height:2;padding-left:20px;margin:0 0 24px;"><li>✅ Garanzia <strong>24 mesi</strong> inclusa</li><li>✅ Certificazione <strong>DEKA</strong></li><li>✅ Spedizione veloce</li><li>✅ Reso garantito</li></ul><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="${clickLink}" style="display:inline-block;background:linear-gradient(135deg,#ef4444,#dc2626);color:#ffffff;text-decoration:none;padding:18px 48px;border-radius:8px;font-weight:700;font-size:18px;text-transform:uppercase;">Approfitta Ora →</a></td></tr></table></td></tr><tr><td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e4e4e7;"><p style="color:#a1a1aa;margin:0;font-size:11px;">Ricevi questa email perché sei cliente del nostro centro.</p></td></tr></table></td></tr></table><img src="${openPixel}" width="1" height="1" style="display:none;" alt="" /></body></html>`,
  },
  {
    id: "risparmio",
    name: "💰 Risparmia sul Nuovo",
    subject: "💰 Perché pagare di più? Ricondizionati con garanzia 24 mesi",
    buildHtml: (name: string, clickLink: string, openPixel: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f4f4f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;"><tr><td style="background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);padding:32px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:24px;">💰 Risparmia senza rinunciare alla qualità</h1><p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Ricondizionati certificati con garanzia completa</p></td></tr><tr><td style="padding:32px;"><h2 style="color:#18181b;margin:0 0 16px;font-size:20px;">Ciao ${name}!</h2><p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 16px;">Lo sapevi che puoi avere uno smartphone <strong>come nuovo</strong> risparmiando fino al <strong>50%</strong>?</p><p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 24px;">I nostri ricondizionati <strong>certificati DEKA</strong> hanno <strong>24 mesi di garanzia</strong>. E con il tuo codice sconto risparmi ancora di più!</p><div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #3b82f6;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center;"><p style="color:#1e40af;margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:1px;">IL TUO CODICE SCONTO</p><p style="color:#1d4ed8;margin:0 0 8px;font-size:40px;font-weight:700;font-family:monospace;letter-spacing:4px;">${COUPON}</p><p style="color:#2563eb;margin:0;font-size:18px;font-weight:600;">-10€ sul tuo prossimo acquisto</p></div><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="${clickLink}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:600;font-size:16px;">Scopri i Prezzi →</a></td></tr></table></td></tr><tr><td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e4e4e7;"><p style="color:#a1a1aa;margin:0;font-size:11px;">Ricevi questa email perché sei cliente del nostro centro.</p></td></tr></table></td></tr></table><img src="${openPixel}" width="1" height="1" style="display:none;" alt="" /></body></html>`,
  },
];

interface CentroRicondizionatiTabProps {
  centroId: string | null;
}

export function CentroRicondizionatiTab({ centroId }: CentroRicondizionatiTabProps) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [title, setTitle] = useState("");
  const [offerText, setOfferText] = useState("10€ di sconto sui ricondizionati certificati DEKA con 24 mesi di garanzia!");
  const [templateId, setTemplateId] = useState("promo_standard");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [detailCampaign, setDetailCampaign] = useState<any>(null);

  // Fetch campaigns created by this centro (filter by checking recipients)
  const { data: campaigns = [] } = useQuery({
    queryKey: ["centro-ricondizionati-campaigns", centroId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ricondizionati_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!centroId,
    refetchInterval: 10000, // aggiorna ogni 10 secondi
  });

  // Fetch customers of this centro with email
  const { data: customers = [] } = useQuery({
    queryKey: ["centro-customers-email", centroId],
    queryFn: async () => {
      if (!centroId) return [];
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, email, phone")
        .eq("centro_id", centroId)
        .not("email", "is", null)
        .neq("email", "")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!centroId,
  });

  const selectedTemplate = EMAIL_TEMPLATES.find(t => t.id === templateId) || EMAIL_TEMPLATES[0];

  const showPreview = (tpl = selectedTemplate) => {
    const html = tpl.buildHtml("Mario Rossi", "#", "");
    setPreviewHtml(html);
    setPreviewOpen(true);
  };

  const toggleCustomer = (id: string) => {
    setSelectedCustomers(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c.id));
    }
  };

  const handleSend = async () => {
    if (!title.trim()) { toast.error("Inserisci un titolo"); return; }
    if (selectedCustomers.length === 0) { toast.error("Seleziona almeno un cliente"); return; }
    if (!centroId) { toast.error("Centro non trovato"); return; }

    setSending(true);
    try {
      // Create campaign
      const { data: campaign, error: cErr } = await supabase
        .from("ricondizionati_campaigns")
        .insert({
          title,
          offer_text: offerText,
          coupon_code: COUPON,
          status: "sent",
          sent_at: new Date().toISOString(),
          total_sent: selectedCustomers.length,
        } as any)
        .select()
        .single();
      if (cErr) throw cErr;

      // Create recipients and send emails with delay to avoid SMTP rate limits
      const recipientCustomers = customers.filter(c => selectedCustomers.includes(c.id));
      let sentCount = 0;
      let failCount = 0;

      for (const cust of recipientCustomers) {
        const { data: recipient } = await supabase
          .from("ricondizionati_campaign_recipients")
          .insert({
            campaign_id: campaign.id,
            customer_id: cust.id,
            customer_email: cust.email,
            customer_name: cust.name,
            centro_id: centroId,
          } as any)
          .select()
          .single();

        if (recipient) {
          const trackBase = `${SUPABASE_URL}/functions/v1/ricondizionati-track`;
          const openPixel = `${trackBase}?a=open&t=${recipient.tracking_id}`;
          const clickLink = `${window.location.origin}/promo-redirect?t=${recipient.tracking_id}`;
          const html = selectedTemplate.buildHtml(cust.name || "Cliente", clickLink, openPixel);

          try {
            const { error: sendErr } = await supabase.functions.invoke("send-email-smtp", {
              body: {
                centro_id: centroId,
                to: cust.email,
                subject: selectedTemplate.subject,
                html,
                marketing: true,
              },
            });

            if (!sendErr) {
              // Mark as delivered
              await supabase
                .from("ricondizionati_campaign_recipients")
                .update({ sent_at: new Date().toISOString() } as any)
                .eq("id", recipient.id);
              sentCount++;
            } else {
              failCount++;
            }
          } catch {
            failCount++;
          }

          // Delay 3 seconds between sends to avoid SMTP rate limits
          if (recipientCustomers.indexOf(cust) < recipientCustomers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }

      const msg = failCount > 0 
        ? `Campagna: ${sentCount} inviate, ${failCount} fallite (rate limit SMTP)`
        : `Campagna inviata a ${sentCount} clienti!`;
      if (failCount > 0) toast.warning(msg); else toast.success(msg);
      setCreateOpen(false);
      setTitle("");
      setSelectedCustomers([]);
      queryClient.invalidateQueries({ queryKey: ["centro-ricondizionati-campaigns"] });
    } catch (err: any) {
      toast.error("Errore: " + (err.message || "Invio fallito"));
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (campaign: any) => {
    if (!centroId) return;
    setResendingId(campaign.id);
    try {
      // Fetch recipients for this campaign
      const { data: recipients, error } = await supabase
        .from("ricondizionati_campaign_recipients")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("centro_id", centroId);
      if (error) throw error;
      if (!recipients || recipients.length === 0) {
        toast.error("Nessun destinatario trovato per questa campagna");
        return;
      }

      const tpl = EMAIL_TEMPLATES.find(t => t.id === (campaign.template_id || "promo_standard")) || EMAIL_TEMPLATES[0];
      let sentCount = 0;

      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        const trackBase = `${SUPABASE_URL}/functions/v1/ricondizionati-track`;
        const openPixel = `${trackBase}?a=open&t=${r.tracking_id}`;
        const clickLink = `${window.location.origin}/promo-redirect?t=${r.tracking_id}`;
        const html = tpl.buildHtml(r.customer_name || "Cliente", clickLink, openPixel);

        try {
          await supabase.functions.invoke("send-email-smtp", {
            body: {
              centro_id: centroId,
              to: r.customer_email,
              subject: tpl.subject,
              html,
              marketing: true,
            },
          });

          await supabase
            .from("ricondizionati_campaign_recipients")
            .update({ sent_at: new Date().toISOString() } as any)
            .eq("id", r.id);
          sentCount++;
        } catch {
          // Skip failed sends
        }

        // Delay 3s between sends
        if (i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      toast.success(`Campagna reinviata a ${sentCount} destinatari!`);
    } catch (err: any) {
      toast.error("Errore reinvio: " + (err.message || "Fallito"));
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Promo Ricondizionati
          </h3>
          <p className="text-sm text-muted-foreground">
            Invia offerte sui ricondizionati certificati DEKA ai tuoi clienti con coupon {COUPON}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuova Campagna
        </Button>
      </div>

      {/* Campaign List */}
      {campaigns.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campagna</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-center">Inviati</TableHead>
                  <TableHead className="text-center">Aperti</TableHead>
                  <TableHead className="text-center">Click</TableHead>
                  <TableHead className="text-center">Copiati</TableHead>
                  <TableHead className="text-center">Disiscritti</TableHead>
                  <TableHead>Funnel</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c: any) => {
                  const total = c.total_sent || 1;
                  const openPct = Math.round(((c.total_opened || 0) / total) * 100);
                  const clickPct = Math.round(((c.total_clicked || 0) / total) * 100);
                  const copyPct = Math.round(((c.total_copied || 0) / total) * 100);
                  return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailCampaign(c)}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "sent" ? "default" : "secondary"}>
                        {c.status === "sent" ? "Inviata" : c.status === "draft" ? "Bozza" : c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{c.total_sent || 0}</TableCell>
                    <TableCell className="text-center">{c.total_opened || 0}</TableCell>
                    <TableCell className="text-center">{c.total_clicked || 0}</TableCell>
                    <TableCell className="text-center font-semibold text-primary">{c.total_copied || 0}</TableCell>
                    <TableCell className="text-center">
                      {(c.total_unsubscribed || 0) > 0 ? (
                        <span className="text-destructive font-semibold">{c.total_unsubscribed}</span>
                      ) : "0"}
                    </TableCell>
                    <TableCell>
                      <div className="w-24 space-y-0.5">
                        <Progress value={openPct} className="h-1.5" indicatorClassName="bg-amber-500" />
                        <Progress value={clickPct} className="h-1.5" indicatorClassName="bg-blue-500" />
                        <Progress value={copyPct} className="h-1.5" indicatorClassName="bg-emerald-500" />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.sent_at ? format(new Date(c.sent_at), "dd MMM yyyy", { locale: it }) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status === "sent" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={resendingId === c.id}
                          onClick={(e) => { e.stopPropagation(); handleResend(c); }}
                        >
                          {resendingId === c.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Reinvia
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nessuna campagna ricondizionati ancora.</p>
            <p className="text-sm">Crea la prima per inviare offerte ai tuoi clienti!</p>
          </CardContent>
        </Card>
      )}

      {/* Template Gallery */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template Disponibili</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {EMAIL_TEMPLATES.map((tpl) => (
              <Card key={tpl.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => showPreview(tpl)}>
                <CardContent className="p-4 text-center">
                  <p className="font-semibold text-sm">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{tpl.subject}</p>
                  <Button variant="ghost" size="sm" className="mt-2 gap-1">
                    <Eye className="h-3 w-3" /> Anteprima
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Campaign Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuova Campagna Ricondizionati</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titolo campagna</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Promo Marzo 2026" />
            </div>
            <div>
              <Label>Testo offerta</Label>
              <Textarea value={offerText} onChange={(e) => setOfferText(e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Template email</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {EMAIL_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    className={`p-3 rounded-lg border text-sm text-left transition-all ${
                      templateId === tpl.id ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setTemplateId(tpl.id)}
                  >
                    <p className="font-medium">{tpl.name}</p>
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={() => showPreview()}>
                <Eye className="h-3 w-3" /> Anteprima Email
              </Button>
            </div>

            {/* Inline preview */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">Anteprima</div>
              <iframe
                srcDoc={selectedTemplate.buildHtml("Mario Rossi", "#", "")}
                className="w-full h-[300px] border-0"
                title="Preview"
              />
            </div>

            {/* Customer selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Seleziona clienti ({selectedCustomers.length}/{customers.length})</Label>
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  {selectedCustomers.length === customers.length ? "Deseleziona tutti" : "Seleziona tutti"}
                </Button>
              </div>
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {customers.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">Nessun cliente con email trovato</p>
                ) : (
                  customers.map(c => (
                    <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-0">
                      <Checkbox checked={selectedCustomers.includes(c.id)} onCheckedChange={() => toggleCustomer(c.id)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <Button className="w-full gap-2" onClick={handleSend} disabled={sending || selectedCustomers.length === 0}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Invio in corso..." : `Invia a ${selectedCustomers.length} clienti`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Anteprima Email</DialogTitle>
          </DialogHeader>
          <iframe srcDoc={previewHtml} className="w-full h-[70vh] border rounded-lg" title="Email Preview" />
        </DialogContent>
      </Dialog>

      {/* Campaign Detail Dialog */}
      <CampaignDetailDialog
        campaign={detailCampaign}
        open={!!detailCampaign}
        onOpenChange={(open) => { if (!open) setDetailCampaign(null); }}
      />
    </div>
  );
}
