import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Wrench,
  Clock,
  CheckCircle2,
  User,
  LogOut,
  Home,
  ArrowLeft,
  FileSignature,
  Package,
  TruckIcon,
  AlertCircle,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { FinalCostSignatureDialog } from "@/components/customer/FinalCostSignatureDialog";

interface OrderInfo {
  id: string;
  status: string;
  ordered_at: string | null;
  received_at: string | null;
  tracking_number: string | null;
}

interface RepairDetail {
  id: string;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  delivered_at: string | null;
  forfeited_at: string | null;
  forfeiture_warning_sent_at: string | null;
  estimated_cost: number | null;
  final_cost: number | null;
  acconto: number | null;
  final_cost_signature: string | null;
  final_cost_accepted_at: string | null;
  diagnosis: string | null;
  repair_notes: string | null;
  priority: string;
  device: {
    brand: string;
    model: string;
    device_type: string;
    reported_issue: string;
    initial_condition: string | null;
    imei: string | null;
    serial_number: string | null;
    photo_url: string | null;
  };
  repair_parts?: {
    quantity: number;
    spare_parts: {
      name: string;
      image_url: string | null;
    };
  }[];
  orders?: OrderInfo[];
}

export default function CustomerRepairDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [repair, setRepair] = useState<RepairDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);

  useEffect(() => {
    if (user && id) {
      fetchRepairDetail();
    }
  }, [user, id]);

  const fetchRepairDetail = async () => {
    try {
      // Trova il cliente tramite email (case-insensitive)
      const { data: customerData } = await supabase
        .from("customers")
        .select("id")
        .ilike("email", user?.email || '')
        .maybeSingle();

      if (!customerData) {
        toast.error("Cliente non trovato");
        navigate("/customer-dashboard");
        return;
      }

      // Trova i dispositivi del cliente
      const { data: devices } = await supabase
        .from("devices")
        .select("id")
        .eq("customer_id", customerData.id);

      if (!devices || devices.length === 0) {
        toast.error("Nessun dispositivo trovato");
        navigate("/customer-dashboard");
        return;
      }

      const deviceIds = devices.map((d) => d.id);

      // Trova la riparazione specifica
      const { data: repairData, error } = await supabase
        .from("repairs")
        .select(`
          *,
          device:devices (
            brand,
            model,
            device_type,
            reported_issue,
            initial_condition,
            imei,
            serial_number,
            photo_url
          ),
          repair_parts (
            quantity,
            spare_parts:spare_part_id (
              name,
              image_url
            )
          ),
          orders (
            id,
            status,
            ordered_at,
            received_at,
            tracking_number
          )
        `)
        .eq("id", id)
        .in("device_id", deviceIds)
        .single();

      if (error) {
        console.error("Error fetching repair:", error);
        throw error;
      }

      if (!repairData) {
        toast.error("Riparazione non trovata");
        navigate("/customer-dashboard");
        return;
      }

      setRepair(repairData as any);
    } catch (error: any) {
      console.error("Fetch repair detail error:", error);
      toast.error("Errore nel caricamento della riparazione");
      navigate("/customer-dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

const getStatusInfo = (status: string) => {
    const config: Record<
      string,
      { label: string; icon: JSX.Element; color: string; bgColor: string }
    > = {
      pending: {
        label: "In Attesa",
        icon: <Clock className="h-5 w-5" />,
        color: "text-warning",
        bgColor: "bg-warning/10",
      },
      waiting_parts: {
        label: "In Attesa Ricambi",
        icon: <Package className="h-5 w-5" />,
        color: "text-info",
        bgColor: "bg-info/10",
      },
      in_progress: {
        label: "In Corso",
        icon: <Wrench className="h-5 w-5" />,
        color: "text-primary",
        bgColor: "bg-primary/10",
      },
      completed: {
        label: "Completata",
        icon: <CheckCircle2 className="h-5 w-5" />,
        color: "text-success",
        bgColor: "bg-success/10",
      },
      delivered: {
        label: "Consegnata",
        icon: <TruckIcon className="h-5 w-5" />,
        color: "text-accent",
        bgColor: "bg-accent/10",
      },
      cancelled: {
        label: "Annullata",
        icon: <AlertCircle className="h-5 w-5" />,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
      },
      forfeited: {
        label: "Alienato",
        icon: <AlertCircle className="h-5 w-5" />,
        color: "text-rose-900",
        bgColor: "bg-rose-900/10",
      },
    };
    return config[status] || config.pending;
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { label: string; variant: any }> = {
      low: { label: "Bassa", variant: "secondary" },
      normal: { label: "Normale", variant: "default" },
      high: { label: "Alta", variant: "destructive" },
    };
    return config[priority] || config.normal;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento dettagli riparazione...</p>
        </div>
      </div>
    );
  }

  if (!repair) {
    return null;
  }

  const statusInfo = getStatusInfo(repair.status);
  const priorityInfo = getPriorityBadge(repair.priority);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-primary rounded-lg">
              <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg sm:text-xl text-foreground">LabLinkRiparo</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/customer-dashboard")} className="px-2 sm:px-3">
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>

            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="hidden sm:flex">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-2">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm">{user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Il Mio Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/customer-dashboard")}>
                  <User className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/")} className="sm:hidden">
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Esci
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 sm:space-y-8"
        >
          {/* Forfeiture Countdown Banner */}
          {repair.status === "completed" && !repair.delivered_at && repair.completed_at && (
            (() => {
              const completedAt = new Date(repair.completed_at);
              const now = new Date();
              const daysSinceCompletion = Math.floor((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24));
              const daysLeft = 30 - daysSinceCompletion;
              
              if (daysLeft > 0) {
                const isUrgent = daysLeft <= 7;
                const isCritical = daysLeft <= 3;
                return (
                  <div className={`p-3 sm:p-4 rounded-lg mb-6 ${
                    isCritical 
                      ? 'bg-red-500/20 border border-red-500/50' 
                      : isUrgent 
                        ? 'bg-rose-500/10 border border-rose-500/30'
                        : 'bg-amber-500/10 border border-amber-500/30'
                  }`}>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <Clock className={`h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 mt-0.5 ${
                        isCritical ? 'text-red-600' : isUrgent ? 'text-rose-600' : 'text-amber-600'
                      }`} />
                      <div className="space-y-1.5 sm:space-y-2">
                        <p className={`font-bold text-sm sm:text-base ${
                          isCritical ? 'text-red-700' : isUrgent ? 'text-rose-700' : 'text-amber-700'
                        }`}>
                          {isCritical ? '⚠️ ' : ''}{daysLeft} giorni rimanenti per il ritiro
                        </p>
                        <p className={`text-sm ${
                          isCritical ? 'text-red-600' : isUrgent ? 'text-rose-600' : 'text-amber-600'
                        }`}>
                          {isUrgent 
                            ? `Il dispositivo deve essere ritirato entro ${daysLeft} giorni o verrà considerato abbandonato e diventerà proprietà del laboratorio.`
                            : `Ricorda di ritirare il dispositivo. Hai ancora ${daysLeft} giorni.`
                          }
                        </p>
                        <div className={`text-xs pt-2 border-t ${
                          isCritical ? 'border-red-300 text-red-600/80' : isUrgent ? 'border-rose-300 text-rose-600/80' : 'border-amber-300 text-amber-600/80'
                        }`}>
                          <p className="font-semibold">📋 Art. 2756 c.c. - Diritto di Ritenzione</p>
                          <p className="mt-1">
                            Questa clausola è stata accettata e firmata digitalmente al momento della consegna 
                            del dispositivo. La firma costituisce prova dell'accettazione dei termini contrattuali.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()
          )}

          {/* Forfeited Banner */}
          {repair.status === "forfeited" && (
            <div className="p-3 sm:p-4 rounded-lg bg-rose-900/10 border border-rose-900/30 mb-6">
              <div className="flex items-start gap-2 sm:gap-3">
                <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-rose-900 flex-shrink-0" />
                <div>
                  <p className="font-bold text-rose-900 text-sm sm:text-base">Dispositivo Alienato</p>
                  <p className="text-xs sm:text-sm text-rose-700">
                    Il dispositivo non è stato ritirato entro 30 giorni dalla comunicazione di completamento 
                    ed è diventato proprietà del laboratorio come da clausola firmata.
                  </p>
                  {repair.forfeited_at && (
                    <p className="text-xs text-rose-600 mt-1">
                      Data alienazione: {format(new Date(repair.forfeited_at), "dd MMMM yyyy", { locale: it })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Dettaglio Riparazione
              </h1>
              <p className="text-muted-foreground">
                {repair.device.brand} {repair.device.model}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg ${statusInfo.bgColor}`}>
                {statusInfo.icon}
                <span className={`font-semibold text-sm sm:text-base ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
              {/* Forfeiture countdown badge */}
              {repair.status === "completed" && !repair.delivered_at && repair.completed_at && (() => {
                const completedAt = new Date(repair.completed_at);
                const now = new Date();
                const daysSinceCompletion = Math.floor((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24));
                const daysLeft = 30 - daysSinceCompletion;
                if (daysLeft > 0) {
                  const isUrgent = daysLeft <= 7;
                  const isCritical = daysLeft <= 3;
                  return (
                    <Badge className={`gap-1 ${
                      isCritical 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : isUrgent 
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-amber-500 text-white'
                    }`}>
                      <Clock className="h-3 w-3" />
                      {isCritical ? '⚠️ ' : ''}{daysLeft}g al ritiro
                    </Badge>
                  );
                }
                return null;
              })()}
              <Badge variant={priorityInfo.variant}>
                Priorità: {priorityInfo.label}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Device & Timeline */}
            <div className="lg:col-span-2 space-y-6">
              {/* Device Info */}
              <Card className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Informazioni Dispositivo
                </h2>
                <div className="space-y-4">
                  {repair.device.photo_url && (
                    <div className="w-full h-48 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                      <img
                        src={repair.device.photo_url}
                        alt="Device"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo</p>
                      <p className="font-semibold text-foreground">{repair.device.device_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Marca</p>
                      <p className="font-semibold text-foreground">{repair.device.brand}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Modello</p>
                      <p className="font-semibold text-foreground">{repair.device.model}</p>
                    </div>
                    {repair.device.imei && (
                      <div>
                        <p className="text-sm text-muted-foreground">IMEI</p>
                        <p className="font-semibold text-foreground">{repair.device.imei}</p>
                      </div>
                    )}
                    {repair.device.serial_number && (
                      <div>
                        <p className="text-sm text-muted-foreground">Numero Seriale</p>
                        <p className="font-semibold text-foreground">{repair.device.serial_number}</p>
                      </div>
                    )}
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Problema Riportato</p>
                    <p className="text-foreground">{repair.device.reported_issue}</p>
                  </div>
                  {repair.device.initial_condition && (
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground mb-2">Condizioni Iniziali</p>
                      <p className="text-foreground">{repair.device.initial_condition}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Timeline */}
              <Card className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Timeline Riparazione
                </h2>
                <div className="space-y-6">
                  {/* Created */}
                  <div className="flex gap-3 sm:gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <div className="w-0.5 flex-1 bg-border mt-2" />
                    </div>
                    <div className="flex-1 pb-4 sm:pb-6">
                      <p className="font-semibold text-foreground text-sm sm:text-base">Riparazione Creata</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {format(new Date(repair.created_at), "dd MMM yyyy 'alle' HH:mm", { locale: it })}
                      </p>
                    </div>
                  </div>

                  {/* Waiting for Parts */}
                  {repair.status === "waiting_parts" && !repair.orders?.some(o => o.received_at) && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center animate-pulse">
                          <Package className="h-5 w-5 text-info" />
                        </div>
                        <div className="w-0.5 flex-1 bg-border mt-2" />
                      </div>
                      <div className="flex-1 pb-6">
                        <p className="font-semibold text-info">In Attesa Ricambi</p>
                        <p className="text-sm text-muted-foreground">
                          I ricambi sono stati ordinati e sono in arrivo
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Parts Ordered */}
                  {repair.orders?.filter(o => o.ordered_at).map((order) => (
                    <div key={`ordered-${order.id}`} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                          <Package className="h-5 w-5 text-warning" />
                        </div>
                        <div className="w-0.5 flex-1 bg-border mt-2" />
                      </div>
                      <div className="flex-1 pb-6">
                        <p className="font-semibold text-foreground">Ricambi Ordinati</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.ordered_at!), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                        </p>
                        {order.tracking_number && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Tracking: {order.tracking_number}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Parts Arrived */}
                  {repair.orders?.filter(o => o.received_at).map((order) => (
                    <div key={`received-${order.id}`} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                          <Package className="h-5 w-5 text-success" />
                        </div>
                        <div className="w-0.5 flex-1 bg-border mt-2" />
                      </div>
                      <div className="flex-1 pb-6">
                        <p className="font-semibold text-success">Ricambi Arrivati</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.received_at!), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Started */}
                  {repair.started_at && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Wrench className="h-5 w-5 text-primary" />
                        </div>
                        {(repair.completed_at || repair.delivered_at || repair.status === "cancelled") && (
                          <div className="w-0.5 flex-1 bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <p className="font-semibold text-foreground">Riparazione Iniziata</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(repair.started_at), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Cancelled */}
                  {repair.status === "cancelled" && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-destructive">Riparazione Annullata</p>
                        <p className="text-sm text-muted-foreground">
                          La riparazione è stata annullata
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Completed */}
                  {repair.completed_at && repair.status !== "cancelled" && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        </div>
                        {repair.delivered_at && (
                          <div className="w-0.5 flex-1 bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <p className="font-semibold text-success">Riparazione Completata</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(repair.completed_at), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Delivered */}
                  {repair.delivered_at && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                          <TruckIcon className="h-5 w-5 text-accent" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">Dispositivo Consegnato</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(repair.delivered_at), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Diagnosis & Notes */}
              {(repair.diagnosis || repair.repair_notes) && (
                <Card className="p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Diagnosi e Note
                  </h2>
                  <div className="space-y-4">
                    {repair.diagnosis && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Diagnosi</p>
                        <p className="text-foreground">{repair.diagnosis}</p>
                      </div>
                    )}
                    {repair.repair_notes && (
                      <div className="border-t pt-4">
                        <p className="text-sm text-muted-foreground mb-2">Note Tecniche</p>
                        <p className="text-foreground">{repair.repair_notes}</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Spare Parts Used */}
              {repair.repair_parts && Array.isArray(repair.repair_parts) && repair.repair_parts.length > 0 && (
                <Card className="p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Ricambi Utilizzati
                  </h2>
                  <div className="space-y-3">
                    {repair.repair_parts.map((part, index) => (
                      <div key={index} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/30 border border-border">
                        {part.spare_parts?.image_url ? (
                          <img 
                            src={part.spare_parts.image_url} 
                            alt={part.spare_parts.name}
                            className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded border bg-background"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded bg-muted flex items-center justify-center">
                            <Package className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm sm:text-base truncate">{part.spare_parts?.name || "Ricambio"}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">Quantità: {part.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column - Costs & Signature */}
            <div className="space-y-6">
              {/* Costs */}
              <Card className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">Costi</h2>
                <div className="space-y-3 sm:space-y-4">
                  {repair.estimated_cost !== null && (
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Costo Stimato</p>
                      <p className="text-xl sm:text-2xl font-bold text-primary">
                        €{repair.estimated_cost.toFixed(2)}
                      </p>
                    </div>
                  )}
                  {repair.acconto !== null && repair.acconto > 0 && (
                    <div className="border-t pt-3 sm:pt-4">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Acconto Versato</p>
                      <p className="text-lg sm:text-xl font-bold text-emerald-600">
                        €{repair.acconto.toFixed(2)}
                      </p>
                    </div>
                  )}
                  {repair.final_cost !== null && (
                    <div className="border-t pt-3 sm:pt-4">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Costo Finale</p>
                      <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                        €{repair.final_cost.toFixed(2)}
                      </p>
                      {repair.acconto !== null && repair.acconto > 0 && (
                        <div className="mt-2 p-2 rounded-lg bg-muted/50">
                          <p className="text-sm text-muted-foreground">
                            Saldo da pagare al ritiro: <span className="font-bold text-foreground">€{(repair.final_cost - repair.acconto).toFixed(2)}</span>
                          </p>
                        </div>
                      )}
                      {repair.final_cost_accepted_at && (
                        <Badge className="mt-2 bg-gradient-to-r from-primary to-accent text-white">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Accettato il {format(new Date(repair.final_cost_accepted_at), "dd/MM/yyyy", { locale: it })}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* Signature */}
              {repair.final_cost_signature && (
                <Card className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                      <FileSignature className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      Firma
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSignatureDialogOpen(true)}
                      className="px-2 sm:px-3"
                    >
                      <Edit className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Modifica</span>
                    </Button>
                  </div>
                  <Card className="p-4 bg-gradient-to-br from-background to-muted/20 border-2 border-primary/20">
                    <img
                      src={repair.final_cost_signature}
                      alt="Firma"
                      className="w-full h-32 object-contain bg-background rounded-lg"
                    />
                  </Card>
                  {repair.final_cost_accepted_at && (
                    <p className="text-xs text-muted-foreground text-center mt-3">
                      Firmato il {format(new Date(repair.final_cost_accepted_at), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                    </p>
                  )}
                </Card>
              )}

              {/* Accept Final Cost Button */}
              {repair.final_cost && !repair.final_cost_accepted_at && (
                <Card className="p-4 sm:p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/30">
                  <div className="text-center space-y-3 sm:space-y-4">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2">Costo Finale da Accettare</p>
                      <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                        €{repair.final_cost.toFixed(2)}
                      </p>
                    </div>
                    <Button
                      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                      onClick={() => setSignatureDialogOpen(true)}
                    >
                      <FileSignature className="h-4 w-4 mr-2" />
                      Accetta e Firma
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Signature Dialog */}
      {repair.final_cost && (
        <FinalCostSignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          repair={{
            id: repair.id,
            final_cost: repair.final_cost,
            device: {
              brand: repair.device.brand,
              model: repair.device.model,
              device_type: repair.device.device_type,
            },
          }}
          onSuccess={() => {
            fetchRepairDetail();
            toast.success("Firma aggiornata con successo!");
          }}
        />
      )}
    </div>
  );
}
