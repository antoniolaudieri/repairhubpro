import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  ShoppingCart, 
  CheckCircle, 
  Clock,
  FileEdit,
  Truck,
  ExternalLink,
  Package,
  TrendingUp,
  Trash2,
  Loader2,
  PackageCheck,
  User
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface OrderItem {
  id: string;
  product_name: string;
  product_code: string | null;
  quantity: number;
  unit_cost: number;
  spare_part_id: string | null;
  spare_parts?: {
    image_url: string | null;
  } | null;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  supplier: string;
  total_amount: number | null;
  repair_id: string | null;
  tracking_number: string | null;
  notes: string | null;
  created_at: string;
  ordered_at: string | null;
  received_at: string | null;
  order_items: OrderItem[];
  customer_id: string | null;
  customers?: { name: string; phone: string; email: string | null; centro_id: string } | null;
  repairs?: {
    devices: {
      brand: string;
      model: string;
      photo_url: string | null;
      customers: {
        name: string;
        phone: string;
        email: string | null;
      };
    };
  } | null;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: JSX.Element }> = {
  draft: {
    label: "Bozza",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
    borderColor: "border-l-slate-400",
    icon: <FileEdit className="h-4 w-4" />,
  },
  pending: {
    label: "In Attesa",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    borderColor: "border-l-amber-500",
    icon: <Clock className="h-4 w-4" />,
  },
  ordered: {
    label: "Ordinato",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    borderColor: "border-l-blue-500",
    icon: <ShoppingCart className="h-4 w-4" />,
  },
  received: {
    label: "Ricevuto",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    borderColor: "border-l-emerald-500",
    icon: <CheckCircle className="h-4 w-4" />,
  },
};

const PartImage = ({ imageUrl, name }: { imageUrl: string | null | undefined; name: string }) => {
  const [hasError, setHasError] = useState(false);
  
  if (!imageUrl || hasError) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-[10px] font-bold">TR</div>
        </div>
      </div>
    );
  }
  
  return (
    <img 
      src={imageUrl} 
      alt={name}
      className="w-full h-full object-cover"
      onError={() => setHasError(true)}
    />
  );
};

