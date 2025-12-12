import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CustomerScoreBadgeProps {
  score: number;
  breakdown?: {
    lifetimeValue: number;
    frequency: number;
    recency: number;
    loyalty: number;
    engagement: number;
  };
  size?: "sm" | "md";
}

export function CustomerScoreBadge({ score, breakdown, size = "md" }: CustomerScoreBadgeProps) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "bg-green-500/10 text-green-600 border-green-500/20";
    if (s >= 50) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-red-500/10 text-red-600 border-red-500/20";
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return "Gold";
    if (s >= 50) return "Standard";
    return "A Rischio";
  };

  const getScoreIcon = (s: number) => {
    if (s >= 80) return <TrendingUp className="h-3 w-3" />;
    if (s >= 50) return <Minus className="h-3 w-3" />;
    return <TrendingDown className="h-3 w-3" />;
  };

  const badge = (
    <Badge
      variant="secondary"
      className={`
        ${getScoreColor(score)} 
        ${size === "sm" ? "text-[10px] px-1.5 py-0 h-5" : "text-xs px-2 py-0.5"}
        font-semibold gap-1
      `}
    >
      {getScoreIcon(score)}
      {score}
    </Badge>
  );

  if (!breakdown) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="w-56 p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between font-medium">
              <span>Score Totale</span>
              <span className={score >= 80 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-600"}>
                {score}/100 ({getScoreLabel(score)})
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-1.5 text-xs">
              <ScoreRow label="Valore Vita" value={breakdown.lifetimeValue} weight="30%" />
              <ScoreRow label="Frequenza" value={breakdown.frequency} weight="25%" />
              <ScoreRow label="Recency" value={breakdown.recency} weight="20%" />
              <ScoreRow label="Fedeltà" value={breakdown.loyalty} weight="15%" />
              <ScoreRow label="Engagement" value={breakdown.engagement} weight="10%" />
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ScoreRow({ label, value, weight }: { label: string; value: number; weight: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground flex-1">{label}</span>
      <span className="text-muted-foreground/60 text-[10px]">{weight}</span>
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${
            value >= 80 ? "bg-green-500" : value >= 50 ? "bg-amber-500" : "bg-red-500"
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-6 text-right font-medium">{value}</span>
    </div>
  );
}
