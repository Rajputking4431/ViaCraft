import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth";
import { NotificationsProvider } from "@/hooks/use-notifications";
import { Toaster } from "sonner";
import { useEffect, lazy, Suspense } from "react";
import { initGA, trackPageView } from "@/services/analytics/google";
import { initClarity, trackClarityPageView } from "@/services/analytics/clarity";
import { supabase } from "@/integrations/supabase/client";

// Reusable elegant loader for route transitions
function PageLoadingFallback() {
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center bg-transparent">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="text-xs font-semibold text-muted-foreground animate-pulse">Loading ViaCraft...</p>
      </div>
    </div>
  );
}

// Reusable lazy route builder
function lazyRoute(importFn: () => Promise<{ Route: { component: React.ComponentType<any> } }>) {
  const LazyComponent = lazy(() => importFn().then((m) => ({ default: m.Route.component })));
  return (props: any) => (
    <Suspense fallback={<PageLoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// Lazy-loaded routes
const IndexRouteComponent = lazyRoute(() => import("./routes/index"));
const AuthRouteComponent = lazyRoute(() => import("./routes/auth"));
const CartRouteComponent = lazyRoute(() => import("./routes/cart"));
const CheckoutRouteComponent = lazyRoute(() => import("./routes/checkout"));
const CollectionsRouteComponent = lazyRoute(() => import("./routes/collections"));
const CustomOrderRouteComponent = lazyRoute(() => import("./routes/custom-order"));
const ResetPasswordRouteComponent = lazyRoute(() => import("./routes/reset-password"));
const SellRouteComponent = lazyRoute(() => import("./routes/sell"));
const ShopRouteComponent = lazyRoute(() => import("./routes/shop"));
const WishlistRouteComponent = lazyRoute(() => import("./routes/wishlist"));
const TrackingIdRouteComponent = lazyRoute(() => import("./routes/tracking.$id"));
const StoreSlugRouteComponent = lazyRoute(() => import("./routes/store.$slug"));
const ProductsSlugRouteComponent = lazyRoute(() => import("./routes/products.$slug"));
const LegalSlugRouteComponent = lazyRoute(() => import("./routes/legal.$slug"));

// Blog subtree
const BlogRouteComponent = lazyRoute(() => import("./routes/blog"));
const BlogIndexRouteComponent = lazyRoute(() => import("./routes/blog.index"));
const BlogSlugRouteComponent = lazyRoute(() => import("./routes/blog.$slug"));

// Preservation subtree
const PreservationRouteComponent = lazyRoute(() => import("./routes/preservation"));
const PreservationIndexRouteComponent = lazyRoute(() => import("./routes/preservation.index"));
const PreservationIdRouteComponent = lazyRoute(() => import("./routes/preservation.$id"));

// Admin subtree
const AdminRouteComponent = lazyRoute(() => import("./routes/admin"));
const AdminIndexRouteComponent = lazyRoute(() => import("./routes/admin.index"));
const AdminAnalyticsRouteComponent = lazyRoute(() => import("./routes/admin.analytics"));
const AdminCategoriesRouteComponent = lazyRoute(() => import("./routes/admin.categories"));
const AdminDashboardRouteComponent = lazyRoute(() => import("./routes/admin.dashboard"));
const AdminOrdersRouteComponent = lazyRoute(() => import("./routes/admin.orders"));
const AdminPreservationRouteComponent = lazyRoute(() => import("./routes/admin.preservation"));
const AdminProductsRouteComponent = lazyRoute(() => import("./routes/admin.products"));
const AdminSettingsRouteComponent = lazyRoute(() => import("./routes/admin.settings"));
const AdminReturnsRouteComponent = lazyRoute(() => import("./routes/admin.returns"));
const AdminVendorsRouteComponent = lazyRoute(() => import("./routes/admin.vendors"));

// Authenticated layout and sub-routes
const AuthenticatedRouteComponent = lazyRoute(() => import("./routes/_authenticated/route"));
const DashboardRouteComponent = lazyRoute(() => import("./routes/_authenticated/dashboard"));
const VendorDashboardRouteComponent = lazyRoute(() => import("./routes/_authenticated/vendor.dashboard"));
const AdminUsersRouteComponent = lazyRoute(() => import("./routes/_authenticated/admin.users"));
const AdminShippingRouteComponent = lazyRoute(() => import("./routes/_authenticated/admin.shipping"));

const queryClient = new QueryClient();

function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    initGA();
    initClarity();
  }, []);

  useEffect(() => {
    const searchString = location.search || "";
    trackPageView(location.pathname + searchString);
    trackClarityPageView(location.pathname + searchString);
  }, [location.pathname, location.search]);

  return null;
}

function AuthInvalidator() {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, []);
  return null;
}

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
}

