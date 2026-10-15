/**
 * Admin Vendor & Document Status Synchronization Service
 * Provides instant optimistic updates, local storage resilience, and server-backed disk persistence.
 */

const STORAGE_KEY = "viacraft_vendor_admin_sync_v1";

export interface DocumentOverride {
  id: string;
  vendor_id?: string;
  status: "pending" | "verified" | "rejected" | "reupload_requested";
  rejection_reason?: string | null;
  verified_at?: string | null;
  updated_at?: string;
}

export interface VendorOverride {
  id: string;
  user_id?: string;
  status?: "pending" | "approved" | "suspended" | "rejected";
  onboarding_status?: "submitted" | "under_review" | "action_required" | "approved" | "rejected" | "draft" | string;
  admin_review_notes?: string;
  rejection_reason?: string;
  gst_exemption_verified?: boolean;
  updated_at?: string;
}

export interface AdminSyncState {
  vendors: Record<string, VendorOverride>;
  documents: Record<string, DocumentOverride>;
}

// 1. In-memory & LocalStorage Cache
function getLocalSyncState(): AdminSyncState {
  if (typeof window === "undefined") return { vendors: {}, documents: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        vendors: parsed.vendors || {},
        documents: parsed.documents || {},
      };
    }
  } catch {
    // fallback
  }
  return { vendors: {}, documents: {} };
}

function saveLocalSyncState(state: AdminSyncState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("viacraft:vendor-sync-updated", { detail: state }));
  } catch {
    // ignore
  }
}

// 2. Fetch from Server
export async function fetchServerSyncState(): Promise<AdminSyncState> {
  const local = getLocalSyncState();
  if (typeof window === "undefined") return local;

  try {
    const res = await fetch("/api/admin/vendor-sync", { method: "GET" });
    if (res.ok) {
      const serverState = await res.json();
      const merged: AdminSyncState = {
        vendors: { ...local.vendors, ...(serverState.vendors || {}) },
        documents: { ...local.documents, ...(serverState.documents || {}) },
      };
      saveLocalSyncState(merged);
      return merged;
    }
  } catch {
    // Dev server endpoint or network offline, use local state
  }

  return local;
}

// 3. Persist Document Status
export async function persistDocumentStatus(
  docId: string,
  vendorId: string,
  status: "pending" | "verified" | "rejected" | "reupload_requested",
  rejectionReason?: string
): Promise<DocumentOverride> {
  const state = getLocalSyncState();
  const override: DocumentOverride = {
    id: docId,
    vendor_id: vendorId,
    status,
    rejection_reason: rejectionReason || null,
    verified_at: status === "verified" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  state.documents[docId] = override;
  // Also index by simple type if docId is prefixed or complex
  const docKey = docId.replace(/^doc_/, "").split("_")[0];
  if (docKey) {
    state.documents[`${vendorId}_${docKey}`] = override;
  }

  saveLocalSyncState(state);

  // Send to server in background
  if (typeof window !== "undefined") {
    fetch("/api/admin/vendor-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_document_status",
        docId,
        vendorId,
        status,
        rejectionReason,
      }),
    }).catch((e) => console.warn("[AdminSync] Document status server sync note:", e));
  }

  return override;
}

// 4. Persist Vendor Status
export async function persistVendorStatus(
  vendorId: string,
  updates: Partial<VendorOverride>
): Promise<VendorOverride> {
  const state = getLocalSyncState();
  const existing = state.vendors[vendorId] || { id: vendorId };

  const updated: VendorOverride = {
    ...existing,
    ...updates,
    id: vendorId,
    updated_at: new Date().toISOString(),
  };

  state.vendors[vendorId] = updated;
  if (updates.user_id) {
    state.vendors[updates.user_id] = updated;
  }

  saveLocalSyncState(state);

  // Send to server in background
  if (typeof window !== "undefined") {
    fetch("/api/admin/vendor-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_vendor_status",
        vendorId,
        ...updates,
      }),
    }).catch((e) => console.warn("[AdminSync] Vendor status server sync note:", e));
  }

  return updated;
}

// 5. Overlay Helpers
export function applyDocumentOverrides<T extends { id: string; vendor_id?: string; document_type?: string; status?: any }>(
  docs: T[],
  vendorId?: string
): T[] {
  const state = getLocalSyncState();
  return docs.map((doc) => {
    // Check by doc.id, or doc_type + vendorId
    const vId = vendorId || doc.vendor_id;
    const typeKey = doc.document_type && vId ? `${vId}_${doc.document_type}` : null;
    const ov = state.documents[doc.id] || (typeKey ? state.documents[typeKey] : null);

    if (ov) {
      return {
        ...doc,
        status: ov.status,
        rejection_reason: ov.rejection_reason !== undefined ? ov.rejection_reason : (doc as any).rejection_reason,
        verified_at: ov.verified_at !== undefined ? ov.verified_at : (doc as any).verified_at,
      };
    }
    return doc;
  });
}

export function applyVendorOverrides<T extends { id: string; user_id?: string; status?: any; onboarding_status?: any }>(
  vendors: T[]
): T[] {
  const state = getLocalSyncState();
  return vendors.map((v) => {
    const ov = state.vendors[v.id] || (v.user_id ? state.vendors[v.user_id] : null);
    if (ov) {
      return {
        ...v,
        ...(ov.status ? { status: ov.status } : {}),
        ...(ov.onboarding_status ? { onboarding_status: ov.onboarding_status } : {}),
        ...(ov.admin_review_notes !== undefined ? { admin_review_notes: ov.admin_review_notes } : {}),
        ...(ov.rejection_reason !== undefined ? { rejection_reason: ov.rejection_reason } : {}),
        ...(ov.gst_exemption_verified !== undefined ? { gst_exemption_verified: ov.gst_exemption_verified } : {}),
      };
    }
    return v;
  });
}

export function getVendorOverride(vendorIdOrUserId: string): VendorOverride | null {
  const state = getLocalSyncState();
  return state.vendors[vendorIdOrUserId] || null;
}
