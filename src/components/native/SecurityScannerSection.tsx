import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Bug,
  Eye,
  Megaphone,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  Database,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useMalwareScanner, ScanResult } from "@/hooks/useMalwareScanner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Capacitor } from "@capacitor/core";

export const SecurityScannerSection = () => {
  const {
    isScanning,
    progress,
    currentApp,
    results,
    summary,
    error,
    definitions,
    lastDefinitionsUpdate,
    isUpdatingDefinitions,
    startScan,
    clearResults,
    forceUpdateDefinitions,
  } = useMalwareScanner();

  const [expandedResults, setExpandedResults] = useState<string[]>([]);
  const isNative = Capacitor.isNativePlatform();

  const toggleResult = (packageName: string) => {
    setExpandedResults((prev) =>
      prev.includes(packageName)
        ? prev.filter((p) => p !== packageName)
        : [...prev, packageName]
    );
  };

  const getThreatIcon = (threatLevel: ScanResult["threatLevel"]) => {
    switch (threatLevel) {
      case "malware":
      case "trojan":
        return <ShieldX className="h-5 w-5" />;
      case "adware":
        return <Megaphone className="h-5 w-5" />;
      case "pua":
        return <AlertTriangle className="h-5 w-5" />;
      case "suspicious":
        return <Eye className="h-5 w-5" />;
      default:
        return <ShieldCheck className="h-5 w-5" />;
    }
  };

  const getThreatColor = (threatLevel: ScanResult["threatLevel"]) => {
    switch (threatLevel) {
      case "malware":
      case "trojan":
        return "bg-red-500 text-white";
      case "adware":
        return "bg-orange-500 text-white";
      case "pua":
        return "bg-yellow-500 text-white";
      case "suspicious":
        return "bg-amber-400 text-black";
      default:
        return "bg-green-500 text-white";
    }
  };

  const getThreatLabel = (threatLevel: ScanResult["threatLevel"]) => {
    switch (threatLevel) {
      case "malware":
        return "Malware";
      case "trojan":
        return "Trojan";
      case "adware":
        return "Adware";
      case "pua":
        return "PUA";
      case "suspicious":
        return "Sospetto";
      default:
        return "Sicuro";
    }
  };

  const getSeverityColor = (severity: ScanResult["severity"]) => {
    switch (severity) {
      case "critical":
        return "text-red-500 bg-red-500/10";
      case "high":
        return "text-orange-500 bg-orange-500/10";
      case "medium":
        return "text-yellow-500 bg-yellow-500/10";
      case "low":
        return "text-amber-500 bg-amber-500/10";
      default:
        return "text-green-500 bg-green-500/10";
    }
  };

  const threatResults = results.filter((r) => r.threatLevel !== "safe");
  const safeResults = results.filter((r) => r.threatLevel === "safe");

  const totalThreats =
    (summary?.malwareCount || 0) +
    (summary?.adwareCount || 0) +
    (summary?.puaCount || 0) +
    (summary?.suspiciousCount || 0);

  return (
    <div className="space-y-4">
      {/* Hero Card */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-pink-500/10">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            {/* Animated Shield */}
            <motion.div
              className={`relative h-20 w-20 rounded-2xl flex items-center justify-center ${
                isScanning
                  ? "bg-gradient-to-br from-indigo-500 to-purple-600"
                  : summary
                  ? totalThreats > 0
                    ? "bg-gradient-to-br from-red-500 to-orange-500"
                    : "bg-gradient-to-br from-green-500 to-emerald-600"
                  : "bg-gradient-to-br from-slate-400 to-slate-500"
              }`}
              animate={isScanning ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {isScanning ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Search className="h-10 w-10 text-white" />
                </motion.div>
              ) : summary ? (
                totalThreats > 0 ? (
                  <ShieldAlert className="h-10 w-10 text-white" />
                ) : (
                  <ShieldCheck className="h-10 w-10 text-white" />
                )
              ) : (
                <Shield className="h-10 w-10 text-white" />
              )}

              {/* Pulsing ring during scan */}
              {isScanning && (
                <motion.div
                  className="absolute inset-0 rounded-2xl border-2 border-white/50"
                  animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.div>

            <div className="flex-1">
              <h3 className="text-lg font-bold">
                {isScanning
                  ? "Scansione in corso..."
                  : summary
                  ? totalThreats > 0
                    ? `${totalThreats} minacce rilevate`
                    : "Dispositivo sicuro"
                  : "Scanner Sicurezza"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isScanning
                  ? currentApp
                  : summary
                  ? `${summary.scannedApps} app analizzate in ${(
                      summary.scanDuration / 1000
                    ).toFixed(1)}s`
                  : "Rileva malware, adware e spyware"}
              </p>

              {/* Progress bar during scan */}
              {isScanning && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Analisi</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-white to-purple-200"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick stats after scan */}
          {summary && !isScanning && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 grid grid-cols-4 gap-2"
            >
              {[
                { label: "Malware", count: summary.malwareCount, color: "text-red-500", icon: Bug },
                { label: "Adware", count: summary.adwareCount, color: "text-orange-500", icon: Megaphone },
                { label: "Spyware", count: summary.puaCount, color: "text-yellow-500", icon: Eye },
                { label: "Sicure", count: summary.safeCount, color: "text-green-500", icon: CheckCircle },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center p-2 bg-background/50 rounded-xl"
                >
                  <stat.icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
                  <div className={`text-lg font-bold ${stat.color}`}>{stat.count}</div>
                  <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Scan Buttons */}
      {!isScanning && (
        <div className="flex gap-2">
          <Button
            onClick={() => startScan(true)}
            disabled={!isNative}
            className="flex-1 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          >
            <Zap className="h-5 w-5 mr-2" />
            Scan Rapido
          </Button>
          <Button
            onClick={() => startScan(false)}
            disabled={!isNative}
            variant="outline"
            className="flex-1 h-12"
          >
            <Search className="h-5 w-5 mr-2" />
            Scan Completo
          </Button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-500">Errore scansione</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
            <Button size="sm" variant="outline" onClick={clearResults}>
              Riprova
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Threat Results */}
      <AnimatePresence>
        {threatResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <h4 className="text-sm font-semibold flex items-center gap-2 px-1">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              Minacce rilevate ({threatResults.length})
            </h4>
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {threatResults.map((result, index) => (
                  <motion.div
                    key={result.packageName}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Collapsible
                      open={expandedResults.includes(result.packageName)}
                      onOpenChange={() => toggleResult(result.packageName)}
                    >
                      <Card className={`border ${getSeverityColor(result.severity)}`}>
                        <CollapsibleTrigger className="w-full">
                          <CardContent className="p-3 flex items-center gap-3">
                            <div
                              className={`h-10 w-10 rounded-xl flex items-center justify-center ${getThreatColor(
                                result.threatLevel
                              )}`}
                            >
                              {getThreatIcon(result.threatLevel)}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-sm truncate">{result.appName}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {result.packageName}
                              </p>
                            </div>
                            <Badge className={getThreatColor(result.threatLevel)}>
                              {getThreatLabel(result.threatLevel)}
                            </Badge>
                            {expandedResults.includes(result.packageName) ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </CardContent>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-3 pb-3 space-y-2 border-t pt-3">
                            {result.reasons.map((reason, i) => (
                              <p key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
                                {reason}
                              </p>
                            ))}
                            <p className="text-xs font-medium flex items-start gap-2 pt-1">
                              <ShieldCheck className="h-3 w-3 text-blue-500 flex-shrink-0 mt-0.5" />
                              {result.recommendation}
                            </p>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="w-full mt-2"
                              onClick={() => {
                                // In a real app, this would open app settings
                                console.log("Uninstall:", result.packageName);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Rimuovi App
                            </Button>
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Safe Apps Summary */}
      {safeResults.length > 0 && !isScanning && (
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-500 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-sm text-green-700 dark:text-green-400">
                {safeResults.length} app sicure
              </p>
              <p className="text-xs text-muted-foreground">Nessuna minaccia rilevata</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Definitions Info */}
      <Card className="bg-muted/50">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Database definizioni</span>
            </div>
            <Badge variant="outline" className="text-xs">
              v{definitions?.version || "--"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {lastDefinitionsUpdate
                ? format(lastDefinitionsUpdate, "d MMM HH:mm", { locale: it })
                : "Mai aggiornato"}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={forceUpdateDefinitions}
              disabled={isUpdatingDefinitions}
              className="h-7 text-xs"
            >
              {isUpdatingDefinitions ? (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Aggiorna
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Non-native warning */}
      {!isNative && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <p className="text-xs text-muted-foreground">
              Lo scanner è disponibile solo sull'app Android nativa
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
