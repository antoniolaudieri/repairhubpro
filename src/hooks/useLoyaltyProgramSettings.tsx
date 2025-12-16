import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";

export interface LoyaltyProgramSettings {
  id: string;
  centro_id: string;
  annual_price: number;
  diagnostic_fee: number;
  repair_discount_percent: number;
  max_devices: number;
  validity_months: number;
  card_background_url: string | null;
  card_accent_color: string;
  card_text_color: string;
  card_template: string;
  promo_tagline: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_SETTINGS: Omit<LoyaltyProgramSettings, 'id' | 'centro_id' | 'created_at' | 'updated_at'> = {
  annual_price: 30,
  diagnostic_fee: 10,
  repair_discount_percent: 10,
  max_devices: 3,
  validity_months: 12,
  card_background_url: null,
  card_accent_color: '#f59e0b',
  card_text_color: '#ffffff',
  card_template: 'gold',
  promo_tagline: 'Cliente Fedeltà',
  is_active: true,
};

export function useLoyaltyProgramSettings(centroId?: string | null) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<LoyaltyProgramSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userCentroId, setUserCentroId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        let targetCentroId = centroId;

        // If no centroId provided, get current user's centro
        if (!targetCentroId && user) {
          const { data: centro } = await supabase
            .from("centri_assistenza")
            .select("id")
            .eq("owner_user_id", user.id)
            .single();
          
          if (centro) {
            targetCentroId = centro.id;
            setUserCentroId(centro.id);
          }
        }

        if (!targetCentroId) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("loyalty_program_settings")
          .select("*")
          .eq("centro_id", targetCentroId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching loyalty settings:", error);
        }

        if (data) {
          setSettings(data as LoyaltyProgramSettings);
        } else {
          // No settings exist yet, return defaults
          setSettings(null);
        }
      } catch (error) {
        console.error("Error fetching loyalty settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [centroId, user]);

  const saveSettings = async (newSettings: Partial<LoyaltyProgramSettings>) => {
    const targetCentroId = centroId || userCentroId;
    if (!targetCentroId) return false;

    setSaving(true);
    try {
      if (settings?.id) {
        // Update existing
        const { error } = await supabase
          .from("loyalty_program_settings")
          .update(newSettings)
          .eq("id", settings.id);

        if (error) throw error;

        setSettings({ ...settings, ...newSettings } as LoyaltyProgramSettings);
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("loyalty_program_settings")
          .insert({ centro_id: targetCentroId, ...newSettings })
          .select()
          .single();

        if (error) throw error;

        setSettings(data as LoyaltyProgramSettings);
      }

      toast({
        title: "Impostazioni salvate",
        description: "Le impostazioni del programma fedeltà sono state aggiornate.",
      });
      return true;
    } catch (error) {
      console.error("Error saving loyalty settings:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le impostazioni.",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const getEffectiveSettings = (): LoyaltyProgramSettings => {
    if (settings) return settings;
    return {
      id: '',
      centro_id: centroId || userCentroId || '',
      ...DEFAULT_SETTINGS,
      created_at: '',
      updated_at: '',
    };
  };

  return {
    settings,
    loading,
    saving,
    saveSettings,
    getEffectiveSettings,
    centroId: centroId || userCentroId,
  };
}

// Hook to fetch settings for a specific centro (read-only, for customers)
export function useLoyaltyProgramSettingsForCentro(centroId: string | null) {
  const [settings, setSettings] = useState<LoyaltyProgramSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!centroId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("loyalty_program_settings")
          .select("*")
          .eq("centro_id", centroId)
          .eq("is_active", true)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching loyalty settings:", error);
        }

        setSettings(data as LoyaltyProgramSettings | null);
      } catch (error) {
        console.error("Error fetching loyalty settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [centroId]);

  const getEffectiveSettings = (): LoyaltyProgramSettings => {
    if (settings) return settings;
    return {
      id: '',
      centro_id: centroId || '',
      ...DEFAULT_SETTINGS,
      created_at: '',
      updated_at: '',
    };
  };

  return { settings, loading, getEffectiveSettings };
}
