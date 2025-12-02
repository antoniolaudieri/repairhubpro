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
  Truck,
  FileEdit,
  PackageCheck,
  Box,
  Sparkles,
  TrendingUp,
  User,
  Phone,
  Mail
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
  notes: string | null;
  tracking_number: string | null;
  created_at: string;
  ordered_at: string | null;
  received_at: string | null;
  order_items: OrderItem[];
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

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchOrders();

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
            spare_part_id,
            spare_parts (
              image_url
            )
          ),
          repairs (
            devices (
              brand,
              model,
              photo_url,
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

      if (newStatus === "received" && order) {
        for (const item of order.order_items) {
          if (item.spare_part_id) {
            const { data: partData, error: fetchError } = await supabase
              .from("spare_parts")
              .select("stock_quantity")
              .eq("id", item.spare_part_id)
              .single();

            if (fetchError) {
              console.error("Error fetching spare part:", fetchError);
              continue;
            }

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
      console.error("Error updating tracking:", error);
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

          if (fetchError) {
            console.error("Error fetching spare part:", fetchError);
            continue;
          }

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

  const stats = {
    draft: orders.filter(o => o.status === "draft").length,
    pending: orders.filter(o => o.status === "pending").length,
    ordered: orders.filter(o => o.status === "ordered").length,
    received: orders.filter(o => o.status === "received").length,
    totalValue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
    );
  }

  return (
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
          <Card className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setFilterStatus("draft")}>
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

          <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setFilterStatus("pending")}>
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

          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setFilterStatus("ordered")}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-200 rounded-xl flex items-center justify-center">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.ordered}</p>
                <p className="text-xs text-blue-600">In Transito</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setFilterStatus("received")}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-200 rounded-xl flex items-center justify-center">
                <PackageCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700">{stats.received}</p>
                <p className="text-xs text-emerald-600">Ricevuti</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200 hover:shadow-lg transition-all col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-200 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xl md:text-2xl font-bold text-violet-700">€{stats.totalValue.toFixed(0)}</p>
                <p className="text-xs text-violet-600">Valore Totale</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={filterStatus} onValueChange={setFilterStatus} className="mb-6">
            <TabsList className="w-full grid grid-cols-3 md:grid-cols-5 gap-1 h-auto p-1 bg-muted/50">
              <TabsTrigger value="all" className="text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Tutti ({orders.length})
              </TabsTrigger>
              <TabsTrigger value="draft" className="text-xs md:text-sm">
                Bozze
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs md:text-sm">
                Attesa
              </TabsTrigger>
              <TabsTrigger value="ordered" className="text-xs md:text-sm">
                Ordinati
              </TabsTrigger>
              <TabsTrigger value="received" className="text-xs md:text-sm">
                Ricevuti
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="p-12 text-center bg-gradient-to-br from-muted/30 to-muted/50">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Package className="h-10 w-10 text-muted-foreground" />
              </motion.div>
              <h2 className="text-xl font-semibold mb-2">
                {orders.length === 0 ? "Nessun ordine" : "Nessun ordine qui"}
              </h2>
              <p className="text-muted-foreground">
                {orders.length === 0 
                  ? "Gli ordini creati durante le riparazioni appariranno qui"
                  : "Cambia filtro per vedere altri ordini"}
              </p>
            </Card>
          </motion.div>
        ) : (
          <div className="grid gap-4 md:gap-6">
            {filteredOrders.map((order, index) => {
              const status = statusConfig[order.status] || statusConfig.draft;
              
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`overflow-hidden border-l-4 ${status.borderColor} hover:shadow-xl transition-all duration-300`}>
                    {/* Order Header with Device Image */}
                    <div className="bg-gradient-to-r from-muted/30 via-muted/20 to-transparent p-4 md:p-5 border-b">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Device/Order Image */}
                        <div className="flex items-center gap-4 flex-1">
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 shadow-md flex-shrink-0 flex items-center justify-center"
                          >
                            {order.repairs?.devices?.photo_url ? (
                              <img 
                                src={order.repairs.devices.photo_url} 
                                alt="Device"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-white text-center">
                                <div className="text-lg md:text-xl font-black tracking-tight">RP</div>
                                <div className="text-[8px] md:text-[10px] font-medium opacity-80">REPAIR</div>
                              </div>
                            )}
                          </motion.div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="text-lg md:text-xl font-bold text-foreground">
                                {order.order_number}
                              </h3>
                              <Badge className={`${status.bgColor} ${status.color} gap-1 border-0`}>
                                {status.icon}
                                {status.label}
                              </Badge>
                            </div>
                            
                            {order.repairs?.devices && (
                              <p className="text-sm text-muted-foreground">
                                {order.repairs.devices.brand} {order.repairs.devices.model}
                              </p>
                            )}
                            
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span className="font-medium bg-muted/50 px-2 py-0.5 rounded">
                                {order.supplier}
                              </span>
                              <span>
                                {format(new Date(order.created_at), "dd MMM yyyy", { locale: it })}
                              </span>
                              {order.ordered_at && (
                                <span className="text-blue-600">
                                  Ordinato: {format(new Date(order.ordered_at), "dd MMM", { locale: it })}
                                </span>
                              )}
                              {order.received_at && (
                                <span className="text-emerald-600 font-medium">
                                  ✓ Ricevuto: {format(new Date(order.received_at), "dd MMM", { locale: it })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Total & Receive Button */}
                        <div className="flex items-center gap-3">
                          {order.total_amount !== null && (
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Totale</p>
                              <p className="text-2xl md:text-3xl font-bold text-primary">
                                €{order.total_amount.toFixed(2)}
                              </p>
                            </div>
                          )}
                          
                          {order.status !== "received" && (
                            <Button
                              onClick={() => handleReceiveOrder(order)}
                              disabled={processingOrder === order.id}
                              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {processingOrder === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <PackageCheck className="h-4 w-4" />
                              )}
                              <span className="hidden sm:inline">Scarica</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 md:p-5 space-y-4">
                      {/* Customer Info */}
                      {order.repairs?.devices?.customers && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-100 dark:border-blue-900"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">
                                {order.repairs.devices.customers.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                <a href={`tel:${order.repairs.devices.customers.phone}`} 
                                   className="flex items-center gap-1 hover:text-primary transition-colors">
                                  <Phone className="h-3 w-3" />
                                  {order.repairs.devices.customers.phone}
                                </a>
                                {order.repairs.devices.customers.email && (
                                  <a href={`mailto:${order.repairs.devices.customers.email}`}
                                     className="flex items-center gap-1 hover:text-primary transition-colors">
                                    <Mail className="h-3 w-3" />
                                    {order.repairs.devices.customers.email}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Status & Tracking Controls */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-muted/30 rounded-xl">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-primary" />
                            Stato Ordine
                          </Label>
                          <Select
                            value={order.status}
                            onValueChange={(value) => updateOrderStatus(order.id, value)}
                            disabled={order.status === "received"}
                          >
                            <SelectTrigger className="h-10 bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">📝 Bozza</SelectItem>
                              <SelectItem value="pending">⏳ In Attesa</SelectItem>
                              <SelectItem value="ordered">🛒 Ordinato</SelectItem>
                              <SelectItem value="received">✅ Ricevuto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs font-medium flex items-center gap-2">
                            <Truck className="h-3 w-3 text-primary" />
                            Numero Tracking
                          </Label>
                          <Input
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
                            className="h-10 bg-background"
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      {order.notes && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                          <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {order.notes}
                          </p>
                        </div>
                      )}

                      {/* Order Items */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                          <Package className="h-4 w-4 text-primary" />
                          Articoli ({order.order_items.length})
                        </h4>
                        
                        <div className="grid gap-2">
                          {order.order_items.map((item, idx) => (
                            <motion.div 
                              key={item.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="flex items-center gap-3 p-3 bg-background rounded-xl border hover:border-primary/30 hover:shadow-sm transition-all"
                            >
                              {/* Part Image */}
                              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-primary/80 to-primary">
                                {item.spare_parts?.image_url ? (
                                  <img 
                                    src={item.spare_parts.image_url} 
                                    alt={item.product_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="text-white text-center">
                                    <div className="text-xs font-bold">RP</div>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-foreground truncate">
                                  {item.product_name}
                                </p>
                                {item.product_code && (
                                  <p className="text-xs text-muted-foreground">
                                    Cod: {item.product_code}
                                  </p>
                                )}
                              </div>
                              
                              <div className="text-right flex-shrink-0">
                                <p className="font-bold text-foreground">
                                  {item.quantity}x €{item.unit_cost.toFixed(2)}
                                </p>
                                <p className="text-xs text-primary font-medium">
                                  €{(item.quantity * item.unit_cost).toFixed(2)}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      {order.repair_id && (
                        <div className="pt-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/repairs/${order.repair_id}`, "_blank")}
                            className="gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
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
