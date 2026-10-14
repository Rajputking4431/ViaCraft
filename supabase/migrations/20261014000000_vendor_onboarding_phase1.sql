-- ====================================================================
-- VIACRAFT MIGRATION: FINAL AUDITED VENDOR ONBOARDING PHASE 1
-- Migration Version: 20261014000000
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. ENUMS & SCHEMA EXTENSIONS
-- --------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.vendor_onboarding_status AS ENUM (
    'draft',
    'submitted',
    'under_review',
    'action_required',
    'rejected',
    'approved'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Extend public.vendors with structured onboarding, tax, and verification metadata
ALTER TABLE public.vendors 
  ADD COLUMN IF NOT EXISTS onboarding_status public.vendor_onboarding_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'Artisan / Individual',
  ADD COLUMN IF NOT EXISTS legal_business_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS business_address JSONB,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS pan_number TEXT,
  ADD COLUMN IF NOT EXISTS pan_holder_name TEXT,
  ADD COLUMN IF NOT EXISTS pan_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS is_gst_exempt BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gst_exemption_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gst_exemption_reason TEXT,
  ADD COLUMN IF NOT EXISTS gst_enrolment_number TEXT,
  ADD COLUMN IF NOT EXISTS gstin_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS udyam_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_details JSONB,
  ADD COLUMN IF NOT EXISTS bank_account_holder TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_ifsc TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_type TEXT DEFAULT 'Current',
  ADD COLUMN IF NOT EXISTS bank_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_review_notes TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approval_date TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_vendors_onboarding_status ON public.vendors(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_vendors_pan_number ON public.vendors(pan_number);

-- --------------------------------------------------------------------
-- 2. VENDOR KYC DOCUMENTS TABLE (PRIVATE STORAGE METADATA)
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vendor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (
    document_type IN (
      'pan_card',
      'gst_certificate',
      'udyam_certificate',
      'bank_proof',
      'business_address_proof'
    )
  ),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INT,
  mime_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'verified', 'rejected', 'reupload_requested')
  ),
  rejection_reason TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_docs_vendor_id ON public.vendor_documents(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_docs_type ON public.vendor_documents(document_type);

-- --------------------------------------------------------------------
-- 3. DIGITAL AGREEMENT ACCEPTANCE AUDIT TABLE
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vendor_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreement_version TEXT NOT NULL DEFAULT '1.0',
  agreement_title TEXT NOT NULL DEFAULT 'ViaCraft Vendor Terms & Conditions',
  document_hash TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_ip TEXT,
  user_agent TEXT,
  representative_name TEXT NOT NULL,
  UNIQUE(vendor_id, agreement_version)
);

CREATE INDEX IF NOT EXISTS idx_vendor_agreements_vendor_id ON public.vendor_agreements(vendor_id);

-- --------------------------------------------------------------------
-- 4. HARDEN SECURITY DEFINER HELPER: has_role()
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id AND role = _role
    )
  END;
$$;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon, authenticated;

-- --------------------------------------------------------------------
-- 5. TRIGGER: PREVENT VENDOR STATUS TAMPERING ON INSERT & UPDATE
-- --------------------------------------------------------------------

-- Enforce clean initial state on INSERT
CREATE OR REPLACE FUNCTION public.check_vendor_insert_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    -- Non-admins cannot self-assign approved or verified states
    NEW.status := 'pending';
    IF NEW.onboarding_status NOT IN ('draft', 'submitted') THEN
      NEW.onboarding_status := 'draft';
    END IF;
    NEW.pan_verified := false;
    NEW.gstin_verified := false;
    NEW.bank_verified := false;
    NEW.gst_exemption_verified := false;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.approval_date := NULL;
    NEW.admin_review_notes := NULL;
    NEW.rejection_reason := NULL;

    IF NEW.onboarding_status = 'submitted' THEN
      NEW.submitted_at := now();
    ELSE
      NEW.submitted_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_vendor_insert ON public.vendors;
CREATE TRIGGER trg_protect_vendor_insert
  BEFORE INSERT ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.check_vendor_insert_permissions();

