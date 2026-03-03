import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { Gavel, Eye, Radio, Timer, ArrowUp, ShoppingCart, Building2, ChevronRight, Sparkles, Lock, Video } from "lucide-react";

// --- Stream URL helper ---
function convertToEmbedUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  
  // Already an embed URL
  if (trimmed.includes("/embed/") || trimmed.includes("player.twitch.tv")) return trimmed;
  
  // YouTube: various formats
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|live\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=0`;
  
  // YouTube Studio live stream URL
  const ytStudioMatch = trimmed.match(/studio\.youtube\.com\/video\/([\w-]{11})/);
  if (ytStudioMatch) return `https://www.youtube.com/embed/${ytStudioMatch[1]}?autoplay=1&mute=0`;
  
  // Twitch channel
  const twitchMatch = trimmed.match(/twitch\.tv\/([\w]+)/);
  if (twitchMatch) return `https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=${window.location.hostname}`;
  
  // Facebook video
  const fbMatch = trimmed.match(/facebook\.com.*\/videos\//);
  if (fbMatch) return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&autoplay=true&mute=false`;
  
  // Kick
  const kickMatch = trimmed.match(/kick\.com\/([\w]+)/);
  if (kickMatch) return `https://player.kick.com/${kickMatch[1]}`;
  
  // Fallback: use as-is (user may paste direct embed)
  return trimmed;
}

// --- Types ---
interface AuctionData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  viewer_count: number;
  centro_id: string;
  stream_url: string | null;
}

interface CentroInfo {
  business_name: string;
  logo_url: string | null;
}

interface ItemData {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  starting_price: number;
  current_price: number;
  buy_now_price: number | null;
  status: string;
  bid_count: number;
  duration_seconds: number;
  started_at: string | null;
  winner_name: string | null;
}

interface BidData {
  id: string;
  item_id: string;
  bidder_name: string;
  amount: number;
  created_at: string;
}

