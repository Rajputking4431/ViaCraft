import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/layouts/PageShell";
import { inr } from "@/utils/format";

export const Route = createFileRoute("/store/$slug")({
  head: ({ params }: any) => ({ meta: [{ title: `${params.slug} — ViaCraft` }] }),
  component: StorePage,
});

function StorePage() {
  const { slug } = Route.useParams() as { slug: string };
  const { data: vendor } = useQuery({
    queryKey: ["vendor-store", slug],
    queryFn: async () =>
      (await supabase.from("vendors").select("*").eq("slug", slug).maybeSingle()).data,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["vendor-store-products", vendor?.id],
    enabled: !!vendor,
    queryFn: async () =>
      (
        await supabase
          .from("products")
          .select("id,slug,title,price_cents,cover_image,rating")
          .eq("vendor_id", vendor!.id)
          .eq("is_published", true)
      ).data ?? [],
  });

  if (!vendor)
    return (
      <PageShell>
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <h1 className="font-display text-3xl">Store not found</h1>
        </div>
      </PageShell>
    );

  return (
    <PageShell>
      <section className="relative h-64 bg-gradient-to-br from-secondary to-accent/30">
        {vendor.banner_url && (
          <img
            src={vendor.banner_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </section>
      <section className="mx-auto max-w-7xl px-6 -mt-16 relative">
        <div className="bg-card border border-border rounded-3xl p-8 flex items-center gap-6">
          <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-accent to-primary text-background grid place-items-center font-display text-4xl">
            {vendor.store_name[0]}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-3xl">{vendor.store_name}</h1>
            <p className="text-sm text-muted-foreground">
              {vendor.location} · ★ {Number(vendor.rating).toFixed(2)}
            </p>
            {vendor.tagline && <p className="mt-2">{vendor.tagline}</p>}
          </div>
        </div>
        {vendor.bio && (
          <p className="max-w-3xl mt-10 text-muted-foreground leading-relaxed">{vendor.bio}</p>
        )}
        <h2 className="font-display text-3xl mt-12 mb-6">Pieces</h2>
        {products.length === 0 ? (
          <p className="text-muted-foreground">No products yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pb-16">
            {products.map((p) => (
              <Link key={p.id} to="/products/$slug" params={{ slug: p.slug }} className="group">
                <div className="aspect-square rounded-2xl overflow-hidden bg-muted mb-3">
                  {p.cover_image && (
                    <img
                      src={p.cover_image}
                      alt={p.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                  )}
                </div>
                <h3 className="font-display text-lg group-hover:text-accent">{p.title}</h3>
                <p className="text-sm">{inr(p.price_cents)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
