import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Wrench, 
  Users, 
  Package, 
  LogOut,
  DollarSign,
  Settings,
  Share2,
  UserRound,
  Building2,
  BookOpen,
  FileText,
  ShoppingCart,
  Settings2,
  PlusCircle,
  Store,
  Bell,
  Smartphone
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

import { Search } from "lucide-react";

const menuItems = [
  { title: "Dashboard", url: "/centro", icon: LayoutDashboard },
  { title: "Nuovo Ritiro", url: "/centro/nuovo-ritiro", icon: PlusCircle },
  { title: "Trova Partner", url: "/centro/trova-partner", icon: Search },
  { title: "Lavori Corner", url: "/centro/lavori-corner", icon: Store, hasBadge: true },
  { title: "Lavori", url: "/centro/lavori", icon: Wrench },
  { title: "Guide IA", url: "/centro/guide", icon: BookOpen },
  { title: "Clienti", url: "/centro/clienti", icon: UserRound },
  { title: "Preventivi", url: "/centro/preventivi", icon: FileText },
  { title: "Inventario", url: "/centro/inventario", icon: Package },
  { title: "Ordini", url: "/centro/ordini", icon: ShoppingCart },
  { title: "Listino Prezzi", url: "/centro/listino", icon: Settings2 },
  { title: "Collaboratori", url: "/centro/collaboratori", icon: Users },
  { title: "Accessi Condivisi", url: "/centro/accessi", icon: Share2 },
  { title: "Usato", url: "/centro/usato", icon: Smartphone },
  { title: "Commissioni", url: "/centro/commissioni", icon: DollarSign },
  { title: "Impostazioni", url: "/centro/impostazioni", icon: Settings },
];

export function CentroSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("Centro");
  const [pendingCornerJobs, setPendingCornerJobs] = useState(0);

  useEffect(() => {
    const fetchCentroInfo = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("centri_assistenza")
        .select("id, logo_url, business_name")
        .eq("owner_user_id", user.id)
        .single();
      
      if (data) {
        setLogoUrl(data.logo_url);
        setBusinessName(data.business_name || "Centro");
        
        // Fetch pending corner requests count (repair_requests assigned to this Centro from Corners)
        const { count } = await supabase
          .from("repair_requests")
          .select("*", { count: "exact", head: true })
          .eq("assigned_provider_type", "centro")
          .eq("assigned_provider_id", data.id)
          .not("corner_id", "is", null)
          .in("status", ["assigned", "pending"]);
        
        setPendingCornerJobs(count || 0);
        
        // Subscribe to repair_requests changes
        const channel = supabase
          .channel("sidebar-corner-requests")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "repair_requests",
            },
            async () => {
              const { count: newCount } = await supabase
                .from("repair_requests")
                .select("*", { count: "exact", head: true })
                .eq("assigned_provider_type", "centro")
                .eq("assigned_provider_id", data.id)
                .not("corner_id", "is", null)
                .in("status", ["assigned", "pending"]);
              
              setPendingCornerJobs(newCount || 0);
            }
          )
          .subscribe();
        
        return () => {
          supabase.removeChannel(channel);
        };
      }
    };

    fetchCentroInfo();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Disconnesso",
      description: "Sei stato disconnesso con successo",
    });
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border h-full">
      <div className="min-h-full h-full bg-sidebar text-sidebar-foreground flex flex-col">
        <SidebarHeader className={`h-16 border-b border-sidebar-border flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-center px-4'}`}>
          <motion.div 
            className={`flex items-center transition-all duration-300 ${isCollapsed ? 'justify-center' : 'gap-3'}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className={`rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 ${isCollapsed ? 'h-8 w-8' : 'h-9 w-9'} ${!logoUrl ? 'bg-gradient-to-br from-primary to-primary-glow shadow-elegant' : ''}`}
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Building2 className={`text-primary-foreground ${isCollapsed ? 'h-4 w-4' : 'h-5 w-5'}`} />
              )}
            </motion.div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div 
                  className="flex flex-col overflow-hidden"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-sm font-bold text-sidebar-foreground truncate max-w-[140px]">{businessName}</span>
                  <span className="text-xs text-sidebar-foreground/60">Assistenza</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </SidebarHeader>
        
        <SidebarContent className={`flex-1 py-4 overflow-y-auto overflow-x-hidden ${isCollapsed ? 'px-1' : 'px-2'}`}>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuItems.map((item, index) => {
                  const isActive = item.url === "/centro" 
                    ? currentPath === "/centro"
                    : currentPath.startsWith(item.url);
                  const Icon = item.icon;
                  
                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                      <SidebarMenuItem>
                        <SidebarMenuButton 
                          asChild 
                          isActive={isActive} 
                          tooltip={item.title}
                          className="group relative overflow-hidden"
                        >
                          <NavLink
                            to={item.url}
                            end={item.url === "/centro"}
                            className={`flex items-center rounded-xl transition-all duration-300 hover:bg-sidebar-accent/20 relative ${isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'}`}
                            activeClassName="bg-gradient-to-r from-sidebar-accent to-sidebar-accent/80 text-sidebar-accent-foreground font-semibold shadow-elegant"
                          >
                            {isActive && (
                              <motion.div
                                layoutId="centroActiveTab"
                                className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary-glow/10 rounded-xl"
                                initial={false}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              />
                            )}
                            <motion.div
                              whileHover={{ scale: 1.15, rotate: isActive ? 0 : 5 }}
                              whileTap={{ scale: 0.9 }}
                              transition={{ type: "spring", stiffness: 400, damping: 17 }}
                              className="relative z-10 flex-shrink-0"
                            >
                              <Icon className={`h-5 w-5 ${isActive ? 'drop-shadow-glow' : ''} ${(item as any).hasBadge && pendingCornerJobs > 0 ? 'text-amber-500' : ''}`} />
                            </motion.div>
                            <AnimatePresence mode="wait">
                              {!isCollapsed && (
                                <motion.div 
                                  className="flex items-center gap-2 flex-1 relative z-10"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -10 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <span className="text-sm">{item.title}</span>
                                  {(item as any).hasBadge && pendingCornerJobs > 0 && (
                                    <Badge className="h-5 min-w-[20px] px-1.5 bg-amber-500 text-white text-xs animate-pulse">
                                      {pendingCornerJobs}
                                    </Badge>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                            {isCollapsed && (item as any).hasBadge && pendingCornerJobs > 0 && (
                              <Badge className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-amber-500 text-white text-[10px] animate-pulse">
                                {pendingCornerJobs}
                              </Badge>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </motion.div>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <div className={isCollapsed ? 'px-1' : 'px-2'}>
          <Separator className="bg-sidebar-border" />
        </div>

        <SidebarFooter className={`bg-sidebar py-4 ${isCollapsed ? 'px-1' : 'px-2'}`}>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleSignOut}
                className={`group flex items-center rounded-xl transition-all duration-300 text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive w-full relative overflow-hidden ${isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'}`}
                tooltip="Esci"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-destructive/0 to-destructive/0 group-hover:from-destructive/10 group-hover:to-destructive/5 transition-all duration-300"
                />
                <motion.div
                  whileHover={{ scale: 1.15, rotate: -10 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="relative z-10 flex-shrink-0"
                >
                  <LogOut className="h-5 w-5" />
                </motion.div>
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span 
                      className="text-sm font-medium relative z-10"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      Esci
                    </motion.span>
                  )}
                </AnimatePresence>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
