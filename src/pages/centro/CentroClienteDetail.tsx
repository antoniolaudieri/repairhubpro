import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Mail, Phone, MapPin, Edit, Smartphone, FileText, 
  Calendar, User, Laptop, Tablet, Monitor, Gamepad2, Watch, HelpCircle,
  ChevronRight, Clock, Euro, ShoppingCart, Package, UserPlus, UserX, Loader2, KeyRound, Check, CreditCard,
  Shield, Send
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CustomerStats } from "@/components/customers/CustomerStats";
import { CustomerCharts } from "@/components/customers/CustomerCharts";
import { CustomerDialog } from "@/components/customers/CustomerDialog";
import { QuoteDialog } from "@/components/quotes/QuoteDialog";
import { OrderSparePartDialog } from "@/components/customers/OrderSparePartDialog";
import { OrderDetailDialog } from "@/components/customers/OrderDetailDialog";
import { CustomerDeviceInterests } from "@/components/centro/CustomerDeviceInterests";
import { CustomerCommunications } from "@/components/centro/CustomerCommunications";
import { PredictiveMaintenanceCard } from "@/components/centro/PredictiveMaintenanceCard";
import { LoyaltyCardProposal } from "@/components/loyalty/LoyaltyCardProposal";
import { LoyaltyStatusBanner } from "@/components/loyalty/LoyaltyStatusBanner";
import { LoyaltyCardDetail } from "@/components/loyalty/LoyaltyCardDetail";
import { useLoyaltyCard } from "@/hooks/useLoyaltyCard";
import { CustomerIntelligenceCard } from "@/components/customers/CustomerIntelligenceCard";
import { CustomerDeviceHealth } from "@/components/centro/CustomerDeviceHealth";
import { CustomerVisitTracker } from "@/components/customers/CustomerVisitTracker";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
    estimated_cost: number | null;
    acconto: number | null;
    created_at: string;
    completed_at: string | null;
  }>;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number | null;
  created_at: string;
  supplier: string;
}

interface RepairRequest {
  id: string;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  issue_description: string;
  status: string;
  estimated_cost: number | null;
  created_at: string;
  corner?: { business_name: string } | null;
}

interface ForensicReport {
  id: string;
  report_number: string;
  purpose: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  device_brand: string | null;
  device_model: string | null;
}

const deviceIcons: Record<string, React.ReactNode> = {
  smartphone: <Smartphone className="h-5 w-5" />,
  tablet: <Tablet className="h-5 w-5" />,
  laptop: <Laptop className="h-5 w-5" />,
  desktop: <Monitor className="h-5 w-5" />,
  console: <Gamepad2 className="h-5 w-5" />,
  smartwatch: <Watch className="h-5 w-5" />,
};

