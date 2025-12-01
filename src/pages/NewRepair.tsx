import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Camera, Sparkles } from "lucide-react";
import { PhotoUpload } from "@/components/repair/PhotoUpload";
import { DeviceInfoCard } from "@/components/repair/DeviceInfoCard";

const NewRepair = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [detectedDevice, setDetectedDevice] = useState<any>(null);
  const [lookingUpDetails, setLookingUpDetails] = useState(false);

  const [customerData, setCustomerData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  const [deviceData, setDeviceData] = useState({
    device_type: "",
    brand: "",
    model: "",
    serial_number: "",
    imei: "",
    password: "",
    reported_issue: "",
    initial_condition: "",
  });

  const handlePhotoUpload = (file: File, preview: string) => {
    setPhotoFile(file);
    setPhotoPreview(preview);
  };

  const analyzeDeviceWithAI = async () => {
    if (!photoFile) {
      toast.error("Carica prima una foto del dispositivo");
      return;
    }

    setAiAnalyzing(true);
    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(photoFile);
      
      reader.onload = async () => {
        const base64Image = reader.result as string;
        
        // Step 1: Analyze device from photo
        const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke("analyze-device", {
          body: { image: base64Image },
        });

        if (analyzeError) throw analyzeError;

        if (analyzeData?.device_info) {
          const deviceInfo = analyzeData.device_info;
          
          // Update form with basic info
          setDeviceData((prev) => ({
            ...prev,
            device_type: deviceInfo.type || prev.device_type,
            brand: deviceInfo.brand || prev.brand,
            model: deviceInfo.model || prev.model,
            imei: deviceInfo.imei || prev.imei,
            serial_number: deviceInfo.serial || prev.serial_number,
          }));

          toast.success("Dispositivo riconosciuto! Recupero dettagli...");

          // Step 2: Lookup detailed information
          if (deviceInfo.brand && deviceInfo.model && deviceInfo.brand !== "unknown" && deviceInfo.model !== "unknown") {
            setLookingUpDetails(true);
            try {
              const { data: lookupData, error: lookupError } = await supabase.functions.invoke("lookup-device", {
                body: { 
                  brand: deviceInfo.brand, 
                  model: deviceInfo.model 
                },
              });

              if (!lookupError && lookupData?.device_info) {
                // Combine all information
                setDetectedDevice({
                  ...deviceInfo,
                  ...lookupData.device_info,
                });
                toast.success("Dettagli dispositivo recuperati!");
              } else {
                // Just show basic info if lookup fails
                setDetectedDevice(deviceInfo);
              }
            } catch (lookupErr) {
              console.error("Lookup error:", lookupErr);
              // Show basic info even if lookup fails
              setDetectedDevice(deviceInfo);
            } finally {
              setLookingUpDetails(false);
            }
          } else {
            // Show basic info if brand/model unknown
            setDetectedDevice(deviceInfo);
          }
        }
      };
    } catch (error: any) {
      console.error("AI Analysis error:", error);
      toast.error("Errore nell'analisi IA: " + (error.message || "Riprova"));
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleDeviceConfirm = (updatedInfo: any) => {
    // Update form data with confirmed info
    setDeviceData((prev) => ({
      ...prev,
      imei: updatedInfo.imei || prev.imei,
      serial_number: updatedInfo.serial || prev.serial_number,
    }));
    toast.success("Informazioni dispositivo confermate!");
  };

  const handleDeviceEdit = () => {
    setDetectedDevice(null);
    setPhotoFile(null);
    setPhotoPreview("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create customer
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert(customerData)
        .select()
        .single();

      if (customerError) throw customerError;

      // Upload photo if exists
      let photoUrl = "";
      if (photoFile) {
        const fileName = `${Date.now()}_${photoFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("device-photos")
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("device-photos")
          .getPublicUrl(fileName);
        
        photoUrl = urlData.publicUrl;
      }

      // Create device
      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .insert({
          ...deviceData,
          customer_id: customer.id,
          photo_url: photoUrl,
        })
        .select()
        .single();

      if (deviceError) throw deviceError;

      // Create repair entry
      const { error: repairError } = await supabase
        .from("repairs")
        .insert({
          device_id: device.id,
          status: "pending",
          priority: "normal",
        });

      if (repairError) throw repairError;

      toast.success("Dispositivo registrato con successo!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Errore durante la registrazione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Nuovo Ritiro Dispositivo
            </h1>
            <p className="text-muted-foreground">
              Registra un nuovo dispositivo per la riparazione
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Photo Upload Section */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Foto Dispositivo</Label>
              
              {!detectedDevice ? (
                <>
                  <PhotoUpload onPhotoUpload={handlePhotoUpload} />
                  
                  {photoPreview && (
                    <div className="mt-4">
                      <Button
                        type="button"
                        onClick={analyzeDeviceWithAI}
                        disabled={aiAnalyzing || lookingUpDetails}
                        className="bg-gradient-primary"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {aiAnalyzing 
                          ? "Analisi foto in corso..." 
                          : lookingUpDetails 
                          ? "Recupero dettagli..." 
                          : "Riconosci con IA"}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <DeviceInfoCard
                  deviceInfo={detectedDevice}
                  onConfirm={handleDeviceConfirm}
                  onEdit={handleDeviceEdit}
                />
              )}
            </div>

            {/* Customer Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Dati Cliente</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-name">Nome *</Label>
                  <Input
                    id="customer-name"
                    required
                    value={customerData.name}
                    onChange={(e) =>
                      setCustomerData({ ...customerData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-phone">Telefono *</Label>
                  <Input
                    id="customer-phone"
                    type="tel"
                    required
                    value={customerData.phone}
                    onChange={(e) =>
                      setCustomerData({ ...customerData, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-email">Email</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    value={customerData.email}
                    onChange={(e) =>
                      setCustomerData({ ...customerData, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-address">Indirizzo</Label>
                  <Input
                    id="customer-address"
                    value={customerData.address}
                    onChange={(e) =>
                      setCustomerData({ ...customerData, address: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Device Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Dati Dispositivo</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="device-type">Tipo Dispositivo *</Label>
                  <Select
                    value={deviceData.device_type}
                    onValueChange={(value) =>
                      setDeviceData({ ...deviceData, device_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smartphone">Smartphone</SelectItem>
                      <SelectItem value="tablet">Tablet</SelectItem>
                      <SelectItem value="pc">PC</SelectItem>
                      <SelectItem value="laptop">Laptop</SelectItem>
                      <SelectItem value="other">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device-brand">Marca *</Label>
                  <Input
                    id="device-brand"
                    required
                    value={deviceData.brand}
                    onChange={(e) =>
                      setDeviceData({ ...deviceData, brand: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device-model">Modello *</Label>
                  <Input
                    id="device-model"
                    required
                    value={deviceData.model}
                    onChange={(e) =>
                      setDeviceData({ ...deviceData, model: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device-serial">Numero Seriale</Label>
                  <Input
                    id="device-serial"
                    value={deviceData.serial_number}
                    onChange={(e) =>
                      setDeviceData({ ...deviceData, serial_number: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device-imei">IMEI</Label>
                  <Input
                    id="device-imei"
                    value={deviceData.imei}
                    onChange={(e) =>
                      setDeviceData({ ...deviceData, imei: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device-password">Password/PIN</Label>
                  <Input
                    id="device-password"
                    type="password"
                    value={deviceData.password}
                    onChange={(e) =>
                      setDeviceData({ ...deviceData, password: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reported-issue">Problema Segnalato *</Label>
                <Textarea
                  id="reported-issue"
                  required
                  rows={3}
                  value={deviceData.reported_issue}
                  onChange={(e) =>
                    setDeviceData({ ...deviceData, reported_issue: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initial-condition">Condizioni Iniziali</Label>
                <Textarea
                  id="initial-condition"
                  rows={2}
                  value={deviceData.initial_condition}
                  onChange={(e) =>
                    setDeviceData({ ...deviceData, initial_condition: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-primary-hover"
              >
                {loading ? "Salvataggio..." : "Registra Dispositivo"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
              >
                Annulla
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default NewRepair;
