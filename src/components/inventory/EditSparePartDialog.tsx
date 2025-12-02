import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SparePart {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  cost: number | null;
  selling_price: number | null;
  stock_quantity: number;
  minimum_stock: number | null;
  image_url: string | null;
  model_compatibility: string | null;
  supplier: string | null;
  supplier_code: string | null;
  notes: string | null;
}

interface EditSparePartDialogProps {
  part: SparePart;
  onPartUpdated?: () => void;
  trigger?: React.ReactNode;
}

const CATEGORIES = [
  "Schermo",
  "Batteria",
  "Connettore",
  "Fotocamera",
  "Speaker",
  "Microfono",
  "Tasto",
  "Cover",
  "Vetro",
  "Flex",
  "Altro"
];

export default function EditSparePartDialog({ part, onPartUpdated, trigger }: EditSparePartDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: part.name,
    category: part.category,
    brand: part.brand || "",
    model_compatibility: part.model_compatibility || "",
    cost: part.cost?.toString() || "",
    selling_price: part.selling_price?.toString() || "",
    stock_quantity: part.stock_quantity.toString(),
    minimum_stock: part.minimum_stock?.toString() || "5",
    supplier_code: part.supplier_code || "",
    image_url: part.image_url || "",
    notes: part.notes || "",
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: part.name,
        category: part.category,
        brand: part.brand || "",
        model_compatibility: part.model_compatibility || "",
        cost: part.cost?.toString() || "",
        selling_price: part.selling_price?.toString() || "",
        stock_quantity: part.stock_quantity.toString(),
        minimum_stock: part.minimum_stock?.toString() || "5",
        supplier_code: part.supplier_code || "",
        image_url: part.image_url || "",
        notes: part.notes || "",
      });
    }
  }, [open, part]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Il nome del ricambio è obbligatorio");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("spare_parts")
      .update({
        name: formData.name.trim(),
        category: formData.category,
        brand: formData.brand.trim() || null,
        model_compatibility: formData.model_compatibility.trim() || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        minimum_stock: parseInt(formData.minimum_stock) || 5,
        supplier_code: formData.supplier_code.trim() || null,
        image_url: formData.image_url.trim() || null,
        notes: formData.notes.trim() || null,
      })
      .eq("id", part.id);

    setSaving(false);

    if (error) {
      toast.error("Errore durante il salvataggio");
      console.error(error);
      return;
    }

    toast.success("Ricambio aggiornato");
    setOpen(false);
    onPartUpdated?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">Modifica</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Ricambio</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome ricambio"
              />
            </div>

            <div>
              <Label>Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Brand</Label>
              <Input
                value={formData.brand}
                onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                placeholder="es. Apple, Samsung"
              />
            </div>

            <div className="col-span-2">
              <Label>Compatibilità Modello</Label>
              <Input
                value={formData.model_compatibility}
                onChange={(e) => setFormData(prev => ({ ...prev, model_compatibility: e.target.value }))}
                placeholder="es. iPhone 14, Galaxy S23"
              />
            </div>

            <div>
              <Label>Costo (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Prezzo Vendita (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData(prev => ({ ...prev, selling_price: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Quantità</Label>
              <Input
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
              />
            </div>

            <div>
              <Label>Scorta Minima</Label>
              <Input
                type="number"
                value={formData.minimum_stock}
                onChange={(e) => setFormData(prev => ({ ...prev, minimum_stock: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <Label>Codice Fornitore</Label>
              <Input
                value={formData.supplier_code}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_code: e.target.value }))}
                placeholder="Codice articolo fornitore"
              />
            </div>

            <div className="col-span-2">
              <Label>URL Immagine</Label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://..."
              />
              {formData.image_url && (
                <div className="mt-2 h-20 w-20 rounded-md bg-muted/30 overflow-hidden">
                  <img 
                    src={formData.image_url} 
                    alt="Preview" 
                    className="h-full w-full object-contain"
                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                  />
                </div>
              )}
            </div>

            <div className="col-span-2">
              <Label>Note</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Note aggiuntive..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salva
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
