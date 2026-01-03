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
  status: string
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
        const { data: interests, error } = await supabase
          .from("used_device_interests")
          .select("*")
          .eq("notify_enabled", true);

        if (error) throw error;

        const normalizedType = deviceType?.toLowerCase();
        const normalizedBrand = brand?.toLowerCase();

        let matchingInterests = 0;
        let notifiedCount = 0;

        (interests || []).forEach((interest) => {
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
  }, [deviceType, brand, price, status]);

  return { ...data, loading };
}

// Bulk version for efficiency
export function useDeviceInterestCounts(devices: Array<{
  id: string;
  device_type: string;
  brand: string;
  price: number;
  status: string;
}>): Record<string, DeviceInterestCount> {
  const [counts, setCounts] = useState<Record<string, DeviceInterestCount>>({});

  useEffect(() => {
    const fetchAllInterests = async () => {
      try {
        const { data: interests, error } = await supabase
          .from("used_device_interests")
          .select("*")
          .eq("notify_enabled", true);

        if (error) throw error;

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

          (interests || []).forEach((interest) => {
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
  }, [devices]);

  return counts;
}
