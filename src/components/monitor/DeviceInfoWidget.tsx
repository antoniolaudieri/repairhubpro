import { Smartphone, Cpu, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DeviceInfoWidgetProps {
  model: string | null;
  manufacturer: string | null;
  osVersion: string | null;
  platform: string;
  appVersion: string | null;
}

export const DeviceInfoWidget = ({ 
  model, 
  manufacturer, 
  osVersion, 
  platform, 
  appVersion 
}: DeviceInfoWidgetProps) => {
  const getPlatformBadge = () => {
    switch (platform?.toLowerCase()) {
      case 'android':
        return <Badge variant="secondary" className="bg-green-500/10 text-green-600">Android</Badge>;
      case 'ios':
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">iOS</Badge>;
      default:
        return <Badge variant="outline">Web</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          Info Dispositivo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold truncate pr-2">
              {model || 'Dispositivo sconosciuto'}
            </span>
            {getPlatformBadge()}
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <Cpu className="h-3 w-3" />
                Produttore
              </span>
              <span className="font-medium">{manufacturer || 'N/D'}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Sistema operativo
              </span>
              <span className="font-medium">{osVersion || 'N/D'}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Versione App</span>
              <span className="font-medium">{appVersion || '1.0.0'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
