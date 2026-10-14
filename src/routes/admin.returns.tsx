import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  RotateCcw,
  FileDown,
  XCircle,
  Search,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Truck,
  CreditCard,
  Calendar,
  Play,
  Send,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Loader2,
  Layers,
  Sparkles,
  Shield,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
} from "recharts";

export const Route = createFileRoute("/admin/returns")({
  component: AdminReturnsPage,
});

function AdminReturnsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [resolutionFilter, setResolutionFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Selected Return Detail Modal state
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);

  // Modal input states
  const [rejectionReason, setRejectionReason] = useState("");
  const [pickupCourier, setPickupCourier] = useState("Delhivery");
  const [pickupDate, setPickupDate] = useState("");
  const [refundAmountInr, setRefundAmountInr] = useState("");
  const [replacementCourier, setReplacementCourier] = useState("BlueDart");
  const [replacementTracking, setReplacementTracking] = useState("");
  const [newComment, setNewComment] = useState("");
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [inspectionItems, setInspectionItems] = useState<
    Record<string, { inspect_status: string; inspect_notes: string }>
  >({});

  // 1. Query Return Requests
  const {
    data: returns = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-returns"],
    queryFn: async () => {
      const { data: returnsData, error: returnsError } = await supabase
        .from("returns")
        .select(
          `
          *,
          vendor:vendors(*),
          order:orders(*),
          return_items(*, order_item:order_items(*)),
          return_images(*),
          return_timeline(*),
          return_comments(*)
        `,
        )
        .order("created_at", { ascending: false });

      if (returnsError) throw returnsError;
      if (!returnsData || returnsData.length === 0) return [];

      // Fetch profiles separately to bypass cross-schema join limitation
      const userIds = Array.from(new Set(returnsData.map((r) => r.user_id)));
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      return returnsData.map((r) => ({
        ...r,
        profile: profilesData?.find((p) => p.id === r.user_id) || null,
      })) as any[];
    },
  });

  // 2. Fetch Refund Transactions count for analytics
  const { data: refundTotal = 0 } = useQuery({
    queryKey: ["admin-refund-total"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("transactions")
        .select("amount_cents")
        .eq("type", "refund");
      if (error) return 0;
      return (data as any[])?.reduce((acc, t) => acc + (t.amount_cents || 0), 0) ?? 0;
    },
  });

  // 3. Mutation: Approve Return & Schedule Pickup
  const approveReturn = useMutation({
    mutationFn: async ({
      returnId,
      courier,
      date,
    }: {
      returnId: string;
      courier: string;
      date: string;
    }) => {
      if (!date) throw new Error("Please select a pickup date");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const operatorId = user?.id || "";

      // Update return status
      const { error: updateErr } = await supabase
        .from("returns")
        .update({
          status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", returnId);
      if (updateErr) throw updateErr;

      // Log in timeline
      await supabase.from("return_timeline").insert({
        return_id: returnId,
        status: "approved",
        actor_id: operatorId,
        actor_role: "admin",
        action: "Return Request Approved",
        comments: `Pickup scheduled via ${courier} on ${date}.`,
      });

      // Send comments
      await supabase.from("return_comments").insert({
        return_id: returnId,
        author_id: operatorId,
        author_role: "admin",
        comment: `Return approved. Pickup scheduled with ${courier} on ${date}. Please keep the keepsakes packed and ready.`,
        is_internal: false,
      });

      // Fetch return details for notifications & email
      const { data: ret } = await supabase
        .from("returns")
        .select("*, order:orders(order_number)")
        .eq("id", returnId)
        .single();
      if (ret) {
        const orderNum = (ret.order as any)?.order_number || "N/A";
        // Notify Customer
        await (supabase as any).from("notifications").insert({
          receiver_id: ret.user_id,
          receiver_role: "customer",
          title: "Return Request Approved",
          message: `Your return request ${ret.return_number} has been approved. Pickup scheduled on ${date}.`,
          notification_type: "return_approved",
          order_id: ret.order_id,
        });

        // Notify Vendor
        const { data: vend } = await supabase
          .from("vendors")
          .select("user_id")
          .eq("id", ret.vendor_id)
          .single();
        if (vend) {
          await (supabase as any).from("notifications").insert({
            receiver_id: vend.user_id,
            receiver_role: "vendor",
            title: "Return Request Approved",
            message: `Return request ${ret.return_number} for Order #${orderNum} has been approved by admin.`,
            notification_type: "return_approved",
            order_id: ret.order_id,
          });
        }

        // Trigger Emails
        try {
          const { sendReturnApprovedEmail, sendReturnPickupScheduledEmail } =
            await import("@/api/email.functions");
          await sendReturnApprovedEmail({
            data: {
              returnId: ret.id,
              returnNumber: ret.return_number,
              preferredResolution: ret.preferred_resolution,
              customerId: ret.user_id,
              vendorId: ret.vendor_id,
              comments: `Pickup scheduled via ${courier} on ${date}.`,
            },
          });

          await sendReturnPickupScheduledEmail({
            data: {
              returnId: ret.id,
              returnNumber: ret.return_number,
              courierName: courier,
              pickupAddress: (ret.pickup_address as any)?.address || "N/A",
              phone: ret.phone,
              customerId: ret.user_id,
            },
          });
        } catch (e) {
          console.warn("Mail dispatch failed:", e);
        }
      }
    },
    onSuccess: () => {
      refetch();
      toast.success("Return request approved and pickup scheduled!");
    },
    onError: (e) => toast.error(e.message),
  });

  // 4. Mutation: Reject Return
  const rejectReturn = useMutation({
    mutationFn: async ({ returnId, reason }: { returnId: string; reason: string }) => {
      if (!reason.trim()) throw new Error("Rejection reason is required");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const operatorId = user?.id || "";

      const { error: updateErr } = await supabase
        .from("returns")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", returnId);
      if (updateErr) throw updateErr;

      await supabase.from("return_timeline").insert({
        return_id: returnId,
        status: "rejected",
        actor_id: operatorId,
        actor_role: "admin",
        action: "Return Request Rejected",
        comments: reason,
      });

      await supabase.from("return_comments").insert({
        return_id: returnId,
        author_id: operatorId,
        author_role: "admin",
        comment: `Return request rejected. Reason: ${reason}`,
        is_internal: false,
      });

      const { data: ret } = await supabase
        .from("returns")
        .select("*, order:orders(order_number)")
        .eq("id", returnId)
        .single();
      if (ret) {
        const orderNum = (ret.order as any)?.order_number || "N/A";
        // Notify Customer
        await (supabase as any).from("notifications").insert({
          receiver_id: ret.user_id,
          receiver_role: "customer",
          title: "Return Request Rejected",
          message: `Your return request ${ret.return_number} has been rejected. Reason: ${reason}`,
          notification_type: "return_rejected",
          order_id: ret.order_id,
        });

        // Notify Vendor
        const { data: vend } = await supabase
          .from("vendors")
          .select("user_id")
          .eq("id", ret.vendor_id)
          .single();
        if (vend) {
          await (supabase as any).from("notifications").insert({
            receiver_id: vend.user_id,
            receiver_role: "vendor",
            title: "Return Request Rejected",
            message: `Return request ${ret.return_number} for Order #${orderNum} has been rejected by admin.`,
            notification_type: "return_rejected",
            order_id: ret.order_id,
          });
        }

        // Trigger Emails
        try {
          const { sendReturnRejectedEmail } = await import("@/api/email.functions");
          await sendReturnRejectedEmail({
            data: {
              returnId: ret.id,
              returnNumber: ret.return_number,
              reason,
              customerId: ret.user_id,
              vendorId: ret.vendor_id,
            },
          });
        } catch (e) {
          console.warn("Mail dispatch failed:", e);
        }
      }
    },
    onSuccess: () => {
      refetch();
      setRejectionReason("");
      toast.success("Return request rejected.");
    },
    onError: (e) => toast.error(e.message),
  });

  // 5. Mutation: Update Return Status (Picked Up / Received)
  const updateReturnStatus = useMutation({
    mutationFn: async ({
      returnId,
      newStatus,
    }: {
      returnId: string;
      newStatus: "picked_up" | "received";
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const operatorId = user?.id || "";

      const { error: updateErr } = await supabase
        .from("returns")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", returnId);
      if (updateErr) throw updateErr;

      const actionText =
        newStatus === "picked_up"
          ? "Keepsake Picked Up by Courier"
          : "Keepsake Received at Warehouse";
      await supabase.from("return_timeline").insert({
        return_id: returnId,
        status: newStatus,
        actor_id: operatorId,
        actor_role: "admin",
        action: actionText,
        comments: `Status updated by System Operator.`,
      });

      const { data: ret } = await supabase
        .from("returns")
        .select("*, order:orders(order_number)")
        .eq("id", returnId)
        .single();
      if (ret) {
        // Notify Customer & Vendor
        const customerMsg =
          newStatus === "picked_up"
            ? `Your return package ${ret.return_number} has been picked up by the courier and is in transit.`
            : `Your return package ${ret.return_number} has been received at our inspection facility.`;

        await (supabase as any).from("notifications").insert({
          receiver_id: ret.user_id,
          receiver_role: "customer",
          title: newStatus === "picked_up" ? "Return Package Picked Up" : "Return Package Received",
          message: customerMsg,
          notification_type: `return_${newStatus}`,
          order_id: ret.order_id,
        });
      }
    },
    onSuccess: () => {
      refetch();
      toast.success("Return status updated successfully.");
    },
    onError: (e) => toast.error(e.message),
  });

  // 6. Mutation: Log Inspection Results
  const submitInspection = useMutation({
    mutationFn: async ({
      returnId,
      items,
    }: {
      returnId: string;
      items: typeof inspectionItems;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const operatorId = user?.id || "";

      for (const [itemId, data] of Object.entries(items)) {
        const { error } = await (supabase as any)
          .from("return_items")
          .update({
            inspect_status: data.inspect_status as any,
            inspect_notes: data.inspect_notes,
          })
          .eq("id", itemId);
        if (error) throw error;
      }

      await supabase.from("return_timeline").insert({
        return_id: returnId,
        status: "received",
        actor_id: operatorId,
        actor_role: "admin",
        action: "Warehouse Inspection Logged",
        comments: "Warehouse inspector verified item conditions.",
      });

      await supabase.from("return_comments").insert({
        return_id: returnId,
        author_id: operatorId,
        author_role: "admin",
        comment: `Inspection completed. All items checked by verification team.`,
        is_internal: true,
      });
    },
    onSuccess: () => {
      refetch();
      toast.success("Inspection log saved and updated!");
    },
    onError: (e) => toast.error(e.message),
  });

  // 7. Mutation: Execute Resolution (Refund / Replacement / Exchange)
  const executeResolution = useMutation({
    mutationFn: async ({
      returnId,
      resolution,
      data,
    }: {
      returnId: string;
      resolution: string;
      data: any;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const operatorId = user?.id || "";

      // 1. Fetch return request details
      const { data: ret, error: fetchErr } = await supabase
        .from("returns")
        .select("*, order:orders(*)")
        .eq("id", returnId)
        .single();
      if (fetchErr || !ret) throw new Error("Failed to load return details");

      // 2. Resolve based on type
      if (resolution === "refund") {
        const amountInCents = Math.round(parseFloat(data.amount) * 100);
        if (isNaN(amountInCents) || amountInCents <= 0) {
          throw new Error("Invalid refund amount cents");
        }

        // Simulate Razorpay Refund
        // Insert transaction record
        const { error: txErr } = await (supabase as any).from("transactions").insert({
          order_id: ret.order_id,
          payment_intent_id:
            (ret.order as any)?.payment_intent_id ||
            `sim-refund-${Math.random().toString(36).slice(2, 9)}`,
          amount_cents: amountInCents,
          currency: "INR",
          status: "success",
          type: "refund",
        });
        if (txErr) throw txErr;

        // Add timeline entry
        await supabase.from("return_timeline").insert({
          return_id: returnId,
          status: "completed",
          actor_id: operatorId,
          actor_role: "admin",
          action: "Refund Processed",
          comments: `Refund of ₹${data.amount} credit processed via simulated Razorpay transfer.`,
        });

        // Add comment
        await supabase.from("return_comments").insert({
          return_id: returnId,
          author_id: operatorId,
          author_role: "admin",
          comment: `Refund completed. An amount of ₹${data.amount} has been refunded to your original payment source.`,
          is_internal: false,
        });

        // Trigger Emails
        try {
          const { sendReturnRefundCompletedEmail } = await import("@/api/email.functions");
          await sendReturnRefundCompletedEmail({
            data: {
              returnId: ret.id,
              returnNumber: ret.return_number,
              amountCents: amountInCents,
              customerId: ret.user_id,
              vendorId: ret.vendor_id,
            },
          });
        } catch (e) {
          console.warn("Mail dispatch failed:", e);
        }
      } else if (resolution === "replacement") {
        if (!data.courier || !data.tracking) {
          throw new Error("Courier name and tracking number are required");
        }

        // Add timeline entry
        await supabase.from("return_timeline").insert({
          return_id: returnId,
          status: "completed",
          actor_id: operatorId,
          actor_role: "admin",
          action: "Replacement keepsake dispatched",
          comments: `New keepsake shipped via ${data.courier} (Tracking: ${data.tracking}).`,
        });

        // Add comment
        await supabase.from("return_comments").insert({
          return_id: returnId,
          author_id: operatorId,
          author_role: "admin",
          comment: `Replacement keepsake shipped! Courier: ${data.courier}, Tracking ID: ${data.tracking}.`,
          is_internal: false,
        });

        // Trigger Emails
        try {
          const { sendReturnReplacementShippedEmail } = await import("@/api/email.functions");
          await sendReturnReplacementShippedEmail({
            data: {
              returnId: ret.id,
              returnNumber: ret.return_number,
              courier: data.courier,
              trackingNumber: data.tracking,
              customerId: ret.user_id,
            },
          });
        } catch (e) {
          console.warn("Mail dispatch failed:", e);
        }
      } else if (resolution === "exchange") {
        // Add timeline entry
        await supabase.from("return_timeline").insert({
          return_id: returnId,
          status: "completed",
          actor_id: operatorId,
          actor_role: "admin",
          action: "Exchange keepsake processed",
          comments: "Alternative swap item delivered and verified by customer.",
        });

        // Add comment
        await supabase.from("return_comments").insert({
          return_id: returnId,
          author_id: operatorId,
          author_role: "admin",
          comment: `Exchange complete. Swap keepsake delivered and verified.`,
          is_internal: false,
        });

        // Trigger Emails
        try {
          const { sendReturnExchangeCompletedEmail } = await import("@/api/email.functions");
          await sendReturnExchangeCompletedEmail({
            data: {
              returnId: ret.id,
              returnNumber: ret.return_number,
              customerId: ret.user_id,
            },
          });
        } catch (e) {
          console.warn("Mail dispatch failed:", e);
        }
      }

      // Update return status to completed
      const { error: finalErr } = await supabase
        .from("returns")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", returnId);
      if (finalErr) throw finalErr;

      // Notify Customer & Vendor
      await (supabase as any).from("notifications").insert({
        receiver_id: ret.user_id,
        receiver_role: "customer",
        title: "Return Resolution Completed",
        message: `Your return request ${ret.return_number} has been resolved successfully via ${resolution}.`,
        notification_type: "return_completed",
        order_id: ret.order_id,
      });
    },
    onSuccess: () => {
      refetch();
      setRefundAmountInr("");
      setReplacementTracking("");
      toast.success("Return resolution finalized and closed!");
    },
    onError: (e) => toast.error(e.message),
  });

  // 8. Mutation: Add Admin Comment
  const addAdminComment = useMutation({
    mutationFn: async ({
      returnId,
      comment,
      isInternal,
    }: {
      returnId: string;
      comment: string;
      isInternal: boolean;
    }) => {
      if (!comment.trim()) throw new Error("Comment text is required");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const operatorId = user?.id || "";

      const { error } = await supabase.from("return_comments").insert({
        return_id: returnId,
        author_id: operatorId,
        author_role: "admin",
        comment: comment,
        is_internal: isInternal,
      });
      if (error) throw error;

      await supabase.from("return_timeline").insert({
        return_id: returnId,
        status: "comment_added",
        actor_id: operatorId,
        actor_role: "admin",
        action: isInternal ? "Operator Added Internal Note" : "Operator Commented",
        comments: comment.substring(0, 100) + (comment.length > 100 ? "..." : ""),
      });

      // Notify Customer & Vendor (if public)
      if (!isInternal) {
        const { data: ret } = await supabase
          .from("returns")
          .select("user_id, vendor_id, return_number")
          .eq("id", returnId)
          .single();
        if (ret) {
          // Notify Customer
          await (supabase as any).from("notifications").insert({
            receiver_id: ret.user_id,
            receiver_role: "customer",
            title: "New Message on Return Request",
            message: `Admin added a comment on Return Request ${ret.return_number}.`,
            notification_type: "return_comment",
            order_id: null,
          });

          // Notify Vendor
          const { data: vend } = await supabase
            .from("vendors")
            .select("user_id")
            .eq("id", ret.vendor_id)
            .single();
          if (vend) {
            await (supabase as any).from("notifications").insert({
              receiver_id: vend.user_id,
              receiver_role: "vendor",
              title: "New Message on Return Request",
              message: `Admin added a comment on Return Request ${ret.return_number}.`,
              notification_type: "return_comment",
              order_id: null,
            });
          }
        }
      }
    },
    onSuccess: () => {
      refetch();
      setNewComment("");
      toast.success("Comment posted successfully!");
    },
    onError: (e) => toast.error(e.message),
  });

  // Analytics Computations
  const stats = useMemo(() => {
    const total = returns.length;
    const pending = returns.filter((r) =>
      ["pending", "vendor_review", "admin_review"].includes(r.status),
    ).length;
    const active = returns.filter((r) =>
      ["approved", "picked_up", "received"].includes(r.status),
    ).length;
    const completed = returns.filter((r) => r.status === "completed").length;

    // Group return volume by month (Recharts Area Chart)
    const monthlyMap: Record<string, number> = {};
    returns.forEach((r) => {
      const date = new Date(r.created_at);
      const label = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      monthlyMap[label] = (monthlyMap[label] || 0) + 1;
    });

    const chartData = Object.entries(monthlyMap)
      .map(([name, count]) => ({
        name,
        requests: count,
      }))
      .reverse();

    // Group by resolution type (Recharts Bar Chart)
    const resolutionMap: Record<string, number> = { refund: 0, replacement: 0, exchange: 0 };
    returns.forEach((r) => {
      if (resolutionMap[r.preferred_resolution] !== undefined) {
        resolutionMap[r.preferred_resolution]++;
      }
    });

    const resolutionData = Object.entries(resolutionMap).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
    }));

    return { total, pending, active, completed, chartData, resolutionData };
  }, [returns]);

  // Filter returns
  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const matchesSearch =
        r.return_number.toLowerCase().includes(search.toLowerCase()) ||
        (r.profile?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
        ((r.profile as any)?.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.vendor?.store_name || "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesResolution =
        resolutionFilter === "all" || r.preferred_resolution === resolutionFilter;
      const matchesPriority = priorityFilter === "all" || r.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesResolution && matchesPriority;
    });
  }, [returns, search, statusFilter, resolutionFilter, priorityFilter]);

  // CSV Data Export builder
  const handleExportCSV = () => {
    if (filteredReturns.length === 0) {
      toast.error("No return records to export.");
      return;
    }

    const headers = [
      "Return Number",
      "Order Number",
      "Customer Email",
      "Vendor Name",
      "Preferred Resolution",
      "Status",
      "Priority",
      "Request Date",
      "Pickup Address",
    ];
    const rows = filteredReturns.map((r) => [
      r.return_number,
      r.order?.order_number || "N/A",
      (r.profile as any)?.email || "N/A",
      r.vendor?.store_name || "N/A",
      r.preferred_resolution.toUpperCase(),
      r.status.toUpperCase(),
      r.priority.toUpperCase(),
      new Date(r.created_at).toLocaleDateString(),
      ((r.pickup_address as any)?.address || "").replace(/"/g, '""'),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `viacraft_returns_export_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded successfully!");
  };

  const activeReturnDetail = useMemo(() => {
    if (!selectedReturnId) return null;
    return returns.find((r) => r.id === selectedReturnId) || null;
  }, [returns, selectedReturnId]);

  // Setup inspection default values
  const handleOpenDetailModal = (r: any) => {
    setSelectedReturnId(r.id);
    const initialItems: any = {};
    r.return_items?.forEach((it: any) => {
      initialItems[it.id] = {
        inspect_status: it.inspect_status || "pending",
        inspect_notes: it.inspect_notes || "",
      };
    });
    setInspectionItems(initialItems);
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 text-slate-100 font-sans">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight text-white">
            Keepsakes Returns Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Perform catalog inspection checks, issue Razorpay refunds, dispatch replacements, and
            resolve multi-vendor claims.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-800 hover:border-amber-500/30 text-white rounded-xl text-xs font-semibold cursor-pointer shadow transition-all"
        >
          <FileDown className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Analytics Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[
          {
            label: "Total Requests",
            value: stats.total,
            color: "text-amber-500",
            bg: "bg-amber-500/10 border-amber-500/20",
          },
          {
            label: "Pending Action",
            value: stats.pending,
            color: "text-rose-500",
            bg: "bg-rose-500/10 border-rose-500/20",
          },
          {
            label: "Active Resolutions",
            value: stats.active,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10 border-indigo-500/20",
          },
          {
            label: "Total Refunds Processed",
            value: `₹${(refundTotal / 100).toLocaleString()}`,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10 border-emerald-500/20",
          },
        ].map((stat, i) => (
          <div key={i} className={`p-5 border rounded-2xl ${stat.bg} space-y-1`}>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              {stat.label}
            </p>
            <p className={`text-2xl font-semibold tracking-tight ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recharts Analytics Charts */}
      {returns.length > 0 && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" /> Monthly Returns Volume
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.chartData}
                  margin={{ left: -20, right: 10, top: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="requestsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      color: "#fff",
                      fontSize: 11,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#requestsGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-500" /> Resolution Type Breakdown
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.resolutionData}
                  margin={{ left: -20, right: 10, top: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      color: "#fff",
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]}>
                    {stats.resolutionData.map((entry, index) => {
                      const colors = ["#8b5cf6", "#3b82f6", "#10b981"];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Control bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900 border border-slate-800 p-5 rounded-3xl">
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-white focus:border-amber-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="vendor_review">Vendor Review</option>
            <option value="admin_review">Admin Review</option>
            <option value="approved">Approved</option>
            <option value="picked_up">Picked Up</option>
            <option value="received">Received</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Resolution Filter */}
          <select
            value={resolutionFilter}
            onChange={(e) => setResolutionFilter(e.target.value)}
            className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-white focus:border-amber-500 cursor-pointer"
          >
            <option value="all">All Resolutions</option>
            <option value="refund">Refunds</option>
            <option value="replacement">Replacements</option>
            <option value="exchange">Exchanges</option>
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-white focus:border-amber-500 cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
        </div>

        {/* Text Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search return requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:border-amber-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Data Table */}
      {filteredReturns.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-3xl bg-slate-900/40">
          <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-3" />
          <p className="text-xs text-slate-400 italic">
            No return requests found matching filters.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 font-bold uppercase tracking-wider text-[10px] text-slate-400">
                  <th className="p-4">Return ID</th>
                  <th className="p-4">Customer Email</th>
                  <th className="p-4">Vendor Partner</th>
                  <th className="p-4">Resolution Type</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Request Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {filteredReturns.map((r) => {
                  return (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-mono font-bold text-amber-500">{r.return_number}</td>
                      <td className="p-4 text-slate-300">
                        <p className="font-semibold text-slate-200">
                          {r.profile?.full_name || "Collector"}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {(r.profile as any)?.email}
                        </p>
                      </td>
                      <td className="p-4 text-slate-300">
                        {r.vendor?.store_name || "Artesian Vendor"}
                      </td>
                      <td className="p-4">
                        <span className="uppercase text-[10px] font-semibold text-slate-400">
                          {r.preferred_resolution}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${
                            r.priority === "high"
                              ? "bg-red-500/10 text-red-500 border-red-500/20"
                              : r.priority === "medium"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                          }`}
                        >
                          {r.priority}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            r.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : r.status === "rejected"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : ["pending", "vendor_review", "admin_review"].includes(r.status)
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {r.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleOpenDetailModal(r)}
                          className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg uppercase tracking-wider text-[9px] transition-colors cursor-pointer"
                        >
                          Review &amp; Resolve
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Detailed Action Modal */}
      {activeReturnDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 shadow-2xl rounded-3xl p-6 sm:p-8 z-10 animate-in zoom-in-95 duration-200 text-xs flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-500" /> Return Inspection &amp; Settlement
                  Panel
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  ID:{" "}
                  <span className="font-mono text-amber-500 font-semibold">
                    {activeReturnDetail.return_number}
                  </span>{" "}
                  &bull; Collector: {activeReturnDetail.profile?.full_name} (
                  {(activeReturnDetail.profile as any)?.email})
                </p>
              </div>
              <button
                onClick={() => setSelectedReturnId(null)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Content Scroll Grid */}
            <div className="grid md:grid-cols-12 gap-6 overflow-y-auto flex-1 pr-1">
              {/* Left Side: Information & Warehouse Inspection checks */}
              <div className="md:col-span-7 space-y-5">
                {/* Details Summary card */}
                <div className="grid sm:grid-cols-2 gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                      Status
                    </p>
                    <span className="inline-block mt-1 font-semibold text-white uppercase tracking-wide">
                      {activeReturnDetail.status.replace("_", " ")}
                    </span>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                      Preferred Resolution
                    </p>
                    <span className="inline-block mt-1 font-semibold text-amber-500 uppercase">
                      {activeReturnDetail.preferred_resolution}
                    </span>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                      Contact Phone
                    </p>
                    <p className="mt-1 font-medium text-slate-300">{activeReturnDetail.phone}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                      Pickup Address
                    </p>
                    <p
                      className="mt-1 font-medium text-slate-300 line-clamp-2"
                      title={(activeReturnDetail.pickup_address as any)?.address}
                    >
                      {(activeReturnDetail.pickup_address as any)?.address}
                    </p>
                  </div>
                </div>

                {/* Evidence Media proof previews */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                    Collector Uploaded Evidence
                  </h4>
                  <div className="flex flex-wrap gap-2.5">
                    {activeReturnDetail.return_images?.length === 0 &&
                      !activeReturnDetail.video_url && (
                        <p className="text-[10px] text-slate-500 italic">
                          No media evidence uploaded.
                        </p>
                      )}
                    {activeReturnDetail.return_images?.map((img: any) => (
                      <a
                        key={img.id}
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-16 w-16 rounded-xl border border-slate-800 overflow-hidden group relative shrink-0"
                      >
                        <img
                          src={img.url}
                          alt="Evidence"
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </a>
                    ))}
                    {activeReturnDetail.video_url && (
                      <video
                        src={activeReturnDetail.video_url}
                        controls
                        className="h-32 max-w-xs rounded-xl border border-slate-800 bg-black object-contain shrink-0"
                      />
                    )}
                  </div>
                </div>

                {/* Inspection Check Form */}
                <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                      Warehouse Inspect Verification
                    </h4>
                    <span className="text-[9px] text-slate-500 uppercase font-semibold">
                      Inspect and catalog keepsake condition
                    </span>
                  </div>

                  <div className="space-y-3 divide-y divide-slate-800/60">
                    {activeReturnDetail.return_items?.map((item: any) => {
                      const itemInspect = inspectionItems[item.id] || {
                        inspect_status: "pending",
                        inspect_notes: "",
                      };
                      return (
                        <div key={item.id} className="pt-3 first:pt-0 space-y-2">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <p className="font-semibold text-slate-200">
                                {item.order_item?.title || "Keepsake Item"}
                              </p>
                              <p className="text-[9px] text-slate-500 mt-0.5">
                                Return Qty: {item.quantity} &bull; Reason: {item.reason}
                              </p>
                            </div>

                            {/* Inspect Status */}
                            <select
                              value={itemInspect.inspect_status}
                              disabled={["completed", "rejected"].includes(
                                activeReturnDetail.status,
                              )}
                              onChange={(e) => {
                                setInspectionItems((prev) => ({
                                  ...prev,
                                  [item.id]: { ...itemInspect, inspect_status: e.target.value },
                                }));
                              }}
                              className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] outline-none text-white focus:border-amber-500 cursor-pointer font-bold"
                            >
                              <option value="pending">PENDING VERIFICATION</option>
                              <option value="acceptable">ACCEPTABLE CONDITION</option>
                              <option value="damaged">DAMAGED BY CUSTOMER</option>
                              <option value="missing">MISSING ACCESSORIES</option>
                              <option value="wrong_item">WRONG ITEM RETURNED</option>
                            </select>
                          </div>

                          <input
                            type="text"
                            placeholder="Add verification notes, catalog remarks..."
                            disabled={["completed", "rejected"].includes(activeReturnDetail.status)}
                            value={itemInspect.inspect_notes}
                            onChange={(e) => {
                              setInspectionItems((prev) => ({
                                ...prev,
                                [item.id]: { ...itemInspect, inspect_notes: e.target.value },
                              }));
                            }}
                            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg outline-none text-[10px] text-white"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {!["completed", "rejected"].includes(activeReturnDetail.status) && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          submitInspection.mutate({
                            returnId: activeReturnDetail.id,
                            items: inspectionItems,
                          })
                        }
                        disabled={submitInspection.isPending}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase cursor-pointer"
                      >
                        {submitInspection.isPending ? "Saving..." : "Save Inspection Results"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Return Workflow actions (Conditional on Status) */}
                <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-amber-500">
                    SOP Actions Panel
                  </h4>

                  {/* Stage 1: Pending approval */}
                  {["pending", "vendor_review", "admin_review"].includes(
                    activeReturnDetail.status,
                  ) && (
                    <div className="space-y-4">
                      {/* Approve Form */}
                      <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-500 block">
                            Courier Partner
                          </label>
                          <select
                            value={pickupCourier}
                            onChange={(e) => setPickupCourier(e.target.value)}
                            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl outline-none text-white text-[11px]"
                          >
                            <option value="Delhivery">Delhivery</option>
                            <option value="BlueDart">BlueDart</option>
                            <option value="DTDC">DTDC</option>
                            <option value="Shadowfax">Shadowfax</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-500 block">
                            Schedule Pickup Date
                          </label>
                          <input
                            type="date"
                            value={pickupDate}
                            onChange={(e) => setPickupDate(e.target.value)}
                            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl outline-none text-white text-[11px]"
                          />
                        </div>
                        <div className="sm:col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              approveReturn.mutate({
                                returnId: activeReturnDetail.id,
                                courier: pickupCourier,
                                date: pickupDate,
                              })
                            }
                            disabled={approveReturn.isPending}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold uppercase cursor-pointer"
                          >
                            Approve &amp; Schedule Pickup
                          </button>
                        </div>
                      </div>

                      {/* Reject Form */}
                      <div className="pt-4 border-t border-slate-800 space-y-2">
                        <label className="text-[9px] uppercase font-bold text-slate-500 block">
                          Rejection Reason
                        </label>
                        <textarea
                          placeholder="Why is this request being rejected? Customer and vendor will receive this note..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full min-h-[60px] p-2 bg-slate-900 border border-slate-800 rounded-xl outline-none text-white text-[11px] resize-none"
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              rejectReturn.mutate({
                                returnId: activeReturnDetail.id,
                                reason: rejectionReason,
                              })
                            }
                            disabled={rejectReturn.isPending}
                            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-bold uppercase cursor-pointer"
                          >
                            Reject Return Request
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stage 2: Approved, scheduling pickup or pickup completed */}
                  {activeReturnDetail.status === "approved" && (
                    <div className="flex gap-3 justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          updateReturnStatus.mutate({
                            returnId: activeReturnDetail.id,
                            newStatus: "picked_up",
                          })
                        }
                        disabled={updateReturnStatus.isPending}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1"
                      >
                        <Truck className="h-4 w-4" /> Mark as Picked Up
                      </button>
                    </div>
                  )}

                  {/* Stage 3: Picked up, in transit to warehouse */}
                  {activeReturnDetail.status === "picked_up" && (
                    <div className="flex gap-3 justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          updateReturnStatus.mutate({
                            returnId: activeReturnDetail.id,
                            newStatus: "received",
                          })
                        }
                        disabled={updateReturnStatus.isPending}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1"
                      >
                        <Layers className="h-4 w-4" /> Mark as Received &amp; Inspected
                      </button>
                    </div>
                  )}

                  {/* Stage 4: Received/Inspected, executing resolution */}
                  {activeReturnDetail.status === "received" && (
                    <div className="space-y-4 pt-2 border-t border-slate-800">
                      {activeReturnDetail.preferred_resolution === "refund" && (
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-slate-400 block">
                            Issue Razorpay Simulated Refund *
                          </label>
                          <div className="flex gap-2.5">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-2.5 text-slate-500 font-semibold">
                                ₹
                              </span>
                              <input
                                type="number"
                                placeholder="Enter refund amount (e.g. 5000)"
                                value={refundAmountInr}
                                onChange={(e) => setRefundAmountInr(e.target.value)}
                                className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl outline-none text-white text-[11px]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (!refundAmountInr) {
                                  toast.error("Please enter a refund amount.");
                                  return;
                                }
                                executeResolution.mutate({
                                  returnId: activeReturnDetail.id,
                                  resolution: "refund",
                                  data: { amount: refundAmountInr },
                                });
                              }}
                              disabled={executeResolution.isPending}
                              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1 shadow-md shadow-emerald-500/10"
                            >
                              <CreditCard className="h-4 w-4" /> Process Refund
                            </button>
                          </div>
                        </div>
                      )}

                      {activeReturnDetail.preferred_resolution === "replacement" && (
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-slate-500 block">
                              Courier Name *
                            </label>
                            <input
                              type="text"
                              value={replacementCourier}
                              onChange={(e) => setReplacementCourier(e.target.value)}
                              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl outline-none text-white text-[11px]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-slate-500 block">
                              Tracking ID *
                            </label>
                            <input
                              type="text"
                              placeholder="Enter shipment tracking number..."
                              value={replacementTracking}
                              onChange={(e) => setReplacementTracking(e.target.value)}
                              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl outline-none text-white text-[11px]"
                            />
                          </div>
                          <div className="sm:col-span-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                if (!replacementTracking) {
                                  toast.error("Please add a tracking number.");
                                  return;
                                }
                                executeResolution.mutate({
                                  returnId: activeReturnDetail.id,
                                  resolution: "replacement",
                                  data: {
                                    courier: replacementCourier,
                                    tracking: replacementTracking,
                                  },
                                });
                              }}
                              disabled={executeResolution.isPending}
                              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-[10px] font-bold uppercase cursor-pointer"
                            >
                              Dispatch Replacement keepsakes
                            </button>
                          </div>
                        </div>
                      )}

                      {activeReturnDetail.preferred_resolution === "exchange" && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                confirm(
                                  "Are you sure the exchange keepsake has been delivered and checked?",
                                )
                              ) {
                                executeResolution.mutate({
                                  returnId: activeReturnDetail.id,
                                  resolution: "exchange",
                                  data: {},
                                });
                              }
                            }}
                            disabled={executeResolution.isPending}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase cursor-pointer"
                          >
                            Mark Exchange Order as Complete
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stage 5: Completed or Rejected */}
                  {["completed", "rejected"].includes(activeReturnDetail.status) && (
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400 italic">
                      This return request has been resolved and closed.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Timeline & Multi-User Discussions (with Internal notes toggle) */}
              <div className="md:col-span-5 flex flex-col gap-4 overflow-hidden">
                {/* Timeline display */}
                <div className="border border-slate-800 rounded-2xl p-4 bg-slate-950/30 max-h-[220px] overflow-y-auto space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
                    Tracking Logs
                  </h4>
                  <div className="relative pl-4 border-l border-slate-800 space-y-4">
                    {activeReturnDetail.return_timeline?.map((step: any) => (
                      <div key={step.id} className="relative">
                        <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-amber-500" />
                        <p className="font-bold text-[10px] text-white">{step.action}</p>
                        <p className="text-[9px] text-slate-500">
                          {new Date(step.created_at).toLocaleString()} &bull;{" "}
                          {step.actor_role.toUpperCase()}
                        </p>
                        {step.comments && (
                          <p className="text-[9px] text-slate-400 bg-slate-900/50 p-1.5 rounded-lg border border-slate-800 mt-1 italic">
                            "{step.comments}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conversation discussion thread */}
                <div className="flex-1 flex flex-col border border-slate-800 rounded-2xl bg-slate-950/30 overflow-hidden min-h-[260px]">
                  <div className="flex justify-between items-center border-b border-slate-800 p-3 bg-slate-900/40">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                      Resolution Hub Chat
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="isInternalOpt"
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                        className="h-3 w-3 rounded text-amber-500 border-slate-800 focus:ring-amber-500 cursor-pointer"
                      />
                      <label
                        htmlFor="isInternalOpt"
                        className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 cursor-pointer select-none"
                      >
                        Internal Note
                      </label>
                    </div>
                  </div>

                  {/* Messages feed */}
                  <div className="flex-1 p-3 overflow-y-auto space-y-2.5 max-h-[220px]">
                    {activeReturnDetail.return_comments?.length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic text-center py-8">
                        No conversation messages logged. Add a comment below.
                      </p>
                    ) : (
                      activeReturnDetail.return_comments?.map((c: any) => {
                        const isOperator = c.author_role === "admin";
                        return (
                          <div
                            key={c.id}
                            className={`flex flex-col max-w-[85%] ${isOperator ? "ml-auto items-end" : "mr-auto items-start"}`}
                          >
                            <span className="text-[8px] text-slate-500 font-bold uppercase px-1">
                              {c.author_role.toUpperCase()}{" "}
                              {c.is_internal && (
                                <span className="text-amber-500 font-semibold">(INTERNAL)</span>
                              )}
                            </span>
                            <div
                              className={`p-2.5 rounded-2xl text-[10px] leading-relaxed border ${
                                isOperator
                                  ? c.is_internal
                                    ? "bg-amber-500/10 text-amber-200 border-amber-500/20 rounded-tr-none"
                                    : "bg-slate-800 text-slate-100 border-slate-700 rounded-tr-none"
                                  : "bg-slate-900 text-slate-300 border-slate-800 rounded-tl-none"
                              }`}
                            >
                              {c.comment}
                            </div>
                            <span className="text-[8px] text-slate-500 mt-0.5 px-1">
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
                      if (!newComment.trim()) return;
                      addAdminComment.mutate({
                        returnId: activeReturnDetail.id,
                        comment: newComment,
                        isInternal: isInternalComment,
                      });
                    }}
                    className="p-2 border-t border-slate-800 flex gap-2 items-center bg-slate-900/20"
                  >
                    <input
                      type="text"
                      placeholder={
                        isInternalComment
                          ? "Type private internal admin notes..."
                          : "Type public comments visible to customer/vendor..."
                      }
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 p-2 bg-slate-900 border border-slate-800 rounded-xl focus:border-amber-500 outline-none text-[11px] text-white"
                    />
                    <button
                      type="submit"
                      disabled={addAdminComment.isPending || !newComment.trim()}
                      className="px-4.5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-[10px] uppercase cursor-pointer"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
