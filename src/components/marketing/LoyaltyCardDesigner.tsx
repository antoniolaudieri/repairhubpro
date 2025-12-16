import { Card } from "@/components/ui/card";
import { QRCodeSVG } from "qrcode.react";
import { CreditCard, Star, Smartphone, Calendar, Percent } from "lucide-react";
import { LoyaltyProgramSettings, DEFAULT_SETTINGS } from "@/hooks/useLoyaltyProgramSettings";

interface LoyaltyCardDesignerProps {
  settings: Partial<LoyaltyProgramSettings>;
  centroName: string;
  centroLogo?: string | null;
  cardNumber?: string;
  previewMode?: boolean;
}

const TEMPLATES: Record<string, { gradient: string; pattern: string }> = {
  gold: {
    gradient: 'from-amber-500 via-yellow-400 to-amber-600',
    pattern: 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))]',
  },
  silver: {
    gradient: 'from-slate-400 via-gray-300 to-slate-500',
    pattern: 'bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))]',
  },
  premium: {
    gradient: 'from-purple-600 via-violet-500 to-indigo-600',
    pattern: 'bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))]',
  },
  modern: {
    gradient: 'from-cyan-500 via-blue-500 to-indigo-500',
    pattern: 'bg-gradient-to-br',
  },
  classic: {
    gradient: 'from-emerald-600 via-green-500 to-teal-500',
    pattern: 'bg-gradient-to-tr',
  },
};

export function LoyaltyCardDesigner({
  settings,
  centroName,
  centroLogo,
  cardNumber = "LLC-XXXX-XXXX",
  previewMode = true,
}: LoyaltyCardDesignerProps) {
  const effectiveSettings = { ...DEFAULT_SETTINGS, ...settings };
  const template = TEMPLATES[effectiveSettings.card_template] || TEMPLATES.gold;

  const accentColor = effectiveSettings.card_accent_color || '#f59e0b';
  const textColor = effectiveSettings.card_text_color || '#ffffff';

  return (
    <div className={`relative ${previewMode ? 'w-full max-w-md' : 'w-full'}`}>
      <Card
        className={`relative overflow-hidden ${template.pattern} ${template.gradient} aspect-[1.6/1] p-4 sm:p-6 shadow-2xl`}
        style={{
          backgroundImage: effectiveSettings.card_background_url
            ? `url(${effectiveSettings.card_background_url})`
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay for custom backgrounds */}
        {effectiveSettings.card_background_url && (
          <div className="absolute inset-0 bg-black/40" />
        )}

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
          <div 
            className="absolute inset-0 rounded-full blur-3xl"
            style={{ backgroundColor: accentColor }}
          />
        </div>
        <div className="absolute bottom-0 left-0 w-24 h-24 opacity-10">
          <div 
            className="absolute inset-0 rounded-full blur-2xl"
            style={{ backgroundColor: textColor }}
          />
        </div>

        {/* Card Content */}
        <div className="relative z-10 h-full flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {centroLogo ? (
                <img 
                  src={centroLogo} 
                  alt={centroName} 
                  className="h-8 w-8 rounded-lg object-cover bg-white/20 backdrop-blur-sm"
                />
              ) : (
                <div 
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${accentColor}40` }}
                >
                  <CreditCard className="h-4 w-4" style={{ color: textColor }} />
                </div>
              )}
              <div>
                <h3 
                  className="font-bold text-sm truncate max-w-[120px] sm:max-w-[180px]"
                  style={{ color: textColor }}
                >
                  {centroName}
                </h3>
                <p 
                  className="text-xs opacity-80"
                  style={{ color: textColor }}
                >
                  {effectiveSettings.promo_tagline}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4" style={{ color: accentColor }} fill={accentColor} />
              <Star className="h-3 w-3 opacity-70" style={{ color: accentColor }} fill={accentColor} />
            </div>
          </div>

          {/* Benefits */}
          <div className="flex flex-wrap gap-2 my-2">
            <div 
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs backdrop-blur-sm"
              style={{ backgroundColor: `${textColor}20`, color: textColor }}
            >
              <Percent className="h-3 w-3" />
              <span>{effectiveSettings.repair_discount_percent}% sconto</span>
            </div>
            <div 
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs backdrop-blur-sm"
              style={{ backgroundColor: `${textColor}20`, color: textColor }}
            >
              <Smartphone className="h-3 w-3" />
              <span>{effectiveSettings.max_devices} dispositivi</span>
            </div>
            <div 
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs backdrop-blur-sm"
              style={{ backgroundColor: `${textColor}20`, color: textColor }}
            >
              <Calendar className="h-3 w-3" />
              <span>{effectiveSettings.validity_months} mesi</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-end justify-between">
            <div>
              <p 
                className="text-xs opacity-70"
                style={{ color: textColor }}
              >
                Numero Tessera
              </p>
              <p 
                className="font-mono font-bold text-sm tracking-wider"
                style={{ color: textColor }}
              >
                {cardNumber}
              </p>
            </div>
            <div className="bg-white p-1.5 rounded-lg shadow-lg">
              <QRCodeSVG 
                value={`lablinkriparo://loyalty/${cardNumber}`}
                size={40}
                level="L"
              />
            </div>
          </div>
        </div>

        {/* Price badge */}
        <div 
          className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold shadow-lg"
          style={{ backgroundColor: accentColor, color: textColor }}
        >
          €{effectiveSettings.annual_price}/anno
        </div>
      </Card>

      {/* Reflection effect */}
      <div className="absolute -bottom-4 left-4 right-4 h-8 bg-gradient-to-t from-background/0 to-background/20 blur-xl opacity-50 rounded-full" />
    </div>
  );
}
