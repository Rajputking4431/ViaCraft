import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import hero from "@/assets/hero-resin.jpg";

export function Hero() {
  return (
    <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="mx-auto max-w-7xl px-6 pt-20 pb-28 lg:pt-28 lg:pb-36 grid lg:grid-cols-2 gap-16 items-center relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-8"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/70 backdrop-blur border border-border text-xs tracking-[0.2em] uppercase text-accent">
            <Sparkles className="h-3.5 w-3.5" /> The Art of Preservation
          </span>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.05] text-foreground">
            Preserve <em className="text-accent not-italic">memories</em>
            <br />
            forever in resin.
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
            A curated marketplace of independent artisans crafting heirloom keepsakes from your most
            precious moments — wedding bouquets, baby memories, beloved pets and more.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <a
              href="#shop"
              className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-primary text-primary-foreground hover:bg-foreground transition-colors text-sm tracking-wide"
            >
              Explore the Collection
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#preservation"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-foreground/20 hover:border-accent hover:text-accent transition-colors text-sm tracking-wide"
            >
              Start a Preservation
            </a>
          </div>
          <div className="flex items-center gap-8 pt-6 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <div>
              <span className="font-display text-2xl text-foreground normal-case tracking-normal">
                12k+
              </span>
              <br />
              Pieces crafted
            </div>
            <div className="h-10 w-px bg-border" />
            <div>
              <span className="font-display text-2xl text-foreground normal-case tracking-normal">
                480
              </span>
              <br />
              Artisan vendors
            </div>
            <div className="h-10 w-px bg-border" />
            <div>
              <span className="font-display text-2xl text-foreground normal-case tracking-normal">
                4.9★
              </span>
              <br />
              Average rating
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className="relative"
        >
          <div
            className="absolute -inset-6 rounded-[2.5rem] blur-3xl opacity-40"
            style={{ background: "var(--gradient-gold)" }}
          />
          <div
            className="relative aspect-[5/6] rounded-[2rem] overflow-hidden"
            style={{ boxShadow: "var(--shadow-luxe)" }}
          >
            <img
              src={hero}
              alt="Handcrafted resin sphere preserving a white rose with gold flakes"
              width={1536}
              height={1280}
              className="h-full w-full object-cover"
            />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="absolute -bottom-6 -left-6 bg-card/90 backdrop-blur-xl border border-border rounded-2xl p-5 max-w-[260px]"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/20 grid place-items-center text-accent">
                ✦
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Live preservation
                </p>
                <p className="font-display text-base">Wedding bouquet · Hexagon</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
