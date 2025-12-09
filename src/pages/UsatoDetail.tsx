import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  Wrench,
  Shield,
  Eye,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  CheckCircle2,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  MessageCircle,
  Sparkles,
  Cpu,
  HardDrive,
  MonitorSmartphone,
} from "lucide-react";

const conditionLabels: Record<string, { label: string; color: string; description: string }> = {
  ricondizionato: { 
    label: "Ricondizionato", 
    color: "bg-success text-success-foreground",
    description: "Dispositivo completamente rigenerato, testato e con componenti nuovi dove necessario"
  },
  usato_ottimo: { 
    label: "Usato Ottimo", 
    color: "bg-primary text-primary-foreground",
    description: "Condizioni eccellenti, segni d'uso minimi o assenti"
  },
  usato_buono: { 
    label: "Usato Buono", 
    color: "bg-info text-info-foreground",
    description: "Buone condizioni con normali segni d'uso"
  },
  usato_discreto: { 
    label: "Usato Discreto", 
    color: "bg-warning text-warning-foreground",
    description: "Funzionante con segni d'uso visibili"
  },
  alienato: { 
    label: "Alienato", 
    color: "bg-muted text-muted-foreground",
    description: "Dispositivo non ritirato dal cliente, venduto a prezzo speciale"
  },
};

const getDeviceIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case "smartphone": return Smartphone;
    case "tablet": return Tablet;
    case "laptop": return Laptop;
    case "pc": return Monitor;
    default: return Smartphone;
  }
};

// Brand logo fallback URLs
const brandLogos: Record<string, string> = {
  apple: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
  samsung: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg",
  huawei: "https://upload.wikimedia.org/wikipedia/en/0/04/Huawei_Standard_logo.svg",
  xiaomi: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg",
  oppo: "https://upload.wikimedia.org/wikipedia/commons/0/0a/OPPO_LOGO_2019.svg",
  google: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
  oneplus: "https://upload.wikimedia.org/wikipedia/commons/d/d8/OnePlus_logo.svg",
  motorola: "https://upload.wikimedia.org/wikipedia/commons/4/45/Motorola_logo.svg",
  sony: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Sony_logo.svg",
  lg: "https://upload.wikimedia.org/wikipedia/commons/b/bf/LG_logo_%282015%29.svg",
};

const getFallbackImageUrls = (brand: string): string[] => {
  const urls: string[] = [];
  const brandLower = brand.toLowerCase();
  
  if (brandLogos[brandLower]) {
    urls.push(brandLogos[brandLower]);
  }
  
  return urls;
};

