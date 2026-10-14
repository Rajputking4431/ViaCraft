# VIACRAFT — UPDATED MASTER IMPLEMENTATION PLAN
## Customer Email/SMS OTP + Vendor Onboarding Phase 1

> This is an implementation specification, not evidence that the changes have already been implemented. The coding agent must verify all reported findings against the current repository and Supabase project before editing or migrating.

## 1. Objective

Implement:
1. Customer passwordless authentication using **Email OTP OR SMS OTP**.
2. Vendor onboarding with digital registration, contact verification, business details, private document upload, manual admin review, digital agreement acceptance, and admin-controlled activation.

Preserve existing customer accounts, orders, cart/wishlist, checkout, payment integrations, vendor dashboard, admin dashboard, and routes.

## 2. Reported architecture to re-verify

The supplied audit reports React 19, Vite 7, TypeScript, Tailwind, Supabase JS v2, `input-otp`, an existing Supabase client singleton, customer auth in `src/pages/customer/Auth.tsx`, vendor onboarding in `src/routes/sell.tsx`, role handling in `src/hooks/use-admin.tsx`, and an existing `legal/vendor-terms.md`.

It also reports:
- Client-side vendor role assignment in `sell.tsx`.
- A vendor self-update policy that may permit status tampering.
- `useRole()` using `.maybeSingle()` despite users potentially having multiple role rows.
- A user-creation trigger that may fail for phone-only accounts.
- Public Cloudinary uploads currently used for public assets.
- Resend server-side email code but no configured SMS provider.

**Re-check each finding against the current working tree, actual database schema, trigger definitions, and full RLS expressions. Do not assume this report is still current.**

## 3. Non-negotiable safety rules

- Reuse the existing Supabase client; do not create a second client.
- Never expose Resend, SMS-provider, service-role, or other secret keys in browser code or `VITE_*` variables.
- Never disable RLS to make implementation easier.
- Do not reset/truncate production data or run destructive SQL.
- Do not apply migrations to production without explicit authorization.
- Never allow a client to assign `vendor` or `admin` roles.
- Never allow applicants to edit approval status, verification flags, reviewer fields, or admin notes.
- Do not mark documents as verified merely because they were uploaded or format-validated.
- Do not store OTP codes in custom tables.
- Do not expose KYC documents or full bank details publicly.
- Do not automatically merge email and phone identities based only on matching input.
- Do not claim tests, provider delivery, or deployment succeeded unless actually verified.
- Test migrations in staging/non-production first and prepare a rollback plan.

## 4. Module A — Customer Email OTP

1. Add “Continue with Email” to the customer authentication screen.
2. Normalize and validate email input.
3. Use Supabase Auth `signInWithOtp()` for the request.
4. Configure Supabase Auth custom SMTP through Resend or another supported SMTP provider.
5. Configure the email template to send the OTP token (commonly `{{ .Token }}`).
6. Verify using `supabase.auth.verifyOtp({ email, token, type: "email" })`.
7. Create a session only after Supabase confirms successful verification.
8. Preserve intended redirects, protected routes, guest-cart merge, and wishlist merge.
9. Keep existing password login as a fallback until compatibility is verified.

Use the existing `input-otp` package if present. Provide six-digit input where supported, paste support, resend cooldown, masked destination, change-email action, loading states, and understandable errors.

## 5. Module A — Customer SMS OTP

1. Add “Continue with Mobile Number”.
2. Validate Indian mobile numbers and normalize to E.164 (`+91XXXXXXXXXX`).
3. Use Supabase Auth `signInWithOtp({ phone })`.
4. Configure a compatible SMS provider in Supabase Auth.
5. Verify using `supabase.auth.verifyOtp({ phone, token, type: "sms" })`.
6. Establish a session only after successful verification.
7. If provider credentials are missing, show a clear configuration error; never fake SMS delivery.

Select a provider supported by the current Supabase Phone Auth configuration. Verify current provider compatibility, India delivery, pricing, sender requirements, and applicable TRAI/DLT requirements. A provider's standalone OTP API does not automatically create a Supabase session.

## 6. Identity and account compatibility

- Email and phone identities may belong to separate Supabase users unless linked through a supported explicit flow.
- Never silently merge accounts.
- Do not delete/recreate existing users.
- Inspect profile/role creation triggers and make them null-safe for phone-only users.
- Avoid duplicate profile or role rows.
- Do not assign vendor/admin roles during customer signup.
- Test cart and wishlist merge after both OTP methods.
- Keep password login available until existing-account compatibility is proven.

## 7. Rate limits and abuse prevention

- Configure SMTP and SMS providers before testing real delivery.
- Configure Supabase Auth rate limits and provider limits separately.
- Use a resend cooldown in the UI, but do not rely on the frontend cooldown as security.
- Add CAPTCHA/anti-abuse protections where supported.
- Test invalid/expired OTPs, repeated requests, provider failures, and concurrent attempts.
- Do not promise 30 successful registrations per hour until configured limits and real delivery are tested. OTP requests, retries, and successful registrations are different metrics.

