import { supabase } from '@/integrations/supabase/client';

export interface ScrapedProduct {
  title: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  brand: string;
  sku: string;
  sourceUrl: string;
}

interface ScrapeResponse {
  success: boolean;
  error?: string;
  product?: ScrapedProduct;
}

export const productScraperApi = {
  async scrapeProduct(url: string): Promise<ScrapeResponse> {
    const { data, error } = await supabase.functions.invoke('scrape-product', {
      body: { url },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    
    return data;
  },
};
