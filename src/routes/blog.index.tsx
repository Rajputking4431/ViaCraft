import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/layouts/PageShell";
import { SEO } from "@/components/SEO";
import { BookOpen, Calendar, Clock, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/blog/")({
  component: BlogIndexPage,
});

export const BLOG_POSTS = [
  {
    slug: "resin-care-guide",
    title: "Resin Care Guide: Keep Your Keepsakes Yellow-Free",
    excerpt: "Learn the essential maintenance rules to protect your epoxy resin clocks, trays, and jewelry from UV damage, heat, and yellowing over time.",
    category: "Resin Care",
    date: "2026-07-25",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1597080262677-cfb5ef4f31cc?w=600&auto=format&fit=crop&q=80",
    author: "Arzan Mehta (Master Resin Caster)",
  },
  {
    slug: "wedding-bouquet-preservation-guide",
    title: "Wedding Bouquet Preservation: The Complete Prep & Shipping Guide",
    excerpt: "Step-by-step instructions on keeping your fresh wedding flowers alive and packing them safely for transit to our artisan preservation studios.",
    category: "Preservation Tips",
    date: "2026-07-20",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=600&auto=format&fit=crop&q=80",
    author: "Pooja Sharma (Floral Preservationist)",
  },
  {
    slug: "handcrafted-resin-clocks",
    title: "How Custom Resin Clocks are Handcrafted by Independent Artisans",
    excerpt: "Go behind the scenes and discover the multi-layer pouring process, wood selection, and color matching that goes into crafting luxury geode clocks.",
    category: "Artisan Stories",
    date: "2026-07-15",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    author: "Rajesh Kumar (Horology Artist)",
  },
];

function BlogIndexPage() {
  const blogSchemas = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": "https://viacraft.com/blog/#collectionpage",
      "name": "ViaCraft Resin Art & Preservation Blog Guides",
      "description": "Read expert guides on resin care, bouquet preservation steps, and custom epoxy resin homeware crafting.",
      "url": "https://viacraft.com/blog",
      "mainEntity": {
        "@type": "ItemList",
        "itemListElement": BLOG_POSTS.map((post, idx) => ({
          "@type": "ListItem",
          "position": idx + 1,
          "url": `https://viacraft.com/blog/${post.slug}`
        }))
      }
    },
    {
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
        }
      ]
    }
  ];

  return (
    <PageShell>
      <SEO
        title="Resin Care & Wedding Flower Preservation Guides"
        description="Learn how to care for epoxy resin clocks and trays, keep keepsakes clear, and prepare fresh wedding flower bouquets for custom preservation."
        keywords={["resin care guide", "wedding bouquet shipping", "custom resin clocks", "flower preservation tips", "ViaCraft blog"]}
        schemaMarkup={blogSchemas}
      />

      {/* Hero Header */}
      <section className="bg-gradient-hero border-b border-border/60 py-16 relative overflow-hidden select-none">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10 text-center sm:text-left">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/15 text-[10px] uppercase tracking-wider font-bold text-accent mb-4">
              <Sparkles className="h-3 w-3" /> ViaCraft Academy
            </span>
            <h1 className="font-display text-4xl sm:text-5xl font-black text-foreground mb-4">
              Care Guides & Preservation Academy
            </h1>
            <p className="text-xs sm:text-base text-muted-foreground leading-relaxed">
              Expert advice, tutorials, and care sheets compiled by certified resin artisans to help you cherish your precious milestones forever.
            </p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-80 h-full bg-radial-gradient opacity-10 blur-3xl pointer-events-none" />
      </section>

      {/* Blog Cards Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {BLOG_POSTS.map((post) => (
            <article
              key={post.slug}
              className="bg-card border border-border/80 hover:border-accent/40 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                <img
                  src={post.image}
                  alt={post.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-103"
                />
                <span className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-sm text-accent text-[9px] font-bold uppercase tracking-wider">
                  {post.category}
                </span>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(post.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {post.readTime}
                    </span>
                  </div>

                  <h2 className="font-display text-lg font-bold text-foreground group-hover:text-accent transition-colors leading-snug">
                    <Link to="/blog/$slug" params={{ slug: post.slug }}>
                      {post.title}
                    </Link>
                  </h2>

                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    By <span className="font-semibold text-foreground">{post.author}</span>
                  </span>
                  <Link
                    to="/blog/$slug"
                    params={{ slug: post.slug }}
                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent hover:text-accent/80 transition-colors"
                  >
                    Read Article <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
