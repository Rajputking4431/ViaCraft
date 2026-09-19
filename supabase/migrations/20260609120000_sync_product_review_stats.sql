-- Keep product rating and review_count in sync when reviews change
CREATE OR REPLACE FUNCTION public.sync_product_review_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_product_id UUID;
BEGIN
  target_product_id := COALESCE(NEW.product_id, OLD.product_id);

  UPDATE public.products p
  SET
    review_count = (
      SELECT COUNT(*)::INT
      FROM public.reviews r
      WHERE r.product_id = target_product_id
    ),
    rating = COALESCE(
      (
        SELECT ROUND(AVG(r.rating)::numeric, 1)
        FROM public.reviews r
        WHERE r.product_id = target_product_id
      ),
      0
    )
  WHERE p.id = target_product_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_review_stats ON public.reviews;

CREATE TRIGGER trg_sync_product_review_stats
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_review_stats();

-- Callable from the app after review submit (fallback if trigger not yet applied)
CREATE OR REPLACE FUNCTION public.sync_product_review_stats_for(p_product_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products p
  SET
    review_count = (
      SELECT COUNT(*)::INT
      FROM public.reviews r
      WHERE r.product_id = p_product_id
    ),
    rating = COALESCE(
      (
        SELECT ROUND(AVG(r.rating)::numeric, 1)
        FROM public.reviews r
        WHERE r.product_id = p_product_id
      ),
      0
    )
  WHERE p.id = p_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_product_review_stats_for(UUID) TO authenticated;

-- Allow PostgREST profile embeds on reviews
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_user_id_profiles_fkey;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
