import { useState, useEffect } from "react";
import { CentroLayout } from "@/layouts/CentroLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, 
  Search, 
  Store, 
  Building2, 
  Phone, 
  Mail, 
  Send,
  Check,
  Clock,
  X,
  Users,
  Loader2,
  Radar,
  Globe,
  ExternalLink,
  Smartphone,
  MessageCircle,
  Bookmark,
  BookmarkCheck,
  Star,
  Cpu,
  Laptop,
  Radio,
  Speaker,
  Plug,
  Plus
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PartnerDiscoveryMap } from "@/components/centro/PartnerDiscoveryMap";
import { PartnershipInviteDialog } from "@/components/centro/PartnershipInviteDialog";
import { SavedShopsList } from "@/components/centro/SavedShopsList";
import { OpeningHours } from "@/components/settings/OpeningHoursEditor";

interface Corner {
  id: string;
  business_name: string;
  address: string;
  phone: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  distance?: number;
  opening_hours?: OpeningHours | null;
}

interface InviteStatus {
  [cornerId: string]: "pending" | "accepted" | "declined" | "partner";
}

interface ExternalShop {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  latitude: number;
  longitude: number;
  distance?: number;
  isSaved?: boolean;
  savedId?: string;
  contactStatus?: string;
  shopType?: string;
}

