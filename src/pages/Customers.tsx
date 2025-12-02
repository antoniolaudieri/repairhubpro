import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Eye,
  Users,
  Wrench,
  ChevronRight,
  Calendar,
  User
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

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [repairCounts, setRepairCounts] = useState<Record<string, number>>({});

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, email, phone, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
      setFilteredCustomers(data || []);

      // Load repair counts for each customer
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
  }, []);

  useEffect(() => {
    const filtered = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery)
    );
    setFilteredCustomers(filtered);
  }, [searchQuery, customers]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto mb-4" />
            <Users className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground font-medium">Caricamento clienti...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-card via-card to-violet-500/5 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Clienti
              </h1>
              <p className="text-muted-foreground mt-1">
                {filteredCustomers.length} clienti registrati
              </p>
            </div>
            <Button 
              onClick={() => setDialogOpen(true)} 
              size="lg"
              className="gap-2 shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-primary/90"
            >
              <Plus className="h-5 w-5" />
              Nuovo Cliente
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome, email o telefono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base bg-card border-border/50 shadow-sm"
            />
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
              <Card className="p-12 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nessun cliente trovato</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  {searchQuery
                    ? "Prova a modificare i criteri di ricerca"
                    : "Inizia aggiungendo il tuo primo cliente"}
                </p>
              </Card>
            </motion.div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCustomers.map((customer, index) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <Card
                    className="p-0 overflow-hidden hover:shadow-lg transition-all cursor-pointer border-border/50 group"
                    onClick={() => navigate(`/customers/${customer.id}`)}
                  >
                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl font-bold text-violet-600">
                            {customer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate text-lg">
                            {customer.name}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Cliente dal {new Date(customer.created_at).toLocaleDateString("it-IT", { month: "short", year: "numeric" })}
                          </div>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className="flex-shrink-0 gap-1 bg-primary/10 text-primary"
                        >
                          <Wrench className="h-3 w-3" />
                          {repairCounts[customer.id] || 0}
                        </Badge>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-2">
                        {customer.email && (
                          <a 
                            href={`mailto:${customer.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group/link"
                          >
                            <Mail className="h-4 w-4 text-muted-foreground group-hover/link:text-primary transition-colors" />
                            <span className="text-sm truncate">{customer.email}</span>
                          </a>
                        )}
                        <a 
                          href={`tel:${customer.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group/link"
                        >
                          <Phone className="h-4 w-4 text-muted-foreground group-hover/link:text-primary transition-colors" />
                          <span className="text-sm font-medium">{customer.phone}</span>
                        </a>
                      </div>

                      {/* Footer */}
                      <div className="mt-4 pt-4 border-t border-border/50 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-primary hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${customer.id}`);
                          }}
                        >
                          Dettagli
                          <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        <CustomerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={loadCustomers}
        />
      </div>
    </div>
  );
}