-- Enforce explicit status transitions and protect review & sensitive fields on UPDATE
CREATE OR REPLACE FUNCTION public.check_vendor_update_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    -- 1. Ownership & general operational status are immutable by applicants
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Unauthorized: Vendor account ownership cannot be reassigned.';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Unauthorized: Only platform administrators can modify vendor operational status.';
    END IF;

    -- 2. Verification flags are strictly admin-controlled
    IF NEW.pan_verified IS DISTINCT FROM OLD.pan_verified OR
       NEW.gstin_verified IS DISTINCT FROM OLD.gstin_verified OR
       NEW.bank_verified IS DISTINCT FROM OLD.bank_verified OR
       NEW.gst_exemption_verified IS DISTINCT FROM OLD.gst_exemption_verified THEN
      RAISE EXCEPTION 'Unauthorized: Only platform administrators can verify KYC credentials or tax exemptions.';
    END IF;

    -- 3. Reviewer metadata & audit fields are strictly admin-controlled
    IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR
       NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at OR
       NEW.approval_date IS DISTINCT FROM OLD.approval_date OR
       NEW.admin_review_notes IS DISTINCT FROM OLD.admin_review_notes OR
       NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
      RAISE EXCEPTION 'Unauthorized: Reviewer metadata and administrative notes cannot be modified by applicants.';
    END IF;

    -- 4. Lock down sensitive tax, legal identity, and banking fields once submitted or approved
    -- Applicants can only modify these fields when drafting (draft) or addressing administrative correction requests (action_required)
    IF OLD.onboarding_status IN ('submitted', 'under_review', 'approved') THEN
      IF NEW.pan_number IS DISTINCT FROM OLD.pan_number OR
         NEW.pan_holder_name IS DISTINCT FROM OLD.pan_holder_name OR
         NEW.gstin IS DISTINCT FROM OLD.gstin OR
         NEW.is_gst_exempt IS DISTINCT FROM OLD.is_gst_exempt OR
         NEW.gst_enrolment_number IS DISTINCT FROM OLD.gst_enrolment_number OR
         NEW.gst_exemption_reason IS DISTINCT FROM OLD.gst_exemption_reason OR
         NEW.udyam_number IS DISTINCT FROM OLD.udyam_number OR
         NEW.business_type IS DISTINCT FROM OLD.business_type OR
         NEW.legal_business_name IS DISTINCT FROM OLD.legal_business_name OR
         NEW.bank_account_holder IS DISTINCT FROM OLD.bank_account_holder OR
         NEW.bank_account_number IS DISTINCT FROM OLD.bank_account_number OR
         NEW.bank_ifsc IS DISTINCT FROM OLD.bank_ifsc OR
         NEW.bank_name IS DISTINCT FROM OLD.bank_name OR
         NEW.bank_account_type IS DISTINCT FROM OLD.bank_account_type OR
         NEW.bank_account_details IS DISTINCT FROM OLD.bank_account_details THEN
        RAISE EXCEPTION 'Unauthorized: Tax identifiers, GST exemption status, and banking credentials cannot be modified while an application is under review or active. Request corrections through administrator support.';
      END IF;
    END IF;

    -- 5. Enforce explicit allowed status transitions for applicants
    IF NEW.onboarding_status IS DISTINCT FROM OLD.onboarding_status THEN
      -- Allowed transition 1: draft -> submitted
      IF OLD.onboarding_status = 'draft' AND NEW.onboarding_status = 'submitted' THEN
        NEW.submitted_at := now();
      -- Allowed transition 2: action_required -> submitted (re-submission after correcting documents)
      ELSIF OLD.onboarding_status = 'action_required' AND NEW.onboarding_status = 'submitted' THEN
        NEW.submitted_at := now();
      ELSE
        RAISE EXCEPTION 'Unauthorized status transition: Applicants may only transition from draft to submitted, or from action_required to submitted.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_vendor_status ON public.vendors;
CREATE TRIGGER trg_protect_vendor_status
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.check_vendor_update_permissions();

