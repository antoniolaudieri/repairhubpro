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
}

export const CustomerSearch = ({ onSelectCustomer, onCreateNew }: CustomerSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const searchCustomers = async () => {
      if (searchTerm.length < 2) {
        setCustomers([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .limit(5);

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
  }, [searchTerm]);

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    setSearchTerm(customer.name);
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer-search">Cerca Cliente Esistente</Label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="customer-search"
            placeholder="Nome, telefono o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => customers.length > 0 && setShowSuggestions(true)}
            className="pl-9"
          />
          
          {showSuggestions && customers.length > 0 && (
            <Card className="absolute z-10 w-full mt-1 p-2 max-h-60 overflow-y-auto">
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full text-left p-3 hover:bg-accent rounded-md transition-colors"
                >
                  <div className="font-medium">{customer.name}</div>
                  <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </span>
                    {customer.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {customer.email}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </Card>
          )}
        </div>
        {loading && (
          <p className="text-sm text-muted-foreground">Ricerca in corso...</p>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">oppure</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onCreateNew}
        className="w-full"
      >
        <UserPlus className="mr-2 h-4 w-4" />
        Crea Nuovo Cliente
      </Button>
    </div>
  );
};
