import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation } from "@/hooks/useGeolocation";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Locate,
  Loader2
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
  const { user } = useAuth();
  const { latitude, longitude, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();
  const [selectedType, setSelectedType] = useState<ProviderType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [cornerForm, setCornerForm] = useState<CornerForm>({
    business_name: "",
    address: "",
    phone: "",
    email: user?.email || "",
    latitude: null,
    longitude: null,
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

  // Update forms when geolocation is retrieved
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
        });
        if (error) throw error;
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
        });
        if (error) throw error;
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
        });
        if (error) throw error;
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
      description: "Negozio di telefonia che segnala riparazioni",
      icon: Store,
      color: "text-primary",
      bgColor: "bg-primary/10",
      commission: "10% sul margine",
    },
    {
      type: "riparatore" as const,
      title: "Riparatore",
      description: "Tecnico indipendente per riparazioni",
      icon: Wrench,
      color: "text-info",
      bgColor: "bg-info/10",
      commission: "60% sul margine",
    },
    {
      type: "centro" as const,
      title: "Centro Assistenza",
      description: "Centro con sede fisica e team",
      icon: Building2,
      color: "text-success",
      bgColor: "bg-success/10",
      commission: "Fino al 70% sul margine",
    },
  ];

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Registrazione Inviata!</h1>
          <p className="text-muted-foreground mb-6">
            La tua richiesta è stata inviata con successo. Riceverai una notifica quando sarà approvata dal nostro team.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            Torna alla Home
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectedType ? setSelectedType(null) : navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {selectedType ? "Indietro" : "Home"}
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold">Diventa Partner</h1>
          <p className="text-muted-foreground">
            Scegli il tipo di attività e inizia a guadagnare con le riparazioni
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!selectedType ? (
            /* Type Selection */
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid md:grid-cols-3 gap-4"
            >
              {providerTypes.map((provider) => (
                <Card
                  key={provider.type}
                  className="cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg bg-card/50 backdrop-blur border-border/50"
                  onClick={() => setSelectedType(provider.type)}
                >
                  <CardHeader className="text-center pb-2">
                    <div className={`w-16 h-16 rounded-2xl ${provider.bgColor} flex items-center justify-center mx-auto mb-4`}>
                      <provider.icon className={`h-8 w-8 ${provider.color}`} />
                    </div>
                    <CardTitle className="text-xl">{provider.title}</CardTitle>
                    <CardDescription>{provider.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="inline-block px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium">
                      {provider.commission}
                    </div>
                  </CardContent>
                </Card>
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
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Registrazione Corner</CardTitle>
                      <CardDescription>Inserisci i dati del tuo negozio</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="business_name">Nome Negozio *</Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="business_name"
                          placeholder="Es. TechStore Milano"
                          className="pl-10"
                          value={cornerForm.business_name}
                          onChange={(e) => setCornerForm({ ...cornerForm, business_name: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="email@esempio.it"
                          className="pl-10"
                          value={cornerForm.email}
                          onChange={(e) => setCornerForm({ ...cornerForm, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefono *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          placeholder="+39 123 456 7890"
                          className="pl-10"
                          value={cornerForm.phone}
                          onChange={(e) => setCornerForm({ ...cornerForm, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Indirizzo *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="address"
                          placeholder="Via Roma 1, Milano"
                          className="pl-10"
                          value={cornerForm.address}
                          onChange={(e) => setCornerForm({ ...cornerForm, address: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Location Picker Map */}
                  <div className="space-y-2">
                    <Label>Posizione sulla Mappa</Label>
                    <LocationPicker
                      latitude={cornerForm.latitude}
                      longitude={cornerForm.longitude}
                      onLocationChange={(lat, lng) => setCornerForm({ ...cornerForm, latitude: lat, longitude: lng })}
                      onGeolocate={requestLocation}
                      geoLoading={geoLoading}
                    />
                  </div>

                  <Button
                    className="w-full mt-6"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !cornerForm.business_name || !cornerForm.email || !cornerForm.phone || !cornerForm.address}
                  >
                    {isSubmitting ? "Invio in corso..." : "Invia Richiesta"}
                    <ArrowRight className="h-4 w-4 ml-2" />
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
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                      <Wrench className="h-6 w-6 text-info" />
                    </div>
                    <div>
                      <CardTitle>Registrazione Riparatore</CardTitle>
                      <CardDescription>Inserisci i tuoi dati professionali</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome Completo *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="full_name"
                          placeholder="Mario Rossi"
                          className="pl-10"
                          value={riparatoreForm.full_name}
                          onChange={(e) => setRiparatoreForm({ ...riparatoreForm, full_name: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="email@esempio.it"
                          className="pl-10"
                          value={riparatoreForm.email}
                          onChange={(e) => setRiparatoreForm({ ...riparatoreForm, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefono *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          placeholder="+39 123 456 7890"
                          className="pl-10"
                          value={riparatoreForm.phone}
                          onChange={(e) => setRiparatoreForm({ ...riparatoreForm, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Indirizzo Base</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="address"
                          placeholder="Via Roma 1, Milano"
                          className="pl-10"
                          value={riparatoreForm.address}
                          onChange={(e) => setRiparatoreForm({ ...riparatoreForm, address: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="radius">Raggio Operativo (km)</Label>
                      <Input
                        id="radius"
                        type="number"
                        min={1}
                        max={100}
                        value={riparatoreForm.service_radius_km}
                        onChange={(e) => setRiparatoreForm({ ...riparatoreForm, service_radius_km: parseInt(e.target.value) || 15 })}
                      />
                    </div>
                    <div className="space-y-2 flex items-center gap-2 pt-6">
                      <Checkbox
                        id="is_mobile"
                        checked={riparatoreForm.is_mobile}
                        onCheckedChange={(checked) => setRiparatoreForm({ ...riparatoreForm, is_mobile: checked as boolean })}
                      />
                      <Label htmlFor="is_mobile" className="cursor-pointer">
                        Offro servizio a domicilio
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Specializzazioni</Label>
                    <div className="flex flex-wrap gap-2">
                      {specializations.map((spec) => (
                        <Button
                          key={spec}
                          type="button"
                          variant={riparatoreForm.specializations.includes(spec) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const newSpecs = riparatoreForm.specializations.includes(spec)
                              ? riparatoreForm.specializations.filter(s => s !== spec)
                              : [...riparatoreForm.specializations, spec];
                            setRiparatoreForm({ ...riparatoreForm, specializations: newSpecs });
                          }}
                        >
                          {spec}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Location Picker Map */}
                  <div className="space-y-2">
                    <Label>Posizione sulla Mappa</Label>
                    <LocationPicker
                      latitude={riparatoreForm.latitude}
                      longitude={riparatoreForm.longitude}
                      onLocationChange={(lat, lng) => setRiparatoreForm({ ...riparatoreForm, latitude: lat, longitude: lng })}
                      onGeolocate={requestLocation}
                      geoLoading={geoLoading}
                    />
                  </div>

                  <Button
                    className="w-full mt-6"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !riparatoreForm.full_name || !riparatoreForm.email || !riparatoreForm.phone}
                  >
                    {isSubmitting ? "Invio in corso..." : "Invia Richiesta"}
                    <ArrowRight className="h-4 w-4 ml-2" />
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
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <CardTitle>Registrazione Centro Assistenza</CardTitle>
                      <CardDescription>Inserisci i dati della tua attività</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="business_name">Nome Attività *</Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="business_name"
                          placeholder="TechRepair Srl"
                          className="pl-10"
                          value={centroForm.business_name}
                          onChange={(e) => setCentroForm({ ...centroForm, business_name: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vat_number">Partita IVA</Label>
                      <Input
                        id="vat_number"
                        placeholder="IT12345678901"
                        value={centroForm.vat_number}
                        onChange={(e) => setCentroForm({ ...centroForm, vat_number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="info@centro.it"
                          className="pl-10"
                          value={centroForm.email}
                          onChange={(e) => setCentroForm({ ...centroForm, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefono *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          placeholder="+39 02 1234567"
                          className="pl-10"
                          value={centroForm.phone}
                          onChange={(e) => setCentroForm({ ...centroForm, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Indirizzo Sede *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="address"
                          placeholder="Via Roma 1, 20100 Milano MI"
                          className="pl-10"
                          value={centroForm.address}
                          onChange={(e) => setCentroForm({ ...centroForm, address: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Location Picker Map */}
                  <div className="space-y-2">
                    <Label>Posizione sulla Mappa</Label>
                    <LocationPicker
                      latitude={centroForm.latitude}
                      longitude={centroForm.longitude}
                      onLocationChange={(lat, lng) => setCentroForm({ ...centroForm, latitude: lat, longitude: lng })}
                      onGeolocate={requestLocation}
                      geoLoading={geoLoading}
                    />
                  </div>

                  <Button
                    className="w-full mt-6"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !centroForm.business_name || !centroForm.email || !centroForm.phone || !centroForm.address}
                  >
                    {isSubmitting ? "Invio in corso..." : "Invia Richiesta"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
