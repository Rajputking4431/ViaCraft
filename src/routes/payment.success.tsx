import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/layouts/PageShell";
import { inr } from "@/utils/format";
import {
  CheckCircle2,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Download,
  Calendar,
  CreditCard,
} from "lucide-react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/payment/success")({
  head: () => ({ meta: [{ title: "Payment Successful — ViaCraft" }] }),
  component: PaymentSuccessPage,
});

function PaymentSuccessPage() {
  const { order_id } = Route.useSearch() as { order_id: string };

  const { data: order, isLoading } = useQuery({
    queryKey: ["payment-success-order", order_id],
    queryFn: async () => {
      if (!order_id) return null;
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", order_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!order_id,
  });

  const handleDownloadReceipt = () => {
    if (!order) return;
    const printContent = `
      ===============================================
                       VIACRAFT RECEIPT
      ===============================================
      Order Number: ${order.order_number}
      Date: ${new Date(order.created_at).toLocaleString()}
      Status: Paid
      Payment Method: Razorpay Secure Checkout
      
      ITEMS:
      ${order.order_items?.map((item: any) => `- ${item.title} x${item.quantity}: ${inr(item.subtotal_cents)}`).join("\n")}
      
      -----------------------------------------------
      Subtotal: ${inr(order.subtotal_cents)}
      Shipping: ${inr(order.shipping_cents)}
      Tax (18% GST): ${inr(order.tax_cents)}
      TOTAL PAID: ${inr(order.total_cents)}
      ===============================================
      Thank you for purchasing custom art from ViaCraft!
    `;
    const element = document.createElement("a");
    const file = new Blob([printContent], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `receipt-${order.order_number}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#3d2712] mb-4" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading transaction receipt...
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-2xl px-6 py-16 sm:py-24 text-center">
        {/* Dynamic Premium Success card */}
        <div className="bg-card border border-border shadow-luxe rounded-3xl p-8 sm:p-12 space-y-8 animate-in zoom-in-95 duration-300 relative overflow-hidden">
          {/* Top colored accent header */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-500 mb-2">
            <CheckCircle2 className="h-12 w-12 stroke-[1.5]" />
          </div>

          <div className="space-y-3">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Payment Successful!
            </h1>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Your transaction has been securely processed and verified. An email invoice has been
              dispatched.
            </p>
          </div>

          {order && (
            <div className="bg-muted/40 border border-border/80 rounded-2xl p-6 text-left space-y-4 text-xs">
              <div className="flex justify-between items-center pb-3 border-b border-border/60">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-400" /> Date
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: "long" })}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border/60">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4 text-slate-400" /> Order Code
                </span>
                <span className="font-mono font-bold text-[#3d2712] dark:text-amber-400">
                  {order.order_number}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border/60">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-slate-400" /> Method
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Razorpay Secure Checkout
                </span>
              </div>

              {/* Items Breakdown */}
              <div className="pt-1 space-y-2">
                <p className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
                  Purchased Items
                </p>
                {order.order_items?.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-slate-600 dark:text-slate-400"
                  >
                    <span className="truncate max-w-[200px]">
                      {item.title} <span className="font-mono text-[10px]">x{item.quantity}</span>
                    </span>
                    <span>{inr(item.subtotal_cents)}</span>
                  </div>
                ))}
              </div>

              {/* Total paid summary */}
              <div className="border-t border-border pt-4 flex justify-between items-center font-bold text-sm text-slate-900 dark:text-white">
                <span>Amount Paid</span>
                <span className="text-lg text-emerald-500 font-extrabold">
                  {inr(order.total_cents)}
                </span>
              </div>
            </div>
          )}

          {/* Secure Trust badges */}
          <div className="flex items-center justify-center gap-6 pt-2 border-t border-border/60">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Razorpay Verified
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> 256-Bit SSL Secured
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={handleDownloadReceipt}
              className="px-6 py-3 rounded-full border border-border hover:bg-muted font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" /> Download Invoice
            </button>
            <Link
              to="/dashboard"
              className="px-6 py-3 rounded-full bg-[#3d2712] hover:bg-[#2c1a0c] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