// Helper function to get shop type badge styling
const getShopTypeBadge = (shopType: string) => {
  switch (shopType) {
    case 'telefonia':
      return { icon: 'smartphone', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', label: 'Telefonia' };
    case 'elettronica':
      return { icon: 'cpu', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30', label: 'Elettronica' };
    case 'computer':
      return { icon: 'laptop', color: 'bg-green-500/10 text-green-600 border-green-500/30', label: 'Computer' };
    case 'telecomunicazioni':
      return { icon: 'radio', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30', label: 'Telecomunicazioni' };
    case 'hi-fi':
      return { icon: 'speaker', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30', label: 'Hi-Fi' };
    case 'elettrodomestici':
      return { icon: 'plug', color: 'bg-rose-500/10 text-rose-600 border-rose-500/30', label: 'Elettrodomestici' };
    default:
      return { icon: 'store', color: 'bg-gray-500/10 text-gray-600 border-gray-500/30', label: 'Altro' };
  }
};

export default function CentroTrovaPartner() {
  const { user } = useAuth();
  const [corners, setCorners] = useState<Corner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [centroId, setCentroId] = useState<string | null>(null);
  const [centroLocation, setCentroLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [inviteStatuses, setInviteStatuses] = useState<InviteStatus>({});
  const [selectedCorner, setSelectedCorner] = useState<Corner | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("registered");
  const [radiusKm, setRadiusKm] = useState(20);
  const [externalShops, setExternalShops] = useState<ExternalShop[]>([]);
  const [loadingExternal, setLoadingExternal] = useState(false);
  const [savedShops, setSavedShops] = useState<Map<string, { id: string; contactStatus: string }>>(new Map());
  const [savingShop, setSavingShop] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get Centro info
      const { data: centro } = await supabase
        .from("centri_assistenza")
        .select("id, latitude, longitude")
        .eq("owner_user_id", user?.id)
        .single();

      if (centro) {
        setCentroId(centro.id);
        if (centro.latitude && centro.longitude) {
          setCentroLocation({ lat: centro.latitude, lng: centro.longitude });
        }

        // Load all corners (approved + pending) to expand network opportunities
        const { data: cornersData, error: cornersError } = await supabase
          .from("corners")
          .select("id, business_name, address, phone, email, latitude, longitude, status, opening_hours")
          .in("status", ["approved", "pending"]);

        if (cornersError) throw cornersError;

        // Calculate distances if centro has location
        let cornersWithDistance: Corner[] = (cornersData || []).map(c => ({
          ...c,
          opening_hours: c.opening_hours as unknown as OpeningHours | null,
        }));
        if (centro.latitude && centro.longitude) {
          cornersWithDistance = cornersWithDistance.map(corner => ({
            ...corner,
            distance: corner.latitude && corner.longitude 
              ? calculateDistance(
                  centro.latitude!, 
                  centro.longitude!, 
                  corner.latitude, 
                  corner.longitude
                )
              : undefined
          })).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        }

        setCorners(cornersWithDistance);

        // Load existing partnerships and invites
        await loadInviteStatuses(centro.id);
        
        // Load saved external shops
        await loadSavedShops(centro.id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  const loadInviteStatuses = async (centroId: string) => {
    try {
      // Get existing partnerships
      const { data: partnerships } = await supabase
        .from("corner_partnerships")
        .select("corner_id")
        .eq("provider_type", "centro")
        .eq("provider_id", centroId);

      // Get pending/sent invites
      const { data: invites } = await supabase
        .from("partnership_invites")
        .select("to_id, status")
        .eq("from_type", "centro")
        .eq("from_id", centroId)
        .eq("to_type", "corner");

      const statuses: InviteStatus = {};
      
      partnerships?.forEach(p => {
        statuses[p.corner_id] = "partner";
      });

      invites?.forEach(i => {
        if (!statuses[i.to_id]) {
          statuses[i.to_id] = i.status as "pending" | "accepted" | "declined";
        }
      });

      setInviteStatuses(statuses);
    } catch (error) {
      console.error("Error loading invite statuses:", error);
    }
  };

  const loadSavedShops = async (centroId: string) => {
    try {
      const { data, error } = await supabase
        .from("saved_external_shops")
        .select("id, external_id, contact_status")
        .eq("centro_id", centroId);

      if (error) throw error;

      const savedMap = new Map<string, { id: string; contactStatus: string }>();
      data?.forEach(shop => {
        savedMap.set(shop.external_id, { id: shop.id, contactStatus: shop.contact_status });
      });
      setSavedShops(savedMap);
    } catch (error) {
      console.error("Error loading saved shops:", error);
    }
  };

  const handleSaveShop = async (shop: ExternalShop) => {
    if (!centroId) return;
    
    setSavingShop(shop.id);
    try {
      const { data, error } = await supabase
        .from("saved_external_shops")
        .insert({
          centro_id: centroId,
          external_id: shop.id,
          name: shop.name,
          address: shop.address,
          phone: shop.phone,
          email: shop.email,
          website: shop.website,
          latitude: shop.latitude,
          longitude: shop.longitude,
          contact_status: 'pending'
        })
        .select('id')
        .single();

      if (error) throw error;
      
      setSavedShops(prev => new Map(prev).set(shop.id, { id: data.id, contactStatus: 'pending' }));
      toast.success("Negozio salvato nella lista da seguire");
    } catch (error: any) {
      console.error("Error saving shop:", error);
      if (error.code === '23505') {
        toast.error("Negozio già salvato");
      } else {
        toast.error("Errore nel salvataggio");
      }
    } finally {
      setSavingShop(null);
    }
  };

  const handleRemoveSavedShop = async (shop: ExternalShop) => {
    const saved = savedShops.get(shop.id);
    if (!saved) return;
    
    setSavingShop(shop.id);
    try {
      const { error } = await supabase
        .from("saved_external_shops")
        .delete()
        .eq("id", saved.id);

      if (error) throw error;
      
      setSavedShops(prev => {
        const newMap = new Map(prev);
        newMap.delete(shop.id);
        return newMap;
      });
      toast.success("Negozio rimosso dalla lista");
    } catch (error) {
      console.error("Error removing saved shop:", error);
      toast.error("Errore nella rimozione");
    } finally {
      setSavingShop(null);
    }
  };

  const handleUpdateContactStatus = async (shop: ExternalShop, status: string) => {
    const saved = savedShops.get(shop.id);
    if (!saved) return;
    
    try {
      const { error } = await supabase
        .from("saved_external_shops")
        .update({ 
          contact_status: status,
          last_contacted_at: status === 'contacted' ? new Date().toISOString() : null
        })
        .eq("id", saved.id);

      if (error) throw error;
      
      setSavedShops(prev => new Map(prev).set(shop.id, { ...saved, contactStatus: status }));
      toast.success("Stato aggiornato");
    } catch (error) {
      console.error("Error updating contact status:", error);
      toast.error("Errore nell'aggiornamento");
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleSelectCorner = (corner: Corner) => {
    setSelectedCorner(corner);
    setInviteDialogOpen(true);
  };

  const handleInviteSent = (cornerId: string) => {
    setInviteStatuses(prev => ({ ...prev, [cornerId]: "pending" }));
    setInviteDialogOpen(false);
    setSelectedCorner(null);
  };

  const searchExternalShops = async () => {
    if (!centroLocation) {
      toast.error("Posizione del Centro non disponibile");
      return;
    }
    
    setLoadingExternal(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-phone-shops', {
        body: {
          latitude: centroLocation.lat,
          longitude: centroLocation.lng,
          radiusKm: radiusKm
        }
      });

      if (error) throw error;
      
      const shops = data?.shops || [];
      setExternalShops(shops);
      
      if (shops.length === 0) {
        toast.info("Nessun negozio trovato in questa zona");
      } else {
        toast.success(`Trovati ${shops.length} negozi di telefonia`);
      }
    } catch (error) {
      console.error('Error searching external shops:', error);
      toast.error("Errore nella ricerca dei negozi");
    } finally {
      setLoadingExternal(false);
    }
  };

  const filteredCorners = corners.filter(corner => {
    const matchesSearch = corner.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      corner.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRadius = corner.distance === undefined || corner.distance <= radiusKm;
    return matchesSearch && matchesRadius;
  });

  const filteredExternalShops = externalShops.filter(shop => 
    shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (cornerId: string) => {
    const status = inviteStatuses[cornerId];
    if (!status) return null;

    switch (status) {
      case "partner":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30"><Check className="h-3 w-3 mr-1" />Partner</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30"><Clock className="h-3 w-3 mr-1" />In attesa</Badge>;
      case "accepted":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30"><Check className="h-3 w-3 mr-1" />Accettato</Badge>;
      case "declined":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30"><X className="h-3 w-3 mr-1" />Rifiutato</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <CentroLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary mx-auto" />
            <p className="text-muted-foreground text-sm mt-3">Caricamento...</p>
          </motion.div>
        </div>
      </CentroLayout>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const statsCards = [
    {
      title: "Corner Attivi",
      value: corners.filter(c => c.status === 'approved').length,
      icon: Store,
      iconBg: "bg-gradient-to-br from-emerald-500 to-green-500",
    },
    {
      title: "In Attesa",
      value: corners.filter(c => c.status === 'pending').length,
      icon: Clock,
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
    },
    {
      title: "Negozi Salvati",
      value: savedShops.size,
      icon: BookmarkCheck,
      iconBg: "bg-gradient-to-br from-blue-500 to-cyan-500",
    },
    {
      title: "Partner Attivi",
      value: Object.values(inviteStatuses).filter(s => s === 'partner' || s === 'accepted').length,
      icon: Users,
      iconBg: "bg-gradient-to-br from-violet-500 to-purple-500",
    },
  ];

  return (
    <CentroLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground">Trova Partner</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Espandi la tua rete di collaboratori</p>
          </div>
        </div>

        {/* Stats Cards */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4"
        >
          {statsCards.map((card) => (
            <motion.div key={card.title} variants={itemVariants}>
              <Card className="p-3 md:p-4 border-border/50 hover:border-border transition-colors">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className={`h-8 w-8 md:h-10 md:w-10 rounded-lg ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <card.icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xl md:text-2xl font-bold text-foreground leading-none">{card.value}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 leading-tight">{card.title}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome o indirizzo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 border-border/50"
            />
          </div>
          
          {/* Radius Filter */}
          {centroLocation && (
            <Card className="flex-1 max-w-xs border-border/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                    <Radar className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium">Raggio</span>
                      <Badge variant="outline" className="h-5 text-xs font-bold">
                        {radiusKm} km
                      </Badge>
                    </div>
                    <Slider
                      value={[radiusKm]}
                      onValueChange={(value) => setRadiusKm(value[0])}
                      min={5}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-10 p-1 bg-muted/50 border border-border/50">
            <TabsTrigger value="registered" className="gap-2 px-4 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Corner</span>
            </TabsTrigger>
            <TabsTrigger value="discover" className="gap-2 px-4 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Scopri</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2 px-4 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <BookmarkCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Salvati</span>
              {savedShops.size > 0 && (
                <Badge variant="outline" className="ml-1 h-5 px-1.5 text-xs">
                  {savedShops.size}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Registered Corners Tab */}
          <TabsContent value="registered" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Corner già registrati sulla piattaforma
              </p>
              <Badge variant="outline">
                {filteredCorners.length} risultati
              </Badge>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <PartnerDiscoveryMap
                  corners={filteredCorners}
                  centroLocation={centroLocation}
                  inviteStatuses={inviteStatuses}
                  onSelectCorner={handleSelectCorner}
                />
              </CardContent>
            </Card>

            {/* List of registered corners */}
            <div className="grid gap-3">
              {filteredCorners.length === 0 ? (
                <Card className="border-border/50">
                  <CardContent className="p-6 text-center text-muted-foreground text-sm">
                    Nessun Corner trovato con i criteri di ricerca
                  </CardContent>
                </Card>
              ) : (
                filteredCorners.map((corner) => (
                  <Card 
                    key={corner.id} 
                    className={`border-border/50 hover:border-border transition-colors ${
                      inviteStatuses[corner.id] === "partner" ? "border-green-500/30" : ""
                    }`}
                  >
                    <CardContent className="p-3 md:p-4">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            corner.status === 'approved' 
                              ? 'bg-gradient-to-br from-emerald-500 to-green-500' 
                              : 'bg-gradient-to-br from-amber-500 to-orange-500'
                          }`}>
                            <Store className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-sm">{corner.business_name}</h3>
                              {corner.status === 'pending' && (
                                <Badge variant="outline" className="text-[10px] h-5">
                                  <Clock className="h-2.5 w-2.5 mr-1" />
                                  Non attivo
                                </Badge>
                              )}
                              {getStatusBadge(corner.id)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {corner.address}
                              </span>
                              {corner.distance !== undefined && (
                                <span className="text-primary font-medium">
                                  {corner.distance.toFixed(1)} km
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          {!inviteStatuses[corner.id] ? (
                            <Button 
                              size="sm"
                              onClick={() => handleSelectCorner(corner)}
                              className="gap-1.5 h-8"
                            >
                              <Send className="h-3.5 w-3.5" />
                              Invita
                            </Button>
                          ) : inviteStatuses[corner.id] === "partner" ? (
                            <Button variant="outline" size="sm" disabled className="gap-1.5 h-8">
                              <Check className="h-3.5 w-3.5" />
                              Partner
                            </Button>
                          ) : inviteStatuses[corner.id] === "pending" ? (
                            <Button variant="outline" size="sm" disabled className="gap-1.5 h-8">
                              <Clock className="h-3.5 w-3.5" />
                              Inviata
                            </Button>
                          ) : inviteStatuses[corner.id] === "declined" ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleSelectCorner(corner)}
                              className="gap-1.5 h-8"
                            >
                              <Send className="h-3.5 w-3.5" />
                              Riprova
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Discover External Shops Tab */}
          <TabsContent value="discover" className="mt-4 space-y-4">
            {/* Search CTA Card */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Globe className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">Cerca negozi esterni</h3>
                      <p className="text-xs text-muted-foreground">
                        Trova negozi di elettronica nella tua zona non ancora registrati
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={searchExternalShops} 
                    disabled={loadingExternal || !centroLocation}
                    className="gap-2"
                  >
                    {loadingExternal ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Cerca ({radiusKm}km)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* External shops results */}
            {externalShops.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Negozi trovati nella tua zona
                </p>
                <Badge variant="outline">
                  {filteredExternalShops.length} risultati
                </Badge>
              </div>
            )}

            <div className="grid gap-3">
              {externalShops.length === 0 ? (
                <Card className="border-dashed border-border/50">
                  <CardContent className="p-8 text-center">
                    <div className="h-12 w-12 mx-auto rounded-lg bg-muted flex items-center justify-center mb-3">
                      <Globe className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-sm mb-1">Inizia la ricerca</h3>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Clicca "Cerca" per trovare negozi nella tua zona
                    </p>
                  </CardContent>
                </Card>
              ) : filteredExternalShops.length === 0 ? (
                <Card className="border-border/50">
                  <CardContent className="p-6 text-center text-muted-foreground text-sm">
                    Nessun negozio corrisponde ai criteri di ricerca
                  </CardContent>
                </Card>
              ) : (
                filteredExternalShops.map((shop) => {
                  const isSaved = savedShops.has(shop.id);
                  const savedInfo = savedShops.get(shop.id);
                  const shopTypeBadge = getShopTypeBadge(shop.shopType || 'altro');
                  const IconComponent = {
                    'smartphone': Smartphone,
                    'cpu': Cpu,
                    'laptop': Laptop,
                    'radio': Radio,
                    'speaker': Speaker,
                    'plug': Plug,
                    'store': Store
                  }[shopTypeBadge.icon] || Store;
                  
                  return (
                    <Card 
                      key={shop.id} 
                      className={`border-border/50 hover:border-border transition-colors ${
                        isSaved ? 'border-amber-500/30' : ''
                      }`}
                    >
                      <CardContent className="p-3 md:p-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isSaved ? 'bg-gradient-to-br from-amber-500 to-orange-500' : shopTypeBadge.color.split(' ')[0].replace('/10', '')
                            }`} style={{ background: isSaved ? undefined : shopTypeBadge.color.includes('blue') ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : shopTypeBadge.color.includes('purple') ? 'linear-gradient(135deg, #9333ea, #a855f7)' : shopTypeBadge.color.includes('green') ? 'linear-gradient(135deg, #22c55e, #10b981)' : shopTypeBadge.color.includes('cyan') ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : shopTypeBadge.color.includes('orange') ? 'linear-gradient(135deg, #f97316, #ea580c)' : shopTypeBadge.color.includes('rose') ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : 'linear-gradient(135deg, #6b7280, #4b5563)' }}>
                              {isSaved ? (
                                <Star className="h-4 w-4 text-white" />
                              ) : (
                                <IconComponent className="h-4 w-4 text-white" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-medium text-sm">{shop.name}</h3>
                                {shop.shopType && (
                                  <Badge variant="outline" className="text-[10px] h-5">
                                    {getShopTypeBadge(shop.shopType).label}
                                  </Badge>
                                )}
                                {isSaved && (
                                  <Badge variant="outline" className="text-[10px] h-5 border-amber-500/50 text-amber-600">
                                    Salvato
                                  </Badge>
                                )}
                                {savedInfo?.contactStatus === 'contacted' && (
                                  <Badge variant="outline" className="text-[10px] h-5 border-green-500/50 text-green-600">
                                    Contattato
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {shop.address}
                                </span>
                                {shop.distance !== undefined && (
                                  <span className="text-primary font-medium">
                                    {shop.distance} km
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-1.5 flex-wrap flex-shrink-0">
                            {isSaved ? (
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveSavedShop(shop)}
                                disabled={savingShop === shop.id}
                                className="h-8 text-xs"
                              >
                                {savingShop === shop.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <X className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            ) : (
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => handleSaveShop(shop)}
                                disabled={savingShop === shop.id}
                                className="h-8 text-xs"
                              >
                                {savingShop === shop.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Bookmark className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}
                            
                            {shop.phone && (
                              <Button 
                                size="sm"
                                className="h-8 text-xs gap-1"
                                asChild
                              >
                                <a 
                                  href={`https://wa.me/${shop.phone.replace(/[^0-9]/g, '')}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  WhatsApp
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Saved Shops Tab */}
          <TabsContent value="saved" className="mt-6 space-y-6">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="font-medium">Negozi da seguire</h3>
                <p className="text-sm text-muted-foreground">
                  Tieni traccia delle conversazioni con potenziali partner
                </p>
              </div>
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                <BookmarkCheck className="h-3 w-3 mr-1" />
                {savedShops.size} salvati
              </Badge>
            </div>

            {savedShops.size === 0 ? (
              <Card className="border-dashed border-2 bg-muted/30">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4">
                    <Bookmark className="h-8 w-8 text-amber-500/70" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Nessun negozio salvato</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mb-4">
                    Vai su "Scopri Negozi" per cercare e salvare negozi di telefonia da contattare
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab("discover")}
                    className="gap-2"
                  >
                    <Globe className="h-4 w-4" />
                    Scopri Negozi
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <SavedShopsList 
                centroId={centroId!}
                savedShops={savedShops}
                onRemove={(externalId) => {
                  setSavedShops(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(externalId);
                    return newMap;
                  });
                }}
                onStatusUpdate={(externalId, status) => {
                  setSavedShops(prev => {
                    const current = prev.get(externalId);
                    if (current) {
                      return new Map(prev).set(externalId, { ...current, contactStatus: status });
                    }
                    return prev;
                  });
                }}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Dialog */}
      {selectedCorner && centroId && (
        <PartnershipInviteDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          corner={selectedCorner}
          centroId={centroId}
          onInviteSent={() => handleInviteSent(selectedCorner.id)}
        />
      )}
    </CentroLayout>
  );
}
