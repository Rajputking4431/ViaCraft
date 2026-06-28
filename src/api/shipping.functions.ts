import { z } from "zod";
import { shippingDb } from "./shipping-db";
import { supabase } from "@/integrations/supabase/client";
import {
  sendShipmentDispatchedEmail,
  sendShipmentOutForDeliveryEmail,
  sendShipmentDeliveredEmail,
  sendShipmentDelayEmail,
} from "./email.functions";

// Helper: Simulate Shiprocket API Auth
async function getShiprocketToken(): Promise<string | null> {
  const email = import.meta.env.VITE_SHIPROCKET_EMAIL || process.env.SHIPROCKET_EMAIL;
  const password = import.meta.env.VITE_SHIPROCKET_PASSWORD || process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    return null; // Mock mode
  }

  try {
    const res = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Shiprocket Auth Failed");
    const json = await res.json();
    return json.token || null;
  } catch (e) {
    console.warn("Failed to authenticate with Shiprocket API, using Mock:", e);
    return null;
  }
}

// 1. CREATE SHIPMENT
export const createShipment = async ({ data: input }: { data: {
  orderId: string;
  vendorId: string;
  shippingMethod: "shiprocket" | "manual";
  courierName?: string;
  trackingNumber?: string;
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  notes?: string;
} }) => {
  z.object({
    orderId: z.string(),
    vendorId: z.string(),
    shippingMethod: z.enum(["shiprocket", "manual"]),
    courierName: z.string().optional(),
    trackingNumber: z.string().optional(),
    length: z.number().default(10),
    width: z.number().default(10),
    height: z.number().default(10),
    weight: z.number().default(0.5),
    notes: z.string().optional(),
  }).parse(input);

  try {
    console.log("[createShipment] Input data received:", input);

    // Fetch Order details from DB or Mock
    let orderDetails: any = null;
    try {
      const { data: dbOrder } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", input.orderId)
        .single();
      orderDetails = dbOrder;
    } catch (e) {
      console.warn("DB Order fetch failed, reconstructing fallback details");
    }

    if (!orderDetails) {
      orderDetails = {
        order_number: `RV-ORD-${input.orderId.slice(0, 8).toUpperCase()}`,
        shipping_address: {
          name: "Valued Customer",
          street: "456 Heirlooms Boulevard",
          city: "Mumbai",
          state: "Maharashtra",
          postal_code: "400001",
          phone: "9876543210",
          country: "India",
        },
      };
    }

    const address = orderDetails.shipping_address || {};
    const addrName = address.name || address.fullName || "Customer";
    const addrStreet = address.street || "Main Street";
    const addrCity = address.city || "Mumbai";
    const addrState = address.state || "Maharashtra";
    const addrZip = address.zip || address.postal_code || address.zipCode || "400001";
    const addrPhone = address.phone || address.contact || "9876543210";

    let awbCode = "";
    let trackingNumber = input.trackingNumber || "";
    let trackingUrl = "";
    let shiprocketShipmentId = "";
    let shiprocketOrderId = "";
    let courierName = input.courierName || "Local Courier";
    let shippingLabelUrl = "";

    if (input.shippingMethod === "shiprocket") {
      const token = await getShiprocketToken();
      if (token) {
        try {
          console.log("Calling Shiprocket Real API...");
          const orderPayload = {
            order_id: input.orderId.slice(0, 20),
            order_date: new Date().toISOString().split("T")[0],
            pickup_location: "Primary",
            billing_customer_name: addrName.split(" ")[0] || "Buyer",
            billing_last_name: addrName.split(" ")[1] || "Lastname",
            billing_address: addrStreet,
            billing_city: addrCity,
            billing_pincode: addrZip,
            billing_state: addrState,
            billing_country: "India",
            billing_phone: addrPhone,
            shipping_is_billing: true,
            order_items: [
              {
                name: "Resin Keepsake Product",
                sku: "RESIN-MOCK-1",
                units: 1,
                selling_price: 1500,
              },
            ],
            payment_method: "Prepaid",
            sub_total: 1500,
            length: input.length || 10,
            width: input.width || 10,
            height: input.height || 10,
            weight: input.weight || 0.5,
          };

          const orderRes = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(orderPayload),
          });
          const orderJson = await orderRes.json();
          console.log("Shiprocket order creation response:", orderJson);

          if (orderJson.shipment_id) {
            shiprocketShipmentId = String(orderJson.shipment_id);
            shiprocketOrderId = String(orderJson.order_id);

            const awbRes = await fetch("https://apiv2.shiprocket.in/v1/external/courier/assign/awb", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ shipment_id: shiprocketShipmentId }),
            });
            const awbJson = await awbRes.json();
            console.log("Shiprocket AWB response:", awbJson);

            if (awbJson.response && awbJson.response.data) {
              const awbData = awbJson.response.data;
              awbCode = awbData.awb_code;
              trackingNumber = awbData.awb_code;
              courierName = awbData.courier_name || "Shiprocket Courier";
              trackingUrl = `https://shiprocket.co/tracking/${trackingNumber}`;
            }
          }
        } catch (e) {
          console.error("Real Shiprocket API invocation failed, falling back to mock details:", e);
        }
      }

      if (!awbCode) {
        console.log("Creating Mock Shiprocket Shipment...");
        const randSfx = Math.floor(10000000 + Math.random() * 90000000);
        awbCode = `SR-${randSfx}`;
        trackingNumber = awbCode;
        shiprocketShipmentId = `sr-ship-${Math.floor(100000 + Math.random() * 900000)}`;
        shiprocketOrderId = `sr-ord-${Math.floor(100000 + Math.random() * 900000)}`;
        courierName = "Shadowfax (via Shiprocket)";
        trackingUrl = `https://track.shiprocket.in/tracking/${trackingNumber}`;
        shippingLabelUrl = `/shipping-label-preview.html?awb=${awbCode}&order=${orderDetails.order_number}`;
      }
    } else {
      awbCode = trackingNumber;
      trackingUrl = trackingNumber
        ? `https://www.google.com/search?q=track+${encodeURIComponent(courierName)}+${encodeURIComponent(trackingNumber)}`
        : "";
    }

    const newShipment = await shippingDb.shipments.create({
      order_id: input.orderId,
      vendor_id: input.vendorId,
      shipping_method: input.shippingMethod,
      status: "shipment_created",
      courier_name: courierName,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      awb_code: awbCode || undefined,
      shiprocket_shipment_id: shiprocketShipmentId || undefined,
      shiprocket_order_id: shiprocketOrderId || undefined,
      shipping_label_url: shippingLabelUrl || undefined,
      notes: input.notes,
    });

    console.log("[createShipment] Saved shipment:", newShipment);
    return { success: true, shipment: newShipment };
  } catch (err) {
    console.error("[createShipment] Server function error:", err);
    return { success: false, error: String(err) };
  }
};

