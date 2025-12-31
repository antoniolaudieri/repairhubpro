import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Archive, Package, Settings2, Map } from "lucide-react";
import { useStorageSlots, MultiShelfConfig } from "@/hooks/useStorageSlots";
import { MultiShelfEditor } from "./MultiShelfEditor";
import { ShelfMapView } from "./ShelfMapView";
import { cn } from "@/lib/utils";

interface StorageSlotsSettingsProps {
  centroId: string | null;
  config: MultiShelfConfig;
  onChange: (config: MultiShelfConfig) => void;
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
  const [activeTab, setActiveTab] = useState<"settings" | "map">("settings");

  useEffect(() => {
    const fetchStats = async () => {
      if (config.enabled && centroId) {
        const s = await getSlotsStats();
        setStats(s);
      }
    };
    fetchStats();
  }, [centroId, config.enabled, getSlotsStats]);

  // Calculate total slots from all shelves
  const totalSlots = config.shelves.reduce((sum, shelf) => sum + shelf.rows * shelf.columns, 0);

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
          Configura le tue scaffalature in modo visuale e assegna automaticamente posizioni ad ogni ritiro
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
            {/* Stats Summary */}
            {config.shelves.length > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>{config.shelves.length}</strong> scaffalatur{config.shelves.length === 1 ? 'a' : 'e'}
                  </span>
                </div>
                <div className="h-4 w-px bg-border" />
                <span className="text-sm">
                  <strong>{totalSlots}</strong> slot totali
                </span>
                {stats && stats.enabled && (
                  <>
                    <div className="h-4 w-px bg-border" />
                    <Badge 
                      variant={stats.percentage >= 90 ? "destructive" : stats.percentage >= 70 ? "secondary" : "outline"}
                    >
                      {stats.occupied}/{stats.total} occupati
                    </Badge>
                  </>
                )}
              </div>
            )}

            {/* Tabs for Settings and Map */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "settings" | "map")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="settings" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  Configurazione
                </TabsTrigger>
                <TabsTrigger value="map" className="gap-2" disabled={config.shelves.length === 0}>
                  <Map className="h-4 w-4" />
                  Mappa Visuale
                </TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="mt-4">
                <MultiShelfEditor
                  config={config}
                  onChange={onChange}
                />
              </TabsContent>

              <TabsContent value="map" className="mt-4">
                <ShelfMapView 
                  centroId={centroId} 
                  compact={true}
                />
              </TabsContent>
            </Tabs>

            {/* Help Text */}
            {config.shelves.length === 0 && (
              <div className="text-center p-6 rounded-lg border border-dashed border-border/50">
                <Archive className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nessuna scaffalatura configurata.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Clicca "Aggiungi Scaffalatura" per iniziare.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
