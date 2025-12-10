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
  ScrollText,
  Settings2,
  BookOpen,
  Shield
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
import { motion, AnimatePresence } from "framer-motion";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Riparazioni", url: "/repairs", icon: Wrench },
  { title: "Guide IA", url: "/repair-guides", icon: BookOpen },
  { title: "Prenotazioni", url: "/appointments", icon: Calendar },
  { title: "Clienti", url: "/customers", icon: Users },
  { title: "Preventivi", url: "/quotes", icon: FileText },
  { title: "Magazzino", url: "/inventory", icon: Package },
  { title: "Ordini", url: "/orders", icon: ShoppingCart },
  { title: "Listino Prezzi", url: "/pricing-settings", icon: Settings2 },
  { title: "Feedback", url: "/feedback", icon: MessageSquare },
  { title: "Storico Firme", url: "/signature-history", icon: ScrollText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isPlatformAdmin } = useAuth();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  // Add platform admin menu item if user is platform admin
  const allMenuItems = isPlatformAdmin 
    ? [...menuItems, { title: "Admin Piattaforma", url: "/platform-admin", icon: Shield }]
    : menuItems;

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
              className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-elegant"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </motion.div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div 
                  className="flex flex-col"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-sm font-bold text-sidebar-foreground">LabLinkRiparo</span>
                  <span className="text-xs text-sidebar-foreground/60">Gestionale Riparazioni</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </SidebarHeader>
        
        <SidebarContent className="flex-1 py-4 px-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {allMenuItems.map((item, index) => {
                  const isActive = currentPath === item.url;
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
                            end
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 hover:bg-sidebar-accent/20 relative"
                            activeClassName="bg-gradient-to-r from-sidebar-accent to-sidebar-accent/80 text-sidebar-accent-foreground font-semibold shadow-elegant"
                          >
                            {isActive && (
                              <motion.div
                                layoutId="activeTab"
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
