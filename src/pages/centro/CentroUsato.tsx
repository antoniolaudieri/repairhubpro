import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CentroLayout } from "@/layouts/CentroLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import {
  Package,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  ShoppingCart,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  Watch,
  HelpCircle,
  X,
  Image as ImageIcon,
  Loader2,
  Search,
  Sparkles,
  AlertCircle,
  Euro,
  Tag,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

// Device types with icons
const deviceTypesWithIcons = [
  { value: "Smartphone", label: "Smartphone", icon: Smartphone },
  { value: "Tablet", label: "Tablet", icon: Tablet },
  { value: "Laptop", label: "Laptop", icon: Laptop },
  { value: "PC", label: "PC", icon: Monitor },
  { value: "Smartwatch", label: "Smartwatch", icon: Watch },
  { value: "Altro", label: "Altro", icon: HelpCircle },
];

// Detected device info interface
interface DetectedDeviceInfo {
  fullName?: string;
  year?: string;
  imageUrl?: string;
  specs?: {
    ram?: string;
    storage?: string;
    display?: string;
    processor?: string;
    camera?: string;
  };
}

// Generate fallback image URLs based on brand
const getFallbackImageUrls = (brand: string): string[] => {
  const normalizedBrand = brand.toLowerCase().trim();
  const urls: string[] = [];
  
  if (normalizedBrand.includes('apple') || normalizedBrand.includes('iphone') || normalizedBrand.includes('ipad')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg');
  } else if (normalizedBrand.includes('samsung')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg');
  } else if (normalizedBrand.includes('huawei')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/e/e8/Huawei_Logo.svg');
  } else if (normalizedBrand.includes('xiaomi')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg');
  } else if (normalizedBrand.includes('oppo')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/0/0a/OPPO_LOGO_2019.svg');
  } else if (normalizedBrand.includes('oneplus')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/d/d6/OnePlus_logo.svg');
  } else if (normalizedBrand.includes('google') || normalizedBrand.includes('pixel')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg');
  } else if (normalizedBrand.includes('sony')) {
    urls.push('https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg');
  }
  
  return urls;
};

const conditionOptions = [
  { value: "ricondizionato", label: "Ricondizionato" },
  { value: "usato_ottimo", label: "Usato Ottimo" },
  { value: "usato_buono", label: "Usato Buono" },
  { value: "usato_discreto", label: "Usato Discreto" },
  { value: "alienato", label: "Alienato" },
];

const sourceOptions = [
  { value: "riparazione_alienata", label: "Riparazione Alienata" },
  { value: "permuta", label: "Permuta" },
  { value: "acquisto", label: "Acquisto" },
  { value: "ricondizionato", label: "Ricondizionato" },
];

const deviceTypes = ["Smartphone", "Tablet", "Laptop", "PC", "Smartwatch", "Altro"];