export default function UsatoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [reservationOpen, setReservationOpen] = useState(false);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    message: "",
  });

  // Device lookup state
  const [lookupImage, setLookupImage] = useState<string | null>(null);
  const [lookupData, setLookupData] = useState<any>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  useEffect(() => {
    fetchDevice();
  }, [id]);

  const fetchDevice = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("used_devices")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setDevice(data);

      // Increment views
      await supabase
        .from("used_devices")
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq("id", id);
    } catch (error) {
      console.error("Error fetching device:", error);
      toast({
        title: "Errore",
        description: "Dispositivo non trovato",
        variant: "destructive",
      });
      navigate("/usato");
    } finally {
      setLoading(false);
    }
  };

  // Lookup device image and details
  const lookupDeviceInfo = useCallback(async () => {
    if (!device || (device.photos && device.photos.length > 0)) return;
    if (!device.brand || !device.model) return;
    
    setIsLookingUp(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('lookup-device', {
        body: { brand: device.brand, model: device.model }
      });
      
      if (!error && data) {
        if (data.imageUrl) {
          setLookupImage(data.imageUrl);
        }
        setLookupData(data);
      }
    } catch (err) {
      console.error("Device lookup error:", err);
    } finally {
      setIsLookingUp(false);
    }
  }, [device]);

  useEffect(() => {
    if (device && (!device.photos || device.photos.length === 0)) {
      lookupDeviceInfo();
    }
  }, [device, lookupDeviceInfo]);

  const handleImageError = () => {
    if (!device) return;
    const fallbacks = getFallbackImageUrls(device.brand);
    if (fallbackIndex < fallbacks.length) {
      setLookupImage(fallbacks[fallbackIndex]);
      setFallbackIndex(prev => prev + 1);
    } else {
      setImageError(true);
    }
  };

  const handleReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setReservationLoading(true);

    try {
      const { error } = await supabase.from("used_device_reservations").insert({
        device_id: id,
        ...formData,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Richiesta Inviata!",
        description: "Ti contatteremo presto per confermare la prenotazione.",
      });
      setReservationOpen(false);
      setFormData({
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        message: "",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setReservationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <Skeleton className="h-10 w-32 mb-8" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-12 w-1/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!device) return null;

  const DeviceIcon = getDeviceIcon(device.device_type);
  const conditionInfo = conditionLabels[device.condition] || conditionLabels.usato_buono;
  const discountPercent = device.original_price 
    ? Math.round((1 - device.price / device.original_price) * 100) 
    : 0;
  const photos = device.photos || [];
  const specs = device.specifications || {};
  const hasPhotos = photos.length > 0;
  const displayImage = hasPhotos ? photos[currentPhotoIndex] : lookupImage;
  const showAiBadge = !hasPhotos && lookupImage && !imageError;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/usato")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-primary rounded-xl">
                  <Wrench className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-xl">TechRepair</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Gallery */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="relative aspect-square bg-muted rounded-2xl overflow-hidden">
              {displayImage && !imageError ? (
                <>
                  <img
                    src={displayImage}
                    alt={`${device.brand} ${device.model}`}
                    className={`w-full h-full ${hasPhotos ? 'object-cover' : 'object-contain p-8'}`}
                    onError={handleImageError}
                  />
                  {hasPhotos && photos.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2"
                        onClick={() => setCurrentPhotoIndex(prev => 
                          prev === 0 ? photos.length - 1 : prev - 1
                        )}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setCurrentPhotoIndex(prev => 
                          prev === photos.length - 1 ? 0 : prev + 1
                        )}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </>
              ) : isLookingUp ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <div className="animate-pulse">
                    <DeviceIcon className="h-24 w-24 text-muted-foreground/30" />
                  </div>
                  <span className="text-sm text-muted-foreground">Caricamento immagine...</span>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <DeviceIcon className="h-32 w-32 text-muted-foreground/30" />
                  <span className="text-lg font-medium text-muted-foreground">{device.brand}</span>
                </div>
              )}

              {/* AI Badge */}
              {showAiBadge && (
                <div className="absolute bottom-4 left-4">
                  <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary border-primary/20">
                    <Sparkles className="h-3.5 w-3.5" />
                    Immagine AI
                  </Badge>
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <Badge className={conditionInfo.color}>
                  {conditionInfo.label}
                </Badge>
                {discountPercent > 0 && (
                  <Badge className="bg-destructive text-destructive-foreground">
                    -{discountPercent}%
                  </Badge>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {hasPhotos && photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {photos.map((photo: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPhotoIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      index === currentPhotoIndex ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* AI Detected Specs Card */}
            {lookupData && !hasPhotos && (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Specifiche rilevate automaticamente</span>
                  </div>
                  {lookupData.fullName && (
                    <p className="font-semibold text-foreground mb-2">{lookupData.fullName}</p>
                  )}
                  {lookupData.year && (
                    <p className="text-sm text-muted-foreground mb-3">Anno: {lookupData.year}</p>
                  )}
                  {lookupData.specs && (
                    <div className="grid grid-cols-2 gap-2">
                      {lookupData.specs.storage && (
                        <div className="flex items-center gap-2 text-sm">
                          <HardDrive className="h-4 w-4 text-muted-foreground" />
                          <span>{lookupData.specs.storage}</span>
                        </div>
                      )}
                      {lookupData.specs.ram && (
                        <div className="flex items-center gap-2 text-sm">
                          <Cpu className="h-4 w-4 text-muted-foreground" />
                          <span>{lookupData.specs.ram}</span>
                        </div>
                      )}
                      {lookupData.specs.display && (
                        <div className="flex items-center gap-2 text-sm col-span-2">
                          <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
                          <span>{lookupData.specs.display}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Title & Brand */}
            <div>
              <p className="text-sm text-primary uppercase tracking-wide font-medium">
                {device.brand}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                {lookupData?.fullName || device.model}
              </h1>
              {device.storage_capacity && (
                <p className="text-muted-foreground mt-1">
                  {device.storage_capacity} {device.color && `• ${device.color}`}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-end gap-3">
              <span className="text-3xl sm:text-4xl font-bold text-primary">
                €{device.price.toLocaleString()}
              </span>
              {device.original_price && device.original_price > device.price && (
                <span className="text-xl text-muted-foreground line-through">
                  €{device.original_price.toLocaleString()}
                </span>
              )}
            </div>

            {/* Condition Info */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">{conditionInfo.label}</p>
                    <p className="text-sm text-muted-foreground">{conditionInfo.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Warranty */}
            {device.warranty_months > 0 && (
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                <Shield className="h-6 w-6 text-success" />
                <div>
                  <p className="font-semibold">{device.warranty_months} mesi di garanzia</p>
                  <p className="text-sm text-muted-foreground">Garanzia completa su difetti</p>
                </div>
              </div>
            )}

            {/* Description */}
            {device.description && (
              <div>
                <h3 className="font-semibold mb-2">Descrizione</h3>
                <p className="text-muted-foreground">{device.description}</p>
              </div>
            )}

            {/* Specifications */}
            {Object.keys(specs).length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Specifiche</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(specs).map(([key, value]) => (
                    <div key={key} className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground capitalize">{key}</p>
                      <p className="text-sm font-medium">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Dialog open={reservationOpen} onOpenChange={setReservationOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" variant="glow" className="w-full gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Prenota Ora
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Prenota {device.brand} {device.model}</DialogTitle>
                    <DialogDescription>
                      Compila il form per richiedere la prenotazione di questo dispositivo
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleReservation} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome *</Label>
                      <Input
                        id="name"
                        value={formData.customer_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.customer_email}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefono *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.customer_phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Messaggio (opzionale)</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Domande o richieste particolari..."
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={reservationLoading}>
                      {reservationLoading ? "Invio..." : "Invia Richiesta"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Button variant="outline" size="lg" className="w-full gap-2">
                <MessageCircle className="h-5 w-5" />
                Richiedi Informazioni
              </Button>
            </div>

            {/* Views */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              {device.views_count} visualizzazioni
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
