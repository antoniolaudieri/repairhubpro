import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { CentroLayout } from "@/layouts/CentroLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gavel, Plus, Play, Square, Eye, Users, Package,
  Trash2, ChevronRight, Radio, Trophy, ArrowRight, Timer, Copy, ExternalLink
} from "lucide-react";
import { AuctionBroadcast } from "@/components/centro/AuctionBroadcast";

interface Auction {
  id: string;
  title: string;
  description: string | null;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  viewer_count: number;
  created_at: string;
  centro_id: string;
  stream_url: string | null;
}

interface AuctionItem {
  id: string;
  auction_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  starting_price: number;
  current_price: number;
  buy_now_price: number | null;
  status: string;
  winner_name: string | null;
  winner_email: string | null;
  bid_count: number;
  duration_seconds: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

interface AuctionBid {
  id: string;
  item_id: string;
  bidder_name: string;
  amount: number;
  created_at: string;
}

export default function CentroAste() {
  const { user } = useAuth();
  const [centroId, setCentroId] = useState<string | null>(null);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newScheduledAt, setNewScheduledAt] = useState("");
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [auctionItems, setAuctionItems] = useState<AuctionItem[]>([]);
  const [liveBids, setLiveBids] = useState<AuctionBid[]>([]);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [itemTitle, setItemTitle] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemStartingPrice, setItemStartingPrice] = useState("");
  const [itemBuyNowPrice, setItemBuyNowPrice] = useState("");
  const [itemReservePrice, setItemReservePrice] = useState("");
  const [itemDuration, setItemDuration] = useState("60");
  const [autoCloseTriggered, setAutoCloseTriggered] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchCentroId();
  }, [user]);

  useEffect(() => {
    if (centroId) fetchAuctions();
  }, [centroId]);

  // Realtime for selected auction - bids, items, AND auction status
  useEffect(() => {
    if (!selectedAuction) return;
    fetchItems(selectedAuction.id);

    const channel = supabase
      .channel(`centro-auction-${selectedAuction.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auction_bids", filter: `auction_id=eq.${selectedAuction.id}` },
        (payload) => {
          const bid = payload.new as AuctionBid;
          setLiveBids(prev => {
            if (prev.some(b => b.id === bid.id)) return prev;
            return [bid, ...prev];
          });
          setAuctionItems(prev => prev.map(item =>
            item.id === bid.item_id
              ? { ...item, current_price: bid.amount, bid_count: item.bid_count + 1 }
              : item
          ));
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_items", filter: `auction_id=eq.${selectedAuction.id}` },
        () => fetchItems(selectedAuction.id)
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_auctions", filter: `id=eq.${selectedAuction.id}` },
        (payload) => {
          const updated = payload.new as Auction;
          setSelectedAuction(updated);
          setAuctions(prev => prev.map(a => a.id === updated.id ? updated : a));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedAuction?.id]);

  const fetchCentroId = async () => {
    if (!user) return;
    const { data } = await supabase.from("centri_assistenza").select("id").eq("owner_user_id", user.id).single();
    if (data) setCentroId(data.id);
  };

  const fetchAuctions = async () => {
    if (!centroId) return;
    setLoading(true);
    const { data } = await supabase.from("live_auctions").select("*").eq("centro_id", centroId).order("created_at", { ascending: false });
    setAuctions((data as Auction[]) || []);
    setLoading(false);
  };

  const fetchItems = async (auctionId: string) => {
    const [{ data: items }, { data: bids }] = await Promise.all([
      supabase.from("auction_items").select("*").eq("auction_id", auctionId).order("created_at", { ascending: true }),
      supabase.from("auction_bids").select("*").eq("auction_id", auctionId).order("created_at", { ascending: false }).limit(50),
    ]);
    setAuctionItems((items as AuctionItem[]) || []);
    setLiveBids((bids as AuctionBid[]) || []);
  };

  const createAuction = async () => {
    if (!centroId || !newTitle.trim()) return;
    const { error } = await supabase.from("live_auctions").insert({
      centro_id: centroId, title: newTitle.trim(),
      description: newDescription.trim() || null,
      scheduled_at: newScheduledAt || null, status: "scheduled" as any,
    });
    if (error) { toast({ title: "Errore", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Asta creata!" });
    setCreateOpen(false); setNewTitle(""); setNewDescription(""); setNewScheduledAt("");
    fetchAuctions();
  };

  const goLive = async (auction: Auction) => {
    const { error } = await supabase.from("live_auctions").update({ status: "live" as any, started_at: new Date().toISOString() }).eq("id", auction.id);
    if (error) { toast({ title: "Errore", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Sei Live! 🔴" });
    fetchAuctions();
    if (selectedAuction?.id === auction.id) setSelectedAuction({ ...auction, status: "live", started_at: new Date().toISOString() });
  };

  const endAuction = async (auction: Auction) => {
    const { error } = await supabase.from("live_auctions").update({ status: "ended" as any, ended_at: new Date().toISOString() }).eq("id", auction.id);
    if (error) { toast({ title: "Errore", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Asta terminata" });
    fetchAuctions();
    if (selectedAuction?.id === auction.id) setSelectedAuction({ ...auction, status: "ended" });
  };

  const addItem = async () => {
    if (!selectedAuction || !centroId || !itemTitle.trim()) return;
    const startPrice = parseFloat(itemStartingPrice) || 0;
    const { error } = await supabase.from("auction_items").insert({
      auction_id: selectedAuction.id, centro_id: centroId, title: itemTitle.trim(),
      description: itemDescription.trim() || null, starting_price: startPrice, current_price: startPrice,
      buy_now_price: itemBuyNowPrice ? parseFloat(itemBuyNowPrice) : null,
      reserve_price: itemReservePrice ? parseFloat(itemReservePrice) : null,
      duration_seconds: parseInt(itemDuration) || 60, status: "pending" as any,
    });
    if (error) { toast({ title: "Errore", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Prodotto aggiunto!" });
    setAddItemOpen(false);
    setItemTitle(""); setItemDescription(""); setItemStartingPrice(""); setItemBuyNowPrice(""); setItemReservePrice(""); setItemDuration("60");
    fetchItems(selectedAuction.id);
  };

  const activateItem = async (item: AuctionItem) => {
    await supabase.from("auction_items").update({ status: "unsold" as any, ended_at: new Date().toISOString() }).eq("auction_id", item.auction_id).eq("status", "active" as any);
    const { error } = await supabase.from("auction_items").update({ status: "active" as any, started_at: new Date().toISOString() }).eq("id", item.id);
    if (error) { toast({ title: "Errore", description: error.message, variant: "destructive" }); return; }
    fetchItems(item.auction_id);
  };

  const closeItem = async (item: AuctionItem, sold: boolean) => {
    const reservePrice = (item as any).reserve_price as number | null;
    const reserveMet = !reservePrice || item.current_price >= reservePrice;
    const finalSold = sold && reserveMet && item.bid_count > 0;
    
    const update: any = { status: finalSold ? "sold" : "unsold", ended_at: new Date().toISOString() };
    if (finalSold) {
      const { data: topBid } = await supabase.from("auction_bids").select("*").eq("item_id", item.id).order("amount", { ascending: false }).limit(1).single();
      if (topBid) { update.winner_name = topBid.bidder_name; update.winner_email = topBid.bidder_email; update.winner_user_id = topBid.user_id; }
    }
    await supabase.from("auction_items").update(update).eq("id", item.id);
    
    if (finalSold) {
      toast({ title: `🏆 Venduto a ${update.winner_name || "N/A"}!`, description: `Prezzo finale: €${item.current_price}` });
    } else if (sold && !reserveMet) {
      toast({ title: "Riserva non raggiunta", description: `Il prezzo €${item.current_price} non ha raggiunto la riserva.`, variant: "destructive" });
    }
    fetchItems(item.auction_id);
  };

  // Auto-close when countdown reaches 0
  useEffect(() => {
    if (!activeItem?.started_at) return;
    const endTime = new Date(activeItem.started_at).getTime() + activeItem.duration_seconds * 1000;
    
    const tick = () => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      if (remaining === 0 && autoCloseTriggered !== activeItem.id) {
        setAutoCloseTriggered(activeItem.id);
        closeItem(activeItem, true);
      }
    };
    
    const interval = setInterval(tick, 1000);
    tick();
    return () => clearInterval(interval);
  }, [activeItem?.id, activeItem?.started_at, activeItem?.duration_seconds, autoCloseTriggered]);


  const deleteItem = async (itemId: string) => {
    await supabase.from("auction_items").delete().eq("id", itemId);
    if (selectedAuction) fetchItems(selectedAuction.id);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      scheduled: { label: "Programmata", className: "bg-muted text-muted-foreground" },
      live: { label: "🔴 LIVE", className: "bg-destructive text-destructive-foreground animate-pulse" },
      ended: { label: "Terminata", className: "bg-secondary text-secondary-foreground" },
      cancelled: { label: "Annullata", className: "bg-muted text-muted-foreground" },
    };
    const s = map[status] || map.scheduled;
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  const itemStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      pending: { label: "In attesa", className: "bg-muted text-muted-foreground" },
      active: { label: "🔴 In asta", className: "bg-destructive text-destructive-foreground animate-pulse" },
      sold: { label: "Venduto", className: "bg-primary text-primary-foreground" },
      unsold: { label: "Non venduto", className: "bg-secondary text-secondary-foreground" },
    };
    const s = map[status] || map.pending;
    return <Badge className={`${s.className} text-[10px]`}>{s.label}</Badge>;
  };

  const publicUrl = selectedAuction ? `${window.location.origin}/aste/${selectedAuction.id}` : "";
  const activeItem = auctionItems.find(i => i.status === "active");

  return (
    <CentroLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Gavel className="h-6 w-6 text-primary flex-shrink-0" /> Aste Live
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Vendi in diretta, stile Whatnot</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 flex-shrink-0"><Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nuova</span> Asta</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md">
              <DialogHeader><DialogTitle>Crea Nuova Asta</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Titolo *</Label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Es. Asta iPhone Ricondizionati" /></div>
                <div><Label>Descrizione</Label><Textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Descrivi cosa venderai..." /></div>
                <div><Label>Programmata per</Label><Input type="datetime-local" value={newScheduledAt} onChange={e => setNewScheduledAt(e.target.value)} /></div>
                <Button onClick={createAuction} className="w-full">Crea Asta</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!selectedAuction ? (
          /* ===== AUCTION LIST ===== */
          <div className="grid gap-3">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Caricamento...</div>
            ) : auctions.length === 0 ? (
              <Card className="border-dashed"><CardContent className="py-10 text-center"><Gavel className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-sm text-muted-foreground">Nessuna asta. Crea la tua prima asta live!</p></CardContent></Card>
            ) : (
              auctions.map((auction, i) => (
                <motion.div key={auction.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99]" onClick={() => setSelectedAuction(auction)}>
                    <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {auction.status === "live" ? <Radio className="h-5 w-5 text-destructive animate-pulse" /> : <Gavel className="h-5 w-5 text-primary" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground text-sm truncate">{auction.title}</h3>
                            {statusBadge(auction.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {auction.scheduled_at ? new Date(auction.scheduled_at).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : new Date(auction.created_at).toLocaleDateString("it-IT")}
                            {auction.status === "live" && ` · ${auction.viewer_count} spettatori`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {auction.status === "scheduled" && (
                          <Button size="sm" className="gap-1 h-8 text-xs" onClick={e => { e.stopPropagation(); goLive(auction); }}>
                            <Play className="h-3.5 w-3.5" /> Live
                          </Button>
                        )}
                        {auction.status === "live" && (
                          <Button size="sm" variant="destructive" className="gap-1 h-8 text-xs" onClick={e => { e.stopPropagation(); endAuction(auction); }}>
                            <Square className="h-3.5 w-3.5" /> Stop
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        ) : (
          /* ===== AUCTION DETAIL / LIVE CONSOLE ===== */
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSelectedAuction(null); setAuctionItems([]); setLiveBids([]); }}>
                ← Indietro
              </Button>
              <h2 className="text-base sm:text-lg font-bold text-foreground truncate">{selectedAuction.title}</h2>
              {statusBadge(selectedAuction.status)}
              {selectedAuction.status === "live" && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                  <Eye className="h-3.5 w-3.5" />
                  <motion.span key={selectedAuction.viewer_count} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="font-bold text-foreground">
                    {selectedAuction.viewer_count}
                  </motion.span>
                </div>
              )}
            </div>

            {/* Live controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedAuction.status === "scheduled" && (
                <Button size="sm" className="gap-1.5" onClick={() => goLive(selectedAuction)}>
                  <Play className="h-4 w-4" /> Vai Live
                </Button>
              )}
              {selectedAuction.status === "live" && (
                <>
                  <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => endAuction(selectedAuction)}>
                    <Square className="h-4 w-4" /> Termina
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { navigator.clipboard.writeText(publicUrl); toast({ title: "Link copiato!" }); }}>
                    <Copy className="h-3.5 w-3.5" /> Link
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <a href={publicUrl} target="_blank" rel="noopener"><ExternalLink className="h-3.5 w-3.5" /></a>
                  </Button>
                </>
              )}
              <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 ml-auto" disabled={selectedAuction.status === "ended"}>
                    <Plus className="h-4 w-4" /> Prodotto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-md">
                  <DialogHeader><DialogTitle>Aggiungi Prodotto</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Nome *</Label><Input value={itemTitle} onChange={e => setItemTitle(e.target.value)} placeholder="Es. iPhone 13 Pro 128GB" /></div>
                    <div><Label>Descrizione</Label><Textarea value={itemDescription} onChange={e => setItemDescription(e.target.value)} placeholder="Condizioni, accessori..." rows={2} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">Partenza (€)</Label><Input type="number" value={itemStartingPrice} onChange={e => setItemStartingPrice(e.target.value)} placeholder="1" /></div>
                      <div><Label className="text-xs">Compra Ora (€)</Label><Input type="number" value={itemBuyNowPrice} onChange={e => setItemBuyNowPrice(e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">Riserva (€)</Label><Input type="number" value={itemReservePrice} onChange={e => setItemReservePrice(e.target.value)} placeholder="Opzionale" /></div>
                      <div><Label className="text-xs">Durata (sec)</Label><Input type="number" value={itemDuration} onChange={e => setItemDuration(e.target.value)} /></div>
                    </div>
                    <Button onClick={addItem} className="w-full">Aggiungi</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Broadcast Console */}
            {selectedAuction.status === "live" && (
              <AuctionBroadcast
                auctionId={selectedAuction.id}
                viewerCount={selectedAuction.viewer_count}
                activeItem={activeItem || null}
                streamUrl={selectedAuction.stream_url}
                onStreamUrlChange={(url) => setSelectedAuction(prev => prev ? { ...prev, stream_url: url } : null)}
              />
            )}

            {/* Items + Bids - responsive grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Items */}
              <div className="lg:col-span-2 space-y-2">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  <Package className="h-4 w-4" /> Prodotti ({auctionItems.length})
                </h3>
                {auctionItems.length === 0 ? (
                  <Card className="border-dashed"><CardContent className="py-6 text-center text-sm text-muted-foreground">Nessun prodotto. Aggiungi il primo!</CardContent></Card>
                ) : (
                  auctionItems.map(item => (
                    <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Card className={item.status === "active" ? "border-destructive shadow-lg ring-1 ring-destructive/20" : ""}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <h4 className="font-semibold text-foreground text-sm truncate">{item.title}</h4>
                                {itemStatusBadge(item.status)}
                              </div>
                              {item.description && <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">{item.description}</p>}
                              <div className="flex items-center gap-3 text-xs flex-wrap">
                                <span className="text-muted-foreground">Da €{item.starting_price}</span>
                                <span className="text-primary font-bold text-sm">€{item.current_price}</span>
                                {item.buy_now_price && <span className="text-muted-foreground">CN €{item.buy_now_price}</span>}
                                {(item as any).reserve_price && (
                                  <span className={`text-xs font-medium ${item.current_price >= (item as any).reserve_price ? "text-chart-2" : "text-destructive"}`}>
                                    R €{(item as any).reserve_price} {item.current_price >= (item as any).reserve_price ? "✓" : "✗"}
                                  </span>
                                )}
                                <span className="text-muted-foreground flex items-center gap-0.5"><Users className="h-3 w-3" />{item.bid_count}</span>
                                <span className="text-muted-foreground flex items-center gap-0.5"><Timer className="h-3 w-3" />{item.duration_seconds}s</span>
                              </div>
                              {item.status === "sold" && item.winner_name && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-primary">
                                  <Trophy className="h-3.5 w-3.5" /> <strong>{item.winner_name}</strong> {item.winner_email && <span className="text-muted-foreground">({item.winner_email})</span>}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 flex-shrink-0">
                              {selectedAuction.status === "live" && item.status === "pending" && (
                                <Button size="sm" className="gap-1 h-7 text-xs" onClick={() => activateItem(item)}>
                                  <ArrowRight className="h-3 w-3" /> Avvia
                                </Button>
                              )}
                              {selectedAuction.status === "live" && item.status === "active" && (
                                <>
                                  <Button size="sm" className="gap-1 h-7 text-xs" onClick={() => closeItem(item, true)}>
                                    <Trophy className="h-3 w-3" /> Aggiudicato
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => closeItem(item, false)}>Skip</Button>
                                </>
                              )}
                              {item.status === "pending" && (
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteItem(item.id)}>
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Live bid feed */}
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  <Gavel className="h-4 w-4" /> Offerte Live
                  {activeItem && (
                    <Badge variant="outline" className="ml-auto text-[10px]">{activeItem.bid_count} offerte</Badge>
                  )}
                </h3>
                <Card className="h-[300px] sm:h-[400px] lg:h-[500px] overflow-hidden">
                  <CardContent className="p-0 h-full overflow-y-auto">
                    {liveBids.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Nessuna offerta ancora</div>
                    ) : (
                      <div className="divide-y divide-border/50">
                        <AnimatePresence>
                          {liveBids.map((bid, i) => (
                            <motion.div
                              key={bid.id}
                              initial={{ opacity: 0, x: 15, backgroundColor: "hsl(var(--primary) / 0.1)" }}
                              animate={{ opacity: 1, x: 0, backgroundColor: "transparent" }}
                              transition={{ duration: 0.3 }}
                              className="px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6 flex-shrink-0">
                                  <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                                    {bid.bidder_name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-xs text-foreground">{bid.bidder_name}</span>
                                  <span className="text-[10px] text-muted-foreground ml-1.5">
                                    {new Date(bid.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                  </span>
                                </div>
                                <span className={`font-bold text-sm tabular-nums ${i === 0 ? "text-primary" : "text-foreground"}`}>€{bid.amount}</span>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </CentroLayout>
  );
}
