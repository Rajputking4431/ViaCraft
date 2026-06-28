import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/layouts/PageShell";
import { ProductCard } from "@/components/ProductCard";
import { ProductReviewForm } from "@/components/ProductReviewForm";
import { inr } from "@/utils/format";
import { parseProductDescription, type SizeOption } from "@/utils/product-variations";
import { addProductToCart } from "@/api/cart";
import { fetchProductReviews } from "@/api/reviews";
import { isProductWishlisted, toggleProductWishlist } from "@/api/wishlist";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trackProductView, trackAddToCart, trackWishlistAdd } from "@/services/analytics/google";
import {
  Heart,
  ShoppingBag,
  Truck,
  ShieldCheck,
  Sparkles,
  Star,
  Play,
  ChevronRight,
  HelpCircle,
  CheckCircle,
  Clock,
  ThumbsUp,
  Image as ImageIcon,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/products/$slug")({
  head: ({ params }: any) => ({ meta: [{ title: `${params.slug.replace(/-/g, " ")} — ViaCraft` }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    tab:
      search.tab === "details" || search.tab === "shipping" || search.tab === "reviews"
        ? search.tab
        : undefined,
  }),
  component: ProductPage,
});

// Mock Q&As
const QA_LIST = [
  {
    q: "Is the epoxy resin heat-resistant?",
    a: "Yes, our resins are rated for heat resistance up to 70°C (158°F). We recommend using coasters for hot beverages rather than boiling plates directly.",
  },
  {
    q: "Will the clear resin turn yellow over time?",
    a: "No. Our artisans utilize top-tier UV-inhibited museum-grade resin which preserves clarity and resists yellowing under indirect sunlight.",
  },
  {
    q: "Can I request changes to flowers placement?",
    a: "Yes, for customizable orders. Once you place the order, the artisan will share a digital mockup of the arrangement for your confirmation before casting.",
  },
];