-- --------------------------------------------------------------------
-- 6. TRIGGER: PREVENT DOCUMENT FORGERY, TAMPERING & DELETION
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_vendor_document_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'INSERT' THEN
      -- 1. Security Check: File path must reside within the authenticated user folder
      IF split_part(NEW.file_path, '/', 1) != auth.uid()::text THEN
        RAISE EXCEPTION 'Unauthorized: Document file path must be located in your authenticated user folder.';
      END IF;

      -- 2. Force initial pending status and clear administrative audit fields
      NEW.status := 'pending';
      NEW.rejection_reason := NULL;
      NEW.reviewed_at := NULL;
      NEW.reviewed_by := NULL;
      NEW.uploaded_at := now();

    ELSIF TG_OP = 'UPDATE' THEN
      RAISE EXCEPTION 'Unauthorized: Applicants cannot modify submitted KYC documents directly. Please upload a replacement document.';

    ELSIF TG_OP = 'DELETE' THEN
      -- Prevent deleting documents that are active, under review, or verified
      IF OLD.status IN ('pending', 'under_review', 'verified', 'approved') THEN
        RAISE EXCEPTION 'Unauthorized: Documents submitted for review or already verified cannot be deleted. If corrections are required, wait for an administrative action request.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_vendor_documents ON public.vendor_documents;
CREATE TRIGGER trg_protect_vendor_documents
  BEFORE INSERT OR UPDATE OR DELETE ON public.vendor_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.check_vendor_document_permissions();

-- --------------------------------------------------------------------
-- 7. TRIGGER: IMMUTABLE DIGITAL AGREEMENTS
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_vendor_agreement_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Immutable record: Digital vendor agreement acceptances cannot be modified or deleted once recorded.';
END;
$$;

DROP TRIGGER IF EXISTS trg_immutable_vendor_agreements ON public.vendor_agreements;
CREATE TRIGGER trg_immutable_vendor_agreements
  BEFORE UPDATE OR DELETE ON public.vendor_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_vendor_agreement_tampering();

