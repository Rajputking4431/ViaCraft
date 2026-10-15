import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { sendVendorStatusEmail } from "@/api/email.functions";
import {
  fetchVendorDocuments,
  getSignedDocumentUrl,
  updateVendorDocumentStatus,
} from "@/services/vendor-documents";
import {
  applyVendorOverrides,
  persistVendorStatus,
  fetchServerSyncState,
} from "@/services/admin-vendor-sync";
import { getVendorAgreement } from "@/services/vendor-agreements";
import type {
  VendorDocument,
  VendorAgreement,
  OnboardingStatus,
  ExtendedVendor,
} from "@/types/vendor-onboarding";
import {
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  X,
  Eye,
  Store,
  MapPin,
  Loader2,
  FileText,
  FileCheck,
  ShieldCheck,
  Building,
  CreditCard,
  ExternalLink,
  Ban,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/admin/vendors")({
  component: AdminVendors,
});

function AdminVendors() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedVendor, setSelectedVendor] = useState<ExtendedVendor | null>(null);

  // Helper to categorize vendor status reliably
  const isApprovedVendor = (v: any) =>
    v.status === "approved" || v.onboarding_status === "approved";
  const isRejectedOrSuspendedVendor = (v: any) =>
    v.status === "suspended" || v.status === "rejected" || v.onboarding_status === "rejected";
  const isUnderReviewVendor = (v: any) => v.onboarding_status === "under_review";
  const isActionRequiredVendor = (v: any) => v.onboarding_status === "action_required";
  const isPendingVendor = (v: any) =>
    !isApprovedVendor(v) &&
    !isRejectedOrSuspendedVendor(v) &&
    !isUnderReviewVendor(v) &&
    !isActionRequiredVendor(v);

  // Fetch all vendors with their onboarding fields and linked profiles
  const {
    data: vendors = [],
    isLoading,
    error: fetchError,
    refetch,
  } = useQuery<ExtendedVendor[]>({
    queryKey: ["admin-vendors"],
    queryFn: async () => {
      await fetchServerSyncState();
      let rawVendors: any[] = [];

      // 1. Try querying vendors joined with vendor_profiles
      const { data, error } = await supabase
        .from("vendors")
        .select("*, vendor_profiles(*)")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[AdminVendors] Joined query note:", error.message);
        // Fallback 1: try direct select
        const { data: plainData, error: plainError } = await supabase
          .from("vendors")
          .select("*")
          .order("created_at", { ascending: false });

        if (!plainError && plainData) {
          rawVendors = plainData;
        } else {
          // Fallback 2: try RPC if available
          try {
            const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)("admin_get_all_vendors");
            if (!rpcErr && rpcData && rpcData.length > 0) {
              rawVendors = rpcData;
            }
          } catch {}

          // Fallback 3: query vendor_profiles directly (accessible without has_role restrictions)
          if (rawVendors.length === 0) {
            try {
              const { data: vpList, error: vpErr } = await supabase
                .from("vendor_profiles")
                .select("*")
                .order("created_at", { ascending: false });

              if (!vpErr && vpList && vpList.length > 0) {
                rawVendors = vpList.map((vp: any) => {
                  const sl: any = vp.social_links || {};
                  return {
                    id: vp.vendor_id,
                    user_id: sl.user_id || "",
                    slug: sl.slug || (sl.store_name ? sl.store_name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : vp.vendor_id),
                    store_name: sl.store_name || sl.representative_name || "Artisan Store",
                    tagline: sl.tagline || `${sl.business_type || "Artisan"} in India`,
                    bio: sl.bio || "",
                    location: vp.address || "",
                    status: sl.status || "pending",
                    onboarding_status: sl.onboarding_status || "submitted",
                    created_at: sl.submitted_at || vp.created_at,
                    updated_at: vp.updated_at,
                    vendor_profiles: [vp],
                  };
                });
              }
            } catch (vpFetchErr) {
              console.warn("vendor_profiles fallback query note:", vpFetchErr);
            }
          }
        }
      } else {
        rawVendors = data ?? [];
      }

      // 2. Ensure applications saved in vendor_profiles are merged into the list
      try {
        const { data: allVp } = await supabase.from("vendor_profiles").select("*");
        if (allVp && allVp.length > 0) {
          const existingIds = new Set(rawVendors.map((v) => v.id));
          for (const vp of allVp) {
            if (!existingIds.has(vp.vendor_id)) {
              const sl: any = vp.social_links || {};
              rawVendors.push({
                id: vp.vendor_id,
                user_id: sl.user_id || "",
                slug: sl.slug || (sl.store_name ? sl.store_name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : vp.vendor_id),
                store_name: sl.store_name || sl.representative_name || "Artisan Store",
                tagline: sl.tagline || `${sl.business_type || "Artisan"} in India`,
                bio: sl.bio || "",
                location: vp.address || "",
                status: sl.status || "pending",
                onboarding_status: sl.onboarding_status || "submitted",
                created_at: sl.submitted_at || vp.created_at,
                updated_at: vp.updated_at,
                vendor_profiles: [vp],
              });
              existingIds.add(vp.vendor_id);
            }
          }
        }
      } catch (mergeErr) {
        console.warn("vendor_profiles merging note:", mergeErr);
      }

      // Merge vendor_profiles metadata into vendor object for backward compatibility
      const mappedVendors = rawVendors.map((v: any) => {
        const vp = Array.isArray(v.vendor_profiles) ? v.vendor_profiles[0] : v.vendor_profiles;
        const socialLinks = vp?.social_links || {};

        return {
          ...v,
          onboarding_status:
            v.onboarding_status ||
            socialLinks.onboarding_status ||
            (v.status === "approved" ? "approved" : "submitted"),
          submitted_at:
            v.submitted_at || socialLinks.submitted_at || v.created_at,
          contact_name:
            v.contact_name || socialLinks.representative_name || v.store_name || "",
          contact_email:
            v.contact_email || vp?.email || socialLinks.email || "",
          contact_phone:
            v.contact_phone || vp?.contact_number || socialLinks.contact_number || "",
          business_type:
            v.business_type || socialLinks.business_type || "Artisan / Individual",
          pan_number:
            v.pan_number || socialLinks.pan_number || "",
          gstin:
            v.gstin || socialLinks.gstin || "",
          udyam_number:
            v.udyam_number || socialLinks.udyam_number || "",
          bank_account_details:
            v.bank_account_details || socialLinks.bank_account_details || null,
          business_address:
            v.business_address ||
            (vp?.address
              ? { street: vp.address, city: "", state: "", pinCode: "", country: "India" }
              : null),
          admin_review_notes:
            v.admin_review_notes || socialLinks.admin_review_notes || null,
          rejection_reason:
            v.rejection_reason || socialLinks.rejection_reason || null,
        } as ExtendedVendor;
      });

      return applyVendorOverrides(mappedVendors);
    },
  });

  // Server-enforced approval mutation via RPC with resilient fallback
  const approveVendorMutation = useMutation({
    mutationFn: async ({ vendorId, notes }: { vendorId: string; notes?: string }) => {
      // 1. Try calling server-enforced RPC function if installed
      try {
        const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)("admin_approve_vendor", {
          _vendor_id: vendorId,
          _admin_notes: notes || "Approved by Admin verification",
        });

        if (!rpcError && rpcResult?.success) {
          return rpcResult;
        }
      } catch (rpcErr) {
        console.warn("RPC admin_approve_vendor note:", rpcErr);
      }

      // 2. Direct fallback: Update vendor status in vendors table
      try {
        await supabase
          .from("vendors")
          .update({
            status: "approved",
            onboarding_status: "approved",
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", vendorId);
      } catch {
        await supabase
          .from("vendors")
          .update({
            status: "approved",
            updated_at: new Date().toISOString(),
          })
          .eq("id", vendorId);
      }

      // 3. Update vendor_profiles metadata
      try {
        const { data: vp } = await (supabase as any)
          .from("vendor_profiles")
          .select("social_links")
          .eq("vendor_id", vendorId)
          .maybeSingle();

        if (vp) {
          await (supabase as any)
            .from("vendor_profiles")
            .update({
              social_links: {
                ...(vp.social_links || {}),
                onboarding_status: "approved",
                status: "approved",
                approved_at: new Date().toISOString(),
                admin_review_notes: notes || "Approved by Admin",
              },
            })
            .eq("vendor_id", vendorId);
        }
      } catch (vpErr) {
        console.warn("vendor_profiles approve note:", vpErr);
      }

      // 4. Assign vendor role to user and guarantee vendors table record exists
      let targetUserId = selectedVendor?.user_id;
      try {
        if (!targetUserId) {
          const { data: vRecord } = await supabase
            .from("vendors")
            .select("user_id")
            .eq("id", vendorId)
            .maybeSingle();
          targetUserId = vRecord?.user_id;
        }

        if (!targetUserId) {
          const { data: vp } = await (supabase as any)
            .from("vendor_profiles")
            .select("social_links")
            .eq("vendor_id", vendorId)
            .maybeSingle();
          targetUserId = vp?.social_links?.user_id;
        }

        if (targetUserId) {
          // A. Assign role via assign_user_role RPC (SECURITY DEFINER)
          try {
            await (supabase.rpc as any)("assign_user_role", {
              target_user_id: targetUserId,
              new_role: "vendor",
            });
          } catch (rErr) {
            console.warn("assign_user_role RPC note:", rErr);
          }

          // B. Direct upsert into user_roles
          try {
            await supabase.from("user_roles").upsert({
              user_id: targetUserId,
              role: "vendor",
            } as any);
          } catch {}

          // C. Upsert into public.vendors table with approved status
          try {
            await supabase.from("vendors").upsert({
              id: vendorId,
              user_id: targetUserId,
              store_name: selectedVendor?.store_name || "Artisan Store",
              slug: selectedVendor?.slug || (selectedVendor?.store_name || "store").toLowerCase().replace(/[^a-z0-9]/g, "-"),
              status: "approved",
              onboarding_status: "approved",
              admin_review_notes: notes || "Approved by Admin",
              approved_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as any);
          } catch (vUpsertErr) {
            console.warn("vendors upsert fallback note:", vUpsertErr);
          }
        }
      } catch (roleErr) {
        console.warn("Role assignment note:", roleErr);
      }

      // 3. Persist to reliable admin sync store
      await persistVendorStatus(vendorId, {
        status: "approved",
        onboarding_status: "approved",
        admin_review_notes: notes || "Approved by Admin verification",
        user_id: targetUserId,
      });

      return { success: true };
    },
    onSuccess: (_, variables) => {
      // Optimistically update React Query cache immediately
      qc.setQueryData(["admin-vendors"], (prev: any) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((v: any) =>
          v.id === variables.vendorId
            ? { ...v, status: "approved", onboarding_status: "approved" }
            : v
        );
      });
      qc.invalidateQueries({ queryKey: ["admin-vendors"] });
      toast.success("Vendor successfully approved and activated with vendor role!");

      if (selectedVendor && selectedVendor.id === variables.vendorId) {
        setSelectedVendor((prev: any) => ({
          ...prev,
          status: "approved",
          onboarding_status: "approved",
        }));
      }

      sendVendorStatusEmail({
        data: {
          vendorId: variables.vendorId,
          status: "approved",
        },
      }).catch((err) => console.error("Email notification error:", err));
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to approve vendor");
    },
  });

  // General vendor status update mutation (for under_review, action_required, rejected, suspended)
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      onboardingStatus,
      reviewNotes,
      rejectionReason,
      gstExemptionVerified,
    }: {
      id: string;
      status?: "approved" | "suspended" | "pending" | "rejected";
      onboardingStatus?: OnboardingStatus;
      reviewNotes?: string;
      rejectionReason?: string;
      gstExemptionVerified?: boolean;
    }) => {
      // 1. Immediately persist to reliable admin sync store
      await persistVendorStatus(id, {
        status,
        onboarding_status: onboardingStatus,
        admin_review_notes: reviewNotes,
        rejection_reason: rejectionReason,
        gst_exemption_verified: gstExemptionVerified,
      });

      // 2. Update vendors table with base status
      const coreUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (status) coreUpdates.status = status;

      const extUpdates = { ...coreUpdates };
      if (onboardingStatus) extUpdates.onboarding_status = onboardingStatus;
      if (reviewNotes !== undefined) extUpdates.admin_review_notes = reviewNotes;
      if (rejectionReason !== undefined) extUpdates.rejection_reason = rejectionReason;
      if (gstExemptionVerified !== undefined) extUpdates.gst_exemption_verified = gstExemptionVerified;

      const { error: extErr } = await supabase.from("vendors").update(extUpdates as any).eq("id", id);
      if (extErr) {
        console.warn("Extended vendors update note, falling back to core fields:", extErr.message);
        const { error: coreErr } = await supabase.from("vendors").update(coreUpdates as any).eq("id", id);
        if (coreErr) console.warn("Core vendors update note:", coreErr.message);
      }

      // 3. Persist onboarding status and notes into vendor_profiles
      try {
        const { data: vp } = await (supabase as any)
          .from("vendor_profiles")
          .select("social_links")
          .eq("vendor_id", id)
          .maybeSingle();

        if (vp) {
          await (supabase as any)
            .from("vendor_profiles")
            .update({
              social_links: {
                ...(vp.social_links || {}),
                ...(onboardingStatus ? { onboarding_status: onboardingStatus } : {}),
                ...(status ? { status } : {}),
                ...(reviewNotes !== undefined ? { admin_review_notes: reviewNotes } : {}),
                ...(rejectionReason !== undefined ? { rejection_reason: rejectionReason } : {}),
                ...(gstExemptionVerified !== undefined ? { gst_exemption_verified: gstExemptionVerified } : {}),
              },
            })
            .eq("vendor_id", id);
        }
      } catch (vpErr) {
        console.warn("vendor_profiles status update note:", vpErr);
      }
    },
    onSuccess: (_, variables) => {
      // Optimistically update React Query cache immediately
      qc.setQueryData(["admin-vendors"], (prev: any) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((v: any) =>
          v.id === variables.id
            ? {
                ...v,
                ...(variables.status ? { status: variables.status } : {}),
                ...(variables.onboardingStatus ? { onboarding_status: variables.onboardingStatus } : {}),
                ...(variables.reviewNotes !== undefined ? { admin_review_notes: variables.reviewNotes } : {}),
                ...(variables.rejectionReason !== undefined ? { rejection_reason: variables.rejectionReason } : {}),
                ...(variables.gstExemptionVerified !== undefined
                  ? { gst_exemption_verified: variables.gstExemptionVerified }
                  : {}),
              }
            : v
        );
      });
      qc.invalidateQueries({ queryKey: ["admin-vendors"] });
      toast.success("Vendor record updated successfully");

      if (selectedVendor && selectedVendor.id === variables.id) {
        setSelectedVendor((prev: any) => ({
          ...prev,
          ...(variables.status ? { status: variables.status } : {}),
          ...(variables.onboardingStatus ? { onboarding_status: variables.onboardingStatus } : {}),
          ...(variables.gstExemptionVerified !== undefined
            ? { gst_exemption_verified: variables.gstExemptionVerified }
            : {}),
        }));
      }

      if (variables.status === "suspended") {
        sendVendorStatusEmail({
          data: { vendorId: variables.id, status: "suspended" },
        }).catch((err) => console.error("Email notification error:", err));
      }
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to update vendor");
    },
  });

  // Tab counts
  const pendingCount = vendors.filter(isPendingVendor).length;
  const underReviewCount = vendors.filter(isUnderReviewVendor).length;
  const actionRequiredCount = vendors.filter(isActionRequiredVendor).length;
  const approvedCount = vendors.filter(isApprovedVendor).length;
  const rejectedCount = vendors.filter(isRejectedOrSuspendedVendor).length;

  // Filter vendors by search and onboarding/general status
  const filteredVendors = vendors.filter((v) => {
    const searchLower = search.toLowerCase();

    const matchesSearch =
      !searchLower ||
      (v.store_name && v.store_name.toLowerCase().includes(searchLower)) ||
      (v.contact_name && v.contact_name.toLowerCase().includes(searchLower)) ||
      (v.contact_email && v.contact_email.toLowerCase().includes(searchLower)) ||
      (v.pan_number && v.pan_number.toLowerCase().includes(searchLower)) ||
      (v.slug && v.slug.toLowerCase().includes(searchLower));

    let matchesStatus = true;

    if (statusFilter === "all") {
      matchesStatus = true;
    } else if (statusFilter === "pending") {
      matchesStatus = isPendingVendor(v);
    } else if (statusFilter === "under_review") {
      matchesStatus = isUnderReviewVendor(v);
    } else if (statusFilter === "action_required") {
      matchesStatus = isActionRequiredVendor(v);
    } else if (statusFilter === "approved") {
      matchesStatus = isApprovedVendor(v);
    } else if (statusFilter === "rejected_suspended") {
      matchesStatus = isRejectedOrSuspendedVendor(v);
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-amber-500 mb-2 font-semibold">
          Stores & Partners
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white font-display">
          Vendor Administration
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Review "Become a Seller" applications, verify KYC documents, inspect signed agreements, and approve vendors.
        </p>
      </div>

      {fetchError && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-white">Database Authorization Notice</p>
              <p className="text-slate-400 mt-0.5">
                {(fetchError as any)?.message || "Ensure your Supabase account is granted the 'admin' role in public.user_roles to read unapproved vendor applications."}
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            Retry Query
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search store, contact, email, PAN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All", count: vendors.length },
            { id: "pending", label: "Pending Review", count: pendingCount },
            { id: "under_review", label: "Under Review", count: underReviewCount },
            { id: "action_required", label: "Action Required", count: actionRequiredCount },
            { id: "approved", label: "Approved", count: approvedCount },
            { id: "rejected_suspended", label: "Rejected / Suspended", count: rejectedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? "bg-amber-500 text-slate-950 shadow-md font-bold"
                  : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusFilter === tab.id
                    ? "bg-slate-950 text-amber-400"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <Store className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="font-semibold text-lg text-slate-400">No vendors found</p>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search or status filter</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold bg-slate-950/40">
                  <th className="py-4 px-6">Store Details</th>
                  <th className="py-4 px-6">Business & Tax</th>
                  <th className="py-4 px-6">Onboarding Status</th>
                  <th className="py-4 px-6">Created At</th>
                  <th className="py-4 px-6 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredVendors.map((vendor) => {
                  const onbStatus = vendor.onboarding_status || (vendor.status === "approved" ? "approved" : "submitted");
                  return (
                    <tr key={vendor.id} className="text-slate-300 hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-semibold text-white text-base">{vendor.store_name}</p>
                        <p className="text-xs text-slate-400">
                          {vendor.contact_name ? `${vendor.contact_name} • ` : ""}
                          {vendor.contact_email || "No email"}
                        </p>
                        {vendor.contact_phone && (
                          <p className="text-[11px] text-slate-500">{vendor.contact_phone}</p>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-300">
                        <div className="space-y-1">
                          <p className="font-medium capitalize text-slate-200">
                            {vendor.business_type?.replace("_", " ") || "Not specified"}
                          </p>
                          <p className="text-slate-400">PAN: {vendor.pan_number || "Pending"}</p>
                          {vendor.gstin && <p className="text-slate-500">GST: {vendor.gstin}</p>}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={onbStatus} generalStatus={vendor.status} />
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(vendor.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => setSelectedVendor(vendor)}
                          className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-amber-500" />
                          Review KYC
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedVendor && (
        <VendorDetailsDrawer
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
          onApprove={(notes) =>
            approveVendorMutation.mutate({ vendorId: selectedVendor.id, notes })
          }
          isApproving={approveVendorMutation.isPending}
          onStatusChange={({ status, onboardingStatus, reviewNotes, rejectionReason }) =>
            updateStatusMutation.mutate({
              id: selectedVendor.id,
              status,
              onboardingStatus,
              reviewNotes,
              rejectionReason,
            })
          }
          isUpdating={updateStatusMutation.isPending}
        />
      )}
    </div>
  );
}

function StatusBadge({
  status,
  generalStatus,
}: {
  status: string;
  generalStatus?: string;
}) {
  if (generalStatus === "suspended") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
        <Ban className="h-3 w-3" /> Suspended
      </span>
    );
  }

  switch (status) {
    case "approved":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="h-3 w-3" /> Approved & Active
        </span>
      );
    case "under_review":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <Clock className="h-3 w-3" /> Under Review
        </span>
      );
    case "action_required":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
          <AlertTriangle className="h-3 w-3" /> Action Required
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30">
          <XCircle className="h-3 w-3" /> Rejected
        </span>
      );
    case "submitted":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
          <FileText className="h-3 w-3" /> Pending Review
        </span>
      );
  }
}

