import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Mail, Eye, MousePointer, Copy, UserX, Users, Filter } from "lucide-react";

type FilterType = "all" | "opened" | "not_opened" | "clicked" | "copied" | "unsubscribed";

interface CampaignDetailDialogProps {
  campaign: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CampaignDetailDialog({ campaign, open, onOpenChange }: CampaignDetailDialogProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [recipients, setRecipients] = useState<any[]>([]);

  const { data: initialRecipients = [] } = useQuery({
    queryKey: ["campaign-recipients", campaign?.id],
    queryFn: async () => {
      if (!campaign?.id) return [];
      const { data, error } = await supabase
        .from("ricondizionati_campaign_recipients")
        .select("*")
        .eq("campaign_id", campaign.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!campaign?.id && open,
  });

  // Set initial data
  useEffect(() => {
    if (initialRecipients.length > 0) {
      setRecipients(initialRecipients);
    }
  }, [initialRecipients]);

  // Realtime subscription
  useEffect(() => {
    if (!campaign?.id || !open) return;

    const channel = supabase
      .channel(`campaign-${campaign.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ricondizionati_campaign_recipients",
          filter: `campaign_id=eq.${campaign.id}`,
        },
        (payload) => {
          setRecipients((prev) =>
            prev.map((r) => (r.id === payload.new.id ? { ...r, ...payload.new } : r))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaign?.id, open]);

  // Stats
  const stats = useMemo(() => {
    const total = recipients.length;
    const opened = recipients.filter((r) => r.opened_at).length;
    const clicked = recipients.filter((r) => r.clicked_at).length;
    const copied = recipients.filter((r) => r.copied_coupon_at).length;
    const unsub = recipients.filter((r) => r.unsubscribed_at).length;
    return { total, opened, clicked, copied, unsub };
  }, [recipients]);

  const pct = (n: number) => (stats.total > 0 ? Math.round((n / stats.total) * 100) : 0);

  // Filter
  const filtered = useMemo(() => {
    switch (filter) {
      case "opened": return recipients.filter((r) => r.opened_at);
      case "not_opened": return recipients.filter((r) => !r.opened_at);
      case "clicked": return recipients.filter((r) => r.clicked_at);
      case "copied": return recipients.filter((r) => r.copied_coupon_at);
      case "unsubscribed": return recipients.filter((r) => r.unsubscribed_at);
      default: return recipients;
    }
  }, [recipients, filter]);

  const getStatusBadge = (r: any) => {
    if (r.unsubscribed_at) return <Badge variant="destructive" className="text-[10px]">Disiscritto</Badge>;
    if (r.copied_coupon_at) return <Badge className="bg-emerald-500 text-[10px]">Coupon Copiato</Badge>;
    if (r.clicked_at) return <Badge className="bg-blue-500 text-[10px]">Cliccata</Badge>;
    if (r.opened_at) return <Badge className="bg-amber-500 text-[10px]">Aperta</Badge>;
    return <Badge variant="secondary" className="text-[10px]">Inviata</Badge>;
  };

  const fmtDate = (d: string | null) =>
    d ? format(new Date(d), "dd/MM HH:mm", { locale: it }) : "—";

  const filterButtons: { key: FilterType; label: string; count: number; icon: any }[] = [
    { key: "all", label: "Tutti", count: stats.total, icon: Users },
    { key: "opened", label: "Aperti", count: stats.opened, icon: Eye },
    { key: "not_opened", label: "Non aperti", count: stats.total - stats.opened, icon: Mail },
    { key: "clicked", label: "Click", count: stats.clicked, icon: MousePointer },
    { key: "copied", label: "Copiati", count: stats.copied, icon: Copy },
    { key: "unsubscribed", label: "Disiscritti", count: stats.unsub, icon: UserX },
  ];

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📊 {campaign.title}
          </DialogTitle>
        </DialogHeader>

        {/* Funnel */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Inviati", value: stats.total, color: "bg-muted-foreground" },
            { label: "Aperti", value: stats.opened, color: "bg-amber-500" },
            { label: "Click", value: stats.clicked, color: "bg-blue-500" },
            { label: "Copiati", value: stats.copied, color: "bg-emerald-500" },
            { label: "Disiscritti", value: stats.unsub, color: "bg-destructive" },
          ].map((step, i) => (
            <div key={i} className="text-center space-y-1">
              <p className="text-2xl font-bold">{step.value}</p>
              <Progress
                value={i === 0 ? 100 : pct(step.value)}
                className="h-2"
                indicatorClassName={step.color}
              />
              <p className="text-xs text-muted-foreground">
                {step.label} {i > 0 && `(${pct(step.value)}%)`}
              </p>
            </div>
          ))}
        </div>

        {/* Conversion arrows */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-1">
          <span>Tasso apertura: <strong className="text-foreground">{pct(stats.opened)}%</strong></span>
          <span>→</span>
          <span>CTR: <strong className="text-foreground">{stats.opened > 0 ? Math.round((stats.clicked / stats.opened) * 100) : 0}%</strong></span>
          <span>→</span>
          <span>Conversione coupon: <strong className="text-foreground">{stats.clicked > 0 ? Math.round((stats.copied / stats.clicked) * 100) : 0}%</strong></span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {filterButtons.map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              className="gap-1 text-xs"
              onClick={() => setFilter(f.key)}
            >
              <f.icon className="h-3 w-3" />
              {f.label} ({f.count})
            </Button>
          ))}
        </div>

        {/* Recipients table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Stato</TableHead>
                <TableHead className="text-center">Aperta</TableHead>
                <TableHead className="text-center">Click</TableHead>
                <TableHead className="text-center">Copiato</TableHead>
                <TableHead className="text-center">Disiscritto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nessun destinatario per questo filtro
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-sm">{r.customer_name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.customer_email}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(r)}</TableCell>
                    <TableCell className="text-center text-xs">
                      {r.opened_at ? (
                        <span title={`${r.open_count || 1}x`}>
                          {fmtDate(r.opened_at)}
                          {(r.open_count || 0) > 1 && <span className="text-muted-foreground ml-1">({r.open_count}x)</span>}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {r.clicked_at ? (
                        <span>
                          {fmtDate(r.clicked_at)}
                          {(r.click_count || 0) > 1 && <span className="text-muted-foreground ml-1">({r.click_count}x)</span>}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {r.copied_coupon_at ? (
                        <span>
                          {fmtDate(r.copied_coupon_at)}
                          {(r.copy_count || 0) > 1 && <span className="text-muted-foreground ml-1">({r.copy_count}x)</span>}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {r.unsubscribed_at ? fmtDate(r.unsubscribed_at) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          🔴 Live — i dati si aggiornano in tempo reale
        </p>
      </DialogContent>
    </Dialog>
  );
}
