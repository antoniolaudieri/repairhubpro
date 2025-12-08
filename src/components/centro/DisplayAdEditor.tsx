import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Loader2,
  Smartphone,
  Wrench,
  Shield,
  Cpu,
  Tablet,
  Monitor,
  Zap,
  Star,
  Type,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Move
} from "lucide-react";

export interface DisplayAd {
  id: string;
  title: string;
  description: string;
  gradient: string;
  icon: string;
  imageUrl?: string;
  type: 'gradient' | 'image';
  // New styling options
  imagePosition?: 'center' | 'top' | 'bottom';
  textAlign?: 'left' | 'center' | 'right';
  textPosition?: 'bottom' | 'center' | 'top';
  titleFont?: string;
  descriptionFont?: string;
}

interface DisplayAdEditorProps {
  ad: DisplayAd;
  open: boolean;
  onClose: () => void;
  onSave: (ad: DisplayAd) => void;
  centroId: string;
}

const defaultGradients = [
  { label: "Blu/Ciano", value: "from-blue-500 to-cyan-500" },
  { label: "Verde/Smeraldo", value: "from-green-500 to-emerald-500" },
  { label: "Viola/Rosa", value: "from-purple-500 to-pink-500" },
  { label: "Arancio/Rosso", value: "from-orange-500 to-red-500" },
  { label: "Indaco/Viola", value: "from-indigo-500 to-violet-500" },
  { label: "Giallo/Ambra", value: "from-yellow-500 to-amber-500" },
  { label: "Nero/Grigio", value: "from-gray-800 to-gray-900" },
  { label: "Rosa/Fucsia", value: "from-pink-500 to-fuchsia-500" },
];

const iconOptions = [
  { label: "Smartphone", value: "smartphone", icon: Smartphone },
  { label: "Riparazione", value: "wrench", icon: Wrench },
  { label: "Scudo", value: "shield", icon: Shield },
  { label: "CPU", value: "cpu", icon: Cpu },
  { label: "Tablet", value: "tablet", icon: Tablet },
  { label: "Monitor", value: "monitor", icon: Monitor },
  { label: "Fulmine", value: "zap", icon: Zap },
  { label: "Stella", value: "star", icon: Star },
];

const fontOptions = [
  { label: "Sans (Default)", value: "font-sans" },
  { label: "Serif (Elegante)", value: "font-serif" },
  { label: "Mono (Tecnico)", value: "font-mono" },
];

const getIconComponent = (iconName: string) => {
  const found = iconOptions.find(i => i.value === iconName);
  return found?.icon || Smartphone;
};

