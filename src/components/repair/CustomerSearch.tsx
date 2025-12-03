import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, UserPlus, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  address: string | null;
}

interface CustomerSearchProps {
  onSelectCustomer: (customer: Customer | null) => void;
  onCreateNew: () => void;
  centroId?: string | null;
}

export const CustomerSearch = ({ onSelectCustomer, onCreateNew, centroId }: CustomerSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const searchCustomers = async () => {
      if (searchTerm.length < 2) {
        setCustomers([]);
        return;
      }

      setLoading(true);
      try {
        let query = supabase
          .from("customers")
          .select("*")
          .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .limit(5);
        
        // Filter by centro_id if provided
        if (centroId) {
          query = query.eq("centro_id", centroId);
        }

        const { data, error } = await query;

        if (error) throw error;
        setCustomers(data || []);
        setShowSuggestions(true);
      } catch (error: any) {
        console.error("Search error:", error);
        toast.error("Errore durante la ricerca");
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, centroId]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    onSelectCustomer(customer);
    setSearchTerm(customer.name);
    setShowSuggestions(false);
  };

  const handleClearSelection = () => {
    setSelectedCustomer(null);
    onSelectCustomer(null);
    setSearchTerm("");
  };

  return (
    <div className="space-y-6">
      {selectedCustomer ? (
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedCustomer.name}</p>
                  <p className="text-xs text-muted-foreground">Cliente Selezionato</p>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{selectedCustomer.phone}</span>
                </div>
                {selectedCustomer.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{selectedCustomer.email}</span>
                  </div>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="text-muted-foreground hover:text-foreground"
            >
              Cambia
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="customer-search" className="text-base font-semibold">
              Cerca Cliente Esistente
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="customer-search"
                placeholder="Digita nome, telefono o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => customers.length > 0 && setShowSuggestions(true)}
                className="pl-9 h-11"
              />
              
              {showSuggestions && customers.length > 0 && (
                <div className="absolute z-50 w-full mt-2">
                  <Card className="p-1 shadow-xl border-border/50 bg-card/95 backdrop-blur-sm">
                    <div className="max-h-60 overflow-y-auto">
                      {customers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleSelectCustomer(customer)}
                          className="w-full text-left p-3 hover:bg-accent/50 rounded-md transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <span className="text-sm font-bold text-primary">
                                {customer.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground truncate">{customer.name}</div>
                              <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {customer.phone}
                                </span>
                                {customer.email && (
                                  <span className="flex items-center gap-1 truncate">
                                    <Mail className="h-3 w-3" />
                                    {customer.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </Card>
                </div>
              )}
            </div>
            {loading && (
              <p className="text-sm text-muted-foreground animate-pulse">Ricerca in corso...</p>
            )}
            {searchTerm.length >= 2 && customers.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">Nessun cliente trovato</p>
            )}
          </div>
        </>
      )}

      {!selectedCustomer && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground font-medium">oppure</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onCreateNew}
            className="w-full h-11 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Crea Nuovo Cliente
          </Button>
        </>
      )}
    </div>
  );
};
