import { useState, useEffect } from 'react';
import { Package, AlertTriangle, Shield, Loader2, HardDrive, ChevronDown, ChevronUp, Smartphone, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';

interface AppStorageWidgetProps {
  onRefresh?: () => void;
}

// Simulated app data based on common apps for demo purposes
interface SimulatedApp {
  name: string;
  packageName: string;
  sizeMb: number;
  category: 'social' | 'media' | 'productivity' | 'game' | 'utility' | 'system';
  riskLevel: 'safe' | 'moderate' | 'suspicious';
  tips?: string;
}

const COMMON_APPS: SimulatedApp[] = [
  { name: 'WhatsApp', packageName: 'com.whatsapp', sizeMb: 180, category: 'social', riskLevel: 'safe' },
  { name: 'Instagram', packageName: 'com.instagram.android', sizeMb: 320, category: 'social', riskLevel: 'safe' },
  { name: 'TikTok', packageName: 'com.zhiliaoapp.musically', sizeMb: 450, category: 'media', riskLevel: 'safe', tips: 'Consuma molta batteria in background' },
  { name: 'Facebook', packageName: 'com.facebook.katana', sizeMb: 380, category: 'social', riskLevel: 'moderate', tips: 'App pesante, considera Facebook Lite' },
  { name: 'YouTube', packageName: 'com.google.android.youtube', sizeMb: 250, category: 'media', riskLevel: 'safe' },
  { name: 'Spotify', packageName: 'com.spotify.music', sizeMb: 320, category: 'media', riskLevel: 'safe' },
  { name: 'Chrome', packageName: 'com.android.chrome', sizeMb: 280, category: 'utility', riskLevel: 'safe' },
  { name: 'Gmail', packageName: 'com.google.android.gm', sizeMb: 150, category: 'productivity', riskLevel: 'safe' },
  { name: 'Maps', packageName: 'com.google.android.apps.maps', sizeMb: 220, category: 'utility', riskLevel: 'safe' },
  { name: 'Telegram', packageName: 'org.telegram.messenger', sizeMb: 120, category: 'social', riskLevel: 'safe' },
];

const RISKY_APP_PATTERNS = [
  { pattern: 'cleaner', risk: 'Spesso contiene pubblicità invasiva' },
  { pattern: 'booster', risk: 'Non migliora realmente le prestazioni' },
  { pattern: 'battery saver', risk: 'Può consumare più batteria di quella che risparmia' },
  { pattern: 'vpn free', risk: 'Può raccogliere dati personali' },
  { pattern: 'antivirus free', risk: 'Spesso inefficace e pieno di pubblicità' },
];

export const AppStorageWidget = ({ onRefresh }: AppStorageWidgetProps) => {
  const [expanded, setExpanded] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  const getCategoryColor = (category: SimulatedApp['category']) => {
    switch (category) {
      case 'social': return 'bg-blue-500';
      case 'media': return 'bg-purple-500';
      case 'productivity': return 'bg-green-500';
      case 'game': return 'bg-orange-500';
      case 'utility': return 'bg-gray-500';
      case 'system': return 'bg-slate-500';
      default: return 'bg-muted';
    }
  };

  const getCategoryLabel = (category: SimulatedApp['category']) => {
    switch (category) {
      case 'social': return 'Social';
      case 'media': return 'Media';
      case 'productivity': return 'Produttività';
      case 'game': return 'Giochi';
      case 'utility': return 'Utilità';
      case 'system': return 'Sistema';
      default: return category;
    }
  };

  const displayedApps = expanded ? COMMON_APPS : COMMON_APPS.slice(0, 5);
  const totalSize = COMMON_APPS.reduce((sum, app) => sum + app.sizeMb, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Analisi App
          </CardTitle>
          <Badge variant="secondary">
            {(totalSize / 1024).toFixed(1)} GB stimati
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Banner */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Smartphone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-primary">Consigli per le tue App</p>
              <p className="text-xs text-muted-foreground mt-1">
                Basato sulle app più comuni. Per un'analisi dettagliata delle tue app specifiche, 
                visita Impostazioni → App sul tuo dispositivo.
              </p>
            </div>
          </div>
        </div>

        {/* Risk Patterns Warning */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">App da Evitare</span>
          </div>
          <div className="space-y-1.5">
            {RISKY_APP_PATTERNS.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <span className="text-amber-600">•</span>
                <span>
                  <strong className="capitalize">{item.pattern}</strong>: {item.risk}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Common Apps List */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            App comuni e il loro impatto tipico:
          </p>
          <ScrollArea className={cn("pr-2", expanded ? "h-[350px]" : "")}>
            <div className="space-y-2">
              {displayedApps.map((app) => (
                <div
                  key={app.packageName}
                  className="flex items-center gap-3 p-2 rounded-lg border bg-background"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    getCategoryColor(app.category)
                  )}>
                    <Package className="h-5 w-5 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{app.name}</p>
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {getCategoryLabel(app.category)}
                      </Badge>
                    </div>
                    {app.tips && (
                      <p className="text-xs text-amber-600 mt-0.5">{app.tips}</p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className={cn(
                      "text-sm font-medium",
                      app.sizeMb > 400 && "text-amber-600"
                    )}>
                      ~{app.sizeMb} MB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Expand/Collapse */}
        {COMMON_APPS.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Mostra meno
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Mostra altre ({COMMON_APPS.length - 5})
              </>
            )}
          </Button>
        )}

        {/* Tips */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium">💡 Suggerimenti per liberare spazio:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Svuota la cache di WhatsApp e Telegram (possono occupare GB)</li>
            <li>• Usa le versioni Lite delle app social (Facebook Lite, Messenger Lite)</li>
            <li>• Elimina le app che non usi da più di 30 giorni</li>
            <li>• Sposta foto e video su cloud (Google Foto, iCloud)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppStorageWidget;