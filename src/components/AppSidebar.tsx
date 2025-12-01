import { 
  LayoutDashboard, 
  Wrench, 
  Users, 
  Package, 
  ShoppingCart,
  LogOut,
  Calendar,
  MessageSquare
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Riparazioni", url: "/repairs", icon: Wrench },
  { title: "Prenotazioni", url: "/appointments", icon: Calendar },
  { title: "Clienti", url: "/customers", icon: Users },
  { title: "Magazzino", url: "/inventory", icon: Package },
  { title: "Ordini", url: "/orders", icon: ShoppingCart },
  { title: "Feedback", url: "/feedback", icon: MessageSquare },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Disconnesso",
      description: "Sei stato disconnesso con successo",
    });
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="h-full bg-sidebar text-sidebar-foreground">
        <SidebarContent className="bg-sidebar">
          <SidebarGroup className="pt-4">
            <SidebarGroupLabel className={isCollapsed ? "hidden" : "text-sidebar-foreground/70 px-3 mb-2 text-xs font-semibold uppercase tracking-wider"}>
              TechRepair CRM
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = currentPath === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild className="group">
                        <NavLink
                          to={item.url}
                          end
                          className={`
                            transition-all duration-200 rounded-lg
                            ${isActive 
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-md' 
                              : 'hover:bg-sidebar-accent/10 text-sidebar-foreground/80 hover:text-sidebar-foreground'
                            }
                          `}
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                        >
                          <item.icon className={`h-5 w-5 ${isActive ? 'text-sidebar-accent-foreground' : ''}`} />
                          {!isCollapsed && <span className="font-medium">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="bg-sidebar border-t border-sidebar-border mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <button
                  onClick={handleSignOut}
                  className="w-full hover:bg-destructive/20 hover:text-destructive text-sidebar-foreground/80 transition-colors rounded-lg"
                >
                  <LogOut className="h-5 w-5" />
                  {!isCollapsed && <span className="font-medium">Esci</span>}
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
