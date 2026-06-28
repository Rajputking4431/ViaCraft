import { motion } from "framer-motion";
import jewelry from "@/assets/cat-jewelry.jpg";
import preservation from "@/assets/cat-preservation.jpg";
import coasters from "@/assets/cat-coasters.jpg";
import keychain from "@/assets/cat-keychain.jpg";

const cats = [
  {
    title: "Resin Jewelry",
    count: "240 pieces",
    img: jewelry,
    span: "lg:col-span-2 lg:row-span-2 aspect-square",
  },
  {
    title: "Bouquet Preservation",
    count: "Signature service",
    img: preservation,
    span: "lg:col-span-2 aspect-[2/1]",
  },
  { title: "Coasters & Decor", count: "180 pieces", img: coasters, span: "aspect-square" },
  { title: "Custom Keychains", count: "95 pieces", img: keychain, span: "aspect-square" },
];

export function Categories() {
  return (
    <section id="shop" className="mx-auto max-w-7xl px-6 py-24">
      <div className="flex items-end justify-between mb-12 gap-6 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-accent mb-3">
            Curated Collections
          </p>
          <h2 className="font-display text-4xl sm:text-5xl max-w-xl">
            Crafted by hand. Treasured for a lifetime.
          </h2>
        </div>
        <a
          href="#"
          className="text-sm tracking-wider underline-offset-4 hover:underline text-foreground/80"
        >
          Browse all categories →
        </a>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 lg:auto-rows-[14rem]">
        {cats.map((c, i) => (
          <motion.a
            key={c.title}
            href="#"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: i * 0.08, duration: 0.6 }}
            className={`group relative overflow-hidden rounded-3xl ${c.span}`}
          >
            <img
              src={c.img}
              alt={c.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />
            <div className="absolute inset-0 p-6 flex flex-col justify-end text-background">
              <p className="text-[10px] uppercase tracking-[0.2em] opacity-80">{c.count}</p>
              <h3 className="font-display text-2xl lg:text-3xl mt-1">{c.title}</h3>
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
