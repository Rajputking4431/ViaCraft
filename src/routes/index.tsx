import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowRight,
  Clock,
  ShieldCheck,
  Undo,
  Heart,
  Award,
  Compass,
  Star,
  ChevronLeft,
  ChevronRight,
  Upload,
  Calendar,
  Gift,
  HelpCircle,
  Play,
  Lightbulb,
  Infinity,
  Check,
  Truck,
  Sparkle,
  Smile,
  Info,
  Lock,
  Globe,
  Sliders,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ViaCraft — Cherish Today, Preserved Forever" },
      {
        name: "description",
        content:
          "Premium flower bouquet preservation, custom resin art keepsakes, and memories preserved by certified independent artisans.",
      },
      { property: "og:title", content: "ViaCraft — Cherish Today, Preserved Forever" },
      {
        property: "og:description",
        content:
          "Preserve your wedding flowers, memorial heirlooms, baby booties, and precious moments in crystal clear museum-grade resin art.",
      },
    ],
  }),
  component: Index,
});

// Category Bubble Navigation items
const BUBBLE_CATEGORIES = [
  {
    name: "Resin Clocks",
    img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Resin Trays",
    img: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Resin Coasters",
    img: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Resin Jewelry",
    img: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Car Hanging",
    img: "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Resin Keychains",
    img: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Baby Casting",
    img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Preservation",
    img: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Candle Art",
    img: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Resin Tables",
    img: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Gift Sets",
    img: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Premium Collection",
    img: "https://images.unsplash.com/photo-1515688594390-b649af70d282?w=150&auto=format&fit=crop&q=80",
  },
];

// Occasions list
const OCCASIONS = [
  {
    name: "Birthday Collection",
    img: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "Anniversary Collection",
    img: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "Wedding Collection",
    img: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "Valentine's Day Collection",
    img: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "Christmas Collection",
    img: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "Corporate Gifts",
    img: "https://images.unsplash.com/photo-1603006905393-0d6f28a3c680?w=200&auto=format&fit=crop&q=80",
  },
];

// Hero Slides
const HERO_SLIDES = [
  {
    title: "Handmade Resin Art That Tells Your Story ✨",
    subtitle:
      "Unique. Elegant. Timeless. Explore handcrafted resin creations made with love and creativity.",
    img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Preserve Your Precious Bouquet Memories 🌸",
    subtitle:
      "Turn wedding flowers, engagement roses, and heirloom petals into crystal clear museum-grade resin.",
    img: "https://images.unsplash.com/photo-1597080262677-cfb5ef4f31cc?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Luxury Homeware For Elegant Living Spaces 🍽️",
    subtitle:
      "Discover high-end resin clocks, customized dining trays, and gold foil coasters handcrafted by top artisans.",
    img: "https://images.unsplash.com/photo-1603006905393-0d6f28a3c680?w=800&auto=format&fit=crop&q=80",
  },
];

// Product Data - Trending
const TRENDING_PRODUCTS = [
  {
    id: "t1",
    title: "Ocean Wave Clock",
    rating: 4.9,
    reviews: 120,
    price: "₹2,499",
    originalPrice: "₹3,499",
    discount: "28% OFF",
    tag: "Bestseller",
    img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "t2",
    title: "Golden Flake Tray",
    rating: 4.7,
    reviews: 85,
    price: "₹1,299",
    originalPrice: "₹1,699",
    discount: "23% OFF",
    tag: "Trending",
    img: "https://images.unsplash.com/photo-1603006905393-0d6f28a3c680?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "t3",
    title: "Resin Pendant Necklace",
    rating: 4.8,
    reviews: 72,
    price: "₹499",
    originalPrice: "₹699",
    discount: "28% OFF",
    tag: "",
    img: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "t4",
    title: "Floral Resin Coasters",
    rating: 4.8,
    reviews: 68,
    price: "₹699",
    originalPrice: "₹999",
    discount: "30% OFF",
    tag: "",
    img: "https://images.unsplash.com/photo-1597080262677-cfb5ef4f31cc?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "t5",
    title: "Beach Ocean Wall Art",
    rating: 4.9,
    reviews: 105,
    price: "₹3,299",
    originalPrice: "₹4,999",
    discount: "34% OFF",
    tag: "New",
    img: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "t6",
    title: "Resin Keychain",
    rating: 4.7,
    reviews: 71,
    price: "₹299",
    originalPrice: "₹499",
    discount: "40% OFF",
    tag: "",
    img: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&auto=format&fit=crop&q=80",
  },
];