// 2. SCHEDULE PICKUP
export const schedulePickup = async ({ data: input }: { data: { shipmentId: string; pickupDate: string } }) => {
  z.object({
    shipmentId: z.string(),
    pickupDate: z.string(),
  }).parse(input);

  try {
    const shipment = await shippingDb.shipments.get(input.shipmentId);
    if (!shipment) throw new Error("Shipment not found");

    let pickupStatus = "scheduled";
    let shiprocketStatus = "pickup_scheduled";

    if (shipment.shipping_method === "shiprocket" && shipment.shiprocket_shipment_id) {
      const token = await getShiprocketToken();
      if (token) {
        try {
          const res = await fetch("https://apiv2.shiprocket.in/v1/external/courier/generate/pickup", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              shipment_id: [shipment.shiprocket_shipment_id],
              pickup_date: [input.pickupDate],
            }),
          });
          const json = await res.json();
          console.log("Shiprocket Pickup schedule response:", json);
          if (json.pickup_status === "scheduled") {
            pickupStatus = "scheduled";
          }
        } catch (e) {
          console.warn("Real Shiprocket pickup call failed:", e);
        }
      }
    }

    await shippingDb.pickups.create({
      shipment_id: input.shipmentId,
      pickup_date: input.pickupDate,
      pickup_time_slot: "10:00 AM - 1:00 PM",
      status: pickupStatus,
      shiprocket_pickup_status: shiprocketStatus,
    });

    const updatedShipment = await shippingDb.shipments.update(input.shipmentId, {
      status: "pickup_scheduled",
    });

    return { success: true, shipment: updatedShipment };
  } catch (err) {
    console.error("[schedulePickup] Server function error:", err);
    return { success: false, error: String(err) };
  }
};

// 3. CANCEL SHIPMENT
export const cancelShipment = async ({ data: input }: { data: { shipmentId: string; reason?: string } }) => {
  z.object({
    shipmentId: z.string(),
    reason: z.string().optional(),
  }).parse(input);

  try {
    const shipment = await shippingDb.shipments.get(input.shipmentId);
    if (!shipment) throw new Error("Shipment not found");

    if (shipment.shipping_method === "shiprocket" && shipment.shiprocket_order_id) {
      const token = await getShiprocketToken();
      if (token) {
        try {
          const res = await fetch("https://apiv2.shiprocket.in/v1/external/orders/cancel", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ ids: [shipment.shiprocket_order_id] }),
          });
          const json = await res.json();
          console.log("Shiprocket Order cancel response:", json);
        } catch (e) {
          console.warn("Real Shiprocket cancel call failed:", e);
        }
      }
    }

    const updatedShipment = await shippingDb.shipments.update(input.shipmentId, {
      status: "cancelled",
    });

    return { success: true, shipment: updatedShipment };
  } catch (err) {
    console.error("[cancelShipment] Server function error:", err);
    return { success: false, error: String(err) };
  }
};

