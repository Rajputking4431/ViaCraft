-- ============ NOTIFICATIONS SYSTEM ============

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_role public.app_role NOT NULL DEFAULT 'customer',
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS notifications_receiver_idx ON public.notifications(receiver_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON public.notifications(is_read);

-- 2. Enable RLS and grant privileges
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
GRANT INSERT ON public.notifications TO authenticated, anon;

-- 3. Row Level Security Policies
CREATE POLICY "users read own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (receiver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (receiver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (receiver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (receiver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "system insert notifications" ON public.notifications
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

-- 4. Enable Supabase Realtime for notifications
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;


-- ============ AUTOMATED TRIGGERS FOR NOTIFICATIONS ============

-- Trigger for New Orders
CREATE OR REPLACE FUNCTION public.handle_order_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_rec RECORD;
  is_high_value BOOLEAN;
BEGIN
  is_high_value := NEW.total_cents > 500000; -- High value defined as > 5000 INR

  -- Notify Customer
  INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type, order_id)
  VALUES (
    NEW.user_id,
    'customer',
    'Order Placed Successfully',
    'Your order #' || NEW.order_number || ' has been placed successfully.',
    'order_placed',
    NEW.id
  );

  -- Notify Admins
  FOR admin_rec IN (SELECT user_id FROM public.user_roles WHERE role = 'admin') LOOP
    IF is_high_value THEN
      INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type, order_id)
      VALUES (
        admin_rec.user_id,
        'admin',
        '⚠️ High-Value Order Alert',
        'High-value order #' || NEW.order_number || ' has been placed for ₹' || (NEW.total_cents / 100)::text,
        'high_value_order',
        NEW.id
      );
    ELSE
      INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type, order_id)
      VALUES (
        admin_rec.user_id,
        'admin',
        'New Order Placed',
        'A new order #' || NEW.order_number || ' was placed.',
        'new_order',
        NEW.id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_notifications ON public.orders;
CREATE TRIGGER trg_order_notifications
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_order_notifications();


-- Trigger for Order Items (Notifies Vendor about new orders)
CREATE OR REPLACE FUNCTION public.handle_order_item_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID;
  ord_num TEXT;
BEGIN
  -- Lookup vendor's user_id
  SELECT user_id INTO v_user_id FROM public.vendors WHERE id = NEW.vendor_id;
  -- Lookup order number
  SELECT order_number INTO ord_num FROM public.orders WHERE id = NEW.order_id;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type, order_id)
    VALUES (
      v_user_id,
      'vendor',
      'New Order Received',
      'You received a new order for "' || NEW.title || '" (Order #' || ord_num || ')',
      'new_order_received',
      NEW.order_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_item_notifications ON public.order_items;
CREATE TRIGGER trg_order_item_notifications
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_order_item_notifications();


-- Trigger for Order Status Updates
CREATE OR REPLACE FUNCTION public.handle_order_status_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_rec RECORD;
  vendor_rec RECORD;
BEGIN
  -- Check if status changed
  IF OLD.status IS NULL OR OLD.status <> NEW.status THEN
    
    -- Case 1: Payment Successful / Paid
    IF NEW.status = 'paid' THEN
      -- Customer gets Payment Success alert
      INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type, order_id)
      VALUES (NEW.user_id, 'customer', 'Payment Successful', 'Payment for order #' || NEW.order_number || ' has been processed successfully.', 'payment_success', NEW.id);

      -- Admin gets Successful Payment alert
      FOR admin_rec IN (SELECT user_id FROM public.user_roles WHERE role = 'admin') LOOP
        INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type, order_id)
        VALUES (admin_rec.user_id, 'admin', 'Successful Payment', 'Payment for order #' || NEW.order_number || ' was received.', 'payment_success', NEW.id);
      END LOOP;

      -- Vendors get Payment Received alert
      FOR vendor_rec IN (SELECT DISTINCT v.user_id FROM public.order_items oi JOIN public.vendors v ON oi.vendor_id = v.id WHERE oi.order_id = NEW.id) LOOP
        INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type, order_id)
        VALUES (vendor_rec.user_id, 'vendor', 'Payment Received', 'Payment completed for order #' || NEW.order_number, 'payment_received', NEW.id);
      END LOOP;

    -- Case 2: Accepted / Processing
    ELSIF NEW.status = 'processing' THEN
      -- Customer gets Order Accepted
      INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type, order_id)
      VALUES (NEW.user_id, 'customer', 'Order Accepted by Vendor', 'Your order #' || NEW.order_number || ' has been accepted and is now in production.', 'order_accepted', NEW.id);

    -- Case 3: Shipped
    ELSIF NEW.status = 'shipped' THEN
      -- Customer gets Product Shipped
      INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type, order_id)
      VALUES (NEW.user_id, 'customer', 'Order Shipped 🚚', 'Your order #' || NEW.order_number || ' has been shipped.', 'order_shipped', NEW.id);

    -- Case 4: Delivered
    ELSIF NEW.status = 'delivered' THEN
      -- Customer gets Order Delivered
      INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type, order_id)
      VALUES (NEW.user_id, 'customer', 'Order Delivered 🎁', 'Your order #' || NEW.order_number || ' has been delivered.', 'order_delivered', NEW.id);

      -- Admin gets Order Completed
      FOR admin_rec IN (SELECT user_id FROM public.user_roles WHERE role = 'admin') LOOP
        INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type, order_id)
        VALUES (admin_rec.user_id, 'admin', 'Order Completed Successfully', 'Order #' || NEW.order_number || ' has been marked as delivered.', 'order_completed', NEW.id);
      END LOOP;

      -- Vendors get Order Completed
      FOR vendor_rec IN (SELECT DISTINCT v.user_id FROM public.order_items oi JOIN public.vendors v ON oi.vendor_id = v.id WHERE oi.order_id = NEW.id) LOOP
        INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type, order_id)
        VALUES (vendor_rec.user_id, 'vendor', 'Order Completed', 'Order #' || NEW.order_number || ' has been completed.', 'order_completed', NEW.id);
      END LOOP;

    -- Case 5: Cancelled
    ELSIF NEW.status = 'cancelled' THEN
      -- Customer gets Order Cancelled
      INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type, order_id)
      VALUES (NEW.user_id, 'customer', 'Order Cancelled ❌', 'Your order #' || NEW.order_number || ' has been cancelled.', 'order_cancelled', NEW.id);

      -- Vendors get Order Cancelled
      FOR vendor_rec IN (SELECT DISTINCT v.user_id FROM public.order_items oi JOIN public.vendors v ON oi.vendor_id = v.id WHERE oi.order_id = NEW.id) LOOP
        INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type, order_id)
        VALUES (vendor_rec.user_id, 'vendor', 'Order Cancelled by Customer', 'Order #' || NEW.order_number || ' has been cancelled.', 'order_cancelled', NEW.id);
      END LOOP;

    -- Case 6: Refunded
    ELSIF NEW.status = 'refunded' THEN
      -- Customer gets Refund Completed
      INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type, order_id)
      VALUES (NEW.user_id, 'customer', 'Refund Completed 💰', 'A refund for order #' || NEW.order_number || ' has been completed.', 'refund_completed', NEW.id);
    END IF;

  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_status_notifications ON public.orders;
