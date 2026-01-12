import { motion } from "framer-motion";
import { Home, Activity, User } from "lucide-react";

export type NativeView = "home" | "diagnostics" | "profile";

interface BottomNavBarProps {
  currentView: NativeView;
  onNavigate: (view: NativeView) => void;
  unreadNotifications?: number;
}

const navItems: { id: NativeView; icon: typeof Home; label: string }[] = [
  { id: "home", icon: Home, label: "Home" },
  { id: "diagnostics", icon: Activity, label: "Diagnostica" },
  { id: "profile", icon: User, label: "Profilo" },
];

export const BottomNavBar = ({ currentView, onNavigate, unreadNotifications = 0 }: BottomNavBarProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-16 w-full max-w-full">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors ${
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                className="relative"
                animate={isActive ? { y: -2 } : { y: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <Icon className="h-5 w-5" />
                
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                
                {/* Notification badge for profile */}
                {item.id === "profile" && unreadNotifications > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-bold rounded-full"
                  >
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </motion.span>
                )}
              </motion.div>
              
              <span className={`text-[10px] font-medium ${isActive ? "text-primary" : ""}`}>
                {item.label}
              </span>
              
              {/* Glow effect for active */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 bg-primary/10 rounded-xl -z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
