import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bell, BellOff, Smartphone, Tablet, Laptop, Monitor, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CustomerDeviceInterestsProps {
  customerId: string;
  customerEmail: string | null;
}

interface DeviceInterest {
  id: string;
  device_types: string[] | null;
  brands: string[] | null;
  max_price: number | null;
  notify_enabled: boolean;
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

export function CustomerDeviceInterests({ customerId, customerEmail }: CustomerDeviceInterestsProps) {
  const [interest, setInterest] = useState<DeviceInterest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState("");
  const [notifyEnabled, setNotifyEnabled] = useState(true);

  const loadInterest = async () => {
    if (!customerEmail) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("used_device_interests")
        .select("*")
        .eq("customer_id", customerId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setInterest(data);
        setSelectedTypes(data.device_types || []);
        setSelectedBrands(data.brands || []);
        setMaxPrice(data.max_price?.toString() || "");
        setNotifyEnabled(data.notify_enabled);
      }
    } catch (error: any) {
      console.error("Error loading interest:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInterest();
  }, [customerId, customerEmail]);

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

  const handleSave = async () => {
    if (!customerEmail) {
      toast.error("Il cliente deve avere un'email per le notifiche");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customer_id: customerId,
        email: customerEmail,
        device_types: selectedTypes.length > 0 ? selectedTypes : null,
        brands: selectedBrands.length > 0 ? selectedBrands : null,
        max_price: maxPrice ? parseFloat(maxPrice) : null,
        notify_enabled: notifyEnabled,
      };

      if (interest?.id) {
        const { error } = await supabase
          .from("used_device_interests")
          .update(payload)
          .eq("id", interest.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("used_device_interests")
          .insert(payload);
        if (error) throw error;
      }

      toast.success("Interessi salvati");
      setIsEditing(false);
      loadInterest();
    } catch (error: any) {
      toast.error(error.message || "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!interest?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("used_device_interests")
        .delete()
        .eq("id", interest.id);

      if (error) throw error;

      toast.success("Interessi rimossi");
      setInterest(null);
      setSelectedTypes([]);
      setSelectedBrands([]);
      setMaxPrice("");
      setNotifyEnabled(true);
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || "Errore nella rimozione");
    } finally {
      setSaving(false);
    }
  };

  if (!customerEmail) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Interessi Usato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Aggiungi un'email al cliente per attivare le notifiche sui dispositivi usati
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // View mode
  if (!isEditing && interest) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {interest.notify_enabled ? (
                <Bell className="h-4 w-4 text-primary" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
              Interessi Usato
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-7 text-xs">
              Modifica
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {interest.notify_enabled ? (
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 text-xs">
              Notifiche Attive
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              Notifiche Disattivate
            </Badge>
          )}
          
          {interest.device_types && interest.device_types.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Tipi dispositivo</p>
              <div className="flex flex-wrap gap-1">
                {interest.device_types.map(type => (
                  <Badge key={type} variant="secondary" className="text-xs capitalize">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {interest.brands && interest.brands.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Marche preferite</p>
              <div className="flex flex-wrap gap-1">
                {interest.brands.map(brand => (
                  <Badge key={brand} variant="secondary" className="text-xs">
                    {brand}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {interest.max_price && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Budget massimo</p>
              <p className="text-sm font-semibold">€{interest.max_price}</p>
            </div>
          )}

          {!interest.device_types?.length && !interest.brands?.length && !interest.max_price && (
            <p className="text-xs text-muted-foreground">
              Nessun filtro impostato - riceverà notifiche per tutti i dispositivi
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Edit/Create mode
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Interessi Usato
          </CardTitle>
          {interest && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsEditing(false)} 
              className="h-7 text-xs"
            >
              Annulla
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Notify Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="notify" className="text-xs">Notifiche attive</Label>
          <Switch
            id="notify"
            checked={notifyEnabled}
            onCheckedChange={setNotifyEnabled}
          />
        </div>

        {/* Device Types */}
        <div className="space-y-2">
          <Label className="text-xs">Tipi dispositivo</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {deviceTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedTypes.includes(type.id);
              return (
                <motion.button
                  key={type.id}
                  type="button"
                  onClick={() => toggleType(type.id)}
                  className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs transition-colors ${
                    isSelected 
                      ? "border-primary bg-primary/10 text-primary" 
                      : "border-border hover:border-primary/50"
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{type.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Brands */}
        <div className="space-y-2">
          <Label className="text-xs">Marche preferite</Label>
          <div className="flex flex-wrap gap-1.5">
            {popularBrands.map((brand) => {
              const isSelected = selectedBrands.includes(brand);
              return (
                <motion.button
                  key={brand}
                  type="button"
                  onClick={() => toggleBrand(brand)}
                  className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                    isSelected 
                      ? "border-primary bg-primary text-primary-foreground" 
                      : "border-border hover:border-primary/50"
                  }`}
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
          <Label htmlFor="maxPrice" className="text-xs">Budget massimo</Label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">€</span>
            <Input
              id="maxPrice"
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="500"
              className="pl-6 h-8 text-sm"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="flex-1 h-8 text-xs"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Save className="h-3 w-3 mr-1" />
            )}
            {interest ? "Salva" : "Attiva Notifiche"}
          </Button>
          
          {interest && (
            <Button
              onClick={handleDelete}
              disabled={saving}
              variant="destructive"
              size="sm"
              className="h-8 text-xs"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        {!interest && (
          <p className="text-[10px] text-muted-foreground text-center">
            Il cliente riceverà email quando nuovi dispositivi corrispondono ai criteri
          </p>
        )}
      </CardContent>
    </Card>
  );
}
