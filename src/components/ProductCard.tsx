import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Heart, ShoppingBag, Eye, Star, Truck } from "lucide-react";
import { toast } from "sonner";
import { inr } from "@/utils/format";
import { addProductToCart } from "@/api/cart";
import { isProductWishlisted, toggleProductWishlist } from "@/api/wishlist";
import { useState } from "react";
import { trackAddToCart, trackWishlistAdd } from "@/services/analytics/google";

interface ProductCardProps {
  product: {
    id: string;
    slug: string;
    title: string;
    price_cents: number;
    compare_at_cents: number | null;
    cover_image: string | null;
    rating: number;
    review_count: number;
    stock: number;
    is_customizable: boolean;
    vendors?: {
      store_name: string;
      slug: string;
    } | null;
  };
  onQuickView?: (productId: string) => void;
}

export function ProductCard({ product, onQuickView }: ProductCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);

  // Check if item is wishlisted
  const { data: isWishlisted = false, refetch: refetchWishlist } = useQuery({
    queryKey: ["is-wishlisted", product.id, user?.id],
    queryFn: () => isProductWishlisted(product.id, user?.id),
  });

  // Toggle Wishlist mutation
  const toggleWishlist = useMutation({
    mutationFn: async () => {
      return toggleProductWishlist(product.id, user?.id, isWishlisted);
    },
    onSuccess: (liked) => {
      refetchWishlist();
      qc.invalidateQueries({ queryKey: ["wishlist-count"] });
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      qc.invalidateQueries({ queryKey: ["my-wish"] });
      toast.success(liked ? "Saved to wishlist" : "Removed from wishlist");
      if (liked) {
        trackWishlistAdd(product);
      }
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // Add to Cart mutation
  const addToCart = useMutation({
    mutationFn: async () => {
      await addProductToCart(product.id, 1, user?.id);
    },
    onSuccess: () => {
      toast.success("Added to cart");
      qc.invalidateQueries({ queryKey: ["cart-count"] });
      qc.invalidateQueries({ queryKey: ["cart"] });
      trackAddToCart(product, 1);
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const handleQuickBuy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await addToCart.mutateAsync();
      if (!user) {
        navigate({ to: "/auth", search: { redirect: "/checkout" } });
      } else {
        navigate({ to: "/checkout" });
      }
    } catch (err) {
      // already handled in mutation
    }
  };

  const discountPercentage =
    product.compare_at_cents && product.compare_at_cents > product.price_cents
      ? Math.round(
          ((product.compare_at_cents - product.price_cents) / product.compare_at_cents) * 100,
        )
      : 0;

  return (
    <div
      className="group relative bg-card border border-border/50 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-soft hover:border-accent/30 flex flex-col h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image Section */}
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist.mutate();
          }}
          className={`absolute top-4 right-4 z-10 p-2.5 rounded-full backdrop-blur-md border border-border/40 transition-all duration-300 hover:scale-110 cursor-pointer ${
            isWishlisted
              ? "bg-rose-50 border-rose-100 text-rose-500 shadow-sm"
              : "bg-background/80 hover:bg-background text-foreground/80 hover:text-rose-500"
          }`}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={`h-4 w-4 ${isWishlisted ? "fill-rose-500" : ""}`} />
        </button>

        {/* Discount Tag */}
        {discountPercentage > 0 && (
          <span className="absolute top-4 left-4 z-10 bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
            {discountPercentage}% Off
          </span>
        )}

        {/* Customizable Badge */}
        {product.is_customizable && (
          <span className="absolute bottom-4 left-4 z-10 bg-foreground/90 backdrop-blur-sm text-background text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
            Customizable
          </span>
        )}

        {/* Image */}
        <Link to="/products/$slug" params={{ slug: product.slug }} className="block h-full w-full">
          {product.cover_image ? (
            <img
              src={product.cover_image}
              alt={product.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full grid place-items-center text-muted-foreground font-display text-4xl bg-gradient-hero">
              {product.title[0]}
            </div>
          )}
        </Link>

        {/* Desktop Quick Actions Hover Overlay */}
        <div className="hidden lg:flex absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 items-end justify-center pb-6 gap-2">
          {onQuickView && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickView(product.id);
              }}
              className="p-3 bg-background hover:bg-accent text-foreground hover:text-accent-foreground rounded-full shadow-md hover:scale-105 transition-all duration-200 cursor-pointer"
              title="Quick View"
            >
              <Eye className="h-4.5 w-4.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addToCart.mutate();
            }}
            disabled={addToCart.isPending}
            className="px-5 py-2.5 bg-primary hover:bg-foreground text-primary-foreground text-xs font-semibold rounded-full shadow-md hover:scale-105 transition-all duration-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ShoppingBag className="h-3.5 w-3.5" /> Add to Cart
          </button>
        </div>

        {/* Mobile Quick Action Buttons Overlay (Permanent/Thumb-friendly on hover/touch) */}
        <div className="lg:hidden absolute bottom-3 right-3 flex flex-col gap-1.5">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addToCart.mutate();
            }}
            disabled={addToCart.isPending}
            className="p-2.5 bg-primary/90 backdrop-blur text-primary-foreground rounded-full shadow-md cursor-pointer disabled:opacity-50"
            aria-label="Add to cart"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Vendor Name */}
          {product.vendors && (
            <Link
              to="/store/$slug"
              params={{ slug: product.vendors.slug }}
              className="text-[10px] uppercase tracking-[0.15em] text-accent hover:underline font-semibold block truncate"
            >
              {product.vendors.store_name}
            </Link>
          )}

          {/* Product Title */}
          <Link
            to="/products/$slug"
            params={{ slug: product.slug }}
            className="font-display text-base text-foreground mt-1 group-hover:text-accent transition-colors line-clamp-1 block leading-snug"
          >
            {product.title}
          </Link>

          {/* Ratings & Review Count */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="flex items-center text-amber-500">
              <Star className="h-3.5 w-3.5 fill-current" />
            </div>
            <span className="text-xs font-bold text-foreground">
              {Number(product.rating).toFixed(1)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              ({product.review_count} reviews)
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/40">
          {/* Price & Discounts */}
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg font-bold text-foreground">
              {inr(product.price_cents)}
            </span>
            {product.compare_at_cents && product.compare_at_cents > product.price_cents && (
              <span className="text-xs text-muted-foreground line-through">
                {inr(product.compare_at_cents)}
              </span>
            )}
          </div>

          {/* Logistics & Stock Info */}
          <div className="flex flex-col gap-1 mt-2.5 text-[10px] text-muted-foreground">
            {/* Stock status */}
            <div className="mt-1">
              {product.stock <= 0 ? (
                <span className="text-accent font-semibold">Made to order (7-10 days)</span>
              ) : product.stock <= 3 ? (
                <span className="text-rose-500 font-bold">Only {product.stock} left in stock!</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">In Stock</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile touch-friendly Direct Buy action */}
      <div className="lg:hidden p-3 pt-0 mt-auto">
        <button
          onClick={handleQuickBuy}
          className="w-full py-2 bg-muted hover:bg-primary hover:text-primary-foreground transition-colors text-xs font-semibold rounded-full border border-border"
        >
          Quick Buy
        </button>
      </div>
    </div>
  );
}
