import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/layouts/PageShell";
import { inr } from "@/utils/format";
import { initializeRazorpayPayment } from "@/utils/razorpay";
import { useAuth } from "@/hooks/use-auth";
import { AlertCircle, ArrowLeft, RotateCcw, HelpCircle, ShieldAlert } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/payment/failure")({
  head: () => ({ meta: [{ title: "Payment Failed — ViaCraft" }] }),
  component: PaymentFailurePage,
});

function PaymentFailurePage() {
  const { order_id, error } = Route.useSearch() as { order_id: string; error?: string };
  const { user } = useAuth();
  const navigate = useNavigate();
  const [retrying, setRetrying] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["payment-failed-order", order_id],
    queryFn: async () => {
      if (!order_id) return null;
      const { data, error: oErr } = await supabase
        .from("orders")
        .select("*")
        .eq("id", order_id)
        .single();
      if (oErr) throw oErr;
      return data;
    },
    enabled: !!order_id,
  });

  const handleRetryPayment = async () => {
    if (!order || !user) return;
    setRetrying(true);

    try {
      await initializeRazorpayPayment({
        amountCents: order.total_cents,
        orderId: order.id,
        paymentType: "full",
        customerId: user.id,
        customerName: user.user_metadata?.full_name || "Valued Customer",
        customerEmail: user.email || "",
        onSuccess: () => {
          setRetrying(false);
          toast.success("Retry payment successful and verified!");
          navigate({ to: "/payment/success", search: { order_id: order.id } });
        },
        onFailure: (errMsg) => {
          setRetrying(false);
          toast.error(`Retry payment failed: ${errMsg}`);
        },
      });
    } catch (err: any) {
      setRetrying(false);
      toast.error(err.message || "Failed to trigger payment retry.");
    }
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-rose-500 mb-4" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading transaction records...
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-2xl px-6 py-16 sm:py-24 text-center">
        <div className="bg-card border border-border shadow-luxe rounded-3xl p-8 sm:p-12 space-y-8 animate-in zoom-in-95 duration-300 relative overflow-hidden">
          {/* Top colored accent header */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-rose-500 via-red-500 to-rose-600" />

          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-500 mb-2">
            <AlertCircle className="h-12 w-12 stroke-[1.5]" />
          </div>

          <div className="space-y-3">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Payment Failed
            </h1>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              We encountered an issue while processing your payment. Your cards or accounts have not
              been charged.
            </p>
          </div>

          {/* Failure reason log */}
          <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-5 text-left text-xs space-y-3 text-rose-600 dark:text-rose-400">
            <p className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <ShieldAlert className="h-4 w-4" /> Gateway Error Summary
            </p>
            <p className="bg-card/50 p-3 rounded-xl border border-rose-500/10 font-mono text-[11px] leading-relaxed">
              {error || "Transaction was aborted or declined by issuing bank."}
            </p>
          </div>

          {order && (
            <div className="bg-muted/30 border border-border/80 rounded-2xl p-5 text-left space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Reference:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {order.order_number}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outstanding Total:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {inr(order.total_cents)}
                </span>
              </div>
            </div>
          )}

          {/* Quick FAQ/Help */}
          <div className="text-left text-xs text-muted-foreground bg-muted/20 border border-border/60 rounded-2xl p-5 space-y-2">
            <p className="font-bold flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <HelpCircle className="h-4 w-4 text-slate-400" /> Troubleshooting Tips
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li>Ensure your account balance supports the total due amount.</li>
              <li>Verify that international/online transactions are active for your card.</li>
              <li>Check with your bank or try an alternate UPI app.</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              to="/checkout"
              className="px-6 py-3 rounded-full border border-border hover:bg-muted font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Checkout
            </Link>
            {order && (
              <button
                onClick={handleRetryPayment}
                disabled={retrying}
                className="px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 transition-colors cursor-pointer animate-pulse hover:animate-none"
              >
                {retrying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Launching Razorpay...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" /> Retry Payment Now
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
