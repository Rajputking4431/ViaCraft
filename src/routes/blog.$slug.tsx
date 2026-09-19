import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/layouts/PageShell";
import { SEO } from "@/components/SEO";
import { BLOG_POSTS } from "./blog.index";
import { Calendar, Clock, ArrowLeft, Share2, Printer, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/blog/$slug")({
  component: BlogDetailPage,
});

// Full article contents to avoid empty layouts
const ARTICLE_CONTENTS: Record<
  string,
  {
    title: string;
    introduction: string;
    sections: { heading: string; body: string }[];
    conclusion: string;
  }
> = {
  "resin-care-guide": {
    title: "Resin Care Guide: Keep Your Keepsakes Yellow-Free",
    introduction: "Epoxy resin is a beautiful, glass-like medium that preserves flowers, photographs, and gold foils for a lifetime. However, to maintain its pristine optical clarity and prevent yellowing, proper environment and care are essential. Follow this master guide compiled by our certified casting artisans to maximize the lifespan of your custom clocks, trays, and jewelry.",
    sections: [
      {
        heading: "1. Minimize Direct UV Exposure",
        body: "All epoxy resins will eventually undergo photo-initiated degradation when subjected to strong UV rays. While ViaCraft artisans utilize museum-grade resin formulated with advanced UV stabilizers and Hindered Amine Light Stabilizers (HALS), prolonged exposure will lead to yellowing. Avoid placing your resin frames, clocks, and tables near north-facing windows or outdoors.",
      },
      {
        heading: "2. Keep Away from Extreme Heat Sources",
        body: "Resin has a heat deflection temperature of approximately 60°C to 70°C. Placing hot kettles, mugs, or baking dishes directly onto resin trays or coasters without a protective pad can soften the material, causing permanent indentations or ring marks. Always use fabric or felt protective coasters over your luxury resin tables and trays.",
      },
      {
        heading: "3. Clean with Mild Soap and Water Only",
        body: "Never use glass cleaners, abrasive scrubbing pads, or chemical solvents like acetone and alcohol to clean your resin art. These chemicals will dissolve the surface layer, turning it dull, cloudy, or sticky. Instead, clean the surface using a damp, non-abrasive microfiber cloth and a single drop of mild dishwashing liquid, then dry immediately.",
      },
      {
        heading: "4. Avoid Sharp Scratches",
        body: "Resin is highly durable but can be scratched by keys, sharp tools, or rough ceramics. When displaying resin ornaments or coasters, ensure they are placed on flat, stable surfaces. If your resin piece gets micro-scratches over time, it can be restored by polishing it with a high-grade plastic compound or applying a fresh resin clear-coat.",
      },
    ],
    conclusion: "By following these simple care steps, you protect the colors of your embedded flowers and preserve the glass-like transparency of your resin heirlooms for generations. If you have questions about custom polishing services, contact support.",
  },
  "wedding-bouquet-preservation-guide": {
    title: "Wedding Bouquet Preservation: The Complete Prep & Shipping Guide",
    introduction: "Your wedding flowers are a symbol of one of the most important days of your life. Preserving them in a custom resin block freezes that beauty in time. However, the success of the preservation relies heavily on the freshness of the flowers when they arrive at our artisan studios. This guide outlines how to prepare, pack, and ship your bouquet immediately after your wedding.",
    sections: [
      {
        heading: "1. Keep the Stems Hydrated",
        body: "Treat your bouquet like fresh cut flowers immediately after the ceremony. Cut the stems at a 45-degree angle under water and place them into a clean vase with cold water. Keep them in a cool, dark room. Do not let the petals touch water directly, and never freeze the flowers, as freezing destroys the cell structure, causing them to turn black when dried.",
      },
      {
        heading: "2. Remove Damaged Outer Petals",
        body: "Gently peel away any bruised, brown, or rotting outer petals from roses and lilies. These blemishes will become magnified once dried in silica gel. If your bouquet has wire wraps or water tubes attached, leave them in place to support the stems, but tell your preservationist so they can extract them carefully before casting.",
      },
      {
        heading: "3. Pack in a Breathable Cardboard Box",
        body: "Use a sturdy cardboard box with dry paper towels lining the bottom. Wrap the wet stem ends in damp paper towels, then seal them inside a small plastic bag with a rubber band (keeping the flowers hydrated while keeping the rest of the box dry). Support the flower heads by gently placing crumpled newspaper or packing peanuts around the bouquet. Do not wrap the flower heads in plastic, as trapped moisture will accelerate decay.",
      },
      {
        heading: "4. Ship with Overnight or Express Delivery",
        body: "Time is of the essence. We recommend shipping your bouquet within 24 to 48 hours of your wedding event. Utilize express overnight shipping providers (such as Blue Dart or Delhivery Express in India) and schedule the shipment for a Monday or Tuesday to avoid weekend delays at courier hubs.",
      },
    ],
    conclusion: "Once received, our certified artisans will document your bouquet's condition, carefully unpack it, and place individual blooms into specialized silica gel chambers to extract moisture while preserving natural shape and color.",
  },
  "handcrafted-resin-clocks": {
    title: "How Custom Resin Clocks are Handcrafted by Independent Artisans",
    introduction: "Luxury resin clocks are more than timepieces; they are functional geode wall installations that elevate elegant living spaces. Each clock represents hours of craftsmanship, mixing raw epoxy, metallic pigments, gold leafing, and premium seasoned wood. Here is a look behind the studio doors at how ViaCraft's independent artisans create these luxury statement items.",
    sections: [
      {
        heading: "1. Selecting and Preparing the Wood Base",
        body: "Artisans start by selecting high-quality seasoned wood slab pieces, such as teak, walnut, or sheesham. The wood is cut to size, debarked, sandblasted, and sealed with a thin coat of clear resin. Sealing prevents air pockets from escaping the dry wood grain later, which would create ugly bubbles in the main color layers.",
      },
      {
        heading: "2. Setting up the Casting Mold",
        body: "The prepared wood is positioned inside a custom circular or hexagonal silicone mold. The mold is treated with release wax and leveled precisely using digital bubble levels. An unleveled mold causes the resin to slide to one side, resulting in uneven thicknesses and shifted color gradients.",
      },
      {
        heading: "3. Layering the Pigments and Metallic Foils",
        body: "Resin clocks require a multi-stage pour to build visual depth. The artisan mixes resin with premium color pastes (like sapphire blue, geode violet, or emerald green) and pours them in streams to simulate natural geode veins. While the resin is fluid, they apply gold leaf accents and use heat torches to disperse bubbles and blend the colors smoothly.",
      },
      {
        heading: "4. Curing, Sanding, and Final Polishing",
        body: "Each clock cures for 24 to 48 hours in a dust-free, temperature-controlled environment. Once fully cured, the clock is demolded. The artisan sands the back and edges using progressive sandpaper grits from 80 up to 3000, then uses buffing compound on a polishing wheel to achieve a flawless mirror shine.",
      },
    ],
    conclusion: "Finally, the artisan drills the center, mounts a high-torque silent quartz clock movement with gold-plated hands, and ships the clock securely to its new home.",
  },
};

