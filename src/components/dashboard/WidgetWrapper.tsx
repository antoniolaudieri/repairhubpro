import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardContext } from "./DashboardContext";

interface WidgetWrapperProps {
  id: string;
  title?: string;
  children: ReactNode;
  onRemove?: (id: string) => void;
  className?: string;
  noPadding?: boolean;
  showHeader?: boolean;
  headerIcon?: ReactNode;
  headerAction?: ReactNode;
}

export const WidgetWrapper = ({
  id,
  title,
  children,
  onRemove,
  className,
  noPadding = false,
  showHeader = false,
  headerIcon,
  headerAction,
}: WidgetWrapperProps) => {
  const { isEditMode } = useDashboardContext();

  return (
    <Card className={cn(
      "h-full border-border/50 overflow-hidden relative group transition-all",
      isEditMode && "ring-2 ring-primary/20 ring-offset-2",
      className
    )}>
      {isEditMode && (
        <div className="absolute top-0 left-0 right-0 h-8 bg-primary/10 flex items-center justify-between px-2 z-10 cursor-move drag-handle">
          <div className="flex items-center gap-1 text-xs text-primary">
            <GripVertical className="h-3 w-3" />
            <span className="font-medium truncate">{title}</span>
          </div>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(id);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
      
      <div className={cn(
        "h-full flex flex-col",
        isEditMode && "pt-8"
      )}>
        {showHeader && title && (
          <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              {headerIcon}
              <h2 className="font-medium text-foreground text-sm">{title}</h2>
            </div>
            {headerAction}
          </div>
        )}
        
        <div className={cn(
          "flex-1 overflow-auto",
          !noPadding && !showHeader && "p-4",
          !noPadding && showHeader && "p-3"
        )}>
          {children}
        </div>
      </div>
    </Card>
  );
};
