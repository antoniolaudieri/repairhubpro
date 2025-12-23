import { useState } from 'react';
import { 
  MapPin, 
  Mic, 
  Camera, 
  Navigation, 
  Compass, 
  Sun, 
  Gauge, 
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import DeviceDiagnostics, { SensorsInfo, SensorStatus } from '@/plugins/DeviceStoragePlugin';

interface SensorWidgetProps {
  sensors: SensorsInfo | null;
  onRefresh?: () => void;
}

const sensorConfig = [
  { key: 'gps', icon: MapPin, label: 'GPS' },
  { key: 'accelerometer', icon: Navigation, label: 'Accelerometro' },
  { key: 'gyroscope', icon: Compass, label: 'Giroscopio' },
  { key: 'magnetometer', icon: Compass, label: 'Magnetometro' },
  { key: 'proximity', icon: Eye, label: 'Prossimità' },
  { key: 'lightSensor', icon: Sun, label: 'Luce Ambientale' },
  { key: 'barometer', icon: Gauge, label: 'Barometro' },
  { key: 'microphone', icon: Mic, label: 'Microfono' },
  { key: 'camera', icon: Camera, label: 'Fotocamera' },
] as const;

export const SensorWidget = ({ sensors, onRefresh }: SensorWidgetProps) => {
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { working: boolean; value?: any; error?: string }>>({});

  const testSensor = async (sensorType: string) => {
    setTesting(sensorType);
    try {
      const result = await DeviceDiagnostics.testSensor({ sensorType });
      setTestResults(prev => ({ ...prev, [sensorType]: result }));
      if (result.working) {
        toast.success(`${sensorType} funziona correttamente!`);
      } else {
        toast.error(`${sensorType}: ${result.error || 'Non funzionante'}`);
      }
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, [sensorType]: { working: false, error: e.message } }));
      toast.error(`Errore test ${sensorType}`);
    } finally {
      setTesting(null);
    }
  };

  const getStatusBadge = (sensor: SensorStatus, testResult?: { working: boolean; error?: string }) => {
    if (testResult) {
      return testResult.working ? (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
          <CheckCircle className="h-3 w-3 mr-1" />
          OK
        </Badge>
      ) : (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Errore
        </Badge>
      );
    }

    if (!sensor.available) {
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          <XCircle className="h-3 w-3 mr-1" />
          N/D
        </Badge>
      );
    }

    if (sensor.permission === 'denied') {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Negato
        </Badge>
      );
    }

    if (sensor.permission === 'granted') {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
          <CheckCircle className="h-3 w-3 mr-1" />
          OK
        </Badge>
      );
    }

    return (
      <Badge variant="outline">
        Disponibile
      </Badge>
    );
  };

  if (!sensors) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Sensori</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Caricamento sensori...</p>
        </CardContent>
      </Card>
    );
  }

  const availableCount = sensorConfig.filter(s => sensors[s.key as keyof SensorsInfo]?.available).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" />
            Sensori Dispositivo
          </CardTitle>
          <Badge variant="outline">
            {availableCount}/{sensorConfig.length} attivi
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2">
          {sensorConfig.map(({ key, icon: Icon, label }) => {
            const sensor = sensors[key as keyof SensorsInfo];
            const testResult = testResults[key];
            const isTesting = testing === key;

            return (
              <div
                key={key}
                className={`flex items-center justify-between p-2 rounded-lg border ${
                  sensor?.available 
                    ? 'bg-background border-border' 
                    : 'bg-muted/30 border-muted'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${sensor?.available ? 'text-foreground' : 'text-muted-foreground'}`} />
                  <span className={`text-sm ${sensor?.available ? '' : 'text-muted-foreground'}`}>
                    {label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(sensor, testResult)}
                  {sensor?.available && ['gps', 'accelerometer', 'gyroscope', 'microphone', 'camera'].includes(key) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => testSensor(key)}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Test'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {Object.keys(testResults).length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">Risultati Test:</p>
            <div className="space-y-1">
              {Object.entries(testResults).map(([key, result]) => (
                <div key={key} className="text-xs">
                  <span className="font-medium">{key}:</span>{' '}
                  {result.working ? (
                    <span className="text-green-600">
                      {result.value ? JSON.stringify(result.value) : 'Funzionante'}
                    </span>
                  ) : (
                    <span className="text-red-600">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SensorWidget;