function ProductPage() {
  const { slug } = Route.useParams() as { slug: string };
  const { tab } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [qty, setQty] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<"details" | "shipping" | "reviews">("details");

  useEffect(() => {
    if (tab === "reviews") {
      const el = document.getElementById("reviews-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    } else if (tab === "details" || tab === "shipping" || tab === "reviews") {
      setActiveTab(tab);
    }
  }, [tab]);

  // Customization choices
  const [engravingText, setEngravingText] = useState("");
  const [selectedBase, setSelectedBase] = useState("standard");
  const [pinCode, setPinCode] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<string | null>(null);

  // Bundle checkboxes
  const [includeStand, setIncludeStand] = useState(true);
  const [includePolish, setIncludePolish] = useState(true);

  // Selected size variation
  const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);

  // Fetch product detail
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, vendors(id,slug,store_name,location,rating,tagline)")
        .eq("slug", slug)
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

  // Track product view when details load
  useEffect(() => {
    if (product) {
      trackProductView(product as any);
    }
  }, [product]);

  const [visibleRelatedCount, setVisibleRelatedCount] = useState(4);

  // Fetch related products (same category)
  const { data: relatedProducts = [] } = useQuery({
    queryKey: ["related-products", product?.category_id, product?.id],
    enabled: !!product,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, vendors(store_name, slug)")
        .eq("category_id", product!.category_id!)
        .neq("id", product!.id)
        .eq("is_published", true)
        .limit(20);
      return data ?? [];
    },
  });

  // Fetch reviews (public — works for guests and signed-in users)
  const { data: dbReviews = [] } = useQuery({
    queryKey: ["product-reviews", product?.id],
    enabled: !!product,
    queryFn: () => fetchProductReviews(product!.id),
  });

  const reviewCount = dbReviews.length;
  const averageRating =
    reviewCount > 0
      ? dbReviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
      : Number(product?.rating ?? 0);

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
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: isWishlisted = false, refetch: refetchWishlist } = useQuery({
    queryKey: ["is-wishlisted", product?.id, user?.id],
    enabled: !!product?.id,
    queryFn: () => isProductWishlisted(product!.id, user?.id),
  });

  // Wishlist mutation
  const wishlist = useMutation({
    mutationFn: async () => {
      return toggleProductWishlist(product!.id, user?.id, isWishlisted);
    },
    onSuccess: (liked) => {
      refetchWishlist();
      qc.invalidateQueries({ queryKey: ["wishlist-count"] });
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success(liked ? "Saved to wishlist" : "Removed from wishlist");
      if (liked) {
        trackWishlistAdd(product! as any);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  // Quick checkout buy now
  const handleBuyNow = async () => {
    try {
      if (selectedSize) {
        const variationsStr = localStorage.getItem("cart_item_variations") || "{}";
        const variations = JSON.parse(variationsStr);
        variations[product!.id] = {
          size: selectedSize.inches,
          price_cents: selectedSize.price * 100,
        };
        localStorage.setItem("cart_item_variations", JSON.stringify(variations));
      }
      await addToCart.mutateAsync();
      if (!user) {
        navigate({ to: "/auth", search: { redirect: "/checkout" } });
      } else {
        navigate({ to: "/checkout" });
      }
    } catch (err) {
      // handled
    }
  };

  const checkDelivery = () => {
    if (pinCode.trim().length !== 6 || isNaN(Number(pinCode))) {
      toast.error("Please enter a valid 6-digit PIN code.");
      return;
    }
    const days = pinCode.startsWith("400") ? 3 : 5;
    const est = new Date();
    est.setDate(est.getDate() + days);
    setDeliveryDate(
      est.toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" }),
    );
    toast.success("Delivery estimate updated!");
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="aspect-square bg-muted rounded-3xl animate-pulse" />
            <div className="space-y-6">
              <div className="h-8 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
              <div className="h-20 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!product) {
    return (
      <PageShell>
        <div className="mx-auto max-w-7xl px-6 py-24 text-center">
          <h1 className="font-display text-4xl font-bold mb-4">Piece not found</h1>
          <Link to="/shop" className="text-accent underline">
            Back to Shop Collection
          </Link>
        </div>
      </PageShell>
    );
  }

  const images = (product.images as string[] | null)?.length
    ? (product.images as string[])
    : product.cover_image
      ? [product.cover_image]
      : [];

  const { description: cleanDescription, sizes } = parseProductDescription(product.description);
  const basePrice = selectedSize ? selectedSize.price * 100 : product.price_cents;
  const standCost = includeStand ? 49900 : 0;
  const bundleTotal = basePrice + standCost + (includePolish ? 29900 : 0);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-8 select-none">
          <Link to="/" className="hover:text-accent font-medium">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/shop" className="hover:text-accent font-medium">
            Shop
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-semibold truncate max-w-[150px] sm:max-w-none">
            {product.title}
          </span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Side: Thumbnail Selector & Interactive Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-card border border-border shadow-luxe group">
              {images[activeImageIdx] ? (
                <img
                  src={images[activeImageIdx]}
                  alt={product.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-103 cursor-zoom-in"
                />
              ) : (
                <div className="h-full w-full grid place-items-center text-muted-foreground font-display text-3xl">
                  {product.title[0]}
                </div>
              )}

              {/* Mock Video Play Overlay if video thumbnail index is clicked */}
              {activeImageIdx === 1 && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <button
                    onClick={() => toast.info("Artisan crafting video coming soon!")}
                    className="p-5 bg-white text-foreground rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Play className="h-6 w-6 fill-current text-accent" />
                  </button>
                </div>
              )}
            </div>

            {/* Thumbnail Carousel */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIdx(i)}
                    className={`h-20 w-20 rounded-2xl overflow-hidden bg-card border shrink-0 relative transition-all cursor-pointer ${
                      activeImageIdx === i
                        ? "border-accent ring-1 ring-accent"
                        : "border-border hover:border-accent/40"
                    }`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    {i === 1 && (
                      <span className="absolute inset-0 bg-black/25 flex items-center justify-center text-white">
                        <Play className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Side: Product Details & Options */}
          <div className="space-y-6">


            {/* Title */}
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight">
              {product.title}
            </h1>

            {/* Ratings & Stock Status */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                <Star className="h-4 w-4 fill-current" />
                <span className="text-foreground">{averageRating.toFixed(1)}</span>
                <span className="text-muted-foreground font-normal">
                  ({reviewCount} customer review{reviewCount === 1 ? "" : "s"})
                </span>
              </div>
              <span className="text-border">|</span>
              <div>
                {product.stock > 0 ? (
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full font-bold uppercase tracking-wider text-[9px]">
                    In Stock ({product.stock} units)
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-accent rounded-full font-bold uppercase tracking-wider text-[9px]">
                    Made to order (7-10 days)
                  </span>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="flex items-baseline gap-3 pt-2">
              <span className="font-display text-3xl sm:text-4xl font-extrabold text-foreground">
                {inr(basePrice)}
              </span>
              {product.compare_at_cents && product.compare_at_cents > basePrice && (
                <>
                  <span className="text-sm text-muted-foreground line-through">
                    {inr(product.compare_at_cents)}
                  </span>
                  <span className="text-xs font-bold text-accent">
                    (
                    {Math.round(
                      ((product.compare_at_cents - basePrice) /
                        product.compare_at_cents) *
                        100,
                    )}
                    % OFF)
                  </span>
                </>
              )}
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {cleanDescription ||
                "Beautiful handmade resin piece, detailed and polished by certified artisans. Safe UV-inhibited casting resists yellowing and ensures lifespan."}
            </p>

            {/* Product Specifications Badge Grid */}
            <div className="grid grid-cols-3 gap-2 text-[10px] text-center pt-2">
              {product.material && (
                <div className="p-3 bg-muted/40 border border-border/40 rounded-2xl flex flex-col justify-center">
                  <span className="text-muted-foreground uppercase tracking-wider">Material</span>
                  <span className="font-bold text-foreground mt-1">{product.material}</span>
                </div>
              )}
              {product.color && (
                <div className="p-3 bg-muted/40 border border-border/40 rounded-2xl flex flex-col justify-center">
                  <span className="text-muted-foreground uppercase tracking-wider">
                    Color Theme
                  </span>
                  <span className="font-bold text-foreground mt-1">{product.color}</span>
                </div>
              )}
              {product.is_customizable && (
                <div className="p-3 bg-accent/10 border border-accent/20 rounded-2xl flex flex-col justify-center text-accent font-semibold">
                  <span className="uppercase tracking-wider">Custom Option</span>
                  <span className="mt-1 flex items-center justify-center gap-1">
                    Available <Sparkles className="h-3 w-3" />
                  </span>
                </div>
              )}
            </div>

            {/* Customizable options input */}
            {product.is_customizable && (
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground block">
                  Custom Inscription Name / Message
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rhean & Kevin, 06.06.2026 (Max 30 characters)"
                  maxLength={30}
                  value={engravingText}
                  onChange={(e) => setEngravingText(e.target.value)}
                  className="w-full px-4.5 py-3 rounded-xl bg-card border border-border focus:border-accent outline-none text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  This message will be handwritten or custom printed and cast inside the resin
                  block.
                </p>
              </div>
            )}

            {/* Size Selector (Flipkart/Amazon reference) */}
            {sizes.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground block">
                    Select Size
                  </label>
                  <span className="text-[10px] text-muted-foreground">Dimensions in inches</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((op) => (
                    <button
                      key={op.size}
                      type="button"
                      onClick={() => setSelectedSize(op)}
                      className={`p-3 rounded-2xl border text-center flex flex-col justify-center transition-all cursor-pointer min-w-[90px] select-none ${
                        selectedSize?.size === op.size
                          ? "border-accent bg-accent/5 ring-1 ring-accent text-accent font-bold"
                          : "border-border hover:border-accent/30 text-foreground/80 bg-card"
                      }`}
                    >
                      <span className="text-xs">{op.size}</span>
                      <span className="text-[9px] text-muted-foreground mt-0.5">{op.inches}</span>
                      <span className="text-[10px] font-bold text-foreground/90 mt-1">{inr(op.price * 100)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sizing / Base variations selection (conditional) */}
            {((product.custom_url === "Resin Clocks" || 
               product.custom_url === "Resin Tables" || 
               product.title.toLowerCase().includes("lamp") || 
               product.title.toLowerCase().includes("clock") ||
               product.title.toLowerCase().includes("table")) &&
              sizes.length === 0) && (
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground block">
                  Select Base Lamp Add-on
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "standard", label: "No Stand", price: "Free" },
                    { id: "led", label: "LED Warm Stand", price: "+₹499" },
                    { id: "rotary", label: "Rotary Light Base", price: "+₹799" },
                  ].map((op) => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setSelectedBase(op.id)}
                      className={`p-3 rounded-2xl border text-center flex flex-col justify-center transition-all cursor-pointer ${
                        selectedBase === op.id
                          ? "border-accent bg-accent/5 ring-1 ring-accent text-accent font-bold"
                          : "border-border hover:border-accent/30 text-foreground/80 bg-card"
                      }`}
                    >
                      <span className="text-xs">{op.label}</span>
                      <span className="text-[9px] text-muted-foreground mt-0.5">{op.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Shipping Delivery Estimate Widget */}
            <div className="p-4 bg-muted/30 border border-border/60 rounded-3xl space-y-3 pt-3">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground block">
                Check Delivery Timeline
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter 6-digit PIN code (e.g. 400001)"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-full bg-card border border-border focus:border-accent outline-none text-xs"
                />
                <button
                  onClick={checkDelivery}
                  className="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-foreground transition-all rounded-full text-xs font-semibold cursor-pointer"
                >
                  Verify
                </button>
              </div>
              {deliveryDate && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4" />
                  Estimated Delivery by <strong>{deliveryDate}</strong>
                </p>
              )}
            </div>

            {/* Quantity Counter & Add-to-Cart Buttons */}
            <div className="flex items-center gap-3 pt-4">
              <div className="flex items-center border border-border rounded-full shrink-0">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-4 py-3 hover:bg-muted rounded-l-full font-bold"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                <button
                  onClick={() => setQty(qty + 1)}
                  className="px-4 py-3 hover:bg-muted rounded-r-full font-bold"
                >
                  +
                </button>
              </div>

              <button
                onClick={() => addToCart.mutate()}
                disabled={addToCart.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-primary hover:bg-foreground text-primary-foreground font-bold text-xs uppercase tracking-wider transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4" /> Add to Cart
              </button>

              <button
                onClick={() => wishlist.mutate()}
                className="p-3.5 rounded-full border border-border hover:border-accent hover:text-accent transition-colors cursor-pointer"
                aria-label="Wishlist"
              >
                <Heart className={`h-5 w-5 ${isWishlisted ? "fill-rose-500 text-rose-500" : ""}`} />
              </button>
            </div>

            <button
              onClick={handleBuyNow}
              className="w-full py-3.5 rounded-full bg-accent text-accent-foreground hover:bg-foreground hover:text-background transition-all font-bold text-xs uppercase tracking-wider shadow"
            >
              Buy Now (Express Checkout)
            </button>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground pt-4">
              <div className="flex items-center gap-1.5 justify-center p-2 rounded-xl border border-border/50">
                <Truck className="h-4 w-4 text-accent" />
                <span>Free Shipping</span>
              </div>
              <div className="flex items-center gap-1.5 justify-center p-2 rounded-xl border border-border/50">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <span>100% Secure</span>
              </div>
              <div className="flex items-center gap-1.5 justify-center p-2 rounded-xl border border-border/50">
                <Sparkles className="h-4 w-4 text-accent" />
                <span>Certified Handcraft</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Tabs section */}
        <div className="mt-16 border-t border-border/40 pt-10">
          <div className="flex border-b border-border/40 gap-8 mb-8 text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => setActiveTab("details")}
              className={`pb-3.5 relative transition-colors cursor-pointer ${activeTab === "details" ? "text-accent font-bold" : "text-muted-foreground hover:text-foreground"}`}
            >
              Product Details & Sizing
              {activeTab === "details" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("shipping")}
              className={`pb-3.5 relative transition-colors cursor-pointer ${activeTab === "shipping" ? "text-accent font-bold" : "text-muted-foreground hover:text-foreground"}`}
            >
              Shipping & Return Policies
              {activeTab === "shipping" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
              )}
            </button>
          </div>

          <div className="text-xs leading-relaxed max-w-4xl space-y-4">
            {activeTab === "details" && (
              <div className="space-y-4">
                <h4 className="font-display text-lg font-bold text-foreground">
                  Handcraft Specifications
                </h4>
                <p>
                  Every piece listed is cast using high-grade UV-inhibited clear resin blocks which
                  minimize bubble creation and resist yellowing. Materials are dried inside
                  professional silica drying ovens to retain original flower colors and shapes.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Customization: Name prints, gold leaf inserts, glitter foil.</li>
                  <li>Thickness: 2-3 inches deep pour casting.</li>
                  <li>
                    Base option compatible: standard LED stand lamp bases are fitted with warm USB
                    cords.
                  </li>
                  <li>Guarantee: Lifetime bubble stability.</li>
                </ul>
              </div>
            )}

            {activeTab === "shipping" && (
              <div className="space-y-4">
                <h4 className="font-display text-lg font-bold text-foreground">
                  Safe Packing & Courier Details
                </h4>
                <p>
                  Since these items represent precious keepsakes, we package them using
                  double-walled corrugated shipping crates, high-density polyethylene foams, and
                  humidity controls.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Shipping Costs: Free standard shipping on keepsakes above ₹2,500. Express
                    shipping optional.
                  </li>
                  <li>
                    Processing Slot: In-stock items ship within 2 days. Made-to-order slots take
                    7-10 days.
                  </li>
                  <li>
                    Drying Flowers: If shipping fresh flowers to the artisan, raw logistics
                    guidelines are mailed to your address instantly.
                  </li>
                  <li>
                    Returns: 7-day easy returns for damage during transit. Customizable orders are
                    final.
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* 12. Artisan Reviews Section */}
        <section id="reviews-section" className="mt-16 border-t border-border/40 pt-10">
          <h3 className="font-display text-xl font-bold mb-6">
            Artisan Reviews ({dbReviews.length})
          </h3>
          <div className="text-xs leading-relaxed max-w-4xl space-y-6">
            {dbReviews.length === 0 ? (
              <div className="p-6 border border-dashed border-border rounded-2xl text-center text-muted-foreground text-xs">
                No reviews yet. Be the first to share your experience!
              </div>
            ) : (
              <div className="space-y-4 division-y division-border">
                {dbReviews.map((rev) => (
                  <div key={rev.id} className="pt-4 first:pt-0">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-foreground">
                        {rev.profiles?.full_name ?? "Verified Buyer"}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center text-amber-500 gap-0.5 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < rev.rating ? "fill-current" : "text-muted"}`}
                        />
                      ))}
                    </div>
                    {rev.title && (
                      <p className="font-semibold text-xs mt-2 text-foreground">{rev.title}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rev.body}</p>
                  </div>
                ))}
              </div>
            )}

            {product && <ProductReviewForm productId={product.id} productSlug={slug} />}
          </div>
        </section>

        {/* 13. Frequently Bought Together Bundle */}
        {sizes.length === 0 && (
          <section className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 mt-16 shadow-sm">
            <h3 className="font-display text-xl font-bold mb-6">Frequently Bought Together</h3>
            <div className="flex flex-col lg:flex-row items-center gap-6 justify-between">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Product 1 */}
                <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-2xl border border-border/40">
                  <img src={images[0]} alt="" className="h-16 w-16 object-cover rounded-xl" />
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-bold text-foreground truncate max-w-[150px]">
                      {product.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{inr(product.price_cents)}</p>
                  </div>
                </div>

                <span className="text-lg font-bold text-muted-foreground">+</span>

                {/* Product 2 */}
                <label className="flex items-center gap-3 bg-muted/30 p-3 rounded-2xl border border-border/40 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeStand}
                    onChange={(e) => setIncludeStand(e.target.checked)}
                    className="rounded border-border text-accent focus:ring-accent h-4 w-4"
                  />
                  <div className="h-16 w-16 rounded-xl bg-muted grid place-items-center text-accent">
                    ✦
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-bold text-foreground">LED Warm Wood Base</p>
                    <p className="text-[11px] text-muted-foreground">₹499</p>
                  </div>
                </label>

                <span className="text-lg font-bold text-muted-foreground">+</span>

                {/* Product 3 */}
                <label className="flex items-center gap-3 bg-muted/30 p-3 rounded-2xl border border-border/40 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includePolish}
                    onChange={(e) => setIncludePolish(e.target.checked)}
                    className="rounded border-border text-accent focus:ring-accent h-4 w-4"
                  />
                  <div className="h-16 w-16 rounded-xl bg-muted grid place-items-center text-accent">
                    ✦
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-bold text-foreground">Premium Resin Polish Cloth</p>
                    <p className="text-[11px] text-muted-foreground">₹299</p>
                  </div>
                </label>
              </div>

              <div className="text-center lg:text-right pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-border/80 lg:pl-8 space-y-2 shrink-0">
                <p className="text-xs text-muted-foreground">Bundle Total Price</p>
                <p className="font-display text-2xl font-bold text-foreground">{inr(bundleTotal)}</p>
                <button
                  onClick={() => {
                    addToCart.mutate();
                    toast.success("Added bundle add-ons to cart!");
                  }}
                  className="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-foreground transition-colors text-xs font-bold rounded-full uppercase tracking-wider cursor-pointer"
                >
                  Add Bundle to Cart
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 14. Explore More Products Button */}
        <div className="mt-12 text-center">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-card hover:bg-muted border border-border hover:border-accent text-foreground hover:text-accent font-bold text-xs uppercase tracking-wider rounded-full transition-all duration-300 shadow-sm hover:shadow-md hover:scale-102 cursor-pointer"
          >
            Explore More Products
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Related Products Carousel */}
        {relatedProducts.length > 0 && (
          <section className="mt-20">
            <h3 className="font-display text-2xl font-bold mb-8">Related Collections</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedProducts.slice(0, visibleRelatedCount).map((p) => (
                <ProductCard key={p.id} product={p as any} />
              ))}
            </div>
            {relatedProducts.length > visibleRelatedCount && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setVisibleRelatedCount((prev) => prev + 4)}
                  className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-card hover:bg-muted border border-border hover:border-accent text-foreground hover:text-accent font-bold text-xs uppercase tracking-wider rounded-full transition-all duration-300 shadow-sm hover:shadow-md hover:scale-102 cursor-pointer font-sans"
                >
                  Explore More
                </button>
              </div>
            )}
          </section>
        )}
      </section>
    </PageShell>
  );
}
