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
  ExternalLink,
  Truck
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  tracking_number: string | null;
  created_at: string;
  ordered_at: string | null;
  received_at: string | null;
  order_items: OrderItem[];
  repairs?: {
    devices: {
      customers: {
        name: string;
        phone: string;
        email: string | null;
      };
    };
  } | null;
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
          ),
          repairs (
            devices (
              customers (
                name,
                phone,
                email
              )
            )
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
      draft: {
        label: "Bozza",
        icon: <Clock className="h-4 w-4" />,
        variant: "secondary",
      },
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
    return config[status] || config.draft;
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    // Aggiorna lo stato locale immediatamente (ottimistico)
    const previousOrders = [...orders];
    setOrders(orders.map(o => {
      if (o.id === orderId) {
        const updates: any = { status: newStatus };
        if (newStatus === "ordered" && !o.ordered_at) {
          updates.ordered_at = new Date().toISOString();
        }
        return { ...o, ...updates };
      }
      return o;
    }));

    try {
      const updates: any = { status: newStatus };
      
      if (newStatus === "ordered" && !orders.find(o => o.id === orderId)?.ordered_at) {
        updates.ordered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", orderId);

      if (error) throw error;
      toast.success("Stato aggiornato");
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Errore aggiornamento stato");
      // Ripristina lo stato precedente in caso di errore
      setOrders(previousOrders);
    }
  };

  const updateTrackingNumber = async (orderId: string, trackingNumber: string) => {
    // Aggiorna lo stato locale immediatamente (ottimistico)
    const previousOrders = [...orders];
    setOrders(orders.map(o => 
      o.id === orderId ? { ...o, tracking_number: trackingNumber } : o
    ));

    try {
      const { error } = await supabase
        .from("orders")
        .update({ tracking_number: trackingNumber })
        .eq("id", orderId);

      if (error) throw error;
      toast.success("Tracking aggiornato");
    } catch (error: any) {
      console.error("Error updating tracking:", error);
      toast.error("Errore aggiornamento tracking");
      // Ripristina lo stato precedente in caso di errore
      setOrders(previousOrders);
    }
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
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Ordini Ricambi
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Gestisci gli ordini ai fornitori e scarica i ricambi quando arrivano
              </p>
            </div>
            <Badge variant="outline" className="gap-2 w-fit">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Tracking Real-Time Attivo</span>
              <span className="sm:hidden">Live</span>
            </Badge>
          </div>
        </motion.div>

        <Tabs value={filterStatus} onValueChange={setFilterStatus} className="mb-6">
          <TabsList className="w-full grid grid-cols-3 md:grid-cols-5 gap-2 h-auto p-1">
            <TabsTrigger value="all" className="text-xs md:text-sm">
              <span className="hidden sm:inline">Tutti</span>
              <span className="sm:hidden">Tutti</span>
              <span className="ml-1">({orders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="draft" className="text-xs md:text-sm">
              <span className="hidden sm:inline">Bozze</span>
              <span className="sm:hidden">Bozze</span>
              <span className="ml-1">({orders.filter(o => o.status === "draft").length})</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs md:text-sm">
              <span className="hidden sm:inline">In Attesa</span>
              <span className="sm:hidden">Attesa</span>
              <span className="ml-1">({orders.filter(o => o.status === "pending").length})</span>
            </TabsTrigger>
            <TabsTrigger value="ordered" className="text-xs md:text-sm">
              <span className="hidden sm:inline">Ordinati</span>
              <span className="sm:hidden">Ord.</span>
              <span className="ml-1">({orders.filter(o => o.status === "ordered").length})</span>
            </TabsTrigger>
            <TabsTrigger value="received" className="text-xs md:text-sm">
              <span className="hidden sm:inline">Ricevuti</span>
              <span className="sm:hidden">Ric.</span>
              <span className="ml-1">({orders.filter(o => o.status === "received").length})</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-8 md:p-12 text-center">
              <ShoppingCart className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg md:text-xl font-semibold mb-2">
                {orders.length === 0 ? "Nessun ordine" : "Nessun ordine in questa categoria"}
              </h2>
              <p className="text-sm md:text-base text-muted-foreground">
                {orders.length === 0 
                  ? "Gli ordini creati durante le riparazioni appariranno qui"
                  : "Cambia filtro per vedere altri ordini"}
              </p>
            </Card>
          </motion.div>
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
                  <Card className="p-4 md:p-6 hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/20">
                    <div className="space-y-4">
                      {/* Header con numero ordine e badges */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg md:text-xl font-bold text-foreground">
                              {order.order_number}
                            </h3>
                            <Badge 
                              variant={statusInfo.variant}
                              className="gap-1"
                            >
                              {statusInfo.icon}
                              <span className="text-xs">{statusInfo.label}</span>
                            </Badge>
                            {order.repair_id && (
                              <Badge variant="outline" className="gap-1">
                                <Package className="h-3 w-3" />
                                <span className="text-xs">Riparazione</span>
                              </Badge>
                            )}
                          </div>
                          
                          {/* Info Cliente */}
                          {order.repairs?.devices?.customers && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20"
                            >
                              <p className="font-semibold text-foreground text-sm md:text-base mb-1">
                                👤 {order.repairs.devices.customers.name}
                              </p>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs md:text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  📞 {order.repairs.devices.customers.phone}
                                </span>
                                {order.repairs.devices.customers.email && (
                                  <span className="flex items-center gap-1">
                                    <span className="hidden sm:inline">•</span>
                                    ✉️ {order.repairs.devices.customers.email}
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          )}
                          
                          {/* Info Date e Fornitore */}
                          <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-muted-foreground">
                            <span className="font-medium">🏪 {order.supplier}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>
                              📅 {format(new Date(order.created_at), "dd MMM yyyy", { locale: it })}
                            </span>
                            {order.ordered_at && (
                              <>
                                <span className="hidden sm:inline">•</span>
                                <span className="text-primary">
                                  🛒 {format(new Date(order.ordered_at), "dd MMM yyyy", { locale: it })}
                                </span>
                              </>
                            )}
                            {order.received_at && (
                              <>
                                <span className="hidden sm:inline">•</span>
                                <span className="text-success font-medium">
                                  ✅ {format(new Date(order.received_at), "dd MMM yyyy", { locale: it })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Pulsante Scarica */}
                        {order.status !== "received" && (
                          <Button
                            onClick={() => handleReceiveOrder(order)}
                            disabled={processingOrder === order.id}
                            className="gap-2 w-full sm:w-auto"
                            size="sm"
                          >
                            {processingOrder === order.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">Scarica Ordine</span>
                            <span className="sm:hidden">Scarica</span>
                          </Button>
                        )}
                      </div>

                      {/* Gestione Stato e Tracking */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 md:p-4 bg-muted/20 rounded-lg border border-border/50">
                        <div className="space-y-2">
                          <Label htmlFor={`status-${order.id}`} className="text-xs md:text-sm font-medium flex items-center gap-2">
                            📊 Stato Ordine
                          </Label>
                          <Select
                            value={order.status}
                            onValueChange={(value) => updateOrderStatus(order.id, value)}
                            disabled={order.status === "received"}
                          >
                            <SelectTrigger id={`status-${order.id}`} className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Bozza</SelectItem>
                              <SelectItem value="pending">In Attesa</SelectItem>
                              <SelectItem value="ordered">Ordinato</SelectItem>
                              <SelectItem value="received" disabled>Ricevuto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`tracking-${order.id}`} className="text-xs md:text-sm font-medium flex items-center gap-2">
                            <Truck className="h-3 w-3 md:h-4 md:w-4" />
                            Tracking
                          </Label>
                          <Input
                            id={`tracking-${order.id}`}
                            placeholder="Inserisci tracking..."
                            value={order.tracking_number || ""}
                            onChange={(e) => {
                              setOrders(orders.map(o => 
                                o.id === order.id 
                                  ? { ...o, tracking_number: e.target.value }
                                  : o
                              ));
                            }}
                            onBlur={(e) => updateTrackingNumber(order.id, e.target.value)}
                            disabled={order.status === "received"}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>

                      {order.notes && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="p-3 bg-warning/10 border border-warning/20 rounded-lg"
                        >
                          <p className="text-xs md:text-sm text-foreground flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-warning" />
                            {order.notes}
                          </p>
                        </motion.div>
                      )}

                      {/* Articoli */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm md:text-base text-foreground flex items-center gap-2 pb-2 border-b">
                          <Package className="h-4 w-4" />
                          Articoli ({order.order_items.length})
                        </h4>
                        
                        <div className="space-y-2">
                          {order.order_items.map((item, idx) => (
                            <motion.div 
                              key={item.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm md:text-base text-foreground truncate">
                                    {item.product_name}
                                  </p>
                                  {item.product_code && (
                                    <p className="text-xs text-muted-foreground">
                                      Cod: {item.product_code}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="font-semibold text-sm md:text-base text-foreground whitespace-nowrap">
                                    {item.quantity}x €{item.unit_cost.toFixed(2)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Tot: €{(item.quantity * item.unit_cost).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        {order.total_amount !== null && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="pt-3 mt-3 border-t-2 border-primary/20 flex justify-between items-center bg-primary/5 p-3 rounded-lg"
                          >
                            <span className="font-semibold text-sm md:text-base text-foreground">
                              Totale Ordine
                            </span>
                            <span className="text-xl md:text-2xl font-bold text-primary">
                              €{order.total_amount.toFixed(2)}
                            </span>
                          </motion.div>
                        )}
                      </div>

                      {order.repair_id && (
                        <div className="pt-3 mt-3 border-t border-border">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/repairs/${order.repair_id}`, "_blank")}
                            className="gap-2 w-full sm:w-auto hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Vedi Riparazione
                          </Button>
                        </div>
                      )}
                    </div>
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