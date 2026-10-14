import { supabase } from "@/integrations/supabase/client";
import type { DocumentType, VendorDocument } from "@/types/vendor-onboarding";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export interface UploadDocumentResult {
  success: boolean;
  document?: VendorDocument;
  error?: string;
}

/**
 * Validates file size and MIME type securely before upload.
 */
export function validateDocumentFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 5 MB limit (Current: ${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: "Unsupported file format. Only PDF, JPG, PNG, and WebP documents are permitted.",
    };
  }

  return { valid: true };
}

/**
 * Uploads a private KYC document directly to the private Supabase Storage bucket 'vendor-documents'
 * and records its metadata into the public.vendor_documents table.
 */
export async function uploadVendorDocument(
  file: File,
  documentType: DocumentType,
  vendorId: string,
  userId: string
): Promise<UploadDocumentResult> {
  const validation = validateDocumentFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${userId}/${documentType}_${Date.now()}_${safeName}`;

    // 1. Upload to Supabase Storage bucket 'vendor-documents'
    const { data: storageData, error: storageError } = await supabase.storage
      .from("vendor-documents")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (storageError) {
      console.warn("Storage bucket error, checking fallback:", storageError);
      throw new Error(`Storage upload failed: ${storageError.message}`);
    }

    // 2. Insert metadata into public.vendor_documents
    const { data: docRecord, error: dbError } = await supabase
      .from("vendor_documents" as any)
      .insert({
        vendor_id: vendorId,
        document_type: documentType,
        file_path: storageData.path,
        file_name: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
        status: "pending",
      })
      .select()
      .single();

    if (dbError) {
      // Clean up orphaned storage object
      await supabase.storage.from("vendor-documents").remove([filePath]);
      throw new Error(`Failed to record document metadata: ${dbError.message}`);
    }

    return {
      success: true,
      document: docRecord as unknown as VendorDocument,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Document upload failed",
    };
  }
}

/**
 * Generates a short-lived signed URL (default 15 minutes) for authorized viewing.
 */
export async function getSignedDocumentUrl(
  filePath: string,
  expiresInSeconds = 900
): Promise<{ url: string | null; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from("vendor-documents")
      .createSignedUrl(filePath, expiresInSeconds);

    if (error || !data) {
      return { url: null, error: error?.message || "Failed to generate signed URL" };
    }

    return { url: data.signedUrl };
  } catch (err: any) {
    return { url: null, error: err.message || "Failed to create signed URL" };
  }
}

/**
 * Fetches all document records for a given vendor.
 */
export async function fetchVendorDocuments(vendorId: string): Promise<VendorDocument[]> {
  const { data, error } = await supabase
    .from("vendor_documents" as any)
    .select("*")
    .eq("vendor_id", vendorId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.warn("Could not fetch vendor documents:", error);
    return [];
  }

  return (data as unknown as VendorDocument[]) || [];
}

/**
 * Updates document verification status (Admin only).
 */
export async function updateVendorDocumentStatus(
  documentId: string,
  status: "verified" | "rejected" | "reupload_requested",
  rejectionReason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("vendor_documents" as any)
      .update({
        status,
        rejection_reason: rejectionReason || null,
        verified_at: status === "verified" ? new Date().toISOString() : null,
      })
      .eq("id", documentId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update document status" };
  }
}
