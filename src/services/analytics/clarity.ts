/**
 * Microsoft Clarity Analytics Utility
 * Safe for Server-Side Rendering (SSR) environments.
 */

// Safe reference to window object
const isBrowser = typeof window !== "undefined";

// Custom type declaration for clarity
declare global {
  interface Window {
    clarity?: {
      (...args: any[]): void;
      q?: any[];
    };
  }
}

/**
 * Initializes Microsoft Clarity globally by dynamically loading the tracking script
 */
export function initClarity() {
  if (!isBrowser) return;

  const clarityId = (import.meta.env.VITE_CLARITY_ID as string) || "";

  if (!clarityId) {
    if (import.meta.env.DEV) {
      console.log("[Clarity] VITE_CLARITY_ID is not defined. Clarity initialization skipped.");
    }
    return;
  }

  // Prevent duplicate script injection
  if (document.getElementById("microsoft-clarity-tag")) {
    return;
  }

  try {
    // 1. Initialize clarity function queue
    window.clarity = window.clarity || function() {
      // eslint-disable-next-line prefer-rest-params
      (window.clarity!.q = window.clarity!.q || []).push(arguments);
    };

    // 2. Create and inject tracking script asynchronously
    const script = document.createElement("script");
    script.id = "microsoft-clarity-tag";
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${clarityId}`;
    document.head.appendChild(script);

    if (import.meta.env.DEV) {
      console.log(`[Clarity] Initialized successfully with project ID: ${clarityId}`);
    }
  } catch (error) {
    console.error("[Clarity] Failed to initialize Microsoft Clarity:", error);
  }
}

/**
 * Track route changes / virtual page views for SPA navigation
 * @param path URL path (e.g. /shop, /dashboard)
 */
export function trackClarityPageView(path: string) {
  if (!isBrowser) return;

  try {
    // Auto initialize if window.clarity is not yet present
    if (!window.clarity) {
      initClarity();
    }

    if (window.clarity) {
      // Set virtual page path for single page application navigation tracking
      window.clarity("set", "page", path);

      if (import.meta.env.DEV) {
        console.log(`[Clarity PageView] Virtual path tracked: ${path}`);
      }
    }
  } catch (error) {
    console.error(`[Clarity] Error sending page view for path ${path}:`, error);
  }
}
