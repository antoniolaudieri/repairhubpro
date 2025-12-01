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
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface Repair {
  id: string;
  status: string;
  created_at: string;
  estimated_cost: number | null;
  final_cost: number | null;
  diagnosis: string | null;
  device: {
    brand: string;
    model: string;
    device_type: string;
    reported_issue: string;
  };
}

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
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
                    <Card key={repair.id} className="p-6">
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
    </div>
  );
}
