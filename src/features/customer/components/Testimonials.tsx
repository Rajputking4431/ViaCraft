const quotes = [
  {
    q: "They preserved my mother's wedding bouquet from 1968. I cried opening the box. It's perfect.",
    a: "Eleanor V.",
    s: "Memorial preservation",
  },
  {
    q: "The custom resin frame with my daughter's first lock of hair is now our family heirloom.",
    a: "Priya R.",
    s: "Custom keepsake",
  },
  {
    q: "Honestly the most beautiful thing in my home. Worth every rupee.",
    a: "Arjun M.",
    s: "Wedding bouquet",
  },
];
export function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <p className="text-xs uppercase tracking-[0.25em] text-accent mb-3 text-center">Stories</p>
      <h2 className="font-display text-4xl sm:text-5xl text-center max-w-2xl mx-auto mb-16">
        Memories, made eternal.
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {quotes.map((t, i) => (
          <figure
            key={i}
            className="p-8 rounded-3xl bg-card border border-border"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <div className="text-5xl font-display text-accent leading-none mb-4">"</div>
            <blockquote className="font-display text-xl leading-snug">{t.q}</blockquote>
            <figcaption className="mt-6 pt-6 border-t border-border">
              <p className="font-medium">{t.a}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{t.s}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
