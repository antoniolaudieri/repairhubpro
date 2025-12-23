import { Calendar, Clock, MapPin, Phone, CheckCircle } from 'lucide-react';
import { useState } from 'react';
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

  // Generate available dates (next 7 business days)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    let count = 0;
    let dayOffset = 1;
    
    while (count < 7) {
      const date = new Date(today);
      date.setDate(today.getDate() + dayOffset);
      const dayOfWeek = date.getDay();
      
      // Skip weekends
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        dates.push({
          value: date.toISOString().split('T')[0],
          label: date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
        });
        count++;
      }
      dayOffset++;
    }
    return dates;
  };

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
  ];

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
                  <div className="grid grid-cols-4 gap-2">
                    {timeSlots.map(time => (
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
