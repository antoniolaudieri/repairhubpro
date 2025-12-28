import { useState } from "react";
import { format } from "date-fns";
import { 
  TrendingUp, TrendingDown, Calendar, Check, 
  Building2, Zap, Users, FileText, Briefcase, 
  Wrench, ShoppingBag, CreditCard, Truck, Package,
  Shield, Landmark, FolderOpen, Wallet, Receipt
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

interface AddMovementDialogProps {
  centroId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Category configuration with Lucide icons
const categoryConfig: Record<string, { icon: React.ElementType; subcategories: string[]; color: string }> = {
  // Income categories
  "Riparazione": { icon: Wrench, subcategories: ["Manodopera", "Ricambi inclusi", "Urgenza", "Garanzia"], color: "from-emerald-500 to-green-500" },
  "Vendita Usato": { icon: ShoppingBag, subcategories: ["Smartphone", "Tablet", "PC", "Accessori"], color: "from-blue-500 to-cyan-500" },
  "Tessera Fedeltà": { icon: CreditCard, subcategories: ["Attivazione", "Rinnovo"], color: "from-amber-500 to-orange-500" },
  "Vendita Accessori": { icon: Package, subcategories: ["Cover", "Caricatori", "Cavi", "Auricolari"], color: "from-purple-500 to-violet-500" },
  "Consulenza": { icon: Briefcase, subcategories: ["Diagnostica", "Formazione", "Supporto"], color: "from-indigo-500 to-blue-500" },
  "Altro Incasso": { icon: Wallet, subcategories: [], color: "from-teal-500 to-emerald-500" },
  
  // Expense - Locali
  "Affitto Locale": { icon: Building2, subcategories: ["Negozio", "Laboratorio", "Magazzino"], color: "from-slate-500 to-gray-600" },
  "Utenze": { icon: Zap, subcategories: ["Elettricità", "Gas", "Acqua", "Internet", "Telefono"], color: "from-yellow-500 to-amber-500" },
  "Manutenzione Locale": { icon: Wrench, subcategories: ["Riparazioni", "Pulizie", "Impianti"], color: "from-orange-500 to-red-500" },
  
  // Expense - Personale
  "Stipendi": { icon: Users, subcategories: ["Dipendenti", "Collaboratori", "Bonus", "TFR"], color: "from-blue-500 to-indigo-500" },
  "Contributi INPS": { icon: Landmark, subcategories: ["Dipendenti", "Gestione separata", "Artigiani"], color: "from-rose-500 to-pink-500" },
  "INAIL": { icon: Shield, subcategories: ["Premio annuale", "Autoliquidazione"], color: "from-red-500 to-rose-500" },
  
  // Expense - Tasse
  "F24": { icon: FileText, subcategories: ["IVA", "IRPEF", "IRES", "IRAP", "Ritenute", "IMU"], color: "from-red-600 to-rose-600" },
  "Tasse Locali": { icon: Landmark, subcategories: ["TARI", "IMU", "TASI"], color: "from-rose-600 to-red-700" },
  "Imposte Varie": { icon: Receipt, subcategories: ["Bolli", "Diritti camerali"], color: "from-pink-600 to-rose-600" },
  
  // Expense - Professionisti
  "Commercialista": { icon: Briefcase, subcategories: ["Contabilità", "Bilancio", "Dichiarazioni"], color: "from-violet-500 to-purple-600" },
  "Consulenti": { icon: Users, subcategories: ["Legale", "Lavoro", "Privacy/GDPR"], color: "from-purple-500 to-indigo-600" },
  
  // Expense - Operatività
  "Ricambi": { icon: Package, subcategories: ["Schermi", "Batterie", "Connettori", "Altro"], color: "from-cyan-500 to-blue-500" },
  "Attrezzatura": { icon: Wrench, subcategories: ["Strumenti", "Macchinari", "Computer"], color: "from-teal-500 to-cyan-500" },
  "Software/Abbonamenti": { icon: FolderOpen, subcategories: ["Gestionale", "Cloud", "Licenze"], color: "from-indigo-500 to-violet-500" },
  "Marketing": { icon: TrendingUp, subcategories: ["Pubblicità", "Social", "Sponsorizzazioni"], color: "from-pink-500 to-rose-500" },
  
  // Expense - Trasporti
  "Trasporti": { icon: Truck, subcategories: ["Carburante", "Autostrada", "Manutenzione auto"], color: "from-sky-500 to-blue-500" },
  "Spedizioni": { icon: Package, subcategories: ["Corrieri", "Posta", "Imballaggi"], color: "from-amber-500 to-yellow-500" },
  
  // Expense - Altri
  "Assicurazione": { icon: Shield, subcategories: ["RC Professionale", "Furto/Incendio"], color: "from-emerald-600 to-teal-600" },
  "Banca": { icon: Landmark, subcategories: ["Commissioni", "Interessi", "Canone", "POS"], color: "from-gray-500 to-slate-600" },
  "Varie": { icon: FolderOpen, subcategories: ["Cancelleria", "Pulizia", "Altro"], color: "from-gray-400 to-gray-500" },
};

const incomeCategories = ["Riparazione", "Vendita Usato", "Tessera Fedeltà", "Vendita Accessori", "Consulenza", "Altro Incasso"];
const expenseCategories = ["Affitto Locale", "Utenze", "Manutenzione Locale", "Stipendi", "Contributi INPS", "INAIL", "F24", "Tasse Locali", "Imposte Varie", "Commercialista", "Consulenti", "Ricambi", "Attrezzatura", "Software/Abbonamenti", "Marketing", "Trasporti", "Spedizioni", "Assicurazione", "Banca", "Varie"];

const paymentMethods = [
  { value: "cash", label: "Contanti", icon: Wallet },
  { value: "card", label: "Carta", icon: CreditCard },
  { value: "transfer", label: "Bonifico", icon: Landmark },
  { value: "pos", label: "POS", icon: CreditCard },
  { value: "f24", label: "F24", icon: FileText },
  { value: "rid", label: "RID", icon: Receipt },
];

export function AddMovementDialog({ centroId, open, onOpenChange, onSuccess }: AddMovementDialogProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [type, setType] = useState<"income" | "expense">("expense");
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
      console.error("Error:", error);
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

  const content = (
    <div className="space-y-4">
      {/* Type Toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
        <button
          type="button"
          onClick={() => { setType("income"); setCategory(""); }}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
            type === "income" 
              ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Entrata
        </button>
        <button
          type="button"
          onClick={() => { setType("expense"); setCategory(""); }}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
            type === "expense" 
              ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-md" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingDown className="h-4 w-4" />
          Uscita
        </button>
      </div>

      {/* Amount - Big and prominent */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Importo</Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">€</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-10 text-2xl font-bold h-14 bg-card border-2 focus:border-primary"
          />
        </div>
      </div>

      {/* Category Grid */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Categoria</Label>
        <ScrollArea className={isMobile ? "h-40" : "h-48"}>
          <div className="grid grid-cols-3 gap-2 pr-2">
            {categories.map((cat) => {
              const config = categoryConfig[cat];
              const IconComponent = config?.icon || FolderOpen;
              const isSelected = category === cat;
              
              return (
                <motion.button
                  key={cat}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setCategory(cat); setSubcategory(""); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    isSelected 
                      ? `bg-gradient-to-br ${config?.color || "from-primary to-primary/80"} text-white border-transparent shadow-lg` 
                      : "bg-card border-border hover:border-primary/50 hover:bg-accent/5"
                  }`}
                >
                  <IconComponent className={`h-5 w-5 ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                  <span className={`text-[10px] font-medium text-center leading-tight ${isSelected ? "text-white" : "text-foreground"}`}>
                    {cat.length > 12 ? cat.substring(0, 10) + "..." : cat}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Subcategory chips */}
      <AnimatePresence>
        {category && categoryConfig[category]?.subcategories?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <Label className="text-sm text-muted-foreground">Dettaglio</Label>
            <div className="flex flex-wrap gap-2">
              {categoryConfig[category].subcategories.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSubcategory(sub)}
                  className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                    subcategory === sub 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Data</Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={movementDate}
            onChange={(e) => setMovementDate(e.target.value)}
            className="pl-9 h-10 text-sm bg-card"
          />
        </div>
      </div>

      {/* Payment Methods - Full width */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Metodo Pagamento</Label>
        <div className="grid grid-cols-6 gap-1.5">
          {paymentMethods.map((method) => {
            const IconComp = method.icon;
            return (
              <button
                key={method.value}
                type="button"
                onClick={() => setPaymentMethod(method.value)}
                className={`flex flex-col items-center py-2 px-1 rounded-lg text-[10px] transition-all ${
                  paymentMethod === method.value 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <IconComp className="h-4 w-4 mb-0.5" />
                <span className="truncate w-full text-center">{method.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes - Optional */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Note (opzionale)</Label>
        <Textarea
          placeholder="Aggiungi una nota..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="resize-none bg-card text-sm"
        />
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !amount || !category}
        className={`w-full h-12 text-base font-semibold gap-2 shadow-lg ${
          type === "income" 
            ? "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600" 
            : "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600"
        }`}
      >
        <Check className="h-5 w-5" />
        {isSubmitting ? "Salvataggio..." : `Registra ${type === "income" ? "Entrata" : "Uscita"}`}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4 pb-6">
          <DrawerHeader className="px-0 pb-2">
            <DrawerTitle className="text-lg">Nuovo Movimento</DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuovo Movimento</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}