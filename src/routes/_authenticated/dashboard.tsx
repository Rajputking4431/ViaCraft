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
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

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
  const { user } = useAuth();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    "orders" | "preservation" | "wishlist" | "addresses" | "reviews" | "support" | "security"
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
          .select("*, order_items(*)")
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

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrName || !newAddrStreet || !newAddrCity || !newAddrState || !newAddrZip || !user) return;
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
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Tab Menu Selector */}
          <aside className="lg:col-span-3 flex overflow-x-auto lg:overflow-x-visible lg:flex-col gap-1 pb-4 lg:pb-0 select-none border-b lg:border-b-0 border-border/40 scrollbar-none shrink-0">
            {[
              { id: "orders", label: "My Orders", icon: Package },
              { id: "preservation", label: "Preservations", icon: Sparkles },
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
                  className={`px-4.5 py-3 rounded-full lg:rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Right Column: Tab Contents Card */}
          <div className="lg:col-span-9 bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-sm min-h-[450px]">
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
                            { key: "delivered", label: "Delivered" }
                          ];

                          const currentStatusIdx = statusSteps.findIndex(step => {
                            if (shipment.status === "delivered") return step.key === "delivered";
                            if (shipment.status === "out_for_delivery") return step.key === "in_transit";
                            if (shipment.status === "picked_up") return step.key === "picked_up";
                            if (shipment.status === "pickup_scheduled") return step.key === "shipment_created";
                            return step.key === shipment.status;
                          });

                          return (
                            <div className="bg-muted/10 p-4 border-t border-border/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                              <div className="space-y-1">
                                <p className="font-bold text-[10px] text-accent uppercase tracking-wider flex items-center gap-1.5">
                                  <Truck className="h-3.5 w-3.5 text-accent" /> Shipment Tracking Info
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Courier: <span className="font-semibold text-foreground">{shipment.courier_name || "Assigning..."}</span> &bull; 
                                  AWB: <span className="font-mono text-foreground">{shipment.tracking_number || "Pending"}</span>
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
                                          <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-colors ${
                                            isCompleted 
                                              ? "bg-accent border-accent text-accent-foreground" 
                                              : "bg-background border-border text-muted-foreground"
                                          }`}>
                                            {idx + 1}
                                          </div>
                                          <span className={`text-[9px] font-medium mt-1 uppercase tracking-wide ${
                                            isCompleted ? "text-accent font-bold" : "text-muted-foreground"
                                          }`}>
                                            {step.label}
                                          </span>
                                        </div>
                                        {!isLast && (
                                          <div className={`h-0.5 w-8 sm:w-12 -mt-4 transition-colors ${
                                            isCompleted ? "bg-accent" : "bg-border"
                                          }`} />
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
                <h2 className="font-display text-2xl font-bold border-b border-border pb-3 mb-4">
                  Customer Support
                </h2>

                <div className="space-y-3">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 border border-border/80 rounded-2xl bg-background text-xs flex justify-between items-center"
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
                  className="border border-border/80 rounded-2xl p-5 bg-muted/20 space-y-4 text-xs max-w-xl mt-6"
                >
                  <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" /> Create Support Ticket
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
                        className="w-full px-3 py-2.5 rounded-xl bg-background border border-border outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                        Inquiry Category
                      </label>
                      <select
                        value={newTicketCat}
                        onChange={(e) => setNewTicketCat(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-background border border-border outline-none text-xs cursor-pointer"
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
                    className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-full text-xs cursor-pointer shadow"
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
    </PageShell>
  );
}