import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { 
  Bell, 
  Smartphone, 
  Tablet, 
  Laptop, 
  Watch, 
  Headphones,
  Save,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DEVICE_TYPES = [
  { id: "Smartphone", label: "Smartphone", icon: Smartphone },
  { id: "Tablet", label: "Tablet", icon: Tablet },
  { id: "Laptop", label: "Laptop", icon: Laptop },
  { id: "Smartwatch", label: "Smartwatch", icon: Watch },
  { id: "Cuffie", label: "Cuffie/Auricolari", icon: Headphones },
];

const BRANDS = [
  "Apple", "Samsung", "Huawei", "Xiaomi", "OnePlus", 
  "Google", "Sony", "ASUS", "Lenovo", "Altro"
];

interface PromotionPreferencesProps {
  userEmail: string;
  customerId?: string;
}

export default function PromotionPreferences({ userEmail, customerId }: PromotionPreferencesProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [interestId, setInterestId] = useState<string | null>(null);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, [userEmail]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("used_device_interests")
        .select("*")
        .eq("email", userEmail)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setInterestId(data.id);
        setNotifyEnabled(data.notify_enabled);
        setSelectedTypes(data.device_types || []);
        setSelectedBrands(data.brands || []);
        setMaxPrice(data.max_price);
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeToggle = (typeId: string) => {
    setSelectedTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
    setHasChanges(true);
  };

  const handleBrandToggle = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) 
        ? prev.filter(b => b !== brand)
        : [...prev, brand]
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        email: userEmail,
        customer_id: customerId || null,
        notify_enabled: notifyEnabled,
        device_types: selectedTypes.length > 0 ? selectedTypes : null,
        brands: selectedBrands.length > 0 ? selectedBrands : null,
        max_price: maxPrice,
        updated_at: new Date().toISOString()
      };

      if (interestId) {
        const { error } = await supabase
          .from("used_device_interests")
          .update(data)
          .eq("id", interestId);
        if (error) throw error;
      } else {
        const { data: newData, error } = await supabase
          .from("used_device_interests")
          .insert(data)
          .select()
          .single();
        if (error) throw error;
        setInterestId(newData.id);
      }

      toast({
        title: "Preferenze salvate",
        description: notifyEnabled 
          ? "Riceverai notifiche quando saranno disponibili dispositivi di tuo interesse"
          : "Le notifiche sono state disattivate",
      });
      setHasChanges(false);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Preferenze Offerte e Promozioni
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="notify-toggle" className="text-sm font-normal text-muted-foreground">
              {notifyEnabled ? "Attive" : "Disattivate"}
            </Label>
            <Switch
              id="notify-toggle"
              checked={notifyEnabled}
              onCheckedChange={(checked) => {
                setNotifyEnabled(checked);
                setHasChanges(true);
              }}
            />
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <AnimatePresence>
          {notifyEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-6"
            >
              {/* Device Types */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Tipologie di Dispositivi
                </Label>
                <p className="text-xs text-muted-foreground">
                  Seleziona i tipi di dispositivi per cui vuoi ricevere offerte
                </p>
                <div className="flex flex-wrap gap-2">
                  {DEVICE_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = selectedTypes.includes(type.id);
                    return (
                      <motion.button
                        key={type.id}
                        type="button"
                        onClick={() => handleTypeToggle(type.id)}
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
                          ${isSelected 
                            ? "bg-primary text-primary-foreground border-primary" 
                            : "bg-card hover:bg-muted border-border"}
                        `}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{type.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Brands */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Marchi Preferiti</Label>
                <p className="text-xs text-muted-foreground">
                  Seleziona i brand che ti interessano (opzionale)
                </p>
                <div className="flex flex-wrap gap-2">
                  {BRANDS.map((brand) => {
                    const isSelected = selectedBrands.includes(brand);
                    return (
                      <Badge
                        key={brand}
                        variant={isSelected ? "default" : "outline"}
                        className={`
                          cursor-pointer transition-all
                          ${isSelected 
                            ? "bg-primary hover:bg-primary/90" 
                            : "hover:bg-muted"}
                        `}
                        onClick={() => handleBrandToggle(brand)}
                      >
                        {brand}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              {(selectedTypes.length > 0 || selectedBrands.length > 0) && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm text-muted-foreground">
                    Riceverai notifiche per:
                    {selectedTypes.length > 0 && (
                      <span className="font-medium text-foreground">
                        {" "}{selectedTypes.join(", ")}
                      </span>
                    )}
                    {selectedTypes.length > 0 && selectedBrands.length > 0 && " di marca "}
                    {selectedBrands.length > 0 && (
                      <span className="font-medium text-foreground">
                        {selectedBrands.join(", ")}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!notifyEnabled && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Attiva le notifiche per ricevere offerte esclusive sui dispositivi usati e ricondizionati
          </p>
        )}

        {/* Save Button */}
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvataggio..." : "Salva Preferenze"}
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
