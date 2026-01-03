import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Smartphone, Tablet, Laptop, Monitor, ChevronRight, ChevronLeft, Check, Store, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CornerSelector } from "./CornerSelector";
import { supabase } from "@/integrations/supabase/client";

const bookingSchema = z.object({
  customerName: z.string().min(2, "Nome deve essere almeno 2 caratteri"),
  customerEmail: z.string().email("Email non valida"),
  customerPhone: z.string().min(10, "Numero di telefono non valido"),
  deviceType: z.string().min(1, "Seleziona il tipo di dispositivo"),
  deviceBrand: z.string().optional(),
  deviceModel: z.string().optional(),
  issueDescription: z.string().min(10, "Descrivi il problema (minimo 10 caratteri)"),
  preferredDate: z.date({ required_error: "Seleziona una data" }),
  preferredTime: z.string().min(1, "Seleziona un orario"),
  cornerId: z.string().min(1, "Seleziona un Corner"),
  customerLatitude: z.number().optional(),
  customerLongitude: z.number().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

export interface CustomerData {
  name: string;
  email: string;
  phone: string;
}

interface BookingWizardProps {
  onSubmit: (data: BookingFormData) => Promise<void>;
  isSubmitting: boolean;
  initialCustomerData?: CustomerData | null;
}

interface OpeningHours {
  [key: string]: {
    open_am?: string;
    close_am?: string;
    open_pm?: string;
    close_pm?: string;
    morning_closed?: boolean;
    afternoon_closed?: boolean;
    closed?: boolean;
  };
}

interface CornerData {
  id: string;
  business_name: string;
  opening_hours: OpeningHours | null;
}

const DEVICE_TYPES = [
  { value: "smartphone", label: "Smartphone", icon: Smartphone },
  { value: "tablet", label: "Tablet", icon: Tablet },
  { value: "laptop", label: "Laptop", icon: Laptop },
  { value: "desktop", label: "PC Desktop", icon: Monitor },
];

// Generate time slots based on opening hours
function generateTimeSlots(openingHours: OpeningHours | null, date: Date): string[] {
  if (!openingHours) {
    // Default time slots if no opening hours
    return [
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"
    ];
  }

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[date.getDay()];
  const dayHours = openingHours[dayName];

  if (!dayHours || dayHours.closed) {
    return [];
  }

  const slots: string[] = [];

  // Morning slots
  if (!dayHours.morning_closed && dayHours.open_am && dayHours.close_am) {
    const [startH, startM] = dayHours.open_am.split(':').map(Number);
    const [endH, endM] = dayHours.close_am.split(':').map(Number);
    let current = startH * 60 + startM;
    const end = endH * 60 + endM;
    
    while (current < end) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      current += 30;
    }
  }

  // Afternoon slots
  if (!dayHours.afternoon_closed && dayHours.open_pm && dayHours.close_pm) {
    const [startH, startM] = dayHours.open_pm.split(':').map(Number);
    const [endH, endM] = dayHours.close_pm.split(':').map(Number);
    let current = startH * 60 + startM;
    const end = endH * 60 + endM;
    
    while (current < end) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      current += 30;
    }
  }

  return slots;
}

// Check if a day is open
function isDayOpen(openingHours: OpeningHours | null, date: Date): boolean {
  if (!openingHours) return true;
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[date.getDay()];
  const dayHours = openingHours[dayName];

  if (!dayHours) return true;
  if (dayHours.closed) return false;
  if (dayHours.morning_closed && dayHours.afternoon_closed) return false;
  
  return true;
}

