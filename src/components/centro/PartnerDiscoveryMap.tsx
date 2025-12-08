import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
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
  phone: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  distance?: number;
}

interface InviteStatus {
  [cornerId: string]: "pending" | "accepted" | "declined" | "partner";
}

interface PartnerDiscoveryMapProps {
  corners: Corner[];
  centroLocation: { lat: number; lng: number } | null;
  inviteStatuses: InviteStatus;
  onSelectCorner: (corner: Corner) => void;
}

const createCornerIcon = (inviteStatus?: string, cornerStatus?: string) => {
  let bgColor = "#10b981"; // green - approved default
  let borderColor = "#059669";
  let icon = "🏪";

  // First check invite status
  if (inviteStatus === "partner") {
    bgColor = "#10b981";
    borderColor = "#059669";
    icon = "✓";
  } else if (inviteStatus === "pending") {
    bgColor = "#3b82f6";
    borderColor = "#1d4ed8";
    icon = "⏳";
  } else if (inviteStatus === "declined") {
    bgColor = "#ef4444";
    borderColor = "#dc2626";
    icon = "✗";
  } else if (cornerStatus === "pending") {
    // Corner not yet approved on platform
    bgColor = "#f59e0b";
    borderColor = "#d97706";
    icon = "⭐";
  }

  return L.divIcon({
    className: "custom-corner-marker",
    html: `
      <div style="
        width: 40px;
        height: 40px;
        border-radius: 50% 50% 50% 0;
        background: ${bgColor};
        border: 3px solid ${borderColor};
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 16px;
          color: white;
          font-weight: bold;
        ">${icon}</span>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

const centroIcon = L.divIcon({
  className: "custom-centro-marker",
  html: `
    <div style="
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      border: 4px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(59, 130, 246, 0.5);
    ">
      <span style="font-size: 24px;">🏢</span>
    </div>
  `,
  iconSize: [50, 50],
  iconAnchor: [25, 25],
  popupAnchor: [0, -25],
});

export function PartnerDiscoveryMap({
  corners,
  centroLocation,
  inviteStatuses,
  onSelectCorner,
}: PartnerDiscoveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    const defaultCenter: [number, number] = centroLocation
      ? [centroLocation.lat, centroLocation.lng]
      : [41.9028, 12.4964]; // Rome

    mapRef.current = L.map(mapContainerRef.current).setView(defaultCenter, 10);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds: L.LatLngExpression[] = [];

    // Add centro marker
    if (centroLocation) {
      const centroMarker = L.marker([centroLocation.lat, centroLocation.lng], {
        icon: centroIcon,
      })
        .addTo(mapRef.current)
        .bindPopup(
          `<div style="text-align: center; padding: 8px;">
            <strong style="font-size: 16px;">📍 La tua posizione</strong>
          </div>`
        );
      markersRef.current.push(centroMarker);
      bounds.push([centroLocation.lat, centroLocation.lng]);
    }

    // Add corner markers
    corners.forEach((corner) => {
      if (!corner.latitude || !corner.longitude) return;

      const inviteStatus = inviteStatuses[corner.id];
      const marker = L.marker([corner.latitude, corner.longitude], {
        icon: createCornerIcon(inviteStatus, corner.status),
      }).addTo(mapRef.current!);

      const cornerPendingBadge = corner.status === "pending" 
        ? `<span style="
            display: inline-block;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: 600;
            margin-bottom: 4px;
            background: #fef3c7;
            color: #92400e;
          ">⭐ Non ancora attivo sulla piattaforma</span><br/>`
        : "";

      const statusBadge = inviteStatus
        ? `<span style="
            display: inline-block;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 600;
            margin-top: 8px;
            background: ${inviteStatus === "partner" ? "#dcfce7" : inviteStatus === "pending" ? "#dbeafe" : inviteStatus === "declined" ? "#fee2e2" : "#e0e7ff"};
            color: ${inviteStatus === "partner" ? "#166534" : inviteStatus === "pending" ? "#1d4ed8" : inviteStatus === "declined" ? "#dc2626" : "#3730a3"};
          ">${inviteStatus === "partner" ? "✓ Partner" : inviteStatus === "pending" ? "⏳ Richiesta inviata" : inviteStatus === "declined" ? "✗ Rifiutato" : "Disponibile"}</span>`
        : `<button 
            id="invite-${corner.id}"
            style="
              margin-top: 8px;
              padding: 6px 16px;
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 12px;
              font-weight: 600;
              cursor: pointer;
              width: 100%;
            "
          >📨 Invia Richiesta</button>`;

      marker.bindPopup(`
        <div style="min-width: 200px; padding: 4px;">
          ${cornerPendingBadge}
          <div style="font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 4px;">
            ${corner.business_name}
          </div>
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
            📍 ${corner.address}
          </div>
          <div style="font-size: 12px; color: #6b7280;">
            📞 ${corner.phone}<br/>
            ✉️ ${corner.email}
          </div>
          ${corner.distance !== undefined ? `
            <div style="margin-top: 8px; font-size: 13px; color: #3b82f6; font-weight: 600;">
              🚗 ${corner.distance.toFixed(1)} km da te
            </div>
          ` : ""}
          ${statusBadge}
        </div>
      `);

      marker.on("popupopen", () => {
        const btn = document.getElementById(`invite-${corner.id}`);
        if (btn) {
          btn.addEventListener("click", () => {
            onSelectCorner(corner);
          });
        }
      });

      markersRef.current.push(marker);
      bounds.push([corner.latitude, corner.longitude]);
    });

    // Fit bounds
    if (bounds.length > 1) {
      mapRef.current.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
    } else if (bounds.length === 1) {
      mapRef.current.setView(bounds[0] as L.LatLngExpression, 12);
    }
  }, [corners, centroLocation, inviteStatuses, onSelectCorner]);

  return (
    <div className="relative">
      <div ref={mapContainerRef} className="h-[500px] rounded-lg" />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border z-[1000]">
        <p className="text-xs font-semibold mb-2">Legenda</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-blue-500" />
            <span>Tu (Centro)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <span>Corner attivi</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-amber-500" />
            <span>Corner in attesa approvazione</span>
          </div>
        </div>
      </div>
    </div>
  );
}
