import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Activity,
  Wrench, 
  Users, 
  Package, 
  ShoppingCart, 
  Calendar,
  ChevronRight,
} from "lucide-react";
import { useDashboardContext } from "../DashboardContext";
import { WidgetWrapper } from "../WidgetWrapper";

interface QuickAccessWidgetProps {
  id: string;
  onRemove?: (id: string) => void;
}

const quickAccessItems = [
  { icon: Wrench, label: "Gestione Riparazioni", path: "/repairs", color: "text-blue-500 bg-blue-100" },
  { icon: Users, label: "Clienti", path: "/customers", color: "text-violet-500 bg-violet-100" },
  { icon: Package, label: "Magazzino", path: "/inventory", color: "text-orange-500 bg-orange-100" },
  { icon: ShoppingCart, label: "Ordini Ricambi", path: "/orders", color: "text-emerald-500 bg-emerald-100" },
  { icon: Calendar, label: "Appuntamenti", path: "/appointments", color: "text-pink-500 bg-pink-100" },
];

export const QuickAccessWidget = ({ id, onRemove }: QuickAccessWidgetProps) => {
  const navigate = useNavigate();
  const { isEditMode } = useDashboardContext();

  return (
    <WidgetWrapper
      id={id}
      title="Accesso Rapido"
      onRemove={onRemove}
      showHeader
      headerIcon={<Activity className="h-4 w-4 text-muted-foreground" />}
    >
      <div className="space-y-1">
        {quickAccessItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            className="w-full justify-start h-11 font-normal hover:bg-muted/50 group"
            onClick={() => !isEditMode && navigate(item.path)}
          >
            <div className={`h-7 w-7 rounded-md ${item.color} flex items-center justify-center mr-3`}>
              <item.icon className="h-3.5 w-3.5" />
            </div>
            <span className="flex-1 text-left text-sm">{item.label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Button>
        ))}
      </div>
    </WidgetWrapper>
  );
};
