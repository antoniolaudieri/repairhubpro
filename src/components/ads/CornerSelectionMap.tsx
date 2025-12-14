import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Check } from "lucide-react";

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface Corner {
  id: string;
  business_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface CornerSelectionMapProps {
  corners: Corner[];
  selectedIds: string[];
  onToggle: (cornerId: string) => void;
}

// Create icons for selected/unselected states
const createCornerIcon = (isSelected: boolean) => {
  const color = isSelected ? '#22c55e' : '#f59e0b';
  const checkMark = isSelected ? `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;top:2px;right:2px;">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  ` : '';
  
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
      border: 3px solid white;
      cursor: pointer;
      position: relative;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
        <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
        <path d="M2 7h20"/>
      </svg>
      ${checkMark}
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

export function CornerSelectionMap({ corners, selectedIds, onToggle }: CornerSelectionMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Filter corners with valid coordinates
  const validCorners = corners.filter(c => c.latitude && c.longitude);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const defaultCenter: L.LatLngExpression = [41.9028, 12.4964];

    const map = L.map(mapContainerRef.current).setView(defaultCenter, 6);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    mapRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // Add/update markers when corners or selection changes
  useEffect(() => {
    if (!mapRef.current || validCorners.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    const bounds: L.LatLngExpression[] = [];

    validCorners.forEach((corner) => {
      const isSelected = selectedIds.includes(corner.id);
      const icon = createCornerIcon(isSelected);
      
      const marker = L.marker([corner.latitude!, corner.longitude!], { icon })
        .addTo(mapRef.current!);

      // Create popup content
      const popupContent = `
        <div style="min-width: 180px; font-family: system-ui, sans-serif;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">${corner.business_name}</div>
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">${corner.address}</div>
          <div style="
            background: ${isSelected ? '#dcfce7' : '#fef3c7'};
            color: ${isSelected ? '#16a34a' : '#d97706'};
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            text-align: center;
          ">
            ${isSelected ? '✓ Selezionato' : 'Clicca per selezionare'}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      // Handle click to toggle selection
      marker.on('click', () => {
        onToggle(corner.id);
        marker.closePopup();
      });

      markersRef.current.set(corner.id, marker);
      bounds.push([corner.latitude!, corner.longitude!]);
    });

    // Fit map to show all markers
    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
    }
  }, [validCorners, selectedIds, onToggle]);

  return (
    <div className="space-y-2">
      <div 
        ref={mapContainerRef}
        className="h-[300px] rounded-xl overflow-hidden border border-border shadow-sm"
        style={{ position: 'relative', zIndex: 0 }}
      />
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Non selezionato</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="h-2.5 w-2.5 text-white" />
          </div>
          <span className="text-muted-foreground">Selezionato</span>
        </div>
      </div>
    </div>
  );
}
