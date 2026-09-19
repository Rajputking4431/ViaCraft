/**
 * Google Analytics 4 Reusable Analytics Utility
 * Supports standard GA4 e-commerce schemas and custom events.
 * Safe for Server-Side Rendering (SSR) environments.
 */

// Safe reference to window object
const isBrowser = typeof window !== "undefined";

// Custom type declaration for gtag
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Get Measurement ID from Vite environment or default to placeholder
const GA_MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID as string) || "G-TEST-GA4";

/**
 * Initializes Google Analytics 4 by dynamically loading the gtag script
 * and setting up initial config. Safe to call multiple times.
 */
export function initGA() {
  if (!isBrowser) return;

  // Prevent duplicate script injection
  if (document.getElementById("google-tag-manager")) {
    return;
  }

  try {
    // 1. Create and inject gtag.js script asynchronously
    const script = document.createElement("script");
    script.id = "google-tag-manager";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // 2. Initialize dataLayer and gtag function
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };

    // 3. Configure initial setup
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, {
      send_page_view: false, // Turn off automatic default pageview to handle route changes manually
    });

    if (import.meta.env.DEV) {
      console.log(`[GA4] Initialized successfully with ID: ${GA_MEASUREMENT_ID}`);
    }
  } catch (error) {
    console.error("[GA4] Failed to initialize Google Analytics:", error);
  }
}

/**
 * Safely dispatches a GA4 event
 */
function sendEvent(eventName: string, params?: Record<string, any>) {
  if (!isBrowser) return;

  try {
    // Auto initialize if window.gtag is not yet present
    if (!window.gtag) {
      initGA();
    }

    if (window.gtag) {
      window.gtag("event", eventName, params);

      if (import.meta.env.DEV) {
        console.log(`[GA4 Event] ${eventName}:`, params);
      }
    }
  } catch (error) {
    console.error(`[GA4] Error sending event ${eventName}:`, error);
  }
}

/**
 * Track page view events
 * @param path URL path (e.g. /shop, /products/some-product)
 * @param title Optional title of the page
 */
export function trackPageView(path: string, title?: string) {
  sendEvent("page_view", {
    page_path: path,
    page_title: title || (isBrowser ? document.title : undefined),
    send_to: GA_MEASUREMENT_ID,
  });
}

/**
 * Track when a user views a product details page (GA4 standard view_item)
 */
export function trackProductView(product: {
  id: string;
  title: string;
  price_cents: number;
  material?: string;
  color?: string;
}) {
  sendEvent("view_item", {
    currency: "INR",
    value: product.price_cents / 100,
    items: [
      {
        item_id: product.id,
        item_name: product.title,
        price: product.price_cents / 100,
        item_category: product.material || "Resin Art",
        item_variant: product.color || undefined,
        quantity: 1,
      },
    ],
  });
}

/**
 * Track category / collection views (GA4 standard view_item_list)
 */
export function trackCategoryView(category: string) {
  sendEvent("view_item_list", {
    item_list_name: category,
  });
}

/**
 * Track search events (GA4 standard search)
 */
export function trackSearch(query: string) {
  if (!query || !query.trim()) return;
  sendEvent("search", {
    search_term: query.trim(),
  });
}

/**
 * Track addition of items to cart (GA4 standard add_to_cart)
 */
export function trackAddToCart(
  product: {
    id: string;
    title: string;
    price_cents: number;
    material?: string;
    color?: string;
  },
  quantity = 1,
) {
  sendEvent("add_to_cart", {
    currency: "INR",
    value: (product.price_cents / 100) * quantity,
    items: [
      {
        item_id: product.id,
        item_name: product.title,
        price: product.price_cents / 100,
        item_category: product.material || "Resin Art",
        item_variant: product.color || undefined,
        quantity,
      },
    ],
  });
}

/**
 * Track addition of items to wishlist (GA4 standard add_to_wishlist)
 */
export function trackWishlistAdd(product: {
  id: string;
  title: string;
  price_cents: number;
  material?: string;
  color?: string;
}) {
  sendEvent("add_to_wishlist", {
    currency: "INR",
    value: product.price_cents / 100,
    items: [
      {
        item_id: product.id,
        item_name: product.title,
        price: product.price_cents / 100,
        item_category: product.material || "Resin Art",
        item_variant: product.color || undefined,
        quantity: 1,
      },
    ],
  });
}

/**
 * Track start of checkout process (GA4 standard begin_checkout)
 */
export function trackCheckoutStarted(
  items: Array<{
    quantity: number;
    product?: {
      id: string;
      title: string;
      price_cents: number;
      material?: string;
    } | null;
  }>,
  totalCents: number,
) {
  sendEvent("begin_checkout", {
    currency: "INR",
    value: totalCents / 100,
    items: items
      .filter((it) => it.product)
      .map((it) => ({
        item_id: it.product!.id,
        item_name: it.product!.title,
        price: it.product!.price_cents / 100,
        item_category: it.product!.material || "Resin Art",
        quantity: it.quantity,
      })),
  });
}

/**
 * Track simulated payment gateway success (custom payment_success event)
 */
export function trackPaymentSuccess(paymentMethod: string, totalCents: number) {
  sendEvent("payment_success", {
    currency: "INR",
    value: totalCents / 100,
    payment_method: paymentMethod,
  });
}

/**
 * Track order completion / purchase (GA4 standard purchase)
 */
export function trackOrderCompleted(
  orderId: string,
  orderNumber: string,
  totalCents: number,
  items: Array<{
    quantity: number;
    product?: {
      id: string;
      title: string;
      price_cents: number;
      material?: string;
    } | null;
    unit_price_cents?: number;
    title?: string;
    product_id?: string;
  }>,
) {
  sendEvent("purchase", {
    transaction_id: orderNumber || orderId,
    value: totalCents / 100,
    currency: "INR",
    items: items.map((it) => {
      const itemId = it.product?.id || it.product_id || "unknown";
      const itemName = it.product?.title || it.title || "Product";
      const itemPrice = (it.product?.price_cents ?? it.unit_price_cents ?? 0) / 100;
      return {
        item_id: itemId,
        item_name: itemName,
        price: itemPrice,
        item_category: it.product?.material || "Resin Art",
        quantity: it.quantity,
      };
    }),
  });
}

/**
 * Track vendor registration applications (custom vendor_registration event)
 */
export function trackVendorRegistration(storeName: string, location: string) {
  sendEvent("vendor_registration", {
    store_name: storeName,
    location: location,
  });
}
