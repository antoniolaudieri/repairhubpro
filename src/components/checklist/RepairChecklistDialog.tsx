import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ChecklistItemRow } from './ChecklistItemRow';
import { generateChecklistPDF } from './ChecklistPDFGenerator';
import SignatureCanvas from 'react-signature-canvas';
import { 
  ClipboardCheck, 
  Camera, 
  FileText, 
  Download, 
  Save, 
  Loader2,
  Eraser,
  PenTool,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ItemStatus = 'ok' | 'damaged' | 'not_working' | 'not_applicable';

interface ChecklistItem {
  id?: string;
  item_name: string;
  category: string;
  status: ItemStatus;
  notes: string;
  photo_url: string;
  sort_order: number;
}

interface ConditionAssessment {
  screen?: ItemStatus;
  back_cover?: ItemStatus;
  frame?: ItemStatus;
  buttons?: ItemStatus;
  camera_lens?: ItemStatus;
  charging_port?: ItemStatus;
  speakers?: ItemStatus;
  overall_condition?: ItemStatus;
  visible_damage_notes?: string;
}

interface RepairChecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repairId: string;
  deviceType: string;
  checklistType: 'pre_repair' | 'post_repair';
  customerName: string;
  deviceInfo: string;
  existingChecklistId?: string;
  onSuccess?: () => void;
  aiConditionAssessment?: ConditionAssessment;
}

