import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/layouts/PageShell";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  Heart,
  Award,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Play,
  Lightbulb,
  Edit3,
  ShieldCheck,
  Undo2,
  Truck,
  Smile,
  CheckCircle,
  Gem,
  Compass,
  Sparkle,
} from "lucide-react";

export const Route = createFileRoute("/collections")({
  head: () => ({
    meta: [
      { title: "Curated Collections — ViaCraft" },
      {
        name: "description",
        content:
          "Explore premium handpicked resin art collections. Find the perfect resin clock, bouquet preservation block, custom alphabet letters, or ocean coasters.",
      },
    ],
  }),
  component: CollectionsPage,
});

// Mood tags for "Browse by Mood"
const MOODS = [
  {
    name: "Elegant",
    label: "Elegant",
    img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Minimal",
    label: "Minimal",
    img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Luxury",
    label: "Luxury",
    img: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Bohemian",
    label: "Bohemian",
    img: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Vintage",
    label: "Vintage",
    img: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Modern",
    label: "Modern",
    img: "https://images.unsplash.com/photo-1597080262677-cfb5ef4f31cc?w=150&auto=format&fit=crop&q=80",
  },
];

// Color tags for "Browse by Color"
const COLORS = [
  { name: "Ocean Blue", hex: "#0077b6", class: "bg-[#0077b6]" },
  { name: "Gold", hex: "#d4af37", class: "bg-[#d4af37]" },
  { name: "Blush Pink", hex: "#ffb6c1", class: "bg-[#ffb6c1]" },
  { name: "Pearl White", hex: "#f8f9fa", class: "bg-[#f8f9fa] border border-[#e2d8ca]" },
  { name: "Emerald Green", hex: "#0f5132", class: "bg-[#0f5132]" },
];

// Curated collections grid list
const GRID_COLLECTIONS = [
  {
    id: "ocean-dreams",
    title: "Ocean Dreams Collection",
    count: "120+ Products",
    img: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&auto=format&fit=crop&q=80",
    dark: true,
    catId: "Resin Coasters",
  },
  {
    id: "wedding",
    title: "Wedding Collection",
    count: "85+ Products",
    img: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=500&auto=format&fit=crop&q=80",
    dark: false,
    catId: "Preservation",
  },
  {
    id: "pet-memories",
    title: "Pet Memories Collection",
    count: "60+ Products",
    img: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&auto=format&fit=crop&q=80",
    dark: false,
    catId: "Preservation",
  },
  {
    id: "floral-bliss",
    title: "Floral Bliss Collection",
    count: "95+ Products",
    img: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop&q=80",
    dark: false,
    catId: "Resin Jewelry",
  },
  {
    id: "baby-memories",
    title: "Baby Memories Collection",
    count: "70+ Products",
    img: "https://images.unsplash.com/photo-1515488042361-404e9250afef?w=500&auto=format&fit=crop&q=80",
    dark: false,
    catId: "Preservation",
  },
  {
    id: "home-decor",
    title: "Home Decor Collection",
    count: "110+ Products",
    img: "https://images.unsplash.com/photo-1603006905393-0d6f28a3c680?w=500&auto=format&fit=crop&q=80",
    dark: false,
    catId: "Resin Tables",
  },
  {
    id: "luxury-elegance",
    title: "Luxury Elegance Collection",
    count: "90+ Products",
    img: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=500&auto=format&fit=crop&q=80",
    dark: false,
    catId: "Resin Clocks",
  },
  {
    id: "gift-collection",
    title: "Gift Collection Collection",
    count: "100+ Products",
    img: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&auto=format&fit=crop&q=80",
    dark: false,
    catId: "Gift Sets",
  },
  {
    id: "festival",
    title: "Festival Collection",
    count: "55+ Products",
    img: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500&auto=format&fit=crop&q=80",
    dark: false,
    catId: "Resin Trays",
  },
  {
    id: "personalized",
    title: "Personalized Collection",
    count: "65+ Products",
    img: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=500&auto=format&fit=crop&q=80",
    dark: false,
    catId: "Resin Keychains",
  },
  {
    id: "wall-art",
    title: "Wall Art Collection",
    count: "75+ Products",
    img: "https://images.unsplash.com/photo-1597080262677-cfb5ef4f31cc?w=500&auto=format&fit=crop&q=80",
    dark: false,
    catId: "Premium Collection",
  },
];

