import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/layouts/PageShell";
import { ProductCard } from "@/components/ProductCard";
import { useAuth } from "@/hooks/use-auth";
import { fetchWishlistEntries, removeWishlistEntry } from "@/api/wishlist";
import { Heart, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist — ViaCraft" }] }),
  component: WishlistPage,
});

function WishlistPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: () => fetchWishlistEntries(user?.id),
  });

  const removeItem = useMutation({
    mutationFn: (entry: (typeof entries)[number]) => removeWishlistEntry(entry, user?.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      qc.invalidateQueries({ queryKey: ["wishlist-count"] });
      qc.invalidateQueries({ queryKey: ["is-wishlisted"] });
      toast.success("Removed from wishlist");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <h1 className="font-display text-4xl font-extrabold mb-2 text-foreground">Wishlist</h1>
        <p className="text-xs text-muted-foreground mb-8">
          {user
            ? "Your saved keepsakes and favorites."
            : "Liked items are saved on this device. Sign in at checkout to complete a purchase."}
        </p>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading wishlist...</p>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-3xl bg-card">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold mb-2">No liked items yet</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-6">
              Tap the heart on any product to save it here.
            </p>
            <Link
              to="/shop"
              className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-xs tracking-wider uppercase shadow"
            >
              Browse Shop
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {entries.map((entry) =>
              entry.product ? (
                <div key={entry.wishlistId} className="relative">
                  <ProductCard product={entry.product} />
                  <button
                    onClick={() => removeItem.mutate(entry)}
                    disabled={removeItem.isPending}
                    className="absolute top-3 right-3 z-10 rounded-full bg-background/90 border border-border text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 hover:text-destructive"
                  >
                    Remove
                  </button>
                </div>
              ) : null,
            )}
          </div>
        )}

        {entries.length > 0 && (
          <div className="mt-10 text-center">
            <Link
              to="/cart"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-xs tracking-wider uppercase shadow"
            >
              <ShoppingBag className="h-4 w-4" /> View Cart
            </Link>
          </div>
        )}
      </section>
    </PageShell>
  );
}