// Subdomain routing configurations
function AppRoutes() {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isSubdomainAdmin = hostname.startsWith("admin.") || hostname.includes("admin-dev.");
  const isSubdomainVendor = hostname.startsWith("vendor.") || hostname.includes("vendor-dev.");

  if (isSubdomainAdmin) {
    return (
      <Routes>
        {/* Admin layout as the root route */}
        <Route path="/" element={<AdminRouteComponent />}>
          <Route index element={<AdminIndexRouteComponent />} />
          <Route path="analytics" element={<AdminAnalyticsRouteComponent />} />
          <Route path="categories" element={<AdminCategoriesRouteComponent />} />
          <Route path="dashboard" element={<AdminDashboardRouteComponent />} />
          <Route path="orders" element={<AdminOrdersRouteComponent />} />
          <Route path="returns" element={<AdminReturnsRouteComponent />} />
          <Route path="preservation" element={<AdminPreservationRouteComponent />} />
          <Route path="products" element={<AdminProductsRouteComponent />} />
          <Route path="settings" element={<AdminSettingsRouteComponent />} />
          <Route path="vendors" element={<AdminVendorsRouteComponent />} />
          <Route path="users" element={<AdminUsersRouteComponent />} />
          <Route path="shipping" element={<AdminShippingRouteComponent />} />
        </Route>
        <Route path="*" element={<NotFoundComponent />} />
      </Routes>
    );
  }

  if (isSubdomainVendor) {
    return (
      <Routes>
        {/* Authenticated layout with vendor dashboard as root */}
        <Route element={<AuthenticatedRouteComponent />}>
          <Route path="/" element={<VendorDashboardRouteComponent />} />
        </Route>
        <Route path="*" element={<NotFoundComponent />} />
      </Routes>
    );
  }

  // Standard main website routing
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<IndexRouteComponent />} />
      <Route path="/auth" element={<AuthRouteComponent />} />
      <Route path="/cart" element={<CartRouteComponent />} />
      <Route path="/checkout" element={<CheckoutRouteComponent />} />
      <Route path="/collections" element={<CollectionsRouteComponent />} />
      <Route path="/custom-order" element={<CustomOrderRouteComponent />} />
      <Route path="/reset-password" element={<ResetPasswordRouteComponent />} />
      <Route path="/sell" element={<SellRouteComponent />} />
      <Route path="/shop" element={<ShopRouteComponent />} />
      <Route path="/wishlist" element={<WishlistRouteComponent />} />
      <Route path="/tracking/:id" element={<TrackingIdRouteComponent />} />
      <Route path="/store/:slug" element={<StoreSlugRouteComponent />} />
      <Route path="/products/:slug" element={<ProductsSlugRouteComponent />} />
      <Route path="/legal/:slug" element={<LegalSlugRouteComponent />} />

      {/* Preservation Subtree */}
      <Route path="/preservation" element={<PreservationRouteComponent />}>
        <Route index element={<PreservationIndexRouteComponent />} />
        <Route path=":id" element={<PreservationIdRouteComponent />} />
      </Route>

      {/* Blog Subtree */}
      <Route path="/blog" element={<BlogRouteComponent />}>
        <Route index element={<BlogIndexRouteComponent />} />
        <Route path=":slug" element={<BlogSlugRouteComponent />} />
      </Route>

      {/* Admin Layout (Subdirectory fallback) */}
      <Route path="/admin" element={<AdminRouteComponent />}>
        <Route index element={<AdminIndexRouteComponent />} />
        <Route path="analytics" element={<AdminAnalyticsRouteComponent />} />
        <Route path="categories" element={<AdminCategoriesRouteComponent />} />
        <Route path="dashboard" element={<AdminDashboardRouteComponent />} />
        <Route path="orders" element={<AdminOrdersRouteComponent />} />
        <Route path="returns" element={<AdminReturnsRouteComponent />} />
        <Route path="preservation" element={<AdminPreservationRouteComponent />} />
        <Route path="products" element={<AdminProductsRouteComponent />} />
        <Route path="settings" element={<AdminSettingsRouteComponent />} />
        <Route path="vendors" element={<AdminVendorsRouteComponent />} />
        <Route path="users" element={<AdminUsersRouteComponent />} />
        <Route path="shipping" element={<AdminShippingRouteComponent />} />
      </Route>

      {/* Authenticated Layout Subtree */}
      <Route element={<AuthenticatedRouteComponent />}>
        <Route path="/dashboard" element={<DashboardRouteComponent />} />
        <Route path="/vendor/dashboard" element={<VendorDashboardRouteComponent />} />
      </Route>

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFoundComponent />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationsProvider>
          <BrowserRouter>
            <AnalyticsTracker />
            <AuthInvalidator />
            <ScrollToTop />
            <AppRoutes />
            <Toaster position="top-right" richColors closeButton />
          </BrowserRouter>
        </NotificationsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