## 8. Email/SMS branding and secrets

### Email
- Verify the sending domain with the provider and configure its required DNS records.
- Configure Supabase Auth custom SMTP.
- Use a sender such as `ViaCraft <no-reply@verified-domain>` only after the sender/domain is verified.
- Test real delivery and spam placement.
- Do not assume an existing Resend server module automatically handles Supabase Auth emails.

**Never use `VITE_RESEND_API_KEY`.** Vite exposes `VITE_*` variables in client bundles. Keep provider API keys server-side or in the relevant provider dashboard. If a real key was exposed or committed, rotate/revoke it and remove it from client code and repository history as appropriate.

### SMS
- Configure the chosen provider only in Supabase Dashboard or trusted server-side secret storage.
- Register/verify sender headers and templates as required in India.
- Configure OTP template and expiry according to provider/Supabase settings.
- Test actual delivery to permitted test numbers.

## 9. Module B — Vendor onboarding workflow

Suggested workflow:

`draft → submitted → under_review → action_required → under_review → approved`

A submitted application may also become `rejected`. Activation and role assignment must be a trusted admin decision.

### Vendor form
Collect only necessary fields, such as:
- Representative name and store/brand name.
- Contact email and mobile.
- Business type and address.
- PAN details where required by the onboarding policy.
- GSTIN and Udyam number where applicable.
- Payout details only when needed, with restricted access.

Do not universally require GSTIN or Udyam without checking applicability. Do not collect Aadhaar numbers/images by default. Any Aadhaar-based verification requires a permitted route and appropriate consent. Format validation is not identity or tax verification.

### Private documents
Use a private Supabase Storage bucket such as `vendor-documents` only after checking existing storage configuration. Example limits: PDF/JPEG/PNG, maximum 5 MB, configurable as needed.

- Path should start with authenticated user's UUID.
- Do not use public Cloudinary uploads for PAN, GST, bank proof, or sensitive KYC documents.
- Restrict object access by ownership and admin authorization.
- Use short-lived signed URLs only after authorization.
- Validate file type/size server-side where possible; do not trust browser MIME/extension alone.
- Prevent vendors from setting `status`, `reviewed_by`, `reviewed_at`, or rejection fields during insert.
- Prevent unreviewed replacements/deletions from bypassing review.

### Manual review
Admin interface should show application ID, submission time, business details, contact verification, document statuses, agreement state, review notes, and action history.

Admin actions: approve/reject individual documents, request corrections, reject application with a reason, and approve/activate only when all required conditions pass. OTP verification is not KYC verification.

## 10. Digital vendor agreement

Confirm the actual content, version, effective date, and legal review status of `legal/vendor-terms.md` before displaying it.

Show the full agreement, version/date, and an explicit acceptance action. Record an auditable event tied to the authenticated vendor and agreement version, with trusted server/database timestamp and controlled agreement hash.

Do not trust a hash submitted by the browser. Compute/validate the hash in a trusted environment. Restrict inserts to the correct authenticated vendor. Prevent editing/deleting acceptance history except through a carefully authorized process.

A checkbox is evidence of an acceptance action, but must not be described as a qualified electronic signature or as satisfying every legal signature requirement. Obtain legal review if required.

## 11. Database/RLS security requirements

Do not blindly apply earlier draft SQL. Inspect real columns, enums, constraints, foreign keys, indexes, triggers, helper functions, and every RLS `USING`/`WITH CHECK` expression first.

### Vendor status
Applicants must not modify:
- `status` or `onboarding_status` to approved/active.
- PAN/GST/bank verification flags.
- `reviewed_by`, `reviewed_at`, admin notes, or rejection decisions.
- Any role assignment.

Enforce this in database/trusted backend, not only in React. Review all `SECURITY DEFINER` functions for a fixed safe `search_path`, explicit authorization, least privilege, and restricted EXECUTE grants.

### `vendor_documents`
- Vendor can insert only for their own application.
- Database forces/validates new documents as `pending`.
- Vendor cannot set review status or reviewer metadata.
- Admin-only review updates.
- Vendor reads only own document metadata; admin reads only with verified admin permission.
- Storage policies must separately enforce ownership.

### `vendor_agreements`
- Vendor can accept only for their own application.
- Only a valid offered agreement version/hash may be accepted.
- Timestamp must be trusted.
- Prevent unauthorized updates/deletes.
- Do not trust client-supplied IP/audit claims.
- Ensure uniqueness matches the intended agreement-version policy.

### Admin approval RPC
If creating `admin_approve_vendor`, it must validate inside the database transaction:
1. Caller is an authorized admin.
2. Application exists and is in an approvable state.
3. Every required document exists and is approved.
4. All mandatory checks are complete.
5. The correct applicant accepted the current required agreement.
6. Application is not in a conflicting state.
7. Any other required business checks are complete.

Only then atomically update vendor status and assign the vendor role. Repeated approval should be idempotent. Use least-privilege grants and a safe `SECURITY DEFINER` configuration. Do not rely solely on a hidden/disabled frontend button.

