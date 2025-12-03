import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, Truck, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";

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
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Bozza", className: "bg-muted text-muted-foreground" },
  pending: { label: "In Attesa", className: "bg-warning/10 text-warning border-warning/20" },
  ordered: { label: "Ordinato", className: "bg-primary/10 text-primary border-primary/20" },
  received: { label: "Ricevuto", className: "bg-accent/10 text-accent border-accent/20" },
};

export function OrderDetailDialog({ open, onOpenChange, orderId }: OrderDetailDialogProps) {
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);

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

      if (orderRes.data) setOrder(orderRes.data);
      if (itemsRes.data) setItems(itemsRes.data);
    } catch (error) {
      console.error("Error loading order details:", error);
    } finally {
      setLoading(false);
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
            {/* Status & Date */}
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={className}>{label}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(order.created_at), "dd MMM yyyy", { locale: it })}
              </span>
            </div>

            {/* Tracking */}
            {order.tracking_number && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{order.tracking_number}</span>
              </div>
            )}

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
