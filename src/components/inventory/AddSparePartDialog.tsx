import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

interface AddSparePartDialogProps {
  onPartAdded?: () => void;
  trigger?: React.ReactNode;
}

const CATEGORIES = [
  "Display",
  "Batteria",
  "Connettore",
  "Fotocamera",
  "Altoparlante",
  "Microfono",
  "Tasto",
  "Vetro",
  "Scocca",
  "Scheda Madre",
  "Antenna",
  "Sensore",
  "Accessori",
  "Dispositivi",
  "Altro"
];

export default function AddSparePartDialog({ onPartAdded, trigger }: AddSparePartDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    brand: "",
    model_compatibility: "",
    cost: "",
    selling_price: "",
    supplier_code: "",
    stock_quantity: "0",
    image_url: "",
    notes: ""
  });

  // Auto-search image when name changes
  const searchImageAutomatically = useCallback(async (partName: string, brand: string, model: string) => {
    if (!partName || partName.length < 3) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-spare-part-info', {
        body: {
          partName,
          brand,
          model
        }
      });

      if (error) throw error;

      if (data?.image_url) {
        setFormData(prev => ({
          ...prev,
          image_url: data.image_url
        }));
      }
    } catch (error) {
      console.error('Error searching image:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.name) {
        searchImageAutomatically(formData.name, formData.brand, formData.model_compatibility);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.name, formData.brand, formData.model_compatibility, searchImageAutomatically]);


  const handleSave = async () => {
    if (!formData.name || !formData.category) {
      toast.error("Nome e categoria sono obbligatori");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('spare_parts').insert({
        name: formData.name,
        category: formData.category,
        brand: formData.brand || null,
        model_compatibility: formData.model_compatibility || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
        supplier_code: formData.supplier_code || null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        image_url: formData.image_url || null,
        notes: formData.notes || null
      });

      if (error) throw error;

      toast.success("Ricambio aggiunto con successo!");
      setOpen(false);
      setFormData({
        name: "",
        category: "",
        brand: "",
        model_compatibility: "",
        cost: "",
        selling_price: "",
        supplier_code: "",
        stock_quantity: "0",
        image_url: "",
        notes: ""
      });
      onPartAdded?.();
    } catch (error) {
      console.error('Error adding spare part:', error);
      toast.error("Errore nell'aggiunta del ricambio");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nuovo Ricambio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aggiungi Nuovo Ricambio</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Nome Ricambio *</Label>
              <div className="relative">
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="es. Display iPhone 15 Pro"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">L'immagine verrà cercata automaticamente online</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Brand Compatibile</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                placeholder="es. Apple, Samsung"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modello Compatibile</Label>
              <Input
                id="model"
                value={formData.model_compatibility}
                onChange={(e) => setFormData(prev => ({ ...prev, model_compatibility: e.target.value }))}
                placeholder="es. iPhone 15 Pro"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_code">Codice Fornitore</Label>
              <Input
                id="supplier_code"
                value={formData.supplier_code}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_code: e.target.value }))}
                placeholder="Codice prodotto fornitore"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Prezzo Costo (€)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="selling_price">Prezzo Vendita (€)</Label>
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData(prev => ({ ...prev, selling_price: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Quantità Stock</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                placeholder="0"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="image_url">URL Immagine</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://..."
              />
              {formData.image_url && (
                <div className="mt-2 flex justify-center">
                  <img 
                    src={formData.image_url} 
                    alt="Preview" 
                    className="h-32 w-32 object-contain rounded border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Note</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Descrizione, compatibilità, note tecniche..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                "Salva Ricambio"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