### Roles and triggers
- Remove client-side `user_roles` insert granting `vendor`.
- Assign vendor role only in the trusted approval flow.
- Never assign admin role through public signup.
- Fix `useRole()` to handle multiple roles safely.
- Inspect `handle_new_user()` and make it null-safe for `NEW.email` and `NEW.phone`, without duplicate profiles or role rows.

## 12. Suggested data model

Reuse existing tables when equivalents exist. Do not duplicate `profiles`, `user_roles`, `vendors`, products, or orders.

Add vendor onboarding fields, document metadata, agreement records, or review audit events only if the current schema lacks equivalent functionality. Avoid placing full bank details in broadly readable vendor rows. Add appropriate constraints, indexes, foreign keys, and RLS.

Migrations must be reviewable and must not silently rewrite existing data.

## 13. UI and routing

Customer auth:
- Email OTP and mobile OTP choices.
- Dedicated OTP screen.
- Resend cooldown and change destination.
- Existing password login fallback during transition.
- Clear loading and error states.

Vendor:
- Progress indicator and multi-step form.
- Conditional tax fields.
- Private document upload.
- Application status page.
- Agreement review/acceptance.
- Correction and resubmission workflow.

Admin:
- Pending applications queue.
- Secure document preview.
- Per-document review.
- Correction request and rejection reason.
- Agreement audit view.
- Final approval action.

Follow existing routing conventions and subdomain behavior. Preserve customer, vendor, and admin routes. Route guards improve UX but are not the security boundary.

## 14. Environment variables

- Reuse existing `VITE_SUPABASE_URL` and public/publishable key.
- Never expose Supabase service-role keys.
- Never expose Resend/SMS provider secrets through `VITE_*`.
- Put Supabase Auth SMTP credentials in the Supabase Dashboard.
- Keep `.env` out of Git.
- Rotate secrets confirmed exposed in a frontend bundle or public repository.
- Cloudinary may remain for public product/store images only.

## 15. Implementation sequence

### Phase 0 — Audit
Inspect code, actual schema, triggers, functions, policies, and storage configuration. List exact files/migrations to change. Do not apply production migrations.

### Phase 1 — Security
Remove client-side vendor role assignment. Prevent self-approval and verification-field tampering. Fix multi-role lookup. Test RLS and direct API attacks.

### Phase 2 — Email OTP
Configure verified sending domain, Resend SMTP, OTP template, UI, and Supabase verification. Preserve password login until tested.

### Phase 3 — SMS OTP
Select compatible provider, complete required India configuration, implement native Supabase phone OTP, and test real delivery.

### Phase 4 — Vendor onboarding
Registration, validation, private document upload, application status, admin review, corrections, and rejection.

### Phase 5 — Agreement and activation
Verify legal terms/version, record acceptance, enforce required checks in trusted approval function, and assign vendor role atomically.

### Phase 6 — Regression and release
Test customer auth, cart, wishlist, checkout, payments, order history, vendor/admin flows, RLS, storage, and production build. Deploy only after explicit authorization.

## 16. Test matrix

### Authentication
- Email OTP request, delivery, valid/invalid/expired OTP.
- SMS OTP request, delivery, valid/invalid/expired OTP.
- Resend cooldown, rate limits, provider failure.
- Existing password account compatibility.
- Profile/role creation for email-only and phone-only users.
- Cart/wishlist merge, logout, session persistence.

### Vendor
- Valid/invalid form, duplicate submission.
- Upload size/type restrictions.
- Cross-vendor document access denied.
- Vendor cannot approve own document or application.
- Vendor cannot set reviewer/verification fields or assign own role.
- Admin-only review actions.
- Missing documents or agreement block activation.
- Corrections, resubmission, rejection, and approval.
- Vendor dashboard locked before activation.

### Regression
- Customer profile, cart, wishlist, checkout, order history.
- Existing payment gateways.
- Vendor product management.
- Admin workflows.
- Direct route navigation.
- RLS and storage policies.
- TypeScript and production build.

Report every test as `passed`, `failed`, or `not run`. Do not invent results.

## 17. Deliverables

1. Audit findings confirmed against the current repository.
2. Files changed and reasons.
3. Migration files and rollback instructions.
4. Complete RLS policy changes and rationale.
5. Supabase, Resend, and SMS setup instructions.
6. Required environment variable names only—never secret values.
7. Tests actually run and results.
8. Manual setup remaining.
9. Known limitations.
10. Deployment instructions.

## 18. Final execution instruction

Start with the repository/database audit. Do not immediately overwrite files, run destructive SQL, or deploy. Identify conflicts between this plan and the real codebase. Implement in small, reviewable stages, validate each stage, preserve unrelated functionality, and request explicit authorization before production changes.

**Goal:** Secure ViaCraft customer Email/SMS OTP and vendor onboarding with server-enforced authorization, private documents, manual review, auditable agreement acceptance, and safe vendor activation.
