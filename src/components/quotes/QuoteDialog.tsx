import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";

const quoteSchema = z.object({
  deviceType: z.string().min(1, "Tipo dispositivo richiesto"),
  deviceBrand: z.string().optional(),
  deviceModel: z.string().optional(),
  issueDescription: z.string().min(10, "Descrizione minimo 10 caratteri"),
  diagnosis: z.string().optional(),
  laborCost: z.string().min(1, "Costo manodopera richiesto"),
  notes: z.string().optional(),
  validUntil: z.string().optional(),
});

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  onSuccess: () => void;
}

export function QuoteDialog({ open, onOpenChange, customerId, onSuccess }: QuoteDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [newItem, setNewItem] = useState<Partial<QuoteItem>>({
    description: "",
    quantity: 1,
    unitPrice: 0,
  });

  const form = useForm({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      deviceType: "",
      deviceBrand: "",
      deviceModel: "",
      issueDescription: "",
      diagnosis: "",
      laborCost: "0",
      notes: "",
      validUntil: "",
    },
  });

  const addItem = () => {
    if (!newItem.description || !newItem.unitPrice || newItem.unitPrice <= 0) {
      toast({
        title: "Errore",
        description: "Inserisci descrizione e prezzo validi",
        variant: "destructive",
      });
      return;
    }

    const item: QuoteItem = {
      description: newItem.description,
      quantity: newItem.quantity || 1,
      unitPrice: newItem.unitPrice,
      total: (newItem.quantity || 1) * newItem.unitPrice,
    };

    setItems([...items, item]);
    setNewItem({ description: "", quantity: 1, unitPrice: 0 });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    const partsCost = items.reduce((sum, item) => sum + item.total, 0);
    const laborCost = parseFloat(form.watch("laborCost") || "0");
    return partsCost + laborCost;
  };

  const onSubmit = async (data: z.infer<typeof quoteSchema>) => {
    setLoading(true);
    try {
      const partsCost = items.reduce((sum, item) => sum + item.total, 0);
      const laborCost = parseFloat(data.laborCost);
      const totalCost = partsCost + laborCost;

      // Calculate valid_until (30 days from now if not specified)
      const validUntil = data.validUntil 
        ? data.validUntil
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { error } = await supabase.from("quotes").insert({
        customer_id: customerId,
        device_type: data.deviceType,
        device_brand: data.deviceBrand || null,
        device_model: data.deviceModel || null,
        issue_description: data.issueDescription,
        diagnosis: data.diagnosis || null,
        items: JSON.stringify(items),
        labor_cost: laborCost,
        parts_cost: partsCost,
        total_cost: totalCost,
        notes: data.notes || null,
        valid_until: validUntil,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "Preventivo creato!",
        description: "Il cliente può ora visualizzarlo e firmarlo",
      });

      form.reset();
      setItems([]);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Crea Preventivo</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Device Info */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-xl">
            <h3 className="font-semibold text-lg">Informazioni Dispositivo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="deviceType">Tipo Dispositivo *</Label>
                <Select
                  value={form.watch("deviceType")}
                  onValueChange={(value) => form.setValue("deviceType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smartphone">Smartphone</SelectItem>
                    <SelectItem value="tablet">Tablet</SelectItem>
                    <SelectItem value="laptop">Laptop</SelectItem>
                    <SelectItem value="desktop">Desktop</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.deviceType && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.deviceType.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="deviceBrand">Marca</Label>
                <Input
                  id="deviceBrand"
                  placeholder="es. Apple, Samsung"
                  {...form.register("deviceBrand")}
                />
              </div>

              <div>
                <Label htmlFor="deviceModel">Modello</Label>
                <Input
                  id="deviceModel"
                  placeholder="es. iPhone 14"
                  {...form.register("deviceModel")}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="issueDescription">Descrizione Problema *</Label>
              <Textarea
                id="issueDescription"
                placeholder="Descrivi il problema del dispositivo..."
                rows={3}
                {...form.register("issueDescription")}
              />
              {form.formState.errors.issueDescription && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.issueDescription.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="diagnosis">Diagnosi</Label>
              <Textarea
                id="diagnosis"
                placeholder="Diagnosi tecnica del problema..."
                rows={2}
                {...form.register("diagnosis")}
              />
            </div>
          </div>

          {/* Parts/Items */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-xl">
            <h3 className="font-semibold text-lg">Ricambi e Materiali</h3>
            
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-5">
                <Label>Descrizione</Label>
                <Input
                  placeholder="es. Display LCD"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Quantità</Label>
                <Input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="col-span-3">
                <Label>Prezzo Unit. (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-2 flex items-end">
                <Button type="button" onClick={addItem} className="w-full">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {items.length > 0 && (
              <div className="space-y-2 mt-4">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-card rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity}x € {item.unitPrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">€ {item.total.toFixed(2)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Costs */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-xl">
            <h3 className="font-semibold text-lg">Costi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="laborCost">Manodopera (€) *</Label>
                <Input
                  id="laborCost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...form.register("laborCost")}
                />
                {form.formState.errors.laborCost && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.laborCost.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="validUntil">Validità fino a</Label>
                <Input
                  id="validUntil"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  {...form.register("validUntil")}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Default: 30 giorni da oggi
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold">Totale Preventivo:</span>
                <span className="text-2xl font-bold text-primary">
                  € {calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              placeholder="Note aggiuntive per il cliente..."
              rows={2}
              {...form.register("notes")}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creazione..." : "Crea Preventivo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
