import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, AlertTriangle, Smartphone, ArrowLeft, Flame, Trophy, Zap, TrendingUp } from "lucide-react";
import { PhotoUpload } from "@/components/repair/PhotoUpload";
import { DeviceInfoCard } from "@/components/repair/DeviceInfoCard";
import { CustomerSearch } from "@/components/repair/CustomerSearch";
import { CustomerFormStep } from "@/components/repair/CustomerFormStep";
import { DeviceFormStep } from "@/components/repair/DeviceFormStep";
import { NewRepairWizard } from "@/components/repair/NewRepairWizard";
import { PhotoEditor } from "@/components/repair/PhotoEditor";
import { Button } from "@/components/ui/button";
import { IntakeSignatureStep } from "@/components/repair/IntakeSignatureStep";
import { getBrandSuggestions, getModelSuggestions } from "@/data/commonDevices";
import { SparePartsStep } from "@/components/repair/SparePartsStep";
import { useEffect } from "react";

export default function CentroNuovoRitiro() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [centroId, setCentroId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
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
  const [intakeSignature, setIntakeSignature] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualBrand, setManualBrand] = useState("");
  const [manualModel, setManualModel] = useState("");
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [selectedSpareParts, setSelectedSpareParts] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<{ id: string; name: string; price: number }[]>([]);
  const [selectedLabors, setSelectedLabors] = useState<{ id: string; name: string; price: number }[]>([]);
  const [laborCost, setLaborCost] = useState<number>(0);
  const [diagnosticFee, setDiagnosticFee] = useState<number>(15);
  const [isFeeDisabledBySettings, setIsFeeDisabledBySettings] = useState(false);

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

  // Fetch centro_id and payment_status on mount
  useEffect(() => {
    const fetchCentro = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("centri_assistenza")
        .select("id, payment_status, settings")
        .eq("owner_user_id", user.id)
        .maybeSingle();
      if (data) {
        setCentroId(data.id);
        setPaymentStatus(data.payment_status);
        // Check if diagnostic fee is disabled in settings
        const settings = data.settings as { disable_diagnostic_fee?: boolean } | null;
        if (settings?.disable_diagnostic_fee) {
          setDiagnosticFee(0);
          setIsFeeDisabledBySettings(true);
        }
      }
    };
    fetchCentro();
  }, [user]);

  // Block if suspended
  if (paymentStatus === "suspended") {
    return (
      <CentroLayout>
        <PageTransition>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md w-full border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-xl font-bold text-destructive">Account Sospeso</h2>
                <p className="text-muted-foreground">
                  Non puoi creare nuove riparazioni perché il tuo account è sospeso per credito esaurito.
                </p>
                <p className="text-sm text-muted-foreground">
                  Ricarica il credito dalla dashboard per riattivare l'account.
                </p>
                <Button onClick={() => navigate("/centro")} variant="outline" className="mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Torna alla Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </CentroLayout>
    );
  }

  const wizardSteps = [
    { title: "Cliente", description: "Cerca un cliente esistente o creane uno nuovo" },
    { title: "Foto Dispositivo", description: "Scatta una foto per il riconoscimento automatico" },
    { title: "Dettagli Dispositivo", description: "Verifica e completa le informazioni del dispositivo" },
    { title: "Ricambi e Servizi", description: "Suggerimenti AI in base al difetto segnalato" },
    { title: "Firma Ritiro", description: "Il cliente firma per accettare i termini del servizio" },
    { title: "Riepilogo", description: "Controlla i dati prima di confermare" },
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
      const { data: lookupData, error: lookupError } = await supabase.functions.invoke("lookup-device", {
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
    setCustomerData({ name: "", email: "", phone: "", address: "", notes: "" });
    setIsNewCustomer(true);
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 0: return isNewCustomer ? Boolean(customerData.name && customerData.phone) : existingCustomerId !== null;
      case 1: return true;
      case 2: return Boolean(deviceData.device_type && deviceData.brand && deviceData.model && deviceData.reported_issue);
      case 3: return true;
      case 4: return intakeSignature !== null;
      case 5: return true;
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
    if (!centroId) {
      toast.error("Centro non trovato");
      return;
    }

    setLoading(true);

    try {
      let customerId = existingCustomerId;

      if (!existingCustomerId) {
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
          } else {
            toast.success("Account cliente creato con password: 12345678");
          }
        }

        // Create customer record linked to centro
        const { data: customer, error: customerError } = await supabase
          .from("customers")
          .insert({
            ...customerData,
            centro_id: centroId,
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = customer.id;
      }

      // Upload photo
      let photoUrl = "";
      if (annotatedPhotoBlob || photoFile) {
        const fileToUpload = annotatedPhotoBlob || photoFile!;
        const fileName = `${Date.now()}_${photoFile!.name}`;
        const { error: uploadError } = await supabase.storage
          .from("device-photos")
          .upload(fileName, fileToUpload);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("device-photos").getPublicUrl(fileName);
        photoUrl = urlData.publicUrl;
      } else if (detectedDevice?.imageUrl) {
        photoUrl = detectedDevice.imageUrl;
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

      // Calculate totals
      const partsTotal = selectedSpareParts.reduce((sum, part) => sum + part.unit_cost * part.quantity, 0);
      const servicesTotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
      const estimatedTotal = partsTotal + servicesTotal + laborCost;
      
      let notesArray = [];
      if (selectedServices.length > 0) {
        notesArray.push(`Servizi: ${selectedServices.map(s => `${s.name} (€${s.price})`).join(", ")}`);
      }
      if (selectedLabors.length > 0) {
        notesArray.push(`Lavorazioni: ${selectedLabors.map(l => `${l.name} (€${l.price})`).join(", ")}`);
      }
      if (laborCost > 0) {
        notesArray.push(`Manodopera: €${laborCost.toFixed(2)}`);
      }
      const servicesNotes = notesArray.join(" | ");

      const { data: repairData, error: repairError } = await supabase
        .from("repairs")
        .insert({
          device_id: device.id,
          status: "pending",
          priority: "normal",
          intake_signature: intakeSignature,
          intake_signature_date: new Date().toISOString(),
          diagnostic_fee: diagnosticFee,
          diagnostic_fee_paid: diagnosticFee === 0 ? true : false,
          estimated_cost: estimatedTotal > 0 ? estimatedTotal : null,
          repair_notes: servicesNotes || null,
        })
        .select()
        .single();

      if (repairError) throw repairError;

      // Save spare parts with centro_id
      if (selectedSpareParts.length > 0 && repairData) {
        const partsWithResolvedIds = await Promise.all(
          selectedSpareParts.map(async (part) => {
            if (part.spare_part_id.startsWith('suggested-')) {
              const { data: newPart, error: createError } = await supabase
                .from("spare_parts")
                .insert({
                  name: part.name,
                  category: "Generico",
                  cost: part.purchase_cost || null,
                  selling_price: part.unit_cost,
                  stock_quantity: 0,
                  supplier: "utopya",
                  centro_id: centroId, // Link to centro!
                })
                .select()
                .single();

              if (createError) {
                console.error("Error creating spare part:", createError);
                return { ...part, spare_part_id: null };
              }
              return { ...part, spare_part_id: newPart.id };
            }
            return part;
          })
        );

        const validParts = partsWithResolvedIds.filter(p => p.spare_part_id !== null);

        if (validParts.length > 0) {
          const repairPartsData = validParts.map((part) => ({
            repair_id: repairData.id,
            spare_part_id: part.spare_part_id,
            quantity: part.quantity,
            unit_cost: part.unit_cost,
          }));

          await supabase.from("repair_parts").insert(repairPartsData);

          // Create order linked to customer
          const orderNumber = `ORD-${Date.now()}`;
          const totalAmount = validParts.reduce((sum, part) => sum + (part.unit_cost * part.quantity), 0);

          const { data: orderData, error: orderError } = await supabase
            .from("orders")
            .insert({
              order_number: orderNumber,
              repair_id: repairData.id,
              customer_id: customerId,
              status: "pending",
              supplier: "utopya",
              total_amount: totalAmount,
              notes: `Ordine per riparazione ${repairData.id}`,
            })
            .select()
            .single();

          if (!orderError && orderData) {
            const orderItems = validParts.map((part) => ({
              order_id: orderData.id,
              spare_part_id: part.spare_part_id,
              product_name: part.name,
              product_code: part.supplier_code || "",
              quantity: part.quantity,
              unit_cost: part.unit_cost,
            }));

            await supabase.from("order_items").insert(orderItems);
          }
        }
      }

      toast.success("Dispositivo registrato con successo!");
      navigate("/centro/lavori");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Errore durante la registrazione");
    } finally {
      setLoading(false);
    }
  };

  // Calculate net profit for gamification
  const partsMargin = selectedSpareParts.reduce((sum, part) => {
    const purchaseCost = part.purchase_cost || 0;
    const sellingPrice = part.unit_cost || 0;
    return sum + ((sellingPrice - purchaseCost) * part.quantity);
  }, 0);
  const servicesRevenue = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const netProfit = partsMargin + servicesRevenue + laborCost + diagnosticFee;

  const getProfitLevel = (profit: number) => {
    if (profit >= 100) return { level: "FUOCO", icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10" };
    if (profit >= 70) return { level: "OTTIMO", icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-500/10" };
    if (profit >= 50) return { level: "BUONO", icon: Zap, color: "text-blue-500", bg: "bg-blue-500/10" };
    if (profit >= 30) return { level: "OK", icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" };
    return { level: "MINIMO", icon: AlertTriangle, color: "text-muted-foreground", bg: "bg-muted/50" };
  };

  const profitLevel = getProfitLevel(netProfit);
  const ProfitIcon = profitLevel.icon;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            {!isNewCustomer ? (
              <CustomerSearch
                onSelectCustomer={handleSelectCustomer}
                onCreateNew={handleCreateNewCustomer}
                centroId={centroId}
              />
            ) : (
              <CustomerFormStep customerData={customerData} onChange={setCustomerData} />
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
        return <DeviceFormStep deviceData={deviceData} onChange={setDeviceData} />;

      case 3:
        return (
          <SparePartsStep
            selectedParts={selectedSpareParts}
            onPartsChange={setSelectedSpareParts}
            selectedServices={selectedServices}
            onServicesChange={setSelectedServices}
            selectedLabors={selectedLabors}
            onLaborsChange={setSelectedLabors}
            laborCost={laborCost}
            onLaborCostChange={setLaborCost}
            deviceType={deviceData.device_type}
            deviceBrand={deviceData.brand}
            deviceModel={deviceData.model}
            reportedIssue={deviceData.reported_issue}
          />
        );

      case 4:
        return (
          <IntakeSignatureStep
            onSignatureComplete={(signature) => setIntakeSignature(signature)}
            currentSignature={intakeSignature}
            estimatedCost={selectedSpareParts.reduce((sum, part) => sum + part.unit_cost * part.quantity, 0) + selectedServices.reduce((sum, s) => sum + s.price, 0) + laborCost}
            partsTotal={selectedSpareParts.reduce((sum, part) => sum + part.unit_cost * part.quantity, 0)}
            servicesTotal={selectedServices.reduce((sum, s) => sum + s.price, 0)}
            laborTotal={laborCost}
            diagnosticFee={diagnosticFee}
            onDiagnosticFeeChange={isFeeDisabledBySettings ? undefined : setDiagnosticFee}
            isFeeDisabledBySettings={isFeeDisabledBySettings}
          />
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border-2 ${profitLevel.bg} border-dashed`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ProfitIcon className={`h-6 w-6 ${profitLevel.color}`} />
                  <span className={`font-bold ${profitLevel.color}`}>{profitLevel.level}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Guadagno Netto</p>
                  <p className={`text-xl font-bold ${profitLevel.color}`}>€{netProfit.toFixed(2)}</p>
                </div>
              </div>
            </div>

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
            
            {selectedSpareParts.length > 0 && (
              <Card className="p-4 space-y-3">
                <h4 className="font-semibold">🔧 Ricambi ({selectedSpareParts.length})</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {selectedSpareParts.map((part, idx) => (
                    <li key={idx}>{part.name} x{part.quantity} - €{(part.unit_cost * part.quantity).toFixed(2)}</li>
                  ))}
                </ul>
              </Card>
            )}
            
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Totale Preventivo</span>
                <span className="text-xl font-bold text-primary">
                  €{Math.ceil(selectedSpareParts.reduce((sum, part) => sum + part.unit_cost * part.quantity, 0) + selectedServices.reduce((sum, s) => sum + s.price, 0) + laborCost + diagnosticFee)}
                </span>
              </div>
            </Card>

            {intakeSignature && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <span className="text-green-600">✓</span>
                <span className="text-sm text-green-600 font-medium">Firma di ritiro acquisita</span>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <CentroLayout>
      <PageTransition>
        <div className="min-h-screen bg-background">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/centro/lavori")} className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold text-base truncate">Nuovo Ritiro</h1>
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
    </CentroLayout>
  );
}
