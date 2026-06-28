import { supabase } from "@/integrations/supabase/client";
import {
  addToGuestWishlist,
  clearGuestWishlist,
  getGuestWishlist,
  getGuestWishlistCount,
  isInGuestWishlist,
  removeFromGuestWishlist,
} from "@/utils/guest-wishlist";

const PRODUCT_SELECT =
  "id, slug, title, price_cents, cover_image, currency, compare_at_cents, rating, review_count, stock, is_customizable";

export type WishlistEntry = {
  wishlistId: string;
  product: {
    id: string;
    slug: string;
    title: string;
    price_cents: number;
    cover_image: string | null;
    currency: string;
    compare_at_cents: number | null;
    rating: number;
    review_count: number;
    stock: number;
    is_customizable: boolean;
  } | null;
};

export async function isProductWishlisted(
  productId: string,
  userId?: string | null,
): Promise<boolean> {
  if (userId) {
    const { data } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .maybeSingle();
    return !!data;
  }
  return isInGuestWishlist(productId);
}

export async function toggleProductWishlist(
  productId: string,
  userId?: string | null,
  currentlyWishlisted?: boolean,
): Promise<boolean> {
  if (userId) {
    if (currentlyWishlisted) {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", productId);
      if (error) throw error;
      return false;
    }

    const { error } = await supabase
      .from("wishlists")
      .insert({ user_id: userId, product_id: productId });
    if (error && !error.message.includes("duplicate")) throw error;
    return true;
  }

  if (isInGuestWishlist(productId)) {
    removeFromGuestWishlist(productId);
    return false;
  }

  addToGuestWishlist(productId);
  return true;
}

export async function mergeGuestWishlistIntoAccount(userId: string) {
  const productIds = getGuestWishlist();
  if (productIds.length === 0) return;

  for (const productId of productIds) {
    const { error } = await supabase
      .from("wishlists")
      .insert({ user_id: userId, product_id: productId });
    if (error && !error.message.includes("duplicate")) {
      console.error("Failed to merge wishlist item", error);
    }
  }

  clearGuestWishlist();
}

export async function getWishlistCount(userId?: string | null): Promise<number> {
  if (userId) {
    const { count } = await supabase
      .from("wishlists")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    return count ?? 0;
  }
  return getGuestWishlistCount();
}

export async function fetchWishlistEntries(userId?: string | null): Promise<WishlistEntry[]> {
  if (userId) {
    const { data } = await supabase
      .from("wishlists")
      .select(`id, product:products(${PRODUCT_SELECT})`)
      .eq("user_id", userId);

    return (data ?? []).map((row) => ({
      wishlistId: row.id,
      product: row.product as WishlistEntry["product"],
    }));
  }

  const productIds = getGuestWishlist();
  if (productIds.length === 0) return [];

  const { data: products } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", productIds);

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  return productIds
    .map((id) => ({
      wishlistId: `guest-${id}`,
      product: (productMap.get(id) as WishlistEntry["product"]) ?? null,
    }))
    .filter((entry) => entry.product);
}

export async function removeWishlistEntry(entry: WishlistEntry, userId?: string | null) {
  if (entry.wishlistId.startsWith("guest-")) {
    removeFromGuestWishlist(entry.product!.id);
    return;
  }

  if (!userId) return;
  await supabase.from("wishlists").delete().eq("id", entry.wishlistId);
}
