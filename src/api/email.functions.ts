import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  sendEmailDirectly,
  buildWelcomeEmail,
  buildVendorAppliedEmail,
  buildVendorApprovedEmail,
  buildVendorRejectedEmail,
  buildOrderConfirmationEmail,
  buildOrderStatusEmail,
  buildPasswordResetEmail,
  buildQuoteReceivedEmail,
  buildPreservationStageUpdateEmail,
  OrderConfirmItem,
  buildVendorNewOrderEmail,
  buildVendorOrderCancelledEmail,
  buildVendorPaymentReceivedEmail,
  buildCustomerPaymentFailedEmail,
  buildCustomerRefundEmail,
  buildAdminNewVendorEmail,
  buildAdminHighValueOrderEmail,
  buildAdminComplaintEmail,
  buildShipmentDispatchedEmail,
  buildShipmentOutForDeliveryEmail,
  buildShipmentDeliveredEmail,
  buildShipmentDelayEmail,
} from "@/services/email/resend.server";

// Helper to resolve user emails client-side since we cannot use admin API in SPA
async function getUserEmailAndName(userId: string): Promise<{ email: string; name: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id === userId) {
      const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
      return { email: user.email || "user@viacraft.com", name };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    const { data: vendorProfile } = await (supabase as any)
      .from("vendor_profiles")
      .select("email, store_name")
      .eq("vendor_id", userId)
      .maybeSingle();

    if (vendorProfile && vendorProfile.email) {
      return { email: vendorProfile.email, name: vendorProfile.store_name || "Vendor" };
    }

    const { data: order } = await supabase
      .from("orders")
      .select("shipping_address")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (order && order.shipping_address) {
      const addr: any = order.shipping_address;
      const email = addr.email || addr.contact_email;
      const name = addr.name || addr.fullName || profile?.full_name || "Customer";
      if (email) {
        return { email, name };
      }
    }

    const { data: presReq } = await (supabase as any)
      .from("preservation_requests")
      .select("contact_email, customer_name")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (presReq && presReq.contact_email) {
      return { email: presReq.contact_email, name: presReq.customer_name || profile?.full_name || "Customer" };
    }

    return {
      email: "customer@viacraft.com",
      name: profile?.full_name || "Valued Customer",
    };
  } catch (err) {
    console.warn("Failed to retrieve user email client-side, using fallback:", err);
    return { email: "customer@viacraft.com", name: "Valued Customer" };
  }
}

// 1. Welcome Email
export const sendWelcomeEmail = async ({ data }: { data: { email: string; fullName: string } }) => {
  z.object({ email: z.string().email(), fullName: z.string().min(1) }).parse(data);
  const html = buildWelcomeEmail(data.fullName);
  const success = await sendEmailDirectly(data.email, "Welcome to ViaCraft!", html);
  return { success };
};

// 2. Vendor Application Submitted
export const sendVendorAppliedEmail = async ({ data }: { data: { userId: string; storeName: string } }) => {
  z.object({ userId: z.string(), storeName: z.string().min(1) }).parse(data);
  try {
    const { email } = await getUserEmailAndName(data.userId);
    const html = buildVendorAppliedEmail(data.storeName);
    const success = await sendEmailDirectly(email, "Vendor Application Submitted - ViaCraft", html);
    return { success };
  } catch (e) {
    console.error("[sendVendorAppliedEmail error]", e);
    return { success: false, error: String(e) };
  }
};

// 3 & 4. Vendor Approved / Rejected Status Email
export const sendVendorStatusEmail = async ({ data }: { data: { vendorId: string; status: "approved" | "suspended" } }) => {
  z.object({ vendorId: z.string(), status: z.enum(["approved", "suspended"]) }).parse(data);
  try {
    const { data: vendor, error: vendorErr } = await supabase
      .from("vendors")
      .select("*")
      .eq("id", data.vendorId)
      .single();
    if (vendorErr || !vendor) {
      throw new Error(vendorErr?.message || "Vendor not found");
    }

    const { email } = await getUserEmailAndName(vendor.user_id);
    let html = "";
    let subject = "";

    if (data.status === "approved") {
      html = buildVendorApprovedEmail(vendor.store_name);
      subject = "Your ViaCraft Store is Approved! 🎉";
    } else {
      html = buildVendorRejectedEmail(vendor.store_name);
      subject = "ViaCraft Store Status Update";
    }

    const success = await sendEmailDirectly(email, subject, html);
    return { success };
  } catch (e) {
    console.error("[sendVendorStatusEmail error]", e);
    return { success: false, error: String(e) };
  }
};

