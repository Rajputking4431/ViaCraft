import { supabase } from "@/integrations/supabase/client";
import type { VendorAgreement } from "@/types/vendor-onboarding";

export const CURRENT_VENDOR_AGREEMENT_VERSION = "1.0";
export const CURRENT_VENDOR_AGREEMENT_TITLE = "ViaCraft Vendor Terms & Conditions";
export const CURRENT_VENDOR_AGREEMENT_DATE = "July 10, 2026";

/**
 * Computes SHA-256 checksum for agreement text verification.
 */
export async function computeAgreementHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Records an immutable agreement acceptance audit row into public.vendor_agreements.
 */
export async function recordAgreementAcceptance({
  vendorId,
  userId,
  representativeName,
  agreementContent,
}: {
  vendorId: string;
  userId: string;
  representativeName: string;
  agreementContent: string;
}): Promise<{ success: boolean; agreement?: VendorAgreement; error?: string }> {
  try {
    // 1. Preferred secure method: Call trusted server-side acceptance function
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
      "accept_vendor_agreement",
      {
        _vendor_id: vendorId,
        _agreement_version: CURRENT_VENDOR_AGREEMENT_VERSION,
        _representative_name: representativeName.trim(),
      }
    );

    if (!rpcError && rpcData?.success) {
      return {
        success: true,
        agreement: {
          id: rpcData.agreement_id,
          vendor_id: vendorId,
          user_id: userId,
          agreement_version: CURRENT_VENDOR_AGREEMENT_VERSION,
          agreement_title: CURRENT_VENDOR_AGREEMENT_TITLE,
          document_hash: "SERVER_VALIDATED",
          accepted_at: rpcData.accepted_at || new Date().toISOString(),
          representative_name: representativeName.trim(),
        },
      };
    }

    // 2. Fallback only if the migration RPC is not yet applied to the remote DB
    if (rpcError && (rpcError.message?.includes("function") || rpcError.code === "42883")) {
      console.warn("Server RPC accept_vendor_agreement not found, falling back to direct insert:", rpcError);
      const documentHash = await computeAgreementHash(agreementContent);
      const { data, error } = await supabase
        .from("vendor_agreements" as any)
        .insert({
          vendor_id: vendorId,
          user_id: userId,
          agreement_version: CURRENT_VENDOR_AGREEMENT_VERSION,
          agreement_title: CURRENT_VENDOR_AGREEMENT_TITLE,
          document_hash: documentHash,
          representative_name: representativeName.trim(),
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return { success: true };
        }
        throw error;
      }

      return {
        success: true,
        agreement: data as unknown as VendorAgreement,
      };
    }

    if (rpcError) {
      throw new Error(rpcError.message || "Failed to record agreement acceptance on server");
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to record agreement acceptance",
    };
  }
}

/**
 * Checks if a vendor has accepted the active version of the digital agreement.
 */
export async function getVendorAgreement(vendorId: string): Promise<VendorAgreement | null> {
  const { data, error } = await supabase
    .from("vendor_agreements" as any)
    .select("*")
    .eq("vendor_id", vendorId)
    .eq("agreement_version", CURRENT_VENDOR_AGREEMENT_VERSION)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as unknown as VendorAgreement;
}
