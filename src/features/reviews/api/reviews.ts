import { supabase } from "@/integrations/supabase/client";

export type ProductReview = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
};

export type ProductReviewWithProfile = ProductReview & {
  profiles: { full_name: string | null } | null;
};

export async function fetchProductReviews(productId: string): Promise<ProductReviewWithProfile[]> {
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!reviews?.length) return [];

  const userIds = [...new Set(reviews.map((review) => review.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return reviews.map((review) => ({
    ...review,
    profiles: profileMap.get(review.user_id) ?? null,
  }));
}

export async function syncProductReviewStats(productId: string) {
  const { error } = await (supabase as any).rpc("sync_product_review_stats_for", {
    p_product_id: productId,
  });

  if (error) {
    console.warn("Could not sync product review stats", error.message);
  }
}

export async function fetchUserProductReview(
  productId: string,
  userId: string,
): Promise<ProductReview | null> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function submitProductReview({
  productId,
  userId,
  rating,
  title,
  body,
  existingReviewId,
}: {
  productId: string;
  userId: string;
  rating: number;
  title: string;
  body: string;
  existingReviewId?: string;
}) {
  if (rating < 1 || rating > 5) {
    throw new Error("Please select a rating between 1 and 5 stars.");
  }

  if (!body.trim()) {
    throw new Error("Please write your review before submitting.");
  }

  if (existingReviewId) {
    const { error } = await supabase
      .from("reviews")
      .update({
        rating,
        title: title.trim() || null,
        body: body.trim(),
      })
      .eq("id", existingReviewId)
      .eq("user_id", userId);

    if (error) throw error;
    await syncProductReviewStats(productId);
    return;
  }

  const { error } = await supabase.from("reviews").insert({
    product_id: productId,
    user_id: userId,
    rating,
    title: title.trim() || null,
    body: body.trim(),
  });

  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      throw new Error("You have already reviewed this product.");
    }
    throw error;
  }

  await syncProductReviewStats(productId);
}
