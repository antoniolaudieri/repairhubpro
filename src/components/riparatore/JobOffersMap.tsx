import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, Smartphone, Tablet, Laptop, Euro } from "lucide-react";

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom marker icons
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        transform: rotate(45deg);
        color: white;
        font-size: 14px;
        font-weight: bold;
      ">📱</div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const jobIcon = createCustomIcon("hsl(262, 83%, 58%)"); // Primary color
const userIcon = L.divIcon({
  className: "user-marker",
  html: `<div style="
    background-color: hsl(142, 76%, 36%);
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 0 0 3px hsl(142, 76%, 36%, 0.3), 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface JobOffer {
  id: string;
  repair_request_id: string;
  distance_km: number | null;
  expires_at: string;
  status: string;
  repair_request?: {
    id: string;
    device_type: string;
    device_brand: string | null;
    device_model: string | null;
    issue_description: string;
    estimated_cost: number | null;
    customer_latitude: number | null;
    customer_longitude: number | null;
  };
}

interface JobOffersMapProps {
  jobOffers: JobOffer[];
  userLocation: { latitude: number | null; longitude: number | null };
  serviceRadius: number;
  onAcceptOffer: (offerId: string) => void;
}

// Component to recenter map
function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 12);
  }, [center, map]);
  return null;
}

const DeviceIcon = ({ type }: { type: string }) => {
  switch (type?.toLowerCase()) {
    case "smartphone":
      return <Smartphone className="h-4 w-4" />;
    case "tablet":
      return <Tablet className="h-4 w-4" />;
    case "laptop":
      return <Laptop className="h-4 w-4" />;
    default:
      return <Smartphone className="h-4 w-4" />;
  }
};

export function JobOffersMap({ jobOffers, userLocation, serviceRadius, onAcceptOffer }: JobOffersMapProps) {
  const [mapReady, setMapReady] = useState(false);

  const defaultCenter: [number, number] = [
    userLocation.latitude || 41.9028,
    userLocation.longitude || 12.4964,
  ];

  // Filter job offers with valid coordinates
  const mappableOffers = jobOffers.filter(
    (offer) =>
      offer.repair_request?.customer_latitude &&
      offer.repair_request?.customer_longitude
  );

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    if (diff <= 0) return "Scaduta";
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min`;
  };

  useEffect(() => {
    setMapReady(true);
  }, []);

  if (!mapReady) {
    return (
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardContent className="p-6 flex items-center justify-center h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Mappa Offerte di Lavoro
          {mappableOffers.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {mappableOffers.length} offerte
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[400px] relative">
          <MapContainer
            center={defaultCenter}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* User location marker */}
            {userLocation.latitude && userLocation.longitude && (
              <>
                <Marker
                  position={[userLocation.latitude, userLocation.longitude]}
                  icon={userIcon}
                >
                  <Popup>
                    <div className="text-center p-1">
                      <p className="font-semibold text-sm">La tua posizione</p>
                      <p className="text-xs text-muted-foreground">Raggio: {serviceRadius} km</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Service radius circle */}
                <Circle
                  center={[userLocation.latitude, userLocation.longitude]}
                  radius={serviceRadius * 1000}
                  pathOptions={{
                    color: "hsl(262, 83%, 58%)",
                    fillColor: "hsl(262, 83%, 58%)",
                    fillOpacity: 0.1,
                    weight: 2,
                    dashArray: "5, 5",
                  }}
                />

                <RecenterMap center={[userLocation.latitude, userLocation.longitude]} />
              </>
            )}

            {/* Job offer markers */}
            {mappableOffers.map((offer) => (
              <Marker
                key={offer.id}
                position={[
                  offer.repair_request!.customer_latitude!,
                  offer.repair_request!.customer_longitude!,
                ]}
                icon={jobIcon}
              >
                <Popup>
                  <div className="min-w-[200px] p-1">
                    <div className="flex items-center gap-2 mb-2">
                      <DeviceIcon type={offer.repair_request?.device_type || ""} />
                      <span className="font-semibold text-sm">
                        {offer.repair_request?.device_brand} {offer.repair_request?.device_model}
                      </span>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {offer.repair_request?.issue_description}
                    </p>

                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Navigation className="h-3 w-3" />
                        {offer.distance_km?.toFixed(1) || "?"} km
                      </div>
                      <div className="flex items-center gap-1 text-warning">
                        <Clock className="h-3 w-3" />
                        {getTimeRemaining(offer.expires_at)}
                      </div>
                    </div>

                    {offer.repair_request?.estimated_cost && (
                      <div className="flex items-center gap-1 text-sm font-semibold text-success mb-2">
                        <Euro className="h-3 w-3" />
                        {offer.repair_request.estimated_cost.toFixed(0)}
                      </div>
                    )}

                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => onAcceptOffer(offer.id)}
                    >
                      Accetta Offerta
                    </Button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur rounded-lg p-2 text-xs z-[1000]">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-success border-2 border-white" />
              <span>Tu</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary border-2 border-white" />
              <span>Offerte</span>
            </div>
          </div>

          {mappableOffers.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-[1000]">
              <div className="text-center">
                <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nessuna offerta nella tua area</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
