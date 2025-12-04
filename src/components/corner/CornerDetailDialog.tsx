import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, Phone, Store, Euro, Percent, Building2, User } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface CornerDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  corner: {
    id: string;
    business_name: string;
    phone: string;
    address: string;
    latitude?: number | null;
    longitude?: number | null;
    commission_rate?: number;
  } | null;
  estimatedCost?: number | null;
  platformRate?: number;
  centroRate?: number;
}

export function CornerDetailDialog({
  open,
  onOpenChange,
  corner,
  estimatedCost = 0,
  platformRate = 20,
  centroRate = 70,
}: CornerDetailDialogProps) {
  if (!corner) return null;

  const grossRevenue = estimatedCost || 0;
  const cornerRate = corner.commission_rate || 10;
  
  // Calculate commissions based on gross margin (assuming 0 parts cost for estimation)
  const grossMargin = grossRevenue;
  const platformCommission = grossMargin * (platformRate / 100);
  const cornerCommission = grossMargin * (cornerRate / 100);
  const centroCommission = grossMargin * (centroRate / 100);

  const hasLocation = corner.latitude && corner.longitude;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Dettagli Corner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Corner Info */}
          <Card className="p-4 bg-muted/30 border-border/50">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{corner.business_name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {corner.phone}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{corner.address}</span>
              </div>
            </div>
          </Card>

          {/* Map */}
          {hasLocation ? (
            <Card className="overflow-hidden border-border/50">
              <div className="h-48 w-full">
                <MapContainer
                  center={[corner.latitude!, corner.longitude!]}
                  zoom={15}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  />
                  <Marker position={[corner.latitude!, corner.longitude!]}>
                    <Popup>
                      <div className="text-center">
                        <strong>{corner.business_name}</strong>
                        <br />
                        {corner.address}
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </Card>
          ) : (
            <Card className="p-4 bg-muted/30 border-border/50 text-center">
              <MapPin className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Posizione non disponibile
              </p>
            </Card>
          )}

          {/* Commission Breakdown */}
          <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Euro className="h-4 w-4 text-emerald-500" />
              Ripartizione Commissioni
            </h4>
            
            {grossRevenue > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fatturato Totale</span>
                  <span className="font-semibold">€{grossRevenue.toFixed(2)}</span>
                </div>
                
                <div className="h-px bg-border/50" />
                
                <div className="space-y-2">
                  {/* Platform */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Percent className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Piattaforma</p>
                        <p className="text-xs text-muted-foreground">{platformRate}%</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                      €{platformCommission.toFixed(2)}
                    </Badge>
                  </div>

                  {/* Corner */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Store className="h-4 w-4 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Corner</p>
                        <p className="text-xs text-muted-foreground">{cornerRate}%</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
                      €{cornerCommission.toFixed(2)}
                    </Badge>
                  </div>

                  {/* Centro */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Tuo Guadagno</p>
                        <p className="text-xs text-muted-foreground">{centroRate}%</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 font-semibold">
                      €{centroCommission.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                Crea un preventivo per vedere la ripartizione
              </p>
            )}
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
