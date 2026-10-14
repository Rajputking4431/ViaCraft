-- ============ RETURN MANAGEMENT SYSTEM ============

-- 1. Create returns table
CREATE TABLE IF NOT EXISTS public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT NOT NULL UNIQUE DEFAULT ('RET-' || to_char(CURRENT_DATE, 'YYYY') || '-' || upper(substring(replace(gen_random_uuid()::text,'-','') from 1 for 6))),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'vendor_review', 'admin_review', 'approved', 'pickup_scheduled', 'picked_up', 'warehouse_inspection', 'refund_approved', 'replacement_approved', 'exchange_approved', 'completed', 'rejected')),
  preferred_resolution TEXT NOT NULL CHECK (preferred_resolution IN ('refund', 'replacement', 'exchange')),
  pickup_address JSONB NOT NULL,
  phone TEXT NOT NULL,
  video_url TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create return_items table
CREATE TABLE IF NOT EXISTS public.return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL,
  description TEXT
);

-- 3. Create return_images table
CREATE TABLE IF NOT EXISTS public.return_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create return_timeline table
CREATE TABLE IF NOT EXISTS public.return_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('customer', 'vendor', 'admin')),
  action TEXT NOT NULL,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create return_comments table
CREATE TABLE IF NOT EXISTS public.return_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_role TEXT NOT NULL CHECK (author_role IN ('customer', 'vendor', 'admin')),
  comment TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create return_documents table
CREATE TABLE IF NOT EXISTS public.return_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Modify refunds table to link with returns
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS return_id UUID REFERENCES public.returns(id) ON DELETE SET NULL;

-- 8. Create search optimization indexes
CREATE INDEX IF NOT EXISTS returns_order_idx ON public.returns(order_id);
CREATE INDEX IF NOT EXISTS returns_user_idx ON public.returns(user_id);
CREATE INDEX IF NOT EXISTS returns_vendor_idx ON public.returns(vendor_id);
CREATE INDEX IF NOT EXISTS returns_status_idx ON public.returns(status);
CREATE INDEX IF NOT EXISTS return_items_return_idx ON public.return_items(return_id);
CREATE INDEX IF NOT EXISTS return_timeline_return_idx ON public.return_timeline(return_id);
CREATE INDEX IF NOT EXISTS return_comments_return_idx ON public.return_comments(return_id);

-- 9. Enable Row Level Security (RLS)
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_documents ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies

-- For returns
CREATE POLICY "users view own returns" ON public.returns
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.id = vendor_id)
  );

CREATE POLICY "users insert own returns" ON public.returns
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users update returns" ON public.returns
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.id = vendor_id)
  );

-- For return_items
CREATE POLICY "users view return_items" ON public.return_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.returns r
      WHERE r.id = return_id
      AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.id = r.vendor_id))
    )
  );

CREATE POLICY "users insert return_items" ON public.return_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.returns r
      WHERE r.id = return_id
      AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- For return_images
CREATE POLICY "users view return_images" ON public.return_images
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.returns r
      WHERE r.id = return_id
      AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.id = r.vendor_id))
    )
  );

CREATE POLICY "users insert return_images" ON public.return_images
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.returns r
      WHERE r.id = return_id
      AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- For return_timeline
CREATE POLICY "users view return_timeline" ON public.return_timeline
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.returns r
      WHERE r.id = return_id
      AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.id = r.vendor_id))
    )
  );

CREATE POLICY "users insert return_timeline" ON public.return_timeline
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.returns r
      WHERE r.id = return_id
      AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.id = r.vendor_id))
    )
  );

-- For return_comments
CREATE POLICY "users view return_comments" ON public.return_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.returns r
      WHERE r.id = return_id
      AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.id = r.vendor_id))
    )
    AND (NOT is_internal OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "users insert return_comments" ON public.return_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.returns r
      WHERE r.id = return_id
      AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.id = r.vendor_id))
    )
  );

-- For return_documents
CREATE POLICY "users view return_documents" ON public.return_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.returns r
      WHERE r.id = return_id
      AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.id = r.vendor_id))
    )
  );

CREATE POLICY "admin manage return_documents" ON public.return_documents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 11. Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.returns TO authenticated;
GRANT SELECT, INSERT ON public.return_items TO authenticated;
GRANT SELECT, INSERT ON public.return_images TO authenticated;
GRANT SELECT, INSERT ON public.return_timeline TO authenticated;
GRANT SELECT, INSERT ON public.return_comments TO authenticated;
GRANT SELECT ON public.return_documents TO authenticated;

GRANT ALL ON public.returns TO service_role;
GRANT ALL ON public.return_items TO service_role;
GRANT ALL ON public.return_images TO service_role;
GRANT ALL ON public.return_timeline TO service_role;
GRANT ALL ON public.return_comments TO service_role;
GRANT ALL ON public.return_documents TO service_role;

-- 12. Enable Realtime Replication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.returns;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.return_comments;
  END IF;
END $$;
