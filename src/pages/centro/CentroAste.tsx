import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gavel, Plus, Play, Square, Eye, Users, Package, DollarSign,
  Trash2, ChevronRight, Radio, Trophy, ArrowRight, Timer, Copy, ExternalLink, Send, MessageCircle,
  ShoppingBag, Phone, Truck, CheckCircle2, XCircle
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

interface ChatMessage {
  id: string;
  auction_id: string;
  sender_name: string;
  message: string;
  created_at: string;
  user_id: string | null;
}

interface AuctionSale {
  id: string;
  auction_id: string;
  auction_item_id: string;
  centro_id: string;
  product_title: string;
  product_description: string | null;
  sale_price: number;
  winner_name: string;
  winner_email: string | null;
  fulfillment_status: string;
  fulfillment_notes: string | null;
  sold_at: string;
  fulfilled_at: string | null;
}

type FeedItem =
  | { type: "bid"; data: AuctionBid }
  | { type: "chat"; data: ChatMessage };

const FULFILLMENT_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: "In attesa", icon: ShoppingBag, color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  contacted: { label: "Contattato", icon: Phone, color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  shipped: { label: "Spedito", icon: Truck, color: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
  delivered: { label: "Consegnato", icon: CheckCircle2, color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  cancelled: { label: "Annullato", icon: XCircle, color: "bg-red-500/15 text-red-600 border-red-500/30" },
};

export default function CentroAste() {
  const { user } = useAuth();
  const [centroId, setCentroId] = useState<string | null>(null);
  const [centroName, setCentroName] = useState("");
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sales, setSales] = useState<AuctionSale[]>([]);
  const [salesFilter, setSalesFilter] = useState("all");
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (user) fetchCentroId(); }, [user]);
  useEffect(() => { if (centroId) fetchAuctions(); }, [centroId]);

  useEffect(() => {
    if (!selectedAuction) return;
    fetchItems(selectedAuction.id);
    fetchChatMessages(selectedAuction.id);
    fetchSales(selectedAuction.id);

    const channel = supabase
      .channel(`centro-auction-${selectedAuction.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auction_bids", filter: `auction_id=eq.${selectedAuction.id}` },
        (payload) => {
          const bid = payload.new as AuctionBid;
          setLiveBids(prev => prev.some(b => b.id === bid.id) ? prev : [bid, ...prev]);
          setAuctionItems(prev => prev.map(item =>
            item.id === bid.item_id ? { ...item, current_price: bid.amount, bid_count: item.bid_count + 1 } : item
          ));
        }
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auction_chat_messages", filter: `auction_id=eq.${selectedAuction.id}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setChatMessages(prev => prev.some(m => m.id === msg.id) ? prev : [msg, ...prev]);
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

    // Polling fallback: refresh bids + chat every 4s during live to catch missed realtime events
    const isLive = selectedAuction.status === "live";
    const pollInterval = isLive ? setInterval(() => {
      fetchItems(selectedAuction.id);
      fetchChatMessages(selectedAuction.id);
    }, 4000) : null;

    return () => {
      supabase.removeChannel(channel);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [selectedAuction?.id, selectedAuction?.status]);

  const fetchCentroId = async () => {
    if (!user) return;
    const { data } = await supabase.from("centri_assistenza").select("id, business_name").eq("owner_user_id", user.id).single();
    if (data) { setCentroId(data.id); setCentroName(data.business_name); }
  };

  const fetchAuctions = async () => {
    if (!centroId) return;
    setLoading(true);
    const { data } = await supabase.from("live_auctions").select("*").eq("centro_id", centroId).order("created_at", { ascending: false });
    setAuctions((data as Auction[]) || []);
    setLoading(false);
  };

  const fetchChatMessages = async (auctionId: string) => {
    const { data } = await supabase.from("auction_chat_messages").select("*").eq("auction_id", auctionId).order("created_at", { ascending: false }).limit(100);
    setChatMessages((data as ChatMessage[]) || []);
  };

  const fetchItems = async (auctionId: string) => {
    const [{ data: items }, { data: bids }] = await Promise.all([
      supabase.from("auction_items").select("*").eq("auction_id", auctionId).order("created_at", { ascending: true }),
      supabase.from("auction_bids").select("*").eq("auction_id", auctionId).order("created_at", { ascending: false }).limit(50),
    ]);
    setAuctionItems((items as AuctionItem[]) || []);
    setLiveBids((bids as AuctionBid[]) || []);
  };

  const fetchSales = async (auctionId: string) => {
    const { data } = await supabase.from("auction_sales").select("*").eq("auction_id", auctionId).order("sold_at", { ascending: false });
    setSales((data as AuctionSale[]) || []);
  };

  const sendChatMessage = async () => {
    if (!user || !selectedAuction || !chatInput.trim()) return;
    const { error } = await supabase.from("auction_chat_messages").insert({
      auction_id: selectedAuction.id, user_id: user.id,
      sender_name: centroName || "Centro", message: chatInput.trim(),
    });
    if (!error) setChatInput("");
    else toast({ title: "Errore", description: error.message, variant: "destructive" });
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
    // Always fetch the latest item data from DB to get accurate current_price/bid_count
    const { data: freshItem } = await supabase.from("auction_items").select("*").eq("id", item.id).single();
    const itemData = freshItem || item;
    
    // Also fetch top bid directly from auction_bids as source of truth
    const { data: topBid } = await supabase.from("auction_bids").select("*").eq("item_id", item.id).order("amount", { ascending: false }).limit(1).single();
    
    const actualPrice = topBid ? topBid.amount : (itemData as any).current_price || 0;
    const hasBids = !!topBid;
    
    const reservePrice = (itemData as any).reserve_price as number | null;
    const reserveMet = !reservePrice || actualPrice >= reservePrice;
    const finalSold = sold && reserveMet && hasBids;

    const update: any = { status: finalSold ? "sold" : "unsold", ended_at: new Date().toISOString(), current_price: actualPrice };
    if (finalSold && topBid) {
      update.winner_name = topBid.bidder_name;
      update.winner_email = topBid.bidder_email;
      update.winner_user_id = topBid.user_id;
    }
    await supabase.from("auction_items").update(update).eq("id", item.id);

    // Register sale in auction_sales
    if (finalSold && centroId && selectedAuction) {
      await supabase.from("auction_sales").insert({
        auction_id: selectedAuction.id,
        auction_item_id: item.id,
        centro_id: centroId,
        product_title: item.title,
        product_description: item.description,
        sale_price: actualPrice,
        winner_name: update.winner_name || "N/A",
        winner_email: update.winner_email || null,
        fulfillment_status: "pending" as any,
        sold_at: new Date().toISOString(),
      });
      fetchSales(selectedAuction.id);
      toast({ title: `🏆 Venduto a ${update.winner_name || "N/A"}!`, description: `Prezzo finale: €${actualPrice}` });
    } else if (sold && !reserveMet) {
      toast({ title: "Riserva non raggiunta", description: `Il prezzo €${actualPrice} non ha raggiunto la riserva.`, variant: "destructive" });
    }
    fetchItems(item.auction_id);
  };

  const deleteItem = async (itemId: string) => {
    await supabase.from("auction_items").delete().eq("id", itemId);
    if (selectedAuction) fetchItems(selectedAuction.id);
  };

  const updateFulfillmentStatus = async (saleId: string, status: string) => {
    const update: any = { fulfillment_status: status as any, updated_at: new Date().toISOString() };
    if (status === "delivered") update.fulfilled_at = new Date().toISOString();
    await supabase.from("auction_sales").update(update).eq("id", saleId);
    if (selectedAuction) fetchSales(selectedAuction.id);
    toast({ title: "Stato aggiornato" });
  };

  const updateFulfillmentNotes = async (saleId: string, notes: string) => {
    await supabase.from("auction_sales").update({ fulfillment_notes: notes, updated_at: new Date().toISOString() } as any).eq("id", saleId);
  };

  // Stats
  const soldItems = auctionItems.filter(i => i.status === "sold");
  const totalRevenue = soldItems.reduce((sum, i) => sum + i.current_price, 0);
  const activeItem = auctionItems.find(i => i.status === "active");
  const publicUrl = selectedAuction ? `${window.location.origin}/aste/${selectedAuction.id}` : "";

  const filteredSales = salesFilter === "all" ? sales : sales.filter(s => s.fulfillment_status === salesFilter);

  // Auto-close countdown
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

  const FulfillmentBadge = ({ status }: { status: string }) => {
    const config = FULFILLMENT_CONFIG[status] || FULFILLMENT_CONFIG.pending;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`${config.color} text-[10px] gap-1`}>
        <Icon className="h-3 w-3" /> {config.label}
      </Badge>
    );
  };

  // Countdown display for active item
  const ActiveItemCountdown = ({ item }: { item: AuctionItem }) => {
    const [remaining, setRemaining] = useState(0);
    useEffect(() => {
      if (!item.started_at) return;
      const endTime = new Date(item.started_at).getTime() + item.duration_seconds * 1000;
      const tick = () => setRemaining(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
      tick();
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    }, [item.started_at, item.duration_seconds]);
    const isUrgent = remaining <= 10;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return (
      <div className={`text-center ${isUrgent ? "text-destructive" : "text-foreground"}`}>
        <div className={`text-4xl sm:text-5xl font-black tabular-nums ${isUrgent ? "animate-pulse" : ""}`}>
          {mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : secs}
        </div>
        <p className="text-xs text-muted-foreground mt-1">secondi rimanenti</p>
      </div>
    );
  };

  return (
    <CentroLayout>
      <PageTransition>
        <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Gavel className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                Aste Live
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 ml-12">Gestisci le tue aste in diretta</p>
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
            /* ===== AUCTION DETAIL ===== */
            <div className="space-y-4">
              {/* Back + Title */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSelectedAuction(null); setAuctionItems([]); setLiveBids([]); setSales([]); }}>
                  ← Indietro
                </Button>
                <h2 className="text-base sm:text-lg font-bold text-foreground truncate">{selectedAuction.title}</h2>
                {statusBadge(selectedAuction.status)}
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Prodotti", value: auctionItems.length, icon: Package, color: "text-blue-500", bgColor: "bg-blue-500/10" },
                  { label: "Venduti", value: soldItems.length, icon: Trophy, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
                  { label: "Incasso", value: `€${totalRevenue.toFixed(0)}`, icon: DollarSign, color: "text-primary", bgColor: "bg-primary/10" },
                  { label: "Spettatori", value: selectedAuction.viewer_count, icon: Eye, color: "text-amber-500", bgColor: "bg-amber-500/10" },
                ].map((stat) => (
                  <Card key={stat.label} className="bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                          <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                        <div>
                          <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
                          <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Live Controls */}
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

              {/* Active Item Hero (Live) */}
              {selectedAuction.status === "live" && activeItem && (
                <Card className="border-destructive/30 bg-destructive/5 shadow-lg ring-1 ring-destructive/20">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                      <span className="text-xs font-semibold text-destructive uppercase tracking-wider">In asta ora</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                      <div className="sm:col-span-1">
                        <h3 className="font-bold text-lg text-foreground">{activeItem.title}</h3>
                        {activeItem.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{activeItem.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>Da €{activeItem.starting_price}</span>
                          {activeItem.buy_now_price && <span>CN €{activeItem.buy_now_price}</span>}
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Prezzo attuale</p>
                        <motion.p key={activeItem.current_price} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="text-4xl sm:text-5xl font-black text-primary">
                          €{activeItem.current_price}
                        </motion.p>
                        <div className="flex items-center justify-center gap-1.5 mt-2">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <motion.span key={activeItem.bid_count} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="text-sm font-bold">
                            {activeItem.bid_count}
                          </motion.span>
                          <span className="text-xs text-muted-foreground">offerte</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-3">
                        <ActiveItemCountdown item={activeItem} />
                        <div className="flex items-center gap-2">
                          <Button size="sm" className="gap-1" onClick={() => closeItem(activeItem, true)}>
                            <Trophy className="h-3.5 w-3.5" /> Aggiudicato
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => closeItem(activeItem, false)}>Skip</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Items + Feed Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Items List */}
                <div className="lg:col-span-2 space-y-2">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                    <Package className="h-4 w-4" /> Prodotti ({auctionItems.length})
                  </h3>
                  {auctionItems.length === 0 ? (
                    <Card className="border-dashed"><CardContent className="py-6 text-center text-sm text-muted-foreground">Nessun prodotto. Aggiungi il primo!</CardContent></Card>
                  ) : (
                    auctionItems.map(item => (
                      <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Card className={`transition-all ${
                          item.status === "active" ? "border-destructive shadow-lg ring-1 ring-destructive/20" :
                          item.status === "sold" ? "border-primary/30 bg-primary/5" : ""
                        }`}>
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
                                    <span className={`text-xs font-medium ${item.current_price >= (item as any).reserve_price ? "text-emerald-600" : "text-destructive"}`}>
                                      R €{(item as any).reserve_price} {item.current_price >= (item as any).reserve_price ? "✓" : "✗"}
                                    </span>
                                  )}
                                  <span className="text-muted-foreground flex items-center gap-0.5"><Users className="h-3 w-3" />{item.bid_count}</span>
                                  <span className="text-muted-foreground flex items-center gap-0.5"><Timer className="h-3 w-3" />{item.duration_seconds}s</span>
                                </div>

                                {item.status === "sold" && item.winner_name && (
                                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-2.5 p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                                    <div className="flex items-center gap-2">
                                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                        <Trophy className="h-4 w-4 text-primary" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-foreground text-sm">{item.winner_name}</p>
                                        {item.winner_email && <p className="text-xs text-muted-foreground truncate">{item.winner_email}</p>}
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <p className="font-black text-primary text-lg leading-none">€{item.current_price}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.bid_count} offerte</p>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}

                                {item.status === "unsold" && (
                                  <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Gavel className="h-3.5 w-3.5" />
                                    {(item as any).reserve_price && item.current_price < (item as any).reserve_price ? "Riserva non raggiunta" : "Nessuna offerta valida"}
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

                {/* Live Feed */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" /> Feed Live
                    {activeItem && <Badge variant="outline" className="ml-auto text-[10px]">{activeItem.bid_count} offerte</Badge>}
                  </h3>
                  <Card className="h-[350px] sm:h-[450px] lg:h-[550px] overflow-hidden flex flex-col">
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                      {(() => {
                        const feedItems: FeedItem[] = [
                          ...liveBids.map(b => ({ type: "bid" as const, data: b })),
                          ...chatMessages.map(c => ({ type: "chat" as const, data: c })),
                        ].sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime());

                        if (feedItems.length === 0) {
                          return <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Nessuna attività ancora</div>;
                        }

                        return (
                          <div className="divide-y divide-border/50">
                            <AnimatePresence>
                              {feedItems.map((item, i) => {
                                if (item.type === "bid") {
                                  const bid = item.data;
                                  return (
                                    <motion.div key={`bid-${bid.id}`} initial={{ opacity: 0, x: 15, backgroundColor: "hsl(var(--primary) / 0.1)" }} animate={{ opacity: 1, x: 0, backgroundColor: "transparent" }} transition={{ duration: 0.3 }} className="px-3 py-2.5">
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-7 w-7 flex-shrink-0">
                                          <AvatarFallback className="text-[9px] font-bold bg-emerald-500/20 text-emerald-600">
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
                                  );
                                } else {
                                  const chat = item.data;
                                  const isCentro = chat.user_id === user?.id;
                                  return (
                                    <motion.div key={`chat-${chat.id}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="px-3 py-2.5">
                                      <div className="flex items-start gap-2">
                                        <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                                          <AvatarFallback className={`text-[9px] font-bold ${isCentro ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                                            {chat.sender_name.slice(0, 1).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className={`font-medium text-xs ${isCentro ? "text-primary" : "text-foreground"}`}>{chat.sender_name}</span>
                                            {isCentro && <Badge className="text-[8px] h-3.5 px-1 bg-primary/10 text-primary border-0">Host</Badge>}
                                            <span className="text-[10px] text-muted-foreground">
                                              {new Date(chat.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                          </div>
                                          <p className="text-xs text-foreground/80 mt-0.5">{chat.message}</p>
                                        </div>
                                      </div>
                                    </motion.div>
                                  );
                                }
                              })}
                            </AnimatePresence>
                            <div ref={feedEndRef} />
                          </div>
                        );
                      })()}
                    </CardContent>
                    {/* Chat input */}
                    {selectedAuction.status === "live" && (
                      <div className="border-t border-border p-2">
                        <form onSubmit={e => { e.preventDefault(); sendChatMessage(); }} className="flex items-center gap-2">
                          <Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Rispondi alla chat..." className="h-8 text-xs flex-1" />
                          <Button type="submit" size="sm" className="h-8 w-8 p-0" disabled={!chatInput.trim()}>
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      </div>
                    )}
                  </Card>
                </div>
              </div>

              {/* Sales Summary */}
              {sales.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-primary" /> Riepilogo Vendite ({sales.length})
                    </h3>
                    <Select value={salesFilter} onValueChange={setSalesFilter}>
                      <SelectTrigger className="w-[150px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti</SelectItem>
                        <SelectItem value="pending">In attesa</SelectItem>
                        <SelectItem value="contacted">Contattati</SelectItem>
                        <SelectItem value="shipped">Spediti</SelectItem>
                        <SelectItem value="delivered">Consegnati</SelectItem>
                        <SelectItem value="cancelled">Annullati</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Card>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Prodotto</TableHead>
                            <TableHead className="text-xs">Vincitore</TableHead>
                            <TableHead className="text-xs text-right">Prezzo</TableHead>
                            <TableHead className="text-xs">Stato</TableHead>
                            <TableHead className="text-xs">Note</TableHead>
                            <TableHead className="text-xs w-[140px]">Azione</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSales.map(sale => (
                            <TableRow key={sale.id}>
                              <TableCell className="text-sm font-medium">{sale.product_title}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm font-medium">{sale.winner_name}</p>
                                  {sale.winner_email && <p className="text-xs text-muted-foreground">{sale.winner_email}</p>}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-bold text-primary">€{sale.sale_price}</TableCell>
                              <TableCell><FulfillmentBadge status={sale.fulfillment_status} /></TableCell>
                              <TableCell>
                                <Input
                                  className="h-7 text-xs min-w-[120px]"
                                  placeholder="Note..."
                                  defaultValue={sale.fulfillment_notes || ""}
                                  onBlur={e => updateFulfillmentNotes(sale.id, e.target.value)}
                                />
                              </TableCell>
                              <TableCell>
                                <Select value={sale.fulfillment_status} onValueChange={v => updateFulfillmentStatus(sale.id, v)}>
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(FULFILLMENT_CONFIG).map(([key, config]) => (
                                      <SelectItem key={key} value={key}>
                                        <span className="flex items-center gap-1.5">
                                          <config.icon className="h-3 w-3" /> {config.label}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                  {/* Sales totals */}
                  <div className="flex items-center justify-end gap-4 text-sm">
                    <span className="text-muted-foreground">Totale vendite: <span className="font-bold text-foreground">{sales.length}</span></span>
                    <span className="text-muted-foreground">Incasso: <span className="font-bold text-primary">€{sales.reduce((s, x) => s + x.sale_price, 0).toFixed(2)}</span></span>
                    <span className="text-muted-foreground">Da evadere: <span className="font-bold text-amber-600">{sales.filter(s => s.fulfillment_status === "pending").length}</span></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PageTransition>
    </CentroLayout>
  );
}
