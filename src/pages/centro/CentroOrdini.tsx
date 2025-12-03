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
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShoppingCart, 
  CheckCircle, 
  Clock,
  FileEdit,
  Truck,
  ExternalLink,
  Package,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface OrderItem {
  id: string;
  product_name: string;
  product_code: string | null;
  quantity: number;
  unit_cost: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  supplier: string;
  total_amount: number | null;
  repair_id: string | null;
  tracking_number: string | null;
  created_at: string;
  ordered_at: string | null;
  received_at: string | null;
  order_items: OrderItem[];
  customer_id: string | null;
  customers?: { name: string; centro_id: string } | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  draft: { label: "Bozza", color: "bg-slate-100 text-slate-600", icon: <FileEdit className="h-4 w-4" /> },
  pending: { label: "In Attesa", color: "bg-amber-100 text-amber-600", icon: <Clock className="h-4 w-4" /> },
  ordered: { label: "Ordinato", color: "bg-blue-100 text-blue-600", icon: <ShoppingCart className="h-4 w-4" /> },
  received: { label: "Ricevuto", color: "bg-emerald-100 text-emerald-600", icon: <CheckCircle className="h-4 w-4" /> },
};

export default function CentroOrdini() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [centroId, setCentroId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchCentroAndOrders();
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

      // Get orders for customers of this centro
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (id, product_name, product_code, quantity, unit_cost),
          customers!inner (name, centro_id)
        `)
        .eq("customers.centro_id", centro.id)
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
    try {
      const updates: any = { status: newStatus };
      const order = orders.find(o => o.id === orderId);
      
      if (newStatus === "ordered" && !order?.ordered_at) {
        updates.ordered_at = new Date().toISOString();
      }
      if (newStatus === "received" && !order?.received_at) {
        updates.received_at = new Date().toISOString();
      }

      const { error } = await supabase.from("orders").update(updates).eq("id", orderId);
      if (error) throw error;

      // Update stock if received
      if (newStatus === "received" && order) {
        for (const item of order.order_items) {
          // This assumes order_items have spare_part_id - simplified version
        }
      }

      toast.success("Stato aggiornato");
      fetchCentroAndOrders();
    } catch (error: any) {
      toast.error("Errore aggiornamento");
    }
  };

  const updateTrackingNumber = async (orderId: string, trackingNumber: string) => {
    try {
      const { error } = await supabase.from("orders").update({ tracking_number: trackingNumber }).eq("id", orderId);
      if (error) throw error;
      toast.success("Tracking aggiornato");
      fetchCentroAndOrders();
    } catch (error) {
      toast.error("Errore aggiornamento tracking");
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
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary" />
        </div>
      </CentroLayout>
    );
  }

  return (
    <CentroLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Ordini Ricambi</h1>
              <p className="text-muted-foreground text-sm">Gestisci ordini fornitori</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-4 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus("draft")}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center">
                <FileEdit className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.draft}</p>
                <p className="text-xs text-muted-foreground">Bozze</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus("pending")}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-200 rounded-xl flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">In Attesa</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus("ordered")}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-200 rounded-xl flex items-center justify-center">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.ordered}</p>
                <p className="text-xs text-muted-foreground">Ordinati</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus("received")}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-200 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.received}</p>
                <p className="text-xs text-muted-foreground">Ricevuti</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus("all")}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{stats.totalValue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Totale</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessun ordine</h3>
            <p className="text-muted-foreground text-sm">Gli ordini verranno creati automaticamente durante l'intake.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.draft;
              return (
                <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono font-bold">{order.order_number}</span>
                          <Badge className={status.color}>
                            {status.icon}
                            <span className="ml-1">{status.label}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.customers?.name} • {format(new Date(order.created_at), "dd MMM yyyy", { locale: it })}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {order.order_items.slice(0, 3).map((item) => (
                            <Badge key={item.id} variant="outline" className="text-xs">
                              {item.quantity}x {item.product_name}
                            </Badge>
                          ))}
                          {order.order_items.length > 3 && (
                            <Badge variant="outline" className="text-xs">+{order.order_items.length - 3} altri</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="text-right">
                          <p className="text-xl font-bold">€{(order.total_amount || 0).toFixed(2)}</p>
                        </div>
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
                      </div>
                    </div>
                    {order.status === "ordered" && (
                      <div className="mt-4 pt-4 border-t flex items-center gap-2">
                        <Label className="text-sm">Tracking:</Label>
                        <Input
                          placeholder="Numero tracking"
                          value={order.tracking_number || ""}
                          onChange={(e) => updateTrackingNumber(order.id, e.target.value)}
                          className="max-w-xs"
                        />
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </CentroLayout>
  );
}