-- --------------------------------------------------------------------
-- 8. TRUSTED SERVER RPC: accept_vendor_agreement() (CONCURRENCY-SAFE)
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.accept_vendor_agreement(
  _vendor_id UUID,
  _agreement_version TEXT,
  _representative_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _vendor_user_id UUID;
  _current_version TEXT := '1.0';
  -- Canonical SHA-256 hash computed directly from public/legal/vendor-terms.md v1.0
  -- Verification command: Get-FileHash -Algorithm SHA256 "public\legal\vendor-terms.md"
  _canonical_hash TEXT := 'a9d94ca06c0c143714b7202d98c2b2b0aa1f0f249562a417cc87b4ad4d64905a';
  _new_agreement_id UUID;
  _existing_agreement RECORD;
BEGIN
  -- 1. Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required.';
  END IF;

  -- 2. Verify caller is strictly the owner of the vendor account
  -- Administrators CANNOT accept agreements on behalf of a vendor
  SELECT user_id INTO _vendor_user_id
  FROM public.vendors
  WHERE id = _vendor_id;

  IF _vendor_user_id IS NULL THEN
    RAISE EXCEPTION 'Vendor record not found for ID: %', _vendor_id;
  END IF;

  IF _vendor_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Only the authenticated vendor account owner can legally execute and accept the vendor agreement.';
  END IF;

  -- 3. Validate version matches current legal active version
  IF _agreement_version IS NULL OR TRIM(_agreement_version) != _current_version THEN
    RAISE EXCEPTION 'Invalid agreement version: Version % is not the active legal agreement version (Current: %).', _agreement_version, _current_version;
  END IF;

  -- 4. Validate representative name
  IF _representative_name IS NULL OR LENGTH(TRIM(_representative_name)) < 2 THEN
    RAISE EXCEPTION 'Invalid representative name: Full legal name of authorized signatory is required.';
  END IF;

  -- 5. Atomic, race-condition-safe insertion with ON CONFLICT DO NOTHING
  -- This will NOT trigger BEFORE UPDATE triggers because DO NOTHING does not perform an update
  INSERT INTO public.vendor_agreements (
    vendor_id,
    user_id,
    agreement_version,
    agreement_title,
    document_hash,
    accepted_at,
    representative_name
  )
  VALUES (
    _vendor_id,
    auth.uid(),
    _current_version,
    'ViaCraft Vendor Terms & Conditions',
    _canonical_hash,
    now(),
    TRIM(_representative_name)
  )
  ON CONFLICT (vendor_id, agreement_version) DO NOTHING
  RETURNING id INTO _new_agreement_id;

  -- If duplicate/concurrent request occurred, fetch the existing immutable row
  IF _new_agreement_id IS NULL THEN
    SELECT id, accepted_at, representative_name INTO _existing_agreement
    FROM public.vendor_agreements
    WHERE vendor_id = _vendor_id AND agreement_version = _current_version;

    RETURN jsonb_build_object(
      'success', true,
      'agreement_id', _existing_agreement.id,
      'vendor_id', _vendor_id,
      'version', _current_version,
      'accepted_at', _existing_agreement.accepted_at,
      'is_duplicate', true,
      'message', 'Agreement already accepted.'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'agreement_id', _new_agreement_id,
    'vendor_id', _vendor_id,
    'version', _current_version,
    'accepted_at', now(),
    'is_duplicate', false,
    'message', 'Agreement accepted successfully.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_vendor_agreement(UUID, TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.accept_vendor_agreement(UUID, TEXT, TEXT) FROM anon, PUBLIC;

-- --------------------------------------------------------------------
-- 9. STRENGTHENED ADMIN APPROVAL RPC: admin_approve_vendor()
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_approve_vendor(
  _vendor_id UUID,
  _admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _vendor RECORD;
  _agreement RECORD;
  _effective_gstin_verified BOOLEAN := false;
BEGIN
  -- 1. Caller must be an authorized administrator
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Administrator privileges required to activate vendor.';
  END IF;

  -- 2. Fetch vendor record
  SELECT * INTO _vendor
  FROM public.vendors
  WHERE id = _vendor_id;
  
  IF _vendor.id IS NULL THEN
    RAISE EXCEPTION 'Vendor not found for ID: %', _vendor_id;
  END IF;

  -- 3. Verify vendor eligibility
  IF _vendor.onboarding_status NOT IN ('submitted', 'under_review') THEN
    IF _vendor.onboarding_status = 'approved' THEN
      RAISE EXCEPTION 'Vendor application is already approved and active.';
    ELSIF _vendor.onboarding_status = 'draft' THEN
      RAISE EXCEPTION 'Cannot approve vendor: Application is still in draft state and has not been submitted.';
    ELSIF _vendor.onboarding_status = 'action_required' THEN
      RAISE EXCEPTION 'Cannot approve vendor: Outstanding correction requests have not been addressed by applicant.';
    ELSIF _vendor.onboarding_status = 'rejected' THEN
      RAISE EXCEPTION 'Cannot approve vendor: Application is currently in rejected state.';
    ELSE
      RAISE EXCEPTION 'Vendor is not in an eligible onboarding state for approval (Current status: %).', _vendor.onboarding_status;
    END IF;
  END IF;

  -- 4. Verify required business identity details
  IF _vendor.pan_number IS NULL OR LENGTH(TRIM(_vendor.pan_number)) < 10 THEN
    RAISE EXCEPTION 'Cannot approve vendor: Valid 10-character PAN number is required.';
  END IF;

  IF _vendor.store_name IS NULL OR TRIM(_vendor.store_name) = '' THEN
    RAISE EXCEPTION 'Cannot approve vendor: Store name cannot be blank.';
  END IF;

  -- 5. Verify required KYC documents exist and have been approved/verified
  -- 5.1 PAN Card Document (Mandatory for all vendors)
  IF NOT EXISTS (
    SELECT 1 FROM public.vendor_documents
    WHERE vendor_id = _vendor_id
      AND document_type = 'pan_card'
      AND status IN ('verified', 'approved')
  ) THEN
    RAISE EXCEPTION 'Cannot approve vendor: Verified PAN Card document is required.';
  END IF;

  -- 5.2 Bank Account Proof (Mandatory for all vendors)
  IF NOT EXISTS (
    SELECT 1 FROM public.vendor_documents
    WHERE vendor_id = _vendor_id
      AND document_type = 'bank_proof'
      AND status IN ('verified', 'approved')
  ) THEN
    RAISE EXCEPTION 'Cannot approve vendor: Verified Bank Account Proof document is required.';
  END IF;

  -- 5.3 Enforce applicable GST Certificate verification based on declared tax status
  IF _vendor.is_gst_exempt IS FALSE THEN
    -- Non-exempt business: GSTIN and verified GST Certificate are mandatory
    IF _vendor.gstin IS NULL OR LENGTH(TRIM(_vendor.gstin)) < 15 THEN
      RAISE EXCEPTION 'Cannot approve vendor: Valid 15-character GSTIN is required for non-exempt commercial businesses.';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.vendor_documents
      WHERE vendor_id = _vendor_id
        AND document_type = 'gst_certificate'
        AND status IN ('verified', 'approved')
    ) THEN
      RAISE EXCEPTION 'Cannot approve vendor: A verified GST Certificate is required for non-exempt businesses.';
    END IF;

    _effective_gstin_verified := true;
  ELSE
    -- Exempt business (Artisan / Handicraft turnover exemption):
    -- Corporate entities are legally ineligible for artisan turnover exemption under CGST Notification 34/2023-CT
    IF _vendor.business_type IN ('Private Limited', 'LLP', 'Partnership') THEN
      RAISE EXCEPTION 'Cannot approve vendor: Corporate entities (Private Limited, LLP, Partnership) are legally ineligible for artisan GST turnover exemption. A valid GSTIN and verified certificate are required.';
    END IF;

    -- Ensure the administrative review process has verified the artisan exemption
    IF _vendor.gst_exemption_verified IS NOT TRUE THEN
      RAISE EXCEPTION 'Cannot approve vendor: GST exemption declaration has not been independently verified. Complete artisan exemption verification before approving.';
    END IF;

    _effective_gstin_verified := false;
  END IF;

  -- 5.4 Ensure no documents remain in rejected or correction-requested state
  IF EXISTS (
    SELECT 1 FROM public.vendor_documents
    WHERE vendor_id = _vendor_id
      AND status IN ('rejected', 'reupload_requested')
  ) THEN
    RAISE EXCEPTION 'Cannot approve vendor: One or more documents are rejected or pending applicant re-upload.';
  END IF;

  -- 6. Verify digital agreement acceptance
  SELECT * INTO _agreement
  FROM public.vendor_agreements
  WHERE vendor_id = _vendor_id
  ORDER BY accepted_at DESC
  LIMIT 1;

  IF _agreement.id IS NULL THEN
    RAISE EXCEPTION 'Cannot approve vendor: Digital vendor terms have not been accepted by applicant.';
  END IF;

  IF _agreement.document_hash IS NULL OR LENGTH(TRIM(_agreement.document_hash)) < 32 THEN
    RAISE EXCEPTION 'Cannot approve vendor: Digital agreement document hash is invalid or missing.';
  END IF;

  IF _agreement.representative_name IS NULL OR TRIM(_agreement.representative_name) = '' THEN
    RAISE EXCEPTION 'Cannot approve vendor: Digital agreement legal representative signature is missing.';
  END IF;

  -- 7. Atomically update vendor operational and verification status
  UPDATE public.vendors
  SET
    status = 'approved',
    onboarding_status = 'approved',
    pan_verified = true,
    bank_verified = true,
    gstin_verified = _effective_gstin_verified,
    admin_review_notes = COALESCE(_admin_notes, admin_review_notes),
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    approval_date = now(),
    updated_at = now()
  WHERE id = _vendor_id;

  -- 8. Atomically assign vendor role on server (never client-side)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_vendor.user_id, 'vendor')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- NOTE: Status update notification is automatically handled by trigger trg_vendor_status_notifications
  -- Manual notification insert was removed to prevent duplicate notifications

  RETURN jsonb_build_object(
    'success', true,
    'vendor_id', _vendor_id,
    'user_id', _vendor.user_id,
    'status', 'approved',
    'onboarding_status', 'approved',
    'gstin_verified', _effective_gstin_verified,
    'approved_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_vendor(UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_approve_vendor(UUID, TEXT) FROM anon, PUBLIC;

-- --------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY AUDIT & HARDENED POLICIES
-- --------------------------------------------------------------------

-- Tables RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_agreements ENABLE ROW LEVEL SECURITY;

-- 10.1 VENDORS POLICIES (Safely replace all possible legacy / conflicting policies)
DROP POLICY IF EXISTS "vendors public read approved" ON public.vendors;
DROP POLICY IF EXISTS "vendors self insert" ON public.vendors;
DROP POLICY IF EXISTS "vendors self update" ON public.vendors;
DROP POLICY IF EXISTS "vendors_read_approved" ON public.vendors;
DROP POLICY IF EXISTS "vendors_insert" ON public.vendors;
DROP POLICY IF EXISTS "vendors_update" ON public.vendors;

CREATE POLICY "vendors public read approved" ON public.vendors
  FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "vendors self insert" ON public.vendors
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "vendors self update" ON public.vendors
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 10.2 VENDOR DOCUMENTS POLICIES
DROP POLICY IF EXISTS "vendor_docs_read_own_or_admin" ON public.vendor_documents;
DROP POLICY IF EXISTS "vendor_docs_insert_own" ON public.vendor_documents;
DROP POLICY IF EXISTS "vendor_docs_admin_update" ON public.vendor_documents;
DROP POLICY IF EXISTS "vendor_docs_admin_delete" ON public.vendor_documents;
DROP POLICY IF EXISTS "vendor_documents_select" ON public.vendor_documents;
DROP POLICY IF EXISTS "vendor_documents_insert" ON public.vendor_documents;
DROP POLICY IF EXISTS "vendor_documents_update" ON public.vendor_documents;
DROP POLICY IF EXISTS "vendor_documents_delete" ON public.vendor_documents;

CREATE POLICY "vendor_docs_read_own_or_admin" ON public.vendor_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "vendor_docs_insert_own" ON public.vendor_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
    AND split_part(file_path, '/', 1) = auth.uid()::text
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND rejection_reason IS NULL
  );

CREATE POLICY "vendor_docs_admin_update" ON public.vendor_documents
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "vendor_docs_admin_delete" ON public.vendor_documents
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 10.3 VENDOR AGREEMENTS POLICIES
DROP POLICY IF EXISTS "agreements_read_own_or_admin" ON public.vendor_agreements;
DROP POLICY IF EXISTS "agreements_insert_own" ON public.vendor_agreements;
DROP POLICY IF EXISTS "vendor_agreements_select" ON public.vendor_agreements;
DROP POLICY IF EXISTS "vendor_agreements_insert" ON public.vendor_agreements;
DROP POLICY IF EXISTS "vendor_agreements_update" ON public.vendor_agreements;
DROP POLICY IF EXISTS "vendor_agreements_delete" ON public.vendor_agreements;

CREATE POLICY "agreements_read_own_or_admin" ON public.vendor_agreements
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Direct client-side INSERT, UPDATE, DELETE on agreements are strictly REVOKED
-- Acceptance must flow exclusively through accept_vendor_agreement() RPC
REVOKE INSERT, UPDATE, DELETE ON public.vendor_agreements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.vendor_agreements TO authenticated;
GRANT ALL ON public.vendor_agreements TO service_role;

-- Grants for vendor_documents:
GRANT SELECT, INSERT ON public.vendor_documents TO authenticated;
GRANT UPDATE, DELETE ON public.vendor_documents TO authenticated; -- Protected by RLS to admin only
GRANT ALL ON public.vendor_documents TO service_role;

-- --------------------------------------------------------------------
-- 11. STORAGE BUCKET & STORAGE.OBJECTS RLS POLICIES
-- --------------------------------------------------------------------

-- Setup private storage bucket with strict limits (no silent exception swallowing)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vendor-documents',
  'vendor-documents',
  false,
  5242880, -- 5 MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Clean up any prior storage policies on vendor-documents
DROP POLICY IF EXISTS "vendor_docs_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "vendor_docs_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "vendor_docs_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "vendor_docs_storage_delete" ON storage.objects;

-- 1. SELECT (Viewing & signed URL generation: Owner or Admin only)
CREATE POLICY "vendor_docs_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'vendor-documents' AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- 2. INSERT (Upload into own folder only: <auth.uid()>/...)
CREATE POLICY "vendor_docs_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vendor-documents' AND
    split_part(name, '/', 1) = auth.uid()::text
  );

