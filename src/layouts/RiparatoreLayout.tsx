import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Briefcase, 
  List, 
  DollarSign, 
  LogOut, 
  Menu, 
  X,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RiparatoreLayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/riparatore", icon: Home, label: "Dashboard" },
  { to: "/riparatore/offerte", icon: Briefcase, label: "Offerte Lavoro" },
  { to: "/riparatore/lavori", icon: List, label: "I Miei Lavori" },
  { to: "/riparatore/commissioni", icon: DollarSign, label: "Commissioni" },
  { to: "/riparatore/impostazioni", icon: Settings, label: "Impostazioni" },
];

export const RiparatoreLayout = ({ children }: RiparatoreLayoutProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-card border-r border-border flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-primary">Riparatore Portal</h1>
          <p className="text-sm text-muted-foreground">Gestione Lavori</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/riparatore"}
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
          <h1 className="text-lg font-bold text-primary">Riparatore Portal</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {isMobileMenuOpen && (
          <nav className="p-4 space-y-2 bg-card border-b border-border">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/riparatore"}
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
