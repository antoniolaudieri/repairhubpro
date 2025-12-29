import { useState, useEffect } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  Smartphone,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ScanHistoryItem {
  id: string;
  created_at: string;
  scan_type: string;
  definitions_version: string;
  apps_scanned: number;
  threats_found: number;
  malware_count: number;
  adware_count: number;
  spyware_count: number;
  pua_count: number;
  suspicious_count: number;
  overall_risk_score: number;
  risk_level: string;
  scan_duration_ms: number;
}

interface ScanHistoryDialogProps {
  trigger?: React.ReactNode;
}

export const ScanHistoryDialog = ({ trigger }: ScanHistoryDialogProps) => {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("scan_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching scan history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case "critical":
        return <ShieldX className="h-5 w-5 text-red-500" />;
      case "high":
        return <ShieldAlert className="h-5 w-5 text-orange-500" />;
      case "medium":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "low":
        return <Shield className="h-5 w-5 text-blue-500" />;
      default:
        return <ShieldCheck className="h-5 w-5 text-green-500" />;
    }
  };

  const getRiskBadge = (riskLevel: string, score: number) => {
    const colors: Record<string, string> = {
      critical: "bg-red-500/20 text-red-500 border-red-500/30",
      high: "bg-orange-500/20 text-orange-500 border-orange-500/30",
      medium: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
      low: "bg-blue-500/20 text-blue-500 border-blue-500/30",
      safe: "bg-green-500/20 text-green-500 border-green-500/30",
    };

    return (
      <Badge variant="outline" className={`text-xs ${colors[riskLevel] || colors.safe}`}>
        {score}/100
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <History className="h-4 w-4" />
            Cronologia
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Cronologia Scansioni
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Smartphone className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">Nessuna scansione precedente</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {history.map((scan) => (
                <div
                  key={scan.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {getRiskIcon(scan.risk_level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">
                          {format(new Date(scan.created_at), "d MMM yyyy", { locale: it })}
                        </p>
                        {getRiskBadge(scan.risk_level, scan.overall_risk_score)}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(scan.created_at), "HH:mm", { locale: it })}
                        {" • "}
                        {(scan.scan_duration_ms / 1000).toFixed(1)}s
                      </p>

                      {/* Stats */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                          {scan.apps_scanned} app
                        </span>
                        {scan.threats_found > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-500 rounded">
                            {scan.threats_found} minacce
                          </span>
                        )}
                        {scan.malware_count > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded">
                            {scan.malware_count} malware
                          </span>
                        )}
                        {scan.adware_count > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded">
                            {scan.adware_count} adware
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
                          v{scan.definitions_version}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
