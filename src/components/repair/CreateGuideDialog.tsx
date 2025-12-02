import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Save, Loader2, X, Wrench, Clock, Package, AlertCircle } from "lucide-react";

interface GuideData {
  diagnosis: {
    problem: string;
    cause: string;
    severity: string;
  };
  overview: {
    difficulty: string;
    estimatedTime: string;
    partsNeeded: string[];
    toolsNeeded: string[];
  };
  steps: Array<{
    stepNumber: number;
    title: string;
    description: string;
  }>;
  finalNotes: string;
}

interface CreateGuideDialogProps {
  onCreated: () => void;
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

const deviceTypeOptions = [
  "smartphone",
  "tablet",
  "laptop",
  "smartwatch",
  "console",
  "cuffie",
];

const difficultyOptions = ["Facile", "Medio", "Difficile", "Esperto"];

const emptyGuide = {
  device_type: "smartphone",
  device_brand: "",
  device_model: "",
  issue_category: "general_repair",
  guide_data: {
    diagnosis: {
      problem: "",
      cause: "",
      severity: "medium",
    },
    overview: {
      difficulty: "Medio",
      estimatedTime: "30-45 minuti",
      partsNeeded: [],
      toolsNeeded: [],
    },
    steps: [{ stepNumber: 1, title: "", description: "" }],
    finalNotes: "",
  } as GuideData,
};

export default function CreateGuideDialog({ onCreated }: CreateGuideDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [guide, setGuide] = useState(emptyGuide);
  const [newPart, setNewPart] = useState("");
  const [newTool, setNewTool] = useState("");

  const resetForm = () => {
    setGuide(emptyGuide);
    setNewPart("");
    setNewTool("");
  };

  const updateGuideData = <K extends keyof GuideData>(
    section: K,
    field: keyof GuideData[K],
    value: unknown
  ) => {
    setGuide((prev) => ({
      ...prev,
      guide_data: {
        ...prev.guide_data,
        [section]: {
          ...(prev.guide_data[section] as object),
          [field]: value,
        },
      },
    }));
  };

  const addPart = () => {
    if (!newPart.trim()) return;
    setGuide((prev) => ({
      ...prev,
      guide_data: {
        ...prev.guide_data,
        overview: {
          ...prev.guide_data.overview,
          partsNeeded: [...prev.guide_data.overview.partsNeeded, newPart.trim()],
        },
      },
    }));
    setNewPart("");
  };

  const removePart = (index: number) => {
    setGuide((prev) => ({
      ...prev,
      guide_data: {
        ...prev.guide_data,
        overview: {
          ...prev.guide_data.overview,
          partsNeeded: prev.guide_data.overview.partsNeeded.filter((_, i) => i !== index),
        },
      },
    }));
  };

  const addTool = () => {
    if (!newTool.trim()) return;
    setGuide((prev) => ({
      ...prev,
      guide_data: {
        ...prev.guide_data,
        overview: {
          ...prev.guide_data.overview,
          toolsNeeded: [...prev.guide_data.overview.toolsNeeded, newTool.trim()],
        },
      },
    }));
    setNewTool("");
  };

  const removeTool = (index: number) => {
    setGuide((prev) => ({
      ...prev,
      guide_data: {
        ...prev.guide_data,
        overview: {
          ...prev.guide_data.overview,
          toolsNeeded: prev.guide_data.overview.toolsNeeded.filter((_, i) => i !== index),
        },
      },
    }));
  };

  const addStep = () => {
    setGuide((prev) => ({
      ...prev,
      guide_data: {
        ...prev.guide_data,
        steps: [
          ...prev.guide_data.steps,
          { stepNumber: prev.guide_data.steps.length + 1, title: "", description: "" },
        ],
      },
    }));
  };

  const updateStep = (index: number, field: "title" | "description", value: string) => {
    setGuide((prev) => ({
      ...prev,
      guide_data: {
        ...prev.guide_data,
        steps: prev.guide_data.steps.map((step, i) =>
          i === index ? { ...step, [field]: value } : step
        ),
      },
    }));
  };

  const removeStep = (index: number) => {
    if (guide.guide_data.steps.length <= 1) return;
    setGuide((prev) => ({
      ...prev,
      guide_data: {
        ...prev.guide_data,
        steps: prev.guide_data.steps
          .filter((_, i) => i !== index)
          .map((step, i) => ({ ...step, stepNumber: i + 1 })),
      },
    }));
  };

  const handleSave = async () => {
    if (!guide.device_brand.trim() || !guide.device_model.trim()) {
      toast({
        title: "Campi obbligatori",
        description: "Inserisci brand e modello del dispositivo",
        variant: "destructive",
      });
      return;
    }

    if (!guide.guide_data.diagnosis.problem.trim()) {
      toast({
        title: "Campi obbligatori",
        description: "Inserisci la descrizione del problema",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("repair_guides").insert({
        device_type: guide.device_type,
        device_brand: guide.device_brand,
        device_model: guide.device_model,
        issue_category: guide.issue_category,
        guide_data: JSON.parse(JSON.stringify(guide.guide_data)) as Json,
        usage_count: 0,
      });

      if (error) throw error;

      toast({
        title: "Guida Creata",
        description: "La nuova guida è stata salvata con successo",
      });
      resetForm();
      setOpen(false);
      onCreated();
    } catch (error) {
      console.error("Error creating guide:", error);
      toast({
        title: "Errore",
        description: "Impossibile creare la guida",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuova Guida
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Crea Nuova Guida
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
                <Label>Brand *</Label>
                <Input
                  value={guide.device_brand}
                  onChange={(e) => setGuide({ ...guide, device_brand: e.target.value })}
                  placeholder="es. Apple, Samsung..."
                />
              </div>
              <div className="space-y-2">
                <Label>Modello *</Label>
                <Input
                  value={guide.device_model}
                  onChange={(e) => setGuide({ ...guide, device_model: e.target.value })}
                  placeholder="es. iPhone 14, Galaxy S23..."
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo Dispositivo</Label>
                <Select
                  value={guide.device_type}
                  onValueChange={(value) => setGuide({ ...guide, device_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria Problema</Label>
                <Select
                  value={guide.issue_category}
                  onValueChange={(value) => setGuide({ ...guide, issue_category: value })}
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
              <Label>Problema *</Label>
              <Textarea
                value={guide.guide_data.diagnosis.problem}
                onChange={(e) => updateGuideData("diagnosis", "problem", e.target.value)}
                rows={2}
                placeholder="Descrivi il problema..."
              />
            </div>
            <div className="space-y-2">
              <Label>Causa</Label>
              <Input
                value={guide.guide_data.diagnosis.cause}
                onChange={(e) => updateGuideData("diagnosis", "cause", e.target.value)}
                placeholder="Causa probabile del problema..."
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
                  value={guide.guide_data.overview.difficulty}
                  onValueChange={(value) => updateGuideData("overview", "difficulty", value)}
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
                  value={guide.guide_data.overview.estimatedTime}
                  onChange={(e) => updateGuideData("overview", "estimatedTime", e.target.value)}
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
              {guide.guide_data.overview.partsNeeded.map((part, idx) => (
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
              {guide.guide_data.overview.toolsNeeded.map((tool, idx) => (
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Step della Guida
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={addStep} className="gap-1">
                <Plus className="h-3.5 w-3.5" />
                Aggiungi Step
              </Button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {guide.guide_data.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-1">
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={step.title}
                      onChange={(e) => updateStep(idx, "title", e.target.value)}
                      placeholder="Titolo step..."
                    />
                    <Textarea
                      value={step.description}
                      onChange={(e) => updateStep(idx, "description", e.target.value)}
                      placeholder="Descrizione dettagliata..."
                      rows={2}
                    />
                  </div>
                  {guide.guide_data.steps.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(idx)}
                      className="text-destructive hover:text-destructive flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Final Notes */}
          <div className="space-y-2">
            <Label>Note Finali</Label>
            <Textarea
              value={guide.guide_data.finalNotes}
              onChange={(e) =>
                setGuide((prev) => ({
                  ...prev,
                  guide_data: { ...prev.guide_data, finalNotes: e.target.value },
                }))
              }
              rows={2}
              placeholder="Note finali per il tecnico..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Crea Guida
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
