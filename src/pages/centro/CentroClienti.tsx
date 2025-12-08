import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Users,
  Wrench,
  ArrowRight,
  Calendar,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { CustomerDialog } from "@/components/customers/CustomerDialog";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  created_at: string;
}

export default function CentroClienti() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [repairCounts, setRepairCounts] = useState<Record<string, number>>({});

  const loadCustomers = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, email, phone, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
      setFilteredCustomers(data || []);

      const counts: Record<string, number> = {};
      for (const customer of data || []) {
        const { data: devices } = await supabase
          .from("devices")
          .select("id")
          .eq("customer_id", customer.id);

        if (devices && devices.length > 0) {
          const deviceIds = devices.map(d => d.id);
          const { count } = await supabase
            .from("repairs")
            .select("*", { count: "exact", head: true })
            .in("device_id", deviceIds);

          counts[customer.id] = count || 0;
        } else {
          counts[customer.id] = 0;
        }
      }
      setRepairCounts(counts);
    } catch (error: any) {
      toast.error(error.message || "Errore nel caricamento dei clienti");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [user]);

  useEffect(() => {
    const filtered = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery)
    );
    setFilteredCustomers(filtered);
  }, [searchQuery, customers]);

  const totalRepairs = Object.values(repairCounts).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <CentroLayout>
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="relative">
              <div className="animate-spin rounded-full h-20 w-20 border-[3px] border-primary/20 border-t-primary mx-auto" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
            <p className="text-muted-foreground font-medium mt-6">Caricamento clienti...</p>
          </motion.div>
        </div>
      </CentroLayout>
    );
  }

  return (
    <CentroLayout>
      <PageTransition>
        <div className="space-y-8">
          {/* Hero Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 sm:p-8"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/20">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    I Tuoi Clienti
                  </h1>
                  <p className="text-muted-foreground mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <span className="font-semibold text-foreground">{customers.length}</span> clienti
                    </span>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                      <span className="font-semibold text-foreground">{totalRepairs}</span> riparazioni
                    </span>
                  </p>
                </div>
              </div>
              
              <Button 
                onClick={() => setDialogOpen(true)} 
                size="lg"
                className="gap-2 shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90"
              >
                <Plus className="h-5 w-5" />
                Nuovo Cliente
              </Button>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            <Card className="p-4 border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{customers.length}</p>
                  <p className="text-xs text-muted-foreground">Totale</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalRepairs}</p>
                  <p className="text-xs text-muted-foreground">Riparazioni</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {customers.length > 0 ? (totalRepairs / customers.length).toFixed(1) : "0"}
                  </p>
                  <p className="text-xs text-muted-foreground">Media/Cliente</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {customers.filter(c => {
                      const days = (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24);
                      return days <= 30;
                    }).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Nuovi (30gg)</p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, email o telefono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base bg-card/50 border-border/50 shadow-sm backdrop-blur-sm focus:bg-card transition-colors"
              />
              {searchQuery && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Badge variant="secondary" className="text-xs">
                    {filteredCustomers.length} risultati
                  </Badge>
                </div>
              )}
            </div>
          </motion.div>

          {/* Customer List */}
          <AnimatePresence mode="popLayout">
            {filteredCustomers.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="p-12 text-center border-dashed border-2 bg-card/30">
                  <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                    <Users className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Nessun cliente trovato</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                    {searchQuery
                      ? "Prova a modificare i criteri di ricerca"
                      : "Inizia aggiungendo il tuo primo cliente al sistema"}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setDialogOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Aggiungi Cliente
                    </Button>
                  )}
                </Card>
              </motion.div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredCustomers.map((customer, index) => {
                  const repairs = repairCounts[customer.id] || 0;
                  const isVip = repairs >= 5;
                  const isNew = (Date.now() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 7;
                  
                  return (
                    <motion.div
                      key={customer.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      layout
                    >
                      <Card
                        className={`
                          group relative overflow-hidden cursor-pointer 
                          border-border/50 hover:border-primary/30 
                          bg-card/50 hover:bg-card 
                          shadow-sm hover:shadow-xl 
                          transition-all duration-300
                          ${isVip ? 'ring-1 ring-amber-500/20' : ''}
                        `}
                        onClick={() => navigate(`/centro/clienti/${customer.id}`)}
                      >
                        {/* Decorative gradient on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative p-5">
                          {/* Header */}
                          <div className="flex items-start gap-4 mb-4">
                            <div className={`
                              h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0
                              transition-transform group-hover:scale-105
                              ${isVip 
                                ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/20' 
                                : 'bg-gradient-to-br from-primary/20 to-primary/5'
                              }
                            `}>
                              <span className={`text-xl font-bold ${isVip ? 'text-white' : 'text-primary'}`}>
                                {customer.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground truncate text-lg group-hover:text-primary transition-colors">
                                  {customer.name}
                                </h3>
                                {isVip && (
                                  <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(customer.created_at).toLocaleDateString("it-IT", { 
                                    day: "numeric",
                                    month: "short", 
                                    year: "numeric" 
                                  })}
                                </span>
                                {isNew && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-green-500/10 text-green-600 border-green-500/20">
                                    NUOVO
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <Badge 
                              variant="secondary" 
                              className={`
                                flex-shrink-0 gap-1.5 font-semibold
                                ${repairs > 0 
                                  ? 'bg-primary/10 text-primary border-primary/20' 
                                  : 'bg-muted text-muted-foreground'
                                }
                              `}
                            >
                              <Wrench className="h-3 w-3" />
                              {repairs}
                            </Badge>
                          </div>

                          {/* Contact Info */}
                          <div className="space-y-1.5 mb-4">
                            {customer.email && (
                              <a 
                                href={`mailto:${customer.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/60 transition-all group/link"
                              >
                                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover/link:bg-blue-500/20 transition-colors">
                                  <Mail className="h-4 w-4 text-blue-500" />
                                </div>
                                <span className="text-sm truncate text-muted-foreground group-hover/link:text-foreground transition-colors">
                                  {customer.email}
                                </span>
                              </a>
                            )}
                            <a 
                              href={`tel:${customer.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/60 transition-all group/link"
                            >
                              <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center group-hover/link:bg-green-500/20 transition-colors">
                                <Phone className="h-4 w-4 text-green-500" />
                              </div>
                              <span className="text-sm font-medium text-foreground">
                                {customer.phone}
                              </span>
                            </a>
                          </div>

                          {/* Footer */}
                          <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {repairs === 0 && "Nessuna riparazione"}
                              {repairs === 1 && "1 riparazione"}
                              {repairs > 1 && `${repairs} riparazioni totali`}
                            </span>
                            <div className="flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                              <span>Dettagli</span>
                              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>

          <CustomerDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onSuccess={loadCustomers}
          />
        </div>
      </PageTransition>
    </CentroLayout>
  );
}
