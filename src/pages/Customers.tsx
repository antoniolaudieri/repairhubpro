import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Mail, Phone, Eye } from "lucide-react";
import { toast } from "sonner";
import { CustomerDialog } from "@/components/customers/CustomerDialog";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Clienti</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Gestisci la tua base clienti</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto shadow-md">
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Cliente
          </Button>
        </div>

        <Card className="shadow-card hover:shadow-card-hover transition-shadow border-border/50">
          <CardHeader className="space-y-4">
            <CardTitle className="text-xl lg:text-2xl">Lista Clienti</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, email o telefono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-background/50"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? "Nessun cliente trovato" : "Nessun cliente registrato"}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold">Nome</TableHead>
                        <TableHead className="font-semibold">Contatti</TableHead>
                        <TableHead className="font-semibold">Riparazioni</TableHead>
                        <TableHead className="text-right font-semibold">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id} className="group hover:bg-muted/50">
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{customer.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Cliente dal {new Date(customer.created_at).toLocaleDateString("it-IT")}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {customer.email && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-foreground">{customer.email}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-foreground">{customer.phone}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-medium">
                              {repairCounts[customer.id] || 0} riparazioni
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/customers/${customer.id}`)}
                              className="hover:bg-primary/10 hover:text-primary"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Dettagli
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="p-4 rounded-xl border bg-gradient-card hover:shadow-md transition-all cursor-pointer"
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">{customer.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            Cliente dal {new Date(customer.created_at).toLocaleDateString("it-IT")}
                          </p>
                        </div>
                        <Badge variant="secondary" className="font-medium text-xs">
                          {repairCounts[customer.id] || 0}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-foreground truncate">{customer.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-foreground">{customer.phone}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${customer.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Dettagli
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <CustomerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={loadCustomers}
        />
      </div>
    </div>
  );
}
