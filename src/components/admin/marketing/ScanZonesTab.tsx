import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  MapPin, Plus, Trash2, RefreshCw, Loader2, Search, Globe 
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

export function ScanZonesTab() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newZone, setNewZone] = useState({
    name: "",
    latitude: "",
    longitude: "",
    radius_km: "10",
    scan_frequency_hours: "24",
    target_type: "both",
  });
  const [scanningZoneId, setScanningZoneId] = useState<string | null>(null);

  // Fetch zones
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["marketing-scan-zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_scan_zones")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Add zone mutation
  const addZoneMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("marketing_scan_zones").insert({
        name: newZone.name,
        latitude: parseFloat(newZone.latitude),
        longitude: parseFloat(newZone.longitude),
        radius_km: parseFloat(newZone.radius_km),
        scan_frequency_hours: parseInt(newZone.scan_frequency_hours),
        target_type: newZone.target_type,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-scan-zones"] });
      toast.success("Zona aggiunta");
      setIsAddDialogOpen(false);
      setNewZone({
        name: "",
        latitude: "",
        longitude: "",
        radius_km: "10",
        scan_frequency_hours: "24",
        target_type: "both",
      });
    },
    onError: () => {
      toast.error("Errore nell'aggiunta");
    },
  });

  // Toggle zone mutation
  const toggleZoneMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("marketing_scan_zones")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-scan-zones"] });
    },
  });

  // Delete zone mutation
  const deleteZoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketing_scan_zones")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-scan-zones"] });
      toast.success("Zona eliminata");
    },
    onError: () => {
      toast.error("Errore nell'eliminazione");
    },
  });

  // Scan single zone
  const scanZone = async (zone: typeof zones[0]) => {
    setScanningZoneId(zone.id);
    try {
      const { data, error } = await supabase.functions.invoke("marketing-auto-scanner", {
        body: { zoneId: zone.id },
      });
      if (error) throw error;
      toast.success(`Scansione completata: ${data.leadsCreated || 0} nuovi lead`);
      queryClient.invalidateQueries({ queryKey: ["marketing-scan-zones"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-leads"] });
    } catch (error: any) {
      toast.error(`Errore: ${error.message}`);
    } finally {
      setScanningZoneId(null);
    }
  };

  // Geocode city name
  const geocodeCity = async (cityName: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}, Italia&limit=1`
      );
      const data = await response.json();
      if (data.length > 0) {
        setNewZone(prev => ({
          ...prev,
          latitude: data[0].lat,
          longitude: data[0].lon,
          name: prev.name || cityName,
        }));
        toast.success("Coordinate trovate");
      } else {
        toast.error("Città non trovata");
      }
    } catch {
      toast.error("Errore nella geocodifica");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Zone di Scansione</h2>
          <p className="text-sm text-muted-foreground">
            Configura le aree geografiche per la ricerca automatica di lead
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuova Zona
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{zones.length}</div>
            <p className="text-sm text-muted-foreground">Zone totali</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {zones.filter(z => z.is_active).length}
            </div>
            <p className="text-sm text-muted-foreground">Zone attive</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">
              {zones.reduce((sum, z) => sum + (z.total_leads_found || 0), 0)}
            </div>
            <p className="text-sm text-muted-foreground">Lead totali trovati</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {zones.filter(z => z.last_scanned_at).length}
            </div>
            <p className="text-sm text-muted-foreground">Zone scansionate</p>
          </CardContent>
        </Card>
      </div>

      {/* Zones Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zona</TableHead>
                <TableHead>Coordinate</TableHead>
                <TableHead>Raggio</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Lead Trovati</TableHead>
                <TableHead>Ultima Scansione</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : zones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nessuna zona configurata
                  </TableCell>
                </TableRow>
              ) : (
                zones.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium">{zone.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}
                    </TableCell>
                    <TableCell>{zone.radius_km} km</TableCell>
                    <TableCell>
                      <Badge variant="outline">Entrambi</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{zone.total_leads_found || 0}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {zone.last_scanned_at 
                        ? formatDistanceToNow(new Date(zone.last_scanned_at), { 
                            addSuffix: true, 
                            locale: it 
                          })
                        : "Mai"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={zone.is_active}
                        onCheckedChange={(checked) => 
                          toggleZoneMutation.mutate({ id: zone.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => scanZone(zone)}
                          disabled={scanningZoneId === zone.id}
                        >
                          {scanningZoneId === zone.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteZoneMutation.mutate(zone.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Zone Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aggiungi Zona di Scansione</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome zona</Label>
              <Input
                placeholder="Es. Milano Centro"
                value={newZone.name}
                onChange={(e) => setNewZone(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Cerca città</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome città..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      geocodeCity((e.target as HTMLInputElement).value);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    const input = (e.target as HTMLElement).parentElement?.querySelector("input");
                    if (input) geocodeCity(input.value);
                  }}
                >
                  <Globe className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitudine</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="45.4642"
                  value={newZone.latitude}
                  onChange={(e) => setNewZone(prev => ({ ...prev, latitude: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Longitudine</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="9.1900"
                  value={newZone.longitude}
                  onChange={(e) => setNewZone(prev => ({ ...prev, longitude: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Raggio (km)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={newZone.radius_km}
                  onChange={(e) => setNewZone(prev => ({ ...prev, radius_km: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Frequenza (ore)</Label>
                <Input
                  type="number"
                  min={1}
                  max={168}
                  value={newZone.scan_frequency_hours}
                  onChange={(e) => setNewZone(prev => ({ ...prev, scan_frequency_hours: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Target</Label>
              <div className="flex gap-2">
                {["both", "centro", "corner"].map((type) => (
                  <Button
                    key={type}
                    variant={newZone.target_type === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewZone(prev => ({ ...prev, target_type: type }))}
                  >
                    {type === "both" ? "Entrambi" : type === "centro" ? "Centri" : "Corner"}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Annulla
            </Button>
            <Button 
              onClick={() => addZoneMutation.mutate()}
              disabled={!newZone.name || !newZone.latitude || !newZone.longitude}
            >
              Aggiungi Zona
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
