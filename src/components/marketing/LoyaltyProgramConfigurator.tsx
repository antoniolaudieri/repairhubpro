import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoyaltyCardDesigner } from "./LoyaltyCardDesigner";
import { LoyaltyProgramSettings, DEFAULT_SETTINGS } from "@/hooks/useLoyaltyProgramSettings";
import { Save, Palette, Euro, Gift, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface LoyaltyProgramConfiguratorProps {
  settings: LoyaltyProgramSettings | null;
  centroName: string;
  centroLogo: string | null;
  onSave: (settings: Partial<LoyaltyProgramSettings>) => Promise<boolean>;
  saving: boolean;
}

const TEMPLATES = [
  { id: 'gold', name: 'Oro', color: '#f59e0b' },
  { id: 'silver', name: 'Argento', color: '#94a3b8' },
  { id: 'premium', name: 'Premium', color: '#8b5cf6' },
  { id: 'modern', name: 'Moderno', color: '#06b6d4' },
  { id: 'classic', name: 'Classico', color: '#10b981' },
];

const ACCENT_COLORS = [
  '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6', 
  '#06b6d4', '#10b981', '#84cc16', '#f97316', '#6366f1',
];

export function LoyaltyProgramConfigurator({
  settings,
  centroName,
  centroLogo,
  onSave,
  saving,
}: LoyaltyProgramConfiguratorProps) {
  const [formData, setFormData] = useState<Partial<LoyaltyProgramSettings>>({
    ...DEFAULT_SETTINGS,
    ...settings,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({ ...DEFAULT_SETTINGS, ...settings });
    }
  }, [settings]);

  const handleSave = async () => {
    await onSave(formData);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File troppo grande",
        description: "L'immagine deve essere inferiore a 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `loyalty-bg-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('centro-logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('centro-logos')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, card_background_url: publicUrl }));
      toast({
        title: "Immagine caricata",
        description: "Lo sfondo della tessera è stato aggiornato.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare l'immagine.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeBackground = () => {
    setFormData(prev => ({ ...prev, card_background_url: null }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Configuration Panel */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Configura Programma Fedeltà
            </CardTitle>
            <CardDescription>
              Personalizza prezzo, benefici e aspetto della tessera
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pricing" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pricing" className="flex items-center gap-1">
                  <Euro className="h-4 w-4" />
                  Prezzi
                </TabsTrigger>
                <TabsTrigger value="benefits" className="flex items-center gap-1">
                  <Gift className="h-4 w-4" />
                  Benefici
                </TabsTrigger>
                <TabsTrigger value="design" className="flex items-center gap-1">
                  <Palette className="h-4 w-4" />
                  Design
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pricing" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Prezzo Annuale</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[formData.annual_price || 30]}
                      onValueChange={([value]) => setFormData(prev => ({ ...prev, annual_price: value }))}
                      min={15}
                      max={100}
                      step={5}
                      className="flex-1"
                    />
                    <div className="w-20 text-right font-bold text-lg">
                      €{formData.annual_price}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Commissione piattaforma: 5% (€{((formData.annual_price || 30) * 0.05).toFixed(2)})
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Tariffa Diagnostica Ridotta</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[formData.diagnostic_fee || 10]}
                      onValueChange={([value]) => setFormData(prev => ({ ...prev, diagnostic_fee: value }))}
                      min={0}
                      max={15}
                      step={1}
                      className="flex-1"
                    />
                    <div className="w-20 text-right font-bold text-lg">
                      €{formData.diagnostic_fee}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tariffa standard: €15 | Risparmio cliente: €{15 - (formData.diagnostic_fee || 10)}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="benefits" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Sconto Riparazioni (%)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[formData.repair_discount_percent || 10]}
                      onValueChange={([value]) => setFormData(prev => ({ ...prev, repair_discount_percent: value }))}
                      min={5}
                      max={25}
                      step={5}
                      className="flex-1"
                    />
                    <div className="w-20 text-right font-bold text-lg">
                      {formData.repair_discount_percent}%
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Numero Massimo Dispositivi</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[formData.max_devices || 3]}
                      onValueChange={([value]) => setFormData(prev => ({ ...prev, max_devices: value }))}
                      min={1}
                      max={10}
                      step={1}
                      className="flex-1"
                    />
                    <div className="w-20 text-right font-bold text-lg">
                      {formData.max_devices}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Validità (mesi)</Label>
                  <Select
                    value={String(formData.validity_months || 12)}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, validity_months: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 mesi</SelectItem>
                      <SelectItem value="12">12 mesi (1 anno)</SelectItem>
                      <SelectItem value="24">24 mesi (2 anni)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="design" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Slogan / Tagline</Label>
                  <Input
                    value={formData.promo_tagline || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, promo_tagline: e.target.value }))}
                    placeholder="Es: Cliente Fedeltà, VIP Member..."
                    maxLength={30}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Template Tessera</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setFormData(prev => ({ ...prev, card_template: template.id }))}
                        className={`p-2 rounded-lg border-2 transition-all ${
                          formData.card_template === template.id
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div 
                          className="h-8 rounded-md mb-1"
                          style={{ background: `linear-gradient(135deg, ${template.color}, ${template.color}80)` }}
                        />
                        <span className="text-xs">{template.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Colore Accento</Label>
                  <div className="flex flex-wrap gap-2">
                    {ACCENT_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFormData(prev => ({ ...prev, card_accent_color: color }))}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.card_accent_color === color
                            ? 'border-foreground scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <Input
                      type="color"
                      value={formData.card_accent_color || '#f59e0b'}
                      onChange={(e) => setFormData(prev => ({ ...prev, card_accent_color: e.target.value }))}
                      className="w-8 h-8 p-0 border-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Sfondo Personalizzato</Label>
                  {formData.card_background_url ? (
                    <div className="relative">
                      <img 
                        src={formData.card_background_url} 
                        alt="Background" 
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={removeBackground}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="bg-upload"
                        disabled={uploading}
                      />
                      <label
                        htmlFor="bg-upload"
                        className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {uploading ? 'Caricamento...' : 'Carica immagine (max 2MB)'}
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Activation Toggle */}
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <h4 className="font-medium">Programma Attivo</h4>
              <p className="text-sm text-muted-foreground">
                Quando attivo, i clienti possono attivare tessere
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvataggio...' : 'Salva Configurazione'}
        </Button>
      </div>

      {/* Preview Panel */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Anteprima Tessera</h3>
        <div className="flex justify-center">
          <LoyaltyCardDesigner
            settings={formData}
            centroName={centroName}
            centroLogo={centroLogo}
          />
        </div>

        {/* Benefits Summary */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Riepilogo Benefici</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Diagnostica ridotta</span>
              <span className="font-medium">€{formData.diagnostic_fee} (invece di €15)</span>
            </div>
            <div className="flex justify-between">
              <span>Sconto riparazioni</span>
              <span className="font-medium">{formData.repair_discount_percent}%</span>
            </div>
            <div className="flex justify-between">
              <span>Dispositivi coperti</span>
              <span className="font-medium">{formData.max_devices}</span>
            </div>
            <div className="flex justify-between">
              <span>Validità</span>
              <span className="font-medium">{formData.validity_months} mesi</span>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between font-bold">
              <span>Prezzo tessera</span>
              <span>€{formData.annual_price}/anno</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tuo guadagno netto</span>
              <span>€{((formData.annual_price || 30) * 0.95).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
