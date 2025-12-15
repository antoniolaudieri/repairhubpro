import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
  Package,
  FileText,
  PenTool,
  FileSignature,
  Building2,
  Store,
  Briefcase,
  CreditCard,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { SignatureDialog } from "@/components/quotes/SignatureDialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { FinalCostSignatureDialog } from "@/components/customer/FinalCostSignatureDialog";
import { NotificationBanner } from "@/components/customer/NotificationBanner";
import { InAppNotifications } from "@/components/customer/InAppNotifications";
import { UsedDevicesCarousel } from "@/components/usato/UsedDevicesCarousel";
import PromotionPreferences from "@/components/customer/PromotionPreferences";
import { PushNotificationSettings } from "@/components/notifications/PushNotificationSettings";
import { useCustomerLoyaltyCards } from "@/hooks/useLoyaltyCard";
import { LoyaltyCardDisplay } from "@/components/loyalty/LoyaltyCardDisplay";

interface Repair {
  id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  delivered_at: string | null;
  estimated_cost: number | null;
  final_cost: number | null;
  acconto: number | null;
  final_cost_signature: string | null;
  final_cost_accepted_at: string | null;
  diagnosis: string | null;
  device: {
    brand: string;
    model: string;
    device_type: string;
    reported_issue: string;
  };
}