// --- Inline Auth Dialog ---
function InlineAuthDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void }) {
  const [tab, setTab] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        toast({ title: "Registrazione completata!", description: "Controlla la tua email per confermare l'account." });
        onSuccess();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Errore");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-border bg-card">
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Partecipa all'asta
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">Accedi o registrati per fare offerte in tempo reale</p>
        </div>
        <div className="px-6 pb-6">
          <Tabs value={tab} onValueChange={v => { setTab(v as any); setError(""); }}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="register">Registrati</TabsTrigger>
              <TabsTrigger value="login">Accedi</TabsTrigger>
            </TabsList>
            <form onSubmit={handleSubmit} className="space-y-3">
              <TabsContent value="register" className="space-y-3 mt-0">
                <Input placeholder="Il tuo nome" value={name} onChange={e => setName(e.target.value)} required />
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <Input type="password" placeholder="Password (min 6 caratteri)" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
              </TabsContent>
              <TabsContent value="login" className="space-y-3 mt-0">
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
              </TabsContent>
              {error && <p className="text-sm text-destructive font-medium">{error}</p>}
              <Button type="submit" className="w-full text-base font-bold h-12" disabled={loading}>
                {loading ? "Caricamento..." : tab === "register" ? "Registrati e Partecipa" : "Accedi e Partecipa"}
              </Button>
            </form>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Bid Feed Item ---
function BidFeedItem({ bid, isLatest }: { bid: BidData; isLatest: boolean }) {
  const initials = bid.bidder_name.slice(0, 2).toUpperCase();
  const colors = ["bg-primary/20 text-primary", "bg-chart-2/20 text-chart-2", "bg-chart-4/20 text-chart-4", "bg-chart-5/20 text-chart-5"];
  const colorIdx = bid.bidder_name.charCodeAt(0) % colors.length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`flex items-center gap-3 px-4 py-2.5 ${isLatest ? "bg-primary/10" : ""}`}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className={`text-xs font-bold ${colors[colorIdx]}`}>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-sm text-foreground">{bid.bidder_name}</span>
        <span className="text-xs text-muted-foreground ml-2">{new Date(bid.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
      </div>
      <motion.span
        key={bid.amount}
        initial={{ scale: 1.4 }}
        animate={{ scale: 1 }}
        className={`font-black text-base tabular-nums ${isLatest ? "text-primary" : "text-foreground"}`}
      >
        €{bid.amount}
      </motion.span>
    </motion.div>
  );
}

// --- Main Component ---
export default function AstaLive() {
  const { auctionId } = useParams<{ auctionId: string }>();
  const { user } = useAuth();
  const [auction, setAuction] = useState<AuctionData | null>(null);
  const [centro, setCentro] = useState<CentroInfo | null>(null);
  const [items, setItems] = useState<ItemData[]>([]);
  const [bids, setBids] = useState<BidData[]>([]);
  const [bidderName, setBidderName] = useState("");
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const activeItem = items.find(i => i.status === "active");
  const minBid = activeItem ? activeItem.current_price + 5 : 0;
  const pendingItems = items.filter(i => i.status === "pending");
  const soldItems = items.filter(i => i.status === "sold");
  const isLive = auction?.status === "live";
  const isEnded = auction?.status === "ended";

  // --- Data fetching ---
  const fetchItems = useCallback(async () => {
    if (!auctionId) return;
    const { data } = await supabase.from("auction_items").select("*").eq("auction_id", auctionId).order("created_at", { ascending: true });
    setItems((data as ItemData[]) || []);
  }, [auctionId]);

  const fetchAuction = useCallback(async () => {
    if (!auctionId) return;
    setLoading(true);
    const { data } = await supabase.from("live_auctions").select("*").eq("id", auctionId).single();
    if (data) {
      setAuction(data as AuctionData);
      const { data: cd } = await supabase.from("centri_assistenza").select("business_name, logo_url").eq("id", data.centro_id).single();
      if (cd) setCentro(cd);
    }
    await fetchItems();
    setLoading(false);
  }, [auctionId, fetchItems]);

  useEffect(() => {
    if (!auctionId) return;
    fetchAuction();

    // Viewer count
    supabase.from("live_auctions").select("viewer_count").eq("id", auctionId).single().then(({ data }) => {
      if (data) supabase.from("live_auctions").update({ viewer_count: (data.viewer_count || 0) + 1 } as any).eq("id", auctionId).then(() => {});
    });

    const channel = supabase
      .channel(`public-auction-${auctionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_items", filter: `auction_id=eq.${auctionId}` }, () => fetchItems())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auction_bids", filter: `auction_id=eq.${auctionId}` }, (payload) => {
        const bid = payload.new as BidData;
        setBids(prev => [bid, ...prev.slice(0, 99)]);
        setItems(prev => prev.map(item => item.id === bid.item_id ? { ...item, current_price: bid.amount, bid_count: item.bid_count + 1 } : item));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_auctions", filter: `id=eq.${auctionId}` }, (payload) => {
        const updated = payload.new as AuctionData;
        setAuction(prev => prev ? { ...prev, viewer_count: updated.viewer_count, status: updated.status, stream_url: updated.stream_url } : null);
      })
      .subscribe();

    return () => {
      supabase.from("live_auctions").select("viewer_count").eq("id", auctionId).single().then(({ data }) => {
        if (data) supabase.from("live_auctions").update({ viewer_count: Math.max(0, (data.viewer_count || 1) - 1) } as any).eq("id", auctionId).then(() => {});
      });
      supabase.removeChannel(channel);
    };
  }, [auctionId, fetchAuction, fetchItems]);

  // Countdown
  useEffect(() => {
    if (!activeItem?.started_at) { setCountdown(null); return; }
    const endTime = new Date(activeItem.started_at).getTime() + activeItem.duration_seconds * 1000;
    const tick = () => setCountdown(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeItem?.started_at, activeItem?.duration_seconds]);

  // --- Actions ---
  const requireAuth = (cb: () => void) => {
    if (!user) { setAuthOpen(true); return; }
    cb();
  };

  const placeBid = async (amount: number) => {
    if (!user || !activeItem) return;
    const name = bidderName.trim() || user.email?.split("@")[0] || "Anonimo";
    const { error } = await supabase.from("auction_bids").insert({
      item_id: activeItem.id, auction_id: auctionId!, user_id: user.id,
      bidder_name: name, bidder_email: user.email, amount,
    });
    if (error) toast({ title: "Errore", description: error.message, variant: "destructive" });
  };

  // --- Render ---
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Gavel className="h-16 w-16 text-muted-foreground/30" />
        <h1 className="text-2xl font-bold text-foreground">Asta non trovata</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InlineAuthDialog open={authOpen} onOpenChange={setAuthOpen} onSuccess={() => setAuthOpen(false)} />

      {/* ===== COMPACT HEADER ===== */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          {centro?.logo_url ? (
            <img src={centro.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Building2 className="h-4 w-4 text-primary" /></div>
          )}
          <div className="min-w-0">
            <h1 className="font-bold text-foreground text-sm truncate leading-tight">{auction.title}</h1>
            <p className="text-xs text-muted-foreground truncate">{centro?.business_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isLive && (
            <Badge className="bg-destructive text-destructive-foreground animate-pulse gap-1 text-xs px-2 py-0.5">
              <Radio className="h-2.5 w-2.5" /> LIVE
            </Badge>
          )}
          {isEnded && <Badge variant="secondary" className="text-xs">Terminata</Badge>}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            <motion.span key={auction.viewer_count} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="font-bold text-foreground">
              {auction.viewer_count}
            </motion.span>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full">
        {/* LEFT: Hero + Items */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Stream / Product Hero */}
          <div className="relative bg-black">
            {auction.stream_url ? (
              <div className="aspect-[9/16] sm:aspect-[4/3] md:aspect-video max-h-[70vh] sm:max-h-[60vh]">
                <iframe 
                  src={convertToEmbedUrl(auction.stream_url)} 
                  className="w-full h-full border-0" 
                  allowFullScreen 
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture" 
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : activeItem?.image_url ? (
              <div className="aspect-[9/16] sm:aspect-[4/3] md:aspect-video max-h-[70vh] sm:max-h-[60vh] flex items-center justify-center bg-black">
                <img src={activeItem.image_url} alt={activeItem.title} className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="aspect-[9/16] sm:aspect-[4/3] md:aspect-video max-h-[70vh] sm:max-h-[60vh] flex flex-col items-center justify-center bg-muted gap-3">
                <Video className="h-16 w-16 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {isLive ? "Stream in arrivo..." : "In attesa dello stream"}
                </p>
              </div>
            )}

            {/* Price + Timer Overlay */}
            {activeItem && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 via-background/60 to-transparent p-4 pt-10">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Prezzo attuale</p>
                    <motion.p
                      key={activeItem.current_price}
                      initial={{ scale: 1.4, color: "hsl(var(--primary))" }}
                      animate={{ scale: 1, color: "hsl(var(--foreground))" }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="text-4xl md:text-5xl font-black leading-none"
                    >
                      €{activeItem.current_price}
                    </motion.p>
                    <p className="text-xs text-muted-foreground mt-0.5">{activeItem.bid_count} offerte · Da €{activeItem.starting_price}</p>
                  </div>
                  {countdown !== null && (
                    <motion.div
                      className={`text-center px-4 py-2 rounded-2xl backdrop-blur-sm ${countdown <= 10 ? "bg-destructive/20 text-destructive" : "bg-background/60 text-foreground"}`}
                    >
                      <Timer className="h-4 w-4 mx-auto mb-0.5" />
                      <p className={`text-2xl md:text-3xl font-black tabular-nums leading-none ${countdown <= 10 ? "animate-pulse" : ""}`}>{countdown}s</p>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active Item Info */}
          {activeItem && (
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-bold text-foreground text-lg">{activeItem.title}</h2>
              {activeItem.description && <p className="text-sm text-muted-foreground line-clamp-2">{activeItem.description}</p>}
            </div>
          )}

          {/* No active item message */}
          {!activeItem && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center">
              <Gavel className="h-16 w-16 text-muted-foreground/20 mb-4" />
              <p className="text-lg font-semibold text-foreground">
                {isLive ? "In attesa del prossimo lotto..." : isEnded ? "Asta terminata" : "L'asta non è ancora iniziata"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {isLive ? "Il venditore sta preparando il prossimo prodotto" : isEnded ? `${soldItems.length} prodotti venduti` : "Resta in attesa!"}
              </p>
            </div>
          )}

          {/* Upcoming lots carousel */}
          {pendingItems.length > 0 && isLive && (
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                Prossimi <ChevronRight className="h-3 w-3" />
              </h3>
              <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {pendingItems.map(item => (
                  <div key={item.id} className="flex-shrink-0 w-20">
                    <div className="aspect-square rounded-xl bg-muted overflow-hidden mb-1">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Gavel className="h-5 w-5 text-muted-foreground/30" /></div>
                      )}
                    </div>
                    <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">€{item.starting_price}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sold items */}
          {soldItems.length > 0 && (
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">🏆 Venduti ({soldItems.length})</h3>
              <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {soldItems.map(item => (
                  <div key={item.id} className="flex-shrink-0 w-20">
                    <div className="aspect-square rounded-xl bg-primary/5 border border-primary/20 overflow-hidden mb-1 flex items-center justify-center">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-full h-full object-cover opacity-80" />
                      ) : (
                        <Gavel className="h-5 w-5 text-primary/40" />
                      )}
                    </div>
                    <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-primary font-bold">€{item.current_price}</p>
                    {item.winner_name && <p className="text-[10px] text-muted-foreground truncate">→ {item.winner_name}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Bid Feed (desktop sidebar / mobile below) */}
        <div className="md:w-80 lg:w-96 md:border-l border-border flex flex-col min-h-0">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-muted/30">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5">
              <Gavel className="h-4 w-4" /> Offerte Live
            </h3>
            {activeItem && <span className="text-xs text-muted-foreground">{activeItem.bid_count} offerte</span>}
          </div>
          <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[50vh] md:max-h-none" ref={feedRef}>
            {bids.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground text-sm">
                {isLive ? "Fai la prima offerta! 🔥" : "Nessuna offerta"}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                <AnimatePresence>
                  {bids.map((bid, i) => (
                    <BidFeedItem key={bid.id} bid={bid} isLatest={i === 0} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Bidder name input (logged in, desktop) */}
          {user && isLive && activeItem && (
            <div className="hidden md:block px-4 py-2 border-t border-border">
              <Input
                placeholder="Il tuo nome (opzionale)"
                value={bidderName}
                onChange={e => setBidderName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* ===== STICKY BOTTOM BID BAR ===== */}
      {isLive && activeItem && (
        <div className="sticky bottom-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border px-4 py-3 safe-area-bottom">
          {!user ? (
            /* Guest: prominent registration CTA */
            <Button
              size="lg"
              className="w-full h-14 text-base font-black gap-2 rounded-2xl"
              onClick={() => setAuthOpen(true)}
            >
              <Lock className="h-5 w-5" />
              Registrati per Partecipare
            </Button>
          ) : (
            /* Logged in: bid buttons */
            <div className="space-y-2">
              {/* Mobile bidder name */}
              <div className="md:hidden">
                <Input
                  placeholder="Il tuo nome (opzionale)"
                  value={bidderName}
                  onChange={e => setBidderName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="lg"
                  className="flex-1 h-14 text-lg font-black gap-2 rounded-2xl"
                  onClick={() => requireAuth(() => placeBid(minBid))}
                >
                  <ArrowUp className="h-5 w-5" /> €{minBid}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 text-lg font-bold rounded-2xl px-5"
                  onClick={() => requireAuth(() => placeBid(minBid + 5))}
                >
                  +€5
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 text-lg font-bold rounded-2xl px-5"
                  onClick={() => requireAuth(() => placeBid(minBid + 10))}
                >
                  +€10
                </Button>
              </div>
              {activeItem.buy_now_price && (
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full h-12 font-bold gap-2 rounded-2xl"
                  onClick={() => requireAuth(() => placeBid(activeItem.buy_now_price!))}
                >
                  <ShoppingCart className="h-5 w-5" /> Compra Ora €{activeItem.buy_now_price}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
