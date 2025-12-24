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
import { Download, Clock, Sparkles, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

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

  const handleDownload = async () => {
    if (!downloadUrl) {
      console.error("No download URL available");
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // Simuliamo il progresso mentre scarichiamo
      const progressInterval = setInterval(() => {
        setDownloadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Apri l'URL di download direttamente (il browser/sistema gestirà il download)
      window.open(downloadUrl, "_blank");

      // Completa il progresso
      setTimeout(() => {
        clearInterval(progressInterval);
        setDownloadProgress(100);
        
        setTimeout(() => {
          setIsDownloading(false);
          setDownloadProgress(0);
        }, 1000);
      }, 2000);
    } catch (error) {
      console.error("Error downloading update:", error);
      setIsDownloading(false);
      setDownloadProgress(0);
    }
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
          {isDownloading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Download in corso...</span>
                <span>{downloadProgress}%</span>
              </div>
              <Progress value={downloadProgress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleDownload}
            disabled={isDownloading || !downloadUrl}
            className="w-full"
          >
            {isDownloading ? (
              <>
                <Download className="h-4 w-4 mr-2 animate-bounce" />
                Download in corso...
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
