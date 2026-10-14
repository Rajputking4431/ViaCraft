# VIACRAFT VENDOR ONBOARDING PHASE 1: PREFLIGHT SECURITY AUDIT

**Target Environment:** ViaCraft Multi-Vendor Marketplace (Staging Readiness)  
**Audit Version:** 1.0 (Phase 1 Final Review)  
**Auditors:** Senior Supabase/PostgreSQL Security Engineer, Application Security Auditor & React/TypeScript Architect  
**Canonical Legal Terms SHA-256:** `a9d94ca06c0c143714b7202d98c2b2b0aa1f0f249562a417cc87b4ad4d64905a`  
**Evaluation Target Migration:** `supabase/migrations/20261014000000_vendor_onboarding_phase1.sql`  

---

## 1. Executive Summary & Audit Scope

This document details the preflight security audit of ViaCraft's Vendor Onboarding Phase 1 and Customer Passwordless Authentication system. The audit evaluates database schemas, Row Level Security (RLS) policies, triggers, `SECURITY DEFINER` functions, execution grants, Supabase Storage access rules, notification workflows, and client-side integration patterns.

### Audit Objectives
1. **Prevent Privilege Escalation:** Verify that non-admin applicants cannot assign themselves the `vendor` or `admin` role, self-approve onboarding applications, or alter administrative verification flags.
2. **Harden Status Lifecycle Transitions:** Ensure that application state changes follow the strict state machine (`draft -> submitted -> under_review -> action_required / approved / rejected`) and prevent post-submission tampering.
3. **Enforce GST Verification & Exemption Controls:** Ensure that commercial businesses provide verified GSTIN and certificate evidence, and that micro-artisan turnover exemptions under CGST Notification No. 34/2023-CT require independent administrative review (`gst_exemption_verified = true`).
4. **Audit Digital Agreement Immutability:** Guarantee that agreement acceptance is executed strictly by the authenticated vendor account owner with verifiable canonical hash check, race-condition-safe idempotency, and tamper-proof storage.
5. **Private Storage & Anti-Spoofing:** Ensure KYC documents reside in private storage accessible only via short-lived signed URLs, locked against unauthorized overwrite or deletion.

---

## 2. Existing Schema & Dependencies Catalog

### 2.1 Core Database Tables
| Table Name | Owner | Primary Key | Foreign Key Dependencies | RLS Status |
| :--- | :--- | :--- | :--- | :--- |
| `public.vendors` | `postgres` | `id` (UUID) | `user_id -> auth.users(id)` | **ENABLED** |
| `public.vendor_documents` | `postgres` | `id` (UUID) | `vendor_id -> public.vendors(id)`, `reviewed_by -> auth.users(id)` | **ENABLED** |
| `public.vendor_agreements` | `postgres` | `id` (UUID) | `vendor_id -> public.vendors(id)`, `user_id -> auth.users(id)` | **ENABLED** |
| `public.user_roles` | `postgres` | `id` (UUID) | `user_id -> auth.users(id)` | **ENABLED** |
| `public.profiles` | `postgres` | `id` (UUID) | `id -> auth.users(id)` | **ENABLED** |
| `public.notifications` | `postgres` | `id` (UUID) | `receiver_id -> public.profiles(id)`, `order_id -> public.orders(id)` | **ENABLED** |
| `storage.objects` | `supabase_storage_admin` | `id` (UUID) | `bucket_id -> storage.buckets(id)` | **ENABLED** |

### 2.2 Enumerated Types
- `public.app_role`: `'admin'`, `'vendor'`, `'customer'`
- `public.vendor_status`: `'pending'`, `'approved'`, `'suspended'`, `'rejected'`
- `public.vendor_onboarding_status`: `'draft'`, `'submitted'`, `'under_review'`, `'action_required'`, `'rejected'`, `'approved'`

### 2.3 Dependencies & Foreign Key Constraints
- Deleting an `auth.users` record cascades to `public.vendors`, `public.vendor_documents`, `public.vendor_agreements`, and `public.user_roles`.
- Deleting a `public.vendors` record cascades to its associated KYC documents and agreement records.
- Product listings (`public.products`) reference `public.vendors(id) ON DELETE CASCADE`.

