-- =======================================================================
-- SHIPPING INTEGRATION TABLES & POLICIES
-- =======================================================================

-- 1. VENDOR PICKUP ADDRESSES
CREATE TABLE IF NOT EXISTS public.vendor_pickup_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL UNIQUE REFERENCES public.vendors(id) ON DELETE CASCADE,
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendor_pickup_addr_vendor_idx ON public.vendor_pickup_addresses(vendor_id);
GRANT ALL ON public.vendor_pickup_addresses TO authenticated;
GRANT ALL ON public.vendor_pickup_addresses TO service_role;
ALTER TABLE public.vendor_pickup_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_pickup_addresses_select" ON public.vendor_pickup_addresses
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "vendor_pickup_addresses_all" ON public.vendor_pickup_addresses
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );


-- 2. SHIPMENTS
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  shipping_method TEXT NOT NULL DEFAULT 'manual' CHECK (shipping_method IN ('shiprocket', 'manual')),
  status TEXT NOT NULL DEFAULT 'processing',
  courier_name TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  awb_code TEXT,
  shiprocket_shipment_id TEXT,
  shiprocket_order_id TEXT,
  shipping_label_url TEXT,
  estimated_delivery TIMESTAMPTZ,
  notes TEXT,
  dispatch_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipments_order_idx ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS shipments_vendor_idx ON public.shipments(vendor_id);
GRANT ALL ON public.shipments TO authenticated;
GRANT ALL ON public.shipments TO service_role;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shipments_select" ON public.shipments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "shipments_write" ON public.shipments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );


-- 3. SHIPPING LOGS (AUDIT HISTORY)
CREATE TABLE IF NOT EXISTS public.shipping_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  action_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_by_role TEXT,
  previous_status TEXT,
  new_status TEXT,
  courier_name TEXT,
  tracking_number TEXT,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipping_logs_shipment_idx ON public.shipping_logs(shipment_id);
GRANT ALL ON public.shipping_logs TO authenticated;
GRANT ALL ON public.shipping_logs TO service_role;
ALTER TABLE public.shipping_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shipping_logs_select" ON public.shipping_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s 
      WHERE s.id = shipment_id AND (
        EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = s.vendor_id AND v.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = s.order_id AND o.user_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
      )
    )
  );

CREATE POLICY "shipping_logs_insert" ON public.shipping_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipments s 
      WHERE s.id = shipment_id AND (
        EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = s.vendor_id AND v.user_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
      )
    )
  );


-- 4. PICKUP REQUESTS
CREATE TABLE IF NOT EXISTS public.pickup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  pickup_date TEXT NOT NULL,
  pickup_time_slot TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  shiprocket_pickup_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pickup_requests_shipment_idx ON public.pickup_requests(shipment_id);
GRANT ALL ON public.pickup_requests TO authenticated;
GRANT ALL ON public.pickup_requests TO service_role;
ALTER TABLE public.pickup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pickup_requests_select" ON public.pickup_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s 
      WHERE s.id = shipment_id AND (
        EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = s.vendor_id AND v.user_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
      )
    )
  );

CREATE POLICY "pickup_requests_all" ON public.pickup_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s 
      WHERE s.id = shipment_id AND (
        EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = s.vendor_id AND v.user_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
      )
    )
  );
