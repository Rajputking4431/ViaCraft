export type VendorOnboardingStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "action_required"
  | "rejected"
  | "approved";

export type OnboardingStatus = VendorOnboardingStatus;

export type BusinessType =
  | "Artisan / Individual"
  | "Sole Proprietorship"
  | "Partnership"
  | "Private Limited"
  | "LLP";

export interface BusinessAddress {
  street: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
}

export interface BankAccountDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName?: string;
  accountType?: string;
}

export type DocumentType =
  | "pan_card"
  | "gst_certificate"
  | "udyam_certificate"
  | "bank_proof"
  | "business_address_proof";

export type DocumentStatus =
  | "pending"
  | "approved"
  | "verified"
  | "rejected"
  | "reupload_requested";

export interface VendorDocument {
  id: string;
  vendor_id: string;
  document_type: DocumentType;
  file_path: string;
  file_name: string;
  file_size_bytes?: number | null;
  mime_type: string;
  status: DocumentStatus;
  rejection_reason?: string | null;
  uploaded_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

export interface VendorAgreement {
  id: string;
  vendor_id: string;
  user_id: string;
  agreement_version: string;
  agreement_title: string;
  document_hash: string;
  accepted_at: string;
  representative_name: string;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface ExtendedVendor {
  id: string;
  user_id: string;
  slug: string;
  store_name: string;
  tagline?: string | null;
  bio?: string | null;
  location?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  rating: number;
  status: "pending" | "approved" | "suspended" | "rejected";
  created_at: string;
  updated_at: string;

  // Phase 1 Onboarding fields
  onboarding_status?: VendorOnboardingStatus;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  business_type?: BusinessType | string;
  legal_business_name?: string | null;
  business_address?: BusinessAddress | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  pan_number?: string | null;
  pan_holder_name?: string | null;
  pan_verified?: boolean;
  gstin?: string | null;
  is_gst_exempt?: boolean;
  gst_exemption_verified?: boolean;
  gst_exemption_reason?: string | null;
  gst_enrolment_number?: string | null;
  gstin_verified?: boolean;
  udyam_number?: string | null;
  bank_account_details?: BankAccountDetails | null;
  bank_account_holder?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_name?: string | null;
  bank_account_type?: string | null;
  bank_verified?: boolean;
  admin_review_notes?: string | null;
  rejection_reason?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  approval_date?: string | null;
}