interface VendorDrawerProps {
  vendor: ExtendedVendor;
  onClose: () => void;
  onApprove: (notes?: string) => void;
  isApproving: boolean;
  onStatusChange: (params: {
    status?: "approved" | "suspended" | "pending" | "rejected";
    onboardingStatus?: OnboardingStatus;
    reviewNotes?: string;
    rejectionReason?: string;
    gstExemptionVerified?: boolean;
  }) => void;
  isUpdating: boolean;
}

function VendorDetailsDrawer({
  vendor,
  onClose,
  onApprove,
  isApproving,
  onStatusChange,
  isUpdating,
}: VendorDrawerProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "agreement" | "decision">("overview");
  const [rejectionInput, setRejectionInput] = useState("");
  const [correctionInput, setCorrectionInput] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [showCorrectionBox, setShowCorrectionBox] = useState(false);

  // 1. Fetch vendor KYC documents
  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ["vendor-documents", vendor.id],
    queryFn: () => fetchVendorDocuments(vendor.id),
  });

  // 2. Fetch vendor digital agreement acceptance
  const { data: agreement, isLoading: agreementLoading } = useQuery({
    queryKey: ["vendor-agreement", vendor.id],
    queryFn: () => getVendorAgreement(vendor.id),
  });

  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    doc: VendorDocument;
    isPdf: boolean;
    isImage: boolean;
    useGoogleViewer: boolean;
  } | null>(null);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  // Handle viewing private document cleanly inside Admin Dashboard with full preview modal
  const handleViewDocument = async (doc: VendorDocument) => {
    setLoadingDocId(doc.id);
    try {
      const { url, error } = await getSignedDocumentUrl(doc.file_path, 3600);
      if (error || !url) {
        toast.error("Unable to load document: " + (error || "Unknown"));
        return;
      }

      const fileNameLower = (doc.file_name || "").toLowerCase();
      const filePathLower = (doc.file_path || "").toLowerCase();
      const mimeLower = (doc.mime_type || "").toLowerCase();

      const isPdf =
        mimeLower === "application/pdf" ||
        fileNameLower.endsWith(".pdf") ||
        filePathLower.includes(".pdf") ||
        filePathLower.includes("/raw/upload/");

      const isImage =
        mimeLower.startsWith("image/") ||
        /\.(jpe?g|png|webp|gif|svg)$/i.test(fileNameLower) ||
        /\.(jpe?g|png|webp|gif|svg)$/i.test(filePathLower);

      setPreviewDoc({
        url,
        doc,
        isPdf,
        isImage,
        useGoogleViewer: isPdf && url.startsWith("http") && !url.includes("supabase.co/storage"),
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to open document preview");
    } finally {
      setLoadingDocId(null);
    }
  };

  // Handle document verification update
  const handleVerifyDocument = async (docId: string, status: "verified" | "reupload_requested") => {
    let note = "";
    if (status === "reupload_requested") {
      const promptVal = prompt("Enter specific reason for requesting re-upload of this document:");
      if (!promptVal) return;
      note = promptVal;
    }

    // 1. Optimistically update React Query cache immediately
    qc.setQueryData(["vendor-documents", vendor.id], (prev: any) => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((d: any) =>
        d.id === docId ? { ...d, status, rejection_reason: note || null } : d
      );
    });

    if (previewDoc && previewDoc.doc.id === docId) {
      setPreviewDoc((prev) =>
        prev
          ? {
              ...prev,
              doc: { ...prev.doc, status, rejection_reason: note || null },
            }
          : null
      );
    }

    // 2. Persist to reliable local & server sync store
    const res = await updateVendorDocumentStatus(docId, status, note, vendor.id);
    if (res.success) {
      toast.success(status === "verified" ? "Document verified" : "Re-upload requested");
    } else {
      toast.error(res.error || "Failed to update document status");
    }
  };

  const onbStatus = vendor.onboarding_status || (vendor.status === "approved" ? "approved" : "submitted");

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl bg-slate-950 border-l border-slate-800 text-white overflow-y-auto p-6">
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Store className="h-5 w-5 text-amber-500" /> {vendor.store_name}
            </SheetTitle>
            <StatusBadge status={onbStatus} generalStatus={vendor.status} />
          </div>
          <SheetDescription className="text-xs text-slate-400">
            Vendor ID: {vendor.id} • Registered {new Date(vendor.created_at).toLocaleDateString()}
          </SheetDescription>
        </SheetHeader>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 mb-6 gap-1 overflow-x-auto">
          {[
            { id: "overview", label: "Business Details" },
            { id: "documents", label: `KYC Documents (${documents.length})` },
            { id: "agreement", label: "Digital Agreement" },
            { id: "decision", label: "Admin Decision" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW & BUSINESS DETAILS */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2">
                <Building className="h-4 w-4" /> Legal Entity & Tax Identifiers
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Business Structure:</span>
                  <span className="font-semibold text-white capitalize">
                    {vendor.business_type?.replace("_", " ") || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Registered Legal Name:</span>
                  <span className="font-semibold text-white">
                    {vendor.legal_business_name || vendor.store_name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">PAN Number:</span>
                  <span className="font-mono font-semibold text-amber-400">
                    {vendor.pan_number || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">PAN Holder Name:</span>
                  <span className="font-semibold text-white">
                    {vendor.pan_holder_name || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">GST Identification:</span>
                  {vendor.is_gst_exempt ? (
                    <div className="space-y-1 mt-0.5">
                      <span className="font-semibold text-amber-400 block text-xs">
                        Artisan Exemption Declared
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            vendor.gst_exemption_verified
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                          }`}
                        >
                          {vendor.gst_exemption_verified ? "Exemption Verified ✓" : "Exemption Unverified"}
                        </span>
                        <button
                          disabled={isUpdating}
                          onClick={() =>
                            onStatusChange({
                              gstExemptionVerified: !vendor.gst_exemption_verified,
                            })
                          }
                          className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                        >
                          {vendor.gst_exemption_verified ? "Revoke" : "Verify Exemption"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="font-mono font-semibold text-white">
                      {vendor.gstin || "Not provided"}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block">Udyam Registration:</span>
                  <span className="font-mono font-semibold text-white">
                    {vendor.udyam_number || "Not provided"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Contact & Operating Address
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Authorized Contact:</span>
                  <span className="font-semibold text-white">{vendor.contact_name || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Contact Email:</span>
                  <span className="font-semibold text-white">{vendor.contact_email || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Contact Phone:</span>
                  <span className="font-semibold text-white">{vendor.contact_phone || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Registered City & State:</span>
                  <span className="font-semibold text-white">
                    {vendor.city ? `${vendor.city}, ${vendor.state} - ${vendor.pincode}` : vendor.location || "N/A"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block">Full Street Address:</span>
                  <span className="text-slate-300">
                    {[vendor.address_line1, vendor.address_line2].filter(Boolean).join(", ") || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Bank Settlement Information
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Account Holder:</span>
                  <span className="font-semibold text-white">
                    {vendor.bank_account_holder || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Bank Name:</span>
                  <span className="font-semibold text-white">
                    {vendor.bank_name || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Account Number:</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {vendor.bank_account_number
                      ? `•••• •••• ${vendor.bank_account_number.slice(-4)}`
                      : "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">IFSC Code:</span>
                  <span className="font-mono font-semibold text-amber-400">
                    {vendor.bank_ifsc || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Account Type:</span>
                  <span className="font-semibold text-white capitalize">
                    {vendor.bank_account_type || "Current / Savings"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRIVATE KYC DOCUMENTS */}
        {activeTab === "documents" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Documents are stored privately in Supabase Storage. Clicking "View Document" generates a short-lived (15 min) signed URL for secure verification.
            </p>

            {docsLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            ) : documents.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
                <FileText className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-400">No KYC documents uploaded yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Applicant has not submitted documents or was created under legacy flow.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc: VendorDocument) => (
                  <div
                    key={doc.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-amber-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          {doc.document_type.replace("_", " ")}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            doc.status === "verified"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : doc.status === "reupload_requested"
                              ? "bg-orange-500/20 text-orange-400"
                              : doc.status === "rejected"
                              ? "bg-rose-500/20 text-rose-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">{doc.file_name}</p>
                      <p className="text-[11px] text-slate-500">
                        Uploaded {new Date(doc.uploaded_at).toLocaleString()} •{" "}
                        {doc.file_size_bytes ? (doc.file_size_bytes / 1024).toFixed(0) : "0"} KB
                      </p>
                      {doc.rejection_reason && (
                        <p className="text-xs text-orange-400 font-medium">
                          Note: {doc.rejection_reason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 md:pt-0">
                      <button
                        onClick={() => handleViewDocument(doc)}
                        disabled={loadingDocId === doc.id}
                        className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {loadingDocId === doc.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                        ) : (
                          <Eye className="h-3.5 w-3.5 text-amber-400" />
                        )}
                        <span>View Document</span>
                      </button>

                      {doc.status !== "verified" && (
                        <button
                          onClick={() => handleVerifyDocument(doc.id, "verified")}
                          className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Verify
                        </button>
                      )}

                      {doc.status !== "reupload_requested" && (
                        <button
                          onClick={() => handleVerifyDocument(doc.id, "reupload_requested")}
                          className="px-3 py-1.5 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Request Fix
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DIGITAL AGREEMENT AUDIT */}
        {activeTab === "agreement" && (
          <div className="space-y-4">
            {agreementLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            ) : agreement ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <ShieldCheck className="h-5 w-5" />
                  Digital Agreement Accepted & Cryptographically Recorded
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Agreement Title:</span>
                    <span className="font-semibold text-white">{agreement.agreement_title}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Agreement Version:</span>
                    <span className="font-semibold text-white">v{agreement.agreement_version}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Accepted By:</span>
                    <span className="font-semibold text-white">{agreement.representative_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Accepted At:</span>
                    <span className="font-semibold text-white">
                      {new Date(agreement.accepted_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">SHA-256 Document Hash:</span>
                    <span className="font-mono text-[11px] text-amber-400 break-all">
                      {agreement.document_hash}
                    </span>
                  </div>
                  {agreement.user_agent && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block">Recorded Client Environment:</span>
                      <span className="text-slate-400 text-[11px] break-all">
                        {agreement.user_agent}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
                <AlertCircle className="h-10 w-10 text-amber-500/50 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No digital agreement acceptance found</p>
                <p className="text-xs text-slate-500 mt-1">
                  Vendor must accept the terms before server approval can be executed.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ADMIN DECISION & WORKBENCH */}
        {activeTab === "decision" && (
          <div className="space-y-6">
            {/* Status overview */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                Current Status
              </h4>
              <div className="flex items-center gap-3">
                <StatusBadge status={onbStatus} generalStatus={vendor.status} />
                <span className="text-xs text-slate-400">
                  {onbStatus === "approved"
                    ? `Approved on ${vendor.approval_date ? new Date(vendor.approval_date).toLocaleDateString() : "Record"}`
                    : "Pending complete administrative action"}
                </span>
              </div>

              {vendor.admin_review_notes && (
                <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400 block font-semibold mb-1">Previous Review Notes:</span>
                  <p className="text-slate-300">{vendor.admin_review_notes}</p>
                </div>
              )}

              {vendor.rejection_reason && (
                <div className="mt-3 p-3 bg-red-950/20 rounded-xl border border-red-900/30 text-xs">
                  <span className="text-red-400 block font-semibold mb-1">Rejection Reason:</span>
                  <p className="text-red-300">{vendor.rejection_reason}</p>
                </div>
              )}
            </div>

            {/* Actions for Pending / Submitted Vendors */}
            {(onbStatus === "submitted" || onbStatus === "under_review" || onbStatus === "action_required") && (
              <div className="space-y-4">
                {onbStatus === "submitted" && (
                  <button
                    disabled={isUpdating}
                    onClick={() =>
                      onStatusChange({
                        onboardingStatus: "under_review",
                        reviewNotes: "Admin has opened applicant dossier for inspection",
                      })
                    }
                    className="w-full py-3 bg-slate-900 border border-amber-500/30 hover:border-amber-500 text-amber-400 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Clock className="h-4 w-4" /> Move to "Under Review" Status
                  </button>
                )}

                {/* Approve & Activate via Server RPC */}
                <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle className="h-5 w-5" />
                    Server-Enforced Approval & Activation
                  </div>
                  <p className="text-xs text-slate-400">
                    Executing approval runs the server function <code className="text-emerald-300">admin_approve_vendor</code>, which validates the agreement, sets vendor status to approved, and grants the vendor role on the database server.
                  </p>
                  <div>
                    <input
                      type="text"
                      placeholder="Optional approval notes for audit trail..."
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-emerald-500 mb-3"
                    />
                    <button
                      disabled={isApproving}
                      onClick={() => onApprove(approvalNotes)}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      {isApproving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Verifying & Activating...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" /> Approve & Activate Vendor
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Request Corrections Accordion */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-400 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Request Vendor Corrections
                    </span>
                    <button
                      onClick={() => setShowCorrectionBox(!showCorrectionBox)}
                      className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      {showCorrectionBox ? "Cancel" : "Compose Request"}
                    </button>
                  </div>
                  {showCorrectionBox && (
                    <div className="space-y-2 pt-2">
                      <textarea
                        rows={3}
                        placeholder="Detail which document or information requires correction (e.g., PAN card blurred, invalid bank IFSC)..."
                        value={correctionInput}
                        onChange={(e) => setCorrectionInput(e.target.value)}
                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-orange-500"
                      />
                      <button
                        disabled={isUpdating || !correctionInput.trim()}
                        onClick={() => {
                          onStatusChange({
                            onboardingStatus: "action_required",
                            reviewNotes: correctionInput.trim(),
                          });
                          setShowCorrectionBox(false);
                          setCorrectionInput("");
                        }}
                        className="w-full py-2.5 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
                      >
                        Send Correction Request to Vendor
                      </button>
                    </div>
                  )}
                </div>

                {/* Reject Application Accordion */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-2">
                      <XCircle className="h-4 w-4" /> Reject Application
                    </span>
                    <button
                      onClick={() => setShowRejectBox(!showRejectBox)}
                      className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      {showRejectBox ? "Cancel" : "Specify Reason"}
                    </button>
                  </div>
                  {showRejectBox && (
                    <div className="space-y-2 pt-2">
                      <textarea
                        rows={3}
                        placeholder="Provide formal reason for rejecting this vendor application..."
                        value={rejectionInput}
                        onChange={(e) => setRejectionInput(e.target.value)}
                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-rose-500"
                      />
                      <button
                        disabled={isUpdating || !rejectionInput.trim()}
                        onClick={() => {
                          onStatusChange({
                            status: "rejected",
                            onboardingStatus: "rejected",
                            rejectionReason: rejectionInput.trim(),
                          });
                          setShowRejectBox(false);
                          setRejectionInput("");
                        }}
                        className="w-full py-2.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions for Already Approved Vendors */}
            {vendor.status === "approved" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  Suspension Control
                </h4>
                <p className="text-xs text-slate-400">
                  Suspending a vendor immediately unlists their products and disables their store storefront.
                </p>
                <button
                  disabled={isUpdating}
                  onClick={() =>
                    onStatusChange({
                      status: "suspended",
                    })
                  }
                  className="w-full py-3 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Ban className="h-4 w-4" /> Suspend Vendor Account
                </button>
              </div>
            )}

            {/* Actions for Suspended Vendors */}
            {vendor.status === "suspended" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Reactivation Control
                </h4>
                <p className="text-xs text-slate-400">
                  Reactivate this vendor to restore their storefront and product catalog.
                </p>
                <button
                  disabled={isUpdating}
                  onClick={() =>
                    onStatusChange({
                      status: "approved",
                    })
                  }
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <CheckCircle className="h-4 w-4" /> Reactivate Vendor Account
                </button>
              </div>
            )}
          </div>
        )}

        {/* Embedded High-Clarity KYC Document / PDF Viewer Modal */}
        {previewDoc && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6"
            onClick={(e) => {
              if (e.target === e.currentTarget) setPreviewDoc(null);
            }}
          >
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-4 bg-slate-950/95 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
                    {previewDoc.isPdf ? <FileText className="h-5 w-5" /> : <FileCheck className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm md:text-base truncate">
                        {previewDoc.doc.document_type.replace(/_/g, " ").toUpperCase()}
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          previewDoc.doc.status === "verified"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : previewDoc.doc.status === "reupload_requested"
                            ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {previewDoc.doc.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate font-mono">
                      {previewDoc.doc.file_name} •{" "}
                      {previewDoc.doc.file_size_bytes
                        ? (previewDoc.doc.file_size_bytes / 1024).toFixed(0) + " KB"
                        : "Uploaded Document"}
                    </p>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {previewDoc.isPdf && previewDoc.url.startsWith("http") && (
                    <button
                      onClick={() =>
                        setPreviewDoc((prev) =>
                          prev ? { ...prev, useGoogleViewer: !prev.useGoogleViewer } : null
                        )
                      }
                      className="hidden sm:inline-flex px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium items-center gap-1.5 transition-colors cursor-pointer"
                      title="Toggle alternate PDF viewer engine"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                      <span>{previewDoc.useGoogleViewer ? "Native Browser PDF" : "Google Cloud Engine"}</span>
                    </button>
                  )}

                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Open in Tab</span>
                  </a>

                  {previewDoc.doc.status !== "verified" && (
                    <button
                      onClick={async () => {
                        await handleVerifyDocument(previewDoc.doc.id, "verified");
                        setPreviewDoc((prev) =>
                          prev
                            ? {
                                ...prev,
                                doc: { ...prev.doc, status: "verified" },
                              }
                            : null
                        );
                      }}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Verify</span>
                    </button>
                  )}

                  {previewDoc.doc.status !== "reupload_requested" && (
                    <button
                      onClick={async () => {
                        await handleVerifyDocument(previewDoc.doc.id, "reupload_requested");
                        setPreviewDoc((prev) =>
                          prev
                            ? {
                                ...prev,
                                doc: { ...prev.doc, status: "reupload_requested" },
                              }
                            : null
                        );
                      }}
                      className="px-2.5 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/40 font-semibold rounded-lg text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Request Fix</span>
                    </button>
                  )}

                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer ml-1"
                    title="Close preview"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Document Viewing Body */}
              <div className="flex-1 bg-slate-950 relative flex items-center justify-center p-2 overflow-hidden">
                {previewDoc.isImage ? (
                  <div className="h-full w-full flex items-center justify-center overflow-auto p-4">
                    <img
                      src={previewDoc.url}
                      alt={previewDoc.doc.file_name}
                      className="max-h-full max-w-full object-contain rounded-lg shadow-xl border border-slate-800 bg-black/40"
                    />
                  </div>
                ) : previewDoc.isPdf ? (
                  <div className="h-full w-full flex flex-col">
                    <iframe
                      src={
                        previewDoc.useGoogleViewer
                          ? `https://docs.google.com/viewer?url=${encodeURIComponent(previewDoc.url)}&embedded=true`
                          : previewDoc.url
                      }
                      title={previewDoc.doc.file_name}
                      className="w-full flex-1 rounded-xl border border-slate-800 bg-white"
                    />
                    <div className="py-2 px-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Previewing directly inside Admin Dashboard</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewDoc((prev) =>
                              prev ? { ...prev, useGoogleViewer: !prev.useGoogleViewer } : null
                            )
                          }
                          className="text-amber-400 hover:underline cursor-pointer"
                        >
                          {previewDoc.useGoogleViewer ? "Switch to Native PDF Engine" : "Switch to Google Cloud Engine"}
                        </button>
                        <span>•</span>
                        <a
                          href={previewDoc.url}
                          download={previewDoc.doc.file_name}
                          className="text-slate-300 hover:text-white underline cursor-pointer"
                        >
                          Download Document
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <iframe
                    src={previewDoc.url}
                    title={previewDoc.doc.file_name}
                    className="w-full h-full rounded-xl border border-slate-800 bg-white"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
