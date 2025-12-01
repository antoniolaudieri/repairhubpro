import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  Calendar,
  Phone,
  Mail,
  MapPin,
  Shield,
  Zap,
  Award,
  Sparkles,
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

export default function CustomerHome() {
  const navigate = useNavigate();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Booking form
  const [bookingData, setBookingData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    device_type: "",
    device_brand: "",
    device_model: "",
    issue_description: "",
    preferred_date: "",
    preferred_time: "",
  });

  // Tracking
  const [trackingEmail, setTrackingEmail] = useState("");
  const [repairs, setRepairs] = useState<any[]>([]);

  // Feedback
  const [feedbackData, setFeedbackData] = useState({
    customer_name: "",
    customer_email: "",
    rating: 5,
    comment: "",
  });

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("appointments").insert([bookingData]);

      if (error) throw error;

      toast({
        title: "Prenotazione Inviata!",
        description: "Ti contatteremo presto per confermare l'appuntamento.",
      });

      setBookingOpen(false);
      setBookingData({
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        device_type: "",
        device_brand: "",
        device_model: "",
        issue_description: "",
        preferred_date: "",
        preferred_time: "",
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background Gradients */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-0 left-1/2 w-[600px] h-[600px] bg-info/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50 shadow-md"
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <motion.div
            className="flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Wrench className="h-7 w-7 text-primary" />
            </motion.div>
            <span className="font-bold text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              TechRepair
            </span>
          </motion.div>
          <div className="flex gap-3">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={() => navigate("/auth")} variant="outline" className="shadow-md">
                Accedi
              </Button>
            </motion.div>
            <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
              <DialogTrigger asChild>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button className="shadow-glow">
                    <Calendar className="mr-2 h-4 w-4" />
                    Prenota Ora
                  </Button>
                </motion.div>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Prenota una Riparazione</DialogTitle>
                  <DialogDescription>
                    Compila il form e ti contatteremo per confermare
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBooking} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nome Completo *</Label>
                      <Input
                        required
                        value={bookingData.customer_name}
                        onChange={(e) =>
                          setBookingData({ ...bookingData, customer_name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        required
                        value={bookingData.customer_email}
                        onChange={(e) =>
                          setBookingData({ ...bookingData, customer_email: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Telefono *</Label>
                      <Input
                        type="tel"
                        required
                        value={bookingData.customer_phone}
                        onChange={(e) =>
                          setBookingData({ ...bookingData, customer_phone: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Tipo Dispositivo *</Label>
                      <Select
                        value={bookingData.device_type}
                        onValueChange={(value) =>
                          setBookingData({ ...bookingData, device_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="smartphone">Smartphone</SelectItem>
                          <SelectItem value="tablet">Tablet</SelectItem>
                          <SelectItem value="laptop">Laptop</SelectItem>
                          <SelectItem value="pc">PC</SelectItem>
                          <SelectItem value="altro">Altro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Marca</Label>
                      <Input
                        value={bookingData.device_brand}
                        onChange={(e) =>
                          setBookingData({ ...bookingData, device_brand: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Modello</Label>
                      <Input
                        value={bookingData.device_model}
                        onChange={(e) =>
                          setBookingData({ ...bookingData, device_model: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Descrizione Problema *</Label>
                    <Textarea
                      required
                      rows={3}
                      value={bookingData.issue_description}
                      onChange={(e) =>
                        setBookingData({ ...bookingData, issue_description: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Data Preferita *</Label>
                      <Input
                        type="date"
                        required
                        min={new Date().toISOString().split("T")[0]}
                        value={bookingData.preferred_date}
                        onChange={(e) =>
                          setBookingData({ ...bookingData, preferred_date: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Orario Preferito *</Label>
                      <Select
                        value={bookingData.preferred_time}
                        onValueChange={(value) =>
                          setBookingData({ ...bookingData, preferred_time: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="09:00-11:00">09:00 - 11:00</SelectItem>
                          <SelectItem value="11:00-13:00">11:00 - 13:00</SelectItem>
                          <SelectItem value="14:00-16:00">14:00 - 16:00</SelectItem>
                          <SelectItem value="16:00-18:00">16:00 - 18:00</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Invio..." : "Invia Prenotazione"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-20">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
            className="inline-block relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-3xl blur-2xl opacity-50 animate-glow-pulse" />
            <div className="relative bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm p-8 rounded-3xl shadow-glow-lg">
              <Wrench className="h-24 w-24 text-primary" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-7xl font-bold mt-8 mb-6"
          >
            <span className="bg-gradient-to-r from-primary via-info to-accent bg-clip-text text-transparent animate-fade-in">
              TechRepair CRM
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto"
          >
            Riparazioni professionali per smartphone, tablet, PC e laptop.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex items-center justify-center gap-2 mb-10"
          >
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Veloce. Affidabile. Garantito.
            </span>
            <Sparkles className="h-6 w-6 text-accent animate-pulse" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex gap-4 justify-center flex-wrap"
          >
            <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
              <DialogTrigger asChild>
                <motion.div whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="text-lg px-8 py-7 shadow-glow-lg hover:shadow-glow animate-fade-in-up">
                    <Calendar className="mr-2 h-6 w-6" />
                    Prenota Riparazione
                  </Button>
                </motion.div>
              </DialogTrigger>
            </Dialog>

            <Dialog open={trackingOpen} onOpenChange={setTrackingOpen}>
              <DialogTrigger asChild>
                <motion.div whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" variant="outline" className="text-lg px-8 py-7 shadow-xl border-2 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                    <Clock className="mr-2 h-6 w-6" />
                    Traccia Riparazione
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
          </motion.div>
        </div>

        {/* Features */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.2,
              },
            },
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20"
        >
          {[
            {
              icon: Shield,
              title: "Garanzia 90 Giorni",
              desc: "Tutte le riparazioni sono coperte da garanzia estesa di 90 giorni sui ricambi e manodopera",
              color: "text-primary",
            },
            {
              icon: Zap,
              title: "Riparazioni Express",
              desc: "Riparazioni rapide in giornata per i problemi più comuni. Servizio prioritario disponibile",
              color: "text-warning",
            },
            {
              icon: Award,
              title: "Tecnici Certificati",
              desc: "Team di tecnici esperti e certificati con oltre 15 anni di esperienza nel settore",
              color: "text-accent",
            },
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              variants={{
                hidden: { opacity: 0, y: 50 },
                visible: { opacity: 1, y: 0 },
              }}
              whileHover={{ y: -10, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="p-8 h-full bg-gradient-card shadow-xl hover:shadow-glow-lg border-2 transition-all duration-300">
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.2 }}
                  transition={{ duration: 0.6 }}
                >
                  <feature.icon className={`h-14 w-14 mb-4 ${feature.color}`} />
                </motion.div>
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Contact & Feedback */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
            <Card className="p-8 h-full shadow-xl hover:shadow-glow border-2">
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
                Contattaci
              </h2>
              <div className="space-y-6">
                {[
                  { icon: MapPin, label: "Indirizzo", value: "Via Roma 123, 00100 Roma" },
                  { icon: Phone, label: "Telefono", value: "+39 123 456 7890" },
                  { icon: Mail, label: "Email", value: "info@techrepair.it" },
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ x: 10 }}
                    className="flex items-start gap-3 group"
                  >
                    <item.icon className="h-6 w-6 text-primary mt-1 group-hover:scale-125 transition-transform" />
                    <div>
                      <p className="font-semibold text-lg">{item.label}</p>
                      <p className="text-muted-foreground">{item.value}</p>
                    </div>
                  </motion.div>
                ))}
                <motion.div whileHover={{ x: 10 }} className="flex items-start gap-3 group">
                  <Clock className="h-6 w-6 text-primary mt-1 group-hover:scale-125 transition-transform" />
                  <div>
                    <p className="font-semibold text-lg">Orari</p>
                    <p className="text-muted-foreground">Lun-Ven: 9:00-18:00</p>
                    <p className="text-muted-foreground">Sab: 9:00-13:00</p>
                  </div>
                </motion.div>
              </div>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
            <Card className="p-8 h-full shadow-xl hover:shadow-glow border-2">
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                Lascia un Feedback
              </h2>
              <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                <DialogTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button className="w-full" size="lg">
                      <Star className="mr-2 h-5 w-5" />
                      Scrivi Recensione
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
              <p className="text-muted-foreground text-center mt-4">
                Il tuo feedback è fondamentale per noi!
              </p>
            </Card>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="border-t bg-background/80 backdrop-blur-xl mt-20 shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground font-medium">
            © 2024 TechRepair CRM. Tutti i diritti riservati.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Riparazioni professionali dal 2010
          </p>
        </div>
      </motion.footer>
    </div>
  );
}
