import { motion } from "framer-motion";

const vendors = [
  { n: "Atelier Lumière", s: "Paris, FR", t: "Wedding Specialist", r: "4.98", p: "320" },
  { n: "Maple & Moss", s: "Vermont, US", t: "Botanical Resin", r: "4.95", p: "210" },
  { n: "Kintsugi Studio", s: "Kyoto, JP", t: "Memorial Art", r: "5.00", p: "180" },
  { n: "Verre & Or", s: "Lyon, FR", t: "Luxury Jewelry", r: "4.92", p: "275" },
];

export function Vendors() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="flex items-end justify-between mb-12 gap-6 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-accent mb-3">Featured Artisans</p>
          <h2 className="font-display text-4xl sm:text-5xl max-w-xl">
            Meet the makers behind every piece.
          </h2>
        </div>
        <a
          href="#"
          className="text-sm tracking-wider underline-offset-4 hover:underline text-foreground/80"
        >
          Visit the directory →
        </a>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {vendors.map((v, i) => (
          <motion.a
            key={v.n}
            href="#"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="group p-6 rounded-2xl border border-border bg-card hover:border-accent transition-colors"
          >
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-accent to-primary text-background grid place-items-center font-display text-2xl mb-5">
              {v.n[0]}
            </div>
            <h3 className="font-display text-xl">{v.n}</h3>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
              {v.s} · {v.t}
            </p>
            <div className="flex items-center justify-between mt-5 pt-5 border-t border-border text-sm">
              <span className="text-accent">★ {v.r}</span>
              <span className="text-muted-foreground">{v.p} pieces</span>
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
