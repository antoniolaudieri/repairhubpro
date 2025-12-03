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
  PlusCircle
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
import { motion, AnimatePresence } from "framer-motion";

const menuItems = [
  { title: "Dashboard", url: "/centro", icon: LayoutDashboard },
  { title: "Nuovo Ritiro", url: "/centro/nuovo-ritiro", icon: PlusCircle },
  { title: "Lavori", url: "/centro/lavori", icon: Wrench },
  { title: "Guide IA", url: "/centro/guide", icon: BookOpen },
  { title: "Clienti", url: "/centro/clienti", icon: UserRound },
  { title: "Preventivi", url: "/centro/preventivi", icon: FileText },
  { title: "Inventario", url: "/centro/inventario", icon: Package },
  { title: "Ordini", url: "/centro/ordini", icon: ShoppingCart },
  { title: "Listino Prezzi", url: "/centro/listino", icon: Settings2 },
  { title: "Collaboratori", url: "/centro/collaboratori", icon: Users },
  { title: "Accessi Condivisi", url: "/centro/accessi", icon: Share2 },
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

  useEffect(() => {
    const fetchCentroInfo = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("centri_assistenza")
        .select("logo_url, business_name")
        .eq("owner_user_id", user.id)
        .single();
      
      if (data) {
        setLogoUrl(data.logo_url);
        setBusinessName(data.business_name || "Centro");
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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="h-full bg-sidebar text-sidebar-foreground flex flex-col">
        <SidebarHeader className="h-16 border-b border-sidebar-border flex items-center justify-center">
          <motion.div 
            className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className={`h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center ${!logoUrl ? 'bg-gradient-to-br from-primary to-primary-glow shadow-elegant' : ''}`}
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-5 w-5 text-primary-foreground" />
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
        
        <SidebarContent className="flex-1 py-4 px-2">
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
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 hover:bg-sidebar-accent/20 relative"
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
                              className="relative z-10"
                            >
                              <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'drop-shadow-glow' : ''}`} />
                            </motion.div>
                            <AnimatePresence mode="wait">
                              {!isCollapsed && (
                                <motion.span 
                                  className="text-sm relative z-10"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -10 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  {item.title}
                                </motion.span>
                              )}
                            </AnimatePresence>
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

        <div className="px-2">
          <Separator className="bg-sidebar-border" />
        </div>

        <SidebarFooter className="bg-sidebar py-4 px-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleSignOut}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive w-full relative overflow-hidden"
                tooltip="Esci"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-destructive/0 to-destructive/0 group-hover:from-destructive/10 group-hover:to-destructive/5 transition-all duration-300"
                />
                <motion.div
                  whileHover={{ scale: 1.15, rotate: -10 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="relative z-10"
                >
                  <LogOut className="h-5 w-5 flex-shrink-0" />
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
