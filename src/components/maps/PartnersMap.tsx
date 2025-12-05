import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Store, Building2, Loader2 } from "lucide-react";

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icon creator
const createCustomIcon = (color: string, type: 'corner' | 'centro') => {
  const iconSvg = type === 'corner' 
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`;
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${color};
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px ${color}80;
      border: 2px solid white;
    ">${iconSvg.replace('width="24"', 'width="18"').replace('height="24"', 'height="18"')}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const cornerIcon = createCustomIcon('#f59e0b', 'corner');
const centroIcon = createCustomIcon('#3b82f6', 'centro');

interface Partner {
  id: string;
  business_name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'corner' | 'centro';
}

export function PartnersMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch approved corners and centri
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const [cornersRes, centriRes] = await Promise.all([
          supabase
            .from("corners")
            .select("id, business_name, address, latitude, longitude")
            .eq("status", "approved")
            .not("latitude", "is", null)
            .not("longitude", "is", null),
          supabase
            .from("centri_assistenza")
            .select("id, business_name, address, latitude, longitude")
            .eq("status", "approved")
            .not("latitude", "is", null)
            .not("longitude", "is", null),
        ]);

        const corners: Partner[] = (cornersRes.data || []).map((c) => ({
          id: c.id,
          business_name: c.business_name,
          address: c.address,
          latitude: c.latitude!,
          longitude: c.longitude!,
          type: 'corner' as const,
        }));

        const centri: Partner[] = (centriRes.data || []).map((c) => ({
          id: c.id,
          business_name: c.business_name,
          address: c.address,
          latitude: c.latitude!,
          longitude: c.longitude!,
          type: 'centro' as const,
        }));

        setPartners([...corners, ...centri]);
      } catch (error) {
        console.error("Error fetching partners:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPartners();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default center (Italy)
    const defaultCenter: L.LatLngExpression = [41.9028, 12.4964];

    const map = L.map(mapContainerRef.current).setView(defaultCenter, 6);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add markers when partners change
  useEffect(() => {
    if (!mapRef.current || partners.length === 0) return;

    // Clear existing markers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        layer.remove();
      }
    });

    // Add markers for each partner
    const bounds: L.LatLngBoundsExpression = [];
    
    partners.forEach((partner) => {
      const icon = partner.type === 'corner' ? cornerIcon : centroIcon;
      const typeLabel = partner.type === 'corner' ? 'Corner' : 'Centro Assistenza';
      
      const marker = L.marker([partner.latitude, partner.longitude], { icon })
        .addTo(mapRef.current!);
      
      marker.bindPopup(`
        <div style="min-width: 180px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${partner.business_name}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">${typeLabel}</div>
          <div style="font-size: 11px; color: #888;">${partner.address}</div>
        </div>
      `);

      bounds.push([partner.latitude, partner.longitude]);
    });

    // Fit map to show all markers
    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
    }
  }, [partners]);

  if (loading) {
    return (
      <div className="h-[400px] rounded-2xl bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div 
        ref={mapContainerRef}
        className="h-[400px] rounded-2xl overflow-hidden border border-border/50 shadow-lg"
      />

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
            <Store className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-muted-foreground">Corner ({partners.filter(p => p.type === 'corner').length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
            <Building2 className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-muted-foreground">Centri Assistenza ({partners.filter(p => p.type === 'centro').length})</span>
        </div>
      </div>
    </div>
  );
}
