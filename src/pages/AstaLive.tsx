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
import { motion, AnimatePresence } from "framer-motion";
import { Gavel, Eye, Radio, Timer, ShoppingCart, Building2, Sparkles, Lock, Video, Wifi, WifiOff, Trophy, Send, MessageCircle, Share2, Copy, Check, ExternalLink } from "lucide-react";
import { useWebRTCViewer } from "@/hooks/useWebRTCViewer";
import { QRCodeSVG } from "qrcode.react";

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

interface ChatMessage {
  id: string;
  auction_id: string;
  sender_name: string;
  message: string;
  created_at: string;
  user_id: string | null;
}

// Feed item: either a bid or a chat message
type FeedItem = 
  | { type: "bid"; data: BidData }
  | { type: "chat"; data: ChatMessage };

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

// --- Feed Bubble (chat or bid) ---
function FeedBubble({ item }: { item: FeedItem }) {
  if (item.type === "bid") {
    const bid = item.data;
    const initials = bid.bidder_name.slice(0, 2).toUpperCase();
    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="flex items-center gap-2 px-2.5 py-1"
      >
        <div className="h-6 w-6 rounded-full bg-green-500/30 flex items-center justify-center flex-shrink-0">
          <span className="text-[9px] font-bold text-green-300">{initials}</span>
        </div>
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-3 py-1.5 flex items-center gap-2">
          <span className="font-semibold text-xs text-white/90">{bid.bidder_name}</span>
          <span className="font-black text-sm tabular-nums text-green-400">€{bid.amount}</span>
        </div>
      </motion.div>
    );
  }

  const chat = item.data;
  const initials = chat.sender_name.slice(0, 1).toUpperCase();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="flex items-start gap-2 px-2.5 py-1"
    >
      <div className="h-6 w-6 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-[9px] font-bold text-white/70">{initials}</span>
      </div>
      <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-3 py-1.5 max-w-[85%]">
        <span className="font-semibold text-xs text-white/70">{chat.sender_name}</span>
        <p className="text-xs text-white/90 leading-snug">{chat.message}</p>
      </div>
    </motion.div>
  );
}

