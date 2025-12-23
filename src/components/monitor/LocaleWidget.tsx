import { Globe, Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LocaleWidgetProps {
  timezone: string | null;
  language: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const LocaleWidget = ({ 
  timezone, 
  language,
  latitude,
  longitude
}: LocaleWidgetProps) => {
  
  const getLanguageLabel = (lang: string | null): string => {
    if (!lang) return 'Sconosciuto';
    
    const langMap: Record<string, string> = {
      'it': 'Italiano',
      'it-IT': 'Italiano (Italia)',
      'en': 'English',
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'pt': 'Português',
      'zh': '中文',
      'ja': '日本語',
      'ko': '한국어',
      'ar': 'العربية',
      'ru': 'Русский'
    };
    
    return langMap[lang] || lang;
  };
  
  const getTimezoneLabel = (tz: string | null): string => {
    if (!tz) return 'Sconosciuto';
    return tz.replace(/_/g, ' ').replace(/\//g, ' / ');
  };
  
  const hasLocation = latitude !== null && longitude !== null;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Locale
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2 text-sm">
          {language && (
            <div className="bg-muted/50 rounded-lg p-2 flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground text-xs">Lingua</div>
                <div className="font-medium">{getLanguageLabel(language)}</div>
              </div>
            </div>
          )}
          
          {timezone && (
            <div className="bg-muted/50 rounded-lg p-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground text-xs">Fuso Orario</div>
                <div className="font-medium text-xs">{getTimezoneLabel(timezone)}</div>
              </div>
            </div>
          )}
          
          {hasLocation && (
            <div className="bg-muted/50 rounded-lg p-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground text-xs">Posizione</div>
                <div className="font-medium text-xs">
                  {latitude!.toFixed(4)}, {longitude!.toFixed(4)}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};