-- 3. UPDATE: Disallow object overwrites on vendor-documents. Uploads are immutable write-once.
-- (No UPDATE policy is created)

-- 4. DELETE (Admin or Owner ONLY if document is not currently submitted for review)
CREATE POLICY "vendor_docs_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'vendor-documents' AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        split_part(name, '/', 1) = auth.uid()::text
        AND NOT EXISTS (
          SELECT 1 FROM public.vendor_documents d
          WHERE d.file_path = name
            AND d.status IN ('pending', 'under_review', 'verified', 'approved')
        )
      )
    )
  );

-- --------------------------------------------------------------------
-- 12. NULL-SAFE HANDLE_NEW_USER TRIGGER (PHONE & EMAIL OTP SUPPORT)
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _full_name TEXT;
  _phone TEXT;
BEGIN
  -- Extract phone from record or user metadata
  _phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone');

  -- Null-safe display name resolution
  _full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(split_part(NEW.email, '@', 1), ''),
    _phone,
    'Valued Customer'
  );

  INSERT INTO public.profiles (
    id,
    full_name,
    avatar_url,
    phone,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    _full_name,
    NEW.raw_user_meta_data->>'avatar_url',
    _phone,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = now();

  -- Assign default customer role atomically
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Restrict execution to internal system hooks only
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- --------------------------------------------------------------------
-- 13. NOTIFICATIONS SYSTEM HARDENING & TRIGGER ALIGNMENT
-- --------------------------------------------------------------------

-- 13.1 Align Vendor Status Notifications: Support approved, suspended, action_required, rejected
CREATE OR REPLACE FUNCTION public.handle_vendor_status_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- 1. Operational status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type)
      VALUES (
        NEW.user_id,
        'vendor',
        'Store Approved! 🎉',
        'Congratulations! Your shop "' || NEW.store_name || '" has been approved.',
        'store_approved'
      );
    ELSIF NEW.status = 'suspended' THEN
      INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type)
      VALUES (
        NEW.user_id,
        'vendor',
        'Store Suspended ⚠️',
        'Your shop "' || NEW.store_name || '" has been suspended.',
        'store_suspended'
      );
    END IF;
  END IF;

  -- 2. Onboarding status changes (action_required, rejected)
  IF OLD.onboarding_status IS DISTINCT FROM NEW.onboarding_status THEN
    IF NEW.onboarding_status = 'action_required' THEN
      INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type)
      VALUES (
        NEW.user_id,
        'vendor',
        'Action Required on Application ⚠️',
        'Administrative review requires attention: ' || COALESCE(NEW.admin_review_notes, 'Please review submitted documents and re-upload corrected files.'),
        'vendor_action_required'
      );
    ELSIF NEW.onboarding_status = 'rejected' AND NEW.status != 'approved' THEN
      INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type)
      VALUES (
        NEW.user_id,
        'vendor',
        'Application Status Update',
        'Your vendor application was not approved: ' || COALESCE(NEW.rejection_reason, 'Application criteria not met.'),
        'vendor_rejected'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_status_notifications ON public.vendors;
CREATE TRIGGER trg_vendor_status_notifications
  AFTER UPDATE OF status, onboarding_status ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_vendor_status_notifications();

-- 13.2 Align New Vendor Submission Trigger: Notify admins on actual submission (not draft creation)
CREATE OR REPLACE FUNCTION public.handle_new_vendor_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  admin_rec RECORD;
BEGIN
  -- Notify admins only when an application is actually submitted for review
  IF (TG_OP = 'INSERT' AND NEW.onboarding_status = 'submitted') OR
     (TG_OP = 'UPDATE' AND NEW.onboarding_status = 'submitted' AND OLD.onboarding_status IS DISTINCT FROM NEW.onboarding_status) THEN
    FOR admin_rec IN (SELECT user_id FROM public.user_roles WHERE role = 'admin') LOOP
      INSERT INTO public.notifications (receiver_id, receiver_role, title, message, notification_type)
      VALUES (
        admin_rec.user_id,
        'admin',
        'New Vendor Application Submitted',
        'Artisan application submitted for "' || NEW.store_name || '" is awaiting review.',
        'new_vendor_registration'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_vendor_notifications ON public.vendors;
CREATE TRIGGER trg_new_vendor_notifications
  AFTER INSERT OR UPDATE OF onboarding_status ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_vendor_notifications();

-- 13.3 Notifications Table Authorization & Anti-Spoofing Hardening
-- Revoke anonymous inserts to prevent notification forging
REVOKE INSERT ON public.notifications FROM anon;

-- Replace permissive insert policy with sender-verified policy
DROP POLICY IF EXISTS "system insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "authenticated insert own notifications" ON public.notifications;

CREATE POLICY "authenticated insert own notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );

