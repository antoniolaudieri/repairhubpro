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
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { PartnerDiscoveryMap } from "@/components/centro/PartnerDiscoveryMap";
import { PartnershipInviteDialog } from "@/components/centro/PartnershipInviteDialog";

interface Corner {
  id: string;
  business_name: string;
  address: string;
  phone: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
  distance?: number;
}

interface InviteStatus {
  [cornerId: string]: "pending" | "accepted" | "declined" | "partner";
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
  const [activeTab, setActiveTab] = useState("map");

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

        // Load all approved corners
        const { data: cornersData, error: cornersError } = await supabase
          .from("corners")
          .select("id, business_name, address, phone, email, latitude, longitude")
          .eq("status", "approved");

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

  const filteredCorners = corners.filter(corner => 
    corner.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    corner.address.toLowerCase().includes(searchTerm.toLowerCase())
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
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              Trova Partner
            </h1>
            <p className="text-muted-foreground">
              Cerca Corner nella tua zona e avvia nuove collaborazioni
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Store className="h-4 w-4 mr-2" />
              {corners.length} Corner disponibili
            </Badge>
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Send className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Espandi la tua rete</h3>
                <p className="text-sm text-muted-foreground">
                  I Corner possono inviarti riparazioni dai loro clienti. Tu guadagni nuovi lavori, 
                  loro guadagnano una commissione. Cerca Corner nella tua zona e invia una richiesta di collaborazione!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome o indirizzo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="map" className="gap-2">
              <MapPin className="h-4 w-4" />
              Mappa
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <Store className="h-4 w-4" />
              Lista
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="mt-4">
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
          </TabsContent>

          <TabsContent value="list" className="mt-4">
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
                          <div className="p-3 bg-amber-500/10 rounded-xl">
                            <Store className="h-6 w-6 text-amber-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg">{corner.business_name}</h3>
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
