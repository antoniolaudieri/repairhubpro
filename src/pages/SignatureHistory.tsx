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
  User,
  LogOut,
  Home,
  ArrowLeft,
  FileSignature,
  Calendar,
  Euro,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";

interface SignedRepair {
  id: string;
  final_cost: number;
  final_cost_signature: string;
  final_cost_accepted_at: string;
  created_at: string;
  device: {
    brand: string;
    model: string;
    device_type: string;
    reported_issue: string;
  };
}

export default function SignatureHistory() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [signedRepairs, setSignedRepairs] = useState<SignedRepair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSignatureHistory();
    }
  }, [user]);

  const fetchSignatureHistory = async () => {
    try {
      // Find customer by email
      const { data: customerData } = await supabase
        .from("customers")
        .select("id")
        .eq("email", user?.email)
        .maybeSingle();

      if (!customerData) {
        setLoading(false);
        return;
      }

      // Find customer devices
      const { data: devices } = await supabase
        .from("devices")
        .select("id")
        .eq("customer_id", customerData.id);

      if (!devices || devices.length === 0) {
        setLoading(false);
        return;
      }

      const deviceIds = devices.map((d) => d.id);

      // Find repairs with signatures
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
        .not("final_cost_signature", "is", null)
        .not("final_cost_accepted_at", "is", null)
        .order("final_cost_accepted_at", { ascending: false });

      if (repairData) {
        setSignedRepairs(repairData as any);
      }
    } catch (error: any) {
      toast.error("Errore nel caricamento dello storico");
      console.error(error);
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

  const totalAmount = signedRepairs.reduce((sum, repair) => sum + repair.final_cost, 0);

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
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl">
                <FileSignature className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Storico Firme e Accettazioni
                </h1>
                <p className="text-muted-foreground">
                  Visualizza tutti i costi accettati e le firme elettroniche
                </p>
              </div>
            </div>

            {/* Stats Summary */}
            {signedRepairs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Totale Accettazioni</p>
                      <p className="text-3xl font-bold text-foreground">{signedRepairs.length}</p>
                    </div>
                    <FileSignature className="h-8 w-8 text-primary" />
                  </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Importo Totale</p>
                      <p className="text-3xl font-bold text-accent">€{totalAmount.toFixed(2)}</p>
                    </div>
                    <Euro className="h-8 w-8 text-accent" />
                  </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ultima Firma</p>
                      <p className="text-lg font-semibold text-foreground">
                        {format(new Date(signedRepairs[0].final_cost_accepted_at), "dd MMM yyyy", { locale: it })}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* History List */}
          {loading ? (
            <Card className="p-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Caricamento storico...</p>
            </Card>
          ) : signedRepairs.length === 0 ? (
            <Card className="p-12 text-center">
              <FileSignature className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Nessuna Firma Trovata
              </h3>
              <p className="text-muted-foreground mb-6">
                Non hai ancora accettato nessun costo finale
              </p>
              <Button onClick={() => navigate("/customer-dashboard")}>
                Vai alla Dashboard
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {signedRepairs.map((repair, index) => (
                <motion.div
                  key={repair.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="p-6 space-y-6">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-gradient-to-r from-primary to-accent text-white">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Firmato
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(repair.final_cost_accepted_at), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-foreground mb-1">
                            {repair.device.brand} {repair.device.model}
                          </h3>
                          <p className="text-muted-foreground mb-2">
                            {repair.device.device_type} - {repair.device.reported_issue}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Riparazione creata: {format(new Date(repair.created_at), "dd MMM yyyy", { locale: it })}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-muted-foreground mb-1">Costo Finale</p>
                          <p className="text-4xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                            €{repair.final_cost.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Signature Display */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <FileSignature className="h-5 w-5 text-primary" />
                          <h4 className="font-semibold text-foreground">Firma Elettronica</h4>
                        </div>
                        <Card className="p-4 bg-gradient-to-br from-background to-muted/20 border-2 border-primary/20">
                          <img
                            src={repair.final_cost_signature}
                            alt="Firma"
                            className="w-full h-32 object-contain bg-background rounded-lg"
                          />
                        </Card>
                        <p className="text-xs text-muted-foreground text-center">
                          Firma digitale valida e vincolante
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