---

## 3. Comprehensive Row Level Security (RLS) Policy Inventory

> [!IMPORTANT]
> PostgreSQL evaluates permissive RLS policies using `OR` logic. Dropping a single named policy is insufficient if a legacy permissive policy exists on the table.

### 3.1 `public.vendors` Policies
```sql
-- Select: Public storefront can view approved vendors; owners and admins view all
CREATE POLICY "vendors public read approved" ON public.vendors
  FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Insert: Authenticated users can insert their own draft record
CREATE POLICY "vendors self insert" ON public.vendors
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Update: Authenticated owners and admins can update (enforced by trigger check_vendor_update_permissions)
CREATE POLICY "vendors self update" ON public.vendors
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
```

### 3.2 `public.vendor_documents` Policies
```sql
-- Select: Vendor owner and platform administrators only
CREATE POLICY "vendor_docs_read_own_or_admin" ON public.vendor_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Insert: Vendor owner can upload new document in pending status
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

-- Update: Platform administrators only (status, review notes)
CREATE POLICY "vendor_docs_admin_update" ON public.vendor_documents
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Delete: Platform administrators only
CREATE POLICY "vendor_docs_admin_delete" ON public.vendor_documents
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

### 3.3 `public.vendor_agreements` Policies
```sql
-- Select: Vendor owner or platform administrator
CREATE POLICY "agreements_read_own_or_admin" ON public.vendor_agreements
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Direct Writes: REVOKED. Client-side INSERT, UPDATE, DELETE revoked from public, anon, authenticated.
-- Acceptance occurs exclusively via the SECURITY DEFINER RPC accept_vendor_agreement().
```

### 3.4 `storage.objects` Policies (`vendor-documents` Bucket)
```sql
-- Select: Vendor owner (matching root directory auth.uid()) or Admin
CREATE POLICY "vendor_docs_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'vendor-documents' AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- Insert: Write-once upload into authenticated user folder (<auth.uid()>/...)
CREATE POLICY "vendor_docs_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vendor-documents' AND
    split_part(name, '/', 1) = auth.uid()::text
  );

-- Update: REVOKED (No UPDATE policy defined; uploads are immutable)

