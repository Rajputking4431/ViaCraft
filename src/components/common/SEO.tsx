import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string | string[];
  canonicalUrl?: string;
  ogType?: "website" | "product" | "article" | "profile";
  ogImage?: string;
  noIndex?: boolean;
  schemaMarkup?: Record<string, any> | Array<Record<string, any>>;
}

export function SEO({
  title,
  description,
  keywords,
  canonicalUrl,
  ogType = "website",
  ogImage,
  noIndex = false,
  schemaMarkup,
}: SEOProps) {
  useEffect(() => {
    // 1. Title
    const brandSuffix = " | ViaCraft";
    const fullTitle = title.endsWith(brandSuffix) ? title : `${title}${brandSuffix}`;
    document.title = fullTitle;

    // Helper function to create or update meta tag
    const updateOrCreateMeta = (selector: string, attr: string, attrValue: string, contentValue: string) => {
      let element = document.head.querySelector(selector) as HTMLMetaElement;
      if (contentValue) {
        if (!element) {
          element = document.createElement("meta");
          element.setAttribute(attr, attrValue);
          document.head.appendChild(element);
        }
        element.content = contentValue;
      } else if (element) {
        element.remove();
      }
    };

    // 2. Meta description
    updateOrCreateMeta('meta[name="description"]', "name", "description", description);

    // 3. Keywords
    const keywordsStr = Array.isArray(keywords) ? keywords.join(", ") : keywords || "";
    updateOrCreateMeta('meta[name="keywords"]', "name", "keywords", keywordsStr);

    // 4. Robots
    const robotsContent = noIndex
      ? "noindex, nofollow"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
    updateOrCreateMeta('meta[name="robots"]', "name", "robots", robotsContent);

    // 5. Open Graph
    updateOrCreateMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    updateOrCreateMeta('meta[property="og:description"]', "property", "og:description", description);
    updateOrCreateMeta('meta[property="og:type"]', "property", "og:type", ogType);
    updateOrCreateMeta('meta[property="og:site_name"]', "property", "og:site_name", "ViaCraft");

    const currentUrl = canonicalUrl || window.location.origin + window.location.pathname;
    updateOrCreateMeta('meta[property="og:url"]', "property", "og:url", currentUrl);

    if (ogImage) {
      updateOrCreateMeta('meta[property="og:image"]', "property", "og:image", ogImage);
    } else {
      // Default fallback logo/image
      updateOrCreateMeta('meta[property="og:image"]', "property", "og:image", `${window.location.origin}/logo.png`);
    }

    // 6. Twitter
    updateOrCreateMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    updateOrCreateMeta('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
    updateOrCreateMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    if (ogImage) {
      updateOrCreateMeta('meta[name="twitter:image"]', "name", "twitter:image", ogImage);
    } else {
      updateOrCreateMeta('meta[name="twitter:image"]', "name", "twitter:image", `${window.location.origin}/logo.png`);
    }

    // 7. Canonical URL
    let canonicalLink = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = currentUrl;

    // 8. Structured Schema Markup JSON-LD
    const existingScript = document.getElementById("seo-jsonld");
    if (existingScript) {
      existingScript.remove();
    }

    if (schemaMarkup) {
      const script = document.createElement("script");
      script.id = "seo-jsonld";
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(schemaMarkup);
      document.head.appendChild(script);
    }

    // Clean up when unmounting or changing SEO values
    return () => {
      const scriptToRemove = document.getElementById("seo-jsonld");
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [title, description, keywords, canonicalUrl, ogType, ogImage, noIndex, schemaMarkup]);

  return null;
}
