import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/layouts/PageShell";
import { shippingDb, Shipment, ShippingLog } from "@/api/shipping-db";
import { inr } from "@/utils/format";
import {
  Truck,
  Loader2,
  Package,
  Calendar,
  MapPin,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  User,
} from "lucide-react";

export const Route = createFileRoute("/tracking/$id")({
  head: ({ params }: any) => ({ meta: [{ title: `Track Shipment #${params.id.slice(0, 8).toUpperCase()} — ViaCraft` }] }),
  component: PublicTrackingPage,
});

function PublicTrackingPage() {
  const { id } = Route.useParams() as { id: string };

  // Query shipment details
  const { data: shipment, isLoading: loadingShipment, error: shipmentErr } = useQuery({
    queryKey: ["public-shipment", id],
    queryFn: () => shippingDb.shipments.get(id),
  });

  // Query shipment tracking logs
  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["public-shipment-logs", id],
    enabled: !!shipment,
    queryFn: () => shippingDb.logs.listByShipment(id),
  });

  // Query order details to show item titles and delivery address
  const { data: order } = useQuery({
    queryKey: ["shipment-order", shipment?.order_id],
    enabled: !!shipment?.order_id,
    queryFn: async () => {
      // Try to fetch order from Supabase
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), profiles(full_name, phone)")
        .eq("id", shipment!.order_id)
        .maybeSingle();

      if (error || !data) {
        // Fallback to local storage
        const stored = localStorage.getItem("fallback_orders");
        const fallbackOrders = stored ? JSON.parse(stored) : [];
        const matched = fallbackOrders.find((fo: any) => fo.id === shipment!.order_id);
        if (matched) return matched;
      }
      return data;
    },
  });

  if (loadingShipment) {
    return (
      <PageShell>
        <div className="min-h-[500px] flex flex-col items-center justify-center text-center">
          <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Fetching real-time cargo tracking data...
          </p>
        </div>
      </PageShell>
    );
  }

  if (shipmentErr || !shipment) {
    return (
      <PageShell>
        <div className="max-w-md mx-auto my-16 text-center space-y-6">
          <div className="h-16 w-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold">Tracking Record Not Found</h1>
          <p className="text-sm text-muted-foreground">
            We couldn't locate a shipment with the ID <strong className="font-mono text-foreground">{id}</strong>. 
            Please check your link or tracking number and try again.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-xs font-semibold hover:bg-foreground hover:text-background transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>
      </PageShell>
    );
  }

  // Visual delivery progress mapping
  const statusSteps = [
    { key: "shipment_created", label: "Order Packed" },
    { key: "picked_up", label: "Dispatched" },
    { key: "in_transit", label: "In Transit" },
    { key: "out_for_delivery", label: "Out for Delivery" },
    { key: "delivered", label: "Delivered" },
  ];

  const currentStatusIdx = statusSteps.findIndex(step => {
    if (shipment.status === "delivered") return step.key === "delivered";
    if (shipment.status === "out_for_delivery") return step.key === "out_for_delivery";
    if (shipment.status === "picked_up") return step.key === "picked_up";
    if (shipment.status === "pickup_scheduled") return step.key === "shipment_created";
    return step.key === shipment.status;
  });

  const formattedAddr = order?.shipping_address 
    ? (typeof order.shipping_address === "string" 
        ? order.shipping_address 
        : `${order.shipping_address.street || ""}, ${order.shipping_address.city || ""}, ${order.shipping_address.state || ""} - ${order.shipping_address.zip || order.shipping_address.postal_code || ""}`)
    : "Verified Customer Address";

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 space-y-8 font-sans">
        
        {/* Back Link */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent font-medium select-none"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Profile Dashboard
        </Link>

        {/* Header Block */}
        <div className="bg-card border border-border/80 p-6 md:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-accent font-bold">
              Real-time Cargo Tracking
            </p>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground">
              Shipment #{shipment.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-xs text-muted-foreground">
              Order Number: <span className="font-bold text-foreground">{order?.order_number || "RV-MOCK"}</span> &bull; 
              Courier Carrier: <span className="font-semibold text-foreground">{shipment.courier_name}</span>
            </p>
          </div>

          <div className="bg-accent/10 border border-accent/20 text-accent rounded-2xl px-5 py-3 text-center shrink-0 w-full md:w-auto">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-0.5">
              Current Location Status
            </span>
            <span className="text-sm font-extrabold uppercase tracking-wide">
              {shipment.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {/* Visual Progress Stepper */}
        {shipment.status !== "cancelled" ? (
          <div className="bg-card border border-border/80 p-6 md:p-8 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
              Delivery Progress Tracker
            </h3>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 py-4 md:px-4">
              {statusSteps.map((step, idx) => {
                const isCompleted = idx <= currentStatusIdx;
                const isCurrent = idx === currentStatusIdx;
                const isLast = idx === statusSteps.length - 1;

                return (
                  <div key={step.key} className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                        isCompleted
                          ? "bg-accent border-accent text-accent-foreground ring-4 ring-accent/15"
                          : "bg-background border-border text-muted-foreground"
                      }`}>
                        {idx + 1}
                      </div>
                      
                      <div className="md:text-center">
                        <span className={`text-xs block font-bold tracking-wide uppercase ${
                          isCompleted ? "text-foreground" : "text-muted-foreground"
                        }`}>
                          {step.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] text-accent font-extrabold uppercase tracking-wider animate-pulse">
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    {!isLast && (
                      <div className={`hidden md:block h-0.5 w-16 xl:w-20 transition-colors ${
                        isCompleted ? "bg-accent" : "bg-border"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-3xl p-6 flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="font-bold text-sm">Shipment Cancelled</h5>
              <p className="text-xs leading-relaxed opacity-90">
                This shipment was voided or cancelled. If this is a mistake, please reach out to customer support at support@viacraft.com.
              </p>
            </div>
          </div>
        )}

        {/* Content Details Grid */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          
          {/* Left Column: Shipment Specs */}
          <div className="bg-card border border-border/80 p-6 rounded-3xl shadow-sm space-y-4 md:col-span-1">
            <h4 className="text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
              <Package className="h-4 w-4 text-accent" /> Cargo Parameters
            </h4>
            
            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-muted-foreground block">AWB / Airway Bill:</span>
                <span className="font-mono font-bold text-foreground text-sm">
                  {shipment.tracking_number || "Awaiting Handover"}
                </span>
              </div>
              
              <div>
                <span className="text-muted-foreground block">Dimensions:</span>
                <span className="font-semibold text-foreground">
                  {shipment.shipping_method === "shiprocket" 
                    ? `10 x 10 x 10 cm` 
                    : `Custom Parcel`}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block">Weight:</span>
                <span className="font-semibold text-foreground">
                  {shipment.shipping_method === "shiprocket" ? `0.50 kg` : `Standard Parcel`}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block">Recipient Customer:</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-1">
                  <User className="h-3.5 w-3.5 text-accent" />
                  {order?.profiles?.full_name || "Verified Buyer"}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block">Shipping Address:</span>
                <span className="font-medium text-foreground leading-relaxed block mt-1">
                  {formattedAddr}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Timeline Event list */}
          <div className="bg-card border border-border/80 p-6 rounded-3xl shadow-sm space-y-6 md:col-span-2">
            <h4 className="text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-accent" /> Transit History Timeline
            </h4>

            {loadingLogs ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Logistics timeline events will appear here once the courier scans the barcode.
              </p>
            ) : (
              <div className="relative border-l border-border pl-4 ml-2 space-y-6">
                {logs.map((log) => (
                  <div key={log.id} className="relative text-xs">
                    {/* Circle icon */}
                    <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent border-2 border-background"></div>
                    
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-foreground capitalize text-sm">
                        {log.new_status ? log.new_status.replace(/_/g, " ") : "Update"}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {log.notes && (
                      <p className="text-muted-foreground mt-1 leading-relaxed">
                        {log.notes}
                      </p>
                    )}
                    {log.reason && (
                      <p className="text-rose-500 mt-1 font-semibold">
                        Delay: {log.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </PageShell>
  );
}
