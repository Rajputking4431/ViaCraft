import { supabase } from "@/integrations/supabase/client";
import {
  addToGuestCart,
  clearGuestCart,
  getGuestCart,
  removeFromGuestCart,
  updateGuestCartItem,
} from "@/utils/guest-cart";

const PRODUCT_SELECT = "id, slug, title, price_cents, cover_image, currency, vendor_id, stock";

export type CartProduct = {
  id: string;
  slug: string;
  title: string;
  price_cents: number;
  cover_image: string | null;
  currency: string;
  vendor_id: string;
  stock: number;
};

export type CartLineItem = {
  id: string;
  quantity: number;
  product_id: string;
  isGuest: boolean;
  product: CartProduct | null;
};

export async function addProductToCart(
  productId: string,
  quantity: number,
  userId?: string | null,
) {
  if (userId) {
    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity: existing.quantity + quantity })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("cart_items")
        .insert({ user_id: userId, product_id: productId, quantity });
      if (error) throw error;
    }
  } else {
    addToGuestCart(productId, quantity);
  }
}

export async function mergeGuestCartIntoAccount(userId: string) {
  const guestItems = getGuestCart();
  if (guestItems.length === 0) return;

  for (const item of guestItems) {
    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq("product_id", item.product_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("cart_items")
        .update({ quantity: existing.quantity + item.quantity })
        .eq("id", existing.id);
    } else {
      await supabase.from("cart_items").insert({
        user_id: userId,
        product_id: item.product_id,
        quantity: item.quantity,
      });
    }
  }

  clearGuestCart();
}

export async function fetchUserCartItems(userId: string): Promise<CartLineItem[]> {
  const { data } = await supabase
    .from("cart_items")
    .select(`id, quantity, product:products(${PRODUCT_SELECT})`)
    .eq("user_id", userId);

  return (data ?? []).map((row) => ({
    id: row.id,
    quantity: row.quantity,
    product_id: row.product?.id ?? "",
    isGuest: false,
    product: row.product as CartProduct | null,
  }));
}

export async function fetchGuestCartItems(): Promise<CartLineItem[]> {
  const guestItems = getGuestCart();
  if (guestItems.length === 0) return [];

  const productIds = guestItems.map((item) => item.product_id);
  const { data: products } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", productIds);

  const productMap = new Map((products ?? []).map((p) => [p.id, p as CartProduct]));

  return guestItems
    .map((item) => ({
      id: `guest-${item.product_id}`,
      quantity: item.quantity,
      product_id: item.product_id,
      isGuest: true,
      product: productMap.get(item.product_id) ?? null,
    }))
    .filter((item) => item.product);
}

export async function updateCartItemQuantity(
  item: CartLineItem,
  quantity: number,
  userId?: string | null,
) {
  if (item.isGuest) {
    updateGuestCartItem(item.product_id, quantity);
    return;
  }

  if (!userId) return;

  if (quantity <= 0) {
    await supabase.from("cart_items").delete().eq("id", item.id);
  } else {
    await supabase.from("cart_items").update({ quantity }).eq("id", item.id);
  }
}

export async function removeCartItem(item: CartLineItem, userId?: string | null) {
  if (item.isGuest) {
    removeFromGuestCart(item.product_id);
    return;
  }

  if (!userId) return;
  await supabase.from("cart_items").delete().eq("id", item.id);
}

export async function getCartItemCount(userId?: string | null): Promise<number> {
  if (userId) {
    const { data } = await supabase.from("cart_items").select("quantity").eq("user_id", userId);
    return (data ?? []).reduce((sum, row) => sum + (row.quantity ?? 0), 0);
  }
  return getGuestCart().reduce((sum, item) => sum + item.quantity, 0);
}
