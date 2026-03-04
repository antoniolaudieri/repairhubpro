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
  ShoppingBag, Phone, Truck, CheckCircle2, XCircle, TrendingUp, Percent, Zap,
  Camera, Upload, X, Smartphone, Palette, HardDrive, Tag, Star, Image as ImageIcon
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
  cover_url: string | null;
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

const CONDITION_OPTIONS = [
  { value: "nuovo", label: "Nuovo", color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  { value: "come_nuovo", label: "Come Nuovo", color: "bg-green-500/15 text-green-700 border-green-500/30" },
  { value: "ottimo", label: "Ottimo", color: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
  { value: "buono", label: "Buono", color: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  { value: "discreto", label: "Discreto", color: "bg-orange-500/15 text-orange-700 border-orange-500/30" },
  { value: "da_riparare", label: "Da Riparare", color: "bg-red-500/15 text-red-700 border-red-500/30" },
];

// ======= Animated Counter Component =======
function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;
    if (from === to) return;
    const steps = 20;
    const increment = (to - from) / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      if (step >= steps) {
        setDisplayed(to);
        clearInterval(timer);
      } else {
        setDisplayed(Math.round(from + increment * step));
      }
    }, 30);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{prefix}{displayed}{suffix}</span>;
}

// ======= Circular Countdown Component =======
function CircularCountdown({ item }: { item: AuctionItem }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!item.started_at) return;
    const endTime = new Date(item.started_at).getTime() + item.duration_seconds * 1000;
    const tick = () => setRemaining(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [item.started_at, item.duration_seconds]);

  const total = item.duration_seconds;
  const progress = total > 0 ? remaining / total : 0;
  const isUrgent = remaining <= 10;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={isUrgent ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
          strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
          style={{ filter: isUrgent ? "drop-shadow(0 0 8px hsl(var(--destructive) / 0.6))" : "drop-shadow(0 0 6px hsl(var(--primary) / 0.4))" }}
        />
      </svg>
      <div className={`absolute inset-0 flex flex-col items-center justify-center ${isUrgent ? "text-destructive" : "text-foreground"}`}>
        <span className={`text-2xl sm:text-3xl font-black tabular-nums leading-none ${isUrgent ? "animate-pulse" : ""}`}>
          {mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : secs}
        </span>
        <span className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wider">sec</span>
      </div>
    </div>
  );
}

// ======= Parse structured description =======
function parseProductDetails(description: string | null): Record<string, string> {
  if (!description) return {};
  const details: Record<string, string> = {};
  const lines = description.split("\n");
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      details[match[1].trim().toLowerCase()] = match[2].trim();
    }
  }
  return details;
}