// 4. UPDATE STATUS / ACTION LOG
export const updateShipmentStatus = async ({ data: input }: { data: {
  shipmentId: string;
  status: string;
  courierName?: string;
  trackingNumber?: string;
  notes?: string;
  reason?: string;
  actionByRole: "admin" | "vendor" | "system";
} }) => {
  z.object({
    shipmentId: z.string(),
    status: z.string(),
    courierName: z.string().optional(),
    trackingNumber: z.string().optional(),
    notes: z.string().optional(),
    reason: z.string().optional(),
    actionByRole: z.enum(["admin", "vendor", "system"]),
  }).parse(input);

  try {
    const shipment = await shippingDb.shipments.get(input.shipmentId);
    if (!shipment) throw new Error("Shipment not found");

    let orderNumber = `RV-ORD-${shipment.order_id.slice(0, 8).toUpperCase()}`;
    try {
      const { data: dbOrder } = await supabase
        .from("orders")
        .select("order_number")
        .eq("id", shipment.order_id)
        .single();
      if (dbOrder) orderNumber = dbOrder.order_number;
    } catch (e) {}

    const updates: Partial<typeof shipment> = {
      status: input.status,
    };
    if (input.courierName) updates.courier_name = input.courierName;
    if (input.trackingNumber) {
      updates.tracking_number = input.trackingNumber;
      if (shipment.shipping_method === "manual") {
        updates.tracking_url = `https://www.google.com/search?q=track+${encodeURIComponent(input.courierName || shipment.courier_name || "Courier")}+${encodeURIComponent(input.trackingNumber)}`;
      }
    }
    if (input.status === "picked_up" && !shipment.dispatch_date) {
      updates.dispatch_date = new Date().toISOString();
    }

    const updatedShipment = await shippingDb.shipments.update(input.shipmentId, updates);

    await shippingDb.logs.create({
      shipment_id: input.shipmentId,
      action_by_role: input.actionByRole,
      previous_status: shipment.status,
      new_status: input.status,
      courier_name: input.courierName || shipment.courier_name,
      tracking_number: input.trackingNumber || shipment.tracking_number,
      reason: input.reason,
      notes: input.notes,
    });

    const trackingNum = updates.tracking_number || shipment.tracking_number || "N/A";
    const courier = updates.courier_name || shipment.courier_name || "Logistics Carrier";
    const trackingUrl = updates.tracking_url || shipment.tracking_url || "#";

    if (input.status === "picked_up" || input.status === "in_transit") {
      await sendShipmentDispatchedEmail({
        data: {
          orderId: shipment.order_id,
          orderNumber,
          trackingNumber: trackingNum,
          courier,
          trackingUrl,
        },
      }).catch((e) => console.error("Dispatched email fail:", e));
    } else if (input.status === "out_for_delivery") {
      await sendShipmentOutForDeliveryEmail({
        data: {
          orderId: shipment.order_id,
          orderNumber,
          courier,
        },
      }).catch((e) => console.error("Out for delivery email fail:", e));
    } else if (input.status === "delivered") {
      await sendShipmentDeliveredEmail({
        data: {
          orderId: shipment.order_id,
          orderNumber,
        },
      }).catch((e) => console.error("Delivered email fail:", e));
    } else if (input.status === "pickup_failed" || input.status === "delivery_failed" || input.reason) {
      if (input.reason) {
        await sendShipmentDelayEmail({
          data: {
            orderId: shipment.order_id,
            orderNumber,
            reason: input.reason,
          },
        }).catch((e) => console.error("Delay email fail:", e));
      }
    }

    try {
      const { data: order } = await supabase
        .from("orders")
        .select("user_id")
        .eq("id", shipment.order_id)
        .single();

      if (order) {
        await (supabase as any).from("notifications").insert({
          user_id: order.user_id,
          title: `Shipment Update: ${input.status.replace(/_/g, " ").toUpperCase()}`,
          message: `Your package from ${courier} for order ${orderNumber} is now ${input.status.replace(/_/g, " ")}.`,
          type: "order_status",
          read: false,
        });
      }
    } catch (e) {
      console.warn("In-app notification dispatch fail:", e);
    }

    return { success: true, shipment: updatedShipment };
  } catch (err) {
    console.error("[updateShipmentStatus] Server function error:", err);
    return { success: false, error: String(err) };
  }
};
