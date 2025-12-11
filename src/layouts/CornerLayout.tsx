import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Plus, 
  List, 
  DollarSign, 
  LogOut, 
  Menu, 
  X,
  Handshake,
  Settings,
  CalendarCheck,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CornerNotificationCenter } from "@/components/corner/CornerNotificationCenter";
import { useCornerAppointmentNotifications } from "@/hooks/useCornerAppointmentNotifications";
import { useAutoPromptNotifications } from "@/hooks/useAutoPromptNotifications";

interface CornerLayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/corner", icon: Home, label: "Dashboard" },
  { to: "/corner/prenotazioni", icon: CalendarCheck, label: "Prenotazioni", showBadge: true },
  { to: "/corner/nuova-segnalazione", icon: Plus, label: "Nuova Segnalazione" },
  { to: "/corner/segnalazioni", icon: List, label: "Le Mie Segnalazioni" },
  { to: "/corner/usato", icon: Package, label: "Usato" },
  { to: "/corner/commissioni", icon: DollarSign, label: "Commissioni" },
  { to: "/corner/partnership", icon: Handshake, label: "Partnership" },
  { to: "/corner/impostazioni", icon: Settings, label: "Impostazioni" },
];

export const CornerLayout = ({ children }: CornerLayoutProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { pendingAppointmentsCount } = useCornerAppointmentNotifications();
  
  // Auto-prompt for push notifications after login
  useAutoPromptNotifications();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-card border-r border-border flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-primary">LabLinkRiparo Corner</h1>
              <p className="text-sm text-muted-foreground">Gestione Segnalazioni</p>
            </div>
            <CornerNotificationCenter />
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/corner"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
              {item.showBadge && pendingAppointmentsCount > 0 && (
                <Badge className="ml-auto bg-orange-500 text-white">
                  {pendingAppointmentsCount}
                </Badge>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            Esci
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold text-primary">LabLinkRiparo Corner</h1>
          <div className="flex items-center gap-2">
            <CornerNotificationCenter />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <nav className="p-4 space-y-2 bg-card border-b border-border">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/corner"}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
                {item.showBadge && pendingAppointmentsCount > 0 && (
                  <Badge className="ml-auto bg-orange-500 text-white">
                    {pendingAppointmentsCount}
                  </Badge>
                )}
              </NavLink>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 mt-4"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              Esci
            </Button>
          </nav>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 md:p-6 p-4 pt-20 md:pt-6 overflow-auto">
        {children}
      </main>
    </div>
  );
};