interface Quote {
  id: string;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  issue_description: string;
  diagnosis: string | null;
  items: any;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  status: string;
  notes: string | null;
  valid_until: string | null;
  signed_at: string | null;
  created_at: string;
}

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { user, signOut, isCentroAdmin, isCentroTech } = useAuth();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [finalCostDialogOpen, setFinalCostDialogOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });

  // Loyalty cards for this customer
  const { cards: loyaltyCards, loading: loyaltyLoading } = useCustomerLoyaltyCards(user?.email || null);

  useEffect(() => {
    if (user) {
      fetchCustomerData();
    }
  }, [user]);

  const fetchCustomerData = async () => {
    try {
      // Trova TUTTI i record cliente con questa email (potrebbero essercene più di uno)
      const { data: customerRecords } = await supabase
        .from("customers")
        .select("id")
        .eq("email", user?.email);

      if (!customerRecords || customerRecords.length === 0) {
        setLoading(false);
        return;
      }

      const customerIds = customerRecords.map(c => c.id);

      // Carica preventivi da tutti i record cliente
      const { data: quotesData } = await supabase
        .from("quotes")
        .select("*")
        .in("customer_id", customerIds)
        .order("created_at", { ascending: false });

      setQuotes((quotesData as any) || []);

      // Trova i dispositivi da tutti i record cliente
      const { data: devices } = await supabase
        .from("devices")
        .select("id")
        .in("customer_id", customerIds);

      if (!devices || devices.length === 0) {
        setLoading(false);
        return;
      }

      const deviceIds = devices.map((d) => d.id);

      // Trova le riparazioni
      const { data: repairData } = await supabase
        .from("repairs")
        .select(`
          *,
          device:devices (
            brand,
            model,
            device_type,
            reported_issue
          )
        `)
        .in("device_id", deviceIds)
        .order("created_at", { ascending: false });

      if (repairData) {
        setRepairs(repairData);
        
        // Calcola statistiche
        const total = repairData.length;
        const pending = repairData.filter((r) => r.status === "pending").length;
        const inProgress = repairData.filter((r) => r.status === "in_progress").length;
        const completed = repairData.filter((r) => r.status === "completed").length;
        
        setStats({ total, pending, inProgress, completed });
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const getStatusBadge = (status: string) => {
    const config: Record<
      string,
      { label: string; icon: JSX.Element; color: string }
    > = {
      pending: {
        label: "In attesa",
        icon: <Clock className="h-4 w-4" />,
        color: "text-warning",
      },
      in_progress: {
        label: "In corso",
        icon: <Wrench className="h-4 w-4" />,
        color: "text-primary",
      },
      completed: {
        label: "Completata",
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: "text-success",
      },
      forfeited: {
        label: "Alienato",
        icon: <Clock className="h-4 w-4" />,
        color: "text-rose-900",
      },
    };
    return config[status] || config.pending;
  };

  const getDaysUntilForfeiture = (repair: Repair) => {
    if (repair.status !== "completed" || repair.delivered_at || !repair.completed_at) return null;
    const completedAt = new Date(repair.completed_at);
    const now = new Date();
    const daysSinceCompletion = Math.floor((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24));
    return 30 - daysSinceCompletion;
  };

  const getInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">LabLinkRiparo</span>
          </div>

        <div className="flex items-center gap-2 sm:gap-4">
            <InAppNotifications />
            
            {(isCentroAdmin || isCentroTech) && (
              <Button variant="default" size="sm" onClick={() => navigate("/centro")} className="px-2 sm:px-3">
                <Building2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Centro</span>
              </Button>
            )}
            
            <Button variant="ghost" size="sm" onClick={() => navigate("/signature-history")} className="hidden sm:flex">
              <FileSignature className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Storico Firme</span>
            </Button>

            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="hidden sm:flex">
              <Home className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Home</span>
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
                <DropdownMenuItem onClick={() => navigate("/signature-history")} className="sm:hidden">
                  <FileSignature className="mr-2 h-4 w-4" />
                  Storico Firme
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Welcome Section */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
              Benvenuto, {user?.email?.split("@")[0]}!
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gestisci le tue riparazioni e monitora lo stato dei tuoi dispositivi
            </p>
          </div>

          {/* Legal Notice Card */}
          <Card className="p-4 border-amber-500/30 bg-amber-500/5">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-semibold text-sm text-foreground">
                  Clausola di Alienazione (Art. 2756 c.c.)
                </h3>
                <p className="text-xs text-muted-foreground">
                  In conformità all'Art. 2756 del Codice Civile italiano, i dispositivi non ritirati 
                  entro <span className="font-semibold text-amber-700">30 giorni</span> dalla comunicazione 
                  di completamento della riparazione saranno considerati abbandonati e diventeranno 
                  proprietà del laboratorio.
                </p>
                <p className="text-xs text-muted-foreground">
                  Questa clausola è stata accettata e <span className="font-semibold">firmata digitalmente</span> al 
                  momento della consegna del dispositivo per la riparazione.
                </p>
              </div>
            </div>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-card to-muted/30 border-border/50 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Totale</p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.total}</p>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-muted/50 group-hover:bg-muted transition-colors">
                  <Package className="h-5 w-5 sm:h-8 sm:w-8 text-muted-foreground" />
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 bg-gradient-to-br from-card to-warning/5 border-warning/20 hover:shadow-lg hover:shadow-warning/10 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">In Attesa</p>
                  <p className="text-2xl sm:text-3xl font-bold text-warning">{stats.pending}</p>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-warning/10 group-hover:bg-warning/20 transition-colors">
                  <Clock className="h-5 w-5 sm:h-8 sm:w-8 text-warning" />
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 bg-gradient-to-br from-card to-primary/5 border-primary/20 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">In Corso</p>
                  <p className="text-2xl sm:text-3xl font-bold text-primary">{stats.inProgress}</p>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Wrench className="h-5 w-5 sm:h-8 sm:w-8 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 bg-gradient-to-br from-card to-success/5 border-success/20 hover:shadow-lg hover:shadow-success/10 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Completate</p>
                  <p className="text-2xl sm:text-3xl font-bold text-success">{stats.completed}</p>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-success/10 group-hover:bg-success/20 transition-colors">
                  <CheckCircle2 className="h-5 w-5 sm:h-8 sm:w-8 text-success" />
                </div>
              </div>
            </Card>
          </div>

          {/* Loyalty Cards Section */}
          {loyaltyCards.length > 0 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
                Le Mie Tessere Fedeltà
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {loyaltyCards.map((card) => (
                  <LoyaltyCardDisplay key={card.id} card={card} />
                ))}
              </div>
            </div>
          )}

          {/* Quotes Section */}
          {quotes.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Preventivi
              </h2>
              <div className="space-y-4">
                {quotes.map((quote) => {
                  const items = typeof quote.items === 'string' ? JSON.parse(quote.items || '[]') : (quote.items || []);
                  const isPending = quote.status === 'pending' && !quote.signed_at;
                  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date();
                  
                  return (
                    <Card key={quote.id} className={`p-6 ${isPending && !isExpired ? 'border-primary/50 shadow-lg' : ''}`}>
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-xl">
                                {quote.device_type} {quote.device_brand} {quote.device_model}
                              </h3>
                              {quote.signed_at ? (
                                <Badge className="bg-gradient-success text-white">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Firmato
                                </Badge>
                              ) : quote.status === 'rejected' ? (
                                <Badge variant="destructive">Rifiutato</Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <Clock className="h-3 w-3 mr-1" />
                                  In Attesa
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground mb-2">{quote.issue_description}</p>
                            {quote.diagnosis && (
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium">Diagnosi:</span> {quote.diagnosis}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Creato: {format(new Date(quote.created_at), "dd MMM yyyy", { locale: it })}
                            </p>
                            {quote.valid_until && (
                              <p className="text-xs text-muted-foreground">
                                Valido fino: {format(new Date(quote.valid_until), "dd MMM yyyy", { locale: it })}
                                {isExpired && <span className="text-destructive ml-2">(Scaduto)</span>}
                              </p>
                            )}
                          </div>

                          <div className="text-right">
                            <p className="text-3xl font-bold text-primary">
                              € {quote.total_cost.toFixed(2)}
                            </p>
                            {quote.signed_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Firmato: {format(new Date(quote.signed_at), "dd/MM/yyyy HH:mm", { locale: it })}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Items breakdown */}
                        {items.length > 0 && (
                          <div className="border-t pt-4 space-y-2">
                            <p className="font-medium text-sm">Dettaglio Costi:</p>
                            <div className="space-y-1">
                              {items.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    {item.description} ({item.quantity}x)
                                  </span>
                                  <span className="font-medium">€ {item.total.toFixed(2)}</span>
                                </div>
                              ))}
                              <div className="flex justify-between text-sm border-t pt-2">
                                <span className="text-muted-foreground">Manodopera</span>
                                <span className="font-medium">€ {quote.labor_cost.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {quote.notes && (
                          <div className="border-t pt-4">
                            <p className="text-sm font-medium mb-1">Note:</p>
                            <p className="text-sm text-muted-foreground">{quote.notes}</p>
                          </div>
                        )}

                        {/* Actions */}
                        {isPending && !isExpired && (
                          <div className="border-t pt-4">
                            <Button 
                              className="w-full sm:w-auto"
                              onClick={() => {
                                setSelectedQuoteId(quote.id);
                                setSignatureOpen(true);
                              }}
                            >
                              <PenTool className="h-4 w-4 mr-2" />
                              Firma Preventivo
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Final Cost Notifications */}
          {repairs
            .filter((r) => r.final_cost && !r.final_cost_accepted_at)
            .map((repair) => (
              <NotificationBanner
                key={repair.id}
                repair={repair as any}
                onAccept={() => {
                  setSelectedRepair(repair);
                  setFinalCostDialogOpen(true);
                }}
              />
            ))}

          {/* Repairs List */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Le Mie Riparazioni</h2>
            
            {loading ? (
              <Card className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Caricamento...</p>
              </Card>
            ) : repairs.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Non hai ancora riparazioni</p>
                <Button onClick={() => navigate("/")}>Prenota una Riparazione</Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {repairs.map((repair, index) => {
                  const statusInfo = getStatusBadge(repair.status);
                  const daysLeft = getDaysUntilForfeiture(repair);
                    const isUrgent = daysLeft !== null && daysLeft <= 7;
                    const isCritical = daysLeft !== null && daysLeft <= 3;
                    return (
                      <motion.div
                        key={repair.id}
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ 
                          duration: 0.4,
                          delay: index * 0.08,
                          ease: [0.25, 0.46, 0.45, 0.94]
                        }}
                      >
                      <Card 
                        className={`p-4 sm:p-6 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${isCritical ? 'border-red-500' : isUrgent ? 'border-rose-500/50' : 'hover:border-primary/30'}`}
                        onClick={() => navigate(`/customer-repairs/${repair.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className={`p-3 rounded-lg bg-muted ${statusInfo.color}`}>
                              {statusInfo.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h3 className="font-semibold text-lg">
                                  {repair.device.brand} {repair.device.model}
                                </h3>
                                <span className={`text-sm font-medium ${statusInfo.color}`}>
                                  {statusInfo.label}
                                </span>
                                {/* Forfeiture countdown badge - always show for completed but not delivered */}
                                {daysLeft !== null && daysLeft > 0 && (
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
                                )}
                                {repair.status === "forfeited" && (
                                  <Badge className="bg-rose-900 text-white">
                                    Alienato
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground mb-2">
                                {repair.device.reported_issue}
                              </p>
                              {repair.diagnosis && (
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium">Diagnosi:</span> {repair.diagnosis}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                Creata il {new Date(repair.created_at).toLocaleDateString("it-IT")}
                              </p>
                              {/* Warning message for devices nearing forfeiture */}
                              {daysLeft !== null && daysLeft > 0 && isUrgent && (
                                <p className="text-xs text-rose-600 mt-2 font-medium">
                                  ⚠️ Ritira il dispositivo entro {daysLeft} giorni o diventerà proprietà del laboratorio
                                </p>
                              )}
                            </div>
                          </div>
                        <div className="text-right">
                          {repair.final_cost && (
                            <p className="text-2xl font-bold text-primary">
                              €{repair.final_cost.toFixed(2)}
                            </p>
                          )}
                          {!repair.final_cost && repair.estimated_cost && (
                            <p className="text-sm text-muted-foreground">
                              Stima: €{repair.estimated_cost.toFixed(2)}
                            </p>
                          )}
                          {repair.acconto !== null && repair.acconto > 0 && (
                            <p className="text-xs text-emerald-600 mt-1">
                              Acconto: €{repair.acconto.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                      </motion.div>
                    );
                })}
              </div>
            )}
          </div>

          {/* Promotion Preferences */}
          {user?.email && (
            <PromotionPreferences userEmail={user.email} />
          )}

          {/* Push Notification Settings */}
          <PushNotificationSettings />

          {/* Used Devices Section */}
          <UsedDevicesCarousel />

          {/* Become Partner Section */}
          <Card className="p-6 bg-gradient-to-br from-card via-card to-primary/5 border-primary/20">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-bold text-foreground">Vuoi diventare Partner?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Entra a far parte della nostra rete di partner. Diventa un punto di raccolta (Corner) o un centro assistenza autorizzato.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
                <Button 
                  variant="outline" 
                  className="gap-2 border-primary/30 hover:bg-primary/10"
                  onClick={() => navigate("/provider-registration?type=corner")}
                >
                  <Store className="h-5 w-5" />
                  Diventa Corner
                </Button>
                <Button 
                  className="gap-2"
                  onClick={() => navigate("/provider-registration?type=centro")}
                >
                  <Briefcase className="h-5 w-5" />
                  Diventa Centro Assistenza
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>

      {selectedQuoteId && (
        <SignatureDialog
          open={signatureOpen}
          onOpenChange={setSignatureOpen}
          quoteId={selectedQuoteId}
          onSuccess={fetchCustomerData}
        />
      )}

      {selectedRepair && (
        <FinalCostSignatureDialog
          open={finalCostDialogOpen}
          onOpenChange={setFinalCostDialogOpen}
          repair={selectedRepair as any}
          onSuccess={fetchCustomerData}
        />
      )}
    </div>
  );
}
