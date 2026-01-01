import { useState, useEffect } from "react";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  TrendingUp, 
  CreditCard, 
  Users, 
  Battery, 
  HardDrive, 
  Brain,
  AlertTriangle,
  Search,
  Phone,
  Mail,
  MessageCircle,
  CheckCircle2,
  X,
  Euro,
  RefreshCw,
  ChevronRight,
  Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface OpportunityItem {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  type: string;
  details: string;
  estimatedValue: number;
  status: "pending" | "contacted" | "converted" | "dismissed";
  createdAt: string;
}

interface OpportunitySummary {
  type: string;
  label: string;
  icon: React.ElementType;
  count: number;
  totalValue: number;
  color: string;
  bgColor: string;
}

const OPPORTUNITY_CONFIG: Record<string, { label: string; icon: React.ElementType; unitValue: number; color: string; bgColor: string }> = {
  expiring_loyalty: { label: "Tessere in scadenza", icon: CreditCard, unitValue: 30, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  inactive_high_value: { label: "Clienti inattivi", icon: Users, unitValue: 50, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  degraded_battery: { label: "Batterie degradate", icon: Battery, unitValue: 60, color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  critical_storage: { label: "Storage critici", icon: HardDrive, unitValue: 30, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30" },
  ai_maintenance: { label: "Manutenzioni AI", icon: Brain, unitValue: 40, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
  high_churn_risk: { label: "Rischio abbandono", icon: AlertTriangle, unitValue: 25, color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
};

export default function CentroOpportunita() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get("type") || "all";
  
  const [centroId, setCentroId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(initialType);
  const [searchQuery, setSearchQuery] = useState("");
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [summaries, setSummaries] = useState<OpportunitySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPotentialValue, setTotalPotentialValue] = useState(0);

  useEffect(() => {
    const fetchCentro = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("centri_assistenza")
        .select("id")
        .eq("owner_user_id", user.id)
        .single();
      
      if (data) {
        setCentroId(data.id);
      }
    };
    fetchCentro();
  }, [user]);

  useEffect(() => {
    if (centroId) {
      loadAllOpportunities();
    }
  }, [centroId]);

  const loadAllOpportunities = async () => {
    if (!centroId) return;
    setIsLoading(true);
    
    try {
      const allOpportunities: OpportunityItem[] = [];
      const summaryData: OpportunitySummary[] = [];

      // 1. Tessere in scadenza
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { data: expiringCards } = await supabase
        .from("loyalty_cards")
        .select(`
          id,
          expires_at,
          customer:customers!inner(id, name, phone, email)
        `)
        .eq("centro_id", centroId)
        .eq("status", "active")
        .lte("expires_at", thirtyDaysFromNow.toISOString())
        .gte("expires_at", new Date().toISOString());

      if (expiringCards && expiringCards.length > 0) {
        const config = OPPORTUNITY_CONFIG.expiring_loyalty;
        expiringCards.forEach((card: any) => {
          const daysLeft = Math.ceil((new Date(card.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          allOpportunities.push({
            id: card.id,
            customerId: card.customer.id,
            customerName: card.customer.name,
            customerPhone: card.customer.phone,
            customerEmail: card.customer.email,
            type: "expiring_loyalty",
            details: `Scade tra ${daysLeft} giorni`,
            estimatedValue: config.unitValue,
            status: "pending",
            createdAt: card.expires_at,
          });
        });
        summaryData.push({
          type: "expiring_loyalty",
          label: config.label,
          icon: config.icon,
          count: expiringCards.length,
          totalValue: expiringCards.length * config.unitValue,
          color: config.color,
          bgColor: config.bgColor,
        });
      }

      // 2. Clienti inattivi alto valore
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const { data: inactiveCustomers } = await supabase
        .from("customers")
        .select("id, name, phone, email, last_interaction_at, ltv_score")
        .eq("centro_id", centroId)
        .lt("last_interaction_at", ninetyDaysAgo.toISOString())
        .gt("ltv_score", 100);

      if (inactiveCustomers && inactiveCustomers.length > 0) {
        const config = OPPORTUNITY_CONFIG.inactive_high_value;
        inactiveCustomers.forEach((customer) => {
          const daysSince = Math.floor((Date.now() - new Date(customer.last_interaction_at!).getTime()) / (1000 * 60 * 60 * 24));
          allOpportunities.push({
            id: `inactive_${customer.id}`,
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerEmail: customer.email,
            type: "inactive_high_value",
            details: `Inattivo da ${daysSince} giorni • LTV: €${customer.ltv_score}`,
            estimatedValue: config.unitValue,
            status: "pending",
            createdAt: customer.last_interaction_at!,
          });
        });
        summaryData.push({
          type: "inactive_high_value",
          label: config.label,
          icon: config.icon,
          count: inactiveCustomers.length,
          totalValue: inactiveCustomers.length * config.unitValue,
          color: config.color,
          bgColor: config.bgColor,
        });
      }

      // 3. Alto rischio churn
      const { data: churnRiskCustomers } = await supabase
        .from("customers")
        .select("id, name, phone, email, churn_risk_score, last_interaction_at")
        .eq("centro_id", centroId)
        .gt("churn_risk_score", 0.7);

      if (churnRiskCustomers && churnRiskCustomers.length > 0) {
        const config = OPPORTUNITY_CONFIG.high_churn_risk;
        churnRiskCustomers.forEach((customer) => {
          allOpportunities.push({
            id: `churn_${customer.id}`,
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerEmail: customer.email,
            type: "high_churn_risk",
            details: `Rischio abbandono: ${Math.round((customer.churn_risk_score || 0) * 100)}%`,
            estimatedValue: config.unitValue,
            status: "pending",
            createdAt: customer.last_interaction_at || new Date().toISOString(),
          });
        });
        summaryData.push({
          type: "high_churn_risk",
          label: config.label,
          icon: config.icon,
          count: churnRiskCustomers.length,
          totalValue: churnRiskCustomers.length * config.unitValue,
          color: config.color,
          bgColor: config.bgColor,
        });
      }

      // Ordina opportunità per valore
      allOpportunities.sort((a, b) => b.estimatedValue - a.estimatedValue);
      summaryData.sort((a, b) => b.totalValue - a.totalValue);

      setOpportunities(allOpportunities);
      setSummaries(summaryData);
      setTotalPotentialValue(summaryData.reduce((sum, s) => sum + s.totalValue, 0));
    } catch (error) {
      console.error("Error loading opportunities:", error);
      toast.error("Errore nel caricamento delle opportunità");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContact = async (opportunity: OpportunityItem, method: "whatsapp" | "email" | "call") => {
    // Log the action
    if (centroId) {
      await supabase.from("revenue_opportunities_log").insert({
        centro_id: centroId,
        customer_id: opportunity.customerId,
        opportunity_type: opportunity.type,
        estimated_value: opportunity.estimatedValue,
        status: "contacted",
        contacted_at: new Date().toISOString(),
      });
    }

    if (method === "whatsapp") {
      const message = encodeURIComponent(`Ciao ${opportunity.customerName}! Ti contattiamo dal centro assistenza per un'opportunità speciale.`);
      window.open(`https://wa.me/${opportunity.customerPhone.replace(/\D/g, "")}?text=${message}`, "_blank");
    } else if (method === "email" && opportunity.customerEmail) {
      window.open(`mailto:${opportunity.customerEmail}?subject=Opportunità speciale per te`, "_blank");
    } else if (method === "call") {
      window.open(`tel:${opportunity.customerPhone}`, "_blank");
    }
    
    toast.success("Azione registrata");
  };

  const handleDismiss = async (opportunity: OpportunityItem) => {
    if (centroId) {
      await supabase.from("revenue_opportunities_log").insert({
        centro_id: centroId,
        customer_id: opportunity.customerId,
        opportunity_type: opportunity.type,
        estimated_value: opportunity.estimatedValue,
        status: "dismissed",
        dismissed_at: new Date().toISOString(),
      });
    }
    
    setOpportunities(prev => prev.filter(o => o.id !== opportunity.id));
    toast.success("Opportunità archiviata");
  };

  const filteredOpportunities = opportunities.filter(o => {
    const matchesTab = activeTab === "all" || o.type === activeTab;
    const matchesSearch = o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         o.customerPhone.includes(searchQuery);
    return matchesTab && matchesSearch;
  });

  return (
    <CentroLayout>
      <PageTransition>
        <div className="container mx-auto p-4 md:p-6 max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                  Opportunità Revenue
                </h1>
                <p className="text-muted-foreground mt-1">
                  Scopri i guadagni nascosti analizzando i dati dei tuoi clienti
                </p>
              </div>
              <Button onClick={loadAllOpportunities} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Aggiorna
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm">Potenziale Totale</p>
                      <p className="text-3xl font-bold flex items-center gap-1 mt-1">
                        <Euro className="h-6 w-6" />
                        {totalPotentialValue.toLocaleString('it-IT')}
                      </p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-emerald-200" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {summaries.slice(0, 3).map((summary, index) => {
              const Icon = summary.icon;
              return (
                <motion.div
                  key={summary.type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * (index + 1) }}
                >
                  <Card 
                    className={`${summary.bgColor} border-0 cursor-pointer hover:scale-[1.02] transition-transform`}
                    onClick={() => setActiveTab(summary.type)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-muted-foreground text-sm">{summary.label}</p>
                          <p className="text-2xl font-bold mt-1">{summary.count}</p>
                          <p className={`text-sm ${summary.color} font-medium`}>+€{summary.totalValue}</p>
                        </div>
                        <Icon className={`h-8 w-8 ${summary.color} opacity-80`} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cerca per nome o telefono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-3 md:flex md:flex-wrap">
                <TabsTrigger value="all">Tutte</TabsTrigger>
                {summaries.map((s) => (
                  <TabsTrigger key={s.type} value={s.type} className="gap-1">
                    <span className="hidden md:inline">{s.label}</span>
                    <Badge variant="secondary" className="h-5 px-1.5">{s.count}</Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Opportunities List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {filteredOpportunities.length} Opportunità
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground mt-2">Caricamento...</p>
                </div>
              ) : filteredOpportunities.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg">Nessuna opportunità in questa categoria</h3>
                  <p className="text-muted-foreground">I tuoi clienti sono tutti attivi!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {filteredOpportunities.map((opportunity, index) => {
                      const config = OPPORTUNITY_CONFIG[opportunity.type];
                      const Icon = config?.icon || Users;
                      
                      return (
                        <motion.div
                          key={opportunity.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.02 }}
                          className={`p-4 rounded-xl border ${config?.bgColor || 'bg-muted/30'} flex flex-col md:flex-row md:items-center gap-4`}
                        >
                          <div className={`p-2.5 rounded-xl bg-background ${config?.color || 'text-muted-foreground'} self-start`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold">{opportunity.customerName}</h4>
                              <Badge variant="outline" className={config?.color}>
                                {config?.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{opportunity.details}</p>
                            <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {opportunity.customerPhone}
                              {opportunity.customerEmail && (
                                <>
                                  <span className="mx-1">•</span>
                                  <Mail className="h-3 w-3" />
                                  {opportunity.customerEmail}
                                </>
                              )}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30">
                              +€{opportunity.estimatedValue}
                            </Badge>
                            
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0"
                                onClick={() => handleContact(opportunity, "whatsapp")}
                              >
                                <MessageCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              {opportunity.customerEmail && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleContact(opportunity, "email")}
                                >
                                  <Mail className="h-4 w-4 text-blue-600" />
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0"
                                onClick={() => handleContact(opportunity, "call")}
                              >
                                <Phone className="h-4 w-4 text-primary" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDismiss(opportunity)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </CentroLayout>
  );
}
