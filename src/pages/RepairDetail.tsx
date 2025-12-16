import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Lightbulb, 
  Loader2,
  Save,
  Wrench,
  Package,
  AlertCircle,
  Clock,
  CheckCircle,
  Trash2,
  User,
  Smartphone,
  Phone,
  Mail,
  MapPin,
  Key,
  Hash,
  Calendar,
  Euro,
  Sparkles,
  ChevronRight,
  Shield,
  FileText,
  MessageCircle,
  ClipboardCheck,
  Truck,
  Send
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import AddRepairPartsDialog from "@/components/repair/AddRepairPartsDialog";
import { PatternDisplay } from "@/components/customer/PatternDisplay";
import RepairGuide from "@/components/repair/RepairGuide";
import SelectSavedGuideDialog from "@/components/repair/SelectSavedGuideDialog";
import { notifyCustomerStatusChange } from "@/services/pushNotificationService";
import { AcceptanceFormPDF } from "@/components/repair/AcceptanceFormPDF";
import { RepairChecklistDialog } from "@/components/checklist/RepairChecklistDialog";
import { PrintLabelButton } from "@/components/repair/PrintLabelButton";
import { VisualStatusManager, DIRECT_REPAIR_STATUSES } from "@/components/repair/VisualStatusManager";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getStatusMessage, openWhatsApp, openEmail, callPhone } from "@/utils/repairMessages";

interface RepairGuideData {
  diagnosis: {
    problem: string;
    cause: string;
    severity: "low" | "medium" | "high";
    repairability: number;
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
    imageUrl?: string;
    warnings?: string[];
    tips?: string[];
    checkpoints?: string[];
  }>;
  troubleshooting: Array<{
    problem: string;
    solution: string;
  }>;
  finalNotes: string;
}

interface OrderInfo {
  id: string;
  order_number: string;
  status: string;
  supplier: string;
  created_at: string;
  ordered_at: string | null;
  received_at: string | null;
}

interface RepairPart {
  id: string;
  quantity: number;
  unit_cost: number;
  spare_parts: {
    id: string;
    name: string;
    image_url: string | null;
    brand: string | null;
    category: string;
  };
}

interface CentroInfo {
  business_name: string;
  address: string;
  phone: string;
  email: string;
  vat_number: string | null;
  logo_url: string | null;
  settings: {
    email_templates?: {
      repair_status_update?: {
        subject: string;
        html: string;
      };
    };
  } | null;
}

interface RepairDetail {
  id: string;
  status: string;
  priority: string;
  diagnosis: string | null;
  repair_notes: string | null;
  estimated_cost: number | null;
  final_cost: number | null;
  acconto: number | null;
  shipping_cost: number | null;
  ai_suggestions: string | null;
  diagnostic_fee: number | null;
  diagnostic_fee_paid: boolean | null;
  intake_signature: string | null;
  intake_signature_date: string | null;
  final_cost_accepted_at: string | null;
  final_cost_accepted_by_phone: boolean | null;
  created_at: string;
  started_at: string | null;
  parts_arrived_at: string | null;
  completed_at: string | null;
  delivered_at: string | null;
  forfeited_at: string | null;
  device: {
    brand: string;
    model: string;
    device_type: string;
    reported_issue: string;
    initial_condition: string | null;
    photo_url: string | null;
    password: string | null;
    imei: string | null;
    serial_number: string | null;
  };
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    centro_id: string | null;
  };
  orders?: OrderInfo[];
  repair_parts?: RepairPart[];
  centro?: CentroInfo | null;
}

const statusConfig = {
  pending: { label: "In attesa", color: "bg-amber-500", bgLight: "bg-amber-500/10", text: "text-amber-600", icon: Clock },
  waiting_parts: { label: "Attesa ricambi", color: "bg-orange-500", bgLight: "bg-orange-500/10", text: "text-orange-600", icon: Package },
  waiting_for_parts: { label: "Attesa ricambi", color: "bg-orange-500", bgLight: "bg-orange-500/10", text: "text-orange-600", icon: Package },
  parts_arrived: { label: "Ricambi arrivati", color: "bg-teal-500", bgLight: "bg-teal-500/10", text: "text-teal-600", icon: CheckCircle },
  in_progress: { label: "In corso", color: "bg-blue-500", bgLight: "bg-blue-500/10", text: "text-blue-600", icon: Wrench },
  completed: { label: "Completata", color: "bg-emerald-500", bgLight: "bg-emerald-500/10", text: "text-emerald-600", icon: CheckCircle },
  delivered: { label: "Consegnato", color: "bg-green-600", bgLight: "bg-green-600/10", text: "text-green-700", icon: CheckCircle },
  cancelled: { label: "Annullata", color: "bg-red-500", bgLight: "bg-red-500/10", text: "text-red-600", icon: AlertCircle },
  forfeited: { label: "Alienato", color: "bg-rose-900", bgLight: "bg-rose-900/10", text: "text-rose-900", icon: AlertCircle },
};

const priorityConfig = {
  low: { label: "Bassa", color: "bg-slate-400", bgLight: "bg-slate-100", text: "text-slate-600" },
  normal: { label: "Normale", color: "bg-blue-500", bgLight: "bg-blue-50", text: "text-blue-600" },
  high: { label: "Alta", color: "bg-red-500", bgLight: "bg-red-50", text: "text-red-600" },
};

