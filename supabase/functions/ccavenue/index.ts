import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.10.0";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";

const CCAVENUE_MERCHANT_ID = Deno.env.get("CCAVENUE_MERCHANT_ID") || "4473425";
const CCAVENUE_ACCESS_CODE = Deno.env.get("CCAVENUE_ACCESS_CODE") || "AVAJ96NI77BH11JAHB";
const CCAVENUE_WORKING_KEY = Deno.env.get("CCAVENUE_WORKING_KEY") || "D02D83A7F6AE503A0C407471186B92B7";
const CCAVENUE_ENV = Deno.env.get("CCAVENUE_ENV") || "production";
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://www.viacraft.in";

// CCAvenue Gateway URLs
const CCAVENUE_GATEWAY_URL =
  CCAVENUE_ENV === "production"
    ? "https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction"
    : "https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction";

// Standard CCAvenue IV & Key Generation (AES-128-CBC)
function getCipherKey(workingKey: string) {
  const m = crypto.createHash("md5");
  m.update(workingKey);
  return m.digest();
}

const CCAVENUE_IV = new Uint8Array([
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
  0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
]);

// Encrypt plaintext into hex string
export function encrypt(plainText: string, workingKey: string): string {
  const key = getCipherKey(workingKey);
  const cipher = crypto.createCipheriv("aes-128-cbc", key, CCAVENUE_IV);
  let encoded = cipher.update(plainText, "utf8", "hex");
  encoded += cipher.final("hex");
  return encoded;
}

// Decrypt hex string into plaintext
export function decrypt(encText: string, workingKey: string): string {
  const key = getCipherKey(workingKey);
  const decipher = crypto.createDecipheriv("aes-128-cbc", key, CCAVENUE_IV);
  let decoded = decipher.update(encText, "hex", "utf8");
  decoded += decipher.final("utf8");
  return decoded;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;
  const actionParam = url.searchParams.get("action");

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // =========================================================================
    // 1. RESPONSE HANDLER: If CCAvenue POSTs callback with encResp
    // =========================================================================
    const contentType = req.headers.get("content-type") || "";
    const isFormPost = contentType.includes("application/x-www-form-urlencoded");

    if (path.endsWith("/response") || actionParam === "response" || isFormPost) {
      let encResp = "";

      if (isFormPost) {
        const formData = await req.formData();
        encResp = formData.get("encResp")?.toString() || "";
      } else if (contentType.includes("application/json")) {
        const jsonBody = await req.json();
        encResp = jsonBody.encResp || "";
      } else {
        const rawText = await req.text();
        const parsed = new URLSearchParams(rawText);
        encResp = parsed.get("encResp") || "";
      }

      if (encResp) {
        // Decrypt CCAvenue Response
        const decryptedText = decrypt(encResp, CCAVENUE_WORKING_KEY);
        const params = new URLSearchParams(decryptedText);
        const responseData: Record<string, string> = Object.fromEntries(params.entries());

        const orderStatus = responseData.order_status;
        const trackingId = responseData.tracking_id;
        const bankRefNo = responseData.bank_ref_no || "";
        const orderId = responseData.order_id || responseData.merchant_param5;
        const amount = parseFloat(responseData.amount || "0");
        const amountCents = Math.round(amount * 100);
        const customerId = responseData.merchant_param1;
        const paymentType = responseData.merchant_param2 || "full";
        const preservationRequestId = responseData.merchant_param3;
        const vendorId = responseData.merchant_param4;

        const isSuccess = orderStatus === "Success";

        if (isSuccess) {
          // Record payment in database
          await supabaseClient.from("payments").insert({
            order_id: orderId || null,
            preservation_request_id: preservationRequestId || null,
            customer_id: customerId || null,
            vendor_id: vendorId || null,
            payment_type: paymentType,
            amount_cents: amountCents,
            razorpay_order_id: `ccav_${orderId}`,
            razorpay_payment_id: trackingId,
            razorpay_signature: bankRefNo,
            status: "captured",
            currency: "INR",
            verified: true,
          });

          if (paymentType === "full" && orderId) {
            await supabaseClient
              .from("orders")
              .update({ status: "paid", payment_status: "fully_paid" })
              .eq("id", orderId);
          }

          // Redirect customer to success page
          const successRedirect = `${FRONTEND_URL}/payment/success?order_id=${orderId}&tracking_id=${trackingId}&status=Success`;
          return Response.redirect(successRedirect, 303);
        } else {
          // Redirect customer to failure page
          const failureMessage = encodeURIComponent(
            responseData.status_message || responseData.failure_message || "Payment was not successful"
          );
          const failureRedirect = `${FRONTEND_URL}/payment/failure?order_id=${orderId}&status=${orderStatus}&message=${failureMessage}`;
          return Response.redirect(failureRedirect, 303);
        }
      }
    }

    // =========================================================================
    // 2. INITIATE PAYMENT: Encrypt order details & return encRequest + access_code
    // =========================================================================
    const reqBody = await req.json().catch(() => ({}));
    const {
      amount,
      order_id,
      preservation_request_id,
      customer_id,
      vendor_id,
      customer_name,
      customer_email,
      customer_phone,
      billing_address,
      billing_city,
      billing_state,
      billing_zip,
      billing_country = "India",
      payment_type = "full",
    } = reqBody;

    if (!amount || !order_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: amount and order_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // CCAvenue callback URL
    const redirectUrl = `${url.origin}/functions/v1/ccavenue/response`;
    const cancelUrl = `${url.origin}/functions/v1/ccavenue/response`;

    // Build order parameters
    const orderParams = new URLSearchParams({
      merchant_id: CCAVENUE_MERCHANT_ID,
      order_id: String(order_id),
      currency: "INR",
      amount: Number(amount).toFixed(2),
      redirect_url: redirectUrl,
      cancel_url: cancelUrl,
      language: "EN",
      billing_name: customer_name || "Customer",
      billing_address: billing_address || "Address",
      billing_city: billing_city || "City",
      billing_state: billing_state || "State",
      billing_zip: billing_zip || "000000",
      billing_country: billing_country,
      billing_tel: customer_phone || "",
      billing_email: customer_email || "",
      merchant_param1: customer_id || "",
      merchant_param2: payment_type || "full",
      merchant_param3: preservation_request_id || "",
      merchant_param4: vendor_id || "",
      merchant_param5: String(order_id),
    }).toString();

    // Encrypt with Working Key
    const encRequest = encrypt(orderParams, CCAVENUE_WORKING_KEY);

    return new Response(
      JSON.stringify({
        success: true,
        encRequest,
        accessCode: CCAVENUE_ACCESS_CODE,
        actionUrl: CCAVENUE_GATEWAY_URL,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("CCAvenue Edge Function Error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
