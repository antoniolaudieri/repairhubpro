import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useRoleBasedRedirect } from "@/hooks/useRoleBasedRedirect";
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
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  Cpu,
  Heart,
  MessageCircle,
  Facebook,
  Instagram,
  Twitter,
  Sparkles,
  Store,
  Building2,
  FileText,
} from "lucide-react";
import { PartnersMap } from "@/components/maps/PartnersMap";
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
import { UsedDevicesCarousel } from "@/components/usato/UsedDevicesCarousel";
import { format } from "date-fns";

// Floating device icons component
const FloatingDevices = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div
      className="absolute top-20 right-[15%] text-primary/20"
      animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      <Smartphone className="h-16 w-16" />
    </motion.div>
    <motion.div
      className="absolute top-40 right-[5%] text-accent/20"
      animate={{ y: [10, -10, 10], rotate: [0, -5, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
    >
      <Tablet className="h-20 w-20" />
    </motion.div>
    <motion.div
      className="absolute bottom-32 right-[20%] text-primary/15"
      animate={{ y: [-15, 15, -15], rotate: [0, 3, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
    >
      <Laptop className="h-24 w-24" />
    </motion.div>
    <motion.div
      className="absolute top-60 left-[5%] text-info/15 hidden lg:block"
      animate={{ y: [5, -15, 5], rotate: [0, -3, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
    >
      <Monitor className="h-14 w-14" />
    </motion.div>
  </div>
);

// Animated counter component
const AnimatedCounter = ({ value }: { value: string }) => {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, type: "spring" }}
      className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gradient"
    >
      {value}
    </motion.span>
  );
};

// Aurora background component
const AuroraBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-mesh animate-aurora" />
    <div className="absolute inset-0 bg-pattern-dots opacity-30" />
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-slow" />
    <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-float-medium" />
    <div className="absolute top-1/2 right-0 w-64 h-64 bg-info/10 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '2s' }} />
  </div>
);

export default function CustomerHome() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { getRedirectPath } = useRoleBasedRedirect();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);

  const [trackingEmail, setTrackingEmail] = useState("");
  const [repairs, setRepairs] = useState<any[]>([]);
  const [selectedRepair, setSelectedRepair] = useState<any | null>(null);

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
    cornerId: string;
    customerLatitude?: number;
    customerLongitude?: number;
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
        corner_id: data.cornerId,
        customer_latitude: data.customerLatitude || null,
        customer_longitude: data.customerLongitude || null,
      }]);

      if (error) throw error;

      toast({
        title: "Prenotazione Inviata!",
        description: "Il Corner selezionato riceverà la tua richiesta e ti contatterà presto.",
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
      const { data, error } = await supabase.functions.invoke('track-repairs', {
        body: { email: trackingEmail }
      });

      if (error) throw error;

      if (!data.repairs || data.repairs.length === 0) {
        toast({
          title: "Nessun risultato",
          description: "Nessuna riparazione trovata per questa email",
          variant: "destructive",
        });
        setRepairs([]);
        return;
      }

      setRepairs(data.repairs);
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
      waiting_for_parts: "In attesa ricambi",
      completed: "Completata",
      delivered: "Consegnata",
      cancelled: "Annullata",
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen bg-background">
      <AuroraBackground />

      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="border-b border-border/50 bg-background/60 backdrop-blur-xl sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <div className="relative">
              <div className="p-2.5 bg-gradient-primary rounded-xl shadow-glow">
                <Wrench className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="absolute -inset-1 bg-gradient-primary rounded-xl blur opacity-30 animate-pulse-glow" />
            </div>
            <span className="font-bold text-xl text-foreground">LabLinkRiparo</span>
          </motion.div>

          <div className="flex gap-2 sm:gap-3 items-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={() => navigate("/diventa-partner")} 
                variant="outline" 
                size="sm"
                className="gap-2 group border-success/30 text-success hover:bg-success/10"
                title="Diventa un partner della nostra rete"
              >
                <Award className="h-4 w-4 transition-all group-hover:rotate-12" />
                <span className="hidden md:inline">Diventa Partner</span>
                <span className="md:hidden sr-only">Diventa Partner</span>
              </Button>
            </motion.div>
            {user ? (
              <>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    onClick={() => navigate(getRedirectPath())}
                    variant="ghost" 
                    size="sm"
                    className="gap-2 group"
                    title="Vai alla tua Dashboard"
                  >
                    <Zap className="h-4 w-4 transition-all group-hover:text-primary group-hover:rotate-12" />
                    <span className="hidden sm:inline">Dashboard</span>
                    <span className="sm:hidden sr-only">Dashboard</span>
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
                    title="Esci dall'account"
                  >
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rotate-180" />
                    <span className="hidden sm:inline">Esci</span>
                    <span className="sm:hidden sr-only">Esci</span>
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
                  title="Accedi al tuo account"
                >
                  <Shield className="h-4 w-4 transition-all group-hover:text-primary" />
                  <span className="hidden sm:inline">Accedi</span>
                  <span className="sm:hidden sr-only">Accedi</span>
                </Button>
              </motion.div>
            )}
            <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
              <DialogTrigger asChild>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="sm" variant="glow" className="gap-2 group relative overflow-hidden" title="Prenota una riparazione">
                    <Wrench className="h-4 w-4 transition-transform group-hover:rotate-12" />
                    <span className="hidden sm:inline">Prenota</span>
                    <span className="sm:hidden sr-only">Prenota</span>
                    <div className="absolute inset-0 bg-gradient-shine animate-shimmer opacity-0 group-hover:opacity-100" />
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
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        <FloatingDevices />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              {/* Badge */}
              <motion.div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border-primary/20"
                animate={{ boxShadow: ["0 0 20px hsl(217 91% 60% / 0.2)", "0 0 30px hsl(217 91% 60% / 0.4)", "0 0 20px hsl(217 91% 60% / 0.2)"] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="h-4 w-4 text-primary animate-bounce-gentle" />
                <span className="text-sm font-medium text-primary">Assistenza Professionale</span>
              </motion.div>

              {/* Main Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight">
                Riparazioni{" "}
                <span className="text-gradient-accent relative">
                  Professionali
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                    <motion.path
                      d="M2 10C50 4 100 2 150 6C200 10 250 8 298 4"
                      stroke="hsl(var(--primary))"
                      strokeWidth="3"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </svg>
                </span>
                <br />
                per i Tuoi Dispositivi
              </h1>

              {/* Description */}
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-xl">
                Esperti certificati, componenti originali e garanzia estesa. 
                Ripariamo smartphone, tablet, laptop e PC con cura e precisione.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                  <DialogTrigger asChild>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button size="lg" variant="glow" className="group gap-3 w-full sm:w-auto relative overflow-hidden">
                        <Wrench className="h-5 w-5 transition-transform group-hover:rotate-12" />
                        <span>Prenota Riparazione</span>
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                        <motion.div 
                          className="absolute inset-0 bg-primary-foreground/10"
                          initial={{ x: "-100%" }}
                          whileHover={{ x: "100%" }}
                          transition={{ duration: 0.5 }}
                        />
                      </Button>
                    </motion.div>
                  </DialogTrigger>
                </Dialog>

                <Dialog open={trackingOpen} onOpenChange={setTrackingOpen}>
                  <DialogTrigger asChild>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button size="lg" variant="outline" className="group gap-3 w-full sm:w-auto glass-card hover:border-primary/50">
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
                          <motion.div
                            key={repair.id}
                            initial={false}
                            animate={{ height: "auto" }}
                          >
                            <Card 
                              className={`p-4 cursor-pointer transition-all hover:shadow-md ${selectedRepair?.id === repair.id ? 'ring-2 ring-primary' : ''}`}
                              onClick={() => setSelectedRepair(selectedRepair?.id === repair.id ? null : repair)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                  {repair.status === "completed" ? (
                                    <CheckCircle2 className="h-6 w-6 text-success mt-1" />
                                  ) : repair.status === "in_progress" ? (
                                    <Wrench className="h-6 w-6 text-primary mt-1 animate-pulse" />
                                  ) : (
                                    <Clock className="h-6 w-6 text-warning mt-1" />
                                  )}
                                  <div className="flex-1">
                                    <h4 className="font-semibold">
                                      {repair.device?.brand} {repair.device?.model}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {repair.device?.reported_issue}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        repair.status === 'completed' ? 'bg-success/20 text-success' :
                                        repair.status === 'in_progress' ? 'bg-primary/20 text-primary' :
                                        repair.status === 'waiting_for_parts' ? 'bg-warning/20 text-warning' :
                                        'bg-muted text-muted-foreground'
                                      }`}>
                                        {getStatusBadge(repair.status)}
                                      </span>
                                      {repair.order && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-info/20 text-info font-medium">
                                          Ordine: {repair.order.status === 'received' ? 'Ricevuto' : repair.order.status === 'ordered' ? 'In arrivo' : 'In elaborazione'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {repair.final_cost && (
                                    <span className="text-xl font-bold text-primary">
                                      €{repair.final_cost.toFixed(2)}
                                    </span>
                                  )}
                                  <ArrowRight className={`h-5 w-5 text-muted-foreground transition-transform ${selectedRepair?.id === repair.id ? 'rotate-90' : ''}`} />
                                </div>
                              </div>

                              {/* Expanded Details */}
                              <AnimatePresence>
                                {selectedRepair?.id === repair.id && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-4 pt-4 border-t border-border space-y-4">
                                      {/* Device Photo */}
                                      {repair.device?.photo_url && (
                                        <div className="flex justify-center">
                                          <img 
                                            src={repair.device.photo_url} 
                                            alt="Dispositivo" 
                                            className="w-32 h-32 object-cover rounded-lg border"
                                          />
                                        </div>
                                      )}

                                      {/* Timeline */}
                                      <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="p-3 rounded-lg bg-muted/50">
                                          <p className="text-muted-foreground text-xs">Creata il</p>
                                          <p className="font-medium">{new Date(repair.created_at).toLocaleDateString('it-IT')}</p>
                                        </div>
                                        {repair.started_at && (
                                          <div className="p-3 rounded-lg bg-muted/50">
                                            <p className="text-muted-foreground text-xs">Iniziata il</p>
                                            <p className="font-medium">{new Date(repair.started_at).toLocaleDateString('it-IT')}</p>
                                          </div>
                                        )}
                                        {repair.completed_at && (
                                          <div className="p-3 rounded-lg bg-success/10">
                                            <p className="text-muted-foreground text-xs">Completata il</p>
                                            <p className="font-medium text-success">{new Date(repair.completed_at).toLocaleDateString('it-IT')}</p>
                                          </div>
                                        )}
                                        {repair.delivered_at && (
                                          <div className="p-3 rounded-lg bg-accent/10">
                                            <p className="text-muted-foreground text-xs">Consegnata il</p>
                                            <p className="font-medium text-accent">{new Date(repair.delivered_at).toLocaleDateString('it-IT')}</p>
                                          </div>
                                        )}
                                      </div>

                                      {/* Diagnosis */}
                                      {repair.diagnosis && (
                                        <div className="p-3 rounded-lg bg-muted/50">
                                          <p className="text-muted-foreground text-xs mb-1">Diagnosi</p>
                                          <p className="text-sm">{repair.diagnosis}</p>
                                        </div>
                                      )}

                                      {/* Repair Notes */}
                                      {repair.repair_notes && (
                                        <div className="p-3 rounded-lg bg-muted/50">
                                          <p className="text-muted-foreground text-xs mb-1">Note Riparazione</p>
                                          <p className="text-sm">{repair.repair_notes}</p>
                                        </div>
                                      )}

                                      {/* Order Tracking */}
                                      {repair.order?.tracking_number && (
                                        <div className="p-3 rounded-lg bg-info/10">
                                          <p className="text-muted-foreground text-xs mb-1">Tracking Ordine Ricambi</p>
                                          <p className="font-mono text-sm">{repair.order.tracking_number}</p>
                                        </div>
                                      )}

                                      {/* Costs */}
                                      <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5">
                                        <span className="text-sm font-medium">Costo Totale</span>
                                        <span className="text-xl font-bold text-primary">
                                          €{(repair.final_cost || repair.estimated_cost || 0).toFixed(2)}
                                          {!repair.final_cost && repair.estimated_cost && (
                                            <span className="text-xs text-muted-foreground ml-1">(stimato)</span>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-8 border-t border-border/50">
                {[
                  { value: "15+", label: "Anni Esperienza" },
                  { value: "10K+", label: "Dispositivi Riparati" },
                  { value: "98%", label: "Clienti Soddisfatti" },
                ].map((stat, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 + idx * 0.1 }}
                    className="text-center sm:text-left"
                  >
                    <AnimatedCounter value={stat.value} />
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</div>
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
              {/* Decorative circle */}
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 rounded-3xl blur-2xl" />
              
              <div className="relative grid gap-4">
                {[
                  {
                    icon: Shield,
                    title: "Garanzia 90 Giorni",
                    desc: "Su tutti i componenti e manodopera",
                    color: "primary",
                  },
                  {
                    icon: Zap,
                    title: "Riparazione Express",
                    desc: "Servizio stesso giorno disponibile",
                    color: "warning",
                  },
                  {
                    icon: Award,
                    title: "Tecnici Certificati",
                    desc: "Formazione continua e certificazioni",
                    color: "accent",
                  },
                ].map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 + idx * 0.15 }}
                    whileHover={{ scale: 1.02, x: -5 }}
                    className="group"
                  >
                    <Card className="p-5 glass-card-strong border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
                      <div className="flex items-start gap-4">
                        <motion.div 
                          className={`p-3 rounded-xl bg-${feature.color}/10 group-hover:bg-${feature.color}/20 transition-colors`}
                          whileHover={{ rotate: [0, -10, 10, 0] }}
                          transition={{ duration: 0.5 }}
                        >
                          <feature.icon className={`h-6 w-6 text-${feature.color}`} />
                        </motion.div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground">{feature.desc}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Trust badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="mt-6 flex items-center justify-center gap-3 p-4 rounded-2xl glass-card"
              >
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-primary border-2 border-background flex items-center justify-center text-xs font-bold text-primary-foreground">
                      {['M', 'G', 'S', 'A'][i]}
                    </div>
                  ))}
                </div>
                <div className="text-sm">
                  <div className="font-medium text-foreground">+1,200 clienti soddisfatti</div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    <span>4.9/5 recensioni</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Partners Map Section */}
      <section className="py-16 sm:py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
            >
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">La Nostra Rete</span>
            </motion.div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Trova un <span className="text-gradient">Partner</span> Vicino a Te
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Corner e Centri Assistenza certificati in tutta Italia
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <PartnersMap />
          </motion.div>
        </div>
      </section>

      {/* Used Devices Carousel */}
      <UsedDevicesCarousel />

      {/* DOOH Advertising Promo Section */}
      <section className="py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-warning/5 via-transparent to-orange-500/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 border border-warning/20 mb-6"
            >
              <Monitor className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium text-warning">Pubblicità Locale</span>
            </motion.div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Promuovi la tua <span className="text-warning">Attività</span> sui nostri Monitor
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Hai un negozio, bar o attività locale? Sfrutta i monitor presenti nei nostri Corner partner 
              per pubblicizzare le tue offerte e raggiungere clienti reali nella tua zona.
            </p>
          </motion.div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { icon: Monitor, title: "Monitor in Negozi", desc: "Visibilità in punti strategici" },
              { icon: Sparkles, title: "Promuovi Sconti", desc: "Offerte e promozioni locali" },
              { icon: MapPin, title: "Targeting Locale", desc: "Scegli i Corner della tua zona" },
              { icon: Clock, title: "Flessibilità", desc: "Da 1 settimana a 1 anno" },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <Card className="p-5 glass-card border-warning/20 hover:border-warning/40 transition-all text-center">
                  <motion.div 
                    className="p-3 bg-warning/10 rounded-xl w-fit mx-auto mb-3"
                    whileHover={{ scale: 1.1 }}
                  >
                    <item.icon className="h-7 w-7 text-warning" />
                  </motion.div>
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* CTA Button */}
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button 
              size="lg" 
              onClick={() => navigate("/ads/acquista")}
              className="bg-gradient-to-r from-warning to-orange-500 hover:from-warning/90 hover:to-orange-500/90 text-warning-foreground shadow-lg hover:shadow-xl transition-all"
            >
              <Store className="h-5 w-5 mr-2" />
              Promuovi la tua Attività
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Services Section - Bento Grid */}
      <section className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-muted/30" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12 sm:mb-16"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
            >
              <Cpu className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">I Nostri Servizi</span>
            </motion.div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Perché Scegliere <span className="text-gradient">LabLinkRiparo</span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Qualità, affidabilità e trasparenza in ogni intervento
            </p>
          </motion.div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Large featured card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -5 }}
              className="md:col-span-2 lg:col-span-1 lg:row-span-2"
            >
              <Card className="p-6 sm:p-8 h-full glass-card-strong border-border/50 hover:border-primary/30 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-primary opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity" />
                <div className="relative">
                  <motion.div 
                    className="p-4 bg-gradient-primary rounded-2xl w-fit mb-6 shadow-glow"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Check className="h-8 w-8 text-primary-foreground" />
                  </motion.div>
                  <h3 className="font-bold text-xl sm:text-2xl text-foreground mb-3">Diagnosi Gratuita</h3>
                  <p className="text-muted-foreground mb-6">
                    Valutazione completa del dispositivo senza costi aggiuntivi. Ti forniamo un preventivo dettagliato prima di procedere.
                  </p>
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <span>Scopri di più</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Regular cards */}
            {[
              { icon: Shield, title: "Componenti Originali", desc: "Utilizziamo solo ricambi certificati e di qualità" },
              { icon: Clock, title: "Tempi Certi", desc: "Stima accurata dei tempi di riparazione" },
              { icon: Award, title: "Tecnici Esperti", desc: "Team certificato con oltre 15 anni di esperienza" },
              { icon: CheckCircle2, title: "Garanzia Estesa", desc: "90 giorni di garanzia su tutte le riparazioni" },
            ].map((service, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <Card className="p-5 sm:p-6 h-full glass-card border-border/50 hover:border-primary/30 transition-all group">
                  <motion.div 
                    className="p-3 bg-primary/10 rounded-xl w-fit mb-4 group-hover:bg-primary/20 transition-colors"
                    whileHover={{ scale: 1.1 }}
                  >
                    <service.icon className="h-6 w-6 text-primary" />
                  </motion.div>
                  <h3 className="font-semibold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">{service.title}</h3>
                  <p className="text-muted-foreground text-sm">{service.desc}</p>
                </Card>
              </motion.div>
            ))}

            {/* Stats card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="md:col-span-2 lg:col-span-1"
            >
              <Card className="p-5 sm:p-6 h-full bg-gradient-primary text-primary-foreground relative overflow-hidden">
                <div className="absolute inset-0 bg-pattern-dots opacity-10" />
                <div className="relative flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-3">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                        >
                          <Star className="h-6 w-6 fill-primary-foreground/90 text-primary-foreground/90" />
                        </motion.div>
                      ))}
                    </div>
                    <div className="text-4xl font-bold mb-1">98%</div>
                    <div className="text-primary-foreground/80">Soddisfazione Garantita</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact & Feedback Section */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Contact */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="p-6 sm:p-8 h-full glass-card-strong border-border/50 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Contatti</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Contattaci</h2>
                  <p className="text-muted-foreground mb-8">Siamo qui per aiutarti</p>

                  <div className="space-y-5">
                    {[
                      { icon: MapPin, label: "Indirizzo", value: "Via Alessandro Manzoni 7, 18100 Imperia IM" },
                      { icon: Mail, label: "Email", value: "info@lablinkriparo.com" },
                      { icon: FileText, label: "P.IVA", value: "01538960087" },
                    ].map((item, idx) => (
                      <motion.div 
                        key={idx} 
                        className="flex items-start gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group"
                        whileHover={{ x: 5 }}
                      >
                        <div className="p-2.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                          <item.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{item.label}</p>
                          <p className="font-medium text-foreground">{item.value}</p>
                        </div>
                      </motion.div>
                    ))}

                    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                      <div className="p-2.5 bg-primary/10 rounded-lg">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Orari di Apertura</p>
                        <p className="font-medium text-foreground">Lun-Ven: 9:00-18:00</p>
                        <p className="font-medium text-foreground">Sabato: 9:00-13:00</p>
                      </div>
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
              <Card className="p-6 sm:p-8 h-full glass-card-strong border-border/50 relative overflow-hidden">
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-4">
                    <Heart className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium text-accent">Feedback</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Lascia un Feedback</h2>
                  <p className="text-muted-foreground mb-8">La tua opinione è importante</p>

                  <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                    <DialogTrigger asChild>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button size="lg" className="w-full mb-6 gap-3 bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 text-accent-foreground relative overflow-hidden group">
                          <Star className="h-5 w-5 transition-transform group-hover:rotate-12" />
                          <span>Scrivi una Recensione</span>
                          <motion.div 
                            className="absolute inset-0 bg-accent-foreground/10"
                            initial={{ x: "-100%" }}
                            whileHover={{ x: "100%" }}
                            transition={{ duration: 0.5 }}
                          />
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

                  {/* Rating display */}
                  <div className="p-4 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                          >
                            <Star className="h-6 w-6 fill-warning text-warning" />
                          </motion.div>
                        ))}
                      </div>
                      <span className="text-2xl font-bold text-foreground">4.9/5.0</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Basato su oltre <span className="font-semibold text-foreground">1,200</span> recensioni verificate
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="bg-sidebar text-sidebar-foreground">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              {/* Brand */}
              <div className="lg:col-span-2">
                <motion.div 
                  className="flex items-center gap-3 mb-4"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="p-2.5 bg-sidebar-accent rounded-xl">
                    <Wrench className="h-5 w-5 text-sidebar-accent-foreground" />
                  </div>
                  <span className="font-bold text-xl">LabLinkRiparo</span>
                </motion.div>
                <p className="text-sidebar-foreground/70 mb-6 max-w-sm">
                  Il tuo partner di fiducia per riparazioni professionali dal 2010. Qualità, affidabilità e servizio impeccabile.
                </p>
                <div className="flex gap-3">
                  {[Facebook, Instagram, Twitter].map((Icon, idx) => (
                    <motion.a
                      key={idx}
                      href="#"
                      className="p-2.5 rounded-lg bg-sidebar-border/50 hover:bg-sidebar-accent transition-colors"
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Icon className="h-5 w-5" />
                    </motion.a>
                  ))}
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="font-semibold mb-4">Link Utili</h4>
                <ul className="space-y-3 text-sidebar-foreground/70">
                  {["Servizi", "Chi Siamo", "Contatti", "FAQ"].map((link, idx) => (
                    <li key={idx}>
                      <a href="#" className="hover:text-sidebar-foreground transition-colors hover:translate-x-1 inline-block">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h4 className="font-semibold mb-4">Contatti</h4>
                <ul className="space-y-3 text-sidebar-foreground/70">
                  <li className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <span>Via Alessandro Manzoni 7, 18100 Imperia IM</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>info@lablinkriparo.com</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>P.IVA 01538960087</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom */}
            <div className="pt-8 border-t border-sidebar-border flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-sidebar-foreground/60">
                © 2024 LabLinkRiparo. Tutti i diritti riservati.
              </p>
              <div className="flex gap-6 text-sm text-sidebar-foreground/60">
                <a href="#" className="hover:text-sidebar-foreground transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-sidebar-foreground transition-colors">Termini di Servizio</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