function CollectionsPage() {
  const navigate = useNavigate();
  const gridRef = useRef<HTMLDivElement>(null);

  // Query categories from Supabase to resolve name to UUID
  const { data: dbCategories = [] } = useQuery({
    queryKey: ["shop-categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  // Scroll function for experience grid slider
  const scrollGrid = (direction: "left" | "right") => {
    if (gridRef.current) {
      const { scrollLeft, clientWidth } = gridRef.current;
      const amount = clientWidth * 0.75;
      const scrollTo = direction === "left" ? scrollLeft - amount : scrollLeft + amount;
      gridRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  const handleColorClick = (colorName: string) => {
    navigate({ to: "/shop", search: { q: colorName } as any });
  };

  const handleMoodClick = (moodName: string) => {
    navigate({ to: "/shop", search: { q: moodName } as any });
  };

  return (
    <PageShell>
      <div className="min-h-screen bg-[#FCFBFA] text-[#3D2712] pb-16 antialiased select-none">
        {/* 1. HERO HEADER SECTION */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#FDFCFB] to-[#F9F6F0] py-16 sm:py-24 border-b border-[#EBDCC7]/60">
          {/* Subtle Background Elements */}
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#C8A165_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Heading and Info */}
              <div className="lg:col-span-6 space-y-6 sm:space-y-8 text-left z-10">
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold tracking-[0.25em] uppercase text-[#C8A165]">
                  <Sparkle className="h-4.5 w-4.5 text-[#C8A165] fill-current animate-pulse" />
                  OUR CURATED COLLECTIONS
                </span>

                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#3D2712] leading-[1.15] tracking-tight">
                  Every Collection <br />
                  Tells a{" "}
                  <span className="text-[#C8A165] font-serif italic font-medium">Story</span> ♡
                </h1>

                <p className="text-sm sm:text-base text-[#5C4A3B]/90 max-w-lg leading-relaxed font-medium">
                  Handpicked resin art collections crafted to preserve your most precious memories
                  and celebrate every emotion. Explore unique creations built to last a lifetime.
                </p>

                {/* Badges block */}
                <div className="flex flex-wrap gap-x-6 gap-y-4 pt-4 border-t border-[#EBDCC7]/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#C8A165]/10 border border-[#C8A165]/30 flex items-center justify-center text-[#C8A165]">
                      <Heart className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-[#3D2712] uppercase tracking-wider">
                        Handmade
                      </p>
                      <p className="text-[10px] text-[#8C7A6B] font-semibold">with Love</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#C8A165]/10 border border-[#C8A165]/30 flex items-center justify-center text-[#C8A165]">
                      <Gem className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-[#3D2712] uppercase tracking-wider">
                        Premium
                      </p>
                      <p className="text-[10px] text-[#8C7A6B] font-semibold">Quality</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#C8A165]/10 border border-[#C8A165]/30 flex items-center justify-center text-[#C8A165]">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-[#3D2712] uppercase tracking-wider">
                        Timeless
                      </p>
                      <p className="text-[10px] text-[#8C7A6B] font-semibold">Keepsakes</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Skewed Rounded Capsule Collage */}
              <div className="lg:col-span-6 flex justify-center items-center py-6">
                <div className="flex gap-4 md:gap-5 justify-center items-center h-[360px] md:h-[420px] max-w-lg w-full">
                  {/* Capsule 1: Resin Clock */}
                  <div className="w-1/4 h-[80%] rounded-[2.5rem] overflow-hidden -skew-x-12 border border-[#EBDCC7] shadow-luxe transform translate-y-8 bg-[#FAF7F2]">
                    <img
                      src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=450&auto=format&fit=crop&q=80"
                      alt="Floral Resin Clock"
                      className="w-full h-full object-cover skew-x-12 scale-150 origin-center transition-transform hover:scale-160 duration-700"
                    />
                  </div>

                  {/* Capsule 2: Ocean Wave Tray */}
                  <div className="w-1/4 h-[95%] rounded-[2.5rem] overflow-hidden -skew-x-12 border border-[#EBDCC7] shadow-luxe transform -translate-y-2 bg-[#FAF7F2]">
                    <img
                      src="https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=450&auto=format&fit=crop&q=80"
                      alt="Sea Ocean wave resin plate"
                      className="w-full h-full object-cover skew-x-12 scale-150 origin-center transition-transform hover:scale-160 duration-700"
                    />
                  </div>

                  {/* Capsule 3: Floral Necklace Charm */}
                  <div className="w-1/4 h-[90%] rounded-[2.5rem] overflow-hidden -skew-x-12 border border-[#EBDCC7] shadow-luxe transform translate-y-4 bg-[#FAF7F2]">
                    <img
                      src="https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=450&auto=format&fit=crop&q=80"
                      alt="Floral resin necklace"
                      className="w-full h-full object-cover skew-x-12 scale-150 origin-center transition-transform hover:scale-160 duration-700"
                    />
                  </div>

                  {/* Capsule 4: Bouquet Photo Block */}
                  <div className="w-1/4 h-[85%] rounded-[2.5rem] overflow-hidden -skew-x-12 border border-[#EBDCC7] shadow-luxe transform -translate-y-6 bg-[#FAF7F2]">
                    <img
                      src="https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=450&auto=format&fit=crop&q=80"
                      alt="Flower preservation resin frame"
                      className="w-full h-full object-cover skew-x-12 scale-150 origin-center transition-transform hover:scale-160 duration-700"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. EXPLORE BY EXPERIENCE SECTION (Grid of Collections) */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-10 gap-6">
            <div className="text-left space-y-2">
              <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase text-[#C8A165]">
                EXPLORE BY EXPERIENCE
              </span>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#3D2712] tracking-tight leading-tight">
                Find the Collection That Matches Your Moment
              </h2>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={() => scrollGrid("left")}
                  className="h-9 w-9 rounded-full border border-[#EBDCC7] bg-white text-[#5A4331] hover:text-[#C8A165] hover:border-[#C8A165] flex items-center justify-center shadow-sm cursor-pointer transition-all"
                  aria-label="Scroll left grid"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => scrollGrid("right")}
                  className="h-9 w-9 rounded-full border border-[#EBDCC7] bg-white text-[#5A4331] hover:text-[#C8A165] hover:border-[#C8A165] flex items-center justify-center shadow-sm cursor-pointer transition-all"
                  aria-label="Scroll right grid"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <Link
                to="/shop"
                className="px-6 py-2.5 rounded-full bg-[#3D2712] hover:bg-[#2A1A0C] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow transition-colors"
              >
                View All Collections
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Static 4x3 Grid matching the design layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {GRID_COLLECTIONS.map((col) => {
              return (
                <div
                  key={col.id}
                  className={`h-[180px] rounded-3xl p-5 flex items-center justify-between gap-3 overflow-hidden transition-all duration-300 hover:shadow-md hover:translate-y-[-2px] group text-left ${
                    col.dark
                      ? "bg-[#253241] text-white border border-transparent shadow-sm"
                      : "bg-[#FAF7F2]/40 text-[#3D2712] border border-[#E8DFD2] hover:bg-white"
                  }`}
                >
                  {/* Left side text column */}
                  <div className="flex flex-col justify-between h-full flex-1 min-w-0 pr-1">
                    <div className="space-y-1">
                      <h3 className="font-display text-base font-extrabold leading-tight tracking-tight line-clamp-2">
                        {col.title}
                      </h3>
                      <p
                        className={`text-[10px] font-bold uppercase tracking-wider ${col.dark ? "text-slate-350" : "text-[#8C7A6B]"}`}
                      >
                        {col.count}
                      </p>
                    </div>

                    <div>
                      <Link
                        to="/shop"
                        search={{ cat: col.catId } as any}
                        className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider transition-all ${
                          col.dark
                            ? "text-[#C8A165] hover:text-[#DAB579]"
                            : "text-[#3D2712] hover:text-[#C8A165]"
                        }`}
                      >
                        Explore{" "}
                        <span className="transition-transform group-hover:translate-x-0.5 inline-block">
                          →
                        </span>
                      </Link>
                    </div>
                  </div>

                  {/* Right side image */}
                  <div className="w-[100px] h-[100px] sm:w-[110px] sm:h-[110px] rounded-2xl overflow-hidden shrink-0 relative shadow-sm border border-[#EBDCC7]/40 bg-white">
                    <img
                      src={col.img}
                      alt={col.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                </div>
              );
            })}

            {/* Card 12: Create Your Own Collection */}
            <div className="h-[180px] rounded-3xl p-5 flex items-center justify-between gap-3 overflow-hidden bg-[#FAF7F2] text-[#3D2712] border border-dashed border-[#C8A165]/50 transition-all duration-300 hover:shadow-md hover:translate-y-[-2px] group text-left relative">
              <div className="flex flex-col justify-between h-full flex-1 z-10 min-w-0 pr-1">
                <div className="space-y-1">
                  <h3 className="font-display text-base font-extrabold leading-tight tracking-tight">
                    Create Your Own
                  </h3>
                  <p className="text-[10px] text-[#8C7A6B] font-medium leading-relaxed line-clamp-2">
                    Design something uniquely yours
                  </p>
                </div>

                <div>
                  <Link
                    to="/custom-order"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#3D2712] hover:bg-[#2A1A0C] text-white text-[10px] font-bold uppercase tracking-wider shadow transition-colors"
                  >
                    Start Creating
                  </Link>
                </div>
              </div>

              {/* Right side custom decoration */}
              <div className="w-[100px] h-[100px] sm:w-[110px] sm:h-[110px] rounded-2xl bg-white/70 border border-[#EBDCC7] flex items-center justify-center shrink-0 relative shadow-sm z-10 transition-transform group-hover:scale-102">
                <Edit3 className="h-7 w-7 text-[#C8A165]" />
                <span className="absolute top-2 right-2 text-muted-foreground p-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C8A165] block" />
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. BROWSE BY MOOD / COLOR / FINDER BAR */}
        <section className="bg-white border-t border-b border-[#EBDCC7]/60 py-12 select-none">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-8 items-stretch">
              {/* Column 1: Browse by Mood (5-cols on large) */}
              <div className="lg:col-span-5 space-y-4 text-left border-b lg:border-b-0 lg:border-r border-[#EBDCC7]/60 pb-8 lg:pb-0 lg:pr-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8A165]">
                  BROWSE BY MOOD
                </p>
                <div className="flex flex-wrap items-center gap-4.5">
                  {MOODS.map((mood, i) => (
                    <button
                      key={i}
                      onClick={() => handleMoodClick(mood.name)}
                      className="flex flex-col items-center gap-2 group cursor-pointer"
                    >
                      <div className="h-12 w-12 rounded-full overflow-hidden border border-[#EBDCC7] p-0.5 bg-[#FAF7F2] transition-transform group-hover:scale-105 group-hover:border-[#C8A165]">
                        <img
                          src={mood.img}
                          alt=""
                          className="h-full w-full object-cover rounded-full"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-[#5A4331] group-hover:text-[#C8A165] transition-colors">
                        {mood.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Column 2: Browse by Color (3-cols on large) */}
              <div className="lg:col-span-3 space-y-4 text-left border-b lg:border-b-0 lg:border-r border-[#EBDCC7]/60 pb-8 lg:pb-0 lg:px-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8A165]">
                  BROWSE BY COLOR
                </p>
                <div className="flex items-center gap-3 pt-1">
                  {COLORS.map((col, i) => (
                    <button
                      key={i}
                      onClick={() => handleColorClick(col.name)}
                      className={`h-7 w-7 rounded-full cursor-pointer transition-transform hover:scale-110 shadow-sm ${col.class}`}
                      title={col.name}
                    />
                  ))}
                  <button
                    onClick={() => navigate({ to: "/shop" })}
                    className="h-7 w-7 rounded-full bg-slate-50 border border-[#EBDCC7] text-[#5A4331] hover:text-[#C8A165] hover:border-[#C8A165] flex items-center justify-center cursor-pointer transition-colors"
                    title="All colors"
                  >
                    <span className="text-[10px] font-bold">•••</span>
                  </button>
                </div>
              </div>

              {/* Column 3: Collection Finder Widget (4-cols on large) */}
              <div className="lg:col-span-4 flex items-center lg:pl-8">
                <div className="w-full bg-[#FAF7F2] border border-[#EBDCC7]/60 p-5 rounded-2xl flex items-center justify-between gap-4 text-left shadow-inner">
                  <div className="space-y-1.5 max-w-[70%]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#C8A165] flex items-center gap-1">
                      <Compass className="h-3.5 w-3.5" /> COLLECTION FINDER
                    </p>
                    <p className="text-[11px] font-semibold text-[#5A4331] leading-snug">
                      Answer a few questions and we'll help you find the perfect collection.
                    </p>
                    <Link
                      to="/custom-order"
                      className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#3D2712] hover:underline"
                    >
                      Find My Collection →
                    </Link>
                  </div>

                  <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-[#C8A165] border border-[#EBDCC7] shrink-0 shadow-sm">
                    <Lightbulb className="h-5.5 w-5.5 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. FEATURED COLLECTION SECTION (Celestial Night Spotlight) */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 select-none">
          <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white border border-[#EBDCC7]/20 p-8 sm:p-12 lg:p-16 shadow-luxe text-left">
            {/* Ambient Background Glow / Glitter */}
            <div className="absolute right-0 bottom-0 top-0 w-1/2 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#FAF7F2_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            <div className="grid lg:grid-cols-12 gap-12 items-center relative z-10">
              {/* Left Column: Spotlight details */}
              <div className="lg:col-span-6 space-y-6">
                <span className="inline-block bg-[#C8A165]/15 border border-[#C8A165]/40 text-[#C8A165] text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                  FEATURED COLLECTION
                </span>

                <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight leading-none text-[#FAF7F2]">
                  Celestial Night Collection
                </h2>

                <p className="text-sm text-slate-350 leading-relaxed max-w-md">
                  A cosmic blend of deep blues, shimmering gold flakes, and delicate stardust
                  structures. Every piece is handcrafted by certified master artisans to mesmerize
                  and capture the mystery of the night sky.
                </p>

                <div className="flex flex-wrap items-center gap-5 pt-3">
                  <Link
                    to="/shop"
                    search={{ q: "celestial" } as any}
                    className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-white hover:bg-slate-100 text-slate-950 text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.02] shadow-md"
                  >
                    Explore Collection
                  </Link>

                  <div className="text-left">
                    <p className="text-[#C8A165] font-extrabold text-base leading-none">45+</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      Exclusive Pieces
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Cosmic clocks and video preview overlay */}
              <div className="lg:col-span-6 flex flex-col sm:flex-row items-center justify-center gap-6">
                {/* Images overlapping */}
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden border-8 border-slate-900 shadow-2xl flex items-center justify-center shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=500&auto=format&fit=crop&q=80"
                    alt="Celestial Resin Clock"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 border border-slate-800 rounded-full" />
                </div>

                <div className="flex flex-col items-start space-y-4">
                  {/* Small extra preview */}
                  <div className="hidden sm:flex items-center gap-3 p-3 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl shadow-lg">
                    <img
                      src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format"
                      alt=""
                      className="h-10 w-10 object-cover rounded-lg bg-slate-800 shrink-0"
                    />
                    <div className="text-left">
                      <p className="text-xs font-bold text-white">Watch story</p>
                      <p className="text-[9px] text-slate-400 font-medium">
                        Celestial Clocks creation
                      </p>
                    </div>
                  </div>

                  {/* Play video button */}
                  <button
                    onClick={() => navigate({ to: "/shop" })}
                    className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-slate-900/80 hover:bg-slate-800/95 border border-slate-800 hover:border-[#C8A165]/50 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg group"
                  >
                    <div className="h-7 w-7 rounded-full bg-white text-slate-950 flex items-center justify-center shadow group-hover:scale-105 transition-transform">
                      <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                    </div>
                    <span>Watch Collection Story</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. TRUST HIGHLIGHTS BAR */}
        <section className="bg-white border-t border-[#EBDCC7]/60 py-10 select-none">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-[#5A4331] justify-center">
              <div className="flex flex-col items-center text-center space-y-2.5">
                <div className="h-12 w-12 rounded-full bg-[#FAF7F2] border border-[#EBDCC7]/60 flex items-center justify-center text-[#C8A165] shadow-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-extrabold text-[#3D2712] uppercase tracking-wider">
                    Unique Designs
                  </h4>
                  <p className="text-[9px] text-[#8C7A6B] font-semibold">
                    You won't find anywhere else
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center space-y-2.5">
                <div className="h-12 w-12 rounded-full bg-[#FAF7F2] border border-[#EBDCC7]/60 flex items-center justify-center text-[#C8A165] shadow-sm">
                  <Heart className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-extrabold text-[#3D2712] uppercase tracking-wider">
                    Made with Love
                  </h4>
                  <p className="text-[9px] text-[#8C7A6B] font-semibold">
                    Every piece is crafted by our artists
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center space-y-2.5 col-span-2 md:col-span-1">
                <div className="h-12 w-12 rounded-full bg-[#FAF7F2] border border-[#EBDCC7]/60 flex items-center justify-center text-[#C8A165] shadow-sm mx-auto">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-extrabold text-[#3D2712] uppercase tracking-wider">
                    Customization
                  </h4>
                  <p className="text-[9px] text-[#8C7A6B] font-semibold">
                    Personalize your memories
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center space-y-2.5">
                <div className="h-12 w-12 rounded-full bg-[#FAF7F2] border border-[#EBDCC7]/60 flex items-center justify-center text-[#C8A165] shadow-sm">
                  <Gem className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-extrabold text-[#3D2712] uppercase tracking-wider">
                    Premium Materials
                  </h4>
                  <p className="text-[9px] text-[#8C7A6B] font-semibold">
                    High quality resin & accessories
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center space-y-2.5">
                <div className="h-12 w-12 rounded-full bg-[#FAF7F2] border border-[#EBDCC7]/60 flex items-center justify-center text-[#C8A165] shadow-sm">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-extrabold text-[#3D2712] uppercase tracking-wider">
                    Secure Packaging
                  </h4>
                  <p className="text-[9px] text-[#8C7A6B] font-semibold">
                    Safe delivery, every time
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
