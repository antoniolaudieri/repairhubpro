import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { 
  Mail, Plus, Trash2, Edit, ArrowRight, Clock, Loader2, 
  ChevronDown, ChevronUp, GripVertical 
} from "lucide-react";
import { toast } from "sonner";

type Sequence = {
  id: string;
  name: string;
  description: string | null;
  target_type: string;
  is_active: boolean;
  total_steps: number;
  created_at: string;
};

type SequenceStep = {
  id: string;
  sequence_id: string;
  step_number: number;
  template_id: string;
  delay_days: number;
  condition: string | null;
  is_active: boolean;
  template?: {
    name: string;
    subject: string;
    type: string;
  };
};

export function SequencesTab() {
  const queryClient = useQueryClient();
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddStepDialogOpen, setIsAddStepDialogOpen] = useState(false);
  const [newSequence, setNewSequence] = useState({
    name: "",
    description: "",
    target_type: "centro",
  });
  const [newStep, setNewStep] = useState({
    template_id: "",
    delay_days: "0",
    condition: "none",
  });

  // Fetch sequences
  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ["marketing-sequences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_email_sequences")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Sequence[];
    },
  });

  // Fetch steps for selected sequence
  const { data: steps = [] } = useQuery({
    queryKey: ["marketing-sequence-steps", selectedSequence?.id],
    queryFn: async () => {
      if (!selectedSequence) return [];
      const { data, error } = await supabase
        .from("marketing_sequence_steps")
        .select(`
          *,
          template:marketing_templates(name, subject, type)
        `)
        .eq("sequence_id", selectedSequence.id)
        .order("step_number");
      if (error) throw error;
      return data as SequenceStep[];
    },
    enabled: !!selectedSequence,
  });

  // Fetch templates for dropdown
  const { data: templates = [] } = useQuery({
    queryKey: ["marketing-templates-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_templates")
        .select("id, name, type")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Add sequence mutation
  const addSequenceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("marketing_email_sequences").insert({
        name: newSequence.name,
        description: newSequence.description || null,
        target_type: newSequence.target_type,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-sequences"] });
      toast.success("Sequenza creata");
      setIsAddDialogOpen(false);
      setNewSequence({ name: "", description: "", target_type: "centro" });
    },
    onError: () => {
      toast.error("Errore nella creazione");
    },
  });

  // Toggle sequence mutation
  const toggleSequenceMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("marketing_email_sequences")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-sequences"] });
    },
  });

  // Delete sequence mutation
  const deleteSequenceMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete steps
      await supabase.from("marketing_sequence_steps").delete().eq("sequence_id", id);
      // Then delete sequence
      const { error } = await supabase.from("marketing_email_sequences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-sequences"] });
      toast.success("Sequenza eliminata");
      setSelectedSequence(null);
    },
    onError: () => {
      toast.error("Errore nell'eliminazione");
    },
  });

  // Add step mutation
  const addStepMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSequence) return;
      const nextStepNumber = steps.length > 0 
        ? Math.max(...steps.map(s => s.step_number)) + 1 
        : 1;
      
      const { error } = await supabase.from("marketing_sequence_steps").insert({
        sequence_id: selectedSequence.id,
        step_number: nextStepNumber,
        template_id: newStep.template_id,
        delay_days: parseInt(newStep.delay_days),
        condition: newStep.condition === "none" ? null : newStep.condition,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-sequence-steps"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-sequences"] });
      toast.success("Step aggiunto");
      setIsAddStepDialogOpen(false);
      setNewStep({ template_id: "", delay_days: "0", condition: "none" });
    },
    onError: () => {
      toast.error("Errore nell'aggiunta");
    },
  });

  // Delete step mutation
  const deleteStepMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_sequence_steps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-sequence-steps"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-sequences"] });
      toast.success("Step eliminato");
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Sequenze Email</h2>
          <p className="text-sm text-muted-foreground">
            Gestisci le sequenze di email automatiche per l'onboarding
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuova Sequenza
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sequences List */}
        <div className="space-y-4">
          <h3 className="font-medium text-muted-foreground">Sequenze disponibili</h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sequences.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nessuna sequenza configurata
              </CardContent>
            </Card>
          ) : (
            sequences.map((seq) => (
              <Card 
                key={seq.id}
                className={`cursor-pointer transition-colors ${
                  selectedSequence?.id === seq.id ? "border-primary" : ""
                }`}
                onClick={() => setSelectedSequence(seq)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{seq.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {seq.target_type === "centro" ? "Centri" : 
                             seq.target_type === "corner" ? "Corner" : "Entrambi"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {seq.total_steps} email
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={seq.is_active}
                        onCheckedChange={(checked) => {
                          toggleSequenceMutation.mutate({ id: seq.id, is_active: checked });
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Eliminare questa sequenza?")) {
                            deleteSequenceMutation.mutate(seq.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {seq.description && (
                    <p className="text-sm text-muted-foreground mt-2">{seq.description}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Sequence Steps */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-muted-foreground">
              {selectedSequence ? `Step di "${selectedSequence.name}"` : "Seleziona una sequenza"}
            </h3>
            {selectedSequence && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setIsAddStepDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi Step
              </Button>
            )}
          </div>

          {selectedSequence ? (
            steps.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nessuno step configurato per questa sequenza
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <Card key={step.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                            {step.step_number}
                          </div>
                          {index < steps.length - 1 && (
                            <div className="w-0.5 h-8 bg-border mt-2" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{step.template?.name || "Template"}</h4>
                              <p className="text-sm text-muted-foreground">
                                {step.template?.subject}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteStepMutation.mutate(step.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {step.delay_days === 0 
                                ? "Immediato" 
                                : `Dopo ${step.delay_days} giorni`}
                            </Badge>
                            {step.condition && (
                              <Badge variant="outline" className="text-xs">
                                {step.condition === "no_response" 
                                  ? "Se nessuna risposta"
                                  : step.condition === "opened"
                                  ? "Se email aperta"
                                  : step.condition === "clicked"
                                  ? "Se link cliccato"
                                  : step.condition}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Seleziona una sequenza per vedere i suoi step</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Sequence Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuova Sequenza Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome sequenza</Label>
              <Input
                placeholder="Es. Onboarding Centro Premium"
                value={newSequence.name}
                onChange={(e) => setNewSequence(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrizione (opzionale)</Label>
              <Textarea
                placeholder="Descrivi lo scopo di questa sequenza..."
                value={newSequence.description}
                onChange={(e) => setNewSequence(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Target</Label>
              <Select
                value={newSequence.target_type}
                onValueChange={(value) => setNewSequence(prev => ({ ...prev, target_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="centro">Solo Centri</SelectItem>
                  <SelectItem value="corner">Solo Corner</SelectItem>
                  <SelectItem value="both">Entrambi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Annulla
            </Button>
            <Button 
              onClick={() => addSequenceMutation.mutate()}
              disabled={!newSequence.name}
            >
              Crea Sequenza
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Step Dialog */}
      <Dialog open={isAddStepDialogOpen} onOpenChange={setIsAddStepDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi Step alla Sequenza</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Email</Label>
              <Select
                value={newStep.template_id}
                onValueChange={(value) => setNewStep(prev => ({ ...prev, template_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Delay (giorni dopo step precedente)</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={newStep.delay_days}
                onChange={(e) => setNewStep(prev => ({ ...prev, delay_days: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Condizione (opzionale)</Label>
              <Select
                value={newStep.condition}
                onValueChange={(value) => setNewStep(prev => ({ ...prev, condition: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuna condizione</SelectItem>
                  <SelectItem value="no_response">Se nessuna risposta</SelectItem>
                  <SelectItem value="opened">Se email precedente aperta</SelectItem>
                  <SelectItem value="clicked">Se link cliccato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddStepDialogOpen(false)}>
              Annulla
            </Button>
            <Button 
              onClick={() => addStepMutation.mutate()}
              disabled={!newStep.template_id}
            >
              Aggiungi Step
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
