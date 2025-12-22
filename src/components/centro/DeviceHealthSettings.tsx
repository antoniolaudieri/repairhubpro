import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Activity, Battery, HardDrive, Cpu, Save, Settings2, 
  Smartphone, FileText, Gift, Bell, ChevronDown, Loader2,
  AlertTriangle, QrCode, Copy, ExternalLink, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface DeviceHealthSettingsProps {
  centroId: string;
}

interface HealthSettings {
  id?: string;
  is_enabled: boolean;
  sync_interval_hours: number;
  battery_warning_threshold: number;
  battery_critical_threshold: number;
  storage_warning_threshold: number;
  storage_critical_threshold: number;
  health_score_warning_threshold: number;
  health_score_critical_threshold: number;
  auto_discount_on_critical: boolean;
  warning_discount_percent: number;
  critical_discount_percent: number;
  points_per_checkup: number;
  badge_after_checkups: number;
  quiz_reminder_days: number;
  android_monitoring_enabled: boolean;
  ios_webapp_enabled: boolean;
}

const defaultSettings: HealthSettings = {
  is_enabled: false,
  sync_interval_hours: 12,
  battery_warning_threshold: 30,
  battery_critical_threshold: 20,
  storage_warning_threshold: 80,
  storage_critical_threshold: 95,
  health_score_warning_threshold: 60,
  health_score_critical_threshold: 40,
  auto_discount_on_critical: true,
  warning_discount_percent: 10,
  critical_discount_percent: 20,
  points_per_checkup: 10,
  badge_after_checkups: 5,
  quiz_reminder_days: 30,
  android_monitoring_enabled: true,
  ios_webapp_enabled: true,
};

