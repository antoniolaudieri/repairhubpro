import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Edit, Copy, Plus, Trash2, Mail, MessageSquare, Eye, Code, FileText, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Template {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  content: string;
  target_type: string | null;
  is_active: boolean;
  sort_order: number;
}

// Sample HTML template for free trial CTA
const TRIAL_CTA_HTML = `
<div style="text-align:center;margin:30px 0;">
  <a href="https://linkriparo.it/auth?trial=true" 
     style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:16px 32px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;font-size:16px;box-shadow:0 4px 14px rgba(37,99,235,0.4);">
    🚀 Inizia la Prova Gratuita
  </a>
</div>`;

// Sample professional HTML template
const PROFESSIONAL_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:30px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:28px;">LinkRiparo</h1>
      <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;">Sistema di Gestione Riparazioni</p>
    </div>
    
    <!-- Content -->
    <div style="padding:40px 30px;">
      <h2 style="color:#1a1a1a;margin:0 0 20px;">Ciao {{business_name}},</h2>
      
      <p style="color:#555;margin:0 0 20px;">
        Sono Riccardo, fondatore di LinkRiparo. Ho notato che gestisci un'attività di riparazioni e volevo presentarti la nostra piattaforma.
      </p>
      
      <p style="color:#555;margin:0 0 20px;">
        LinkRiparo ti permette di:
      </p>
      
      <ul style="color:#555;padding-left:20px;margin:0 0 30px;">
        <li style="margin-bottom:10px;">📱 Gestire le riparazioni in modo digitale</li>
        <li style="margin-bottom:10px;">👥 Fidelizzare i clienti con il sistema loyalty</li>
        <li style="margin-bottom:10px;">📊 Monitorare le statistiche del tuo business</li>
        <li style="margin-bottom:10px;">🔔 Comunicare automaticamente con i clienti</li>
      </ul>
      
      <!-- CTA Button -->
      <div style="text-align:center;margin:30px 0;">
        <a href="https://linkriparo.it/auth?trial=true" 
           style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:16px 32px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;font-size:16px;box-shadow:0 4px 14px rgba(37,99,235,0.4);">
          Inizia la Prova Gratuita
        </a>
      </div>
      
      <p style="color:#555;margin:30px 0 0;">
        Resto a disposizione per qualsiasi domanda.<br><br>
        A presto,<br>
        <strong>Riccardo C.</strong><br>
        <span style="color:#888;">Fondatore LinkRiparo</span>
      </p>
    </div>
    
    <!-- Footer with logo -->
    <div style="background:#f8f9fa;padding:20px;text-align:center;border-top:1px solid #e0e0e0;">
      <p style="color:#888;margin:0;font-size:12px;">
        © 2024 LinkRiparo - Sistema di Gestione Riparazioni
      </p>
    </div>
  </div>