// 5. Order Confirmation Email
export const sendOrderConfirmationEmail = async ({ data }: { data: { orderId: string } }) => {
  z.object({ orderId: z.string() }).parse(data);
  try {
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .single();
    if (orderErr || !order) {
      throw new Error(orderErr?.message || "Order not found");
    }

    const { data: orderItems, error: itemsErr } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", data.orderId);
    if (itemsErr || !orderItems) {
      throw new Error(itemsErr?.message || "Order items not found");
    }

    const { email } = await getUserEmailAndName(order.user_id);
    const confirmItems: OrderConfirmItem[] = orderItems.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      priceCents: item.unit_price_cents,
    }));

    const html = buildOrderConfirmationEmail(
      order.order_number,
      confirmItems,
      order.total_cents,
      order.shipping_address as any,
    );

    const success = await sendEmailDirectly(email, `Order Confirmation #${order.order_number}`, html);
    return { success };
  } catch (e) {
    console.error("[sendOrderConfirmationEmail error]", e);
    return { success: false, error: String(e) };
  }
};

// 6 & 7. Order Status Update Email
export const sendOrderStatusEmail = async ({ data }: { data: { orderId: string; status: string } }) => {
  z.object({ orderId: z.string(), status: z.string() }).parse(data);
  try {
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .single();
    if (orderErr || !order) {
      throw new Error(orderErr?.message || "Order not found");
    }

    const { email } = await getUserEmailAndName(order.user_id);
    const html = buildOrderStatusEmail(order.order_number, data.status);
    const subject = `Order #${order.order_number} Update: ${data.status}`;

    const success = await sendEmailDirectly(email, subject, html);
    return { success };
  } catch (e) {
    console.error("[sendOrderStatusEmail error]", e);
    return { success: false, error: String(e) };
  }
};

// 8. Password Reset recovery link email wrapper
export const sendPasswordResetEmail = async ({ data }: { data: { email: string; redirectTo: string } }) => {
  z.object({ email: z.string().email(), redirectTo: z.string().url() }).parse(data);
  try {
    // In client-side SPA, invoke standard resetPasswordForEmail directly
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: data.redirectTo,
    });
    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.error("[sendPasswordResetEmail error]", e);
    return { success: false, error: String(e) };
  }
};

// 9. Quote Received for Custom Order Request Email
export const sendQuoteReceivedEmail = async ({ data }: { data: { requestId: string; quotePriceCents: number; vendorStoreName: string } }) => {
  z.object({ requestId: z.string(), quotePriceCents: z.number(), vendorStoreName: z.string().min(1) }).parse(data);
  try {
    const { data: request, error: reqErr } = await (supabase as any)
      .from("preservation_requests")
      .select("*")
      .eq("id", data.requestId)
      .single();
    if (reqErr || !request) {
      throw new Error(reqErr?.message || "Preservation request not found");
    }

    const { email } = await getUserEmailAndName(request.user_id);
    const html = buildQuoteReceivedEmail(
      request.request_number,
      request.preservation_type,
      data.quotePriceCents,
      data.vendorStoreName,
    );

    const success = await sendEmailDirectly(
      email,
      `New Proposal for Custom Request ${request.request_number}`,
      html,
    );
    return { success };
  } catch (e) {
    console.error("[sendQuoteReceivedEmail error]", e);
    return { success: false, error: String(e) };
  }
};

// 10. Preservation progress stage update email
export const sendPreservationStageUpdateEmail = async ({ data }: { data: { requestId: string; stage: string; note?: string } }) => {
  z.object({ requestId: z.string(), stage: z.string(), note: z.string().optional() }).parse(data);
  try {
    const { data: request, error: reqErr } = await (supabase as any)
      .from("preservation_requests")
      .select("*")
      .eq("id", data.requestId)
      .single();
    if (reqErr || !request) {
      throw new Error(reqErr?.message || "Preservation request not found");
    }

    const { email } = await getUserEmailAndName(request.user_id);
    const html = buildPreservationStageUpdateEmail(
      request.request_number,
      request.preservation_type,
      data.stage,
      data.note || "Work is progressing on your custom keepsake.",
    );

    const success = await sendEmailDirectly(
      email,
      `Keepsake Preservation Progress: ${request.request_number}`,
      html,
    );
    return { success };
  } catch (e) {
    console.error("[sendPreservationStageUpdateEmail error]", e);
    return { success: false, error: String(e) };
  }
};

