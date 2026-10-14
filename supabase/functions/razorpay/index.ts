import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.10.0";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || "rzp_test_d3a8B9c1D2e3f4";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "rzp_test_sec_e4d3c2b1a0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Endpoint to create a Razorpay Order
    if (path.endsWith("/create-order")) {
      const { amount, currency = "INR", order_id, preservation_request_id } = await req.json();

      if (!amount) {
        return new Response(JSON.stringify({ error: "Amount is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
      const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: Math.round(amount), // Amount in paise
          currency,
          receipt: order_id || preservation_request_id || `rec_${Date.now()}`,
        }),
      });

      if (!rzpResponse.ok) {
        const errorText = await rzpResponse.text();
        throw new Error(`Razorpay Order creation failed: ${errorText}`);
      }

      const rzpOrder = await rzpResponse.json();

      return new Response(JSON.stringify(rzpOrder), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Endpoint to verify payment signature and update order status
    if (path.endsWith("/verify-payment")) {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        order_id,
        preservation_request_id,
        payment_type,
        amount_cents,
        customer_id,
        vendor_id,
      } = await req.json();

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return new Response(JSON.stringify({ error: "Missing verification params" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify Razorpay signature
      const data = `${razorpay_order_id}|${razorpay_payment_id}`;
      const encoder = new TextEncoder();
      const keyBuf = encoder.encode(RAZORPAY_KEY_SECRET);
      const dataBuf = encoder.encode(data);

      const key = await crypto.subtle.importKey(
        "raw",
        keyBuf,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );

      const sigBuf = await crypto.subtle.sign("HMAC", key, dataBuf);
      const sigHex = Array.from(new Uint8Array(sigBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const isVerified = sigHex === razorpay_signature;

      if (!isVerified) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid signature verification" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Create a capture payment log in Supabase
      const { data: paymentRecord, error: pErr } = await supabaseClient
        .from("payments")
        .insert({
          order_id: order_id || null,
          preservation_request_id: preservation_request_id || null,
          customer_id,
          vendor_id: vendor_id || null,
          payment_type,
          amount_cents,
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          status: "captured",
          currency: "INR",
          verified: true,
        })
        .select()
        .single();

      if (pErr) throw pErr;

      // Update Order or create preservation workflow order
      if (payment_type === "full" && order_id) {
        // Normal Product checkout fully paid
        const { error: oErr } = await supabaseClient
          .from("orders")
          .update({ status: "paid", payment_status: "fully_paid" })
          .eq("id", order_id);
        if (oErr) throw oErr;
      } else if (payment_type === "advance" && preservation_request_id) {
        // 50% Advance Paid for Preservation Request
        const { data: requestData } = await supabaseClient
          .from("preservation_requests")
          .select("*")
          .eq("id", preservation_request_id)
          .single();

        if (requestData) {
          const totalCents = requestData.quote_cents || amount_cents * 2;
          const remainingCents = totalCents - amount_cents;

          // Transition preservation request status to consultation
          await supabaseClient
            .from("preservation_requests")
            .update({ quote_accepted: true, current_stage: "consultation" })
            .eq("id", preservation_request_id);

          // Add to stage log
          await supabaseClient.from("preservation_stage_log").insert({
            request_id: preservation_request_id,
            stage: "consultation",
            note: "Advance payment verified. Commencing artisan consultation.",
          });

          // Insert matching Order record
          const { data: orderData } = await supabaseClient
            .from("orders")
            .insert({
              user_id: customer_id,
              subtotal_cents: requestData.quote_cents || totalCents,
              shipping_cents: 0,
              tax_cents: 0,
              total_cents: totalCents,
              status: "processing",
              payment_status: "advance_paid",
              advance_paid_cents: amount_cents,
              remaining_balance_cents: remainingCents,
              payment_type: "split",
              preservation_request_id,
            })
            .select()
            .single();

          if (orderData) {
            // Update payment record to link with new order
            await supabaseClient
              .from("payments")
              .update({ order_id: orderData.id })
              .eq("id", paymentRecord.id);

            // Insert matching order items
            await supabaseClient.from("order_items").insert({
              order_id: orderData.id,
              product_id: requestData.id, // linked ID
              vendor_id: requestData.vendor_id || vendor_id,
              title: `${requestData.preservation_type} Preservation Keepsake`,
              quantity: 1,
              unit_price_cents: totalCents,
              subtotal_cents: totalCents,
            });
          }
        }
      } else if (payment_type === "final" && order_id) {
        // Final payment paid
        const { error: oErr } = await supabaseClient
          .from("orders")
          .update({ payment_status: "fully_paid", remaining_balance_cents: 0 })
          .eq("id", order_id);
        if (oErr) throw oErr;

        if (preservation_request_id) {
          // Transition stage to shipped
          await supabaseClient
            .from("preservation_requests")
            .update({ current_stage: "shipped" })
            .eq("id", preservation_request_id);

          // Add to stage log
          await supabaseClient.from("preservation_stage_log").insert({
            request_id: preservation_request_id,
            stage: "shipped",
            note: "Remaining 50% balance verified. Keepsake ready for courier dispatch.",
          });
        }
      }

      return new Response(JSON.stringify({ success: true, payment: paymentRecord }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Webhook endpoint for Razorpay events
    if (path.endsWith("/webhook")) {
      const payloadText = await req.text();
      const rzpSignature = req.headers.get("x-razorpay-signature") || "";
      const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") || "";

      let isVerified = false;
      if (webhookSecret && rzpSignature) {
        const encoder = new TextEncoder();
        const keyBuf = encoder.encode(webhookSecret);
        const dataBuf = encoder.encode(payloadText);

        const key = await crypto.subtle.importKey(
          "raw",
          keyBuf,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );

        const sigBuf = await crypto.subtle.sign("HMAC", key, dataBuf);
        const sigHex = Array.from(new Uint8Array(sigBuf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        isVerified = sigHex === rzpSignature;
      }

      if (!webhookSecret || isVerified) {
        const event = JSON.parse(payloadText);
        console.log(`Razorpay Webhook Event Received: ${event.event}`);
        // Handle webhook event types here
      }

      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  } catch (err: any) {
    console.error("Razorpay Edge Function Error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