export default function CentroClienteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [forensicReports, setForensicReports] = useState<ForensicReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [centroId, setCentroId] = useState<string | null>(null);

  // Loyalty card hook
  const { benefits: loyaltyBenefits, refresh: refreshLoyalty } = useLoyaltyCard(id || null, centroId);

  // Fetch centro ID on mount
  useEffect(() => {
    const fetchCentroId = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("centri_assistenza")
        .select("id")
        .eq("owner_user_id", user.id)
        .single();
      if (data) setCentroId(data.id);
    };
    fetchCentroId();
  }, [user]);

  const checkCustomerAccount = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("check-customer-account", {
        body: { email },
      });

      if (error) {
        console.error("Error checking account:", error);
        setHasAccount(null);
        return;
      }

      setHasAccount(data?.exists ?? false);
    } catch (err) {
      console.error("Error:", err);
      setHasAccount(null);
    }
  };

  const createCustomerAccount = async () => {
    if (!customer?.email) {
      toast.error("Il cliente deve avere un'email per creare un account");
      return;
    }

    setAccountLoading(true);
    try {
      // Fetch centro name
      let centroName = "LabLinkRiparo";
      let centroId = "";
      if (user?.id) {
        const { data: centroData } = await supabase
          .from("centri_assistenza")
          .select("id, business_name")
          .eq("owner_user_id", user.id)
          .single();
        if (centroData) {
          centroId = centroData.id;
          centroName = centroData.business_name || centroName;
        }
      }

      const { data, error } = await supabase.functions.invoke("create-customer-account", {
        body: {
          email: customer.email,
          fullName: customer.name,
          phone: customer.phone,
          centroId,
          centroName,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Account creato e email inviata!", {
        description: `L'utente può accedere con ${customer.email}`,
        duration: 10000,
      });
      setHasAccount(true);
    } catch (error: any) {
      if (error.message?.includes("already been registered")) {
        toast.info("L'account esiste già per questa email");
        setHasAccount(true);
      } else {
        toast.error(error.message || "Errore nella creazione dell'account");
      }
    } finally {
      setAccountLoading(false);
    }
  };

  const deleteCustomerAccount = async () => {
    if (!customer?.email) {
      toast.error("Il cliente non ha un'email associata");
      return;
    }

    setAccountLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-customer-account", {
        body: { email: customer.email },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Account eliminato con successo");
      setHasAccount(false);
    } catch (error: any) {
      if (error.message?.includes("not found")) {
        toast.info("Nessun account trovato per questa email");
        setHasAccount(false);
      } else {
        toast.error(error.message || "Errore nell'eliminazione dell'account");
      }
    } finally {
      setAccountLoading(false);
    }
  };

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
            estimated_cost,
            acconto,
            created_at,
            completed_at
          )
        `)
        .eq("customer_id", id);

      if (devicesError) throw devicesError;
      setDevices(devicesData || []);

      // Load repair_requests (segnalazioni from Corner)
      const { data: repairRequestsData, error: repairRequestsError } = await supabase
        .from("repair_requests")
        .select(`
          id,
          device_type,
          device_brand,
          device_model,
          issue_description,
          status,
          estimated_cost,
          created_at,
          corner:corners(business_name)
        `)
        .eq("customer_id", id)
        .order("created_at", { ascending: false });

      if (repairRequestsError) throw repairRequestsError;
      setRepairRequests(repairRequestsData || []);

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, order_number, status, total_amount, created_at, supplier")
        .eq("customer_id", id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // Load forensic reports
      const { data: forensicData, error: forensicError } = await supabase
        .from("forensic_reports")
        .select("id, report_number, purpose, status, created_at, sent_at, device_brand, device_model")
        .eq("customer_id", id)
        .order("created_at", { ascending: false });

      if (forensicError) throw forensicError;
      setForensicReports(forensicData || []);
    } catch (error: any) {
      toast.error(error.message || "Errore nel caricamento dei dati");
      navigate("/centro/clienti");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  useEffect(() => {
    if (customer?.email) {
      checkCustomerAccount(customer.email);
    }
  }, [customer?.email]);

  if (loading) {
    return (
      <CentroLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </CentroLayout>
    );
  }

  if (!customer) return null;

  const allRepairs = devices.flatMap(d => d.repairs);
  const completedRepairs = allRepairs.filter(r => r.status === "completed" || r.status === "delivered");
  const pendingRepairs = allRepairs.filter(r => r.status === "pending").length;
  const inProgressRepairs = allRepairs.filter(r => r.status === "in-progress").length;
  
  // Include repair_requests (segnalazioni Corner) in totals
  const completedRequests = repairRequests.filter(r => r.status === "repair_completed" || r.status === "delivered");
  const totalRepairsCount = allRepairs.length + repairRequests.length;
  const totalCompletedCount = completedRepairs.length + completedRequests.length;
  
  // Calcola spesa totale usando final_cost o estimated_cost come fallback
  const repairsSpent = allRepairs.reduce((sum, r) => sum + (r.final_cost || r.estimated_cost || 0), 0);
  const requestsSpent = repairRequests.reduce((sum, r) => sum + (r.estimated_cost || 0), 0);
  const totalSpent = repairsSpent + requestsSpent;
  
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
  const completionRate = totalRepairsCount > 0
    ? Math.round((totalCompletedCount / totalRepairsCount) * 100)
    : 0;
  
  const allDates = [
    ...allRepairs.map(r => r.created_at),
    ...repairRequests.map(r => r.created_at)
  ];
  const lastRepairDate = allDates.length > 0 
    ? allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }
    }
  };

  return (
    <CentroLayout>
      <PageTransition>
        <motion.div 
          className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-7xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/centro/clienti")} 
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold truncate">{customer.name}</h1>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Dal {format(new Date(customer.created_at), "dd MMM yy", { locale: it })}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setQuoteOpen(true)} size="sm" className="flex-1 sm:flex-none h-8 text-xs">
                <FileText className="h-3.5 w-3.5 mr-1" />
                Preventivo
              </Button>
              <OrderSparePartDialog
                customerId={id!}
                customerName={customer.name}
                onOrderCreated={loadCustomerData}
                trigger={
                  <Button variant="secondary" size="sm" className="flex-1 sm:flex-none h-8 text-xs">
                    <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                    Ordina
                  </Button>
                }
              />
              <Button onClick={() => setEditOpen(true)} variant="outline" size="sm" className="flex-1 sm:flex-none h-8 text-xs">
                <Edit className="h-3.5 w-3.5 mr-1" />
                Modifica
              </Button>
              {centroId && (
                <LoyaltyCardProposal
                  customerId={id!}
                  centroId={centroId}
                  customerEmail={customer.email || undefined}
                  customerName={customer.name}
                  onSuccess={refreshLoyalty}
                />
              )}
            </div>
          </motion.div>

          {/* Loyalty Card Detail */}
          {loyaltyBenefits.hasActiveCard && loyaltyBenefits.card && (
            <motion.div variants={itemVariants}>
              <LoyaltyCardDetail 
                card={loyaltyBenefits.card}
                devices={devices.map(d => ({ id: d.id, device_type: d.device_type, brand: d.brand, model: d.model }))}
                onRefresh={refreshLoyalty}
              />
            </motion.div>
          )}

          {/* Customer Intelligence */}
          {centroId && (
            <motion.div variants={itemVariants}>
              <div className="grid gap-4 lg:grid-cols-2">
                <CustomerIntelligenceCard 
                  customerId={id!} 
                  centroId={centroId}
                  totalSpent={totalSpent}
                  repairCount={totalRepairsCount}
                  lastVisitDate={lastRepairDate}
                  hasLoyaltyCard={loyaltyBenefits.hasActiveCard}
                />
                <CustomerVisitTracker 
                  customerId={id!} 
                  centroId={centroId}
                  customerName={customer.name}
                />
              </div>
            </motion.div>
          )}

          {/* Device Health */}
          {centroId && (
            <motion.div variants={itemVariants}>
              <CustomerDeviceHealth 
                customerId={id!} 
                centroId={centroId} 
                onDeviceCreated={loadCustomerData}
              />
            </motion.div>
          )}

          {/* Stats */}
          <motion.div variants={itemVariants}>
            <CustomerStats
              totalRepairs={totalRepairsCount}
              totalSpent={totalSpent}
              avgRepairTime={avgRepairTime}
              completionRate={completionRate}
              pendingRepairs={pendingRepairs}
              inProgressRepairs={inProgressRepairs}
              lastRepairDate={lastRepairDate}
            />
          </motion.div>

          {/* Charts */}
          <motion.div variants={itemVariants}>
            <CustomerCharts devices={devices} allRepairs={allRepairs} />
          </motion.div>

          {/* Predictive Maintenance AI */}
          {centroId && (
            <motion.div variants={itemVariants}>
              <PredictiveMaintenanceCard
                customerId={id!}
                centroId={centroId}
                devices={devices.map(d => ({ id: d.id, device_type: d.device_type, brand: d.brand, model: d.model }))}
                customerPhone={customer?.phone}
              />
            </motion.div>
          )}

          {/* Communications Timeline */}
          {centroId && (
            <motion.div variants={itemVariants}>
              <CustomerCommunications
                customerId={id!}
                centroId={centroId}
                customerEmail={customer.email}
              />
            </motion.div>
          )}

          {/* Device Interests */}
          <motion.div variants={itemVariants}>
            <CustomerDeviceInterests 
              customerId={id!} 
              customerEmail={customer.email} 
            />
          </motion.div>

          {/* Contact & Devices Grid */}
          <motion.div variants={itemVariants} className="grid gap-4 lg:grid-cols-2">
            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Contatti</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {customer.email && (
                  <a 
                    href={`mailto:${customer.email}`}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{customer.email}</p>
                    </div>
                  </a>
                )}
                
                <a 
                  href={`tel:${customer.phone}`}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Phone className="h-3.5 w-3.5 text-accent" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Telefono</p>
                    <p className="text-sm font-medium">{customer.phone}</p>
                  </div>
                </a>
                
                {customer.address && (
                  <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/20">
                    <div className="h-7 w-7 rounded-lg bg-info/10 flex items-center justify-center">
                      <MapPin className="h-3.5 w-3.5 text-info" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Indirizzo</p>
                      <p className="text-sm font-medium">{customer.address}</p>
                    </div>
                  </div>
                )}
                
                {customer.notes && (
                  <div className="pt-2 mt-1 border-t">
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">Note</p>
                    <p className="text-xs text-foreground/80 bg-muted/20 rounded-lg p-2">{customer.notes}</p>
                  </div>
                )}

                {/* Account Management Section */}
                <div className="pt-3 mt-2 border-t">
                  <p className="text-[10px] font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <KeyRound className="h-3 w-3" />
                    Accesso WebApp
                  </p>
                  
                  {!customer.email ? (
                    <p className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-2">
                      Aggiungi un'email per creare un account
                    </p>
                  ) : hasAccount === null ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Verifica account...
                    </div>
                  ) : hasAccount === false ? (
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={createCustomerAccount}
                        disabled={accountLoading}
                        className="h-8 text-xs"
                      >
                        {accountLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <UserPlus className="h-3 w-3 mr-1" />
                        )}
                        Crea Account
                      </Button>
                      <p className="text-[10px] text-muted-foreground">Nessun account attivo</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs text-accent bg-accent/10 rounded-lg px-3 py-2">
                        <Check className="h-3.5 w-3.5" />
                        Account attivo
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={accountLoading}
                            className="h-7 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {accountLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <UserX className="h-3 w-3 mr-1" />
                            )}
                            Elimina Account
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminare l'account?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Questa azione eliminerà definitivamente l'account utente associato a <strong>{customer.email}</strong>. 
                              Il cliente non potrà più accedere alla webapp. I dati del cliente (anagrafica, riparazioni, ordini) rimarranno nel sistema.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction onClick={deleteCustomerAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Elimina Account
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Devices */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Dispositivi</CardTitle>
                  <Badge variant="secondary" className="text-xs">{devices.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {devices.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center mx-auto mb-2">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">Nessun dispositivo</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {devices.map((device) => (
                      <div 
                        key={device.id} 
                        className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/30 transition-colors"
                      >
                        {device.photo_url ? (
                          <img
                            src={device.photo_url}
                            alt={`${device.brand} ${device.model}`}
                            className="h-10 w-10 object-contain rounded-lg border bg-background"
                          />
                        ) : (
                          <div className="h-10 w-10 flex items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground">
                            {getDeviceIcon(device.device_type)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{device.brand} {device.model}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{device.device_type}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {device.repairs.length}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Repair Requests from Corner (Segnalazioni) */}
          {repairRequests.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Segnalazioni Corner
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">{repairRequests.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {repairRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center gap-2 p-2.5 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => navigate(`/centro/lavori-corner`)}
                      >
                        <div className="h-10 w-10 flex items-center justify-center rounded-lg border bg-primary/5 text-primary">
                          {getDeviceIcon(req.device_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {req.device_brand || 'N/D'} {req.device_model || ''}
                          </p>
                          <p className="text-[10px] text-muted-foreground capitalize">
                            {req.device_type} • {req.issue_description?.substring(0, 30)}...
                          </p>
                          {req.corner && (
                            <p className="text-[10px] text-primary">via {req.corner.business_name}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {req.status.replace(/_/g, ' ')}
                          </Badge>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {format(new Date(req.created_at), "dd MMM", { locale: it })}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Repairs History */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Storico Riparazioni</CardTitle>
                  <Badge variant="secondary" className="text-xs">{allRepairs.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {allRepairs.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center mx-auto mb-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">Nessuna riparazione</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {allRepairs
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((repair) => {
                        const device = devices.find(d => d.repairs.some(r => r.id === repair.id));
                        return (
                          <div
                            key={repair.id}
                            className="flex items-center gap-2 p-2.5 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => navigate(`/centro/lavori/${repair.id}`)}
                          >
                            <div className="h-10 w-10 flex items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground">
                              {device ? getDeviceIcon(device.device_type) : <Smartphone className="h-4 w-4" />}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {device ? `${device.brand} ${device.model}` : "Dispositivo"}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <Calendar className="h-2.5 w-2.5" />
                                  {format(new Date(repair.created_at), "dd/MM", { locale: it })}
                                </span>
                                {repair.completed_at && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                    <Clock className="h-2.5 w-2.5" />
                                    {Math.ceil((new Date(repair.completed_at).getTime() - new Date(repair.created_at).getTime()) / (1000 * 60 * 60 * 24))}gg
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-0.5">
                              {getStatusBadge(repair.status)}
                              {repair.final_cost && (
                                <span className="text-sm font-semibold text-accent">
                                  €{repair.final_cost.toFixed(0)}
                                </span>
                              )}
                            </div>
                            
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Orders History */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Ordini Ricambi</CardTitle>
                  <Badge variant="secondary" className="text-xs">{orders.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center mx-auto mb-2">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">Nessun ordine</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {orders.map((order) => {
                      const statusConfig: Record<string, { label: string; className: string }> = {
                        draft: { label: "Bozza", className: "bg-muted text-muted-foreground" },
                        pending: { label: "In Attesa", className: "bg-warning/10 text-warning border-warning/20" },
                        ordered: { label: "Ordinato", className: "bg-primary/10 text-primary border-primary/20" },
                        received: { label: "Ricevuto", className: "bg-accent/10 text-accent border-accent/20" },
                      };
                      const { label, className } = statusConfig[order.status] || { label: order.status, className: "" };
                      
                      return (
                        <div
                          key={order.id}
                          className="flex items-center gap-2 p-2.5 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          <div className="h-10 w-10 flex items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground">
                            <Package className="h-4 w-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{order.order_number}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(order.created_at), "dd MMM yy", { locale: it })}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[10px] ${className}`}>
                              {label}
                            </Badge>
                            {order.total_amount && (
                              <span className="text-xs font-semibold text-accent">
                                €{order.total_amount.toFixed(0)}
                              </span>
                            )}
                          </div>
                          
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Forensic Reports */}
          {forensicReports.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Perizie Forensi
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">{forensicReports.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {forensicReports.map((report) => {
                      const statusConfig: Record<string, { label: string; className: string }> = {
                        draft: { label: "Bozza", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
                        finalized: { label: "Finalizzata", className: "bg-primary/10 text-primary border-primary/20" },
                        sent: { label: "Inviata", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
                      };
                      const { label, className } = statusConfig[report.status] || { label: report.status, className: "" };
                      
                      return (
                        <div
                          key={report.id}
                          className="flex items-center gap-2 p-2.5 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => navigate(`/centro/perizie/${report.id}`)}
                        >
                          <div className="h-10 w-10 flex items-center justify-center rounded-lg border bg-blue-500/10 text-blue-600">
                            <Shield className="h-4 w-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate font-mono">{report.report_number}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {report.device_brand} {report.device_model} • {report.purpose}
                            </p>
                            {report.sent_at && (
                              <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                                <Send className="h-2.5 w-2.5" />
                                Inviata {format(new Date(report.sent_at), "dd MMM yy", { locale: it })}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex flex-col items-end gap-0.5">
                            <Badge variant="outline" className={`text-[10px] ${className}`}>
                              {label}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(report.created_at), "dd MMM yy", { locale: it })}
                            </p>
                          </div>
                          
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

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

          <OrderDetailDialog
            open={!!selectedOrderId}
            onOpenChange={(open) => !open && setSelectedOrderId(null)}
            orderId={selectedOrderId}
            onOrderUpdated={loadCustomerData}
          />
        </motion.div>
      </PageTransition>
    </CentroLayout>
  );
}
