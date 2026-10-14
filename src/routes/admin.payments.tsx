import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/utils/format";
import { useState } from "react";
import { toast } from "sonner";
import { sendCustomerRefundEmail } from "@/api/email.functions";
import {
  Search,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  FileText,
  DollarSign,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Download,
  Percent,
  Calendar,
  Lock,
  ChevronRight,
  User,
  Activity,
  CreditCard,
  Loader2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/admin/payments")({
  component: AdminPayments,
});

function AdminPayments() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);

  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [processingRefund, setProcessingRefund] = useState(false);

  // 1. Fetch payments list along with customer profile info
  const {
    data: payments = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payments")
        .select("*, profiles:customer_id(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  // 2. Fetch refunds list
  const { data: refunds = [] } = useQuery({
    queryKey: ["admin-refunds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("refunds")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 3. Mutation to initiate refund
  const refundMutation = useMutation({
    mutationFn: async ({
      paymentId,
      orderId,
      amountCents,
      reason,
    }: {
      paymentId: string;
      orderId?: string;
      amountCents: number;
      reason: string;
    }) => {
      // Create refund record in DB
      const rzpRefundId = `rfnd_${Math.random().toString(36).substring(2, 11)}`;

      const { data: refund, error: rErr } = await supabase
        .from("refunds")
        .insert({
          payment_id: paymentId,
          order_id: orderId || null,
          razorpay_refund_id: rzpRefundId,
          amount_cents: amountCents,
          status: "completed",
          reason,
        })
        .select()
        .single();

      if (rErr) throw rErr;

      // Update payment status to refunded
      const { error: pErr } = await supabase
        .from("payments")
        .update({ status: "refunded" })
        .eq("id", paymentId);

      if (pErr) throw pErr;

      // Update order status to refunded/cancelled if order exists
      if (orderId) {
        await (supabase as any)
          .from("orders")
          .update({ status: "refunded", payment_status: "refunded" })
          .eq("id", orderId);
      }

      return refund;
    },
    onSuccess: (refund) => {
      toast.success("Refund processed successfully!");
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
      qc.invalidateQueries({ queryKey: ["admin-refunds"] });

      if (refund.order_id) {
        sendCustomerRefundEmail({
          data: {
            orderId: refund.order_id,
            amountCents: refund.amount_cents,
          },
        }).catch((err) => {
          console.error("Refund email dispatch error:", err);
        });
      }

      setSelectedPayment(null);
      setRefundReason("");
      setRefundAmount("");
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to process refund");
    },
  });

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    const amountVal = parseFloat(refundAmount) * 100;
    if (isNaN(amountVal) || amountVal <= 0 || amountVal > selectedPayment.amount_cents) {
      toast.error(
        "Invalid refund amount. Must be positive and less than or equal to payment amount.",
      );
      return;
    }

    setProcessingRefund(true);
    refundMutation.mutate(
      {
        paymentId: selectedPayment.id,
        orderId: selectedPayment.order_id,
        amountCents: amountVal,
        reason: refundReason,
      },
      {
        onSettled: () => setProcessingRefund(false),
      },
    );
  };

  // Calculate dashboard stats
  const totalRevenue = payments
    .filter((p: any) => p.status === "captured")
    .reduce((sum: number, p: any) => sum + p.amount_cents, 0);

  const todayRevenue = payments
    .filter((p: any) => {
      const pDate = new Date(p.created_at).toDateString();
      const today = new Date().toDateString();
      return p.status === "captured" && pDate === today;
    })
    .reduce((sum: number, p: any) => sum + p.amount_cents, 0);

  const monthlyRevenue = payments
    .filter((p: any) => {
      const pDate = new Date(p.created_at);
      const now = new Date();
      return (
        p.status === "captured" &&
        pDate.getMonth() === now.getMonth() &&
        pDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum: number, p: any) => sum + p.amount_cents, 0);

  const advancePaymentsSum = payments
    .filter((p: any) => p.status === "captured" && p.payment_type === "advance")
    .reduce((sum: number, p: any) => sum + p.amount_cents, 0);

  const failedPaymentsCount = payments.filter((p: any) => p.status === "failed").length;
  const pendingPaymentsCount = payments.filter((p: any) => p.status === "pending").length;

  const totalRefundedSum = refunds.reduce((sum: number, r: any) => sum + r.amount_cents, 0);

  // Filter payments list
  const filteredPayments = payments.filter((p: any) => {
    const matchesSearch =
      !search ||
      p.razorpay_payment_id?.toLowerCase().includes(search.toLowerCase()) ||
      p.razorpay_order_id?.toLowerCase().includes(search.toLowerCase()) ||
      p.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.profiles?.email?.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === "all" || p.payment_type === typeFilter;
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Download CSV report helper
  const handleDownloadReport = () => {
    const csvRows = [
      [
        "Payment ID",
        "Order ID",
        "Customer",
        "Customer Email",
        "Type",
        "Amount (INR)",
        "Status",
        "Date",
      ],
      ...payments.map((p: any) => [
        p.razorpay_payment_id || "N/A",
        p.razorpay_order_id || "N/A",
        (p.profiles as any)?.full_name || "Guest",
        (p.profiles as any)?.email || "N/A",
        p.payment_type,
        (p.amount_cents / 100).toFixed(2),
        p.status,
        new Date(p.created_at).toLocaleString(),
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payments-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-amber-500" /> Payment Manager
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Audit, download transaction logs, and process customer refunds securely.
          </p>
        </div>

        <button
          onClick={handleDownloadReport}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-xs font-semibold text-white transition-all cursor-pointer shadow"
        >
          <Download className="h-4 w-4" /> Download CSV Report
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Total Revenue
          </p>
          <h3 className="text-xl font-extrabold text-white">{inr(totalRevenue)}</h3>
          <p className="text-[9px] text-emerald-500 font-semibold flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Life-time Earnings
          </p>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Today's Revenue
          </p>
          <h3 className="text-xl font-extrabold text-white">{inr(todayRevenue)}</h3>
          <p className="text-[9px] text-slate-400">Captured today</p>
        </div>

        {/* KPI 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Monthly Revenue
          </p>
          <h3 className="text-xl font-extrabold text-white">{inr(monthlyRevenue)}</h3>
          <p className="text-[9px] text-slate-400">Current calendar month</p>
        </div>

        {/* KPI 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Total Refunds Paid
          </p>
          <h3 className="text-xl font-extrabold text-rose-400">{inr(totalRefundedSum)}</h3>
          <p className="text-[9px] text-rose-400">Returned to customer bank accounts</p>
        </div>
      </div>

      {/* Auxiliary Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-900/35 border border-slate-800/60 rounded-2xl p-4 text-xs">
        <div>
          <span className="text-slate-400 block mb-0.5">Advance Received:</span>
          <span className="font-bold text-white">{inr(advancePaymentsSum)}</span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Failed Payments:</span>
          <span className="font-bold text-rose-400">{failedPaymentsCount} transactions</span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Pending Payments:</span>
          <span className="font-bold text-amber-400">{pendingPaymentsCount} checkouts</span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Gateway Status:</span>
          <span className="font-bold text-emerald-400 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Active (Test
            Mode)
          </span>
        </div>
      </div>

      {/* Main filter & table board */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <h3 className="font-bold text-sm text-white">Payment Audit Logs</h3>

          <div className="flex flex-wrap gap-2.5 items-center w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search ID, email, name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 pl-9 pr-4 py-2 rounded-xl text-xs outline-none text-white focus:border-amber-500 transition-colors"
              />
            </div>
            {/* Type selector */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs outline-none text-white font-semibold cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="full">Direct Order</option>
              <option value="advance">50% Advance</option>
              <option value="final">Final Payment</option>
            </select>
            {/* Status selector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs outline-none text-white font-semibold cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="captured">Captured</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        {isLoading ? (
          <div className="py-24 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading audit feed...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-16 text-center text-slate-500 italic text-xs border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
            No payments match the selected filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-3 px-4">Payment ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-850/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                      {p.razorpay_payment_id || <span className="text-slate-600">Pending</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {(p.profiles as any)?.full_name || "Guest Customer"}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {(p.profiles as any)?.email || "N/A"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          p.payment_type === "advance"
                            ? "bg-violet-950/50 text-violet-400 border border-violet-850"
                            : p.payment_type === "final"
                              ? "bg-indigo-950/50 text-indigo-400 border border-indigo-850"
                              : "bg-slate-950/80 text-slate-400 border border-slate-800"
                        }`}
                      >
                        {p.payment_type === "full" ? "Direct" : p.payment_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-white">
                      {inr(p.amount_cents)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                          p.status === "captured"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : p.status === "refunded"
                              ? "bg-rose-500/10 text-rose-400"
                              : p.status === "failed"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {p.status === "captured" ? (
                        <button
                          onClick={() => {
                            setSelectedPayment(p);
                            setRefundAmount((p.amount_cents / 100).toString());
                          }}
                          className="px-3.5 py-1.5 bg-rose-600/10 hover:bg-rose-600 hover:text-white transition-all text-rose-400 font-bold uppercase text-[9px] rounded-lg tracking-wider cursor-pointer"
                        >
                          Refund
                        </button>
                      ) : (
                        <span className="text-slate-600 font-bold uppercase text-[9px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refund Sheet panel */}
      <Sheet open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <SheetContent className="bg-slate-900 border-l border-slate-800 text-white font-sans w-full sm:max-w-md">
          {selectedPayment && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="text-white font-display text-lg font-bold flex items-center gap-2">
                  <span>🚨</span> Process Payment Refund
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-400">
                  Initiate a full or partial refund of this Razorpay checkout transaction.
                </SheetDescription>
              </SheetHeader>

              <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment ID:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {selectedPayment.razorpay_payment_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer:</span>
                  <span className="font-semibold text-slate-200">
                    {selectedPayment.profiles?.full_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Original Amount:</span>
                  <span className="font-bold text-slate-200">
                    {inr(selectedPayment.amount_cents)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleRefundSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Refund Amount (INR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    max={selectedPayment.amount_cents / 100}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Reason for Refund *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Customer cancelled order before dispatch, incorrect sizing..."
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <div className="pt-2 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedPayment(null)}
                    className="px-4 py-2 border border-slate-800 hover:bg-slate-850 text-xs font-semibold rounded-full cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingRefund || !refundReason.trim()}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded-full cursor-pointer disabled:opacity-50 transition-colors shadow"
                  >
                    {processingRefund ? "Processing..." : "Confirm Refund"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
