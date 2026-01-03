import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DeviceInterestCount {
  matchingInterests: number;
  notifiedCount: number;
}

export function useDeviceInterestCount(
  deviceType: string,
  brand: string,
  price: number,
  status: string,
  centroId?: string
): DeviceInterestCount & { loading: boolean } {
  const [data, setData] = useState<DeviceInterestCount>({
    matchingInterests: 0,
    notifiedCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch for published devices
    if (status !== "published") {
      setLoading(false);
      return;
    }

    const fetchInterestCount = async () => {
      try {
        // Fetch interests with customer info
        const { data: interests, error } = await supabase
          .from("used_device_interests")
          .select(`
            *,
            customer:customers!customer_id(centro_id)
          `)
          .eq("notify_enabled", true);

        if (error) throw error;

        // Filter by centro if provided
        const filteredInterests = centroId
          ? (interests || []).filter(interest => {
              const customerCentroId = interest.customer?.centro_id;
              return !interest.customer_id || customerCentroId === centroId;
            })
          : interests || [];

        const normalizedType = deviceType?.toLowerCase();
        const normalizedBrand = brand?.toLowerCase();

        let matchingInterests = 0;
        let notifiedCount = 0;

        filteredInterests.forEach((interest) => {
          // Check type match
          const types = (interest.device_types || []).map((t: string) => t.toLowerCase());
          const typeMatch = types.length === 0 || types.includes(normalizedType);

          // Check brand match
          const brands = (interest.brands || []).map((b: string) => b.toLowerCase());
          const brandMatch = brands.length === 0 || brands.includes(normalizedBrand);

          // Check price match
          const maxPrice = interest.max_price || Infinity;
          const priceMatch = price <= maxPrice;

          if (typeMatch && brandMatch && priceMatch) {
            matchingInterests++;
            if (interest.last_notified_at) {
              notifiedCount++;
            }
          }
        });

        setData({ matchingInterests, notifiedCount });
      } catch (error) {
        console.error("Error fetching interest count:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInterestCount();
  }, [deviceType, brand, price, status, centroId]);

  return { ...data, loading };
}

// Bulk version for efficiency - with optional centro filtering
export function useDeviceInterestCounts(
  devices: Array<{
    id: string;
    device_type: string;
    brand: string;
    price: number;
    status: string;
  }>,
  options?: {
    centroIds?: string[];
    cornerId?: string;
  }
): Record<string, DeviceInterestCount> {
  const [counts, setCounts] = useState<Record<string, DeviceInterestCount>>({});
  const [partnerCentroIds, setPartnerCentroIds] = useState<string[] | null>(null);

  // Memoize device IDs to prevent infinite loops
  const deviceIds = devices.map(d => d.id).join(",");
  const centroIdsStr = options?.centroIds?.join(",") || "";
  const partnerCentroIdsStr = partnerCentroIds?.join(",") || "";

  // Fetch partner centro IDs for corner
  useEffect(() => {
    const fetchPartnerCentros = async () => {
      if (options?.cornerId) {
        const { data: partnerships } = await supabase
          .from("corner_partnerships")
          .select("provider_id")
          .eq("corner_id", options.cornerId)
          .eq("provider_type", "centro")
          .eq("is_active", true);
        
        if (partnerships) {
          setPartnerCentroIds(partnerships.map(p => p.provider_id));
        } else {
          setPartnerCentroIds([]);
        }
      } else if (options?.centroIds) {
        setPartnerCentroIds(options.centroIds);
      } else {
        // No filtering needed - set empty array to indicate "loaded"
        setPartnerCentroIds([]);
      }
    };

    fetchPartnerCentros();
  }, [options?.cornerId, centroIdsStr]);

  useEffect(() => {
    // Wait for partnerCentroIds to be loaded (not null)
    if (partnerCentroIds === null) {
      return;
    }

    const fetchAllInterests = async () => {
      try {
        // Fetch all enabled interests with customer info
        const { data: interests, error } = await supabase
          .from("used_device_interests")
          .select(`
            *,
            customer:customers!customer_id(centro_id)
          `)
          .eq("notify_enabled", true);

        if (error) throw error;

        // If we have centro IDs to filter by, filter the interests
        const filteredInterests = partnerCentroIds.length > 0
          ? (interests || []).filter(interest => {
              // Include interests from customers of partner centros
              const customerCentroId = interest.customer?.centro_id;
              // Also include anonymous interests (no customer_id)
              return !interest.customer_id || partnerCentroIds.includes(customerCentroId);
            })
          : interests || [];

        const result: Record<string, DeviceInterestCount> = {};

        devices.forEach((device) => {
          if (device.status !== "published") {
            result[device.id] = { matchingInterests: 0, notifiedCount: 0 };
            return;
          }

          const normalizedType = device.device_type?.toLowerCase();
          const normalizedBrand = device.brand?.toLowerCase();

          let matchingInterests = 0;
          let notifiedCount = 0;

          filteredInterests.forEach((interest) => {
            const types = (interest.device_types || []).map((t: string) => t.toLowerCase());
            const typeMatch = types.length === 0 || types.includes(normalizedType);

            const brands = (interest.brands || []).map((b: string) => b.toLowerCase());
            const brandMatch = brands.length === 0 || brands.includes(normalizedBrand);

            const maxPrice = interest.max_price || Infinity;
            const priceMatch = device.price <= maxPrice;

            if (typeMatch && brandMatch && priceMatch) {
              matchingInterests++;
              if (interest.last_notified_at) {
                notifiedCount++;
              }
            }
          });

          result[device.id] = { matchingInterests, notifiedCount };
        });

        setCounts(result);
      } catch (error) {
        console.error("Error fetching interest counts:", error);
      }
    };

    if (devices.length > 0) {
      fetchAllInterests();
    }
  }, [deviceIds, partnerCentroIdsStr, partnerCentroIds]);

  return counts;
}