// 11. Vendor New Order Notification Email
export const sendVendorNewOrderEmail = async ({ data }: { data: { orderId: string } }) => {
  z.object({ orderId: z.string() }).parse(data);
  try {
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .single();
    if (orderErr || !order) throw new Error("Order not found");

    const { data: orderItems, error: itemsErr } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", data.orderId);
    if (itemsErr || !orderItems) throw new Error("Order items not found");

    const vendorItemsMap: Record<string, typeof orderItems> = {};
    orderItems.forEach((item) => {
      if (!vendorItemsMap[item.vendor_id]) {
        vendorItemsMap[item.vendor_id] = [];
      }
      vendorItemsMap[item.vendor_id].push(item);
    });

    for (const [vendorId, items] of Object.entries(vendorItemsMap)) {
      const { data: vendor, error: vendorErr } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", vendorId)
        .single();
      if (vendorErr || !vendor) continue;

      const { email } = await getUserEmailAndName(vendor.user_id);
      const vendorSubtotal = items.reduce((acc, item) => acc + item.subtotal_cents, 0);
      const emailHtml = buildVendorNewOrderEmail(
        order.order_number,
        vendor.store_name,
        items.map(i => ({ title: i.title, quantity: i.quantity, priceCents: i.unit_price_cents })),
        vendorSubtotal,
        order.shipping_address as any
      );

      await sendEmailDirectly(
        email,
        `🔔 New Order #${order.order_number} Received!`,
        emailHtml
      );
    }

    return { success: true };
  } catch (e) {
    console.error("[sendVendorNewOrderEmail error]", e);
    return { success: false, error: String(e) };
  }
};

// 12. Vendor Order Cancelled Email
export const sendVendorOrderCancelledEmail = async ({ data }: { data: { orderId: string; reason?: string } }) => {
  z.object({ orderId: z.string(), reason: z.string().optional() }).parse(data);
  try {
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .single();
    if (orderErr || !order) throw new Error("Order not found");

    const { data: orderItems, error: itemsErr } = await supabase
      .from("order_items")
      .select("vendor_id")
      .eq("order_id", data.orderId);
    if (itemsErr || !orderItems) throw new Error("Order items not found");

    const uniqueVendorIds = Array.from(new Set(orderItems.map((oi) => oi.vendor_id)));

    for (const vendorId of uniqueVendorIds) {
      const { data: vendor, error: vendorErr } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", vendorId)
        .single();
      if (vendorErr || !vendor) continue;

      const { email } = await getUserEmailAndName(vendor.user_id);
      const emailHtml = buildVendorOrderCancelledEmail(
        order.order_number,
        vendor.store_name,
        data.reason
      );

      await sendEmailDirectly(
        email,
        `❌ Order Cancelled: #${order.order_number}`,
        emailHtml
      );
    }

    return { success: true };
  } catch (e) {
    console.error("[sendVendorOrderCancelledEmail error]", e);
    return { success: false, error: String(e) };
  }
};

// 13. Vendor Payment Received Email
export const sendVendorPaymentReceivedEmail = async ({ data }: { data: { orderId: string } }) => {
  z.object({ orderId: z.string() }).parse(data);
  try {
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .single();
    if (orderErr || !order) throw new Error("Order not found");

    const { data: orderItems, error: itemsErr } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", data.orderId);
    if (itemsErr || !orderItems) throw new Error("Order items not found");

    const vendorItemsMap: Record<string, typeof orderItems> = {};
    orderItems.forEach((item) => {
      if (!vendorItemsMap[item.vendor_id]) {
        vendorItemsMap[item.vendor_id] = [];
      }
      vendorItemsMap[item.vendor_id].push(item);
    });

    for (const [vendorId, items] of Object.entries(vendorItemsMap)) {
      const { data: vendor, error: vendorErr } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", vendorId)
        .single();
      if (vendorErr || !vendor) continue;

      const { email } = await getUserEmailAndName(vendor.user_id);
      const vendorSubtotal = items.reduce((acc, item) => acc + item.subtotal_cents, 0);
      const emailHtml = buildVendorPaymentReceivedEmail(
        order.order_number,
        vendor.store_name,
        vendorSubtotal
      );

      await sendEmailDirectly(
        email,
        `💰 Payment Received for Order #${order.order_number}`,
        emailHtml
      );
    }

    return { success: true };
  } catch (e) {
    console.error("[sendVendorPaymentReceivedEmail error]", e);
    return { success: false, error: String(e) };
  }
};