-- Delete: Admin or Owner ONLY IF document is not under review or approved
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
```

### 3.5 `public.notifications` Policies
```sql
-- Select: Recipient or Admin
CREATE POLICY "users read own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (receiver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Insert: Restricted to verified sender or Admin (Anonymous inserts revoked)
CREATE POLICY "authenticated insert own notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );
```

---

## 4. Functions, Triggers & Grants Inventory

| Function Name | Security Type | Search Path | Execution Grants | Trigger Association | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `public.has_role()` | `SECURITY DEFINER` | `public, pg_temp` | `authenticated` | N/A | Check app role in `public.user_roles` safely. |
| `check_vendor_insert_permissions()` | `SECURITY DEFINER` | `public, pg_temp` | `postgres` | `trg_protect_vendor_insert` (`BEFORE INSERT ON public.vendors`) | Cleans applicant input, forces `status = 'pending'`, clears review fields. |
| `check_vendor_update_permissions()` | `SECURITY DEFINER` | `public, pg_temp` | `postgres` | `trg_protect_vendor_status` (`BEFORE UPDATE ON public.vendors`) | Prevents role/status tampering, locks tax/bank fields when submitted, validates state machine. |
| `check_vendor_document_permissions()` | `SECURITY DEFINER` | `public, pg_temp` | `postgres` | `trg_protect_vendor_documents` (`BEFORE INSERT OR UPDATE OR DELETE ON public.vendor_documents`) | Enforces user folder matching, prevents document modification or premature deletion. |
| `prevent_vendor_agreement_tampering()` | `SECURITY DEFINER` | `public, pg_temp` | `postgres` | `trg_immutable_vendor_agreements` (`BEFORE UPDATE OR DELETE ON public.vendor_agreements`) | Rejects all update/delete queries on agreement rows. |
| `accept_vendor_agreement()` | `SECURITY DEFINER` | `public, pg_temp` | `authenticated` | N/A | Validates version, owner check, canonical hash, idempotent `ON CONFLICT DO NOTHING`. |
| `admin_approve_vendor()` | `SECURITY DEFINER` | `public, pg_temp` | `authenticated` | N/A | Admin-only activation, validates PAN, bank proof, GST/exemption, agreement, assigns role. |
| `handle_new_user()` | `SECURITY DEFINER` | `public, pg_temp` | `INTERNAL ONLY` | `trg_handle_new_user` (`AFTER INSERT ON auth.users`) | Null-safe profile and customer role creation on email/phone signup. |
| `handle_vendor_status_notifications()` | `SECURITY DEFINER` | `public, pg_temp` | `postgres` | `trg_vendor_status_notifications` (`AFTER UPDATE ON public.vendors`) | Dispatches `store_approved`, `store_suspended`, `action_required`, `rejected`. |
| `handle_new_vendor_notifications()` | `SECURITY DEFINER` | `public, pg_temp` | `postgres` | `trg_new_vendor_notifications` (`AFTER INSERT OR UPDATE ON public.vendors`) | Alerts admins when vendor transitions to `submitted`. |

---

## 5. Security Audit Findings & Classifications

### [CRITICAL] Finding 1: Unverified GST Exemption Bypass & Lack of Independent Review
- **Severity:** CRITICAL
- **Location:** `supabase/migrations/20261014000000_vendor_onboarding_phase1.sql:41-45, 530-544`
- **Description:** Previously, applicants could check `is_gst_exempt = true` to bypass GSTIN entry. Without independent review, commercial companies could evade GST compliance.
- **Evidence:** Micro-artisan exemption under CGST Notification No. 34/2023-CT applies strictly to unregistered persons with turnover under ₹20L/₹40L supplying intra-state goods through an e-commerce operator. Corporate entities (`Private Limited`, `LLP`, `Partnership`) are legally ineligible.
- **Resolution:**
  1. Added `gst_exemption_verified` and `gst_exemption_reason` columns.
  2. In `admin_approve_vendor()`, explicitly block approval if a corporate structure claims artisan exemption.
  3. Require `gst_exemption_verified = true` before allowing approval of exempt vendors.

### [CRITICAL] Finding 2: False Admin Alerts on Draft & Missing Notification on Re-submission
- **Severity:** CRITICAL
- **Location:** `supabase/migrations/20260626173000_notifications_system.sql:294-317`
- **Description:** Legacy trigger `trg_new_vendor_notifications` fired on `AFTER INSERT ON public.vendors`. Because applicants create a draft row on Step 1, admins received false "New Vendor Submitted" notifications. When vendors actually submitted (`UPDATE to submitted`), no alert fired.
- **Resolution:** Replaced trigger with `AFTER INSERT OR UPDATE OF onboarding_status ON public.vendors`. Notification is dispatched strictly when `NEW.onboarding_status = 'submitted'`.

### [CRITICAL] Finding 3: Unauthenticated / Arbitrary Notification Forging
- **Severity:** CRITICAL
- **Location:** `supabase/migrations/20260626173000_notifications_system.sql:26, 42-45`
- **Description:** Direct `GRANT INSERT ON public.notifications TO authenticated, anon;` with `CREATE POLICY "system insert notifications" WITH CHECK (true)` allowed untrusted users to insert forged notifications.
- **Resolution:** Revoked anonymous insert permissions. Replaced policy with `"authenticated insert own notifications"` requiring `sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin')`.

### [HIGH] Finding 4: Administrator Impersonation in Agreement Acceptance
- **Severity:** HIGH
- **Location:** `supabase/migrations/20261014000000_vendor_onboarding_phase1.sql:357-370`
- **Description:** Earlier iterations permitted an administrator to invoke `accept_vendor_agreement()`, recording `auth.uid()` as the accepting party for a vendor's agreement.
- **Resolution:** Strictly restricted acceptance to `_vendor_user_id == auth.uid()`. Administrators cannot execute agreements on behalf of vendors.

