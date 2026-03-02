import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Plus, Send, Eye, MousePointer, Users, BarChart3, Loader2, Mail } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

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
  const [newCampaign, setNewCampaign] = useState({ title: "", description: "", offer_text: "" });
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
          description: newCampaign.description,
          offer_text: newCampaign.offer_text || `Scopri i nostri ricondizionati certificati DEKA con 24 mesi di garanzia! Usa il codice EVLZBANT per ottenere 10€ di sconto immediato.`,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ricondizionati-campaigns"] });
      toast.success("Campagna creata");
      setIsCreateOpen(false);
      setNewCampaign({ title: "", description: "", offer_text: "" });
    },
    onError: () => toast.error("Errore nella creazione"),
  });

  // Send campaign
  const sendMutation = useMutation({
    mutationFn: async ({ campaignId }: { campaignId: string }) => {
      const selected = customers.filter(c => selectedCustomers.has(c.id));
      if (selected.length === 0) throw new Error("Nessun destinatario selezionato");

      const trackingBaseUrl = `${SUPABASE_URL}/functions/v1/ricondizionati-track`;

      // Create recipients
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

      // Send emails one by one
      let sent = 0;
      for (const rec of insertedRecipients) {
        const openPixel = `${trackingBaseUrl}?a=open&t=${rec.tracking_id}`;
        const clickLink = `${trackingBaseUrl}?a=click&t=${rec.tracking_id}`;
        const customerName = rec.customer_name || "Cliente";

        const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f4f4f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;"><tr><td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:32px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:24px;">🔄 Ricondizionati Certificati</h1><p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Qualità garantita, prezzo imbattibile</p></td></tr><tr><td style="padding:32px;"><h2 style="color:#18181b;margin:0 0 16px;font-size:20px;">Ciao ${customerName}!</h2><p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 24px;">Abbiamo una promozione esclusiva per te sui nostri dispositivi <strong>ricondizionati certificati DEKA</strong> con <strong>24 mesi di garanzia</strong>!</p><div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:2px solid #10b981;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center;"><p style="color:#065f46;margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:1px;">IL TUO CODICE SCONTO</p><p style="color:#047857;margin:0 0 8px;font-size:40px;font-weight:700;font-family:monospace;letter-spacing:4px;">EVLZBANT</p><p style="color:#059669;margin:0;font-size:18px;font-weight:600;">-10€ sul tuo ordine</p></div><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="${clickLink}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:600;font-size:16px;">Scopri le Offerte →</a></td></tr></table><p style="color:#71717a;font-size:13px;margin:24px 0 0;text-align:center;">Il coupon verrà copiato automaticamente quando clicchi.</p></td></tr><tr><td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e4e4e7;"><p style="color:#a1a1aa;margin:0;font-size:11px;">Ricevi questa email perché sei cliente di un nostro centro partner.</p></td></tr></table></td></tr></table><img src="${openPixel}" width="1" height="1" style="display:none;" alt="" /></body></html>`;

        try {
          await supabase.functions.invoke("send-email-smtp", {
            body: {
              to: rec.customer_email,
              subject: `🎁 10€ di sconto sui Ricondizionati Certificati!`,
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

      // Update campaign status
      await (supabase as any)
        .from("ricondizionati_campaigns")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          total_sent: sent,
        })
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

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{campaigns.length}</p>
            <p className="text-xs text-muted-foreground">Campagne</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{campaigns.reduce((a, c) => a + c.total_sent, 0)}</p>
            <p className="text-xs text-muted-foreground">Email Inviate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{campaigns.reduce((a, c) => a + c.total_opened, 0)}</p>
            <p className="text-xs text-muted-foreground">Aperture</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{campaigns.reduce((a, c) => a + c.total_clicked, 0)}</p>
            <p className="text-xs text-muted-foreground">Click</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Nuova Campagna</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crea Campagna Ricondizionati</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Titolo</Label>
                <Input value={newCampaign.title} onChange={e => setNewCampaign(p => ({ ...p, title: e.target.value }))} placeholder="Es: Promo Primavera Ricondizionati" />
              </div>
              <div>
                <Label>Descrizione interna</Label>
                <Input value={newCampaign.description} onChange={e => setNewCampaign(p => ({ ...p, description: e.target.value }))} placeholder="Note interne sulla campagna" />
              </div>
              <div>
                <Label>Testo offerta (email)</Label>
                <Textarea value={newCampaign.offer_text} onChange={e => setNewCampaign(p => ({ ...p, offer_text: e.target.value }))} placeholder="Lascia vuoto per il testo predefinito" rows={3} />
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
        <CardHeader>
          <CardTitle className="text-lg">Campagne</CardTitle>
        </CardHeader>
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
                          <Button size="sm" variant="default" className="gap-1" onClick={() => {
                            setSendCampaignId(c.id);
                            setIsSendDialogOpen(true);
                          }}>
                            <Send className="h-3 w-3" /> Invia
                          </Button>
                        )}
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
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-xl font-bold">{selectedCampaign.total_sent}</p>
                  <p className="text-xs text-muted-foreground">Inviate</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-xl font-bold">{selectedCampaign.total_opened}</p>
                  <p className="text-xs text-muted-foreground">Aperture</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-xl font-bold">{selectedCampaign.total_clicked}</p>
                  <p className="text-xs text-muted-foreground">Click</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-xl font-bold">{clickRate(selectedCampaign)}%</p>
                  <p className="text-xs text-muted-foreground">Conversione</p>
                </div>
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
                        {r.opened_at ? (
                          <Badge variant="default" className="text-xs">{r.open_count}x</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.clicked_at ? (
                          <Badge variant="default" className="text-xs">{r.click_count}x</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">No</Badge>
                        )}
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
