import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/Logo";
import { PasswordInput } from "@/components/PasswordInput";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — ViaCraft" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: AuthPage,
});

import { sendWelcomeEmail, sendPasswordResetEmail } from "@/api/email.functions";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Min 6 characters"),
  fullName: z.string().min(2, "Enter your name").optional(),
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot-password">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    if (user) {
      const destination = redirect && redirect.startsWith("/") ? redirect : "/";
      navigate({ to: destination });
    }
  }, [user, navigate, redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "forgot-password") {
      const emailParsed = z.string().email("Enter a valid email").safeParse(email);
      if (!emailParsed.success) {
        toast.error(emailParsed.error.issues[0].message);
        return;
      }
    } else {
      const parsed = schema.safeParse({
        email,
        password,
        fullName: mode === "signup" ? fullName : undefined,
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0].message);
        return;
      }
    }

    if (mode === "signup" && !acceptTerms) {
      toast.error("You must accept the Terms & Conditions and Privacy Policy to continue");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm.");

        // Async welcome email send (failure won't block UI registration)
        sendWelcomeEmail({ data: { email, fullName } }).catch((err) => {
          console.error("Welcome email trigger failure", err);
        });
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      } else if (mode === "forgot-password") {
        const result = await sendPasswordResetEmail({
          data: {
            email,
            redirectTo: `${window.location.origin}/reset-password`,
          },
        });
        if (result?.error) {
          throw new Error(result.error);
        }
        toast.success("Password reset link sent! Check your email inbox.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const oauthRedirect =
      redirect && redirect.startsWith("/")
        ? window.location.origin + redirect
        : window.location.origin + "/";
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: oauthRedirect });
    if (r.error) {
      toast.error(r.error.message ?? "Google sign-in failed");
      setBusy(false);
    }
  };

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
          <p className="text-xs uppercase tracking-[0.25em] text-accent mb-3">
            {mode === "signin"
              ? "Welcome back"
              : mode === "signup"
                ? "Create account"
                : "Reset Password"}
          </p>
          <h1 className="font-display text-4xl mb-8">
            {mode === "signin"
              ? "Sign in to your account"
              : mode === "signup"
                ? "Join ViaCraft"
                : "Reset your password"}
          </h1>

          {mode !== "forgot-password" && (
            <>
              <button
                onClick={google}
                disabled={busy}
                className="w-full mb-4 py-3 rounded-full border border-border bg-card hover:border-accent transition-colors text-sm font-medium flex items-center justify-center gap-3"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-7.8z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.9C3.9 20.5 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.7 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7H2.1C1.4 8.5 1 10.2 1 12s.4 3.5 1.1 5l3.6-2.9z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.4c1.6 0 3.1.6 4.2 1.6L19.3 4C17.5 2.3 15 1.2 12 1.2 7.7 1.2 3.9 3.7 2.1 7.4l3.6 2.9c.9-2.6 3.4-4.9 6.3-4.9z"
                  />
                </svg>
                Continue with Google
              </button>
              <div className="flex items-center gap-3 my-6 text-xs uppercase tracking-wider text-muted-foreground">
                <div className="flex-1 h-px bg-border" />
                or
                <div className="flex-1 h-px bg-border" />
              </div>
            </>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Full name
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full px-4 py-3 rounded-lg bg-card border border-border focus:border-accent outline-none"
                />
              </div>
            )}
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-lg bg-card border border-border focus:border-accent outline-none"
              />
            </div>
            {mode !== "forgot-password" && (
              <div>
                <div className="flex justify-between items-center">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot-password")}
                      className="text-xs text-accent hover:underline focus:outline-none cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <PasswordInput
                  id="auth-password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Enter your password"
                />
              </div>
            )}

            {mode === "signup" && (
              <div className="flex items-start gap-2.5 my-3 select-none">
                <input
                  type="checkbox"
                  id="accept-terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent accent-accent cursor-pointer"
                />
                <label htmlFor="accept-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  I agree to ViaCraft's{" "}
                  <Link
                    to="/legal/$slug"
                    params={{ slug: "terms-and-conditions" }}
                    target="_blank"
                    className="text-accent hover:underline font-semibold"
                  >
                    Terms & Conditions
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/legal/$slug"
                    params={{ slug: "privacy-policy" }}
                    target="_blank"
                    className="text-accent hover:underline font-semibold"
                  >
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>
            )}

            <button
              disabled={busy}
              className="w-full py-3 rounded-full bg-primary text-primary-foreground hover:bg-foreground transition-colors text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
            </button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            {mode === "forgot-password" ? (
              <button
                onClick={() => setMode("signin")}
                className="text-accent hover:underline cursor-pointer"
              >
                Back to sign in
              </button>
            ) : (
              <>
                {mode === "signin" ? "New to ViaCraft?" : "Already have an account?"}{" "}
                <button
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="text-accent hover:underline cursor-pointer"
                >
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </>
            )}
          </p>
          <p className="mt-8 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-accent">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
