import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/layouts/PageShell";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  TrendingUp,
  Heart,
  Store,
  Building2,
  CreditCard,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Upload,
  Trash2,
  Eye,
  ArrowRight,
  ArrowLeft,
  Clock,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { trackVendorRegistration } from "@/services/analytics/google";
import { sendVendorAppliedEmail, sendAdminNewVendorEmail } from "@/api/email.functions";
import { uploadVendorDocument, fetchVendorDocuments } from "@/services/vendor-documents";
import { getVendorOverride } from "@/services/admin-vendor-sync";
import {
  recordAgreementAcceptance,
  CURRENT_VENDOR_AGREEMENT_VERSION,
  CURRENT_VENDOR_AGREEMENT_TITLE,
  CURRENT_VENDOR_AGREEMENT_DATE,
} from "@/services/vendor-agreements";
import type {
  BusinessType,
  DocumentType,
  VendorDocument,
  ExtendedVendor,
} from "@/types/vendor-onboarding";

export const Route = createFileRoute("/sell")({
  head: () => ({ meta: [{ title: "Artisan Onboarding — ViaCraft" }] }),
  component: SellPage,
});

const BUSINESS_TYPES: BusinessType[] = [
  "Artisan / Individual",
  "Sole Proprietorship",
  "Partnership",
  "Private Limited",
  "LLP",
];

function SellPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Multi-step form step (1 = Basic, 2 = Tax & Business, 3 = Bank Details, 4 = Documents, 5 = Agreement)
  const [step, setStep] = useState(1);

  // Form State: Step 1 - Basic Info
  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("Artisan / Individual");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");

  // Form State: Step 2 - Business & Tax
  const [panNumber, setPanNumber] = useState("");
  const [hasGst, setHasGst] = useState(false);
  const [gstin, setGstin] = useState("");
  const [hasUdyam, setHasUdyam] = useState(false);
  const [udyamNumber, setUdyamNumber] = useState("");

  // Form State: Step 3 - Bank Details
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");

  // Form State: Step 4 - Private Documents (Stored in Supabase Private Storage)
  const [panDocFile, setPanDocFile] = useState<File | null>(null);
  const [gstDocFile, setGstDocFile] = useState<File | null>(null);
  const [udyamDocFile, setUdyamDocFile] = useState<File | null>(null);
  const [bankDocFile, setBankDocFile] = useState<File | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  // Form State: Step 5 - Agreement Acceptance
  const [agreementText, setAgreementText] = useState("");
  const [agreementLoading, setAgreementLoading] = useState(false);
  const [acceptedAgreement, setAcceptedAgreement] = useState(false);
  const [submittingApplication, setSubmittingApplication] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Correction Resubmission State
  const [resubmittingDocType, setResubmittingDocType] = useState<DocumentType | null>(null);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);

  // Fetch current vendor application (if any)
  const { data: existing, refetch: refetchVendor } = useQuery({
    queryKey: ["my-vendor", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // 1. Try querying vendors joined with vendor_profiles
      try {
        const { data, error } = await supabase
          .from("vendors")
          .select("*, vendor_profiles(*)")
          .eq("user_id", user!.id)
          .maybeSingle();

        if (!error && data) {
          const rawVendor: any = data;
          const vp = Array.isArray(rawVendor.vendor_profiles) ? rawVendor.vendor_profiles[0] : rawVendor.vendor_profiles;
          const sl: any = vp?.social_links || {};
          return {
            ...rawVendor,
            onboarding_status:
              rawVendor.onboarding_status ||
              sl.onboarding_status ||
              (rawVendor.status === "approved" ? "approved" : "submitted"),
            contact_name: rawVendor.contact_name || sl.representative_name,
            pan_number: rawVendor.pan_number || sl.pan_number,
            gstin: rawVendor.gstin || sl.gstin,
            udyam_number: rawVendor.udyam_number || sl.udyam_number,
            bank_account_details: rawVendor.bank_account_details || sl.bank_account_details,
            admin_review_notes: rawVendor.admin_review_notes || sl.admin_review_notes,
            rejection_reason: rawVendor.rejection_reason || sl.rejection_reason,
          } as ExtendedVendor;
        }
      } catch (err) {
        console.warn("vendors join query note:", err);
      }

      // 2. Direct vendor select fallback
      let plainVendor: ExtendedVendor | null = null;
      try {
        const { data: plainData, error: plainError } = await supabase
          .from("vendors")
          .select("*")
          .eq("user_id", user!.id)
          .maybeSingle();

        if (!plainError && plainData) {
          plainVendor = plainData as unknown as ExtendedVendor;
        }
      } catch {}

      // 3. Fallback: inspect vendor_profiles by user_id
      let profileVendor: ExtendedVendor | null = null;
      try {
        const { data: vpList } = await supabase.from("vendor_profiles").select("*");
        const myVp = vpList?.find((item: any) => (item.social_links as any)?.user_id === user!.id);
        if (myVp) {
          const sl: any = myVp.social_links || {};
          profileVendor = {
            id: myVp.vendor_id,
            user_id: user!.id,
            store_name: sl.store_name || sl.representative_name || "My Store",
            slug: sl.slug || "my-store",
            status: sl.status || "pending",
            onboarding_status: sl.onboarding_status || "submitted",
            created_at: sl.submitted_at || myVp.created_at,
            updated_at: myVp.updated_at,
            contact_name: sl.representative_name,
            pan_number: sl.pan_number,
            gstin: sl.gstin,
            udyam_number: sl.udyam_number,
            bank_account_details: sl.bank_account_details,
            admin_review_notes: sl.admin_review_notes,
            rejection_reason: sl.rejection_reason,
          } as ExtendedVendor;
        }
      } catch {}

      // 4. Check user_roles and persistent sync store for active 'vendor' role / approval
      let isVendorRoleGranted = false;
      try {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user!.id)
          .eq("role", "vendor")
          .maybeSingle();
        if (roleRow) isVendorRoleGranted = true;
      } catch {}

      const candidate = plainVendor || profileVendor;
      const override = getVendorOverride(user!.id) || (candidate?.id ? getVendorOverride(candidate.id) : null);
      if (override?.status === "approved" || override?.onboarding_status === "approved") {
        isVendorRoleGranted = true;
      }

      if (candidate) {
        if (isVendorRoleGranted) {
          candidate.status = "approved";
          candidate.onboarding_status = "approved";
        }
        return candidate;
      }

      if (isVendorRoleGranted) {
        return {
          id: user!.id,
          user_id: user!.id,
          store_name: user?.user_metadata?.full_name ? `${user.user_metadata.full_name}'s Store` : "Artisan Store",
          slug: "artisan-store",
          status: "approved",
          onboarding_status: "approved",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as ExtendedVendor;
      }

      return null;
    },
  });

  // Fetch existing uploaded documents if vendor exists
  const { data: vendorDocs = [], refetch: refetchDocs } = useQuery({
    queryKey: ["my-vendor-documents", existing?.id],
    enabled: !!existing?.id,
    queryFn: () => fetchVendorDocuments(existing!.id),
  });

  // Prefill email and full name from user session
  useEffect(() => {
    if (user) {
      if (!supportEmail && user.email) setSupportEmail(user.email);
      if (!fullName && user.user_metadata?.full_name) {
        setFullName(user.user_metadata.full_name);
      }
      if (!accountHolderName && (user.user_metadata?.full_name || fullName)) {
        setAccountHolderName(user.user_metadata?.full_name || fullName);
      }
    }
  }, [user]);

  // Load Agreement content on mount
  useEffect(() => {
    setAgreementLoading(true);
    fetch("/legal/vendor-terms.md")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load vendor terms");
        return res.text();
      })
      .then((text) => {
        setAgreementText(text);
        setAgreementLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to load /legal/vendor-terms.md:", err);
        setAgreementLoading(false);
      });
  }, []);

  // Validation helpers
  const validatePan = (pan: string) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase());
  const validateGstin = (gst: string) =>
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst.toUpperCase());
  const validateUdyam = (u: string) => /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/.test(u.toUpperCase());
  const validateIfsc = (ifsc: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase());

  // Step 1 Validation
  const handleStep1Next = () => {
    if (!fullName.trim()) return toast.error("Please enter the representative full name");
    if (!storeName.trim()) return toast.error("Please enter your store or brand name");
    if (!supportEmail.trim() || !supportEmail.includes("@"))
      return toast.error("Please enter a valid email address");
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10)
      return toast.error("Please enter a valid 10-digit mobile number");
    if (!streetAddress.trim() || !city.trim() || !stateName.trim() || !pinCode.trim())
      return toast.error("Please complete all business address fields");
    setStep(2);
  };

  // Step 2 Validation
  const handleStep2Next = () => {
    const cleanPan = panNumber.trim().toUpperCase();
    if (!validatePan(cleanPan)) {
      return toast.error("Please enter a valid 10-character PAN number (e.g. ABCDE1234F)");
    }
    if (hasGst && !validateGstin(gstin.trim().toUpperCase())) {
      return toast.error("Please enter a valid 15-character GSTIN or uncheck GST option");
    }
    if (hasUdyam && !validateUdyam(udyamNumber.trim().toUpperCase())) {
      return toast.error("Please enter a valid Udyam number (e.g. UDYAM-MH-01-1234567)");
    }
    setStep(3);
  };

  // Step 3 Validation
  const handleStep3Next = () => {
    if (!accountHolderName.trim()) return toast.error("Please enter the bank account holder name");
    if (!bankName.trim()) return toast.error("Please enter your bank name");
    if (!accountNumber.trim()) return toast.error("Please enter your bank account number");
    if (accountNumber !== confirmAccountNumber) {
      return toast.error("Bank account numbers do not match. Please verify.");
    }
    if (!validateIfsc(ifscCode.trim().toUpperCase())) {
      return toast.error("Please enter a valid 11-character IFSC code (e.g. HDFC0001234)");
    }
    setStep(4);
  };

  // Step 4 Validation
  const handleStep4Next = () => {
    if (!panDocFile) return toast.error("PAN card document upload is required for verification");
    if (hasGst && !gstDocFile)
      return toast.error("GST registration certificate upload is required when GSTIN is provided");
    if (hasUdyam && !udyamDocFile)
      return toast.error("Udyam registration certificate upload is required");
    if (!bankDocFile)
      return toast.error("Bank proof (cancelled cheque or passbook copy) is required for payout verification");
    setStep(5);
  };

  // =========================================================================
  // FINAL SUBMISSION (CREATES APPLICATION + UPLOADS PRIVATE DOCS + AUDIT)
  // =========================================================================
  const handleSubmitApplication = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }

    if (!acceptedAgreement) {
      return toast.error("You must review and digitally accept the Vendor Agreement to submit");
    }

    setSubmissionError(null);
    setSubmittingApplication(true);
    try {
      // 1. Generate unique slug
      const slug =
        storeName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") +
        "-" +
        Math.random().toString(36).slice(2, 6);

      const businessAddressObj = {
        street: streetAddress.trim(),
        city: city.trim(),
        state: stateName.trim(),
        pinCode: pinCode.trim(),
        country: "India",
      };

      const bankDetailsObj = {
        accountHolderName: accountHolderName.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
      };

      // 2. Safe & idempotent vendor insert/lookup
      let vendorId: string = existing?.id || "";
      let isExistingVendor = !!vendorId;

      if (!vendorId) {
        try {
          const { data: foundVendor } = await supabase
            .from("vendors")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (foundVendor?.id) {
            vendorId = foundVendor.id;
            isExistingVendor = true;
          }
        } catch (lookupErr) {
          console.warn("Existing vendor lookup note:", lookupErr);
        }
      }

      if (!vendorId) {
        vendorId = crypto.randomUUID();
      }

      // Base guaranteed columns that exist in the live database schema
      const baseVendorPayload = {
        store_name: storeName.trim(),
        tagline: tagline.trim() || `${businessType} in ${city}, India`,
        bio: bio.trim(),
        location: `${city}, ${stateName}`,
        status: "pending" as const,
        updated_at: new Date().toISOString(),
      };

      // Extended columns in case Phase 1 migration has run
      const extendedVendorPayload: any = {
        ...baseVendorPayload,
        user_id: user.id,
        slug,
        onboarding_status: "submitted",
        submitted_at: new Date().toISOString(),
        contact_name: fullName.trim(),
        contact_email: supportEmail.trim() || user.email,
        contact_phone: phone.trim(),
        business_type: businessType,
        business_address: businessAddressObj,
        address_line1: streetAddress.trim(),
        city: city.trim(),
        state: stateName.trim(),
        pincode: pinCode.trim(),
        country: "India",
        pan_number: panNumber.trim().toUpperCase(),
        pan_holder_name: fullName.trim(),
        gstin: hasGst ? gstin.trim().toUpperCase() : null,
        is_gst_exempt: !hasGst,
        udyam_number: hasUdyam ? udyamNumber.trim().toUpperCase() : null,
        bank_account_holder: accountHolderName.trim(),
        bank_account_number: accountNumber.trim(),
        bank_ifsc: ifscCode.trim().toUpperCase(),
        bank_name: bankName.trim(),
        bank_account_details: bankDetailsObj,
      };

      if (isExistingVendor) {
        // Attempt update with extended payload first
        const { error: extUpdError } = await supabase
          .from("vendors")
          .update(extendedVendorPayload)
          .eq("id", vendorId);

        if (extUpdError) {
          console.warn("Extended vendor update note, falling back to core fields:", extUpdError.message);
          const { error: coreUpdError } = await supabase
            .from("vendors")
            .update(baseVendorPayload)
            .eq("id", vendorId);
          if (coreUpdError) {
            console.warn("Core vendor update note:", coreUpdError.message);
          }
        }
      } else {
        // Attempt insert with extended payload first
        const { error: extInsError } = await supabase
          .from("vendors")
          .insert({
            id: vendorId,
            ...extendedVendorPayload,
          });

        if (extInsError) {
          console.warn("Extended vendor insert note, falling back to core fields:", extInsError.message);
          const { error: coreInsError } = await supabase
            .from("vendors")
            .insert({
              id: vendorId,
              user_id: user.id,
              slug,
              ...baseVendorPayload,
            });

          if (coreInsError) {
            console.warn("Core vendor insert note:", coreInsError.message);
          }
        }
      }

      // 3. Upload KYC Documents to Supabase Storage bucket 'vendor-documents'
      setUploadingDocs(true);
      const uploadedDocsMap: Record<string, any> = {};

      if (panDocFile) {
        const res = await uploadVendorDocument(panDocFile, "pan_card", vendorId, user.id);
        if (res.success && res.document) uploadedDocsMap.pan_card = res.document;
      }
      if (hasGst && gstDocFile) {
        const res = await uploadVendorDocument(gstDocFile, "gst_certificate", vendorId, user.id);
        if (res.success && res.document) uploadedDocsMap.gst_certificate = res.document;
      }
      if (hasUdyam && udyamDocFile) {
        const res = await uploadVendorDocument(udyamDocFile, "udyam_certificate", vendorId, user.id);
        if (res.success && res.document) uploadedDocsMap.udyam_certificate = res.document;
      }
      if (bankDocFile) {
        const res = await uploadVendorDocument(bankDocFile, "bank_proof", vendorId, user.id);
        if (res.success && res.document) uploadedDocsMap.bank_proof = res.document;
      }

      // 4. Record Digital Vendor Agreement Acceptance
      const agreementResult = await recordAgreementAcceptance({
        vendorId,
        userId: user.id,
        representativeName: fullName.trim(),
        agreementContent: agreementText || "ViaCraft Vendor Terms v1.0",
      });

      // 5. Persist complete KYC, address, tax, banking metadata & audit into vendor_profiles
      try {
        await (supabase as any)
          .from("vendor_profiles")
          .upsert({
            vendor_id: vendorId,
            contact_number: phone.trim(),
            email: supportEmail.trim() || user.email || "",
            address: `${streetAddress.trim()}, ${city.trim()}, ${stateName.trim()} - ${pinCode.trim()}`,
            social_links: {
              user_id: user.id,
              store_name: storeName.trim(),
              slug,
              business_type: businessType,
              business_address: businessAddressObj,
              representative_name: fullName.trim(),
              pan_number: panNumber.trim().toUpperCase(),
              pan_holder_name: fullName.trim(),
              gstin: hasGst ? gstin.trim().toUpperCase() : null,
              is_gst_exempt: !hasGst,
              udyam_number: hasUdyam ? udyamNumber.trim().toUpperCase() : null,
              bank_account_details: bankDetailsObj,
              submitted_at: new Date().toISOString(),
              onboarding_status: "submitted",
              status: "pending",
              documents: uploadedDocsMap,
              agreement: {
                version: CURRENT_VENDOR_AGREEMENT_VERSION,
                representative_name: fullName.trim(),
                accepted_at: new Date().toISOString(),
                document_hash: agreementResult.agreement?.document_hash || "DIGITALLY_ACCEPTED",
              },
            },
          });
      } catch (vpErr: any) {
        console.warn("vendor_profiles metadata upsert note:", vpErr);
      }

      // 6. Send Email Notifications (non-blocking)
      sendVendorAppliedEmail({ data: { userId: user.id, storeName } }).catch((err) => {
        console.error("Vendor applied email failed:", err);
      });
      sendAdminNewVendorEmail({ data: { vendorId } }).catch((err) => {
        console.error("Admin new vendor notification failed:", err);
      });

      // 7. Analytics tracking
      trackVendorRegistration(storeName, `${city}, ${stateName}`);

      toast.success("Application and KYC documents submitted successfully! Our curation board will review within 24–48 hours.");
      qc.invalidateQueries({ queryKey: ["my-vendor", user.id] });
      refetchVendor();
    } catch (err: any) {
      console.error("Application submission error:", err);
      setSubmissionError(err.message || "Failed to submit vendor application");
      toast.error(err.message || "Failed to submit vendor application");
    } finally {
      setSubmittingApplication(false);
      setUploadingDocs(false);
    }
  };

  // Re-upload replacement document when corrections are requested by admin
  const handleResubmitCorrection = async () => {
    if (!existing || !user || !resubmittingDocType || !replacementFile) {
      toast.error("Please select a valid replacement document");
      return;
    }

    try {
      const res = await uploadVendorDocument(
        replacementFile,
        resubmittingDocType,
        existing.id,
        user.id
      );
      if (!res.success) throw new Error(res.error);

      // Update vendors status
      try {
        await supabase
          .from("vendors")
          .update({ onboarding_status: "under_review", status: "pending", updated_at: new Date().toISOString() } as any)
          .eq("id", existing.id);
      } catch {}

      // Update vendor_profiles metadata
      try {
        const { data: vp } = await (supabase as any)
          .from("vendor_profiles")
          .select("social_links")
          .eq("vendor_id", existing.id)
          .maybeSingle();

        if (vp) {
          const currentDocs = vp.social_links?.documents || {};
          if (res.document) {
            currentDocs[resubmittingDocType] = res.document;
          }
          await (supabase as any)
            .from("vendor_profiles")
            .update({
              social_links: {
                ...vp.social_links,
                onboarding_status: "under_review",
                documents: currentDocs,
              },
            })
            .eq("vendor_id", existing.id);
        }
      } catch (vpErr) {
        console.warn("vendor_profiles correction update note:", vpErr);
      }

      toast.success("Replacement document uploaded. Your application is back under review!");
      setResubmittingDocType(null);
      setReplacementFile(null);
      refetchDocs();
      refetchVendor();
    } catch (e: any) {
      toast.error(e.message || "Failed to upload replacement document");
    }
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
        {/* Header Hero */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-accent mb-3 font-bold">
            Artisan Partnership Program
          </p>
          <h1 className="font-display text-4xl sm:text-5xl mb-4 font-black">
            Sell on ViaCraft.
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Join India's curated marketplace for independent resin artists. We provide secure payments, marketing, and logistics while you focus on the craft.
          </p>
        </div>

        {/* Feature Value Props */}
        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          {[
            {
              i: TrendingUp,
              t: "Reach 12,000+ Collectors",
              d: "High-intent art buyers and wedding memory collectors.",
            },
            {
              i: Heart,
              t: "Curated Brand Positioning",
              d: "Strictly artisanal resin; zero mass-market noise.",
            },
            {
              i: Sparkles,
              t: "Preservation Pipeline",
              d: "Direct access to custom keepsake and flower preservation inquiries.",
            },
          ].map(({ i: Icon, t, d }, k) => (
            <div key={k} className="p-6 rounded-2xl border border-border bg-card shadow-xs">
              <Icon className="h-5 w-5 text-accent mb-3" />
              <h3 className="font-display text-lg mb-1">{t}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{d}</p>
            </div>
          ))}
        </div>

        {/* ================================================================= */}
        {/* STATE A: NOT LOGGED IN */}
        {/* ================================================================= */}
        {!user ? (
          <div className="p-10 rounded-3xl border border-border bg-card text-center shadow-md max-w-xl mx-auto">
            <div className="h-14 w-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">Sign in to Apply</h2>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              To guarantee account security and auditable agreement signing, you need an authenticated customer account before applying.
            </p>
            <Link
              to="/auth"
              search={{ redirect: "/sell" }}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-foreground transition-all shadow-md cursor-pointer"
            >
              Sign In with Email or Phone OTP <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : existing && existing.status === "approved" ? (
          /* ================================================================= */
          /* STATE B: ALREADY APPROVED VENDOR */
          /* ================================================================= */
          <div className="p-10 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 text-center shadow-md max-w-xl mx-auto">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="font-display text-3xl font-bold mb-2 text-foreground">
              Your Store is Active! 🎉
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Welcome back, <strong>{existing.store_name}</strong>. Your seller privileges and control center are active.
            </p>
            <a
              href="/vendor/dashboard"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-foreground transition-all shadow-md cursor-pointer"
            >
              Open Seller Control Center <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        ) : existing && existing.status === "suspended" ? (
          /* ================================================================= */
          /* STATE C: SUSPENDED VENDOR */
          /* ================================================================= */
          <div className="p-10 rounded-3xl border border-rose-500/20 bg-rose-500/5 text-center shadow-md max-w-xl mx-auto">
            <div className="h-16 w-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2 text-rose-600">
              Account Suspended
            </h2>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              Your seller account for <strong>{existing.store_name}</strong> is currently suspended. Please contact <strong>compliance@viacraft.in</strong> to review or appeal.
            </p>
          </div>
        ) : existing ? (
          /* ================================================================= */
          /* STATE D: APPLICATION SUBMITTED / UNDER REVIEW / ACTION REQUIRED */
          /* ================================================================= */
          <div className="p-8 sm:p-10 rounded-3xl border border-border bg-card shadow-lg max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-accent font-bold mb-1">
                  Application Status
                </p>
                <h2 className="font-display text-2xl font-bold">{existing.store_name}</h2>
              </div>
              <span
                className={`text-xs uppercase font-bold tracking-wider px-3.5 py-1.5 rounded-full border ${
                  existing.onboarding_status === "action_required"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    : existing.onboarding_status === "rejected"
                      ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                      : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                }`}
              >
                {existing.onboarding_status?.replace("_", " ") || existing.status}
              </span>
            </div>

            {/* ACTION REQUIRED NOTICE */}
            {existing.onboarding_status === "action_required" && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle className="h-4 w-4" /> Action Required: Admin Feedback
                </div>
                <p className="leading-relaxed">
                  {existing.admin_review_notes || "Please re-upload corrected KYC documents as requested by our compliance auditor."}
                </p>
              </div>
            )}

            {/* REJECTION NOTICE */}
            {existing.onboarding_status === "rejected" && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-400 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertTriangle className="h-4 w-4" /> Application Not Approved
                </div>
                <p className="leading-relaxed">
                  Reason: {existing.rejection_reason || "Does not meet current marketplace curation guidelines."}
                </p>
              </div>
            )}

            {/* UNDER REVIEW TIMELINE */}
            {existing.onboarding_status !== "rejected" && (
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 text-xs space-y-3">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Clock className="h-4 w-4 text-accent" /> Review Timeline
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Your registration dossier, tax numbers, and private KYC documents have been recorded. Our administrators review applications manually to maintain marketplace curation standards.
                </p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/60">
                  <span>Estimated verification time:</span>
                  <span className="font-semibold text-foreground">24 to 48 hours</span>
                </div>
              </div>
            )}

            {/* KYC DOCUMENTS STATUS LIST */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                Submitted Verification Documents
              </h3>
              {vendorDocs.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No documents on file.</p>
              ) : (
                <div className="divide-y divide-border/60 rounded-xl border border-border bg-background">
                  {vendorDocs.map((doc) => (
                    <div key={doc.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold capitalize text-foreground">
                          {doc.document_type.replace(/_/g, " ")}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{doc.file_name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            doc.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : doc.status === "rejected"
                                ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          }`}
                        >
                          {doc.status}
                        </span>
                        {doc.status === "rejected" && existing.onboarding_status === "action_required" && (
                          <button
                            type="button"
                            onClick={() => setResubmittingDocType(doc.document_type)}
                            className="text-xs text-accent hover:underline font-semibold cursor-pointer"
                          >
                            Replace
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CORRECTION UPLOAD DRAWER */}
            {resubmittingDocType && (
              <div className="p-4 rounded-2xl border border-accent bg-accent/5 space-y-3 animate-in fade-in duration-150">
                <p className="text-xs font-semibold text-foreground">
                  Re-upload {resubmittingDocType.replace(/_/g, " ").toUpperCase()}
                </p>
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => setReplacementFile(e.target.files?.[0] || null)}
                  className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:bg-primary file:text-primary-foreground file:font-semibold"
                />
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleResubmitCorrection}
                    disabled={!replacementFile}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    Submit Replacement
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResubmittingDocType(null);
                      setReplacementFile(null);
                    }}
                    className="px-4 py-2 border border-border rounded-full text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ================================================================= */
          /* STATE E: MULTI-STEP WIZARD (NEW ONBOARDING REGISTRATION) */
          /* ================================================================= */
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-10 shadow-lg">
            {/* Progress Stepper Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between max-w-2xl mx-auto mb-3">
                {[
                  { n: 1, label: "Basics" },
                  { n: 2, label: "Tax & Compliance" },
                  { n: 3, label: "Bank Payouts" },
                  { n: 4, label: "KYC Documents" },
                  { n: 5, label: "Agreement" },
                ].map(({ n, label }) => (
                  <div key={n} className="flex flex-col items-center">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        step === n
                          ? "bg-accent text-accent-foreground ring-4 ring-accent/20"
                          : step > n
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {step > n ? <CheckCircle2 className="h-4 w-4" /> : n}
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider mt-1.5 hidden sm:block text-muted-foreground">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${((step - 1) / 4) * 100}%` }}
                />
              </div>
            </div>

            {/* STEP 1: BASIC INFORMATION */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-2xl font-bold mb-1">Store & Representative Info</h2>
                  <p className="text-xs text-muted-foreground">
                    Provide basic contact and business registration details.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase font-semibold text-muted-foreground">
                      Representative Full Name *
                    </label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Aditi Sharma"
                      required
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-semibold text-muted-foreground">
                      Store / Brand Name *
                    </label>
                    <input
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="e.g. Celestial Resin Arts"
                      required
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-semibold text-muted-foreground">
                      Support Email *
                    </label>
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      required
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-semibold text-muted-foreground">
                      Mobile Number (+91) *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="9876543210"
                      required
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs uppercase font-semibold text-muted-foreground">
                      Business Legal Entity Type *
                    </label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm cursor-pointer"
                    >
                      {BUSINESS_TYPES.map((bt) => (
                        <option key={bt} value={bt}>
                          {bt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs uppercase font-semibold text-muted-foreground">
                      Street Address *
                    </label>
                    <input
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="Studio / Workshop address line"
                      required
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-semibold text-muted-foreground">
                      City *
                    </label>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Mumbai"
                      required
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs uppercase font-semibold text-muted-foreground">
                        State *
                      </label>
                      <input
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        placeholder="Maharashtra"
                        required
                        className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase font-semibold text-muted-foreground">
                        PIN Code *
                      </label>
                      <input
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="400001"
                        required
                        className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs uppercase font-semibold text-muted-foreground">
                      Tagline
                    </label>
                    <input
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="Handcrafted botanical resin keepsakes"
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs uppercase font-semibold text-muted-foreground">
                      About Your Craft (Bio)
                    </label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Describe your artistic journey, casting materials, and signature pieces..."
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={handleStep1Next}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-foreground transition-all cursor-pointer shadow-md"
                  >
                    Next: Tax & Compliance <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: TAX & COMPLIANCE */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-2xl font-bold mb-1">Tax & Regulatory Compliance</h2>
                  <p className="text-xs text-muted-foreground">
                    Required under Indian marketplace regulations for legitimate transactions and payouts.
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="text-xs uppercase font-semibold text-muted-foreground">
                      Permanent Account Number (PAN) *
                    </label>
                    <input
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
                      placeholder="ABCDE1234F"
                      required
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm font-mono tracking-wider"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      10-character PAN of the business or authorized individual.
                    </p>
                  </div>

                  {/* GSTIN CONDITIONAL */}
                  <div className="p-4 rounded-2xl border border-border bg-background space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Are you registered under GST?</p>
                        <p className="text-xs text-muted-foreground">
                          Unregistered local artisans operating below threshold may opt out.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={hasGst}
                        onChange={(e) => setHasGst(e.target.checked)}
                        className="h-4 w-4 rounded accent-accent cursor-pointer"
                      />
                    </div>

                    {hasGst && (
                      <div className="pt-2 animate-in fade-in duration-150">
                        <label className="text-xs uppercase font-semibold text-muted-foreground">
                          GST Identification Number (GSTIN) *
                        </label>
                        <input
                          value={gstin}
                          onChange={(e) => setGstin(e.target.value.toUpperCase().slice(0, 15))}
                          placeholder="27ABCDE1234F1Z5"
                          required={hasGst}
                          className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm font-mono tracking-wider"
                        />
                      </div>
                    )}
                  </div>

                  {/* UDYAM MSME CONDITIONAL */}
                  <div className="p-4 rounded-2xl border border-border bg-background space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Do you have Udyam MSME Registration?</p>
                        <p className="text-xs text-muted-foreground">Optional certification for micro and small enterprises.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={hasUdyam}
                        onChange={(e) => setHasUdyam(e.target.checked)}
                        className="h-4 w-4 rounded accent-accent cursor-pointer"
                      />
                    </div>

                    {hasUdyam && (
                      <div className="pt-2 animate-in fade-in duration-150">
                        <label className="text-xs uppercase font-semibold text-muted-foreground">
                          Udyam Registration Number *
                        </label>
                        <input
                          value={udyamNumber}
                          onChange={(e) => setUdyamNumber(e.target.value.toUpperCase().slice(0, 19))}
                          placeholder="UDYAM-MH-01-0012345"
                          required={hasUdyam}
                          className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm font-mono tracking-wider"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border text-sm font-semibold hover:bg-muted transition-all cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleStep2Next}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-foreground transition-all cursor-pointer shadow-md"
                  >
                    Next: Bank Details <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: BANK DETAILS FOR PAYOUTS */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-2xl font-bold mb-1">Bank Account & Settlement Details</h2>
                  <p className="text-xs text-muted-foreground">
                    Required for automated escrow settlements and legitimate vendor payouts.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs uppercase font-semibold text-muted-foreground">
                      Account Holder Name *
                    </label>
                    <input
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      placeholder="Must match legal representative name or registered company"
                      required
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs uppercase font-semibold text-muted-foreground">
                      Bank Name & Branch *
                    </label>
                    <input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank, Fort Branch"
                      required
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-semibold text-muted-foreground">
                      Account Number *
                    </label>
                    <input
                      type="password"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="••••••••••••"
                      required
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-semibold text-muted-foreground">
                      Confirm Account Number *
                    </label>
                    <input
                      type="text"
                      value={confirmAccountNumber}
                      onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="Re-enter account number"
                      required
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs uppercase font-semibold text-muted-foreground">
                      IFSC Code *
                    </label>
                    <input
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase().slice(0, 11))}
                      placeholder="HDFC0001234"
                      required
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm font-mono tracking-wider"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      11-character RBI Indian Financial System Code.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border text-sm font-semibold hover:bg-muted transition-all cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleStep3Next}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-foreground transition-all cursor-pointer shadow-md"
                  >
                    Next: Upload Documents <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: PRIVATE DOCUMENT SUBMISSION */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-2xl font-bold mb-1">Upload Verification Documents</h2>
                  <p className="text-xs text-muted-foreground">
                    Documents are stored in a private encrypted bucket with zero public access. Max 5 MB each (PDF, JPG, PNG).
                  </p>
                </div>

                <div className="space-y-4">
                  {/* PAN CARD */}
                  <div className="p-4 rounded-2xl border border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">PAN Card Copy *</p>
                      <p className="text-xs text-muted-foreground">Clear scanned image or PDF copy of PAN card.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {panDocFile ? (
                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" /> {panDocFile.name}
                        </span>
                      ) : (
                        <label className="px-4 py-2 rounded-full border border-accent bg-accent/10 text-accent text-xs font-semibold hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                          Select File
                          <input
                            type="file"
                            accept=".pdf,image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => setPanDocFile(e.target.files?.[0] || null)}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* GST CERTIFICATE (IF GSTIN ENTERED) */}
                  {hasGst && (
                    <div className="p-4 rounded-2xl border border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
                      <div>
                        <p className="text-sm font-semibold text-foreground">GST Registration Certificate *</p>
                        <p className="text-xs text-muted-foreground">Form GST REG-06 or official registration proof.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {gstDocFile ? (
                          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" /> {gstDocFile.name}
                          </span>
                        ) : (
                          <label className="px-4 py-2 rounded-full border border-accent bg-accent/10 text-accent text-xs font-semibold hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                            Select File
                            <input
                              type="file"
                              accept=".pdf,image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => setGstDocFile(e.target.files?.[0] || null)}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                  {/* UDYAM CERTIFICATE (IF UDYAM ENTERED) */}
                  {hasUdyam && (
                    <div className="p-4 rounded-2xl border border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Udyam Registration Certificate *</p>
                        <p className="text-xs text-muted-foreground">Official Ministry of MSME Udyam certificate.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {udyamDocFile ? (
                          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" /> {udyamDocFile.name}
                          </span>
                        ) : (
                          <label className="px-4 py-2 rounded-full border border-accent bg-accent/10 text-accent text-xs font-semibold hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                            Select File
                            <input
                              type="file"
                              accept=".pdf,image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => setUdyamDocFile(e.target.files?.[0] || null)}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                  {/* BANK PROOF */}
                  <div className="p-4 rounded-2xl border border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Bank Account Proof *</p>
                      <p className="text-xs text-muted-foreground">Cancelled cheque copy or bank passbook header.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {bankDocFile ? (
                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" /> {bankDocFile.name}
                        </span>
                      ) : (
                        <label className="px-4 py-2 rounded-full border border-accent bg-accent/10 text-accent text-xs font-semibold hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                          Select File
                          <input
                            type="file"
                            accept=".pdf,image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => setBankDocFile(e.target.files?.[0] || null)}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border text-sm font-semibold hover:bg-muted transition-all cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleStep4Next}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-foreground transition-all cursor-pointer shadow-md"
                  >
                    Next: Digital Agreement <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: DIGITAL VENDOR AGREEMENT ACCEPTANCE */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-2xl font-bold mb-1">
                    Digital Vendor Agreement Acceptance
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Please read and digitally execute the ViaCraft Vendor Terms and Conditions.
                  </p>
                </div>

                {/* Agreement Metadata Card */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-foreground">{CURRENT_VENDOR_AGREEMENT_TITLE}</span>
                    <p className="text-muted-foreground">Version: {CURRENT_VENDOR_AGREEMENT_VERSION} | Effective: {CURRENT_VENDOR_AGREEMENT_DATE}</p>
                  </div>
                  <a
                    href="/legal/vendor-terms"
                    target="_blank"
                    className="text-xs text-accent hover:underline font-semibold"
                  >
                    Open Full View ↗
                  </a>
                </div>

                {/* Agreement Scrollable Reader */}
                <div className="max-h-72 overflow-y-auto p-4 rounded-2xl border border-border bg-background text-xs text-foreground/80 leading-relaxed font-sans space-y-3 shadow-inner">
                  {agreementLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-accent" />
                    </div>
                  ) : (
                    <pre className="font-sans whitespace-pre-wrap">{agreementText}</pre>
                  )}
                </div>

                {/* Digital Acceptance Declaration */}
                <div className="p-4 rounded-2xl border border-accent/30 bg-accent/5 space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="accept-vendor-agreement"
                      checked={acceptedAgreement}
                      onChange={(e) => setAcceptedAgreement(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded accent-accent cursor-pointer shrink-0"
                    />
                    <label
                      htmlFor="accept-vendor-agreement"
                      className="text-xs text-foreground font-medium leading-relaxed cursor-pointer select-none"
                    >
                      I, <strong className="text-foreground">{fullName || "Authorized Representative"}</strong>, authorized representative of{" "}
                      <strong className="text-foreground">{storeName || "Store"}</strong>, hereby digitally accept the ViaCraft Vendor Terms and Conditions (v{CURRENT_VENDOR_AGREEMENT_VERSION}) and agree to be bound by its terms. An auditable digital hash and server timestamp will be recorded.
                    </label>
                  </div>
                </div>

                {/* Database / Submission Error Banner */}
                {submissionError && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-3 animate-in fade-in duration-200">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">Action Required</p>
                      <p>{submissionError}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmissionError(null);
                      setStep(4);
                    }}
                    disabled={submittingApplication}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border text-sm font-semibold hover:bg-muted transition-all cursor-pointer disabled:opacity-50"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitApplication}
                    disabled={submittingApplication || !acceptedAgreement}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-foreground transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {submittingApplication ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {uploadingDocs ? "Uploading KYC Documents..." : "Submitting Application..."}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" /> Digitally Sign & Submit Application
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
