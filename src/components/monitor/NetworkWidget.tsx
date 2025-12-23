import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NetworkWidgetProps {
  networkType: string | null;
  networkConnected: boolean;
  connectionDownlink: number | null;
  connectionEffectiveType: string | null;
  connectionRtt: number | null;
  onlineStatus: boolean;
}

export const NetworkWidget = ({ 
  networkType, 
  networkConnected, 
  connectionDownlink,
  connectionEffectiveType,
  connectionRtt,
  onlineStatus 
}: NetworkWidgetProps) => {
  
  const getConnectionQuality = () => {
    if (!networkConnected || !onlineStatus) return { label: 'Offline', color: 'text-destructive', icon: WifiOff };
    
    if (connectionEffectiveType === '4g' || connectionDownlink && connectionDownlink >= 10) {
      return { label: 'Eccellente', color: 'text-green-500', icon: SignalHigh };
    }
    if (connectionEffectiveType === '3g' || connectionDownlink && connectionDownlink >= 1.5) {
      return { label: 'Buona', color: 'text-amber-500', icon: SignalMedium };
    }
    if (connectionEffectiveType === '2g' || connectionEffectiveType === 'slow-2g') {
      return { label: 'Lenta', color: 'text-orange-500', icon: SignalLow };
    }
    
    return { label: 'Connesso', color: 'text-green-500', icon: Signal };
  };
  
  const getNetworkTypeLabel = (type: string | null): string => {
    if (!type) return 'Sconosciuto';
    switch (type.toLowerCase()) {
      case 'wifi': return 'Wi-Fi';
      case 'cellular': return 'Dati Cellulare';
      case '4g': return '4G LTE';
      case '3g': return '3G';
      case '2g': return '2G';
      case 'ethernet': return 'Ethernet';
      case 'none': return 'Nessuna';
      default: return type;
    }
  };
  
  const quality = getConnectionQuality();
  const QualityIcon = quality.icon;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {networkConnected ? (
            <Wifi className="h-4 w-4 text-primary" />
          ) : (
            <WifiOff className="h-4 w-4 text-destructive" />
          )}
          Connessione
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QualityIcon className={`h-5 w-5 ${quality.color}`} />
            <span className={`font-medium ${quality.color}`}>{quality.label}</span>
          </div>
          <Badge variant={networkConnected ? 'default' : 'destructive'}>
            {getNetworkTypeLabel(networkType)}
          </Badge>
        </div>
        
        {networkConnected && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {connectionDownlink !== null && (
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-muted-foreground text-xs">Velocità</div>
                <div className="font-medium">{connectionDownlink.toFixed(1)} Mbps</div>
              </div>
            )}
            {connectionRtt !== null && (
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-muted-foreground text-xs">Latenza</div>
                <div className="font-medium">{connectionRtt} ms</div>
              </div>
            )}
            {connectionEffectiveType && (
              <div className="bg-muted/50 rounded-lg p-2 col-span-2">
                <div className="text-muted-foreground text-xs">Tipo Effettivo</div>
                <div className="font-medium uppercase">{connectionEffectiveType}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};