// 14. Customer Payment Failed Email
export const sendCustomerPaymentFailedEmail = async ({ data }: { data: { orderId: string; reason?: string } }) => {
  z.object({ orderId: z.string(), reason: z.string().optional() }).parse(data);
  try {
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .single();
    if (orderErr || !order) throw new Error("Order not found");

    const { email } = await getUserEmailAndName(order.user_id);
    const emailHtml = buildCustomerPaymentFailedEmail(order.order_number, data.reason);
    const success = await sendEmailDirectly(
      email,
      `⚠️ Payment Failed for Order #${order.order_number}`,
      emailHtml
    );

    return { success };
  } catch (e) {
    console.error("[sendCustomerPaymentFailedEmail error]", e);
    return { success: false, error: String(e) };
  }
};

// 15. Customer Refund Notification Email
export const sendCustomerRefundEmail = async ({ data }: { data: { orderId: string; amountCents: number } }) => {
  z.object({ orderId: z.string(), amountCents: z.number() }).parse(data);
  try {
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .single();
    if (orderErr || !order) throw new Error("Order not found");

    const { email } = await getUserEmailAndName(order.user_id);
    const emailHtml = buildCustomerRefundEmail(order.order_number, data.amountCents);
    const success = await sendEmailDirectly(
      email,
      `💰 Refund Processed for Order #${order.order_number}`,
      emailHtml
    );

    return { success };
  } catch (e) {
    console.error("[sendCustomerRefundEmail error]", e);
    return { success: false, error: String(e) };
  }
};

// 16. Admin New Vendor Registration Notification
export const sendAdminNewVendorEmail = async ({ data }: { data: { vendorId: string } }) => {
  z.object({ vendorId: z.string() }).parse(data);
  try {
    const { data: vendor, error: vendorErr } = await supabase
      .from("vendors")
      .select("*")
      .eq("id", data.vendorId)
      .single();
    if (vendorErr || !vendor) throw new Error("Vendor not found");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", vendor.user_id)
      .single();
    const ownerName = profile?.full_name || "Artisan";

    const { email: vendorEmail } = await getUserEmailAndName(vendor.user_id);
    const emailHtml = buildAdminNewVendorEmail(vendor.store_name, vendorEmail, ownerName);

    const { data: adminRoles, error: adminErr } = await (supabase as any)
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (!adminErr && adminRoles) {
      for (const role of adminRoles) {
        const { email: adminEmail } = await getUserEmailAndName(role.user_id);
        if (adminEmail) {
          await sendEmailDirectly(
            adminEmail,
            `👤 New Vendor Application: "${vendor.store_name}"`,
            emailHtml
          );
        }
      }
    }

    return { success: true };
  } catch (e) {
    console.error("[sendAdminNewVendorEmail error]", e);
    return { success: false, error: String(e) };
  }
};

// 17. Admin High Value Order Alert Email
export const sendAdminHighValueOrderEmail = async ({ data }: { data: { orderId: string } }) => {
  z.object({ orderId: z.string() }).parse(data);
  try {
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .single();
    if (orderErr || !order) throw new Error("Order not found");

    const emailHtml = buildAdminHighValueOrderEmail(order.order_number, order.total_cents);

    const { data: adminRoles, error: adminErr } = await (supabase as any)
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (!adminErr && adminRoles) {
      for (const role of adminRoles) {
        const { email: adminEmail } = await getUserEmailAndName(role.user_id);
        if (adminEmail) {
          await sendEmailDirectly(
            adminEmail,
            `⚠️ High-Value Order Alert: #${order.order_number}`,
            emailHtml
          );
        }
      }
    }

    return { success: true };
  } catch (e) {
    console.error("[sendAdminHighValueOrderEmail error]", e);
    return { success: false, error: String(e) };
  }
};

