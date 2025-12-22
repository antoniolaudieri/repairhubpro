import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { User, Settings2, Calendar, Shield, MessageSquare, Phone, Mail, Gift } from "lucide-react";

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    address: string | null;
    notes: string | null;
  };
  onSuccess: () => void;
}

const ACQUISITION_SOURCES = [
  { value: "walk_in", label: "Walk-in" },
  { value: "referral", label: "Passaparola" },
  { value: "google", label: "Google" },
  { value: "social", label: "Social Media" },
  { value: "corner", label: "Corner Partner" },
  { value: "campaign", label: "Campagna Marketing" },
  { value: "website", label: "Sito Web" },
  { value: "other", label: "Altro" },
];

const CONTACT_METHODS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telefono" },
];

export function CustomerDialog({ open, onOpenChange, customer, onSuccess }: CustomerDialogProps) {
  const { user, isCentroAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [centroId, setCentroId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: customer?.name || "",
    email: customer?.email || "",
    phone: customer?.phone || "",
    address: customer?.address || "",
    notes: customer?.notes || "",
  });
  const [profileData, setProfileData] = useState({
    birth_date: "",
    gender: "",
    acquisition_source: "walk_in",
    marketing_consent: false,
    sms_consent: false,
    email_consent: false,
    preferred_contact_method: "whatsapp",
  });

  // Fetch centro_id if user is centro_admin
  useEffect(() => {
    const fetchCentroId = async () => {
      if (isCentroAdmin && user) {
        const { data } = await supabase
          .from("centri_assistenza")
          .select("id")
          .eq("owner_user_id", user.id)
          .single();
        
        if (data) {
          setCentroId(data.id);
        }
      }
    };
    fetchCentroId();
  }, [isCentroAdmin, user]);

  // Fetch profile data when editing
  useEffect(() => {
    const fetchProfile = async () => {
      if (customer?.id) {
        const { data } = await supabase
          .from("customer_profiles")
          .select("*")
          .eq("customer_id", customer.id)
          .maybeSingle();

        if (data) {
          setProfileData({
            birth_date: data.birth_date || "",
            gender: data.gender || "",
            acquisition_source: data.acquisition_source || "walk_in",
            marketing_consent: data.marketing_consent || false,
            sms_consent: data.sms_consent || false,
            email_consent: data.email_consent || false,
            preferred_contact_method: data.preferred_contact_method || "whatsapp",
          });
        }
      }
    };
    fetchProfile();
  }, [customer?.id]);

  // Reset form when customer prop changes
  useEffect(() => {
    setFormData({
      name: customer?.name || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      address: customer?.address || "",
      notes: customer?.notes || "",
    });
    if (!customer) {
      setProfileData({
        birth_date: "",
        gender: "",
        acquisition_source: "walk_in",
        marketing_consent: false,
        sms_consent: false,
        email_consent: false,
        preferred_contact_method: "whatsapp",
      });
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let customerId = customer?.id;

      if (customer) {
        const { error } = await supabase
          .from("customers")
          .update(formData)
          .eq("id", customer.id);

        if (error) throw error;
      } else {
        // First create customer account if email is provided
        if (formData.email) {
          const { error: accountError } = await supabase.functions.invoke("create-customer-account", {
            body: {
              email: formData.email,
              fullName: formData.name,
              phone: formData.phone,
            },
          });

          if (accountError) {
            console.error("Account creation error:", accountError);
            toast.error("Errore nella creazione dell'account: " + accountError.message);
          } else {
            toast.success("Account cliente creato con password: 12345678");
          }
        }

        // Then create customer record with centro_id if applicable
        const customerData: any = { ...formData };
        if (isCentroAdmin && centroId) {
          customerData.centro_id = centroId;
        }

        const { data, error } = await supabase
          .from("customers")
          .insert([customerData])
          .select()
          .single();

        if (error) throw error;
        customerId = data.id;
      }

      // Save/update profile data
      if (customerId && centroId) {
        const profilePayload = {
          customer_id: customerId,
          centro_id: centroId,
          birth_date: profileData.birth_date || null,
          gender: profileData.gender || null,
          acquisition_source: profileData.acquisition_source,
          marketing_consent: profileData.marketing_consent,
          sms_consent: profileData.sms_consent,
          email_consent: profileData.email_consent,
          preferred_contact_method: profileData.preferred_contact_method,
          consent_updated_at: new Date().toISOString(),
        };

        await supabase
          .from("customer_profiles")
          .upsert(profilePayload, { onConflict: "customer_id" });
      }

      toast.success(customer ? "Cliente aggiornato con successo" : "Cliente creato con successo");
      onSuccess();
      onOpenChange(false);
      setFormData({ name: "", email: "", phone: "", address: "", notes: "" });
    } catch (error: any) {
      toast.error(error.message || "Errore durante il salvataggio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? "Modifica Cliente" : "Nuovo Cliente"}</DialogTitle>
          <DialogDescription>
            {customer ? "Modifica i dati del cliente" : "Inserisci i dati del nuovo cliente"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="info" className="text-xs">
                <User className="h-3.5 w-3.5 mr-1.5" />
                Anagrafica
              </TabsTrigger>
              <TabsTrigger value="profile" className="text-xs">
                <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                Profilo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Mario Rossi"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefono *</Label>
                <Input
                  id="phone"
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+39 123 456 7890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="mario.rossi@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Indirizzo</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Via Roma 1, 00100 Roma"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Note</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Note aggiuntive..."
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="profile" className="space-y-4">
              {/* Birth Date & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="birth_date" className="flex items-center gap-1.5 text-sm">
                    <Calendar className="h-3.5 w-3.5" />
                    Data di Nascita
                  </Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={profileData.birth_date}
                    onChange={(e) => setProfileData({ ...profileData, birth_date: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-sm">Genere</Label>
                  <Select
                    value={profileData.gender}
                    onValueChange={(value) => setProfileData({ ...profileData, gender: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Seleziona..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_specified">Non specificato</SelectItem>
                      <SelectItem value="male">Uomo</SelectItem>
                      <SelectItem value="female">Donna</SelectItem>
                      <SelectItem value="other">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Acquisition Source */}
              <div className="space-y-2">
                <Label className="text-sm">Come ci ha conosciuto?</Label>
                <Select
                  value={profileData.acquisition_source}
                  onValueChange={(value) => setProfileData({ ...profileData, acquisition_source: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACQUISITION_SOURCES.map(source => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preferred Contact Method */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Metodo di Contatto Preferito
                </Label>
                <Select
                  value={profileData.preferred_contact_method}
                  onValueChange={(value) => setProfileData({ ...profileData, preferred_contact_method: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_METHODS.map(method => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* GDPR Consents */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Shield className="h-3.5 w-3.5" />
                  Consensi Marketing
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Marketing generale</span>
                    </div>
                    <Switch
                      checked={profileData.marketing_consent}
                      onCheckedChange={(checked) => setProfileData({ ...profileData, marketing_consent: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Notifiche SMS</span>
                    </div>
                    <Switch
                      checked={profileData.sms_consent}
                      onCheckedChange={(checked) => setProfileData({ ...profileData, sms_consent: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Newsletter Email</span>
                    </div>
                    <Switch
                      checked={profileData.email_consent}
                      onCheckedChange={(checked) => setProfileData({ ...profileData, email_consent: checked })}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
