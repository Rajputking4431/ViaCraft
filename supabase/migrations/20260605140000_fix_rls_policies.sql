-- Drop existing policies
DROP POLICY IF EXISTS "pres self read" ON public.preservation_requests;
DROP POLICY IF EXISTS "orders self read" ON public.orders;

-- Create updated preservation_requests SELECT policy
CREATE POLICY "pres self read" ON public.preservation_requests FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR vendor_id IS NULL
  OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- Create updated orders SELECT policy
CREATE POLICY "orders self read" ON public.orders FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.order_items oi 
    WHERE oi.order_id = id 
    AND EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = oi.vendor_id AND v.user_id = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin')
);
