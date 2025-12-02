import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, MapPin, Edit, Smartphone, FileText } from "lucide-react";
import { toast } from "sonner";
import { CustomerStats } from "@/components/customers/CustomerStats";
import { CustomerDialog } from "@/components/customers/CustomerDialog";
import { QuoteDialog } from "@/components/quotes/QuoteDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  address: string | null;
  notes: string | null;
  created_at: string;
}

interface Device {
  id: string;
  device_type: string;
  brand: string;
  model: string;
  photo_url: string | null;
  repairs: Array<{
    id: string;
    status: string;
    diagnosis: string | null;
    final_cost: number | null;
    created_at: string;
    completed_at: string | null;
  }>;
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);

  const loadCustomerData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      const { data: devicesData, error: devicesError } = await supabase
        .from("devices")
        .select(`
          id,
          device_type,
          brand,
          model,
          photo_url,
          repairs (
            id,
            status,
            diagnosis,
            final_cost,
            created_at,
            completed_at
          )
        `)
        .eq("customer_id", id);

      if (devicesError) throw devicesError;
      setDevices(devicesData || []);
    } catch (error: any) {
      toast.error(error.message || "Errore nel caricamento dei dati");
      navigate("/customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!customer) return null;

  const allRepairs = devices.flatMap(d => d.repairs);
  const completedRepairs = allRepairs.filter(r => r.status === "completed");
  const totalSpent = completedRepairs.reduce((sum, r) => sum + (r.final_cost || 0), 0);
  const avgRepairTime = completedRepairs.length > 0
    ? Math.round(
        completedRepairs.reduce((sum, r) => {
          if (r.completed_at) {
            const days = Math.abs(
              new Date(r.completed_at).getTime() - new Date(r.created_at).getTime()
            ) / (1000 * 60 * 60 * 24);
            return sum + days;
          }
          return sum;
        }, 0) / completedRepairs.length
      )
    : 0;
  const completionRate = allRepairs.length > 0
    ? Math.round((completedRepairs.length / allRepairs.length) * 100)
    : 0;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      "in-progress": "default",
      completed: "outline",
      cancelled: "destructive",
    };
    const labels: Record<string, string> = {
      pending: "In Attesa",
      "in-progress": "In Corso",
      completed: "Completata",
      cancelled: "Annullata",
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/customers")} className="flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">{customer.name}</h1>
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">
              Cliente dal {format(new Date(customer.created_at), "dd MMM yyyy", { locale: it })}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => setQuoteOpen(true)} variant="default" className="w-full sm:w-auto">
            <FileText className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Crea Preventivo</span>
            <span className="sm:hidden">Preventivo</span>
          </Button>
          <Button onClick={() => setEditOpen(true)} variant="outline" className="w-full sm:w-auto">
            <Edit className="h-4 w-4 mr-2" />
            Modifica
          </Button>
        </div>
      </div>

      <CustomerStats
        totalRepairs={allRepairs.length}
        totalSpent={totalSpent}
        avgRepairTime={avgRepairTime}
        completionRate={completionRate}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informazioni di Contatto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{customer.phone}</span>
            </div>
            {customer.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{customer.address}</span>
              </div>
            )}
            {customer.notes && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Note</p>
                <p className="text-sm text-muted-foreground">{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dispositivi</CardTitle>
          </CardHeader>
          <CardContent>
            {devices.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nessun dispositivo registrato</p>
            ) : (
              <div className="space-y-3">
                {devices.map((device) => (
                  <div key={device.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/5 transition-colors">
                    {device.photo_url ? (
                      <img
                        src={device.photo_url}
                        alt={`${device.brand} ${device.model}`}
                        className="h-16 w-16 object-contain rounded border bg-background"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                        }}
                      />
                    ) : (
                      <div className="h-16 w-16 flex items-center justify-center rounded border bg-muted">
                        <Smartphone className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <Smartphone className="fallback-icon hidden h-16 w-16 p-3 text-muted-foreground border rounded" />
                    <div className="flex-1">
                      <p className="font-medium">{device.brand} {device.model}</p>
                      <p className="text-sm text-muted-foreground">{device.device_type}</p>
                    </div>
                    <Badge variant="secondary">{device.repairs.length} riparazioni</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Storico Riparazioni</CardTitle>
        </CardHeader>
        <CardContent>
          {allRepairs.length === 0 ? (
            <p className="text-sm sm:text-base text-muted-foreground text-center py-8">Nessuna riparazione registrata</p>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Dispositivo</TableHead>
                      <TableHead>Diagnosi</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Costo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRepairs.map((repair) => {
                      const device = devices.find(d => d.repairs.some(r => r.id === repair.id));
                      return (
                        <TableRow key={repair.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/repairs/${repair.id}`)}>
                          <TableCell>{format(new Date(repair.created_at), "dd/MM/yyyy", { locale: it })}</TableCell>
                          <TableCell>{device ? `${device.brand} ${device.model}` : "-"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{repair.diagnosis || "-"}</TableCell>
                          <TableCell>{getStatusBadge(repair.status)}</TableCell>
                          <TableCell>{repair.final_cost ? `€${repair.final_cost.toFixed(2)}` : "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {allRepairs.map((repair) => {
                  const device = devices.find(d => d.repairs.some(r => r.id === repair.id));
                  return (
                    <div
                      key={repair.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/repairs/${repair.id}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{device ? `${device.brand} ${device.model}` : "-"}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(repair.created_at), "dd/MM/yyyy", { locale: it })}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(repair.status)}
                          {repair.final_cost && (
                            <span className="text-sm font-semibold text-primary">€{repair.final_cost.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      {repair.diagnosis && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{repair.diagnosis}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <CustomerDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
        onSuccess={loadCustomerData}
      />

      <QuoteDialog
        open={quoteOpen}
        onOpenChange={setQuoteOpen}
        customerId={id!}
        onSuccess={loadCustomerData}
      />
    </div>
  );
}
