import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BrandLogo {
  brand_name: string;
  logo_url: string;
  display_name: string | null;
  device_categories: string[];
}

// In-memory cache for brand logos
let brandLogosCache: Map<string, BrandLogo> | null = null;
let cachePromise: Promise<Map<string, BrandLogo>> | null = null;

/**
 * Fetches all brand logos from database and caches them
 */
async function fetchBrandLogos(): Promise<Map<string, BrandLogo>> {
  if (brandLogosCache) {
    return brandLogosCache;
  }
  
  if (cachePromise) {
    return cachePromise;
  }
  
  cachePromise = (async () => {
    const { data, error } = await supabase
      .from('brand_logos')
      .select('brand_name, logo_url, display_name, device_categories');
    
    if (error) {
      console.error('Error fetching brand logos:', error);
      return new Map();
    }
    
    const cache = new Map<string, BrandLogo>();
    (data || []).forEach((logo: BrandLogo) => {
      cache.set(logo.brand_name.toLowerCase(), logo);
    });
    
    brandLogosCache = cache;
    return cache;
  })();
  
  return cachePromise;
}

/**
 * Hook to load brand logos with loading state
 */
export function useBrandLogos() {
  const [logos, setLogos] = useState<Map<string, BrandLogo>>(brandLogosCache || new Map());
  const [isLoading, setIsLoading] = useState(!brandLogosCache);

  useEffect(() => {
    if (brandLogosCache) {
      setLogos(brandLogosCache);
      setIsLoading(false);
      return;
    }
    
    fetchBrandLogos().then((cache) => {
      setLogos(cache);
      setIsLoading(false);
    });
  }, []);

  return { logos, isLoading };
}

/**
 * Get brand logo URL by brand name (sync - uses cache)
 * Returns null if not found or cache not loaded
 */
export function getBrandLogoSync(brand: string): string | null {
  if (!brandLogosCache || !brand) return null;
  
  const normalizedBrand = brand.toLowerCase().trim();
  const logo = brandLogosCache.get(normalizedBrand);
  
  return logo?.logo_url || null;
}

/**
 * Get brand logo URL by brand name (async - fetches if needed)
 */
export async function getBrandLogo(brand: string): Promise<string | null> {
  if (!brand) return null;
  
  const cache = await fetchBrandLogos();
  const normalizedBrand = brand.toLowerCase().trim();
  const logo = cache.get(normalizedBrand);
  
  return logo?.logo_url || null;
}

/**
 * Preload brand logos cache (call early in app lifecycle)
 */
export function preloadBrandLogos(): void {
  fetchBrandLogos();
}

/**
 * Clear the cache (useful for testing or forced refresh)
 */
export function clearBrandLogosCache(): void {
  brandLogosCache = null;
  cachePromise = null;
}
