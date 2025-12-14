import { useEffect, useState, useMemo } from "react";
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
  Sparkles,
  Euro,
  CreditCard,
  Filter,
  Clock,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { CustomerDialog } from "@/components/customers/CustomerDialog";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CustomerAIAgent } from "@/components/centro/CustomerAIAgent";
import { CustomerScoreBadge } from "@/components/centro/CustomerScoreBadge";
import { CustomerReturnPrediction } from "@/components/centro/CustomerReturnPrediction";
import { useCustomerAnalytics, type CustomerAnalytics } from "@/hooks/useCustomerAnalytics";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  created_at: string;
}

interface CustomerStats {
  repairCount: number;
  totalSpent: number;
}

type CustomerFilter = "all" | "gold" | "atRisk" | "overdue" | "returningThisWeek";

export default function CentroClienti() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerStats, setCustomerStats] = useState<Record<string, CustomerStats>>({});
  const [centroId, setCentroId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<CustomerFilter>("all");

  // Fetch customer analytics from AI agent
  const { analytics, loading: analyticsLoading } = useCustomerAnalytics(centroId);

  const loadCustomers = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get centro_id first
      const { data: centroData } = await supabase
        .from("centri_assistenza")
        .select("id")
        .eq("owner_user_id", user.id)
        .single();
      
      if (centroData) {
        setCentroId(centroData.id);
      }
      
      // Single query with nested relations for efficiency
      const { data, error } = await supabase
        .from("customers")
        .select(`
          id, name, email, phone, created_at,
          devices (
            id,
            repairs (
              id, final_cost, estimated_cost
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Also get repair_requests for Corner segnalazioni
      const { data: repairRequests } = await supabase
        .from("repair_requests")
        .select("customer_id, estimated_cost");

      const requestsByCustomer: Record<string, { count: number; spent: number }> = {};
      repairRequests?.forEach(req => {
        if (!requestsByCustomer[req.customer_id]) {
          requestsByCustomer[req.customer_id] = { count: 0, spent: 0 };
        }
        requestsByCustomer[req.customer_id].count++;
        requestsByCustomer[req.customer_id].spent += req.estimated_cost || 0;
      });

      // Process customers and calculate stats in memory
      const stats: Record<string, CustomerStats> = {};
      const customersData = (data || []).map(c => {
        const repairs = c.devices?.flatMap(d => d.repairs || []) || [];
        const repairCount = repairs.length;
        const repairSpent = repairs.reduce((sum, r) => sum + (r.final_cost || r.estimated_cost || 0), 0);
        
        const reqStats = requestsByCustomer[c.id] || { count: 0, spent: 0 };
        
        stats[c.id] = { 
          repairCount: repairCount + reqStats.count, 
          totalSpent: repairSpent + reqStats.spent 
        };
        
        return { id: c.id, name: c.name, email: c.email, phone: c.phone, created_at: c.created_at };
      });
      
      setCustomers(customersData);
      setFilteredCustomers(customersData);
      setCustomerStats(stats);
    } catch (error: any) {
      toast.error(error.message || "Errore nel caricamento dei clienti");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [user]);

  // Create analytics map for quick lookup
  const analyticsMap = useMemo(() => {
    const map: Record<string, CustomerAnalytics> = {};
    analytics.forEach(a => { map[a.id] = a; });
    return map;
  }, [analytics]);

  // Filter customers based on search and active filter
  useEffect(() => {
    let filtered = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery)
    );

    // Apply additional filters based on analytics
    if (activeFilter !== "all" && Object.keys(analyticsMap).length > 0) {
      filtered = filtered.filter(customer => {
        const a = analyticsMap[customer.id];
        if (!a) return false;
        
        switch (activeFilter) {
          case "gold":
            return a.score >= 80;
          case "atRisk":
            return a.score < 50;
          case "overdue":
            return a.daysOverdue !== null && a.daysOverdue > 0;
          case "returningThisWeek":
            if (!a.predictedReturn) return false;
            const pred = new Date(a.predictedReturn);
            const now = new Date();
            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            return pred >= now && pred <= weekFromNow;
          default:
            return true;
        }
      });
    }

    setFilteredCustomers(filtered);
  }, [searchQuery, customers, activeFilter, analyticsMap]);

  const totalRepairs = Object.values(customerStats).reduce((a, b) => a + b.repairCount, 0);
  const totalRevenue = Object.values(customerStats).reduce((a, b) => a + b.totalSpent, 0);
  const avgPerCustomer = customers.length > 0 ? totalRevenue / customers.length : 0;
  
  // Stats from analytics
  const goldCount = analytics.filter(a => a.score >= 80).length;
  const atRiskCount = analytics.filter(a => a.score < 50).length;
  const overdueCount = analytics.filter(a => a.daysOverdue && a.daysOverdue > 0).length;

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
        <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-foreground">I Tuoi Clienti</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                {customers.length} clienti • €{totalRevenue.toFixed(0)} fatturato totale
              </p>
            </div>
            <Button
              onClick={() => setDialogOpen(true)}
              className="gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuovo Cliente</span>
            </Button>
          </div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          >
            <Card className="p-3.5 border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{customers.length}</p>
                  <p className="text-[11px] text-muted-foreground">Clienti</p>
                </div>
              </div>
            </Card>
            <Card className="p-3.5 border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Euro className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">€{totalRevenue.toFixed(0)}</p>
                  <p className="text-[11px] text-muted-foreground">Fatturato</p>
                </div>
              </div>
            </Card>
            <Card className="p-3.5 border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">€{avgPerCustomer.toFixed(0)}</p>
                  <p className="text-[11px] text-muted-foreground">Media</p>
                </div>
              </div>
            </Card>
            <Card className="p-3.5 border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Wrench className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{totalRepairs}</p>
                  <p className="text-[11px] text-muted-foreground">Riparazioni</p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Filter Chips */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="flex flex-wrap gap-2"
          >
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("all")}
              className="gap-1.5"
            >
              <Users className="h-3.5 w-3.5" />
              Tutti
            </Button>
            <Button
              variant={activeFilter === "gold" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("gold")}
              className="gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Gold ({goldCount})
            </Button>
            <Button
              variant={activeFilter === "atRisk" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("atRisk")}
              className="gap-1.5"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              A Rischio ({atRiskCount})
            </Button>
            <Button
              variant={activeFilter === "overdue" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("overdue")}
              className="gap-1.5"
            >
              <Clock className="h-3.5 w-3.5" />
              In Ritardo ({overdueCount})
            </Button>
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
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredCustomers.map((customer, index) => {
                  const stats = customerStats[customer.id] || { repairCount: 0, totalSpent: 0 };
                  const customerAnalytics = analyticsMap[customer.id];
                  const isVip = customerAnalytics ? customerAnalytics.score >= 80 : stats.totalSpent >= 200;
                  const isAtRisk = customerAnalytics ? customerAnalytics.score < 50 : false;
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
                          border-0 
                          bg-gradient-to-br from-card via-card to-muted/30
                          shadow-md hover:shadow-2xl 
                          transition-all duration-500 ease-out
                          hover:-translate-y-1
                          ${isVip ? 'ring-2 ring-amber-400/40 shadow-amber-500/10' : ''}
                          ${isAtRisk ? 'ring-2 ring-destructive/30 shadow-destructive/10' : ''}
                        `}
                        onClick={() => navigate(`/centro/clienti/${customer.id}`)}
                      >
                        {/* Top accent bar */}
                        <div className={`
                          absolute top-0 left-0 right-0 h-1 
                          ${isVip 
                            ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500' 
                            : isAtRisk 
                              ? 'bg-gradient-to-r from-destructive/60 via-destructive to-destructive/60'
                              : 'bg-gradient-to-r from-primary/40 via-primary to-primary/40'
                          }
                          opacity-0 group-hover:opacity-100 transition-opacity duration-300
                        `} />
                        
                        {/* Background pattern */}
                        <div className="absolute inset-0 opacity-[0.02] group-hover:opacity-[0.04] transition-opacity">
                          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary blur-3xl translate-x-20 -translate-y-20" />
                          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-primary blur-3xl -translate-x-16 translate-y-16" />
                        </div>
                        
                        <div className="relative p-5">
                          {/* Header with Avatar */}
                          <div className="flex items-start gap-4 mb-5">
                            <div className="relative">
                              <div className={`
                                h-16 w-16 rounded-2xl flex items-center justify-center flex-shrink-0
                                transition-all duration-300 group-hover:scale-105 group-hover:rotate-3
                                shadow-lg
                                ${isVip 
                                  ? 'bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 shadow-amber-500/30' 
                                  : isAtRisk
                                    ? 'bg-gradient-to-br from-destructive/80 to-destructive shadow-destructive/20'
                                    : 'bg-gradient-to-br from-primary/90 to-primary shadow-primary/20'
                                }
                              `}>
                                <span className="text-2xl font-bold text-primary-foreground">
                                  {customer.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              {isVip && (
                                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-400 flex items-center justify-center shadow-lg animate-pulse">
                                  <Sparkles className="h-3 w-3 text-amber-900" />
                                </div>
                              )}
                              {isNew && !isVip && (
                                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                                  <Plus className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0 pt-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-foreground text-lg group-hover:text-primary transition-colors duration-300 truncate">
                                  {customer.name}
                                </h3>
                                {customerAnalytics && (
                                  <CustomerScoreBadge 
                                    score={customerAnalytics.score} 
                                    breakdown={customerAnalytics.scoreBreakdown}
                                    size="sm"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {customerAnalytics && (
                                  <CustomerReturnPrediction
                                    predictedReturn={customerAnalytics.predictedReturn}
                                    avgInterval={customerAnalytics.avgInterval}
                                    daysOverdue={customerAnalytics.daysOverdue}
                                    repairCount={customerAnalytics.repairCount}
                                  />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Stats Pills */}
                          <div className="flex items-center gap-2 mb-5 flex-wrap">
                            <div className={`
                              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                              transition-all duration-300
                              ${stats.repairCount > 0 
                                ? 'bg-primary/10 text-primary ring-1 ring-primary/20' 
                                : 'bg-muted text-muted-foreground'
                              }
                            `}>
                              <Wrench className="h-3.5 w-3.5" />
                              {stats.repairCount} {stats.repairCount === 1 ? 'lavoro' : 'lavori'}
                            </div>
                            <div className={`
                              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                              transition-all duration-300
                              ${stats.totalSpent > 0 
                                ? 'bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20' 
                                : 'bg-muted text-muted-foreground'
                              }
                            `}>
                              <Euro className="h-3.5 w-3.5" />
                              €{stats.totalSpent.toFixed(0)}
                            </div>
                            {isNew && (
                              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20">
                                NUOVO
                              </div>
                            )}
                          </div>

                          {/* Contact Actions */}
                          <div className="space-y-2 mb-5">
                            {customer.email && (
                              <a 
                                href={`mailto:${customer.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all duration-300 group/link"
                              >
                                <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover/link:bg-blue-500 group-hover/link:shadow-lg group-hover/link:shadow-blue-500/20 transition-all duration-300">
                                  <Mail className="h-4 w-4 text-blue-500 group-hover/link:text-white transition-colors" />
                                </div>
                                <span className="text-sm truncate text-muted-foreground group-hover/link:text-foreground transition-colors font-medium">
                                  {customer.email}
                                </span>
                              </a>
                            )}
                            <a 
                              href={`tel:${customer.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all duration-300 group/link"
                            >
                              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover/link:bg-emerald-500 group-hover/link:shadow-lg group-hover/link:shadow-emerald-500/20 transition-all duration-300">
                                <Phone className="h-4 w-4 text-emerald-500 group-hover/link:text-white transition-colors" />
                              </div>
                              <span className="text-sm font-semibold text-foreground">
                                {customer.phone}
                              </span>
                            </a>
                          </div>

                          {/* Footer with CTA */}
                          <div className="pt-4 border-t border-border/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isVip && (
                                <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  Cliente VIP
                                </span>
                              )}
                              {isAtRisk && !isVip && (
                                <span className="text-xs font-medium text-destructive flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  A Rischio
                                </span>
                              )}
                              {!isVip && !isAtRisk && (
                                <span className="text-xs text-muted-foreground">
                                  {stats.totalSpent === 0 && "Nuovo contatto"}
                                  {stats.totalSpent > 0 && stats.totalSpent < 100 && "Cliente occasionale"}
                                  {stats.totalSpent >= 100 && stats.totalSpent < 200 && "Cliente abituale"}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                              <span>Apri</span>
                              <ArrowRight className="h-4 w-4" />
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
      
      {/* AI Agent Chat */}
      {centroId && <CustomerAIAgent centroId={centroId} />}
    </CentroLayout>
  );
}
