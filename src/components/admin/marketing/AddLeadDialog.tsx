import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddLeadDialog({ open, onOpenChange }: AddLeadDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    business_name: "",
    business_type: "altro",
    phone: "",
    email: "",
    address: "",
    website: "",
    notes: "",
    source: "manual",
  });

  const addLeadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("marketing_leads")
        .insert({
          business_name: formData.business_name,
          business_type: formData.business_type as any,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          website: formData.website || null,
          notes: formData.notes || null,
          source: formData.source,
          status: "new" as any,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-leads"] });
      toast.success("Lead aggiunto con successo!");
      setFormData({
        business_name: "",
        business_type: "altro",
        phone: "",
        email: "",
        address: "",
        website: "",
        notes: "",
        source: "manual",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Errore nell'aggiunta del lead");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.business_name.trim()) {
      toast.error("Inserisci il nome dell'attività");
      return;
    }
    addLeadMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuovo Lead</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="business_name">Nome Attività *</Label>
            <Input
              id="business_name"
              value={formData.business_name}
              onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
              placeholder="Es. TechStore Milano"
              required
            />
          </div>

          <div>
            <Label htmlFor="business_type">Tipo Attività</Label>
            <Select
              value={formData.business_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, business_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="centro">Centro Assistenza</SelectItem>
                <SelectItem value="corner">Corner / Punto Vendita</SelectItem>
                <SelectItem value="telefonia">Telefonia</SelectItem>
                <SelectItem value="elettronica">Elettronica</SelectItem>
                <SelectItem value="computer">Computer</SelectItem>
                <SelectItem value="altro">Altro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Telefono</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+39..."
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="info@..."
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Indirizzo</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Via..., Città"
            />
          </div>

          <div>
            <Label htmlFor="website">Sito Web</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="www.example.com"
            />
          </div>

          <div>
            <Label htmlFor="source">Fonte</Label>
            <Select
              value={formData.source}
              onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Inserimento Manuale</SelectItem>
                <SelectItem value="google_maps">Google Maps</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="website">Sito Web</SelectItem>
                <SelectItem value="social">Social Media</SelectItem>
                <SelectItem value="event">Evento/Fiera</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Note iniziali sul lead..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={addLeadMutation.isPending}
            >
              {addLeadMutation.isPending ? "Salvataggio..." : "Aggiungi Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
