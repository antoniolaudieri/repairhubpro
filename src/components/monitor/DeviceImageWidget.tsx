import { useState, useEffect } from 'react';
import { Smartphone, Tablet, Laptop, Watch, Monitor as MonitorIcon, Gamepad2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface DeviceImageWidgetProps {
  manufacturer: string | null;
  model: string | null;
  deviceType?: string;
  platform?: string;
}

export const DeviceImageWidget = ({
  manufacturer,
  model,
  deviceType,
  platform
}: DeviceImageWidgetProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Determine device type from platform if not provided
  const getDeviceType = () => {
    if (deviceType) return deviceType;
    if (platform === 'ios' || platform === 'android') return 'smartphone';
    return 'smartphone';
  };

  const DeviceIcon = () => {
    const type = getDeviceType();
    switch (type?.toLowerCase()) {
      case 'tablet': return <Tablet className="h-16 w-16 text-muted-foreground" />;
      case 'laptop': return <Laptop className="h-16 w-16 text-muted-foreground" />;
      case 'smartwatch': return <Watch className="h-16 w-16 text-muted-foreground" />;
      case 'console': return <Gamepad2 className="h-16 w-16 text-muted-foreground" />;
      case 'pc': return <MonitorIcon className="h-16 w-16 text-muted-foreground" />;
      default: return <Smartphone className="h-16 w-16 text-muted-foreground" />;
    }
  };

  useEffect(() => {
    const fetchDeviceImage = async () => {
      if (!manufacturer || !model) return;
      
      setLoading(true);
      setError(false);
      
      try {
        // Call the lookup-device edge function
        const { data, error: fnError } = await supabase.functions.invoke('lookup-device', {
          body: {
            brand: manufacturer,
            model: model,
            deviceType: getDeviceType()
          }
        });

        if (fnError) throw fnError;
        
        if (data?.imageUrl) {
          setImageUrl(data.imageUrl);
        }
      } catch (e) {
        console.log('Could not fetch device image:', e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDeviceImage();
  }, [manufacturer, model]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            Il Tuo Dispositivo
          </CardTitle>
          {platform && (
            <Badge variant="outline" className="capitalize">
              {platform}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          {/* Device Image */}
          <div className="relative w-32 h-32 mb-4 bg-gradient-to-br from-muted/50 to-muted rounded-2xl flex items-center justify-center overflow-hidden">
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : imageUrl && !error ? (
              <img
                src={imageUrl}
                alt={`${manufacturer} ${model}`}
                className="w-full h-full object-contain p-2"
                onError={() => setError(true)}
              />
            ) : (
              <DeviceIcon />
            )}
          </div>

          {/* Device Info */}
          <div className="text-center space-y-1">
            {manufacturer && (
              <p className="text-lg font-semibold text-foreground">
                {manufacturer}
              </p>
            )}
            {model && (
              <p className="text-sm text-muted-foreground">
                {model}
              </p>
            )}
            {!manufacturer && !model && (
              <p className="text-sm text-muted-foreground">
                Dispositivo sconosciuto
              </p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="mt-4 grid grid-cols-2 gap-2 w-full">
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="text-sm font-medium capitalize">{getDeviceType()}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <p className="text-xs text-muted-foreground">OS</p>
              <p className="text-sm font-medium capitalize">{platform || 'N/D'}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeviceImageWidget;