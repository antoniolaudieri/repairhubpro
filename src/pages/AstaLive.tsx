import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Gavel, Eye, Trophy, Radio, Timer, ArrowUp, ShoppingCart, Building2 } from "lucide-react";

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
  const feedRef = useRef<HTMLDivElement>(null);

  const activeItem = items.find(i => i.status === "active");
  const minBid = activeItem ? activeItem.current_price + 5 : 0;

  useEffect(() => {
    if (!auctionId) return;
    fetchAuction();

    // Increment viewer count
    supabase.from("live_auctions").select("viewer_count").eq("id", auctionId).single().then(({ data }) => {
      if (data) {
        supabase.from("live_auctions").update({ viewer_count: (data.viewer_count || 0) + 1 } as any).eq("id", auctionId).then(() => {});
      }
    });

    const channel = supabase
      .channel(`public-auction-${auctionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_items", filter: `auction_id=eq.${auctionId}` },
        () => fetchItems()
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auction_bids", filter: `auction_id=eq.${auctionId}` },
        (payload) => {
          const bid = payload.new as BidData;
          setBids(prev => [bid, ...prev.slice(0, 99)]);
          setItems(prev => prev.map(item =>
            item.id === bid.item_id ? { ...item, current_price: bid.amount, bid_count: item.bid_count + 1 } : item
          ));
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_auctions", filter: `id=eq.${auctionId}` },
        (payload) => {
          const updated = payload.new as AuctionData;
          setAuction(prev => prev ? { ...prev, viewer_count: updated.viewer_count, status: updated.status, stream_url: updated.stream_url } : null);
        }
      )
      .subscribe();

    // Decrement viewer on leave
    return () => {
      supabase.from("live_auctions").select("viewer_count").eq("id", auctionId).single().then(({ data }) => {
        if (data) {
          supabase.from("live_auctions").update({ viewer_count: Math.max(0, (data.viewer_count || 1) - 1) } as any).eq("id", auctionId).then(() => {});
        }
      });
      supabase.removeChannel(channel);
    };
  }, [auctionId]);

  // Countdown timer
  useEffect(() => {
    if (!activeItem?.started_at) { setCountdown(null); return; }
    const endTime = new Date(activeItem.started_at).getTime() + activeItem.duration_seconds * 1000;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setCountdown(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeItem?.started_at, activeItem?.duration_seconds]);

  const fetchAuction = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("live_auctions")
      .select("*")
      .eq("id", auctionId!)
      .single();
    if (data) {
      setAuction(data as AuctionData);
      const { data: centroData } = await supabase
        .from("centri_assistenza")
        .select("business_name, logo_url")
        .eq("id", data.centro_id)
        .single();
      if (centroData) setCentro(centroData);
    }
    await fetchItems();
    setLoading(false);
  };

  const fetchItems = async () => {
    const { data } = await supabase
      .from("auction_items")
      .select("*")
      .eq("auction_id", auctionId!)
      .order("created_at", { ascending: true });
    setItems((data as ItemData[]) || []);
  };

  const placeBid = async (amount: number) => {
    if (!user) { toast({ title: "Accedi per fare offerte", description: "Devi essere registrato per partecipare.", variant: "destructive" }); return; }
    if (!activeItem) return;
    const name = bidderName.trim() || user.email?.split("@")[0] || "Anonimo";
    const { error } = await supabase.from("auction_bids").insert({
      item_id: activeItem.id,
      auction_id: auctionId!,
      user_id: user.id,
      bidder_name: name,
      bidder_email: user.email,
      amount,
    });
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    }
  };

  const buyNow = async () => {
    if (!activeItem?.buy_now_price) return;
    await placeBid(activeItem.buy_now_price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Gavel className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Asta non trovata</h1>
          <Link to="/" className="text-primary underline mt-2 inline-block">Torna alla home</Link>
        </div>
      </div>
    );
  }

  const isLive = auction.status === "live";
  const isEnded = auction.status === "ended";
  const soldItems = items.filter(i => i.status === "sold");
  const pendingItems = items.filter(i => i.status === "pending");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className={`sticky top-0 z-50 border-b ${isLive ? "bg-destructive/5 border-destructive/20" : "bg-background border-border"}`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {centro?.logo_url ? (
              <img src={centro.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="h-5 w-5 text-primary" /></div>
            )}
            <div>
              <h1 className="font-bold text-foreground text-lg">{auction.title}</h1>
              <p className="text-sm text-muted-foreground">{centro?.business_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isLive && (
              <Badge className="bg-destructive text-destructive-foreground animate-pulse gap-1">
                <Radio className="h-3 w-3" /> LIVE
              </Badge>
            )}
            {isEnded && <Badge className="bg-secondary text-secondary-foreground">Terminata</Badge>}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" /> {auction.viewer_count}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Main area - Active item */}
          <div className="md:col-span-2 space-y-4">
            {activeItem ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="border-destructive/30 shadow-xl overflow-hidden">
                  {activeItem.image_url && (
                    <div className="h-64 bg-muted">
                      <img src={activeItem.image_url} alt={activeItem.title} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">{activeItem.title}</h2>
                      {activeItem.description && <p className="text-muted-foreground mt-1">{activeItem.description}</p>}
                    </div>

                    {/* Price + Countdown */}
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Prezzo attuale</p>
                        <motion.p
                          key={activeItem.current_price}
                          initial={{ scale: 1.3, color: "hsl(var(--primary))" }}
                          animate={{ scale: 1, color: "hsl(var(--foreground))" }}
                          className="text-4xl font-black"
                        >
                          €{activeItem.current_price}
                        </motion.p>
                        <p className="text-sm text-muted-foreground">{activeItem.bid_count} offerte · Partenza €{activeItem.starting_price}</p>
                      </div>
                      {countdown !== null && (
                        <div className={`text-center px-6 py-3 rounded-2xl ${countdown <= 10 ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>
                          <Timer className="h-5 w-5 mx-auto mb-1" />
                          <p className={`text-3xl font-black tabular-nums ${countdown <= 10 ? "animate-pulse" : ""}`}>{countdown}s</p>
                        </div>
                      )}
                    </div>

                    {/* Bid controls */}
                    {isLive && (
                      <div className="space-y-3">
                        {!user && (
                          <div className="bg-muted rounded-xl p-3 text-center text-sm text-muted-foreground">
                            <Link to="/auth" className="text-primary font-semibold underline">Accedi</Link> per fare offerte
                          </div>
                        )}
                        {user && (
                          <>
                            <Input
                              placeholder="Il tuo nome (opzionale)"
                              value={bidderName}
                              onChange={e => setBidderName(e.target.value)}
                              className="max-w-xs"
                            />
                            <div className="flex items-center gap-2 flex-wrap">
                              <Button size="lg" className="gap-2 text-lg" onClick={() => placeBid(minBid)}>
                                <ArrowUp className="h-5 w-5" /> €{minBid}
                              </Button>
                              <Button size="lg" variant="outline" onClick={() => placeBid(minBid + 5)}>€{minBid + 5}</Button>
                              <Button size="lg" variant="outline" onClick={() => placeBid(minBid + 10)}>€{minBid + 10}</Button>
                              {activeItem.buy_now_price && (
                                <Button size="lg" variant="secondary" className="gap-2 ml-auto" onClick={buyNow}>
                                  <ShoppingCart className="h-5 w-5" /> Compra Ora €{activeItem.buy_now_price}
                                </Button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <Gavel className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-xl font-semibold text-foreground">{isLive ? "In attesa del prossimo prodotto..." : isEnded ? "Asta terminata" : "L'asta non è ancora iniziata"}</p>
                  <p className="text-muted-foreground mt-1">
                    {isLive ? "Il venditore sta preparando il prossimo lotto" : isEnded ? `${soldItems.length} prodotti venduti` : "Resta in attesa, inizierà a breve!"}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Upcoming / Sold items */}
            {(pendingItems.length > 0 || soldItems.length > 0) && (
              <div className="space-y-3">
                {pendingItems.length > 0 && isLive && (
                  <>
                    <h3 className="font-semibold text-foreground text-sm">Prossimi lotti ({pendingItems.length})</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {pendingItems.map(item => (
                        <Card key={item.id} className="opacity-70">
                          <CardContent className="p-3">
                            <p className="font-medium text-sm text-foreground truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground">Da €{item.starting_price}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
                {soldItems.length > 0 && (
                  <>
                    <h3 className="font-semibold text-foreground text-sm flex items-center gap-1"><Trophy className="h-4 w-4 text-primary" /> Venduti ({soldItems.length})</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {soldItems.map(item => (
                        <Card key={item.id} className="bg-primary/5 border-primary/20">
                          <CardContent className="p-3">
                            <p className="font-medium text-sm text-foreground truncate">{item.title}</p>
                            <p className="text-xs text-primary font-bold">€{item.current_price}</p>
                            {item.winner_name && <p className="text-xs text-muted-foreground">→ {item.winner_name}</p>}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Bid feed */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Gavel className="h-5 w-5" /> Offerte Live
            </h3>
            <Card className="h-[500px] overflow-hidden">
              <CardContent className="p-0 h-full overflow-y-auto" ref={feedRef}>
                {bids.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    {isLive ? "Fai la prima offerta!" : "Nessuna offerta"}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    <AnimatePresence>
                      {bids.map(bid => (
                        <motion.div
                          key={bid.id}
                          initial={{ opacity: 0, x: 30, backgroundColor: "hsl(var(--primary) / 0.15)" }}
                          animate={{ opacity: 1, x: 0, backgroundColor: "transparent" }}
                          transition={{ duration: 0.5 }}
                          className="px-4 py-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-foreground">{bid.bidder_name}</span>
                            <span className="font-bold text-primary text-lg">€{bid.amount}</span>
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
    </div>
  );
}
