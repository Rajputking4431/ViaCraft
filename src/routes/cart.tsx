import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/layouts/PageShell";
import { inr } from "@/utils/format";
import { useAuth } from "@/hooks/use-auth";
import {
  addProductToCart,
  fetchGuestCartItems,
  fetchUserCartItems,
  removeCartItem,
  updateCartItemQuantity,
  type CartLineItem,
} from "@/api/cart";
import { isProductWishlisted, toggleProductWishlist } from "@/api/wishlist";
import { Trash2, Loader2, ArrowRight, Heart, Bookmark, Tag, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { trackAddToCart, trackWishlistAdd } from "@/services/analytics/google";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — ViaCraft" }] }),
  component: CartPage,
});

interface SavedItem {
  id: string;
  slug: string;
  title: string;
  price_cents: number;
  cover_image: string | null;
  currency: string;
}

function CartPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [couponInput, setCouponInput] = useState("");
  const [activeCoupon, setActiveCoupon] = useState<string | null>(null);
  const [discountRate, setDiscountRate] = useState(0);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);

  // Load Saved for Later items
  useEffect(() => {
    const saved = localStorage.getItem("save_for_later");
    if (saved) {
      try {
        setSavedItems(JSON.parse(saved));
      } catch (e) {
        setSavedItems([]);
      }
    }
  }, []);

  const [variations, setVariations] = useState<Record<string, { size: string; price_cents: number }>>({});

  // Fetch cart items (guest or signed-in)
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["cart", user?.id],
    queryFn: async () => {
      if (user) return fetchUserCartItems(user.id);
      return fetchGuestCartItems();
    },
  });

  // Load variations from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("cart_item_variations");
    if (stored) {
      try {
        setVariations(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse cart item variations", e);
      }
    }
  }, [items]);

  // Update item quantity
  const updateQuantity = useMutation({
    mutationFn: async ({ item, quantity }: { item: CartLineItem; quantity: number }) => {
      await updateCartItemQuantity(item, quantity, user?.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["cart-count"] });
    },
  });

  // Save for Later mutation flow
  const saveForLater = useMutation({
    mutationFn: async ({
      item,
      product,
    }: {
      item: CartLineItem;
      product: NonNullable<CartLineItem["product"]>;
    }) => {
      await removeCartItem(item, user?.id);

      const currentSaved = [...savedItems.filter((saved) => saved.id !== product.id)];
      const updated = [
        {
          id: product.id,
          slug: product.slug,
          title: product.title,
          price_cents: product.price_cents,
          cover_image: product.cover_image,
          currency: product.currency || "INR",
        },
        ...currentSaved,
      ];
      setSavedItems(updated);
      localStorage.setItem("save_for_later", JSON.stringify(updated));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["cart-count"] });
      toast.success("Item saved for later!");
    },
    onError: (e) => toast.error(e.message),
  });

  // Move from Saved to Cart
  const moveToCart = useMutation({
    mutationFn: async (product: SavedItem) => {
      await addProductToCart(product.id, 1, user?.id);

      const updated = savedItems.filter((item) => item.id !== product.id);
      setSavedItems(updated);
      localStorage.setItem("save_for_later", JSON.stringify(updated));
    },
    onSuccess: (data, product) => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["cart-count"] });
      toast.success("Item moved to cart!");
      trackAddToCart(
        {
          id: product.id,
          title: product.title,
          price_cents: product.price_cents,
        },
        1,
      );
    },
    onError: (e) => toast.error(e.message),
  });

  const removeSavedItem = (productId: string) => {
    const updated = savedItems.filter((item) => item.id !== productId);
    setSavedItems(updated);
    localStorage.setItem("save_for_later", JSON.stringify(updated));
    toast.info("Removed saved item");
  };

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (code === "FIRST10") {
      setDiscountRate(0.1);
      setActiveCoupon("FIRST10");
      toast.success("Coupon FIRST10 applied! 10% discount subtracted.");
    } else if (code === "PRESERVE5") {
      setDiscountRate(0.05);
      setActiveCoupon("PRESERVE5");
      toast.success("Coupon PRESERVE5 applied! 5% discount subtracted.");
    } else {
      toast.error("Invalid coupon code. Try FIRST10.");
    }
  };

  // Invoice calculations
  const rawSubtotal = items.reduce((s, it) => {
    const productPrice = it.product
      ? (variations[it.product.id]?.price_cents ?? it.product.price_cents)
      : 0;
    return s + productPrice * it.quantity;
  }, 0);
  const discountAmount = Math.round(rawSubtotal * discountRate);
  const discountedSubtotal = rawSubtotal - discountAmount;

  const shipping = discountedSubtotal >= 250000 || discountedSubtotal === 0 ? 0 : 15000;
  const tax = Math.round(discountedSubtotal * 0.18);
  const total = discountedSubtotal + shipping + tax;

  const handleCheckoutSubmit = () => {
    localStorage.setItem("checkout_discount_cents", discountAmount.toString());
    localStorage.setItem("checkout_coupon_code", activeCoupon ?? "");

    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/checkout" } });
      return;
    }
    navigate({ to: "/checkout" });
  };

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <h1 className="font-display text-4xl font-extrabold mb-8 text-foreground">Shopping Bag</h1>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading bag items...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-3xl bg-card">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-6">
              Discover bouquet preservation and handmade resin collectibles today.
            </p>
            <Link
              to="/collections"
              className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-xs tracking-wider uppercase shadow"
            >
              Explore Collections
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Cart Items list */}
            <div className="lg:col-span-8 space-y-4">
              {items.map(
                (it) =>
                  it.product && (
                    <div
                      key={it.id}
                      className="flex flex-col sm:flex-row gap-5 p-5 rounded-3xl border border-border bg-card shadow-sm hover:border-accent/15 transition-all"
                    >
                      {/* Image */}
                      <Link
                        to="/products/$slug"
                        params={{ slug: it.product.slug }}
                        className="h-24 w-24 rounded-2xl overflow-hidden bg-muted shrink-0 mx-auto sm:mx-0"
                      >
                        {it.product?.cover_image ? (
                          <img
                            src={it.product.cover_image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full grid place-items-center text-muted-foreground font-display text-2xl">
                            {it.product.title[0]}
                          </div>
                        )}
                      </Link>

                      {/* Details info */}
                      <div className="flex-1 flex flex-col justify-between py-0.5 text-center sm:text-left">
                        <div className="space-y-1">
                          <h3 className="font-display text-lg font-bold hover:text-accent">
                            <Link to="/products/$slug" params={{ slug: it.product.slug }}>
                              {it.product.title}
                              {variations[it.product.id] && (
                                <span className="text-xs font-semibold text-accent ml-2">
                                  ({variations[it.product.id].size})
                                </span>
                              )}
                            </Link>
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Unit price: {inr(variations[it.product.id]?.price_cents ?? it.product.price_cents)}
                          </p>
                          {it.product.stock <= 3 && (
                            <p className="text-[10px] text-rose-500 font-bold">
                              Only {it.product.stock} units remaining!
                            </p>
                          )}
                        </div>

                        {/* Controls row */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-border/40">
                          <div className="flex items-center gap-3">
                            {/* Quantity picker */}
                            <div className="flex items-center border border-border rounded-full bg-background">
                              <button
                                onClick={() =>
                                  updateQuantity.mutate({ item: it, quantity: it.quantity - 1 })
                                }
                                className="px-3 py-1 hover:bg-muted rounded-l-full font-bold"
                              >
                                −
                              </button>
                              <span className="w-8 text-center text-xs font-semibold">
                                {it.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity.mutate({ item: it, quantity: it.quantity + 1 })
                                }
                                className="px-3 py-1 hover:bg-muted rounded-r-full font-bold"
                              >
                                +
                              </button>
                            </div>

                            <CartItemLikeButton product={it.product} userId={user?.id} />

                            {/* Save for later trigger */}
                            <button
                              onClick={() => saveForLater.mutate({ item: it, product: it.product as any })}
                              disabled={saveForLater.isPending}
                              className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                            >
                              Save for Later
                            </button>
                          </div>

                          <button
                            onClick={() => updateQuantity.mutate({ item: it, quantity: 0 })}
                            className="text-muted-foreground hover:text-destructive p-2 rounded-full hover:bg-muted transition-colors cursor-pointer"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ),
              )}
            </div>

            {/* Right Column: Coupon & Order Summary */}
            <aside className="lg:col-span-4 space-y-6 sticky top-24">
              {/* Coupon Center Box */}
              <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-3">
                <h3 className="font-display text-base font-bold flex items-center gap-1.5">
                  <Tag className="h-4.5 w-4.5 text-accent" /> Coupon Code
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Voucher code (FIRST10)"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-full bg-background border border-border focus:border-accent outline-none text-xs"
                  />
                  <button
                    onClick={applyCoupon}
                    className="px-5 py-2.5 bg-primary text-primary-foreground hover:bg-foreground transition-all rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {activeCoupon && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Discount code <strong>{activeCoupon}</strong> active (
                    {Math.round(discountRate * 100)}% discount applied).
                  </p>
                )}
                <div className="text-[10px] text-muted-foreground pt-1.5">
                  Available vouchers: <strong>FIRST10</strong> (10% Off keepsakes),{" "}
                  <strong>PRESERVE5</strong> (5% Off).
                </div>
              </div>

              {/* Invoice breakdown summary */}
              <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
                <h3 className="font-display text-xl font-bold border-b border-border pb-3 mb-2">
                  Order Summary
                </h3>

                <Row label="Bag Subtotal" value={inr(rawSubtotal)} />
                {discountAmount > 0 && (
                  <Row label="Coupon Discount" value={`-${inr(discountAmount)}`} highlight />
                )}
                <Row label="Shipping Delivery" value={shipping === 0 ? "Free" : inr(shipping)} />
                <Row label="GST (18% inclusive)" value={inr(tax)} />

                <div className="border-t border-border pt-4 mt-2">
                  <div className="flex justify-between items-baseline">
                    <span className="font-display text-lg font-bold">Total Amount</span>
                    <span className="font-display text-2xl font-extrabold text-accent">
                      {inr(total)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCheckoutSubmit}
                  className="w-full mt-4 py-3.5 rounded-full bg-primary hover:bg-foreground text-primary-foreground hover:scale-101 transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  Proceed to Secure Checkout <ArrowRight className="h-4.5 w-4.5" />
                </button>

                <p className="text-[10px] text-muted-foreground text-center">
                  {!user
                    ? "Sign in required to complete your purchase."
                    : "Payments are secure and processed via verified SSL gateways."}
                </p>
              </div>
            </aside>
          </div>
        )}

        {/* 14. Save For Later List Grid */}
        {savedItems.length > 0 && (
          <div className="mt-20 border-t border-border pt-12">
            <h2 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
              <Bookmark className="h-5.5 w-5.5 text-accent" /> Saved For Later ({savedItems.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {savedItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-card border border-border/60 rounded-3xl p-4 flex flex-col justify-between shadow-sm hover:border-accent/10 transition-all text-center"
                >
                  <div>
                    <Link
                      to="/products/$slug"
                      params={{ slug: item.slug }}
                      className="aspect-square h-32 rounded-2xl overflow-hidden bg-muted block mx-auto mb-3"
                    >
                      {item.cover_image ? (
                        <img src={item.cover_image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-muted-foreground font-display text-2xl">
                          {item.title[0]}
                        </div>
                      )}
                    </Link>
                    <h4 className="font-display text-xs font-bold truncate hover:text-accent">
                      <Link to="/products/$slug" params={{ slug: item.slug }}>
                        {item.title}
                      </Link>
                    </h4>
                    <p className="text-[11px] font-semibold text-accent mt-1">
                      {inr(item.price_cents)}
                    </p>
                  </div>
                  <div className="space-y-2 mt-4 pt-3 border-t border-border/40">
                    <button
                      onClick={() => moveToCart.mutate(item)}
                      disabled={moveToCart.isPending}
                      className="w-full py-1.5 bg-primary hover:bg-foreground text-primary-foreground transition-colors text-[10px] font-bold uppercase rounded-full cursor-pointer disabled:opacity-50"
                    >
                      Move to Cart
                    </button>
                    <button
                      onClick={() => removeSavedItem(item.id)}
                      className="text-[10px] text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}

function CartItemLikeButton({
  product,
  userId,
}: {
  product: {
    id: string;
    title: string;
    price_cents: number;
    material?: string;
    color?: string;
  };
  userId?: string;
}) {
  const productId = product.id;
  const qc = useQueryClient();
  const { data: isWishlisted = false } = useQuery({
    queryKey: ["is-wishlisted", productId, userId],
    queryFn: () => isProductWishlisted(productId, userId),
  });

  const toggleLike = useMutation({
    mutationFn: () => toggleProductWishlist(productId, userId, isWishlisted),
    onSuccess: (liked) => {
      qc.invalidateQueries({ queryKey: ["wishlist-count"] });
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      qc.invalidateQueries({ queryKey: ["is-wishlisted", productId, userId] });
      toast.success(liked ? "Saved to wishlist" : "Removed from wishlist");
      if (liked) {
        trackWishlistAdd(product);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <button
      onClick={() => toggleLike.mutate()}
      disabled={toggleLike.isPending}
      className="text-xs text-muted-foreground hover:text-rose-500 flex items-center gap-1 cursor-pointer font-semibold"
      aria-label={isWishlisted ? "Unlike product" : "Like product"}
    >
      <Heart className={`h-3.5 w-3.5 ${isWishlisted ? "fill-rose-500 text-rose-500" : ""}`} />
      {isWishlisted ? "Liked" : "Like"}
    </button>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-xs font-medium">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "text-accent font-semibold" : "text-foreground"}>{value}</span>
    </div>
  );
}
