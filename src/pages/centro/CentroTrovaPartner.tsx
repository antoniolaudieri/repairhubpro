import { useState, useEffect } from "react";
import { CentroLayout } from "@/layouts/CentroLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Star
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { PartnerDiscoveryMap } from "@/components/centro/PartnerDiscoveryMap";
import { PartnershipInviteDialog } from "@/components/centro/PartnershipInviteDialog";
import { SavedShopsList } from "@/components/centro/SavedShopsList";

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
}

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
          .select("id, business_name, address, phone, email, latitude, longitude, status")
          .in("status", ["approved", "pending"]);

        if (cornersError) throw cornersError;

        // Calculate distances if centro has location
        let cornersWithDistance = cornersData || [];
        if (centro.latitude && centro.longitude) {
          cornersWithDistance = cornersData?.map(corner => ({
            ...corner,
            distance: corner.latitude && corner.longitude 
              ? calculateDistance(
                  centro.latitude!, 
                  centro.longitude!, 
                  corner.latitude, 
                  corner.longitude
                )
              : undefined
          })).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity)) || [];
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
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CentroLayout>
    );
  }

  return (
    <CentroLayout>
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-blue-500/10 to-purple-500/10 border border-primary/20">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-start gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/25">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    Trova Partner
                  </h1>
                  <p className="text-muted-foreground mt-1 max-w-lg">
                    Espandi la tua rete di collaboratori. I Corner possono inviarti riparazioni dai loro clienti.
                  </p>
                </div>
              </div>

              {/* Stats Pills */}
              <div className="flex items-center gap-3">
                <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-green-500/20">
                      <Store className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{corners.filter(c => c.status === 'approved').length}</p>
                      <p className="text-xs text-green-600/70">Attivi</p>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/20">
                      <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">{corners.filter(c => c.status === 'pending').length}</p>
                      <p className="text-xs text-amber-600/70">In attesa</p>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/20">
                      <BookmarkCheck className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{savedShops.size}</p>
                      <p className="text-xs text-blue-600/70">Salvati</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome o indirizzo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-background/50 backdrop-blur-sm border-border/50"
            />
          </div>
          
          {/* Radius Filter */}
          {centroLocation && (
            <Card className="flex-1 max-w-sm bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Radar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Raggio di ricerca</span>
                      <Badge className="bg-primary/10 text-primary border-primary/20 font-bold">
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
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>5 km</span>
                      <span>100 km</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-12 p-1 bg-muted/50 backdrop-blur-sm border border-border/50 rounded-xl">
            <TabsTrigger value="registered" className="gap-2 px-6 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Corner Registrati</span>
              <span className="sm:hidden">Corner</span>
            </TabsTrigger>
            <TabsTrigger value="discover" className="gap-2 px-6 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Scopri Negozi</span>
              <span className="sm:hidden">Scopri</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2 px-6 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <BookmarkCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Salvati</span>
              {savedShops.size > 0 && (
                <Badge className="ml-1 h-5 px-1.5 text-xs bg-amber-500/20 text-amber-600 border-0">
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
            <div className="grid gap-4">
              {filteredCorners.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Nessun Corner trovato con i criteri di ricerca
                  </CardContent>
                </Card>
              ) : (
                filteredCorners.map((corner) => (
                  <Card 
                    key={corner.id} 
                    className={`transition-all hover:shadow-md ${
                      inviteStatuses[corner.id] === "partner" ? "border-green-500/30 bg-green-500/5" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${corner.status === 'approved' ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                            <Store className={`h-6 w-6 ${corner.status === 'approved' ? 'text-green-600' : 'text-amber-600'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg">{corner.business_name}</h3>
                              {corner.status === 'pending' && (
                                <Badge variant="outline" className="border-amber-500/50 text-amber-600 text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Non ancora attivo
                                </Badge>
                              )}
                              {getStatusBadge(corner.id)}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1 mt-1">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {corner.address}
                                {corner.distance !== undefined && (
                                  <span className="ml-2 text-primary font-medium">
                                    ({corner.distance.toFixed(1)} km)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {corner.phone}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {corner.email}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          {!inviteStatuses[corner.id] ? (
                            <Button 
                              onClick={() => handleSelectCorner(corner)}
                              className="gap-2"
                            >
                              <Send className="h-4 w-4" />
                              Invia Richiesta
                            </Button>
                          ) : inviteStatuses[corner.id] === "partner" ? (
                            <Button variant="outline" disabled className="gap-2">
                              <Check className="h-4 w-4" />
                              Già Partner
                            </Button>
                          ) : inviteStatuses[corner.id] === "pending" ? (
                            <Button variant="outline" disabled className="gap-2">
                              <Clock className="h-4 w-4" />
                              Richiesta Inviata
                            </Button>
                          ) : inviteStatuses[corner.id] === "declined" ? (
                            <Button 
                              variant="outline" 
                              onClick={() => handleSelectCorner(corner)}
                              className="gap-2"
                            >
                              <Send className="h-4 w-4" />
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
          <TabsContent value="discover" className="mt-6 space-y-6">
            {/* Search CTA Card */}
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10">
              <div className="absolute inset-0 bg-grid-white/5" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <CardContent className="relative p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25">
                      <Globe className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Cerca negozi di telefonia</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Trova negozi nella tua zona non ancora registrati. Contattali via WhatsApp, email o telefono per proporre una collaborazione!
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-600 bg-blue-500/5">
                          <Smartphone className="h-3 w-3 mr-1" />
                          OpenStreetMap
                        </Badge>
                        <Badge variant="outline" className="text-xs border-green-500/30 text-green-600 bg-green-500/5">
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Contatto Diretto
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={searchExternalShops} 
                    disabled={loadingExternal || !centroLocation}
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25"
                  >
                    {loadingExternal ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Search className="h-5 w-5" />
                    )}
                    Cerca nel raggio di {radiusKm}km
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* External shops results */}
            {externalShops.length > 0 && (
              <div className="flex items-center justify-between px-1">
                <p className="text-sm text-muted-foreground">
                  Negozi trovati nella tua zona
                </p>
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                  <Smartphone className="h-3 w-3 mr-1" />
                  {filteredExternalShops.length} risultati
                </Badge>
              </div>
            )}

            <div className="grid gap-4">
              {externalShops.length === 0 ? (
                <Card className="border-dashed border-2 bg-muted/30">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                      <Globe className="h-8 w-8 text-blue-500/70" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Inizia la ricerca</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      Clicca "Cerca" per trovare negozi di telefonia nella tua zona tramite OpenStreetMap
                    </p>
                  </CardContent>
                </Card>
              ) : filteredExternalShops.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Nessun negozio corrisponde ai criteri di ricerca
                  </CardContent>
                </Card>
              ) : (
                filteredExternalShops.map((shop) => {
                  const isSaved = savedShops.has(shop.id);
                  const savedInfo = savedShops.get(shop.id);
                  
                  return (
                    <Card 
                      key={shop.id} 
                      className={`transition-all hover:shadow-md ${
                        isSaved ? 'border-amber-500/30 bg-amber-500/5' : 'border-blue-500/10'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl ${isSaved ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
                              {isSaved ? (
                                <Star className="h-6 w-6 text-amber-600" />
                              ) : (
                                <Smartphone className="h-6 w-6 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-lg">{shop.name}</h3>
                                {isSaved && (
                                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                                    <BookmarkCheck className="h-3 w-3 mr-1" />
                                    Salvato
                                  </Badge>
                                )}
                                {savedInfo?.contactStatus === 'contacted' && (
                                  <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                                    <Check className="h-3 w-3 mr-1" />
                                    Contattato
                                  </Badge>
                                )}
                                <Badge variant="outline" className="border-blue-500/30 text-blue-600 text-xs">
                                  <Globe className="h-3 w-3 mr-1" />
                                  OpenStreetMap
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1 mt-1">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {shop.address}
                                  {shop.distance !== undefined && (
                                    <span className="ml-2 text-primary font-medium">
                                      ({shop.distance} km)
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 flex-wrap">
                                  {shop.phone && (
                                    <a href={`tel:${shop.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                                      <Phone className="h-3 w-3" />
                                      {shop.phone}
                                    </a>
                                  )}
                                  {shop.email && (
                                    <a href={`mailto:${shop.email}`} className="flex items-center gap-1 text-primary hover:underline">
                                      <Mail className="h-3 w-3" />
                                      {shop.email}
                                    </a>
                                  )}
                                  {shop.website && (
                                    <a href={shop.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                                      <ExternalLink className="h-3 w-3" />
                                      Sito web
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            {/* Save/Unsave button */}
                            {isSaved ? (
                              <>
                                {savedInfo?.contactStatus !== 'contacted' && (
                                  <Button 
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdateContactStatus(shop, 'contacted')}
                                    className="border-green-500/50 text-green-600 hover:bg-green-500/10"
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Contattato
                                  </Button>
                                )}
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveSavedShop(shop)}
                                  disabled={savingShop === shop.id}
                                  className="border-red-500/50 text-red-600 hover:bg-red-500/10"
                                >
                                  {savingShop === shop.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <X className="h-4 w-4 mr-1" />
                                      Rimuovi
                                    </>
                                  )}
                                </Button>
                              </>
                            ) : (
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => handleSaveShop(shop)}
                                disabled={savingShop === shop.id}
                                className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                              >
                                {savingShop === shop.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Bookmark className="h-4 w-4 mr-1" />
                                    Salva
                                  </>
                                )}
                              </Button>
                            )}
                            
                            {shop.phone && (
                              <>
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  asChild
                                >
                                  <a href={`tel:${shop.phone}`}>
                                    <Phone className="h-4 w-4 mr-1" />
                                    Chiama
                                  </a>
                                </Button>
                                <Button 
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  asChild
                                >
                                  <a 
                                    href={`https://wa.me/${shop.phone.replace(/[^0-9]/g, '')}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                  >
                                    <MessageCircle className="h-4 w-4 mr-1" />
                                    WhatsApp
                                  </a>
                                </Button>
                              </>
                            )}
                            {shop.email && (
                              <Button 
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <a href={`mailto:${shop.email}?subject=Proposta di Partnership RepairHubPro&body=Buongiorno,%0A%0ASiamo un Centro di Assistenza e vorremmo proporvi una collaborazione sulla piattaforma RepairHubPro.%0A%0ACordiali saluti`}>
                                  <Mail className="h-4 w-4 mr-1" />
                                  Email
                                </a>
                              </Button>
                            )}
                            <Button 
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${shop.latitude},${shop.longitude}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <MapPin className="h-4 w-4 mr-1" />
                                Mappa
                              </a>
                            </Button>
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
