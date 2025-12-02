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

interface RepairDetail {
  id: string;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  delivered_at: string | null;
  estimated_cost: number | null;
  final_cost: number | null;
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
      // Trova il cliente tramite email
      const { data: customerData } = await supabase
        .from("customers")
        .select("id")
        .eq("email", user?.email)
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
            spare_parts (
              name,
              image_url
            )
          )
        `)
        .eq("id", id)
        .in("device_id", deviceIds)
        .single();

      if (error) throw error;

      if (!repairData) {
        toast.error("Riparazione non trovata");
        navigate("/customer-dashboard");
        return;
      }

      setRepair(repairData as any);
    } catch (error: any) {
      console.error(error);
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
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">TechRepair</span>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/customer-dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>

            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline">{user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Il Mio Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/customer-dashboard")}>
                  <User className="mr-2 h-4 w-4" />
                  Dashboard
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
      <main className="max-w-7xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header Section */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Dettaglio Riparazione
              </h1>
              <p className="text-muted-foreground">
                {repair.device.brand} {repair.device.model}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${statusInfo.bgColor}`}>
                {statusInfo.icon}
                <span className={`font-semibold ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
              <Badge variant={priorityInfo.variant}>
                Priorità: {priorityInfo.label}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Device & Timeline */}
            <div className="lg:col-span-2 space-y-6">
              {/* Device Info */}
              <Card className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
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
              <Card className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Timeline Riparazione
                </h2>
                <div className="space-y-6">
                  {/* Created */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      {(repair.started_at || repair.completed_at || repair.delivered_at) && (
                        <div className="w-0.5 h-full bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <p className="font-semibold text-foreground">Riparazione Creata</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(repair.created_at), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                      </p>
                    </div>
                  </div>

                  {/* Started */}
                  {repair.started_at && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Wrench className="h-5 w-5 text-primary" />
                        </div>
                        {(repair.completed_at || repair.delivered_at) && (
                          <div className="w-0.5 h-full bg-border mt-2" />
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

                  {/* Completed */}
                  {repair.completed_at && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        </div>
                        {repair.delivered_at && (
                          <div className="w-0.5 h-full bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <p className="font-semibold text-foreground">Riparazione Completata</p>
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
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-primary" />
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
              {repair.repair_parts && repair.repair_parts.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Ricambi Utilizzati
                  </h2>
                  <div className="space-y-3">
                    {repair.repair_parts.map((part, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                        {part.spare_parts.image_url ? (
                          <img 
                            src={part.spare_parts.image_url} 
                            alt={part.spare_parts.name}
                            className="h-12 w-12 object-contain rounded border bg-background"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{part.spare_parts.name}</p>
                          <p className="text-sm text-muted-foreground">Quantità: {part.quantity}</p>
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
              <Card className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Costi</h2>
                <div className="space-y-4">
                  {repair.estimated_cost !== null && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Costo Stimato</p>
                      <p className="text-2xl font-bold text-primary">
                        €{repair.estimated_cost.toFixed(2)}
                      </p>
                    </div>
                  )}
                  {repair.final_cost !== null && (
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground mb-1">Costo Finale</p>
                      <p className="text-3xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                        €{repair.final_cost.toFixed(2)}
                      </p>
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
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <FileSignature className="h-5 w-5 text-primary" />
                      Firma
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSignatureDialogOpen(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Modifica
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
                <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/30">
                  <div className="text-center space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Costo Finale da Accettare</p>
                      <p className="text-4xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
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
