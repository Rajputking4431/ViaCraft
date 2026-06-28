import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/layouts/PageShell";
import { ProductCard } from "@/components/ProductCard";
import { QuickViewModal } from "@/components/QuickViewModal";
import { inr } from "@/utils/format";
import { useState, useEffect } from "react";
import { trackCategoryView, trackSearch } from "@/services/analytics/google";
import {
  Filter,
  Grid,
  List,
  ChevronRight,
  X,
  RotateCcw,
  SlidersHorizontal,
  Star,
  Search,
  ChevronDown,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — ViaCraft" },
      {
        name: "description",
        content:
          "Browse handmade resin jewelry, keychains, coasters, home decor and bespoke keepsakes from independent artisans.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    cat: typeof search.cat === "string" ? search.cat : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  component: ShopPage,
});

const SHOP_CATEGORIES = [
  "Resin Clocks",
  "Resin Trays",
  "Resin Coasters",
  "Resin Jewelry",
  "Car Hanging",
  "Resin Keychains",
  "Baby Casting",
  "Preservation",
  "Candle Art",
  "Resin Tables",
  "Gift Sets",
  "Premium Collection",
];

const MATERIALS = ["Epoxy Resin", "Dried Flowers", "Wood", "Silicon", "Metal", "Gold Foil"];
const COLORS = [
  "Clear",
  "Gold Accent",
  "Blue",
  "Rose Pink",
  "Emerald Green",
  "White",
  "Geode Violet",
];