function buildDescription(fields: { brand: string; model: string; condition: string; color: string; storage: string; accessories: string; notes: string }): string {
  const lines: string[] = [];
  if (fields.brand) lines.push(`Brand: ${fields.brand}`);
  if (fields.model) lines.push(`Modello: ${fields.model}`);
  if (fields.condition) lines.push(`Condizione: ${fields.condition}`);
  if (fields.color) lines.push(`Colore: ${fields.color}`);
  if (fields.storage) lines.push(`Storage: ${fields.storage}`);
  if (fields.accessories) lines.push(`Accessori: ${fields.accessories}`);
  if (fields.notes) lines.push(`Note: ${fields.notes}`);
  return lines.join("\n");
}

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
  const [itemStartingPrice, setItemStartingPrice] = useState("");
  const [itemBuyNowPrice, setItemBuyNowPrice] = useState("");
  const [itemReservePrice, setItemReservePrice] = useState("");
  const [itemDuration, setItemDuration] = useState("60");
  // New product detail fields
  const [itemBrand, setItemBrand] = useState("");
  const [itemModel, setItemModel] = useState("");
  const [itemCondition, setItemCondition] = useState("");
  const [itemColor, setItemColor] = useState("");
  const [itemStorage, setItemStorage] = useState("");
  const [itemAccessories, setItemAccessories] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [itemImagePreview, setItemImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [autoCloseTriggered, setAutoCloseTriggered] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sales, setSales] = useState<AuctionSale[]>([]);
  const [salesFilter, setSalesFilter] = useState("all");
  const feedEndRef = useRef<HTMLDivElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll feed
  useEffect(() => {
    if (feedContainerRef.current) {
      feedContainerRef.current.scrollTop = 0;
    }
  }, [liveBids.length, chatMessages.length]);

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
          // Update local state immediately with bid amount
          // Update local state immediately with bid info
          setAuctionItems(prev => prev.map(item =>
            item.id === bid.item_id ? { ...item, current_price: Math.max(item.current_price, bid.amount), bid_count: item.bid_count + 1 } : item
          ));
          // DB trigger will also fire an auction_items UPDATE which the other handler picks up
        }
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auction_chat_messages", filter: `auction_id=eq.${selectedAuction.id}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setChatMessages(prev => prev.some(m => m.id === msg.id) ? prev : [msg, ...prev]);
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_items", filter: `auction_id=eq.${selectedAuction.id}` },
        (payload) => {
          // Use payload.new directly to update state instead of re-fetching
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const updated = payload.new as AuctionItem;
            setAuctionItems(prev => {
              const exists = prev.some(i => i.id === updated.id);
              if (exists) {
                return prev.map(i => i.id === updated.id ? { ...i, ...updated } : i);
              } else {
                return [...prev, updated];
              }
            });
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as any;
            setAuctionItems(prev => prev.filter(i => i.id !== deleted.id));
          }
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_auctions", filter: `id=eq.${selectedAuction.id}` },
        (payload) => {
          const updated = payload.new as Auction;
          setSelectedAuction(updated);
          setAuctions(prev => prev.map(a => a.id === updated.id ? updated : a));
        }
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auction_sales", filter: `auction_id=eq.${selectedAuction.id}` },
        () => fetchSales(selectedAuction.id)
      )
      .subscribe();

    // Polling fallback: 3s during live
    const isLive = selectedAuction.status === "live";
    const pollInterval = isLive ? setInterval(() => {
      fetchItems(selectedAuction.id);
      fetchChatMessages(selectedAuction.id);
      fetchSales(selectedAuction.id);
    }, 3000) : null;

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
    // Merge fetched data preserving higher local current_price from realtime bids
    setAuctionItems(prev => {
      const fetched = (items as AuctionItem[]) || [];
      return fetched.map(fi => {
        const existing = prev.find(p => p.id === fi.id);
        // Keep the higher price between local and fetched
        if (existing && existing.current_price > fi.current_price) {
          return { ...fi, current_price: existing.current_price, bid_count: Math.max(fi.bid_count, existing.bid_count) };
        }
        return fi;
      });
    });
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

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File troppo grande", description: "Max 10MB", variant: "destructive" });
      return;
    }
    setCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadCover = async (auctionId: string): Promise<string | null> => {
    if (!coverFile) return null;
    setUploadingCover(true);
    try {
      const ext = coverFile.name.split(".").pop() || "jpg";
      const path = `covers/${auctionId}.${ext}`;
      const { error } = await supabase.storage.from("auction-images").upload(path, coverFile, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("auction-images").getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err: any) {
      toast({ title: "Errore upload copertina", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setUploadingCover(false);
    }
  };

  const createAuction = async () => {
    if (!centroId || !newTitle.trim()) return;
    const { data, error } = await supabase.from("live_auctions").insert({
      centro_id: centroId, title: newTitle.trim(),
      description: newDescription.trim() || null,
      scheduled_at: newScheduledAt || null, status: "scheduled" as any,
    }).select("id").single();
    if (error || !data) { toast({ title: "Errore", description: error?.message || "Errore sconosciuto", variant: "destructive" }); return; }

    // Upload cover if selected
    if (coverFile) {
      const coverUrl = await uploadCover(data.id);
      if (coverUrl) {
        await supabase.from("live_auctions").update({ cover_url: coverUrl } as any).eq("id", data.id);
      }
    }

    toast({ title: "Asta creata!" });
    setCreateOpen(false); setNewTitle(""); setNewDescription(""); setNewScheduledAt("");
    setCoverFile(null); setCoverPreview("");
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

  // Image upload handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File troppo grande", description: "Max 10MB", variant: "destructive" });
      return;
    }
    setItemImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setItemImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!itemImageFile) return null;
    setUploadingImage(true);
    try {
      const ext = itemImageFile.name.split(".").pop() || "jpg";
      const path = `${centroId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("auction-images").upload(path, itemImageFile, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("auction-images").getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err: any) {
      toast({ title: "Errore upload", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const resetItemForm = () => {
    setItemTitle(""); setItemStartingPrice(""); setItemBuyNowPrice(""); setItemReservePrice(""); setItemDuration("60");
    setItemBrand(""); setItemModel(""); setItemCondition(""); setItemColor(""); setItemStorage("");
    setItemAccessories(""); setItemNotes(""); setItemImageFile(null); setItemImagePreview("");
  };

  const addItem = async () => {
    if (!selectedAuction || !centroId || !itemTitle.trim()) return;
    const startPrice = parseFloat(itemStartingPrice) || 0;

    // Upload image first if present
    let imageUrl: string | null = null;
    if (itemImageFile) {
      imageUrl = await uploadImage();
    }

    const description = buildDescription({
      brand: itemBrand, model: itemModel, condition: itemCondition,
      color: itemColor, storage: itemStorage, accessories: itemAccessories, notes: itemNotes,
    });

    const { error } = await supabase.from("auction_items").insert({
      auction_id: selectedAuction.id, centro_id: centroId, title: itemTitle.trim(),
      description: description || null, starting_price: startPrice, current_price: startPrice,
      image_url: imageUrl,
      buy_now_price: itemBuyNowPrice ? parseFloat(itemBuyNowPrice) : null,
      reserve_price: itemReservePrice ? parseFloat(itemReservePrice) : null,
      duration_seconds: parseInt(itemDuration) || 60, status: "pending" as any,
    });
    if (error) { toast({ title: "Errore", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Prodotto aggiunto!" });
    setAddItemOpen(false);
    resetItemForm();
    fetchItems(selectedAuction.id);
  };

  const activateItem = async (item: AuctionItem) => {
    await supabase.from("auction_items").update({ status: "unsold" as any, ended_at: new Date().toISOString() }).eq("auction_id", item.auction_id).eq("status", "active" as any);
    const { error } = await supabase.from("auction_items").update({ status: "active" as any, started_at: new Date().toISOString() }).eq("id", item.id);
    if (error) { toast({ title: "Errore", description: error.message, variant: "destructive" }); return; }
    fetchItems(item.auction_id);
  };

  const closeItem = async (item: AuctionItem, sold: boolean) => {
    const { data: freshItem, error: freshItemError } = await supabase.from("auction_items").select("*").eq("id", item.id).maybeSingle();
    if (freshItemError) console.error("[closeItem] Error fetching fresh item:", freshItemError);
    const itemData = freshItem || item;
    
    const { data: allBids, error: bidsError } = await supabase
      .from("auction_bids").select("*").eq("item_id", item.id)
      .order("amount", { ascending: false }).limit(10);
    
    if (bidsError) console.error("[closeItem] Error fetching bids:", bidsError);
    
    const topBid = allBids && allBids.length > 0 ? allBids[0] : null;
    const hasBids = !!topBid;
    const actualPrice = topBid ? topBid.amount : (itemData as any).current_price || 0;
    
    const reservePrice = (itemData as any).reserve_price as number | null;
    const reserveMet = !reservePrice || actualPrice >= reservePrice;
    const finalSold = sold && reserveMet && hasBids;

    const update: any = { status: finalSold ? "sold" : "unsold", ended_at: new Date().toISOString(), current_price: actualPrice };
    if (finalSold && topBid) {
      update.winner_name = topBid.bidder_name;
      update.winner_email = topBid.bidder_email;
      update.winner_user_id = topBid.user_id;
    }
    const { error: updateError } = await supabase.from("auction_items").update(update).eq("id", item.id);
    if (updateError) console.error("[closeItem] Error updating item:", updateError);

    if (finalSold && centroId && selectedAuction) {
      const { error: saleError } = await supabase.from("auction_sales").insert({
        auction_id: selectedAuction.id, auction_item_id: item.id, centro_id: centroId,
        product_title: item.title, product_description: item.description,
        sale_price: actualPrice, winner_name: update.winner_name || "N/A",
        winner_email: update.winner_email || null,
        fulfillment_status: "pending" as any, sold_at: new Date().toISOString(),
      });
      if (saleError) console.error("[closeItem] Error creating sale:", saleError);
      fetchSales(selectedAuction.id);
      toast({ title: `🏆 Venduto a ${update.winner_name || "N/A"}!`, description: `Prezzo finale: €${actualPrice}` });
    } else if (sold && !hasBids) {
      toast({ title: "Nessuna offerta", description: "Nessuna offerta ricevuta per questo articolo." });
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
  const sellRate = auctionItems.length > 0 ? Math.round((soldItems.length / auctionItems.length) * 100) : 0;
  const avgBid = liveBids.length > 0 ? Math.round(liveBids.reduce((s, b) => s + b.amount, 0) / liveBids.length) : 0;

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

  // Helper to get condition badge
  const ConditionBadge = ({ condition }: { condition: string }) => {
    const opt = CONDITION_OPTIONS.find(o => o.value === condition);
    if (!opt) return <Badge variant="outline" className="text-[10px]">{condition}</Badge>;
    return <Badge variant="outline" className={`${opt.color} text-[10px]`}>{opt.label}</Badge>;
  };

  // Get details from item description
  const getItemDetails = (item: AuctionItem) => parseProductDetails(item.description);

  return (
    <CentroLayout>
      <PageTransition>
        <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2.5">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Gavel className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                </div>
                Aste Live
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 ml-[52px]">Gestisci le tue aste in diretta</p>
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
            <div className="grid gap-3 sm:gap-4">
              {loading ? (
                <div className="text-center py-16 text-muted-foreground text-sm">Caricamento...</div>
              ) : auctions.length === 0 ? (
                <Card className="border-dashed"><CardContent className="py-12 sm:py-16 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Gavel className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">Nessuna asta. Crea la tua prima asta live!</p>
                </CardContent></Card>
              ) : (
                auctions.map((auction, i) => (
                  <motion.div key={auction.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card className="hover:shadow-md transition-all cursor-pointer active:scale-[0.99]" onClick={() => setSelectedAuction(auction)}>
                      <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            auction.status === "live" ? "bg-destructive/10" : "bg-primary/10"
                          }`}>
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
            <div className="space-y-5 sm:space-y-6">
              {/* Back + Title */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => { setSelectedAuction(null); setAuctionItems([]); setLiveBids([]); setSales([]); }}>
                  ← Indietro
                </Button>
                <h2 className="text-base sm:text-lg font-bold text-foreground truncate">{selectedAuction.title}</h2>
                {statusBadge(selectedAuction.status)}
                {selectedAuction.status === "live" && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                    </span>
                    <span className="text-xs font-medium text-destructive">LIVE</span>
                  </div>
                )}
              </div>

              {/* ===== PREMIUM STATS CARDS ===== */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                {[
                  { label: "Prodotti", value: auctionItems.length, icon: Package, gradient: "from-primary/15 to-primary/5", iconBg: "bg-primary/15", iconColor: "text-primary" },
                  { label: "Venduti", value: soldItems.length, icon: Trophy, gradient: "from-success/15 to-success/5", iconBg: "bg-success/15", iconColor: "text-success" },
                  { label: "Incasso", value: totalRevenue, icon: DollarSign, gradient: "from-info/15 to-info/5", iconBg: "bg-info/15", iconColor: "text-info", prefix: "€" },
                  { label: "Spettatori", value: selectedAuction.viewer_count, icon: Eye, gradient: "from-warning/15 to-warning/5", iconBg: "bg-warning/15", iconColor: "text-warning" },
                  { label: "Sell Rate", value: sellRate, icon: Percent, gradient: "from-accent/15 to-accent/5", iconBg: "bg-accent/15", iconColor: "text-accent-foreground", suffix: "%" },
                  { label: "Media Offerta", value: avgBid, icon: TrendingUp, gradient: "from-primary/10 to-info/5", iconBg: "bg-primary/10", iconColor: "text-primary", prefix: "€" },
                ].map((stat) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                    <Card className={`bg-gradient-to-br ${stat.gradient} border-border/50 backdrop-blur-sm overflow-hidden relative group hover:shadow-md transition-all`}>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg ${stat.iconBg} transition-transform group-hover:scale-110`}>
                            <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.iconColor}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-lg sm:text-xl font-black text-foreground leading-none tabular-nums">
                              <AnimatedNumber value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">{stat.label}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
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

                {/* ===== ENHANCED ADD PRODUCT DIALOG ===== */}
                <Dialog open={addItemOpen} onOpenChange={(open) => { setAddItemOpen(open); if (!open) resetItemForm(); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5 ml-auto" disabled={selectedAuction.status === "ended"}>
                      <Plus className="h-4 w-4" /> Prodotto
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                          <Package className="h-4 w-4 text-primary-foreground" />
                        </div>
                        Aggiungi Prodotto
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Image Upload */}
                      <div>
                        <Label className="text-xs font-medium flex items-center gap-1.5 mb-2">
                          <Camera className="h-3.5 w-3.5" /> Foto Prodotto
                        </Label>
                        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                        {!itemImagePreview ? (
                          <div
                            onClick={() => imageInputRef.current?.click()}
                            className="border-2 border-dashed border-border rounded-xl h-40 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
                          >
                            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground">Clicca per caricare una foto</p>
                            <p className="text-[10px] text-muted-foreground/60">JPG, PNG, WebP · Max 10MB</p>
                          </div>
                        ) : (
                          <div className="relative rounded-xl overflow-hidden border border-border">
                            <img src={itemImagePreview} alt="Preview" className="w-full h-40 object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                            <Button
                              type="button" variant="destructive" size="icon"
                              onClick={() => { setItemImageFile(null); setItemImagePreview(""); }}
                              className="absolute top-2 right-2 h-7 w-7"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <div>
                        <Label className="text-xs font-medium">Nome Prodotto *</Label>
                        <Input value={itemTitle} onChange={e => setItemTitle(e.target.value)} placeholder="Es. iPhone 14 Pro Max 256GB" className="mt-1" />
                      </div>

                      {/* Brand & Model */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-medium flex items-center gap-1">
                            <Tag className="h-3 w-3" /> Brand
                          </Label>
                          <Input value={itemBrand} onChange={e => setItemBrand(e.target.value)} placeholder="Apple, Samsung..." className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs font-medium flex items-center gap-1">
                            <Smartphone className="h-3 w-3" /> Modello
                          </Label>
                          <Input value={itemModel} onChange={e => setItemModel(e.target.value)} placeholder="iPhone 14 Pro..." className="mt-1" />
                        </div>
                      </div>

                      {/* Condition & Color */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-medium flex items-center gap-1">
                            <Star className="h-3 w-3" /> Condizione
                          </Label>
                          <Select value={itemCondition} onValueChange={setItemCondition}>
                            <SelectTrigger className="mt-1 h-9 text-xs">
                              <SelectValue placeholder="Seleziona..." />
                            </SelectTrigger>
                            <SelectContent>
                              {CONDITION_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-medium flex items-center gap-1">
                            <Palette className="h-3 w-3" /> Colore
                          </Label>
                          <Input value={itemColor} onChange={e => setItemColor(e.target.value)} placeholder="Nero, Bianco..." className="mt-1" />
                        </div>
                      </div>

                      {/* Storage & Accessories */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-medium flex items-center gap-1">
                            <HardDrive className="h-3 w-3" /> Storage / Capacità
                          </Label>
                          <Input value={itemStorage} onChange={e => setItemStorage(e.target.value)} placeholder="128GB, 256GB..." className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs font-medium flex items-center gap-1">
                            <Package className="h-3 w-3" /> Accessori
                          </Label>
                          <Input value={itemAccessories} onChange={e => setItemAccessories(e.target.value)} placeholder="Scatola, caricatore..." className="mt-1" />
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <Label className="text-xs font-medium">Note aggiuntive</Label>
                        <Textarea value={itemNotes} onChange={e => setItemNotes(e.target.value)} placeholder="Segni d'usura, stato batteria..." rows={2} className="mt-1" />
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border pt-4">
                        <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-primary" /> Impostazioni Asta
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label className="text-[11px]">Partenza (€) *</Label><Input type="number" value={itemStartingPrice} onChange={e => setItemStartingPrice(e.target.value)} placeholder="1" className="mt-1" /></div>
                          <div><Label className="text-[11px]">Compra Ora (€)</Label><Input type="number" value={itemBuyNowPrice} onChange={e => setItemBuyNowPrice(e.target.value)} className="mt-1" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div><Label className="text-[11px]">Riserva (€)</Label><Input type="number" value={itemReservePrice} onChange={e => setItemReservePrice(e.target.value)} placeholder="Opzionale" className="mt-1" /></div>
                          <div><Label className="text-[11px]">Durata (sec)</Label><Input type="number" value={itemDuration} onChange={e => setItemDuration(e.target.value)} className="mt-1" /></div>
                        </div>
                      </div>

                      <Button onClick={addItem} className="w-full h-11 font-semibold gap-2" disabled={!itemTitle.trim() || uploadingImage}>
                        {uploadingImage ? (
                          <><span className="animate-spin h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" /> Caricamento...</>
                        ) : (
                          <><Plus className="h-4 w-4" /> Aggiungi Prodotto</>
                        )}
                      </Button>
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

              {/* ===== ACTIVE ITEM HERO (Redesigned with Image) ===== */}
              {selectedAuction.status === "live" && activeItem && (() => {
                const details = getItemDetails(activeItem);
                return (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    <Card className="border-destructive/30 overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-destructive/8 via-transparent to-primary/5 pointer-events-none" />
                      <CardContent className="p-4 sm:p-6 relative">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-4">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                          </span>
                          <span className="text-xs font-bold text-destructive uppercase tracking-widest">In asta ora</span>
                          <Badge variant="outline" className="ml-auto text-[10px] gap-1 border-primary/30">
                            <Zap className="h-3 w-3 text-primary" /> {activeItem.bid_count} offerte
                          </Badge>
                        </div>

                        {/* Main Grid: Image + Info | Price | Countdown */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-center">
                          {/* Image + Info */}
                          <div className="lg:col-span-1 flex gap-4 items-start">
                            {/* Product Image */}
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden border-2 border-border/50 flex-shrink-0 bg-muted/30">
                              {activeItem.image_url ? (
                                <img src={activeItem.image_url} alt={activeItem.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="h-10 w-10 text-muted-foreground/30" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-base sm:text-lg text-foreground leading-tight">{activeItem.title}</h3>
                              {/* Product detail badges */}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {details.brand && (
                                  <Badge variant="outline" className="text-[10px] gap-1 bg-primary/5 border-primary/20">
                                    <Tag className="h-2.5 w-2.5" /> {details.brand}
                                  </Badge>
                                )}
                                {details.condizione && <ConditionBadge condition={CONDITION_OPTIONS.find(o => o.label === details.condizione)?.value || details.condizione} />}
                                {details.storage && (
                                  <Badge variant="outline" className="text-[10px] gap-1 bg-muted">
                                    <HardDrive className="h-2.5 w-2.5" /> {details.storage}
                                  </Badge>
                                )}
                                {details.colore && (
                                  <Badge variant="outline" className="text-[10px] gap-1 bg-muted">
                                    <Palette className="h-2.5 w-2.5" /> {details.colore}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="px-2 py-0.5 rounded-md bg-muted/60">Da €{activeItem.starting_price}</span>
                                {activeItem.buy_now_price && <span className="px-2 py-0.5 rounded-md bg-warning/10 text-warning font-medium">CN €{activeItem.buy_now_price}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Price - Central Hero */}
                          <div className="lg:col-span-1 text-center py-3 lg:py-0">
                            <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Prezzo attuale</p>
                            <motion.div
                              key={activeItem.current_price}
                              initial={{ scale: 1.15, textShadow: "0 0 20px hsl(var(--primary) / 0.5)" }}
                              animate={{ scale: 1, textShadow: "0 0 0px transparent" }}
                              transition={{ duration: 0.4 }}
                            >
                              <span className="text-5xl sm:text-6xl font-black text-primary tabular-nums leading-none drop-shadow-glow">
                                €{activeItem.current_price}
                              </span>
                            </motion.div>
                            <div className="flex items-center justify-center gap-2 mt-3">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              <motion.span key={activeItem.bid_count} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="text-sm font-bold text-foreground">
                                {activeItem.bid_count}
                              </motion.span>
                              <span className="text-xs text-muted-foreground">offerte</span>
                            </div>
                            {/* Reserve progress bar */}
                            {(activeItem as any).reserve_price && (
                              <div className="mt-3 max-w-48 mx-auto">
                                <div className="flex items-center justify-between text-[10px] mb-1">
                                  <span className="text-muted-foreground">Riserva</span>
                                  <span className={activeItem.current_price >= (activeItem as any).reserve_price ? "text-success font-bold" : "text-destructive"}>
                                    €{activeItem.current_price} / €{(activeItem as any).reserve_price}
                                    {activeItem.current_price >= (activeItem as any).reserve_price ? " ✓" : ""}
                                  </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                  <motion.div
                                    className={`h-full rounded-full ${activeItem.current_price >= (activeItem as any).reserve_price ? "bg-success" : "bg-destructive/60"}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (activeItem.current_price / (activeItem as any).reserve_price) * 100)}%` }}
                                    transition={{ duration: 0.5 }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Countdown + Actions */}
                          <div className="lg:col-span-2 flex flex-col sm:flex-row lg:flex-col items-center gap-4 justify-center">
                            <CircularCountdown item={activeItem} />
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <Button size="lg" className="gap-1.5 flex-1 sm:flex-initial h-11 text-sm font-bold shadow-md" onClick={() => closeItem(activeItem, true)}>
                                <Trophy className="h-4 w-4" /> Aggiudicato
                              </Button>
                              <Button size="lg" variant="outline" className="h-11 text-sm" onClick={() => closeItem(activeItem, false)}>Skip</Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })()}

              {/* ===== ITEMS + FEED GRID ===== */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
                {/* Products Grid */}
                <div className="lg:col-span-2 space-y-3">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-primary" /> Prodotti ({auctionItems.length})
                  </h3>
                  {auctionItems.length === 0 ? (
                    <Card className="border-dashed"><CardContent className="py-10 text-center text-sm text-muted-foreground">Nessun prodotto. Aggiungi il primo!</CardContent></Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {auctionItems.map((item, idx) => {
                        const details = getItemDetails(item);
                        return (
                          <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                            <Card className={`transition-all h-full overflow-hidden ${
                              item.status === "active" ? "border-destructive shadow-lg ring-2 ring-destructive/20" :
                              item.status === "sold" ? "border-success/40 bg-success/5" : "hover:shadow-sm"
                            }`}>
                              {/* Product Image */}
                              {item.image_url ? (
                                <div className="relative w-full h-36 sm:h-40 overflow-hidden bg-muted/20">
                                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
                                  <div className="absolute top-2 right-2">{itemStatusBadge(item.status)}</div>
                                  {item.status === "active" && (
                                    <div className="absolute top-2 left-2">
                                      <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                                      </span>
                                    </div>
                                  )}
                                  {/* Price overlay on image */}
                                  <div className="absolute bottom-2 left-2">
                                    <span className="text-xl font-black text-primary bg-card/90 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-sm tabular-nums">
                                      €{item.current_price}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative w-full h-24 bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center">
                                  <Package className="h-8 w-8 text-muted-foreground/20" />
                                  <div className="absolute top-2 right-2">{itemStatusBadge(item.status)}</div>
                                  {item.status === "active" && (
                                    <div className="absolute top-2 left-2">
                                      <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              <CardContent className="p-3.5 sm:p-4 flex flex-col">
                                <h4 className="font-semibold text-foreground text-sm leading-tight">{item.title}</h4>

                                {/* Product detail badges */}
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {details.brand && (
                                    <Badge variant="outline" className="text-[9px] gap-0.5 h-5 px-1.5">
                                      <Tag className="h-2.5 w-2.5" /> {details.brand}
                                    </Badge>
                                  )}
                                  {details.condizione && (
                                    <ConditionBadge condition={CONDITION_OPTIONS.find(o => o.label === details.condizione)?.value || details.condizione} />
                                  )}
                                  {details.storage && (
                                    <Badge variant="outline" className="text-[9px] gap-0.5 h-5 px-1.5 bg-muted/50">
                                      <HardDrive className="h-2.5 w-2.5" /> {details.storage}
                                    </Badge>
                                  )}
                                  {details.colore && (
                                    <Badge variant="outline" className="text-[9px] gap-0.5 h-5 px-1.5 bg-muted/50">
                                      <Palette className="h-2.5 w-2.5" /> {details.colore}
                                    </Badge>
                                  )}
                                  {details.accessori && (
                                    <Badge variant="outline" className="text-[9px] gap-0.5 h-5 px-1.5 bg-muted/50">
                                      📦 {details.accessori}
                                    </Badge>
                                  )}
                                </div>

                                {/* Price row (only if no image) */}
                                {!item.image_url && (
                                  <div className="flex items-baseline gap-2 mt-2">
                                    <span className="text-xl font-black text-primary tabular-nums">€{item.current_price}</span>
                                    <span className="text-xs text-muted-foreground line-through">€{item.starting_price}</span>
                                  </div>
                                )}

                                {/* Meta row */}
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap mt-2">
                                  {item.image_url && item.starting_price !== item.current_price && (
                                    <span className="text-xs text-muted-foreground line-through">€{item.starting_price}</span>
                                  )}
                                  {item.buy_now_price && <span className="px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">CN €{item.buy_now_price}</span>}
                                  {(item as any).reserve_price && (
                                    <span className={`px-1.5 py-0.5 rounded font-medium ${item.current_price >= (item as any).reserve_price ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                                      R €{(item as any).reserve_price} {item.current_price >= (item as any).reserve_price ? "✓" : "✗"}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{item.bid_count}</span>
                                  <span className="flex items-center gap-0.5"><Timer className="h-3 w-3" />{item.duration_seconds}s</span>
                                </div>

                                {/* Winner */}
                                {item.status === "sold" && item.winner_name && (
                                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-3 p-2.5 rounded-lg bg-success/10 border border-success/20">
                                    <div className="flex items-center gap-2">
                                      <Trophy className="h-4 w-4 text-success flex-shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold text-foreground text-xs">{item.winner_name}</p>
                                        {item.winner_email && <p className="text-[10px] text-muted-foreground truncate">{item.winner_email}</p>}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}

                                {item.status === "unsold" && (
                                  <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Gavel className="h-3 w-3" />
                                    {(item as any).reserve_price && item.current_price < (item as any).reserve_price ? "Riserva non raggiunta" : "Nessuna offerta valida"}
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/50">
                                  {selectedAuction.status === "live" && item.status === "pending" && (
                                    <Button size="sm" className="gap-1 h-8 text-xs flex-1" onClick={() => activateItem(item)}>
                                      <ArrowRight className="h-3 w-3" /> Avvia
                                    </Button>
                                  )}
                                  {selectedAuction.status === "live" && item.status === "active" && (
                                    <>
                                      <Button size="sm" className="gap-1 h-8 text-xs flex-1" onClick={() => closeItem(item, true)}>
                                        <Trophy className="h-3 w-3" /> Aggiudicato
                                      </Button>
                                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => closeItem(item, false)}>Skip</Button>
                                    </>
                                  )}
                                  {item.status === "pending" && (
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 ml-auto" onClick={() => deleteItem(item.id)}>
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ===== LIVE FEED ===== */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                      <MessageCircle className="h-4 w-4 text-primary" /> Feed Live
                    </h3>
                    <div className="flex items-center gap-2">
                      {liveBids.length > 0 && (
                        <Badge variant="outline" className="text-[10px] gap-1 bg-success/10 border-success/30 text-success">
                          <Zap className="h-3 w-3" /> {liveBids.length}
                        </Badge>
                      )}
                      {chatMessages.length > 0 && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <MessageCircle className="h-3 w-3" /> {chatMessages.length}
                        </Badge>
                      )}
                      {selectedAuction.status === "live" && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                        </span>
                      )}
                    </div>
                  </div>
                  <Card className="h-[380px] sm:h-[480px] lg:h-[580px] overflow-hidden flex flex-col border-border/60">
                    <CardContent className="p-0 flex-1 overflow-y-auto" ref={feedContainerRef}>
                      {(() => {
                        const feedItems: FeedItem[] = [
                          ...liveBids.map(b => ({ type: "bid" as const, data: b })),
                          ...chatMessages.map(c => ({ type: "chat" as const, data: c })),
                        ].sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime());

                        if (feedItems.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                              <Radio className="h-8 w-8 opacity-30" />
                              <p className="text-xs">In attesa di attività...</p>
                            </div>
                          );
                        }

                        return (
                          <div className="divide-y divide-border/30">
                            <AnimatePresence>
                              {feedItems.map((item, i) => {
                                if (item.type === "bid") {
                                  const bid = item.data;
                                  const isTop = i === 0;
                                  return (
                                    <motion.div
                                      key={`bid-${bid.id}`}
                                      initial={{ opacity: 0, x: 20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ duration: 0.3 }}
                                      className={`px-3 py-2.5 ${isTop ? "bg-success/5" : ""}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-7 w-7 flex-shrink-0">
                                          <AvatarFallback className="text-[9px] font-bold bg-success/15 text-success border border-success/20">
                                            {bid.bidder_name.slice(0, 2).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <span className="font-medium text-xs text-foreground">{bid.bidder_name}</span>
                                          <span className="text-[10px] text-muted-foreground ml-1.5">
                                            {new Date(bid.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                          </span>
                                        </div>
                                        <span className={`font-bold text-sm tabular-nums px-2 py-0.5 rounded-md ${isTop ? "bg-success/15 text-success" : "text-foreground"}`}>
                                          €{bid.amount}
                                        </span>
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
                                          <AvatarFallback className={`text-[9px] font-bold ${isCentro ? "bg-primary/15 text-primary border border-primary/20" : "bg-muted text-muted-foreground"}`}>
                                            {chat.sender_name.slice(0, 1).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className={`flex-1 min-w-0 ${isCentro ? "bg-primary/5 rounded-lg px-2.5 py-1.5 border border-primary/10" : ""}`}>
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
                      <div className="border-t border-border p-2.5 bg-muted/30">
                        <form onSubmit={e => { e.preventDefault(); sendChatMessage(); }} className="flex items-center gap-2">
                          <Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Rispondi come Host..." className="h-9 text-xs flex-1 bg-card" />
                          <Button type="submit" size="sm" className="h-9 w-9 p-0" disabled={!chatInput.trim()}>
                            <Send className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
                    )}
                  </Card>
                </div>
              </div>

              {/* ===== SALES SUMMARY ===== */}
              {sales.length > 0 && (
                <div className="space-y-3 sm:space-y-4">
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
                  <div className="flex items-center justify-end gap-4 text-sm flex-wrap">
                    <span className="text-muted-foreground">Totale: <span className="font-bold text-foreground">{sales.length}</span></span>
                    <span className="text-muted-foreground">Incasso: <span className="font-bold text-primary">€{sales.reduce((s, x) => s + x.sale_price, 0).toFixed(2)}</span></span>
                    <span className="text-muted-foreground">Da evadere: <span className="font-bold text-warning">{sales.filter(s => s.fulfillment_status === "pending").length}</span></span>
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
