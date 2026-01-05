import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Smartphone, ChevronRight } from "lucide-react";
import { useDashboardContext } from "../DashboardContext";
import { WidgetWrapper } from "../WidgetWrapper";

interface AlertsWidgetProps {
  id: string;
  onRemove?: (id: string) => void;
}

export const AlertsWidget = ({ id, onRemove }: AlertsWidgetProps) => {
  const navigate = useNavigate();
  const { forfeitureWarnings, isEditMode } = useDashboardContext();

  if (forfeitureWarnings.length === 0) {
    return (
      <WidgetWrapper
        id={id}
        title="Avvisi"
        onRemove={onRemove}
        showHeader
        headerIcon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
      >
        <div className="text-center py-6">
          <AlertTriangle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nessun avviso</p>
        </div>
      </WidgetWrapper>
    );
  }

  return (
    <WidgetWrapper
      id={id}
      title="Avvisi"
      onRemove={onRemove}
      noPadding
      className="border-rose-200 bg-rose-50/50"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-rose-500 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-rose-800 text-sm">Dispositivi in Scadenza</h3>
              <Badge className="bg-rose-500 text-white text-xs">{forfeitureWarnings.length}</Badge>
            </div>
            <div className="space-y-1.5">
              {forfeitureWarnings.slice(0, 3).map((warning) => (
                <div 
                  key={warning.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/80 cursor-pointer hover:bg-white transition-colors text-sm"
                  onClick={() => !isEditMode && navigate(`/repairs/${warning.id}`)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Smartphone className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                    <span className="font-medium text-foreground truncate">
                      {warning.device.brand} {warning.device.model}
                    </span>
                    <span className="text-muted-foreground truncate">• {warning.customer?.name || "N/A"}</span>
                  </div>
                  <Badge className={`${warning.daysLeft <= 3 ? 'bg-rose-600' : 'bg-rose-500'} text-white text-xs ml-2`}>
                    {warning.daysLeft}g
                  </Badge>
                </div>
              ))}
            </div>
            {forfeitureWarnings.length > 3 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2 h-7 text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-100 px-2"
                onClick={() => !isEditMode && navigate("/repairs?status=completed")}
              >
                Vedi tutti ({forfeitureWarnings.length})
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
};
