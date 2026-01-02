import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Legacy single-shelf config (for backward compatibility)
export interface StorageSlotsConfig {
  enabled: boolean;
  max_slots: number;
  prefix: string;
}

// Device type for slot assignment
export type DeviceCategory = 'smartphone' | 'tablet' | 'notebook' | 'pc';

// New multi-shelf config
export interface MergedSlot {
  startSlot: number;
  span: number;
}

export interface SlotCapacity {
  smartphone: number;
  tablet: number;
  notebook: number;
  pc: number;
}

export interface ShelfConfig {
  id: string;
  name: string;
  prefix: string;
  rows: number;
  columns: number;
  start_number: number;
  color: string;
  mergedSlots?: MergedSlot[];
  slotCapacity?: SlotCapacity; // Max devices per type that can fit in each slot
}

export interface MultiShelfConfig {
  enabled: boolean;
  shelves: ShelfConfig[];
}

const DEFAULT_CONFIG: StorageSlotsConfig = {
  enabled: false,
  max_slots: 50,
  prefix: "",
};

const DEFAULT_MULTI_CONFIG: MultiShelfConfig = {
  enabled: false,
  shelves: [],
};

export function useStorageSlots(centroId: string | null) {
  const [isLoading, setIsLoading] = useState(false);

  // Get legacy storage slots configuration from centro settings
  const getConfig = useCallback(async (): Promise<StorageSlotsConfig> => {
    if (!centroId) return DEFAULT_CONFIG;

    try {
      const { data, error } = await supabase
        .from("centri_assistenza")
        .select("settings")
        .eq("id", centroId)
        .single();

      if (error) throw error;

      const settings = data?.settings as Record<string, any> | null;
      return {
        enabled: settings?.storage_slots?.enabled ?? false,
        max_slots: settings?.storage_slots?.max_slots ?? 50,
        prefix: settings?.storage_slots?.prefix ?? "",
      };
    } catch (error) {
      console.error("Error fetching storage slots config:", error);
      return DEFAULT_CONFIG;
    }
  }, [centroId]);

  // Get multi-shelf configuration
  const getMultiShelfConfig = useCallback(async (): Promise<MultiShelfConfig> => {
    if (!centroId) return DEFAULT_MULTI_CONFIG;

    try {
      const { data, error } = await supabase
        .from("centri_assistenza")
        .select("settings")
        .eq("id", centroId)
        .single();

      if (error) throw error;

      const settings = data?.settings as Record<string, any> | null;
      
      // Check for multi-shelf config first
      if (settings?.multi_shelf) {
        return settings.multi_shelf as MultiShelfConfig;
      }
      
      // Fallback: Convert legacy config to multi-shelf format
      if (settings?.storage_slots?.enabled) {
        const legacyConfig = settings.storage_slots;
        return {
          enabled: true,
          shelves: [{
            id: 'legacy-shelf',
            name: 'Scaffale Principale',
            prefix: legacyConfig.prefix || '',
            rows: Math.ceil(legacyConfig.max_slots / 10),
            columns: 10,
            start_number: 1,
            color: 'from-blue-500 to-blue-600',
          }],
        };
      }
      
      return DEFAULT_MULTI_CONFIG;
    } catch (error) {
      console.error("Error fetching multi-shelf config:", error);
      return DEFAULT_MULTI_CONFIG;
    }
  }, [centroId]);

  // Get total slots across all shelves
  const getTotalSlots = useCallback((config: MultiShelfConfig): number => {
    return config.shelves.reduce((total, shelf) => total + shelf.rows * shelf.columns, 0);
  }, []);

  // Format slot with shelf info
  const formatSlotWithShelf = useCallback((shelfId: string, slotNumber: number, config: MultiShelfConfig): string => {
    const shelf = config.shelves.find(s => s.id === shelfId);
    if (!shelf) return `${slotNumber}`;
    return `${shelf.prefix}${slotNumber}`;
  }, []);

  // Get all occupied slots for a centro
  const getOccupiedSlots = useCallback(async (): Promise<number[]> => {
    if (!centroId) return [];

    try {
      // Get all repairs with a storage_slot that are not delivered/completed
      const { data, error } = await supabase
        .from("repairs")
        .select(`
          storage_slot,
          devices!inner (
            customers!inner (
              centro_id
            )
          )
        `)
        .not("storage_slot", "is", null)
        .not("status", "in", '("delivered","completed","forfeited","cancelled")');

      if (error) throw error;

      // Filter repairs that belong to this centro
      const occupiedSlots = (data || [])
        .filter((r: any) => r.devices?.customers?.centro_id === centroId)
        .map((r: any) => r.storage_slot as number)
        .filter((slot): slot is number => slot !== null);

      return occupiedSlots;
    } catch (error) {
      console.error("Error fetching occupied slots:", error);
      return [];
    }
  }, [centroId]);

  // Get available slots
  const getAvailableSlots = useCallback(async (): Promise<number[]> => {
    const config = await getConfig();
    if (!config.enabled) return [];

    const occupiedSlots = await getOccupiedSlots();
    const allSlots = Array.from({ length: config.max_slots }, (_, i) => i + 1);
    
    return allSlots.filter((slot) => !occupiedSlots.includes(slot));
  }, [getConfig, getOccupiedSlots]);

  // Get the first available slot
  const getFirstAvailableSlot = useCallback(async (): Promise<number | null> => {
    const availableSlots = await getAvailableSlots();
    return availableSlots.length > 0 ? availableSlots[0] : null;
  }, [getAvailableSlots]);

  // Assign a storage slot to a repair
  const assignStorageSlot = useCallback(async (repairId: string, slot?: number): Promise<number | null> => {
    setIsLoading(true);
    try {
      const config = await getConfig();
      if (!config.enabled) {
        return null;
      }

      // Use provided slot or get first available
      const slotToAssign = slot ?? await getFirstAvailableSlot();
      
      if (slotToAssign === null) {
        toast.warning("Tutti gli slot sono occupati");
        return null;
      }

      const { error } = await supabase
        .from("repairs")
        .update({
          storage_slot: slotToAssign,
          storage_slot_assigned_at: new Date().toISOString(),
        })
        .eq("id", repairId);

      if (error) throw error;

      const slotLabel = config.prefix ? `${config.prefix}${slotToAssign}` : `${slotToAssign}`;
      toast.success(`Assegnato slot ${slotLabel}`);
      
      return slotToAssign;
    } catch (error) {
      console.error("Error assigning storage slot:", error);
      toast.error("Errore nell'assegnazione dello slot");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getConfig, getFirstAvailableSlot]);

  // Release a storage slot
  const releaseStorageSlot = useCallback(async (repairId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("repairs")
        .update({
          storage_slot: null,
          storage_slot_assigned_at: null,
        })
        .eq("id", repairId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error releasing storage slot:", error);
      toast.error("Errore nel rilascio dello slot");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get slots usage stats
  const getSlotsStats = useCallback(async () => {
    const config = await getConfig();
    if (!config.enabled) {
      return { enabled: false, total: 0, occupied: 0, available: 0, percentage: 0 };
    }

    const occupiedSlots = await getOccupiedSlots();
    const total = config.max_slots;
    const occupied = occupiedSlots.length;
    const available = total - occupied;
    const percentage = Math.round((occupied / total) * 100);

    return {
      enabled: true,
      total,
      occupied,
      available,
      percentage,
      occupiedSlots,
      prefix: config.prefix,
    };
  }, [getConfig, getOccupiedSlots]);

  // Format slot number with prefix
  const formatSlotNumber = useCallback((slot: number | null, prefix: string = ""): string => {
    if (slot === null) return "-";
    return prefix ? `${prefix}${slot}` : `${slot}`;
  }, []);

  return {
    isLoading,
    getConfig,
    getMultiShelfConfig,
    getTotalSlots,
    formatSlotWithShelf,
    getOccupiedSlots,
    getAvailableSlots,
    getFirstAvailableSlot,
    assignStorageSlot,
    releaseStorageSlot,
    getSlotsStats,
    formatSlotNumber,
  };
}
