import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CornerLayout } from "@/layouts/CornerLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, AlertTriangle, Smartphone, ArrowLeft, Building2, Check, Loader2, Euro, Info } from "lucide-react";
import { PhotoUpload } from "@/components/repair/PhotoUpload";
import { DeviceInfoCard } from "@/components/repair/DeviceInfoCard";
import { CustomerFormStep } from "@/components/repair/CustomerFormStep";
import { DeviceFormStep } from "@/components/repair/DeviceFormStep";
import { NewRepairWizard } from "@/components/repair/NewRepairWizard";
import { PhotoEditor } from "@/components/repair/PhotoEditor";
import { Button } from "@/components/ui/button";
import { getBrandSuggestions, getModelSuggestions } from "@/data/commonDevices";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { sendPushNotification, getCentroUserId } from "@/services/pushNotificationService";

interface Centro {
  id: string;
  business_name: string;
  address: string;
  phone: string;
}

const GESTIONE_FEE_AMOUNT = 15;

export default function CornerNuovaSegnalazione() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cornerId, setCornerId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [detectedDevice, setDetectedDevice] = useState<any>(null);
  const [lookingUpDetails, setLookingUpDetails] = useState(false);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [annotatedPhotoBlob, setAnnotatedPhotoBlob] = useState<Blob | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualBrand, setManualBrand] = useState("");
  const [manualModel, setManualModel] = useState("");
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  
  // Centro selection
  const [centri, setCentri] = useState<Centro[]>([]);
  const [selectedCentroId, setSelectedCentroId] = useState<string | null>(null);
  const [loadingCentri, setLoadingCentri] = useState(false);

  // Gestione fee
  const [gestioneFeeEnabled, setGestioneFeeEnabled] = useState(true);
  const [cornerCommissionRate, setCornerCommissionRate] = useState(10);
  const [directToCentroMultiplier, setDirectToCentroMultiplier] = useState(50); // percentage of commission for direct to centro
  
  // Direct to Centro (customer goes directly, reduced commission)
  const [directToCentro, setDirectToCentro] = useState(false);

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

  // Calculate corner earnings from gestione fee (reduced commission if direct to centro)
  const effectiveCommissionRate = directToCentro ? (cornerCommissionRate * directToCentroMultiplier / 100) : cornerCommissionRate;
  const cornerGestioneEarnings = gestioneFeeEnabled 
    ? (GESTIONE_FEE_AMOUNT * effectiveCommissionRate / 100)
    : 0;

  // Fetch corner, centri and commission rate on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      // Fetch corner
      const { data: cornerData } = await supabase
        .from("corners")
        .select("id, payment_status, commission_rate, direct_to_centro_multiplier")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (cornerData) {
        setCornerId(cornerData.id);
        setPaymentStatus(cornerData.payment_status);
        // Use corner's individual commission rate if set, otherwise use default
        if (cornerData.commission_rate) {
          setCornerCommissionRate(cornerData.commission_rate);
        }
        // Use corner's individual direct multiplier if set
        if (cornerData.direct_to_centro_multiplier != null) {
          setDirectToCentroMultiplier(cornerData.direct_to_centro_multiplier);
        }
      }
      
      // Fetch platform default corner commission rate as fallback
      const { data: settingsData } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "corner_commission_rate")
        .maybeSingle();
      
      if (settingsData && !cornerData?.commission_rate) {
        setCornerCommissionRate(settingsData.value);
      }
      
      // Fetch approved centri
      setLoadingCentri(true);
      const { data: centriData } = await supabase
        .from("centri_assistenza")
        .select("id, business_name, address, phone")
        .eq("status", "approved")
        .order("business_name");
      
      setCentri(centriData || []);
      setLoadingCentri(false);
    };
    
    fetchData();
  }, [user]);

  // Corners don't have credit restrictions - they only receive commissions

  const wizardSteps = [
    { title: "Cliente", description: "Inserisci i dati del cliente" },
    { title: "Foto Dispositivo", description: "Scatta una foto per il riconoscimento automatico" },
    { title: "Dettagli Dispositivo", description: "Verifica e completa le informazioni del dispositivo" },
    { title: "Assegna Centro", description: "Scegli il Centro Assistenza a cui assegnare la riparazione" },
    { title: "Riepilogo", description: "Controlla i dati prima di inviare" },
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
    toast.success("Foto annotata salvata!");
  };

  const analyzeDeviceWithAI = async () => {
    if (!photoFile) {
      toast.error("Carica prima una foto del dispositivo");
      return;
    }

    setAiAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(photoFile);
      
      reader.onload = async () => {
        const base64Image = reader.result as string;
        
        const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke("analyze-device", {
          body: { image: base64Image },
        });

        if (analyzeError) throw analyzeError;

        if (analyzeData?.device_info) {
          const deviceInfo = analyzeData.device_info;
          
          setDeviceData((prev) => ({
            ...prev,
            device_type: deviceInfo.type || prev.device_type,
            brand: deviceInfo.brand || prev.brand,
            model: deviceInfo.model || prev.model,
            imei: deviceInfo.imei || prev.imei,
            serial_number: deviceInfo.serial || prev.serial_number,
          }));

          toast.success("Dispositivo riconosciuto!");

          if (deviceInfo.brand && deviceInfo.model && deviceInfo.brand !== "unknown" && deviceInfo.model !== "unknown") {
            setLookingUpDetails(true);
            try {
              const { data: lookupData, error: lookupError } = await supabase.functions.invoke("lookup-device", {
                body: { brand: deviceInfo.brand, model: deviceInfo.model },
              });

              if (!lookupError && lookupData?.device_info) {
                setDetectedDevice({ ...deviceInfo, ...lookupData.device_info });
              } else {
                setDetectedDevice(deviceInfo);
              }
            } catch (lookupErr) {
              setDetectedDevice(deviceInfo);
            } finally {
              setLookingUpDetails(false);
            }
          } else {
            setDetectedDevice(deviceInfo);
          }
        }
      };
    } catch (error: any) {
      console.error("AI Analysis error:", error);
      toast.error("Errore nell'analisi IA");
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleDeviceConfirm = (updatedInfo: any) => {
    setDeviceData((prev) => ({
      ...prev,
      imei: updatedInfo.imei || prev.imei,
      serial_number: updatedInfo.serial || prev.serial_number,
    }));
  };

  const handleDeviceEdit = () => {
    setDetectedDevice(null);
    setPhotoFile(null);
    setPhotoPreview("");
    setShowManualEntry(false);
    setManualBrand("");
    setManualModel("");
  };

  const handleBrandChange = (value: string) => {
    setManualBrand(value);
    const suggestions = getBrandSuggestions(value);
    setBrandSuggestions(suggestions);
    setShowBrandSuggestions(suggestions.length > 0);
    setManualModel("");
    setModelSuggestions([]);
  };

  const handleModelChange = (value: string) => {
    setManualModel(value);
    if (manualBrand) {
      const suggestions = getModelSuggestions(manualBrand, value);
      setModelSuggestions(suggestions);
      setShowModelSuggestions(suggestions.length > 0);
    }
  };

  const selectBrand = (brand: string) => {
    setManualBrand(brand);
    setShowBrandSuggestions(false);
    const suggestions = getModelSuggestions(brand, "");
    setModelSuggestions(suggestions);
  };

  const selectModel = (model: string) => {
    setManualModel(model);
    setShowModelSuggestions(false);
  };

  const handleManualLookup = async () => {
    if (!manualBrand.trim() || !manualModel.trim()) {
      toast.error("Inserisci marca e modello");
      return;
    }

    const inferDeviceType = (brand: string, model: string): string => {
      const modelLower = model.toLowerCase();
      if (modelLower.includes('ipad') || modelLower.includes('tab') || modelLower.includes('tablet')) return 'tablet';
      if (modelLower.includes('macbook') || modelLower.includes('laptop') || modelLower.includes('notebook')) return 'laptop';
      if (modelLower.includes('watch') || modelLower.includes('band') || modelLower.includes('fit')) return 'smartwatch';
      return 'smartphone';
    };

    const inferredType = inferDeviceType(manualBrand.trim(), manualModel.trim());

    setLookingUpDetails(true);
    try {
      const { data: lookupData } = await supabase.functions.invoke("lookup-device", {
        body: { brand: manualBrand.trim(), model: manualModel.trim() },
      });

      const deviceInfo = {
        type: inferredType,
        brand: manualBrand.trim(),
        model: manualModel.trim(),
        ...(lookupData?.device_info || {}),
      };
      
      setDetectedDevice(deviceInfo);
      setDeviceData((prev) => ({
        ...prev,
        device_type: inferredType,
        brand: manualBrand.trim(),
        model: manualModel.trim(),
      }));
      
      setShowManualEntry(false);
      setCurrentStep(2);
    } catch (error: any) {
      const deviceInfo = {
        type: inferDeviceType(manualBrand.trim(), manualModel.trim()),
        brand: manualBrand.trim(),
        model: manualModel.trim(),
      };
      setDetectedDevice(deviceInfo);
      setDeviceData((prev) => ({
        ...prev,
        device_type: deviceInfo.type,
        brand: manualBrand.trim(),
        model: manualModel.trim(),
      }));
      setShowManualEntry(false);
      setCurrentStep(2);
    } finally {
      setLookingUpDetails(false);
    }
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 0: return Boolean(customerData.name && customerData.phone);
      case 1: return true;
      case 2: return Boolean(deviceData.device_type && deviceData.brand && deviceData.model && deviceData.reported_issue);
      case 3: return selectedCentroId !== null;
      case 4: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (canGoNext()) {
      if (currentStep === 1 && !photoFile && !detectedDevice) {
        setShowManualEntry(true);
        return;
      }
      setCurrentStep((prev) => Math.min(prev + 1, wizardSteps.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!cornerId || !selectedCentroId) {
      toast.error("Dati mancanti");
      return;
    }

    setLoading(true);

    try {
      // Create or find customer by phone OR email
      let customerId: string;
      let existingCustomer = null;
      
      // First try to find by phone
      const { data: customerByPhone } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", customerData.phone)
        .maybeSingle();

      if (customerByPhone) {
        existingCustomer = customerByPhone;
      } else if (customerData.email) {
        // If not found by phone, try by email
        const { data: customerByEmail } = await supabase
          .from("customers")
          .select("id")
          .eq("email", customerData.email)
          .maybeSingle();
        
        if (customerByEmail) {
          existingCustomer = customerByEmail;
        }
      }

      if (existingCustomer) {
        customerId = existingCustomer.id;
        
        // Update customer info if needed
        await supabase
          .from("customers")
          .update({
            name: customerData.name,
            phone: customerData.phone,
            email: customerData.email || null,
            address: customerData.address || null,
          })
          .eq("id", existingCustomer.id);
      } else {
        // Create customer account if email is provided
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
            // Continue anyway - customer record will still be created
          }
        }

        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            name: customerData.name,
            phone: customerData.phone,
            email: customerData.email || null,
            address: customerData.address || null,
          })
          .select("id")
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // Upload photo if exists
      let photos: string[] = [];
      if (annotatedPhotoBlob || photoFile) {
        const fileToUpload = annotatedPhotoBlob || photoFile!;
        const fileName = `${Date.now()}_corner_${photoFile!.name}`;
        const { error: uploadError } = await supabase.storage
          .from("device-photos")
          .upload(fileName, fileToUpload);

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("device-photos").getPublicUrl(fileName);
          photos = [urlData.publicUrl];
        }
      }

      // Create repair request with assigned Centro and gestione fee info
      const { error: requestError } = await supabase.from("repair_requests").insert({
        corner_id: cornerId,
        customer_id: customerId,
        device_type: deviceData.device_type,
        device_brand: deviceData.brand || null,
        device_model: deviceData.model || null,
        issue_description: deviceData.reported_issue,
        service_type: "corner",
        status: "assigned",
        assigned_provider_id: selectedCentroId,
        assigned_provider_type: "centro",
        assigned_at: new Date().toISOString(),
        photos: photos,
        corner_gestione_fee: GESTIONE_FEE_AMOUNT,
        corner_gestione_fee_enabled: gestioneFeeEnabled,
        corner_gestione_fee_collected: gestioneFeeEnabled,
        corner_gestione_fee_collected_at: gestioneFeeEnabled ? new Date().toISOString() : null,
        corner_direct_to_centro: directToCentro,
      });

      if (requestError) throw requestError;

      // Send push notification directly to Centro owner
      if (selectedCentroId) {
        const centroUserId = await getCentroUserId(selectedCentroId);
        if (centroUserId) {
          const deviceName = `${deviceData.brand || ''} ${deviceData.model || deviceData.device_type}`.trim();
          const cornerName = await supabase
            .from("corners")
            .select("business_name")
            .eq("id", cornerId)
            .single()
            .then(res => res.data?.business_name || "Corner");
          
          await sendPushNotification([centroUserId], {
            title: "🔔 Nuovo Lavoro da Corner!",
            body: `${cornerName} ti ha assegnato: ${deviceName} - ${deviceData.reported_issue.substring(0, 50)}...`,
            data: { url: "/centro/lavori-corner" },
          });
          console.log("[CornerNuovaSegnalazione] Push notification sent to Centro:", centroUserId);
        }
      }

      toast.success("Segnalazione inviata al Centro con successo!");
      navigate("/corner");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Errore durante l'invio");
    } finally {
      setLoading(false);
    }
  };

  const selectedCentro = centri.find(c => c.id === selectedCentroId);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <CustomerFormStep customerData={customerData} onChange={setCustomerData} />
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
          <div className="space-y-3">
            {!detectedDevice ? (
              <>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    📷 Foto opzionale. Scatta per riconoscimento IA o inserisci manualmente.
                  </p>
                </div>
                
                <PhotoUpload onPhotoUpload={handlePhotoUpload} />
                
                {photoPreview && !showManualEntry && (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      onClick={analyzeDeviceWithAI}
                      disabled={aiAnalyzing || lookingUpDetails}
                      className="w-full h-10 bg-primary hover:bg-primary/90"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {aiAnalyzing ? "Analisi..." : lookingUpDetails ? "Recupero dettagli..." : "Riconosci con IA"}
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" onClick={handleOpenPhotoEditor} variant="outline" size="sm" className="h-9 text-xs">
                        ✏️ Annota
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setShowManualEntry(true)}
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs"
                      >
                        📝 Manuale
                      </Button>
                    </div>
                  </div>
                )}
                
                {!photoPreview && !showManualEntry && (
                  <Button type="button" onClick={() => setShowManualEntry(true)} variant="outline" className="w-full h-10">
                    <Smartphone className="mr-2 h-4 w-4" />
                    Inserisci Manualmente
                  </Button>
                )}
                
                {showManualEntry && (
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                    <h3 className="font-medium text-sm">Inserimento Manuale</h3>
                    <div className="space-y-3 relative">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Marca (es. Apple, Samsung)"
                          value={manualBrand}
                          onChange={(e) => handleBrandChange(e.target.value)}
                          onFocus={() => manualBrand && setShowBrandSuggestions(brandSuggestions.length > 0)}
                          className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                        />
                        {showBrandSuggestions && brandSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {brandSuggestions.map((brand) => (
                              <button
                                key={brand}
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                                onClick={() => selectBrand(brand)}
                              >
                                {brand}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Modello (es. iPhone 14 Pro)"
                          value={manualModel}
                          onChange={(e) => handleModelChange(e.target.value)}
                          onFocus={() => manualModel && setShowModelSuggestions(modelSuggestions.length > 0)}
                          className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                        />
                        {showModelSuggestions && modelSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {modelSuggestions.map((model) => (
                              <button
                                key={model}
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                                onClick={() => selectModel(model)}
                              >
                                {model}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" onClick={() => setShowManualEntry(false)} variant="outline" size="sm" className="flex-1">
                        Annulla
                      </Button>
                      <Button
                        type="button"
                        onClick={handleManualLookup}
                        disabled={lookingUpDetails || !manualBrand.trim() || !manualModel.trim()}
                        size="sm"
                        className="flex-1"
                      >
                        {lookingUpDetails ? "Ricerca..." : "Cerca"}
                      </Button>
                    </div>
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
        return <DeviceFormStep deviceData={deviceData} onChange={setDeviceData} detectedDevice={detectedDevice} />;

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">Seleziona il Centro Assistenza</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Scegli a quale Centro inviare questa riparazione
              </p>
            </div>
            
            {loadingCentri ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : centri.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nessun Centro Assistenza disponibile</p>
              </div>
            ) : (
              <RadioGroup
                value={selectedCentroId || ""}
                onValueChange={setSelectedCentroId}
                className="space-y-3"
              >
                {centri.map((centro) => (
                  <div
                    key={centro.id}
                    className={`relative flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedCentroId === centro.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedCentroId(centro.id)}
                  >
                    <RadioGroupItem value={centro.id} id={centro.id} className="mt-1" />
                    <Label htmlFor={centro.id} className="flex-1 cursor-pointer">
                      <div className="font-semibold">{centro.business_name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {centro.address}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        📞 {centro.phone}
                      </div>
                    </Label>
                    {selectedCentroId === centro.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            {/* Direct to Centro Option */}
            <Card className="p-4 space-y-3 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Cliente Diretto al Centro</h4>
                    <p className="text-xs text-muted-foreground">Il cliente consegnerà il dispositivo direttamente</p>
                  </div>
                </div>
                <Switch
                  checked={directToCentro}
                  onCheckedChange={setDirectToCentro}
                />
              </div>
              
              {directToCentro && (
                <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded-lg">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    La tua commissione sarà ridotta al {directToCentroMultiplier}% ({cornerCommissionRate}% → {effectiveCommissionRate.toFixed(1)}%) perché il cliente va direttamente in laboratorio.
                  </p>
                </div>
              )}
            </Card>

            {/* Gestione Fee Card */}
            <Card className="p-4 space-y-4 bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                    <Euro className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Gestione Segnalazione</h4>
                    <p className="text-xs text-muted-foreground">Fee incassata dal cliente</p>
                  </div>
                </div>
                <Switch
                  checked={gestioneFeeEnabled}
                  onCheckedChange={setGestioneFeeEnabled}
                />
              </div>
              
              {gestioneFeeEnabled && (
                <div className="pt-3 border-t border-emerald-500/20 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Importo incassato</span>
                    <span className="font-bold text-lg">€{GESTIONE_FEE_AMOUNT.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      Tua commissione ({effectiveCommissionRate.toFixed(1)}%)
                      {directToCentro && <span className="text-xs ml-1">(ridotta al {directToCentroMultiplier}%)</span>}
                    </span>
                    <Badge className="bg-emerald-500 text-white">
                      €{cornerGestioneEarnings.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex items-start gap-2 mt-2 p-2 bg-emerald-500/10 rounded-lg">
                    <Info className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Il cliente paga €{GESTIONE_FEE_AMOUNT} come fee di gestione. Tu guadagni €{cornerGestioneEarnings.toFixed(2)}.
                      {directToCentro && " Riceverai il pagamento dopo che il cliente avrà pagato il Centro."}
                    </p>
                  </div>
                </div>
              )}
              
              {!gestioneFeeEnabled && (
                <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Nessuna fee di gestione verrà incassata per questa segnalazione.
                  </p>
                </div>
              )}
            </Card>

            <Card className="p-4 space-y-3">
              <h4 className="font-semibold">👤 Cliente</h4>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p><strong className="text-foreground">Nome:</strong> {customerData.name}</p>
                <p><strong className="text-foreground">Telefono:</strong> {customerData.phone}</p>
                {customerData.email && <p><strong className="text-foreground">Email:</strong> {customerData.email}</p>}
              </div>
            </Card>
            
            <Card className="p-4 space-y-3">
              <h4 className="font-semibold">📱 Dispositivo</h4>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p><strong className="text-foreground">Tipo:</strong> {deviceData.device_type}</p>
                <p><strong className="text-foreground">Marca:</strong> {deviceData.brand}</p>
                <p><strong className="text-foreground">Modello:</strong> {deviceData.model}</p>
                <p><strong className="text-foreground">Problema:</strong> {deviceData.reported_issue}</p>
              </div>
            </Card>
            
            {selectedCentro && (
              <Card className="p-4 space-y-3 bg-primary/5 border-primary/20">
                <h4 className="font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Centro Assegnato
                </h4>
                <div className="text-sm space-y-1">
                  <p className="font-medium">{selectedCentro.business_name}</p>
                  <p className="text-muted-foreground">{selectedCentro.address}</p>
                  <p className="text-muted-foreground">📞 {selectedCentro.phone}</p>
                </div>
              </Card>
            )}
            
            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                ⚠️ Confermando, la segnalazione verrà inviata direttamente al Centro selezionato.
                {gestioneFeeEnabled && " Ricordati di incassare €15 dal cliente."}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <CornerLayout>
      <PageTransition>
        <div className="min-h-screen bg-background">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/corner")} className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold text-base truncate">Nuova Segnalazione</h1>
                <p className="text-xs text-muted-foreground truncate">{wizardSteps[currentStep].description}</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 pb-32 max-w-2xl mx-auto">
            <Card className="p-4">
              <NewRepairWizard
                steps={wizardSteps}
                currentStep={currentStep}
                totalSteps={wizardSteps.length}
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
      </PageTransition>
    </CornerLayout>
  );
}
