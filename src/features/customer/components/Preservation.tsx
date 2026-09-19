import { motion } from "framer-motion";
import { Flower2, Heart, Baby, PawPrint, Gem, Package } from "lucide-react";

const steps = [
  { n: "01", t: "Submit", d: "Choose what you'd like preserved and share photos." },
  { n: "02", t: "Consult", d: "An artisan reviews your piece and prepares a custom quote." },
  { n: "03", t: "Craft", d: "Cleaning, drying, casting, finishing — every stage tracked." },
  { n: "04", t: "Cherish", d: "Your heirloom arrives, ready to last a lifetime." },
];

const types = [
  { i: Flower2, t: "Wedding Bouquets" },
  { i: Heart, t: "Memorial Keepsakes" },
  { i: Baby, t: "Baby Memories" },
  { i: PawPrint, t: "Pet Memories" },
  { i: Gem, t: "Special Objects" },
  { i: Package, t: "Custom Requests" },
];

export function Preservation() {
  return (
    <section id="preservation" className="relative py-28">
      <div className="absolute inset-0 bg-secondary/40" />
      <div className="relative mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-16">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-accent mb-3">
            The Preservation Journey
          </p>
          <h2 className="font-display text-4xl sm:text-5xl leading-tight mb-6">
            From fleeting moment to forever keepsake.
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-10 max-w-md">
            Our signature preservation service transforms life's irreplaceable moments into
            museum-grade resin heirlooms — each piece tracked through nine artisan stages.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {types.map(({ i: Icon, t }) => (
              <div
                key={t}
                className="flex items-center gap-3 p-4 rounded-xl bg-card/70 backdrop-blur border border-border"
              >
                <div className="h-9 w-9 rounded-lg bg-accent/15 text-accent grid place-items-center">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm">{t}</span>
              </div>
            ))}
          </div>
          <a
            href="#"
            className="inline-flex items-center gap-2 mt-10 px-7 py-3.5 rounded-full bg-accent text-accent-foreground hover:bg-foreground hover:text-background transition-colors text-sm tracking-wide"
          >
            Start Your Preservation
          </a>
        </div>
        <div className="relative">
          <div className="space-y-5">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative flex gap-6 p-6 rounded-2xl bg-card border border-border"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <div className="font-display text-4xl text-accent leading-none">{s.n}</div>
                <div>
                  <h3 className="font-display text-xl mb-1">{s.t}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
