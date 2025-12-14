import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Navigation, Store, Search, Check, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { OpeningHours, formatOpeningHoursForPopup, getTodayHours } from "@/components/settings/OpeningHoursEditor";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Corner {
  id: string;
  business_name: string;
  address: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  distance?: number;
  opening_hours?: OpeningHours | null;
}

interface CornerSelectorProps {
  selectedCornerId: string | null;
  onSelect: (cornerId: string, customerCoords?: { lat: number; lng: number }) => void;
}

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function CornerSelector({ selectedCornerId, onSelect }: CornerSelectorProps) {
  const [corners, setCorners] = useState<Corner[]>([]);
  const [filteredCorners, setFilteredCorners] = useState<Corner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const { latitude, longitude, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // Fetch approved corners
  useEffect(() => {
    const fetchCorners = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("corners")
        .select("id, business_name, address, phone, latitude, longitude, opening_hours")
        .eq("status", "approved");

      if (!error && data) {
        const cornersWithHours = data.map(c => ({
          ...c,
          opening_hours: c.opening_hours as unknown as OpeningHours | null,
        }));
        setCorners(cornersWithHours);
        setFilteredCorners(cornersWithHours);
      }
      setLoading(false);
    };

    fetchCorners();
  }, []);

  // Sort by distance when user location is available
  useEffect(() => {
    if (latitude && longitude && corners.length > 0) {
      const cornersWithDistance = corners.map((corner) => {
        if (corner.latitude && corner.longitude) {
          return {
            ...corner,
            distance: calculateDistance(latitude, longitude, corner.latitude, corner.longitude),
          };
        }
        return { ...corner, distance: undefined };
      });

      // Sort by distance (closest first)
      cornersWithDistance.sort((a, b) => {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      });

      setFilteredCorners(cornersWithDistance);
    }
  }, [latitude, longitude, corners]);

  // Filter by search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = corners.filter(
        (c) =>
          c.business_name.toLowerCase().includes(query) ||
          c.address.toLowerCase().includes(query)
      );
      setFilteredCorners(filtered);
    } else if (latitude && longitude) {
      // Re-apply distance sorting
      const cornersWithDistance = corners.map((corner) => {
        if (corner.latitude && corner.longitude) {
          return {
            ...corner,
            distance: calculateDistance(latitude, longitude, corner.latitude, corner.longitude),
          };
        }
        return { ...corner, distance: undefined };
      });
      cornersWithDistance.sort((a, b) => {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      });
      setFilteredCorners(cornersWithDistance);
    } else {
      setFilteredCorners(corners);
    }
  }, [searchQuery, corners, latitude, longitude]);

  // Initialize map
  useEffect(() => {
    if (viewMode === "map" && mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([41.9028, 12.4964], 6);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current && viewMode !== "map") {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [viewMode]);

  // Update markers when corners or selection changes
  useEffect(() => {
    if (!mapRef.current || viewMode !== "map") return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add corner markers
    filteredCorners.forEach((corner) => {
      if (corner.latitude && corner.longitude) {
        const isSelected = corner.id === selectedCornerId;
        const icon = L.divIcon({
          className: "custom-marker",
          html: `<div class="w-8 h-8 rounded-full ${
            isSelected ? "bg-primary" : "bg-orange-500"
          } flex items-center justify-center shadow-lg border-2 border-white">
            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        const marker = L.marker([corner.latitude, corner.longitude], { icon })
          .addTo(mapRef.current!)
          .bindPopup(
            `<div class="p-2">
              <strong>${corner.business_name}</strong><br/>
              <span class="text-sm text-gray-600">${corner.address}</span><br/>
              ${corner.opening_hours ? formatOpeningHoursForPopup(corner.opening_hours) : ''}
              <button onclick="window.selectCorner('${corner.id}')" class="mt-2 px-3 py-1 bg-primary text-white rounded text-sm">
                Seleziona
              </button>
            </div>`
          );

        marker.on("click", () => {
          onSelect(corner.id, latitude && longitude ? { lat: latitude, lng: longitude } : undefined);
        });

        markersRef.current.push(marker);
      }
    });

    // Add user location marker if available
    if (latitude && longitude) {
      const userIcon = L.divIcon({
        className: "user-marker",
        html: `<div class="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg pulse-animation"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const userMarker = L.marker([latitude, longitude], { icon: userIcon }).addTo(mapRef.current);
      markersRef.current.push(userMarker);

      // Center map on user location
      mapRef.current.setView([latitude, longitude], 12);
    }
  }, [filteredCorners, selectedCornerId, viewMode, latitude, longitude, onSelect]);

  const handleSelectCorner = (cornerId: string) => {
    onSelect(cornerId, latitude && longitude ? { lat: latitude, lng: longitude } : undefined);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Geolocation Button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          type="button"
          variant={latitude ? "default" : "outline"}
          onClick={requestLocation}
          disabled={geoLoading}
          className="flex-1"
        >
          {geoLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4 mr-2" />
          )}
          {latitude ? "Posizione rilevata" : "Trova Corner più vicino"}
        </Button>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            Lista
          </Button>
          <Button
            type="button"
            variant={viewMode === "map" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("map")}
          >
            Mappa
          </Button>
        </div>
      </div>

      {geoError && (
        <p className="text-sm text-destructive">{geoError}</p>
      )}

      {latitude && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Ordinati per vicinanza dalla tua posizione
        </p>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per nome o indirizzo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {filteredCorners.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nessun Corner trovato
            </p>
          ) : (
            filteredCorners.map((corner) => (
              <Card
                key={corner.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedCornerId === corner.id
                    ? "ring-2 ring-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => handleSelectCorner(corner.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold">{corner.business_name}</h4>
                      {selectedCornerId === corner.id && (
                        <Badge className="bg-primary">
                          <Check className="h-3 w-3 mr-1" />
                          Selezionato
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {corner.address}
                    </p>
                    {corner.phone && (
                      <p className="text-sm text-muted-foreground">{corner.phone}</p>
                    )}
                    {(() => {
                      const todayHours = getTodayHours(corner.opening_hours || null);
                      if (!todayHours) return null;
                      return (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {todayHours.closed ? "Oggi: Chiuso" : `Oggi: ${todayHours.open} - ${todayHours.close}`}
                        </p>
                      );
                    })()}
                  </div>
                  {corner.distance !== undefined && (
                    <Badge variant="outline" className="ml-2 shrink-0">
                      {corner.distance < 1
                        ? `${Math.round(corner.distance * 1000)} m`
                        : `${corner.distance.toFixed(1)} km`}
                    </Badge>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Map View */}
      {viewMode === "map" && (
        <div
          ref={mapContainerRef}
          className="w-full h-[400px] rounded-lg border overflow-hidden"
        />
      )}

      <style>{`
        .pulse-animation {
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}