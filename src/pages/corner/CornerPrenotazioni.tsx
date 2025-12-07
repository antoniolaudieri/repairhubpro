import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CornerLayout } from "@/layouts/CornerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Smartphone, 
  CheckCircle, 
  XCircle,
  Loader2,
  MapPin,
  CalendarDays,
  List
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { AppointmentCalendar } from "@/components/corner/AppointmentCalendar";

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
  customer_latitude: number | null;
  customer_longitude: number | null;
}

export default function CornerPrenotazioni() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cornerId, setCornerId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Fetch corner ID
  useEffect(() => {
    const fetchCornerId = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("corners")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setCornerId(data.id);
    };
    fetchCornerId();
  }, [user]);

  // Fetch appointments
  useEffect(() => {
    if (!cornerId) return;

    const fetchAppointments = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("corner_id", cornerId)
        .order("preferred_date", { ascending: true });

      if (!error && data) {
        setAppointments(data);
      }
      setLoading(false);
    };

    fetchAppointments();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`corner-appointments-${cornerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `corner_id=eq.${cornerId}`,
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cornerId]);

  const updateStatus = async (appointmentId: string, newStatus: string) => {
    setProcessingId(appointmentId);
    const { error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", appointmentId);

    if (error) {
      toast.error("Errore nell'aggiornamento dello stato");
    } else {
      toast.success(
        newStatus === "confirmed" 
          ? "Prenotazione confermata" 
          : "Prenotazione rifiutata"
      );
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a))
      );
    }
    setProcessingId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">In Attesa</Badge>;
      case "confirmed":
        return <Badge className="bg-green-500">Confermata</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Annullata</Badge>;
      case "completed":
        return <Badge className="bg-blue-500">Completata</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDeviceIcon = (type: string) => {
    return <Smartphone className="h-4 w-4" />;
  };

  const filterByStatus = (status: string | null) => {
    if (!status) return appointments;
    return appointments.filter((a) => a.status === status);
  };

  const pendingCount = appointments.filter((a) => a.status === "pending").length;
  const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;

  if (loading) {
    return (
      <CornerLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CornerLayout>
    );
  }

  return (
    <CornerLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Prenotazioni</h1>
          <p className="text-muted-foreground">
            Gestisci le prenotazioni ricevute dai clienti
          </p>
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center border rounded-lg overflow-hidden">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="rounded-none gap-2"
          >
            <List className="h-4 w-4" />
            Lista
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("calendar")}
            className="rounded-none gap-2"
          >
            <CalendarDays className="h-4 w-4" />
            Calendario
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Attesa</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confermate</p>
                <p className="text-2xl font-bold text-green-600">{confirmedCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Totale</p>
                <p className="text-2xl font-bold">{appointments.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <AppointmentCalendar 
          appointments={appointments}
          onSelectAppointment={(apt) => {
            // Scroll to appointment in list view
            setViewMode("list");
          }}
        />
      )}

      {/* List View - Tabs */}
      {viewMode === "list" && (
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="relative">
              In Attesa
              {pendingCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-500 text-white rounded-full">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="confirmed">Confermate</TabsTrigger>
            <TabsTrigger value="all">Tutte</TabsTrigger>
          </TabsList>

          {["pending", "confirmed", "all"].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-4">
              {filterByStatus(tab === "all" ? null : tab).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nessuna prenotazione {tab === "pending" ? "in attesa" : tab === "confirmed" ? "confermata" : ""}</p>
                  </CardContent>
                </Card>
              ) : (
                filterByStatus(tab === "all" ? null : tab).map((appointment) => (
                  <Card key={appointment.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {appointment.customer_name}
                          </CardTitle>
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {appointment.customer_phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {appointment.customer_email}
                            </span>
                          </div>
                        </div>
                        {getStatusBadge(appointment.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Device Info */}
                      <div className="flex items-center gap-2 text-sm">
                        {getDeviceIcon(appointment.device_type)}
                        <span className="font-medium">
                          {appointment.device_type}
                          {appointment.device_brand && ` - ${appointment.device_brand}`}
                          {appointment.device_model && ` ${appointment.device_model}`}
                        </span>
                      </div>

                      {/* Issue */}
                      <div className="text-sm">
                        <span className="font-medium">Problema:</span>{" "}
                        <span className="text-muted-foreground">{appointment.issue_description}</span>
                      </div>

                      {/* Date & Time */}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-primary" />
                          {format(new Date(appointment.preferred_date), "d MMMM yyyy", { locale: it })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-primary" />
                          {appointment.preferred_time}
                        </span>
                      </div>

                      {/* Location if available */}
                      {appointment.customer_latitude && appointment.customer_longitude && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Posizione cliente salvata
                        </div>
                      )}

                      {/* Actions for pending */}
                      {appointment.status === "pending" && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => updateStatus(appointment.id, "confirmed")}
                            disabled={processingId === appointment.id}
                          >
                            {processingId === appointment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Conferma
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateStatus(appointment.id, "cancelled")}
                            disabled={processingId === appointment.id}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Rifiuta
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
      </div>
    </CornerLayout>
  );
}