// Product Data - Bestsellers
const BESTSELLER_PRODUCTS = [
  {
    id: "b1",
    title: "Minimal Ocean Clock",
    rating: 4.9,
    reviews: 120,
    price: "₹2,299",
    originalPrice: "₹3,000",
    discount: "23% OFF",
    tag: "Bestseller",
    img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "b2",
    title: "White Floral Tray",
    rating: 4.7,
    reviews: 87,
    price: "₹1,499",
    originalPrice: "₹1,899",
    discount: "21% OFF",
    tag: "Trending",
    img: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "b3",
    title: "Resin Keychain",
    rating: 4.8,
    reviews: 112,
    price: "₹299",
    originalPrice: "₹499",
    discount: "40% OFF",
    tag: "Top Rated",
    img: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "b4",
    title: "Golden Edge Tray",
    rating: 4.7,
    reviews: 85,
    price: "₹1,199",
    originalPrice: "₹1,699",
    discount: "30% OFF",
    tag: "Trending",
    img: "https://images.unsplash.com/photo-1603006905393-0d6f28a3c680?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "b5",
    title: "Pastel Coaster Set",
    rating: 4.8,
    reviews: 104,
    price: "₹649",
    originalPrice: "₹899",
    discount: "28% OFF",
    tag: "Bestseller",
    img: "https://images.unsplash.com/photo-1597080262677-cfb5ef4f31cc?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "b6",
    title: "Resin Pendant",
    rating: 4.7,
    reviews: 108,
    price: "₹499",
    originalPrice: "₹799",
    discount: "38% OFF",
    tag: "Top Rated",
    img: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&auto=format&fit=crop&q=80",
  },
];

// Customer Reviews
const CUSTOMER_REVIEWS = [
  {
    id: "r1",
    name: "Olivia & Aaron",
    review: "Wedding Bouquet Preservation",
    desc: "The flower preservation was absolutely breathtaking. Every single petal was frozen perfectly in crystal clear resin. A lifetime keepsake!",
    img: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=350&auto=format&fit=crop&q=80",
  },
  {
    id: "r2",
    name: "Nisha & Kabir",
    review: "Pet Memory Preservation",
    desc: "A beautiful way to remember our beloved golden retriever. The details, the clarity, the custom setup — everything was handled with so much love.",
    img: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=350&auto=format&fit=crop&q=80",
  },
  {
    id: "r3",
    name: "Chris & Stella",
    review: "Memorial Keepsake",
    desc: "Words can't describe how beautiful our memorial frame turned out. It stands in our living room, capturing all the light. Highly recommend ViaCraft.",
    img: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=350&auto=format&fit=crop&q=80",
  },
  {
    id: "r4",
    name: "Priya & Raj",
    review: "Baby Memory Preservation",
    desc: "Preserving our baby's hospital card and first shoes was the best decision. Beautifully laid out and crafted with museum-grade quality resin.",
    img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=350&auto=format&fit=crop&q=80",
  },
];