export default function CentroUsato() {
  const { user } = useAuth();
  const [centroId, setCentroId] = useState<string | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Device lookup state
  const [detectedDevice, setDetectedDevice] = useState<DetectedDeviceInfo | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    device_type: "Smartphone",
    brand: "",
    model: "",
    color: "",
    storage_capacity: "",
    condition: "usato_buono",
    price: "",
    original_price: "",
    description: "",
    warranty_months: "0",
    source: "acquisto",
  });

  useEffect(() => {
    fetchCentroId();
  }, [user]);

  useEffect(() => {
    if (centroId) {
      fetchDevices();
      fetchReservations();
    }
  }, [centroId]);

  const fetchCentroId = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("centri_assistenza")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();
    if (data) setCentroId(data.id);
  };

  const fetchDevices = async () => {
    if (!centroId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("used_devices")
        .select("*")
        .eq("centro_id", centroId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReservations = async () => {
    if (!centroId) return;
    try {
      const { data, error } = await supabase
        .from("used_device_reservations")
        .select(`
          *,
          device:used_devices(id, brand, model, price)
        `)
        .in("device_id", devices.map(d => d.id))
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error("Error fetching reservations:", error);
    }
  };

  useEffect(() => {
    if (devices.length > 0) {
      fetchReservations();
    }
  }, [devices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centroId) return;

    setFormLoading(true);
    try {
      const deviceData = {
        centro_id: centroId,
        device_type: formData.device_type,
        brand: formData.brand,
        model: formData.model,
        color: formData.color || null,
        storage_capacity: formData.storage_capacity || null,
        condition: formData.condition as "ricondizionato" | "usato_ottimo" | "usato_buono" | "usato_discreto" | "alienato",
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        description: formData.description || null,
        warranty_months: parseInt(formData.warranty_months) || 0,
        source: formData.source as "riparazione_alienata" | "permuta" | "acquisto" | "ricondizionato",
        status: "draft" as const,
        photos: uploadedPhotos.length > 0 ? uploadedPhotos : null,
      };

      if (editingDevice) {
        const { error } = await supabase
          .from("used_devices")
          .update(deviceData)
          .eq("id", editingDevice.id);
        if (error) throw error;
        toast({ title: "Dispositivo aggiornato" });
      } else {
        const { error } = await supabase
          .from("used_devices")
          .insert([deviceData]);
        if (error) throw error;
        toast({ title: "Dispositivo aggiunto" });
      }

      setDialogOpen(false);
      resetForm();
      fetchDevices();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  // Auto-lookup device info when brand and model change
  const lookupDevice = useCallback(async () => {
    if (!formData.brand.trim() || !formData.model.trim()) {
      setDetectedDevice(null);
      return;
    }
    
    setIsLookingUp(true);
    setImageError(false);
    setFallbackIndex(0);
    
    try {
      const { data, error } = await supabase.functions.invoke('lookup-device', {
        body: { brand: formData.brand, model: formData.model }
      });
      
      if (error) throw error;
      
      if (data?.device_info) {
        const deviceInfo = data.device_info;
        setDetectedDevice({
          fullName: deviceInfo.fullName,
          year: deviceInfo.year,
          imageUrl: deviceInfo.imageUrl,
          specs: deviceInfo.specs
        });
        setCurrentImageUrl(deviceInfo.imageUrl || null);
        
        // Auto-fill storage capacity if detected and not already set
        if (deviceInfo.specs?.storage && !formData.storage_capacity) {
          setFormData(prev => ({ ...prev, storage_capacity: deviceInfo.specs.storage }));
        }
      }
    } catch (error) {
      console.error('Lookup error:', error);
    } finally {
      setIsLookingUp(false);
    }
  }, [formData.brand, formData.model, formData.storage_capacity]);

  // Debounced device lookup
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.brand && formData.model && !editingDevice) {
        lookupDevice();
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [formData.brand, formData.model, lookupDevice, editingDevice]);

  // Image error handling with fallbacks
  const handleImageError = () => {
    const fallbacks = getFallbackImageUrls(formData.brand);
    if (fallbackIndex < fallbacks.length) {
      setCurrentImageUrl(fallbacks[fallbackIndex]);
      setFallbackIndex(prev => prev + 1);
    } else {
      setImageError(true);
    }
  };

  // Get device icon for fallback
  const getDeviceIcon = () => {
    const deviceType = deviceTypesWithIcons.find(t => t.value === formData.device_type);
    const Icon = deviceType?.icon || Smartphone;
    return <Icon className="h-10 w-10 text-muted-foreground" />;
  };

  const resetForm = () => {
    setFormData({
      device_type: "Smartphone",
      brand: "",
      model: "",
      color: "",
      storage_capacity: "",
      condition: "usato_buono",
      price: "",
      original_price: "",
      description: "",
      warranty_months: "0",
      source: "acquisto",
    });
    setEditingDevice(null);
    setUploadedPhotos([]);
    setDetectedDevice(null);
    setCurrentImageUrl(null);
    setImageError(false);
    setFallbackIndex(0);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    try {
      const newPhotos: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${centroId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('used-device-photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('used-device-photos')
          .getPublicUrl(filePath);

        newPhotos.push(urlData.publicUrl);
      }

      setUploadedPhotos(prev => [...prev, ...newPhotos]);
      toast({ title: `${newPhotos.length} foto caricate` });
    } catch (error: any) {
      toast({ title: "Errore upload", description: error.message, variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (photoUrl: string) => {
    setUploadedPhotos(prev => prev.filter(p => p !== photoUrl));
  };

  const handleEdit = (device: any) => {
    setFormData({
      device_type: device.device_type,
      brand: device.brand,
      model: device.model,
      color: device.color || "",
      storage_capacity: device.storage_capacity || "",
      condition: device.condition,
      price: device.price.toString(),
      original_price: device.original_price?.toString() || "",
      description: device.description || "",
      warranty_months: device.warranty_months?.toString() || "0",
      source: device.source,
    });
    setUploadedPhotos(device.photos || []);
    setEditingDevice(device);
    setDialogOpen(true);
  };

  const handlePublish = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from("used_devices")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", deviceId);
      if (error) throw error;
      toast({ title: "Dispositivo pubblicato" });
      fetchDevices();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (!confirm("Eliminare questo dispositivo?")) return;
    try {
      const { error } = await supabase
        .from("used_devices")
        .delete()
        .eq("id", deviceId);
      if (error) throw error;
      toast({ title: "Dispositivo eliminato" });
      fetchDevices();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    }
  };

  const handleReservationAction = async (reservationId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("used_device_reservations")
        .update({ status })
        .eq("id", reservationId);
      if (error) throw error;

      if (status === "confirmed") {
        // Get reservation to find device_id
        const reservation = reservations.find(r => r.id === reservationId);
        if (reservation) {
          await supabase
            .from("used_devices")
            .update({ status: "reserved", reserved_at: new Date().toISOString() })
            .eq("id", reservation.device_id);
        }
      }

      toast({ title: status === "confirmed" ? "Prenotazione confermata" : "Prenotazione annullata" });
      fetchReservations();
      fetchDevices();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Bozza</Badge>;
      case "published":
        return <Badge className="bg-success">Pubblicato</Badge>;
      case "reserved":
        return <Badge className="bg-warning">Prenotato</Badge>;
      case "sold":
        return <Badge className="bg-primary">Venduto</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    total: devices.length,
    published: devices.filter(d => d.status === "published").length,
    reserved: devices.filter(d => d.status === "reserved").length,
    sold: devices.filter(d => d.status === "sold").length,
    pendingReservations: reservations.filter(r => r.status === "pending").length,
  };

  return (
    <CentroLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestione Usato</h1>
            <p className="text-muted-foreground">Pubblica e gestisci dispositivi usati e ricondizionati</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Aggiungi Dispositivo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {editingDevice ? "Modifica" : "Nuovo"} Dispositivo Usato
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Device Type Selection - Visual Grid */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-primary" />
                    Tipo Dispositivo *
                  </Label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {deviceTypesWithIcons.map((type) => {
                      const Icon = type.icon;
                      const isSelected = formData.device_type === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, device_type: type.value }))}
                          className={`
                            flex flex-col items-center justify-center p-2.5 rounded-lg border-2 transition-all
                            ${isSelected 
                              ? "border-primary bg-primary/10 text-primary" 
                              : "border-border bg-card hover:border-primary/50 hover:bg-muted/50 text-muted-foreground"
                            }
                          `}
                        >
                          <Icon className={`h-5 w-5 mb-1 ${isSelected ? "text-primary" : ""}`} />
                          <span className="text-[10px] font-medium">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Brand & Model with AI Lookup */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="brand" className="text-xs font-medium">Marca *</Label>
                    <div className="relative">
                      <Input
                        id="brand"
                        value={formData.brand}
                        onChange={e => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                        className="h-10 pr-8"
                        placeholder="es. Apple"
                        required
                      />
                      {isLookingUp && (
                        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="model" className="text-xs font-medium">Modello *</Label>
                    <div className="relative">
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={e => setFormData(prev => ({ ...prev, model: e.target.value }))}
                        className="h-10 pr-8"
                        placeholder="es. iPhone 15 Pro"
                        required
                      />
                      {detectedDevice && !isLookingUp && (
                        <Sparkles className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Detected Device Card */}
                <AnimatePresence>
                  {(detectedDevice || isLookingUp) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                        {isLookingUp ? (
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-20 w-20 rounded-lg" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                              <Skeleton className="h-3 w-2/3" />
                            </div>
                          </div>
                        ) : detectedDevice && (
                          <div className="flex gap-4">
                            {/* Device Image */}
                            <div className="flex-shrink-0">
                              {currentImageUrl && !imageError ? (
                                <div className="relative">
                                  <img
                                    src={currentImageUrl}
                                    alt={`${formData.brand} ${formData.model}`}
                                    className="h-20 w-20 object-contain rounded-lg bg-white p-2"
                                    onError={handleImageError}
                                  />
                                  <Badge 
                                    variant="secondary" 
                                    className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground"
                                  >
                                    AI
                                  </Badge>
                                </div>
                              ) : (
                                <div className="h-20 w-20 rounded-lg bg-muted flex flex-col items-center justify-center gap-1">
                                  {getDeviceIcon()}
                                  <span className="text-[8px] text-muted-foreground uppercase font-medium">
                                    {formData.brand || 'Device'}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Device Details */}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div>
                                <h3 className="font-semibold text-sm truncate">
                                  {detectedDevice.fullName || `${formData.brand} ${formData.model}`}
                                </h3>
                                {detectedDevice.year && detectedDevice.year !== "N/A" && (
                                  <p className="text-xs text-muted-foreground">Anno: {detectedDevice.year}</p>
                                )}
                              </div>
                              
                              {/* Specs Grid */}
                              {detectedDevice.specs && (
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                  {detectedDevice.specs.storage && detectedDevice.specs.storage !== "N/A" && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-muted-foreground">Storage:</span>
                                      <span className="text-[10px] font-medium truncate">{detectedDevice.specs.storage}</span>
                                    </div>
                                  )}
                                  {detectedDevice.specs.ram && detectedDevice.specs.ram !== "N/A" && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-muted-foreground">RAM:</span>
                                      <span className="text-[10px] font-medium truncate">{detectedDevice.specs.ram}</span>
                                    </div>
                                  )}
                                  {detectedDevice.specs.display && detectedDevice.specs.display !== "N/A" && (
                                    <div className="flex items-center gap-1 col-span-2">
                                      <span className="text-[10px] text-muted-foreground">Display:</span>
                                      <span className="text-[10px] font-medium truncate">{detectedDevice.specs.display}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Device Details Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="color" className="text-xs font-medium text-muted-foreground">Colore</Label>
                    <Input
                      id="color"
                      value={formData.color}
                      onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="h-9 text-sm"
                      placeholder="es. Nero"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="storage" className="text-xs font-medium text-muted-foreground">Capacità</Label>
                    <Input
                      id="storage"
                      value={formData.storage_capacity}
                      onChange={e => setFormData(prev => ({ ...prev, storage_capacity: e.target.value }))}
                      className="h-9 text-sm"
                      placeholder="128GB"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="warranty" className="text-xs font-medium text-muted-foreground">Garanzia (mesi)</Label>
                    <Input
                      id="warranty"
                      type="number"
                      value={formData.warranty_months}
                      onChange={e => setFormData(prev => ({ ...prev, warranty_months: e.target.value }))}
                      className="h-9 text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Condition & Source Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Tag className="h-3 w-3 text-primary" />
                      Condizione *
                    </Label>
                    <Select value={formData.condition} onValueChange={v => setFormData(prev => ({ ...prev, condition: v }))}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {conditionOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1 text-muted-foreground">
                      <Info className="h-3 w-3" />
                      Provenienza
                    </Label>
                    <Select value={formData.source} onValueChange={v => setFormData(prev => ({ ...prev, source: v }))}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {sourceOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Price Section */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="price" className="text-sm font-medium flex items-center gap-1">
                      <Euro className="h-3.5 w-3.5 text-primary" />
                      Prezzo di Vendita *
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className="h-10"
                      placeholder="299.00"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="original_price" className="text-xs font-medium text-muted-foreground">Prezzo Originale €</Label>
                    <Input
                      id="original_price"
                      type="number"
                      step="0.01"
                      value={formData.original_price}
                      onChange={e => setFormData(prev => ({ ...prev, original_price: e.target.value }))}
                      className="h-9 text-sm"
                      placeholder="es. 999.00"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-medium text-muted-foreground">Descrizione</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="resize-none text-sm"
                    placeholder="Descrivi lo stato del dispositivo, accessori inclusi, ecc."
                  />
                </div>

                {/* Photo Upload Section */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-primary" />
                    Foto Dispositivo
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {uploadedPhotos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo}
                          alt={`Foto ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(photo)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {index === 0 && (
                          <Badge className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] px-1.5 py-0 bg-primary">
                            Principale
                          </Badge>
                        )}
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="w-20 h-20 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                      {uploadingPhoto ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Aggiungi</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    La prima foto sarà l'immagine principale del catalogo
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={formLoading} className="gap-2">
                    {formLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Salvataggio...
                      </>
                    ) : (
                      editingDevice ? "Aggiorna" : "Salva Bozza"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Totale</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Eye className="h-8 w-8 text-success" />
                <div>
                  <p className="text-2xl font-bold">{stats.published}</p>
                  <p className="text-xs text-muted-foreground">Pubblicati</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-2xl font-bold">{stats.reserved}</p>
                  <p className="text-xs text-muted-foreground">Prenotati</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.sold}</p>
                  <p className="text-xs text-muted-foreground">Venduti</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={stats.pendingReservations > 0 ? "border-warning" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className={`h-8 w-8 ${stats.pendingReservations > 0 ? "text-warning" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-2xl font-bold">{stats.pendingReservations}</p>
                  <p className="text-xs text-muted-foreground">Richieste</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="devices">
          <TabsList>
            <TabsTrigger value="devices">Dispositivi</TabsTrigger>
            <TabsTrigger value="reservations" className="relative">
              Prenotazioni
              {stats.pendingReservations > 0 && (
                <Badge className="ml-2 h-5 min-w-[20px] px-1.5 bg-warning text-warning-foreground">
                  {stats.pendingReservations}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : devices.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Nessun dispositivo</h3>
                  <p className="text-muted-foreground mb-4">Aggiungi il primo dispositivo usato da vendere</p>
                  <Button onClick={() => setDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Aggiungi Dispositivo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Condizione</TableHead>
                    <TableHead>Prezzo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Visite</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{device.brand} {device.model}</p>
                          <p className="text-xs text-muted-foreground">
                            {device.storage_capacity} {device.color && `• ${device.color}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {conditionOptions.find(c => c.value === device.condition)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>€{device.price.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(device.status)}</TableCell>
                      <TableCell>{device.views_count || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {device.status === "draft" && (
                            <Button size="sm" variant="outline" onClick={() => handlePublish(device.id)} className="gap-1">
                              <Eye className="h-3 w-3" />
                              Pubblica
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(device)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(device.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="reservations" className="mt-4">
            {reservations.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Nessuna prenotazione</h3>
                  <p className="text-muted-foreground">Le richieste dei clienti appariranno qui</p>
                </CardContent>
              </Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((res) => (
                    <TableRow key={res.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{res.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{res.customer_email}</p>
                          <p className="text-xs text-muted-foreground">{res.customer_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {res.device ? `${res.device.brand} ${res.device.model}` : "N/D"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(res.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={res.status === "pending" ? "default" : res.status === "confirmed" ? "default" : "secondary"}>
                          {res.status === "pending" ? "In attesa" : res.status === "confirmed" ? "Confermata" : "Annullata"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {res.status === "pending" && (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" onClick={() => handleReservationAction(res.id, "confirmed")} className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Conferma
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleReservationAction(res.id, "cancelled")}>
                              Annulla
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </CentroLayout>
  );
}