import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { fetchUserProductReview, submitProductReview } from "@/api/reviews";

interface ProductReviewFormProps {
  productId: string;
  productSlug: string;
}

export function ProductReviewForm({ productId, productSlug }: ProductReviewFormProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: myReview, isLoading: isLoadingMyReview } = useQuery({
    queryKey: ["my-product-review", productId, user?.id],
    enabled: !!user,
    queryFn: () => fetchUserProductReview(productId, user!.id),
  });

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setTitle(myReview.title ?? "");
      setBody(myReview.body ?? "");
    }
  }, [myReview]);

  const submitReview = useMutation({
    mutationFn: () =>
      submitProductReview({
        productId,
        userId: user!.id,
        rating,
        title,
        body,
        existingReviewId: myReview?.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-reviews", productId] });
      qc.invalidateQueries({ queryKey: ["my-product-review", productId, user?.id] });
      qc.invalidateQueries({ queryKey: ["product", productSlug] });
      toast.success(myReview ? "Review updated!" : "Thank you for your review!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!user) {
    return (
      <div className="p-5 rounded-2xl border border-border bg-muted/20 text-center space-y-3">
        <p className="text-xs text-muted-foreground">
          You can read all reviews above without signing in. Sign in to leave your own rating and
          comment.
        </p>
        <Link
          to="/auth"
          search={{ redirect: `/products/${productSlug}?tab=reviews` }}
          className="inline-flex px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider"
        >
          Sign In to Review
        </Link>
      </div>
    );
  }

  if (isLoadingMyReview) {
    return <p className="text-xs text-muted-foreground">Loading review form...</p>;
  }

  const displayRating = hoverRating || rating;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submitReview.mutate();
      }}
      className="p-5 rounded-2xl border border-border bg-card space-y-4"
    >
      <div>
        <h5 className="font-display text-sm font-bold text-foreground mb-1">
          {myReview ? "Update your review" : "Write a review"}
        </h5>
        <p className="text-[10px] text-muted-foreground">
          Share your experience with this keepsake.
        </p>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Your rating
        </label>
        <div className="flex items-center gap-1 mt-2">
          {Array.from({ length: 5 }).map((_, index) => {
            const starValue = index + 1;
            return (
              <button
                key={starValue}
                type="button"
                onClick={() => setRating(starValue)}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-0.5 cursor-pointer"
                aria-label={`Rate ${starValue} stars`}
              >
                <Star
                  className={`h-5 w-5 transition-colors ${
                    starValue <= displayRating
                      ? "fill-amber-500 text-amber-500"
                      : "text-muted-foreground/40"
                  }`}
                />
              </button>
            );
          })}
          {displayRating > 0 && (
            <span className="text-xs font-semibold text-foreground ml-2">{displayRating} / 5</span>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="review-title"
          className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
        >
          Review title (optional)
        </label>
        <input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Beautiful craftsmanship"
          maxLength={120}
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
        />
      </div>

      <div>
        <label
          htmlFor="review-body"
          className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
        >
          Your review
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tell other collectors about the quality, packaging, and how the piece turned out..."
          rows={4}
          maxLength={2000}
          required
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs resize-y"
        />
      </div>

      <button
        type="submit"
        disabled={submitReview.isPending || rating === 0}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
      >
        {submitReview.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {myReview ? "Update Review" : "Submit Review"}
      </button>
    </form>
  );
}
