import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
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
      title: "Ricambi e Servizi",
      description: "Suggerimenti AI in base al difetto segnalato",
    },
    {
      title: "Firma Ritiro",
      description: "Il cliente firma per accettare i termini del servizio",
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
    setShowManualEntry(false);
    setManualBrand("");
    setManualModel("");
    setBrandSuggestions([]);
    setModelSuggestions([]);
    setShowBrandSuggestions(false);
    setShowModelSuggestions(false);
  };

  const handleBrandChange = (value: string) => {
    setManualBrand(value);
    const suggestions = getBrandSuggestions(value);
    setBrandSuggestions(suggestions);
    setShowBrandSuggestions(suggestions.length > 0);
    
    // Reset model when brand changes
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
    // Show initial model suggestions
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

    // Inferisci il tipo di dispositivo dal modello
    const inferDeviceType = (brand: string, model: string): string => {
      const modelLower = model.toLowerCase();
      const brandLower = brand.toLowerCase();
      
      // Tablet
      if (modelLower.includes('ipad') || modelLower.includes('tab') || modelLower.includes('tablet')) {
        return 'tablet';
      }
      // Laptop
      if (modelLower.includes('macbook') || modelLower.includes('laptop') || modelLower.includes('notebook') || 
          modelLower.includes('thinkpad') || modelLower.includes('xps') || modelLower.includes('pavilion')) {
        return 'laptop';
      }
      // Smartwatch
      if (modelLower.includes('watch') || modelLower.includes('band') || modelLower.includes('fit')) {
        return 'smartwatch';
      }
      // Default smartphone
      return 'smartphone';
    };

    const inferredType = inferDeviceType(manualBrand.trim(), manualModel.trim());

    setLookingUpDetails(true);
    try {
      const { data: lookupData, error: lookupError } = await supabase.functions.invoke("lookup-device", {
        body: { 
          brand: manualBrand.trim(), 
          model: manualModel.trim() 
        },
      });

      if (!lookupError && lookupData?.device_info) {
        const deviceInfo = {
          type: inferredType,
          brand: manualBrand.trim(),
          model: manualModel.trim(),
          ...lookupData.device_info,
        };
        
        setDetectedDevice(deviceInfo);
        
        setDeviceData((prev) => ({
          ...prev,
          device_type: inferredType,
          brand: manualBrand.trim(),
          model: manualModel.trim(),
        }));
        
        toast.success("Dispositivo trovato!");
        setShowManualEntry(false);
        setCurrentStep(2);
      } else {
        // Anche se non troviamo il dispositivo online, permettiamo di procedere
        setDetectedDevice({
          type: inferredType,
          brand: manualBrand.trim(),
          model: manualModel.trim(),
        });
        
        setDeviceData((prev) => ({
          ...prev,
          device_type: inferredType,
          brand: manualBrand.trim(),
          model: manualModel.trim(),
        }));
        
        toast.info("Dispositivo confermato");
        setShowManualEntry(false);
        setCurrentStep(2);
      }
    } catch (error: any) {
      console.error("Lookup error:", error);
      // Anche in caso di errore, permettiamo di procedere con i dati inseriti
      setDetectedDevice({
        type: inferredType,
        brand: manualBrand.trim(),
        model: manualModel.trim(),
      });
      
      setDeviceData((prev) => ({
        ...prev,
        device_type: inferredType,
        brand: manualBrand.trim(),
        model: manualModel.trim(),
      }));
      
      toast.info("Dispositivo confermato");
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
        return true; // Foto opzionale, può essere saltata
      case 2:
        return Boolean(deviceData.device_type && deviceData.brand && deviceData.model && deviceData.reported_issue);
      case 3:
        return true; // Ricambi opzionali
      case 4:
        return intakeSignature !== null;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canGoNext()) {
      // Se siamo allo step 1 (foto) e non c'è né foto né device riconosciuto,
      // mostra l'inserimento manuale
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

      // Upload photo if exists, otherwise use online image
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
      } else if (detectedDevice?.imageUrl) {
        // Usa l'immagine trovata online come miniatura
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

      // Calculate totals including services and labor
      const partsTotal = selectedSpareParts.reduce((sum, part) => sum + part.unit_cost * part.quantity, 0);
      const servicesTotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
      const estimatedTotal = partsTotal + servicesTotal + laborCost;
      
      // Build services and labor notes
      let notesArray = [];
      if (selectedServices.length > 0) {
        notesArray.push(`Servizi richiesti: ${selectedServices.map(s => `${s.name} (€${s.price})`).join(", ")}`);
      }
      if (selectedLabors.length > 0) {
        notesArray.push(`Lavorazioni: ${selectedLabors.map(l => `${l.name} (€${l.price})`).join(", ")}`);
      }
      if (laborCost > 0) {
        notesArray.push(`Totale Manodopera: €${laborCost.toFixed(2)}`);
      }
      const servicesNotes = notesArray.join(" | ");

      // Create repair entry with intake signature and diagnostic fee
      const { data: repairData, error: repairError } = await supabase
        .from("repairs")
        .insert({
          device_id: device.id,
          status: "pending",
          priority: "normal",
          intake_signature: intakeSignature,
          intake_signature_date: new Date().toISOString(),
          diagnostic_fee: 15.00,
          diagnostic_fee_paid: false,
          estimated_cost: estimatedTotal > 0 ? estimatedTotal : null,
          repair_notes: servicesNotes || null,
        })
        .select()
        .single();

      if (repairError) throw repairError;

      // Salva i ricambi se selezionati
      if (selectedSpareParts.length > 0 && repairData) {
        // Prima crea nell'inventario i ricambi suggeriti dall'IA che non esistono ancora
        const partsWithResolvedIds = await Promise.all(
          selectedSpareParts.map(async (part) => {
            // Se l'ID inizia con "suggested-", il ricambio non esiste nel database
            if (part.spare_part_id.startsWith('suggested-')) {
              // Crea il ricambio nell'inventario
              const { data: newPart, error: createError } = await supabase
                .from("spare_parts")
                .insert({
                  name: part.name,
                  category: "Generico", // Categoria default
                  cost: part.purchase_cost || null,
                  selling_price: part.unit_cost,
                  stock_quantity: 0,
                  supplier: "utopya",
                })
                .select()
                .single();

              if (createError) {
                console.error("Error creating spare part:", createError);
                toast.error(`Errore creazione ricambio: ${part.name}`);
                return { ...part, spare_part_id: null }; // Marca come fallito
              }

              toast.success(`Ricambio "${part.name}" aggiunto all'inventario`);
              return { ...part, spare_part_id: newPart.id };
            }
            return part;
          })
        );

        // Filtra i ricambi che sono stati creati con successo
        const validParts = partsWithResolvedIds.filter(p => p.spare_part_id !== null);

        if (validParts.length > 0) {
          const repairPartsData = validParts.map((part) => ({
            repair_id: repairData.id,
            spare_part_id: part.spare_part_id,
            quantity: part.quantity,
            unit_cost: part.unit_cost,
          }));

          const { error: partsError } = await supabase
            .from("repair_parts")
            .insert(repairPartsData);

          if (partsError) {
            console.error("Error saving spare parts:", partsError);
            toast.error("Errore nel salvataggio ricambi");
          }

          // Crea ordine automatico per i ricambi
          const orderNumber = `ORD-${Date.now()}`;
          const totalAmount = validParts.reduce((sum, part) => sum + (part.unit_cost * part.quantity), 0);

          const { data: orderData, error: orderError } = await supabase
            .from("orders")
            .insert({
              order_number: orderNumber,
              repair_id: repairData.id,
              status: "pending",
              supplier: "utopya",
              total_amount: totalAmount,
              notes: `Ordine automatico per riparazione ${repairData.id}`,
            })
            .select()
            .single();

          if (orderError) {
            console.error("Error creating order:", orderError);
          } else {
            // Aggiungi gli item all'ordine
            const orderItems = validParts.map((part) => ({
              order_id: orderData.id,
              spare_part_id: part.spare_part_id,
              product_name: part.name,
              product_code: part.supplier_code || "",
              quantity: part.quantity,
              unit_cost: part.unit_cost,
            }));

            const { error: itemsError } = await supabase
              .from("order_items")
              .insert(orderItems);

            if (itemsError) {
              console.error("Error creating order items:", itemsError);
            } else {
              toast.success("Ordine ricambi creato automaticamente!");
            }
          }
        }
      }

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
                      {aiAnalyzing 
                        ? "Analisi..." 
                        : lookingUpDetails 
                        ? "Recupero dettagli..." 
                        : "Riconosci con IA"}
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        onClick={handleOpenPhotoEditor}
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs"
                      >
                        ✏️ Annota
                      </Button>
                      
                      <Button
                        type="button"
                        onClick={() => setShowManualEntry(true)}
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs"
                      >
                        ⌨️ Manuale
                      </Button>
                    </div>
                    
                    {annotatedPhotoBlob && (
                      <p className="text-xs text-accent flex items-center justify-center gap-1.5">
                        <span className="h-1.5 w-1.5 bg-accent rounded-full" />
                        Foto annotata pronta
                      </p>
                    )}
                  </div>
                )}

                {!photoPreview && !showManualEntry && (
                  <Button
                    type="button"
                    onClick={() => setShowManualEntry(true)}
                    variant="outline"
                    className="w-full h-10"
                  >
                    Inserisci Manualmente
                  </Button>
                )}

                {showManualEntry && (
                  <div className="space-y-3 p-3 border border-border rounded-lg bg-card">
                    <h3 className="font-semibold text-sm">Inserimento Manuale</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <label className="text-xs font-medium text-muted-foreground">Marca</label>
                        <input
                          type="text"
                          value={manualBrand}
                          onChange={(e) => handleBrandChange(e.target.value)}
                          onFocus={() => {
                            const suggestions = getBrandSuggestions(manualBrand);
                            setBrandSuggestions(suggestions);
                            setShowBrandSuggestions(suggestions.length > 0);
                          }}
                          onBlur={() => setTimeout(() => setShowBrandSuggestions(false), 200)}
                          placeholder="es. Apple"
                          className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-md bg-background"
                        />
                        {showBrandSuggestions && brandSuggestions.length > 0 && (
                          <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {brandSuggestions.map((brand) => (
                              <button
                                key={brand}
                                type="button"
                                onClick={() => selectBrand(brand)}
                                className="w-full px-3 py-2 text-sm text-left hover:bg-accent/10 transition-colors"
                              >
                                {brand}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <label className="text-xs font-medium text-muted-foreground">Modello</label>
                        <input
                          type="text"
                          value={manualModel}
                          onChange={(e) => handleModelChange(e.target.value)}
                          onFocus={() => {
                            if (manualBrand) {
                              const suggestions = getModelSuggestions(manualBrand, manualModel);
                              setModelSuggestions(suggestions);
                              setShowModelSuggestions(suggestions.length > 0);
                            }
                          }}
                          onBlur={() => setTimeout(() => setShowModelSuggestions(false), 200)}
                          placeholder="es. iPhone 15"
                          disabled={!manualBrand}
                          className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-md bg-background disabled:opacity-50"
                        />
                        {showModelSuggestions && modelSuggestions.length > 0 && (
                          <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {modelSuggestions.map((model) => (
                              <button
                                key={model}
                                type="button"
                                onClick={() => selectModel(model)}
                                className="w-full px-3 py-2 text-sm text-left hover:bg-accent/10 transition-colors"
                              >
                                {model}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleManualLookup}
                        disabled={lookingUpDetails || !manualBrand.trim() || !manualModel.trim()}
                        className="flex-1 h-9 text-sm"
                      >
                        {lookingUpDetails ? "Ricerca..." : "Conferma"}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setShowManualEntry(false);
                          setManualBrand("");
                          setManualModel("");
                          setBrandSuggestions([]);
                          setModelSuggestions([]);
                        }}
                        variant="outline"
                        className="h-9 text-sm"
                      >
                        Annulla
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
        return (
          <DeviceFormStep
            deviceData={deviceData}
            onChange={setDeviceData}
          />
        );
      
      case 3:
        return (
          <SparePartsStep
            deviceBrand={deviceData.brand}
            deviceModel={deviceData.model}
            deviceType={deviceData.device_type}
            reportedIssue={deviceData.reported_issue}
            selectedParts={selectedSpareParts}
            onPartsChange={setSelectedSpareParts}
            selectedServices={selectedServices}
            onServicesChange={setSelectedServices}
            selectedLabors={selectedLabors}
            onLaborsChange={setSelectedLabors}
            laborCost={laborCost}
            onLaborCostChange={setLaborCost}
          />
        );
      
      case 4:
        // Calculate totals for signature step
        const sigPartsTotal = selectedSpareParts.reduce((sum, part) => sum + part.unit_cost * part.quantity, 0);
        const sigServicesTotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
        const sigLaborTotal = laborCost;
        const sigEstimatedCost = sigPartsTotal + sigServicesTotal + sigLaborTotal;
        
        return (
          <IntakeSignatureStep
            onSignatureComplete={setIntakeSignature}
            currentSignature={intakeSignature}
            estimatedCost={sigEstimatedCost}
            partsTotal={sigPartsTotal}
            servicesTotal={sigServicesTotal}
            laborTotal={sigLaborTotal}
          />
        );
      
      case 5:
        // Calcolo guadagno netto (solo per il tecnico)
        const partsRevenue = selectedSpareParts.reduce((sum, part) => sum + part.unit_cost * part.quantity, 0);
        const partsCost = selectedSpareParts.reduce((sum, part) => sum + (part.purchase_cost || 0) * part.quantity, 0);
        const partsMargin = partsRevenue - partsCost; // Margine sui ricambi
        const servicesRevenue = selectedServices.reduce((sum, s) => sum + s.price, 0);
        const diagnosticFee = 15; // €15 gestione diagnosi
        
        // Controlla ricambi senza costo acquisto
        const partsWithoutCost = selectedSpareParts.filter(part => !part.purchase_cost || part.purchase_cost === 0);
        const hasMissingCosts = partsWithoutCost.length > 0;
        
        // Guadagno netto = margine ricambi + servizi + manodopera + gestione diagnosi
        const netProfit = partsMargin + servicesRevenue + laborCost + diagnosticFee;
        
        // Gamification: livelli di guadagno
        const getProfitLevel = (profit: number) => {
          if (profit >= 100) return { emoji: "🔥", label: "FUOCO!", color: "text-orange-500", bg: "from-orange-500/20 to-red-500/20", icon: Flame };
          if (profit >= 60) return { emoji: "🏆", label: "OTTIMO", color: "text-yellow-500", bg: "from-yellow-500/20 to-amber-500/20", icon: Trophy };
          if (profit >= 30) return { emoji: "⚡", label: "BUONO", color: "text-blue-500", bg: "from-blue-500/20 to-cyan-500/20", icon: Zap };
          if (profit > 0) return { emoji: "📈", label: "OK", color: "text-green-500", bg: "from-green-500/20 to-emerald-500/20", icon: TrendingUp };
          return { emoji: "😐", label: "MINIMO", color: "text-muted-foreground", bg: "from-muted/30 to-muted/10", icon: TrendingUp };
        };
        
        const profitLevel = getProfitLevel(netProfit);
        const ProfitIcon = profitLevel.icon;
        
        return (
          <div className="space-y-4">
            {/* Card Guadagno Netto - Solo per tecnici */}
            <div className={`p-3 md:p-4 rounded-xl border border-dashed border-primary/30 bg-gradient-to-r ${profitLevel.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ProfitIcon className={`h-4 w-4 ${profitLevel.color}`} />
                  <span className="text-xs font-medium text-muted-foreground">Guadagno (interno)</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-background/50 ${profitLevel.color}`}>
                  {profitLevel.emoji} {profitLevel.label}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl md:text-3xl font-bold ${profitLevel.color}`}>
                  €{netProfit.toFixed(2)}
                </span>
              </div>
              {/* Breakdown compatto */}
              <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] md:text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ricambi:</span>
                  <span>€{partsMargin.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Servizi:</span>
                  <span>€{servicesRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Manodopera:</span>
                  <span>€{laborCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diagnosi:</span>
                  <span>€{diagnosticFee.toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-1.5 text-[9px] text-muted-foreground/60 text-right">
                Non visibile al cliente
              </div>
            </div>

            {/* Avviso ricambi senza costo */}
            {hasMissingCosts && (
              <div className="p-2.5 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-warning">Costi mancanti</p>
                  <p className="text-muted-foreground">
                    {partsWithoutCost.length === 1 
                      ? `"${partsWithoutCost[0].name}" senza costo.`
                      : `${partsWithoutCost.length} ricambi senza costo.`
                    }
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-semibold text-sm md:text-base">Dati Cliente</h3>
              <CustomerFormStep
                customerData={customerData}
                onChange={setCustomerData}
                readOnly
              />
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-sm md:text-base">Dispositivo</h3>
              {detectedDevice && (
                <DeviceInfoCard
                  deviceInfo={detectedDevice}
                  onConfirm={() => {}}
                  onEdit={() => {}}
                />
              )}
            </div>
            {selectedSpareParts.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm md:text-base">Ricambi ({selectedSpareParts.length})</h3>
                <div className="border border-border rounded-lg p-3 space-y-1">
                  {selectedSpareParts.map((part) => (
                    <div
                      key={part.spare_part_id}
                      className="flex justify-between items-center py-1 text-sm"
                    >
                      <span className="truncate flex-1 mr-2">{part.name}</span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {part.quantity}x €{part.unit_cost.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border mt-2 space-y-1">
                    <div className="flex justify-between font-semibold text-sm">
                      <span>Totale:</span>
                      <span>€{partsRevenue.toFixed(2)}</span>
                    </div>
                    {partsMargin > 0 && (
                      <div className="flex justify-between text-xs text-accent">
                        <span>Margine:</span>
                        <span className="font-medium">
                          €{partsMargin.toFixed(2)} 
                          {partsCost > 0 && ` (${((partsMargin / partsCost) * 100).toFixed(0)}%)`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {selectedServices.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm md:text-base">Servizi ({selectedServices.length})</h3>
                <div className="border border-border rounded-lg p-3 space-y-1">
                  {selectedServices.map((service) => (
                    <div
                      key={service.id}
                      className="flex justify-between items-center py-1 text-sm"
                    >
                      <span className="truncate flex-1 mr-2">{service.name}</span>
                      <span className="text-muted-foreground">€{service.price.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border mt-2">
                    <div className="flex justify-between font-semibold text-sm">
                      <span>Totale:</span>
                      <span>€{servicesRevenue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {laborCost > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm md:text-base">Manodopera</h3>
                <div className="border border-border rounded-lg p-3">
                  {selectedLabors.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {selectedLabors.map((labor) => (
                        <div key={labor.id} className="flex justify-between text-sm">
                          <span className="truncate flex-1 mr-2">{labor.name}</span>
                          <span className="text-muted-foreground">€{labor.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={`flex justify-between font-semibold text-sm ${selectedLabors.length > 0 ? 'pt-2 border-t border-border' : ''}`}>
                    <span>Totale:</span>
                    <span>€{laborCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
            {(selectedSpareParts.length > 0 || selectedServices.length > 0 || laborCost > 0) && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm md:text-base">Totale Preventivo:</span>
                  <span className="font-bold text-base md:text-lg text-primary">
                    €{(partsRevenue + servicesRevenue + laborCost).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-3 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9 md:h-10 md:w-10 shrink-0"
          >
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-foreground">
                Nuovo Ritiro
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                Registra un nuovo dispositivo
              </p>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <Card className="p-4 md:p-6 border-border/50 bg-card">
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
