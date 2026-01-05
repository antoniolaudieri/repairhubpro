import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { widgetRegistry, getAllWidgetTypes } from "./WidgetRegistry";
import { WidgetType, DashboardWidget } from "./types";
import { Check } from "lucide-react";

interface WidgetSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWidgets: DashboardWidget[];
  onAddWidget: (type: WidgetType) => void;
}

export const WidgetSelector = ({
  open,
  onOpenChange,
  currentWidgets,
  onAddWidget,
}: WidgetSelectorProps) => {
  const allTypes = getAllWidgetTypes();
  const currentTypes = currentWidgets.map((w) => w.type);

  const handleAdd = (type: WidgetType) => {
    onAddWidget(type);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Aggiungi Widget</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          {allTypes.map((type) => {
            const config = widgetRegistry[type];
            const isPresent = currentTypes.includes(type);
            const Icon = config.icon;

            return (
              <div
                key={type}
                className={`
                  relative p-4 rounded-lg border transition-all cursor-pointer
                  ${isPresent 
                    ? 'border-primary/50 bg-primary/5' 
                    : 'border-border hover:border-primary/30 hover:bg-muted/50'
                  }
                `}
                onClick={() => !isPresent && handleAdd(type)}
              >
                {isPresent && (
                  <Badge className="absolute top-2 right-2 h-5 w-5 p-0 flex items-center justify-center bg-primary">
                    <Check className="h-3 w-3" />
                  </Badge>
                )}
                
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{config.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {config.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