export function DeviceHealthSettings({ centroId }: DeviceHealthSettingsProps) {
  const [settings, setSettings] = useState<HealthSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [centroId]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("device_health_settings")
        .select("*")
        .eq("centro_id", centroId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setSettings(data as unknown as HealthSettings);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("device_health_settings")
        .upsert({
          centro_id: centroId,
          ...settings,
        }, { onConflict: "centro_id" });

      if (error) throw error;
      toast.success("Impostazioni salvate");
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const quizUrl = `${window.location.origin}/device-health`;

  const copyLink = () => {
    navigator.clipboard.writeText(quizUrl);
    toast.success("Link copiato!");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Device Health Monitor
            </CardTitle>
            <CardDescription>
              Monitora la salute dei dispositivi dei clienti con tessera fedeltà
            </CardDescription>
          </div>
          <Switch
            checked={settings.is_enabled}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, is_enabled: checked }))}
          />
        </div>
      </CardHeader>

      {settings.is_enabled && (
        <CardContent className="space-y-6">
          {/* Platform Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Android APK</p>
                  <p className="text-xs text-muted-foreground">Monitoring in background</p>
                </div>
              </div>
              <Switch
                checked={settings.android_monitoring_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, android_monitoring_enabled: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">iOS WebApp</p>
                  <p className="text-xs text-muted-foreground">Quiz diagnostico</p>
                </div>
              </div>
              <Switch
                checked={settings.ios_webapp_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, ios_webapp_enabled: checked }))}
              />
            </div>
          </div>

          {/* Quick Access - iOS Quiz Link */}
          {settings.ios_webapp_enabled && (
            <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Link Quiz iOS</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowQR(!showQR)}>
                  {showQR ? "Nascondi QR" : "Mostra QR"}
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Input 
                  value={quizUrl} 
                  readOnly 
                  className="text-xs h-8 bg-background"
                />
                <Button variant="outline" size="sm" onClick={copyLink} className="h-8">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open(quizUrl, "_blank")} className="h-8">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>

              {showQR && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCodeSVG value={quizUrl} size={150} />
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Condividi questo link con i clienti possessori di tessera fedeltà per effettuare il check-up del dispositivo.
              </p>
            </div>
          )}

          {/* Sync Settings */}
          {settings.android_monitoring_enabled && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Frequenza Sincronizzazione Android
              </Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[settings.sync_interval_hours]}
                  onValueChange={([value]) => setSettings(prev => ({ ...prev, sync_interval_hours: value }))}
                  min={1}
                  max={24}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-20 text-right">
                  Ogni {settings.sync_interval_hours}h
                </span>
              </div>
            </div>
          )}

          {/* Gamification */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Gift className="h-4 w-4" />
                Punti per Check-up
              </Label>
              <Input
                type="number"
                value={settings.points_per_checkup}
                onChange={(e) => setSettings(prev => ({ ...prev, points_per_checkup: parseInt(e.target.value) || 0 }))}
                min={0}
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Badge dopo N check-up
              </Label>
              <Input
                type="number"
                value={settings.badge_after_checkups}
                onChange={(e) => setSettings(prev => ({ ...prev, badge_after_checkups: parseInt(e.target.value) || 1 }))}
                min={1}
                max={20}
              />
            </div>
          </div>

          {/* Quiz Reminder */}
          {settings.ios_webapp_enabled && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Bell className="h-4 w-4" />
                Promemoria Quiz (giorni)
              </Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[settings.quiz_reminder_days]}
                  onValueChange={([value]) => setSettings(prev => ({ ...prev, quiz_reminder_days: value }))}
                  min={7}
                  max={90}
                  step={7}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-20 text-right">
                  {settings.quiz_reminder_days} giorni
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Invia un promemoria se il cliente non effettua un check-up entro questo periodo
              </p>
            </div>
          )}

          {/* Advanced Settings */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Impostazioni Avanzate
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-6 pt-4">
              {/* Thresholds */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Soglie di Allerta
                </h4>
                
                <div className="grid gap-4">
                  {/* Battery */}
                  <div className="p-3 rounded-lg border space-y-3">
                    <div className="flex items-center gap-2">
                      <Battery className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Batteria</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Warning (%)</Label>
                        <Input
                          type="number"
                          value={settings.battery_warning_threshold}
                          onChange={(e) => setSettings(prev => ({ ...prev, battery_warning_threshold: parseInt(e.target.value) || 0 }))}
                          min={0}
                          max={100}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Critical (%)</Label>
                        <Input
                          type="number"
                          value={settings.battery_critical_threshold}
                          onChange={(e) => setSettings(prev => ({ ...prev, battery_critical_threshold: parseInt(e.target.value) || 0 }))}
                          min={0}
                          max={100}
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Storage */}
                  <div className="p-3 rounded-lg border space-y-3">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Storage</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Warning (% usato)</Label>
                        <Input
                          type="number"
                          value={settings.storage_warning_threshold}
                          onChange={(e) => setSettings(prev => ({ ...prev, storage_warning_threshold: parseInt(e.target.value) || 0 }))}
                          min={0}
                          max={100}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Critical (% usato)</Label>
                        <Input
                          type="number"
                          value={settings.storage_critical_threshold}
                          onChange={(e) => setSettings(prev => ({ ...prev, storage_critical_threshold: parseInt(e.target.value) || 0 }))}
                          min={0}
                          max={100}
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Health Score */}
                  <div className="p-3 rounded-lg border space-y-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Punteggio Salute</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Warning (sotto)</Label>
                        <Input
                          type="number"
                          value={settings.health_score_warning_threshold}
                          onChange={(e) => setSettings(prev => ({ ...prev, health_score_warning_threshold: parseInt(e.target.value) || 0 }))}
                          min={0}
                          max={100}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Critical (sotto)</Label>
                        <Input
                          type="number"
                          value={settings.health_score_critical_threshold}
                          onChange={(e) => setSettings(prev => ({ ...prev, health_score_critical_threshold: parseInt(e.target.value) || 0 }))}
                          min={0}
                          max={100}
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto Discounts */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Gift className="h-4 w-4 text-accent" />
                    Sconti Automatici
                  </h4>
                  <Switch
                    checked={settings.auto_discount_on_critical}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_discount_on_critical: checked }))}
                  />
                </div>
                
                {settings.auto_discount_on_critical && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Sconto Warning (%)</Label>
                      <Input
                        type="number"
                        value={settings.warning_discount_percent}
                        onChange={(e) => setSettings(prev => ({ ...prev, warning_discount_percent: parseInt(e.target.value) || 0 }))}
                        min={0}
                        max={50}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Sconto Critical (%)</Label>
                      <Input
                        type="number"
                        value={settings.critical_discount_percent}
                        onChange={(e) => setSettings(prev => ({ ...prev, critical_discount_percent: parseInt(e.target.value) || 0 }))}
                        min={0}
                        max={50}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Invia automaticamente un'email con sconto quando il punteggio salute scende sotto le soglie
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salva Impostazioni Device Health
              </>
            )}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
