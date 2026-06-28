import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { X, Star, ShoppingBag, Heart, Shield, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { inr } from "@/utils/format";
import { parseProductDescription, type SizeOption } from "@/utils/product-variations";
import { addProductToCart } from "@/api/cart";
import { isProductWishlisted, toggleProductWishlist } from "@/api/wishlist";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { trackAddToCart, trackWishlistAdd } from "@/services/analytics/google";

interface QuickViewModalProps {
  productId: string | null;
  onClose: () => void;
}

export function QuickViewModal({ productId, onClose }: QuickViewModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);

  // Fetch full details of the product
  const { data: product, isLoading } = useQuery({
    queryKey: ["quick-view-product", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, vendors(id, slug, store_name, location, rating)")
        .eq("id", productId!)
        .maybeSingle();
      return data;
    },
  });

  // Initialize size options
  useEffect(() => {
    if (product) {
      const { sizes } = parseProductDescription(product.description);
      if (sizes.length > 0) {
        setSelectedSize(sizes[0]);
      } else {
        setSelectedSize(null);
      }
    }
  }, [product]);

  // Check if item is wishlisted
  const { data: isWishlisted = false, refetch: refetchWishlist } = useQuery({
    queryKey: ["is-wishlisted", productId, user?.id],
    enabled: !!productId,
    queryFn: () => isProductWishlisted(productId!, user?.id),
  });

  // Toggle Wishlist mutation
  const toggleWishlist = useMutation({
    mutationFn: async () => {
      return toggleProductWishlist(product!.id, user?.id, isWishlisted);
    },
    onSuccess: (liked) => {
      refetchWishlist();
      qc.invalidateQueries({ queryKey: ["wishlist-count"] });
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      qc.invalidateQueries({ queryKey: ["my-wish"] });
      toast.success(liked ? "Saved to wishlist" : "Removed from wishlist");
      if (liked) {
        trackWishlistAdd(product! as any);
      }
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // Add to Cart mutation
  const addToCart = useMutation({
    mutationFn: async () => {
      if (selectedSize) {
        const variationsStr = localStorage.getItem("cart_item_variations") || "{}";
        const variations = JSON.parse(variationsStr);
        variations[product!.id] = {
          size: selectedSize.inches,
          price_cents: selectedSize.price * 100,
        };
        localStorage.setItem("cart_item_variations", JSON.stringify(variations));
      }
      await addProductToCart(product!.id, qty, user?.id);
    },
    onSuccess: () => {
      toast.success("Added to cart");
      qc.invalidateQueries({ queryKey: ["cart-count"] });
      qc.invalidateQueries({ queryKey: ["cart"] });
      
      const trackedProduct = selectedSize
        ? { ...product!, price_cents: selectedSize.price * 100 }
        : product!;
      trackAddToCart(trackedProduct as any, qty);
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  if (!productId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <div className="relative bg-card w-full max-w-4xl rounded-3xl border border-border shadow-luxe overflow-hidden z-10 flex flex-col md:flex-row animate-in zoom-in-95 duration-300 max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground rounded-full border border-border/40 shadow-sm transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        {isLoading ? (
          <div className="w-full h-[450px] flex items-center justify-center bg-card">
            <span className="text-sm text-muted-foreground animate-pulse">Loading preview...</span>
          </div>
        ) : !product ? (
          <div className="w-full p-12 text-center">
            <p className="font-display text-2xl mb-4">Product details not found</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-full text-sm"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Left Image Section */}
            <div className="w-full md:w-1/2 bg-muted relative aspect-square md:aspect-auto md:h-auto min-h-[300px]">
              {product.cover_image ? (
                <img
                  src={product.cover_image}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-muted-foreground font-display text-5xl">
                  {product.title[0]}
                </div>
              )}
            </div>
            {/* Right Details Section */}
            <div className="w-full md:w-1/2 p-6 md:p-8 overflow-y-auto max-h-[50vh] md:max-h-[90vh] flex flex-col justify-between">
              <div>
                {/* Vendor details */}
                {product.vendors && (
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-accent">
                    By {product.vendors.store_name} · {product.vendors.location}
                  </p>
                )}

                {/* Product Title */}
                <h2 className="font-display text-2xl md:text-3xl font-extrabold text-foreground mt-2 leading-tight">
                  {product.title}
                </h2>

                {/* Ratings */}
                <div className="flex items-center gap-1.5 mt-3">
                  <div className="flex items-center text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    {Number(product.rating).toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({product.review_count} ratings)
                  </span>
                </div>

                {/* Pricing info */}
                {(() => {
                  const { description: cleanDescription, sizes } = parseProductDescription(product.description);
                  const activePriceCents = selectedSize ? selectedSize.price * 100 : product.price_cents;
                  return (
                    <>
                      <div className="flex items-baseline gap-2.5 mt-4">
                        <span className="font-display text-2xl font-bold text-foreground">
                          {inr(activePriceCents)}
                        </span>
                        {product.compare_at_cents && product.compare_at_cents > activePriceCents && (
                          <span className="text-sm text-muted-foreground line-through">
                            {inr(product.compare_at_cents)}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed mt-4 line-clamp-3">
                        {cleanDescription ||
                          "A handcrafted resin piece, made to last generations and preserve memories forever."}
                      </p>

                      {/* Size Selector */}
                      {sizes.length > 0 && (
                        <div className="space-y-2 mt-5">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                            Select Size
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {sizes.map((op) => (
                              <button
                                key={op.size}
                                type="button"
                                onClick={() => setSelectedSize(op)}
                                className={`px-3 py-1.5 rounded-xl border text-center flex flex-col justify-center transition-all cursor-pointer select-none min-w-[70px] ${
                                  selectedSize?.size === op.size
                                    ? "border-accent bg-accent/5 ring-1 ring-accent text-accent font-bold"
                                    : "border-border hover:border-accent/30 text-foreground/80 bg-card"
                                }`}
                              >
                                <span className="font-semibold">{op.size}</span>
                                <span className="text-[8px] text-muted-foreground mt-0.5">{op.inches}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Variations attributes summary */}
                <div className="grid grid-cols-2 gap-2 mt-5 text-[11px]">
                  {product.material && (
                    <div className="p-2 rounded-xl bg-muted/60 flex flex-col justify-center">
                      <span className="text-muted-foreground">Material</span>
                      <span className="font-semibold mt-0.5">{product.material}</span>
                    </div>
                  )}
                  {product.color && (
                    <div className="p-2 rounded-xl bg-muted/60 flex flex-col justify-center">
                      <span className="text-muted-foreground">Color Theme</span>
                      <span className="font-semibold mt-0.5">{product.color}</span>
                    </div>
                  )}
                  {product.is_customizable && (
                    <div className="col-span-2 p-2 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center gap-1.5 font-medium">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Supports name or flower inclusions engraving</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-8 pt-4 border-t border-border/40 space-y-4">
                <div className="flex items-center gap-3">
                  {/* Quantity */}
                  <div className="flex items-center border border-border rounded-full shrink-0">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="px-3.5 py-2 hover:bg-muted rounded-l-full"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                    <button
                      onClick={() => setQty(qty + 1)}
                      className="px-3.5 py-2 hover:bg-muted rounded-r-full"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart */}
                  <button
                    onClick={() => addToCart.mutate()}
                    disabled={addToCart.isPending}
                    className="flex-1 py-3 bg-primary hover:bg-foreground text-primary-foreground text-xs font-bold rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <ShoppingBag className="h-4 w-4" /> Add {qty} to Cart
                  </button>

                  {/* Wishlist */}
                  <button
                    onClick={() => toggleWishlist.mutate()}
                    className={`p-3 rounded-full border border-border hover:border-accent hover:text-accent transition-colors cursor-pointer ${
                      isWishlisted
                        ? "bg-rose-50 text-rose-500 border-rose-100 shadow-sm"
                        : "text-muted-foreground"
                    }`}
                    aria-label="Wishlist"
                  >
                    <Heart className={`h-5 w-5 ${isWishlisted ? "fill-rose-500" : ""}`} />
                  </button>
                </div>

                <div className="text-[10px] text-muted-foreground flex justify-between items-center px-1">
                  <span>
                    {product.stock <= 0 ? (
                      <span className="text-accent font-semibold">
                        Made to order (7-10 days drying process)
                      </span>
                    ) : (
                      <span>
                        Stock Status: <strong>{product.stock} available</strong>
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => {
                      onClose();
                      navigate({ to: "/products/$slug", params: { slug: product.slug } });
                    }}
                    className="text-accent font-semibold hover:underline"
                  >
                    View Full Details →
                  </button>
                </div>
              </div>
            </div>{" "}
            {/* <-- This is the newly added closing tag */}
          </>
        )}
      </div>
    </div>
  );
}
