import { Calendar, Clock, MapPin, Phone, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { sendPushNotification, getCentroUserId } from '@/services/pushNotificationService';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface DayHours {
  open_am: string;
  close_am: string;
  open_pm: string;
  close_pm: string;
  closed: boolean;
  morning_closed?: boolean;
  afternoon_closed?: boolean;
}

interface OpeningHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

interface BookCheckupWidgetProps {
  centroId: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  deviceInfo?: {
    model: string | null;
    manufacturer: string | null;
    healthScore: number;
  };
  onBooked?: () => void;
}

const dayKeys: (keyof OpeningHours)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const BookCheckupWidget = ({
  centroId,
  customerId,
  customerEmail,
  customerName,
  customerPhone,
  deviceInfo,
  onBooked
}: BookCheckupWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [openingHours, setOpeningHours] = useState<OpeningHours | null>(null);
  const [centroName, setCentroName] = useState<string>('');

  // Fetch centro opening hours
  useEffect(() => {
    const fetchCentroHours = async () => {
      if (!centroId) return;
      const { data } = await supabase
        .from('centri_assistenza')
        .select('opening_hours, business_name')
        .eq('id', centroId)
        .single();
      
      if (data) {
        setOpeningHours(data.opening_hours as unknown as OpeningHours | null);
        setCentroName(data.business_name || 'Centro Assistenza');
      }
    };
    fetchCentroHours();
  }, [centroId]);

  // Generate available dates based on centro opening hours
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    let count = 0;
    let dayOffset = 1;
    
    while (count < 7 && dayOffset < 30) {
      const date = new Date(today);
      date.setDate(today.getDate() + dayOffset);
      const dayOfWeek = date.getDay();
      const dayKey = dayKeys[dayOfWeek];
      
      // Check if the day is open based on centro hours
      let isOpen = true;
      if (openingHours && openingHours[dayKey]) {
        isOpen = !openingHours[dayKey].closed;
      } else {
        // Default: skip weekends if no opening hours defined
        isOpen = dayOfWeek !== 0 && dayOfWeek !== 6;
      }
      
      if (isOpen) {
        dates.push({
          value: date.toISOString().split('T')[0],
          label: date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }),
          dayKey
        });
        count++;
      }
      dayOffset++;
    }
    return dates;
  };

  // Helper: convert time string to minutes for comparison
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  };

  // Generate time slots based on selected date and centro opening hours
  const getTimeSlots = () => {
    if (!selectedDate) return [];
    
    const selectedDateObj = new Date(selectedDate);
    const dayOfWeek = selectedDateObj.getDay();
    const dayKey = dayKeys[dayOfWeek];
    
    const dayHours = openingHours?.[dayKey];
    
    // Default time slots if no opening hours
    const defaultSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
    ];
    
    if (!dayHours) return defaultSlots;
    
    const slots: string[] = [];
    
    // Morning slots - respect exact opening time including minutes
    if (!dayHours.morning_closed && dayHours.open_am && dayHours.close_am) {
      const openMinutes = timeToMinutes(dayHours.open_am);
      const closeMinutes = timeToMinutes(dayHours.close_am);
      
      // Generate slots every 30 minutes, starting from first valid slot
      for (let m = 0; m < 24 * 60; m += 30) {
        if (m >= openMinutes && m < closeMinutes) {
          const hours = Math.floor(m / 60);
          const mins = m % 60;
          slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
        }
      }
    }
    
    // Afternoon slots - respect exact opening time including minutes
    if (!dayHours.afternoon_closed && dayHours.open_pm && dayHours.close_pm) {
      const openMinutes = timeToMinutes(dayHours.open_pm);
      const closeMinutes = timeToMinutes(dayHours.close_pm);
      
      // Generate slots every 30 minutes, starting from first valid slot
      for (let m = 0; m < 24 * 60; m += 30) {
        if (m >= openMinutes && m < closeMinutes) {
          const hours = Math.floor(m / 60);
          const mins = m % 60;
          const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
          // Avoid duplicates if morning and afternoon overlap somehow
          if (!slots.includes(timeStr)) {
            slots.push(timeStr);
          }
        }
      }
    }
    
    return slots.length > 0 ? slots : defaultSlots;
  };

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Seleziona data e ora');
      return;
    }

    setLoading(true);
    try {
      const issueDescription = `Controllo salute dispositivo programmato.\nDispositivo: ${deviceInfo?.manufacturer || 'N/D'} ${deviceInfo?.model || 'N/D'}\nPunteggio salute: ${deviceInfo?.healthScore || 'N/D'}/100\n${notes ? `Note: ${notes}` : ''}`;

      const { error } = await supabase
        .from('appointments')
        .insert({
          centro_id: centroId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone || '',
          device_type: 'smartphone',
          device_brand: deviceInfo?.manufacturer || null,
          device_model: deviceInfo?.model || null,
          issue_description: issueDescription,
          preferred_date: selectedDate,
          preferred_time: selectedTime,
          status: 'pending',
          notes: `Prenotato da app Device Health Pro. Health Score: ${deviceInfo?.healthScore || 'N/D'}`
        });

      if (error) throw error;

      // Send push notification to Centro
      try {
        const centroUserId = await getCentroUserId(centroId);
        if (centroUserId) {
          await sendPushNotification([centroUserId], {
            title: "Nuova Prenotazione 📅",
            body: `${customerName} ha prenotato per il ${format(new Date(selectedDate), "d MMMM", { locale: it })} alle ${selectedTime}`,
            data: { type: "new_appointment" }
          });
        }
      } catch (err) {
        console.error("Error sending push to centro:", err);
      }

      setSuccess(true);
      toast.success('Appuntamento prenotato con successo!');
      onBooked?.();
      
      // Reset after delay
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setNotes('');
        setSelectedDate('');
        setSelectedTime('');
      }, 2000);
    } catch (err: any) {
      console.error('Booking error:', err);
      toast.error('Errore durante la prenotazione');
    } finally {
      setLoading(false);
    }
  };

  const availableDates = getAvailableDates();

  return (
    <>
      {/* Compact banner version for prominent placement */}
      <div 
        className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-4 shadow-lg cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div className="text-white">
              <p className="font-semibold text-base">Prenota Controllo</p>
              <p className="text-xs text-white/80">{centroName || 'Centro Assistenza'}</p>
            </div>
          </div>
          <div className="bg-white text-primary px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-1">
            <Phone className="h-4 w-4" />
            Prenota
          </div>
        </div>
        <div className="flex gap-3 mt-3 text-xs text-white/90">
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Diagnosi gratuita
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Assistenza rapida
          </span>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col mx-4 p-0 rounded-2xl overflow-hidden">
          {success ? (
            <div className="text-center py-12 px-6">
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in-50">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <DialogTitle className="text-xl font-bold mb-2">Prenotazione Confermata!</DialogTitle>
              <DialogDescription className="text-base">
                Ti contatteremo per confermare l'appuntamento.
              </DialogDescription>
            </div>
          ) : (
            <>
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-primary to-primary/80 px-5 py-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-lg font-bold text-white">
                      Prenota Controllo
                    </DialogTitle>
                    <DialogDescription className="text-white/80 text-sm">
                      {centroName || 'Centro Assistenza'}
                    </DialogDescription>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                {/* Device Info Summary */}
                {deviceInfo && (
                  <div className="bg-gradient-to-r from-muted/80 to-muted/40 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {deviceInfo.manufacturer} {deviceInfo.model}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Dispositivo da controllare</p>
                    </div>
                    <Badge 
                      className="text-base px-3 py-1"
                      variant={deviceInfo.healthScore >= 70 ? 'default' : deviceInfo.healthScore >= 50 ? 'secondary' : 'destructive'}
                    >
                      {deviceInfo.healthScore}/100
                    </Badge>
                  </div>
                )}

                {/* Centro Opening Hours Info - shown when date selected */}
                {openingHours && selectedDate && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold mb-2">
                      <Clock className="h-5 w-5" />
                      Orari disponibili per questa data
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm">
                      {(() => {
                        const dayOfWeek = new Date(selectedDate).getDay();
                        const dayKey = dayKeys[dayOfWeek];
                        const hours = openingHours[dayKey];
                        if (hours?.closed) {
                          return <p className="text-muted-foreground">Chiuso in questa data</p>;
                        }
                        return (
                          <>
                            {!hours?.morning_closed && hours?.open_am && hours?.close_am && (
                              <div className="flex items-center gap-2 bg-white dark:bg-background px-3 py-1.5 rounded-lg">
                                <span className="text-muted-foreground">☀️ Mattina:</span>
                                <span className="font-medium">{hours.open_am} - {hours.close_am}</span>
                              </div>
                            )}
                            {!hours?.afternoon_closed && hours?.open_pm && hours?.close_pm && (
                              <div className="flex items-center gap-2 bg-white dark:bg-background px-3 py-1.5 rounded-lg">
                                <span className="text-muted-foreground">🌙 Pomeriggio:</span>
                                <span className="font-medium">{hours.open_pm} - {hours.close_pm}</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Date Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    📅 Seleziona Data
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableDates.map(date => (
                      <Button
                        key={date.value}
                        variant={selectedDate === date.value ? 'default' : 'outline'}
                        className={`text-sm h-12 rounded-xl font-medium transition-all ${
                          selectedDate === date.value 
                            ? 'shadow-md scale-[1.02]' 
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => {
                          setSelectedDate(date.value);
                          setSelectedTime(''); // Reset time when date changes
                        }}
                      >
                        {date.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    🕐 Seleziona Orario
                  </Label>
                  {!selectedDate ? (
                    <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-xl text-center border-2 border-dashed border-muted">
                      👆 Prima seleziona una data
                    </div>
                  ) : getTimeSlots().length === 0 ? (
                    <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-xl text-center">
                      ❌ Nessun orario disponibile per questa data
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {getTimeSlots().map(time => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? 'default' : 'outline'}
                          className={`text-sm h-11 rounded-xl font-medium transition-all ${
                            selectedTime === time 
                              ? 'shadow-md scale-[1.02]' 
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedTime(time)}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-base font-semibold">📝 Note (opzionale)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Descrivi eventuali problemi o richieste..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="resize-none rounded-xl"
                  />
                </div>

                {/* Selection Summary */}
                {selectedDate && selectedTime && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <p className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Riepilogo Prenotazione
                    </p>
                    <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                      <p className="font-medium">
                        📅 {new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <p className="font-medium">🕐 Ore {selectedTime}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="border-t bg-muted/30 px-5 py-4 space-y-2">
                <Button 
                  onClick={handleBook} 
                  disabled={loading || !selectedDate || !selectedTime}
                  className="w-full h-12 rounded-xl text-base font-semibold"
                >
                  {loading ? 'Invio in corso...' : '✅ Conferma Prenotazione'}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setIsOpen(false)} 
                  className="w-full h-10 rounded-xl text-muted-foreground"
                >
                  Annulla
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BookCheckupWidget;
