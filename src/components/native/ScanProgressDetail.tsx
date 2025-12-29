import { motion } from "framer-motion";
import { Search, Shield, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface RecentApp {
  name: string;
  icon?: string;
  status: "safe" | "threat" | "pending";
}

interface ScanProgressDetailProps {
  progress: number;
  currentApp: string;
  currentAppIcon?: string;
  phase: string;
  recentApps: RecentApp[];
  totalApps?: number;
  scannedApps?: number;
}

export const ScanProgressDetail = ({
  progress,
  currentApp,
  currentAppIcon,
  phase,
  recentApps,
  totalApps = 0,
  scannedApps = 0,
}: ScanProgressDetailProps) => {
  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case "loading_definitions":
        return "Caricamento database...";
      case "fetching_apps":
        return "Recupero app installate...";
      case "analyzing":
        return "Analisi in corso...";
      case "finalizing":
        return "Finalizzazione...";
      default:
        return "Preparazione...";
    }
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/5 border-indigo-500/30">
      <CardContent className="p-4 space-y-4">
        {/* Phase indicator */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{getPhaseLabel(phase)}</span>
          <span className="font-mono font-semibold">{progress}%</span>
        </div>

        {/* Progress bar */}
        <div className="relative h-3 bg-muted/30 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {/* Current app being analyzed */}
        {phase === "analyzing" && currentApp && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 bg-background/50 rounded-xl"
          >
            {/* App icon */}
            <div className="relative">
              {currentAppIcon ? (
                <img
                  src={`data:image/png;base64,${currentAppIcon}`}
                  alt=""
                  className="h-12 w-12 rounded-xl"
                />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <motion.div
                className="absolute -right-1 -bottom-1 h-5 w-5 bg-indigo-500 rounded-full flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Loader2 className="h-3 w-3 text-white animate-spin" />
              </motion.div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{currentApp}</p>
              <p className="text-xs text-muted-foreground">
                Analisi in corso... {scannedApps}/{totalApps}
              </p>
            </div>
          </motion.div>
        )}

        {/* Recent apps analyzed */}
        {recentApps.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Ultime app analizzate:</p>
            <div className="flex flex-col gap-1">
              {recentApps.slice(0, 5).map((app, index) => (
                <motion.div
                  key={`${app.name}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-2 text-xs"
                >
                  {/* App mini icon */}
                  {app.icon ? (
                    <img
                      src={`data:image/png;base64,${app.icon}`}
                      alt=""
                      className="h-5 w-5 rounded"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded bg-muted flex items-center justify-center">
                      <Shield className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}

                  <span className="flex-1 truncate">{app.name}</span>

                  {/* Status icon */}
                  {app.status === "safe" ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : app.status === "threat" ? (
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                  ) : (
                    <Loader2 className="h-3 w-3 text-muted-foreground animate-spin" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Checks being performed */}
        <div className="flex flex-wrap gap-1">
          {["Firma", "Permessi", "Pattern", "Fonte"].map((check, i) => (
            <motion.span
              key={check}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ delay: i * 0.2, duration: 1, repeat: Infinity }}
              className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full"
            >
              {check}
            </motion.span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
