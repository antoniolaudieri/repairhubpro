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
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Gavel, Eye, Radio, Timer, ArrowUp, ShoppingCart, Building2, ChevronRight, Sparkles, Lock, Video, Wifi, WifiOff, Users, Trophy } from "lucide-react";
import { useWebRTCViewer } from "@/hooks/useWebRTCViewer";

// --- Stream URL helper ---
function convertToEmbedUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.includes("/embed/") || trimmed.includes("player.twitch.tv")) return trimmed;
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|live\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=0`;
  const ytStudioMatch = trimmed.match(/studio\.youtube\.com\/video\/([\w-]{11})/);
  if (ytStudioMatch) return `https://www.youtube.com/embed/${ytStudioMatch[1]}?autoplay=1&mute=0`;
  const twitchMatch = trimmed.match(/twitch\.tv\/([\w]+)/);
  if (twitchMatch) return `https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=${window.location.hostname}`;
  const fbMatch = trimmed.match(/facebook\.com.*\/videos\//);
  if (fbMatch) return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&autoplay=true&mute=false`;
  const kickMatch = trimmed.match(/kick\.com\/([\w]+)/);
  if (kickMatch) return `https://player.kick.com/${kickMatch[1]}`;
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
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
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
      <DialogContent className="max-w-[95vw] sm:max-w-md p-0 overflow-hidden rounded-2xl border-border bg-card">
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 px-5 pt-5 pb-3">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Partecipa all'asta
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">Accedi o registrati per fare offerte in tempo reale</p>
        </div>
        <div className="px-5 pb-5">
          <Tabs value={tab} onValueChange={v => { setTab(v as any); setError(""); }}>
            <TabsList className="grid w-full grid-cols-2 mb-3">
              <TabsTrigger value="register">Registrati</TabsTrigger>
              <TabsTrigger value="login">Accedi</TabsTrigger>
            </TabsList>
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <TabsContent value="register" className="space-y-2.5 mt-0">
                <Input placeholder="Il tuo nome" value={name} onChange={e => setName(e.target.value)} required className="h-11" />
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="h-11" />
                <Input type="password" placeholder="Password (min 6 caratteri)" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required className="h-11" />
              </TabsContent>
              <TabsContent value="login" className="space-y-2.5 mt-0">
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="h-11" />
                <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="h-11" />
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
      initial={{ opacity: 0, x: 30, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`flex items-center gap-2.5 px-3 py-2 ${isLatest ? "bg-primary/10" : ""}`}
    >
      <Avatar className="h-7 w-7 flex-shrink-0">
        <AvatarFallback className={`text-[10px] font-bold ${colors[colorIdx]}`}>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-xs text-foreground">{bid.bidder_name}</span>
        <span className="text-[10px] text-muted-foreground ml-1.5">
          {new Date(bid.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>
      <motion.span
        key={bid.amount}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        className={`font-black text-sm tabular-nums ${isLatest ? "text-primary" : "text-foreground"}`}
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
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [presenceCount, setPresenceCount] = useState(0);
  const [winnerOverlay, setWinnerOverlay] = useState<{ name: string | null; price: number; sold: boolean } | null>(null);

  const isCameraStream = auction?.stream_url?.startsWith("camera:");
  const { remoteStream, connectionState } = useWebRTCViewer(auctionId || "", !!isCameraStream);
  const activeItem = items.find(i => i.status === "active");
  const minBid = activeItem ? activeItem.current_price + 5 : 0;
  const pendingItems = items.filter(i => i.status === "pending");
  const soldItems = items.filter(i => i.status === "sold");
  const isLive = auction?.status === "live";
  const isEnded = auction?.status === "ended";

  // --- Data fetching ---
  const fetchBids = useCallback(async () => {
    if (!auctionId) return;
    const { data } = await supabase
      .from("auction_bids")
      .select("*")
      .eq("auction_id", auctionId)
      .order("created_at", { ascending: false })
      .limit(100);
    setBids((data as BidData[]) || []);
  }, [auctionId]);

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
    await Promise.all([fetchItems(), fetchBids()]);
    setLoading(false);
  }, [auctionId, fetchItems, fetchBids]);

  useEffect(() => {
    if (!auctionId) return;
    fetchAuction();

    // Presence-based viewer tracking
    const presenceChannel = supabase.channel(`presence-auction-${auctionId}`, {
      config: { presence: { key: `viewer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` } },
    });
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setPresenceCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ type: "viewer" });
        }
      });

    const channel = supabase
      .channel(`public-auction-${auctionId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "auction_items", filter: `auction_id=eq.${auctionId}` }, (payload) => {
        const updated = payload.new as any;
        if (updated.status === "sold" || updated.status === "unsold") {
          setWinnerOverlay({
            name: updated.winner_name || null,
            price: updated.current_price,
            sold: updated.status === "sold",
          });
          setTimeout(() => setWinnerOverlay(null), 6000);
        }
        fetchItems();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auction_items", filter: `auction_id=eq.${auctionId}` }, () => fetchItems())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auction_bids", filter: `auction_id=eq.${auctionId}` }, (payload) => {
        const bid = payload.new as BidData;
        setBids(prev => {
          if (prev.some(b => b.id === bid.id)) return prev;
          return [bid, ...prev.slice(0, 99)];
        });
        setItems(prev => prev.map(item => item.id === bid.item_id ? { ...item, current_price: bid.amount, bid_count: item.bid_count + 1 } : item));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_auctions", filter: `id=eq.${auctionId}` }, (payload) => {
        const updated = payload.new as AuctionData;
        setAuction(updated);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(channel);
    };
  }, [auctionId, fetchAuction, fetchItems, fetchBids]);

  // Countdown
  useEffect(() => {
    if (!activeItem?.started_at) { setCountdown(null); return; }
    const endTime = new Date(activeItem.started_at).getTime() + activeItem.duration_seconds * 1000;
    const tick = () => setCountdown(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeItem?.started_at, activeItem?.duration_seconds]);

  // Attach remote WebRTC stream
  useEffect(() => {
    if (cameraVideoRef.current && remoteStream) {
      const video = cameraVideoRef.current;
      video.srcObject = remoteStream;
      video.muted = true; // iPad/Safari autoplay compatibility
      void video.play().catch(() => {
        // Safari may still require user gesture in some cases
      });
    }
  }, [remoteStream]);

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
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 px-4">
        <Gavel className="h-14 w-14 text-muted-foreground/30" />
        <h1 className="text-xl font-bold text-foreground">Asta non trovata</h1>
      </div>
    );
  }

  const activeBids = activeItem ? bids.filter(b => b.item_id === activeItem.id) : bids;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <InlineAuthDialog open={authOpen} onOpenChange={setAuthOpen} onSuccess={() => setAuthOpen(false)} />

      {/* ===== COMPACT HEADER ===== */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border px-3 py-1.5 flex items-center justify-between safe-area-top">
        <div className="flex items-center gap-2 min-w-0">
          {centro?.logo_url ? (
            <img src={centro.logo_url} alt="" className="h-7 w-7 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Building2 className="h-3.5 w-3.5 text-primary" /></div>
          )}
          <div className="min-w-0">
            <h1 className="font-bold text-foreground text-xs truncate leading-tight">{auction.title}</h1>
            <p className="text-[10px] text-muted-foreground truncate">{centro?.business_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isLive && (
            <Badge className="bg-destructive text-destructive-foreground animate-pulse gap-0.5 text-[10px] px-1.5 py-0 h-5">
              <Radio className="h-2 w-2" /> LIVE
            </Badge>
          )}
          {isEnded && <Badge variant="secondary" className="text-[10px] h-5">Terminata</Badge>}
          <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Eye className="h-3 w-3" />
            <motion.span key={presenceCount} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="font-bold text-foreground">
              {presenceCount}
            </motion.span>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT - Mobile: vertical stack, Desktop: side by side ===== */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full overflow-hidden">
        
        {/* LEFT: Video + Active Item */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Stream / Product Hero */}
          <div className="relative bg-black flex-shrink-0">
            {isCameraStream ? (
              <div className="aspect-video w-full flex items-center justify-center bg-black relative">
                {remoteStream ? (
                  <>
                    <video ref={cameraVideoRef} autoPlay playsInline muted={isMuted} className="w-full h-full object-cover" />
                    {isMuted && (
                      <button
                        onClick={() => {
                          setIsMuted(false);
                          if (cameraVideoRef.current) cameraVideoRef.current.muted = false;
                        }}
                        className="absolute top-3 right-3 z-10 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
                      >
                        🔇 Tocca per audio
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-center text-white/60 space-y-2 p-4">
                    <Video className="h-10 w-10 mx-auto opacity-40 animate-pulse" />
                    <p className="text-xs font-medium text-white/70">
                      {connectionState === "connecting" ? "Connessione..." : "In attesa della diretta..."}
                    </p>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-white/40">
                      {connectionState === "connected" ? <Wifi className="h-2.5 w-2.5 text-chart-2" /> : <WifiOff className="h-2.5 w-2.5" />}
                      <span>{connectionState === "connected" ? "Connesso" : "In attesa"}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : auction.stream_url ? (
              <div className="aspect-video w-full">
                <iframe
                  src={convertToEmbedUrl(auction.stream_url)}
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : activeItem?.image_url ? (
              <div className="aspect-video w-full flex items-center justify-center bg-black">
                <img src={activeItem.image_url} alt={activeItem.title} className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="aspect-video w-full flex flex-col items-center justify-center bg-muted gap-2">
                <Video className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">
                  {isLive ? "Stream in arrivo..." : "In attesa dello stream"}
                </p>
              </div>
            )}

            {/* Winner Overlay */}
            <AnimatePresence>
              {winnerOverlay && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                >
                  <div className="text-center text-white space-y-2 p-6">
                    {winnerOverlay.sold ? (
                      <>
                        <Trophy className="h-14 w-14 mx-auto text-yellow-400 drop-shadow-lg" />
                        <p className="text-2xl font-black">VENDUTO!</p>
                        <p className="text-4xl font-black text-primary">€{winnerOverlay.price}</p>
                        {winnerOverlay.name && (
                          <p className="text-lg font-bold text-white/90">🎉 {winnerOverlay.name}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <Gavel className="h-14 w-14 mx-auto text-white/50" />
                        <p className="text-2xl font-black">NON VENDUTO</p>
                        <p className="text-sm text-white/60">Prezzo di riserva non raggiunto</p>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Price + Timer Overlay */}
            {activeItem && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8">
                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] text-white/60 font-medium uppercase tracking-wider">Prezzo attuale</p>
                    <motion.p
                      key={activeItem.current_price}
                      initial={{ scale: 1.3, color: "#22c55e" }}
                      animate={{ scale: 1, color: "#ffffff" }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="text-3xl sm:text-4xl md:text-5xl font-black leading-none text-white"
                    >
                      €{activeItem.current_price}
                    </motion.p>
                    <p className="text-[10px] text-white/50 mt-0.5">
                      {activeItem.bid_count} offerte · Da €{activeItem.starting_price}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {countdown !== null && (
                      <motion.div
                        className={`text-center px-3 py-1.5 rounded-xl ${countdown <= 10 ? "bg-destructive/80 text-white" : "bg-white/20 text-white"} backdrop-blur-sm`}
                      >
                        <Timer className="h-3 w-3 mx-auto mb-0.5" />
                        <p className={`text-xl sm:text-2xl font-black tabular-nums leading-none ${countdown <= 10 ? "animate-pulse" : ""}`}>
                          {countdown}s
                        </p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active Item title */}
          {activeItem && (
            <div className="px-3 py-2 border-b border-border bg-background">
              <h2 className="font-bold text-foreground text-sm truncate">{activeItem.title}</h2>
              {activeItem.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{activeItem.description}</p>}
            </div>
          )}

          {/* No active item */}
          {!activeItem && (
            <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 text-center">
              <Gavel className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm font-semibold text-foreground">
                {isLive ? "In attesa del prossimo lotto..." : isEnded ? "Asta terminata" : "L'asta non è ancora iniziata"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLive ? "Il venditore sta preparando il prossimo prodotto" : isEnded ? `${soldItems.length} prodotti venduti` : "Resta in attesa!"}
              </p>
            </div>
          )}

          {/* Upcoming lots */}
          {pendingItems.length > 0 && isLive && (
            <div className="px-3 py-2 border-b border-border">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                Prossimi <ChevronRight className="h-2.5 w-2.5" />
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {pendingItems.map(item => (
                  <div key={item.id} className="flex-shrink-0 w-16">
                    <div className="aspect-square rounded-lg bg-muted overflow-hidden mb-0.5">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Gavel className="h-4 w-4 text-muted-foreground/30" /></div>
                      )}
                    </div>
                    <p className="text-[10px] font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground">€{item.starting_price}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sold items */}
          {soldItems.length > 0 && (
            <div className="px-3 py-2 border-b border-border">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                🏆 Venduti ({soldItems.length})
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {soldItems.map(item => (
                  <div key={item.id} className="flex-shrink-0 w-16">
                    <div className="aspect-square rounded-lg bg-primary/5 border border-primary/20 overflow-hidden mb-0.5 flex items-center justify-center">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-full h-full object-cover opacity-80" />
                      ) : (
                        <Gavel className="h-4 w-4 text-primary/40" />
                      )}
                    </div>
                    <p className="text-[10px] font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-[10px] text-primary font-bold">€{item.current_price}</p>
                    {item.winner_name && <p className="text-[8px] text-muted-foreground truncate">→ {item.winner_name}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Bid Feed */}
        <div className="lg:w-80 xl:w-96 lg:border-l border-border flex flex-col min-h-0 flex-shrink-0">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-muted/30">
            <h3 className="font-bold text-foreground text-xs flex items-center gap-1.5">
              <Gavel className="h-3.5 w-3.5" /> Offerte Live
            </h3>
            {activeItem && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> {activeItem.bid_count}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto min-h-[120px] max-h-[30vh] lg:max-h-none" ref={feedRef}>
            {activeBids.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[120px] text-muted-foreground text-xs">
                {isLive ? "Fai la prima offerta! 🔥" : "Nessuna offerta"}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                <AnimatePresence>
                  {activeBids.map((bid, i) => (
                    <BidFeedItem key={bid.id} bid={bid} isLatest={i === 0} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== STICKY BOTTOM BID BAR ===== */}
      {isLive && activeItem && (
        <div className="sticky bottom-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border px-3 py-2.5 safe-area-bottom">
          {!user ? (
            <Button
              size="lg"
              className="w-full h-12 text-sm font-black gap-2 rounded-xl"
              onClick={() => setAuthOpen(true)}
            >
              <Lock className="h-4 w-4" />
              Registrati per Partecipare
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Input
                  placeholder="Il tuo nome"
                  value={bidderName}
                  onChange={e => setBidderName(e.target.value)}
                  className="h-9 text-xs flex-1"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="lg"
                  className="flex-1 h-12 text-base font-black gap-1.5 rounded-xl"
                  onClick={() => requireAuth(() => placeBid(minBid))}
                >
                  <ArrowUp className="h-4 w-4" /> €{minBid}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 text-base font-bold rounded-xl px-4"
                  onClick={() => requireAuth(() => placeBid(minBid + 5))}
                >
                  +€5
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 text-base font-bold rounded-xl px-4"
                  onClick={() => requireAuth(() => placeBid(minBid + 10))}
                >
                  +€10
                </Button>
              </div>
              {activeItem.buy_now_price && (
                <Button
                  size="default"
                  variant="secondary"
                  className="w-full h-10 font-bold gap-1.5 rounded-xl text-sm"
                  onClick={() => requireAuth(() => placeBid(activeItem.buy_now_price!))}
                >
                  <ShoppingCart className="h-4 w-4" /> Compra Ora €{activeItem.buy_now_price}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
