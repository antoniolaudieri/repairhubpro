import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Locate, Loader2, CheckCircle, MapPin } from "lucide-react";

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom marker icon
const customIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  onGeolocate?: () => void;
  geoLoading?: boolean;
}

// Component to handle click events - rendered directly without conditional
function MapClickHandler({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to recenter map - rendered directly without conditional
function MapController({ latitude, longitude }: { latitude: number | null; longitude: number | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      map.setView([latitude, longitude], 15, { animate: true });
    }
  }, [latitude, longitude, map]);
  
  return null;
}

export function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  onGeolocate,
  geoLoading = false,
}: LocationPickerProps) {
  const [isReady, setIsReady] = useState(false);
  
  // Default center (Italy)
  const defaultCenter: [number, number] = [41.9028, 12.4964];
  const center: [number, number] = latitude !== null && longitude !== null 
    ? [latitude, longitude] 
    : defaultCenter;
  const zoom = latitude !== null && longitude !== null ? 15 : 5;

  // Delay rendering the map to avoid SSR issues
  useEffect(() => {
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Button type="button" variant="outline" size="sm" disabled>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Caricamento...
          </Button>
        </div>
        <div className="h-64 rounded-xl overflow-hidden border border-border/50 shadow-inner bg-muted/30 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {onGeolocate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onGeolocate}
            disabled={geoLoading}
          >
            {geoLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Locate className="h-4 w-4 mr-2" />
            )}
            Rileva Posizione
          </Button>
        )}
        {latitude !== null && longitude !== null ? (
          <span className="text-sm text-emerald-600 flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            Posizione selezionata
          </span>
        ) : (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Clicca sulla mappa per posizionare il marker
          </span>
        )}
      </div>

      {/* Map */}
      <div className="h-64 rounded-xl overflow-hidden border border-border/50 shadow-inner">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapClickHandler onLocationChange={onLocationChange} />
          <MapController latitude={latitude} longitude={longitude} />
          {latitude !== null && longitude !== null && (
            <Marker position={[latitude, longitude]} icon={customIcon} />
          )}
        </MapContainer>
      </div>

      {/* Coordinates display */}
      {latitude !== null && longitude !== null && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
          <span>Lat: {latitude.toFixed(6)}</span>
          <span>Lng: {longitude.toFixed(6)}</span>
        </div>
      )}
    </div>
  );
}
