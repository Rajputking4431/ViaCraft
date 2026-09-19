-- Add low_stock_threshold column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold INT DEFAULT 5;

-- Add foreign key constraint between orders and profiles (via user_id)
-- First drop existing constraint if it exists to avoid duplication
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_profiles_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint between preservation_requests and profiles (via user_id)
ALTER TABLE public.preservation_requests DROP CONSTRAINT IF EXISTS pres_requests_user_id_profiles_fkey;
ALTER TABLE public.preservation_requests ADD CONSTRAINT pres_requests_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create vendor_policies table
CREATE TABLE IF NOT EXISTS public.vendor_policies (
  vendor_id UUID PRIMARY KEY REFERENCES public.vendors(id) ON DELETE CASCADE,
  shipping_policy TEXT,
  return_policy TEXT,
  refund_policy TEXT,
  preservation_policy TEXT,
  terms_conditions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and grant privileges for vendor_policies
ALTER TABLE public.vendor_policies ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.vendor_policies TO anon, authenticated;
GRANT ALL ON public.vendor_policies TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.vendor_policies TO authenticated;

-- Policies for vendor_policies
CREATE POLICY "vendor_policies public read" ON public.vendor_policies
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "vendor_policies vendor write" ON public.vendor_policies
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()));

-- Create vendor_earnings table
CREATE TABLE IF NOT EXISTS public.vendor_earnings (
  vendor_id UUID PRIMARY KEY REFERENCES public.vendors(id) ON DELETE CASCADE,
  total_earnings_cents INT NOT NULL DEFAULT 0,
  available_balance_cents INT NOT NULL DEFAULT 0,
  pending_balance_cents INT NOT NULL DEFAULT 0,
  withdrawn_amount_cents INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and grant privileges for vendor_earnings
ALTER TABLE public.vendor_earnings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.vendor_earnings TO authenticated;
GRANT ALL ON public.vendor_earnings TO service_role;

-- Policies for vendor_earnings
CREATE POLICY "vendor_earnings read owner or admin" ON public.vendor_earnings
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "vendor_earnings update owner or admin" ON public.vendor_earnings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Create vendor_withdrawals table
CREATE TABLE IF NOT EXISTS public.vendor_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  amount_cents INT NOT NULL,
  bank_details JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and grant privileges for vendor_withdrawals
ALTER TABLE public.vendor_withdrawals ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.vendor_withdrawals TO authenticated;
GRANT ALL ON public.vendor_withdrawals TO service_role;

-- Policies for vendor_withdrawals
CREATE POLICY "vendor_withdrawals read owner or admin" ON public.vendor_withdrawals
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "vendor_withdrawals insert owner" ON public.vendor_withdrawals
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
  );

-- Create vendor_profiles table
CREATE TABLE IF NOT EXISTS public.vendor_profiles (
  vendor_id UUID PRIMARY KEY REFERENCES public.vendors(id) ON DELETE CASCADE,
  contact_number TEXT,
  email TEXT,
  address TEXT,
  social_links JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and grant privileges for vendor_profiles
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.vendor_profiles TO anon, authenticated;
GRANT ALL ON public.vendor_profiles TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.vendor_profiles TO authenticated;

-- Policies for vendor_profiles
CREATE POLICY "vendor_profiles public read" ON public.vendor_profiles
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "vendor_profiles vendor write" ON public.vendor_profiles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()));

-- Create vendor_portfolio table
CREATE TABLE IF NOT EXISTS public.vendor_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and grant privileges for vendor_portfolio
ALTER TABLE public.vendor_portfolio ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.vendor_portfolio TO anon, authenticated;
GRANT ALL ON public.vendor_portfolio TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.vendor_portfolio TO authenticated;

-- Policies for vendor_portfolio
CREATE POLICY "vendor_portfolio public read" ON public.vendor_portfolio
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "vendor_portfolio vendor write" ON public.vendor_portfolio
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()));

-- Triggers to touch updated_at
CREATE TRIGGER t_vendor_policies_upd BEFORE UPDATE ON public.vendor_policies FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_vendor_earnings_upd BEFORE UPDATE ON public.vendor_earnings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_vendor_profiles_upd BEFORE UPDATE ON public.vendor_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