function Index() {
  const navigate = useNavigate();

  // Hero Slider State
  const [heroIndex, setHeroIndex] = useState(0);

  // Countdown Timer State (Ends in 4 hrs 21 min 39 secs initially)
  const [countdown, setCountdown] = useState({ hours: 4, minutes: 21, seconds: 39 });

  // Scroll Container Refs
  const categoriesRef = useRef<HTMLDivElement>(null);
  const trendingRef = useRef<HTMLDivElement>(null);
  const bestsellersRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);

  // Wishlisted local state for demonstration
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Hero Slider Autoslide
  useEffect(() => {
    const sliderInterval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(sliderInterval);
  }, []);

  // Flash Sale Countdown Interval
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 23, minutes: 59, seconds: 59 }; // loop
        }
      });
    }, 1000);
    return () => clearInterval(countdownInterval);
  }, []);

  // Generic Scroll function
  const scrollElement = (
    ref: React.RefObject<HTMLDivElement | null>,
    direction: "left" | "right",
    amount: number = 320,
  ) => {
    if (ref.current) {
      const { scrollLeft } = ref.current;
      const scrollTo = direction === "left" ? scrollLeft - amount : scrollLeft + amount;
      ref.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  const handleWishlistToggle = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (wishlist.includes(id)) {
      setWishlist(wishlist.filter((item) => item !== id));
      toast.success("Removed from wishlist");
    } else {
      setWishlist([...wishlist, id]);
      toast.success("Saved to wishlist");
    }
  };

  const formatNumber = (num: number) => String(num).padStart(2, "0");

  return (
    <div className="min-h-screen bg-[#fcfbfa] text-[#3d2712] flex flex-col antialiased">
      {/* 1. Header Navigation */}
      <SiteHeader />

      <main className="flex-1 pb-16">
        {/* 2. Category Bubble Navigation (Circular Icons Slider) */}
        <section className="bg-white border-b border-[#e2d8ca] py-4 sm:py-6 relative group select-none">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 relative">
            <button
              onClick={() => scrollElement(categoriesRef, "left", 180)}
              className="absolute left-1 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white border border-[#e2d8ca] hidden md:flex items-center justify-center shadow-md hover:border-[#c8a165] hover:text-[#c8a165] text-[#5a4331] cursor-pointer transition-all opacity-0 group-hover:opacity-100"
              aria-label="Scroll left categories"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div
              ref={categoriesRef}
              className="flex items-center gap-6 overflow-x-auto scrollbar-none scroll-smooth py-1 px-4"
            >
              {BUBBLE_CATEGORIES.map((cat, idx) => {
                return (
                  <Link
                    key={idx}
                    to="/shop"
                    search={{ cat: cat.name } as any}
                    className="flex flex-col items-center shrink-0 space-y-2 group/cat cursor-pointer"
                  >
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border border-[#ebdcc7] overflow-hidden p-0.5 bg-[#FAF7F2] transition-all group-hover/cat:border-[#c8a165] group-hover/cat:scale-105 group-hover/cat:shadow-sm">
                      <img
                        src={cat.img}
                        alt={cat.name}
                        className="h-full w-full object-cover rounded-full"
                      />
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold text-[#5a4331] group-hover/cat:text-[#c8a165] transition-colors text-center w-20 leading-tight">
                      {cat.name}
                    </span>
                  </Link>
                );
              })}
            </div>

            <button
              onClick={() => scrollElement(categoriesRef, "right", 180)}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white border border-[#e2d8ca] hidden md:flex items-center justify-center shadow-md hover:border-[#c8a165] hover:text-[#c8a165] text-[#5a4331] cursor-pointer transition-all opacity-0 group-hover:opacity-100"
              aria-label="Scroll right categories"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* 3. Main Hero Slider */}
        <section className="bg-gradient-to-b from-[#fdfcfb] to-[#fbf9f6] py-8 sm:py-12 lg:py-16 border-b border-[#ebdcc7] relative overflow-hidden select-none">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Navigation Chevrons */}
            <button
              onClick={() =>
                setHeroIndex((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1))
              }
              className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border border-[#e2d8ca] bg-white text-[#5a4331] hover:text-[#c8a165] hidden md:flex items-center justify-center shadow-sm cursor-pointer hover:border-[#c8a165] hover:scale-105 transition-all z-20"
              aria-label="Previous hero slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              onClick={() => setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border border-[#e2d8ca] bg-white text-[#5a4331] hover:text-[#c8a165] hidden md:flex items-center justify-center shadow-sm cursor-pointer hover:border-[#c8a165] hover:scale-105 transition-all z-20"
              aria-label="Next hero slide"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Slide Content */}
            <div className="relative w-full overflow-hidden rounded-[2rem] border border-[#ebdcc7]/60 shadow-lg bg-[#FAF7F2] lg:bg-transparent lg:border-0 lg:shadow-none">
              {/* Mobile/Tablet Banner layout (hidden on desktop lg) */}
              <div className="lg:hidden relative w-full aspect-[16/10] sm:aspect-[21/9] overflow-hidden flex items-center">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={heroIndex}
                    src={HERO_SLIDES[heroIndex].img}
                    alt=""
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </AnimatePresence>
                {/* Dark overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-transparent z-[5]" />

                <div className="relative z-10 p-6 sm:p-10 text-left text-white max-w-md space-y-3">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={heroIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.4 }}
                      className="space-y-3"
                    >
                      <span className="inline-flex items-center gap-1.5 text-[8px] sm:text-[10px] font-bold tracking-[0.25em] uppercase text-[#c8a165]">
                        ✨ THE ART OF PRESERVATION
                      </span>
                      <h1 className="font-display text-xl sm:text-3xl font-extrabold leading-tight text-white">
                        {HERO_SLIDES[heroIndex].title}
                      </h1>
                      <p className="text-[10px] sm:text-xs text-white/80 max-w-xs line-clamp-2 leading-relaxed">
                        {HERO_SLIDES[heroIndex].subtitle}
                      </p>
                      <div className="flex gap-2.5 pt-1">
                        <Link
                          to="/shop"
                          className="px-5 py-2 rounded-full bg-[#c8a165] text-white hover:bg-[#c8a165]/90 text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          Shop Now
                        </Link>
                        <Link
                          to="/collections"
                          className="px-5 py-2 rounded-full border border-white/80 text-white hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          Explore
                        </Link>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Desktop Split Layout (hidden on mobile/tablet) */}
              <div className="hidden lg:grid lg:grid-cols-12 gap-12 items-center min-h-[400px]">
                {/* Left text column */}
                <div className="lg:col-span-6 text-left z-10 min-h-[320px] flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={heroIndex}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.4 }}
                      className="space-y-6 sm:space-y-8"
                    >
                      <div>
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.2em] uppercase text-[#c8a165] mb-4">
                          <Sparkle className="h-4 w-4 text-[#c8a165] fill-current animate-pulse" />
                          THE ART OF PRESERVATION
                        </span>
                        <h1 className="font-display text-5xl lg:text-6xl font-extrabold text-[#3d2712] leading-[1.15] tracking-tight">
                          {HERO_SLIDES[heroIndex].title}
                        </h1>
                      </div>
                      <p className="text-base text-[#5c4a3b] max-w-lg leading-relaxed">
                        {HERO_SLIDES[heroIndex].subtitle}
                      </p>
                      <div className="flex gap-4 pt-2">
                        <Link
                          to="/shop"
                          className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-[#3d2712] hover:bg-[#2c1a0c] text-white text-xs font-bold uppercase tracking-wider shadow-md hover:scale-[1.02] transition-all"
                        >
                          Shop Now
                        </Link>
                        <Link
                          to="/collections"
                          className="inline-flex items-center justify-center px-8 py-3.5 rounded-full border border-[#3d2712] text-[#3d2712] bg-transparent hover:bg-[#3d2712]/5 text-xs font-bold uppercase tracking-wider transition-all"
                        >
                          Explore Collections
                        </Link>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Right image column */}
                <div className="lg:col-span-6 flex justify-center relative">
                  <div className="relative w-96 h-96 rounded-full overflow-hidden border-[12px] border-[#FAF7F2] shadow-2xl flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={heroIndex}
                        src={HERO_SLIDES[heroIndex].img}
                        alt="Timeless Resin Art Masterpiece"
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </AnimatePresence>
                    <div className="absolute inset-0 border border-[#c8a165]/35 rounded-full pointer-events-none" />
                  </div>
                  <div className="absolute top-1/4 -right-2 bg-white/90 backdrop-blur-md border border-[#ebdcc7] shadow-lg rounded-2xl p-3 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-[#FAF7F2] text-[#c8a165] flex items-center justify-center">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#c8a165] uppercase tracking-wider">
                        Premium Quality
                      </p>
                      <p className="text-xs font-extrabold text-[#3d2712]">Museum-Grade Finish</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Slider Indicator Dots */}
            <div className="flex justify-center items-center gap-2.5 mt-8 relative z-20">
              {HERO_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setHeroIndex(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    heroIndex === idx
                      ? "w-6 bg-[#c8a165]"
                      : "w-2.5 bg-[#ebdcc7] hover:bg-[#c8a165]/60"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 4. Key Trust Stats Highlights row below hero */}
        <section className="bg-white border-b border-[#e2d8ca] py-6 shadow-sm select-none">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 justify-center items-center text-[#5a4331]">
              {[
                { title: "Handmade", desc: "Unique & Creative", emoji: "✨" },
                { title: "Premium Quality", desc: "Best materials used", emoji: "💎" },
                { title: "Customizable", desc: "Made as you want", emoji: "🎨" },
                { title: "Made in India", desc: "Proudly local", emoji: "🇮🇳" },
                { title: "Secure Packaging", desc: "Safe delivery", emoji: "📦" },
                { title: "Loved by 10K+", desc: "Happy customers", emoji: "❤️" },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-1 py-2 md:border-r border-[#ebdcc7]/60 last:border-0 justify-start sm:justify-center w-full max-w-[165px] sm:max-w-none mx-auto"
                >
                  <span className="text-xl shrink-0">{stat.emoji}</span>
                  <div className="text-left leading-tight">
                    <h4 className="text-[11px] font-extrabold text-[#3d2712] uppercase tracking-wide">
                      {stat.title}
                    </h4>
                    <p className="text-[9px] text-[#8c7a6b] font-medium">{stat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Preservation Showcase Block */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-20 border-b border-[#ebdcc7]">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column Info */}
            <div className="lg:col-span-5 space-y-6 text-center lg:text-left flex flex-col items-center lg:items-start">
              <span className="inline-block bg-[#c8a165]/10 text-[#c8a165] text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-[#c8a165]/35">
                PRESERVATION SHOWCASE
              </span>

              <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-[#3d2712] leading-tight">
                Your Precious Moments, <br />
                <span className="text-[#c8a165] font-serif italic font-medium">Preserved</span>{" "}
                Beautifully.
              </h2>

              {/* Bullet Points with checks */}
              <div className="space-y-4 pt-2 w-full flex flex-col items-center lg:items-start">
                {[
                  "Real Flower & Memory Preservation",
                  "Handcrafted with Love",
                  "Lifetime Keepsake Guarantee",
                ].map((bullet, idx) => (
                  <div key={idx} className="flex items-center gap-3 w-full max-w-xs lg:max-w-none">
                    <div className="h-5 w-5 rounded-full bg-[#c8a165]/10 text-[#c8a165] flex items-center justify-center shrink-0 border border-[#c8a165]/35">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-semibold text-[#5a4331]">{bullet}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <Link
                  to="/preservation"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#3d2712] hover:bg-[#2c1a0c] text-white transition-all text-xs font-bold uppercase tracking-wider shadow-md hover:scale-[1.02]"
                >
                  Start Preservation
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Right Column Arches Showcase */}
            <div className="lg:col-span-7 flex items-center justify-center">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                {[
                  {
                    title: "Wedding Bouquet",
                    img: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=300&auto=format&fit=crop&q=80",
                  },
                  {
                    title: "Baby Memory",
                    img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&auto=format&fit=crop&q=80",
                  },
                  {
                    title: "Pet Memory",
                    img: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&auto=format&fit=crop&q=80",
                  },
                  {
                    title: "Memorial Keepsake",
                    img: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center bg-white border border-[#ebdcc7]/60 rounded-3xl p-3 sm:p-4 shadow-sm hover:shadow-md hover:border-[#c8a165]/50 transition-all duration-300 group/arch"
                  >
                    <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] text-[#c8a165] mb-2 sm:mb-3">
                      Preservation
                    </span>

                    <div className="aspect-[2/3] w-full rounded-t-full border-[3px] border-white ring-1 ring-[#ebdcc7] overflow-hidden bg-[#FAF7F2] shadow-inner group-hover/arch:scale-[1.02] transition-transform duration-300">
                      <img
                        src={item.img}
                        alt={item.title}
                        className="w-full h-full object-cover rounded-t-full"
                      />
                    </div>

                    <div className="text-center leading-tight mt-3 sm:mt-4 space-y-0.5">
                      <h4 className="text-[10px] sm:text-xs font-extrabold text-[#3d2712] uppercase tracking-wider group-hover/arch:text-[#c8a165] transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.15em] text-[#8c7a6b]">
                        Preservation
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>


        {/* 7. Trending Now Section */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16 select-none">
          <div className="bg-[#FAF7F2] border border-[#ebdcc7] rounded-[2rem] p-5 sm:p-8 shadow-sm">
            <div className="flex items-end justify-between mb-6">
              <div className="text-left">
                <span className="text-[10px] font-bold text-[#c8a165] uppercase tracking-widest block mb-1">
                  CUSTOMER FAVORITES
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#3d2712] flex items-center gap-1.5">
                  Trending Now 🔥
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <Link to="/shop" className="text-xs font-bold text-[#c8a165] hover:underline">
                  View All
                </Link>
                <div className="hidden sm:flex gap-1.5">
                  <button
                    onClick={() => scrollElement(trendingRef, "left", 320)}
                    className="h-8 w-8 rounded-full border border-[#e2d8ca] bg-white text-[#5a4331] hover:text-[#c8a165] flex items-center justify-center shadow-sm cursor-pointer hover:border-[#c8a165] transition-all"
                    aria-label="Scroll left trending items"
                  >
                    <ChevronLeft className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={() => scrollElement(trendingRef, "right", 320)}
                    className="h-8 w-8 rounded-full border border-[#e2d8ca] bg-white text-[#5a4331] hover:text-[#c8a165] flex items-center justify-center shadow-sm cursor-pointer hover:border-[#c8a165] transition-all"
                    aria-label="Scroll right trending items"
                  >
                    <ChevronRight className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            </div>

            <div
              ref={trendingRef}
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-none scroll-smooth px-1"
            >
              {TRENDING_PRODUCTS.map((product) => {
                const isWish = wishlist.includes(product.id);
                return (
                  <div
                    key={product.id}
                    className="min-w-[220px] sm:min-w-[280px] max-w-[220px] sm:max-w-[280px] bg-white border border-[#e8dfd2] rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between shrink-0 relative text-left"
                  >
                    {/* Entire card click target (excluding interactive items) */}
                    <Link
                      to="/shop"
                      className="absolute inset-0 z-0 rounded-3xl"
                      aria-label={`View details of ${product.title}`}
                    />

                    <div className="relative z-10 pointer-events-none w-full h-full flex flex-col justify-between flex-1">
                      <div>
                        {/* Image with Tag */}
                        <div className="aspect-square w-full relative bg-muted overflow-hidden rounded-t-3xl">
                          <img
                            src={product.img}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                          />

                          {/* Floating tag if any */}
                          {product.tag && (
                            <span className="absolute top-4 left-4 bg-[#FAF7F2] border border-[#ebdcc7] text-[#3d2712] text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                              {product.tag}
                            </span>
                          )}
                        </div>

                        <div className="p-4 sm:p-5 space-y-1 sm:space-y-1.5">
                          {/* Rating Badge */}
                          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                            <span className="bg-amber-500 text-white font-extrabold text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm shrink-0">
                              {product.rating}
                              <Star className="h-2.5 w-2.5 fill-current text-white inline" />
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-[#8c7a6b] font-semibold">
                              ({product.reviews} reviews)
                            </span>
                          </div>

                          <h3 className="font-display text-sm sm:text-base font-bold text-[#3d2712] line-clamp-1">
                            {product.title}
                          </h3>

                          {/* Price with Discount */}
                          <div className="flex flex-wrap items-baseline gap-1 sm:gap-1.5 pt-1">
                            <span className="text-[#3d2712] font-extrabold text-sm sm:text-base">
                              {product.price}
                            </span>
                            <span className="text-[10px] sm:text-xs text-[#8c7a6b] line-through">
                              {product.originalPrice}
                            </span>
                            <span className="text-[8px] sm:text-[9px] font-bold text-green-600 bg-green-50 px-1.5 sm:px-2 py-0.5 rounded-full">
                              {product.discount}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Wishlist toggle - positioned above card overlay */}
                    <button
                      onClick={(e) => handleWishlistToggle(product.id, e)}
                      className={`absolute top-4 right-4 z-20 p-2 rounded-full border transition-all duration-300 hover:scale-105 cursor-pointer shadow-sm ${
                        isWish
                          ? "bg-rose-50 border-rose-100 text-rose-500"
                          : "bg-white/80 backdrop-blur-sm border-[#e2d8ca] text-[#5a4331] hover:text-rose-500"
                      }`}
                      aria-label="Toggle wishlist"
                    >
                      <Heart className={`h-4 w-4 ${isWish ? "fill-current" : ""}`} />
                    </button>

                    {/* View Details Button - desktop only */}
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 relative z-20 hidden sm:block">
                      <Link
                        to="/shop"
                        className="w-full py-1.5 sm:py-2 rounded-full border border-[#3d2712] text-[#3d2712] hover:bg-[#3d2712] hover:text-white text-[10px] sm:text-xs font-bold text-center block uppercase tracking-wider transition-all"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 8. Bestsellers Section */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16 border-b border-[#ebdcc7] relative group select-none">
          <div className="flex items-end justify-between mb-8">
            <div className="text-left">
              <h2 className="font-display text-3xl font-extrabold text-[#3d2712] flex items-center gap-1.5">
                Bestsellers 🏆
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/shop" className="text-xs font-bold text-[#c8a165] hover:underline">
                View All
              </Link>
              <div className="hidden sm:flex gap-1.5">
                <button
                  onClick={() => scrollElement(bestsellersRef, "left", 320)}
                  className="h-8 w-8 rounded-full border border-[#e2d8ca] bg-white text-[#5a4331] hover:text-[#c8a165] flex items-center justify-center shadow-sm cursor-pointer hover:border-[#c8a165] transition-all"
                  aria-label="Scroll left bestsellers"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => scrollElement(bestsellersRef, "right", 320)}
                  className="h-8 w-8 rounded-full border border-[#e2d8ca] bg-white text-[#5a4331] hover:text-[#c8a165] flex items-center justify-center shadow-sm cursor-pointer hover:border-[#c8a165] transition-all"
                  aria-label="Scroll right bestsellers"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          </div>

          <div
            ref={bestsellersRef}
            className="flex gap-4 overflow-x-auto pb-6 scrollbar-none scroll-smooth px-1"
          >
            {BESTSELLER_PRODUCTS.map((product) => {
              const isWish = wishlist.includes(product.id);
              return (
                <div
                  key={product.id}
                  className="min-w-[220px] sm:min-w-[280px] max-w-[220px] sm:max-w-[280px] bg-white border border-[#e8dfd2] rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between shrink-0 relative text-left"
                >
                  {/* Entire card click target (excluding interactive items) */}
                  <Link
                    to="/shop"
                    className="absolute inset-0 z-0 rounded-3xl"
                    aria-label={`View details of ${product.title}`}
                  />

                  <div className="relative z-10 pointer-events-none w-full h-full flex flex-col justify-between flex-1">
                    <div>
                      {/* Image with Tag */}
                      <div className="aspect-square w-full relative bg-muted overflow-hidden rounded-t-3xl">
                        <img
                          src={product.img}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                        />

                        {/* Floating tag if any */}
                        {product.tag && (
                          <span className="absolute top-4 left-4 bg-[#FAF7F2] border border-[#ebdcc7] text-[#3d2712] text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                            {product.tag}
                          </span>
                        )}
                      </div>

                      <div className="p-4 sm:p-5 space-y-1 sm:space-y-1.5">
                        {/* Rating Badge */}
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                          <span className="bg-amber-500 text-white font-extrabold text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm shrink-0">
                            {product.rating}
                            <Star className="h-2.5 w-2.5 fill-current text-white inline" />
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-[#8c7a6b] font-semibold">
                            ({product.reviews} reviews)
                          </span>
                        </div>

                        <h3 className="font-display text-sm sm:text-base font-bold text-[#3d2712] line-clamp-1">
                          {product.title}
                        </h3>

                        {/* Price with Discount */}
                        <div className="flex flex-wrap items-baseline gap-1 sm:gap-1.5 pt-1">
                          <span className="text-[#3d2712] font-extrabold text-sm sm:text-base">
                            {product.price}
                          </span>
                          <span className="text-[10px] sm:text-xs text-[#8c7a6b] line-through">
                            {product.originalPrice}
                          </span>
                          <span className="text-[8px] sm:text-[9px] font-bold text-green-600 bg-green-50 px-1.5 sm:px-2 py-0.5 rounded-full">
                            {product.discount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Wishlist toggle - positioned above card overlay */}
                  <button
                    onClick={(e) => handleWishlistToggle(product.id, e)}
                    className={`absolute top-4 right-4 z-20 p-2 rounded-full border transition-all duration-300 hover:scale-105 cursor-pointer shadow-sm ${
                      isWish
                        ? "bg-rose-50 border-rose-100 text-rose-500"
                        : "bg-white/80 backdrop-blur-sm border-[#e2d8ca] text-[#5a4331] hover:text-rose-500"
                    }`}
                    aria-label="Toggle wishlist"
                  >
                    <Heart className={`h-4 w-4 ${isWish ? "fill-current" : ""}`} />
                  </button>

                  {/* View Details Button - desktop only */}
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 relative z-20 hidden sm:block">
                    <Link
                      to="/shop"
                      className="w-full py-1.5 sm:py-2 rounded-full border border-[#3d2712] text-[#3d2712] hover:bg-[#3d2712] hover:text-white text-[10px] sm:text-xs font-bold text-center block uppercase tracking-wider transition-all"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 9. Shop By Occasion Section */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-20 border-b border-[#ebdcc7] text-center select-none">
          <div className="max-w-xl mx-auto mb-10 lg:mb-16 text-center">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#3d2712] relative inline-block">
              Shop By Occasion
              <span className="absolute -bottom-2 left-1/4 right-1/4 h-0.5 bg-[#c8a165]/35 rounded-full" />
            </h2>
            <p className="text-xs text-[#8c7a6b] font-bold tracking-wider uppercase mt-4">
              Handcrafted gifts for every special moment
            </p>
          </div>

          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-8 justify-center">
            {OCCASIONS.map((occ, idx) => (
              <Link
                key={idx}
                to="/shop"
                className="flex flex-col items-center space-y-2 sm:space-y-3 group/occ cursor-pointer"
              >
                <div className="h-20 w-20 sm:h-32 sm:w-32 rounded-full border border-[#ebdcc7] overflow-hidden bg-[#FAF7F2] p-1 sm:p-1.5 shadow-sm group-hover/occ:border-[#c8a165] group-hover/occ:scale-105 group-hover/occ:shadow-md transition-all duration-300">
                  <img
                    src={occ.img}
                    alt={occ.name}
                    className="h-full w-full object-cover rounded-full"
                  />
                </div>
                <span className="text-[10px] sm:text-sm font-bold text-[#3d2712] group-hover/occ:text-[#c8a165] transition-colors leading-tight text-center">
                  {occ.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 10. Create Your Own Custom Resin Art step banner */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-[#FAF7F2] border border-[#e8dfd2] rounded-[2.5rem] p-8 sm:p-12 md:p-16 flex flex-col md:flex-row justify-between items-center gap-12 shadow-sm text-left relative overflow-hidden">
            {/* Background design */}
            <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-[#ebdcc7]/10 to-transparent pointer-events-none" />

            <div className="space-y-6 max-w-2xl relative z-10">
              <div>
                <h3 className="font-display text-3xl sm:text-4xl font-extrabold text-[#3d2712] leading-tight">
                  Create Your Own <br />
                  Custom Resin Art
                </h3>
                <p className="text-xs font-bold text-[#8c7a6b] tracking-wider uppercase mt-2">
                  Personalize your memories in a unique way.
                </p>
              </div>

              {/* Steps grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                {[
                  { step: "Upload Image", sub: "or share your idea", num: "1", emoji: "📤" },
                  { step: "Choose Style", sub: "& preferences", num: "2", emoji: "🎨" },
                  { step: "Select Colors", sub: "& details", num: "3", emoji: "🖌️" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-[#3d2712] text-white flex items-center justify-center shrink-0 font-mono text-xs font-extrabold shadow-sm border border-[#ebdcc7]">
                      {item.num}
                    </div>
                    <div className="leading-tight">
                      <p className="text-xs font-extrabold text-[#3d2712]">{item.step}</p>
                      <p className="text-[10px] text-[#8c7a6b] font-medium mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 shrink-0 text-center md:text-right w-full md:w-auto">
              <Link
                to="/custom-order"
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-[#3d2712] hover:bg-[#2c1a0c] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:scale-[1.02]"
              >
                Start Custom Design
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* 11. Trust Ribbon 2 */}
        <section className="bg-white border-t border-b border-[#e2d8ca] py-10 shadow-sm select-none">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-8 text-center text-xs">
              {[
                { title: "10,000+", desc: "Happy Customers", icon: Smile },
                { title: "4.8/5 Rating", desc: "Average Rating", icon: Star },
                { title: "100% Secure", desc: "Secure Payments", icon: Lock },
                { title: "Easy Returns", desc: "7 Days Return Policy", icon: Undo },
                { title: "Worldwide", desc: "Worldwide Shipping", icon: Globe },
                { title: "24/7 Support", desc: "We're here to help", icon: HelpCircle },
              ].map((badge, idx) => {
                const Icon = badge.icon;
                return (
                  <div key={idx} className="flex flex-col items-center space-y-2 group">
                    <div className="h-10 w-10 rounded-full bg-[#FAF7F2] border border-[#ebdcc7] text-[#c8a165] flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:border-[#c8a165] transition-all">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="leading-tight">
                      <h4 className="font-extrabold text-[#3d2712]">{badge.title}</h4>
                      <p className="text-[10px] text-[#8c7a6b] font-medium mt-0.5">{badge.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 12. From Our Customers Section */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-20 relative group select-none">
          <div className="flex items-end justify-between mb-8">
            <div className="text-left">
              <h2 className="font-display text-3xl font-extrabold text-[#3d2712] flex items-center gap-2">
                From Our Customers <span className="text-red-500 text-2xl">❤️</span>
              </h2>
              <p className="text-xs text-[#8c7a6b] font-bold tracking-wider uppercase mt-1">
                Real memories. Real stories.
              </p>
            </div>

            <div className="hidden sm:flex gap-1.5">
              <button
                onClick={() => scrollElement(reviewsRef, "left", 340)}
                className="h-8 w-8 rounded-full border border-[#e2d8ca] bg-white text-[#5a4331] hover:text-[#c8a165] flex items-center justify-center shadow-sm cursor-pointer hover:border-[#c8a165] transition-all"
                aria-label="Scroll left reviews"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={() => scrollElement(reviewsRef, "right", 340)}
                className="h-8 w-8 rounded-full border border-[#e2d8ca] bg-white text-[#5a4331] hover:text-[#c8a165] flex items-center justify-center shadow-sm cursor-pointer hover:border-[#c8a165] transition-all"
                aria-label="Scroll right reviews"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          <div
            ref={reviewsRef}
            className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 scrollbar-none scroll-smooth px-1"
          >
            {CUSTOMER_REVIEWS.map((review) => (
              <div
                key={review.id}
                className="min-w-[260px] sm:min-w-[340px] max-w-[260px] sm:max-w-[340px] bg-white border border-[#e8dfd2] rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-[#c8a165]/40 transition-all shrink-0 flex flex-col justify-between text-left space-y-4 group"
              >
                {/* User Header Info */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#FAF7F2] border border-[#ebdcc7] text-[#c8a165] flex items-center justify-center font-bold text-sm uppercase shrink-0">
                    {review.name[0]}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-[#3d2712]">
                      {review.name}
                    </h4>
                    <span className="inline-flex items-center gap-0.5 text-[8px] sm:text-[9px] text-emerald-600 dark:text-emerald-500 font-extrabold uppercase tracking-wide mt-0.5">
                      ✓ Verified Buyer
                    </span>
                  </div>
                </div>

                {/* Rating & Occasion */}
                <div className="flex items-center justify-between pt-1 border-t border-[#ebdcc7]/40">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-current text-amber-500"
                      />
                    ))}
                  </div>
                  <span className="text-[9px] font-bold text-[#c8a165] uppercase tracking-wider">
                    {review.review}
                  </span>
                </div>

                {/* Quote Text */}
                <p className="text-xs text-[#5c4a3b] leading-relaxed italic flex-1">
                  "{review.desc}"
                </p>

                {/* Delivered Product Photo Preview */}
                <div className="relative rounded-2xl overflow-hidden border border-[#ebdcc7]/60 aspect-[16/10] bg-[#FAF7F2] shadow-sm">
                  <img
                    src={review.img}
                    alt="Delivered Resin Art Piece"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-103"
                  />
                  <div className="absolute inset-0 bg-black/5 pointer-events-none" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* SiteFooter */}
      <SiteFooter />
    </div>
  );
}
