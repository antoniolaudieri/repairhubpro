import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UsedDeviceCard } from "@/components/usato/UsedDeviceCard";
import { NotifyInterestDialog } from "@/components/usato/NotifyInterestDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  List,
  X,
} from "lucide-react";

const deviceTypeFilters = [
  { id: "all", label: "Tutti", icon: Grid3X3 },
  { id: "smartphone", label: "Smartphone", icon: Smartphone },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "laptop", label: "Laptop", icon: Laptop },
  { id: "pc", label: "PC", icon: Monitor },
];

const conditionFilters = [
  { id: "all", label: "Tutte" },
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
        .select("*")
        .eq("status", "published");

      if (deviceType !== "all") {
        query = query.eq("device_type", deviceType);
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

      setDevices(data || []);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-primary rounded-xl">
                  <Wrench className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-xl">TechRepair</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={() => setNotifyDialogOpen(true)}
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Attiva Notifiche</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Dispositivi Usati & Ricondizionati
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Scopri la nostra selezione di dispositivi verificati, con garanzia e a prezzi convenienti
          </p>
        </motion.div>

        {/* Filters */}
        <div className="space-y-4 mb-8">
          {/* Search & Sort */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca per marca, modello..."
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Ordina per" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Device Type Tabs */}
          <div className="flex flex-wrap gap-2">
            {deviceTypeFilters.map((filter) => {
              const Icon = filter.icon;
              const isActive = deviceType === filter.id;
              return (
                <Button
                  key={filter.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDeviceType(filter.id)}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {filter.label}
                </Button>
              );
            })}
          </div>

          {/* Additional Filters */}
          <div className="flex flex-wrap gap-4">
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Condizione" />
              </SelectTrigger>
              <SelectContent>
                {conditionFilters.map((filter) => (
                  <SelectItem key={filter.id} value={filter.id}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {brands.length > 0 && (
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le marche</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Azzera filtri
              </Button>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            {filteredDevices.length} dispositivi trovati
          </p>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredDevices.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nessun dispositivo trovato</h3>
            <p className="text-muted-foreground mb-4">
              Prova a modificare i filtri o attiva le notifiche per essere avvisato
            </p>
            <Button onClick={() => setNotifyDialogOpen(true)} className="gap-2">
              <Bell className="h-4 w-4" />
              Attiva Notifiche
            </Button>
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
                transition={{ delay: index * 0.05 }}
              >
                <UsedDeviceCard device={device} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <NotifyInterestDialog 
        open={notifyDialogOpen} 
        onOpenChange={setNotifyDialogOpen} 
      />
    </div>
  );
}