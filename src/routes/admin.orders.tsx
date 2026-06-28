import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/utils/format";
import { useState } from "react";
import { toast } from "sonner";
import { sendOrderStatusEmail, sendCustomerRefundEmail } from "@/api/email.functions";
import {
  Search,
  ShoppingBag,
  Loader2,
  Eye,
  CheckCircle,
  Truck,
  Package,
  XCircle,
  Undo2,
  DollarSign,
  User,
  MapPin,
  Calendar,
  Percent,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

function AdminOrders() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Fetch profiles separately to zip in JS (bypassing direct join query errors)
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles-brief"],
    queryFn: async () =>
      (await supabase.from("profiles").select("id, full_name, phone")).data ?? [],
  });

  // Fetch orders with items (including vendor store names)
  const { data: rawOrders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, vendors(*))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Zip orders with profiles
  const orders = rawOrders.map((o) => ({
    ...o,
    profiles: profiles.find((p) => p.id === o.user_id) || null,
  }));

  // Fetch platform settings for commission calculation
  const { data: settings } = useQuery({
    queryKey: ["admin-platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("commission_percentage")
        .eq("id", "default")
        .maybeSingle();
      if (error) throw error;
      return data ?? { commission_percentage: 10.0 };
    },
  });

  const commissionRate = settings?.commission_percentage ?? 10.0;

  // Status update mutation
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: status as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard-orders"] });
      toast.success("Order status updated successfully");
      if (selectedOrder && selectedOrder.id === variables.id) {
        setSelectedOrder((prev: any) => ({ ...prev, status: variables.status }));
      }

      if (variables.status === "shipped" || variables.status === "delivered") {
        sendOrderStatusEmail({
          data: {
            orderId: variables.id,
            status: variables.status,
          },
        }).catch((err) => {
          console.error("Order status update email trigger failure", err);
        });
      } else if (variables.status === "refunded") {
        const order = rawOrders.find((o) => o.id === variables.id);
        const amountCents = order ? order.total_cents : 0;
        sendCustomerRefundEmail({
          data: {
            orderId: variables.id,
            amountCents,
          },
        }).catch((err) => {
          console.error("Refund email trigger failure", err);
        });
      }
    },
    onError: (e) => toast.error(e.message),
  });

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.profiles?.full_name &&
        o.profiles.full_name.toLowerCase().includes(search.toLowerCase())) ||
      o.order_items?.some((item: any) => item.title.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" ? true : o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-amber-500 mb-2 font-semibold">
          Transactions
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Order Management</h1>
        <p className="text-sm text-slate-400 mt-2">
          Track marketplace orders, manage statuses, process refunds, and monitor platform fees.
        </p>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by order #, customer name, or item title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none transition-colors"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          {[
            "all",
            "pending",
            "paid",
            "processing",
            "shipped",
            "delivered",
            "cancelled",
            "refunded",
          ].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                statusFilter === status
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      {loadingOrders ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <ShoppingBag className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="font-semibold text-lg text-slate-400">No orders found</p>
          <p className="text-sm text-slate-500 mt-1">
            Try modifying your search query or status filter.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-4 px-6">Order Number</th>
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-6">Vndr Count</th>
                  <th className="py-4 px-6">Total Amount</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Order Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredOrders.map((o) => {
                  const uniqueVendors = Array.from(
                    new Set(o.order_items?.map((item: any) => item.vendor_id)),
                  );
                  return (
                    <tr
                      key={o.id}
                      className="text-slate-300 hover:bg-slate-800/20 transition-colors"
                    >
                      {/* Order No */}
                      <td className="py-4 px-6 font-mono font-medium text-white text-xs">
                        {o.order_number}
                      </td>

                      {/* Customer Info */}
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-semibold text-slate-200">
                            {o.profiles?.full_name || "Guest buyer"}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {o.user_id.slice(0, 8)}...
                          </p>
                        </div>
                      </td>

                      {/* Vendor Count */}
                      <td className="py-4 px-6 text-slate-400 text-xs font-semibold">
                        {uniqueVendors.length} vendors
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-6 font-semibold text-white">{inr(o.total_cents)}</td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            o.status === "delivered"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : o.status === "cancelled" || o.status === "refunded"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6 text-xs text-slate-500">
                        {new Date(o.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="View Details & Commissions"
                        >
                          <Eye className="h-4 w-4" />
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

      {/* Order Details Drawer */}
      {selectedOrder && (
        <OrderDetailsDrawer
          order={selectedOrder}
          commissionRate={commissionRate}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={(status) => updateStatus.mutate({ id: selectedOrder.id, status })}
        />
      )}
    </div>
  );
}

interface OrderDrawerProps {
  order: any;
  commissionRate: number;
  onClose: () => void;
  onUpdateStatus: (status: string) => void;
}

function OrderDetailsDrawer({ order, commissionRate, onClose, onUpdateStatus }: OrderDrawerProps) {
  // Platform Commission Split Calculations
  const subtotal = order.subtotal_cents || 0;
  const platformFee = Math.round(subtotal * (commissionRate / 100));
  const vendorEarnings = subtotal - platformFee;

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl bg-slate-950 border-l border-slate-800 text-white overflow-y-auto h-full p-6">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-amber-500" /> Order Details
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-400 mt-1">
            Order ID: {order.id}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Order Header Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex justify-between items-center">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                Order Number
              </p>
              <h4 className="text-lg font-mono font-bold text-white mt-1">{order.order_number}</h4>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                Status
              </p>
              <select
                value={order.status}
                onChange={(e) => onUpdateStatus(e.target.value)}
                className="mt-1 bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-500 transition-colors"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          {/* Customer / Shipping info */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h5 className="text-xs uppercase tracking-widest text-slate-400 font-bold border-b border-slate-800 pb-2 flex items-center gap-1.5">
              <User className="h-4 w-4 text-amber-500" /> Customer & Shipping
            </h5>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Name:</span>
                <span className="font-semibold text-slate-200">
                  {order.profiles?.full_name || "Guest user"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-semibold text-slate-200">
                  {order.profiles?.phone || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Order Date:</span>
                <span className="font-semibold text-slate-200 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  {new Date(order.created_at).toLocaleString("en-IN")}
                </span>
              </div>
              {order.shipping_address && (
                <div className="pt-2 border-t border-slate-800/60">
                  <span className="text-slate-500 block mb-1">Shipping Address:</span>
                  <div className="p-4 bg-slate-950/60 rounded-xl text-slate-400 leading-relaxed font-sans flex gap-2">
                    <MapPin className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1 text-slate-300">
                      {typeof order.shipping_address === "string" ? (
                        <p className="whitespace-pre-wrap">{order.shipping_address}</p>
                      ) : typeof order.shipping_address === "object" &&
                        order.shipping_address !== null ? (
                        <>
                          <p className="font-bold text-white text-sm">
                            {(order.shipping_address as any).name ||
                              (order.shipping_address as any).fullName ||
                              "Recipient Name"}
                          </p>
                          <p>{(order.shipping_address as any).street}</p>
                          <p>
                            {(order.shipping_address as any).city},{" "}
                            {(order.shipping_address as any).state} -{" "}
                            {(order.shipping_address as any).zip ||
                              (order.shipping_address as any).postal_code ||
                              (order.shipping_address as any).zipCode}
                          </p>
                          {((order.shipping_address as any).phone ||
                            (order.shipping_address as any).contact) && (
                            <p className="text-[10px] text-slate-500 mt-1.5 font-mono">
                              Phone:{" "}
                              {(order.shipping_address as any).phone ||
                                (order.shipping_address as any).contact}
                            </p>
                          )}
                        </>
                      ) : (
                        <p>{JSON.stringify(order.shipping_address)}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h5 className="text-xs uppercase tracking-widest text-slate-400 font-bold border-b border-slate-800 pb-2 mb-4 flex items-center gap-1.5">
              <Package className="h-4 w-4 text-amber-500" /> Ordered Items
            </h5>
            <ul className="space-y-4">
              {order.order_items?.map((item: any) => (
                <li key={item.id} className="flex gap-3">
                  <div className="h-12 w-12 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                    {item.cover_image ? (
                      <img
                        src={item.cover_image}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{item.title}</p>
                    <p className="text-[10px] text-slate-500">
                      Store: {item.vendors?.store_name || "Seller Store"}
                    </p>
                    <p className="text-[10px] text-amber-500 font-medium mt-0.5">
                      {item.quantity} x {inr(item.unit_price_cents)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-200">{inr(item.subtotal_cents)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform Commission Split */}
          <div className="bg-gradient-to-r from-amber-500/10 to-violet-500/10 border border-amber-500/20 rounded-2xl p-5 space-y-3">
            <h5 className="text-xs uppercase tracking-widest text-amber-400 font-bold border-b border-amber-500/10 pb-2 flex items-center gap-1.5">
              <Percent className="h-4 w-4 text-amber-400" /> Commission Split Breakdown
            </h5>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Order Subtotal:</span>
                <span className="font-semibold text-slate-200">{inr(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Platform Commission Rate:</span>
                <span className="font-bold text-amber-500">{commissionRate.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800/40">
                <span className="text-amber-400 font-medium">Platform Fee Earnings:</span>
                <span className="font-bold text-amber-400">{inr(platformFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-violet-400 font-medium">Vendor Earnings:</span>
                <span className="font-bold text-violet-400">{inr(vendorEarnings)}</span>
              </div>
            </div>
          </div>

          {/* Pricing totals */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Items Subtotal:</span>
              <span>{inr(order.subtotal_cents)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Shipping Fee:</span>
              <span>{inr(order.shipping_cents)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Tax/GST:</span>
              <span>{inr(order.tax_cents)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-white pt-2.5 border-t border-slate-800">
              <span>Grand Total:</span>
              <span className="text-amber-500">{inr(order.total_cents)}</span>
            </div>
          </div>

          {/* Cancel & Refund quick controls */}
          <div className="flex gap-2.5 pt-2">
            {order.status !== "cancelled" && order.status !== "refunded" && (
              <>
                <button
                  onClick={() => onUpdateStatus("cancelled")}
                  className="flex-1 py-3 bg-red-500/10 border border-red-500/20 text-red-400 font-semibold rounded-xl text-xs uppercase tracking-wider hover:bg-red-500 hover:text-slate-950 transition-colors cursor-pointer"
                >
                  Cancel Order
                </button>
                <button
                  onClick={() => onUpdateStatus("refunded")}
                  className="flex-1 py-3 bg-slate-950 border border-slate-800 text-slate-400 font-semibold rounded-xl text-xs uppercase tracking-wider hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  Refund Order
                </button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
