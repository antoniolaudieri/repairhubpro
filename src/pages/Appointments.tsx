import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Phone, Mail, Clock, History, ChevronDown, ChevronUp, Edit2, Check, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { it } from "date-fns/locale";

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

interface AppointmentHistory {
  id: string;
  appointment_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<Record<string, AppointmentHistory[]>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Appointment>>({});

  useEffect(() => {
    loadAppointments();

    // Real-time subscription for appointments
    const appointmentsChannel = supabase
      .channel('appointments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAppointments(prev => [payload.new as Appointment, ...prev]);
            toast({
              title: "Nuova prenotazione",
              description: `${(payload.new as Appointment).customer_name} ha richiesto una prenotazione`,
            });
          } else if (payload.eventType === 'UPDATE') {
            setAppointments(prev => 
              prev.map(apt => apt.id === payload.new.id ? payload.new as Appointment : apt)
            );
          } else if (payload.eventType === 'DELETE') {
            setAppointments(prev => prev.filter(apt => apt.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Real-time subscription for appointment history
    const historyChannel = supabase
      .channel('appointment-history-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointment_history'
        },
        (payload) => {
          const newHistory = payload.new as AppointmentHistory;
          setHistoryData(prev => ({
            ...prev,
            [newHistory.appointment_id]: [newHistory, ...(prev[newHistory.appointment_id] || [])]
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(historyChannel);
    };
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

  const loadHistory = async (appointmentId: string) => {
    if (historyData[appointmentId]) return;

    try {
      const { data, error } = await supabase
        .from("appointment_history" as any)
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      setHistoryData(prev => ({ ...prev, [appointmentId]: (data as unknown as AppointmentHistory[]) || [] }));
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

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

  const startEditing = (appointment: Appointment) => {
    setEditingId(appointment.id);
    setEditForm({
      preferred_date: appointment.preferred_date,
      preferred_time: appointment.preferred_time,
      notes: appointment.notes || "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEditing = async (id: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          preferred_date: editForm.preferred_date,
          preferred_time: editForm.preferred_time,
          notes: editForm.notes,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Salvato",
        description: "Modifiche salvate con successo",
      });
      setEditingId(null);
      setEditForm({});
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le modifiche",
        variant: "destructive",
      });
    }
  };

  const toggleHistory = (appointmentId: string) => {
    if (expandedHistory === appointmentId) {
      setExpandedHistory(null);
    } else {
      setExpandedHistory(appointmentId);
      loadHistory(appointmentId);
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

  const formatFieldName = (field: string): string => {
    const names: Record<string, string> = {
      status: "Stato",
      preferred_date: "Data",
      preferred_time: "Orario",
      notes: "Note",
      customer_name: "Nome cliente",
      customer_email: "Email",
      customer_phone: "Telefono",
      created: "Creazione",
    };
    return names[field] || field;
  };

  const formatFieldValue = (field: string, value: string | null): string => {
    if (!value) return "-";
    
    if (field === "status") {
      const labels: Record<string, string> = {
        pending: "In attesa",
        confirmed: "Confermata",
        completed: "Completata",
        cancelled: "Annullata",
      };
      return labels[value] || value;
    }
    
    if (field === "preferred_date") {
      try {
        return format(new Date(value), "dd/MM/yyyy", { locale: it });
      } catch {
        return value;
      }
    }
    
    return value;
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
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Prenotazioni Online</h1>
            <Badge variant="outline" className="animate-pulse">
              <span className="h-2 w-2 rounded-full bg-green-500 mr-1.5 inline-block" />
              Live
            </Badge>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestisci le richieste di prenotazione dei clienti in tempo reale
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
                <div className="flex flex-col gap-4">
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
                          {editingId === appointment.id ? (
                            <>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                <Input
                                  type="date"
                                  value={editForm.preferred_date || ""}
                                  onChange={(e) => setEditForm({ ...editForm, preferred_date: e.target.value })}
                                  className="h-8"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                <Input
                                  type="time"
                                  value={editForm.preferred_time || ""}
                                  onChange={(e) => setEditForm({ ...editForm, preferred_time: e.target.value })}
                                  className="h-8"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-muted-foreground flex items-center gap-2">
                                <Calendar className="h-4 w-4 flex-shrink-0" />
                                <span>{new Date(appointment.preferred_date).toLocaleDateString("it-IT")}</span>
                              </p>
                              <p className="text-muted-foreground flex items-center gap-2">
                                <Clock className="h-4 w-4 flex-shrink-0" />
                                <span>{appointment.preferred_time}</span>
                              </p>
                            </>
                          )}
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

                      {editingId === appointment.id && (
                        <div className="mt-3">
                          <label className="text-sm text-muted-foreground mb-1 block">Note</label>
                          <Textarea
                            value={editForm.notes || ""}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            placeholder="Aggiungi note..."
                            className="min-h-[60px]"
                          />
                        </div>
                      )}

                      {appointment.notes && editingId !== appointment.id && (
                        <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-sm">
                          <span className="font-medium">Note:</span> {appointment.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 w-full lg:w-auto lg:ml-4">
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

                      {editingId === appointment.id ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveEditing(appointment.id)}
                            className="flex-1"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Salva
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(appointment)}
                          className="w-full lg:w-[180px]"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Modifica
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* History Section */}
                  <Collapsible
                    open={expandedHistory === appointment.id}
                    onOpenChange={() => toggleHistory(appointment.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <History className="h-4 w-4" />
                          Storico modifiche
                        </span>
                        {expandedHistory === appointment.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="border rounded-lg p-3 bg-muted/30 max-h-48 overflow-y-auto">
                        {historyData[appointment.id]?.length > 0 ? (
                          <div className="space-y-2">
                            {historyData[appointment.id].map((entry) => (
                              <div
                                key={entry.id}
                                className="flex items-start gap-3 text-sm border-b border-border/50 pb-2 last:border-0"
                              >
                                <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium">
                                    {formatFieldName(entry.field_name)}
                                  </p>
                                  {entry.field_name !== "created" && (
                                    <p className="text-muted-foreground text-xs">
                                      {formatFieldValue(entry.field_name, entry.old_value)} → {formatFieldValue(entry.field_name, entry.new_value)}
                                    </p>
                                  )}
                                  {entry.field_name === "created" && (
                                    <p className="text-muted-foreground text-xs">
                                      {entry.new_value}
                                    </p>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(entry.changed_at), "dd/MM HH:mm", { locale: it })}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Nessuna modifica registrata
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