CREATE TRIGGER trg_order_status_notifications
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_order_status_notifications();


-- Trigger for Low Stock Alerts
CREATE OR REPLACE FUNCTION public.handle_low_stock_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if stock falls below threshold
  IF NEW.stock <= NEW.low_stock_threshold AND (OLD.stock > NEW.low_stock_threshold OR OLD.stock IS NULL) THEN
    SELECT user_id INTO v_user_id FROM public.vendors WHERE id = NEW.vendor_id;
    
    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type)
      VALUES (
        v_user_id,
        'vendor',
        'Low Stock Alert ⚠️',
        'Product "' || NEW.title || '" is running low on stock. Current: ' || NEW.stock::text,
        'low_stock'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_low_stock_notifications ON public.products;
CREATE TRIGGER trg_low_stock_notifications
  AFTER UPDATE OF stock ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_low_stock_notifications();


-- Trigger for Vendor Application Status Updates
CREATE OR REPLACE FUNCTION public.handle_vendor_status_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS NULL OR OLD.status <> NEW.status THEN
    
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type)
      VALUES (NEW.user_id, 'vendor', 'Store Approved! 🎉', 'Congratulations! Your shop "' || NEW.store_name || '" has been approved.', 'store_approved');
    
    ELSIF NEW.status = 'suspended' THEN
      INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type)
      VALUES (NEW.user_id, 'vendor', 'Store Suspended ⚠️', 'Your shop "' || NEW.store_name || '" has been suspended.', 'store_suspended');
    END IF;

  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_status_notifications ON public.vendors;
