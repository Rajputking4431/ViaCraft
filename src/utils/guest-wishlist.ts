const STORAGE_KEY = "guest_wishlist";

export function getGuestWishlist(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveGuestWishlist(productIds: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(productIds));
}

export function isInGuestWishlist(productId: string): boolean {
  return getGuestWishlist().includes(productId);
}

export function addToGuestWishlist(productId: string) {
  const list = getGuestWishlist();
  if (!list.includes(productId)) {
    saveGuestWishlist([productId, ...list]);
  }
}

export function removeFromGuestWishlist(productId: string) {
  saveGuestWishlist(getGuestWishlist().filter((id) => id !== productId));
}

export function getGuestWishlistCount(): number {
  return getGuestWishlist().length;
}

export function clearGuestWishlist() {
  localStorage.removeItem(STORAGE_KEY);
}
