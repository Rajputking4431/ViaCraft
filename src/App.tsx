import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth";
import { NotificationsProvider } from "@/hooks/use-notifications";
import { Toaster } from "sonner";
import { useEffect } from "react";
import { initGA, trackPageView } from "@/services/analytics/google";
import { initClarity, trackClarityPageView } from "@/services/analytics/clarity";
import { supabase } from "@/integrations/supabase/client";

// Import all route modules
import { Route as IndexRoute } from "./routes/index";
import { Route as AuthRoute } from "./routes/auth";
import { Route as CartRoute } from "./routes/cart";
import { Route as CheckoutRoute } from "./routes/checkout";
import { Route as CollectionsRoute } from "./routes/collections";
import { Route as CustomOrderRoute } from "./routes/custom-order";
import { Route as ResetPasswordRoute } from "./routes/reset-password";
import { Route as SellRoute } from "./routes/sell";
import { Route as ShopRoute } from "./routes/shop";
import { Route as WishlistRoute } from "./routes/wishlist";
import { Route as TrackingIdRoute } from "./routes/tracking.$id";
import { Route as StoreSlugRoute } from "./routes/store.$slug";
import { Route as ProductsSlugRoute } from "./routes/products.$slug";
import { Route as LegalSlugRoute } from "./routes/legal.$slug";

// Preservation subtree
import { Route as PreservationRoute } from "./routes/preservation";
import { Route as PreservationIndexRoute } from "./routes/preservation.index";
import { Route as PreservationIdRoute } from "./routes/preservation.$id";

// Admin subtree
import { Route as AdminRoute } from "./routes/admin";
import { Route as AdminIndexRoute } from "./routes/admin.index";
import { Route as AdminAnalyticsRoute } from "./routes/admin.analytics";
import { Route as AdminCategoriesRoute } from "./routes/admin.categories";
import { Route as AdminDashboardRoute } from "./routes/admin.dashboard";
import { Route as AdminOrdersRoute } from "./routes/admin.orders";
import { Route as AdminPreservationRoute } from "./routes/admin.preservation";
import { Route as AdminProductsRoute } from "./routes/admin.products";
import { Route as AdminSettingsRoute } from "./routes/admin.settings";
import { Route as AdminVendorsRoute } from "./routes/admin.vendors";

// Authenticated layout and sub-routes
import { Route as AuthenticatedRoute } from "./routes/_authenticated/route";
import { Route as DashboardRoute } from "./routes/_authenticated/dashboard";
import { Route as VendorDashboardRoute } from "./routes/_authenticated/vendor.dashboard";
import { Route as AdminUsersRoute } from "./routes/_authenticated/admin.users";
import { Route as AdminShippingRoute } from "./routes/_authenticated/admin.shipping";

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationsProvider>
          <BrowserRouter>
            <AnalyticsTracker />
            <AuthInvalidator />
            <ScrollToTop />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<IndexRoute.component />} />
              <Route path="/auth" element={<AuthRoute.component />} />
              <Route path="/cart" element={<CartRoute.component />} />
              <Route path="/checkout" element={<CheckoutRoute.component />} />
              <Route path="/collections" element={<CollectionsRoute.component />} />
              <Route path="/custom-order" element={<CustomOrderRoute.component />} />
              <Route path="/reset-password" element={<ResetPasswordRoute.component />} />
              <Route path="/sell" element={<SellRoute.component />} />
              <Route path="/shop" element={<ShopRoute.component />} />
              <Route path="/wishlist" element={<WishlistRoute.component />} />
              <Route path="/tracking/:id" element={<TrackingIdRoute.component />} />
              <Route path="/store/:slug" element={<StoreSlugRoute.component />} />
              <Route path="/products/:slug" element={<ProductsSlugRoute.component />} />
              <Route path="/legal/:slug" element={<LegalSlugRoute.component />} />

              {/* Preservation Subtree */}
              <Route path="/preservation" element={<PreservationRoute.component />}>
                <Route index element={<PreservationIndexRoute.component />} />
                <Route path=":id" element={<PreservationIdRoute.component />} />
              </Route>

              {/* Admin Layout */}
              <Route path="/admin" element={<AdminRoute.component />}>
                <Route index element={<AdminIndexRoute.component />} />
                <Route path="analytics" element={<AdminAnalyticsRoute.component />} />
                <Route path="categories" element={<AdminCategoriesRoute.component />} />
                <Route path="dashboard" element={<AdminDashboardRoute.component />} />
                <Route path="orders" element={<AdminOrdersRoute.component />} />
                <Route path="preservation" element={<AdminPreservationRoute.component />} />
                <Route path="products" element={<AdminProductsRoute.component />} />
                <Route path="settings" element={<AdminSettingsRoute.component />} />
                <Route path="vendors" element={<AdminVendorsRoute.component />} />
              </Route>

              {/* Authenticated Layout Subtree */}
              <Route element={<AuthenticatedRoute.component />}>
                <Route path="/dashboard" element={<DashboardRoute.component />} />
                <Route path="/vendor/dashboard" element={<VendorDashboardRoute.component />} />
                <Route path="/admin/users" element={<AdminUsersRoute.component />} />
                <Route path="/admin/shipping" element={<AdminShippingRoute.component />} />
              </Route>

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFoundComponent />} />
            </Routes>
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
