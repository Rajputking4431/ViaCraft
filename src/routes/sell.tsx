import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/layouts/PageShell";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, TrendingUp, Heart } from "lucide-react";
import { trackVendorRegistration } from "@/services/analytics/google";
import { sendVendorAppliedEmail, sendAdminNewVendorEmail } from "@/api/email.functions";

export const Route = createFileRoute("/sell")({
  head: () => ({ meta: [{ title: "Become a seller — ViaCraft" }] }),
  component: SellPage,
});

function SellPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [storeName, setStoreName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");

  const { data: existing } = useQuery({
    queryKey: ["my-vendor", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("vendors").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });

  useEffect(() => {
    if (existing && existing.status === "approved") {
      navigate({ to: "/vendor/dashboard" });
    }
  }, [existing, navigate]);

  const apply = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate({ to: "/auth" });
        throw new Error("Sign in first");
      }
      const slug =
        storeName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") +
        "-" +
        Math.random().toString(36).slice(2, 6);
      const { data: vendor, error } = await supabase
        .from("vendors")
        .insert({ user_id: user.id, slug, store_name: storeName, tagline, bio, location })
        .select()
        .single();
      if (error) throw error;
      await supabase.from("user_roles").insert({ user_id: user.id, role: "vendor" });
      return vendor;
    },
    onSuccess: (vendor) => {
      qc.invalidateQueries();
      toast.success("Application submitted! We'll review within 48h.");
      trackVendorRegistration(storeName, location);
      sendVendorAppliedEmail({ data: { userId: user!.id, storeName } }).catch((err) => {
        console.error("Vendor applied email trigger failure", err);
      });
      if (vendor) {
        sendAdminNewVendorEmail({ data: { vendorId: vendor.id } }).catch((err) => {
          console.error("Admin new vendor email trigger failure", err);
        });
      }
      navigate({ to: "/vendor/dashboard" });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.25em] text-accent mb-3">For Artisans</p>
        <h1 className="font-display text-5xl mb-4">Sell on ViaCraft.</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mb-12">
          Join a curated marketplace of independent resin artists. We handle discovery, payments and
          logistics — you focus on the craft.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          {[
            {
              i: TrendingUp,
              t: "Reach global collectors",
              d: "12k+ active buyers, growing 30% MoM",
            },
            { i: Heart, t: "Premium positioning", d: "Curated, no mass-market noise" },
            { i: Sparkles, t: "Built-in preservation", d: "Tap into our signature service" },
          ].map(({ i: Icon, t, d }, k) => (
            <div key={k} className="p-6 rounded-2xl border border-border bg-card">
              <Icon className="h-5 w-5 text-accent mb-3" />
              <h3 className="font-display text-lg mb-1">{t}</h3>
              <p className="text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>

        {!user ? (
          <div className="p-8 rounded-2xl border border-border bg-card text-center">
            <p className="mb-4">Sign in to apply.</p>
            <Link
              to="/auth"
              className="inline-block px-7 py-3 rounded-full bg-primary text-primary-foreground text-sm"
            >
              Sign in to continue
            </Link>
          </div>
        ) : existing && existing.status !== "approved" ? (
          <div className="p-8 rounded-2xl border border-border bg-card text-center">
            <h2 className="font-display text-2xl mb-2">You're already a seller</h2>
            <p className="text-muted-foreground mb-4">
              Status: <span className="capitalize text-accent">{existing.status}</span>
            </p>
            <a
              href="/vendor/dashboard"
              className="inline-block px-7 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
            >
              Open vendor dashboard
            </a>
          </div>
        ) : existing && existing.status === "approved" ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              apply.mutate();
            }}
            className="grid md:grid-cols-2 gap-5 p-8 rounded-2xl border border-border bg-card"
          >
            <Field label="Store name" value={storeName} onChange={setStoreName} required />
            <Field
              label="Location"
              value={location}
              onChange={setLocation}
              placeholder="Mumbai, IN"
            />
            <Field
              label="Tagline"
              value={tagline}
              onChange={setTagline}
              placeholder="Heirloom resin from Mumbai"
              className="md:col-span-2"
            />
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                About your craft
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                className="mt-1 w-full px-4 py-3 rounded-lg bg-background border border-border focus:border-accent outline-none"
              />
            </div>
            <button
              disabled={apply.isPending || !storeName}
              className="md:col-span-2 py-3 rounded-full bg-primary text-primary-foreground hover:bg-foreground transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              {apply.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit application
            </button>
          </form>
        )}
      </section>
    </PageShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
        {required && " *"}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full px-4 py-3 rounded-lg bg-background border border-border focus:border-accent outline-none"
      />
    </div>
  );
}
