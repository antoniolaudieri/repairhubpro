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
  Database,
  Clock,
  History,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMalwareScanner } from "@/hooks/useMalwareScanner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Capacitor } from "@capacitor/core";

// Import new components
import { SystemSecurityCard } from "./SystemSecurityCard";
import { ScanProgressDetail } from "./ScanProgressDetail";
import { ThreatResultCard } from "./ThreatResultCard";
import { ScanHistoryDialog } from "./ScanHistoryDialog";

export const SecurityScannerSection = () => {
  const {
    isScanning,
    progress,
    currentApp,
    currentAppIcon,
    phase,
    results,
    summary,
    systemSecurity,
    error,
    definitions,
    lastDefinitionsUpdate,
    isUpdatingDefinitions,
    recentApps,
    startScan,
    clearResults,
    forceUpdateDefinitions,
  } = useMalwareScanner();

  const isNative = Capacitor.isNativePlatform();

  const threatResults = results.filter((r) => r.threatLevel !== "safe");
  const safeResults = results.filter((r) => r.threatLevel === "safe");

  const totalThreats =
    (summary?.malwareCount || 0) +
    (summary?.spywareCount || 0) +
    (summary?.adwareCount || 0) +
    (summary?.riskwareCount || 0) +
    (summary?.puaCount || 0) +
    (summary?.suspiciousCount || 0);

  const handleUninstall = (packageName: string) => {
    // Open Play Store to uninstall
    window.open(`market://details?id=${packageName}`, "_system");
  };

  return (
    <div className="space-y-4 min-h-0 overflow-visible">
      {/* Hero Card */}
      <Card className="relative overflow-visible border-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-pink-500/10">
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
                  ? `Fase: ${phase}`
                  : summary
                  ? `${summary.scannedApps} app analizzate`
                  : "Rileva malware, adware e spyware"}
              </p>

              {/* Risk score after scan */}
              {summary && !isScanning && (
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Rischio:</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      summary.riskLevel === "critical"
                        ? "border-red-500 text-red-500"
                        : summary.riskLevel === "high"
                        ? "border-orange-500 text-orange-500"
                        : summary.riskLevel === "medium"
                        ? "border-yellow-500 text-yellow-500"
                        : summary.riskLevel === "low"
                        ? "border-blue-500 text-blue-500"
                        : "border-green-500 text-green-500"
                    }`}
                  >
                    {summary.overallRiskScore}/100
                  </Badge>
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
                { label: "Spyware", count: summary.spywareCount, color: "text-purple-500", icon: Eye },
                { label: "Adware", count: summary.adwareCount, color: "text-orange-500", icon: Megaphone },
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

      {/* Detailed Progress during scan */}
      {isScanning && (
        <ScanProgressDetail
          progress={progress}
          currentApp={currentApp}
          currentAppIcon={currentAppIcon}
          phase={phase}
          recentApps={recentApps}
          totalApps={summary?.totalApps || 0}
          scannedApps={summary?.scannedApps || results.length}
        />
      )}

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

      {/* System Security Status */}
      {systemSecurity && !isScanning && (
        <SystemSecurityCard security={systemSecurity} />
      )}

      {/* Threat Results with new ThreatResultCard */}
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
            <div className="space-y-2 overflow-visible">
              {threatResults.map((result, index) => (
                <ThreatResultCard
                  key={result.packageName}
                  result={result}
                  index={index}
                  onUninstall={handleUninstall}
                />
              ))}
            </div>
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

      {/* Definitions Info + History */}
      <Card className="bg-muted/50">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Database definizioni</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                v{definitions?.version || "--"}
              </Badge>
              {definitions && (
                <span className="text-xs text-muted-foreground">
                  {definitions.totalThreats} minacce
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {lastDefinitionsUpdate
                ? format(lastDefinitionsUpdate, "d MMM HH:mm", { locale: it })
                : "Mai aggiornato"}
            </div>
            <div className="flex items-center gap-2">
              <ScanHistoryDialog
                trigger={
                  <Button size="sm" variant="ghost" className="h-7 text-xs">
                    <History className="h-3 w-3 mr-1" />
                    Cronologia
                  </Button>
                }
              />
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
