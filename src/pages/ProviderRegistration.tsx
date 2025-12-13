import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation } from "@/hooks/useGeolocation";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Store, 
  Wrench, 
  Building2, 
  ArrowLeft, 
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  User,
  Briefcase,
  CheckCircle,
  Loader2,
  Sparkles,
  Euro,
  Users,
  TrendingUp,
  Shield,
  FileText,
  Upload,
  X,
  Image as ImageIcon
} from "lucide-react";
import { LocationPicker } from "@/components/maps/LocationPicker";

type ProviderType = "corner" | "riparatore" | "centro" | null;

interface CornerForm {
  business_name: string;
  address: string;
  phone: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
}

interface RiparatoreForm {
  full_name: string;
  phone: string;
  email: string;
  address: string;
  service_radius_km: number;
  is_mobile: boolean;
  specializations: string[];
  latitude: number | null;
  longitude: number | null;
}

interface CentroForm {
  business_name: string;
  vat_number: string;
  address: string;
  phone: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
}

const specializations = [
  "Smartphone",
  "Tablet",
  "Laptop",
  "Computer Desktop",
  "Smartwatch",
  "Console Gaming",
  "Riparazione Scheda Madre",
  "Microsaldatura",
  "Recupero Dati",
];

export default function ProviderRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { latitude, longitude, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();
  const cornerLogoInputRef = useRef<HTMLInputElement>(null);
  
  const typeParam = searchParams.get("type") as ProviderType;
  const [selectedType, setSelectedType] = useState<ProviderType>(typeParam || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [cornerForm, setCornerForm] = useState<CornerForm>({
    business_name: "",
    address: "",
    phone: "",
    email: user?.email || "",
    latitude: null,
    longitude: null,
    logo_url: null,
  });

  const [riparatoreForm, setRiparatoreForm] = useState<RiparatoreForm>({
    full_name: "",
    phone: "",
    email: user?.email || "",
    address: "",
    service_radius_km: 15,
    is_mobile: true,
    specializations: [],
    latitude: null,
    longitude: null,
  });

  const [centroForm, setCentroForm] = useState<CentroForm>({
    business_name: "",
    vat_number: "",
    address: "",
    phone: "",
    email: user?.email || "",
    latitude: null,
    longitude: null,
  });

  useEffect(() => {
    if (latitude && longitude) {
      if (selectedType === "corner") {
        setCornerForm(prev => ({ ...prev, latitude, longitude }));
      } else if (selectedType === "riparatore") {
        setRiparatoreForm(prev => ({ ...prev, latitude, longitude }));
      } else if (selectedType === "centro") {
        setCentroForm(prev => ({ ...prev, latitude, longitude }));
      }
      toast.success("Posizione rilevata con successo");
    }
  }, [latitude, longitude, selectedType]);

  useEffect(() => {
    if (geoError) {
      toast.error(geoError);
    }
  }, [geoError]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Devi effettuare il login per registrarti");
      navigate("/auth");
      return;
    }

    setIsSubmitting(true);

    try {
      if (selectedType === "corner") {
        const { error } = await supabase.from("corners").insert({
          user_id: user.id,
          business_name: cornerForm.business_name,
          address: cornerForm.address,
          phone: cornerForm.phone,
          email: cornerForm.email,
          latitude: cornerForm.latitude,
          longitude: cornerForm.longitude,
          logo_url: cornerForm.logo_url,
          status: 'approved',
          approved_at: new Date().toISOString(),
        });
        if (error) throw error;
        // Role is automatically assigned via database trigger
        
      } else if (selectedType === "riparatore") {
        const { error } = await supabase.from("riparatori").insert({
          user_id: user.id,
          full_name: riparatoreForm.full_name,
          phone: riparatoreForm.phone,
          email: riparatoreForm.email,
          address: riparatoreForm.address,
          service_radius_km: riparatoreForm.service_radius_km,
          is_mobile: riparatoreForm.is_mobile,
          specializations: riparatoreForm.specializations,
          latitude: riparatoreForm.latitude,
          longitude: riparatoreForm.longitude,
          status: 'approved',
          approved_at: new Date().toISOString(),
        });
        if (error) throw error;
        // Role is automatically assigned via database trigger
        
      } else if (selectedType === "centro") {
        const { error } = await supabase.from("centri_assistenza").insert({
          owner_user_id: user.id,
          business_name: centroForm.business_name,
          vat_number: centroForm.vat_number,
          address: centroForm.address,
          phone: centroForm.phone,
          email: centroForm.email,
          latitude: centroForm.latitude,
          longitude: centroForm.longitude,
          status: 'approved',
          approved_at: new Date().toISOString(),
        });
        if (error) throw error;
        // Role is automatically assigned via database trigger
      }

      setSubmitted(true);
      toast.success("Registrazione inviata con successo!");
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.code === "23505") {
        toast.error("Sei già registrato come questo tipo di provider");
      } else {
        toast.error("Errore durante la registrazione");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const providerTypes = [
    {
      type: "corner" as const,
      title: "Corner",
      subtitle: "Punto di Raccolta",
      description: "Diventa punto di riferimento per i clienti nella tua zona",
      icon: Store,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
      gradientFrom: "from-primary/20",
      gradientTo: "to-primary/5",
      commission: "10%",
      commissionLabel: "sul margine",
      benefits: [
        { icon: Euro, text: "Guadagna su ogni segnalazione" },
        { icon: Users, text: "Aumenta il traffico nel negozio" },
        { icon: Shield, text: "Zero investimento iniziale" },
      ],
      welcomeMessage: "Stai per diventare un Corner, il punto di riferimento per i clienti nella tua zona. Guadagnerai una commissione su ogni riparazione segnalata!",
    },
    {
      type: "riparatore" as const,
      title: "Riparatore",
      subtitle: "Tecnico Indipendente",
      description: "Ricevi lavori nella tua zona con totale autonomia",
      icon: Wrench,
      color: "text-info",
      bgColor: "bg-info/10",
      borderColor: "border-info/30",
      gradientFrom: "from-info/20",
      gradientTo: "to-info/5",
      commission: "60%",
      commissionLabel: "sul margine",
      benefits: [
        { icon: TrendingUp, text: "Flessibilità totale sugli orari" },
        { icon: Euro, text: "Pagamenti rapidi e sicuri" },
        { icon: Users, text: "Accesso a ricambi scontati" },
      ],
      welcomeMessage: "Stai per diventare un Riparatore indipendente. Riceverai lavori nella tua zona e gestirai i tuoi orari in totale autonomia!",
    },
    {
      type: "centro" as const,
      title: "Centro Assistenza",
      subtitle: "Laboratorio Professionale",
      description: "Gestionale completo e rete di partner",
      icon: Building2,
      color: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success/30",
      gradientFrom: "from-success/20",
      gradientTo: "to-success/5",
      commission: "80%",
      commissionLabel: "fino al margine",
      benefits: [
        { icon: FileText, text: "Gestionale completo incluso" },
        { icon: Users, text: "Rete di Corner per nuovi clienti" },
        { icon: TrendingUp, text: "Marketplace dispositivi usati" },
      ],
      welcomeMessage: "Stai per diventare un Centro Assistenza. Avrai accesso al gestionale completo, alla rete di Corner per nuovi clienti e al marketplace dispositivi usati!",
    },
  ];

  const selectedProvider = providerTypes.find(p => p.type === selectedType);

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {/* Background decorations */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-mesh animate-aurora opacity-30" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-success/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <motion.div 
            className="w-24 h-24 rounded-full bg-gradient-to-br from-success/30 to-success/10 flex items-center justify-center mx-auto mb-6 shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            <CheckCircle className="h-12 w-12 text-success" />
          </motion.div>
          <h1 className="text-3xl font-bold mb-3">Registrazione Completata!</h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Il tuo account è stato attivato con successo. Puoi iniziare subito a utilizzare la piattaforma!
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/")} variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Torna alla Home
            </Button>
            <Button onClick={() => {
              if (selectedType === "corner") navigate("/corner");
              else if (selectedType === "riparatore") navigate("/riparatore");
              else if (selectedType === "centro") navigate("/centro");
            }} className="gap-2">
              Vai alla Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background decorations */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh animate-aurora opacity-20" />
        <div className="absolute inset-0 bg-pattern-dots opacity-20" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 bg-background/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="p-2.5 bg-gradient-primary rounded-xl shadow-glow">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">LabLinkRiparo</span>
          </motion.div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => selectedType ? setSelectedType(null) : navigate("/diventa-partner")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{selectedType ? "Cambia tipo" : "Torna indietro"}</span>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Title */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border-primary/20 mb-4"
            animate={{ boxShadow: ["0 0 20px hsl(217 91% 60% / 0.1)", "0 0 30px hsl(217 91% 60% / 0.2)", "0 0 20px hsl(217 91% 60% / 0.1)"] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Candidatura Partner</span>
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            {selectedType ? `Registrazione ${selectedProvider?.title}` : "Scegli il tuo ruolo"}
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {selectedType 
              ? "Compila i dati richiesti per completare la tua candidatura" 
              : "Seleziona il tipo di partner che vuoi diventare"
            }
          </p>
        </motion.div>

        {/* Welcome Banner when type is selected */}
        {selectedProvider && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className={`border-2 ${selectedProvider.borderColor} bg-gradient-to-r ${selectedProvider.gradientFrom} ${selectedProvider.gradientTo} overflow-hidden`}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className={`p-4 rounded-2xl ${selectedProvider.bgColor} shrink-0 self-start md:self-center`}>
                    <selectedProvider.icon className={`h-10 w-10 ${selectedProvider.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{selectedProvider.title}</h3>
                      <Badge variant="secondary" className={`${selectedProvider.bgColor} ${selectedProvider.color} border-0`}>
                        {selectedProvider.subtitle}
                      </Badge>
                      <Badge className="bg-success/20 text-success border-0 font-semibold">
                        {selectedProvider.commission} {selectedProvider.commissionLabel}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      {selectedProvider.welcomeMessage}
                    </p>
                    <div className="flex flex-wrap gap-4">
                      {selectedProvider.benefits.map((benefit, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className={`p-1.5 rounded-lg ${selectedProvider.bgColor}`}>
                            <benefit.icon className={`h-3.5 w-3.5 ${selectedProvider.color}`} />
                          </div>
                          <span className="text-muted-foreground">{benefit.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!selectedType ? (
            /* Type Selection */
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid md:grid-cols-3 gap-6"
            >
              {providerTypes.map((provider, index) => (
                <motion.div
                  key={provider.type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className={`cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-xl bg-gradient-to-br ${provider.gradientFrom} ${provider.gradientTo} border-2 border-transparent hover:${provider.borderColor} group h-full`}
                    onClick={() => setSelectedType(provider.type)}
                  >
                    <CardHeader className="text-center pb-4">
                      <motion.div 
                        className={`w-20 h-20 rounded-2xl ${provider.bgColor} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}
                        whileHover={{ rotate: [0, -5, 5, 0] }}
                      >
                        <provider.icon className={`h-10 w-10 ${provider.color}`} />
                      </motion.div>
                      <CardTitle className="text-2xl">{provider.title}</CardTitle>
                      <Badge variant="outline" className={`${provider.color} border-current mx-auto`}>
                        {provider.subtitle}
                      </Badge>
                      <CardDescription className="mt-3">{provider.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <div className="inline-flex items-baseline gap-1 px-4 py-2 rounded-xl bg-success/10">
                          <span className="text-3xl font-bold text-success">{provider.commission}</span>
                          <span className="text-sm text-success/80">{provider.commissionLabel}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 pt-2">
                        {provider.benefits.map((benefit, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className={`p-1.5 rounded-lg ${provider.bgColor}`}>
                              <benefit.icon className={`h-3.5 w-3.5 ${provider.color}`} />
                            </div>
                            <span>{benefit.text}</span>
                          </div>
                        ))}
                      </div>

                      <Button className="w-full mt-4 group-hover:shadow-lg transition-shadow" variant="outline">
                        Seleziona
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : selectedType === "corner" ? (
            /* Corner Form */
            <motion.div
              key="corner-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-card/80 backdrop-blur border-border/50 shadow-xl">
                <CardHeader className="border-b border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Dati del Negozio</CardTitle>
                      <CardDescription>Inserisci le informazioni della tua attività</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Logo Upload */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Logo Negozio (Opzionale)
                    </Label>
                    <div className="flex items-center gap-4">
                      {cornerForm.logo_url ? (
                        <div className="relative group">
                          <img
                            src={cornerForm.logo_url}
                            alt="Logo preview"
                            className="w-20 h-20 rounded-xl object-cover border-2 border-border shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setCornerForm({ ...cornerForm, logo_url: null })}
                            className="absolute -top-2 -right-2 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
                          <Store className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="space-y-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => cornerLogoInputRef.current?.click()}
                          disabled={uploadingLogo}
                          className="gap-2"
                        >
                          {uploadingLogo ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          {cornerForm.logo_url ? "Cambia" : "Carica"}
                        </Button>
                        <input
                          ref={cornerLogoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (!file.type.startsWith("image/")) {
                              toast.error("Seleziona un file immagine");
                              return;
                            }
                            if (file.size > 2 * 1024 * 1024) {
                              toast.error("Max 2MB");
                              return;
                            }
                            setUploadingLogo(true);
                            try {
                              const fileExt = file.name.split(".").pop();
                              const fileName = `corner-temp-${Date.now()}.${fileExt}`;
                              const { error: uploadError } = await supabase.storage
                                .from("centro-logos")
                                .upload(fileName, file, { upsert: true });
                              if (uploadError) throw uploadError;
                              const { data: urlData } = supabase.storage
                                .from("centro-logos")
                                .getPublicUrl(fileName);
                              setCornerForm({ ...cornerForm, logo_url: urlData.publicUrl });
                              toast.success("Logo caricato");
                            } catch (err) {
                              toast.error("Errore upload logo");
                            } finally {
                              setUploadingLogo(false);
                            }
                          }}
                        />
                        <p className="text-[10px] text-muted-foreground">JPG, PNG. Max 2MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="business_name" className="text-sm font-medium">Nome Negozio *</Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="business_name"
                          placeholder="Es. TechStore Milano"
                          className="pl-10 h-11"
                          value={cornerForm.business_name}
                          onChange={(e) => setCornerForm({ ...cornerForm, business_name: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="email@esempio.it"
                          className="pl-10 h-11"
                          value={cornerForm.email}
                          onChange={(e) => setCornerForm({ ...cornerForm, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium">Telefono *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          placeholder="+39 123 456 7890"
                          className="pl-10 h-11"
                          value={cornerForm.phone}
                          onChange={(e) => setCornerForm({ ...cornerForm, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-sm font-medium">Indirizzo *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="address"
                          placeholder="Via Roma 1, Milano"
                          className="pl-10 h-11"
                          value={cornerForm.address}
                          onChange={(e) => setCornerForm({ ...cornerForm, address: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Posizione sulla Mappa</Label>
                    <LocationPicker
                      latitude={cornerForm.latitude}
                      longitude={cornerForm.longitude}
                      onLocationChange={(lat, lng) => setCornerForm({ ...cornerForm, latitude: lat, longitude: lng })}
                      onGeolocate={requestLocation}
                      geoLoading={geoLoading}
                    />
                  </div>

                  <Button
                    className="w-full h-12 text-base font-semibold shadow-lg"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !cornerForm.business_name || !cornerForm.email || !cornerForm.phone || !cornerForm.address}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Invio in corso...
                      </>
                    ) : (
                      <>
                        Invia Candidatura
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : selectedType === "riparatore" ? (
            /* Riparatore Form */
            <motion.div
              key="riparatore-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-card/80 backdrop-blur border-border/50 shadow-xl">
                <CardHeader className="border-b border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-info/10">
                      <Wrench className="h-6 w-6 text-info" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Dati Professionali</CardTitle>
                      <CardDescription>Inserisci le tue informazioni da tecnico</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-sm font-medium">Nome Completo *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="full_name"
                          placeholder="Mario Rossi"
                          className="pl-10 h-11"
                          value={riparatoreForm.full_name}
                          onChange={(e) => setRiparatoreForm({ ...riparatoreForm, full_name: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="email@esempio.it"
                          className="pl-10 h-11"
                          value={riparatoreForm.email}
                          onChange={(e) => setRiparatoreForm({ ...riparatoreForm, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium">Telefono *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          placeholder="+39 123 456 7890"
                          className="pl-10 h-11"
                          value={riparatoreForm.phone}
                          onChange={(e) => setRiparatoreForm({ ...riparatoreForm, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-sm font-medium">Indirizzo / Zona *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="address"
                          placeholder="Milano, Lombardia"
                          className="pl-10 h-11"
                          value={riparatoreForm.address}
                          onChange={(e) => setRiparatoreForm({ ...riparatoreForm, address: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="radius" className="text-sm font-medium">Raggio di Servizio (km)</Label>
                      <Input
                        id="radius"
                        type="number"
                        min={1}
                        max={100}
                        className="h-11"
                        value={riparatoreForm.service_radius_km}
                        onChange={(e) => setRiparatoreForm({ ...riparatoreForm, service_radius_km: parseInt(e.target.value) || 15 })}
                      />
                    </div>
                    <div className="flex items-center space-x-3 pt-6">
                      <Checkbox
                        id="is_mobile"
                        checked={riparatoreForm.is_mobile}
                        onCheckedChange={(checked) => setRiparatoreForm({ ...riparatoreForm, is_mobile: !!checked })}
                      />
                      <Label htmlFor="is_mobile" className="text-sm">Disponibile per riparazioni a domicilio</Label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Specializzazioni</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {specializations.map((spec) => (
                        <div key={spec} className="flex items-center space-x-2">
                          <Checkbox
                            id={spec}
                            checked={riparatoreForm.specializations.includes(spec)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setRiparatoreForm({ ...riparatoreForm, specializations: [...riparatoreForm.specializations, spec] });
                              } else {
                                setRiparatoreForm({ ...riparatoreForm, specializations: riparatoreForm.specializations.filter(s => s !== spec) });
                              }
                            }}
                          />
                          <Label htmlFor={spec} className="text-sm cursor-pointer">{spec}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Posizione sulla Mappa</Label>
                    <LocationPicker
                      latitude={riparatoreForm.latitude}
                      longitude={riparatoreForm.longitude}
                      onLocationChange={(lat, lng) => setRiparatoreForm({ ...riparatoreForm, latitude: lat, longitude: lng })}
                      onGeolocate={requestLocation}
                      geoLoading={geoLoading}
                    />
                  </div>

                  <Button
                    className="w-full h-12 text-base font-semibold shadow-lg"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !riparatoreForm.full_name || !riparatoreForm.email || !riparatoreForm.phone || !riparatoreForm.address}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Invio in corso...
                      </>
                    ) : (
                      <>
                        Invia Candidatura
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            /* Centro Form */
            <motion.div
              key="centro-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-card/80 backdrop-blur border-border/50 shadow-xl">
                <CardHeader className="border-b border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-success/10">
                      <Building2 className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Dati del Centro</CardTitle>
                      <CardDescription>Inserisci le informazioni del tuo laboratorio</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="business_name" className="text-sm font-medium">Ragione Sociale *</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="business_name"
                          placeholder="Centro Riparazioni SRL"
                          className="pl-10 h-11"
                          value={centroForm.business_name}
                          onChange={(e) => setCentroForm({ ...centroForm, business_name: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vat_number" className="text-sm font-medium">Partita IVA</Label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="vat_number"
                          placeholder="IT12345678901"
                          className="pl-10 h-11"
                          value={centroForm.vat_number}
                          onChange={(e) => setCentroForm({ ...centroForm, vat_number: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="email@esempio.it"
                          className="pl-10 h-11"
                          value={centroForm.email}
                          onChange={(e) => setCentroForm({ ...centroForm, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium">Telefono *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          placeholder="+39 123 456 7890"
                          className="pl-10 h-11"
                          value={centroForm.phone}
                          onChange={(e) => setCentroForm({ ...centroForm, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address" className="text-sm font-medium">Indirizzo Sede *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="address"
                          placeholder="Via Roma 1, 20100 Milano MI"
                          className="pl-10 h-11"
                          value={centroForm.address}
                          onChange={(e) => setCentroForm({ ...centroForm, address: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Posizione sulla Mappa</Label>
                    <LocationPicker
                      latitude={centroForm.latitude}
                      longitude={centroForm.longitude}
                      onLocationChange={(lat, lng) => setCentroForm({ ...centroForm, latitude: lat, longitude: lng })}
                      onGeolocate={requestLocation}
                      geoLoading={geoLoading}
                    />
                  </div>

                  <Button
                    className="w-full h-12 text-base font-semibold shadow-lg"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !centroForm.business_name || !centroForm.email || !centroForm.phone || !centroForm.address}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Invio in corso...
                      </>
                    ) : (
                      <>
                        Invia Candidatura
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