export function RepairChecklistDialog({
  open,
  onOpenChange,
  repairId,
  deviceType,
  checklistType,
  customerName,
  deviceInfo,
  existingChecklistId,
  onSuccess,
  aiConditionAssessment
}: RepairChecklistDialogProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generalNotes, setGeneralNotes] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const signatureRef = useRef<SignatureCanvas>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPhotoItemIndex, setCurrentPhotoItemIndex] = useState<number | null>(null);

  // Normalize device type for template matching
  const normalizedDeviceType = deviceType?.toLowerCase().includes('phone') 
    ? 'smartphone' 
    : deviceType?.toLowerCase().includes('tablet') 
      ? 'tablet' 
      : deviceType?.toLowerCase().includes('laptop') || deviceType?.toLowerCase().includes('computer')
        ? 'laptop'
        : 'smartphone';

  useEffect(() => {
    if (open) {
      loadChecklistData();
    }
  }, [open, existingChecklistId]);

  const loadChecklistData = async () => {
    setLoading(true);
    try {
      if (existingChecklistId) {
        // Load existing checklist
        const { data: checklist } = await supabase
          .from('repair_checklists')
          .select('*')
          .eq('id', existingChecklistId)
          .single();

        if (checklist) {
          setGeneralNotes(checklist.notes || '');
          setSignature(checklist.customer_signature);

          const { data: existingItems } = await supabase
            .from('checklist_items')
            .select('*')
            .eq('checklist_id', existingChecklistId)
            .order('sort_order');

          if (existingItems && existingItems.length > 0) {
            setItems(existingItems.map(item => ({
              ...item,
              status: item.status as ItemStatus,
              notes: item.notes || '',
              photo_url: item.photo_url || ''
            })));
            setActiveCategory(existingItems[0].category);
          }
        }
      } else {
        // Load templates for new checklist
        const { data: templates } = await supabase
          .from('checklist_templates')
          .select('*')
          .eq('device_type', normalizedDeviceType)
          .eq('is_active', true)
          .order('sort_order');

        if (templates && templates.length > 0) {
          // Map AI condition assessment to checklist items
          const getAIStatus = (itemName: string): ItemStatus => {
            if (!aiConditionAssessment) return 'ok';
            
            const nameLower = itemName.toLowerCase();
            if (nameLower.includes('schermo') || nameLower.includes('display') || nameLower.includes('lcd')) {
              return aiConditionAssessment.screen || 'ok';
            }
            if (nameLower.includes('scocca') || nameLower.includes('back') || nameLower.includes('posteriore')) {
              return aiConditionAssessment.back_cover || 'ok';
            }
            if (nameLower.includes('cornice') || nameLower.includes('frame') || nameLower.includes('bordi')) {
              return aiConditionAssessment.frame || 'ok';
            }
            if (nameLower.includes('tast') || nameLower.includes('button') || nameLower.includes('pulsant')) {
              return aiConditionAssessment.buttons || 'ok';
            }
            if (nameLower.includes('fotocamera') || nameLower.includes('camera') || nameLower.includes('lente')) {
              return aiConditionAssessment.camera_lens || 'ok';
            }
            if (nameLower.includes('ricarica') || nameLower.includes('charging') || nameLower.includes('usb') || nameLower.includes('lightning')) {
              return aiConditionAssessment.charging_port || 'ok';
            }
            if (nameLower.includes('altoparlan') || nameLower.includes('speaker') || nameLower.includes('audio')) {
              return aiConditionAssessment.speakers || 'ok';
            }
            return 'ok';
          };

          setItems(templates.map(t => ({
            item_name: t.item_name,
            category: t.category,
            status: getAIStatus(t.item_name),
            notes: '',
            photo_url: '',
            sort_order: t.sort_order
          })));
          setActiveCategory(templates[0].category);
          
          // Set general notes from AI if available
          if (aiConditionAssessment?.visible_damage_notes) {
            setGeneralNotes(`[AI] ${aiConditionAssessment.visible_damage_notes}`);
          }
        }
      }
    } catch (error) {
      console.error('Error loading checklist:', error);
      toast.error('Errore nel caricamento della checklist');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (index: number, status: ItemStatus) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, status } : item
    ));
  };

  const handleNotesChange = (index: number, notes: string) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, notes } : item
    ));
  };

  const handlePhotoCapture = (index: number) => {
    setCurrentPhotoItemIndex(index);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || currentPhotoItemIndex === null) return;

    try {
      // Upload to Supabase Storage
      const fileName = `checklist-${repairId}-${Date.now()}.${file.name.split('.').pop()}`;
      const { data, error } = await supabase.storage
        .from('repair-photos')
        .upload(fileName, file);

      if (error) {
        // If bucket doesn't exist, use base64
        const reader = new FileReader();
        reader.onloadend = () => {
          setItems(prev => prev.map((item, i) => 
            i === currentPhotoItemIndex ? { ...item, photo_url: reader.result as string } : item
          ));
        };
        reader.readAsDataURL(file);
      } else {
        const { data: urlData } = supabase.storage
          .from('repair-photos')
          .getPublicUrl(fileName);
        
        setItems(prev => prev.map((item, i) => 
          i === currentPhotoItemIndex ? { ...item, photo_url: urlData.publicUrl } : item
        ));
      }
    } catch (error) {
      // Fallback to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setItems(prev => prev.map((item, i) => 
          i === currentPhotoItemIndex ? { ...item, photo_url: reader.result as string } : item
        ));
      };
      reader.readAsDataURL(file);
    }

    setCurrentPhotoItemIndex(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearSignature = () => {
    signatureRef.current?.clear();
    setSignature(null);
  };

  const handleSaveSignature = () => {
    if (signatureRef.current?.isEmpty()) {
      toast.error('Per favore firma prima di salvare');
      return;
    }
    setSignature(signatureRef.current?.toDataURL() || null);
    toast.success('Firma salvata');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let checklistId = existingChecklistId;

      if (!checklistId) {
        // Create new checklist
        const { data: newChecklist, error: createError } = await supabase
          .from('repair_checklists')
          .insert({
            repair_id: repairId,
            checklist_type: checklistType,
            created_by: user?.id,
            notes: generalNotes,
            customer_signature: signature,
            signed_at: signature ? new Date().toISOString() : null
          })
          .select()
          .single();

        if (createError) throw createError;
        checklistId = newChecklist.id;
      } else {
        // Update existing checklist
        await supabase
          .from('repair_checklists')
          .update({
            notes: generalNotes,
            customer_signature: signature,
            signed_at: signature ? new Date().toISOString() : null
          })
          .eq('id', checklistId);

        // Delete existing items to replace
        await supabase
          .from('checklist_items')
          .delete()
          .eq('checklist_id', checklistId);
      }

      // Insert all items
      const itemsToInsert = items.map((item, index) => ({
        checklist_id: checklistId,
        category: item.category,
        item_name: item.item_name,
        status: item.status,
        notes: item.notes || null,
        photo_url: item.photo_url || null,
        sort_order: index
      }));

      const { error: itemsError } = await supabase
        .from('checklist_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success('Checklist salvata con successo');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast.error('Errore nel salvataggio della checklist');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    generateChecklistPDF({
      checklistType,
      customerName,
      deviceInfo,
      items,
      generalNotes,
      signature,
      createdAt: new Date().toISOString()
    });
    toast.success('PDF generato con successo');
  };

  const categories = [...new Set(items.map(item => item.category))];
  const categoryItems = items.filter(item => item.category === activeCategory);

  const getStatusSummary = () => {
    const summary = {
      ok: items.filter(i => i.status === 'ok').length,
      damaged: items.filter(i => i.status === 'damaged').length,
      not_working: items.filter(i => i.status === 'not_working').length,
      not_applicable: items.filter(i => i.status === 'not_applicable').length,
    };
    return summary;
  };

  const summary = getStatusSummary();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Checklist {checklistType === 'pre_repair' ? 'Pre-Riparazione' : 'Post-Riparazione'}
          </DialogTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline">{customerName}</Badge>
            <Badge variant="secondary">{deviceInfo}</Badge>
          </div>
        </DialogHeader>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {/* Status Summary */}
            <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
              <Badge className="bg-success/20 text-success">
                OK: {summary.ok}
              </Badge>
              <Badge className="bg-warning/20 text-warning">
                Danneggiato: {summary.damaged}
              </Badge>
              <Badge className="bg-destructive/20 text-destructive">
                Non Funziona: {summary.not_working}
              </Badge>
              <Badge variant="outline">
                N/A: {summary.not_applicable}
              </Badge>
            </div>

            {/* Category Tabs */}
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="w-full flex-wrap h-auto gap-1">
                {categories.map(category => (
                  <TabsTrigger key={category} value={category} className="text-xs">
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>

              <AnimatePresence mode="wait">
                {categories.map(category => (
                  <TabsContent key={category} value={category} className="mt-4 space-y-2">
                    {categoryItems.map((item, idx) => {
                      const globalIndex = items.findIndex(i => 
                        i.item_name === item.item_name && i.category === item.category
                      );
                      return (
                        <motion.div
                          key={`${category}-${idx}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <ChecklistItemRow
                            item={item}
                            onStatusChange={(status) => handleStatusChange(globalIndex, status)}
                            onNotesChange={(notes) => handleNotesChange(globalIndex, notes)}
                            onPhotoCapture={() => handlePhotoCapture(globalIndex)}
                          />
                        </motion.div>
                      );
                    })}
                  </TabsContent>
                ))}
              </AnimatePresence>
            </Tabs>

            {/* General Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Note Generali
              </label>
              <Textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Aggiungi note generali sulla condizione del dispositivo..."
                rows={3}
              />
            </div>

            {/* Signature Section */}
            <div className="space-y-2 border-t pt-4">
              <label className="text-sm font-medium flex items-center gap-2">
                <PenTool className="h-4 w-4" />
                Firma Cliente
              </label>
              
              {signature ? (
                <div className="space-y-2">
                  <div className="border rounded-lg p-2 bg-white">
                    <img src={signature} alt="Firma" className="max-h-24 mx-auto" />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSignature(null)}
                    className="gap-2"
                  >
                    <Eraser className="h-4 w-4" />
                    Rimuovi Firma
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="border rounded-lg bg-white">
                    <SignatureCanvas
                      ref={signatureRef}
                      canvasProps={{
                        className: 'w-full h-32 rounded-lg',
                        style: { width: '100%', height: '128px' }
                      }}
                      backgroundColor="white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearSignature}
                      className="gap-2"
                    >
                      <Eraser className="h-4 w-4" />
                      Pulisci
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveSignature}
                      className="gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Conferma Firma
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={loading}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Scarica PDF
          </Button>
          
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salva Checklist
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
