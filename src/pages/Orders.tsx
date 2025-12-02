import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ShoppingCart, 
  Package, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Loader2,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OrderItem {
  id: string;
  product_name: string;
  product_code: string | null;
  quantity: number;
  unit_cost: number;
  spare_part_id: string | null;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  supplier: string;
  total_amount: number | null;
  repair_id: string | null;
  notes: string | null;
  created_at: string;
  ordered_at: string | null;
  received_at: string | null;
  order_items: OrderItem[];
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchOrders();

    // Setup realtime subscription for orders
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            product_name,
            product_code,
            quantity,
            unit_cost,
            spare_part_id
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast.error("Errore nel caricamento ordini");
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const config: Record<string, { label: string; icon: JSX.Element; variant: any }> = {
      pending: {
        label: "In Attesa",
        icon: <Clock className="h-4 w-4" />,
        variant: "secondary",
      },
      ordered: {
        label: "Ordinato",
        icon: <ShoppingCart className="h-4 w-4" />,
        variant: "default",
      },
      received: {
        label: "Ricevuto",
        icon: <CheckCircle className="h-4 w-4" />,
        variant: "default",
      },
    };
    return config[status] || config.pending;
  };

  const handleReceiveOrder = async (order: Order) => {
    setProcessingOrder(order.id);
    
    try {
      // Aggiorna lo stato dell'ordine
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "received",
          received_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (orderError) throw orderError;

      // Aggiorna lo stock dei ricambi
      for (const item of order.order_items) {
        if (item.spare_part_id) {
          // Recupera lo stock attuale
          const { data: partData, error: fetchError } = await supabase
            .from("spare_parts")
            .select("stock_quantity")
            .eq("id", item.spare_part_id)
            .single();

          if (fetchError) {
            console.error("Error fetching spare part:", fetchError);
            continue;
          }

          // Incrementa lo stock
          const newStock = (partData?.stock_quantity || 0) + item.quantity;
          
          const { error: updateError } = await supabase
            .from("spare_parts")
            .update({ stock_quantity: newStock })
            .eq("id", item.spare_part_id);

          if (updateError) {
            console.error("Error updating stock:", updateError);
          }
        }
      }

      toast.success("Ordine scaricato! Stock aggiornato");
      fetchOrders();
    } catch (error: any) {
      console.error("Error receiving order:", error);
      toast.error("Errore nello scarico ordine");
    } finally {
      setProcessingOrder(null);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filterStatus === "all") return true;
    return order.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Ordini Ricambi</h1>
            <p className="text-muted-foreground">
              Gestisci gli ordini ai fornitori e scarica i ricambi quando arrivano
            </p>
          </div>
          <Badge variant="outline" className="gap-2">
            <Clock className="h-4 w-4" />
            Tracking Real-Time Attivo
          </Badge>
        </div>

        <Tabs value={filterStatus} onValueChange={setFilterStatus} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">Tutti ({orders.length})</TabsTrigger>
            <TabsTrigger value="pending">In Attesa ({orders.filter(o => o.status === "pending").length})</TabsTrigger>
            <TabsTrigger value="ordered">Ordinati ({orders.filter(o => o.status === "ordered").length})</TabsTrigger>
            <TabsTrigger value="received">Ricevuti ({orders.filter(o => o.status === "received").length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {filteredOrders.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {orders.length === 0 ? "Nessun ordine" : "Nessun ordine in questa categoria"}
            </h2>
            <p className="text-muted-foreground">
              {orders.length === 0 
                ? "Gli ordini creati durante le riparazioni appariranno qui"
                : "Cambia filtro per vedere altri ordini"}
            </p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredOrders.map((order, index) => {
              const statusInfo = getStatusInfo(order.status);
              
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-foreground">
                            {order.order_number}
                          </h3>
                          <Badge 
                            variant={statusInfo.variant}
                            className="gap-1"
                          >
                            {statusInfo.icon}
                            {statusInfo.label}
                          </Badge>
                          {order.repair_id && (
                            <Badge variant="outline" className="gap-1">
                              <Package className="h-3 w-3" />
                              Riparazione
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Fornitore: {order.supplier}</span>
                          <span>•</span>
                          <span>
                            Creato: {format(new Date(order.created_at), "dd MMM yyyy", { locale: it })}
                          </span>
                          {order.received_at && (
                            <>
                              <span>•</span>
                              <span className="text-success">
                                Ricevuto: {format(new Date(order.received_at), "dd MMM yyyy", { locale: it })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {order.status === "pending" && (
                        <Button
                          onClick={() => handleReceiveOrder(order)}
                          disabled={processingOrder === order.id}
                          className="gap-2"
                        >
                          {processingOrder === order.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Scarica Ordine
                        </Button>
                      )}
                    </div>

                    {order.notes && (
                      <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {order.notes}
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Articoli ({order.order_items.length})
                      </h4>
                      
                      <div className="divide-y divide-border">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="py-3 flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{item.product_name}</p>
                              {item.product_code && (
                                <p className="text-sm text-muted-foreground">
                                  Codice: {item.product_code}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-foreground">
                                {item.quantity}x €{item.unit_cost.toFixed(2)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Tot: €{(item.quantity * item.unit_cost).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {order.total_amount !== null && (
                        <div className="pt-3 border-t border-border flex justify-between items-center">
                          <span className="font-semibold text-foreground">Totale Ordine</span>
                          <span className="text-2xl font-bold text-primary">
                            €{order.total_amount.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {order.repair_id && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/repairs/${order.repair_id}`, "_blank")}
                          className="gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Vedi Riparazione
                        </Button>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}