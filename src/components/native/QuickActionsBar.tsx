import { motion } from "framer-motion";
import { RefreshCw, Calendar, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsBarProps {
  onSync: () => void;
  onBookCheckup: () => void;
  isSyncing: boolean;
  hasIssues: boolean;
}

export const QuickActionsBar = ({
  onSync,
  onBookCheckup,
  isSyncing,
  hasIssues,
}: QuickActionsBarProps) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Sync Button */}
      <motion.div
        whileTap={{ scale: 0.95 }}
        className="relative"
      >
        <Button
          onClick={onSync}
          disabled={isSyncing}
          className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold shadow-lg"
          size="lg"
        >
          <motion.div
            animate={isSyncing ? { rotate: 360 } : { rotate: 0 }}
            transition={isSyncing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
          >
            <RefreshCw className="h-5 w-5 mr-2" />
          </motion.div>
          {isSyncing ? "Sincronizzando..." : "Sincronizza"}
        </Button>
        
        {/* Glow effect */}
        {!isSyncing && (
          <motion.div
            className="absolute inset-0 rounded-md bg-primary/20 blur-xl -z-10"
            animate={{
              scale: [1, 1.2, 1],
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

      {/* Book Checkup Button */}
      <motion.div whileTap={{ scale: 0.95 }}>
        <Button
          onClick={onBookCheckup}
          variant={hasIssues ? "destructive" : "outline"}
          className={`w-full h-14 font-semibold ${
            hasIssues 
              ? "bg-gradient-to-r from-destructive to-destructive/80" 
              : "border-2"
          }`}
          size="lg"
        >
          {hasIssues ? (
            <AlertTriangle className="h-5 w-5 mr-2" />
          ) : (
            <Calendar className="h-5 w-5 mr-2" />
          )}
          {hasIssues ? "Prenota Check-up" : "Prenota"}
        </Button>
      </motion.div>
    </div>
  );
};