export function DisplayAdEditor({ ad, open, onClose, onSave, centroId }: DisplayAdEditorProps) {
  const [editedAd, setEditedAd] = useState<DisplayAd>({
    ...ad,
    imagePosition: ad.imagePosition || 'center',
    textAlign: ad.textAlign || 'center',
    textPosition: ad.textPosition || 'bottom',
    titleFont: ad.titleFont || 'font-sans',
    descriptionFont: ad.descriptionFont || 'font-sans',
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Seleziona un file immagine");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Il file deve essere inferiore a 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `display-ads/${centroId}/${editedAd.id}-${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('centro-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('centro-logos')
        .getPublicUrl(fileName);

      setEditedAd(prev => ({ ...prev, imageUrl: publicUrl, type: 'image' }));
      toast.success("Immagine caricata!");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(`Errore: ${error.message || 'Impossibile caricare l\'immagine'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!editedAd.imageUrl) return;
    setEditedAd(prev => ({ ...prev, imageUrl: undefined, type: 'gradient' }));
    toast.success("Immagine rimossa");
  };

  const handleSave = () => {
    if (!editedAd.title.trim()) {
      toast.error("Inserisci un titolo");
      return;
    }
    onSave(editedAd);
    onClose();
  };

  const IconComponent = getIconComponent(editedAd.icon);

  // Dynamic classes for text positioning
  const getTextPositionClasses = () => {
    const alignClass = {
      left: 'text-left items-start',
      center: 'text-center items-center',
      right: 'text-right items-end'
    }[editedAd.textAlign || 'center'];
    
    const positionClass = {
      bottom: 'justify-end pb-6',
      center: 'justify-center',
      top: 'justify-start pt-6'
    }[editedAd.textPosition || 'bottom'];
    
    return `${alignClass} ${positionClass}`;
  };

  const getImagePositionClass = () => {
    return {
      center: 'object-center',
      top: 'object-top',
      bottom: 'object-bottom'
    }[editedAd.imagePosition || 'center'];
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Editor Slide Pubblicità
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Anteprima</Label>
            <div className="relative rounded-xl overflow-hidden h-48 shadow-lg">
              {editedAd.type === 'image' && editedAd.imageUrl ? (
                <div className="relative h-full">
                  <img 
                    src={editedAd.imageUrl} 
                    alt="Preview" 
                    className={`w-full h-full object-cover ${getImagePositionClass()}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  <div className={`absolute inset-0 flex flex-col px-6 ${getTextPositionClasses()}`}>
                    <h3 className={`text-2xl font-bold text-white ${editedAd.titleFont}`}>
                      {editedAd.title || "Titolo"}
                    </h3>
                    <p className={`text-white/80 ${editedAd.descriptionFont}`}>
                      {editedAd.description || "Descrizione"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className={`h-full bg-gradient-to-br ${editedAd.gradient} flex flex-col text-white p-6 ${getTextPositionClasses()}`}>
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4">
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <h3 className={`text-2xl font-bold ${editedAd.titleFont}`}>
                    {editedAd.title || "Titolo"}
                  </h3>
                  <p className={`text-white/80 ${editedAd.descriptionFont}`}>
                    {editedAd.description || "Descrizione"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tipo Slide */}
          <Tabs 
            value={editedAd.type} 
            onValueChange={(value) => setEditedAd(prev => ({ ...prev, type: value as 'gradient' | 'image' }))}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="gradient" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Gradiente + Icona
              </TabsTrigger>
              <TabsTrigger value="image" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Immagine Custom
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gradient" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Icona</Label>
                  <Select
                    value={editedAd.icon}
                    onValueChange={(value) => setEditedAd(prev => ({ ...prev, icon: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((icon) => {
                        const Icon = icon.icon;
                        return (
                          <SelectItem key={icon.value} value={icon.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {icon.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs">Colore Gradiente</Label>
                  <Select
                    value={editedAd.gradient}
                    onValueChange={(value) => setEditedAd(prev => ({ ...prev, gradient: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {defaultGradients.map((grad) => (
                        <SelectItem key={grad.value} value={grad.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded bg-gradient-to-r ${grad.value}`} />
                            {grad.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="image" className="space-y-4 mt-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                {editedAd.imageUrl ? (
                  <div className="space-y-4">
                    <img 
                      src={editedAd.imageUrl} 
                      alt="Uploaded" 
                      className="max-h-32 mx-auto rounded-lg object-cover"
                    />
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Cambia Immagine
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveImage}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Rimuovi
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Carica un'immagine per la tua pubblicità (max 5MB)
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {isUploading ? "Caricamento..." : "Carica Immagine"}
                      </Button>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              
              {/* Image Position */}
              {editedAd.imageUrl && (
                <div>
                  <Label className="text-xs flex items-center gap-2">
                    <Move className="h-3 w-3" />
                    Posizione Immagine
                  </Label>
                  <div className="flex gap-2 mt-1">
                    {(['top', 'center', 'bottom'] as const).map((pos) => (
                      <Button
                        key={pos}
                        variant={editedAd.imagePosition === pos ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEditedAd(prev => ({ ...prev, imagePosition: pos }))}
                        className="flex-1"
                      >
                        {pos === 'top' ? 'Alto' : pos === 'center' ? 'Centro' : 'Basso'}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Consigliato: immagini 1920x1080px per la migliore qualità
              </p>
            </TabsContent>
          </Tabs>

          {/* Text Styling */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/50">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Type className="h-4 w-4" />
              Stile Testo
            </Label>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Text Align */}
              <div>
                <Label className="text-xs">Allineamento</Label>
                <div className="flex gap-1 mt-1">
                  <Button
                    variant={editedAd.textAlign === 'left' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditedAd(prev => ({ ...prev, textAlign: 'left' }))}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={editedAd.textAlign === 'center' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditedAd(prev => ({ ...prev, textAlign: 'center' }))}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={editedAd.textAlign === 'right' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditedAd(prev => ({ ...prev, textAlign: 'right' }))}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Text Position */}
              <div>
                <Label className="text-xs">Posizione Testo</Label>
                <div className="flex gap-1 mt-1">
                  {(['top', 'center', 'bottom'] as const).map((pos) => (
                    <Button
                      key={pos}
                      variant={editedAd.textPosition === pos ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditedAd(prev => ({ ...prev, textPosition: pos }))}
                      className="flex-1 text-xs"
                    >
                      {pos === 'top' ? 'Alto' : pos === 'center' ? 'Centro' : 'Basso'}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Title Font */}
              <div>
                <Label className="text-xs">Font Titolo</Label>
                <Select
                  value={editedAd.titleFont}
                  onValueChange={(value) => setEditedAd(prev => ({ ...prev, titleFont: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span className={font.value}>{font.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Description Font */}
              <div>
                <Label className="text-xs">Font Descrizione</Label>
                <Select
                  value={editedAd.descriptionFont}
                  onValueChange={(value) => setEditedAd(prev => ({ ...prev, descriptionFont: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span className={font.value}>{font.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Testo */}
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Titolo *
              </Label>
              <Input
                value={editedAd.title}
                onChange={(e) => setEditedAd(prev => ({ ...prev, title: e.target.value }))}
                placeholder="es. Riparazione Express"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Descrizione</Label>
              <Textarea
                value={editedAd.description}
                onChange={(e) => setEditedAd(prev => ({ ...prev, description: e.target.value }))}
                placeholder="es. Riparazioni smartphone in meno di 1 ora"
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button onClick={handleSave}>
            Salva Modifiche
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}