import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Mail, Phone, MapPin, Edit, Smartphone, FileText, 
  Calendar, User, Laptop, Tablet, Monitor, Gamepad2, Watch, HelpCircle,
  ChevronRight, Clock, Euro
} from "lucide-react";
import { toast } from "sonner";
import { CustomerStats } from "@/components/customers/CustomerStats";
import { CustomerCharts } from "@/components/customers/CustomerCharts";
import { CustomerDialog } from "@/components/customers/CustomerDialog";
import { QuoteDialog } from "@/components/quotes/QuoteDialog";
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

const deviceIcons: Record<string, React.ReactNode> = {
  smartphone: <Smartphone className="h-5 w-5" />,
  tablet: <Tablet className="h-5 w-5" />,
  laptop: <Laptop className="h-5 w-5" />,
  desktop: <Monitor className="h-5 w-5" />,
  console: <Gamepad2 className="h-5 w-5" />,
  smartwatch: <Watch className="h-5 w-5" />,
};

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
  const completedRepairs = allRepairs.filter(r => r.status === "completed" || r.status === "delivered");
  const pendingRepairs = allRepairs.filter(r => r.status === "pending").length;
  const inProgressRepairs = allRepairs.filter(r => r.status === "in-progress").length;
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
  
  const lastRepairDate = allRepairs.length > 0 
    ? allRepairs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
    : null;

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; className?: string }> = {
      pending: { variant: "secondary", label: "In Attesa", className: "bg-warning/10 text-warning border-warning/20" },
      "in-progress": { variant: "default", label: "In Corso", className: "bg-primary/10 text-primary border-primary/20" },
      completed: { variant: "outline", label: "Completata", className: "bg-accent/10 text-accent border-accent/20" },
      cancelled: { variant: "destructive", label: "Annullata" },
      waiting_for_parts: { variant: "secondary", label: "Attesa Ricambi", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
      delivered: { variant: "outline", label: "Consegnata", className: "bg-info/10 text-info border-info/20" },
    };
    const { variant, label, className } = config[status] || { variant: "secondary", label: status };
    return <Badge variant={variant} className={className}>{label}</Badge>;
  };

  const getDeviceIcon = (type: string) => {
    return deviceIcons[type] || <HelpCircle className="h-5 w-5" />;
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-start gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/customers")} 
            className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">{customer.name}</h1>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Cliente dal {format(new Date(customer.created_at), "dd MMM yyyy", { locale: it })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 ml-0 sm:ml-12">
          <Button onClick={() => setQuoteOpen(true)} size="sm" className="flex-1 sm:flex-none">
            <FileText className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Crea Preventivo</span>
            <span className="sm:hidden">Preventivo</span>
          </Button>
          <Button onClick={() => setEditOpen(true)} variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Edit className="h-4 w-4 mr-1.5" />
            Modifica
          </Button>
        </div>
      </div>

      {/* Stats */}
      <CustomerStats
        totalRepairs={allRepairs.length}
        totalSpent={totalSpent}
        avgRepairTime={avgRepairTime}
        completionRate={completionRate}
        pendingRepairs={pendingRepairs}
        inProgressRepairs={inProgressRepairs}
        lastRepairDate={lastRepairDate}
      />

      {/* Charts */}
      <CustomerCharts devices={devices} allRepairs={allRepairs} />

      {/* Contact & Devices Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base">Informazioni di Contatto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer.email && (
              <a 
                href={`mailto:${customer.email}`}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{customer.email}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            )}
            
            <a 
              href={`tel:${customer.phone}`}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Phone className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Telefono</p>
                <p className="text-sm font-medium group-hover:text-accent transition-colors">{customer.phone}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            
            {customer.address && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-info" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Indirizzo</p>
                  <p className="text-sm font-medium">{customer.address}</p>
                </div>
              </div>
            )}
            
            {customer.notes && (
              <div className="pt-3 mt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Note</p>
                <p className="text-sm text-foreground/80 bg-muted/30 rounded-lg p-2.5">{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Devices */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base">Dispositivi</CardTitle>
              <Badge variant="secondary" className="text-xs">{devices.length} totali</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {devices.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Smartphone className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Nessun dispositivo registrato</p>
              </div>
            ) : (
              <div className="space-y-2">
                {devices.map((device) => (
                  <div 
                    key={device.id} 
                    className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    {device.photo_url ? (
                      <img
                        src={device.photo_url}
                        alt={`${device.brand} ${device.model}`}
                        className="h-12 w-12 object-contain rounded-lg border bg-background"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                        }}
                      />
                    ) : (
                      <div className="h-12 w-12 flex items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground">
                        {getDeviceIcon(device.device_type)}
                      </div>
                    )}
                    <div className="fallback-icon hidden h-12 w-12 flex items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground">
                      {getDeviceIcon(device.device_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{device.brand} {device.model}</p>
                      <p className="text-xs text-muted-foreground capitalize">{device.device_type}</p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {device.repairs.length} rip.
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Repairs History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base">Storico Riparazioni</CardTitle>
            <Badge variant="secondary" className="text-xs">{allRepairs.length} totali</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {allRepairs.length === 0 ? (
            <div className="text-center py-8">
              <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nessuna riparazione registrata</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allRepairs
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((repair) => {
                  const device = devices.find(d => d.repairs.some(r => r.id === repair.id));
                  return (
                    <div
                      key={repair.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors group"
                      onClick={() => navigate(`/repairs/${repair.id}`)}
                    >
                      {/* Device Image/Icon */}
                      <div className="flex-shrink-0">
                        {device?.photo_url ? (
                          <img
                            src={device.photo_url}
                            alt={`${device.brand} ${device.model}`}
                            className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded-lg border bg-background"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`${device?.photo_url ? 'hidden' : ''} h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground`}>
                          {device ? getDeviceIcon(device.device_type) : <Smartphone className="h-5 w-5" />}
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {device ? `${device.brand} ${device.model}` : "Dispositivo"}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(repair.created_at), "dd/MM/yy", { locale: it })}
                              </span>
                              {repair.completed_at && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {Math.ceil((new Date(repair.completed_at).getTime() - new Date(repair.created_at).getTime()) / (1000 * 60 * 60 * 24))}gg
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            {getStatusBadge(repair.status)}
                            {repair.final_cost && (
                              <span className="text-sm font-semibold text-accent flex items-center gap-0.5">
                                <Euro className="h-3 w-3" />
                                {repair.final_cost.toFixed(0)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {repair.diagnosis && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-1.5">{repair.diagnosis}</p>
                        )}
                      </div>
                      
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  );
                })}
            </div>
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
