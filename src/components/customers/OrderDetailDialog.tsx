import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, Truck, ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  product_name: string;
  product_code: string | null;
  quantity: number;
  unit_cost: number;
}

interface OrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  onOrderUpdated?: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Bozza", className: "bg-muted text-muted-foreground" },
  pending: { label: "In Attesa", className: "bg-warning/10 text-warning border-warning/20" },
  ordered: { label: "Ordinato", className: "bg-primary/10 text-primary border-primary/20" },
  received: { label: "Ricevuto", className: "bg-accent/10 text-accent border-accent/20" },
};

export function OrderDetailDialog({ open, onOpenChange, orderId, onOrderUpdated }: OrderDetailDialogProps) {
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");

  useEffect(() => {
    if (open && orderId) {
      loadOrderDetails();
    }
  }, [open, orderId]);

  const loadOrderDetails = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const [orderRes, itemsRes] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).single(),
        supabase.from("order_items").select("*").eq("order_id", orderId),
      ]);

      if (orderRes.data) {
        setOrder(orderRes.data);
        setTrackingNumber(orderRes.data.tracking_number || "");
      }
      if (itemsRes.data) setItems(itemsRes.data);
    } catch (error) {
      console.error("Error loading order details:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!orderId) return;
    setUpdating(true);
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === "ordered") {
        updateData.ordered_at = new Date().toISOString();
      } else if (newStatus === "received") {
        updateData.received_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;
      
      setOrder({ ...order, status: newStatus, ...updateData });
      toast.success("Stato aggiornato");
      onOrderUpdated?.();
    } catch (error: any) {
      toast.error(error.message || "Errore nell'aggiornamento");
    } finally {
      setUpdating(false);
    }
  };

  const updateTracking = async () => {
    if (!orderId) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ tracking_number: trackingNumber })
        .eq("id", orderId);

      if (error) throw error;
      
      setOrder({ ...order, tracking_number: trackingNumber });
      toast.success("Tracking aggiornato");
      onOrderUpdated?.();
    } catch (error: any) {
      toast.error(error.message || "Errore nell'aggiornamento");
    } finally {
      setUpdating(false);
    }
  };

  if (!order) return null;

  const { label, className } = statusConfig[order.status] || { label: order.status, className: "" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {order.order_number}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status Selector */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Stato Ordine</p>
              <Select
                value={order.status}
                onValueChange={updateStatus}
                disabled={updating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    <Badge variant="outline" className={className}>{label}</Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <Badge variant="outline" className={config.className}>{config.label}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Creato il {format(new Date(order.created_at), "dd MMM yyyy", { locale: it })}
            </div>

            {/* Tracking Number */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Numero Tracking</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Inserisci tracking..."
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="flex-1 h-8 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={updateTracking}
                  disabled={updating || trackingNumber === (order.tracking_number || "")}
                  className="h-8"
                >
                  {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Articoli</p>
              <div className="space-y-1.5">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg border">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.product_name}</p>
                      {item.product_code && (
                        <p className="text-[10px] text-muted-foreground">{item.product_code}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-sm font-semibold">€{item.unit_cost.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">x{item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            {order.total_amount && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-medium">Totale</span>
                <span className="text-lg font-bold text-accent">€{order.total_amount.toFixed(2)}</span>
              </div>
            )}

            {/* Notes */}
            {order.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1">Note</p>
                <p className="text-sm text-foreground/80">{order.notes}</p>
              </div>
            )}

            {/* Utopya Link */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open("https://www.utopya.it/", "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Apri Utopya
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
