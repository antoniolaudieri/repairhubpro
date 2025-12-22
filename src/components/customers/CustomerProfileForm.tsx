import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, MapPin, Shield, Phone, Mail, MessageSquare, 
  Gift, Tag, Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CustomerProfile {
  birth_date: string | null;
  gender: string | null;
  acquisition_source: string;
  marketing_consent: boolean;
  sms_consent: boolean;
  email_consent: boolean;
  preferred_contact_method: string;
  behavioral_tags: string[];
  device_preferences: string[];
}

interface CustomerProfileFormProps {
  customerId: string;
  centroId: string;
  readOnly?: boolean;
  onProfileChange?: (profile: CustomerProfile) => void;
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
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { value: "sms", label: "SMS", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "phone", label: "Telefono", icon: Phone },
];

const BEHAVIORAL_TAGS = [
  "premium_buyer",
  "price_sensitive", 
  "apple_fan",
  "android_user",
  "frequent_visitor",
  "warranty_conscious",
  "accessory_buyer",
];

export function CustomerProfileForm({ 
  customerId, 
  centroId, 
  readOnly = false,
  onProfileChange 
}: CustomerProfileFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile>({
    birth_date: null,
    gender: null,
    acquisition_source: "walk_in",
    marketing_consent: false,
    sms_consent: false,
    email_consent: false,
    preferred_contact_method: "whatsapp",
    behavioral_tags: [],
    device_preferences: [],
  });
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [customerId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("customer_id", customerId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setProfileId(data.id);
        setProfile({
          birth_date: data.birth_date,
          gender: data.gender,
          acquisition_source: data.acquisition_source || "walk_in",
          marketing_consent: data.marketing_consent || false,
          sms_consent: data.sms_consent || false,
          email_consent: data.email_consent || false,
          preferred_contact_method: data.preferred_contact_method || "whatsapp",
          behavioral_tags: data.behavioral_tags || [],
          device_preferences: data.device_preferences || [],
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (updates: Partial<CustomerProfile>) => {
    const newProfile = { ...profile, ...updates };
    setProfile(newProfile);
    onProfileChange?.(newProfile);

    if (readOnly) return;

    setSaving(true);
    try {
      if (profileId) {
        await supabase
          .from("customer_profiles")
          .update({
            ...updates,
            consent_updated_at: updates.marketing_consent !== undefined || 
              updates.sms_consent !== undefined || 
              updates.email_consent !== undefined ? new Date().toISOString() : undefined,
          })
          .eq("id", profileId);
      } else {
        const { data } = await supabase
          .from("customer_profiles")
          .insert({
            customer_id: customerId,
            centro_id: centroId,
            ...newProfile,
          })
          .select()
          .single();
        
        if (data) setProfileId(data.id);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tag: string) => {
    const newTags = profile.behavioral_tags.includes(tag)
      ? profile.behavioral_tags.filter(t => t !== tag)
      : [...profile.behavioral_tags, tag];
    saveProfile({ behavioral_tags: newTags });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dati Anagrafici */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          Dati Anagrafici
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="birth_date" className="text-xs">Data di Nascita</Label>
            <Input
              id="birth_date"
              type="date"
              value={profile.birth_date || ""}
              onChange={(e) => saveProfile({ birth_date: e.target.value || null })}
              disabled={readOnly}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gender" className="text-xs">Genere</Label>
            <Select
              value={profile.gender || ""}
              onValueChange={(value) => saveProfile({ gender: value })}
              disabled={readOnly}
            >
              <SelectTrigger className="h-9 text-sm">
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
      </div>

      <Separator />

      {/* Acquisizione */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          Acquisizione
        </h4>
        <div className="space-y-1.5">
          <Label htmlFor="acquisition_source" className="text-xs">Come ci ha conosciuto?</Label>
          <Select
            value={profile.acquisition_source}
            onValueChange={(value) => saveProfile({ acquisition_source: value })}
            disabled={readOnly}
          >
            <SelectTrigger className="h-9 text-sm">
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
      </div>

      <Separator />

      {/* Consensi GDPR */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          Consensi Marketing
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Marketing generale</span>
            </div>
            <Switch
              checked={profile.marketing_consent}
              onCheckedChange={(checked) => saveProfile({ marketing_consent: checked })}
              disabled={readOnly}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Notifiche SMS</span>
            </div>
            <Switch
              checked={profile.sms_consent}
              onCheckedChange={(checked) => saveProfile({ sms_consent: checked })}
              disabled={readOnly}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Newsletter Email</span>
            </div>
            <Switch
              checked={profile.email_consent}
              onCheckedChange={(checked) => saveProfile({ email_consent: checked })}
              disabled={readOnly}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Preferenze Contatto */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          Metodo di Contatto Preferito
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {CONTACT_METHODS.map(method => (
            <button
              key={method.value}
              type="button"
              onClick={() => !readOnly && saveProfile({ preferred_contact_method: method.value })}
              disabled={readOnly}
              className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-colors ${
                profile.preferred_contact_method === method.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted/50"
              } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
            >
              <method.icon className="h-4 w-4" />
              {method.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Behavioral Tags */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5" />
          Tag Comportamentali
        </h4>
        <div className="flex flex-wrap gap-2">
          {BEHAVIORAL_TAGS.map(tag => (
            <Badge
              key={tag}
              variant={profile.behavioral_tags.includes(tag) ? "default" : "outline"}
              className={`cursor-pointer text-xs ${
                profile.behavioral_tags.includes(tag) 
                  ? "" 
                  : "hover:bg-muted"
              } ${readOnly ? "cursor-default" : ""}`}
              onClick={() => !readOnly && toggleTag(tag)}
            >
              {tag.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      </div>

      {saving && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Salvataggio...
        </div>
      )}
    </div>
  );
}