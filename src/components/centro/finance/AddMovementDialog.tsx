import { useState } from "react";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Calendar, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface AddMovementDialogProps {
  centroId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const incomeCategories = [
  "Riparazione",
  "Vendita Usato",
  "Tessera Fedeltà",
  "Vendita Accessori",
  "Consulenza",
  "Altro Incasso",
];

const expenseCategories = [
  "Ricambi",
  "Affitto",
  "Utenze",
  "Stipendi",
  "Marketing",
  "Attrezzatura",
  "Software/Abbonamenti",
  "Tasse",
  "Assicurazione",
  "Manutenzione",
  "Altra Spesa",
];

const paymentMethods = [
  { value: "cash", label: "Contanti" },
  { value: "card", label: "Carta" },
  { value: "transfer", label: "Bonifico" },
  { value: "pos", label: "POS" },
  { value: "other", label: "Altro" },
];

export function AddMovementDialog({ centroId, open, onOpenChange, onSuccess }: AddMovementDialogProps) {
  const { user } = useAuth();
  const [type, setType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [movementDate, setMovementDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !category) {
      toast.error("Compila importo e categoria");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Inserisci un importo valido");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("centro_financial_movements").insert({
        centro_id: centroId,
        type,
        amount: parsedAmount,
        category,
        subcategory: subcategory || null,
        description: description || null,
        payment_method: paymentMethod,
        movement_date: movementDate,
        reference_type: "manual",
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success(`${type === "income" ? "Entrata" : "Uscita"} registrata`);
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error adding movement:", error);
      toast.error("Errore nel salvataggio");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount("");
    setCategory("");
    setSubcategory("");
    setDescription("");
    setPaymentMethod("cash");
    setMovementDate(format(new Date(), "yyyy-MM-dd"));
  };

  const categories = type === "income" ? incomeCategories : expenseCategories;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Nuovo Movimento</DialogTitle>
        </DialogHeader>

        <Tabs value={type} onValueChange={(v) => { setType(v as "income" | "expense"); setCategory(""); }}>
          <TabsList className="grid w-full grid-cols-2 bg-muted p-1">
            <TabsTrigger 
              value="income" 
              className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
            >
              <TrendingUp className="h-4 w-4" />
              Entrata
            </TabsTrigger>
            <TabsTrigger 
              value="expense" 
              className="gap-2 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground"
            >
              <TrendingDown className="h-4 w-4" />
              Uscita
            </TabsTrigger>
          </TabsList>

          <TabsContent value={type} className="space-y-4 mt-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-foreground">Importo (€) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg bg-background"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-foreground">Categoria *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subcategory */}
            <div className="space-y-2">
              <Label htmlFor="subcategory" className="text-foreground">Sottocategoria</Label>
              <Input
                id="subcategory"
                placeholder="es. Schermo iPhone 15"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="bg-background"
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-foreground">Data</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={movementDate}
                  onChange={(e) => setMovementDate(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label className="text-foreground">Metodo di Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">Note</Label>
              <Textarea
                id="description"
                placeholder="Descrizione opzionale..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="bg-background"
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full gap-2 ${type === "income" 
                ? "bg-accent hover:bg-accent/90 text-accent-foreground" 
                : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"}`}
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? "Salvataggio..." : `Registra ${type === "income" ? "Entrata" : "Uscita"}`}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