function ShopPage() {
  const navigate = useNavigate();
  // Read category and search query parameters if passed from header/homepage
  const routeSearch = Route.useSearch() as any;
  const initialCat = routeSearch?.cat || null;
  const initialQ = routeSearch?.q || "";

  const [cat, setCat] = useState<string | null>(initialCat);
  const [q, setQ] = useState(initialQ);
  const [sort, setSort] = useState<
    "newest" | "price_asc" | "price_desc" | "best_rated" | "popularity"
  >("newest");
  const [priceMax, setPriceMax] = useState<number>(10000);
  const [ratingMin, setRatingMin] = useState<number | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [material, setMaterial] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [customizable, setCustomizable] = useState<boolean | null>(null);
  const [inStock, setInStock] = useState<boolean>(false);
  const [isListView, setIsListView] = useState(false);
  const [limit, setLimit] = useState(8);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [quickViewId, setQuickViewId] = useState<string | null>(null);

  // Sync route query params
  useEffect(() => {
    setCat(routeSearch?.cat || null);
    setQ(routeSearch?.q || "");
  }, [routeSearch?.cat, routeSearch?.q]);

  // Track category view when category filter changes
  useEffect(() => {
    if (cat) {
      trackCategoryView(cat);
    }
  }, [cat]);

  // Track search event with debounce to prevent tracking single keystrokes
  useEffect(() => {
    if (!q || !q.trim()) return;
    const timer = setTimeout(() => {
      trackSearch(q);
    }, 1000);
    return () => clearTimeout(timer);
  }, [q]);

  const handleCatChange = (newCat: string | null) => {
    navigate({
      to: "/shop",
      search: (prev: any) => ({
        ...prev,
        cat: newCat || undefined,
      }),
    });
  };

  // Query vendors
  const { data: vendorList = [] } = useQuery({
    queryKey: ["shop-vendors-list"],
    queryFn: async () =>
      (await supabase.from("vendors").select("id, store_name").eq("status", "approved")).data ?? [],
  });

  // Query products with full active filters list
  const { data: products = [], isLoading } = useQuery({
    queryKey: [
      "shop-products",
      cat,
      sort,
      q,
      priceMax,
      ratingMin,
      vendorId,
      material,
      color,
      customizable,
      inStock,
      limit,
    ],
    queryFn: async () => {
      let qb = supabase
        .from("products")
        .select("*, vendors(store_name, slug, location)")
        .eq("is_published", true);

      if (cat) qb = qb.eq("custom_url", cat);
      if (q) qb = qb.ilike("title", `%${q}%`);
      if (priceMax) qb = qb.lte("price_cents", priceMax * 100);
      if (ratingMin) qb = qb.gte("rating", ratingMin);
      if (vendorId) qb = qb.eq("vendor_id", vendorId);
      if (material) qb = qb.eq("material", material);
      if (color) qb = qb.eq("color", color);
      if (customizable !== null) qb = qb.eq("is_customizable", customizable);
      if (inStock) qb = qb.gt("stock", 0);

      if (sort === "price_asc") qb = qb.order("price_cents", { ascending: true });
      else if (sort === "price_desc") qb = qb.order("price_cents", { ascending: false });
      else if (sort === "best_rated") qb = qb.order("rating", { ascending: false });
      else if (sort === "popularity") qb = qb.order("review_count", { ascending: false });
      else qb = qb.order("created_at", { ascending: false });

      qb = qb.limit(limit);
      return (await qb).data ?? [];
    },
  });

  const resetFilters = () => {
    setCat(null);
    setQ("");
    setPriceMax(10000);
    setRatingMin(null);
    setVendorId(null);
    setMaterial(null);
    setColor(null);
    setCustomizable(null);
    setInStock(false);
    navigate({
      to: "/shop",
      search: {},
    });
  };

  const selectedCatName = cat || "All Collections";

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6 select-none">
          <Link to="/" className="hover:text-accent font-medium">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/shop" onClick={() => setCat(null)} className="hover:text-accent font-medium">
            Shop
          </Link>
          {cat && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-semibold">{selectedCatName}</span>
            </>
          )}
        </nav>

        {/* Headings */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-accent font-bold mb-1.5">
            Artisan Marketplace
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-foreground">
            {selectedCatName}
          </h1>
        </div>

        {/* Search, Sort, View controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-stretch md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 h-4 w-4 text-muted-foreground top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search pieces by title..."
              className="w-full pl-11 pr-4 py-2.5 rounded-full bg-card border border-border focus:border-accent outline-none text-xs shadow-inner"
            />
          </div>

          <div className="flex items-center gap-3 justify-between md:justify-end">
            <button
              onClick={() => setIsMobileFiltersOpen(true)}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-card border border-border hover:border-accent rounded-full text-xs font-semibold lg:hidden cursor-pointer"
            >
              <Filter className="h-4 w-4" /> Filters
            </button>

            <div className="flex items-center gap-3">
              <div className="relative flex items-center">
                <SlidersHorizontal className="absolute left-3.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="pl-9 pr-6 py-2.5 rounded-full bg-card border border-border outline-none text-xs font-medium cursor-pointer appearance-none"
                >
                  <option value="newest">Sort: Newest</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                  <option value="best_rated">Best Rated</option>
                  <option value="popularity">Popularity</option>
                </select>
                <ChevronDown className="absolute right-3.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>

              {/* Grid / List view toggle */}
              <div className="hidden sm:flex border border-border rounded-full p-1 bg-card">
                <button
                  onClick={() => setIsListView(false)}
                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${!isListView ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  title="Grid View"
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsListView(true)}
                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${isListView ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  title="List View"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8 items-start">
          {/* Collapsible Sidebar Filters (Desktop Only) */}
          <aside className="hidden lg:block bg-card border border-border/80 rounded-3xl p-6 space-y-6 sticky top-24 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <h3 className="font-display text-lg font-bold">Filter Options</h3>
              <button
                onClick={resetFilters}
                className="text-[10px] uppercase tracking-wider font-semibold text-accent hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" /> Reset All
              </button>
            </div>

            {/* Category selection */}
            <div>
              <h4 className="text-xs uppercase tracking-wider font-bold text-foreground mb-3">
                Categories
              </h4>
              <div className="space-y-1.5">
                <button
                  onClick={() => handleCatChange(null)}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${!cat ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted text-foreground/80"}`}
                >
                  All Categories
                </button>
                {SHOP_CATEGORIES.map((catName) => (
                  <button
                    key={catName}
                    onClick={() => handleCatChange(catName)}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${cat === catName ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted text-foreground/80"}`}
                  >
                    {catName}
                  </button>
                ))}
              </div>
            </div>

            {/* Price slider */}
            <div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-3">
                <span>Max Price</span>
                <span className="text-accent">{inr(priceMax * 100)}</span>
              </div>
              <input
                type="range"
                min="500"
                max="30000"
                step="500"
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                className="w-full accent-accent bg-muted h-1 rounded-full cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>₹500</span>
                <span>₹30,000+</span>
              </div>
            </div>

            {/* Ratings Filter */}
            <div>
              <h4 className="text-xs uppercase tracking-wider font-bold text-foreground mb-3">
                Customer Review
              </h4>
              <div className="space-y-1">
                {[4, 3, 2].map((stars) => (
                  <button
                    key={stars}
                    onClick={() => setRatingMin(ratingMin === stars ? null : stars)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs cursor-pointer ${ratingMin === stars ? "bg-accent/15 text-accent font-semibold" : "hover:bg-muted text-foreground/85"}`}
                  >
                    <div className="flex items-center text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < stars ? "fill-current" : "text-muted"}`}
                        />
                      ))}
                    </div>
                    <span>& Up</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => setInStock(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent h-4 w-4 accent-accent"
                />
                <span className="font-semibold">In Stock Items Only</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={customizable === true}
                  onChange={(e) => setCustomizable(customizable === true ? null : true)}
                  className="rounded border-border text-accent focus:ring-accent h-4 w-4 accent-accent"
                />
                <span className="font-semibold">Supports Custom Text</span>
              </label>
            </div>
          </aside>

          {/* Main Products Grid Column */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-muted rounded-3xl animate-pulse" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-border rounded-3xl bg-card">
                <SlidersHorizontal className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <p className="font-display text-2xl font-bold mb-2">No matching pieces found</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-6">
                  Try adjusting filters or changing search keywords to discover premium resin
                  collections.
                </p>
                <button
                  onClick={resetFilters}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-xs font-semibold cursor-pointer shadow"
                >
                  Clear All Filters
                </button>
              </div>
            ) : isListView ? (
              /* List Layout */
              <div className="space-y-4">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="bg-card border border-border/60 hover:border-accent/30 rounded-3xl p-5 flex flex-col sm:flex-row gap-5 shadow-sm transition-all"
                  >
                    <div className="h-44 w-44 rounded-2xl overflow-hidden bg-muted shrink-0 relative aspect-square mx-auto sm:mx-0">
                      {p.cover_image ? (
                        <img src={p.cover_image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full grid place-items-center font-display text-4xl bg-gradient-hero">
                          {p.title[0]}
                        </div>
                      )}
                      {p.is_customizable && (
                        <span className="absolute top-3 left-3 bg-foreground/90 text-background text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                          Customizable
                        </span>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1 text-center sm:text-left">
                      <div className="space-y-2">
                        {p.vendors && (
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-accent">
                            By {p.vendors.store_name}
                          </p>
                        )}
                        <h3 className="font-display text-xl font-bold text-foreground hover:text-accent cursor-pointer">
                          <Link to="/products/$slug" params={{ slug: p.slug }}>
                            {p.title}
                          </Link>
                        </h3>
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-amber-500">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="font-bold text-foreground">
                            {Number(p.rating).toFixed(1)}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            ({p.review_count} ratings)
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 max-w-xl">
                          {p.description ??
                            "Beautiful handcrafted resin keepsake, polished and detailed by independent artisans."}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-border/40 pt-4 mt-4 gap-4">
                        <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                          <span className="font-display text-xl font-bold">
                            {inr(p.price_cents)}
                          </span>
                          {p.compare_at_cents && p.compare_at_cents > p.price_cents && (
                            <span className="text-xs text-muted-foreground line-through">
                              {inr(p.compare_at_cents)}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setQuickViewId(p.id)}
                            className="px-4.5 py-2 bg-muted hover:bg-border transition-colors text-xs font-semibold rounded-full border border-border cursor-pointer"
                          >
                            Quick View
                          </button>
                          <Link
                            to="/products/$slug"
                            params={{ slug: p.slug }}
                            className="px-5 py-2 bg-primary text-primary-foreground hover:bg-foreground transition-colors text-xs font-semibold rounded-full"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Grid Layout */
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p as any} onQuickView={setQuickViewId} />
                ))}
              </div>
            )}

            {/* Pagination / Load More */}
            {products.length >= limit && (
              <div className="text-center mt-12">
                <button
                  onClick={() => setLimit((prev) => prev + 6)}
                  className="px-7 py-3 rounded-full border border-border hover:border-accent bg-card hover:text-accent font-semibold text-xs tracking-wider uppercase transition-all shadow-sm cursor-pointer"
                >
                  Load More Pieces
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Swipe Filters Drawer overlay */}
      <AnimatePresence>
        {isMobileFiltersOpen && (
          <div className="fixed inset-0 z-50 flex items-end animate-in fade-in duration-200">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMobileFiltersOpen(false)}
            />
            <div className="relative w-full bg-card rounded-t-[2.5rem] border-t border-border shadow-luxe p-6 max-h-[85vh] overflow-y-auto z-10 animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
                <h3 className="font-display text-xl font-bold">Filters</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      resetFilters();
                      setIsMobileFiltersOpen(false);
                    }}
                    className="text-xs text-accent font-bold"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setIsMobileFiltersOpen(false)}
                    className="p-1 rounded-full bg-muted text-muted-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Categories */}
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-bold text-foreground mb-3">
                    Categories
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleCatChange(null)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${!cat ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground/80 bg-background"}`}
                    >
                      All
                    </button>
                    {SHOP_CATEGORIES.map((catName) => (
                      <button
                        key={catName}
                        onClick={() => handleCatChange(catName)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-all ${cat === catName ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground/80 bg-background"}`}
                      >
                        {catName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price range */}
                <div>
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                    <span>Max Price</span>
                    <span className="text-accent">{inr(priceMax * 100)}</span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="30000"
                    step="500"
                    value={priceMax}
                    onChange={(e) => setPriceMax(Number(e.target.value))}
                    className="w-full accent-accent bg-muted h-1 rounded-full cursor-pointer"
                  />
                </div>

                {/* Rating */}
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-bold text-foreground mb-2">
                    Review Rating
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[4, 3, 2].map((stars) => (
                      <button
                        key={stars}
                        onClick={() => setRatingMin(ratingMin === stars ? null : stars)}
                        className={`py-2 rounded-xl text-xs border text-center transition-all ${ratingMin === stars ? "border-accent bg-accent/10 text-accent font-semibold" : "border-border hover:border-accent text-foreground/85 bg-background"}`}
                      >
                        ★ {stars} & Up
                      </button>
                    ))}
                  </div>
                </div>

                {/* Checks */}
                <div className="flex flex-col gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={inStock}
                      onChange={(e) => setInStock(e.target.checked)}
                      className="rounded border-border text-accent focus:ring-accent h-4 w-4"
                    />
                    <span className="font-semibold">In Stock Items Only</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={customizable === true}
                      onChange={(e) => setCustomizable(customizable === true ? null : true)}
                      className="rounded border-border text-accent focus:ring-accent h-4 w-4"
                    />
                    <span className="font-semibold">Supports Custom Text Inclusions</span>
                  </label>
                </div>
              </div>

              <div className="pt-8">
                <button
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-full text-xs uppercase tracking-wider"
                >
                  Apply Filters ({products.length} items)
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Reusable Quick View Modal overlay */}
      <AnimatePresence>
        {quickViewId && (
          <QuickViewModal productId={quickViewId} onClose={() => setQuickViewId(null)} />
        )}
      </AnimatePresence>
    </PageShell>
  );
}
