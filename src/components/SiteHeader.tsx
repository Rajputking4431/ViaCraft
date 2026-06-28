import { Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "./Logo";
import {
  ShoppingBag,
  Search,
  Heart,
  User,
  Menu,
  LogOut,
  Bell,
  ChevronDown,
  X,
  History,
  Sparkles,
  Store,
  Compass,
  Tag,
  ArrowRight,
  Headphones,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef } from "react";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { inr } from "@/utils/format";
import { getCartItemCount } from "@/api/cart";
import { getWishlistCount } from "@/api/wishlist";

const POPULAR_SEARCHES = [
  "Bridal bouquet preservation",
  "Resin pendant necklace",
  "Gold foil coasters",
  "Floral alphabet keychain",
  "Hexagon photo pyramid",
];

function NavLink({
  to,
  children,
  search,
  exact,
}: {
  to: string;
  children: React.ReactNode;
  search?: any;
  exact?: boolean;
}) {
  return (
    <Link
      to={to}
      search={search}
      activeOptions={{ exact }}
      activeProps={{ className: "text-accent" }}
      className="relative py-1.5 transition-colors hover:text-accent"
    >
      {({ isActive }: any) => (
        <>
          {children}
          {isActive && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-full" />
          )}
        </>
      )}
    </Link>
  );
}

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recent_searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        setRecentSearches([]);
      }
    }
  }, []);

  // Handle outside clicks to close dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cart Count Query (works for signed-in and guest carts)
  const { data: cartCount = 0 } = useQuery({
    queryKey: ["cart-count", user?.id],
    queryFn: () => getCartItemCount(user?.id),
  });

  // Wishlist Count Query
  const { data: wishlistCount = 0 } = useQuery({
    queryKey: ["wishlist-count", user?.id],
    queryFn: () => getWishlistCount(user?.id),
  });

  // Categories Query for navigation
  const { data: categories = [] } = useQuery({
    queryKey: ["header-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      return data ?? [];
    },
  });

  // Vendor Query for redirection
  const { data: myVendor } = useQuery({
    queryKey: ["my-vendor", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  // Live Autocomplete Suggestions
  const { data: suggestions = [] } = useQuery({
    queryKey: ["search-suggestions", searchQuery],
    enabled: searchQuery.trim().length > 1,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, slug, price_cents, cover_image")
        .ilike("title", `%${searchQuery}%`)
        .limit(5);
      return data ?? [];
    },
  });

  const handleSearchSubmit = (term: string) => {
    if (!term.trim()) return;

    // Save to recent searches
    const updated = [term, ...recentSearches.filter((t) => t !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recent_searches", JSON.stringify(updated));

    setIsSearchFocused(false);
    setIsMobileSearchOpen(false);
    navigate({ to: "/shop", search: { q: term } as any });
  };

  const removeRecentSearch = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter((t) => t !== term);
    setRecentSearches(updated);
    localStorage.setItem("recent_searches", JSON.stringify(updated));
  };

  return (
    <>
      {/* 1. Announcement Bar */}
      <div className="bg-card text-foreground/80 text-[11px] py-2 px-4 sm:px-6 relative z-50 select-none border-b border-border/60">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Left Side Info */}
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-foreground/80 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="text-accent">🚚</span> Free Shipping on Orders above ₹999
            </span>
            <span className="text-border/60 hidden md:inline">|</span>
            <span className="flex items-center gap-1.5">
              <span className="text-rose-500">❤️</span> Handmade with Love in India
            </span>
          </div>
          {/* Right Side Links */}
          <div className="hidden md:flex items-center gap-4 text-foreground/70">
            <Link to="/sell" className="hover:text-accent transition-colors font-medium">
              Sell on ViaCraft
            </Link>
            <span className="text-border/60">|</span>
            <Link
              to="/dashboard"
              className="hover:text-accent transition-colors flex items-center gap-1"
            >
              <span className="text-[10px]">📋</span> Track Order
            </Link>
            <span className="text-border/60">|</span>
            <Link
              to="/legal/$slug"
              params={{ slug: "terms-and-conditions" }}
              className="hover:text-accent transition-colors flex items-center gap-1"
            >
              <span className="text-[10px]">❓</span> Help
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Sticky Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border/50 shadow-sm transition-all duration-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-20 flex items-center justify-between gap-4 md:gap-8">
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 lg:hidden text-foreground hover:text-accent transition-colors"
              aria-label="Toggle navigation drawer"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link to="/" className="flex items-center gap-3 shrink-0">
              <Logo className="h-10 w-auto" />
            </Link>
          </div>

          {/* Search Bar - Desktop */}
          <div ref={searchRef} className="hidden md:flex flex-1 max-w-xl relative">
            <div className="w-full relative flex items-center">
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-4 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search for resin art, preservation, custom creations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit(searchQuery)}
                  className="w-full pl-11 pr-10 py-2.5 rounded-l-full bg-card border border-border border-r-0 focus:border-accent outline-none text-xs shadow-inner transition-all focus:ring-1 focus:ring-accent/40"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 p-0.5 rounded-full hover:bg-muted text-muted-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => handleSearchSubmit(searchQuery)}
                className="px-6 py-[11px] bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-r-full border border-primary transition-all cursor-pointer shadow-sm"
              >
                Search
              </button>
            </div>

            {/* Autocomplete Search Dropdown */}
            {isSearchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border shadow-luxe rounded-2xl overflow-hidden z-50 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                {/* Suggestions list from typing */}
                {searchQuery.trim().length > 1 ? (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-2">
                      Matching Products
                    </h4>
                    {suggestions.length > 0 ? (
                      <div className="space-y-1">
                        {suggestions.map((p) => (
                          <Link
                            key={p.id}
                            to="/products/$slug"
                            params={{ slug: p.slug }}
                            onClick={() => setIsSearchFocused(false)}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted transition-colors"
                          >
                            <img
                              src={p.cover_image ?? ""}
                              alt=""
                              className="h-9 w-9 object-cover rounded-lg bg-muted shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {p.title}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {inr(p.price_cents)}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground px-2 py-1">
                        No products found matching "{searchQuery}"
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1 flex items-center gap-1.5">
                          <History className="h-3 w-3" /> Recent Searches
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {recentSearches.map((term) => (
                            <div
                              key={term}
                              onClick={() => handleSearchSubmit(term)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted hover:bg-muted/80 text-xs font-medium cursor-pointer text-foreground/80 hover:text-accent transition-colors"
                            >
                              <span>{term}</span>
                              <button
                                onClick={(e) => removeRecentSearch(e, term)}
                                className="p-0.5 hover:text-destructive rounded-full"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Popular Searches */}
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1 flex items-center gap-1.5">
                        <Compass className="h-3 w-3" /> Popular Searches
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {POPULAR_SEARCHES.map((term) => (
                          <button
                            key={term}
                            onClick={() => handleSearchSubmit(term)}
                            className="px-3 py-1 rounded-full border border-border hover:border-accent text-xs text-foreground/80 hover:text-accent transition-colors cursor-pointer"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Action Icons (Wishlist, Cart, Account) */}
          <div className="flex items-center gap-2 sm:gap-6 text-foreground/80">
            {/* Search Icon (Mobile) */}
            <button
              onClick={() => setIsMobileSearchOpen(true)}
              className="p-2 md:hidden hover:text-accent transition-colors text-foreground"
              aria-label="Search items"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Wishlist Icon Stacked */}
            <Link
              to="/wishlist"
              className="flex flex-col items-center hover:text-accent transition-colors relative group px-1 sm:px-2 cursor-pointer text-center"
              aria-label="Wishlist"
            >
              <div className="relative">
                <Heart className="h-5 w-5 stroke-[1.8] text-[#5a4331]" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 h-4 w-4 rounded-full bg-[#8a6d4d] text-[8px] text-white grid place-items-center font-bold">
                    {wishlistCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-[#5a4331] group-hover:text-accent mt-1 hidden sm:block">
                Wishlist
              </span>
            </Link>

            {/* Cart Icon Stacked */}
            <Link
              to="/cart"
              className="flex flex-col items-center hover:text-accent transition-colors relative group px-1 sm:px-2 cursor-pointer text-center"
              aria-label="Cart"
            >
              <div className="relative">
                <ShoppingBag className="h-5 w-5 stroke-[1.8] text-[#5a4331]" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 h-4 w-4 rounded-full bg-[#b84a39] text-[8px] text-white grid place-items-center font-bold">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-[#5a4331] group-hover:text-accent mt-1 hidden sm:block">
                Cart
              </span>
            </Link>

            {/* Notifications Bell Dropdown */}
            <NotificationDropdown />

            {/* Account Icon Stacked */}
            <div ref={profileRef} className="relative">
              {user ? (
                <>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex flex-col items-center hover:text-accent transition-colors group px-1 sm:px-2 cursor-pointer text-center"
                    aria-label="Profile navigation"
                  >
                    <div className="h-6 w-6 rounded-full bg-primary/20 text-primary grid place-items-center text-[10px] font-bold uppercase overflow-hidden shrink-0 border border-[#5a4331]/30">
                      {user.user_metadata?.avatar_url ? (
                        <img
                          src={user.user_metadata.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (user.email?.[0] ?? "U")
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-[#5a4331] group-hover:text-accent mt-1 hidden sm:block">
                      Account
                    </span>
                  </button>
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-card border border-border shadow-luxe rounded-2xl overflow-hidden z-50 p-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="px-3 py-2 border-b border-border mb-1.5 text-xs truncate">
                        <p className="font-semibold text-foreground">
                          {user.user_metadata?.full_name ?? "Account"}
                        </p>
                        <p className="text-muted-foreground mt-0.5 truncate">{user.email}</p>
                      </div>
                      <Link
                        to="/dashboard"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-foreground/80 hover:bg-muted hover:text-accent transition-colors"
                      >
                        <User className="h-4 w-4" /> Account Dashboard
                      </Link>
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to="/auth"
                  className="flex flex-col items-center hover:text-accent transition-colors group px-1 sm:px-2 cursor-pointer text-center"
                >
                  <User className="h-5 w-5 stroke-[1.8] text-[#5a4331]" />
                  <span className="text-[10px] font-semibold text-[#5a4331] group-hover:text-accent mt-1 hidden sm:block">
                    Account
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* 2.5 Navigation Bar Row */}
        <div className="hidden lg:block border-t border-border bg-card/50 py-2 px-6">
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            {/* Left Category Dropdown Trigger */}
            <div className="relative shrink-0">
              <button
                onMouseEnter={() => setIsMegaMenuOpen(true)}
                onMouseLeave={() => setIsMegaMenuOpen(false)}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground/80 hover:text-accent py-2 px-4.5 rounded-full border border-border bg-background cursor-pointer transition-all hover:shadow-sm"
              >
                <Menu className="h-4 w-4 text-foreground/80" />
                All Categories
              </button>
              {isMegaMenuOpen && (
                <div
                  onMouseEnter={() => setIsMegaMenuOpen(true)}
                  onMouseLeave={() => setIsMegaMenuOpen(false)}
                  className="absolute left-0 mt-1 w-64 bg-card border border-border shadow-luxe rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200 z-50"
                >
                  <div className="space-y-1 text-xs">
                    <Link
                      to="/shop"
                      onClick={() => setIsMegaMenuOpen(false)}
                      className="flex items-center justify-between p-2 rounded-xl font-bold hover:bg-muted text-foreground transition-colors"
                    >
                      <span>All Collections</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                    <div className="h-px bg-border my-2" />
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setIsMegaMenuOpen(false);
                          navigate({ to: "/shop", search: { cat: cat.id } as any });
                        }}
                        className="w-full text-left p-2 rounded-xl text-foreground/80 hover:bg-muted hover:text-accent transition-colors font-medium cursor-pointer"
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Links */}
            <nav className="flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-foreground/85">
              <NavLink to="/" exact>
                Home
              </NavLink>
              <NavLink to="/shop">Shop</NavLink>
              <NavLink to="/preservation">Preservation</NavLink>
              <NavLink to="/custom-order">Custom Order</NavLink>
              <NavLink to="/collections">Collections</NavLink>
              <NavLink to="/sell">Become a Seller</NavLink>
            </nav>
            <div className="w-[120px] hidden xl:block" /> {/* spacer for visual balancing */}
          </div>
        </div>
      </header>

      {/* 3. Mobile Category drawer / Hamburger Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-80 max-w-full bg-card h-full flex flex-col p-6 shadow-luxe z-10 animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
              <Logo className="h-9 w-auto" />
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 text-sm">
              <div className="space-y-1">
                <Link
                  to="/"
                  activeOptions={{ exact: true }}
                  activeProps={{ className: "text-accent bg-muted/40 font-semibold" }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl font-medium text-foreground hover:bg-muted hover:text-accent transition-colors"
                >
                  Home
                </Link>
                <Link
                  to="/shop"
                  activeProps={{ className: "text-accent bg-muted/40 font-semibold" }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl font-medium text-foreground hover:bg-muted hover:text-accent transition-colors"
                >
                  Shop
                </Link>
                <Link
                  to="/preservation"
                  activeProps={{ className: "text-accent bg-muted/40 font-semibold" }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl font-medium text-foreground hover:bg-muted hover:text-accent transition-colors"
                >
                  Preservation
                </Link>
                <Link
                  to="/custom-order"
                  activeProps={{ className: "text-accent bg-muted/40 font-semibold" }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl font-medium text-foreground hover:bg-muted hover:text-accent transition-colors"
                >
                  Custom Order
                </Link>
                <Link
                  to="/collections"
                  activeProps={{ className: "text-accent bg-muted/40 font-semibold" }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl font-medium text-foreground hover:bg-muted hover:text-accent transition-colors"
                >
                  Collections
                </Link>
                <Link
                  to="/legal/$slug"
                  params={{ slug: "terms-and-conditions" }}
                  activeProps={{ className: "text-accent bg-muted/40 font-semibold" }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl font-medium text-foreground hover:bg-muted hover:text-accent transition-colors"
                >
                  Legal Policy Center
                </Link>
              </div>

              <div className="px-3 py-4 rounded-xl bg-secondary/35 border border-border/50 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                  <Headphones className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground text-sm">Customer Support</span>
                    <span className="text-[9px] font-bold text-accent bg-accent/15 px-2 py-0.5 rounded-full tracking-wider shrink-0">
                      24*7
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    We're available round the clock.
                  </p>
                  <a
                    href="mailto:support@viacraft.com"
                    className="text-xs text-accent font-semibold hover:underline block mt-1"
                  >
                    support@viacraft.com
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4 mt-6">
              <Link
                to={myVendor?.status === "approved" ? "/vendor/dashboard" : "/sell"}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-accent text-accent-foreground text-xs font-semibold hover:bg-foreground hover:text-background transition-colors"
              >
                <Store className="h-4 w-4" /> Become a Seller
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 4. Mobile Fullscreen Search Drawer */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-card p-4 flex flex-col animate-in fade-in duration-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 relative flex items-center">
              <Search className="absolute left-4 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                placeholder="Search keepsakes, jewelry, frames..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit(searchQuery)}
                className="w-full pl-11 pr-10 py-3 rounded-full bg-muted/60 border border-border focus:border-accent outline-none text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 p-0.5 rounded-full hover:bg-muted text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setIsMobileSearchOpen(false)}
              className="text-sm font-medium hover:text-accent py-2 px-1"
            >
              Cancel
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6">
            {searchQuery.trim().length > 1 ? (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Matching Products
                </h4>
                {suggestions.length > 0 ? (
                  <div className="space-y-1">
                    {suggestions.map((p) => (
                      <Link
                        key={p.id}
                        to="/products/$slug"
                        params={{ slug: p.slug }}
                        onClick={() => setIsMobileSearchOpen(false)}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors"
                      >
                        <img
                          src={p.cover_image ?? ""}
                          alt=""
                          className="h-10 w-10 object-cover rounded-lg bg-muted shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {p.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{inr(p.price_cents)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No matching products found.</p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {recentSearches.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5" /> Recent Searches
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {recentSearches.map((term) => (
                        <div
                          key={term}
                          onClick={() => handleSearchSubmit(term)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-xs font-medium text-foreground/80"
                        >
                          <span>{term}</span>
                          <button
                            onClick={(e) => removeRecentSearch(e, term)}
                            className="p-0.5 rounded-full"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5" /> Popular Searches
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_SEARCHES.map((term) => (
                      <button
                        key={term}
                        onClick={() => handleSearchSubmit(term)}
                        className="px-3.5 py-1.5 rounded-full border border-border text-xs text-foreground/85"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Mobile Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/60 py-2.5 md:hidden flex justify-around items-center">
        <Link
          to="/"
          className="flex flex-col items-center text-muted-foreground hover:text-accent transition-colors"
          activeProps={{ className: "text-accent" }}
        >
          <Compass className="h-5 w-5" />
          <span className="text-[9px] mt-1 font-semibold uppercase tracking-wider">Explore</span>
        </Link>
        <Link
          to="/shop"
          className="flex flex-col items-center text-muted-foreground hover:text-accent transition-colors"
          activeProps={{ className: "text-accent" }}
        >
          <ShoppingBag className="h-5 w-5" />
          <span className="text-[9px] mt-1 font-semibold uppercase tracking-wider">Shop</span>
        </Link>
        <Link
          to="/preservation"
          className="flex flex-col items-center text-muted-foreground hover:text-accent transition-colors"
          activeProps={{ className: "text-accent" }}
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-[9px] mt-1 font-semibold uppercase tracking-wider">Preserve</span>
        </Link>
        <Link
          to="/cart"
          className="flex flex-col items-center text-muted-foreground hover:text-accent transition-colors relative"
          activeProps={{ className: "text-accent" }}
        >
          <ShoppingBag className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-accent text-[8px] text-accent-foreground grid place-items-center font-bold">
              {cartCount}
            </span>
          )}
          <span className="text-[9px] mt-1 font-semibold uppercase tracking-wider">Cart</span>
        </Link>
        <Link
          to="/dashboard"
          className="flex flex-col items-center text-muted-foreground hover:text-accent transition-colors"
          activeProps={{ className: "text-accent" }}
        >
          <User className="h-5 w-5" />
          <span className="text-[9px] mt-1 font-semibold uppercase tracking-wider">Profile</span>
        </Link>
      </div>
    </>
  );
}
