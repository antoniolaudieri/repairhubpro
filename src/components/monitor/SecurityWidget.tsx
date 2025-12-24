import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  ShieldX,
  Lock,
  Unlock,
  Settings,
  Usb,
  Bug,
  Key
} from "lucide-react";
import type { SecurityStatus } from "@/plugins/DeviceStoragePlugin";

interface SecurityWidgetProps {
  securityStatus: SecurityStatus | null;
  loading?: boolean;
}

export const SecurityWidget = ({ securityStatus, loading }: SecurityWidgetProps) => {
  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sicurezza
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!securityStatus) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sicurezza
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Dati sicurezza non disponibili (richiede app nativa)
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate overall security level
  const getSecurityLevel = (): { level: 'safe' | 'warning' | 'danger'; score: number } => {
    let score = 100;
    
    if (securityStatus.isRooted) score -= 30;
    if (securityStatus.isBootloaderUnlocked) score -= 25;
    if (securityStatus.isDeveloperOptionsEnabled) score -= 10;
    if (securityStatus.isUsbDebuggingEnabled) score -= 15;
    if (securityStatus.isTestBuild) score -= 20;
    
    if (score >= 80) return { level: 'safe', score };
    if (score >= 50) return { level: 'warning', score };
    return { level: 'danger', score };
  };

  const { level, score } = getSecurityLevel();

  const getStatusIcon = () => {
    switch (level) {
      case 'safe':
        return <ShieldCheck className="h-8 w-8 text-green-500" />;
      case 'warning':
        return <ShieldAlert className="h-8 w-8 text-yellow-500" />;
      case 'danger':
        return <ShieldX className="h-8 w-8 text-red-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (level) {
      case 'safe':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Sicuro</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Attenzione</Badge>;
      case 'danger':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">A Rischio</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sicurezza Dispositivo
          </span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
          {getStatusIcon()}
          <div>
            <p className="font-medium">
              Punteggio Sicurezza: {score}/100
            </p>
            <p className="text-xs text-muted-foreground">
              {level === 'safe' && "Nessun problema rilevato"}
              {level === 'warning' && "Alcuni aspetti richiedono attenzione"}
              {level === 'danger' && "Rilevate configurazioni a rischio"}
            </p>
          </div>
        </div>

        {/* Security Checks Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Root Status */}
          <div className={`flex items-center gap-2 p-2 rounded-lg ${
            securityStatus.isRooted ? 'bg-red-500/10' : 'bg-green-500/10'
          }`}>
            {securityStatus.isRooted ? (
              <Bug className="h-4 w-4 text-red-500" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-green-500" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">Root</p>
              <p className={`text-xs ${securityStatus.isRooted ? 'text-red-500' : 'text-green-500'}`}>
                {securityStatus.isRooted 
                  ? securityStatus.rootMethod || 'Rilevato' 
                  : 'Non rilevato'}
              </p>
            </div>
          </div>

          {/* Bootloader Status */}
          <div className={`flex items-center gap-2 p-2 rounded-lg ${
            securityStatus.isBootloaderUnlocked ? 'bg-red-500/10' : 'bg-green-500/10'
          }`}>
            {securityStatus.isBootloaderUnlocked ? (
              <Unlock className="h-4 w-4 text-red-500" />
            ) : (
              <Lock className="h-4 w-4 text-green-500" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">Bootloader</p>
              <p className={`text-xs ${securityStatus.isBootloaderUnlocked ? 'text-red-500' : 'text-green-500'}`}>
                {securityStatus.isBootloaderUnlocked ? 'Sbloccato' : 'Bloccato'}
              </p>
            </div>
          </div>

          {/* Developer Options */}
          <div className={`flex items-center gap-2 p-2 rounded-lg ${
            securityStatus.isDeveloperOptionsEnabled ? 'bg-yellow-500/10' : 'bg-green-500/10'
          }`}>
            <Settings className={`h-4 w-4 ${
              securityStatus.isDeveloperOptionsEnabled ? 'text-yellow-500' : 'text-green-500'
            }`} />
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">Sviluppatore</p>
              <p className={`text-xs ${securityStatus.isDeveloperOptionsEnabled ? 'text-yellow-500' : 'text-green-500'}`}>
                {securityStatus.isDeveloperOptionsEnabled ? 'Attivo' : 'Disattivo'}
              </p>
            </div>
          </div>

          {/* USB Debugging */}
          <div className={`flex items-center gap-2 p-2 rounded-lg ${
            securityStatus.isUsbDebuggingEnabled ? 'bg-yellow-500/10' : 'bg-green-500/10'
          }`}>
            <Usb className={`h-4 w-4 ${
              securityStatus.isUsbDebuggingEnabled ? 'text-yellow-500' : 'text-green-500'
            }`} />
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">Debug USB</p>
              <p className={`text-xs ${securityStatus.isUsbDebuggingEnabled ? 'text-yellow-500' : 'text-green-500'}`}>
                {securityStatus.isUsbDebuggingEnabled ? 'Attivo' : 'Disattivo'}
              </p>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="space-y-1 text-xs text-muted-foreground border-t pt-3">
          <div className="flex justify-between">
            <span>Patch Sicurezza:</span>
            <span className="font-medium text-foreground">
              {securityStatus.securityPatchLevel !== 'unknown' 
                ? securityStatus.securityPatchLevel 
                : 'N/D'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Build:</span>
            <span className={`font-medium ${securityStatus.isTestBuild ? 'text-red-500' : 'text-foreground'}`}>
              {securityStatus.isTestBuild ? 'Test Keys' : 'Release Keys'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
