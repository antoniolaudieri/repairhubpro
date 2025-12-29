import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download,
  Clock,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Zap,
  Bug,
  Palette,
  Shield,
  Star,
  RefreshCw,
  Rocket,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Capacitor } from "@capacitor/core";
import DeviceDiagnostics from "@/plugins/DeviceStoragePlugin";
import { toast } from "sonner";

interface UpdateAvailableDialogProps {
  open: boolean;
  onDismiss: () => void;
  currentVersion: string;
  latestVersion: string;
  changelog: string;
  downloadUrl: string;
  releaseDate: string;
}

interface ParsedChange {
  type: "feature" | "fix" | "ui" | "security" | "performance" | "other";
  text: string;
}

export const UpdateAvailableDialog = ({
  open,
  onDismiss,
  currentVersion,
  latestVersion,
  changelog,
  downloadUrl,
  releaseDate,
}: UpdateAvailableDialogProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<
    "idle" | "downloading" | "installing" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isNative = Capacitor.isNativePlatform();

  const handleNativeDownload = async () => {
    if (!downloadUrl) {
      setErrorMessage("URL di download non disponibile");
      setDownloadStatus("error");
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadStatus("downloading");
    setErrorMessage(null);

    try {
      const fileName = `repairhubpro-v${latestVersion}.apk`;

      const progressInterval = setInterval(() => {
        setDownloadProgress((prev) => {
          if (prev >= 80) return 80;
          return prev + 5;
        });
      }, 300);

      const downloadResult = await DeviceDiagnostics.downloadApk({
        url: downloadUrl,
        fileName: fileName,
      });

      clearInterval(progressInterval);

      if (!downloadResult.success || !downloadResult.filePath) {
        throw new Error(downloadResult.error || "Download fallito");
      }

      setDownloadProgress(90);
      setDownloadStatus("installing");

      const installResult = await DeviceDiagnostics.installApk({
        filePath: downloadResult.filePath,
      });

      if (!installResult.success) {
        throw new Error(installResult.error || "Installazione fallita");
      }

      setDownloadProgress(100);
      setDownloadStatus("success");

      toast.success("Installazione avviata", {
        description: "Segui le istruzioni sullo schermo per completare l'aggiornamento",
      });
    } catch (error) {
      console.error("Error during native update:", error);
      setDownloadStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Errore durante l'aggiornamento");

      toast.error("Errore aggiornamento", {
        description: "Prova a scaricare manualmente dal browser",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBrowserDownload = () => {
    if (!downloadUrl) {
      console.error("No download URL available");
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadStatus("downloading");

    const progressInterval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    window.open(downloadUrl, "_blank");

    setTimeout(() => {
      clearInterval(progressInterval);
      setDownloadProgress(100);
      setDownloadStatus("success");

      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
        setDownloadStatus("idle");
      }, 1000);
    }, 2000);
  };

  const handleDownload = () => {
    if (isNative) {
      handleNativeDownload();
    } else {
      handleBrowserDownload();
    }
  };

  const handleRetry = () => {
    setDownloadStatus("idle");
    setErrorMessage(null);
    setDownloadProgress(0);
  };

  const formattedDate = releaseDate
    ? format(new Date(releaseDate), "d MMMM yyyy", { locale: it })
    : "";

  // Parse changelog with categorization
  const parseChangelog = (text: string): ParsedChange[] => {
    if (!text) return [];

    const lines = text.split("\n").filter((line) => line.trim());
    const changes: ParsedChange[] = [];

    lines.forEach((line) => {
      const cleanLine = line.replace(/^[#\-*]+\s*/, "").trim();
      if (!cleanLine) return;

      let type: ParsedChange["type"] = "other";
      const lowerLine = cleanLine.toLowerCase();

      if (
        lowerLine.includes("nuov") ||
        lowerLine.includes("aggiunt") ||
        lowerLine.includes("feat") ||
        lowerLine.includes("add")
      ) {
        type = "feature";
      } else if (
        lowerLine.includes("fix") ||
        lowerLine.includes("corrett") ||
        lowerLine.includes("risolt") ||
        lowerLine.includes("bug")
      ) {
        type = "fix";
      } else if (
        lowerLine.includes("ui") ||
        lowerLine.includes("design") ||
        lowerLine.includes("grafica") ||
        lowerLine.includes("stile") ||
        lowerLine.includes("interfaccia")
      ) {
        type = "ui";
      } else if (
        lowerLine.includes("sicur") ||
        lowerLine.includes("secur") ||
        lowerLine.includes("privacy")
      ) {
        type = "security";
      } else if (
        lowerLine.includes("performance") ||
        lowerLine.includes("veloc") ||
        lowerLine.includes("ottimizz")
      ) {
        type = "performance";
      }

      changes.push({ type, text: cleanLine });
    });

    return changes;
  };

  const getChangeIcon = (type: ParsedChange["type"]) => {
    switch (type) {
      case "feature":
        return <Sparkles className="h-3.5 w-3.5" />;
      case "fix":
        return <Bug className="h-3.5 w-3.5" />;
      case "ui":
        return <Palette className="h-3.5 w-3.5" />;
      case "security":
        return <Shield className="h-3.5 w-3.5" />;
      case "performance":
        return <Zap className="h-3.5 w-3.5" />;
      default:
        return <Star className="h-3.5 w-3.5" />;
    }
  };

  const getChangeColor = (type: ParsedChange["type"]) => {
    switch (type) {
      case "feature":
        return "text-purple-500 bg-purple-500/10";
      case "fix":
        return "text-red-500 bg-red-500/10";
      case "ui":
        return "text-pink-500 bg-pink-500/10";
      case "security":
        return "text-green-500 bg-green-500/10";
      case "performance":
        return "text-amber-500 bg-amber-500/10";
      default:
        return "text-blue-500 bg-blue-500/10";
    }
  };

  const getChangeLabel = (type: ParsedChange["type"]) => {
    switch (type) {
      case "feature":
        return "Novità";
      case "fix":
        return "Fix";
      case "ui":
        return "UI";
      case "security":
        return "Sicurezza";
      case "performance":
        return "Prestazioni";
      default:
        return "Altro";
    }
  };

  const parsedChanges = parseChangelog(changelog);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDismiss()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-0">
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 pb-8">
          {/* Animated sparkles */}
          <motion.div
            className="absolute top-4 right-4"
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="h-6 w-6 text-white/80" />
          </motion.div>

          <DialogHeader className="space-y-2">
            <DialogTitle className="text-white text-xl flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Aggiornamento Disponibile
            </DialogTitle>
            <p className="text-white/80 text-sm">
              Una nuova versione è pronta per te!
            </p>
          </DialogHeader>

          {/* Version Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-center gap-3 mt-4"
          >
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl text-center">
              <div className="text-[10px] text-white/70 uppercase tracking-wider">Attuale</div>
              <div className="text-lg font-mono font-bold text-white">v{currentVersion}</div>
            </div>

            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <ArrowRight className="h-5 w-5 text-white/80" />
            </motion.div>

            <div className="bg-white/30 backdrop-blur-sm px-4 py-2 rounded-xl text-center border border-white/30">
              <div className="text-[10px] text-white/70 uppercase tracking-wider">Nuova</div>
              <div className="text-lg font-mono font-bold text-white">v{latestVersion}</div>
            </div>
          </motion.div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Release date */}
          {formattedDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Rilasciata il {formattedDate}</span>
            </div>
          )}

          {/* Changelog */}
          {parsedChanges.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                Novità in questa versione
              </h4>
              <ScrollArea className="max-h-48">
                <div className="space-y-2 pr-2">
                  {parsedChanges.map((change, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-start gap-2 p-2 rounded-lg ${getChangeColor(change.type)}`}
                    >
                      <div className="flex-shrink-0 mt-0.5">{getChangeIcon(change.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {getChangeLabel(change.type)}
                          </Badge>
                        </div>
                        <p className="text-xs leading-relaxed">{change.text}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Progress during download */}
          <AnimatePresence>
            {(downloadStatus === "downloading" || downloadStatus === "installing") && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 py-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {downloadStatus === "downloading" ? "Download in corso..." : "Installazione..."}
                  </span>
                  <span className="text-muted-foreground">{downloadProgress}%</span>
                </div>
                <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${downloadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                  {/* Glow effect */}
                  <motion.div
                    className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: ["-100%", "400%"] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success state */}
          <AnimatePresence>
            {downloadStatus === "success" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                >
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </motion.div>
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    {isNative
                      ? "Installazione avviata!"
                      : "Download completato!"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isNative
                      ? "Segui le istruzioni sullo schermo"
                      : "Apri il file per installare"}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error state */}
          <AnimatePresence>
            {downloadStatus === "error" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                  <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      Errore durante l'aggiornamento
                    </p>
                    <p className="text-xs text-muted-foreground">{errorMessage}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleRetry} className="w-full">
                  Riprova
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="p-4 pt-0 space-y-2">
          {downloadStatus !== "success" && downloadStatus !== "error" && (
            <>
              <Button
                onClick={handleDownload}
                disabled={isDownloading || !downloadUrl}
                className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              >
                {isDownloading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <RefreshCw className="h-5 w-5 mr-2" />
                    </motion.div>
                    {downloadStatus === "installing" ? "Installazione..." : "Download in corso..."}
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    Scarica e Installa
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={onDismiss}
                disabled={isDownloading}
                className="w-full"
              >
                Più tardi
              </Button>
            </>
          )}
          {(downloadStatus === "success" || downloadStatus === "error") && (
            <Button variant="ghost" onClick={onDismiss} className="w-full">
              Chiudi
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
