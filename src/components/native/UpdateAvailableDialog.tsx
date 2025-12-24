import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Clock, Sparkles, CheckCircle, AlertCircle } from "lucide-react";
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
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'installing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isNative = Capacitor.isNativePlatform();

  const handleNativeDownload = async () => {
    if (!downloadUrl) {
      setErrorMessage("URL di download non disponibile");
      setDownloadStatus('error');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadStatus('downloading');
    setErrorMessage(null);

    try {
      // Generate filename from version
      const fileName = `repairhubpro-v${latestVersion}.apk`;
      
      // Simulate progress while downloading
      const progressInterval = setInterval(() => {
        setDownloadProgress((prev) => {
          if (prev >= 80) {
            return 80;
          }
          return prev + 5;
        });
      }, 300);

      // Download APK using native plugin
      const downloadResult = await DeviceDiagnostics.downloadApk({
        url: downloadUrl,
        fileName: fileName
      });

      clearInterval(progressInterval);

      if (!downloadResult.success || !downloadResult.filePath) {
        throw new Error(downloadResult.error || "Download fallito");
      }

      setDownloadProgress(90);
      setDownloadStatus('installing');

      // Install APK
      const installResult = await DeviceDiagnostics.installApk({
        filePath: downloadResult.filePath
      });

      if (!installResult.success) {
        throw new Error(installResult.error || "Installazione fallita");
      }

      setDownloadProgress(100);
      setDownloadStatus('success');
      
      toast.success("Installazione avviata", {
        description: "Segui le istruzioni sullo schermo per completare l'aggiornamento"
      });

    } catch (error) {
      console.error("Error during native update:", error);
      setDownloadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : "Errore durante l'aggiornamento");
      
      toast.error("Errore aggiornamento", {
        description: "Prova a scaricare manualmente dal browser"
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
    setDownloadStatus('downloading');

    // Simulate progress for browser download
    const progressInterval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    // Open download URL in browser
    window.open(downloadUrl, "_blank");

    setTimeout(() => {
      clearInterval(progressInterval);
      setDownloadProgress(100);
      setDownloadStatus('success');
      
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
        setDownloadStatus('idle');
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
    setDownloadStatus('idle');
    setErrorMessage(null);
    setDownloadProgress(0);
  };

  const formattedDate = releaseDate
    ? format(new Date(releaseDate), "d MMMM yyyy 'alle' HH:mm", { locale: it })
    : "";

  // Parse changelog per estrarre le sezioni
  const parseChangelog = (text: string) => {
    if (!text) return [];
    
    const lines = text.split("\n").filter((line) => line.trim());
    return lines.map((line) => {
      // Rimuovi i markdown headers e bullet points
      return line.replace(/^#+\s*/, "").replace(/^-\s*/, "• ");
    });
  };

  const changelogLines = parseChangelog(changelog);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Aggiornamento Disponibile
          </DialogTitle>
          <DialogDescription>
            Una nuova versione dell'app è disponibile
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Versioni */}
          <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Attuale</div>
              <div className="font-mono font-semibold">v{currentVersion}</div>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Nuova</div>
              <div className="font-mono font-semibold text-primary">
                v{latestVersion}
              </div>
            </div>
          </div>

          {/* Data rilascio */}
          {formattedDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Rilasciata il {formattedDate}</span>
            </div>
          )}

          {/* Changelog */}
          {changelogLines.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Novità:</div>
              <div className="max-h-40 overflow-y-auto space-y-1 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                {changelogLines.map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
              </div>
            </div>
          )}

          {/* Progress bar durante il download */}
          {(downloadStatus === 'downloading' || downloadStatus === 'installing') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {downloadStatus === 'downloading' ? 'Download in corso...' : 'Installazione in corso...'}
                </span>
                <span>{downloadProgress}%</span>
              </div>
              <Progress value={downloadProgress} className="h-2" />
            </div>
          )}

          {/* Success message */}
          {downloadStatus === 'success' && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              <span>
                {isNative 
                  ? "Installazione avviata! Segui le istruzioni sullo schermo."
                  : "Download completato! Apri il file per installare."}
              </span>
            </div>
          )}

          {/* Error message */}
          {downloadStatus === 'error' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span>{errorMessage || "Errore durante l'aggiornamento"}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="w-full"
              >
                Riprova
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {downloadStatus !== 'success' && downloadStatus !== 'error' && (
            <>
              <Button
                onClick={handleDownload}
                disabled={isDownloading || !downloadUrl}
                className="w-full"
              >
                {isDownloading ? (
                  <>
                    <Download className="h-4 w-4 mr-2 animate-bounce" />
                    {downloadStatus === 'installing' ? 'Installazione...' : 'Download in corso...'}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
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
          {(downloadStatus === 'success' || downloadStatus === 'error') && (
            <Button
              variant="ghost"
              onClick={onDismiss}
              className="w-full"
            >
              Chiudi
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
