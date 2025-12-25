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
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Device Image - Compact */}
          <div className="relative w-14 h-14 bg-gradient-to-br from-muted/50 to-muted rounded-xl flex items-center justify-center overflow-hidden shrink-0">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : imageUrl && !error ? (
              <img
                src={imageUrl}
                alt={`${manufacturer} ${model}`}
                className="w-full h-full object-contain p-1"
                onError={() => setError(true)}
              />
            ) : (
              <DeviceIcon />
            )}
          </div>

          {/* Device Info - Compact inline */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm font-semibold truncate">
                {manufacturer || 'Dispositivo'}
              </span>
              {platform && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-4",
                    platform === 'android' && "bg-green-500/15 text-green-600 border-0",
                    platform === 'ios' && "bg-gray-500/15 text-gray-600 border-0"
                  )}
                >
                  {platform === 'android' ? 'Android' : platform === 'ios' ? 'iOS' : 'Web'}
                </Badge>
              )}
            </div>
            {model && (
              <p className="text-xs text-muted-foreground truncate">
                {model}
              </p>
            )}
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground/70">
              <span className="capitalize">{getDeviceType()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeviceImageWidget;