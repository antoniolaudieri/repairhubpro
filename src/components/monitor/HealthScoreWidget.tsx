import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface HealthScoreWidgetProps {
  score: number;
  lastSyncAt: Date | null;
}

export const HealthScoreWidget = ({ score }: HealthScoreWidgetProps) => {
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
  const circumference = 2 * Math.PI * 36; // radius = 36
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Card className="overflow-hidden">
      {/* SVG Gradients */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="gradient-excellent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(142, 76%, 36%)" />
            <stop offset="100%" stopColor="hsl(160, 84%, 39%)" />
          </linearGradient>
          <linearGradient id="gradient-good" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(38, 92%, 50%)" />
            <stop offset="100%" stopColor="hsl(45, 93%, 47%)" />
          </linearGradient>
          <linearGradient id="gradient-critical" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(0, 84%, 60%)" />
            <stop offset="100%" stopColor="hsl(350, 89%, 60%)" />
          </linearGradient>
        </defs>
      </svg>
      
      <CardContent className="p-3">
        <div className="flex flex-col items-center text-center">
          {/* Compact Score Circle */}
          <div className="relative mb-2">
            <svg width="80" height="80" className="-rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-muted/20"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke={`url(#${getScoreGradientId()})`}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-2xl font-bold', getScoreColor())}>
                {score}
              </span>
            </div>
          </div>
          
          {/* Label */}
          <div className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
            score >= 80 ? 'bg-green-500/15 text-green-600' : 
            score >= 60 ? 'bg-amber-500/15 text-amber-600' : 
            'bg-destructive/15 text-destructive'
          )}>
            <ScoreIcon className="h-3 w-3" />
            {getScoreLabel()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
