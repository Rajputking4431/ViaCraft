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

  // Fetch all vendors with their onboarding fields
  const { data: vendors = [], isLoading } = useQuery<ExtendedVendor[]>({
    queryKey: ["admin-vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data as unknown) as ExtendedVendor[]) ?? [];
    },
  });

  // Server-enforced approval mutation via RPC
  const approveVendorMutation = useMutation({
    mutationFn: async ({ vendorId, notes }: { vendorId: string; notes?: string }) => {
      // 1. Call server-enforced RPC function
      const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)("admin_approve_vendor", {
        _vendor_id: vendorId,
        _admin_notes: notes || "Approved by Admin verification",
      });

      if (rpcError) {
        // If the migration function has not yet been deployed in production, provide a helpful alert
        if (rpcError.message?.includes("function admin_approve_vendor") || rpcError.code === "42883") {
          throw new Error(
            "Database function 'admin_approve_vendor' is not installed yet. Please apply migration 20261014000000_vendor_onboarding_phase1.sql in your Supabase SQL editor. Client-side role assignment is disabled for security."
          );
        }
        throw new Error(rpcError.message || "Failed to approve vendor via server");
      }

      return rpcResult;
    },
    onSuccess: (_, variables) => {
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
      const updates: Record<string, any> = {};
      if (status) updates.status = status;
      if (onboardingStatus) updates.onboarding_status = onboardingStatus;
      if (reviewNotes !== undefined) updates.admin_review_notes = reviewNotes;
      if (rejectionReason !== undefined) updates.rejection_reason = rejectionReason;
      if (gstExemptionVerified !== undefined) updates.gst_exemption_verified = gstExemptionVerified;

      const { error } = await supabase.from("vendors").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
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

    const effectiveStatus = v.onboarding_status || v.status;
    let matchesStatus = true;

    if (statusFilter === "all") {
      matchesStatus = true;
    } else if (statusFilter === "pending") {
      matchesStatus = effectiveStatus === "submitted" || effectiveStatus === "pending";
    } else if (statusFilter === "under_review") {
      matchesStatus = effectiveStatus === "under_review";
    } else if (statusFilter === "action_required") {
      matchesStatus = effectiveStatus === "action_required";
    } else if (statusFilter === "approved") {
      matchesStatus = effectiveStatus === "approved" || v.status === "approved";
    } else if (statusFilter === "rejected_suspended") {
      matchesStatus = effectiveStatus === "rejected" || v.status === "suspended";
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-amber-500 mb-2 font-semibold">
          Stores & Partners
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Vendor Administration</h1>
        <p className="text-sm text-slate-400 mt-1">
          Review business KYC verifications, inspect signed digital agreements, and enforce server approvals.
        </p>
      </div>

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
            { id: "all", label: "All" },
            { id: "pending", label: "Pending Review" },
            { id: "under_review", label: "Under Review" },
            { id: "action_required", label: "Action Required" },
            { id: "approved", label: "Approved" },
            { id: "rejected_suspended", label: "Rejected / Suspended" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-amber-500 text-slate-950 shadow-md font-bold"
                  : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
              }`}
            >
              {tab.label}
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

  // Handle viewing private document via signed URL
  const handleViewDocument = async (filePath: string) => {
    try {
      const { url, error } = await getSignedDocumentUrl(filePath, 900);
      if (error || !url) {
        toast.error("Unable to generate signed URL for document: " + (error || "Unknown"));
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(err.message || "Failed to open document");
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

    const res = await updateVendorDocumentStatus(docId, status, note);
    if (res.success) {
      toast.success(status === "verified" ? "Document verified" : "Re-upload requested");
      qc.invalidateQueries({ queryKey: ["vendor-documents", vendor.id] });
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
                        onClick={() => handleViewDocument(doc.file_path)}
                        className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View
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
      </SheetContent>
    </Sheet>
  );
}
