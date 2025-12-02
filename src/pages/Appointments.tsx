import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Phone, Mail, Clock } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Appointment {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  issue_description: string;
  preferred_date: string;
  preferred_time: string;
  status: string;
  notes: string | null;
  created_at: string;
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("preferred_date", { ascending: true })
        .order("preferred_time", { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Error loading appointments:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le prenotazioni",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setAppointments(
        appointments.map((apt) => (apt.id === id ? { ...apt, status: newStatus } : apt))
      );

      toast({
        title: "Aggiornato",
        description: "Stato prenotazione aggiornato con successo",
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      confirmed: "default",
      completed: "secondary",
      cancelled: "destructive",
    };

    const labels: Record<string, string> = {
      pending: "In attesa",
      confirmed: "Confermata",
      completed: "Completata",
      cancelled: "Annullata",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento prenotazioni...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Prenotazioni Online</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestisci le richieste di prenotazione dei clienti
          </p>
        </div>

        {appointments.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center">
            <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold mb-2">Nessuna prenotazione</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Le prenotazioni online appariranno qui
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {appointments.map((appointment) => (
              <Card key={appointment.id} className="p-4 sm:p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                      <h3 className="text-base sm:text-lg font-semibold">{appointment.customer_name}</h3>
                      {getStatusBadge(appointment.status)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                      <div className="space-y-2">
                        <p className="text-muted-foreground flex items-center gap-2">
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{appointment.customer_email}</span>
                        </p>
                        <p className="text-muted-foreground flex items-center gap-2">
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          <span>{appointment.customer_phone}</span>
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>{new Date(appointment.preferred_date).toLocaleDateString("it-IT")}</span>
                        </p>
                        <p className="text-muted-foreground flex items-center gap-2">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span>{appointment.preferred_time}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium text-sm mb-1">
                        {appointment.device_type}
                        {appointment.device_brand && ` - ${appointment.device_brand}`}
                        {appointment.device_model && ` ${appointment.device_model}`}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                        {appointment.issue_description}
                      </p>
                    </div>
                  </div>

                  <div className="w-full lg:w-auto lg:ml-4">
                    <Select
                      value={appointment.status}
                      onValueChange={(value) => updateStatus(appointment.id, value)}
                    >
                      <SelectTrigger className="w-full lg:w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">In attesa</SelectItem>
                        <SelectItem value="confirmed">Confermata</SelectItem>
                        <SelectItem value="completed">Completata</SelectItem>
                        <SelectItem value="cancelled">Annullata</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
