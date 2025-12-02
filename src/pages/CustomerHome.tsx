import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wrench,
  Clock,
  CheckCircle2,
  Star,
  Phone,
  Mail,
  MapPin,
  Shield,
  Zap,
  Award,
  ArrowRight,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BookingWizard, CustomerData } from "@/components/booking/BookingWizard";
import { format } from "date-fns";

export default function CustomerHome() {
  const navigate = useNavigate();
  const { user, isTechnician, isAdmin, signOut } = useAuth();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);

  const [trackingEmail, setTrackingEmail] = useState("");
  const [repairs, setRepairs] = useState<any[]>([]);

  const [feedbackData, setFeedbackData] = useState({
    customer_name: "",
    customer_email: "",
    rating: 5,
    comment: "",
  });

  // Fetch customer data when user is logged in
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!user?.email) return;
      
      try {
        const { data: customer } = await supabase
          .from("customers")
          .select("name, email, phone")
          .eq("email", user.email)
          .maybeSingle();
        
        if (customer) {
          setCustomerData({
            name: customer.name,
            email: customer.email || user.email,
            phone: customer.phone,
          });
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
      }
    };

    fetchCustomerData();
  }, [user]);
  const handleBooking = async (data: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    deviceType: string;
    deviceBrand?: string;
    deviceModel?: string;
    issueDescription: string;
    preferredDate: Date;
    preferredTime: string;
  }) => {
    setLoading(true);

    try {
      const { error } = await supabase.from("appointments").insert([{
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        customer_phone: data.customerPhone,
        device_type: data.deviceType,
        device_brand: data.deviceBrand || null,
        device_model: data.deviceModel || null,
        issue_description: data.issueDescription,
        preferred_date: format(data.preferredDate, "yyyy-MM-dd"),
        preferred_time: data.preferredTime,
      }]);

      if (error) throw error;

      toast({
        title: "Prenotazione Inviata!",
        description: "Ti contatteremo presto per confermare l'appuntamento.",
      });

      setBookingOpen(false);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("email", trackingEmail)
        .maybeSingle();

      if (!customer) {
        toast({
          title: "Nessun risultato",
          description: "Nessuna riparazione trovata per questa email",
          variant: "destructive",
        });
        setRepairs([]);
        return;
      }

      const { data: devices } = await supabase
        .from("devices")
        .select("id")
        .eq("customer_id", customer.id);

      if (!devices || devices.length === 0) {
        setRepairs([]);
        return;
      }

      const deviceIds = devices.map((d) => d.id);

      const { data: repairData } = await supabase
        .from("repairs")
        .select(`
          *,
          device:devices (
            brand,
            model,
            device_type,
            reported_issue
          )
        `)
        .in("device_id", deviceIds)
        .order("created_at", { ascending: false });

      setRepairs(repairData || []);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("feedback").insert([feedbackData]);

      if (error) throw error;

      toast({
        title: "Grazie per il tuo feedback!",
        description: "La tua opinione ci aiuta a migliorare.",
      });

      setFeedbackOpen(false);
      setFeedbackData({
        customer_name: "",
        customer_email: "",
        rating: 5,
        comment: "",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      pending: "In attesa",
      in_progress: "In corso",
      completed: "Completata",
      cancelled: "Annullata",
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mesh Background */}
      <div className="fixed inset-0 -z-10 bg-gradient-mesh" />

      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <div className="p-2 bg-primary rounded-lg">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">TechRepair</span>
          </motion.div>
          <div className="flex gap-2 sm:gap-3 items-center">
            {user ? (
              <>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    onClick={() => navigate(isTechnician || isAdmin ? "/dashboard" : "/customer-dashboard")} 
                    variant="ghost" 
                    size="sm"
                    className="gap-2 group"
                  >
                    <Zap className="h-4 w-4 transition-all group-hover:text-primary group-hover:rotate-12" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    onClick={async () => {
                      await signOut();
                      navigate("/");
                    }} 
                    variant="ghost" 
                    size="sm"
                    className="gap-2 group text-muted-foreground hover:text-destructive"
                  >
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rotate-180" />
                    <span className="hidden sm:inline">Esci</span>
                  </Button>
                </motion.div>
              </>
            ) : (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  onClick={() => navigate("/auth")} 
                  variant="ghost" 
                  size="sm"
                  className="gap-2 group"
                >
                  <Shield className="h-4 w-4 transition-all group-hover:text-primary" />
                  <span className="hidden sm:inline">Accedi</span>
                </Button>
              </motion.div>
            )}
            <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
              <DialogTrigger asChild>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="sm" variant="glow" className="gap-2 group">
                    <Wrench className="h-4 w-4 transition-transform group-hover:rotate-12" />
                    <span className="hidden sm:inline">Prenota</span>
                  </Button>
                </motion.div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Prenota una Riparazione</DialogTitle>
                  <DialogDescription>
                    Compila il modulo in pochi semplici passaggi
                  </DialogDescription>
                </DialogHeader>
                <BookingWizard 
                  onSubmit={handleBooking}
                  isSubmitting={loading}
                  initialCustomerData={customerData}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-sm font-medium text-primary">Assistenza Professionale</span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Riparazioni{" "}
                <span className="text-primary">Professionali</span> per i Tuoi Dispositivi
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed">
                Esperti certificati, componenti originali e garanzia estesa. 
                Ripariamo smartphone, tablet, laptop e PC con cura e precisione.
              </p>

              <div className="flex flex-wrap gap-4">
                <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                  <DialogTrigger asChild>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button size="lg" variant="glow" className="group gap-3">
                        <Wrench className="h-5 w-5 transition-transform group-hover:rotate-12" />
                        <span>Prenota Riparazione</span>
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </motion.div>
                  </DialogTrigger>
                </Dialog>

                <Dialog open={trackingOpen} onOpenChange={setTrackingOpen}>
                  <DialogTrigger asChild>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button size="lg" variant="outline-glow" className="group gap-3">
                        <Clock className="h-5 w-5 transition-transform group-hover:rotate-[-15deg]" />
                        <span>Traccia Riparazione</span>
                      </Button>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Traccia la Tua Riparazione</DialogTitle>
                      <DialogDescription>Inserisci la tua email per vedere lo stato</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleTracking} className="space-y-4">
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          required
                          value={trackingEmail}
                          onChange={(e) => setTrackingEmail(e.target.value)}
                          placeholder="tua@email.com"
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Ricerca..." : "Cerca Riparazioni"}
                      </Button>
                    </form>

                    {repairs.length > 0 && (
                      <div className="space-y-4 mt-6">
                        <h3 className="font-semibold text-lg">Riparazioni Trovate</h3>
                        {repairs.map((repair) => (
                          <Card key={repair.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                {repair.status === "completed" ? (
                                  <CheckCircle2 className="h-6 w-6 text-success mt-1" />
                                ) : (
                                  <Clock className="h-6 w-6 text-warning mt-1" />
                                )}
                                <div>
                                  <h4 className="font-semibold">
                                    {repair.device.brand} {repair.device.model}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {repair.device.reported_issue}
                                  </p>
                                  <p className="text-sm font-medium text-primary mt-1">
                                    Stato: {getStatusBadge(repair.status)}
                                  </p>
                                </div>
                              </div>
                              {repair.final_cost && (
                                <span className="text-xl font-bold text-primary">
                                  €{repair.final_cost.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex flex-wrap gap-8 pt-4">
                {[
                  { value: "15+", label: "Anni Esperienza" },
                  { value: "10K+", label: "Dispositivi Riparati" },
                  { value: "98%", label: "Clienti Soddisfatti" },
                ].map((stat, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 + idx * 0.1 }}
                  >
                    <div className="text-3xl font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right Content - Feature Cards */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="grid gap-4">
                {[
                  {
                    icon: Shield,
                    title: "Garanzia 90 Giorni",
                    desc: "Su tutti i componenti e manodopera",
                  },
                  {
                    icon: Zap,
                    title: "Riparazione Express",
                    desc: "Servizio stesso giorno disponibile",
                  },
                  {
                    icon: Award,
                    title: "Tecnici Certificati",
                    desc: "Formazione continua e certificazioni",
                  },
                ].map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 + idx * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <Card className="p-6 bg-gradient-card border-border hover:border-primary/50 transition-all">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <feature.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground">{feature.desc}</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-foreground mb-4">Perché Scegliere TechRepair</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Qualità, affidabilità e trasparenza in ogni intervento
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Check,
                title: "Diagnosi Gratuita",
                desc: "Valutazione completa del dispositivo senza costi aggiuntivi",
              },
              {
                icon: Shield,
                title: "Componenti Originali",
                desc: "Utilizziamo solo ricambi certificati e di qualità",
              },
              {
                icon: Clock,
                title: "Tempi Certi",
                desc: "Stima accurata dei tempi di riparazione comunicata in anticipo",
              },
              {
                icon: Award,
                title: "Tecnici Esperti",
                desc: "Team certificato con oltre 15 anni di esperienza",
              },
              {
                icon: CheckCircle2,
                title: "Garanzia Estesa",
                desc: "90 giorni di garanzia su tutte le riparazioni",
              },
              {
                icon: Star,
                title: "Soddisfazione Garantita",
                desc: "98% di recensioni positive dai nostri clienti",
              },
            ].map((service, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <Card className="p-6 h-full bg-background hover:shadow-lg transition-shadow">
                  <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                    <service.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">{service.title}</h3>
                  <p className="text-muted-foreground">{service.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact & Feedback Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="p-8 h-full">
                <h2 className="text-3xl font-bold text-foreground mb-2">Contattaci</h2>
                <p className="text-muted-foreground mb-8">Siamo qui per aiutarti</p>

                <div className="space-y-6">
                  {[
                    { icon: MapPin, label: "Indirizzo", value: "Via Roma 123, 00100 Roma" },
                    { icon: Phone, label: "Telefono", value: "+39 123 456 7890" },
                    { icon: Mail, label: "Email", value: "info@techrepair.it" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="text-muted-foreground">{item.value}</p>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Orari di Apertura</p>
                      <p className="text-muted-foreground">Lun-Ven: 9:00-18:00</p>
                      <p className="text-muted-foreground">Sabato: 9:00-13:00</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Feedback */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="p-8 h-full">
                <h2 className="text-3xl font-bold text-foreground mb-2">Lascia un Feedback</h2>
                <p className="text-muted-foreground mb-8">La tua opinione è importante</p>

                <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                  <DialogTrigger asChild>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button size="lg" variant="shine" className="w-full mb-6 gap-3">
                        <Star className="h-5 w-5 transition-transform group-hover:rotate-12" />
                        <span>Scrivi una Recensione</span>
                      </Button>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Lascia il tuo Feedback</DialogTitle>
                      <DialogDescription>
                        La tua opinione ci aiuta a migliorare i nostri servizi
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleFeedback} className="space-y-4">
                      <div>
                        <Label>Nome</Label>
                        <Input
                          required
                          value={feedbackData.customer_name}
                          onChange={(e) =>
                            setFeedbackData({ ...feedbackData, customer_name: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          required
                          value={feedbackData.customer_email}
                          onChange={(e) =>
                            setFeedbackData({ ...feedbackData, customer_email: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Valutazione</Label>
                        <Select
                          value={feedbackData.rating.toString()}
                          onValueChange={(value) =>
                            setFeedbackData({ ...feedbackData, rating: parseInt(value) })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">⭐⭐⭐⭐⭐ Eccellente</SelectItem>
                            <SelectItem value="4">⭐⭐⭐⭐ Ottimo</SelectItem>
                            <SelectItem value="3">⭐⭐⭐ Buono</SelectItem>
                            <SelectItem value="2">⭐⭐ Sufficiente</SelectItem>
                            <SelectItem value="1">⭐ Scarso</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Commento</Label>
                        <Textarea
                          rows={4}
                          value={feedbackData.comment}
                          onChange={(e) =>
                            setFeedbackData({ ...feedbackData, comment: e.target.value })
                          }
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Invio..." : "Invia Feedback"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                      ))}
                    </div>
                    <span className="font-semibold text-foreground">4.9/5.0</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Basato su oltre 1,200 recensioni verificate
                  </p>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Wrench className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="font-bold text-foreground">TechRepair CRM</div>
                <div className="text-sm text-muted-foreground">Riparazioni dal 2010</div>
              </div>
            </div>

            <div className="text-center md:text-right">
              <p className="text-sm text-muted-foreground">
                © 2024 TechRepair. Tutti i diritti riservati.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
