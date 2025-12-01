import { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { SignatureDialog } from "@/components/quotes/SignatureDialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { FinalCostSignatureDialog } from "@/components/customer/FinalCostSignatureDialog";
import { NotificationBanner } from "@/components/customer/NotificationBanner";

interface Repair {
  id: string;
  status: string;
  created_at: string;
  estimated_cost: number | null;
  final_cost: number | null;
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
  const { user, signOut } = useAuth();
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

  useEffect(() => {
    if (user) {
      fetchCustomerData();
    }
  }, [user]);

  const fetchCustomerData = async () => {
    try {
      // Trova il cliente tramite email
      const { data: customerData } = await supabase
        .from("customers")
        .select("id")
        .eq("email", user?.email)
        .maybeSingle();

      if (!customerData) {
        setLoading(false);
        return;
      }

      // Carica preventivi
      const { data: quotesData } = await supabase
        .from("quotes")
        .select("*")
        .eq("customer_id", customerData.id)
        .order("created_at", { ascending: false });

      setQuotes((quotesData as any) || []);

      // Trova i dispositivi del cliente
      const { data: devices } = await supabase
        .from("devices")
        .select("id")
        .eq("customer_id", customerData.id);

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
    };
    return config[status] || config.pending;
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
            <span className="font-bold text-xl text-foreground">TechRepair</span>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/signature-history")}>
              <FileSignature className="h-4 w-4 mr-2" />
              Storico Firme
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
        <div className="space-y-8">
          {/* Welcome Section */}
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Benvenuto, {user?.email?.split("@")[0]}!
            </h1>
            <p className="text-muted-foreground">
              Gestisci le tue riparazioni e monitora lo stato dei tuoi dispositivi
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Totale</p>
                  <p className="text-3xl font-bold text-foreground">{stats.total}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Attesa</p>
                  <p className="text-3xl font-bold text-warning">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-warning" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Corso</p>
                  <p className="text-3xl font-bold text-primary">{stats.inProgress}</p>
                </div>
                <Wrench className="h-8 w-8 text-primary" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completate</p>
                  <p className="text-3xl font-bold text-success">{stats.completed}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
            </Card>
          </div>

          {/* Quotes Section */}
          {quotes.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Preventivi
              </h2>
              <div className="space-y-4">
                {quotes.map((quote) => {
                  const items = JSON.parse(quote.items || '[]');
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
                {repairs.map((repair) => {
                  const statusInfo = getStatusBadge(repair.status);
                  return (
                    <Card 
                      key={repair.id} 
                      className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => navigate(`/customer-repairs/${repair.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`p-3 rounded-lg bg-muted ${statusInfo.color}`}>
                            {statusInfo.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">
                                {repair.device.brand} {repair.device.model}
                              </h3>
                              <span className={`text-sm font-medium ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
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
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
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
