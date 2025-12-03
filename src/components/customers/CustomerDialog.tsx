import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    address: string | null;
    notes: string | null;
  };
  onSuccess: () => void;
}

export function CustomerDialog({ open, onOpenChange, customer, onSuccess }: CustomerDialogProps) {
  const { user, isCentroAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [centroId, setCentroId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: customer?.name || "",
    email: customer?.email || "",
    phone: customer?.phone || "",
    address: customer?.address || "",
    notes: customer?.notes || "",
  });

  // Fetch centro_id if user is centro_admin
  useEffect(() => {
    const fetchCentroId = async () => {
      if (isCentroAdmin && user) {
        const { data } = await supabase
          .from("centri_assistenza")
          .select("id")
          .eq("owner_user_id", user.id)
          .single();
        
        if (data) {
          setCentroId(data.id);
        }
      }
    };
    fetchCentroId();
  }, [isCentroAdmin, user]);

  // Reset form when customer prop changes
  useEffect(() => {
    setFormData({
      name: customer?.name || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      address: customer?.address || "",
      notes: customer?.notes || "",
    });
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (customer) {
        const { error } = await supabase
          .from("customers")
          .update(formData)
          .eq("id", customer.id);

        if (error) throw error;
        toast.success("Cliente aggiornato con successo");
      } else {
        // First create customer account if email is provided
        if (formData.email) {
          const { error: accountError } = await supabase.functions.invoke("create-customer-account", {
            body: {
              email: formData.email,
              fullName: formData.name,
              phone: formData.phone,
            },
          });

          if (accountError) {
            console.error("Account creation error:", accountError);
            toast.error("Errore nella creazione dell'account: " + accountError.message);
          } else {
            toast.success("Account cliente creato con password: 12345678");
          }
        }

        // Then create customer record with centro_id if applicable
        const customerData: any = { ...formData };
        if (isCentroAdmin && centroId) {
          customerData.centro_id = centroId;
        }

        const { error } = await supabase
          .from("customers")
          .insert([customerData]);

        if (error) throw error;
        toast.success("Cliente creato con successo");
      }

      onSuccess();
      onOpenChange(false);
      setFormData({ name: "", email: "", phone: "", address: "", notes: "" });
    } catch (error: any) {
      toast.error(error.message || "Errore durante il salvataggio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{customer ? "Modifica Cliente" : "Nuovo Cliente"}</DialogTitle>
          <DialogDescription>
            {customer ? "Modifica i dati del cliente" : "Inserisci i dati del nuovo cliente"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Mario Rossi"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefono *</Label>
            <Input
              id="phone"
              required
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+39 123 456 7890"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="mario.rossi@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Indirizzo</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Via Roma 1, 00100 Roma"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Note aggiuntive..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
