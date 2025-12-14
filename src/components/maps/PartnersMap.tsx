import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Store, Building2, Loader2 } from "lucide-react";
import { OpeningHours, formatOpeningHoursForPopup } from "@/components/settings/OpeningHoursEditor";

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
  phone?: string;
  email?: string;
  logo_url?: string | null;
  opening_hours?: OpeningHours | null;
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
            .select("id, business_name, address, latitude, longitude, phone, opening_hours")
            .eq("status", "approved")
            .not("latitude", "is", null)
            .not("longitude", "is", null),
          supabase
            .from("centri_assistenza")
            .select("id, business_name, address, latitude, longitude, phone, email, logo_url, opening_hours")
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
          phone: c.phone,
          opening_hours: c.opening_hours as unknown as OpeningHours | null,
        }));

        const centri: Partner[] = (centriRes.data || []).map((c) => ({
          id: c.id,
          business_name: c.business_name,
          address: c.address,
          latitude: c.latitude!,
          longitude: c.longitude!,
          type: 'centro' as const,
          phone: c.phone,
          email: c.email,
          logo_url: c.logo_url,
          opening_hours: c.opening_hours as unknown as OpeningHours | null,
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

  // Initialize map after loading completes
  useEffect(() => {
    if (loading || !mapContainerRef.current || mapRef.current) return;

    // Default center (Italy)
    const defaultCenter: L.LatLngExpression = [41.9028, 12.4964];

    const map = L.map(mapContainerRef.current).setView(defaultCenter, 6);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    mapRef.current = map;

    // Force a resize after a short delay to ensure proper rendering
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [loading]);

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
      
      const marker = L.marker([partner.latitude, partner.longitude], { icon })
        .addTo(mapRef.current!);
      
      // Build popup content based on partner type
      let popupContent = '';
      
      if (partner.type === 'centro') {
        const logoHtml = partner.logo_url 
          ? `<img src="${partner.logo_url}" alt="${partner.business_name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 12px; border: 1px solid #e5e7eb;" />`
          : `<div style="width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
            </div>`;
        
        popupContent = `
          <div style="min-width: 260px; font-family: system-ui, -apple-system, sans-serif;">
            <div style="display: flex; align-items: flex-start;">
              ${logoHtml}
              <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 15px; color: #1f2937; margin-bottom: 2px;">${partner.business_name}</div>
                <div style="display: inline-block; background: #3b82f6; color: white; font-size: 10px; padding: 2px 8px; border-radius: 12px; font-weight: 600; margin-bottom: 6px;">CENTRO ASSISTENZA</div>
              </div>
            </div>
            <div style="border-top: 1px solid #e5e7eb; margin-top: 10px; padding-top: 10px;">
              <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280; margin-bottom: 4px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                ${partner.address}
              </div>
              ${partner.phone ? `<div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280; margin-bottom: 4px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                ${partner.phone}
              </div>` : ''}
              ${partner.email ? `<div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                ${partner.email}
              </div>` : ''}
            </div>
            <div style="background: #eff6ff; padding: 8px 10px; border-radius: 8px; margin-top: 10px;">
              <div style="font-size: 11px; color: #3b82f6; font-weight: 600;">🔧 Riparazioni professionali</div>
              <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">Smartphone, tablet, PC e altri dispositivi</div>
            </div>
            ${formatOpeningHoursForPopup(partner.opening_hours || null)}
          </div>
        `;
      } else {
        // Corner popup
        popupContent = `
          <div style="min-width: 220px; font-family: system-ui, -apple-system, sans-serif;">
            <div style="display: flex; align-items: flex-start;">
              <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
              </div>
              <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 15px; color: #1f2937; margin-bottom: 2px;">${partner.business_name}</div>
                <div style="display: inline-block; background: #f59e0b; color: white; font-size: 10px; padding: 2px 8px; border-radius: 12px; font-weight: 600;">CORNER</div>
              </div>
            </div>
            <div style="border-top: 1px solid #e5e7eb; margin-top: 10px; padding-top: 10px;">
              <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280; margin-bottom: 4px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                ${partner.address}
              </div>
              ${partner.phone ? `<div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                ${partner.phone}
              </div>` : ''}
            </div>
            <div style="background: #fef3c7; padding: 8px 10px; border-radius: 8px; margin-top: 10px;">
              <div style="font-size: 11px; color: #d97706; font-weight: 600;">📦 Punto Consegna & Ritiro</div>
              <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">Lascia qui il tuo dispositivo per la riparazione</div>
            </div>
            ${formatOpeningHoursForPopup(partner.opening_hours || null)}
          </div>
        `;
      }
      
      marker.bindPopup(popupContent, { maxWidth: 300 });

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
        style={{ position: 'relative', zIndex: 0 }}
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
