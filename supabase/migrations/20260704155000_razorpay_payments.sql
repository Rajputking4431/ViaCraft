-- ============ RAZORPAY INTEGRATION PAYMENTS SCHEMA ============

-- 1. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  preservation_request_id UUID REFERENCES public.preservation_requests(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  payment_type TEXT NOT NULL, -- 'full', 'advance', 'final'
  amount_cents INT NOT NULL,
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'authorized', 'captured', 'failed', 'refunded'
  currency TEXT DEFAULT 'INR',
  payment_method TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create refunds table
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  razorpay_refund_id TEXT UNIQUE,
  amount_cents INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add payment tracking columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS advance_paid_cents INT DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS remaining_balance_cents INT DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'full';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS preservation_request_id UUID REFERENCES public.preservation_requests(id) ON DELETE SET NULL;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist to prevent duplication errors
DROP POLICY IF EXISTS "users view own payments" ON public.payments;
DROP POLICY IF EXISTS "users insert own payments" ON public.payments;
DROP POLICY IF EXISTS "users update own payments" ON public.payments;
DROP POLICY IF EXISTS "users view own refunds" ON public.refunds;
DROP POLICY IF EXISTS "admin manage refunds" ON public.refunds;

-- 6. Create RLS Policies
CREATE POLICY "users view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin') 
    OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.id = vendor_id)
  );

CREATE POLICY "users insert own payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "users update own payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users view own refunds" ON public.refunds
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') 
    OR EXISTS (SELECT 1 FROM public.payments p WHERE p.id = payment_id AND p.customer_id = auth.uid())
  );

CREATE POLICY "admin manage refunds" ON public.refunds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;

-- 8. Enable Realtime for payments and refunds
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.refunds;
  END IF;
END $$;
