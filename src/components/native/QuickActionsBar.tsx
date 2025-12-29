import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsBarProps {
  onSync: () => void;
  isSyncing: boolean;
  hasIssues?: boolean;
}

export const QuickActionsBar = ({
  onSync,
  isSyncing,
}: QuickActionsBarProps) => {
  return (
    <div className="w-full">
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="relative"
      >
        <Button
          onClick={onSync}
          disabled={isSyncing}
          size="lg"
          className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg"
        >
          <motion.div
            animate={isSyncing ? { rotate: 360 } : { rotate: 0 }}
            transition={isSyncing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
          >
            <RefreshCw className="h-5 w-5 mr-2" />
          </motion.div>
          {isSyncing ? "Sincronizzazione..." : "Sincronizza Dispositivo"}
        </Button>
        
        {/* Subtle glow effect */}
        {!isSyncing && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-primary/20 blur-xl -z-10"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </motion.div>
    </div>
  );
};
