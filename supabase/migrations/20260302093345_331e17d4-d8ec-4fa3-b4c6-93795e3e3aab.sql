
-- Affiliate clicks tracking (public insert for anonymous visitors)
CREATE TABLE public.affiliate_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  affiliate_program TEXT NOT NULL DEFAULT 'evolution_level',
  coupon_code TEXT NOT NULL DEFAULT 'EVLZBANT',
  category_clicked TEXT,
  destination_url TEXT NOT NULL,
  user_agent TEXT,
  ip_hash TEXT
);

-- Affiliate sales tracking (manual entry by admin)
CREATE TABLE public.affiliate_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  affiliate_program TEXT NOT NULL DEFAULT 'evolution_level',
  coupon_code TEXT NOT NULL DEFAULT 'EVLZBANT',
  sale_amount NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 8,
  commission_earned NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- RLS: anyone can insert clicks (public catalog)
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert affiliate clicks" ON public.affiliate_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Platform admins can view affiliate clicks" ON public.affiliate_clicks FOR SELECT USING (public.is_platform_admin(auth.uid()));

-- RLS: only platform admins can manage sales
ALTER TABLE public.affiliate_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins can manage affiliate sales" ON public.affiliate_sales FOR ALL USING (public.is_platform_admin(auth.uid()));
