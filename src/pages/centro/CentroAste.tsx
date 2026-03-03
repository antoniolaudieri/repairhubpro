import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { CentroLayout } from "@/layouts/CentroLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gavel, Plus, Play, Square, Eye, Clock, Users, Package,
  Trash2, ChevronRight, Radio, Trophy, ArrowRight, Timer
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
  const [itemDuration, setItemDuration] = useState("60");

  useEffect(() => {
    fetchCentroId();
  }, [user]);

  useEffect(() => {
    if (centroId) fetchAuctions();
  }, [centroId]);

  useEffect(() => {
    if (!selectedAuction) return;
    fetchItems(selectedAuction.id);

    // Realtime bids
    const channel = supabase
      .channel(`auction-bids-${selectedAuction.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auction_bids", filter: `auction_id=eq.${selectedAuction.id}` },
        (payload) => {
          const bid = payload.new as AuctionBid;
          setLiveBids(prev => [bid, ...prev]);
          // Update item current_price locally
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
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedAuction?.id]);

  const fetchCentroId = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("centri_assistenza")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();
    if (data) setCentroId(data.id);
  };

  const fetchAuctions = async () => {
    if (!centroId) return;
    setLoading(true);
    const { data } = await supabase
      .from("live_auctions")
      .select("*")
      .eq("centro_id", centroId)
      .order("created_at", { ascending: false });
    setAuctions((data as Auction[]) || []);
    setLoading(false);
  };

  const fetchItems = async (auctionId: string) => {
    const { data } = await supabase
      .from("auction_items")
      .select("*")
      .eq("auction_id", auctionId)
      .order("created_at", { ascending: true });
    setAuctionItems((data as AuctionItem[]) || []);

    const { data: bids } = await supabase
      .from("auction_bids")
      .select("*")
      .eq("auction_id", auctionId)
      .order("created_at", { ascending: false })
      .limit(50);
    setLiveBids((bids as AuctionBid[]) || []);
  };

  const createAuction = async () => {
    if (!centroId || !newTitle.trim()) return;
    const { error } = await supabase.from("live_auctions").insert({
      centro_id: centroId,
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      scheduled_at: newScheduledAt || null,
      status: "scheduled" as any,
    });
    if (error) { toast({ title: "Errore", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Asta creata!" });
    setCreateOpen(false);
    setNewTitle(""); setNewDescription(""); setNewScheduledAt("");
    fetchAuctions();
  };

  const goLive = async (auction: Auction) => {
    const { error } = await supabase
      .from("live_auctions")
      .update({ status: "live" as any, started_at: new Date().toISOString() })
      .eq("id", auction.id);
    if (error) { toast({ title: "Errore", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Sei Live! 🔴" });
    fetchAuctions();
    if (selectedAuction?.id === auction.id) setSelectedAuction({ ...auction, status: "live", started_at: new Date().toISOString() });
  };

  const endAuction = async (auction: Auction) => {
    const { error } = await supabase
      .from("live_auctions")
      .update({ status: "ended" as any, ended_at: new Date().toISOString() })
      .eq("id", auction.id);
    if (error) { toast({ title: "Errore", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Asta terminata" });
    fetchAuctions();
    if (selectedAuction?.id === auction.id) setSelectedAuction({ ...auction, status: "ended" });
  };

  const addItem = async () => {
    if (!selectedAuction || !centroId || !itemTitle.trim()) return;
    const startPrice = parseFloat(itemStartingPrice) || 0;
    const { error } = await supabase.from("auction_items").insert({
      auction_id: selectedAuction.id,
      centro_id: centroId,
      title: itemTitle.trim(),
      description: itemDescription.trim() || null,
      starting_price: startPrice,
      current_price: startPrice,
      buy_now_price: itemBuyNowPrice ? parseFloat(itemBuyNowPrice) : null,
      duration_seconds: parseInt(itemDuration) || 60,
      status: "pending" as any,
    });
    if (error) { toast({ title: "Errore", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Prodotto aggiunto!" });
    setAddItemOpen(false);
    setItemTitle(""); setItemDescription(""); setItemStartingPrice(""); setItemBuyNowPrice(""); setItemDuration("60");
    fetchItems(selectedAuction.id);
  };

  const activateItem = async (item: AuctionItem) => {
    // Deactivate all other active items first
    await supabase
      .from("auction_items")
      .update({ status: "unsold" as any, ended_at: new Date().toISOString() })
      .eq("auction_id", item.auction_id)
      .eq("status", "active" as any);

    const { error } = await supabase
      .from("auction_items")
      .update({ status: "active" as any, started_at: new Date().toISOString() })
      .eq("id", item.id);
    if (error) { toast({ title: "Errore", description: error.message, variant: "destructive" }); return; }
    fetchItems(item.auction_id);
  };

  const closeItem = async (item: AuctionItem, sold: boolean) => {
    const update: any = {
      status: sold ? "sold" : "unsold",
      ended_at: new Date().toISOString(),
    };
    // If sold, find the highest bidder
    if (sold && item.bid_count > 0) {
      const { data: topBid } = await supabase
        .from("auction_bids")
        .select("*")
        .eq("item_id", item.id)
        .order("amount", { ascending: false })
        .limit(1)
        .single();
      if (topBid) {
        update.winner_name = topBid.bidder_name;
        update.winner_email = topBid.bidder_email;
        update.winner_user_id = topBid.user_id;
      }
    }
    await supabase.from("auction_items").update(update).eq("id", item.id);
    fetchItems(item.auction_id);
  };

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
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  const publicUrl = selectedAuction ? `${window.location.origin}/aste/${selectedAuction.id}` : "";

  return (
    <CentroLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Gavel className="h-8 w-8 text-primary" />
              Aste Live
            </h1>
            <p className="text-muted-foreground mt-1">Vendi i tuoi prodotti in diretta, stile Whatnot</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Nuova Asta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Crea Nuova Asta</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Titolo *</Label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Es. Asta iPhone Ricondizionati" /></div>
                <div><Label>Descrizione</Label><Textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Descrivi cosa venderai..." /></div>
                <div><Label>Programmata per</Label><Input type="datetime-local" value={newScheduledAt} onChange={e => setNewScheduledAt(e.target.value)} /></div>
                <Button onClick={createAuction} className="w-full">Crea Asta</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!selectedAuction ? (
          // Auction list view
          <div className="grid gap-4">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
            ) : auctions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Gavel className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground">Nessuna asta creata. Crea la tua prima asta live!</p>
                </CardContent>
              </Card>
            ) : (
              auctions.map((auction, i) => (
                <motion.div key={auction.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedAuction(auction)}>
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          {auction.status === "live" ? <Radio className="h-6 w-6 text-destructive animate-pulse" /> : <Gavel className="h-6 w-6 text-primary" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{auction.title}</h3>
                            {statusBadge(auction.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {auction.scheduled_at ? `Programmata: ${new Date(auction.scheduled_at).toLocaleString("it-IT")}` : `Creata: ${new Date(auction.created_at).toLocaleString("it-IT")}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {auction.status === "scheduled" && (
                          <Button size="sm" variant="default" className="gap-1" onClick={e => { e.stopPropagation(); goLive(auction); }}>
                            <Play className="h-4 w-4" /> Vai Live
                          </Button>
                        )}
                        {auction.status === "live" && (
                          <Button size="sm" variant="destructive" className="gap-1" onClick={e => { e.stopPropagation(); endAuction(auction); }}>
                            <Square className="h-4 w-4" /> Termina
                          </Button>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        ) : (
          // Auction detail / live console
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedAuction(null); setAuctionItems([]); setLiveBids([]); }}>
                ← Torna alle aste
              </Button>
              <h2 className="text-xl font-bold text-foreground">{selectedAuction.title}</h2>
              {statusBadge(selectedAuction.status)}
            </div>

            {/* Live controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {selectedAuction.status === "scheduled" && (
                <Button className="gap-2" onClick={() => goLive(selectedAuction)}>
                  <Play className="h-4 w-4" /> Vai Live
                </Button>
              )}
              {selectedAuction.status === "live" && (
                <>
                  <Button variant="destructive" className="gap-2" onClick={() => endAuction(selectedAuction)}>
                    <Square className="h-4 w-4" /> Termina Asta
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
                    <Eye className="h-4 w-4" /> Link pubblico:
                    <button className="text-primary underline" onClick={() => { navigator.clipboard.writeText(publicUrl); toast({ title: "Link copiato!" }); }}>
                      Copia link
                    </button>
                  </div>
                </>
              )}
              <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" disabled={selectedAuction.status === "ended"}>
                    <Plus className="h-4 w-4" /> Aggiungi Prodotto
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Aggiungi Prodotto all'Asta</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Nome Prodotto *</Label><Input value={itemTitle} onChange={e => setItemTitle(e.target.value)} placeholder="Es. iPhone 13 Pro 128GB" /></div>
                    <div><Label>Descrizione</Label><Textarea value={itemDescription} onChange={e => setItemDescription(e.target.value)} placeholder="Condizioni, accessori inclusi..." /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Prezzo di partenza (€)</Label><Input type="number" value={itemStartingPrice} onChange={e => setItemStartingPrice(e.target.value)} placeholder="1" /></div>
                      <div><Label>Compra Ora (€, opzionale)</Label><Input type="number" value={itemBuyNowPrice} onChange={e => setItemBuyNowPrice(e.target.value)} placeholder="" /></div>
                    </div>
                    <div><Label>Durata lotto (secondi)</Label><Input type="number" value={itemDuration} onChange={e => setItemDuration(e.target.value)} /></div>
                    <Button onClick={addItem} className="w-full">Aggiungi</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Items + Bids Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Items list */}
              <div className="md:col-span-2 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2"><Package className="h-5 w-5" /> Prodotti ({auctionItems.length})</h3>
                {auctionItems.length === 0 ? (
                  <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground">Nessun prodotto. Aggiungi il primo!</CardContent></Card>
                ) : (
                  auctionItems.map(item => (
                    <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Card className={item.status === "active" ? "border-destructive shadow-lg ring-2 ring-destructive/20" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-foreground">{item.title}</h4>
                                {itemStatusBadge(item.status)}
                              </div>
                              {item.description && <p className="text-sm text-muted-foreground mb-2">{item.description}</p>}
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-muted-foreground">Partenza: <strong className="text-foreground">€{item.starting_price}</strong></span>
                                <span className="text-primary font-bold text-lg">Attuale: €{item.current_price}</span>
                                {item.buy_now_price && <span className="text-muted-foreground">Compra Ora: €{item.buy_now_price}</span>}
                                <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" />{item.bid_count} offerte</span>
                                <span className="text-muted-foreground flex items-center gap-1"><Timer className="h-3.5 w-3.5" />{item.duration_seconds}s</span>
                              </div>
                              {item.status === "sold" && item.winner_name && (
                                <div className="mt-2 flex items-center gap-2 text-sm text-primary">
                                  <Trophy className="h-4 w-4" /> Vinto da: <strong>{item.winner_name}</strong> {item.winner_email && `(${item.winner_email})`}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              {selectedAuction.status === "live" && item.status === "pending" && (
                                <Button size="sm" variant="default" onClick={() => activateItem(item)} className="gap-1">
                                  <ArrowRight className="h-3.5 w-3.5" /> Avvia
                                </Button>
                              )}
                              {selectedAuction.status === "live" && item.status === "active" && (
                                <>
                                  <Button size="sm" variant="default" onClick={() => closeItem(item, true)} className="gap-1">
                                    <Trophy className="h-3.5 w-3.5" /> Aggiudicato
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => closeItem(item, false)}>Skip</Button>
                                </>
                              )}
                              {item.status === "pending" && (
                                <Button size="sm" variant="ghost" onClick={() => deleteItem(item.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
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
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2"><Gavel className="h-5 w-5" /> Offerte Live</h3>
                <Card className="h-[500px] overflow-hidden">
                  <CardContent className="p-0 h-full overflow-y-auto">
                    {liveBids.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Nessuna offerta ancora</div>
                    ) : (
                      <div className="divide-y divide-border">
                        <AnimatePresence>
                          {liveBids.map(bid => (
                            <motion.div
                              key={bid.id}
                              initial={{ opacity: 0, x: 20, backgroundColor: "hsl(var(--primary) / 0.1)" }}
                              animate={{ opacity: 1, x: 0, backgroundColor: "transparent" }}
                              transition={{ duration: 0.4 }}
                              className="px-4 py-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm text-foreground">{bid.bidder_name}</span>
                                <span className="font-bold text-primary">€{bid.amount}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{new Date(bid.created_at).toLocaleTimeString("it-IT")}</span>
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
