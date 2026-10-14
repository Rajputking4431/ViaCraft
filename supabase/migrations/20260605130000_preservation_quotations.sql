-- Create preservation_quotations table if not exists
CREATE TABLE IF NOT EXISTS public.preservation_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.preservation_requests(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  price_cents INT NOT NULL CHECK (price_cents >= 0),
  shipping_cost_cents INT NOT NULL CHECK (shipping_cost_cents >= 0) DEFAULT 0,
  estimated_delivery_days INT NOT NULL CHECK (estimated_delivery_days > 0),
  message TEXT,
  terms_conditions TEXT,
  portfolio_samples JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'shortlisted', 'saved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, vendor_id)
);

-- Add images column to preservation_stage_log if not exists
ALTER TABLE public.preservation_stage_log ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Enable RLS
ALTER TABLE public.preservation_quotations ENABLE ROW LEVEL SECURITY;

-- Grant privileges
GRANT SELECT ON public.preservation_quotations TO anon, authenticated;
GRANT ALL ON public.preservation_quotations TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.preservation_quotations TO authenticated;

-- Policies for preservation_quotations
CREATE POLICY "quotes read all" ON public.preservation_quotations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "quotes insert vendor" ON public.preservation_quotations
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()));

CREATE POLICY "quotes update vendor or customer" ON public.preservation_quotations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.preservation_requests r WHERE r.id = request_id AND r.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.preservation_requests r WHERE r.id = request_id AND r.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "quotes delete vendor" ON public.preservation_quotations
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Trigger for update
CREATE TRIGGER t_preservation_quotations_upd BEFORE UPDATE ON public.preservation_quotations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
