import { useState } from 'react';
import { Camera, Check, X, AlertTriangle, Minus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ItemStatus = 'ok' | 'damaged' | 'not_working' | 'not_applicable';

interface ChecklistItemRowProps {
  item: {
    id?: string;
    item_name: string;
    category: string;
    status?: ItemStatus;
    notes?: string;
    photo_url?: string;
  };
  onStatusChange: (status: ItemStatus) => void;
  onNotesChange: (notes: string) => void;
  onPhotoCapture: () => void;
  readOnly?: boolean;
}

const statusConfig: Record<ItemStatus, { label: string; icon: React.ReactNode; className: string }> = {
  ok: { 
    label: 'OK', 
    icon: <Check className="h-3 w-3" />, 
    className: 'bg-success/20 text-success border-success/30 hover:bg-success/30' 
  },
  damaged: { 
    label: 'Danneggiato', 
    icon: <AlertTriangle className="h-3 w-3" />, 
    className: 'bg-warning/20 text-warning border-warning/30 hover:bg-warning/30' 
  },
  not_working: { 
    label: 'Non Funziona', 
    icon: <X className="h-3 w-3" />, 
    className: 'bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30' 
  },
  not_applicable: { 
    label: 'N/A', 
    icon: <Minus className="h-3 w-3" />, 
    className: 'bg-muted text-muted-foreground border-border hover:bg-muted/80' 
  },
};

export function ChecklistItemRow({ 
  item, 
  onStatusChange, 
  onNotesChange, 
  onPhotoCapture,
  readOnly = false 
}: ChecklistItemRowProps) {
  const [showNotes, setShowNotes] = useState(!!item.notes);

  return (
    <div className="border border-border/50 rounded-lg p-3 bg-card/50 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm flex-1">{item.item_name}</span>
        
        {item.photo_url && (
          <Badge variant="outline" className="gap-1 text-xs">
            <Camera className="h-3 w-3" />
            Foto
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(statusConfig) as ItemStatus[]).map((status) => {
          const config = statusConfig[status];
          const isSelected = item.status === status;
          
          return (
            <Button
              key={status}
              type="button"
              variant="outline"
              size="sm"
              disabled={readOnly}
              onClick={() => onStatusChange(status)}
              className={cn(
                "h-7 text-xs gap-1 transition-all",
                isSelected && config.className,
                !isSelected && "opacity-50 hover:opacity-100"
              )}
            >
              {config.icon}
              {config.label}
            </Button>
          );
        })}
      </div>

      <div className="flex gap-2">
        {!readOnly && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPhotoCapture}
              className="h-7 text-xs gap-1"
            >
              <Camera className="h-3 w-3" />
              {item.photo_url ? 'Cambia Foto' : 'Aggiungi Foto'}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowNotes(!showNotes)}
              className={cn("h-7 text-xs gap-1", showNotes && "text-primary")}
            >
              <MessageSquare className="h-3 w-3" />
              Note
            </Button>
          </>
        )}
      </div>

      {(showNotes || item.notes) && (
        <Input
          placeholder="Aggiungi note..."
          value={item.notes || ''}
          onChange={(e) => onNotesChange(e.target.value)}
          disabled={readOnly}
          className="h-8 text-sm"
        />
      )}

      {item.photo_url && (
        <div className="mt-2">
          <img 
            src={item.photo_url} 
            alt={item.item_name}
            className="w-full max-w-[200px] h-auto rounded-lg border border-border"
          />
        </div>
      )}
    </div>
  );
}
