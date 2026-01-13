import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, MessageSquare, Bell, Building2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface ConsentProfile {
  id: string;
  centro_id: string;
  centro_name: string;
  marketing_consent: boolean;
  email_consent: boolean;
  sms_consent: boolean;
  consent_updated_at: string | null;
}

interface MarketingConsentManagerProps {
  customerEmail: string;
}

export function MarketingConsentManager({ customerEmail }: MarketingConsentManagerProps) {
  const [profiles, setProfiles] = useState<ConsentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, [customerEmail]);

  const fetchProfiles = async () => {
    try {
      // Get customer IDs for this email (case-insensitive)
      const { data: customers } = await supabase
        .from("customers")
        .select("id, centro_id")
        .ilike("email", customerEmail);

      if (!customers || customers.length === 0) {
        setLoading(false);
        return;
      }

      const customerIds = customers.map(c => c.id);

      // Get profiles with centro info
      const { data: profilesData } = await supabase
        .from("customer_profiles")
        .select(`
          id,
          centro_id,
          customer_id,
          marketing_consent,
          email_consent,
          sms_consent,
          consent_updated_at
        `)
        .in("customer_id", customerIds);

      if (!profilesData) {
        setLoading(false);
        return;
      }

      // Get centro names
      const centroIds = profilesData.map(p => p.centro_id).filter(Boolean);
      const { data: centri } = await supabase
        .from("centri_assistenza")
        .select("id, business_name")
        .in("id", centroIds);

      const centroMap = new Map(centri?.map(c => [c.id, c.business_name]) || []);

      const formattedProfiles: ConsentProfile[] = profilesData.map(p => ({
        id: p.id,
        centro_id: p.centro_id,
        centro_name: centroMap.get(p.centro_id) || "Centro sconosciuto",
        marketing_consent: p.marketing_consent ?? false,
        email_consent: p.email_consent ?? false,
        sms_consent: p.sms_consent ?? false,
        consent_updated_at: p.consent_updated_at,
      }));

      setProfiles(formattedProfiles);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateConsent = async (
    profileId: string,
    field: "marketing_consent" | "email_consent" | "sms_consent",
    value: boolean
  ) => {
    setSaving(profileId);
    try {
      const { error } = await supabase
        .from("customer_profiles")
        .update({
          [field]: value,
          consent_updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);

      if (error) throw error;

      setProfiles(prev =>
        prev.map(p =>
          p.id === profileId
            ? { ...p, [field]: value, consent_updated_at: new Date().toISOString() }
            : p
        )
      );

      toast.success("Preferenze aggiornate");
    } catch (error: any) {
      toast.error("Errore nell'aggiornamento: " + error.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Card>
    );
  }

  if (profiles.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Preferenze Marketing</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Gestisci le tue preferenze di comunicazione per ogni centro
      </p>

      <div className="space-y-6">
        {profiles.map((profile) => (
          <div key={profile.id} className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{profile.centro_name}</span>
              {saving === profile.id && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={`marketing-${profile.id}`} className="cursor-pointer">
                    Marketing generale
                  </Label>
                </div>
                <Switch
                  id={`marketing-${profile.id}`}
                  checked={profile.marketing_consent}
                  onCheckedChange={(v) => updateConsent(profile.id, "marketing_consent", v)}
                  disabled={saving === profile.id}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={`email-${profile.id}`} className="cursor-pointer">
                    Newsletter Email
                  </Label>
                </div>
                <Switch
                  id={`email-${profile.id}`}
                  checked={profile.email_consent}
                  onCheckedChange={(v) => updateConsent(profile.id, "email_consent", v)}
                  disabled={saving === profile.id}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={`sms-${profile.id}`} className="cursor-pointer">
                    Notifiche SMS
                  </Label>
                </div>
                <Switch
                  id={`sms-${profile.id}`}
                  checked={profile.sms_consent}
                  onCheckedChange={(v) => updateConsent(profile.id, "sms_consent", v)}
                  disabled={saving === profile.id}
                />
              </div>
            </div>

            {profile.consent_updated_at && (
              <p className="text-xs text-muted-foreground mt-3">
                Ultimo aggiornamento: {format(new Date(profile.consent_updated_at), "d MMM yyyy, HH:mm", { locale: it })}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}