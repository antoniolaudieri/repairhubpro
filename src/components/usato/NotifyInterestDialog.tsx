import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import { Bell, Smartphone, Tablet, Laptop, Monitor } from "lucide-react";

interface NotifyInterestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const deviceTypes = [
  { id: "smartphone", label: "Smartphone", icon: Smartphone },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "laptop", label: "Laptop", icon: Laptop },
  { id: "pc", label: "PC/Desktop", icon: Monitor },
];

const popularBrands = [
  "Apple", "Samsung", "Huawei", "Xiaomi", "OnePlus", "Google", "Sony", "LG", "Asus", "Lenovo"
];

export function NotifyInterestDialog({ open, onOpenChange }: NotifyInterestDialogProps) {
  const [email, setEmail] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Errore",
        description: "Inserisci la tua email",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("used_device_interests").insert({
        email,
        device_types: selectedTypes,
        brands: selectedBrands,
        max_price: maxPrice ? parseFloat(maxPrice) : null,
        notify_enabled: true,
      });

      if (error) throw error;

      toast({
        title: "Notifiche Attivate!",
        description: "Ti avviseremo quando nuovi dispositivi corrispondono ai tuoi criteri.",
      });
      onOpenChange(false);
      setEmail("");
      setSelectedTypes([]);
      setSelectedBrands([]);
      setMaxPrice("");
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Attiva Notifiche
          </DialogTitle>
          <DialogDescription>
            Ricevi un avviso quando pubblichiamo dispositivi che ti interessano
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tua@email.com"
              required
            />
          </div>

          {/* Device Types */}
          <div className="space-y-2">
            <Label>Tipo di Dispositivo (opzionale)</Label>
            <div className="grid grid-cols-2 gap-2">
              {deviceTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedTypes.includes(type.id);
                return (
                  <motion.button
                    key={type.id}
                    type="button"
                    onClick={() => toggleType(type.id)}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                      isSelected 
                        ? "border-primary bg-primary/10 text-primary" 
                        : "border-border hover:border-primary/50"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm">{type.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Brands */}
          <div className="space-y-2">
            <Label>Marche Preferite (opzionale)</Label>
            <div className="flex flex-wrap gap-2">
              {popularBrands.map((brand) => {
                const isSelected = selectedBrands.includes(brand);
                return (
                  <motion.button
                    key={brand}
                    type="button"
                    onClick={() => toggleBrand(brand)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      isSelected 
                        ? "border-primary bg-primary text-primary-foreground" 
                        : "border-border hover:border-primary/50"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {brand}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Max Price */}
          <div className="space-y-2">
            <Label htmlFor="maxPrice">Budget Massimo (opzionale)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <Input
                id="maxPrice"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="500"
                className="pl-8"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Attivazione..." : "Attiva Notifiche"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}