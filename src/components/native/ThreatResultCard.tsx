import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldX,
  ShieldAlert,
  Eye,
  Megaphone,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Shield,
  Info,
  Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ScanResult } from "@/hooks/useMalwareScanner";

interface ThreatResultCardProps {
  result: ScanResult;
  index: number;
  onUninstall?: (packageName: string) => void;
}

export const ThreatResultCard = ({ result, index, onUninstall }: ThreatResultCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getThreatIcon = () => {
    switch (result.threatLevel) {
      case "malware":
      case "trojan":
        return <ShieldX className="h-5 w-5" />;
      case "spyware":
        return <Eye className="h-5 w-5" />;
      case "adware":
        return <Megaphone className="h-5 w-5" />;
      case "riskware":
        return <AlertTriangle className="h-5 w-5" />;
      case "pua":
        return <ShieldAlert className="h-5 w-5" />;
      case "suspicious":
        return <Info className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  const getThreatColors = () => {
    switch (result.threatLevel) {
      case "malware":
      case "trojan":
        return {
          bg: "bg-red-500",
          border: "border-red-500/50",
          bgLight: "bg-red-500/10",
          text: "text-red-500",
        };
      case "spyware":
        return {
          bg: "bg-purple-500",
          border: "border-purple-500/50",
          bgLight: "bg-purple-500/10",
          text: "text-purple-500",
        };
      case "adware":
        return {
          bg: "bg-orange-500",
          border: "border-orange-500/50",
          bgLight: "bg-orange-500/10",
          text: "text-orange-500",
        };
      case "riskware":
        return {
          bg: "bg-amber-500",
          border: "border-amber-500/50",
          bgLight: "bg-amber-500/10",
          text: "text-amber-500",
        };
      case "pua":
        return {
          bg: "bg-yellow-500",
          border: "border-yellow-500/50",
          bgLight: "bg-yellow-500/10",
          text: "text-yellow-500",
        };
      case "suspicious":
        return {
          bg: "bg-blue-500",
          border: "border-blue-500/50",
          bgLight: "bg-blue-500/10",
          text: "text-blue-500",
        };
      default:
        return {
          bg: "bg-green-500",
          border: "border-green-500/50",
          bgLight: "bg-green-500/10",
          text: "text-green-500",
        };
    }
  };

  const getThreatLabel = () => {
    const labels: Record<string, string> = {
      malware: "Malware",
      trojan: "Trojan",
      spyware: "Spyware",
      adware: "Adware",
      riskware: "Riskware",
      pua: "PUA",
      suspicious: "Sospetto",
      safe: "Sicuro",
    };
    return labels[result.threatLevel] || result.threatLevel;
  };

  const colors = getThreatColors();
  const riskScoreColor =
    result.riskScore >= 80
      ? "text-red-500"
      : result.riskScore >= 50
      ? "text-orange-500"
      : result.riskScore >= 25
      ? "text-yellow-500"
      : "text-green-500";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card className={`border ${colors.border} ${colors.bgLight}`}>
          <CollapsibleTrigger className="w-full">
            <CardContent className="p-3 flex items-center gap-3">
              {/* App icon */}
              <div className="relative flex-shrink-0">
                {result.iconBase64 ? (
                  <img
                    src={result.iconBase64.startsWith('data:') ? result.iconBase64 : `data:image/png;base64,${result.iconBase64}`}
                    alt=""
                    className="h-12 w-12 rounded-xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div
                    className={`h-12 w-12 rounded-xl ${colors.bg} flex items-center justify-center`}
                  >
                    {getThreatIcon()}
                  </div>
                )}
                {/* Risk score badge */}
                <div
                  className={`absolute -right-1 -bottom-1 h-5 w-5 rounded-full bg-background border-2 ${colors.border} flex items-center justify-center`}
                >
                  <span className={`text-[8px] font-bold ${riskScoreColor}`}>
                    {result.riskScore}
                  </span>
                </div>
              </div>

              {/* App info */}
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium text-sm truncate">{result.appName}</p>
                <p className="text-xs text-muted-foreground truncate">{result.packageName}</p>
              </div>

              {/* Threat badge */}
              <Badge className={`${colors.bg} text-white flex-shrink-0`}>
                {getThreatLabel()}
              </Badge>

              {/* Expand icon */}
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
            </CardContent>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-3 pb-3 space-y-3 border-t pt-3">
              {/* Risk Score Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Punteggio Rischio</span>
                  <span className={`font-semibold ${riskScoreColor}`}>{result.riskScore}/100</span>
                </div>
                <Progress
                  value={result.riskScore}
                  className="h-2"
                  style={
                    {
                      "--progress-background":
                        result.riskScore >= 80
                          ? "#ef4444"
                          : result.riskScore >= 50
                          ? "#f97316"
                          : result.riskScore >= 25
                          ? "#eab308"
                          : "#22c55e",
                    } as React.CSSProperties
                  }
                />
              </div>

              {/* Reasons */}
              {result.reasons.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Motivi rilevamento:</p>
                  {result.reasons.map((reason, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs"
                    >
                      <AlertTriangle
                        className={`h-3 w-3 flex-shrink-0 mt-0.5 ${
                          reason.severity === "critical"
                            ? "text-red-500"
                            : reason.severity === "high"
                            ? "text-orange-500"
                            : reason.severity === "medium"
                            ? "text-yellow-500"
                            : "text-blue-500"
                        }`}
                      />
                      <span>{reason.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Dangerous Permissions */}
              {result.dangerousPermissions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Permessi sensibili ({result.dangerousPermissions.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {result.dangerousPermissions.slice(0, 5).map((perm, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-600 rounded"
                      >
                        {perm.split(".").pop()}
                      </span>
                    ))}
                    {result.dangerousPermissions.length > 5 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
                        +{result.dangerousPermissions.length - 5}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendation */}
              <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg">
                <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs">{result.recommendation}</p>
              </div>

              {/* Uninstall button */}
              {result.threatLevel !== "safe" && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full"
                  onClick={() => onUninstall?.(result.packageName)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Rimuovi App
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </motion.div>
  );
};