export default function RepairDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [repair, setRepair] = useState<RepairDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  const [showStartedAnimation, setShowStartedAnimation] = useState(false);
  const [repairGuide, setRepairGuide] = useState<RepairGuideData | null>(null);
  const [guideFromCache, setGuideFromCache] = useState(false);
  const [guideUsageCount, setGuideUsageCount] = useState<number | undefined>();
  const [acceptanceFormOpen, setAcceptanceFormOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistType, setChecklistType] = useState<'pre_repair' | 'post_repair'>('pre_repair');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingFinalCostEmail, setSendingFinalCostEmail] = useState(false);
  const [acceptingByPhone, setAcceptingByPhone] = useState(false);

  // Determine back route based on current path
  const isCentroContext = location.pathname.startsWith("/centro");
  const backRoute = isCentroContext ? "/centro/lavori" : "/repairs";

  useEffect(() => {
    if (id) {
      loadRepairDetail();
    }
  }, [id]);

  const loadRepairDetail = async () => {
    try {
      const { data, error } = await supabase
        .from("repairs")
        .select(`
          *,
          device:devices (
            brand,
            model,
            device_type,
            reported_issue,
            initial_condition,
            photo_url,
            password,
            imei,
            serial_number,
            customer:customers (
              id,
              name,
              phone,
              email,
              address,
              centro_id
            )
          ),
          orders (
            id,
            order_number,
            status,
            supplier,
            created_at,
            ordered_at,
            received_at
          ),
          repair_parts (
            id,
            quantity,
            unit_cost,
            spare_parts (
              id,
              name,
              image_url,
              brand,
              category
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // Load centro data if customer has centro_id
      let centroData: CentroInfo | null = null;
      if (data.device?.customer?.centro_id) {
        const { data: centro } = await supabase
          .from("centri_assistenza")
          .select("business_name, address, phone, email, vat_number, logo_url, settings")
          .eq("id", data.device.customer.centro_id)
          .single();
        
        if (centro) {
          centroData = {
            ...centro,
            settings: centro.settings as CentroInfo['settings']
          };
        }
      }

      const repairData = {
        id: data.id,
        status: data.status,
        priority: data.priority,
        diagnosis: data.diagnosis,
        repair_notes: data.repair_notes,
        estimated_cost: data.estimated_cost,
        final_cost: data.final_cost,
        acconto: data.acconto,
        shipping_cost: data.shipping_cost,
        ai_suggestions: data.ai_suggestions,
        diagnostic_fee: data.diagnostic_fee,
        diagnostic_fee_paid: data.diagnostic_fee_paid,
        intake_signature: data.intake_signature,
        intake_signature_date: data.intake_signature_date,
        final_cost_accepted_at: data.final_cost_accepted_at,
        final_cost_accepted_by_phone: data.final_cost_accepted_by_phone,
        created_at: data.created_at,
        started_at: data.started_at,
        parts_arrived_at: data.parts_arrived_at,
        completed_at: data.completed_at,
        delivered_at: data.delivered_at,
        forfeited_at: data.forfeited_at,
        device: data.device,
        customer: data.device.customer,
        orders: data.orders || [],
        repair_parts: data.repair_parts || [],
        centro: centroData,
      };
      setRepair(repairData);
      setPreviousStatus(data.status);
      
      // Try to parse stored guide JSON
      if (data.ai_suggestions) {
        try {
          const parsed = JSON.parse(data.ai_suggestions);
          if (parsed.steps && parsed.diagnosis) {
            setRepairGuide(parsed);
          }
        } catch {
          // Not JSON, it's text-based suggestions - that's fine
        }
      }
    } catch (error) {
      console.error("Error loading repair:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dettagli della riparazione",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAISuggestions = async () => {
    if (!repair) return;

    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("repair-assistant", {
        body: {
          device_type: repair.device.device_type,
          brand: repair.device.brand,
          model: repair.device.model,
          issue: repair.device.reported_issue,
          condition: repair.device.initial_condition,
        },
      });

      if (error) throw error;

      // Handle structured guide response
      if (data.isStructured && data.guide) {
        setRepairGuide(data.guide);
        setGuideFromCache(data.fromCache || false);
        setGuideUsageCount(data.usageCount);
        
        // Store a summary in ai_suggestions for backward compatibility
        const summaryText = `Guida generata: ${data.guide.steps?.length || 0} step - ${data.guide.overview?.difficulty || 'N/A'} - ${data.guide.overview?.estimatedTime || 'N/A'}`;
        setRepair({ ...repair, ai_suggestions: summaryText });
        
        await supabase
          .from("repairs")
          .update({ ai_suggestions: JSON.stringify(data.guide) })
          .eq("id", id);

        toast({
          title: "Guida Riparazione Generata",
          description: `${data.guide.steps?.length || 0} step con immagini e suggerimenti`,
        });

        if (data.fromCache) {
          toast({
            title: "📚 Guida Esistente Trovata!",
            description: `Usata ${data.usageCount || 1} volte - ${data.guide.steps?.length || 0} step`,
            className: "bg-emerald-600 text-white border-emerald-700",
          });
        } else {
          toast({
            title: "✨ Nuova Guida Generata",
            description: `${data.guide.steps?.length || 0} step - Salvata per riutilizzo`,
          });
        }
      } else {
        // Fallback to old text-based suggestions
        const suggestions = data.suggestions;
        setRepair({ ...repair, ai_suggestions: suggestions });
        
        await supabase
          .from("repairs")
          .update({ ai_suggestions: suggestions })
          .eq("id", id);

        toast({
          title: "Suggerimenti IA generati",
          description: "I suggerimenti sono stati aggiunti alla riparazione",
        });
      }
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
      toast({
        title: "Errore",
        description: "Impossibile ottenere suggerimenti dall'IA",
        variant: "destructive",
      });
    } finally {
      setLoadingAI(false);
    }
  };

  const saveChanges = async (skipEmailPrompt = false) => {
    if (!repair) return;

    const isStartingRepair = previousStatus === "pending" && repair.status === "in_progress";
    const statusChanged = previousStatus !== repair.status;

    // If status changed and customer has email, ask about sending email
    if (statusChanged && repair.customer?.email && !skipEmailPrompt) {
      setPendingStatusChange(repair.status);
      setEmailDialogOpen(true);
      return;
    }

    await performSave(isStartingRepair, statusChanged);
  };

  const performSave = async (isStartingRepair: boolean, statusChanged: boolean) => {
    if (!repair) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("repairs")
        .update({
          status: repair.status,
          priority: repair.priority,
          diagnosis: repair.diagnosis,
          repair_notes: repair.repair_notes,
          estimated_cost: repair.estimated_cost,
          final_cost: repair.final_cost,
          acconto: repair.acconto,
          diagnostic_fee_paid: repair.diagnostic_fee_paid,
          started_at: repair.status === "in_progress" ? new Date().toISOString() : repair.started_at,
          parts_arrived_at: repair.status === "parts_arrived" ? new Date().toISOString() : repair.parts_arrived_at,
          completed_at: repair.status === "completed" ? new Date().toISOString() : repair.completed_at,
        })
        .eq("id", id);

      if (error) throw error;

      // Notify customer if status changed
      if (statusChanged && id) {
        notifyCustomerStatusChange(id, repair.status, repair.customer?.email);
      }

      if (isStartingRepair) {
        setShowStartedAnimation(true);
        setTimeout(() => setShowStartedAnimation(false), 3000);
        toast({
          title: "🔧 Riparazione Iniziata!",
          description: "La riparazione è ora in corso",
          className: "bg-primary text-primary-foreground border-primary",
        });
      } else {
        toast({
          title: "Salvato",
          description: "Le modifiche sono state salvate con successo",
        });
      }

      setPreviousStatus(repair.status);
    } catch (error) {
      console.error("Error saving changes:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le modifiche",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: "In Attesa",
      in_progress: "In Lavorazione",
      waiting_for_parts: "Attesa Ricambi",
      parts_arrived: "Ricambi Arrivati",
      completed: "Completato",
      delivered: "Consegnato",
      cancelled: "Annullato",
      forfeited: "Alienato",
    };
    return labels[status] || status;
  };

  const sendStatusEmail = async () => {
    if (!repair || !repair.customer?.email || !repair.customer?.centro_id) {
      toast({
        title: "Errore",
        description: "Dati mancanti per l'invio email",
        variant: "destructive",
      });
      return;
    }

    setSendingEmail(true);
    try {
      const statusLabel = getStatusLabel(repair.status);
      
      // Get customer ID from device via repair
      const { data: repairData } = await supabase
        .from("repairs")
        .select("device_id, devices(customer_id)")
        .eq("id", repair.id)
        .single();

      const customerId = (repairData?.devices as any)?.customer_id;

      // Check if customer has active loyalty card
      let hasLoyaltyCard = false;
      if (customerId) {
        const { data: loyaltyCard } = await supabase
          .from("loyalty_cards")
          .select("id")
          .eq("customer_id", customerId)
          .eq("centro_id", repair.customer.centro_id)
          .eq("status", "active")
          .maybeSingle();
        hasLoyaltyCard = !!loyaltyCard;
      }

      const centroName = repair.centro?.business_name || 'Il Team';
      const centroAddress = repair.centro?.address || '';
      const centroPhone = repair.centro?.phone || '';
      const centroEmail = repair.centro?.email || '';
      const centroLogo = repair.centro?.logo_url || '';
      
      // Build loyalty promotion URL
      const loyaltyCheckoutUrl = customerId && repair.customer.centro_id 
        ? `${window.location.origin}/attiva-tessera?customer_id=${customerId}&centro_id=${repair.customer.centro_id}&email=${encodeURIComponent(repair.customer.email)}&centro=${encodeURIComponent(centroName)}`
        : '';
      
      const showLoyaltyPromo = !hasLoyaltyCard && customerId && ['completed', 'ready_for_pickup', 'delivered'].includes(repair.status);

      // Check for custom template in Centro settings
      const customTemplate = repair.centro?.settings?.email_templates?.repair_status_update;
      
      let subject: string;
      let html: string;
      
      if (customTemplate?.html) {
        // Use custom template from Centro settings
        subject = customTemplate.subject
          .replace(/\{\{shop_name\}\}/g, centroName)
          .replace(/\{\{device_name\}\}/g, `${repair.device.brand} ${repair.device.model}`)
          .replace(/\{\{customer_name\}\}/g, repair.customer.name)
          .replace(/\{\{status\}\}/g, statusLabel);
        
        // Build status note from diagnosis and repair notes
        const statusNote = [repair.diagnosis, repair.repair_notes].filter(Boolean).join(' - ') || '';
        
        // Replace template variables
        html = customTemplate.html
          .replace(/\{\{shop_name\}\}/g, centroName)
          .replace(/\{\{logo_url\}\}/g, centroLogo)
          .replace(/\{\{customer_name\}\}/g, repair.customer.name)
          .replace(/\{\{device_name\}\}/g, `${repair.device.brand} ${repair.device.model}`)
          .replace(/\{\{status\}\}/g, statusLabel)
          .replace(/\{\{status_note\}\}/g, statusNote)
          .replace(/\{\{tracking_url\}\}/g, `${window.location.origin}/customer`)
          .replace(/\{\{shop_phone\}\}/g, centroPhone)
          .replace(/\{\{shop_address\}\}/g, centroAddress)
          .replace(/\{\{shop_email\}\}/g, centroEmail)
          .replace(/\{\{#if logo_url\}\}/g, centroLogo ? '' : '<!--')
          .replace(/\{\{\/if\}\}/g, centroLogo ? '' : '-->');
        
        // Add loyalty promo block if applicable
        if (showLoyaltyPromo) {
          const loyaltyPromoHtml = `<div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px;padding:24px;margin:24px 0;text-align:center;"><p style="color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px 0;">🎁 RISPARMIA SULLE PROSSIME RIPARAZIONI</p><h3 style="color:#fff;margin:0 0 12px 0;font-size:18px;">Attiva la Tessera Fedeltà!</h3><div style="text-align:left;color:#fff;font-size:13px;margin-bottom:16px;"><p style="margin:4px 0;">✓ <strong>10% di sconto</strong> su tutte le riparazioni</p><p style="margin:4px 0;">✓ <strong>Diagnostica a €10</strong> invece di €15</p><p style="margin:4px 0;">✓ <strong>Validità 1 anno</strong> - Solo €30</p></div><a href="${loyaltyCheckoutUrl}" style="display:inline-block;background:#fff;color:#d97706;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">🛒 Attiva Ora - €30/anno</a></div>`;
          // Insert before closing body tag
          html = html.replace(/<\/body>/i, loyaltyPromoHtml + '</body>');
        }
      } else {
        // Use default template (existing behavior)
        subject = `Aggiornamento Riparazione - ${repair.device.brand} ${repair.device.model}`;
        
        const diagnosisBlock = repair.diagnosis 
          ? `<div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:15px;margin:20px 0;"><h4 style="color:#166534;margin-top:0;">Diagnosi</h4><p style="color:#166534;margin-bottom:0;">${repair.diagnosis}</p></div>` 
          : '';
        
        const notesBlock = repair.repair_notes 
          ? `<div style="background:#fefce8;border-left:4px solid #eab308;padding:15px;margin:20px 0;"><h4 style="color:#854d0e;margin-top:0;">Note</h4><p style="color:#854d0e;margin-bottom:0;">${repair.repair_notes}</p></div>` 
          : '';
        
        const estimatedCostLine = repair.estimated_cost 
          ? `<p style="margin:5px 0;"><strong>Costo Stimato:</strong> €${repair.estimated_cost.toFixed(2)}</p>` 
          : '';
        
        const finalCostLine = repair.final_cost 
          ? `<p style="margin:5px 0;"><strong>Costo Finale:</strong> €${repair.final_cost.toFixed(2)}</p>` 
          : '';
        
        const accontoLine = repair.acconto 
          ? `<p style="margin:5px 0;"><strong>Acconto Versato:</strong> €${repair.acconto.toFixed(2)}</p>` 
          : '';

        const loyaltyPromoBlock = showLoyaltyPromo ? `<div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px;padding:24px;margin:24px 0;text-align:center;"><p style="color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px 0;">🎁 RISPARMIA SULLE PROSSIME RIPARAZIONI</p><h3 style="color:#fff;margin:0 0 12px 0;font-size:18px;">Attiva la Tessera Fedeltà!</h3><div style="text-align:left;color:#fff;font-size:13px;margin-bottom:16px;"><p style="margin:4px 0;">✓ <strong>10% di sconto</strong> su tutte le riparazioni</p><p style="margin:4px 0;">✓ <strong>Diagnostica a €10</strong> invece di €15</p><p style="margin:4px 0;">✓ <strong>Validità 1 anno</strong> - Solo €30</p></div><a href="${loyaltyCheckoutUrl}" style="display:inline-block;background:#fff;color:#d97706;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">🛒 Attiva Ora - €30/anno</a></div>` : '';

        html = [
          '<!DOCTYPE html><html><head><meta charset="utf-8"></head>',
          '<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">',
          '<div style="background:#fff;border-radius:12px;padding:30px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">',
          '<h1 style="color:#1a1a1a;margin-bottom:20px;">Aggiornamento Riparazione</h1>',
          `<p style="color:#666;font-size:16px;">Gentile <strong>${repair.customer.name}</strong>,</p>`,
          '<p style="color:#666;font-size:16px;">La informiamo che lo stato della sua riparazione è stato aggiornato.</p>',
          '<div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;">',
          '<h3 style="color:#1a1a1a;margin-top:0;">Dettagli Dispositivo</h3>',
          `<p style="margin:5px 0;"><strong>Tipo:</strong> ${repair.device.device_type}</p>`,
          `<p style="margin:5px 0;"><strong>Marca:</strong> ${repair.device.brand}</p>`,
          `<p style="margin:5px 0;"><strong>Modello:</strong> ${repair.device.model}</p>`,
          `<p style="margin:5px 0;"><strong>Problema:</strong> ${repair.device.reported_issue}</p>`,
          '</div>',
          '<div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:8px;padding:20px;margin:20px 0;text-align:center;">',
          '<p style="color:#fff;margin:0 0 10px 0;font-size:14px;">STATO ATTUALE</p>',
          `<p style="color:#fff;margin:0;font-size:24px;font-weight:bold;">${statusLabel}</p>`,
          '</div>',
          diagnosisBlock,
          notesBlock,
          '<div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;">',
          '<h3 style="color:#1a1a1a;margin-top:0;">Riepilogo Costi</h3>',
          estimatedCostLine,
          finalCostLine,
          accontoLine,
          '</div>',
          loyaltyPromoBlock,
          '<p style="color:#666;font-size:14px;margin-top:30px;">Per qualsiasi domanda, non esiti a contattarci.</p>',
          `<p style="color:#666;font-size:14px;">Cordiali saluti,<br><strong>${centroName}</strong></p>`,
          '</div></body></html>'
        ].join('');
      }

      const { error } = await supabase.functions.invoke("send-email-smtp", {
        body: {
          centro_id: repair.customer.centro_id,
          to: repair.customer.email,
          subject,
          html,
          customer_id: customerId,
          template_name: "status_update",
          metadata: {
            repair_id: repair.id,
            new_status: repair.status,
            status_label: statusLabel,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Email Inviata",
        description: "Il cliente è stato notificato via email",
      });
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Errore",
        description: "Impossibile inviare l'email",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleEmailDialogConfirm = async () => {
    setEmailDialogOpen(false);
    const isStartingRepair = previousStatus === "pending" && repair?.status === "in_progress";
    const statusChanged = previousStatus !== repair?.status;
    
    await performSave(isStartingRepair, statusChanged);
    await sendStatusEmail();
    setPendingStatusChange(null);
  };

  const handleEmailDialogCancel = async () => {
    setEmailDialogOpen(false);
    const isStartingRepair = previousStatus === "pending" && repair?.status === "in_progress";
    const statusChanged = previousStatus !== repair?.status;
    
    await performSave(isStartingRepair, statusChanged);
    setPendingStatusChange(null);
  };

  const handlePartsAdded = (newParts: RepairPart[]) => {
    if (repair) {
      setRepair({
        ...repair,
        repair_parts: [...(repair.repair_parts || []), ...newParts]
      });
    }
  };

  const deleteRepairPart = async (repairPartId: string) => {
    try {
      if (repair?.repair_parts) {
        setRepair({
          ...repair,
          repair_parts: repair.repair_parts.filter(part => part.id !== repairPartId)
        });
      }

      const { error } = await supabase
        .from("repair_parts")
        .delete()
        .eq("id", repairPartId);

      if (error) throw error;

      toast({
        title: "Eliminato",
        description: "Ricambio rimosso dalla riparazione",
      });
    } catch (error) {
      console.error("Error deleting repair part:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare il ricambio",
        variant: "destructive",
      });
      loadRepairDetail();
    }
  };

  const applySavedGuide = async (savedGuide: {
    id: string;
    guide_data: RepairGuideData;
    usage_count: number;
  }) => {
    if (!repair) return;

    try {
      // Apply the guide to UI
      setRepairGuide(savedGuide.guide_data);
      setGuideFromCache(true);
      setGuideUsageCount(savedGuide.usage_count + 1);

      // Save to repair record
      await supabase
        .from("repairs")
        .update({ ai_suggestions: JSON.stringify(savedGuide.guide_data) })
        .eq("id", id);

      // Increment usage count
      await supabase
        .from("repair_guides")
        .update({ usage_count: savedGuide.usage_count + 1 })
        .eq("id", savedGuide.id);

      toast({
        title: "📚 Guida Applicata!",
        description: `${savedGuide.guide_data.steps?.length || 0} step - Usata ${savedGuide.usage_count + 1} volte`,
        className: "bg-emerald-600 text-white border-emerald-700",
      });
    } catch (error) {
      console.error("Error applying saved guide:", error);
      toast({
        title: "Errore",
        description: "Impossibile applicare la guida",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto mb-4" />
            <Wrench className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground font-medium">Caricamento dettagli...</p>
        </motion.div>
      </div>
    );
  }

  if (!repair) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Riparazione non trovata</h2>
          <p className="text-muted-foreground mb-6">La riparazione richiesta non esiste o è stata rimossa.</p>
          <Button onClick={() => navigate(backRoute)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Torna alle riparazioni
          </Button>
        </Card>
      </div>
    );
  }

  const status = statusConfig[repair.status as keyof typeof statusConfig] || statusConfig.pending;
  const priority = priorityConfig[repair.priority as keyof typeof priorityConfig] || priorityConfig.normal;
  const StatusIcon = status.icon;

  const totalPartsAmount = repair.repair_parts?.reduce(
    (sum, part) => sum + part.quantity * part.unit_cost,
    0
  ) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 relative">
      {/* Animation overlay when repair starts */}
      <AnimatePresence>
        {showStartedAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/20 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.2, opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground px-10 py-8 rounded-3xl shadow-2xl flex items-center gap-5"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: 2, ease: "linear" }}
                className="bg-white/20 rounded-2xl p-4"
              >
                <Wrench className="h-12 w-12" />
              </motion.div>
              <div>
                <p className="text-3xl font-bold">Riparazione Iniziata!</p>
                <p className="text-lg opacity-80">Lavori in corso...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-card via-card to-primary/5 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              {/* Device Image or Icon */}
              <div className="relative flex-shrink-0">
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl overflow-hidden border-2 border-border shadow-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  {repair.device.photo_url ? (
                    <img
                      src={repair.device.photo_url}
                      alt="Device"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <Smartphone className={`fallback-icon h-10 w-10 text-primary ${repair.device.photo_url ? 'hidden' : ''}`} />
                </div>
                <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full ${status.color} flex items-center justify-center ring-2 ring-background`}>
                  <StatusIcon className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
              
              {/* Title & Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge className={`${status.bgLight} ${status.text} border-0 font-medium`}>
                    {status.label}
                  </Badge>
                  <Badge className={`${priority.bgLight} ${priority.text} border-0 font-medium`}>
                    Priorità {priority.label}
                  </Badge>
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">
                  {repair.device.brand} {repair.device.model}
                </h1>
                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                  <User className="h-4 w-4" />
                  <span 
                    className="font-medium text-primary hover:underline cursor-pointer"
                    onClick={() => {
                      const isCentroRoute = location.pathname.startsWith('/centro');
                      navigate(isCentroRoute ? `/centro/clienti/${repair.customer.id}` : `/customers/${repair.customer.id}`);
                    }}
                  >
                    {repair.customer.name}
                  </span>
                  <span className="text-border">•</span>
                  <span className="text-sm">{repair.device.device_type}</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Button 
                variant="outline" 
                onClick={() => navigate(backRoute)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Indietro</span>
              </Button>
              <Button 
                variant="outline"
                onClick={() => setAcceptanceFormOpen(true)}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Modulo</span>
              </Button>
              {/* Checklist Buttons */}
              <div className="flex gap-1">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setChecklistType('pre_repair');
                    setChecklistOpen(true);
                  }}
                  className="gap-2"
                  title="Checklist Pre-Riparazione"
                >
                  <ClipboardCheck className="h-4 w-4 text-amber-500" />
                  <span className="hidden lg:inline">Pre</span>
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setChecklistType('post_repair');
                    setChecklistOpen(true);
                  }}
                  className="gap-2"
                  title="Checklist Post-Riparazione"
                >
                  <ClipboardCheck className="h-4 w-4 text-emerald-500" />
                  <span className="hidden lg:inline">Post</span>
                </Button>
                <PrintLabelButton
                  repairId={repair.id}
                  customerName={repair.customer.name}
                  customerPhone={repair.customer.phone}
                  deviceBrand={repair.device.brand}
                  deviceModel={repair.device.model}
                  deviceType={repair.device.device_type}
                  issueDescription={repair.device.reported_issue}
                  createdAt={repair.created_at}
                  variant="outline"
                  className="gap-2"
                />
              </div>
              <Button
                onClick={() => saveChanges()}
                disabled={saving} 
                size="lg"
                className="gap-2 shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-primary/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="hidden sm:inline">Salvataggio...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Salva</span>
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card rounded-xl border border-border p-4 text-center"
              >
                <Euro className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Stimato</p>
                <p className="text-lg font-bold text-foreground">
                  €{repair.estimated_cost?.toFixed(2) || "0.00"}
                </p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-card rounded-xl border border-border p-4 text-center"
              >
                <Euro className="h-5 w-5 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Finale</p>
                <p className="text-lg font-bold text-foreground">
                  €{repair.final_cost?.toFixed(2) || "0.00"}
                </p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className={`rounded-xl border p-4 text-center ${repair.acconto && repair.acconto > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-card border-border'}`}
              >
                <Euro className="h-5 w-5 text-emerald-600 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Acconto</p>
                <p className={`text-lg font-bold ${repair.acconto && repair.acconto > 0 ? 'text-emerald-600' : 'text-foreground'}`}>
                  €{repair.acconto?.toFixed(2) || "0.00"}
                </p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card rounded-xl border border-border p-4 text-center"
              >
                <Package className="h-5 w-5 text-orange-500 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Ricambi</p>
                <p className="text-lg font-bold text-foreground">
                  €{totalPartsAmount.toFixed(2)}
                </p>
              </motion.div>
              {repair.shipping_cost && repair.shipping_cost > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 }}
                  className="bg-blue-500/10 rounded-xl border border-blue-500/30 p-4 text-center"
                >
                  <Truck className="h-5 w-5 text-blue-500 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Spedizione</p>
                  <p className="text-lg font-bold text-blue-600">
                    €{repair.shipping_cost.toFixed(2)}
                  </p>
                </motion.div>
              )}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-card rounded-xl border border-border p-4 text-center"
              >
                <Calendar className="h-5 w-5 text-blue-500 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Creata</p>
                <p className="text-sm font-bold text-foreground">
                  {new Date(repair.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                </p>
              </motion.div>
            </div>

            {/* Visual Status Manager */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <VisualStatusManager
                currentStatus={repair.status}
                onStatusChange={(newStatus) => setRepair({ ...repair, status: newStatus })}
                statuses={DIRECT_REPAIR_STATUSES}
                timestamps={{
                  pending_at: repair.created_at,
                  in_progress_at: repair.started_at,
                  parts_arrived_at: repair.parts_arrived_at,
                  completed_at: repair.completed_at,
                  delivered_at: repair.delivered_at,
                }}
              />
            </motion.div>


            {/* Repair Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-primary/5 to-transparent px-6 py-4 border-b border-border">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Wrench className="h-4 w-4 text-primary" />
                    </div>
                    Gestione Riparazione
                  </h2>
                </div>
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Priorità</Label>
                      <Select
                        value={repair.priority}
                        onValueChange={(value) => setRepair({ ...repair, priority: value })}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Bassa</SelectItem>
                          <SelectItem value="normal">Normale</SelectItem>
                          <SelectItem value="high">🔥 Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Costo Stimato (€)</Label>
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          value={repair.estimated_cost || ""}
                          onChange={(e) =>
                            setRepair({ ...repair, estimated_cost: parseFloat(e.target.value) || null })
                          }
                          className="pl-10 h-11"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Costo Finale (€)</Label>
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          value={repair.final_cost || ""}
                          onChange={(e) =>
                            setRepair({ ...repair, final_cost: parseFloat(e.target.value) || null })
                          }
                          className="pl-10 h-11"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Acconto (€)</Label>
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          value={repair.acconto || ""}
                          onChange={(e) =>
                            setRepair({ ...repair, acconto: parseFloat(e.target.value) || null })
                          }
                          className="pl-10 h-11"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Final Cost Acceptance Section */}
                  {repair.final_cost && repair.final_cost > 0 && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-500/5 border border-emerald-200/50">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <Euro className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Accettazione Costo Finale</p>
                            {repair.final_cost_accepted_at ? (
                              <p className="text-sm text-emerald-600 font-medium">
                                ✅ Accettato {repair.final_cost_accepted_by_phone ? 'telefonicamente' : 'con firma'} il {new Date(repair.final_cost_accepted_at).toLocaleDateString('it-IT')}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                €{repair.final_cost.toFixed(2)} - In attesa di conferma cliente
                              </p>
                            )}
                          </div>
                        </div>
                        {!repair.final_cost_accepted_at && (
                          <div className="flex flex-wrap gap-2">
                            {repair.customer?.email && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                disabled={sendingFinalCostEmail}
                                onClick={async () => {
                                  if (!repair.customer?.centro_id) {
                                    toast({
                                      title: "Errore",
                                      description: "Centro non configurato per questo cliente",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  setSendingFinalCostEmail(true);
                                  try {
                                    // First save the repair to ensure final_cost is persisted
                                    await supabase
                                      .from("repairs")
                                      .update({ final_cost: repair.final_cost })
                                      .eq("id", repair.id);

                                    const { error } = await supabase.functions.invoke("send-final-cost-email", {
                                      body: {
                                        repair_id: repair.id,
                                        centro_id: repair.customer.centro_id,
                                      },
                                    });
                                    if (error) throw error;
                                    toast({
                                      title: "Email Inviata",
                                      description: "Il cliente riceverà un'email per accettare il costo finale",
                                    });
                                  } catch (error: any) {
                                    console.error("Error sending final cost email:", error);
                                    toast({
                                      title: "Errore",
                                      description: "Impossibile inviare l'email",
                                      variant: "destructive",
                                    });
                                  } finally {
                                    setSendingFinalCostEmail(false);
                                  }
                                }}
                              >
                                {sendingFinalCostEmail ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                                Invia Email
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                              disabled={acceptingByPhone}
                              onClick={async () => {
                                setAcceptingByPhone(true);
                                try {
                                  const { error } = await supabase
                                    .from("repairs")
                                    .update({
                                      final_cost: repair.final_cost,
                                      final_cost_accepted_at: new Date().toISOString(),
                                      final_cost_accepted_by_phone: true,
                                    })
                                    .eq("id", repair.id);

                                  if (error) throw error;

                                  setRepair({
                                    ...repair,
                                    final_cost_accepted_at: new Date().toISOString(),
                                    final_cost_accepted_by_phone: true,
                                  });

                                  toast({
                                    title: "✅ Costo Accettato",
                                    description: "Il cliente ha accettato telefonicamente il costo finale",
                                  });
                                } catch (error: any) {
                                  console.error("Error accepting by phone:", error);
                                  toast({
                                    title: "Errore",
                                    description: "Impossibile registrare l'accettazione",
                                    variant: "destructive",
                                  });
                                } finally {
                                  setAcceptingByPhone(false);
                                }
                              }}
                            >
                              {acceptingByPhone ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Phone className="h-4 w-4" />
                              )}
                              Accettato Telefonicamente
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Diagnostic Fee Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-200/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <Euro className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Gestione Diagnosi</p>
                        <p className="text-sm text-muted-foreground">
                          €{repair.diagnostic_fee?.toFixed(2) || "15.00"} - Pagamento anticipato
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${repair.diagnostic_fee_paid ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {repair.diagnostic_fee_paid ? 'Pagato' : 'Non pagato'}
                      </span>
                      <Switch
                        checked={repair.diagnostic_fee_paid || false}
                        onCheckedChange={(checked) => setRepair({ ...repair, diagnostic_fee_paid: checked })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Diagnosi
                    </Label>
                    <Textarea
                      placeholder="Inserisci la diagnosi del problema..."
                      value={repair.diagnosis || ""}
                      onChange={(e) => setRepair({ ...repair, diagnosis: e.target.value })}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Note Riparazione
                    </Label>
                    <Textarea
                      placeholder="Note tecniche, parti sostituite, procedure..."
                      value={repair.repair_notes || ""}
                      onChange={(e) => setRepair({ ...repair, repair_notes: e.target.value })}
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* AI Repair Guide Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="overflow-hidden border-amber-200/50">
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 px-4 sm:px-6 py-4 border-b border-amber-200/30">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-amber-600" />
                      </div>
                      Guida Riparazione IA
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      <SelectSavedGuideDialog
                        deviceType={repair.device.device_type}
                        deviceBrand={repair.device.brand}
                        onSelectGuide={(guide) => applySavedGuide({
                          id: guide.id,
                          guide_data: guide.guide_data as unknown as RepairGuideData,
                          usage_count: guide.usage_count,
                        })}
                      />
                      <Button
                        onClick={getAISuggestions}
                        disabled={loadingAI}
                        variant="outline"
                        size="sm"
                        className="border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-2"
                      >
                        {loadingAI ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="hidden sm:inline">Generazione Guida...</span>
                            <span className="sm:hidden">Generando...</span>
                          </>
                        ) : (
                          <>
                            <Lightbulb className="h-4 w-4" />
                            <span className="hidden sm:inline">Genera Nuova Guida</span>
                            <span className="sm:hidden">Genera</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  {repairGuide ? (
                    <RepairGuide 
                      guide={repairGuide} 
                      deviceName={`${repair.device.brand} ${repair.device.model}`}
                      fromCache={guideFromCache}
                      usageCount={guideUsageCount}
                    />
                  ) : repair.ai_suggestions ? (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/50 rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed">
                      {repair.ai_suggestions}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center mx-auto mb-4">
                        <Lightbulb className="h-8 w-8 text-amber-600" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-2">Tutorial Riparazione</h3>
                      <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
                        Genera una guida step-by-step stile iFixit con immagini, avvisi di sicurezza e suggerimenti per completare la riparazione.
                      </p>
                      <Button
                        onClick={getAISuggestions}
                        disabled={loadingAI}
                        className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                      >
                        <Sparkles className="h-4 w-4" />
                        Genera Guida IA
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Spare Parts Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 px-6 py-4 border-b border-emerald-200/30">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                        <Package className="h-4 w-4 text-emerald-600" />
                      </div>
                      Ricambi Utilizzati
                      {repair.repair_parts && repair.repair_parts.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {repair.repair_parts.length}
                        </Badge>
                      )}
                    </h2>
                    <AddRepairPartsDialog
                      repairId={repair.id}
                      deviceBrand={repair.device.brand}
                      deviceModel={repair.device.model}
                      onPartsAdded={handlePartsAdded}
                    />
                  </div>
                </div>
                <div className="p-6">
                  {repair.repair_parts && repair.repair_parts.length > 0 ? (
                    <div className="space-y-3">
                      <AnimatePresence mode="popLayout">
                        {repair.repair_parts.map((part, index) => (
                          <motion.div
                            key={part.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -100, height: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="flex items-center gap-4 p-4 bg-gradient-to-r from-muted/50 to-transparent rounded-xl border border-border/50 hover:shadow-md transition-shadow"
                          >
                            {part.spare_parts.image_url ? (
                              <img
                                src={part.spare_parts.image_url}
                                alt={part.spare_parts.name}
                                className="h-14 w-14 object-contain rounded-lg border bg-white p-1"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">{part.spare_parts.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {part.spare_parts.brand && (
                                  <Badge variant="outline" className="text-xs">
                                    {part.spare_parts.brand}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">{part.spare_parts.category}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Qtà: {part.quantity}</p>
                              <p className="font-semibold text-primary">
                                €{(part.quantity * part.unit_cost).toFixed(2)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteRepairPart(part.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                        <span className="text-sm text-muted-foreground">Totale Ricambi</span>
                        <span className="text-xl font-bold text-primary">
                          €{totalPartsAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                        <Package className="h-7 w-7 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Nessun ricambio associato a questa riparazione
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Customer Info */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/5 px-5 py-4 border-b border-blue-200/30">
                  <h3 className="font-semibold flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <User className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    Cliente
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {repair.customer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{repair.customer.name}</p>
                      <p className="text-xs text-muted-foreground">Cliente</p>
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    <a 
                      href={`tel:${repair.customer.phone}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <Phone className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-sm font-medium">{repair.customer.phone}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    {repair.customer.email && (
                      <a 
                        href={`mailto:${repair.customer.email}`}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <Mail className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-sm font-medium truncate">{repair.customer.email}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    )}
                    {repair.customer.address && (
                      <div className="flex items-start gap-3 p-2.5 rounded-lg">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="text-sm">{repair.customer.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Communication Buttons */}
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Contatta con messaggio preimpostato</p>
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-9 gap-1.5"
                              onClick={() => callPhone(repair.customer.phone)}
                            >
                              <Phone className="h-3.5 w-3.5" />
                              Chiama
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Chiama il cliente</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-9 gap-1.5 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                              onClick={() => {
                                const message = getStatusMessage(repair);
                                openWhatsApp(repair.customer.phone, message.body);
                              }}
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              WhatsApp
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Invia messaggio WhatsApp</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-9 gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                              onClick={() => {
                                const message = getStatusMessage(repair);
                                openEmail(repair.customer.email, message.subject, message.body);
                              }}
                            >
                              <Mail className="h-3.5 w-3.5" />
                              Email
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Invia email</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Device Info */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/5 px-5 py-4 border-b border-violet-200/30">
                  <h3 className="font-semibold flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <Smartphone className="h-3.5 w-3.5 text-violet-600" />
                    </div>
                    Dispositivo
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                      <p className="font-medium text-sm">{repair.device.device_type}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Marca</p>
                      <p className="font-medium text-sm">{repair.device.brand}</p>
                    </div>
                    <div className="col-span-2 bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Modello</p>
                      <p className="font-medium text-sm">{repair.device.model}</p>
                    </div>
                  </div>
                  
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                    <p className="text-xs text-destructive/80 font-medium mb-1">Problema Riportato</p>
                    <p className="text-sm text-foreground">{repair.device.reported_issue}</p>
                  </div>

                  {repair.device.initial_condition && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Condizioni Iniziali</p>
                      <p className="text-sm">{repair.device.initial_condition}</p>
                    </div>
                  )}

                  {/* Device Access Credentials */}
                  {(repair.device.password || repair.device.imei || repair.device.serial_number) && (
                    <div className="border-t border-border pt-4 mt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">Accesso Dispositivo</span>
                      </div>
                      <div className="space-y-2">
                        {repair.device.password && (
                          <div className="bg-primary/5 rounded-lg p-3">
                            {repair.device.password.startsWith('[PATTERN]') ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Key className="h-4 w-4 text-primary" />
                                  <p className="text-xs text-muted-foreground">Pattern di Sblocco</p>
                                </div>
                                <div className="flex justify-center">
                                  <PatternDisplay 
                                    pattern={repair.device.password.replace('[PATTERN] ', '')} 
                                    size="md" 
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <Key className="h-4 w-4 text-primary" />
                                <div>
                                  <p className="text-xs text-muted-foreground">PIN/Password</p>
                                  <p className="font-mono font-semibold text-foreground">{repair.device.password}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {repair.device.imei && (
                          <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">IMEI</p>
                              <p className="font-mono text-sm">{repair.device.imei}</p>
                            </div>
                          </div>
                        )}
                        {repair.device.serial_number && (
                          <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Seriale</p>
                              <p className="font-mono text-sm">{repair.device.serial_number}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Orders Status */}
            {repair.orders && repair.orders.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/5 px-5 py-4 border-b border-orange-200/30">
                    <h3 className="font-semibold flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <Package className="h-3.5 w-3.5 text-orange-600" />
                      </div>
                      Ordini Ricambi
                    </h3>
                  </div>
                  <div className="p-5 space-y-3">
                    {repair.orders.map((order) => {
                      const orderStatus = order.status === "pending" 
                        ? { label: "In Attesa", bg: "bg-amber-100", text: "text-amber-700", icon: Clock }
                        : order.status === "ordered"
                        ? { label: "Ordinato", bg: "bg-blue-100", text: "text-blue-700", icon: Package }
                        : { label: "Ricevuto", bg: "bg-emerald-100", text: "text-emerald-700", icon: CheckCircle };
                      
                      const OrderIcon = orderStatus.icon;

                      return (
                        <div key={order.id} className="p-3 bg-muted/30 rounded-xl border border-border/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">#{order.order_number}</span>
                            <Badge className={`${orderStatus.bg} ${orderStatus.text} border-0 gap-1`}>
                              <OrderIcon className="h-3 w-3" />
                              {orderStatus.label}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex justify-between">
                              <span>Fornitore:</span>
                              <span className="font-medium text-foreground">{order.supplier}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Creato:</span>
                              <span>{new Date(order.created_at).toLocaleDateString("it-IT")}</span>
                            </div>
                            {order.received_at && (
                              <div className="flex justify-between">
                                <span>Ricevuto:</span>
                                <span className="text-emerald-600">{new Date(order.received_at).toLocaleDateString("it-IT")}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {repair.orders.some(o => o.status === "pending") && (
                      <div className="p-3 bg-amber-50 border border-amber-200/50 rounded-xl flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-800">
                          In attesa della consegna dei ricambi ordinati
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Timeline */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-slate-500/10 to-gray-500/5 px-5 py-4 border-b border-slate-200/30">
                  <h3 className="font-semibold flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-slate-500/20 flex items-center justify-center">
                      <Clock className="h-3.5 w-3.5 text-slate-600" />
                    </div>
                    Timeline
                  </h3>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Creata il</p>
                      <p className="font-medium text-sm">
                        {new Date(repair.created_at).toLocaleString("it-IT", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Acceptance Form PDF Dialog */}
      <AcceptanceFormPDF
        open={acceptanceFormOpen}
        onOpenChange={setAcceptanceFormOpen}
        repairData={{
          id: repair.id,
          created_at: repair.created_at,
          intake_signature: repair.intake_signature,
          intake_signature_date: repair.intake_signature_date,
          estimated_cost: repair.estimated_cost,
          diagnostic_fee: repair.diagnostic_fee ?? 15,
          diagnostic_fee_paid: repair.diagnostic_fee_paid ?? false,
          acconto: repair.acconto,
          device: {
            brand: repair.device.brand,
            model: repair.device.model,
            device_type: repair.device.device_type,
            reported_issue: repair.device.reported_issue,
            imei: repair.device.imei,
            serial_number: repair.device.serial_number,
          },
          customer: {
            name: repair.customer.name,
            email: repair.customer.email,
            phone: repair.customer.phone,
            address: repair.customer.address,
          },
          centro: repair.centro,
        }}
      />

      {/* Repair Checklist Dialog */}
      {repair && (
        <RepairChecklistDialog
          open={checklistOpen}
          onOpenChange={setChecklistOpen}
          repairId={repair.id}
          deviceType={repair.device.device_type}
          checklistType={checklistType}
          customerName={repair.customer.name}
          deviceInfo={`${repair.device.brand} ${repair.device.model}`}
          onSuccess={loadRepairDetail}
        />
      )}

      {/* Email Notification Dialog */}
      <AlertDialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Inviare Email al Cliente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Lo stato della riparazione è cambiato in <strong>{getStatusLabel(pendingStatusChange || repair?.status || "")}</strong>.
              <br /><br />
              Vuoi inviare un'email di riepilogo al cliente <strong>{repair?.customer?.name}</strong> ({repair?.customer?.email})?
              <br /><br />
              L'email conterrà i dettagli del dispositivo, lo stato attuale, diagnosi, note e riepilogo costi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleEmailDialogCancel} disabled={sendingEmail}>
              No, salva solo
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEmailDialogConfirm} 
              disabled={sendingEmail}
              className="gap-2"
            >
              {sendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Invio...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Sì, invia email
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
