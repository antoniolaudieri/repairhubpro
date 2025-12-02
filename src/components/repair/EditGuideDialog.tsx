import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Save, Loader2, Plus, X, Wrench, Clock, Package, AlertCircle } from "lucide-react";

interface GuideData {
  diagnosis?: {
    problem: string;
    cause?: string;
    severity?: string;
  };
  overview?: {
    difficulty: string;
    estimatedTime: string;
    partsNeeded?: string[];
    toolsNeeded?: string[];
  };
  steps?: Array<{
    stepNumber?: number;
    title: string;
    description?: string;
    imageUrl?: string;
    warnings?: string[];
    tips?: string[];
  }>;
  troubleshooting?: Array<{
    problem: string;
    solution: string;
  }>;
  finalNotes?: string;
}

interface RepairGuide {
  id: string;
  device_type: string;
  device_brand: string;
  device_model: string;
  issue_category: string;
  guide_data: GuideData;
  usage_count: number;
  created_at: string;
}

interface EditGuideDialogProps {
  guide: RepairGuide;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updatedGuide: RepairGuide) => void;
}

const issueCategoryOptions = [
  { value: "screen_display", label: "Schermo/Display" },
  { value: "battery", label: "Batteria" },
  { value: "charging_port", label: "Porta Ricarica" },
  { value: "camera", label: "Fotocamera" },
  { value: "audio", label: "Audio/Speaker" },
  { value: "touch", label: "Touch/Digitizer" },
  { value: "back_cover", label: "Cover Posteriore" },
  { value: "buttons", label: "Pulsanti" },
  { value: "software", label: "Software" },
  { value: "water_damage", label: "Danni da Acqua" },
  { value: "general_repair", label: "Riparazione Generica" },
];

const difficultyOptions = ["Facile", "Medio", "Difficile", "Esperto"];

export default function EditGuideDialog({
  guide,
  open,
  onOpenChange,
  onSaved,
}: EditGuideDialogProps) {
  const [saving, setSaving] = useState(false);
  const [editedGuide, setEditedGuide] = useState<RepairGuide>({ ...guide });
  const [newPart, setNewPart] = useState("");
  const [newTool, setNewTool] = useState("");

  const updateGuideData = (path: string[], value: unknown) => {
    setEditedGuide((prev) => {
      const newGuideData = { ...prev.guide_data };
      let current: Record<string, unknown> = newGuideData;
      
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current[path[i]] = { ...(current[path[i]] as Record<string, unknown>) };
        current = current[path[i]] as Record<string, unknown>;
      }
      
      current[path[path.length - 1]] = value;
      return { ...prev, guide_data: newGuideData as GuideData };
    });
  };

  const addPart = () => {
    if (!newPart.trim()) return;
    const currentParts = editedGuide.guide_data?.overview?.partsNeeded || [];
    updateGuideData(["overview", "partsNeeded"], [...currentParts, newPart.trim()]);
    setNewPart("");
  };

  const removePart = (index: number) => {
    const currentParts = editedGuide.guide_data?.overview?.partsNeeded || [];
    updateGuideData(["overview", "partsNeeded"], currentParts.filter((_, i) => i !== index));
  };

  const addTool = () => {
    if (!newTool.trim()) return;
    const currentTools = editedGuide.guide_data?.overview?.toolsNeeded || [];
    updateGuideData(["overview", "toolsNeeded"], [...currentTools, newTool.trim()]);
    setNewTool("");
  };

  const removeTool = (index: number) => {
    const currentTools = editedGuide.guide_data?.overview?.toolsNeeded || [];
    updateGuideData(["overview", "toolsNeeded"], currentTools.filter((_, i) => i !== index));
  };

  const updateStepTitle = (index: number, title: string) => {
    const steps = [...(editedGuide.guide_data?.steps || [])];
    steps[index] = { ...steps[index], title };
    updateGuideData(["steps"], steps);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("repair_guides")
        .update({
          device_brand: editedGuide.device_brand,
          device_model: editedGuide.device_model,
          device_type: editedGuide.device_type,
          issue_category: editedGuide.issue_category,
          guide_data: JSON.parse(JSON.stringify(editedGuide.guide_data)) as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", guide.id);

      if (error) throw error;

      onSaved(editedGuide);
      onOpenChange(false);
      toast({
        title: "Guida Aggiornata",
        description: "Le modifiche sono state salvate con successo",
      });
    } catch (error) {
      console.error("Error updating guide:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le modifiche",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Modifica Guida
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Device Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Informazioni Dispositivo
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Brand</Label>
                <Input
                  value={editedGuide.device_brand}
                  onChange={(e) =>
                    setEditedGuide({ ...editedGuide, device_brand: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Modello</Label>
                <Input
                  value={editedGuide.device_model}
                  onChange={(e) =>
                    setEditedGuide({ ...editedGuide, device_model: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo Dispositivo</Label>
                <Input
                  value={editedGuide.device_type}
                  onChange={(e) =>
                    setEditedGuide({ ...editedGuide, device_type: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria Problema</Label>
                <Select
                  value={editedGuide.issue_category}
                  onValueChange={(value) =>
                    setEditedGuide({ ...editedGuide, issue_category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {issueCategoryOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Diagnosis */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Diagnosi
            </h3>
            <div className="space-y-2">
              <Label>Problema</Label>
              <Textarea
                value={editedGuide.guide_data?.diagnosis?.problem || ""}
                onChange={(e) => updateGuideData(["diagnosis", "problem"], e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Overview */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Panoramica
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Difficoltà</Label>
                <Select
                  value={editedGuide.guide_data?.overview?.difficulty || "Medio"}
                  onValueChange={(value) => updateGuideData(["overview", "difficulty"], value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tempo Stimato</Label>
                <Input
                  value={editedGuide.guide_data?.overview?.estimatedTime || ""}
                  onChange={(e) => updateGuideData(["overview", "estimatedTime"], e.target.value)}
                  placeholder="es. 30-45 minuti"
                />
              </div>
            </div>
          </div>

          {/* Parts Needed */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Package className="h-4 w-4" />
              Ricambi Necessari
            </h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {(editedGuide.guide_data?.overview?.partsNeeded || []).map((part, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                  {part}
                  <button
                    onClick={() => removePart(idx)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Aggiungi ricambio..."
                value={newPart}
                onChange={(e) => setNewPart(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPart())}
              />
              <Button type="button" variant="outline" size="icon" onClick={addPart}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tools Needed */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Strumenti Necessari
            </h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {(editedGuide.guide_data?.overview?.toolsNeeded || []).map((tool, idx) => (
                <Badge key={idx} variant="outline" className="gap-1 pr-1">
                  {tool}
                  <button
                    onClick={() => removeTool(idx)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Aggiungi strumento..."
                value={newTool}
                onChange={(e) => setNewTool(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTool())}
              />
              <Button type="button" variant="outline" size="icon" onClick={addTool}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Steps */}
          {editedGuide.guide_data?.steps && editedGuide.guide_data.steps.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Step della Guida ({editedGuide.guide_data.steps.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {editedGuide.guide_data.steps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                      {idx + 1}
                    </div>
                    <Input
                      value={step.title}
                      onChange={(e) => updateStepTitle(idx, e.target.value)}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Notes */}
          <div className="space-y-2">
            <Label>Note Finali</Label>
            <Textarea
              value={editedGuide.guide_data?.finalNotes || ""}
              onChange={(e) => updateGuideData(["finalNotes"], e.target.value)}
              rows={2}
              placeholder="Note finali per il tecnico..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salva Modifiche
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
