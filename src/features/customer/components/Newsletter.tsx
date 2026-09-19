export function Newsletter() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div
        className="relative overflow-hidden rounded-[2.5rem] p-12 lg:p-20 text-center"
        style={{ background: "var(--gradient-gold)" }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground/70 mb-4">
            Join ViaCraft
          </p>
          <h2 className="font-display text-4xl sm:text-5xl text-foreground mb-4">
            Early drops. Artisan stories. Members-only collections.
          </h2>
          <p className="text-foreground/70 mb-8">
            Become an insider — and receive 10% off your first commission.
          </p>
          <form
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              required
              placeholder="your@email.com"
              className="flex-1 px-5 py-3.5 rounded-full bg-background/80 backdrop-blur border border-foreground/10 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
            />
            <button className="px-7 py-3.5 rounded-full bg-foreground text-background text-sm tracking-wide hover:bg-foreground/85 transition-colors">
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
