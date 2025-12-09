import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UsedDeviceCard } from "@/components/usato/UsedDeviceCard";
import { NotifyInterestDialog } from "@/components/usato/NotifyInterestDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wrench,
  Search,
  Bell,
  SlidersHorizontal,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  ArrowLeft,
  Grid3X3,
  X,
  Sparkles,
  Shield,
  Zap,
  Heart,
  TrendingUp,
  Package,
  CheckCircle2,
} from "lucide-react";

const deviceTypeFilters = [
  { id: "all", label: "Tutti", icon: Grid3X3 },
  { id: "smartphone", label: "Smartphone", icon: Smartphone },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "laptop", label: "Laptop", icon: Laptop },
  { id: "pc", label: "PC", icon: Monitor },
];

const conditionFilters = [
  { id: "all", label: "Tutte le condizioni" },
  { id: "ricondizionato", label: "Ricondizionato" },
  { id: "usato_ottimo", label: "Usato Ottimo" },
  { id: "usato_buono", label: "Usato Buono" },
  { id: "usato_discreto", label: "Usato Discreto" },
];

const sortOptions = [
  { id: "newest", label: "Più Recenti" },
  { id: "price_asc", label: "Prezzo: dal più basso" },
  { id: "price_desc", label: "Prezzo: dal più alto" },
  { id: "popular", label: "Più Visti" },
];

const features = [
  { icon: Shield, label: "Garanzia Inclusa", color: "text-success" },
  { icon: CheckCircle2, label: "Testati e Verificati", color: "text-primary" },
  { icon: Zap, label: "Spedizione Veloce", color: "text-warning" },
];

