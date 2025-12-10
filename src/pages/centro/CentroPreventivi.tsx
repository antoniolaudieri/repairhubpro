import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Edit, 
  Send,
  Plus,
  Euro,
  PenLine,
  Eye,
  Mail,
  MessageCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { EditQuoteDialog } from "@/components/quotes/EditQuoteDialog";
import { CreateQuoteDialog } from "@/components/quotes/CreateQuoteDialog";
import { QuotePDFPreview } from "@/components/quotes/QuotePDFPreview";
import { motion } from "framer-motion";

interface Quote {
  id: string;
  customer_id: string;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  issue_description: string;
  diagnosis: string | null;
  notes: string | null;
  items: any;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  status: string;
  valid_until: string | null;
  signed_at: string | null;
  created_at: string;
  repair_request_id: string | null;
  customers: {
    name: string;
    email: string | null;
    phone: string;
  } | null;
}

export default function CentroPreventivi() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [centroId, setCentroId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [centroInfo, setCentroInfo] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);

  // Load centro info for PDF
  useEffect(() => {
    const loadCentroInfo = async () => {
      if (!centroId) return;
      const { data } = await supabase
        .from("centri_assistenza")
        .select("*")
        .eq("id", centroId)
        .single();
      if (data) setCentroInfo(data);
    };
    loadCentroInfo();
  }, [centroId]);

  const handleSendQuote = async (method: "email" | "whatsapp") => {
    if (!selectedQuote || !selectedQuote.customers) return;
    
    setIsSending(true);
    try {
      const { downloadQuotePDF, getQuotePDFBase64 } = await import("@/components/quotes/QuotePDFGenerator");
      
      const pdfData = {
        customerName: selectedQuote.customers.name,
        customerEmail: selectedQuote.customers.email || "",
        customerPhone: selectedQuote.customers.phone,
        deviceType: selectedQuote.device_type,
        deviceBrand: selectedQuote.device_brand || "",
        deviceModel: selectedQuote.device_model || "",
        issueDescription: selectedQuote.issue_description,
        diagnosis: selectedQuote.diagnosis || "",
        notes: selectedQuote.notes || "",
        items: Array.isArray(selectedQuote.items) ? selectedQuote.items : [],
        laborCost: selectedQuote.labor_cost,
        partsCost: selectedQuote.parts_cost,
        totalCost: selectedQuote.total_cost,
        validUntil: selectedQuote.valid_until || "",
        centroInfo: centroInfo ? {
          name: centroInfo.business_name,
          address: centroInfo.address,
          phone: centroInfo.phone,
          email: centroInfo.email,
          vatNumber: centroInfo.vat_number,
          logoUrl: centroInfo.logo_url
        } : undefined
      };

      if (method === "whatsapp") {
        downloadQuotePDF(pdfData);
        const customerPhone = selectedQuote.customers.phone?.replace(/\D/g, "") || "";
        const message = `Buongiorno ${selectedQuote.customers.name},\n\nLe invio il preventivo per la riparazione del suo ${selectedQuote.device_type} ${selectedQuote.device_brand || ""} ${selectedQuote.device_model || ""}.\n\nTotale: €${selectedQuote.total_cost.toFixed(2)}\n\nTroverà il PDF scaricato. Rimango a disposizione per qualsiasi chiarimento.\n\nCordiali saluti`;
        const whatsappUrl = `https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");
        toast.success("PDF scaricato e WhatsApp aperto");
      } else {
        const base64 = await getQuotePDFBase64(pdfData);
        const { error } = await supabase.functions.invoke("send-email-smtp", {
          body: {
            to: selectedQuote.customers.email,
            subject: `Preventivo Riparazione - ${selectedQuote.device_type} ${selectedQuote.device_brand || ""}`,
            html: `<p>Gentile ${selectedQuote.customers.name},</p><p>In allegato trova il preventivo per la riparazione del suo dispositivo.</p><p><strong>Totale: €${selectedQuote.total_cost.toFixed(2)}</strong></p><p>Rimaniamo a disposizione per qualsiasi chiarimento.</p><p>Cordiali saluti,<br/>${centroInfo?.business_name || "Il Team"}</p>`,
            centro_id: centroId,
            attachments: [{
              filename: `preventivo_${selectedQuote.customers.name.replace(/\s+/g, "_")}.pdf`,
              content: base64,
              encoding: "base64"
            }]
          }
        });
        if (error) throw error;
        toast.success("Email inviata con successo");
      }
      
      // Update quote status
      await supabase.from("quotes").update({ status: "pending" }).eq("id", selectedQuote.id);
      if (centroId) loadQuotes(centroId);
      setPdfPreviewOpen(false);
    } catch (error: any) {
      console.error("Error sending quote:", error);
      toast.error("Errore nell'invio: " + (error.message || "Riprova"));
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (user) fetchCentroAndQuotes();
  }, [user]);

  const fetchCentroAndQuotes = async () => {
    try {
      const { data: centro } = await supabase
        .from("centri_assistenza")
        .select("id")
        .eq("owner_user_id", user?.id)
        .single();

      if (!centro) {
        setLoading(false);
        return;
      }
      setCentroId(centro.id);
      await loadQuotes(centro.id);
    } catch (error: any) {
      console.error("Error loading quotes:", error);
      toast.error("Errore nel caricamento preventivi");
    } finally {
      setLoading(false);
    }
  };

  const loadQuotes = async (centroId: string) => {
    const { data: directQuotes, error: directError } = await supabase
      .from("quotes")
      .select(`
        *,
        customers!inner (
          name,
          email,
          phone,
          centro_id
        )
      `)
      .eq("customers.centro_id", centroId)
      .order("created_at", { ascending: false });

    if (directError) {
      console.error("Error loading direct quotes:", directError);
    }

    const { data: requestQuotes, error: requestError } = await supabase
      .from("quotes")
      .select(`
        *,
        customers (
          name,
          email,
          phone
        )
      `)
      .not("repair_request_id", "is", null)
      .order("created_at", { ascending: false });

    if (requestError) {
      console.error("Error loading request quotes:", requestError);
    }

    let filteredRequestQuotes: Quote[] = [];
    if (requestQuotes && requestQuotes.length > 0) {
      const repairRequestIds = requestQuotes
        .map(q => q.repair_request_id)
        .filter(Boolean);
      
      if (repairRequestIds.length > 0) {
        const { data: assignedRequests } = await supabase
          .from("repair_requests")
          .select("id")
          .eq("assigned_provider_id", centroId)
          .eq("assigned_provider_type", "centro")
          .in("id", repairRequestIds);

        const assignedIds = new Set((assignedRequests || []).map(r => r.id));
        filteredRequestQuotes = requestQuotes.filter(q => 
          q.repair_request_id && assignedIds.has(q.repair_request_id)
        );
      }
    }

    const allQuotes = [...(directQuotes || []), ...filteredRequestQuotes];
    const uniqueQuotes = allQuotes.reduce((acc, quote) => {
      if (!acc.find(q => q.id === quote.id)) {
        acc.push(quote);
      }
      return acc;
    }, [] as Quote[]);

    uniqueQuotes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setQuotes(uniqueQuotes);
    setFilteredQuotes(uniqueQuotes);
  };

  useEffect(() => {
    let filtered = quotes;
    
    if (searchQuery) {
      filtered = filtered.filter((quote) =>
        quote.customers?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quote.device_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quote.device_brand?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      if (statusFilter === "signed") {
        filtered = filtered.filter(q => q.signed_at);
      } else {
        filtered = filtered.filter(q => q.status === statusFilter && !q.signed_at);
      }
    }

    setFilteredQuotes(filtered);
  }, [searchQuery, quotes, statusFilter]);

  // Stats
  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === "pending" && !q.signed_at).length,
    signed: quotes.filter(q => q.signed_at).length,
    rejected: quotes.filter(q => q.status === "rejected").length,
    totalValue: quotes.reduce((sum, q) => sum + q.total_cost, 0),
    signedValue: quotes.filter(q => q.signed_at).reduce((sum, q) => sum + q.total_cost, 0),
  };

  const getStatusBadge = (status: string, signedAt: string | null) => {
    if (signedAt) {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
          <CheckCircle className="h-3 w-3 mr-1" />Firmato
        </Badge>
      );
    }
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />In Attesa
          </Badge>
        );
      case "accepted":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />Accettato
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="bg-red-500/20 text-red-600 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />Rifiutato
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleEditQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setEditDialogOpen(true);
  };

  const handleViewPDF = (quote: Quote) => {
    setSelectedQuote(quote);
    setPdfPreviewOpen(true);
  };

  const handleQuoteUpdated = () => {
    if (centroId) {
      loadQuotes(centroId);
    }
    toast.success("Preventivo aggiornato");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <CentroLayout>
      <motion.div 
        className="p-4 sm:p-6 space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Hero Header */}
        <motion.div 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-6"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-elegant">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Preventivi
                </h1>
                <p className="text-muted-foreground">Gestisci e invia preventivi ai tuoi clienti</p>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                onClick={() => setCreateDialogOpen(true)}
                className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 shadow-elegant h-12 px-6"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nuovo Preventivo
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Totali</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="p-2 rounded-xl bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${statusFilter === 'pending' ? 'ring-2 ring-amber-500' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">In Attesa</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                </div>
                <div className="p-2 rounded-xl bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${statusFilter === 'signed' ? 'ring-2 ring-emerald-500' : ''}`}
            onClick={() => setStatusFilter('signed')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Firmati</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.signed}</p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-500/10">
                  <PenLine className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Valore Firmati</p>
                  <p className="text-2xl font-bold text-primary">€{stats.signedValue.toFixed(0)}</p>
                </div>
                <div className="p-2 rounded-xl bg-primary/20">
                  <Euro className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Search & Filter */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per cliente, dispositivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          {statusFilter !== 'all' && (
            <Button variant="outline" onClick={() => setStatusFilter('all')} className="h-11">
              <XCircle className="h-4 w-4 mr-2" />
              Rimuovi Filtro
            </Button>
          )}
        </motion.div>

        {/* Quotes List */}
        <motion.div variants={itemVariants}>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
          ) : filteredQuotes.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery || statusFilter !== 'all' ? "Nessun preventivo trovato" : "Nessun preventivo"}
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery || statusFilter !== 'all' 
                    ? "Prova a modificare i filtri di ricerca" 
                    : "Crea il tuo primo preventivo per iniziare"
                  }
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crea Preventivo
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredQuotes.map((quote, index) => (
                <motion.div
                  key={quote.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="group hover:shadow-lg transition-all duration-300 hover:border-primary/30">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-semibold text-lg truncate">{quote.customers?.name}</h3>
                                {getStatusBadge(quote.status, quote.signed_at)}
                                {quote.repair_request_id && (
                                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                                    Da Corner
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {quote.device_type} {quote.device_brand} {quote.device_model}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(quote.created_at), "dd MMM yyyy 'alle' HH:mm", { locale: it })}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3">
                          <div className="text-right">
                            <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                              €{quote.total_cost.toFixed(2)}
                            </span>
                            {quote.signed_at && (
                              <p className="text-xs text-muted-foreground">
                                Firmato: {format(new Date(quote.signed_at), "dd MMM", { locale: it })}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleViewPDF(quote)}
                              className="h-9 w-9"
                              title="Visualizza PDF"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!quote.signed_at && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditQuote(quote)}
                                className="h-9 w-9"
                                title="Modifica"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Dialogs */}
      {selectedQuote && (
        <>
          <EditQuoteDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            quote={selectedQuote}
            onSuccess={handleQuoteUpdated}
            centroId={centroId}
          />
          <QuotePDFPreview
            open={pdfPreviewOpen}
            onOpenChange={setPdfPreviewOpen}
            customer={{
              id: selectedQuote.customer_id,
              name: selectedQuote.customers?.name || "",
              email: selectedQuote.customers?.email || null,
              phone: selectedQuote.customers?.phone || ""
            }}
            deviceType={selectedQuote.device_type}
            deviceBrand={selectedQuote.device_brand || ""}
            deviceModel={selectedQuote.device_model || ""}
            issueDescription={selectedQuote.issue_description}
            diagnosis={selectedQuote.diagnosis || ""}
            notes={selectedQuote.notes || ""}
            items={Array.isArray(selectedQuote.items) ? selectedQuote.items : []}
            laborCost={selectedQuote.labor_cost}
            partsCost={selectedQuote.parts_cost}
            totalCost={selectedQuote.total_cost}
            centroInfo={centroInfo ? {
              name: centroInfo.business_name,
              address: centroInfo.address,
              phone: centroInfo.phone,
              email: centroInfo.email,
              vatNumber: centroInfo.vat_number,
              logoUrl: centroInfo.logo_url
            } : undefined}
            onSend={handleSendQuote}
            isSending={isSending}
          />
        </>
      )}

      <CreateQuoteDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        centroId={centroId}
        onSuccess={() => {
          if (centroId) loadQuotes(centroId);
          toast.success("Preventivo creato e inviato");
        }}
      />
    </CentroLayout>
  );
}