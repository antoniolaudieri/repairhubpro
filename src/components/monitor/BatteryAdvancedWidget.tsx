import { Thermometer, Zap, Battery, Plug } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BatteryAdvancedWidgetProps {
  level: number | null;
  isCharging: boolean;
  health: string | null;
  temperature: number | null;
  voltage: number | null;
  technology: string | null;
  plugged: string | null;
}

export const BatteryAdvancedWidget = ({
  level,
  isCharging,
  health,
  temperature,
  voltage,
  technology,
  plugged
}: BatteryAdvancedWidgetProps) => {
  
  const getTemperatureColor = (temp: number | null) => {
    if (temp === null) return 'text-muted-foreground';
    if (temp >= 45) return 'text-red-500';
    if (temp >= 40) return 'text-orange-500';
    if (temp <= 10) return 'text-blue-500';
    return 'text-green-500';
  };

  const getTemperatureLabel = (temp: number | null) => {
    if (temp === null) return 'N/D';
    if (temp >= 45) return 'Molto Calda';
    if (temp >= 40) return 'Calda';
    if (temp <= 10) return 'Fredda';
    return 'Normale';
  };

  const getPluggedLabel = (plugged: string | null) => {
    switch (plugged) {
      case 'ac': return 'Caricatore AC';
      case 'usb': return 'USB';
      case 'wireless': return 'Wireless';
      case 'none': return 'Non collegato';
      default: return 'Sconosciuto';
    }
  };

  const getHealthLabel = (health: string | null) => {
    switch (health) {
      case 'good': return { label: 'Buona', color: 'text-green-500' };
      case 'overheat': return { label: 'Surriscaldata', color: 'text-red-500' };
      case 'dead': return { label: 'Danneggiata', color: 'text-red-500' };
      case 'over_voltage': return { label: 'Sovratensione', color: 'text-orange-500' };
      case 'cold': return { label: 'Fredda', color: 'text-blue-500' };
      case 'unspecified_failure': return { label: 'Errore', color: 'text-red-500' };
      case 'charging': return { label: 'In Carica', color: 'text-green-500' };
      case 'fair': return { label: 'Discreta', color: 'text-yellow-500' };
      case 'low': return { label: 'Bassa', color: 'text-orange-500' };
      default: return { label: 'Sconosciuto', color: 'text-muted-foreground' };
    }
  };

  const healthInfo = getHealthLabel(health);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Battery className={cn('h-4 w-4', isCharging ? 'text-green-500' : 'text-muted-foreground')} />
            Info Batteria Avanzate
          </CardTitle>
          {isCharging && (
            <Badge variant="outline" className="text-green-600 border-green-500">
              <Zap className="h-3 w-3 mr-1" />
              In Carica
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {/* Temperature */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Thermometer className={cn('h-4 w-4', getTemperatureColor(temperature))} />
              <span className="text-xs text-muted-foreground">Temperatura</span>
            </div>
            <p className={cn('text-lg font-semibold', getTemperatureColor(temperature))}>
              {temperature !== null ? `${temperature}°C` : '--'}
            </p>
            <p className="text-xs text-muted-foreground">{getTemperatureLabel(temperature)}</p>
          </div>

          {/* Health */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Battery className={cn('h-4 w-4', healthInfo.color)} />
              <span className="text-xs text-muted-foreground">Salute</span>
            </div>
            <p className={cn('text-lg font-semibold', healthInfo.color)}>
              {healthInfo.label}
            </p>
            <p className="text-xs text-muted-foreground">
              Stato batteria
            </p>
          </div>

          {/* Voltage */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Tensione</span>
            </div>
            <p className="text-lg font-semibold">
              {voltage !== null ? `${(voltage / 1000).toFixed(2)}V` : '--'}
            </p>
            <p className="text-xs text-muted-foreground">
              {voltage !== null && voltage >= 4000 ? 'Carica' : voltage !== null && voltage >= 3700 ? 'Normale' : voltage !== null ? 'Bassa' : ''}
            </p>
          </div>

          {/* Plugged */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Plug className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Alimentazione</span>
            </div>
            <p className="text-lg font-semibold truncate">
              {getPluggedLabel(plugged)}
            </p>
            <p className="text-xs text-muted-foreground">
              {technology || 'N/D'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BatteryAdvancedWidget;
