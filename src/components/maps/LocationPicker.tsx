import { useCallback, useEffect, useRef, useState } from "react";
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

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  onGeolocate?: () => void;
  geoLoading?: boolean;
}

export function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  onGeolocate,
  geoLoading = false,
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  // Default center (Italy)
  const defaultCenter: L.LatLngExpression = [41.9028, 12.4964];
  
  // Initialize map using native Leaflet (not react-leaflet)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center: L.LatLngExpression = latitude !== null && longitude !== null 
      ? [latitude, longitude] 
      : defaultCenter;
    const zoom = latitude !== null && longitude !== null ? 15 : 5;

    // Create the map
    const map = L.map(mapContainerRef.current).setView(center, zoom);
    
    // Add tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);
    
    // Add click handler
    map.on("click", (e: L.LeafletMouseEvent) => {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    });
    
    mapRef.current = map;
    setIsReady(true);

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // Only run once on mount

  // Update marker when coordinates change
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    // Add new marker if we have coordinates
    if (latitude !== null && longitude !== null) {
      const marker = L.marker([latitude, longitude]).addTo(mapRef.current);
      markerRef.current = marker;
      
      // Pan to the new location
      mapRef.current.setView([latitude, longitude], 15, { animate: true });
    }
  }, [latitude, longitude]);

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

      {/* Map Container */}
      <div 
        ref={mapContainerRef}
        className="h-64 rounded-xl overflow-hidden border border-border/50 shadow-inner"
      />

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
