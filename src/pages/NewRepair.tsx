import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { PhotoUpload } from "@/components/repair/PhotoUpload";
import { DeviceInfoCard } from "@/components/repair/DeviceInfoCard";
import { CustomerSearch } from "@/components/repair/CustomerSearch";
import { CustomerFormStep } from "@/components/repair/CustomerFormStep";
import { DeviceFormStep } from "@/components/repair/DeviceFormStep";
import { NewRepairWizard } from "@/components/repair/NewRepairWizard";
import { PhotoEditor } from "@/components/repair/PhotoEditor";
import { Button } from "@/components/ui/button";

const NewRepair = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [detectedDevice, setDetectedDevice] = useState<any>(null);
  const [lookingUpDetails, setLookingUpDetails] = useState(false);
  const [existingCustomerId, setExistingCustomerId] = useState<string | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [annotatedPhotoBlob, setAnnotatedPhotoBlob] = useState<Blob | null>(null);

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

  const wizardSteps = [
    {
      title: "Cliente",
      description: "Cerca un cliente esistente o creane uno nuovo",
    },
    {
      title: "Foto Dispositivo",
      description: "Scatta una foto per il riconoscimento automatico",
    },
    {
      title: "Dettagli Dispositivo",
      description: "Verifica e completa le informazioni del dispositivo",
    },
    {
      title: "Riepilogo",
      description: "Controlla i dati prima di confermare",
    },
  ];

  const handlePhotoUpload = (file: File, preview: string) => {
    setPhotoFile(file);
    setPhotoPreview(preview);
    setAnnotatedPhotoBlob(null);
  };

  const handleOpenPhotoEditor = () => {
    if (!photoPreview) {
      toast.error("Carica prima una foto");
      return;
    }
    setShowPhotoEditor(true);
  };

  const handleSaveAnnotatedPhoto = (annotatedBlob: Blob) => {
    setAnnotatedPhotoBlob(annotatedBlob);
    setShowPhotoEditor(false);
    toast.success("Foto annotata salvata! Verrà utilizzata per la riparazione");
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

  const handleSelectCustomer = (customer: any) => {
    if (customer) {
      setExistingCustomerId(customer.id);
      setCustomerData({
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone,
        address: customer.address || "",
        notes: "",
      });
      setIsNewCustomer(false);
    }
  };

  const handleCreateNewCustomer = () => {
    setExistingCustomerId(null);
    setCustomerData({
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    });
    setIsNewCustomer(true);
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 0:
        return isNewCustomer ? Boolean(customerData.name && customerData.phone) : existingCustomerId !== null;
      case 1:
        return detectedDevice !== null;
      case 2:
        return Boolean(deviceData.device_type && deviceData.brand && deviceData.model && deviceData.reported_issue);
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canGoNext()) {
      setCurrentStep((prev) => Math.min(prev + 1, wizardSteps.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      let customerId = existingCustomerId;

      if (!existingCustomerId) {
        // First create customer account if email is provided
        if (customerData.email) {
          const { error: accountError } = await supabase.functions.invoke("create-customer-account", {
            body: {
              email: customerData.email,
              fullName: customerData.name,
              phone: customerData.phone,
            },
          });

          if (accountError) {
            console.error("Account creation error:", accountError);
            toast.error("Errore nella creazione dell'account: " + accountError.message);
          } else {
            toast.success("Account cliente creato con password: 12345678");
          }
        }

        // Then create customer record
        const { data: customer, error: customerError } = await supabase
          .from("customers")
          .insert(customerData)
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = customer.id;
      }

      // Upload photo if exists
      let photoUrl = "";
      if (annotatedPhotoBlob || photoFile) {
        const fileToUpload = annotatedPhotoBlob || photoFile!;
        const fileName = `${Date.now()}_${photoFile!.name}`;
        const { error: uploadError } = await supabase.storage
          .from("device-photos")
          .upload(fileName, fileToUpload);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("device-photos")
          .getPublicUrl(fileName);
        
        photoUrl = urlData.publicUrl;
      }

      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .insert({
          ...deviceData,
          customer_id: customerId,
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            {!isNewCustomer ? (
              <CustomerSearch
                onSelectCustomer={handleSelectCustomer}
                onCreateNew={handleCreateNewCustomer}
              />
            ) : (
              <CustomerFormStep
                customerData={customerData}
                onChange={setCustomerData}
              />
            )}
          </div>
        );
      
      case 1:
        return showPhotoEditor && photoPreview ? (
          <PhotoEditor
            imageUrl={photoPreview}
            onSave={handleSaveAnnotatedPhoto}
            onCancel={() => setShowPhotoEditor(false)}
          />
        ) : (
          <div className="space-y-4">
            {!detectedDevice ? (
              <>
                <PhotoUpload onPhotoUpload={handlePhotoUpload} />
                {photoPreview && (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      onClick={analyzeDeviceWithAI}
                      disabled={aiAnalyzing || lookingUpDetails}
                      className="w-full bg-gradient-primary"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {aiAnalyzing 
                        ? "Analisi foto in corso..." 
                        : lookingUpDetails 
                        ? "Recupero dettagli..." 
                        : "Riconosci con IA"}
                    </Button>
                    
                    <Button
                      type="button"
                      onClick={handleOpenPhotoEditor}
                      variant="outline"
                      className="w-full"
                    >
                      Annota Punti Intervento
                    </Button>
                    
                    {annotatedPhotoBlob && (
                      <p className="text-sm text-accent flex items-center gap-2">
                        <span className="h-2 w-2 bg-accent rounded-full" />
                        Foto annotata pronta per il salvataggio
                      </p>
                    )}
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
        );
      
      case 2:
        return (
          <DeviceFormStep
            deviceData={deviceData}
            onChange={setDeviceData}
          />
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Dati Cliente</h3>
              <CustomerFormStep
                customerData={customerData}
                onChange={setCustomerData}
                readOnly
              />
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Dati Dispositivo</h3>
              {detectedDevice && (
                <DeviceInfoCard
                  deviceInfo={detectedDevice}
                  onConfirm={() => {}}
                  onEdit={() => {}}
                />
              )}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-mesh">
      <div className="max-w-5xl mx-auto">
        <Card className="p-8 shadow-xl border-border/50 bg-card/95 backdrop-blur-sm">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent mb-3">
              Nuovo Ritiro Dispositivo
            </h1>
            <p className="text-muted-foreground text-lg">
              Segui i passaggi per registrare un nuovo dispositivo in modo rapido e semplice
            </p>
          </div>

          <NewRepairWizard
            currentStep={currentStep}
            totalSteps={wizardSteps.length}
            steps={wizardSteps}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSubmit={handleSubmit}
            canGoNext={canGoNext()}
            loading={loading}
          >
            {renderStepContent()}
          </NewRepairWizard>
        </Card>
      </div>
    </div>
  );
};

export default NewRepair;
