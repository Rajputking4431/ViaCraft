-- ====================================================================
-- VIACRAFT AUDIT: READ-ONLY PREFLIGHT DATABASE INSPECTION SCRIPT
-- Purpose: Inspect live schema, RLS policies, triggers, functions,
--          grants, and storage configuration before applying migration.
-- Safety: 100% READ-ONLY. No DDL, no DML, no state changes.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. DATABASE ENVIRONMENT & EXTENSIONS
-- --------------------------------------------------------------------
SELECT 
  current_database() AS database_name,
  current_user AS connected_user,
  session_user AS session_user,
  version() AS postgres_version;

SELECT 
  extname AS extension_name, 
  extversion AS installed_version 
FROM pg_extension 
WHERE extname IN ('pgcrypto', 'uuid-ossp', 'plpgsql', 'supabase_vault');

-- --------------------------------------------------------------------
-- 2. ENUM TYPES INVENTORY
-- --------------------------------------------------------------------
SELECT 
  t.typname AS enum_name,
  e.enumlabel AS enum_value,
  e.enumsortorder AS sort_order
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE t.typname IN ('app_role', 'vendor_status', 'vendor_onboarding_status', 'order_status')
ORDER BY t.typname, e.enumsortorder;

-- --------------------------------------------------------------------
-- 3. TABLE EXISTENCE, COLUMNS & CONSTRAINTS INVENTORY
-- --------------------------------------------------------------------
SELECT 
  table_schema,
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('vendors', 'vendor_documents', 'vendor_agreements', 'profiles', 'user_roles', 'notifications')
ORDER BY table_name, ordinal_position;

-- Foreign Keys & Unique Constraints
SELECT
  tc.table_schema, 
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('vendors', 'vendor_documents', 'vendor_agreements', 'profiles', 'user_roles', 'notifications')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- --------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) STATUS
-- --------------------------------------------------------------------
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  forcerowsecurity AS rls_forced
FROM pg_tables
WHERE (schemaname = 'public' AND tablename IN ('vendors', 'vendor_documents', 'vendor_agreements', 'profiles', 'user_roles', 'notifications'))
   OR (schemaname = 'storage' AND tablename = 'objects');

-- --------------------------------------------------------------------
-- 5. COMPLETE RLS POLICY CATALOG DUMP
-- --------------------------------------------------------------------
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE (schemaname = 'public' AND tablename IN ('vendors', 'vendor_documents', 'vendor_agreements', 'profiles', 'user_roles', 'notifications'))
   OR (schemaname = 'storage' AND tablename = 'objects')
ORDER BY schemaname, tablename, cmd, policyname;

-- --------------------------------------------------------------------
-- 6. ACTIVE DATABASE TRIGGERS INVENTORY
-- --------------------------------------------------------------------
SELECT 
  event_object_schema AS table_schema,
  event_object_table AS table_name,
  trigger_name,
  action_timing AS timing,
  event_manipulation AS event,
  action_statement AS executed_statement,
  action_orientation AS orientation
FROM information_schema.triggers
WHERE (event_object_schema = 'public' AND event_object_table IN ('vendors', 'vendor_documents', 'vendor_agreements', 'profiles', 'user_roles', 'notifications'))
   OR (event_object_schema = 'auth' AND event_object_table = 'users')
ORDER BY event_object_table, trigger_name;

-- --------------------------------------------------------------------
-- 7. FUNCTION DEFINITIONS, SEARCH_PATH & SECURITY PROPERTIES
-- --------------------------------------------------------------------
SELECT 
  n.nspname AS function_schema,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS argument_signature,
  pg_get_function_result(p.oid) AS return_type,
  p.prosecdef AS is_security_definer,
  p.proleakproof AS is_leakproof,
  p.provolatile AS volatility,
  p.proconfig AS execution_config_search_path,
  r.rolname AS owner_role
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_roles r ON p.proowner = r.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'has_role',
    'handle_new_user',
    'accept_vendor_agreement',
    'admin_approve_vendor',
    'check_vendor_insert_permissions',
    'check_vendor_update_permissions',
    'check_vendor_document_permissions',
    'prevent_vendor_agreement_tampering',
    'handle_vendor_status_notifications',
    'handle_new_vendor_notifications'
  )
ORDER BY p.proname;

-- --------------------------------------------------------------------
-- 8. FUNCTION EXECUTION PRIVILEGES (GRANTS)
-- --------------------------------------------------------------------
SELECT 
  routine_schema,
  routine_name,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN (
    'has_role',
    'handle_new_user',
    'accept_vendor_agreement',
    'admin_approve_vendor'
  )
ORDER BY routine_name, grantee;

-- --------------------------------------------------------------------
-- 9. TABLE PRIVILEGES (GRANTS)
-- --------------------------------------------------------------------
SELECT 
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN ('vendors', 'vendor_documents', 'vendor_agreements', 'user_roles')
ORDER BY table_name, grantee, privilege_type;

-- --------------------------------------------------------------------
-- 10. SUPABASE STORAGE BUCKETS CONFIGURATION
-- --------------------------------------------------------------------
SELECT 
  id AS bucket_id,
  name AS bucket_name,
  owner,
  public AS is_public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
FROM storage.buckets
WHERE id IN ('vendor-documents', 'avatars', 'product-images');

-- --------------------------------------------------------------------
-- 11. EXISTING ADMIN USER VERIFICATION
-- --------------------------------------------------------------------
SELECT 
  ur.user_id,
  p.full_name,
  p.phone,
  p.is_active,
  ur.role,
  ur.created_at AS assigned_at
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'admin';

-- --------------------------------------------------------------------
-- 12. POTENTIAL CORRUPTED OR ORPHANED VENDOR RECORDS
-- --------------------------------------------------------------------
SELECT 
  v.id AS vendor_id,
  v.user_id,
  v.store_name,
  v.status,
  COUNT(p.id) AS product_count,
  COUNT(d.id) AS document_count,
  COUNT(a.id) AS agreement_count
FROM public.vendors v
LEFT JOIN public.products p ON p.vendor_id = v.id
LEFT JOIN public.vendor_documents d ON d.vendor_id = v.id
LEFT JOIN public.vendor_agreements a ON a.vendor_id = v.id
GROUP BY v.id, v.user_id, v.store_name, v.status;
