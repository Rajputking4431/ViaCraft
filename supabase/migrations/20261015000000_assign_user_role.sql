-- Migration: 20261015000000_assign_user_role.sql
-- Description: Create assign_user_role, grant has_role execute, add admin_get_all_vendors RPC, and ensure pending vendor applications are visible

-- 1. Ensure user_roles has unique constraint on (user_id, role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE public.user_roles 
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
EXCEPTION
  WHEN duplicate_table OR duplicate_object THEN
    NULL;
END $$;

-- 2. CRITICAL: Grant EXECUTE on has_role to public, anon, and authenticated so RLS policies don't fail with 42501
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon, authenticated, public;
EXCEPTION
  WHEN undefined_function THEN
    NULL;
END $$;

-- 3. Create the assign_user_role RPC function
CREATE OR REPLACE FUNCTION public.assign_user_role(
  target_user_id UUID,
  new_role public.app_role
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_caller_admin BOOLEAN := false;
  v_admin_count INT := 0;
BEGIN
  -- Verify target user exists
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user ID must not be null';
  END IF;

  -- Check if caller is already an admin
  IF v_caller IS NOT NULL THEN
    v_is_caller_admin := public.has_role(v_caller, 'admin');
  END IF;

  -- Count existing admins in the system
  SELECT COUNT(*) INTO v_admin_count 
  FROM public.user_roles 
  WHERE role = 'admin';

  -- Authorization rule:
  -- 1) If caller is admin -> allow
  -- 2) If system has 0 admins -> allow initial bootstrap
  -- 3) Otherwise -> forbid
  IF NOT v_is_caller_admin AND v_admin_count > 0 THEN
    RAISE EXCEPTION 'Access denied. Only existing administrators can assign roles.';
  END IF;

  -- Upsert role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'role', new_role,
    'message', 'Role successfully assigned'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_user_role(UUID, public.app_role) TO authenticated, service_role;

-- 4. Create admin_get_all_vendors RPC to guarantee vendor visibility in the admin portal
CREATE OR REPLACE FUNCTION public.admin_get_all_vendors()
RETURNS SETOF public.vendors
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT * FROM public.vendors ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_all_vendors() TO authenticated, service_role;

-- 5. Fix legacy/stuck vendor applications: promote 'draft' with 'pending' status to 'submitted'
DO $$
BEGIN
  UPDATE public.vendors
  SET onboarding_status = 'submitted',
      submitted_at = COALESCE(submitted_at, created_at, now())
  WHERE status = 'pending' AND (onboarding_status = 'draft' OR onboarding_status IS NULL);
EXCEPTION
  WHEN undefined_column THEN
    NULL;
END $$;

-- 6. Automatically grant admin role to initial project user if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = '94ae71b2-4db3-447f-8859-916a12b297a1') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES ('94ae71b2-4db3-447f-8859-916a12b297a1', 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
