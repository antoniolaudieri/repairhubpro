import { Monitor, Smartphone, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ScreenWidgetProps {
  screenWidth: number | null;
  screenHeight: number | null;
  pixelRatio: number | null;
  colorDepth: number | null;
  orientation: string | null;
  touchSupport: boolean;
}

export const ScreenWidget = ({ 
  screenWidth, 
  screenHeight, 
  pixelRatio,
  colorDepth,
  orientation,
  touchSupport
}: ScreenWidgetProps) => {
  
  const getOrientationLabel = (orient: string | null): string => {
    if (!orient) return 'Sconosciuto';
    if (orient.includes('portrait')) return 'Verticale';
    if (orient.includes('landscape')) return 'Orizzontale';
    return orient;
  };
  
  const getScreenQuality = (): { label: string; color: string } => {
    if (!screenWidth || !screenHeight) return { label: 'N/D', color: 'text-muted-foreground' };
    
    const resolution = screenWidth * screenHeight * (pixelRatio || 1);
    
    if (resolution >= 3686400) return { label: 'Ultra HD', color: 'text-green-500' };
    if (resolution >= 2073600) return { label: 'Full HD', color: 'text-green-500' };
    if (resolution >= 921600) return { label: 'HD', color: 'text-amber-500' };
    return { label: 'SD', color: 'text-orange-500' };
  };
  
  const quality = getScreenQuality();
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {touchSupport ? (
            <Smartphone className="h-4 w-4 text-primary" />
          ) : (
            <Monitor className="h-4 w-4 text-primary" />
          )}
          Schermo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            {screenWidth && screenHeight ? (
              <span className="text-lg font-bold">{screenWidth} × {screenHeight}</span>
            ) : (
              <span className="text-muted-foreground">N/D</span>
            )}
          </div>
          <span className={`text-sm font-medium ${quality.color}`}>{quality.label}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          {pixelRatio !== null && (
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-muted-foreground text-xs">Densità Pixel</div>
              <div className="font-medium">{pixelRatio}x</div>
            </div>
          )}
          {colorDepth !== null && (
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-muted-foreground text-xs">Profondità Colore</div>
              <div className="font-medium">{colorDepth} bit</div>
            </div>
          )}
          {orientation && (
            <div className="bg-muted/50 rounded-lg p-2 flex items-center gap-2">
              <RotateCcw className="h-3 w-3 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground text-xs">Orientamento</div>
                <div className="font-medium">{getOrientationLabel(orientation)}</div>
              </div>
            </div>
          )}
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-muted-foreground text-xs">Touch</div>
            <div className="font-medium">{touchSupport ? 'Supportato' : 'Non supportato'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};