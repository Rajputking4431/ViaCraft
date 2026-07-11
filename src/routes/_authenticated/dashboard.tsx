import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/layouts/PageShell";
import { useAuth } from "@/hooks/use-auth";
import { inr, stageLabel, PRESERVATION_STAGES } from "@/utils/format";
import { shippingDb } from "@/api/shipping-db";
import {
  Package,
  Sparkles,
  Heart,
  Store,
  MapPin,
  Star,
  ShieldCheck,
  LifeBuoy,
  User,
  Trash2,
  Plus,
  MessageSquare,
  Lock,
  ChevronRight,
  Truck,
  LogOut,
  RotateCcw,
  FileDown,
  XCircle,
  UploadCloud,
  Video,
  Play,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { initializeRazorpayPayment } from "@/utils/razorpay";
import { uploadToCloudinary } from "@/services/cloudinary";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ViaCraft" }] }),
  component: Dashboard,
});

interface SavedAddress {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: "open" | "resolved" | "pending";
  created_at: string;
}

function Dashboard() {
  const { user, signOut } = useAuth();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    | "orders"
    | "preservation"
    | "wishlist"
    | "addresses"
    | "returns"
    | "reviews"
    | "support"
    | "security"
  >("orders");

  // Addresses State
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [newAddrName, setNewAddrName] = useState("");
  const [newAddrStreet, setNewAddrStreet] = useState("");
  const [newAddrCity, setNewAddrCity] = useState("");
  const [newAddrState, setNewAddrState] = useState("");
  const [newAddrZip, setNewAddrZip] = useState("");

  // Support State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketCat, setNewTicketCat] = useState("Order Status");

  // Cancellation Modal State
  const [cancellingOrder, setCancellingOrder] = useState<any | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isCancellingSubmitting, setIsCancellingSubmitting] = useState(false);

  // Return Request Modal State
  const [returningOrder, setReturningOrder] = useState<any | null>(null);
  const [returnReason, setReturnReason] = useState("Wrong Product");
  const [returnNotes, setReturnNotes] = useState("");
  const [isReturnSubmitting, setIsReturnSubmitting] = useState(false);

  // New return form state variables
  const [selectedReturnItems, setSelectedReturnItems] = useState<
    Record<
      string,
      {
        selected: boolean;
        quantity: number;
        reason: string;
        description: string;
        eligible: boolean;
        reasonIneligible: string;
      }
    >
  >({});
  const [pickupAddressText, setPickupAddressText] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [preferredResolution, setPreferredResolution] = useState<
    "refund" | "replacement" | "exchange"
  >("refund");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Return detail modal and comments states
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState("");

  // Setup returns form prefill values when returningOrder changes
  useEffect(() => {
    if (returningOrder) {
      // Prefill pickup address
      let defaultAddress = "";
      if (returningOrder.shipping_address) {
        const sa = returningOrder.shipping_address as any;
        defaultAddress = `${sa.street || sa.addressLine1 || sa.address || ""}, ${sa.city || ""}, ${sa.state || ""} - ${sa.postal_code || sa.zip || sa.postalCode || ""}`;
      }
      setPickupAddressText(defaultAddress);

      // Prefill phone
      const saPhone = (returningOrder.shipping_address as any)?.phone || user?.phone || "";
      setContactPhone(saPhone);

      // Initialize selected return items
      const initialItems: any = {};
      returningOrder.order_items?.forEach((item: any) => {
        const productObj = item.product;
        const isCustomizable = productObj?.is_customizable === true;
        const isPreservation =
          productObj?.category?.slug === "preservation" ||
          item.title?.toLowerCase().includes("preservation");
        const isDigital =
          productObj?.title?.toLowerCase().includes("digital") ||
          productObj?.title?.toLowerCase().includes("pdf") ||
          item.title?.toLowerCase().includes("digital") ||
          item.title?.toLowerCase().includes("pdf");

        const eligible = !isCustomizable && !isPreservation && !isDigital;

        initialItems[item.id] = {
          selected: eligible,
          quantity: item.quantity || 1,
          reason: "Wrong Product",
          description: "",
          eligible,
          reasonIneligible: isPreservation
            ? "Resin Preservation items are non-returnable"
            : isCustomizable
              ? "Customized/Personalized items are non-returnable"
              : isDigital
                ? "Digital products are non-returnable"
                : "",
        };
      });
      setSelectedReturnItems(initialItems);
      setUploadedImages([]);
      setUploadedVideo(null);
      setPreferredResolution("refund");
      setReturnNotes("");
    }
  }, [returningOrder, user]);

  // Load states from localStorage using user-specific keys
  useEffect(() => {
    if (!user) return;

    // Load Addresses
    const addressKey = `user_addresses_${user.id}`;
    const savedAddr = localStorage.getItem(addressKey);
    if (savedAddr) {
      try {
        setAddresses(JSON.parse(savedAddr));
      } catch (e) {
        console.error("Failed to parse addresses", e);
      }
    } else {
      setAddresses([]); // Ensure it's empty for new users
    }

    // Load Tickets
    const ticketKey = `user_tickets_${user.id}`;
    const savedTickets = localStorage.getItem(ticketKey);
    if (savedTickets) {
      try {
        setTickets(JSON.parse(savedTickets));
      } catch (e) {
        console.error("Failed to parse tickets", e);
      }
    } else {
      // Setup some default mock tickets for UI preview, tied to the user
      const defaults = [
        {
          id: "TK-9081",
          subject: "Questions regarding flower packaging instructions",
          category: "Preservation",
          status: "resolved",
          created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
        {
          id: "TK-9402",
          subject: "Refund query for delayed slot bids",
          category: "Bids & Quotes",
          status: "open",
          created_at: new Date().toISOString(),
        },
      ] as any;
      setTickets(defaults);
      localStorage.setItem(ticketKey, JSON.stringify(defaults));
    }
  }, [user]);

  // Fetch customer shipments
  const { data: userShipments = [] } = useQuery({
    queryKey: ["customer-shipments", user?.id],
    enabled: !!user,
    queryFn: () => shippingDb.shipments.listByCustomer(user!.id),
  });

  // Live Database Queries
  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      let dbOrders: any[] = [];
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*, order_items(*, product:products(*, category:categories(*)))")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false });
        if (!error && data) {
          dbOrders = data;
        }
      } catch (err) {
        console.warn("Database fetch of customer orders failed, using fallback:", err);
      }

      // Merge with fallback orders from local storage
      const stored = localStorage.getItem("fallback_orders");
      const fallbackOrders = stored ? JSON.parse(stored) : [];
      const localStatuses = JSON.parse(localStorage.getItem("fallback_order_statuses") || "{}");

      let combined = [...dbOrders];

      // Append fallback orders if they belong to user and are not in dbOrders
      fallbackOrders.forEach((fo: any) => {
        if (fo.user_id === user!.id && !combined.some((o: any) => o.id === fo.id)) {
          combined.push(fo);
        }
      });

      // Map local status overrides (e.g. dispatched, out for delivery)
      combined = combined.map((o: any) => {
        const localStatus = localStatuses[o.id];
        if (localStatus) {
          return { ...o, status: localStatus };
        }
        return o;
      });

      // Sort by created_at descending
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return combined;
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["my-pres", user?.id],
    enabled: !!user,
    queryFn: async () => {
      let dbReqs: any[] = [];
      try {
        const { data, error } = await supabase
          .from("preservation_requests")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false });
        if (!error && data) {
          dbReqs = data;
        }
      } catch (err) {
        console.warn("Database fetch of preservation requests failed, using fallback:", err);
      }

      // Merge with fallback platform requests from local storage
      const stored = localStorage.getItem("fallback_platform_requests");
      const fallbackReqs = stored ? JSON.parse(stored) : [];

      let combined = [...dbReqs];

      // Append fallback requests if they belong to user and are not in dbReqs
      fallbackReqs.forEach((fb: any) => {
        if (fb.user_id === user!.id && !combined.some((r: any) => r.id === fb.id)) {
          combined.push(fb);
        }
      });

      // Update current stage from fallback if present (since vendor updates fallback_platform_requests locally)
      combined = combined.map((r: any) => {
        const matched = fallbackReqs.find((fb: any) => fb.id === r.id);
        if (matched) {
          return { ...r, current_stage: matched.current_stage || r.current_stage };
        }
        return r;
      });

      // Sort by created_at descending
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return combined;
    },
  });

  const { data: wishlist = [], refetch: refetchWishlist } = useQuery({
    queryKey: ["my-wish", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("wishlists").select("id, product:products(*)").eq("user_id", user!.id))
        .data ?? [],
  });

  const { data: vendor } = useQuery({
    queryKey: ["my-vendor", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("vendors").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });

  const removeWishlist = useMutation({
    mutationFn: async (wishlistId: string) => {
      const { error } = await supabase.from("wishlists").delete().eq("id", wishlistId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchWishlist();
      qc.invalidateQueries({ queryKey: ["wishlist-count"] });
      toast.success("Removed item from wishlist");
    },
  });

  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  const handlePayRemainingBalance = async (order: any) => {
    if (!user) return;
    setPayingOrderId(order.id);

    try {
      await initializeRazorpayPayment({
        amountCents: order.remaining_balance_cents,
        orderId: order.id,
        preservationRequestId: order.preservation_request_id,
        paymentType: "final",
        customerId: user.id,
        customerName: user.user_metadata?.full_name || "Valued Customer",
        customerEmail: user.email || "",
        onSuccess: (payment) => {
          setPayingOrderId(null);
          toast.success("Final payment verified successfully! Order is paid in full.");
          qc.invalidateQueries({ queryKey: ["my-orders", user?.id] });
        },
        onFailure: (errMsg) => {
          setPayingOrderId(null);
          toast.error(`Final payment failed: ${errMsg}`);
        },
      });
    } catch (err: any) {
      setPayingOrderId(null);
      toast.error(err.message || "Failed to initiate final payment.");
    }
  };

  const handleCancelOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingOrder || !user) return;

    setIsCancellingSubmitting(true);
    try {
      // 1. Update order status in Supabase
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", cancellingOrder.id);

      if (updateError) throw updateError;

      // 2. Restore product inventory
      if (cancellingOrder.order_items && cancellingOrder.order_items.length > 0) {
        for (const item of cancellingOrder.order_items) {
          const { data: productData, error: productError } = await supabase
            .from("products")
            .select("stock")
            .eq("id", item.product_id)
            .single();

          if (!productError && productData) {
            const newStock = (productData.stock || 0) + (item.quantity || 0);
            await supabase.from("products").update({ stock: newStock }).eq("id", item.product_id);
          }
        }
      }

      // 3. Notify Admin
      try {
        const { data: admins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        if (admins && admins.length > 0) {
          const adminNotifs = admins.map((adm) => ({
            receiver_id: adm.user_id,
            receiver_role: "admin",
            title: "Order Cancelled by Customer",
            message: `Order #${cancellingOrder.order_number} has been cancelled by the customer. Reason: ${cancellationReason || "No reason provided"}`,
            notification_type: "order_cancelled",
            order_id: cancellingOrder.id,
          }));
          await (supabase as any).from("notifications").insert(adminNotifs);
        }
      } catch (notifErr) {
        console.warn("Failed to notify admins about order cancellation:", notifErr);
      }

      // 4. Log cancellation details locally
      localStorage.setItem(
        `order_cancel_log_${cancellingOrder.id}`,
        JSON.stringify({
          date: new Date().toISOString(),
          reason: cancellationReason || "No reason provided",
        }),
      );

      qc.invalidateQueries({ queryKey: ["my-orders", user.id] });
      toast.success(`Order #${cancellingOrder.order_number} cancelled successfully.`);
      setCancellingOrder(null);
      setCancellationReason("");
    } catch (err: any) {
      console.error("Failed to cancel order:", err);
      toast.error(err.message || "Failed to cancel order. Please try again.");
    } finally {
      setIsCancellingSubmitting(false);
    }
  };

  const handleDownloadReturnReceipt = (ret: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up blocker prevented opening receipt.");
      return;
    }

    const itemsHtml = ret.return_items
      ?.map(
        (item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.order_item?.title || "Item"}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.reason}</td>
      </tr>
    `,
      )
      .join("");

    const timelineHtml = ret.return_timeline
      ?.map(
        (step: any) => `
      <div style="margin-bottom: 10px; padding-left: 15px; border-left: 2px solid #d97706;">
        <div style="font-weight: bold; font-size: 11px;">${step.action} (${step.actor_role.toUpperCase()})</div>
        <div style="color: #666; font-size: 10px;">${new Date(step.created_at).toLocaleString()}</div>
        ${step.comments ? `<div style="font-style: italic; font-size: 10px; margin-top: 2px;">"${step.comments}"</div>` : ""}
      </div>
    `,
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Return Receipt - ${ret.return_number}</title>
          <style>
            body { font-family: sans-serif; color: #333; margin: 40px; line-height: 1.5; }
            .receipt-header { border-bottom: 2px solid #3d2712; padding-bottom: 20px; margin-bottom: 20px; }
            .receipt-title { font-size: 24px; font-weight: bold; color: #3d2712; }
            .info-table { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
            .info-table td { padding: 5px 0; font-size: 12px; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .items-table th { background: #fcfbf9; text-align: left; padding: 10px; border-bottom: 2px solid #ddd; font-size: 12px; }
            .footer { border-top: 1px dashed #ccc; padding-top: 20px; margin-top: 40px; font-size: 10px; color: #777; text-align: center; }
          </style>
        </head>
        <body>
          <div class="receipt-header">
            <div class="receipt-title">ViaCraft Return Receipt</div>
            <div style="font-size: 12px; margin-top: 5px; color: #666;">Official Proof of Return Request</div>
          </div>
          
          <table class="info-table">
            <tr>
              <td><strong>Return Request ID:</strong> ${ret.return_number}</td>
              <td><strong>Order Number:</strong> #${ret.order?.order_number || "N/A"}</td>
            </tr>
            <tr>
              <td><strong>Date Requested:</strong> ${new Date(ret.created_at).toLocaleDateString()}</td>
              <td><strong>Preferred Resolution:</strong> ${ret.preferred_resolution.toUpperCase()}</td>
            </tr>
            <tr>
              <td><strong>Customer Name:</strong> ${user?.user_metadata?.full_name || user?.email || "Artisan Customer"}</td>
              <td><strong>Contact Phone:</strong> ${ret.phone}</td>
            </tr>
            <tr valign="top">
              <td colspan="2"><strong>Pickup Address:</strong> ${ret.pickup_address?.address || "N/A"}</td>
            </tr>
          </table>

          <h3>Returned Items</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>Product Description</th>
                <th style="text-align: center; width: 80px;">Quantity</th>
                <th>Return Reason</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="margin-top: 30px;">
            <h3>Return Tracking Timeline</h3>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${timelineHtml}
            </div>
          </div>

          <div class="footer">
            <p>This is an automated receipt generated by ViaCraft Return Management System. Please keep this copy for your verification.</p>
            <p>&copy; ${new Date().getFullYear()} ViaCraft. All rights reserved.</p>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleReturnRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningOrder || !user) return;

    // Filter items selected for return
    const itemsToReturn = Object.entries(selectedReturnItems)
      .filter(([_, data]) => data.selected && data.eligible)
      .map(([id, data]) => ({
        order_item_id: id,
        quantity: data.quantity,
        reason: data.reason,
        description: data.description || returnNotes,
      }));

    if (itemsToReturn.length === 0) {
      toast.error("Please select at least one eligible item to return.");
      return;
    }

    if (!pickupAddressText.trim()) {
      toast.error("Pickup address is required.");
      return;
    }

    if (!contactPhone.trim()) {
      toast.error("Contact phone number is required.");
      return;
    }

    setIsReturnSubmitting(true);
    try {
      // 1. Get vendor_id from the first item
      const sampleItem = returningOrder.order_items?.find(
        (it: any) => it.id === itemsToReturn[0].order_item_id,
      );
      const vendorId =
        sampleItem?.vendor_id ||
        returningOrder.vendor_id ||
        returningOrder.order_items?.[0]?.vendor_id;

      if (!vendorId) {
        throw new Error("Unable to identify vendor for this order.");
      }

      // 2. Generate a return request ID RET-YYYY-XXXXXX
      const year = new Date().getFullYear();
      const randStr = Math.floor(100000 + Math.random() * 900000).toString();
      const returnNumber = `RET-${year}-${randStr}`;

      // 3. Insert Return Request in public.returns
      const { data: returnData, error: returnError } = await supabase
        .from("returns")
        .insert({
          return_number: returnNumber,
          order_id: returningOrder.id,
          user_id: user.id,
          vendor_id: vendorId,
          status: "pending",
          preferred_resolution: preferredResolution,
          pickup_address: { address: pickupAddressText },
          phone: contactPhone,
          video_url: uploadedVideo,
          priority: "medium",
        })
        .select()
        .single();

      if (returnError || !returnData) throw returnError;

      // 4. Insert Return Items
      const returnItemsData = itemsToReturn.map((item) => ({
        return_id: returnData.id,
        order_item_id: item.order_item_id,
        quantity: item.quantity,
        reason: item.reason,
        description: item.description,
      }));

      const { error: itemsError } = await supabase.from("return_items").insert(returnItemsData);

      if (itemsError) throw itemsError;

      // 5. Insert Return Images
      if (uploadedImages.length > 0) {
        const returnImagesData = uploadedImages.map((url) => ({
          return_id: returnData.id,
          url: url,
        }));
        const { error: imagesError } = await supabase
          .from("return_images")
          .insert(returnImagesData);
        if (imagesError) throw imagesError;
      }

      // 6. Create Initial Return Timeline
      await supabase.from("return_timeline").insert({
        return_id: returnData.id,
        status: "pending",
        actor_id: user.id,
        actor_role: "customer",
        action: "Return Requested",
        comments: returnNotes || "Customer submitted a return request.",
      });

      // 7. Add Comment
      if (returnNotes.trim()) {
        await supabase.from("return_comments").insert({
          return_id: returnData.id,
          author_id: user.id,
          author_role: "customer",
          comment: returnNotes,
          is_internal: false,
        });
      }

      // 8. Notify Vendor In-App
      try {
        const { data: vendorProfile } = await supabase
          .from("vendors")
          .select("user_id")
          .eq("id", vendorId)
          .single();

        if (vendorProfile) {
          await (supabase as any).from("notifications").insert({
            receiver_id: vendorProfile.user_id,
            receiver_role: "vendor",
            title: "New Return Request Received",
            message: `A new return request ${returnNumber} has been submitted for Order #${returningOrder.order_number}.`,
            notification_type: "return_requested",
            order_id: returningOrder.id,
          });
        }
      } catch (notifErr) {
        console.warn("Failed to notify vendor about return request:", notifErr);
      }

      // 9. Notify Admin In-App
      try {
        const { data: admins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        if (admins && admins.length > 0) {
          const adminNotifs = admins.map((adm) => ({
            receiver_id: adm.user_id,
            receiver_role: "admin",
            title: "New Return Request Submitted",
            message: `A return request ${returnNumber} has been submitted for Order #${returningOrder.order_number}.`,
            notification_type: "return_requested",
            order_id: returningOrder.id,
          }));
          await (supabase as any).from("notifications").insert(adminNotifs);
        }
      } catch (admErr) {
        console.warn("Failed to notify admins about return request:", admErr);
      }

      // 10. Notify Customer In-App
      try {
        await (supabase as any).from("notifications").insert({
          receiver_id: user.id,
          receiver_role: "customer",
          title: "Return Request Submitted",
          message: `Your return request ${returnNumber} for Order #${returningOrder.order_number} has been submitted successfully.`,
          notification_type: "return_requested",
          order_id: returningOrder.id,
        });
      } catch (custErr) {
        console.warn("Failed to send customer notification:", custErr);
      }

      // 11. Trigger HTML Emails
      try {
        const { sendReturnSubmittedEmail } = await import("@/api/email.functions");
        await sendReturnSubmittedEmail({
          data: {
            returnId: returnData.id,
            returnNumber: returnNumber,
            orderNumber: returningOrder.order_number,
            reason: itemsToReturn[0].reason,
            preferredResolution: preferredResolution,
            itemsCount: itemsToReturn.length,
            customerId: user.id,
            vendorId: vendorId,
          },
        });
      } catch (emailErr) {
        console.warn("Failed to send return confirmation emails:", emailErr);
      }

      qc.invalidateQueries({ queryKey: ["my-orders", user.id] });
      qc.invalidateQueries({ queryKey: ["my-returns", user.id] });
      toast.success(`Return request ${returnNumber} submitted successfully!`);
      setReturningOrder(null);
      setReturnReason("Wrong Product");
      setReturnNotes("");
    } catch (err: any) {
      console.error("Failed to submit return request:", err);
      toast.error(err.message || "Failed to submit return request. Please try again.");
    } finally {
      setIsReturnSubmitting(false);
    }
  };

  // Fetch customer return requests from Supabase
  const { data: returns = [], refetch: refetchReturns } = useQuery({
    queryKey: ["my-returns", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("returns")
        .select(
          "*, return_items(*, order_item:order_items(*)), return_images(*), return_timeline(*), return_comments(*)",
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Cancel return request mutation
  const cancelReturn = useMutation({
    mutationFn: async (returnId: string) => {
      // Fetch details first to get user/vendor details for emails/notifs
      const { data: ret, error: retErr } = await supabase
        .from("returns")
        .select("*, order:orders(order_number)")
        .eq("id", returnId)
        .single();
      if (retErr || !ret) throw new Error("Return request not found");

      // Update return status to rejected (representing cancelled/rejected in return_status enum)
      const { error } = await supabase
        .from("returns")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", returnId);
      if (error) throw error;

      // Add timeline entry
      await supabase.from("return_timeline").insert({
        return_id: returnId,
        status: "rejected",
        actor_id: user!.id,
        actor_role: "customer",
        action: "Return Cancelled",
        comments: "Cancelled by customer before approval.",
      });

      // Add comment entry
      await supabase.from("return_comments").insert({
        return_id: returnId,
        author_id: user!.id,
        author_role: "customer",
        comment: "Return request cancelled by customer.",
        is_internal: false,
      });

      // Notify Admins & Vendor
      try {
        const orderNum = (ret.order as any)?.order_number || "Unknown";
        // Vendor notification
        const { data: vendorData } = await supabase
          .from("vendors")
          .select("user_id")
          .eq("id", ret.vendor_id)
          .single();
        if (vendorData) {
          await (supabase as any).from("notifications").insert({
            receiver_id: vendorData.user_id,
            receiver_role: "vendor",
            title: "Return Request Cancelled",
            message: `Return request ${ret.return_number} for Order #${orderNum} has been cancelled by the customer.`,
            notification_type: "return_cancelled",
            order_id: ret.order_id,
          });
        }
        // Admin notifications
        const { data: admins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");
        if (admins) {
          await (supabase as any).from("notifications").insert(
            admins.map((adm) => ({
              receiver_id: adm.user_id,
              receiver_role: "admin",
              title: "Return Request Cancelled",
              message: `Return request ${ret.return_number} for Order #${orderNum} has been cancelled by the customer.`,
              notification_type: "return_cancelled",
              order_id: ret.order_id,
            })),
          );
        }

        // Trigger Emails
        const { sendReturnRejectedEmail } = await import("@/api/email.functions");
        await sendReturnRejectedEmail({
          data: {
            returnId: ret.id,
            returnNumber: ret.return_number,
            reason: "Cancelled by customer before approval",
            customerId: user!.id,
            vendorId: ret.vendor_id,
          },
        });
      } catch (e) {
        console.warn("Notifications/Emails failed:", e);
      }
    },
    onSuccess: () => {
      refetchReturns();
      qc.invalidateQueries({ queryKey: ["my-orders", user?.id] });
      toast.success("Return request cancelled successfully.");
    },
    onError: (e) => toast.error(e.message),
  });

  // Add customer comment/message mutation
  const addReturnComment = useMutation({
    mutationFn: async ({ returnId, comment }: { returnId: string; comment: string }) => {
      const { error } = await supabase.from("return_comments").insert({
        return_id: returnId,
        author_id: user!.id,
        author_role: "customer",
        comment: comment,
        is_internal: false,
      });
      if (error) throw error;

      // Add timeline entry
      await supabase.from("return_timeline").insert({
        return_id: returnId,
        status: "comment_added",
        actor_id: user!.id,
        actor_role: "customer",
        action: "Customer Commented",
        comments: comment.substring(0, 100) + (comment.length > 100 ? "..." : ""),
      });

      // Fetch return details for notifications
      const { data: ret } = await supabase
        .from("returns")
        .select("vendor_id, return_number")
        .eq("id", returnId)
        .single();
      if (ret) {
        // Notify Vendor
        const { data: vendorData } = await supabase
          .from("vendors")
          .select("user_id")
          .eq("id", ret.vendor_id)
          .single();
        if (vendorData) {
          await (supabase as any).from("notifications").insert({
            receiver_id: vendorData.user_id,
            receiver_role: "vendor",
            title: "New Message on Return Request",
            message: `Customer added a comment on Return Request ${ret.return_number}.`,
            notification_type: "return_comment",
            order_id: null,
          });
        }
        // Notify Admins
        const { data: admins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");
        if (admins) {
          await (supabase as any).from("notifications").insert(
            admins.map((adm) => ({
              receiver_id: adm.user_id,
              receiver_role: "admin",
              title: "New Message on Return Request",
              message: `Customer added a comment on Return Request ${ret.return_number}.`,
              notification_type: "return_comment",
              order_id: null,
            })),
          );
        }
      }
    },
    onSuccess: () => {
      refetchReturns();
      setNewCommentText("");
      toast.success("Message sent successfully!");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrName || !newAddrStreet || !newAddrCity || !newAddrState || !newAddrZip || !user)
      return;
    const newAddr: SavedAddress = {
      id: Math.random().toString(),
      name: newAddrName,
      street: newAddrStreet,
      city: newAddrCity,
      state: newAddrState,
      zip: newAddrZip,
      isDefault: addresses.length === 0,
    };
    const updated = [...addresses, newAddr];
    setAddresses(updated);
    localStorage.setItem(`user_addresses_${user.id}`, JSON.stringify(updated));
    toast.success("Address added successfully!");
    setNewAddrName("");
    setNewAddrStreet("");
    setNewAddrCity("");
    setNewAddrState("");
    setNewAddrZip("");
  };

  const deleteAddress = (id: string) => {
    if (!user) return;
    const updated = addresses.filter((a) => a.id !== id);
    setAddresses(updated);
    localStorage.setItem(`user_addresses_${user.id}`, JSON.stringify(updated));
    toast.info("Address deleted");
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject || !user) return;
    const newTicket: SupportTicket = {
      id: `TK-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: newTicketSubject,
      category: newTicketCat,
      status: "open",
      created_at: new Date().toISOString(),
    };
    const updated = [newTicket, ...tickets];
    setTickets(updated);
    localStorage.setItem(`user_tickets_${user.id}`, JSON.stringify(updated));
    toast.success("Support ticket created! We'll reply within 12h.");
    setNewTicketSubject("");
  };

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        {/* Header Title */}
        <div className="flex items-end justify-between flex-wrap gap-4 mb-10 pb-6 border-b border-border/40">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent font-bold mb-2">
              My Account
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-foreground">
              Welcome back
              {user?.user_metadata?.full_name
                ? `, ${user.user_metadata.full_name.split(" ")[0]}`
                : ""}
              .
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Manage orders, bouquet preservation bidding, and addresses.
            </p>
          </div>
          {vendor ? (
            <a
              href="/vendor/dashboard"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-accent text-accent-foreground text-xs font-bold uppercase tracking-wider shadow hover:scale-101 transition-all"
            >
              <Store className="h-4 w-4" /> Open Vendor Dashboard
            </a>
          ) : (
            <Link
              to="/sell"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-border hover:border-accent text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <Store className="h-4 w-4" /> Become a Seller
            </Link>
          )}
        </div>

        {/* Dashboard grid layout */}
        <div className="grid lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
          {/* Left Column: Tab Menu Selector */}
          <aside className="lg:col-span-3 flex overflow-x-auto lg:overflow-x-visible lg:flex-col gap-1.5 pb-4 lg:pb-0 select-none border-b lg:border-b-0 border-border/40 scrollbar-none shrink-0 bg-card/45 lg:bg-transparent p-2 rounded-2xl border lg:border-0 lg:p-0">
            {[
              { id: "orders", label: "My Orders", icon: Package },
              { id: "preservation", label: "Preservations", icon: Sparkles },
              { id: "returns", label: "My Returns", icon: RotateCcw },
              { id: "wishlist", label: "Wishlist", icon: Heart },
              { id: "addresses", label: "Addresses", icon: MapPin },
              { id: "reviews", label: "My Reviews", icon: Star },
              { id: "support", label: "Support Tickets", icon: LifeBuoy },
              { id: "security", label: "Security Settings", icon: Lock },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4.5 py-3 rounded-full lg:rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap border border-transparent ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md border-primary/20 scale-[1.01]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            <button
              onClick={() => {
                signOut();
                toast.success("Signed out successfully!");
              }}
              className="px-4.5 py-3 rounded-full lg:rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer whitespace-nowrap lg:mt-4 shrink-0"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          </aside>

          {/* Right Column: Tab Contents Card */}
          <div className="lg:col-span-9 bg-card border border-border/60 rounded-2xl p-6 sm:p-8 shadow-soft min-h-[450px]">
            {/* Orders Tab */}
            {activeTab === "orders" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <h2 className="font-display text-2xl font-bold border-b border-border pb-3 mb-4">
                  Your Orders
                </h2>
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-xs text-muted-foreground mb-4">
                      You have not placed any orders yet.
                    </p>
                    <Link
                      to="/shop"
                      className="px-5 py-2 bg-primary text-primary-foreground rounded-full text-xs font-semibold"
                    >
                      Start Shopping
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((o) => (
                      <div
                        key={o.id}
                        className="border border-border/80 rounded-2xl overflow-hidden text-xs"
                      >
                        {/* Order header summary */}
                        <div className="bg-muted/30 p-4 border-b border-border/80 flex flex-wrap justify-between items-center gap-2 font-medium">
                          <div>
                            <span className="text-muted-foreground">ORDER: </span>
                            <span className="font-bold text-foreground">{o.order_number}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">DATE: </span>
                            <span>{new Date(o.created_at).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">TOTAL: </span>
                            <span className="font-bold text-accent">{inr(o.total_cents)}</span>
                          </div>
                          <div>
                            <span
                              className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                o.status === "delivered"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : o.status === "cancelled"
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                    : "bg-amber-500/10 text-accent"
                              }`}
                            >
                              {o.status?.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>

                        {/* Split Payment / Advance Information */}
                        {o.payment_type === "split" && (
                          <div className="bg-[#fcfbf9] px-4 py-2.5 border-b border-border/60 flex flex-wrap justify-between items-center gap-4 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground">
                                Payment Status:
                              </span>
                              <span className="font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full capitalize text-[9px]">
                                {o.payment_status?.replace(/_/g, " ")}
                              </span>
                            </div>
                            <div className="flex gap-4 text-[11px]">
                              <span>
                                <span className="text-muted-foreground">Advance Paid:</span>{" "}
                                <span className="font-semibold text-slate-800">
                                  {inr(o.advance_paid_cents)}
                                </span>
                              </span>
                              <span>
                                <span className="text-muted-foreground">Remaining Balance:</span>{" "}
                                <span className="font-semibold text-amber-600">
                                  {inr(o.remaining_balance_cents)}
                                </span>
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Order items list */}
                        <div className="divide-y divide-border/60 p-4 bg-background">
                          {o.order_items?.map((item: any) => (
                            <div
                              key={item.id}
                              className="flex gap-4 py-3 first:pt-0 last:pb-0 items-center"
                            >
                              <img
                                src={item.cover_image ?? ""}
                                alt=""
                                className="h-10 w-10 object-cover rounded-lg bg-muted shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground truncate">
                                  {item.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Quantity: {item.quantity} · Price: {inr(item.unit_price_cents)}
                                </p>
                              </div>
                              <span className="font-bold text-foreground shrink-0">
                                {inr(item.subtotal_cents)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Shipment Tracking Widget */}
                        {(() => {
                          const shipment = userShipments.find((s: any) => s.order_id === o.id);
                          if (!shipment) return null;

                          // Define shipment progress steps
                          const statusSteps = [
                            { key: "shipment_created", label: "Confirmed" },
                            { key: "picked_up", label: "Dispatched" },
                            { key: "in_transit", label: "In Transit" },
                            { key: "delivered", label: "Delivered" },
                          ];

                          const currentStatusIdx = statusSteps.findIndex((step) => {
                            if (shipment.status === "delivered") return step.key === "delivered";
                            if (shipment.status === "out_for_delivery")
                              return step.key === "in_transit";
                            if (shipment.status === "picked_up") return step.key === "picked_up";
                            if (shipment.status === "pickup_scheduled")
                              return step.key === "shipment_created";
                            return step.key === shipment.status;
                          });

                          return (
                            <div className="bg-muted/10 p-4 border-t border-border/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                              <div className="space-y-1">
                                <p className="font-bold text-[10px] text-accent uppercase tracking-wider flex items-center gap-1.5">
                                  <Truck className="h-3.5 w-3.5 text-accent" /> Shipment Tracking
                                  Info
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Courier:{" "}
                                  <span className="font-semibold text-foreground">
                                    {shipment.courier_name || "Assigning..."}
                                  </span>{" "}
                                  &bull; AWB:{" "}
                                  <span className="font-mono text-foreground">
                                    {shipment.tracking_number || "Pending"}
                                  </span>
                                </p>
                              </div>

                              {shipment.status !== "cancelled" ? (
                                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto py-1 scrollbar-none select-none max-w-xs md:max-w-none">
                                  {statusSteps.map((step, idx) => {
                                    const isCompleted = idx <= currentStatusIdx;
                                    const isLast = idx === statusSteps.length - 1;
                                    return (
                                      <div key={step.key} className="flex items-center">
                                        <div className="flex flex-col items-center">
                                          <div
                                            className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-colors ${
                                              isCompleted
                                                ? "bg-accent border-accent text-accent-foreground"
                                                : "bg-background border-border text-muted-foreground"
                                            }`}
                                          >
                                            {idx + 1}
                                          </div>
                                          <span
                                            className={`text-[9px] font-medium mt-1 uppercase tracking-wide ${
                                              isCompleted
                                                ? "text-accent font-bold"
                                                : "text-muted-foreground"
                                            }`}
                                          >
                                            {step.label}
                                          </span>
                                        </div>
                                        {!isLast && (
                                          <div
                                            className={`h-0.5 w-8 sm:w-12 -mt-4 transition-colors ${
                                              isCompleted ? "bg-accent" : "bg-border"
                                            }`}
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-xs text-rose-500 font-bold uppercase tracking-wider">
                                  Shipment Cancelled
                                </span>
                              )}

                              <Link
                                to="/tracking/$id"
                                params={{ id: shipment.id }}
                                className="px-4 py-1.5 bg-accent text-accent-foreground rounded-full text-[10px] font-bold uppercase tracking-wider hover:scale-102 transition-all block shrink-0 text-center w-full md:w-auto"
                              >
                                Track Details
                              </Link>
                            </div>
                          );
                        })()}

                        {/* Order Actions Footer */}
                        {(() => {
                          const cancelLog = (() => {
                            const raw = localStorage.getItem(`order_cancel_log_${o.id}`);
                            return raw ? JSON.parse(raw) : null;
                          })();

                          const returnLog = (() => {
                            const raw = localStorage.getItem(`order_return_log_${o.id}`);
                            return raw ? JSON.parse(raw) : null;
                          })();

                          // Check if order is eligible for cancellation
                          const canCancel = ["pending", "paid", "processing"].includes(o.status);

                          // Check if order is eligible for return (Delivered and within 3 days)
                          const isDelivered = o.status === "delivered";
                          const deliveredDate = isDelivered ? new Date(o.updated_at) : null;
                          const returnExpiry = deliveredDate
                            ? new Date(deliveredDate.getTime() + 3 * 24 * 60 * 60 * 1000)
                            : null;
                          const canReturn =
                            isDelivered && returnExpiry && new Date() <= returnExpiry && !returnLog;

                          const canPayRemaining =
                            o.payment_type === "split" && o.payment_status === "advance_paid";

                          if (
                            !cancelLog &&
                            !returnLog &&
                            !canCancel &&
                            !canReturn &&
                            !canPayRemaining
                          )
                            return null;

                          return (
                            <div className="bg-[#faf9f6] border-t border-[#ebdcc7]/55 p-4 flex flex-col gap-3">
                              {/* Log Displays */}
                              {cancelLog && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-800 flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 font-bold">
                                    <span className="text-red-500">❌</span> Order Cancelled
                                  </div>
                                  <p>
                                    <strong>Date:</strong>{" "}
                                    {new Date(cancelLog.date).toLocaleString()}
                                  </p>
                                  <p>
                                    <strong>Reason:</strong> {cancelLog.reason}
                                  </p>
                                </div>
                              )}

                              {returnLog && (
                                <div className="p-3 bg-amber-50/50 border border-amber-100/80 rounded-xl text-[11px] text-amber-800 flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 font-bold">
                                    <span className="text-amber-500">🔄</span> Return Requested
                                    (Under Review)
                                  </div>
                                  <p>
                                    <strong>Date:</strong>{" "}
                                    {new Date(returnLog.date).toLocaleString()}
                                  </p>
                                  <p>
                                    <strong>Reason:</strong> {returnLog.reason}
                                  </p>
                                  <p>
                                    <strong>Notes:</strong> {returnLog.notes}
                                  </p>
                                </div>
                              )}

                              {/* Action Buttons */}
                              {(canCancel || canReturn || canPayRemaining) && (
                                <div className="flex justify-end gap-2.5">
                                  {canPayRemaining && (
                                    <button
                                      onClick={() => handlePayRemainingBalance(o)}
                                      disabled={payingOrderId === o.id}
                                      className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white transition-colors text-[10px] font-bold uppercase tracking-wider rounded-full cursor-pointer flex items-center gap-1 shadow-sm"
                                    >
                                      {payingOrderId === o.id ? (
                                        <>
                                          <Loader2 className="h-3 w-3 animate-spin" /> Verifying...
                                        </>
                                      ) : (
                                        `Pay Remaining Balance (${inr(o.remaining_balance_cents)})`
                                      )}
                                    </button>
                                  )}
                                  {canCancel && (
                                    <button
                                      onClick={() => setCancellingOrder(o)}
                                      className="px-5 py-2 border border-rose-200 text-rose-600 bg-rose-50/30 hover:bg-rose-50 transition-colors text-[10px] font-bold uppercase tracking-wider rounded-full cursor-pointer"
                                    >
                                      Cancel Order
                                    </button>
                                  )}
                                  {canReturn && (
                                    <button
                                      onClick={() => setReturningOrder(o)}
                                      className="px-5 py-2 border border-[#c8a165]/50 text-[#c8a165] bg-[#c8a165]/5 hover:bg-[#c8a165]/10 transition-colors text-[10px] font-bold uppercase tracking-wider rounded-full cursor-pointer"
                                    >
                                      Return / Refund
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Preservation requests Tab */}
            {activeTab === "preservation" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <h2 className="font-display text-2xl font-bold border-b border-border pb-3 mb-4">
                  Preservation Trackings
                </h2>
                {requests.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-xs text-muted-foreground mb-4">
                      You have not submitted any preservation inquiries.
                    </p>
                    <Link
                      to="/preservation"
                      className="px-5 py-2 bg-primary text-primary-foreground rounded-full text-xs font-semibold"
                    >
                      Start A Request
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((r) => {
                      const idx = PRESERVATION_STAGES.indexOf(r.current_stage);
                      const pct = ((idx + 1) / PRESERVATION_STAGES.length) * 100;
                      return (
                        <div
                          key={r.id}
                          className="p-5 border border-border/80 rounded-2xl bg-background space-y-4 text-xs"
                        >
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <div>
                              <p className="font-bold text-foreground text-sm">
                                {r.request_number}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {r.preservation_type} ({r.shape || "Custom"} · {r.size || "Custom"})
                              </p>
                            </div>
                            <span className="px-2.5 py-1 bg-accent/10 border border-accent/20 text-accent rounded-full text-[9px] font-bold uppercase tracking-wider">
                              {stageLabel(r.current_stage)}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                              <span>PRESERVATION PROCESS</span>
                              <span>{Math.round(pct)}% COMPLETE</span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/40">
                              <div
                                className="h-full bg-accent transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex justify-between items-center border-t border-border/40 pt-4 mt-2">
                            <span className="text-[10px] text-muted-foreground">
                              {r.quote_cents
                                ? `Accepted Bid: ${inr(r.quote_cents)}`
                                : "Awaiting bids reviews..."}
                            </span>
                            <Link
                              to="/preservation/$id"
                              params={{ id: r.id }}
                              className="text-xs text-accent font-semibold hover:underline flex items-center gap-0.5"
                            >
                              Track Progress Portal <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {/* My Returns Tab */}
            {activeTab === "returns" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
                  <h2 className="font-display text-2xl font-bold">My Return Requests</h2>
                  <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-semibold">
                    {returns.length} requests
                  </span>
                </div>

                {returns.length === 0 ? (
                  <div className="text-center py-12 bg-[#faf9f6]/40 rounded-2xl border border-dashed border-border/80">
                    <p className="text-xs text-muted-foreground mb-4">
                      You have not submitted any return or refund requests.
                    </p>
                    <button
                      onClick={() => setActiveTab("orders")}
                      className="px-5 py-2 bg-[#3d2712] hover:bg-[#2c1a0c] text-white rounded-full text-xs font-semibold cursor-pointer transition-colors shadow"
                    >
                      Browse Orders to Return
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {returns.map((ret: any) => {
                      const isPendingCancel = ["pending", "vendor_review", "admin_review"].includes(
                        ret.status,
                      );
                      return (
                        <div
                          key={ret.id}
                          className="p-5 border border-border/80 rounded-2xl bg-card space-y-4 text-xs hover:shadow-sm transition-all"
                        >
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <div className="space-y-0.5">
                              <p className="font-mono text-[#c8a165] font-bold text-sm">
                                {ret.return_number}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Requested on {new Date(ret.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  ret.status === "completed"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                                    : ret.status === "rejected"
                                      ? "bg-rose-50 text-rose-700 border border-rose-200/50"
                                      : ret.status === "pending"
                                        ? "bg-amber-50 text-amber-700 border border-amber-200/50"
                                        : "bg-blue-50 text-blue-700 border border-blue-200/50"
                                }`}
                              >
                                {ret.status.replace("_", " ")}
                              </span>
                              <span className="px-2.5 py-1 bg-muted rounded-full text-[10px] font-medium text-muted-foreground uppercase">
                                {ret.preferred_resolution}
                              </span>
                            </div>
                          </div>

                          {/* Returned Items Preview */}
                          <div className="p-3 bg-[#faf9f6]/80 rounded-xl border border-[#ebdcc7]/40 space-y-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Items Returned
                            </p>
                            {ret.return_items?.map((item: any) => (
                              <div
                                key={item.id}
                                className="flex justify-between items-center gap-4 text-[11px]"
                              >
                                <span className="font-medium text-foreground truncate max-w-[200px] sm:max-w-md">
                                  {item.order_item?.title || "Item"}
                                </span>
                                <span className="text-muted-foreground shrink-0">
                                  Qty: <strong className="text-foreground">{item.quantity}</strong>{" "}
                                  &bull; {item.reason}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Action row */}
                          <div className="flex justify-between items-center gap-2 pt-2 border-t border-border/40">
                            <button
                              onClick={() => handleDownloadReturnReceipt(ret)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium text-[10px] cursor-pointer"
                              title="Download Return Receipt"
                            >
                              <FileDown className="h-3.5 w-3.5" /> Receipt
                            </button>

                            <div className="flex gap-2">
                              {isPendingCancel && (
                                <button
                                  onClick={() => {
                                    if (
                                      confirm(
                                        "Are you sure you want to cancel this return request?",
                                      )
                                    ) {
                                      cancelReturn.mutate(ret.id);
                                    }
                                  }}
                                  disabled={cancelReturn.isPending}
                                  className="px-4 py-1.5 border border-rose-200 text-rose-600 bg-rose-50/20 hover:bg-rose-50 disabled:opacity-50 transition-colors font-semibold rounded-full text-[10px] cursor-pointer"
                                >
                                  Cancel Request
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedReturnId(ret.id)}
                                className="px-4 py-1.5 bg-[#3d2712] hover:bg-[#2c1a0c] text-white font-semibold rounded-full text-[10px] cursor-pointer flex items-center gap-1 transition-all"
                              >
                                View Progress &amp; Chat
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Wishlist Tab */}
            {activeTab === "wishlist" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <h2 className="font-display text-2xl font-bold border-b border-border pb-3 mb-4">
                  Your Wishlist
                </h2>
                {wishlist.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Your wishlist is empty. Add items from shop to save them here.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {wishlist.map(
                      (w) =>
                        w.product && (
                          <div
                            key={w.id}
                            className="bg-background border border-border/60 rounded-2xl p-4 flex flex-col justify-between text-center text-xs"
                          >
                            <div>
                              <Link
                                to="/products/$slug"
                                params={{ slug: w.product.slug }}
                                className="aspect-square h-28 rounded-xl overflow-hidden bg-muted block mx-auto mb-2"
                              >
                                {w.product.cover_image && (
                                  <img
                                    src={w.product.cover_image}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                )}
                              </Link>
                              <h4 className="font-display text-xs font-bold truncate hover:text-accent">
                                <Link to="/products/$slug" params={{ slug: w.product.slug }}>
                                  {w.product.title}
                                </Link>
                              </h4>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {inr(w.product.price_cents)}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1.5 mt-4 pt-3 border-t border-border/40">
                              <button
                                onClick={() => removeWishlist.mutate(w.id)}
                                className="text-[9px] text-rose-500 hover:underline cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ),
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === "addresses" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <h2 className="font-display text-2xl font-bold border-b border-border pb-3 mb-4">
                  Address Management
                </h2>

                {addresses.length === 0 ? (
                  <p className="text-xs text-muted-foreground mb-4">
                    You haven't saved any addresses yet. Add one below for faster checkout.
                  </p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {addresses.map((a) => (
                      <div
                        key={a.id}
                        className="p-4 border border-border/80 rounded-2xl bg-background text-xs space-y-2 relative flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-foreground">{a.name}</p>
                            {a.isDefault && (
                              <span className="bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded text-[8px] font-bold">
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <p className="text-muted-foreground mt-1.5">{a.street}</p>
                          <p className="text-muted-foreground">
                            {a.city}, {a.state} - {a.zip}
                          </p>
                        </div>
                        <div className="flex justify-end pt-3 border-t border-border/40 mt-3">
                          <button
                            onClick={() => deleteAddress(a.id)}
                            className="text-muted-foreground hover:text-destructive flex items-center gap-1 cursor-pointer"
                            title="Delete address"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={handleAddAddress}
                  className="border border-border/80 rounded-2xl p-5 bg-muted/20 space-y-4 text-xs max-w-xl mt-6"
                >
                  <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                    <Plus className="h-4 w-4" /> Add New Address
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        required
                        placeholder="Receiver Name"
                        value={newAddrName}
                        onChange={(e) => setNewAddrName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border outline-none text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        required
                        placeholder="Street details"
                        value={newAddrStreet}
                        onChange={(e) => setNewAddrStreet(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border outline-none text-xs"
                      />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={newAddrCity}
                      onChange={(e) => setNewAddrCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border outline-none text-xs"
                    />
                    <input
                      type="text"
                      required
                      placeholder="State"
                      value={newAddrState}
                      onChange={(e) => setNewAddrState(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border outline-none text-xs"
                    />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="ZIP code"
                      value={newAddrZip}
                      onChange={(e) => setNewAddrZip(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border outline-none text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-full text-xs cursor-pointer shadow"
                  >
                    Save Address
                  </button>
                </form>
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === "reviews" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <h2 className="font-display text-2xl font-bold border-b border-border pb-3 mb-4">
                  Your Reviews
                </h2>

                <div className="space-y-4">
                  <div className="p-4 bg-muted/10 border border-border rounded-xl text-xs text-muted-foreground flex items-center justify-between">
                    <span>Help the artisan community! Review your purchases.</span>
                    <Link to="/shop" className="text-accent underline font-semibold">
                      Browse Shop
                    </Link>
                  </div>

                  {/* Loop through orders items to review them mock-wise */}
                  {orders.length > 0 ? (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                        Order items to review
                      </p>
                      <div className="space-y-3">
                        {orders
                          .slice(0, 2)
                          .flatMap((o) => o.order_items || [])
                          .map((item: any) => (
                            <div
                              key={item.id}
                              className="flex gap-4 p-4 border border-border bg-background rounded-2xl items-center text-xs"
                            >
                              <img
                                src={item.cover_image ?? ""}
                                alt=""
                                className="h-10 w-10 object-cover rounded-lg bg-muted shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground truncate">
                                  {item.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Purchased on order{" "}
                                  {orders.find((o) => o.id === item.order_id)?.order_number}
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  toast.success("Review form coming soon! Mock review saved.")
                                }
                                className="px-4.5 py-1.5 bg-accent text-accent-foreground text-xs font-semibold rounded-full hover:scale-102 transition-transform cursor-pointer"
                              >
                                Write Review
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Support Tickets Tab */}
            {activeTab === "support" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <h2 className="font-display text-2xl font-bold border-b border-border/40 pb-3 mb-4">
                  Customer Support
                </h2>

                <div className="space-y-3">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 border border-border/60 rounded-xl bg-background text-xs flex justify-between items-center hover:shadow-soft transition-all duration-300"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{t.id}</span>
                          <span className="text-muted-foreground font-semibold">
                            ({t.category})
                          </span>
                        </div>
                        <p className="text-muted-foreground">{t.subject}</p>
                        <p className="text-[9px] text-slate-400 mt-1">
                          Created: {new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                          t.status === "resolved"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-accent font-bold"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={handleCreateTicket}
                  className="border border-border/60 rounded-xl p-5 bg-muted/10 space-y-4 text-xs max-w-xl mt-6 shadow-sm"
                >
                  <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-accent" /> Create Support Ticket
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                        Subject *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Detail your request..."
                        value={newTicketSubject}
                        onChange={(e) => setNewTicketSubject(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border/80 focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-xs transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                        Inquiry Category
                      </label>
                      <select
                        value={newTicketCat}
                        onChange={(e) => setNewTicketCat(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border/80 focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-xs cursor-pointer transition-all"
                      >
                        <option value="Order Status">Order Status</option>
                        <option value="Preservation">Preservation</option>
                        <option value="Bids & Quotes">Bids & Quotes</option>
                        <option value="Seller Account">Seller Account</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-primary hover:bg-foreground text-primary-foreground font-semibold rounded-full text-xs cursor-pointer shadow hover:scale-[1.01] transition-all"
                  >
                    Submit Ticket
                  </button>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <h2 className="font-display text-2xl font-bold border-b border-border pb-3 mb-4">
                  Security Settings
                </h2>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    toast.success("Profile details updated successfully!");
                  }}
                  className="space-y-4 text-xs max-w-md border border-border/80 rounded-2xl p-5"
                >
                  <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                    <User className="h-4 w-4" /> Edit Profile Details
                  </h3>
                  <div className="grid gap-3">
                    <div>
                      <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                        Full Name
                      </label>
                      <input
                        type="text"
                        defaultValue={user?.user_metadata?.full_name || ""}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                        Email Address
                      </label>
                      <input
                        type="email"
                        disabled
                        defaultValue={user?.email || ""}
                        className="w-full px-3 py-2 rounded-xl bg-muted border border-border outline-none text-xs text-muted-foreground"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-full text-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </form>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    toast.success("Password updated successfully!");
                  }}
                  className="space-y-4 text-xs max-w-md border border-border/80 rounded-2xl p-5 mt-6"
                >
                  <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                    <Lock className="h-4 w-4" /> Update Password
                  </h3>
                  <div className="grid gap-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        required
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border outline-none text-xs"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-full text-xs cursor-pointer"
                  >
                    Update Password
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Cancellation Confirmation Modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setCancellingOrder(null);
              setCancellationReason("");
            }}
          />
          <div className="relative w-full max-w-md bg-card border border-border shadow-luxe rounded-3xl p-6 sm:p-8 z-10 animate-in zoom-in-95 duration-200 text-xs">
            <h3 className="font-display text-lg font-bold text-foreground mb-2 flex items-center gap-2">
              <span className="text-rose-500 text-xl">⚠️</span> Cancel Order
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Are you sure you want to cancel Order <strong>{cancellingOrder.order_number}</strong>?
              This action cannot be undone. Product inventory will be restored, and vendors/admins
              will be notified.
            </p>

            <form onSubmit={handleCancelOrderSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                  Reason for Cancellation (Optional)
                </label>
                <textarea
                  placeholder="e.g. Changed my mind, ordered wrong item, shipping delay..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full min-h-[80px] p-3 rounded-2xl bg-muted/40 border border-border focus:border-accent outline-none text-xs resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCancellingOrder(null);
                    setCancellationReason("");
                  }}
                  className="px-5 py-2.5 rounded-full border border-border hover:bg-muted text-xs font-semibold cursor-pointer transition-colors"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={isCancellingSubmitting}
                  className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow disabled:opacity-50 transition-colors"
                >
                  {isCancellingSubmitting ? "Cancelling..." : "Confirm Cancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Progress & Support Chat Modal */}
      {(() => {
        if (!selectedReturnId) return null;
        const ret = returns.find((r: any) => r.id === selectedReturnId);
        if (!ret) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedReturnId(null)}
            />
            <div className="relative w-full max-w-4xl bg-card border border-border shadow-luxe rounded-3xl p-6 sm:p-8 z-10 animate-in zoom-in-95 duration-200 text-xs flex flex-col max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-border pb-4 mb-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Return Request Details
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    ID: <strong className="font-mono text-[#c8a165]">{ret.return_number}</strong>{" "}
                    &bull; Order: #
                    {(ret as any).order_items?.[0]?.order_item?.orders?.order_number ||
                      ret.return_items?.[0]?.order_item?.order_id?.slice(0, 8) ||
                      "N/A"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedReturnId(null)}
                  className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors cursor-pointer"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="grid md:grid-cols-12 gap-6 overflow-y-auto flex-1 pr-1">
                {/* Left Column: Return Info */}
                <div className="md:col-span-7 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl border border-border/40">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">
                        Status
                      </p>
                      <span className="inline-block mt-1 font-semibold text-foreground uppercase tracking-wide">
                        {ret.status.replace("_", " ")}
                      </span>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">
                        Preferred Resolution
                      </p>
                      <span className="inline-block mt-1 font-semibold text-[#c8a165] uppercase">
                        {ret.preferred_resolution}
                      </span>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">
                        Contact Phone
                      </p>
                      <p className="mt-1 font-medium text-foreground">{ret.phone}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">
                        Pickup Address
                      </p>
                      <p
                        className="mt-1 font-medium text-foreground line-clamp-2"
                        title={(ret.pickup_address as any)?.address}
                      >
                        {(ret.pickup_address as any)?.address || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Return Items list */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                      Returned Items
                    </h4>
                    <div className="border border-border/60 rounded-2xl overflow-hidden bg-background">
                      {ret.return_items?.map((item: any) => (
                        <div
                          key={item.id}
                          className="p-3 border-b border-border/40 last:border-b-0 flex justify-between items-center gap-4"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {item.order_item?.title || "Item"}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Reason: {item.reason}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-foreground">
                              Qty: {item.quantity}
                            </span>
                            {item.description && (
                              <p className="text-[9px] text-muted-foreground italic mt-0.5 max-w-[200px] truncate">
                                "{item.description}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Media uploads evidence */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                      Uploaded Evidence
                    </h4>
                    <div className="flex flex-wrap gap-2.5">
                      {ret.return_images?.length === 0 && !ret.video_url && (
                        <p className="text-[10px] text-muted-foreground italic">
                          No image or video evidence uploaded.
                        </p>
                      )}
                      {ret.return_images?.map((img: any) => (
                        <a
                          key={img.id}
                          href={img.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-16 w-16 rounded-xl border border-border overflow-hidden group relative shrink-0"
                        >
                          <img
                            src={img.url}
                            alt="Evidence"
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </a>
                      ))}
                      {ret.video_url && (
                        <a
                          href={ret.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-16 w-24 rounded-xl border border-border bg-slate-950 flex flex-col items-center justify-center text-white shrink-0 relative overflow-hidden group cursor-pointer"
                        >
                          <Play className="h-4 w-4 text-white z-10 group-hover:scale-110 transition-transform" />
                          <span className="text-[8px] uppercase font-bold tracking-wider mt-1 text-slate-400 z-10">
                            Play Video
                          </span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Timeline & Comments */}
                <div className="md:col-span-5 flex flex-col gap-4 overflow-hidden">
                  {/* Timeline Stepper */}
                  <div className="border border-border/60 rounded-2xl p-4 bg-background max-h-[220px] overflow-y-auto space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">
                      Return History
                    </h4>
                    <div className="relative pl-4 border-l border-border/80 space-y-4">
                      {ret.return_timeline?.map((step: any) => (
                        <div key={step.id} className="relative">
                          <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[#c8a165]" />
                          <p className="font-bold text-[10px] text-foreground">{step.action}</p>
                          <p className="text-[9px] text-muted-foreground">
                            {new Date(step.created_at).toLocaleString()} &bull;{" "}
                            {step.actor_role.toUpperCase()}
                          </p>
                          {step.comments && (
                            <p className="text-[9px] text-muted-foreground bg-muted/40 p-1.5 rounded-lg border border-border/30 mt-1 italic">
                              "{step.comments}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comments Chat */}
                  <div className="flex-1 flex flex-col border border-border/60 rounded-2xl bg-background overflow-hidden min-h-[200px]">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40 p-3 bg-muted/10">
                      Discussion Hub
                    </h4>

                    {/* Message feed */}
                    <div className="flex-1 p-3 overflow-y-auto space-y-2.5 max-h-[220px]">
                      {ret.return_comments?.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground italic text-center py-6">
                          No discussions yet. Type a message below to coordinate.
                        </p>
                      ) : (
                        ret.return_comments?.map((c: any) => {
                          const isCustomer = c.author_role === "customer";
                          return (
                            <div
                              key={c.id}
                              className={`flex flex-col max-w-[85%] ${isCustomer ? "ml-auto items-end" : "mr-auto items-start"}`}
                            >
                              <span className="text-[8px] text-muted-foreground font-semibold uppercase px-1">
                                {c.author_role.toUpperCase()}
                              </span>
                              <div
                                className={`p-2.5 rounded-2xl text-[10px] leading-relaxed border ${
                                  isCustomer
                                    ? "bg-[#3d2712] text-white border-[#3d2712] rounded-tr-none"
                                    : "bg-muted text-foreground border-border/60 rounded-tl-none"
                                }`}
                              >
                                {c.comment}
                              </div>
                              <span className="text-[8px] text-muted-foreground mt-0.5 px-1">
                                {new Date(c.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Message entry */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newCommentText.trim()) return;
                        addReturnComment.mutate({ returnId: ret.id, comment: newCommentText });
                      }}
                      className="p-2 border-t border-border/40 flex gap-2 items-center bg-muted/20"
                    >
                      <input
                        type="text"
                        placeholder="Type a message to support/vendor..."
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        className="flex-1 p-2 bg-background border border-border rounded-xl focus:border-[#c8a165] outline-none text-[11px]"
                      />
                      <button
                        type="submit"
                        disabled={addReturnComment.isPending || !newCommentText.trim()}
                        className="px-4.5 py-2 bg-[#3d2712] hover:bg-[#2c1a0c] disabled:opacity-40 text-white font-bold rounded-xl text-[10px] uppercase cursor-pointer"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Return & Refund Request Modal */}
      {returningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-card border border-border shadow-luxe rounded-3xl p-6 sm:p-8 z-10 animate-in zoom-in-95 duration-200 text-xs my-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  <span className="text-[#c8a165] text-xl">🔄</span> Return / Refund Request
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Order <strong>{returningOrder.order_number}</strong> &bull; Select items to return
                  and input reasons.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReturningOrder(null)}
                className="p-1 hover:bg-muted text-muted-foreground rounded-full cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReturnRequestSubmit} className="space-y-5">
              {/* Product Checklist */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block">
                  Select Items for Return *
                </label>
                <div className="border border-border/80 rounded-2xl overflow-hidden bg-background divide-y divide-border/40">
                  {returningOrder.order_items?.map((item: any) => {
                    const rowData = selectedReturnItems[item.id] || {
                      selected: false,
                      quantity: 1,
                      reason: "Wrong Product",
                      description: "",
                      eligible: true,
                      reasonIneligible: "",
                    };
                    return (
                      <div
                        key={item.id}
                        className={`p-4 flex flex-col gap-3 ${!rowData.eligible ? "bg-muted/15 opacity-75" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            disabled={!rowData.eligible}
                            checked={rowData.selected}
                            onChange={(e) => {
                              setSelectedReturnItems((prev) => ({
                                ...prev,
                                [item.id]: { ...rowData, selected: e.target.checked },
                              }));
                            }}
                            className="mt-1 h-4 w-4 rounded border-border/80 text-[#c8a165] focus:ring-[#c8a165] cursor-pointer"
                          />
                          <div className="h-12 w-12 rounded-lg border border-border overflow-hidden bg-muted shrink-0">
                            {item.cover_image ? (
                              <img
                                src={item.cover_image}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="h-5 w-5 m-3 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">{item.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Price: {inr(item.unit_price_cents)} &bull; Ordered: {item.quantity}
                            </p>
                            {!rowData.eligible && (
                              <p className="text-[10px] text-rose-500 font-semibold mt-1">
                                ❌ {rowData.reasonIneligible}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Return fields for item (show only if selected and eligible) */}
                        {rowData.selected && rowData.eligible && (
                          <div className="pl-7 grid sm:grid-cols-2 gap-3 pt-2 border-t border-dashed border-border/40 animate-in slide-in-from-top-1 duration-150">
                            <div>
                              <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">
                                Return Quantity
                              </label>
                              <select
                                value={rowData.quantity}
                                onChange={(e) => {
                                  setSelectedReturnItems((prev) => ({
                                    ...prev,
                                    [item.id]: { ...rowData, quantity: parseInt(e.target.value) },
                                  }));
                                }}
                                className="w-full p-2 rounded-xl bg-muted/30 border border-border focus:border-[#c8a165] outline-none text-[11px]"
                              >
                                {Array.from({ length: item.quantity || 1 }).map((_, i) => (
                                  <option key={i + 1} value={i + 1}>
                                    {i + 1}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">
                                Reason *
                              </label>
                              <select
                                value={rowData.reason}
                                onChange={(e) => {
                                  setSelectedReturnItems((prev) => ({
                                    ...prev,
                                    [item.id]: { ...rowData, reason: e.target.value },
                                  }));
                                }}
                                className="w-full p-2 rounded-xl bg-muted/30 border border-border focus:border-[#c8a165] outline-none text-[11px]"
                              >
                                <option value="Wrong Product">Wrong Product</option>
                                <option value="Damaged Product">Damaged Product</option>
                                <option value="Manufacturing Defect">Manufacturing Defect</option>
                                <option value="Missing Item">Missing Item</option>
                                <option value="Courier Damage">Courier Damage</option>
                                <option value="Product Not as Described">
                                  Product Not as Described
                                </option>
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">
                                Item Description / Condition Notes
                              </label>
                              <input
                                type="text"
                                placeholder="Describe specific issue with this product..."
                                value={rowData.description}
                                onChange={(e) => {
                                  setSelectedReturnItems((prev) => ({
                                    ...prev,
                                    [item.id]: { ...rowData, description: e.target.value },
                                  }));
                                }}
                                className="w-full p-2.5 rounded-xl bg-muted/30 border border-border focus:border-[#c8a165] outline-none text-[11px]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Metadata Fields */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                    Preferred Resolution *
                  </label>
                  <select
                    value={preferredResolution}
                    onChange={(e: any) => setPreferredResolution(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-muted/40 border border-border focus:border-[#c8a165] outline-none text-xs cursor-pointer font-medium"
                  >
                    <option value="refund">Refund (Credit back to payment source)</option>
                    <option value="replacement">Replacement (Ship new product)</option>
                    <option value="exchange">Exchange (Swap for alternative item)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                    Contact Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Enter phone number..."
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-muted/40 border border-border focus:border-[#c8a165] outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                  Pickup Address *
                </label>
                <textarea
                  required
                  placeholder="Address where courier will pickup return items..."
                  value={pickupAddressText}
                  onChange={(e) => setPickupAddressText(e.target.value)}
                  className="w-full min-h-[60px] p-3 rounded-2xl bg-muted/40 border border-border focus:border-[#c8a165] outline-none text-xs resize-none"
                />
              </div>

              {/* Media Upload and Compression */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                    Media Proof Evidence (Max 5 Images, 1 Video)
                  </label>

                  <div className="grid sm:grid-cols-2 gap-3 mt-1.5">
                    {/* Image uploader */}
                    <div className="border border-dashed border-border rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-muted/10 transition-colors relative">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        disabled={isUploadingMedia || uploadedImages.length >= 5}
                        onChange={async (e) => {
                          if (!e.target.files || e.target.files.length === 0) return;
                          const files = Array.from(e.target.files);
                          if (uploadedImages.length + files.length > 5) {
                            toast.error("You can upload a maximum of 5 images.");
                            return;
                          }
                          setIsUploadingMedia(true);
                          setUploadProgress(0);
                          try {
                            const urls: string[] = [];
                            for (let i = 0; i < files.length; i++) {
                              const file = files[i];
                              const validImageTypes = ["image/jpeg", "image/png", "image/webp"];
                              if (!validImageTypes.includes(file.type)) {
                                throw new Error(
                                  `Unsupported image type: ${file.name}. Only JPG, PNG, and WEBP allowed.`,
                                );
                              }
                              if (file.size > 5 * 1024 * 1024) {
                                throw new Error(
                                  `Image ${file.name} is too large. Max size is 5MB.`,
                                );
                              }
                              const url = await uploadToCloudinary(file, (p: number) => {
                                setUploadProgress(Math.round(((i + p / 100) / files.length) * 100));
                              });
                              urls.push(url);
                            }
                            setUploadedImages((prev) => [...prev, ...urls]);
                            toast.success("Images uploaded successfully!");
                          } catch (err: any) {
                            console.error("Image upload failed:", err);
                            toast.error(err.message || "Failed to upload images.");
                          } finally {
                            setIsUploadingMedia(false);
                            setUploadProgress(0);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <UploadCloud className="h-6 w-6 text-muted-foreground mb-2" />
                      <p className="font-bold text-[10px] text-foreground">Upload Images</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        JPG, PNG, WEBP (Max 5MB)
                      </p>
                    </div>

                    {/* Video uploader */}
                    <div className="border border-dashed border-border rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-muted/10 transition-colors relative">
                      <input
                        type="file"
                        accept="video/*"
                        disabled={isUploadingMedia || !!uploadedVideo}
                        onChange={async (e) => {
                          if (!e.target.files || e.target.files.length === 0) return;
                          const file = e.target.files[0];
                          const validVideoTypes = [
                            "video/mp4",
                            "video/quicktime",
                            "video/webm",
                            "video/ogg",
                            "video/mpeg",
                          ];
                          if (!validVideoTypes.includes(file.type)) {
                            toast.error(
                              "Unsupported video format. Please upload MP4, MOV, WEBM, OGG or MPEG.",
                            );
                            return;
                          }
                          if (file.size > 25 * 1024 * 1024) {
                            toast.error("Video is too large. Max size is 25MB.");
                            return;
                          }
                          setIsUploadingMedia(true);
                          setUploadProgress(0);
                          try {
                            const url = await uploadToCloudinary(file, (p: number) => {
                              setUploadProgress(p);
                            });
                            setUploadedVideo(url);
                            toast.success("Video uploaded successfully!");
                          } catch (err: any) {
                            console.error("Video upload failed:", err);
                            toast.error(err.message || "Failed to upload video.");
                          } finally {
                            setIsUploadingMedia(false);
                            setUploadProgress(0);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <Video className="h-6 w-6 text-muted-foreground mb-2" />
                      <p className="font-bold text-[10px] text-foreground">
                        Upload Video (Optional)
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        MP4, MOV, WEBM (Max 25MB)
                      </p>
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  {isUploadingMedia && (
                    <div className="mt-3 p-3 bg-muted/40 border border-border/60 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-foreground">
                          Uploading evidence to Cloudinary...
                        </span>
                        <span className="font-mono text-muted-foreground font-semibold">
                          {uploadProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#c8a165] h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Upload Previews */}
                  {(uploadedImages.length > 0 || uploadedVideo) && (
                    <div className="mt-3 p-3 border border-border/80 rounded-2xl bg-[#faf9f6]/40 space-y-3">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Upload Previews
                      </p>

                      <div className="flex flex-wrap gap-2.5">
                        {uploadedImages.map((url, idx) => (
                          <div
                            key={idx}
                            className="h-14 w-14 rounded-xl border border-border overflow-hidden relative group"
                          >
                            <img src={url} alt="Preview" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() =>
                                setUploadedImages((prev) => prev.filter((u) => u !== url))
                              }
                              className="absolute top-0.5 right-0.5 p-1 bg-black/60 hover:bg-black text-white rounded-full transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}
                        {uploadedVideo && (
                          <div className="h-14 w-20 rounded-xl border border-border bg-slate-950 flex flex-col items-center justify-center text-white shrink-0 relative group">
                            <Play className="h-3 w-3 text-white" />
                            <span className="text-[7px] uppercase tracking-wider mt-0.5 text-slate-400">
                              Video
                            </span>
                            <button
                              type="button"
                              onClick={() => setUploadedVideo(null)}
                              className="absolute top-0.5 right-0.5 p-1 bg-black/60 hover:bg-black text-white rounded-full transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                  Overall Return Description &amp; Comments
                </label>
                <textarea
                  placeholder="Tell us more about the issues. Why are you returning these items?"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full min-h-[60px] p-3 rounded-2xl bg-muted/40 border border-border focus:border-[#c8a165] outline-none text-xs resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => {
                    setReturningOrder(null);
                    setUploadedImages([]);
                    setUploadedVideo(null);
                  }}
                  className="px-5 py-2.5 rounded-full border border-border hover:bg-muted text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReturnSubmitting || isUploadingMedia}
                  className="px-5 py-2.5 rounded-full bg-[#3d2712] hover:bg-[#2c1a0c] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow transition-colors"
                >
                  {isReturnSubmitting ? "Submitting..." : "Submit Return Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
