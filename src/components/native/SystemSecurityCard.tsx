import { motion } from "framer-motion";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Unlock,
  Bug,
  Usb,
  Lock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SystemSecurityStatus } from "@/hooks/useMalwareScanner";

interface SystemSecurityCardProps {
  security: SystemSecurityStatus | null;
  isLoading?: boolean;
}

export const SystemSecurityCard = ({ security, isLoading }: SystemSecurityCardProps) => {
  if (isLoading) {
    return (
      <Card className="bg-muted/30 animate-pulse">
        <CardContent className="p-4 h-32" />
      </Card>
    );
  }

  if (!security) return null;

  const securityChecks = [
    {
      id: "root",
      label: "Root/Jailbreak",
      isSecure: !security.isRooted,
      icon: Bug,
      secureText: "Non rilevato",
      insecureText: "Dispositivo rootato",
      severity: "critical",
    },
    {
      id: "bootloader",
      label: "Bootloader",
      isSecure: !security.isBootloaderUnlocked,
      icon: Unlock,
      secureText: "Bloccato",
      insecureText: "Sbloccato",
      severity: "high",
    },
    {
      id: "developer",
      label: "Opzioni sviluppatore",
      isSecure: !security.isDeveloperOptionsEnabled,
      icon: Smartphone,
      secureText: "Disattivate",
      insecureText: "Attive",
      severity: "low",
    },
    {
      id: "usb",
      label: "Debug USB",
      isSecure: !security.isUsbDebuggingEnabled,
      icon: Usb,
      secureText: "Disattivato",
      insecureText: "Attivo",
      severity: "medium",
    },
  ];

  const secureCount = securityChecks.filter((c) => c.isSecure).length;
  const isFullySecure = secureCount === securityChecks.length;
  const hasCriticalIssue = securityChecks.some((c) => !c.isSecure && c.severity === "critical");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card
        className={`border ${
          hasCriticalIssue
            ? "border-red-500/50 bg-red-500/5"
            : isFullySecure
            ? "border-green-500/50 bg-green-500/5"
            : "border-amber-500/50 bg-amber-500/5"
        }`}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasCriticalIssue ? (
                <ShieldAlert className="h-5 w-5 text-red-500" />
              ) : isFullySecure ? (
                <ShieldCheck className="h-5 w-5 text-green-500" />
              ) : (
                <Shield className="h-5 w-5 text-amber-500" />
              )}
              <span className="font-semibold text-sm">Sicurezza Sistema</span>
            </div>
            <Badge
              variant="outline"
              className={`text-xs ${
                hasCriticalIssue
                  ? "border-red-500/50 text-red-500"
                  : isFullySecure
                  ? "border-green-500/50 text-green-500"
                  : "border-amber-500/50 text-amber-500"
              }`}
            >
              {secureCount}/{securityChecks.length}
            </Badge>
          </div>

          {/* Checks Grid */}
          <div className="grid grid-cols-2 gap-2">
            {securityChecks.map((check, index) => (
              <motion.div
                key={check.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  check.isSecure ? "bg-green-500/10" : "bg-red-500/10"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    check.isSecure ? "bg-green-500/20" : "bg-red-500/20"
                  }`}
                >
                  {check.isSecure ? (
                    <CheckCircle
                      className={`h-4 w-4 ${
                        check.isSecure ? "text-green-500" : "text-red-500"
                      }`}
                    />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{check.label}</p>
                  <p
                    className={`text-[10px] ${
                      check.isSecure ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {check.isSecure ? check.secureText : check.insecureText}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Warning for critical issues */}
          {hasCriticalIssue && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-2 p-2 bg-red-500/10 rounded-lg"
            >
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-500">
                Dispositivo rootato rilevato. Questo aumenta significativamente il rischio di
                sicurezza e può esporre i dati a malware.
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
