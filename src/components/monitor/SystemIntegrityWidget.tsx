import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ShieldCheck, 
  Lock, 
  Unlock,
  FileCheck,
  FileX,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import DeviceDiagnostics, { SystemIntegrityStatus } from "@/plugins/DeviceStoragePlugin";

export const SystemIntegrityWidget = () => {
  const [integrity, setIntegrity] = useState<SystemIntegrityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    const loadIntegrity = async () => {
      if (!isNative) {
        setLoading(false);
        return;
      }

      try {
        const result = await DeviceDiagnostics.checkSystemIntegrity();
        setIntegrity(result);
      } catch (error) {
        console.error("Error loading system integrity:", error);
      } finally {
        setLoading(false);
      }
    };

    loadIntegrity();
  }, [isNative]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Integrità Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!integrity) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Integrità Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Dati non disponibili (richiede app nativa)
          </p>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusBadge = (score: number) => {
    if (score >= 80) {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Integro</Badge>;
    }
    if (score >= 50) {
      return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Modificato</Badge>;
    }
    return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Compromesso</Badge>;
  };

  const checks = [
    {
      label: 'Sistema Read-Only',
      value: integrity.systemReadOnly,
      goodValue: true,
      icon: integrity.systemReadOnly ? FileCheck : FileX,
      description: integrity.systemReadOnly ? 'Protetto' : 'Modificabile'
    },
    {
      label: 'Build Ufficiale',
      value: integrity.officialBuild,
      goodValue: true,
      icon: integrity.officialBuild ? CheckCircle : XCircle,
      description: integrity.officialBuild ? 'Verificato' : 'Test Build'
    },
    {
      label: 'SELinux',
      value: integrity.seLinuxEnforcing,
      goodValue: true,
      icon: integrity.seLinuxEnforcing ? Eye : EyeOff,
      description: integrity.seLinuxStatus
    },
    {
      label: 'Sistema Modificato',
      value: !integrity.systemModified,
      goodValue: true,
      icon: integrity.systemModified ? AlertCircle : CheckCircle,
      description: integrity.systemModified ? 'Rilevate modifiche' : 'Originale'
    },
    {
      label: 'Crittografia',
      value: integrity.isEncrypted,
      goodValue: true,
      icon: integrity.isEncrypted ? Lock : Unlock,
      description: integrity.isEncrypted ? 'Attiva' : 'Non attiva'
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Integrità Sistema
          </span>
          {getStatusBadge(integrity.integrityScore)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Integrity Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Punteggio Integrità</span>
            <span className={`text-2xl font-bold ${getScoreColor(integrity.integrityScore)}`}>
              {integrity.integrityScore}%
            </span>
          </div>
          <Progress 
            value={integrity.integrityScore} 
            className={`h-2 ${getScoreBgColor(integrity.integrityScore)}`}
          />
        </div>

        {/* Checks Grid */}
        <div className="space-y-2">
          {checks.map((check) => {
            const Icon = check.icon;
            const isGood = check.value === check.goodValue;
            
            return (
              <div
                key={check.label}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  isGood ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${isGood ? 'text-green-500' : 'text-red-500'}`} />
                  <span className="text-sm font-medium">{check.label}</span>
                </div>
                <span className={`text-xs ${isGood ? 'text-green-500' : 'text-red-500'}`}>
                  {check.description}
                </span>
              </div>
            );
          })}
        </div>

        {/* Verified Boot State */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <div className="flex justify-between">
            <span>Verified Boot:</span>
            <span className={`font-medium ${
              integrity.verifiedBootState === 'green' 
                ? 'text-green-500' 
                : integrity.verifiedBootState === 'yellow'
                ? 'text-yellow-500'
                : 'text-foreground'
            }`}>
              {integrity.verifiedBootState === 'green' && '✓ Verificato'}
              {integrity.verifiedBootState === 'yellow' && '⚠ Warning'}
              {integrity.verifiedBootState === 'orange' && '⚠ Sbloccato'}
              {integrity.verifiedBootState === 'red' && '✗ Fallito'}
              {!['green', 'yellow', 'orange', 'red'].includes(integrity.verifiedBootState) && 
                integrity.verifiedBootState}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};