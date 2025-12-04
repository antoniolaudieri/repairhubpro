import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileText, CheckCircle, Clock, XCircle, Edit, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { EditQuoteDialog } from "@/components/quotes/EditQuoteDialog";

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
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  useEffect(() => {
    if (user) fetchCentroAndQuotes();
  }, [user]);

  const fetchCentroAndQuotes = async () => {
    try {
      // Get centro id
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
    // Get quotes for customers of this centro OR linked to repair_requests assigned to this centro
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

    // Also get quotes linked to repair_requests assigned to this centro
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

    // Filter request quotes by repair_requests assigned to this centro
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

    // Merge and deduplicate
    const allQuotes = [...(directQuotes || []), ...filteredRequestQuotes];
    const uniqueQuotes = allQuotes.reduce((acc, quote) => {
      if (!acc.find(q => q.id === quote.id)) {
        acc.push(quote);
      }
      return acc;
    }, [] as Quote[]);

    // Sort by created_at descending
    uniqueQuotes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setQuotes(uniqueQuotes);
    setFilteredQuotes(uniqueQuotes);
  };

  useEffect(() => {
    const filtered = quotes.filter((quote) =>
      quote.customers?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.device_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.device_brand?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredQuotes(filtered);
  }, [searchQuery, quotes]);

  const getStatusBadge = (status: string, signedAt: string | null) => {
    if (signedAt) {
      return (
        <Badge className="bg-emerald-500 text-white">
          <CheckCircle className="h-3 w-3 mr-1" />Firmato
        </Badge>
      );
    }
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />In Attesa</Badge>;
      case "accepted":
        return <Badge className="bg-emerald-500 text-white"><CheckCircle className="h-3 w-3 mr-1" />Accettato</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rifiutato</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleEditQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setEditDialogOpen(true);
  };

  const handleQuoteUpdated = () => {
    if (centroId) {
      loadQuotes(centroId);
    }
    toast.success("Preventivo aggiornato");
  };

  const handleSendToCustomer = async (quote: Quote) => {
    try {
      await supabase
        .from("quotes")
        .update({ status: "pending" })
        .eq("id", quote.id);

      if (quote.repair_request_id) {
        await supabase
          .from("repair_requests")
          .update({ status: "quote_sent" })
          .eq("id", quote.repair_request_id);
      }

      toast.success("Preventivo inviato al cliente");
      if (centroId) loadQuotes(centroId);
    } catch (error) {
      toast.error("Errore nell'invio del preventivo");
    }
  };

  return (
    <CentroLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Preventivi</h1>
            <p className="text-muted-foreground text-sm">Gestisci i preventivi per i clienti del centro</p>
          </div>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <CardTitle>Lista Preventivi</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per cliente, dispositivo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
              </div>
            ) : filteredQuotes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                {searchQuery ? "Nessun preventivo trovato" : "Nessun preventivo creato"}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="p-4 rounded-xl border bg-card hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg">{quote.customers?.name}</h3>
                              {getStatusBadge(quote.status, quote.signed_at)}
                              {quote.repair_request_id && (
                                <Badge variant="outline" className="text-xs">Da Corner</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {quote.device_type} {quote.device_brand} {quote.device_model}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Creato: {format(new Date(quote.created_at), "dd MMM yyyy", { locale: it })}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-2xl font-bold text-primary">€{quote.total_cost.toFixed(2)}</span>
                        {quote.signed_at && (
                          <p className="text-xs text-muted-foreground">
                            Firmato: {format(new Date(quote.signed_at), "dd MMM yyyy", { locale: it })}
                          </p>
                        )}
                        
                        {/* Actions - only show if not signed */}
                        {!quote.signed_at && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditQuote(quote)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Modifica
                            </Button>
                            {quote.status !== 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => handleSendToCustomer(quote)}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Invia
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Quote Dialog */}
      {selectedQuote && (
        <EditQuoteDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          quote={selectedQuote}
          onSuccess={handleQuoteUpdated}
          centroId={centroId}
        />
      )}
    </CentroLayout>
  );
}
