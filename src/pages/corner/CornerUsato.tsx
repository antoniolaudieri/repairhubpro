import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CornerLayout } from "@/layouts/CornerLayout";
import { supabase } from "@/integrations/supabase/client";
import MarketPriceHistory from "@/components/centro/MarketPriceHistory";
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
  TrendingUp,
  TrendingDown,
  Minus,
  Handshake,
  User,
  Percent,
  Calculator,
  DollarSign,
  Bell,
  Users,
} from "lucide-react";
import { useDeviceInterestCounts } from "@/hooks/useDeviceInterestCount";
import { NotifyInterestedDialog } from "@/components/usato/NotifyInterestedDialog";
import { Slider } from "@/components/ui/slider";
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

// Price estimate interface for single storage
interface SinglePriceEstimate {
  originalPrice: number;
  grades: {
    B: number;
    A: number;
    AA: number;
    AAA: number;
  };
  trend?: 'alto' | 'stabile' | 'basso';
  trendReason?: string;
  notes?: string;
}

// Multi-storage price estimates
interface MultiStoragePriceEstimate {
  [storageKey: string]: SinglePriceEstimate;
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

const saleTypeOptions = [
  { value: "acquistato", label: "Acquistato", description: "100% Corner", icon: ShoppingCart },
  { value: "alienato", label: "Alienato", description: "100% Corner", icon: Clock },
  { value: "conto_vendita", label: "Conto Vendita", description: "Split con cliente", icon: Handshake },
];

const deviceTypes = ["Smartphone", "Tablet", "Laptop", "PC", "Smartwatch", "Altro"];

export default function CornerUsato() {
  const { user } = useAuth();
  const [cornerId, setCornerId] = useState<string | null>(null);
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
  
  // Price estimate state
  const [priceEstimate, setPriceEstimate] = useState<SinglePriceEstimate | null>(null);
  const [allStorageEstimates, setAllStorageEstimates] = useState<MultiStoragePriceEstimate | null>(null);
  const [selectedStorageOption, setSelectedStorageOption] = useState<string | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  // Platform commission rate (dynamic from settings)
  const [platformCommissionRate, setPlatformCommissionRate] = useState(20);

  // Customer search for consignment
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  
  // Notify interested dialog state
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [selectedDeviceForNotify, setSelectedDeviceForNotify] = useState<any>(null);

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
    sale_type: "acquistato",
    owner_split_percentage: 60,
    centro_split_percentage: 40,
  });

  useEffect(() => {
    fetchCornerId();
    fetchPlatformCommissionRate();
  }, [user]);

  useEffect(() => {
    if (cornerId) {
      fetchDevices();
      fetchReservations();
    }
  }, [cornerId]);

  const fetchPlatformCommissionRate = async () => {
    try {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "platform_commission_rate")
        .single();
      if (data?.value) {
        setPlatformCommissionRate(data.value);
      }
    } catch (error) {
      console.error("Error fetching platform commission rate:", error);
    }
  };

  const fetchCornerId = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("corners")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (data) setCornerId(data.id);
  };

  const fetchDevices = async () => {
    if (!cornerId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("used_devices")
        .select("*")
        .eq("corner_id", cornerId)
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
    if (!cornerId) return;
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
    if (!cornerId) return;

    setFormLoading(true);
    try {
      let photosArray: string[] = [...uploadedPhotos];
      if (detectedDevice?.imageUrl && currentImageUrl && !imageError) {
        if (photosArray.length === 0) {
          photosArray.push(currentImageUrl);
        }
      }
      
      const deviceData = {
        corner_id: cornerId,
        centro_id: null,
        device_type: formData.device_type.toLowerCase(),
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
        photos: photosArray.length > 0 ? photosArray : null,
        specifications: detectedDevice?.specs ? detectedDevice.specs : null,
        sale_type: formData.sale_type as "alienato" | "conto_vendita" | "acquistato",
        owner_customer_id: formData.sale_type === "conto_vendita" ? selectedCustomer?.id : null,
        owner_split_percentage: formData.owner_split_percentage,
        centro_split_percentage: formData.centro_split_percentage,
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
        
        // Save AI valuation to history if we have price estimates
        if (priceEstimate?.grades && cornerId) {
          const storageToSave = selectedStorageOption || formData.storage_capacity || null;
          await supabase.from("device_price_valuations").insert({
            corner_id: cornerId,
            device_type: formData.device_type,
            brand: formData.brand,
            model: formData.model,
            storage: storageToSave,
            original_price: priceEstimate.originalPrice || null,
            grade_b: priceEstimate.grades.B,
            grade_a: priceEstimate.grades.A,
            grade_aa: priceEstimate.grades.AA,
            grade_aaa: priceEstimate.grades.AAA,
            trend: priceEstimate.trend || null,
            trend_reason: priceEstimate.trendReason || null,
          });
        }
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
      setPriceEstimate(null);
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
  
  // Auto-estimate price when brand and model change
  const estimatePrice = useCallback(async () => {
    if (!formData.brand.trim() || !formData.model.trim()) {
      setPriceEstimate(null);
      setAllStorageEstimates(null);
      setSelectedStorageOption(null);
      return;
    }
    
    setIsEstimating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('estimate-used-price', {
        body: { 
          brand: formData.brand, 
          model: formData.model,
          storage: undefined
        }
      });
      
      if (error) throw error;
      
      if (data?.estimate) {
        const estimate = data.estimate;
        
        if (!estimate.grades && typeof estimate === 'object') {
          const keys = Object.keys(estimate);
          const hasValidStorageKeys = keys.some(key => estimate[key]?.grades);
          
          if (hasValidStorageKeys) {
            setAllStorageEstimates(estimate as MultiStoragePriceEstimate);
            
            const matchingKey = formData.storage_capacity 
              ? keys.find(k => k.toLowerCase().includes(formData.storage_capacity.toLowerCase()))
              : null;
            const selectedKey = matchingKey || keys[0];
            setSelectedStorageOption(selectedKey);
            setPriceEstimate(estimate[selectedKey]);
            return;
          }
        }
        
        if (estimate?.grades?.B !== undefined) {
          setAllStorageEstimates(null);
          setSelectedStorageOption(null);
          setPriceEstimate(estimate);
        } else {
          console.warn('Invalid price estimate structure:', estimate);
          setPriceEstimate(null);
          setAllStorageEstimates(null);
        }
      }
    } catch (error) {
      console.error('Price estimate error:', error);
    } finally {
      setIsEstimating(false);
    }
  }, [formData.brand, formData.model, formData.storage_capacity]);
  
  const selectStorageOption = (storageKey: string) => {
    setSelectedStorageOption(storageKey);
    if (allStorageEstimates?.[storageKey]) {
      setPriceEstimate(allStorageEstimates[storageKey]);
      setFormData(prev => ({ ...prev, storage_capacity: storageKey }));
    }
  };

  // Debounced device lookup and price estimate
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.brand && formData.model && !editingDevice) {
        lookupDevice();
        estimatePrice();
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [formData.brand, formData.model, lookupDevice, estimatePrice, editingDevice]);

  const handleImageError = () => {
    const fallbacks = getFallbackImageUrls(formData.brand);
    if (fallbackIndex < fallbacks.length) {
      setCurrentImageUrl(fallbacks[fallbackIndex]);
      setFallbackIndex(prev => prev + 1);
    } else {
      setImageError(true);
    }
  };

  const getDeviceIcon = () => {
    const deviceType = deviceTypesWithIcons.find(t => t.value === formData.device_type);
    const Icon = deviceType?.icon || Smartphone;
    return <Icon className="h-10 w-10 text-muted-foreground" />;
  };

  // Search customers for consignment - Corners don't have centro_id linked customers
  const searchCustomers = useCallback(async (term: string) => {
    if (!term.trim()) {
      setCustomerSearchResults([]);
      return;
    }
    setSearchingCustomers(true);
    try {
      const { data } = await supabase
        .from("customers")
        .select("id, name, phone, email")
        .or(`name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(5);
      setCustomerSearchResults(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingCustomers(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch) {
        searchCustomers(customerSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, searchCustomers]);

  const calculateSplitPreview = useCallback(() => {
    const price = parseFloat(formData.price) || 0;
    if (price <= 0) return null;
    
    if (formData.sale_type === "conto_vendita") {
      const ownerPayout = price * (formData.owner_split_percentage / 100);
      const cornerGross = price * (formData.centro_split_percentage / 100);
      const platformCommission = cornerGross * (platformCommissionRate / 100);
      const cornerNet = cornerGross - platformCommission;
      return { ownerPayout, cornerGross, platformCommission, cornerNet, platformRate: platformCommissionRate };
    } else {
      const platformCommission = price * (platformCommissionRate / 100);
      const cornerNet = price - platformCommission;
      return { ownerPayout: 0, cornerGross: price, platformCommission, cornerNet, platformRate: platformCommissionRate };
    }
  }, [formData.price, formData.sale_type, formData.owner_split_percentage, formData.centro_split_percentage, platformCommissionRate]);

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
      sale_type: "acquistato",
      owner_split_percentage: 60,
      centro_split_percentage: 40,
    });
    setEditingDevice(null);
    setUploadedPhotos([]);
    setDetectedDevice(null);
    setCurrentImageUrl(null);
    setImageError(false);
    setFallbackIndex(0);
    setPriceEstimate(null);
    setAllStorageEstimates(null);
    setSelectedStorageOption(null);
    setSelectedCustomer(null);
    setCustomerSearch("");
    setCustomerSearchResults([]);
  };

  const handleMarkAsSold = async (deviceId: string) => {
    if (!confirm("Confermare la vendita di questo dispositivo?")) return;
    try {
      const { error } = await supabase
        .from("used_devices")
        .update({ status: "sold" })
        .eq("id", deviceId);
      if (error) throw error;
      toast({ title: "Dispositivo venduto!", description: "I margini sono stati calcolati automaticamente." });
      fetchDevices();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    }
  };
  
  const applyGradePrice = (grade: 'B' | 'A' | 'AA' | 'AAA') => {
    if (!priceEstimate?.grades?.[grade]) return;
    const price = priceEstimate.grades[grade];
    setFormData(prev => ({ 
      ...prev, 
      price: price.toString(),
      original_price: priceEstimate.originalPrice?.toString() || prev.original_price
    }));
    
    const conditionMap: Record<string, string> = {
      'B': 'usato_discreto',
      'A': 'usato_buono',
      'AA': 'usato_ottimo',
      'AAA': 'ricondizionato'
    };
    setFormData(prev => ({ ...prev, condition: conditionMap[grade] }));
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
        const filePath = `${cornerId}/${fileName}`;

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
      sale_type: device.sale_type || "acquistato",
      owner_split_percentage: device.owner_split_percentage || 60,
      centro_split_percentage: device.centro_split_percentage || 40,
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
      
      try {
        await supabase.functions.invoke('notify-device-interest', {
          body: { device_id: deviceId }
        });
      } catch (notifyError) {
        console.error("Errore invio notifiche:", notifyError);
      }
      
      toast({ title: "Dispositivo pubblicato", description: "I clienti interessati sono stati notificati" });
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

  const splitPreview = calculateSplitPreview();
  
  // Get interest counts for all devices
  const interestCounts = useDeviceInterestCounts(devices);

  return (
    <CornerLayout>
      <div className="space-y-4 md:space-y-6 pb-6">
        {/* Hero Header - Mobile Optimized */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-4 md:p-6">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-xl md:text-2xl font-bold">Gestione Usato</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Pubblica e gestisci dispositivi usati e ricondizionati
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full md:w-auto shadow-lg">
                  <Plus className="h-4 w-4" />
                  Aggiungi Dispositivo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 md:mx-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {editingDevice ? "Modifica" : "Nuovo"} Dispositivo Usato
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Device Type Selection */}
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

                  {/* Brand & Model */}
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
                              
                              <div className="flex-1 min-w-0 space-y-2">
                                <div>
                                  <h3 className="font-semibold text-sm truncate">
                                    {detectedDevice.fullName || `${formData.brand} ${formData.model}`}
                                  </h3>
                                  {detectedDevice.year && detectedDevice.year !== "N/A" && (
                                    <p className="text-xs text-muted-foreground">Anno: {detectedDevice.year}</p>
                                  )}
                                </div>
                                
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
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* AI Price Estimate Card */}
                  <AnimatePresence>
                    {(priceEstimate || isEstimating) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <Card className="p-4 bg-gradient-to-br from-success/5 to-success/10 border-success/20">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Euro className="h-4 w-4 text-success" />
                              <span className="text-sm font-medium">Valutazione AI</span>
                              {isEstimating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                            </div>
                            
                            {isEstimating ? (
                              <div className="space-y-3">
                                <div className="flex gap-2">
                                  {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-8 w-16 rounded-full" />
                                  ))}
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                  {['B', 'A', 'AA', 'AAA'].map((g) => (
                                    <Skeleton key={g} className="h-16 rounded-lg" />
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <>
                                {allStorageEstimates && Object.keys(allStorageEstimates).length > 1 && (
                                  <div className="flex flex-wrap gap-1.5 mb-3">
                                    {Object.keys(allStorageEstimates).map((storageKey) => (
                                      <button
                                        key={storageKey}
                                        type="button"
                                        onClick={() => selectStorageOption(storageKey)}
                                        className={`
                                          px-3 py-1.5 rounded-full text-xs font-medium transition-all
                                          ${selectedStorageOption === storageKey 
                                            ? 'bg-primary text-primary-foreground shadow-sm' 
                                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'}
                                        `}
                                      >
                                        {storageKey}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                
                                {priceEstimate?.grades && (
                                  <>
                                    <div className="grid grid-cols-4 gap-2">
                                      {(['B', 'A', 'AA', 'AAA'] as const).map((grade) => {
                                        const gradeColors = {
                                          B: 'from-orange-500/10 to-orange-500/20 border-orange-500/30 hover:border-orange-500',
                                          A: 'from-yellow-500/10 to-yellow-500/20 border-yellow-500/30 hover:border-yellow-500',
                                          AA: 'from-emerald-500/10 to-emerald-500/20 border-emerald-500/30 hover:border-emerald-500',
                                          AAA: 'from-primary/10 to-primary/20 border-primary/30 hover:border-primary'
                                        };
                                        const gradeLabels = {
                                          B: 'Discreto',
                                          A: 'Buono',
                                          AA: 'Ottimo',
                                          AAA: 'Come Nuovo'
                                        };
                                        return (
                                          <button
                                            key={grade}
                                            type="button"
                                            onClick={() => applyGradePrice(grade)}
                                            className={`
                                              flex flex-col items-center justify-center p-2 rounded-lg border-2 
                                              bg-gradient-to-br ${gradeColors[grade]} transition-all cursor-pointer
                                            `}
                                          >
                                            <span className="text-xs font-bold">{grade}</span>
                                            <span className="text-lg font-bold text-foreground">
                                              €{priceEstimate.grades[grade]}
                                            </span>
                                            <span className="text-[9px] text-muted-foreground">{gradeLabels[grade]}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                    
                                    {priceEstimate.originalPrice && (
                                      <p className="text-[10px] text-muted-foreground text-center">
                                        Prezzo nuovo: €{priceEstimate.originalPrice}
                                      </p>
                                    )}
                                    
                                    {priceEstimate.trend && (
                                      <div className={`
                                        flex items-center justify-center gap-2 px-3 py-2 rounded-lg mt-2
                                        ${priceEstimate.trend === 'alto' 
                                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                          : priceEstimate.trend === 'basso'
                                          ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}
                                      `}>
                                        {priceEstimate.trend === 'alto' && <TrendingUp className="h-4 w-4" />}
                                        {priceEstimate.trend === 'stabile' && <Minus className="h-4 w-4" />}
                                        {priceEstimate.trend === 'basso' && <TrendingDown className="h-4 w-4" />}
                                        <span className="text-xs font-medium">
                                          Trend: {priceEstimate.trend === 'alto' ? 'In crescita' : priceEstimate.trend === 'basso' ? 'In calo' : 'Stabile'}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                          </div>
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
                      <Label htmlFor="storage" className="text-xs font-medium text-muted-foreground">Storage</Label>
                      <Input
                        id="storage"
                        value={formData.storage_capacity}
                        onChange={e => setFormData(prev => ({ ...prev, storage_capacity: e.target.value }))}
                        className="h-9 text-sm"
                        placeholder="es. 256GB"
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
                        min="0"
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

                  {/* Sale Type Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5 text-primary" />
                      Tipo Vendita
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {saleTypeOptions.map((option) => {
                        const Icon = option.icon;
                        const isSelected = formData.sale_type === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, sale_type: option.value }))}
                            className={`
                              flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all
                              ${isSelected 
                                ? "border-primary bg-primary/10 text-primary" 
                                : "border-border bg-card hover:border-primary/50 hover:bg-muted/50 text-muted-foreground"
                              }
                            `}
                          >
                            <Icon className={`h-5 w-5 mb-1 ${isSelected ? "text-primary" : ""}`} />
                            <span className="text-xs font-medium">{option.label}</span>
                            <span className="text-[9px] text-muted-foreground">{option.description}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Consignment Split Settings */}
                  {formData.sale_type === "conto_vendita" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 p-4 rounded-lg bg-muted/50 border"
                    >
                      <div className="flex items-center gap-2">
                        <Handshake className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Impostazioni Conto Vendita</span>
                      </div>

                      {/* Customer Search */}
                      <div className="space-y-2">
                        <Label className="text-xs">Cliente Proprietario</Label>
                        {selectedCustomer ? (
                          <div className="flex items-center justify-between p-2 rounded bg-background border">
                            <div>
                              <p className="text-sm font-medium">{selectedCustomer.name}</p>
                              <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={customerSearch}
                              onChange={e => setCustomerSearch(e.target.value)}
                              placeholder="Cerca cliente..."
                              className="pl-8"
                            />
                            {searchingCustomers && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                            
                            {customerSearchResults.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                {customerSearchResults.map(customer => (
                                  <button
                                    key={customer.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCustomer(customer);
                                      setCustomerSearch("");
                                      setCustomerSearchResults([]);
                                    }}
                                    className="w-full text-left p-2 hover:bg-muted text-sm"
                                  >
                                    <p className="font-medium">{customer.name}</p>
                                    <p className="text-xs text-muted-foreground">{customer.phone} • {customer.email}</p>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Split Percentage Slider */}
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-1"><User className="h-3 w-3" /> Cliente: {formData.owner_split_percentage}%</span>
                          <span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> Corner: {formData.centro_split_percentage}%</span>
                        </div>
                        <Slider
                          value={[formData.owner_split_percentage]}
                          onValueChange={([val]) => setFormData(prev => ({
                            ...prev,
                            owner_split_percentage: val,
                            centro_split_percentage: 100 - val
                          }))}
                          min={0}
                          max={100}
                          step={5}
                        />
                      </div>

                      {/* Split Preview */}
                      {splitPreview && (
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 rounded bg-background">
                            <p className="text-xs text-muted-foreground">Cliente riceve</p>
                            <p className="font-bold text-green-600">€{splitPreview.ownerPayout.toFixed(2)}</p>
                          </div>
                          <div className="p-2 rounded bg-background">
                            <p className="text-xs text-muted-foreground">Corner lordo</p>
                            <p className="font-bold">€{splitPreview.cornerGross.toFixed(2)}</p>
                          </div>
                          <div className="p-2 rounded bg-background">
                            <p className="text-xs text-muted-foreground">Corner netto</p>
                            <p className="font-bold text-primary">€{splitPreview.cornerNet.toFixed(2)}</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-xs font-medium text-muted-foreground">Descrizione</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrizione aggiuntiva, accessori inclusi..."
                      className="min-h-[80px]"
                    />
                  </div>

                  {/* Photo Upload */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      Foto Dispositivo
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {uploadedPhotos.map((photo, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(photo)}
                            className="absolute top-0.5 right-0.5 bg-destructive text-white rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors"
                      >
                        {uploadingPhoto ? (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : (
                          <Plus className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={formLoading}>
                    {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingDevice ? "Salva Modifiche" : "Aggiungi Dispositivo"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats - Grid on Mobile */}
        <div className="grid grid-cols-5 gap-1.5 md:gap-3">
          {[
            { icon: Package, value: stats.total, label: "Tot", color: "text-muted-foreground", bg: "bg-muted/30" },
            { icon: Eye, value: stats.published, label: "Pub", color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { icon: Clock, value: stats.reserved, label: "Pren", color: "text-amber-500", bg: "bg-amber-500/10" },
            { icon: CheckCircle2, value: stats.sold, label: "Vend", color: "text-primary", bg: "bg-primary/10" },
            { icon: AlertCircle, value: stats.pendingReservations, label: "Rich", color: "text-orange-500", bg: "bg-orange-500/10" },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className={`p-2 md:p-4 ${stat.bg} border-0 shadow-sm`}>
                <div className="flex flex-col items-center text-center">
                  <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color} mb-1`} />
                  <p className="text-base md:text-2xl font-bold">{stat.value}</p>
                  <p className="text-[8px] md:text-xs text-muted-foreground leading-tight">{stat.label}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="devices" className="space-y-4">
          <TabsList className="w-full md:w-auto grid grid-cols-3 md:inline-flex h-auto p-1 bg-muted/50">
            <TabsTrigger value="devices" className="text-xs md:text-sm py-2">Dispositivi</TabsTrigger>
            <TabsTrigger value="reservations" className="text-xs md:text-sm py-2 relative">
              Prenotazioni
              {stats.pendingReservations > 0 && (
                <Badge className="ml-1.5 bg-orange-500 text-[10px] px-1.5 py-0">{stats.pendingReservations}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="market" className="text-xs md:text-sm py-2">Storico</TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="mt-4">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="p-4">
                    <div className="flex gap-3">
                      <Skeleton className="h-20 w-20 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : devices.length === 0 ? (
              <Card className="p-8 md:p-12 text-center bg-gradient-to-br from-muted/30 to-muted/50">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Package className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-lg">Nessun dispositivo usato</p>
                    <p className="text-sm text-muted-foreground mt-1">Inizia ad aggiungere dispositivi al tuo catalogo</p>
                  </div>
                  <Button onClick={() => setDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Aggiungi il primo
                  </Button>
                </motion.div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {devices.map((device, idx) => (
                  <motion.div
                    key={device.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30">
                      {/* Main Content */}
                      <div className="p-3">
                        <div className="flex gap-3">
                          {/* Image */}
                          <div className="relative flex-shrink-0">
                            {device.photos?.[0] ? (
                              <img 
                                src={device.photos[0]} 
                                alt="" 
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover bg-muted"
                              />
                            ) : (
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                                <Smartphone className="h-6 w-6 text-muted-foreground/50" />
                              </div>
                            )}
                            {/* Status Badge Overlay */}
                            <div className="absolute -top-1.5 -right-1.5">
                              {getStatusBadge(device.status)}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">
                              {device.brand} {device.model}
                            </h3>
                            
                            {/* Tags */}
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {device.storage_capacity && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  {device.storage_capacity}
                                </span>
                              )}
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                                {conditionOptions.find(c => c.value === device.condition)?.label?.substring(0, 8) || device.condition}
                              </Badge>
                            </div>

                            {/* Price */}
                            <div className="flex items-baseline gap-2 mt-1.5">
                              <p className="text-base font-bold text-primary">€{device.price}</p>
                              {device.original_price && (
                                <p className="text-[10px] text-muted-foreground line-through">€{device.original_price}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/30">
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              <span>{device.views_count || 0}</span>
                            </div>
                            {device.warranty_months > 0 && (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                <span>{device.warranty_months}m gar.</span>
                              </div>
                            )}
                            {device.sale_type === "conto_vendita" && (
                              <div className="flex items-center gap-1">
                                <Handshake className="h-3 w-3 text-primary" />
                                <span>C/V</span>
                              </div>
                            )}
                            {/* Interest notifications - Only for published devices */}
                            {device.status === "published" && interestCounts[device.id]?.matchingInterests > 0 && (
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3 text-violet-500" />
                                <span className="text-violet-600">{interestCounts[device.id].matchingInterests}</span>
                                {interestCounts[device.id]?.notifiedCount > 0 && (
                                  <Badge variant="secondary" className="text-[8px] px-1 py-0 gap-0.5 bg-emerald-500/10 text-emerald-600 ml-0.5">
                                    <Bell className="h-2 w-2" />
                                    {interestCounts[device.id].notifiedCount}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(device.created_at), "dd/MM", { locale: it })}
                          </p>
                        </div>
                      </div>

                      {/* Actions Footer */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-t border-border/50">
                        <div className="flex items-center gap-0.5">
                          {device.status === "draft" && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 px-2 text-xs gap-1 text-success hover:text-success hover:bg-success/10"
                              onClick={() => handlePublish(device.id)}
                            >
                              <Eye className="h-3 w-3" />
                              Pubblica
                            </Button>
                          )}
                          {device.status === "published" && interestCounts[device.id]?.matchingInterests > 0 && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 px-2 text-xs gap-1 text-violet-600 hover:text-violet-700 hover:bg-violet-500/10"
                              onClick={() => {
                                setSelectedDeviceForNotify(device);
                                setNotifyDialogOpen(true);
                              }}
                            >
                              <Bell className="h-3 w-3" />
                              Notifica ({interestCounts[device.id].matchingInterests})
                            </Button>
                          )}
                          {(device.status === "published" || device.status === "reserved") && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => handleMarkAsSold(device.id)}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Venduto
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7"
                            onClick={() => handleEdit(device)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(device.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reservations" className="mt-4">
            {reservations.filter(r => r.status === "pending").length === 0 ? (
              <Card className="p-8 md:p-12 text-center bg-gradient-to-br from-muted/30 to-muted/50">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="mx-auto w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
                    <Clock className="h-8 w-8 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium text-lg">Nessuna prenotazione in attesa</p>
                    <p className="text-sm text-muted-foreground mt-1">Le prenotazioni dei clienti appariranno qui</p>
                  </div>
                </motion.div>
              </Card>
            ) : (
              <div className="space-y-3">
                {reservations.filter(r => r.status === "pending").map((res, idx) => (
                  <motion.div
                    key={res.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Customer Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-primary/10">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">{res.customer_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{res.customer_phone}</p>
                              <p className="text-xs text-muted-foreground truncate">{res.customer_email}</p>
                            </div>
                          </div>
                        </div>

                        {/* Device Info */}
                        {res.device && (
                          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                            <Smartphone className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{res.device.brand} {res.device.model}</p>
                              <p className="text-xs text-primary font-semibold">€{res.device.price}</p>
                            </div>
                          </div>
                        )}

                        {/* Message */}
                        {res.message && (
                          <div className="hidden md:block flex-1 max-w-xs">
                            <p className="text-sm text-muted-foreground truncate italic">"{res.message}"</p>
                          </div>
                        )}

                        {/* Date & Actions */}
                        <div className="flex items-center justify-between md:justify-end gap-3">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(res.created_at), "dd/MM HH:mm", { locale: it })}
                          </p>
                          <div className="flex gap-1.5">
                            <Button 
                              size="sm" 
                              className="h-8 gap-1.5"
                              onClick={() => handleReservationAction(res.id, "confirmed")}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Conferma
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8 gap-1.5"
                              onClick={() => handleReservationAction(res.id, "cancelled")}
                            >
                              <X className="h-3.5 w-3.5" />
                              Annulla
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Mobile message */}
                      {res.message && (
                        <div className="md:hidden mt-3 pt-3 border-t">
                          <p className="text-sm text-muted-foreground italic">"{res.message}"</p>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="market" className="mt-4">
            <MarketPriceHistory />
          </TabsContent>
        </Tabs>
        
        {/* Notify Interested Dialog */}
        {selectedDeviceForNotify && (
          <NotifyInterestedDialog
            open={notifyDialogOpen}
            onOpenChange={(open) => {
              setNotifyDialogOpen(open);
              if (!open) setSelectedDeviceForNotify(null);
            }}
            device={selectedDeviceForNotify}
            matchingInterests={interestCounts[selectedDeviceForNotify.id]?.matchingInterests || 0}
          />
        )}
      </div>
    </CornerLayout>
  );
}