// --- Tap to Bid Button ---
function TapBidButton({ amount, onBid }: { amount: number; onBid: () => void }) {
  const [confirmed, setConfirmed] = useState(false);

  const handleTap = () => {
    if (confirmed) return;
    onBid();
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 1200);
  };

  return (
    <motion.button
      onClick={handleTap}
      whileTap={{ scale: 0.95 }}
      className={`relative h-14 rounded-2xl flex-1 font-black text-base transition-colors overflow-hidden ${
        confirmed
          ? "bg-green-500 text-white"
          : "bg-yellow-400 hover:bg-yellow-300 text-black active:bg-yellow-500"
      }`}
    >
      <AnimatePresence mode="wait">
        {confirmed ? (
          <motion.span
            key="ok"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-1.5"
          >
            ✓ Offerta inviata!
          </motion.span>
        ) : (
          <motion.span
            key="bid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-1.5"
          >
            <Gavel className="h-4 w-4" /> Offri €{amount}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// --- Custom Bid Dialog ---
function CustomBidDialog({ open, onOpenChange, minBid, onBid }: { open: boolean; onOpenChange: (v: boolean) => void; minBid: number; onBid: (amount: number) => void }) {
  const [customAmount, setCustomAmount] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(customAmount);
    if (amount >= minBid) {
      onBid(amount);
      onOpenChange(false);
      setCustomAmount("");
    } else {
      toast({ title: "Offerta troppo bassa", description: `L'offerta minima è €${minBid}`, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-xs rounded-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-black">Offerta Personalizzata</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-xs text-muted-foreground">Offerta minima: €{minBid}</p>
          <Input
            type="number"
            placeholder={`€${minBid}`}
            value={customAmount}
            onChange={e => setCustomAmount(e.target.value)}
            className="h-12 text-lg font-bold text-center"
            min={minBid}
            step="1"
            autoFocus
          />
          <Button type="submit" className="w-full h-12 font-bold text-base" disabled={!customAmount || parseFloat(customAmount) < minBid}>
            Offri €{customAmount || minBid}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Share Dialog ---
function AuctionShareDialog({
  open,
  onOpenChange,
  auctionUrl,
  centroName,
  auctionTitle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  auctionUrl: string;
  centroName: string;
  auctionTitle: string;
}) {
  const [copied, setCopied] = useState(false);

  const shareText = `🔴 LIVE ORA! ${centroName} sta vendendo all'asta! Partecipa →`;
  const fullShareText = `${shareText} ${auctionUrl}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(auctionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `🔴 ${auctionTitle} - LIVE`, text: shareText, url: auctionUrl });
      } catch {}
    }
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fullShareText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(auctionUrl)}&text=${encodeURIComponent(shareText)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(auctionUrl)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] sm:max-w-sm p-0 overflow-hidden rounded-3xl border-0 bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a]">
        <div className="relative px-6 pt-6 pb-4">
          {/* Live badge */}
          <div className="flex justify-center mb-4">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex items-center gap-2 bg-red-600/90 px-4 py-1.5 rounded-full"
            >
              <Radio className="h-3.5 w-3.5 text-white animate-pulse" />
              <span className="text-white font-black text-xs tracking-wider">LIVE NOW</span>
            </motion.div>
          </div>

          {/* Large QR */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mx-auto w-fit p-4 bg-white rounded-2xl shadow-2xl shadow-white/10 mb-4"
          >
            <QRCodeSVG
              value={auctionUrl}
              size={180}
              level="H"
            />
          </motion.div>

          <p className="text-center text-white/60 text-xs font-medium mb-5">
            Scansiona il QR per entrare nell'asta
          </p>

          {/* Centro + Auction info */}
          <div className="text-center mb-5">
            <p className="text-white font-black text-sm">{centroName}</p>
            <p className="text-white/50 text-xs mt-0.5">{auctionTitle}</p>
          </div>

          {/* Copy link */}
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white rounded-xl py-3 text-sm font-bold transition-all active:scale-[0.98] mb-3"
          >
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            {copied ? "Link copiato!" : "Copia Link"}
          </button>

          {/* Social share buttons */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 bg-[#25D366]/15 hover:bg-[#25D366]/25 rounded-xl py-3 transition-all active:scale-95"
            >
              <div className="h-9 w-9 rounded-full bg-[#25D366] flex items-center justify-center">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <span className="text-[10px] font-bold text-white/70">WhatsApp</span>
            </a>
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 bg-[#0088cc]/15 hover:bg-[#0088cc]/25 rounded-xl py-3 transition-all active:scale-95"
            >
              <div className="h-9 w-9 rounded-full bg-[#0088cc] flex items-center justify-center">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <span className="text-[10px] font-bold text-white/70">Telegram</span>
            </a>
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 bg-white/5 hover:bg-white/10 rounded-xl py-3 transition-all active:scale-95"
            >
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <span className="text-[10px] font-bold text-white/70">X</span>
            </a>
          </div>

          {/* Native share (mobile) */}
          {typeof navigator !== "undefined" && navigator.share && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl py-3 text-sm font-black transition-all active:scale-[0.98] hover:opacity-90"
            >
              <Share2 className="h-4 w-4" />
              Condividi
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [bidderName, setBidderName] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [customBidOpen, setCustomBidOpen] = useState(false);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [presenceCount, setPresenceCount] = useState(0);
  const [winnerOverlay, setWinnerOverlay] = useState<{ name: string | null; price: number; sold: boolean } | null>(null);

  const isCameraStream = auction?.stream_url?.startsWith("camera:");
  const { remoteStream, connectionState } = useWebRTCViewer(auctionId || "", !!isCameraStream);
  const activeItem = items.find(i => i.status === "active");
  const minBid = activeItem ? activeItem.current_price + 5 : 0;
  const isLive = auction?.status === "live";
  const isEnded = auction?.status === "ended";

  // Combined feed: bids + chat sorted by time (newest first)
  const feedItems: FeedItem[] = [
    ...bids.filter(b => activeItem ? b.item_id === activeItem.id : true).map(b => ({ type: "bid" as const, data: b })),
    ...chatMessages.map(c => ({ type: "chat" as const, data: c })),
  ].sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime()).slice(0, 20);

  // Leading bidder
  const activeBids = activeItem ? bids.filter(b => b.item_id === activeItem.id) : [];
  const leadingBidder = activeBids.length > 0 ? activeBids[0] : null;

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

  const fetchChat = useCallback(async () => {
    if (!auctionId) return;
    const { data } = await supabase
      .from("auction_chat_messages")
      .select("*")
      .eq("auction_id", auctionId)
      .order("created_at", { ascending: false })
      .limit(50);
    setChatMessages((data as ChatMessage[]) || []);
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
    await Promise.all([fetchItems(), fetchBids(), fetchChat()]);
    setLoading(false);
  }, [auctionId, fetchItems, fetchBids, fetchChat]);

  useEffect(() => {
    if (!auctionId) return;
    fetchAuction();

    // Presence
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auction_chat_messages", filter: `auction_id=eq.${auctionId}` }, (payload) => {
        const msg = payload.new as ChatMessage;
        setChatMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [msg, ...prev.slice(0, 49)];
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_auctions", filter: `id=eq.${auctionId}` }, (payload) => {
        setAuction(payload.new as AuctionData);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(channel);
    };
  }, [auctionId, fetchAuction, fetchItems, fetchBids, fetchChat]);

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
      video.muted = true;
      void video.play().catch(() => {});
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

  const sendChat = async () => {
    if (!user || !chatInput.trim()) return;
    const name = bidderName.trim() || user.email?.split("@")[0] || "Anonimo";
    const { error } = await supabase.from("auction_chat_messages").insert({
      auction_id: auctionId!, user_id: user.id,
      sender_name: name, message: chatInput.trim(),
    });
    if (!error) setChatInput("");
    else toast({ title: "Errore", description: error.message, variant: "destructive" });
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

  return (
    <div className="h-[100dvh] w-full relative overflow-hidden bg-black">
      <InlineAuthDialog open={authOpen} onOpenChange={setAuthOpen} onSuccess={() => setAuthOpen(false)} />
      <CustomBidDialog open={customBidOpen} onOpenChange={setCustomBidOpen} minBid={minBid} onBid={(amount) => requireAuth(() => placeBid(amount))} />

      {/* ===== FULLSCREEN VIDEO BACKGROUND ===== */}
      <div className="absolute inset-0 z-0">
        {isCameraStream ? (
          remoteStream ? (
            <>
              <video ref={cameraVideoRef} autoPlay playsInline muted={isMuted} className="w-full h-full object-cover" />
              {isMuted && (
                <button
                  onClick={() => { setIsMuted(false); if (cameraVideoRef.current) cameraVideoRef.current.muted = false; }}
                  className="absolute top-16 right-3 z-10 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
                >
                  🔇 Tocca per audio
                </button>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/60 gap-2">
              <Video className="h-10 w-10 opacity-40 animate-pulse" />
              <p className="text-xs font-medium text-white/70">
                {connectionState === "connecting" ? "Connessione..." : "In attesa della diretta..."}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-white/40">
                {connectionState === "connected" ? <Wifi className="h-2.5 w-2.5 text-green-400" /> : <WifiOff className="h-2.5 w-2.5" />}
                <span>{connectionState === "connected" ? "Connesso" : "In attesa"}</span>
              </div>
            </div>
          )
        ) : auction.stream_url ? (
          <iframe
            src={convertToEmbedUrl(auction.stream_url)}
            className="w-full h-full border-0"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : activeItem?.image_url ? (
          <img src={activeItem.image_url} alt={activeItem.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Video className="h-12 w-12 text-white/20" />
            <p className="text-xs text-white/40">{isLive ? "Stream in arrivo..." : "In attesa dello stream"}</p>
          </div>
        )}
      </div>

      {/* ===== HEADER OVERLAY ===== */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 via-black/30 to-transparent px-3 pt-3 pb-10 safe-area-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {centro?.logo_url ? (
              <img src={centro.logo_url} alt="" className="h-8 w-8 rounded-full object-cover flex-shrink-0 border border-white/20" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-4 w-4 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-white text-xs truncate leading-tight">{centro?.business_name}</p>
              <p className="text-[10px] text-white/60 truncate">{auction.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isLive && (
              <Badge className="bg-red-600 text-white border-0 animate-pulse gap-1 text-[10px] px-2 py-0.5 h-5">
                <Radio className="h-2.5 w-2.5" /> LIVE
              </Badge>
            )}
            {isEnded && <Badge className="bg-white/20 text-white border-0 text-[10px] h-5">Terminata</Badge>}
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
              <Eye className="h-3 w-3 text-white/80" />
              <motion.span key={presenceCount} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="font-bold text-white text-[11px]">
                {presenceCount}
              </motion.span>
            </div>
          </div>
        </div>

        {/* Countdown */}
        {activeItem && countdown !== null && (
          <div className="absolute top-14 right-3">
            <motion.div
              className={`text-center px-3 py-1.5 rounded-xl backdrop-blur-sm ${countdown <= 10 ? "bg-red-600/80 text-white" : "bg-black/40 text-white"}`}
            >
              <Timer className="h-3 w-3 mx-auto mb-0.5" />
              <p className={`text-xl font-black tabular-nums leading-none ${countdown <= 10 ? "animate-pulse" : ""}`}>
                {countdown}s
              </p>
            </motion.div>
          </div>
        )}
      </div>

      {/* ===== WINNER OVERLAY ===== */}
      <AnimatePresence>
        {winnerOverlay && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <div className="text-center text-white space-y-3 p-6">
              {winnerOverlay.sold ? (
                <>
                  <Trophy className="h-16 w-16 mx-auto text-yellow-400 drop-shadow-lg" />
                  <p className="text-3xl font-black">VENDUTO!</p>
                  <p className="text-5xl font-black text-green-400">€{winnerOverlay.price}</p>
                  {winnerOverlay.name && <p className="text-xl font-bold text-white/90">🎉 {winnerOverlay.name}</p>}
                </>
              ) : (
                <>
                  <Gavel className="h-16 w-16 mx-auto text-white/50" />
                  <p className="text-3xl font-black">NON VENDUTO</p>
                  <p className="text-sm text-white/60">Prezzo di riserva non raggiunto</p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== CHAT + BID FEED (left side overlay) ===== */}
      <div className="absolute left-0 bottom-[280px] z-20 w-[80%] max-w-[340px] max-h-[30vh] overflow-hidden pointer-events-none">
        <div className="flex flex-col-reverse">
          <AnimatePresence>
            {feedItems.slice(0, 15).map((item) => (
              <FeedBubble key={item.data.id} item={item} />
            ))}
          </AnimatePresence>
        </div>
        {feedItems.length === 0 && isLive && (
          <div className="px-3 py-2">
            <span className="bg-black/40 backdrop-blur-sm rounded-2xl px-3 py-1.5 text-xs text-white/50">
              Scrivi qualcosa o fai un'offerta! 🔥
            </span>
          </div>
        )}
      </div>

      {/* ===== BOTTOM AREA ===== */}
      <div className="absolute bottom-0 left-0 right-0 z-30 safe-area-bottom">

        {/* "Say something..." chat input */}
        {isLive && (
          <div className="mx-3 mb-2">
            {user ? (
              <form
                onSubmit={e => { e.preventDefault(); sendChat(); }}
                className="flex items-center gap-2"
              >
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Say something..."
                    className="w-full h-9 bg-black/30 backdrop-blur-sm border border-white/15 rounded-full px-4 pr-10 text-xs text-white placeholder:text-white/40 outline-none focus:border-white/30"
                  />
                  {chatInput.trim() && (
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
                      <Send className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="w-full h-9 bg-black/30 backdrop-blur-sm border border-white/15 rounded-full px-4 text-xs text-white/40 text-left flex items-center gap-2"
              >
                <MessageCircle className="h-3.5 w-3.5" /> Accedi per commentare...
              </button>
            )}
          </div>
        )}

        {/* "is winning!" banner */}
        <AnimatePresence>
          {leadingBidder && activeItem && !winnerOverlay && (
            <motion.div
              key={leadingBidder.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mx-3 mb-2 flex items-center gap-2"
            >
              <div className="h-5 w-5 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                <span className="text-[8px] font-black text-black">{leadingBidder.bidder_name.slice(0, 1).toUpperCase()}</span>
              </div>
              <span className="text-white text-xs font-bold">
                {leadingBidder.bidder_name} is <span className="text-yellow-400 font-black">winning!</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Winner bar */}
        <AnimatePresence>
          {winnerOverlay && winnerOverlay.sold && winnerOverlay.name && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mx-3 mb-2 flex items-center gap-2"
            >
              <div className="h-5 w-5 rounded-full bg-green-400 flex items-center justify-center flex-shrink-0">
                <span className="text-[8px] font-black text-black">{winnerOverlay.name.slice(0, 1).toUpperCase()}</span>
              </div>
              <span className="text-white text-xs font-bold">
                {winnerOverlay.name} <span className="text-green-400 font-black">won!</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Product card */}
        {activeItem && (
          <div className="mx-3 mb-2 bg-black/50 backdrop-blur-xl rounded-xl p-2.5 flex items-center gap-3">
            {activeItem.image_url ? (
              <img src={activeItem.image_url} alt="" className="h-14 w-14 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Gavel className="h-5 w-5 text-white/40" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold truncate">{activeItem.title}</p>
              <p className="text-[10px] text-white/50 mt-0.5">{activeItem.bid_count} offerte</p>
            </div>
            <div className="text-right flex-shrink-0">
              <motion.p
                key={activeItem.current_price}
                initial={{ scale: 1.2, color: "#4ade80" }}
                animate={{ scale: 1, color: "#ffffff" }}
                className="text-lg font-black text-white"
              >
                €{activeItem.current_price}
              </motion.p>
              {countdown !== null && (
                <p className={`text-[10px] font-bold tabular-nums ${countdown <= 10 ? "text-red-400 animate-pulse" : "text-white/50"}`}>
                  ⏱ {String(Math.floor(countdown / 60)).padStart(2, "0")}:{String(countdown % 60).padStart(2, "0")}
                </p>
              )}
              {activeItem.status === "sold" && <span className="text-[10px] font-black text-red-400">Sold</span>}
            </div>
          </div>
        )}

        {/* No active item / ended */}
        {!activeItem && (
          <div className="mx-3 mb-2">
            {isEnded ? (
              <div className="bg-white/10 backdrop-blur-xl rounded-xl px-4 py-3 text-center">
                <p className="text-white/70 text-sm font-bold">Auction Ended</p>
              </div>
            ) : (
              <div className="bg-black/50 backdrop-blur-xl rounded-xl px-4 py-3 text-center">
                <p className="text-white/70 text-xs font-semibold">
                  {isLive ? "In attesa del prossimo lotto..." : "L'asta non è ancora iniziata"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Bid controls: Custom + Swipe-to-Bid */}
        {isLive && activeItem && (
          <div className="bg-black/60 backdrop-blur-xl px-3 py-3 border-t border-white/10">
            {!user ? (
              <Button
                size="lg"
                className="w-full h-14 text-sm font-black gap-2 rounded-2xl bg-white text-black hover:bg-white/90"
                onClick={() => setAuthOpen(true)}
              >
                <Lock className="h-4 w-4" />
                Registrati per Partecipare
              </Button>
            ) : (
              <div className="space-y-2">
                {/* Name input (first time) */}
                {!bidderName && (
                  <Input
                    placeholder="Il tuo nome"
                    value={bidderName}
                    onChange={e => setBidderName(e.target.value)}
                    className="h-9 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                  />
                )}
                <div className="flex items-center gap-2">
                  {/* Custom bid button */}
                  <button
                    onClick={() => requireAuth(() => setCustomBidOpen(true))}
                    className="h-14 px-5 rounded-2xl bg-white/10 border-2 border-white/20 text-white font-bold text-sm flex-shrink-0 hover:bg-white/15 active:scale-95 transition-all"
                  >
                    Custom
                  </button>
                  {/* Tap to bid */}
                  <TapBidButton amount={minBid} onBid={() => requireAuth(() => placeBid(minBid))} />
                </div>
                {/* Buy Now */}
                {activeItem.buy_now_price && (
                  <Button
                    size="default"
                    className="w-full h-10 font-bold gap-1.5 rounded-xl text-sm bg-yellow-500 hover:bg-yellow-400 text-black"
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
    </div>
  );
}
