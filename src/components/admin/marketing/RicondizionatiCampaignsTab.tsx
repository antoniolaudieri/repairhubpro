import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Send, Eye, MousePointer, BarChart3, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const COUPON = "EVLZBANT";

// ── Email templates ──────────────────────────────────────────
const EMAIL_TEMPLATES = [
  {
    id: "promo_standard",
    name: "🔄 Promo Standard",
    subject: "🎁 10€ di sconto sui Ricondizionati Certificati!",
    buildHtml: (name: string, clickLink: string, openPixel: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f4f4f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;"><tr><td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:32px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:24px;">🔄 Ricondizionati Certificati</h1><p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Qualità garantita, prezzo imbattibile</p></td></tr><tr><td style="padding:32px;"><h2 style="color:#18181b;margin:0 0 16px;font-size:20px;">Ciao ${name}!</h2><p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 24px;">Abbiamo una promozione esclusiva per te sui nostri dispositivi <strong>ricondizionati certificati DEKA</strong> con <strong>24 mesi di garanzia</strong>!</p><div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:2px solid #10b981;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center;"><p style="color:#065f46;margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:1px;">IL TUO CODICE SCONTO</p><p style="color:#047857;margin:0 0 8px;font-size:40px;font-weight:700;font-family:monospace;letter-spacing:4px;">${COUPON}</p><p style="color:#059669;margin:0;font-size:18px;font-weight:600;">-10€ sul tuo ordine</p></div><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="${clickLink}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:600;font-size:16px;">Scopri le Offerte →</a></td></tr></table><p style="color:#71717a;font-size:13px;margin:24px 0 0;text-align:center;">Il coupon verrà copiato automaticamente quando clicchi.</p></td></tr><tr><td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e4e4e7;"><p style="color:#a1a1aa;margin:0;font-size:11px;">Ricevi questa email perché sei cliente di un nostro centro partner.</p></td></tr></table></td></tr></table><img src="${openPixel}" width="1" height="1" style="display:none;" alt="" /></body></html>`,
  },
  {
    id: "urgenza",
    name: "⚡ Offerta Lampo",
    subject: "⚡ Solo per oggi: 10€ di sconto sui Ricondizionati!",
    buildHtml: (name: string, clickLink: string, openPixel: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f4f4f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;"><tr><td style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);padding:32px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:28px;">⚡ OFFERTA LAMPO</h1><p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:16px;font-weight:600;">Disponibilità limitata!</p></td></tr><tr><td style="padding:32px;"><h2 style="color:#18181b;margin:0 0 16px;font-size:20px;">Ciao ${name}!</h2><p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 16px;">Non farti scappare questa occasione! Abbiamo un <strong>codice sconto esclusivo</strong> per te sui nostri ricondizionati certificati DEKA.</p><div style="background:#fef2f2;border:2px dashed #ef4444;border-radius:12px;padding:24px;margin:0 0 16px;text-align:center;"><p style="color:#991b1b;margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:2px;">CODICE ESCLUSIVO</p><p style="color:#dc2626;margin:0 0 8px;font-size:44px;font-weight:800;font-family:monospace;letter-spacing:4px;">${COUPON}</p><p style="color:#b91c1c;margin:0;font-size:20px;font-weight:700;">RISPARMIA 10€ SUBITO</p></div><ul style="color:#52525b;font-size:14px;line-height:2;padding-left:20px;margin:0 0 24px;"><li>✅ Garanzia <strong>24 mesi</strong> inclusa</li><li>✅ Certificazione <strong>DEKA</strong></li><li>✅ Spedizione veloce</li><li>✅ Reso garantito</li></ul><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="${clickLink}" style="display:inline-block;background:linear-gradient(135deg,#ef4444,#dc2626);color:#ffffff;text-decoration:none;padding:18px 48px;border-radius:8px;font-weight:700;font-size:18px;text-transform:uppercase;">Approfitta Ora →</a></td></tr></table></td></tr><tr><td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e4e4e7;"><p style="color:#a1a1aa;margin:0;font-size:11px;">Ricevi questa email perché sei cliente di un nostro centro partner.</p></td></tr></table></td></tr></table><img src="${openPixel}" width="1" height="1" style="display:none;" alt="" /></body></html>`,
  },
  {
    id: "risparmio",
    name: "💰 Risparmia sul Nuovo",
    subject: "💰 Perché pagare di più? Ricondizionati con garanzia 24 mesi",
    buildHtml: (name: string, clickLink: string, openPixel: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f4f4f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;"><tr><td style="background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);padding:32px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:24px;">💰 Risparmia senza rinunciare alla qualità</h1><p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Ricondizionati certificati con garanzia completa</p></td></tr><tr><td style="padding:32px;"><h2 style="color:#18181b;margin:0 0 16px;font-size:20px;">Ciao ${name}!</h2><p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 16px;">Lo sapevi che puoi avere uno smartphone <strong>come nuovo</strong> risparmiando fino al <strong>50%</strong> rispetto al prezzo di listino?</p><p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 24px;">I nostri ricondizionati <strong>certificati DEKA</strong> hanno <strong>24 mesi di garanzia</strong>, proprio come un dispositivo nuovo. E con il tuo codice sconto risparmi ancora di più!</p><div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #3b82f6;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center;"><p style="color:#1e40af;margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:1px;">IL TUO CODICE SCONTO</p><p style="color:#1d4ed8;margin:0 0 8px;font-size:40px;font-weight:700;font-family:monospace;letter-spacing:4px;">${COUPON}</p><p style="color:#2563eb;margin:0;font-size:18px;font-weight:600;">-10€ sul tuo prossimo acquisto</p></div><div style="display:flex;gap:12px;margin:0 0 24px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="33%" style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;"><p style="font-size:24px;margin:0;">🛡️</p><p style="color:#166534;font-size:12px;margin:4px 0 0;font-weight:600;">Garanzia 24 mesi</p></td><td width="4%"></td><td width="33%" style="background:#fefce8;border-radius:8px;padding:16px;text-align:center;"><p style="font-size:24px;margin:0;">✅</p><p style="color:#854d0e;font-size:12px;margin:4px 0 0;font-weight:600;">Certificato DEKA</p></td><td width="4%"></td><td width="33%" style="background:#fdf2f8;border-radius:8px;padding:16px;text-align:center;"><p style="font-size:24px;margin:0;">💸</p><p style="color:#9d174d;font-size:12px;margin:4px 0 0;font-weight:600;">Fino a -50%</p></td></tr></table></div><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="${clickLink}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:600;font-size:16px;">Scopri i Prezzi →</a></td></tr></table></td></tr><tr><td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e4e4e7;"><p style="color:#a1a1aa;margin:0;font-size:11px;">Ricevi questa email perché sei cliente di un nostro centro partner.</p></td></tr></table></td></tr></table><img src="${openPixel}" width="1" height="1" style="display:none;" alt="" /></body></html>`,
  },
];

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  offer_text: string;
  coupon_code: string;
  discount_amount: number;
  destination_url: string;
  status: string;
  sent_at: string | null;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  created_at: string;
};

type Recipient = {
  id: string;
  customer_email: string;
  customer_name: string | null;
  sent_at: string | null;
  opened_at: string | null;
  open_count: number;
  clicked_at: string | null;
  click_count: number;
  tracking_id: string;
};

export function RicondizionatiCampaignsTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [sendCampaignId, setSendCampaignId] = useState<string | null>(null);
  const [centroFilter, setCentroFilter] = useState<string>("all");
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [newCampaign, setNewCampaign] = useState({ title: "", description: "", offer_text: "", templateId: "promo_standard" });
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch campaigns
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["ricondizionati-campaigns"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ricondizionati_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
  });

  // Fetch recipients for selected campaign
  const { data: recipients = [] } = useQuery({
    queryKey: ["ricondizionati-recipients", selectedCampaign?.id],
    enabled: !!selectedCampaign,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ricondizionati_campaign_recipients")
        .select("*")
        .eq("campaign_id", selectedCampaign!.id)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data as Recipient[];
    },
  });

  // Fetch centri
  const { data: centri = [] } = useQuery({
    queryKey: ["centri-for-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centri_assistenza")
        .select("id, business_name")
        .eq("status", "approved");
      if (error) throw error;
      return data;
    },
  });

  // Fetch customers with email
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-for-campaigns", centroFilter],
    enabled: isSendDialogOpen,
    queryFn: async () => {
      let query = supabase
        .from("customers")
        .select("id, name, email, centro_id")
        .not("email", "is", null)
        .neq("email", "");
      if (centroFilter !== "all") {
        query = query.eq("centro_id", centroFilter);
      }
      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data.filter(c => c.email && c.email.includes("@"));
    },
  });

  // Create campaign
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("ricondizionati_campaigns")
        .insert({
          title: newCampaign.title,
          description: newCampaign.description || newCampaign.templateId,
          offer_text: newCampaign.offer_text || EMAIL_TEMPLATES.find(t => t.id === newCampaign.templateId)?.name || "",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ricondizionati-campaigns"] });
      toast.success("Campagna creata");
      setIsCreateOpen(false);
      setNewCampaign({ title: "", description: "", offer_text: "", templateId: "promo_standard" });
    },
    onError: () => toast.error("Errore nella creazione"),
  });

  // Send campaign
  const sendMutation = useMutation({
    mutationFn: async ({ campaignId }: { campaignId: string }) => {
      const selected = customers.filter(c => selectedCustomers.has(c.id));
      if (selected.length === 0) throw new Error("Nessun destinatario selezionato");

      // Get campaign to find which template
      const campaign = campaigns.find(c => c.id === campaignId);
      const templateId = campaign?.description || "promo_standard";
      const template = EMAIL_TEMPLATES.find(t => t.id === templateId) || EMAIL_TEMPLATES[0];

      const trackingBaseUrl = `${SUPABASE_URL}/functions/v1/ricondizionati-track`;

      const recipientRecords = selected.map(c => ({
        campaign_id: campaignId,
        customer_id: c.id,
        customer_email: c.email!,
        customer_name: c.name,
        centro_id: c.centro_id,
      }));

      const { data: insertedRecipients, error: insertError } = await (supabase as any)
        .from("ricondizionati_campaign_recipients")
        .insert(recipientRecords)
        .select("id, tracking_id, customer_email, customer_name");
      if (insertError) throw insertError;

      let sent = 0;
      for (const rec of insertedRecipients) {
        const openPixel = `${trackingBaseUrl}?a=open&t=${rec.tracking_id}`;
        const clickLink = `${trackingBaseUrl}?a=click&t=${rec.tracking_id}`;
        const customerName = rec.customer_name || "Cliente";
        const emailHtml = template.buildHtml(customerName, clickLink, openPixel);

        try {
          await supabase.functions.invoke("send-email-smtp", {
            body: {
              to: rec.customer_email,
              subject: template.subject,
              html: emailHtml,
            },
          });

          await (supabase as any)
            .from("ricondizionati_campaign_recipients")
            .update({ sent_at: new Date().toISOString() })
            .eq("id", rec.id);

          sent++;
        } catch (e) {
          console.error("Failed to send to", rec.customer_email, e);
        }
      }

      await (supabase as any)
        .from("ricondizionati_campaigns")
        .update({ status: "sent", sent_at: new Date().toISOString(), total_sent: sent })
        .eq("id", campaignId);

      return sent;
    },
    onSuccess: (sent) => {
      queryClient.invalidateQueries({ queryKey: ["ricondizionati-campaigns"] });
      toast.success(`Campagna inviata a ${sent} destinatari`);
      setIsSendDialogOpen(false);
      setSelectedCustomers(new Set());
    },
    onError: (e: any) => toast.error(e.message || "Errore nell'invio"),
  });

  const toggleAll = () => {
    if (selectedCustomers.size === customers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(customers.map(c => c.id)));
    }
  };

  const openRate = (c: Campaign) => c.total_sent > 0 ? ((c.total_opened / c.total_sent) * 100).toFixed(1) : "0";
  const clickRate = (c: Campaign) => c.total_sent > 0 ? ((c.total_clicked / c.total_sent) * 100).toFixed(1) : "0";

  const showPreview = (templateId: string) => {
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setPreviewHtml(template.buildHtml("Mario Rossi", "#", "#"));
      setIsPreviewOpen(true);
    }
  };

  const selectedTemplate = EMAIL_TEMPLATES.find(t => t.id === newCampaign.templateId) || EMAIL_TEMPLATES[0];

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3 text-center"><p className="text-2xl font-bold">{campaigns.length}</p><p className="text-xs text-muted-foreground">Campagne</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><p className="text-2xl font-bold">{campaigns.reduce((a, c) => a + c.total_sent, 0)}</p><p className="text-xs text-muted-foreground">Email Inviate</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><p className="text-2xl font-bold">{campaigns.reduce((a, c) => a + c.total_opened, 0)}</p><p className="text-xs text-muted-foreground">Aperture</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><p className="text-2xl font-bold">{campaigns.reduce((a, c) => a + c.total_clicked, 0)}</p><p className="text-xs text-muted-foreground">Click</p></CardContent></Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Nuova Campagna</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crea Campagna Ricondizionati</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Titolo</Label>
                <Input value={newCampaign.title} onChange={e => setNewCampaign(p => ({ ...p, title: e.target.value }))} placeholder="Es: Promo Primavera Ricondizionati" />
              </div>
              <div>
                <Label>Template Email</Label>
                <Select value={newCampaign.templateId} onValueChange={v => setNewCampaign(p => ({ ...p, templateId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMAIL_TEMPLATES.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Oggetto: {selectedTemplate.subject}</p>
              </div>
              <div>
                <Label>Note interne (opzionale)</Label>
                <Textarea value={newCampaign.offer_text} onChange={e => setNewCampaign(p => ({ ...p, offer_text: e.target.value }))} placeholder="Note aggiuntive sulla campagna" rows={2} />
              </div>

              {/* Template Preview Thumbnail */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Anteprima</Label>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => showPreview(newCampaign.templateId)}>
                    <Eye className="h-3 w-3" /> A schermo intero
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden bg-background" style={{ height: 280 }}>
                  <iframe
                    srcDoc={selectedTemplate.buildHtml("Mario Rossi", "#", "#")}
                    className="w-full h-full border-0 pointer-events-none"
                    title="Preview"
                    sandbox=""
                    style={{ transform: "scale(0.55)", transformOrigin: "top left", width: "182%", height: "182%" }}
                  />
                </div>
              </div>

              <Button onClick={() => createMutation.mutate()} disabled={!newCampaign.title || createMutation.isPending} className="w-full">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Crea Campagna
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Campagne</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : campaigns.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nessuna campagna creata</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titolo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-center">Inviate</TableHead>
                  <TableHead className="text-center">Aperture</TableHead>
                  <TableHead className="text-center">Click</TableHead>
                  <TableHead className="text-center">% Open</TableHead>
                  <TableHead className="text-center">% Click</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "sent" ? "default" : "secondary"}>
                        {c.status === "draft" ? "Bozza" : c.status === "sent" ? "Inviata" : c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{c.total_sent}</TableCell>
                    <TableCell className="text-center">{c.total_opened}</TableCell>
                    <TableCell className="text-center">{c.total_clicked}</TableCell>
                    <TableCell className="text-center">{openRate(c)}%</TableCell>
                    <TableCell className="text-center">{clickRate(c)}%</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {c.status === "draft" && (
                          <Button size="sm" variant="default" className="gap-1" onClick={() => { setSendCampaignId(c.id); setIsSendDialogOpen(true); }}>
                            <Send className="h-3 w-3" /> Invia
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="gap-1" onClick={() => {
                          const tpl = EMAIL_TEMPLATES.find(t => t.id === c.description) || EMAIL_TEMPLATES[0];
                          showPreview(tpl.id);
                        }}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => setSelectedCampaign(c)}>
                          <BarChart3 className="h-3 w-3" /> Dettagli
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Template Gallery */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5" /> Template Disponibili</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {EMAIL_TEMPLATES.map(t => (
              <div key={t.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-48 overflow-hidden bg-background">
                  <iframe
                    srcDoc={t.buildHtml("Mario Rossi", "#", "#")}
                    className="w-full h-full border-0 pointer-events-none"
                    title={t.name}
                    sandbox=""
                    style={{ transform: "scale(0.4)", transformOrigin: "top left", width: "250%", height: "250%" }}
                  />
                </div>
                <div className="p-3 border-t">
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{t.subject}</p>
                  <Button size="sm" variant="outline" className="w-full mt-2 gap-1" onClick={() => showPreview(t.id)}>
                    <Eye className="h-3 w-3" /> Anteprima
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Full Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Anteprima Email</DialogTitle>
          </DialogHeader>
          {previewHtml && (
            <div className="border rounded-lg overflow-auto bg-background" style={{ maxHeight: "70vh" }}>
              <iframe
                srcDoc={previewHtml}
                className="w-full border-0"
                title="Email preview"
                sandbox=""
                style={{ minHeight: 600 }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Seleziona Destinatari</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Filtra per Centro</Label>
                <Select value={centroFilter} onValueChange={setCentroFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i Centri</SelectItem>
                    {centri.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={toggleAll} size="sm">
                {selectedCustomers.size === customers.length ? "Deseleziona tutti" : "Seleziona tutti"}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              {selectedCustomers.size} di {customers.length} clienti selezionati
            </p>

            <div className="max-h-60 overflow-y-auto border rounded-lg">
              {customers.map(c => (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-0">
                  <Checkbox
                    checked={selectedCustomers.has(c.id)}
                    onCheckedChange={(checked) => {
                      const next = new Set(selectedCustomers);
                      if (checked) next.add(c.id); else next.delete(c.id);
                      setSelectedCustomers(next);
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                  </div>
                </label>
              ))}
            </div>

            <Button
              className="w-full gap-2"
              disabled={selectedCustomers.size === 0 || sendMutation.isPending}
              onClick={() => sendCampaignId && sendMutation.mutate({ campaignId: sendCampaignId })}
            >
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Invia a {selectedCustomers.size} destinatari
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaign Detail Dialog */}
      <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {selectedCampaign?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-3 bg-muted rounded-lg"><p className="text-xl font-bold">{selectedCampaign.total_sent}</p><p className="text-xs text-muted-foreground">Inviate</p></div>
                <div className="text-center p-3 bg-muted rounded-lg"><p className="text-xl font-bold">{selectedCampaign.total_opened}</p><p className="text-xs text-muted-foreground">Aperture</p></div>
                <div className="text-center p-3 bg-muted rounded-lg"><p className="text-xl font-bold">{selectedCampaign.total_clicked}</p><p className="text-xs text-muted-foreground">Click</p></div>
                <div className="text-center p-3 bg-muted rounded-lg"><p className="text-xl font-bold">{clickRate(selectedCampaign)}%</p><p className="text-xs text-muted-foreground">Conversione</p></div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destinatario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center"><Eye className="h-4 w-4 inline" /></TableHead>
                    <TableHead className="text-center"><MousePointer className="h-4 w-4 inline" /></TableHead>
                    <TableHead>Inviata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.customer_name || "-"}</TableCell>
                      <TableCell className="text-sm">{r.customer_email}</TableCell>
                      <TableCell className="text-center">
                        {r.opened_at ? <Badge variant="default" className="text-xs">{r.open_count}x</Badge> : <Badge variant="secondary" className="text-xs">No</Badge>}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.clicked_at ? <Badge variant="default" className="text-xs">{r.click_count}x</Badge> : <Badge variant="secondary" className="text-xs">No</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.sent_at ? format(new Date(r.sent_at), "dd/MM HH:mm", { locale: it }) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