export default function CentroOrdini() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [centroId, setCentroId] = useState<string | null>(null);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (user) fetchCentroAndOrders();

    const channel = supabase
      .channel('centro-orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchCentroAndOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchCentroAndOrders = async () => {
    try {
      const { data: centro } = await supabase
        .from("centri_assistenza")
        .select("id")
        .eq("owner_user_id", user?.id)
        .single();

      if (!centro) {
        setLoading(false);
        return;
      }
      setCentroId(centro.id);

      // Get orders for customers of this centro OR repairs of this centro's customers
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
            spare_part_id,
            spare_parts (image_url)
          ),
          customers (name, phone, email, centro_id),
          repairs (
            devices (
              brand,
              model,
              photo_url,
              customers (name, phone, email)
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Filter orders that belong to this centro
      const centroOrders = (data || []).filter(order => 
        order.customers?.centro_id === centro.id ||
        (order.repairs?.devices?.customers && 
         order.customer_id === null) // Direct repair orders
      );
      
      setOrders(centroOrders);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast.error("Errore nel caricamento ordini");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const previousOrders = [...orders];
    setOrders(orders.map(o => {
      if (o.id === orderId) {
        const updates: any = { status: newStatus };
        if (newStatus === "ordered" && !o.ordered_at) {
          updates.ordered_at = new Date().toISOString();
        }
        if (newStatus === "received" && !o.received_at) {
          updates.received_at = new Date().toISOString();
        }
        return { ...o, ...updates };
      }
      return o;
    }));

    try {
      const updates: any = { status: newStatus };
      const order = orders.find(o => o.id === orderId);
      
      if (newStatus === "ordered" && !order?.ordered_at) {
        updates.ordered_at = new Date().toISOString();
      }

      if (newStatus === "received" && !order?.received_at) {
        updates.received_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", orderId);

      if (error) throw error;

      // Update stock if received
      if (newStatus === "received" && order) {
        for (const item of order.order_items) {
          if (item.spare_part_id) {
            const { data: partData, error: fetchError } = await supabase
              .from("spare_parts")
              .select("stock_quantity")
              .eq("id", item.spare_part_id)
              .single();

            if (fetchError) continue;

            const newStock = (partData?.stock_quantity || 0) + item.quantity;
            
            await supabase
              .from("spare_parts")
              .update({ stock_quantity: newStock })
              .eq("id", item.spare_part_id);
          }
        }
        toast.success("Ordine ricevuto! Stock aggiornato");
      } else {
        toast.success("Stato aggiornato");
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Errore aggiornamento stato");
      setOrders(previousOrders);
    }
  };

  const updateTrackingNumber = async (orderId: string, trackingNumber: string) => {
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
      toast.error("Errore aggiornamento tracking");
      setOrders(previousOrders);
    }
  };

  const handleReceiveOrder = async (order: Order) => {
    setProcessingOrder(order.id);
    
    try {
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "received",
          received_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (orderError) throw orderError;

      for (const item of order.order_items) {
        if (item.spare_part_id) {
          const { data: partData, error: fetchError } = await supabase
            .from("spare_parts")
            .select("stock_quantity")
            .eq("id", item.spare_part_id)
            .single();

          if (fetchError) continue;

          const newStock = (partData?.stock_quantity || 0) + item.quantity;
          
          await supabase
            .from("spare_parts")
            .update({ stock_quantity: newStock })
            .eq("id", item.spare_part_id);
        }
      }

      toast.success("Ordine scaricato! Stock aggiornato");
      fetchCentroAndOrders();
    } catch (error: any) {
      console.error("Error receiving order:", error);
      toast.error("Errore nello scarico ordine");
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    try {
      const { error: itemsError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderToDelete.id);
      
      if (itemsError) throw itemsError;
      
      const { error: orderError } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderToDelete.id);
      
      if (orderError) throw orderError;
      
      toast.success("Ordine eliminato");
      setOrders(orders.filter(o => o.id !== orderToDelete.id));
    } catch (error: any) {
      console.error("Error deleting order:", error);
      toast.error("Errore durante l'eliminazione");
    } finally {
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    }
  };

  const filteredOrders = orders.filter(o => filterStatus === "all" || o.status === filterStatus);

  const stats = {
    draft: orders.filter(o => o.status === "draft").length,
    pending: orders.filter(o => o.status === "pending").length,
    ordered: orders.filter(o => o.status === "ordered").length,
    received: orders.filter(o => o.status === "received").length,
    totalValue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
  };

  if (loading) {
    return (
      <CentroLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute inset-0" />
            </div>
            <p className="text-muted-foreground font-medium">Caricamento ordini...</p>
          </motion.div>
        </div>
      </CentroLayout>
    );
  }

  return (
    <CentroLayout>
      <div className="min-h-screen">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white"
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-14 h-14 md:w-16 md:h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center"
                >
                  <ShoppingCart className="h-7 w-7 md:h-8 md:w-8 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">Ordini Ricambi</h1>
                  <p className="text-blue-100 text-sm md:text-base">
                    Gestisci ordini fornitori e traccia le spedizioni
                  </p>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-2"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-sm font-medium">Real-Time Attivo</span>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          {/* Stats Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6"
          >
            <Card 
              className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setFilterStatus("draft")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center">
                  <FileEdit className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-700">{stats.draft}</p>
                  <p className="text-xs text-slate-500">Bozze</p>
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setFilterStatus("pending")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-200 rounded-xl flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
                  <p className="text-xs text-amber-600">In Attesa</p>
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setFilterStatus("ordered")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-200 rounded-xl flex items-center justify-center">
                  <Truck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-700">{stats.ordered}</p>
                  <p className="text-xs text-blue-600">Ordinati</p>
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setFilterStatus("received")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-200 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-700">{stats.received}</p>
                  <p className="text-xs text-emerald-600">Ricevuti</p>
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setFilterStatus("all")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">€{stats.totalValue.toFixed(0)}</p>
                  <p className="text-xs text-primary/70">Totale</p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Filter indicator */}
          {filterStatus !== "all" && (
            <div className="mb-4 flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                Filtro: {statusConfig[filterStatus]?.label || filterStatus}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setFilterStatus("all")}>
                Mostra tutti
              </Button>
            </div>
          )}

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <Card className="p-12 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nessun ordine</h3>
              <p className="text-muted-foreground text-sm">
                Gli ordini verranno creati automaticamente durante l'intake delle riparazioni.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order, index) => {
                const status = statusConfig[order.status] || statusConfig.draft;
                const customerName = order.customers?.name || order.repairs?.devices?.customers?.name || "Cliente";
                
                return (
                  <motion.div 
                    key={order.id} 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`p-4 md:p-6 border-l-4 ${status.borderColor} hover:shadow-lg transition-all`}>
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        {/* Left side - Order info */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-mono font-bold text-lg">{order.order_number}</span>
                            <Badge className={`${status.bgColor} ${status.color}`}>
                              {status.icon}
                              <span className="ml-1">{status.label}</span>
                            </Badge>
                            {order.supplier && (
                              <Badge variant="outline" className="text-xs">
                                {order.supplier}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{customerName}</span>
                            <span>•</span>
                            <span>{format(new Date(order.created_at), "dd MMM yyyy HH:mm", { locale: it })}</span>
                          </div>

                          {/* Order items */}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {order.order_items.map((item) => (
                              <div key={item.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                                <div className="h-8 w-8 rounded bg-background overflow-hidden flex-shrink-0">
                                  <PartImage imageUrl={item.spare_parts?.image_url} name={item.product_name} />
                                </div>
                                <div className="text-sm">
                                  <span className="font-medium">{item.quantity}x</span>
                                  <span className="text-muted-foreground ml-1">{item.product_name}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 ml-1"
                                  onClick={() => window.open(`https://www.utopya.it/catalogsearch/result/?q=${encodeURIComponent(item.product_name)}`, '_blank')}
                                >
                                  <ExternalLink className="h-3 w-3 text-orange-500" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          {/* Tracking */}
                          {(order.status === "ordered" || order.tracking_number) && (
                            <div className="flex items-center gap-2 pt-2 border-t mt-3">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Numero tracking..."
                                value={order.tracking_number || ""}
                                onChange={(e) => updateTrackingNumber(order.id, e.target.value)}
                                className="max-w-xs h-8 text-sm"
                              />
                            </div>
                          )}
                        </div>

                        {/* Right side - Actions */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          <div className="text-right">
                            <p className="text-2xl font-bold">€{(order.total_amount || 0).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.order_items.length} {order.order_items.length === 1 ? 'articolo' : 'articoli'}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {order.status === "ordered" && (
                              <Button
                                onClick={() => handleReceiveOrder(order)}
                                disabled={processingOrder === order.id}
                                className="bg-emerald-500 hover:bg-emerald-600"
                              >
                                {processingOrder === order.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <PackageCheck className="h-4 w-4 mr-2" />
                                    Scarica
                                  </>
                                )}
                              </Button>
                            )}
                            
                            <Select value={order.status} onValueChange={(val) => updateOrderStatus(order.id, val)}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">Bozza</SelectItem>
                                <SelectItem value="pending">In Attesa</SelectItem>
                                <SelectItem value="ordered">Ordinato</SelectItem>
                                <SelectItem value="received">Ricevuto</SelectItem>
                              </SelectContent>
                            </Select>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setOrderToDelete(order);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina ordine</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare l'ordine <strong>{orderToDelete?.order_number}</strong>?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteOrder}
              className="bg-destructive hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CentroLayout>
  );
}