function BlogDetailPage() {
  const { slug } = Route.useParams() as { slug: string };
  const navigate = useNavigate();

  const post = BLOG_POSTS.find((p) => p.slug === slug);
  const content = ARTICLE_CONTENTS[slug];

  if (!post || !content) {
    return (
      <PageShell>
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <h1 className="font-display text-4xl font-bold mb-4">Article Not Found</h1>
          <Link to="/blog" className="text-accent underline font-semibold">
            Back to care guides
          </Link>
        </div>
      </PageShell>
    );
  }

  const currentUrl = `https://viacraft.com/blog/${slug}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${currentUrl}/#article`,
    "headline": content.title,
    "description": post.excerpt,
    "image": post.image,
    "datePublished": post.date,
    "dateModified": post.date,
    "author": {
      "@type": "Person",
      "name": post.author
    },
    "publisher": {
      "@type": "Organization",
      "name": "ViaCraft",
      "logo": "https://viacraft.com/logo.png"
    },
    "mainEntityOfPage": currentUrl
  };

  const breadcrumbsSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://viacraft.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": "https://viacraft.com/blog"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": content.title,
        "item": currentUrl
      }
    ]
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: content.title,
          text: post.excerpt,
          url: window.location.href,
        })
        .catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Article link copied to clipboard!");
    }
  };

  return (
    <PageShell>
      <SEO
        title={`${content.title} — ViaCraft Academy`}
        description={post.excerpt}
        keywords={["resin art instructions", post.category, slug.replace(/-/g, " "), "ViaCraft guide"]}
        ogImage={post.image}
        ogType="article"
        schemaMarkup={[articleSchema, breadcrumbsSchema]}
      />

      <article className="mx-auto max-w-3xl px-4 sm:px-6 py-12 text-left">
        {/* Back Link & Actions Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-6 mb-8 print:hidden">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent font-semibold"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Guides
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="p-2 rounded-full border border-border/80 hover:border-accent hover:text-accent text-muted-foreground transition-all cursor-pointer"
              title="Share Article"
              aria-label="Share article link"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => window.print()}
              className="p-2 rounded-full border border-border/80 hover:border-accent hover:text-accent text-muted-foreground transition-all cursor-pointer"
              title="Print Article"
              aria-label="Print article content"
            >
              <Printer className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Article Header */}
        <header className="space-y-4 mb-8">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent/10 border border-accent/15 text-[10px] uppercase tracking-wider font-bold text-accent">
            <Sparkles className="h-3 w-3" /> {post.category}
          </span>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-foreground leading-tight">
            {content.title}
          </h1>

          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
            <span>
              By <span className="font-semibold text-foreground">{post.author}</span>
            </span>
            <span>•</span>
            <span>
              {new Date(post.date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span>•</span>
            <span>{post.readTime}</span>
          </div>
        </header>

        {/* Feature Image */}
        <div className="aspect-[16/9] w-full rounded-[2rem] overflow-hidden bg-muted border border-border mb-10">
          <img src={post.image} alt={content.title} className="h-full w-full object-cover" />
        </div>

        {/* Article Body */}
        <div className="prose prose-stone dark:prose-invert max-w-none space-y-6 text-sm xs:text-base leading-relaxed text-muted-foreground">
          <p className="text-foreground font-medium text-base sm:text-lg leading-relaxed border-l-2 border-accent pl-4">
            {content.introduction}
          </p>

          {content.sections.map((sec, i) => (
            <section key={i} className="space-y-3 pt-4">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                {sec.heading}
              </h2>
              <p>{sec.body}</p>
            </section>
          ))}

          <hr className="border-border/40 my-8" />

          <section className="space-y-3">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              Conclusion
            </h2>
            <p>{content.conclusion}</p>
          </section>
        </div>
      </article>
    </PageShell>
  );
}
