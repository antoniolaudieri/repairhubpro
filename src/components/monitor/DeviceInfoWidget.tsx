import { Smartphone, Cpu, MonitorSmartphone, Apple, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
  const getPlatformIcon = () => {
    switch (platform?.toLowerCase()) {
      case 'android':
        return <MonitorSmartphone className="h-8 w-8 text-green-500" />;
      case 'ios':
        return <Apple className="h-8 w-8 text-gray-700 dark:text-gray-300" />;
      default:
        return <Globe className="h-8 w-8 text-blue-500" />;
    }
  };

  const getPlatformBadge = () => {
    switch (platform?.toLowerCase()) {
      case 'android':
        return <Badge className="bg-green-500/15 text-green-600 border-0 text-[10px] px-1.5 py-0">Android</Badge>;
      case 'ios':
        return <Badge className="bg-gray-500/15 text-gray-600 border-0 text-[10px] px-1.5 py-0">iOS</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Web</Badge>;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Device Icon */}
          <div className="shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            {getPlatformIcon()}
          </div>
          
          {/* Device Info - Compact */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm font-semibold truncate">
                {model || 'Dispositivo'}
              </span>
              {getPlatformBadge()}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Cpu className="h-3 w-3" />
                {manufacturer || 'N/D'}
              </span>
              <span className="text-muted-foreground/50">•</span>
              <span>{osVersion || 'N/D'}</span>
            </div>
            {appVersion && (
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                App v{appVersion}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
