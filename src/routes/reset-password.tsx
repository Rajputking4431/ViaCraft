import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/Logo";
import { PasswordInput } from "@/components/PasswordInput";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password — ViaCraft" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // If loading is done and there's no user session, we will show an error state.
  // Otherwise, if the user updates password successfully, they'll be redirected.

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Your password has been reset successfully!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:block relative" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 p-16 flex flex-col justify-between">
          <Link to="/">
            <Logo className="h-12 w-auto" />
          </Link>
          <div>
            <h2 className="font-display text-5xl leading-tight">
              Where every memory
              <br />
              <em className="text-accent not-italic">becomes an heirloom.</em>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-sm">
              Join 12,000+ collectors and 480 independent artisans on ViaCraft.
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link to="/">
              <Logo className="h-10 w-auto" />
            </Link>
          </div>

          {!user ? (
            <div className="text-center py-8">
              <p className="text-xs uppercase tracking-[0.25em] text-accent mb-3">
                Invalid Session
              </p>
              <h1 className="font-display text-3xl mb-4 text-foreground">
                Link Expired or Invalid
              </h1>
              <p className="text-sm text-muted-foreground mb-8">
                Your password reset link is invalid or has expired. Please go back to the login page
                and request a new password reset.
              </p>
              <Link
                to="/auth"
                className="inline-block w-full py-3 rounded-full bg-primary text-primary-foreground hover:bg-foreground transition-colors text-sm font-medium text-center"
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
            <>
              <p className="text-xs uppercase tracking-[0.25em] text-accent mb-3">
                Account Security
              </p>
              <h1 className="font-display text-4xl mb-8">Choose a new password</h1>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    New Password
                  </label>
                  <PasswordInput
                    id="new-password"
                    value={password}
                    onChange={setPassword}
                    required
                    placeholder="Min 6 characters"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Confirm New Password
                  </label>
                  <PasswordInput
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    required
                    placeholder="Confirm password"
                  />
                </div>
                <button
                  disabled={busy}
                  className="w-full py-3 rounded-full bg-primary text-primary-foreground hover:bg-foreground transition-colors text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Reset Password
                </button>
              </form>

              <p className="mt-8 text-xs text-muted-foreground">
                <Link to="/auth" className="hover:text-accent">
                  ← Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
