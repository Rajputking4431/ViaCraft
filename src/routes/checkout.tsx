import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/layouts/PageShell";
import { inr } from "@/utils/format";
import { useAuth } from "@/hooks/use-auth";
import { fetchUserCartItems } from "@/api/cart";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { trackCheckoutStarted, trackPaymentSuccess, trackOrderCompleted } from "@/services/analytics/google";
import { sendOrderConfirmationEmail, sendVendorNewOrderEmail, sendAdminHighValueOrderEmail } from "@/api/email.functions";
import {
  Check,
  MapPin,
  Truck,
  CreditCard,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Secure Checkout — ViaCraft" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Wizard Steps: 1 = Address, 2 = Delivery, 3 = Payment, 4 = Review Order
  const [step, setStep] = useState(1);

  // Address State - Initialized as empty strings for new users
  const [fullName, setFullName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phone, setPhone] = useState("");
  const [saveToProfile, setSaveToProfile] = useState(true);

  // Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");

  // Delivery options: "standard" or "express"
  const [deliverySpeed, setDeliverySpeed] = useState<"standard" | "express">("standard");

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "cod">("upi");
  const [isRazorpaySimulating, setIsRazorpaySimulating] = useState(false);

  // Coupon discount states loaded from localStorage
  const [discountCents, setDiscountCents] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [checkoutTracked, setCheckoutTracked] = useState(false);

  // Require sign-in to checkout
  useEffect(() => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/checkout" }, replace: true });
    }
  }, [user, navigate]);

  // Sync user details, saved info, and saved addresses
  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Customer Name");
      if (user.phone) setPhone(user.phone);
      
      // Load saved addresses specific to the logged-in user
      const savedAddr = localStorage.getItem(`user_addresses_${user.id}`);
      if (savedAddr) {
        try {
          const list = JSON.parse(savedAddr);
          setSavedAddresses(list);
          const def = list.find((a: any) => a.isDefault) || list[0];
          if (def) {
            setSelectedAddressId(def.id);
            setFullName(def.name);
            setStreet(def.street);
            setCity(def.city);
            setState(def.state);
            setZipCode(def.zip);
          }
        } catch (e) {
          console.error("Failed to parse user addresses", e);
        }
      }
    }

    const savedDiscount = localStorage.getItem("checkout_discount_cents");
    const savedCoupon = localStorage.getItem("checkout_coupon_code");
    if (savedDiscount) setDiscountCents(Number(savedDiscount));
    if (savedCoupon) setCouponCode(savedCoupon);
  }, [user]);

  const [variations, setVariations] = useState<Record<string, { size: string; price_cents: number }>>({});

  // Fetch cart items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["checkout-cart", user?.id],
    enabled: !!user,
    queryFn: () => fetchUserCartItems(user!.id),
  });

  // Load variations from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("cart_item_variations");
    if (stored) {
      try {
        setVariations(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse cart item variations in checkout", e);
      }
    }
  }, [items]);

  const rawSubtotal = items.reduce((s, it) => {
    const productPrice = it.product
      ? (variations[it.product.id]?.price_cents ?? it.product.price_cents)
      : 0;
    return s + productPrice * it.quantity;
  }, 0);
  const deliveryCharge = rawSubtotal >= 250000 || deliverySpeed === "standard" ? 0 : 15000;
  const discountedSubtotal = rawSubtotal - discountCents;
  const tax = Math.round(discountedSubtotal * 0.18);
  const total = discountedSubtotal + deliveryCharge + tax;

  useEffect(() => {
    if (items.length > 0 && !checkoutTracked) {
      trackCheckoutStarted(items, rawSubtotal);
      setCheckoutTracked(true);
    }
  }, [items, checkoutTracked, rawSubtotal]);

  // Database Order placement mutation
  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const subtotal = items.reduce((s, it) => {
        const productPrice = it.product
          ? (variations[it.product.id]?.price_cents ?? it.product.price_cents)
          : 0;
        return s + productPrice * it.quantity;
      }, 0);
      const deliveryCharge = subtotal >= 250000 || deliverySpeed === "standard" ? 0 : 15000;

      const discountedSubtotal = subtotal - discountCents;
      const tax = Math.round(discountedSubtotal * 0.18);
      const total = discountedSubtotal + deliveryCharge + tax;

      const addressPayload = {
        name: fullName,
        street,
        city,
        state,
        postal_code: zipCode,
        zip: zipCode,
        phone,
      };

      // If checked, save address to profile's local storage addresses using unique user key
      if (saveToProfile) {
        try {
          const storageKey = `user_addresses_${user!.id}`;
          const savedStr = localStorage.getItem(storageKey);
          const savedList = savedStr ? JSON.parse(savedStr) : [];
          
          const exists = savedList.some(
            (a: any) =>
              a.street.toLowerCase() === street.toLowerCase() &&
              a.city.toLowerCase() === city.toLowerCase() &&
              a.zip === zipCode,
          );
          
          if (!exists) {
            const newAddr = {
              id: Math.random().toString(),
              name: fullName,
              street: street,
              city: city,
              state: state,
              zip: zipCode,
              isDefault: savedList.length === 0,
            };
            savedList.push(newAddr);
            localStorage.setItem(storageKey, JSON.stringify(savedList));
          }
        } catch (err) {
          console.error("Failed to save address to profile from checkout", err);
        }
      }

      // 1. Insert order record
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user!.id,
          subtotal_cents: subtotal,
          shipping_cents: deliveryCharge,
          tax_cents: tax,
          total_cents: total,
          status: "pending",
          shipping_address: addressPayload,
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Insert order items
      const itemRows = items
        .filter((i) => i.product)
        .map((i) => {
          const variation = variations[i.product!.id];
          const finalTitle = variation 
            ? `${i.product!.title} (${variation.size})` 
            : i.product!.title;
          const finalPrice = variation 
            ? variation.price_cents 
            : i.product!.price_cents;

          return {
            order_id: order.id,
            product_id: i.product!.id,
            vendor_id: i.product!.vendor_id,
            title: finalTitle,
            cover_image: i.product!.cover_image,
            unit_price_cents: finalPrice,
            quantity: i.quantity,
            subtotal_cents: finalPrice * i.quantity,
          };
        });

      const { error: e2 } = await supabase.from("order_items").insert(itemRows);
      if (e2) throw e2;

      // 3. Save to fallback orders (localStorage public cache for vendor dashboard review)
      try {
        const fallbackOrderCopy = {
          id: order.id,
          user_id: user!.id,
          order_number: order.order_number,
          subtotal_cents: subtotal,
          shipping_cents: deliveryCharge,
          tax_cents: tax,
          total_cents: total,
          status: "pending",
          currency: "INR",
          shipping_address: addressPayload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          profiles: {
            full_name: fullName,
          },
        };
        const existing = localStorage.getItem("fallback_orders");
        const list = existing ? JSON.parse(existing) : [];
        list.push(fallbackOrderCopy);
        localStorage.setItem("fallback_orders", JSON.stringify(list));
      } catch (err) {
        console.error("Failed to write fallback order copy", err);
      }

      // 4. Delete items from Supabase cart
      await supabase.from("cart_items").delete().eq("user_id", user!.id);

      // 5. Clean checkout local storage
      localStorage.removeItem("checkout_discount_cents");
      localStorage.removeItem("checkout_coupon_code");
      localStorage.removeItem("cart_item_variations");

      return order;
    },
    onSuccess: (order) => {
      qc.invalidateQueries();
      toast.success(`Order ${order.order_number} placed successfully!`);
      trackOrderCompleted(order.id, order.order_number, order.total_cents, items);

      sendOrderConfirmationEmail({ data: { orderId: order.id } }).catch((err) => {
        console.error("Order confirmation email trigger failure", err);
      });

      sendVendorNewOrderEmail({ data: { orderId: order.id } }).catch((err) => {
        console.error("Vendor order email trigger failure", err);
      });

      if (order.total_cents > 500000) {
        sendAdminHighValueOrderEmail({ data: { orderId: order.id } }).catch((err) => {
          console.error("Admin high-value order email trigger failure", err);
        });
      }

      navigate({ to: "/dashboard" });
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to submit order");
    },
  });

  const simulatePayment = () => {
    setIsRazorpaySimulating(true);
    setTimeout(() => {
      setIsRazorpaySimulating(false);
      toast.success("Razorpay payment transaction simulated successfully!");
      trackPaymentSuccess(paymentMethod, total);
      placeOrderMutation.mutate();
    }, 2000);
  };

  const handlePlaceOrderClick = () => {
    if (paymentMethod === "upi" || paymentMethod === "card") {
      simulatePayment();
    } else {
      placeOrderMutation.mutate();
    }
  };

  if (!user) {
    return (
      <PageShell>
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <Lock className="h-12 w-12 text-accent mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold mb-4">Sign in to checkout</h1>
          <p className="text-xs text-muted-foreground mb-8">
            Please sign in to complete your purchase securely.
          </p>
          <Link
            to="/auth"
            search={{ redirect: "/checkout" }}
            className="px-7 py-3 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider shadow"
          >
            Sign In to Continue
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
        {/* Navigation back */}
        <Link
          to="/cart"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent font-semibold mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Cart
        </Link>

        <div className="text-center mb-10">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent flex items-center justify-center gap-1 mb-2">
            <Lock className="h-3.5 w-3.5" /> Secure Checkout
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-foreground">
            Secure Checkout
          </h1>
        </div>

        {/* Wizard Steps Indicator tabs */}
        <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold uppercase tracking-wider mb-10 border-b border-border/40 pb-6 select-none max-w-2xl mx-auto">
          {[
            { s: 1, label: "Address", icon: MapPin },
            { s: 2, label: "Delivery", icon: Truck },
            { s: 3, label: "Payment", icon: CreditCard },
            { s: 4, label: "Review", icon: ShieldCheck },
          ].map((it) => {
            const Icon = it.icon;
            const isActive = step === it.s;
            const isCompleted = step > it.s;
            return (
              <button
                key={it.s}
                disabled={step < it.s}
                onClick={() => setStep(it.s)}
                className={`flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
                  isActive
                    ? "text-accent"
                    : isCompleted
                      ? "text-emerald-500 hover:text-accent"
                      : "text-muted-foreground/60"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center border transition-all ${
                    isActive
                      ? "border-accent bg-accent/5"
                      : isCompleted
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                        : "border-border"
                  }`}
                >
                  {isCompleted ? <Check className="h-4.5 w-4.5" /> : <Icon className="h-4 w-4" />}
                </div>
                <span>{it.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Columns Grid */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Stages */}
          <div className="lg:col-span-8 bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-sm min-h-[300px]">
            {/* Step 1: Address */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <h2 className="font-display text-2xl font-bold border-b border-border pb-3 mb-4">
                  Shipping Address
                </h2>

                {savedAddresses.length > 0 && (
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/85">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-accent block mb-2">
                      Select Saved Address
                    </label>
                    <select
                      value={selectedAddressId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedAddressId(val);
                        const addr = savedAddresses.find((a) => a.id === val);
                        if (addr) {
                          setFullName(addr.name);
                          setStreet(addr.street);
                          setCity(addr.city);
                          setState(addr.state);
                          setZipCode(addr.zip);
                        } else if (val === "custom") {
                          setFullName("");
                          setStreet("");
                          setCity("");
                          setState("");
                          setZipCode("");
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-background border border-border outline-none text-xs cursor-pointer focus:border-accent"
                    >
                      {savedAddresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} - {a.street}, {a.city} ({a.zip}) {a.isDefault ? "[Default]" : ""}
                        </option>
                      ))}
                      <option value="custom">-- Enter New Address --</option>
                    </select>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        setSelectedAddressId("custom");
                      }}
                      placeholder="Receiver's name"
                      className="mt-1.5 w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={(e) => {
                        setStreet(e.target.value);
                        setSelectedAddressId("custom");
                      }}
                      placeholder="Flat, House no., Apartment, Street"
                      className="mt-1.5 w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        setSelectedAddressId("custom");
                      }}
                      className="mt-1.5 w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => {
                        setState(e.target.value);
                        setSelectedAddressId("custom");
                      }}
                      className="mt-1.5 w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={zipCode}
                      onChange={(e) => {
                        setZipCode(e.target.value);
                        setSelectedAddressId("custom");
                      }}
                      placeholder="400001"
                      className="mt-1.5 w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setSelectedAddressId("custom");
                      }}
                      placeholder="9876543210"
                      className="mt-1.5 w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                    />
                  </div>

                  {/* Save to Profile Checkbox */}
                  <div className="sm:col-span-2 flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="saveToProfile"
                      checked={saveToProfile}
                      onChange={(e) => setSaveToProfile(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-accent accent-accent cursor-pointer"
                    />
                    <label
                      htmlFor="saveToProfile"
                      className="text-xs text-muted-foreground select-none cursor-pointer"
                    >
                      Save this address to my profile for future orders
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <button
                    disabled={!fullName || !street || !city || !state || !zipCode || !phone}
                    onClick={() => setStep(2)}
                    className="px-6 py-2.5 bg-primary text-primary-foreground disabled:opacity-40 hover:bg-foreground transition-all rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    Continue to Delivery <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Delivery Speed */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <h2 className="font-display text-2xl font-bold border-b border-border pb-3 mb-4">
                  Choose Delivery Speed
                </h2>
                <div className="space-y-3">
                  {/* Standard */}
                  <label className="flex items-center gap-4 p-5 bg-background border rounded-2xl cursor-pointer select-none transition-all hover:border-accent/30 border-border">
                    <input
                      type="radio"
                      name="deliverySpeed"
                      checked={deliverySpeed === "standard"}
                      onChange={() => setDeliverySpeed("standard")}
                      className="h-4 w-4 text-accent accent-accent"
                    />
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-foreground">Standard Delivery</p>
                      <p className="text-muted-foreground mt-0.5">
                        Delivered in 4-6 business days.
                      </p>
                      <p className="text-[10px] text-accent font-semibold mt-1">
                        Delivery Charge: Free
                      </p>
                    </div>
                  </label>

                  {/* Express */}
                  <label className="flex items-center gap-4 p-5 bg-background border rounded-2xl cursor-pointer select-none transition-all hover:border-accent/30 border-border">
                    <input
                      type="radio"
                      name="deliverySpeed"
                      checked={deliverySpeed === "express"}
                      onChange={() => setDeliverySpeed("express")}
                      className="h-4 w-4 text-accent accent-accent"
                    />
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-foreground">Express Delivery (+₹150)</p>
                      <p className="text-muted-foreground mt-0.5">
                        Delivered in 2-3 business days. Sealed priority logistics packaging.
                      </p>
                      <p className="text-[10px] text-accent font-semibold mt-1">
                        Delivery Charge: ₹150
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex justify-between pt-6">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-2.5 border border-border hover:bg-muted transition-all rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" /> Address
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-foreground transition-all rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    Continue to Payment <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <h2 className="font-display text-2xl font-bold border-b border-border pb-3 mb-4">
                  Secure Payment Options
                </h2>
                <div className="space-y-3">
                  {/* UPI */}
                  <label className="flex items-center gap-4 p-5 bg-background border rounded-2xl cursor-pointer select-none transition-all hover:border-accent/30 border-border">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "upi"}
                      onChange={() => setPaymentMethod("upi")}
                      className="h-4 w-4 text-accent accent-accent"
                    />
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-foreground">UPI (GPay / PhonePe / Paytm)</p>
                      <p className="text-muted-foreground mt-0.5">
                        Simulate live Razorpay gateway UPI transaction validation.
                      </p>
                    </div>
                  </label>

                  {/* Card */}
                  <label className="flex items-center gap-4 p-5 bg-background border rounded-2xl cursor-pointer select-none transition-all hover:border-accent/30 border-border">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "card"}
                      onChange={() => setPaymentMethod("card")}
                      className="h-4 w-4 text-accent accent-accent"
                    />
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-foreground">Credit / Debit Card</p>
                      <p className="text-muted-foreground mt-0.5">
                        Visa, Mastercard, RuPay, Amex accepted.
                      </p>
                    </div>
                  </label>

                  {/* COD */}
                  <label className="flex items-center gap-4 p-5 bg-background border rounded-2xl cursor-pointer select-none transition-all hover:border-accent/30 border-border">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="h-4 w-4 text-accent accent-accent"
                    />
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-foreground">Cash On Delivery (COD)</p>
                      <p className="text-muted-foreground mt-0.5">
                        Pay in cash or digital code upon delivery at your door.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex justify-between pt-6">
                  <button
                    onClick={() => setStep(2)}
                    className="px-6 py-2.5 border border-border hover:bg-muted transition-all rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" /> Delivery
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-foreground transition-all rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    Continue to Review <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Review Order */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <h2 className="font-display text-2xl font-bold border-b border-border pb-3 mb-4">
                  Review Your Order
                </h2>

                <div className="grid sm:grid-cols-2 gap-6 text-xs bg-muted/30 border border-border/80 p-5 rounded-2xl leading-relaxed">
                  <div className="space-y-2">
                    <p className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                      Shipping Address
                    </p>
                    <p className="font-semibold text-foreground">{fullName}</p>
                    <p className="text-muted-foreground">{street}</p>
                    <p className="text-muted-foreground">
                      {city}, {state} - {zipCode}
                    </p>
                    <p className="text-muted-foreground">Phone: {phone}</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                        Delivery Speed
                      </p>
                      <p className="font-semibold capitalize text-foreground">
                        {deliverySpeed} Delivery (
                        {deliverySpeed === "express" ? "2-3 Days" : "4-6 Days"})
                      </p>
                    </div>
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                        Selected Payment Method
                      </p>
                      <p className="font-semibold uppercase text-foreground">
                        {paymentMethod} Payment
                      </p>
                    </div>
                  </div>
                </div>

                {/* Items preview list */}
                <div className="space-y-3 mt-6">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Items in Shipment
                  </p>
                  {items.map(
                    (it) =>
                      it.product && (
                        <div
                          key={it.id}
                          className="flex gap-4 p-3 border border-border/60 bg-background rounded-xl items-center text-xs"
                        >
                          <img
                            src={it.product?.cover_image || ""}
                            alt=""
                            className="h-10 w-10 object-cover rounded-lg bg-muted shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {it.product.title}
                            </p>
                            <p className="text-muted-foreground text-[10px]">
                              Qty: {it.quantity} · Unit Price: {inr(it.product.price_cents)}
                            </p>
                          </div>
                          <span className="font-semibold text-foreground">
                            {inr(it.product.price_cents * it.quantity)}
                          </span>
                        </div>
                      ),
                  )}
                </div>

                <div className="flex justify-between pt-6 border-t border-border/40 mt-8">
                  <button
                    onClick={() => setStep(3)}
                    className="px-6 py-2.5 border border-border hover:bg-muted transition-all rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" /> Payment
                  </button>
                  <button
                    disabled={placeOrderMutation.isPending}
                    onClick={handlePlaceOrderClick}
                    className="px-8 py-3 bg-accent hover:bg-foreground text-accent-foreground hover:text-background transition-all rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    {placeOrderMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Placing Order...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4.5 w-4.5" /> Place Order ({inr(total)})
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Invoice Breakdown */}
          <aside className="lg:col-span-4 bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display text-lg font-bold border-b border-border pb-3 mb-2">
              Order Price Summary
            </h3>

            <div className="space-y-3.5 text-xs font-medium">
              <div className="flex justify-between text-muted-foreground">
                <span>Items Subtotal</span>
                <span className="text-foreground">{inr(rawSubtotal)}</span>
              </div>
              {discountCents > 0 && (
                <div className="flex justify-between text-accent font-semibold">
                  <span>Coupon Discount ({couponCode})</span>
                  <span>-{inr(discountCents)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping Delivery</span>
                <span className="text-foreground">
                  {deliveryCharge === 0 ? "Free" : inr(deliveryCharge)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST (18% inclusive)</span>
                <span className="text-foreground">{inr(tax)}</span>
              </div>

              <div className="border-t border-border pt-4 mt-2">
                <div className="flex justify-between items-baseline">
                  <span className="font-display text-base font-bold">Total Amount</span>
                  <span className="font-display text-xl font-extrabold text-accent">
                    {inr(total)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-muted/40 p-3.5 border border-border/60 rounded-2xl text-[10px] text-muted-foreground leading-relaxed flex flex-col gap-1 mt-4">
              <span className="font-bold text-foreground">Checkout Safety:</span>
              <span>
                ViaCraft guarantees museum-grade packaging and logistics insurance coverage for all
                custom orders.
              </span>
            </div>
          </aside>
        </div>
      </section>

      {/* Razorpay Gateway Simulator Dialog Modal */}
      {isRazorpaySimulating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#12121e] border border-[#212135] w-full max-w-sm rounded-2xl shadow-2xl p-6 text-white text-center space-y-6">
            <div className="flex justify-between items-center border-b border-[#212135] pb-3 text-xs">
              <span className="text-indigo-400 font-bold uppercase tracking-widest text-[9px]">
                Razorpay Payment Gateway
              </span>
              <span className="text-[#a5a5c5]">ViaCraft Order</span>
            </div>

            <div className="space-y-2">
              <p className="text-2xl font-bold font-display text-accent">{inr(total)}</p>
              <p className="text-[10px] text-[#8e8ea6]">
                Transaction ID: TXN_RAZ_{Math.floor(100000 + Math.random() * 900000)}
              </p>
            </div>

            <div className="p-4 bg-[#1b1b2d] rounded-xl text-xs flex items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              <span className="text-[#a5a5c5] font-semibold">
                Authorizing with UPI payment app...
              </span>
            </div>

            <p className="text-[9px] text-[#5e5e78]">
              Do not reload this page. Secure sandbox environment.
            </p>
          </div>
        </div>
      )}
    </PageShell>
  );
}