import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, User, Smartphone, Calendar, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface UsatoReservationCardProps {
  reservation: {
    id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    status: string;
    created_at: string;
    device?: {
      brand: string;
      model: string;
      price: number;
    };
  };
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'In attesa', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  confirmed: { label: 'Confermata', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  cancelled: { label: 'Annullata', className: 'bg-muted text-muted-foreground' },
};

export function UsatoReservationCard({ reservation, onConfirm, onCancel }: UsatoReservationCardProps) {
  const config = statusConfig[reservation.status] || statusConfig.pending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all"
    >
      {/* Status indicator */}
      {reservation.status === 'pending' && (
        <div className="absolute top-0 right-0 w-3 h-3">
          <span className="absolute inline-flex h-full w-full rounded-bl-xl bg-amber-500 opacity-75 animate-pulse" />
        </div>
      )}

      <div className="space-y-4">
        {/* Header with device info */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              {reservation.device ? (
                <>
                  <h3 className="font-semibold text-sm">
                    {reservation.device.brand} {reservation.device.model}
                  </h3>
                  <p className="text-lg font-bold text-primary">
                    €{reservation.device.price.toLocaleString()}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Dispositivo non disponibile</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className={`${config.className} text-[10px]`}>
            {config.label}
          </Badge>
        </div>

        {/* Customer info */}
        <div className="space-y-2 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{reservation.customer_name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span>{reservation.customer_email}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span>{reservation.customer_phone}</span>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(reservation.created_at), "dd MMM yyyy 'alle' HH:mm", { locale: it })}</span>
        </div>

        {/* Actions */}
        {reservation.status === 'pending' && (
          <div className="flex items-center gap-2 pt-1">
            <Button 
              size="sm" 
              onClick={() => onConfirm(reservation.id)}
              className="flex-1 h-9 gap-1.5 bg-emerald-500 hover:bg-emerald-600"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Conferma
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onCancel(reservation.id)}
              className="flex-1 h-9 gap-1.5"
            >
              <XCircle className="h-3.5 w-3.5" />
              Rifiuta
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
