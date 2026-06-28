-- Add is_active column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Create platform settings table
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  site_name TEXT NOT NULL DEFAULT 'ResinVerse',
  logo_url TEXT,
  contact_info TEXT,
  commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  support_email TEXT NOT NULL DEFAULT 'support@resinverse.com',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default platform settings
INSERT INTO public.platform_settings (id, site_name, commission_percentage, support_email)
VALUES ('default', 'ResinVerse', 10.00, 'support@resinverse.com')
ON CONFLICT (id) DO NOTHING;

-- Grant permissions for platform settings
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;
GRANT UPDATE ON public.platform_settings TO authenticated;

-- Enable RLS for platform settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings public read" ON public.platform_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "settings admin update" ON public.platform_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create vendor payouts table
CREATE TABLE IF NOT EXISTS public.vendor_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  amount_cents INT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid')) DEFAULT 'pending',
  reference_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

-- Grant permissions for vendor payouts
GRANT SELECT ON public.vendor_payouts TO authenticated;
GRANT ALL ON public.vendor_payouts TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.vendor_payouts TO authenticated;

-- Enable RLS for vendor payouts
ALTER TABLE public.vendor_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payouts read own or admin" ON public.vendor_payouts
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "payouts admin write" ON public.vendor_payouts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add missing admin policies on user_roles and profiles
CREATE POLICY "roles admin manage" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "profiles admin update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Touch trigger for platform settings
CREATE TRIGGER t_settings_upd BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Grant execute on has_role back to authenticated so RLS policies don't fail
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
