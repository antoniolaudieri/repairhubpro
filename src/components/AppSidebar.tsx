import { 
  LayoutDashboard, 
  Wrench, 
  Users, 
  Package, 
  ShoppingCart,
  LogOut,
  Calendar,
  MessageSquare,
  FileText,
  ScrollText
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { toast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Riparazioni", url: "/repairs", icon: Wrench },
  { title: "Prenotazioni", url: "/appointments", icon: Calendar },
  { title: "Clienti", url: "/customers", icon: Users },
  { title: "Preventivi", url: "/quotes", icon: FileText },
  { title: "Magazzino", url: "/inventory", icon: Package },
  { title: "Ordini", url: "/orders", icon: ShoppingCart },
  { title: "Feedback", url: "/feedback", icon: MessageSquare },
  { title: "Storico Firme", url: "/signature-history", icon: ScrollText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="h-full bg-sidebar text-sidebar-foreground flex flex-col">
        <SidebarHeader className="h-16 border-b border-sidebar-border flex items-center justify-center">
          <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'}`}>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-bold text-sidebar-foreground">TechRepair</span>
                <span className="text-xs text-sidebar-foreground/60">CRM System</span>
              </div>
            )}
          </div>
        </SidebarHeader>
        
        <SidebarContent className="flex-1 py-4 px-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = currentPath === item.url;
                  const Icon = item.icon;
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive} 
                        tooltip={item.title}
                        className="group"
                      >
                        <NavLink
                          to={item.url}
                          end
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-sidebar-accent/10"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-md"
                        >
                          <Icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
                          {!isCollapsed && <span className="text-sm">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <div className="px-2">
          <Separator className="bg-sidebar-border" />
        </div>

        <SidebarFooter className="bg-sidebar py-4 px-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleSignOut}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive w-full"
                tooltip="Esci"
              >
                <LogOut className="h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                {!isCollapsed && <span className="text-sm font-medium">Esci</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
