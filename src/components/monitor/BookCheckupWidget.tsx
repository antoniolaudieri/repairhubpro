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

  // Generate time slots based on selected date and centro opening hours
  const getTimeSlots = () => {
    if (!selectedDate) return [];
    
    const selectedDateObj = new Date(selectedDate);
    const dayOfWeek = selectedDateObj.getDay();
    const dayKey = dayKeys[dayOfWeek];
    
    const dayHours = openingHours?.[dayKey];
    
    // Default time slots
    const defaultSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
    ];
    
    if (!dayHours) return defaultSlots;
    
    const slots: string[] = [];
    
    // Morning slots
    if (!dayHours.morning_closed && dayHours.open_am && dayHours.close_am) {
      const openHour = parseInt(dayHours.open_am.split(':')[0]);
      const closeHour = parseInt(dayHours.close_am.split(':')[0]);
      for (let h = openHour; h < closeHour; h++) {
        slots.push(`${h.toString().padStart(2, '0')}:00`);
        slots.push(`${h.toString().padStart(2, '0')}:30`);
      }
    }
    
    // Afternoon slots
    if (!dayHours.afternoon_closed && dayHours.open_pm && dayHours.close_pm) {
      const openHour = parseInt(dayHours.open_pm.split(':')[0]);
      const closeHour = parseInt(dayHours.close_pm.split(':')[0]);
      for (let h = openHour; h < closeHour; h++) {
        slots.push(`${h.toString().padStart(2, '0')}:00`);
        slots.push(`${h.toString().padStart(2, '0')}:30`);
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
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Prenota Controllo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Prenota un controllo completo del tuo dispositivo presso il centro assistenza.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>Diagnosi professionale gratuita</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>Consigli personalizzati</span>
          </div>
          <Button 
            className="w-full" 
            onClick={() => setIsOpen(true)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Prenota Ora
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          {success ? (
            <div className="text-center py-6">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <DialogTitle className="text-xl mb-2">Prenotazione Confermata!</DialogTitle>
              <DialogDescription>
                Ti contatteremo per confermare l'appuntamento.
              </DialogDescription>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Prenota Controllo Dispositivo
                </DialogTitle>
                <DialogDescription>
                  Scegli data e ora per il controllo del tuo dispositivo
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Device Info Summary */}
                {deviceInfo && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium">
                      {deviceInfo.manufacturer} {deviceInfo.model}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">Salute:</span>
                      <Badge variant={deviceInfo.healthScore >= 70 ? 'default' : deviceInfo.healthScore >= 50 ? 'secondary' : 'destructive'}>
                        {deviceInfo.healthScore}/100
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Date Selection */}
                <div className="space-y-2">
                  <Label>Seleziona Data</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableDates.map(date => (
                      <Button
                        key={date.value}
                        variant={selectedDate === date.value ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs"
                        onClick={() => setSelectedDate(date.value)}
                      >
                        {date.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                <div className="space-y-2">
                  <Label>Seleziona Orario</Label>
                  <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                    {getTimeSlots().map(time => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs"
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                  {selectedDate && getTimeSlots().length === 0 && (
                    <p className="text-xs text-muted-foreground">Nessun orario disponibile per questa data</p>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Note (opzionale)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Descrivi eventuali problemi o richieste..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={handleBook} disabled={loading || !selectedDate || !selectedTime}>
                  {loading ? 'Prenotazione...' : 'Conferma Prenotazione'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BookCheckupWidget;