### [HIGH] Finding 5: Immutability Trigger Collision on Idempotent Agreement Acceptance
- **Severity:** HIGH
- **Location:** `supabase/migrations/20261014000000_vendor_onboarding_phase1.sql:381-420`
- **Description:** `public.vendor_agreements` enforces immutability via `BEFORE UPDATE OR DELETE` trigger. An `ON CONFLICT DO UPDATE` clause attempts an update and is blocked by the trigger.
- **Resolution:** Replaced with `ON CONFLICT (vendor_id, agreement_version) DO NOTHING RETURNING id`. If duplicate, the function queries the existing record and returns `is_duplicate: true` idempotently without firing update triggers.

### [HIGH] Finding 6: Client-Side Vendor Role Assignment Vulnerability
- **Severity:** HIGH
- **Location:** `src/routes/sell.tsx`, `supabase/migrations/20261014000000_vendor_onboarding_phase1.sql:588-592`
- **Description:** Role elevation must never occur from frontend code.
- **Resolution:** Role assignment is executed server-side inside `admin_approve_vendor()` (`INSERT INTO public.user_roles (user_id, role) VALUES (_vendor.user_id, 'vendor') ON CONFLICT DO NOTHING`). Direct modifications from frontend are eliminated.

### [MEDIUM] Finding 7: Document File Path Tampering
- **Severity:** MEDIUM
- **Location:** `supabase/migrations/20261014000000_vendor_onboarding_phase1.sql:275-278, 660-667`
- **Description:** Without path validation, an applicant could insert metadata pointing to another vendor's uploaded document.
- **Resolution:** Enforced in both RLS and trigger: `split_part(file_path, '/', 1) = auth.uid()::text`.

### [MEDIUM] Finding 8: Duplicate Store Approval Notifications
- **Severity:** MEDIUM
- **Location:** `supabase/migrations/20261014000000_vendor_onboarding_phase1.sql:593-595`
- **Description:** If `admin_approve_vendor()` manually inserts a notification, it duplicates the notification emitted by `trg_vendor_status_notifications`.
- **Resolution:** Removed manual insert in `admin_approve_vendor()`, letting `trg_vendor_status_notifications` handle notifications once per transition.

### [MEDIUM] Finding 9: Null-Safe Profile Generation on Phone OTP Signup
- **Severity:** MEDIUM
- **Location:** `supabase/migrations/20261014000000_vendor_onboarding_phase1.sql:780-791`
- **Description:** In phone-only signups, `NEW.email` is null. Dereferencing `split_part(NEW.email, '@', 1)` caused failure or empty full names.
- **Resolution:** Implemented fallback hierarchy: metadata full_name -> metadata name -> email prefix -> phone number -> 'Valued Customer'.

### [LOW] Finding 10: Canonical Legal Document Hash Verification
- **Severity:** LOW
- **Location:** `public/legal/vendor-terms.md`, `supabase/migrations/20261014000000_vendor_onboarding_phase1.sql:348`
- **Description:** File hash must match exact canonical file bytes.
- **Resolution:** Verified exact SHA-256 hash using `Get-FileHash -Algorithm SHA256 "public\legal\vendor-terms.md"`: `a9d94ca06c0c143714b7202d98c2b2b0aa1f0f249562a417cc87b4ad4d64905a`.

### [LOW] Finding 11: SMS DLT Registration & Telecom Compliance in India
- **Severity:** LOW
- **Location:** `src/pages/customer/Auth.tsx:288-308`
- **Description:** In India, commercial SMS OTP delivery requires Distributed Ledger Technology (DLT) entity registration, registered sender headers, and pre-approved SMS templates (TRAI mandate).
- **Resolution:** The UI gracefully catches missing SMS gateway configuration and advises the user to configure credentials or use Email OTP.

---

## 6. Preflight Database Inspection Script Reference

The read-only inspection script is located at:
[supabase/audits/vendor_onboarding_preflight.sql](file:///c:/Users/om/OneDrive/Desktop/ViaCraft-main%20(3)/ViaCraft-main/supabase/audits/vendor_onboarding_preflight.sql)

It performs 12 distinct catalog queries without modifying any database state.
