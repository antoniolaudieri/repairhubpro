import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp,
  Camera,
  Mic,
  MapPin,
  Phone,
  MessageSquare,
  Users,
  HardDrive,
  Calendar,
  AlertTriangle
} from "lucide-react";
import type { DangerousPermissionApp } from "@/plugins/DeviceStoragePlugin";

interface DangerousPermissionsWidgetProps {
  apps: DangerousPermissionApp[] | null;
  loading?: boolean;
}

const getPermissionIcon = (permission: string) => {
  const p = permission.toUpperCase();
  if (p.includes('CAMERA')) return <Camera className="h-3 w-3" />;
  if (p.includes('AUDIO') || p.includes('MICROPHONE')) return <Mic className="h-3 w-3" />;
  if (p.includes('LOCATION')) return <MapPin className="h-3 w-3" />;
  if (p.includes('PHONE') || p.includes('CALL')) return <Phone className="h-3 w-3" />;
  if (p.includes('SMS')) return <MessageSquare className="h-3 w-3" />;
  if (p.includes('CONTACTS')) return <Users className="h-3 w-3" />;
  if (p.includes('STORAGE')) return <HardDrive className="h-3 w-3" />;
  if (p.includes('CALENDAR')) return <Calendar className="h-3 w-3" />;
  return <AlertTriangle className="h-3 w-3" />;
};

const getPermissionLabel = (permission: string): string => {
  const labels: Record<string, string> = {
    'READ_CONTACTS': 'Contatti',
    'WRITE_CONTACTS': 'Modifica Contatti',
    'READ_SMS': 'SMS',
    'SEND_SMS': 'Invio SMS',
    'READ_CALL_LOG': 'Registro Chiamate',
    'WRITE_CALL_LOG': 'Modifica Chiamate',
    'ACCESS_FINE_LOCATION': 'Posizione Precisa',
    'ACCESS_COARSE_LOCATION': 'Posizione Appross.',
    'CAMERA': 'Fotocamera',
    'RECORD_AUDIO': 'Microfono',
    'READ_EXTERNAL_STORAGE': 'Leggi Storage',
    'WRITE_EXTERNAL_STORAGE': 'Scrivi Storage',
    'READ_PHONE_STATE': 'Stato Telefono',
    'CALL_PHONE': 'Effettua Chiamate',
    'READ_CALENDAR': 'Calendario',
    'WRITE_CALENDAR': 'Modifica Calendario',
  };
  return labels[permission] || permission;
};

export const DangerousPermissionsWidget = ({ apps, loading }: DangerousPermissionsWidgetProps) => {
  const [expanded, setExpanded] = useState(false);
  const [showSystemApps, setShowSystemApps] = useState(false);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Permessi Sensibili
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!apps) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Permessi Sensibili
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

  const filteredApps = showSystemApps 
    ? apps 
    : apps.filter(app => !app.isSystemApp);

  const userAppsCount = apps.filter(app => !app.isSystemApp).length;
  const systemAppsCount = apps.filter(app => app.isSystemApp).length;

  // Sort by permission count
  const sortedApps = [...filteredApps].sort((a, b) => b.permissionCount - a.permissionCount);
  const displayApps = expanded ? sortedApps : sortedApps.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Permessi Sensibili
          </span>
          <Badge variant="outline" className="text-xs">
            {userAppsCount} app
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filter Toggle */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={!showSystemApps ? "default" : "outline"}
            onClick={() => setShowSystemApps(false)}
            className="text-xs h-7"
          >
            App Utente ({userAppsCount})
          </Button>
          <Button
            size="sm"
            variant={showSystemApps ? "default" : "outline"}
            onClick={() => setShowSystemApps(true)}
            className="text-xs h-7"
          >
            Tutte ({apps.length})
          </Button>
        </div>

        {/* Apps List */}
        <ScrollArea className={expanded ? "h-64" : "h-auto"}>
          <div className="space-y-2">
            {displayApps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nessuna app con permessi sensibili
              </p>
            ) : (
              displayApps.map((app) => (
                <div
                  key={app.packageName}
                  className="flex items-start gap-3 p-2 rounded-lg bg-muted/50"
                >
                  {/* App Icon */}
                  {app.iconBase64 ? (
                    <img
                      src={app.iconBase64}
                      alt={app.appName}
                      className="w-8 h-8 rounded"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                      <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}

                  {/* App Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{app.appName}</p>
                      {app.isSystemApp && (
                        <Badge variant="outline" className="text-xs h-4">Sistema</Badge>
                      )}
                    </div>
                    
                    {/* Permissions */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {app.permissions.slice(0, 4).map((perm) => (
                        <Badge
                          key={perm}
                          variant="secondary"
                          className="text-xs h-5 px-1.5 gap-1"
                        >
                          {getPermissionIcon(perm)}
                          <span className="hidden sm:inline">{getPermissionLabel(perm)}</span>
                        </Badge>
                      ))}
                      {app.permissions.length > 4 && (
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">
                          +{app.permissions.length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Permission Count */}
                  <Badge 
                    className={`${
                      app.permissionCount >= 5 
                        ? 'bg-red-500/20 text-red-500 border-red-500/30' 
                        : app.permissionCount >= 3
                        ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                        : 'bg-muted'
                    }`}
                  >
                    {app.permissionCount}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Expand/Collapse Button */}
        {sortedApps.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full text-xs"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Mostra meno
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Mostra tutte ({sortedApps.length - 5} altre)
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
