import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Function to dynamically load the Razorpay Checkout SDK script
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface PaymentOptions {
  amountCents: number;
  orderId?: string;
  preservationRequestId?: string;
  paymentType: "full" | "advance" | "final";
  customerId: string;
  vendorId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onSuccess: (payment: any) => void;
  onFailure: (error: string) => void;
}

// Function to launch the standard Razorpay Checkout and verify payment signature
export async function initializeRazorpayPayment(options: PaymentOptions) {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    options.onFailure("Failed to load Razorpay SDK. Please check your internet connection.");
    toast.error("Failed to load Razorpay SDK. Please try again.");
    return;
  }

  try {
    // 1. Create a Razorpay Order via Supabase Edge Function
    const { data: orderData, error: orderErr } = await supabase.functions.invoke(
      "razorpay/create-order",
      {
        body: {
          amount: options.amountCents, // Amount in paise
          currency: "INR",
          order_id: options.orderId,
          preservation_request_id: options.preservationRequestId,
        },
      },
    );

    if (orderErr || !orderData) {
      throw new Error(orderErr?.message || "Failed to initiate payment order");
    }

    const rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_d3a8B9c1D2e3f4";

    // 2. Configure checkout options
    const checkoutOptions = {
      key: rzpKey,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "ViaCraft Marketplace",
      description:
        options.paymentType === "advance"
          ? "50% Custom Preservation Advance Payment"
          : options.paymentType === "final"
            ? "50% Remaining Preservation Final Payment"
            : "Marketplace Product Checkout Payment",
      order_id: orderData.id,
      prefill: {
        name: options.customerName || "",
        email: options.customerEmail || "",
        contact: options.customerPhone || "",
      },
      theme: {
        color: "#3d2712", // ViaCraft brown theme
      },
      handler: async function (response: any) {
        // Triggered upon successful payment checkout
        toast.info("Verifying secure payment transaction...");

        try {
          // 3. Verify Payment Signature via Supabase Edge Function
          const { data: verifyData, error: verifyErr } = await supabase.functions.invoke(
            "razorpay/verify-payment",
            {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: options.orderId,
                preservation_request_id: options.preservationRequestId,
                payment_type: options.paymentType,
                amount_cents: options.amountCents,
                customer_id: options.customerId,
                vendor_id: options.vendorId,
              },
            },
          );

          if (verifyErr || !verifyData || !verifyData.success) {
            throw new Error(verifyErr?.message || "Signature verification failed");
          }

          options.onSuccess(verifyData.payment);
        } catch (err: any) {
          console.error("Payment Verification Error:", err);
          options.onFailure(err.message || "Payment verification failed.");
        }
      },
      modal: {
        ondismiss: function () {
          options.onFailure("Payment checkout cancelled by user.");
          toast.warning("Payment checkout cancelled.");
        },
      },
    };

    const rzp = new (window as any).Razorpay(checkoutOptions);
    rzp.on("payment.failed", function (response: any) {
      options.onFailure(response.error.description || "Payment failed.");
      toast.error(`Payment failed: ${response.error.description}`);
    });

    rzp.open();
  } catch (err: any) {
    console.error("Razorpay Checkout Error:", err);
    options.onFailure(err.message || "Failed to initiate payment.");
  }
}