// 18. Admin support ticket complaint email
export const sendAdminComplaintEmail = async ({ data }: { data: { complaintId: string; email: string; subject: string; message: string } }) => {
  z.object({ complaintId: z.string(), email: z.string(), subject: z.string(), message: z.string() }).parse(data);
  try {
    const emailHtml = buildAdminComplaintEmail(data.complaintId, data.email, data.subject, data.message);

    const { data: adminRoles, error: adminErr } = await (supabase as any)
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (!adminErr && adminRoles) {
      for (const role of adminRoles) {
        const { email: adminEmail } = await getUserEmailAndName(role.user_id);
        if (adminEmail) {
          await sendEmailDirectly(
            adminEmail,
            `🚨 Support Ticket #${data.complaintId}: ${data.subject}`,
            emailHtml
          );
        }
      }
    }

    return { success: true };
  } catch (e) {
    console.error("[sendAdminComplaintEmail error]", e);
    return { success: false, error: String(e) };
  }
};

// 19. Customer Shipment Dispatched Notification Email
export const sendShipmentDispatchedEmail = async ({ data }: { data: { orderId: string; orderNumber: string; trackingNumber: string; courier: string; trackingUrl: string } }) => {
  z.object({ orderId: z.string(), orderNumber: z.string(), trackingNumber: z.string(), courier: z.string(), trackingUrl: z.string() }).parse(data);
  try {
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("user_id")
      .eq("id", data.orderId)
      .single();
    if (orderErr || !order) throw new Error("Order not found");

    const { email } = await getUserEmailAndName(order.user_id);
    const html = buildShipmentDispatchedEmail(data.orderNumber, data.trackingNumber, data.courier, data.trackingUrl);
    const success = await sendEmailDirectly(email, `Your order #${data.orderNumber} has been dispatched! 🚚`, html);
    return { success };
  } catch (e) {
    console.error("[sendShipmentDispatchedEmail error]", e);
    return { success: false, error: String(e) };
  }
};

// 20. Customer Shipment Out for Delivery Notification
export const sendShipmentOutForDeliveryEmail = async ({ data }: { data: { orderId: string; orderNumber: string; courier: string } }) => {
  z.object({ orderId: z.string(), orderNumber: z.string(), courier: z.string() }).parse(data);
  try {
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("user_id")
      .eq("id", data.orderId)
      .single();
    if (orderErr || !order) throw new Error("Order not found");

    const { email } = await getUserEmailAndName(order.user_id);
    const html = buildShipmentOutForDeliveryEmail(data.orderNumber, data.courier);
    const success = await sendEmailDirectly(email, `Package out for delivery today: #${data.orderNumber} 📦`, html);
    return { success };
  } catch (e) {
    console.error("[sendShipmentOutForDeliveryEmail error]", e);
    return { success: false, error: String(e) };
  }
};

// 21. Customer Shipment Delivered Notification
export const sendShipmentDeliveredEmail = async ({ data }: { data: { orderId: string; orderNumber: string } }) => {
  z.object({ orderId: z.string(), orderNumber: z.string() }).parse(data);
  try {
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("user_id")
      .eq("id", data.orderId)
      .single();
    if (orderErr || !order) throw new Error("Order not found");

    const { email } = await getUserEmailAndName(order.user_id);
    const html = buildShipmentDeliveredEmail(data.orderNumber);
    const success = await sendEmailDirectly(email, `Package delivered successfully: #${data.orderNumber} 🎉`, html);
    return { success };
  } catch (e) {
    console.error("[sendShipmentDeliveredEmail error]", e);
    return { success: false, error: String(e) };
  }
};

// 22. Customer Shipment Delay Alert Email
export const sendShipmentDelayEmail = async ({ data }: { data: { orderId: string; orderNumber: string; reason: string } }) => {
  z.object({ orderId: z.string(), orderNumber: z.string(), reason: z.string() }).parse(data);
  try {
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("user_id")
      .eq("id", data.orderId)
      .single();
    if (orderErr || !order) throw new Error("Order not found");

    const { email } = await getUserEmailAndName(order.user_id);
    const html = buildShipmentDelayEmail(data.orderNumber, data.reason);
    const success = await sendEmailDirectly(email, `Update on your shipment delay: #${data.orderNumber} ⚠️`, html);
    return { success };
  } catch (e) {
    console.error("[sendShipmentDelayEmail error]", e);
    return { success: false, error: String(e) };
  }
};
