import { Activity, TrendingUp, TrendingDown, Minus, Sparkles, Shield, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface HealthScoreWidgetProps {
  score: number;
  lastSyncAt: Date | null;
}

export const HealthScoreWidget = ({ score, lastSyncAt }: HealthScoreWidgetProps) => {
  const getScoreColor = () => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-destructive';
  };

  const getScoreGradientId = () => {
    if (score >= 80) return 'gradient-excellent';
    if (score >= 60) return 'gradient-good';
    return 'gradient-critical';
  };

  const getScoreRingClass = () => {
    if (score >= 80) return 'score-ring-excellent';
    if (score >= 60) return 'score-ring-good';
    return 'score-ring-critical';
  };

  const getScoreLabel = () => {
    if (score >= 80) return 'Ottimo';
    if (score >= 60) return 'Buono';
    if (score >= 40) return 'Discreto';
    return 'Critico';
  };

  const getScoreDescription = () => {
    if (score >= 80) return 'Il tuo dispositivo è in ottime condizioni';
    if (score >= 60) return 'Alcune aree possono essere migliorate';
    if (score >= 40) return 'Si consiglia una manutenzione';
    return 'Richiede attenzione immediata';
  };

  const getScoreIcon = () => {
    if (score >= 80) return TrendingUp;
    if (score >= 60) return Minus;
    return TrendingDown;
  };

  const ScoreIcon = getScoreIcon();
  const circumference = 2 * Math.PI * 54; // radius = 54
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Card className="card-glass relative overflow-hidden border-0">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-accent/5 blur-3xl" />
      </div>
      
      {/* SVG Gradients */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="gradient-excellent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(142, 76%, 36%)" />
            <stop offset="50%" stopColor="hsl(160, 84%, 39%)" />
            <stop offset="100%" stopColor="hsl(142, 76%, 46%)" />
          </linearGradient>
          <linearGradient id="gradient-good" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(38, 92%, 50%)" />
            <stop offset="50%" stopColor="hsl(45, 93%, 47%)" />
            <stop offset="100%" stopColor="hsl(38, 92%, 60%)" />
          </linearGradient>
          <linearGradient id="gradient-critical" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(0, 84%, 60%)" />
            <stop offset="50%" stopColor="hsl(350, 89%, 60%)" />
            <stop offset="100%" stopColor="hsl(0, 84%, 70%)" />
          </linearGradient>
        </defs>
      </svg>
      
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center gap-6">
          {/* Score Circle */}
          <div className="relative flex-shrink-0">
            {/* Glow effect */}
            <div className={cn(
              'absolute inset-0 rounded-full blur-xl opacity-30',
              score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-destructive'
            )} />
            
            {/* Animated ring */}
            <div className="relative animate-score-pulse">
              <svg width="128" height="128" className="-rotate-90">
                {/* Background ring */}
                <circle
                  cx="64"
                  cy="64"
                  r="54"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-muted/20"
                />
                {/* Score ring */}
                <circle
                  cx="64"
                  cy="64"
                  r="54"
                  fill="none"
                  stroke={`url(#${getScoreGradientId()})`}
                  strokeWidth="10"
                  strokeLinecap="round"
                  className={cn('animate-score-ring', getScoreRingClass())}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ 
                    transition: 'stroke-dashoffset 1.5s ease-out',
                  }}
                />
              </svg>
              
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('text-4xl font-bold tracking-tight', getScoreColor())}>
                  {score}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  / 100
                </span>
              </div>
            </div>
            
            {/* Sparkle for excellent score */}
            {score >= 80 && (
              <div className="absolute -top-1 -right-1 animate-bounce-gentle">
                <div className="relative">
                  <Sparkles className="h-5 w-5 text-green-500" />
                  <div className="absolute inset-0 animate-ping">
                    <Sparkles className="h-5 w-5 text-green-500/50" />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Info section */}
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className={cn('h-4 w-4', getScoreColor())} />
                <h3 className="text-sm font-semibold text-foreground">
                  Salute Dispositivo
                </h3>
              </div>
              <div className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold',
                score >= 80 ? 'bg-green-500/15 text-green-600 border border-green-500/20' : 
                score >= 60 ? 'bg-amber-500/15 text-amber-600 border border-amber-500/20' : 
                'bg-destructive/15 text-destructive border border-destructive/20'
              )}>
                <ScoreIcon className="h-4 w-4" />
                {getScoreLabel()}
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              {getScoreDescription()}
            </p>
            
            {lastSyncAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" />
                <span>Sincronizzato: {lastSyncAt.toLocaleString('it-IT', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