</body>
</html>`;

export function TemplatesManager() {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    type: "email",
    subject: "",
    content: "",
    target_type: "centro",
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["marketing-templates-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_templates")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Template[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (template: Partial<Template> & { id: string }) => {
      const { error } = await supabase
        .from("marketing_templates")
        .update({
          name: template.name,
          type: template.type,
          subject: template.subject,
          content: template.content,
          target_type: template.target_type as "centro" | "corner" | "altro" | "computer" | "elettronica" | "telefonia" | null,
        })
        .eq("id", template.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-templates-all"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-templates"] });
      toast.success("Template aggiornato!");
      setIsEditing(false);
      setSelectedTemplate(null);
    },
    onError: () => toast.error("Errore nell'aggiornamento"),
  });

  const createMutation = useMutation({
    mutationFn: async (template: Omit<Template, "id" | "is_active" | "sort_order">) => {
      const { error } = await supabase
        .from("marketing_templates")
        .insert({
          name: template.name,
          type: template.type,
          subject: template.subject,
          content: template.content,
          target_type: template.target_type as "centro" | "corner" | "altro" | "computer" | "elettronica" | "telefonia" | null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-templates-all"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-templates"] });
      toast.success("Template creato!");
      setIsCreating(false);
      resetForm();
    },
    onError: () => toast.error("Errore nella creazione"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketing_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-templates-all"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-templates"] });
      toast.success("Template eliminato!");
    },
    onError: () => toast.error("Errore nell'eliminazione"),
  });

  const resetForm = () => {
    setEditForm({
      name: "",
      type: "email",
      subject: "",
      content: "",
      target_type: "centro",
    });
    setIsHtmlMode(false);
  };

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template);
    setEditForm({
      name: template.name,
      type: template.type,
      subject: template.subject || "",
      content: template.content,
      target_type: template.target_type || "centro",
    });
    // Check if content is HTML
    setIsHtmlMode(template.content.includes('<') && template.content.includes('>'));
    setIsEditing(true);
  };

  const handleView = (template: Template) => {
    setSelectedTemplate(template);
    setIsViewing(true);
  };

  const handleSave = () => {
    if (selectedTemplate) {
      updateMutation.mutate({
        id: selectedTemplate.id,
        ...editForm,
      });
    }
  };

  const handleCreate = () => {
    createMutation.mutate({
      name: editForm.name,
      type: editForm.type,
      subject: editForm.subject || null,
      content: editForm.content,
      target_type: editForm.target_type,
    });
  };

  const insertTrialCta = () => {
    setEditForm({
      ...editForm,
      content: editForm.content + TRIAL_CTA_HTML,
    });
    toast.success("CTA Prova Gratuita inserito!");
  };

  const useHtmlTemplate = () => {
    setEditForm({
      ...editForm,
      content: PROFESSIONAL_HTML_TEMPLATE,
    });
    setIsHtmlMode(true);
    toast.success("Template HTML professionale caricato!");
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "whatsapp":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getTargetBadge = (target: string | null) => {
    switch (target) {
      case "centro":
        return <Badge variant="default">Centro</Badge>;
      case "corner":
        return <Badge variant="secondary">Corner</Badge>;
      default:
        return <Badge variant="outline">Generico</Badge>;
    }
  };

  const isContentHtml = (content: string) => {
    return content.includes('<') && content.includes('>');
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-64 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Template Email & WhatsApp</h2>
          <p className="text-sm text-muted-foreground">
            Gestisci i template per le comunicazioni automatiche. Usa HTML per evitare lo spam.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsCreating(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getTypeIcon(template.type)}
                  <CardTitle className="text-base">{template.name}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  {isContentHtml(template.content) && (
                    <Badge variant="outline" className="text-xs">
                      <Code className="h-3 w-3 mr-1" />
                      HTML
                    </Badge>
                  )}
                  {getTargetBadge(template.target_type)}
                </div>
              </div>
              {template.subject && (
                <CardDescription className="mt-2">
                  <strong>Oggetto:</strong> {template.subject}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap flex-1">
                {template.content.replace(/<[^>]+>/g, ' ').substring(0, 150)}...
              </p>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleView(template)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Vedi
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(template)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Modifica
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(template.content);
                    toast.success("Template copiato!");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm("Eliminare questo template?")) {
                      deleteMutation.mutate(template.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Dialog */}
      <Dialog open={isViewing} onOpenChange={setIsViewing}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate && getTypeIcon(selectedTemplate.type)}
              {selectedTemplate?.name}
              {selectedTemplate && getTargetBadge(selectedTemplate.target_type)}
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue={isContentHtml(selectedTemplate?.content || '') ? 'preview' : 'source'}>
            <TabsList>
              <TabsTrigger value="preview">Anteprima</TabsTrigger>
              <TabsTrigger value="source">Codice Sorgente</TabsTrigger>
            </TabsList>
            <TabsContent value="preview">
              <ScrollArea className="max-h-[60vh]">
                {selectedTemplate?.subject && (
                  <div className="mb-4">
                    <Label className="text-muted-foreground">Oggetto</Label>
                    <p className="mt-1 font-medium">{selectedTemplate.subject}</p>
                  </div>
                )}
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={selectedTemplate?.content || ''}
                    className="w-full min-h-[400px] bg-white"
                    title="Email Preview"
                  />
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="source">
              <ScrollArea className="max-h-[60vh]">
                <pre className="p-4 bg-muted/50 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                  {selectedTemplate?.content}
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewing(false)}>
              Chiudi
            </Button>
            <Button onClick={() => { setIsViewing(false); handleEdit(selectedTemplate!); }}>
              <Edit className="h-4 w-4 mr-2" />
              Modifica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Modifica Template</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={editForm.type}
                    onValueChange={(v) => setEditForm({ ...editForm, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Target</Label>
                <Select
                  value={editForm.target_type}
                  onValueChange={(v) => setEditForm({ ...editForm, target_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="centro">Centro Assistenza</SelectItem>
                    <SelectItem value="corner">Corner / Negozio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editForm.type === "email" && (
                <div>
                  <Label>Oggetto Email</Label>
                  <Input
                    value={editForm.subject}
                    onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                    placeholder="Oggetto dell'email..."
                  />
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isHtmlMode}
                    onCheckedChange={setIsHtmlMode}
                  />
                  <Label>Modalità HTML</Label>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={useHtmlTemplate}>
                    <FileText className="h-4 w-4 mr-1" />
                    Template HTML
                  </Button>
                  <Button variant="outline" size="sm" onClick={insertTrialCta}>
                    <Sparkles className="h-4 w-4 mr-1" />
                    Inserisci CTA
                  </Button>
                </div>
              </div>

              <div>
                <Label>Contenuto</Label>
                <Textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  rows={16}
                  className={`font-mono text-sm ${isHtmlMode ? 'bg-slate-950 text-green-400' : ''}`}
                  placeholder={isHtmlMode ? "<!DOCTYPE html>..." : "Scrivi il contenuto del template..."}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Variabili: {"{{business_name}}"}, {"{{email}}"}, {"{{phone}}"}, {"{{address}}"}, {"{{website}}"}
                </p>
              </div>

              {isHtmlMode && editForm.content && (
                <div>
                  <Label>Anteprima</Label>
                  <div className="border rounded-lg overflow-hidden mt-2">
                    <iframe
                      srcDoc={editForm.content}
                      className="w-full min-h-[300px] bg-white"
                      title="Email Preview"
                    />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              Salva Modifiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Nuovo Template</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Nome del template..."
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={editForm.type}
                    onValueChange={(v) => setEditForm({ ...editForm, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Target</Label>
                <Select
                  value={editForm.target_type}
                  onValueChange={(v) => setEditForm({ ...editForm, target_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="centro">Centro Assistenza</SelectItem>
                    <SelectItem value="corner">Corner / Negozio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editForm.type === "email" && (
                <div>
                  <Label>Oggetto Email</Label>
                  <Input
                    value={editForm.subject}
                    onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                    placeholder="Oggetto dell'email..."
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isHtmlMode}
                    onCheckedChange={setIsHtmlMode}
                  />
                  <Label>Modalità HTML</Label>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={useHtmlTemplate}>
                    <FileText className="h-4 w-4 mr-1" />
                    Template HTML
                  </Button>
                  <Button variant="outline" size="sm" onClick={insertTrialCta}>
                    <Sparkles className="h-4 w-4 mr-1" />
                    Inserisci CTA
                  </Button>
                </div>
              </div>

              <div>
                <Label>Contenuto</Label>
                <Textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  rows={16}
                  className={`font-mono text-sm ${isHtmlMode ? 'bg-slate-950 text-green-400' : ''}`}
                  placeholder={isHtmlMode ? "<!DOCTYPE html>..." : "Scrivi il contenuto del template..."}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Variabili: {"{{business_name}}"}, {"{{email}}"}, {"{{phone}}"}, {"{{address}}"}, {"{{website}}"}
                </p>
              </div>

              {isHtmlMode && editForm.content && (
                <div>
                  <Label>Anteprima</Label>
                  <div className="border rounded-lg overflow-hidden mt-2">
                    <iframe
                      srcDoc={editForm.content}
                      className="w-full min-h-[300px] bg-white"
                      title="Email Preview"
                    />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Annulla
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending || !editForm.name || !editForm.content}>
              Crea Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