export default function UsatoCatalog() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deviceType, setDeviceType] = useState("all");
  const [condition, setCondition] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("all");

  useEffect(() => {
    fetchDevices();
  }, [deviceType, condition, sortBy, selectedBrand]);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("used_devices")
        .select("*, centro:centri_assistenza(business_name, logo_url)")
        .eq("status", "published");

      if (deviceType !== "all") {
        query = query.ilike("device_type", deviceType);
      }

      if (condition !== "all") {
        query = query.eq("condition", condition as any);
      }

      if (selectedBrand !== "all") {
        query = query.eq("brand", selectedBrand);
      }

      switch (sortBy) {
        case "price_asc":
          query = query.order("price", { ascending: true });
          break;
        case "price_desc":
          query = query.order("price", { ascending: false });
          break;
        case "popular":
          query = query.order("views_count", { ascending: false });
          break;
        default:
          query = query.order("published_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch reservation counts for all devices
      const deviceIds = (data || []).map(d => d.id);
      const { data: reservations } = await supabase
        .from("used_device_reservations")
        .select("device_id")
        .in("device_id", deviceIds);

      // Count reservations per device
      const reservationCounts: Record<string, number> = {};
      (reservations || []).forEach(r => {
        reservationCounts[r.device_id] = (reservationCounts[r.device_id] || 0) + 1;
      });

      // Merge reservation counts into devices
      const devicesWithReservations = (data || []).map(d => ({
        ...d,
        reservation_count: reservationCounts[d.id] || 0
      }));

      setDevices(devicesWithReservations);

      // Extract unique brands
      const uniqueBrands = [...new Set((data || []).map(d => d.brand))].sort();
      setBrands(uniqueBrands);
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDevices = devices.filter(device => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      device.brand.toLowerCase().includes(search) ||
      device.model.toLowerCase().includes(search) ||
      device.description?.toLowerCase().includes(search)
    );
  });

  const clearFilters = () => {
    setDeviceType("all");
    setCondition("all");
    setSelectedBrand("all");
    setSearchQuery("");
    setSortBy("newest");
  };

  const hasActiveFilters = deviceType !== "all" || condition !== "all" || selectedBrand !== "all" || searchQuery;

  const stats = {
    total: devices.length,
    withWarranty: devices.filter(d => d.warranty_months > 0).length,
    avgDiscount: devices.length > 0 
      ? Math.round(devices.reduce((acc, d) => {
          if (d.original_price && d.original_price > d.price) {
            return acc + ((1 - d.price / d.original_price) * 100);
          }
          return acc;
        }, 0) / devices.filter(d => d.original_price && d.original_price > d.price).length) || 0
      : 0,
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-float-medium" />
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-info/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/")}
                className="hover:bg-primary/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-primary rounded-xl blur-md opacity-50" />
                  <div className="relative p-2.5 bg-gradient-primary rounded-xl">
                    <Wrench className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
                <div>
                  <span className="font-bold text-lg text-gradient">Usato</span>
                  <span className="font-bold text-lg text-foreground">Hub</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => setNotifyDialogOpen(true)}
              className="gap-2 bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-glow"
            >
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificami</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="absolute inset-0 bg-pattern-dots opacity-30" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-3xl mx-auto"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                Qualità Garantita al Miglior Prezzo
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                <span className="text-foreground">Dispositivi </span>
                <span className="text-gradient">Ricondizionati</span>
                <br />
                <span className="text-foreground">& Usati Garantiti</span>
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Scopri la nostra selezione esclusiva di smartphone, tablet e laptop 
                verificati dai nostri tecnici, con garanzia e assistenza inclusa.
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50 shadow-card"
                  >
                    <feature.icon className={`h-4 w-4 ${feature.color}`} />
                    <span className="text-sm font-medium">{feature.label}</span>
                  </motion.div>
                ))}
              </div>

              {/* Stats Row */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-3 gap-4 max-w-lg mx-auto"
              >
                <div className="text-center p-4 rounded-2xl bg-card/50 backdrop-blur border border-border/30">
                  <p className="text-2xl sm:text-3xl font-bold text-gradient">{stats.total}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Dispositivi</p>
                </div>
                <div className="text-center p-4 rounded-2xl bg-card/50 backdrop-blur border border-border/30">
                  <p className="text-2xl sm:text-3xl font-bold text-success">{stats.withWarranty}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Con Garanzia</p>
                </div>
                <div className="text-center p-4 rounded-2xl bg-card/50 backdrop-blur border border-border/30">
                  <p className="text-2xl sm:text-3xl font-bold text-destructive">-{stats.avgDiscount}%</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Risparmio Medio</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="sticky top-16 z-40 bg-background/95 backdrop-blur-xl border-b border-border/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cerca iPhone, Samsung, MacBook..."
                  className="pl-12 h-12 text-base bg-muted/50 border-border/50 focus:bg-card focus:border-primary/50 transition-all rounded-xl"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[200px] h-12 rounded-xl bg-muted/50 border-border/50">
                  <SlidersHorizontal className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Ordina per" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {sortOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id} className="rounded-lg">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Device Type Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
              {deviceTypeFilters.map((filter) => {
                const Icon = filter.icon;
                const isActive = deviceType === filter.id;
                return (
                  <motion.button
                    key={filter.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setDeviceType(filter.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                      ${isActive 
                        ? "bg-gradient-primary text-primary-foreground shadow-glow" 
                        : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {filter.label}
                  </motion.button>
                );
              })}
            </div>

            {/* Additional Filters Row */}
            <div className="flex flex-wrap gap-3 mt-3">
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="w-[180px] rounded-xl bg-card border-border/50 hover:border-primary/30 transition-colors">
                  <SelectValue placeholder="Condizione" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {conditionFilters.map((filter) => (
                    <SelectItem key={filter.id} value={filter.id} className="rounded-lg">
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {brands.length > 0 && (
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger className="w-[180px] rounded-xl bg-card border-border/50 hover:border-primary/30 transition-colors">
                    <SelectValue placeholder="Marca" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all" className="rounded-lg">Tutte le marche</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand} value={brand} className="rounded-lg">
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <AnimatePresence>
                {hasActiveFilters && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearFilters} 
                      className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                    >
                      <X className="h-4 w-4" />
                      Azzera filtri
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-primary" />
              <p className="text-foreground font-medium">
                <span className="text-primary font-bold">{filteredDevices.length}</span> dispositivi trovati
              </p>
            </div>
            {filteredDevices.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                Aggiornato ora
              </Badge>
            )}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="space-y-3"
                >
                  <Skeleton className="aspect-square rounded-2xl" />
                  <Skeleton className="h-4 w-3/4 rounded-lg" />
                  <Skeleton className="h-6 w-1/2 rounded-lg" />
                </motion.div>
              ))}
            </div>
          ) : filteredDevices.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gradient-primary rounded-full blur-xl opacity-20" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center border border-border/50">
                  <Search className="h-10 w-10 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Nessun dispositivo trovato</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Non abbiamo trovato dispositivi con i filtri selezionati. 
                Attiva le notifiche per essere avvisato quando arrivano nuovi prodotti!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={clearFilters} variant="outline" className="gap-2 rounded-xl">
                  <X className="h-4 w-4" />
                  Azzera Filtri
                </Button>
                <Button onClick={() => setNotifyDialogOpen(true)} className="gap-2 bg-gradient-primary rounded-xl">
                  <Bell className="h-4 w-4" />
                  Attiva Notifiche
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
            >
              {filteredDevices.map((device, index) => (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.4 }}
                >
                  <UsedDeviceCard device={device} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* CTA Banner */}
        {!loading && filteredDevices.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4 text-center sm:text-left">
                      <div className="hidden sm:flex p-4 rounded-2xl bg-gradient-primary">
                        <Heart className="h-8 w-8 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-1">Non trovi quello che cerchi?</h3>
                        <p className="text-muted-foreground">
                          Attiva le notifiche e ti avviseremo quando arriva il dispositivo perfetto per te!
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setNotifyDialogOpen(true)}
                      size="lg"
                      className="gap-2 bg-gradient-primary hover:opacity-90 shadow-glow shrink-0 rounded-xl"
                    >
                      <Bell className="h-5 w-5" />
                      Attiva Notifiche
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </section>
        )}
      </main>

      <NotifyInterestDialog 
        open={notifyDialogOpen} 
        onOpenChange={setNotifyDialogOpen} 
      />
    </div>
  );
}
