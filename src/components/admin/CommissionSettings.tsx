import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Percent, Save, RefreshCw, Building2, Store, Wrench, Globe } from "lucide-react";
import { motion } from "framer-motion";

interface PlatformSetting {
  id: string;
  key: string;
  value: number;
  label: string;
  description: string | null;
  min_value: number;
  max_value: number;
}

const settingIcons: Record<string, React.ElementType> = {
  platform_commission_rate: Globe,
  default_corner_commission_rate: Store,
  default_riparatore_commission_rate: Wrench,
  default_centro_commission_rate: Building2,
};

const settingColors: Record<string, string> = {
  platform_commission_rate: "from-primary to-primary-glow",
  default_corner_commission_rate: "from-warning to-warning/70",
  default_riparatore_commission_rate: "from-info to-info/70",
  default_centro_commission_rate: "from-success to-success/70",
};

export function CommissionSettings() {
  const queryClient = useQueryClient();
  const [editedValues, setEditedValues] = useState<Record<string, number>>({});

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .order("key");
      if (error) throw error;
      return data as PlatformSetting[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const { error } = await supabase
        .from("platform_settings")
        .update({ value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast.success("Impostazione aggiornata");
    },
    onError: () => {
      toast.error("Errore nell'aggiornamento");
    },
  });

  const handleValueChange = (key: string, value: number) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = (setting: PlatformSetting) => {
    const newValue = editedValues[setting.key] ?? setting.value;
    updateMutation.mutate({ id: setting.id, value: newValue });
    setEditedValues(prev => {
      const next = { ...prev };
      delete next[setting.key];
      return next;
    });
  };

  const handleReset = (key: string) => {
    setEditedValues(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Calculate total distribution for visualization
  const platformRate = editedValues["platform_commission_rate"] ?? 
    settings.find(s => s.key === "platform_commission_rate")?.value ?? 20;
  const cornerRate = editedValues["default_corner_commission_rate"] ?? 
    settings.find(s => s.key === "default_corner_commission_rate")?.value ?? 10;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            Distribuzione Commissioni
          </CardTitle>
          <CardDescription>
            Esempio distribuzione su margine lordo di €100 (con Corner coinvolto)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-8 rounded-full overflow-hidden flex bg-muted">
              <motion.div 
                className="bg-gradient-to-r from-primary to-primary-glow flex items-center justify-center text-xs font-medium text-primary-foreground"
                style={{ width: `${platformRate}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${platformRate}%` }}
                transition={{ duration: 0.5 }}
              >
                {platformRate}%
              </motion.div>
              <motion.div 
                className="bg-gradient-to-r from-warning to-warning/70 flex items-center justify-center text-xs font-medium text-warning-foreground"
                style={{ width: `${cornerRate}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${cornerRate}%` }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                {cornerRate}%
              </motion.div>
              <motion.div 
                className="bg-gradient-to-r from-success to-success/70 flex items-center justify-center text-xs font-medium text-success-foreground flex-1"
                initial={{ width: 0 }}
                animate={{ width: "auto" }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {100 - platformRate - cornerRate}%
              </motion.div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="font-medium text-primary">€{platformRate}</p>
                <p className="text-xs text-muted-foreground">Piattaforma</p>
              </div>
              <div>
                <p className="font-medium text-warning">€{cornerRate}</p>
                <p className="text-xs text-muted-foreground">Corner</p>
              </div>
              <div>
                <p className="font-medium text-success">€{100 - platformRate - cornerRate}</p>
                <p className="text-xs text-muted-foreground">Provider (Centro/Riparatore)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {settings.map((setting, index) => {
          const Icon = settingIcons[setting.key] || Percent;
          const colorClass = settingColors[setting.key] || "from-primary to-primary-glow";
          const currentValue = editedValues[setting.key] ?? setting.value;
          const hasChanges = editedValues[setting.key] !== undefined;

          return (
            <motion.div
              key={setting.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`bg-card/50 backdrop-blur border-border/50 ${hasChanges ? 'ring-2 ring-primary/50' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${colorClass}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{setting.label}</CardTitle>
                      {setting.description && (
                        <CardDescription className="text-xs mt-0.5">
                          {setting.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">
                        Valore attuale
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={currentValue}
                          onChange={(e) => handleValueChange(setting.key, Number(e.target.value))}
                          min={setting.min_value}
                          max={setting.max_value}
                          step={1}
                          className="w-20 h-8 text-center font-medium"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                    <Slider
                      value={[currentValue]}
                      onValueChange={([v]) => handleValueChange(setting.key, v)}
                      min={setting.min_value}
                      max={setting.max_value}
                      step={1}
                      className="py-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{setting.min_value}%</span>
                      <span>{setting.max_value}%</span>
                    </div>
                  </div>

                  {hasChanges && (
                    <div className="flex gap-2 pt-2 border-t border-border/50">
                      <Button
                        size="sm"
                        onClick={() => handleSave(setting)}
                        disabled={updateMutation.isPending}
                        className="flex-1"
                      >
                        <Save className="h-3.5 w-3.5 mr-1" />
                        Salva
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReset(setting.key)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Info Note */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> Le percentuali di default vengono applicate ai nuovi provider al momento della registrazione. 
            Le commissioni individuali possono essere modificate per ogni singolo Corner, Riparatore o Centro dalla loro scheda di dettaglio.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}