export function BookingWizard({ onSubmit, isSubmitting, initialCustomerData }: BookingWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedCorner, setSelectedCorner] = useState<CornerData | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const totalSteps = 4;

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    mode: "onChange",
    defaultValues: {
      customerName: initialCustomerData?.name || "",
      customerEmail: initialCustomerData?.email || "",
      customerPhone: initialCustomerData?.phone || "",
      deviceType: "",
      deviceBrand: "",
      deviceModel: "",
      issueDescription: "",
      preferredTime: "",
      cornerId: "",
    },
  });

  // Update form when initialCustomerData changes
  useEffect(() => {
    if (initialCustomerData) {
      form.setValue("customerName", initialCustomerData.name);
      form.setValue("customerEmail", initialCustomerData.email);
      form.setValue("customerPhone", initialCustomerData.phone);
    }
  }, [initialCustomerData, form]);

  // Update time slots when date changes
  useEffect(() => {
    const date = form.watch("preferredDate");
    if (date && selectedCorner) {
      const slots = generateTimeSlots(selectedCorner.opening_hours, date);
      setAvailableTimeSlots(slots);
      // Reset time if current selection is not available
      const currentTime = form.watch("preferredTime");
      if (currentTime && !slots.includes(currentTime)) {
        form.setValue("preferredTime", "");
      }
    }
  }, [form.watch("preferredDate"), selectedCorner]);

  // Validation order: Step 3 = Corner, Step 4 = Date/Time
  const validateStep = async (currentStep: number): Promise<boolean> => {
    let fieldsToValidate: (keyof BookingFormData)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = ["customerName", "customerEmail", "customerPhone"];
        break;
      case 2:
        fieldsToValidate = ["deviceType", "issueDescription"];
        break;
      case 3:
        fieldsToValidate = ["cornerId"];
        break;
      case 4:
        fieldsToValidate = ["preferredDate", "preferredTime"];
        break;
    }

    const result = await form.trigger(fieldsToValidate);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateStep(step);
    if (isValid && step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFormSubmit = async (data: BookingFormData) => {
    await onSubmit(data);
  };

  const handleCornerSelect = async (cornerId: string, customerCoords?: { lat: number; lng: number }) => {
    form.setValue("cornerId", cornerId);
    if (customerCoords) {
      form.setValue("customerLatitude", customerCoords.lat);
      form.setValue("customerLongitude", customerCoords.lng);
    }

    // Fetch corner details for opening hours
    const { data } = await supabase
      .from("corners")
      .select("id, business_name, opening_hours")
      .eq("id", cornerId)
      .single();

    if (data) {
      setSelectedCorner({
        id: data.id,
        business_name: data.business_name,
        opening_hours: data.opening_hours as unknown as OpeningHours | null,
      });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step > s
                    ? "bg-primary text-primary-foreground"
                    : step === s
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={cn(
                    "h-1 w-12 sm:w-16 mx-1 sm:mx-2 transition-colors",
                    step > s ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Dati</span>
          <span>Dispositivo</span>
          <span>Corner</span>
          <span>Data</span>
        </div>
      </div>

      {/* Form Steps */}
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Personal Data */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold">I tuoi dati</h3>
                <p className="text-muted-foreground">
                  Inserisci le tue informazioni di contatto
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Nome Completo *</Label>
                  <Input
                    id="customerName"
                    placeholder="Mario Rossi"
                    {...form.register("customerName")}
                  />
                  {form.formState.errors.customerName && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.customerName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    placeholder="mario.rossi@email.com"
                    {...form.register("customerEmail")}
                  />
                  {form.formState.errors.customerEmail && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.customerEmail.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Telefono *</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    placeholder="+39 123 456 7890"
                    {...form.register("customerPhone")}
                  />
                  {form.formState.errors.customerPhone && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.customerPhone.message}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Device Information */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold">Il tuo dispositivo</h3>
                <p className="text-muted-foreground">
                  Che dispositivo devi riparare?
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo di Dispositivo *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {DEVICE_TYPES.map((device) => {
                      const Icon = device.icon;
                      const isSelected = form.watch("deviceType") === device.value;
                      return (
                        <button
                          key={device.value}
                          type="button"
                          onClick={() => form.setValue("deviceType", device.value)}
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:scale-105",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card hover:border-primary/50"
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-8 h-8 mb-2",
                              isSelected ? "text-primary" : "text-muted-foreground"
                            )}
                          />
                          <span className={cn(
                            "text-sm font-medium",
                            isSelected ? "text-primary" : "text-foreground"
                          )}>
                            {device.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {form.formState.errors.deviceType && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.deviceType.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deviceBrand">Marca</Label>
                    <Input
                      id="deviceBrand"
                      placeholder="es. Apple, Samsung"
                      {...form.register("deviceBrand")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deviceModel">Modello</Label>
                    <Input
                      id="deviceModel"
                      placeholder="es. iPhone 14, Galaxy S23"
                      {...form.register("deviceModel")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issueDescription">Descrizione del Problema *</Label>
                  <Textarea
                    id="issueDescription"
                    placeholder="Descrivi il problema in dettaglio..."
                    rows={4}
                    {...form.register("issueDescription")}
                  />
                  {form.formState.errors.issueDescription && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.issueDescription.message}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Corner Selection (moved from step 4) */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold flex items-center gap-2">
                  <Store className="h-6 w-6 text-primary" />
                  Scegli il Punto Consegna
                </h3>
                <p className="text-muted-foreground">
                  Seleziona il Corner più vicino a te dove consegnare il dispositivo
                </p>
              </div>

              <CornerSelector
                selectedCornerId={form.watch("cornerId")}
                onSelect={handleCornerSelect}
              />

              {form.formState.errors.cornerId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.cornerId.message}
                </p>
              )}
            </motion.div>
          )}

          {/* Step 4: Appointment (moved from step 3) */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold">Quando preferisci?</h3>
                <p className="text-muted-foreground">
                  Scegli data e orario in base alla disponibilità di {selectedCorner?.business_name || "questo Corner"}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Data Preferita *</Label>
                  <div className="border rounded-lg p-3 bg-card">
                    <CalendarComponent
                      mode="single"
                      selected={form.watch("preferredDate")}
                      onSelect={(date) => {
                        form.setValue("preferredDate", date as Date);
                        form.setValue("preferredTime", ""); // Reset time when date changes
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (date < today) return true;
                        // Disable days when corner is closed
                        if (selectedCorner?.opening_hours) {
                          return !isDayOpen(selectedCorner.opening_hours, date);
                        }
                        return false;
                      }}
                      locale={it}
                      className="mx-auto"
                    />
                  </div>
                  {form.watch("preferredDate") && (
                    <p className="text-sm text-primary font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data selezionata: {format(form.watch("preferredDate"), "EEEE d MMMM yyyy", { locale: it })}
                    </p>
                  )}
                  {form.formState.errors.preferredDate && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.preferredDate.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferredTime">Orario Preferito *</Label>
                  {!form.watch("preferredDate") ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Seleziona prima una data per vedere gli orari disponibili
                    </p>
                  ) : availableTimeSlots.length === 0 ? (
                    <p className="text-sm text-destructive">
                      Nessun orario disponibile per questa data. Il Corner è chiuso.
                    </p>
                  ) : (
                    <Select
                      onValueChange={(value) => form.setValue("preferredTime", value)}
                      value={form.watch("preferredTime")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona un orario" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTimeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {form.formState.errors.preferredTime && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.preferredTime.message}
                    </p>
                  )}
                </div>

                {/* Summary */}
                {form.watch("preferredDate") && form.watch("preferredTime") && (
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                    <h4 className="font-medium">Riepilogo Prenotazione</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <span className="font-medium text-foreground">Cliente:</span>{" "}
                        {form.watch("customerName")}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Dispositivo:</span>{" "}
                        {DEVICE_TYPES.find((d) => d.value === form.watch("deviceType"))
                          ?.label || "Non specificato"}{" "}
                        {form.watch("deviceBrand")} {form.watch("deviceModel")}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Corner:</span>{" "}
                        {selectedCorner?.business_name}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Data:</span>{" "}
                        {format(form.watch("preferredDate"), "EEEE d MMMM yyyy", { locale: it })} alle {form.watch("preferredTime")}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Problema:</span>{" "}
                        {form.watch("issueDescription")?.substring(0, 60)}
                        {(form.watch("issueDescription")?.length || 0) > 60 ? "..." : ""}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || isSubmitting}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Indietro
          </Button>

          {step < totalSteps ? (
            <Button type="button" onClick={handleNext}>
              Avanti
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting || !form.watch("preferredDate") || !form.watch("preferredTime")}>
              {isSubmitting ? "Invio..." : "Conferma Prenotazione"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
