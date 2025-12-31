import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Archive, Package } from "lucide-react";
import { useStorageSlots, StorageSlotsConfig } from "@/hooks/useStorageSlots";
import { cn } from "@/lib/utils";

interface StorageSlotsSettingsProps {
  centroId: string | null;
  config: StorageSlotsConfig;
  onChange: (config: StorageSlotsConfig) => void;
}

export function StorageSlotsSettings({ centroId, config, onChange }: StorageSlotsSettingsProps) {
  const { getSlotsStats } = useStorageSlots(centroId);
  const [stats, setStats] = useState<{
    enabled: boolean;
    total: number;
    occupied: number;
    available: number;
    percentage: number;
    occupiedSlots?: number[];
    prefix?: string;
  } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (config.enabled && centroId) {
        const s = await getSlotsStats();
        setStats(s);
      }
    };
    fetchStats();
  }, [centroId, config.enabled, getSlotsStats]);

  return (
    <Card className="border border-border/50 hover:border-border transition-colors">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
            <Archive className="h-4 w-4 text-white" />
          </div>
          Gestione Scaffalatura
        </CardTitle>
        <CardDescription className="text-xs">
          Assegna automaticamente una posizione sullo scaffale ad ogni ritiro
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Abilita gestione posizioni</Label>
            <p className="text-xs text-muted-foreground">
              Ogni nuovo ritiro riceverà uno slot automatico
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => onChange({ ...config, enabled })}
          />
        </div>

        {config.enabled && (
          <>
            {/* Max Slots */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Numero massimo slot</Label>
                <Input
                  type="number"
                  min={1}
                  max={999}
                  value={config.max_slots}
                  onChange={(e) => onChange({ ...config, max_slots: parseInt(e.target.value) || 50 })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs">Prefisso (opzionale)</Label>
                <Input
                  type="text"
                  maxLength={5}
                  value={config.prefix}
                  onChange={(e) => onChange({ ...config, prefix: e.target.value })}
                  placeholder="es. A, SCAFF-"
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Stats */}
            {stats && stats.enabled && (
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Stato attuale</span>
                  <Badge variant={stats.percentage >= 90 ? "destructive" : stats.percentage >= 70 ? "secondary" : "outline"}>
                    {stats.occupied}/{stats.total} occupati ({stats.percentage}%)
                  </Badge>
                </div>

                {/* Visual Grid */}
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: Math.min(config.max_slots, 50) }, (_, i) => i + 1).map((slot) => {
                    const isOccupied = stats.occupiedSlots?.includes(slot);
                    return (
                      <div
                        key={slot}
                        className={cn(
                          "aspect-square rounded flex items-center justify-center text-[10px] font-medium transition-colors",
                          isOccupied
                            ? "bg-destructive/20 text-destructive border border-destructive/30"
                            : "bg-emerald-500/20 text-emerald-600 border border-emerald-500/30"
                        )}
                        title={isOccupied ? `Slot ${slot} - Occupato` : `Slot ${slot} - Libero`}
                      >
                        {slot}
                      </div>
                    );
                  })}
                </div>

                {config.max_slots > 50 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Mostrando i primi 50 slot su {config.max_slots}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30" />
                    <span className="text-muted-foreground">Libero ({stats.available})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-destructive/20 border border-destructive/30" />
                    <span className="text-muted-foreground">Occupato ({stats.occupied})</span>
                  </div>
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="rounded-lg border border-dashed border-border p-3">
              <p className="text-xs text-muted-foreground mb-2">Anteprima etichetta slot:</p>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-md">
                <Package className="h-4 w-4" />
                <span className="font-mono font-bold">
                  {config.prefix ? `${config.prefix}12` : "SLOT 12"}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
