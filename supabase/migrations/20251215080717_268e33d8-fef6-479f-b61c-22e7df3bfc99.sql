-- Create storage bucket for brand logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to brand logos
CREATE POLICY "Brand logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-logos');

-- Allow platform admins to manage brand logos
CREATE POLICY "Platform admins can manage brand logos"
ON storage.objects FOR ALL
USING (bucket_id = 'brand-logos' AND is_platform_admin(auth.uid()));

-- Create brand_logos table
CREATE TABLE public.brand_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL UNIQUE,
  logo_url TEXT NOT NULL,
  display_name TEXT,
  device_categories TEXT[] DEFAULT ARRAY['smartphone']::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_logos ENABLE ROW LEVEL SECURITY;

-- Anyone can read brand logos
CREATE POLICY "Anyone can read brand logos"
ON public.brand_logos FOR SELECT
USING (true);

-- Platform admins can manage brand logos
CREATE POLICY "Platform admins can manage brand logos"
ON public.brand_logos FOR ALL
USING (is_platform_admin(auth.uid()));

-- Insert common brand logos (using reliable CDN sources)
INSERT INTO public.brand_logos (brand_name, display_name, logo_url, device_categories) VALUES
-- Smartphone brands
('apple', 'Apple', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/apple.svg', ARRAY['smartphone', 'tablet', 'laptop', 'computer']),
('samsung', 'Samsung', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/samsung.svg', ARRAY['smartphone', 'tablet']),
('xiaomi', 'Xiaomi', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/xiaomi.svg', ARRAY['smartphone', 'tablet']),
('huawei', 'Huawei', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/huawei.svg', ARRAY['smartphone', 'tablet', 'laptop']),
('oppo', 'OPPO', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/oppo.svg', ARRAY['smartphone']),
('oneplus', 'OnePlus', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/oneplus.svg', ARRAY['smartphone']),
('google', 'Google', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/google.svg', ARRAY['smartphone', 'tablet']),
('motorola', 'Motorola', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/motorola.svg', ARRAY['smartphone']),
('sony', 'Sony', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/sony.svg', ARRAY['smartphone', 'console']),
('lg', 'LG', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/lg.svg', ARRAY['smartphone', 'tablet']),
('nokia', 'Nokia', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/nokia.svg', ARRAY['smartphone']),
('realme', 'Realme', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/realme.svg', ARRAY['smartphone']),
('vivo', 'Vivo', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/vivo.svg', ARRAY['smartphone']),
('honor', 'Honor', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/honor.svg', ARRAY['smartphone', 'laptop']),
('asus', 'ASUS', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/asus.svg', ARRAY['smartphone', 'laptop', 'computer']),
('lenovo', 'Lenovo', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/lenovo.svg', ARRAY['laptop', 'computer', 'tablet']),
-- Computer brands
('hp', 'HP', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/hp.svg', ARRAY['laptop', 'computer']),
('dell', 'Dell', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/dell.svg', ARRAY['laptop', 'computer']),
('acer', 'Acer', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/acer.svg', ARRAY['laptop', 'computer']),
('msi', 'MSI', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/msi.svg', ARRAY['laptop', 'computer']),
('microsoft', 'Microsoft', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/microsoft.svg', ARRAY['laptop', 'tablet', 'console']),
('razer', 'Razer', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/razer.svg', ARRAY['laptop', 'computer']),
-- Console brands
('nintendo', 'Nintendo', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/nintendo.svg', ARRAY['console']),
('playstation', 'PlayStation', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/playstation.svg', ARRAY['console']),
('xbox', 'Xbox', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/xbox.svg', ARRAY['console']),
-- Other
('amazon', 'Amazon', 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/amazon.svg', ARRAY['tablet', 'smartwatch'])
ON CONFLICT (brand_name) DO NOTHING;

-- Create updated_at trigger
CREATE TRIGGER update_brand_logos_updated_at
BEFORE UPDATE ON public.brand_logos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();