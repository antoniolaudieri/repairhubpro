import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wrench, 
  ChevronRight, 
  Clock, 
  Package, 
  CheckCircle2, 
  AlertTriangle,
  Smartphone,
  Tablet,
  Laptop,
  Watch,
  Monitor,
  Gamepad2,
} from "lucide-react";
import { useDashboardContext } from "../DashboardContext";
import { WidgetWrapper } from "../WidgetWrapper";

interface RecentRepairsWidgetProps {
  id: string;
  onRemove?: (id: string) => void;
}

const statusConfig: Record<string, { label: string; bg: string; text: string; icon: typeof Clock }> = {
  pending: { label: "In attesa", bg: "bg-amber-100", text: "text-amber-700", icon: Clock },
  in_progress: { label: "In corso", bg: "bg-blue-100", text: "text-blue-700", icon: Wrench },
  waiting_parts: { label: "Attesa ricambi", bg: "bg-orange-100", text: "text-orange-700", icon: Package },
  completed: { label: "Completata", bg: "bg-emerald-100", text: "text-emerald-700", icon: CheckCircle2 },
  cancelled: { label: "Annullata", bg: "bg-red-100", text: "text-red-700", icon: AlertTriangle },
  forfeited: { label: "Alienato", bg: "bg-rose-100", text: "text-rose-900", icon: AlertTriangle },
};

const getDeviceIcon = (deviceType: string) => {
  switch (deviceType?.toLowerCase()) {
    case 'tablet': return Tablet;
    case 'laptop': return Laptop;
    case 'smartwatch': return Watch;
    case 'console': return Gamepad2;
    case 'pc': return Monitor;
    default: return Smartphone;
  }
};

export const RecentRepairsWidget = ({ id, onRemove }: RecentRepairsWidgetProps) => {
  const navigate = useNavigate();
  const { recentRepairs, isEditMode } = useDashboardContext();

  return (
    <WidgetWrapper
      id={id}
      title="Riparazioni Recenti"
      onRemove={onRemove}
      showHeader
      headerIcon={<Wrench className="h-4 w-4 text-muted-foreground" />}
      headerAction={
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => !isEditMode && navigate("/repairs")}
          className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
        >
          Vedi tutte
          <ChevronRight className="h-3 w-3" />
        </Button>
      }
    >
      {recentRepairs.length === 0 ? (
        <div className="text-center py-8">
          <Wrench className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nessuna riparazione</p>
        </div>
      ) : (
        <div className="space-y-1">
          {recentRepairs.map((repair) => {
            const status = statusConfig[repair.status] || statusConfig.pending;
            const DeviceIcon = getDeviceIcon(repair.device.device_type);
            return (
              <div
                key={repair.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => !isEditMode && navigate(`/repairs/${repair.id}`)}
              >
                <div className="relative h-9 w-9 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                  {repair.device.photo_url ? (
                    <img 
                      src={repair.device.photo_url} 
                      alt={`${repair.device.brand} ${repair.device.model}`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <DeviceIcon className={`h-4 w-4 text-muted-foreground ${repair.device.photo_url ? 'hidden' : ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {repair.device.brand} {repair.device.model}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {repair.customer?.name || "Cliente sconosciuto"}
                  </p>
                </div>
                <Badge className={`${status.bg} ${status.text} border-0 text-xs px-2 py-0.5`}>
                  {status.label}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </WidgetWrapper>
  );
};
