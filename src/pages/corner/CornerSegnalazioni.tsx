import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CornerLayout } from "@/layouts/CornerLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Search, Phone, Mail, Calendar, Building2, ChevronDown, ChevronUp, FileText, Package, Wrench, Headphones, Store, CheckCircle2, PenTool, Clock, TrendingUp, Smartphone, AlertCircle, Sparkles, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { RepairWorkflowTimeline, getStatusLabel, getStatusColor } from "@/components/corner/RepairWorkflowTimeline";
import { SignatureDialog } from "@/components/quotes/SignatureDialog";
import { format, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";

// Helper function to calculate days until forfeiture
const getDaysUntilForfeiture = (atCornerAt: string | null): number | null => {
  if (!atCornerAt) return null;
  const atCornerDate = new Date(atCornerAt);
  const forfeitureDate = new Date(atCornerDate);
  forfeitureDate.setDate(forfeitureDate.getDate() + 30);
  return differenceInDays(forfeitureDate, new Date());
};

interface QuoteItem {
  description: string;
  quantity: number;
  total: number;
  type: 'part' | 'labor' | 'service';
}

interface Quote {
  id: string;
  total_cost: number;
  parts_cost: number | null;
  status: string;
  signed_at: string | null;
  signature_data: string | null;
  items: string;
  created_at: string;
  payment_collection_method: string | null;
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
  assigned_provider_type: string | null;
  assigned_provider_id: string | null;
  corner_direct_to_centro: boolean | null;
  quote_sent_at: string | null;
  quote_accepted_at: string | null;
  awaiting_pickup_at: string | null;
  picked_up_at: string | null;
  in_diagnosis_at: string | null;
  waiting_for_parts_at: string | null;
  in_repair_at: string | null;
  repair_completed_at: string | null;
  ready_for_return_at: string | null;
  at_corner_at: string | null;
  customer_paid_at: string | null;
  delivered_at: string | null;
  customer: {
    name: string;
    phone: string;
    email: string | null;
  } | null;
  centro?: {
    business_name: string;
  } | null;
  quote?: Quote | null;
}

const quoteStatusLabels: Record<string, string> = {
  pending: "In Attesa Firma",
  accepted: "Accettato",
  rejected: "Rifiutato",
};

export default function CornerSegnalazioni() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cornerId, setCornerId] = useState<string | null>(null);
  const [cornerRate, setCornerRate] = useState<number>(10);
  const [directMultiplier, setDirectMultiplier] = useState<number>(50);
  const [expandedQuotes, setExpandedQuotes] = useState<Set<string>>(new Set());
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [selectedQuoteForSignature, setSelectedQuoteForSignature] = useState<{quoteId: string; requestId: string; totalCost: number; deviceInfo: string} | null>(null);
  const [hideEarnings, setHideEarnings] = useState(false);

  useEffect(() => {
    if (user) {
      loadCornerAndRequests();
    }
  }, [user]);

  const loadCornerAndRequests = async () => {
    try {
      // Load corner with commission rate
      const { data: corner } = await supabase
        .from("corners")
        .select("id, commission_rate")
        .eq("user_id", user?.id)
        .single();

      // Load direct-to-centro multiplier from platform settings
      const { data: multiplierSetting } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "direct_to_centro_commission_multiplier")
        .single();

      if (multiplierSetting) {
        setDirectMultiplier(multiplierSetting.value);
      }

      if (corner) {
        setCornerId(corner.id);
        setCornerRate(corner.commission_rate || 10);
        await loadRequests(corner.id);
      }
    } catch (error) {
      console.error("Error loading corner:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async (cornerId: string) => {
    const { data, error } = await supabase
      .from("repair_requests")
      .select(`
        *,
        customer:customers(name, phone, email)
      `)
      .eq("corner_id", cornerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading requests:", error);
      return;
    }

    const requestsWithData = await Promise.all(
      (data || []).map(async (req) => {
        let centro = null;
        let quote = null;

        if (req.assigned_provider_type === "centro" && req.assigned_provider_id) {
          const { data: centroData } = await supabase
            .from("centri_assistenza")
            .select("business_name")
            .eq("id", req.assigned_provider_id)
            .single();
          centro = centroData;
        }

        const { data: quoteData } = await supabase
          .from("quotes")
          .select("id, total_cost, parts_cost, status, signed_at, signature_data, items, created_at, payment_collection_method")
          .eq("repair_request_id", req.id)
          .order("signed_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        quote = quoteData;

        return { ...req, centro, quote };
      })
    );

    setRequests(requestsWithData);
  };

  const toggleQuoteExpanded = (requestId: string) => {
    setExpandedQuotes(prev => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  };

  const parseQuoteItems = (itemsJson: string): QuoteItem[] => {
    try {
      return JSON.parse(itemsJson);
    } catch {
      return [];
    }
  };

  const handleOpenSignature = (quoteId: string, requestId: string, totalCost: number, deviceInfo: string) => {
    setSelectedQuoteForSignature({ quoteId, requestId, totalCost, deviceInfo });
    setSignatureDialogOpen(true);
  };

  const handleSignatureSuccess = async () => {
    if (selectedQuoteForSignature) {
      const { error } = await supabase
        .from("repair_requests")
        .update({
          status: "awaiting_pickup",
          quote_accepted_at: new Date().toISOString(),
          awaiting_pickup_at: new Date().toISOString(),
        })
        .eq("id", selectedQuoteForSignature.requestId);

      if (error) {
        console.error("Error updating repair request:", error);
        toast.error("Errore nell'aggiornamento dello stato");
      } else {
        toast.success("Preventivo firmato! Il Centro riceverà una notifica per il ritiro del dispositivo.");
      }
    }

    if (cornerId) {
      await loadRequests(cornerId);
    }
    setSelectedQuoteForSignature(null);
  };

  const handleDelivery = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("repair_requests")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Dispositivo consegnato al cliente!");
      if (cornerId) {
        await loadRequests(cornerId);
      }
    } catch (error) {
      console.error("Error delivering:", error);
      toast.error("Errore nella consegna");
    }
  };

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.device_brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.device_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.issue_description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = [
    {
      label: "Totale",
      value: requests.length,
      icon: FileText,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-500/20 to-cyan-500/10",
    },
    {
      label: "In Attesa",
      value: requests.filter((r) => r.status === "pending" || r.status === "assigned").length,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-500/20 to-orange-500/10",
    },
    {
      label: "Preventivi",
      value: requests.filter((r) => r.status === "quote_sent" || r.status === "quote_accepted").length,
      icon: FileText,
      gradient: "from-violet-500 to-purple-500",
      bgGradient: "from-violet-500/20 to-purple-500/10",
    },
    {
      label: "In Lavoro",
      value: requests.filter((r) => ['awaiting_pickup', 'picked_up', 'in_diagnosis', 'waiting_for_parts', 'in_repair'].includes(r.status)).length,
      icon: Wrench,
      gradient: "from-blue-600 to-indigo-600",
      bgGradient: "from-blue-600/20 to-indigo-600/10",
    },
    {
      label: "Al Corner",
      value: requests.filter((r) => r.status === "at_corner").length,
      icon: Store,
      gradient: "from-pink-500 to-rose-500",
      bgGradient: "from-pink-500/20 to-rose-500/10",
    },
    {
      label: "Consegnate",
      value: requests.filter((r) => r.status === "delivered").length,
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-green-500",
      bgGradient: "from-emerald-500/20 to-green-500/10",
    },
  ];

  if (loading) {
    return (
      <CornerLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">Caricamento segnalazioni...</p>
          </div>
        </div>
      </CornerLayout>
    );
  }

  return (
    <CornerLayout>
      <div className="space-y-6">
        {/* Hero Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 text-white"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6" />
                <h1 className="text-2xl sm:text-3xl font-bold">Le Mie Segnalazioni</h1>
              </div>
              <p className="text-white/80">Gestisci e monitora tutte le tue segnalazioni di riparazione</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setHideEarnings(!hideEarnings)}
                className="bg-white/20 hover:bg-white/30 text-white"
                title={hideEarnings ? "Mostra guadagni" : "Nascondi guadagni (per firma cliente)"}
              >
                {hideEarnings ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>
              <Button 
                onClick={() => navigate("/corner/nuova-segnalazione")}
                className="bg-white text-violet-700 hover:bg-white/90 shadow-lg font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuova Segnalazione
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`relative overflow-hidden border-0 bg-gradient-to-br ${stat.bgGradient} backdrop-blur-sm hover:shadow-lg transition-all duration-300 cursor-pointer`}>
                <div className={`absolute inset-0 bg-gradient-to-r ${stat.gradient} opacity-5`} />
                <CardContent className="p-3 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                        {stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient} shadow-md`}>
                      <stat.icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per cliente, dispositivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background/50 border-border/50 focus:border-primary/50"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-background/50 border-border/50">
              <SelectValue placeholder="Tutti gli stati" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="pending">In Attesa</SelectItem>
              <SelectItem value="quote_sent">Preventivo Inviato</SelectItem>
              <SelectItem value="quote_accepted">Preventivo Accettato</SelectItem>
              <SelectItem value="awaiting_pickup">In Attesa Ritiro</SelectItem>
              <SelectItem value="picked_up">Ritirato</SelectItem>
              <SelectItem value="in_diagnosis">In Diagnosi</SelectItem>
              <SelectItem value="waiting_for_parts">Attesa Ricambi</SelectItem>
              <SelectItem value="in_repair">In Riparazione</SelectItem>
              <SelectItem value="repair_completed">Riparato</SelectItem>
              <SelectItem value="at_corner">Al Corner</SelectItem>
              <SelectItem value="delivered">Consegnato</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Alert for devices at Corner */}
        {requests.filter((r) => r.status === "at_corner").length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="relative overflow-hidden border-2 border-emerald-500/50 bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-teal-500/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg">
                    <Store className="h-6 w-6 text-white animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {requests.filter((r) => r.status === "at_corner").length} dispositivi pronti per il ritiro cliente
                    </p>
                    <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70">
                      Contatta i clienti per la consegna
                    </p>
                  </div>
                  <AlertCircle className="h-5 w-5 text-emerald-500 animate-bounce" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Requests List */}
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Card className="border-dashed border-2">
                <CardContent className="p-12 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Smartphone className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium text-muted-foreground mb-2">Nessuna segnalazione trovata</p>
                  <p className="text-sm text-muted-foreground/70 mb-6">Inizia creando la tua prima segnalazione di riparazione</p>
                  <Button
                    onClick={() => navigate("/corner/nuova-segnalazione")}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crea la prima segnalazione
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            filteredRequests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`group hover:shadow-xl transition-all duration-300 overflow-hidden ${
                  request.status === 'at_corner' 
                    ? 'border-2 border-emerald-500/50 shadow-emerald-500/10' 
                    : 'hover:border-primary/30'
                }`}>
                  {/* Delivery Banner with Forfeiture Warning */}
                  {request.status === "at_corner" && (() => {
                    const daysLeft = getDaysUntilForfeiture(request.at_corner_at);
                    const isUrgent = daysLeft !== null && daysLeft <= 7;
                    const isCritical = daysLeft !== null && daysLeft <= 3;
                    
                    return (
                      <div className={`p-4 ${isCritical 
                        ? 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600' 
                        : isUrgent 
                          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600'
                          : 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500'
                      } text-white`}>
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                              {isCritical ? <AlertTriangle className="h-6 w-6 animate-pulse" /> : <Package className="h-6 w-6" />}
                            </div>
                            <div>
                              <p className="font-semibold text-lg">
                                {isCritical ? '⚠️ Ritiro Urgente!' : 'Dispositivo Pronto!'}
                              </p>
                              <p className="text-sm text-white/80">
                                {daysLeft !== null && daysLeft > 0 
                                  ? `${daysLeft} giorni rimanenti per il ritiro`
                                  : daysLeft === 0 
                                    ? 'Ultimo giorno per il ritiro!'
                                    : 'Dispositivo in decadenza'
                                }
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {daysLeft !== null && (
                              <Badge className={`${isCritical 
                                ? 'bg-white text-red-600 animate-pulse' 
                                : isUrgent 
                                  ? 'bg-white text-amber-600' 
                                  : 'bg-white/20 text-white'
                              } font-bold text-sm px-3 py-1`}>
                                <Clock className="h-3.5 w-3.5 mr-1" />
                                {daysLeft}g
                              </Badge>
                            )}
                            <Button
                              onClick={() => handleDelivery(request.id)}
                              className={`${isCritical 
                                ? 'bg-white text-red-600 hover:bg-white/90' 
                                : 'bg-white text-emerald-600 hover:bg-white/90 hover:text-emerald-700'
                              } font-semibold shadow-lg`}
                            >
                              <CheckCircle2 className="h-5 w-5 mr-2" />
                              Consegna
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        {/* Device & Status */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary/10">
                              <Smartphone className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-semibold text-lg">
                              {request.device_brand} {request.device_model}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs bg-muted/50">
                            {request.device_type}
                          </Badge>
                          <Badge className={`${getStatusColor(request.status)} shadow-sm`}>
                            {getStatusLabel(request.status)}
                          </Badge>
                          {request.quote && (
                            <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-300">
                              <FileText className="h-3 w-3 mr-1" />
                              Preventivo
                            </Badge>
                          )}
                          {/* Via Corner collection badge */}
                          {request.quote?.payment_collection_method === 'via_corner' && (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-300">
                              💰 Incasso Tuo
                            </Badge>
                          )}
                          {/* Forfeiture countdown badge */}
                          {request.status === "at_corner" && (() => {
                            const daysLeft = getDaysUntilForfeiture(request.at_corner_at);
                            if (daysLeft === null) return null;
                            const isCritical = daysLeft <= 3;
                            const isUrgent = daysLeft <= 7;
                            return (
                              <Badge className={`${isCritical 
                                ? 'bg-red-500 text-white animate-pulse' 
                                : isUrgent 
                                  ? 'bg-amber-500 text-white' 
                                  : 'bg-blue-500/10 text-blue-600 border-blue-300'
                              }`}>
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Ritira entro {daysLeft}g
                              </Badge>
                            );
                          })()}
                        </div>

                        {/* Issue Description */}
                        <p className="text-sm text-muted-foreground line-clamp-2 bg-muted/30 p-2 rounded-lg">
                          {request.issue_description}
                        </p>

                        {/* Customer Info */}
                        {request.customer && (
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <span className="font-medium text-foreground flex items-center gap-1.5">
                              <div className="p-1 rounded bg-primary/10">
                                <FileText className="h-3 w-3 text-primary" />
                              </div>
                              {request.customer.name}
                            </span>
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <Phone className="h-3.5 w-3.5" />
                              {request.customer.phone}
                            </span>
                            {request.customer.email && (
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Mail className="h-3.5 w-3.5" />
                                {request.customer.email}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Centro Assignment */}
                        {request.centro && (
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                              <Building2 className="h-3 w-3 mr-1" />
                              Assegnata a: {request.centro.business_name}
                            </Badge>
                          </div>
                        )}

                        {/* Workflow Timeline */}
                        {!['pending', 'assigned'].includes(request.status) && (
                          <div className="pt-3 border-t border-border/50">
                            <RepairWorkflowTimeline 
                              currentStatus={request.status} 
                              compact 
                              isDirectToCentro={request.corner_direct_to_centro === true}
                              timestamps={{
                                created_at: request.created_at,
                                quote_sent_at: request.quote_sent_at,
                                quote_accepted_at: request.quote_accepted_at,
                                awaiting_pickup_at: request.awaiting_pickup_at,
                                picked_up_at: request.picked_up_at,
                                in_diagnosis_at: request.in_diagnosis_at,
                                waiting_for_parts_at: request.waiting_for_parts_at,
                                in_repair_at: request.in_repair_at,
                                repair_completed_at: request.repair_completed_at,
                                ready_for_return_at: request.ready_for_return_at,
                                at_corner_at: request.at_corner_at,
                                delivered_at: request.delivered_at,
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Price & Commission */}
                      <div className="flex flex-col items-end gap-2 min-w-[140px]">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(request.created_at), "dd MMM yyyy", { locale: it })}
                        </div>
                        
                        {request.quote ? (
                          (() => {
                            const isDirectToCentro = request.corner_direct_to_centro === true;
                            const grossMargin = request.quote.total_cost - (request.quote.parts_cost || 0);
                            // Direct-to-centro: Corner gets 5% (half commission), otherwise 10%
                            const cornerRate = isDirectToCentro ? 0.05 : 0.10;
                            const cornerCommission = grossMargin * cornerRate;
                            return (
                              <div className="text-right space-y-1">
                                <div className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                                  €{request.quote.total_cost.toFixed(2)}
                                </div>
                                {!hideEarnings && cornerCommission > 0 && (
                                  <div className="inline-flex items-center gap-1.5 text-sm font-medium bg-gradient-to-r from-emerald-500/10 to-green-500/10 text-emerald-600 px-3 py-1 rounded-full border border-emerald-500/20">
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    €{cornerCommission.toFixed(2)}
                                    {isDirectToCentro && <span className="text-xs opacity-70">(5%)</span>}
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : request.estimated_cost ? (
                          <div className="text-right">
                            <div className="text-xl font-semibold">€{request.estimated_cost.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">(compenso da definire)</div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Quote Details Collapsible */}
                    {request.quote && (
                      <Collapsible 
                        open={expandedQuotes.has(request.id)}
                        onOpenChange={() => toggleQuoteExpanded(request.id)}
                        className="mt-4"
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-between bg-muted/30 hover:bg-muted/50 border-border/50">
                            <span className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-violet-500" />
                              Dettagli Preventivo
                              <Badge variant="secondary" className={`ml-2 ${request.quote.signed_at ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                {request.quote.signed_at 
                                  ? "✓ Firmato" 
                                  : quoteStatusLabels[request.quote.status] || request.quote.status}
                              </Badge>
                            </span>
                            {expandedQuotes.has(request.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3">
                          <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-5 space-y-4 border border-border/30">
                            <div className="text-sm text-muted-foreground">
                              Creato: {format(new Date(request.quote.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                            </div>
                            
                            {/* Items List */}
                            <div className="space-y-2">
                              {parseQuoteItems(request.quote.items).map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between py-2 px-3 bg-background/50 rounded-lg border border-border/30">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                                      item.type === 'part' ? 'bg-blue-500/10' :
                                      item.type === 'labor' ? 'bg-amber-500/10' : 'bg-purple-500/10'
                                    }`}>
                                      {item.type === 'part' && <Package className="h-4 w-4 text-blue-600" />}
                                      {item.type === 'labor' && <Wrench className="h-4 w-4 text-amber-600" />}
                                      {item.type === 'service' && <Headphones className="h-4 w-4 text-purple-600" />}
                                    </div>
                                    <span className="text-sm truncate">{item.description}</span>
                                    {item.quantity > 1 && (
                                      <Badge variant="secondary" className="text-xs">x{item.quantity}</Badge>
                                    )}
                                  </div>
                                  <span className="font-semibold text-sm">€{item.total.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>

                            {/* Total */}
                            <div className="flex justify-between items-center pt-3 border-t border-border/50 font-semibold">
                              <span>Totale Preventivo</span>
                              <span className="text-xl bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                                €{request.quote.total_cost.toFixed(2)}
                              </span>
                            </div>
                            
                            {/* Corner Commission - Reduced if direct-to-centro based on platform setting */}
                            {(() => {
                              const isDirectToCentro = request.corner_direct_to_centro === true;
                              const grossMargin = request.quote.total_cost - (request.quote.parts_cost || 0);
                              // Apply direct multiplier if direct-to-centro (e.g., 50% of normal rate)
                              const effectiveRate = isDirectToCentro 
                                ? (cornerRate * directMultiplier / 100) / 100 
                                : cornerRate / 100;
                              const displayRate = isDirectToCentro 
                                ? (cornerRate * directMultiplier / 100).toFixed(1)
                                : cornerRate.toString();
                              const cornerCommission = grossMargin * effectiveRate;
                              const isViaCorner = request.quote.payment_collection_method === 'via_corner';
                              const amountToRemitToCentro = request.quote.total_cost - cornerCommission;
                              // Check if customer has paid (for direct-to-centro)
                              const customerPaid = request.customer_paid_at != null;
                              
                              return (
                                <>
                                  {/* Show commission */}
                                  {!hideEarnings && cornerCommission > 0 && (
                                    <div className={`flex justify-between items-center rounded-xl p-4 border ${
                                      isDirectToCentro && !customerPaid 
                                        ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20'
                                        : 'bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/20'
                                    }`}>
                                      <div>
                                        <span className={`font-medium flex items-center gap-2 ${
                                          isDirectToCentro && !customerPaid 
                                            ? 'text-amber-700 dark:text-amber-400'
                                            : 'text-emerald-700 dark:text-emerald-400'
                                        }`}>
                                          <TrendingUp className="h-4 w-4" />
                                          Tuo Compenso ({displayRate}% margine)
                                          {isDirectToCentro && <Badge variant="secondary" className="text-xs">ridotto ({directMultiplier}%)</Badge>}
                                        </span>
                                        <p className={`text-xs ${isDirectToCentro && !customerPaid ? 'text-amber-600/70' : 'text-emerald-600/70'}`}>
                                          Margine: €{grossMargin.toFixed(2)}
                                        </p>
                                        {isDirectToCentro && !customerPaid && (
                                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            In attesa che il cliente paghi il Centro
                                          </p>
                                        )}
                                      </div>
                                      <span className={`text-xl font-bold ${
                                        isDirectToCentro && !customerPaid ? 'text-amber-600' : 'text-emerald-600'
                                      }`}>€{cornerCommission.toFixed(2)}</span>
                                    </div>
                                  )}
                                  
                                  {/* Collection Info for Via Corner - only if NOT direct-to-centro */}
                                  {isViaCorner && !isDirectToCentro && (
                                    <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 rounded-xl p-4 border-2 border-amber-500/30 space-y-3">
                                      <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-amber-500/20">
                                          <Store className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <div>
                                          <h4 className="font-semibold text-amber-700 dark:text-amber-400">
                                            💰 Incasso Tramite Te
                                          </h4>
                                          <p className="text-xs text-amber-600/70">Il Centro ha selezionato l'incasso tramite Corner</p>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-2 pt-2 border-t border-amber-500/20">
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm text-amber-700 dark:text-amber-400">Da incassare dal cliente:</span>
                                          <span className="font-bold text-lg text-amber-600">€{request.quote.total_cost.toFixed(2)}</span>
                                        </div>
                                        {!hideEarnings && (
                                          <div className="flex justify-between items-center">
                                            <span className="text-sm text-emerald-700 dark:text-emerald-400">Trattieni (tua commissione):</span>
                                            <span className="font-semibold text-emerald-600">- €{cornerCommission.toFixed(2)}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between items-center pt-2 border-t border-amber-500/20">
                                          <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Da versare al Centro:</span>
                                          <span className="font-bold text-xl text-amber-700 dark:text-amber-400">€{amountToRemitToCentro.toFixed(2)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}

                            {/* Signature Section */}
                            {request.quote.signature_data && (
                              <div className="p-4 bg-background rounded-xl border border-border/50">
                                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                                  <PenTool className="h-3.5 w-3.5" />
                                  Firma Cliente:
                                </p>
                                <img 
                                  src={request.quote.signature_data} 
                                  alt="Firma cliente" 
                                  className="max-h-16 border rounded-lg bg-white p-1"
                                />
                                {request.quote.signed_at && (
                                  <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Firmato il {format(new Date(request.quote.signed_at), "dd MMM yyyy HH:mm", { locale: it })}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Sign Button */}
                            <Button
                              onClick={() => handleOpenSignature(
                                request.quote!.id, 
                                request.id, 
                                request.quote!.total_cost,
                                `${request.device_brand || ''} ${request.device_model || ''} - ${request.device_type}`.trim()
                              )}
                              variant={request.quote.signed_at ? "outline" : "default"}
                              className={request.quote.signed_at 
                                ? "w-full" 
                                : "w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg"
                              }
                            >
                              <PenTool className="h-4 w-4 mr-2" />
                              {request.quote.signed_at ? "Raccogli Nuova Firma" : "Fai Firmare al Cliente"}
                            </Button>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Signature Dialog */}
      {selectedQuoteForSignature && (
        <SignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          quoteId={selectedQuoteForSignature.quoteId}
          onSuccess={handleSignatureSuccess}
          totalCost={selectedQuoteForSignature.totalCost}
          deviceInfo={selectedQuoteForSignature.deviceInfo}
        />
      )}
    </CornerLayout>
  );
}
