import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Euro,
  AlertTriangle,
  Package,
  CheckCircle2,
} from "lucide-react";

interface SinglePriceEstimate {
  originalPrice: number;
  grades: {
    B: number;
    A: number;
    AA: number;
    AAA: number;
  };
  trend?: 'alto' | 'stabile' | 'basso';
  trendReason?: string;
  notes?: string;
}

interface MultiStoragePriceEstimate {
  [storageKey: string]: SinglePriceEstimate;
}

interface ForfeitDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repair: {
    id: string;
    device_brand: string;
    device_model: string;
    device_type: string;
    customer_id?: string;
  };
  centroId: string;
  onSuccess: () => void;
}

const conditionOptions = [
  { value: "alienato", label: "Alienato" },
  { value: "usato_discreto", label: "Usato Discreto" },
  { value: "usato_buono", label: "Usato Buono" },
  { value: "usato_ottimo", label: "Usato Ottimo" },
];

const gradeToCondition: Record<string, string> = {
  "B": "usato_discreto",
  "A": "usato_buono",
  "AA": "usato_ottimo",
  "AAA": "ricondizionato",
};

export function ForfeitDeviceDialog({
  open,
  onOpenChange,
  repair,
  centroId,
  onSuccess,
}: ForfeitDeviceDialogProps) {
  const [isEstimating, setIsEstimating] = useState(false);
  const [priceEstimate, setPriceEstimate] = useState<SinglePriceEstimate | null>(null);
  const [allStorageEstimates, setAllStorageEstimates] = useState<MultiStoragePriceEstimate | null>(null);
  const [selectedStorageOption, setSelectedStorageOption] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string>("B");
  const [condition, setCondition] = useState("alienato");
  const [price, setPrice] = useState("");
  const [storageCapacity, setStorageCapacity] = useState("");
  const [saving, setSaving] = useState(false);

  // Estimate price when dialog opens
  const estimatePrice = useCallback(async () => {
    if (!repair.device_brand || !repair.device_model) return;

    setIsEstimating(true);
    try {
      const { data, error } = await supabase.functions.invoke('estimate-used-price', {
        body: {
          brand: repair.device_brand,
          model: repair.device_model,
          storage: undefined
        }
      });

      if (error) throw error;

      if (data?.estimate) {
        const estimate = data.estimate;

        // Check if it's a multi-storage structure
        if (!estimate.grades && typeof estimate === 'object') {
          const keys = Object.keys(estimate);
          const hasValidStorageKeys = keys.some(key => estimate[key]?.grades);

          if (hasValidStorageKeys) {
            setAllStorageEstimates(estimate as MultiStoragePriceEstimate);
            const selectedKey = keys[0];
            setSelectedStorageOption(selectedKey);
            setPriceEstimate(estimate[selectedKey]);
            setStorageCapacity(selectedKey);
            // Set initial price based on grade B
            if (estimate[selectedKey]?.grades?.B) {
              setPrice(estimate[selectedKey].grades.B.toString());
            }
            return;
          }
        }

        // Single storage response
        if (estimate?.grades?.B !== undefined) {
          setAllStorageEstimates(null);
          setSelectedStorageOption(null);
          setPriceEstimate(estimate);
          setPrice(estimate.grades.B.toString());
        }
      }
    } catch (error) {
      console.error('Price estimate error:', error);
      toast({
        title: "Errore stima prezzo",
        description: "Impossibile stimare il prezzo. Inserisci manualmente.",
        variant: "destructive"
      });
    } finally {
      setIsEstimating(false);
    }
  }, [repair.device_brand, repair.device_model]);

  useEffect(() => {
    if (open) {
      estimatePrice();
    } else {
      // Reset state when dialog closes
      setPriceEstimate(null);
      setAllStorageEstimates(null);
      setSelectedStorageOption(null);
      setSelectedGrade("B");
      setCondition("alienato");
      setPrice("");
      setStorageCapacity("");
    }
  }, [open, estimatePrice]);

  const handleStorageSelect = (storageKey: string) => {
    setSelectedStorageOption(storageKey);
    setStorageCapacity(storageKey);
    if (allStorageEstimates?.[storageKey]) {
      const newEstimate = allStorageEstimates[storageKey];
      setPriceEstimate(newEstimate);
      if (newEstimate?.grades?.[selectedGrade as keyof typeof newEstimate.grades]) {
        setPrice(newEstimate.grades[selectedGrade as keyof typeof newEstimate.grades].toString());
      }
    }
  };

  const handleGradeSelect = (grade: string) => {
    setSelectedGrade(grade);
    if (priceEstimate?.grades?.[grade as keyof typeof priceEstimate.grades]) {
      setPrice(priceEstimate.grades[grade as keyof typeof priceEstimate.grades].toString());
    }
    // Auto-update condition based on grade
    if (gradeToCondition[grade]) {
      setCondition(gradeToCondition[grade]);
    }
  };

  const handleForfeit = async () => {
    if (!price || parseFloat(price) <= 0) {
      toast({
        title: "Prezzo richiesto",
        description: "Inserisci un prezzo valido per il dispositivo",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // 1. Update repair status to forfeited
      const { error: repairError } = await supabase
        .from("repairs")
        .update({ status: "forfeited" })
        .eq("id", repair.id);

      if (repairError) throw repairError;

      // 2. Create used device entry
      const deviceData = {
        centro_id: centroId,
        device_type: repair.device_type?.toLowerCase() || "smartphone",
        brand: repair.device_brand,
        model: repair.device_model,
        storage_capacity: storageCapacity || null,
        condition: condition as "ricondizionato" | "usato_ottimo" | "usato_buono" | "usato_discreto" | "alienato",
        price: parseFloat(price),
        original_price: priceEstimate?.originalPrice || null,
        source: "riparazione_alienata" as const,
        sale_type: "alienato" as const,
        status: "draft" as const,
        repair_id: repair.id,
        specifications: priceEstimate ? {
          ai_estimated: true,
          grade: selectedGrade,
          trend: priceEstimate.trend,
        } : null,
      };

      const { error: deviceError } = await supabase
        .from("used_devices")
        .insert([deviceData]);

      if (deviceError) throw deviceError;

      // 3. Save AI valuation to history
      if (priceEstimate?.grades) {
        await supabase.from("device_price_valuations").insert({
          centro_id: centroId,
          device_type: repair.device_type || "smartphone",
          brand: repair.device_brand,
          model: repair.device_model,
          storage: storageCapacity || null,
          original_price: priceEstimate.originalPrice || null,
          grade_b: priceEstimate.grades.B,
          grade_a: priceEstimate.grades.A,
          grade_aa: priceEstimate.grades.AA,
          grade_aaa: priceEstimate.grades.AAA,
          trend: priceEstimate.trend || null,
          trend_reason: priceEstimate.trendReason || null,
        });
      }

      toast({
        title: "Dispositivo alienato",
        description: "Il dispositivo è stato aggiunto all'inventario usato",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error forfeiting device:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'alienazione",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'alto': return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'basso': return <TrendingDown className="h-4 w-4 text-rose-500" />;
      default: return <Minus className="h-4 w-4 text-amber-500" />;
    }
  };

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case 'alto': return 'text-emerald-500';
      case 'basso': return 'text-rose-500';
      default: return 'text-amber-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Aliena Dispositivo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Device Info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">
                {repair.device_brand} {repair.device_model}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Questo dispositivo verrà contrassegnato come alienato e aggiunto all'inventario usato per la vendita.
            </p>
          </div>

          {/* AI Price Estimation */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <Label className="font-medium">Stima Prezzo AI</Label>
            </div>

            {isEstimating ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : priceEstimate ? (
              <div className="space-y-3">
                {/* Storage Options */}
                {allStorageEstimates && Object.keys(allStorageEstimates).length > 1 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Capacità Storage</Label>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(allStorageEstimates).map((storageKey) => (
                        <Button
                          key={storageKey}
                          variant={selectedStorageOption === storageKey ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleStorageSelect(storageKey)}
                        >
                          {storageKey}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grade Selection */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Seleziona Grado</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {['B', 'A', 'AA', 'AAA'].map((grade) => {
                      const gradePrice = priceEstimate?.grades?.[grade as keyof typeof priceEstimate.grades];
                      return (
                        <Button
                          key={grade}
                          variant={selectedGrade === grade ? "default" : "outline"}
                          size="sm"
                          className="flex-col h-auto py-2"
                          onClick={() => handleGradeSelect(grade)}
                        >
                          <span className="text-xs font-semibold">Grado {grade}</span>
                          <span className="text-sm font-bold">
                            €{gradePrice?.toFixed(0) || '-'}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Trend Info */}
                {priceEstimate.trend && (
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    {getTrendIcon(priceEstimate.trend)}
                    <span className={`text-sm ${getTrendColor(priceEstimate.trend)}`}>
                      Trend: {priceEstimate.trend === 'alto' ? 'In salita' : priceEstimate.trend === 'basso' ? 'In discesa' : 'Stabile'}
                    </span>
                    {priceEstimate.trendReason && (
                      <span className="text-xs text-muted-foreground">
                        - {priceEstimate.trendReason}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nessuna stima disponibile. Inserisci il prezzo manualmente.
              </p>
            )}
          </div>

          {/* Manual Price Input */}
          <div className="space-y-2">
            <Label htmlFor="price">Prezzo di Vendita</Label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="pl-10"
              />
            </div>
          </div>

          {/* Storage Capacity (manual if not from AI) */}
          {!allStorageEstimates && (
            <div className="space-y-2">
              <Label htmlFor="storage">Capacità Storage (opzionale)</Label>
              <Input
                id="storage"
                value={storageCapacity}
                onChange={(e) => setStorageCapacity(e.target.value)}
                placeholder="es. 128GB"
              />
            </div>
          )}

          {/* Condition */}
          <div className="space-y-2">
            <Label>Condizione</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {conditionOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleForfeit} disabled={saving || !price}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aliena e Metti in Vendita
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
