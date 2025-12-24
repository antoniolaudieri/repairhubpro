import { Activity, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  const getScoreGradient = () => {
    if (score >= 80) return 'from-green-500/20 via-green-500/10 to-transparent';
    if (score >= 60) return 'from-amber-500/20 via-amber-500/10 to-transparent';
    return 'from-destructive/20 via-destructive/10 to-transparent';
  };

  const getScoreBorderColor = () => {
    if (score >= 80) return 'border-green-500/30';
    if (score >= 60) return 'border-amber-500/30';
    return 'border-destructive/30';
  };

  const getScoreLabel = () => {
    if (score >= 80) return 'Ottimo';
    if (score >= 60) return 'Buono';
    if (score >= 40) return 'Discreto';
    return 'Critico';
  };

  const getScoreIcon = () => {
    if (score >= 80) return TrendingUp;
    if (score >= 60) return Minus;
    return TrendingDown;
  };

  const ScoreIcon = getScoreIcon();

  return (
    <Card className={cn(
      'relative overflow-hidden border-2 transition-all duration-300',
      getScoreBorderColor(),
      'bg-card/80 backdrop-blur-sm'
    )}>
      {/* Gradient overlay */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-50',
        getScoreGradient()
      )} />
      
      {/* Animated glow for good scores */}
      {score >= 80 && (
        <div className="absolute top-2 right-2">
          <Sparkles className="h-4 w-4 text-green-500 animate-pulse" />
        </div>
      )}
      
      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <div className={cn(
            'p-1.5 rounded-lg',
            score >= 80 ? 'bg-green-500/20' : score >= 60 ? 'bg-amber-500/20' : 'bg-destructive/20'
          )}>
            <Activity className={cn('h-4 w-4', getScoreColor())} />
          </div>
          Punteggio Salute
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <div className="text-center space-y-3">
          {/* Score with animated ring */}
          <div className="relative inline-flex items-center justify-center">
            <svg className="w-24 h-24 -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/30"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className={getScoreColor()}
                strokeDasharray={`${(score / 100) * 251.2} 251.2`}
                style={{ transition: 'stroke-dasharray 1s ease-in-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn('text-3xl font-bold', getScoreColor())}>
                {score}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2">
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium',
              score >= 80 ? 'bg-green-500/20 text-green-600' : 
              score >= 60 ? 'bg-amber-500/20 text-amber-600' : 
              'bg-destructive/20 text-destructive'
            )}>
              <ScoreIcon className="h-3.5 w-3.5" />
              {getScoreLabel()}
            </div>
          </div>
          
          {lastSyncAt && (
            <p className="text-xs text-muted-foreground">
              Ultimo sync: {lastSyncAt.toLocaleString('it-IT')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
