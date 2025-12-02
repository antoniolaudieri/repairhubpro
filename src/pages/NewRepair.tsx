import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, TrendingUp, Trophy, Flame, Zap } from "lucide-react";
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
          type: deviceData.device_type || "smartphone",
          brand: manualBrand.trim(),
          model: manualModel.trim(),
          ...lookupData.device_info,
        };
        
        setDetectedDevice(deviceInfo);
        
        setDeviceData((prev) => ({
          ...prev,
          brand: manualBrand.trim(),
          model: manualModel.trim(),
        }));
        
        toast.success("Dispositivo trovato! Puoi procedere al prossimo step.");
        setShowManualEntry(false);
      } else {
        // Anche se non troviamo il dispositivo online, permettiamo di procedere
        setDetectedDevice({
          type: deviceData.device_type || "smartphone",
          brand: manualBrand.trim(),
          model: manualModel.trim(),
        });
        
        setDeviceData((prev) => ({
          ...prev,
          brand: manualBrand.trim(),
          model: manualModel.trim(),
        }));
        
        toast.info("Puoi procedere, ma non abbiamo trovato l'immagine del dispositivo");
        setShowManualEntry(false);
      }
    } catch (error: any) {
      console.error("Lookup error:", error);
      // Anche in caso di errore, permettiamo di procedere con i dati inseriti
      setDetectedDevice({
        type: deviceData.device_type || "smartphone",
        brand: manualBrand.trim(),
        model: manualModel.trim(),
      });
      
      setDeviceData((prev) => ({
        ...prev,
        brand: manualBrand.trim(),
        model: manualModel.trim(),
      }));
      
      toast.info("Puoi procedere con i dati inseriti manualmente");
      setShowManualEntry(false);
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
        const repairPartsData = selectedSpareParts.map((part) => ({
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
        const totalAmount = selectedSpareParts.reduce((sum, part) => sum + (part.unit_cost * part.quantity), 0);

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
          const orderItems = selectedSpareParts.map((part) => ({
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
                <div className="text-center p-4 bg-muted/30 rounded-lg mb-4">
                  <p className="text-sm text-muted-foreground">
                    La foto è opzionale. Puoi scattarla e usare l'IA per il riconoscimento, 
                    oppure inserire i dati manualmente.
                  </p>
                </div>
                
                <PhotoUpload onPhotoUpload={handlePhotoUpload} />
                {photoPreview && !showManualEntry && (
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
                    
                    <Button
                      type="button"
                      onClick={() => setShowManualEntry(true)}
                      variant="outline"
                      className="w-full"
                    >
                      Inserisci Manualmente
                    </Button>
                    
                    {annotatedPhotoBlob && (
                      <p className="text-sm text-accent flex items-center gap-2">
                        <span className="h-2 w-2 bg-accent rounded-full" />
                        Foto annotata pronta per il salvataggio
                      </p>
                    )}
                  </div>
                )}

                {showManualEntry && (
                  <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
                    <h3 className="font-semibold text-lg">Inserimento Manuale</h3>
                    <div className="space-y-3">
                      <div className="relative">
                        <label className="text-sm font-medium">Marca</label>
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
                          placeholder="es. Apple, Samsung"
                          className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background"
                        />
                        {showBrandSuggestions && brandSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {brandSuggestions.map((brand) => (
                              <button
                                key={brand}
                                type="button"
                                onClick={() => selectBrand(brand)}
                                className="w-full px-3 py-2 text-left hover:bg-accent/10 transition-colors"
                              >
                                {brand}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <label className="text-sm font-medium">Modello</label>
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
                          placeholder="es. iPhone 15 Pro"
                          disabled={!manualBrand}
                          className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background disabled:opacity-50"
                        />
                        {showModelSuggestions && modelSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {modelSuggestions.map((model) => (
                              <button
                                key={model}
                                type="button"
                                onClick={() => selectModel(model)}
                                className="w-full px-3 py-2 text-left hover:bg-accent/10 transition-colors"
                              >
                                {model}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={handleManualLookup}
                          disabled={lookingUpDetails || !manualBrand.trim() || !manualModel.trim()}
                          className="flex-1"
                        >
                          {lookingUpDetails ? "Ricerca in corso..." : "Cerca Dispositivo"}
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
                        >
                          Annulla
                        </Button>
                      </div>
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
        return (
          <IntakeSignatureStep
            onSignatureComplete={setIntakeSignature}
            currentSignature={intakeSignature}
          />
        );
      
      case 5:
        // Calcolo guadagno netto (solo per il tecnico)
        const partsRevenue = selectedSpareParts.reduce((sum, part) => sum + part.unit_cost * part.quantity, 0);
        const partsCost = selectedSpareParts.reduce((sum, part) => sum + (part.purchase_cost || part.unit_cost * 0.6) * part.quantity, 0);
        const servicesRevenue = selectedServices.reduce((sum, s) => sum + s.price, 0);
        const diagnosticFee = 15; // €15 gestione diagnosi
        
        // Ricavi = vendita ricambi + servizi + manodopera + gestione diagnosi
        const totalRevenue = partsRevenue + servicesRevenue + laborCost + diagnosticFee;
        // Costi = acquisto ricambi
        const totalCost = partsCost;
        // Guadagno netto
        const netProfit = totalRevenue - totalCost;
        
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
          <div className="space-y-6">
            {/* Card Guadagno Netto - Solo per tecnici */}
            <div className={`p-4 rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-r ${profitLevel.bg}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ProfitIcon className={`h-5 w-5 ${profitLevel.color}`} />
                  <span className="text-sm font-medium text-muted-foreground">Guadagno Netto (interno)</span>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full bg-background/50 ${profitLevel.color}`}>
                  {profitLevel.emoji} {profitLevel.label}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`text-3xl font-bold ${profitLevel.color}`}>
                  €{netProfit.toFixed(2)}
                </span>
                <div className="text-xs text-muted-foreground text-right">
                  <div>Ricavi: €{totalRevenue.toFixed(2)}</div>
                  <div>Costi: €{totalCost.toFixed(2)}</div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground flex justify-between">
                <span>Include €{diagnosticFee} gestione diagnosi</span>
                <span className="opacity-60">Non visibile al cliente</span>
              </div>
            </div>

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
            {selectedSpareParts.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Ricambi Selezionati</h3>
                <div className="border border-border rounded-lg p-4">
                  {selectedSpareParts.map((part) => (
                    <div
                      key={part.spare_part_id}
                      className="flex justify-between items-center py-2"
                    >
                      <span>{part.name}</span>
                      <span className="text-muted-foreground">
                        {part.quantity}x €{part.unit_cost.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Totale Ricambi:</span>
                      <span>
                        €{partsRevenue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedServices.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Servizi Selezionati</h3>
                <div className="border border-border rounded-lg p-4">
                  {selectedServices.map((service) => (
                    <div
                      key={service.id}
                      className="flex justify-between items-center py-2"
                    >
                      <span>{service.name}</span>
                      <span className="text-muted-foreground">€{service.price.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Totale Servizi:</span>
                      <span>
                        €{servicesRevenue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {laborCost > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Manodopera</h3>
                <div className="border border-border rounded-lg p-4">
                  {selectedLabors.length > 0 && (
                    <div className="space-y-2 mb-2">
                      {selectedLabors.map((labor) => (
                        <div key={labor.id} className="flex justify-between text-sm">
                          <span>{labor.name}</span>
                          <span className="text-muted-foreground">€{labor.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={`flex justify-between font-semibold ${selectedLabors.length > 0 ? 'pt-2 border-t border-border' : ''}`}>
                    <span>Totale Manodopera:</span>
                    <span>€{laborCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
            {(selectedSpareParts.length > 0 || selectedServices.length > 0 || laborCost > 0) && (
              <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Totale Preventivo:</span>
                  <span className="font-bold text-lg text-primary">
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
    <div className="min-h-screen p-3 md:p-6 bg-gradient-mesh">
      <div className="max-w-5xl mx-auto">
        <Card className="p-4 md:p-8 shadow-xl border-border/50 bg-card/95 backdrop-blur-sm">
          <div className="mb-4 md:mb-8 text-center">
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent mb-2 md:mb-3">
              Nuovo Ritiro Dispositivo
            </h1>
            <p className="text-muted-foreground text-sm md:text-lg px-2">
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
