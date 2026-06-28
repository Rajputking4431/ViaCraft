const STORAGE_KEY = "guest_cart";

export interface GuestCartItem {
  product_id: string;
  quantity: number;
}

export function getGuestCart(): GuestCartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveGuestCart(items: GuestCartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addToGuestCart(productId: string, quantity: number) {
  const cart = getGuestCart();
  const existing = cart.find((item) => item.product_id === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ product_id: productId, quantity });
  }
  saveGuestCart(cart);
}

export function updateGuestCartItem(productId: string, quantity: number) {
  if (quantity <= 0) {
    removeFromGuestCart(productId);
    return;
  }
  const cart = getGuestCart();
  const item = cart.find((i) => i.product_id === productId);
  if (item) {
    item.quantity = quantity;
    saveGuestCart(cart);
  }
}

export function removeFromGuestCart(productId: string) {
  saveGuestCart(getGuestCart().filter((item) => item.product_id !== productId));
}

export function getGuestCartCount(): number {
  return getGuestCart().reduce((sum, item) => sum + item.quantity, 0);
}

export function clearGuestCart() {
  localStorage.removeItem(STORAGE_KEY);
}
