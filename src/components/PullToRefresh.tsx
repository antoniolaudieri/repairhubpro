import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { RefreshCw } from "lucide-react";
import { ReactNode } from "react";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh?: () => void;
}

export const PullToRefresh = ({ children, onRefresh }: PullToRefreshProps) => {
  const { pullDistance, progress, shouldRefresh, isRefreshing } = usePullToRefresh({
    threshold: 80,
    onRefresh,
  });

  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div className="relative">
      {/* Pull indicator */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[100] pointer-events-none transition-opacity duration-200"
        style={{
          top: Math.max(8, pullDistance - 40),
          opacity: showIndicator ? 1 : 0,
        }}
      >
        <div
          className={`
            w-10 h-10 rounded-full bg-background border shadow-lg
            flex items-center justify-center
            transition-colors duration-200
            ${shouldRefresh ? "bg-primary border-primary" : "border-border"}
          `}
        >
          <RefreshCw
            className={`
              h-5 w-5 transition-all duration-200
              ${shouldRefresh ? "text-primary-foreground" : "text-muted-foreground"}
              ${isRefreshing ? "animate-spin" : ""}
            `}
            style={{
              transform: isRefreshing ? undefined : `rotate(${progress * 180}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content with pull transform */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: pullDistance === 0 ? "transform 0.2s ease-out" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
};
