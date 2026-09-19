import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CCAvenuePaymentOptions {
  amountCents: number;
  orderId?: string;
  preservationRequestId?: string;
  paymentType: "full" | "advance" | "final";
  customerId: string;
  vendorId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingCountry?: string;
  onFailure?: (error: string) => void;
}

/**
 * Initiates the CCAvenue Payment Gateway flow.
 * 1. Calls API (Vite local dev server or Supabase Edge Function) to encrypt order parameters.
 * 2. Creates a hidden HTML form with encRequest & access_code.
 * 3. Submits the form to redirect the user to CCAvenue's hosted checkout page.
 */
export async function initializeCCAvenuePayment(options: CCAvenuePaymentOptions) {
  try {
    toast.info("Connecting to CCAvenue Secure Gateway...");

    const amountInRupees = options.amountCents / 100;
    const payload = {
      action: "initiate",
      amount: amountInRupees,
      order_id: options.orderId || `ord_${Date.now()}`,
      preservation_request_id: options.preservationRequestId,
      customer_id: options.customerId,
      vendor_id: options.vendorId,
      customer_name: options.customerName,
      customer_email: options.customerEmail,
      customer_phone: options.customerPhone,
      billing_address: options.billingAddress,
      billing_city: options.billingCity,
      billing_state: options.billingState,
      billing_zip: options.billingZip,
      billing_country: options.billingCountry || "India",
      payment_type: options.paymentType,
    };

    let encRequest = "";
    let accessCode = "";
    let actionUrl = "";

    // 1. Try local dev server API first (works natively with 0 external dependencies)
    try {
      const res = await fetch("/api/ccavenue/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.encRequest && json.accessCode) {
          encRequest = json.encRequest;
          accessCode = json.accessCode;
          actionUrl = json.actionUrl;
        }
      }
    } catch (_) {
      // Local endpoint not available, fallback to Supabase Edge Function
    }

    // 2. Fallback to Supabase Edge Function
    if (!encRequest) {
      const { data, error } = await supabase.functions.invoke("ccavenue", {
        body: payload,
      });

      if (error || !data || !data.encRequest) {
        throw new Error(
          error?.message || data?.error || "Failed to connect to payment gateway. Please try again.",
        );
      }

      encRequest = data.encRequest;
      accessCode = data.accessCode;
      actionUrl = data.actionUrl;
    }

    // 3. Create and auto-submit form to CCAvenue
    const form = document.createElement("form");
    form.id = "ccavenue_payment_form";
    form.method = "POST";
    form.action = actionUrl;
    form.style.display = "none";

    const encInput = document.createElement("input");
    encInput.type = "hidden";
    encInput.name = "encRequest";
    encInput.value = encRequest;
    form.appendChild(encInput);

    const accessInput = document.createElement("input");
    accessInput.type = "hidden";
    accessInput.name = "access_code";
    accessInput.value = accessCode;
    form.appendChild(accessInput);

    document.body.appendChild(form);
    form.submit();
  } catch (err: any) {
    console.error("CCAvenue Payment Error:", err);
    toast.error(err.message || "Could not launch CCAvenue payment gateway.");
    if (options.onFailure) {
      options.onFailure(err.message);
    }
  }
}