CREATE TRIGGER trg_vendor_status_notifications
  AFTER UPDATE OF status ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.handle_vendor_status_notifications();


-- Trigger for New Vendor Registration
CREATE OR REPLACE FUNCTION public.handle_new_vendor_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_rec RECORD;
BEGIN
  FOR admin_rec IN (SELECT user_id FROM public.user_roles WHERE role = 'admin') LOOP
    INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type)
    VALUES (
      admin_rec.user_id,
      'admin',
      'New Vendor Registered',
      'Artisan has submitted a store application for "' || NEW.store_name || '".',
      'new_vendor_registration'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_vendor_notifications ON public.vendors;
CREATE TRIGGER trg_new_vendor_notifications
  AFTER INSERT ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_vendor_notifications();


-- Trigger for New Product Pending Approval
CREATE OR REPLACE FUNCTION public.handle_new_product_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_rec RECORD;
BEGIN
  -- Only notify if product status is pending or created but not published yet (waiting for review)
  IF NOT NEW.is_published THEN
    FOR admin_rec IN (SELECT user_id FROM public.user_roles WHERE role = 'admin') LOOP
      INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type)
      VALUES (
        admin_rec.user_id,
        'admin',
        'New Product Awaiting Approval',
        'New product "' || NEW.title || '" has been submitted and is awaiting approval.',
        'new_product_approval'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_product_notifications ON public.products;
CREATE TRIGGER trg_new_product_notifications
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_product_notifications();


-- Trigger for New Reviews
CREATE OR REPLACE FUNCTION public.handle_review_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID;
  p_title TEXT;
BEGIN
  -- Get vendor user id and product title
  SELECT v.user_id, p.title INTO v_user_id, p_title
  FROM public.products p
  JOIN public.vendors v ON p.vendor_id = v.id
  WHERE p.id = NEW.product_id;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type)
    VALUES (
      v_user_id,
      'vendor',
      'New Review Received ⭐',
      'You received a ' || NEW.rating::text || '-star review on "' || p_title || '"',
      'new_review'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_review_notifications ON public.reviews;
CREATE TRIGGER trg_review_notifications
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_review_notifications();


-- Trigger for Preservation stage updates
CREATE OR REPLACE FUNCTION public.handle_preservation_stage_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.current_stage IS NULL OR OLD.current_stage <> NEW.current_stage THEN
    INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type)
    VALUES (
      NEW.user_id,
      'customer',
      'Preservation Order Update',
      'Your preservation request #' || NEW.request_number || ' stage has been updated to: ' || NEW.current_stage::text,
      'preservation_stage_update'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_preservation_stage_notifications ON public.preservation_requests;
CREATE TRIGGER trg_preservation_stage_notifications
  AFTER UPDATE OF current_stage ON public.preservation_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_preservation_stage_notifications();
