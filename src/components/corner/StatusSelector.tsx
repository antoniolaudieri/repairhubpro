import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStatusLabel } from "@/components/corner/RepairWorkflowTimeline";

const ALL_STATUSES = [
  'pending',
  'assigned',
  'quote_sent',
  'quote_accepted',
  'awaiting_pickup',
  'picked_up',
  'in_diagnosis',
  'waiting_for_parts',
  'in_repair',
  'repair_completed',
  'ready_for_return',
  'at_corner',
  'delivered',
  'completed',
  'cancelled',
];

// Statuses to skip for direct-to-centro repairs (no Corner pickup/return)
const DIRECT_TO_CENTRO_SKIP = ['awaiting_pickup', 'picked_up', 'at_corner'];

interface StatusSelectorProps {
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
  disabled?: boolean;
  isDirectToCentro?: boolean;
}

export function StatusSelector({ currentStatus, onStatusChange, disabled, isDirectToCentro = false }: StatusSelectorProps) {
  const availableStatuses = isDirectToCentro 
    ? ALL_STATUSES.filter(s => !DIRECT_TO_CENTRO_SKIP.includes(s))
    : ALL_STATUSES;

  return (
    <Select value={currentStatus} onValueChange={onStatusChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Seleziona stato" />
      </SelectTrigger>
      <SelectContent>
        {availableStatuses.map((status) => (
          <SelectItem key={status} value={status}>
            {getStatusLabel(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
