import { Link, useNavigate } from "@tanstack/react-router";
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
import { SEO } from "@/components/SEO";

// Category Bubble Navigation items
const BUBBLE_CATEGORIES = [
  {
    name: "Resin Clocks",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFJryEb-6AwvJJ-AEA5ZItzIKy902xlHgNkBrK0Ew8Tw&s=10",
  },
  {
    name: "Resin Trays",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRDY48oEKluIE_7UXol47J2Ve-HjfTvJj085VYmkXNhbA&s=10",
  },
  {
    name: "Resin Coasters",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT1ZmOxpnCcuOQixSSZNhUFItgX-HzkXp3JB_cS6nsEug&s=10",
  },
  {
    name: "Resin Jewelry",
    img: "https://5.imimg.com/data5/SELLER/Default/2025/11/556885395/IO/VT/CM/181387700/whatsapp-image-2025-10-28-at-13-08-50-1aca1eea-500x500.jpg",
  },
  {
    name: "Car Hanging",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRGhNY2-eQuGJWnM0oEFsCrD0-EBzH04FYkLSF_slzycw&s=10",
  },
  {
    name: "Resin Keychains",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTPQ9KwgQFamQFPj3HuJFBo81RqXEnyEX7Bw0PlX7q1kw&s=10",
  },
  {
    name: "Baby Casting",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT42YMXU7TgYkh3Dk9Tr__3I67lBBkKZk9F5waGZ8aPgQ&s=10",
  },
  {
    name: "Preservation",
    img: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Candle Art",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTuKzdAyBzdbEYoUZd_KyIzc1U_n66sTgsU3xUj6pvcxA&s=10",
  },
  {
    name: "Resin Tables",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRlglXDWNCyxCUI6csD5hyhmUuJQY-UlpZQStwCDcKmaA&s",
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

// Helper to render customized inline SVG icons for each occasion badge
const getOccasionIcon = (iconName: string) => {
  switch (iconName) {
    case "birthday":
      return (
        <svg className="w-3.5 h-3.5 xs:w-4.5 xs:h-4.5 sm:w-6 sm:h-6 text-[#c8a165]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5v3M12 4v4M15 5v3" />
          <rect x="6" y="8" width="12" height="5" rx="1" />
          <rect x="4" y="13" width="16" height="7" rx="1.5" />
          <path d="M6 13c1.5 1 2.5-1 4 0s2.5-1 4 0 2.5-1 4 0 2.5-1 4 0" />
        </svg>
      );
    case "anniversary":
      return (
        <svg className="w-3.5 h-3.5 xs:w-4.5 xs:h-4.5 sm:w-6 sm:h-6 text-[#c8a165]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A4.5 4.5 0 0 0 17.5 4c-1.74 0-3.41.81-4.5 2.09C11.91 4.81 10.24 4 8.5 4A4.5 4.5 0 0 0 4 8.5c0 2.3 1.5 4 3 5.5l5 5 7-7z" />
          <path d="M12 9.5c.7-.8 1.4-1.5 2.5-1.5a2.5 2.5 0 0 1 2.5 2.5c0 1.2-1 2.2-2 3L12 16.5l-3-3c-1-.8-2-1.8-2-3a2.5 2.5 0 0 1 2.5-2.5c1.1 0 1.8.7 2.5 1.5z" />
        </svg>
      );
    case "wedding":
      return (
        <svg className="w-3.5 h-3.5 xs:w-4.5 xs:h-4.5 sm:w-6 sm:h-6 text-[#c8a165]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8.5" cy="13" r="4" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="15.5" cy="13" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8.5 9 L10.5 7 L8.5 5 L6.5 7 Z" fill="currentColor" />
        </svg>
      );
    case "valentines":
      return (
        <svg className="w-3.5 h-3.5 xs:w-4.5 xs:h-4.5 sm:w-6 sm:h-6 text-[#c8a165]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A4.5 4.5 0 0 0 17.5 4c-1.74 0-3.41.81-4.5 2.09C11.91 4.81 10.24 4 8.5 4A4.5 4.5 0 0 0 4 8.5c0 2.3 1.5 4 3 5.5l5 5 7-7z" />
        </svg>
      );
    case "christmas":
      return (
        <svg className="w-3.5 h-3.5 xs:w-4.5 xs:h-4.5 sm:w-6 sm:h-6 text-[#c8a165]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l-7 10h14Z" />
          <path d="M12 7l-9 11h18Z" />
          <path d="M12 18v3" strokeWidth="2" />
        </svg>
      );
    case "corporate":
      return (
        <svg className="w-3.5 h-3.5 xs:w-4.5 xs:h-4.5 sm:w-6 sm:h-6 text-[#c8a165]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    default:
      return null;
  }
};

// Occasions list
const OCCASIONS = [
  {
    name: "Birthday Collection",
    description: "Celebrate birthdays with unique and memorable gifts.",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2emLlPQLT_bUEks55GSCD9dh4HrStosMf9_r0eF-_5w&s=10",
    icon: "birthday",
  },
  {
    name: "Anniversary Collection",
    description: "Express your love with timeless gifts that last forever.",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSs9KRkOqXlGM_M23vHGqnXx7ZQG6tq4epcRaH4k0igSw&s=10",
    icon: "anniversary",
  },
  {
    name: "Wedding Collection",
    description: "Elegant wedding gifts crafted to celebrate love and new beginnings.",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqWOaQjXRa4a_M-HOWAaGy9pLOmakzTu4jK2TGL4HrMw&s=10",
    icon: "wedding",
  },
  {
    name: "Valentine's Day Collection",
    description: "Surprise someone special with romantic gifts they'll treasure forever.",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSasP9dt3kKxY3r3FDJxBNzuzjRF6nbTD4qs0t0k1fs5w&s=10",
    icon: "valentines",
  },
  {
    name: "Festivel Collection",
    description: "Celebrate the festive season with warm, meaningful, and premium gifts",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZjr0Zn8zRSRgra6CzvX43sd-GkUC7uA-Vx4v5fD-Bpw&s=10",
    icon: "christmas",
  },
  {
    name: "Corporate Gifts",
    description: "Impress clients and employees with elegant premium corporate gifts.",
    img: "https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=600&auto=format&fit=crop&q=80",
    icon: "corporate",
  },
];

// Hero Slides
import banner1 from "@/assets/BANNER1.png";
import banner2 from "@/assets/BANNER2.png";
import banner3 from "@/assets/BANNER3.png";
const HERO_SLIDES = [
  {
    title: "Preserve Memories Forever in Resin",
    subtitle:
      "Handcrafted resin art that transforms flowers, memories, and special moments into timeless keepsakes.",
    img: banner1,
    btn1: "Preserve My Bouquet",
    btn2: "Shop Collection",
    btn1Link: "/preservation",
    btn2Link: "/shop"
  },
  {
    title: "Create Your Own Masterpiece 🌸",
    subtitle:
      "Personalize every detail with custom resin creations designed to match your style, memories, and special moments.",
    img: banner2,
    btn1: "Custom Creations",
    btn2: "Shop Now",
    btn1Link: "/custom-order",
    btn2Link: "/shop"
  },
  {
    title: "The Art Of Timeless Crafts",
    subtitle:
      "Discover high-end resin clocks, customized dining trays, and gold foil coasters handcrafted by top artisans.",
    img: banner3,
    btn1: "Shop Now",
    btn1Link: "/shop"
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
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQP_yl5YoozOmbzfwMXuhLQizgLIc07cf6ZZlx2Ic8Nuw&s=10",
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
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRRez5yaa9UaSyz71mwL7UaF6u7yrhs8n730IAxVgoy4g&s=10",
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
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSD3F5xloZHRv8ioo5omi_tgS14-GrJfnj0Y-GAbWQKnw&s=10",
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
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMDYtQ9ezDhqoFcBp0hQCkuiQVkRFJJp7l7Hqq_rlpxg&s=10",
  },
  {
    id: "t5",
    title: "Car hanging",
    rating: 4.9,
    reviews: 105,
    price: "₹299",
    originalPrice: "₹499",
    discount: "34% OFF",
    tag: "New",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRmCg-WKeQo9sHLjUgSDqwLN-v-Qg_42BUGexAWY8fbJw&s=10",
  },
  {
    id: "t6",
    title: "Resin Earrings",
    rating: 4.7,
    reviews: 71,
    price: "₹499",
    originalPrice: "₹899",
    discount: "40% OFF",
    tag: "",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSMIgc50PUBt_O5UVP6TN5mRbobqcaPw_devaDuPVDYTA&s=10",
  },
];

// Product Data - Bestsellers
const BESTSELLER_PRODUCTS = [
  {
    id: "b1",
    title: "resin trays",
    rating: 4.9,
    reviews: 120,
    price: "₹2,299",
    originalPrice: "₹3,000",
    discount: "23% OFF",
    tag: "Bestseller",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNsxr2qp60g9lrrsDDhW_WwX2yIU8ygmt3d9ZHN_iiDw&s=10",
  },
  {
    id: "b2",
    title: "Candle art",
    rating: 4.7,
    reviews: 87,
    price: "₹1,099",
    originalPrice: "₹1,599",
    discount: "31% OFF",
    tag: "Trending",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRRiC_-XuVzL4FmUHBz5GX3eCGuN7AoMC2RSLCOXkmUSA&s=10",
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
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTXdkrQ2aiJfSrFj9GwIMY0VYelewpCso00MI4VM1yXMg&s=10",
  },
  {
    id: "b4",
    title: "wedding gift",
    rating: 4.7,
    reviews: 85,
    price: "₹1,199",
    originalPrice: "₹1,699",
    discount: "30% OFF",
    tag: "Trending",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfmwMySSwIY2p-zRTsh23fOoO6oIohHy-EVVuoqVMp4Q&s=10",
  },
  {
    id: "b5",
    title: "Coaster set",
    rating: 4.8,
    reviews: 104,
    price: "₹2649",
    originalPrice: "₹3899",
    discount: "28% OFF",
    tag: "Bestseller",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSYUq7ek2xuNO_T5P69Sgrbjc0QOilRN42ZBvG2gkO7Kw&s=10",
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
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgTMZeBTmlNlXLU797DJRiL3roSQCT8StR-FjaufrfcA&s=10",
  },
];

// Customer Reviews
const CUSTOMER_REVIEWS = [
  {
    id: "r1",
    name: "Srishti & Aarav",
    review: "Wedding Bouquet Preservation",
    desc: "The flower preservation was absolutely breathtaking. Every single petal was frozen perfectly in crystal clear resin. A lifetime keepsake!",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRm00aZkySB6ekjn_mRHKSaAdCO4hTRjkK7vVMMSRbPug&s=10",
  },
  {
    id: "r2",
    name: "Nisha & Kabir",
    review: "Pet Memory Preservation",
    desc: "A beautiful way to remember our beloved golden retriever. The details, the clarity, the custom setup — everything was handled with so much love.",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTPAa_wUnwbaFH32vYWoUJFY_I13-iQSmR81CourVa43g&s=10",
  },
  {
    id: "r3",
    name: "Priya & Reyance",
    review: "Memorial Keepsake",
    desc: "Words can't describe how beautiful our memorial frame turned out. It stands in our living room, capturing all the light. Highly recommend ViaCraft.",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRuAM_0mrggcHyWZLasOoasSgwcS21qmYBMfFKv5YgMFA&s=10",
  },
  {
    id: "r4",
    name: "Niyati & Rohit",
    review: "Memory Preservation",
    desc: "Preserving our baby's hospital card and first shoes was the best decision. Beautifully laid out and crafted with museum-grade quality resin.",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSXCjDL5QgyzX4N8FufuMWztYg-CTmxr8QgJlUIo7-jEQ&s=10",
  },
];

export function Index() {
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

  // Hero Slider Autoslide (resets timer on manual slide change)
  useEffect(() => {
    const sliderInterval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(sliderInterval);
  }, [heroIndex]);

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

  const homepageSchemas = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": "https://viacraft.com/#organization",
      "name": "ViaCraft",
      "url": "https://viacraft.com",
      "logo": "https://viacraft.com/logo.png",
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "support@viacraft.in",
        "telephone": "+91-9876543210",
        "contactType": "customer service"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": "https://viacraft.com/#website",
      "name": "ViaCraft",
      "url": "https://viacraft.com",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://viacraft.com/shop?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": "https://viacraft.com/#localbusiness",
      "name": "ViaCraft",
      "image": "https://viacraft.com/logo.png",
      "url": "https://viacraft.com",
      "telephone": "+919876543210",
      "email": "support@viacraft.in",
      "priceRange": "₹299-₹25000",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "4th Floor, Sector 62",
        "addressLocality": "Noida",
        "addressRegion": "Uttar Pradesh",
        "postalCode": "201301",
        "addressCountry": "IN"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 28.6273,
        "longitude": 77.3725
      },
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "opens": "10:00",
        "closes": "19:00"
      }
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      <SEO
        title="ViaCraft — Buy Handcrafted Resin Art & Flower Preservation"
        description="Preserve wedding flower bouquets, memorial roses, and baby booties in crystal clear resin. Shop custom resin clocks, trays, coasters, and jewelry handcrafted by top certified Indian artisans."
        keywords={["resin art", "flower preservation", "bouquet preservation", "resin clocks", "resin trays", "resin jewelry", "wedding flower preservation", "custom resin", "handcraft India"]}
        schemaMarkup={homepageSchemas}
      />
      {/* 1. Header Navigation */}
      <SiteHeader />

      <main className="flex-1 pb-16">
        {/* 2. Category Bubble Navigation (Circular Icons Slider) */}
        <section className="bg-card border-b border-border/50 py-4 sm:py-6 relative group select-none">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 relative">
            <button
              onClick={() => scrollElement(categoriesRef, "left", 180)}
              className="absolute left-1 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card border border-border/60 hidden md:flex items-center justify-center shadow-md hover:border-accent hover:text-accent text-foreground/80 cursor-pointer transition-all opacity-0 group-hover:opacity-100 animate-in fade-in"
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
                    className="flex flex-col items-center shrink-0 space-y-2 group/cat cursor-pointer animate-in fade-in duration-300"
                  >
                    <div className="h-12 w-12 xs:h-14 xs:w-14 sm:h-20 sm:w-20 rounded-full border border-border/60 overflow-hidden p-0.5 bg-background transition-all group-hover/cat:border-accent group-hover/cat:scale-105 group-hover/cat:shadow-md">
                      <img
                        src={cat.img}
                        alt={cat.name}
                        className="h-full w-full object-cover rounded-full"
                      />
                    </div>
                    <span className="text-[9px] xs:text-[10px] sm:text-xs font-semibold text-foreground/80 group-hover/cat:text-accent transition-colors text-center w-14 xs:w-20 leading-tight">
                      {cat.name}
                    </span>
                  </Link>
                );
              })}
            </div>

            <button
              onClick={() => scrollElement(categoriesRef, "right", 180)}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card border border-border/60 hidden md:flex items-center justify-center shadow-md hover:border-accent hover:text-accent text-foreground/80 cursor-pointer transition-all opacity-0 group-hover:opacity-100 animate-in fade-in"
              aria-label="Scroll right categories"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* 3. Main Hero Slider */}
        <section className="bg-gradient-to-b from-background to-muted/20 py-8 sm:py-12 lg:py-16 border-b border-border/50 relative overflow-hidden select-none">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Navigation Chevrons */}
            <button
              onClick={() =>
                setHeroIndex((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1))
              }
              className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border border-border/60 bg-card text-foreground hover:text-accent hidden md:flex items-center justify-center shadow-sm cursor-pointer hover:border-accent hover:scale-105 transition-all z-20"
              aria-label="Previous hero slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              onClick={() => setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border border-border/60 bg-card text-foreground hover:text-accent hidden md:flex items-center justify-center shadow-sm cursor-pointer hover:border-accent hover:scale-105 transition-all z-20"
              aria-label="Next hero slide"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Slide Content */}
            <div className="relative w-full overflow-hidden rounded-[2rem] border border-border/60 shadow-luxe bg-card lg:bg-transparent lg:border-0 lg:shadow-none">
              {/* Mobile/Tablet Banner layout (hidden on desktop lg) */}
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(event, info) => {
                  const swipeThreshold = 50; // minimum drag distance in pixels to swipe
                  if (info.offset.x < -swipeThreshold) {
                    // Swiped left -> next slide
                    setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length);
                  } else if (info.offset.x > swipeThreshold) {
                    // Swiped right -> previous slide
                    setHeroIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
                  }
                }}
                className="lg:hidden relative w-full aspect-[16/10] sm:aspect-[21/9] overflow-hidden flex items-center cursor-grab active:cursor-grabbing select-none"
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={heroIndex}
                    src={HERO_SLIDES[heroIndex].img}
                    alt=""
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  />
                </AnimatePresence>
                {/* Dark overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-transparent z-[5]" />

                <div className="relative z-10 p-6 sm:p-10 text-left text-white max-w-xs sm:max-w-md space-y-3 pointer-events-auto">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={heroIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.4 }}
                      className="space-y-3"
                    >
                      <span className="inline-flex items-center gap-1.5 text-[9px] xs:text-[10px] sm:text-[10px] font-bold tracking-[0.25em] uppercase text-accent">
                        ✨ THE ART OF PRESERVATION
                      </span>
                      <h1 className="font-display text-lg xs:text-2xl sm:text-3xl font-extrabold leading-tight text-white">
                        {HERO_SLIDES[heroIndex].title}
                      </h1>
                      <p className="text-[11px] xs:text-xs sm:text-xs text-white/80 max-w-xs leading-relaxed">
                        {HERO_SLIDES[heroIndex].subtitle}
                      </p>
                      <div className="flex gap-2.5 pt-1">
                        <Link
                          to={HERO_SLIDES[heroIndex].btn1Link || "/shop"}
                          className="px-5 py-2.5 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          {HERO_SLIDES[heroIndex].btn1 || "Shop Now"}
                        </Link>
                        {HERO_SLIDES[heroIndex].btn2 && (
                          <Link
                            to={HERO_SLIDES[heroIndex].btn2Link || "/collections"}
                            className="px-5 py-2.5 rounded-full border border-white/80 text-white hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider transition-all"
                          >
                            {HERO_SLIDES[heroIndex].btn2}
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>

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
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.2em] uppercase text-accent mb-4">
                          <Sparkle className="h-4 w-4 text-accent fill-current animate-pulse" />
                          THE ART OF PRESERVATION
                        </span>
                        <h1 className="font-display text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.15] tracking-tight">
                          {HERO_SLIDES[heroIndex].title}
                        </h1>
                      </div>
                      <p className="text-base text-muted-foreground max-w-lg leading-relaxed">
                        {HERO_SLIDES[heroIndex].subtitle}
                      </p>
                      <div className="flex gap-4 pt-2">
                        <Link
                          to={HERO_SLIDES[heroIndex].btn1Link || "/shop"}
                          className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-primary hover:bg-foreground hover:text-primary-foreground text-primary-foreground text-xs font-bold uppercase tracking-wider shadow-md hover:scale-[1.02] transition-all cursor-pointer"
                        >
                          {HERO_SLIDES[heroIndex].btn1 || "Shop Now"}
                        </Link>
                        {HERO_SLIDES[heroIndex].btn2 && (
                          <Link
                            to={HERO_SLIDES[heroIndex].btn2Link || "/collections"}
                            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full border border-primary text-foreground bg-transparent hover:bg-foreground/5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                          >
                            {HERO_SLIDES[heroIndex].btn2}
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Right image column */}
                <div className="lg:col-span-6 flex justify-center relative">
                  <div className="relative w-96 h-96 rounded-full overflow-hidden border-[12px] border-card shadow-2xl flex items-center justify-center">
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
                    <div className="absolute inset-0 border border-accent/25 rounded-full pointer-events-none" />
                  </div>
                  <div className="absolute top-1/4 -right-2 glass-panel border border-border/50 shadow-md rounded-2xl p-3 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-background text-accent flex items-center justify-center">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-accent uppercase tracking-wider">
                        Premium Quality
                      </p>
                      <p className="text-xs font-extrabold text-foreground">Museum-Grade Finish</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Slider Indicator Dots */}
            <div className="flex justify-center items-center gap-2 sm:gap-2.5 mt-6 sm:mt-8 relative z-20">
              {HERO_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setHeroIndex(idx)}
                  className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 ${heroIndex === idx
                    ? "w-5 sm:w-6 bg-[#c8a165]"
                    : "w-2 sm:w-2.5 bg-[#ebdcc7] hover:bg-[#c8a165]/60"
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
                { title: "Made for Memories", desc: "Happy customers", emoji: "❤️" },
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
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20 border-b border-[#ebdcc7]">
          <div className="grid lg:grid-cols-12 gap-6 sm:gap-10 lg:gap-12 items-center">
            {/* Left Column Info */}
            <div className="lg:col-span-5 space-y-4 sm:space-y-6 text-center lg:text-left flex flex-col items-center lg:items-start">
              <span className="inline-block bg-[#c8a165]/10 text-[#c8a165] text-[9px] xs:text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-[#c8a165]/35">
                PRESERVATION SHOWCASE
              </span>

              <h2 className="font-display text-2xl xs:text-3xl sm:text-5xl font-extrabold text-[#3d2712] leading-tight">
                Your Precious Moments, <br />
                <span className="text-[#c8a165] font-serif italic font-medium">Preserved</span>{" "}
                Beautifully.
              </h2>

              {/* Bullet Points with checks */}
              <div className="space-y-2.5 sm:space-y-4 pt-1 sm:pt-2 w-full flex flex-col items-center lg:items-start">
                {[
                  "Real Flower & Memory Preservation",
                  "Handcrafted with Love",
                  "Lifetime Keepsake Guarantee",
                ].map((bullet, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 sm:gap-3 w-full max-w-xs lg:max-w-none">
                    <div className="h-4.5 w-4.5 sm:h-5 sm:w-5 rounded-full bg-[#c8a165]/10 text-[#c8a165] flex items-center justify-center shrink-0 border border-[#c8a165]/35">
                      <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-[#5a4331]">{bullet}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 sm:pt-4">
                <Link
                  to="/preservation"
                  className="inline-flex items-center gap-2 px-6 py-2.5 sm:px-8 sm:py-3.5 rounded-full bg-[#3d2712] hover:bg-[#2c1a0c] text-white transition-all text-[11px] sm:text-xs font-bold uppercase tracking-wider shadow-md hover:scale-[1.02]"
                >
                  Start Preservation
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Link>
              </div>
            </div>

            {/* Right Column Arches Showcase */}
            <div className="lg:col-span-7 flex items-center justify-center">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 w-full">
                {[
                  {
                    title: "Wedding Bouquet",
                    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhJ_EcrR9dextMYPz7KuSTilBQBFXj1n0uvMGQK2b0Fg&s=10",
                  },
                  {
                    title: "Baby Memory",
                    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqNNxl1yB9coZCYaNmRfwwWpHnENAwAZeY4sQ3xG3HvA&s=10",
                  },
                  {
                    title: "Pet Memory",
                    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSJ1zVF_PWy2MnTBHpM2WRXHwKa5RbaEWgRywZwgdhC7A&s=10",
                  },
                  {
                    title: "Memorial Keepsake",
                    img: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center bg-white border border-[#ebdcc7]/60 rounded-3xl p-2 sm:p-4 shadow-sm hover:shadow-md hover:border-[#c8a165]/50 transition-all duration-300 group/arch"
                  >
                    <span className="text-[7px] xs:text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] text-[#c8a165] mb-1.5 sm:mb-3">
                      Preservation
                    </span>

                    <div className="aspect-[2/3] w-full rounded-t-full border-[2px] sm:border-[3px] border-white ring-1 ring-[#ebdcc7] overflow-hidden bg-[#FAF7F2] shadow-inner group-hover/arch:scale-[1.02] transition-transform duration-300">
                      <img
                        src={item.img}
                        alt={item.title}
                        className="w-full h-full object-cover rounded-t-full"
                      />
                    </div>

                    <div className="text-center leading-tight mt-2 sm:mt-4 space-y-0.5">
                      <h4 className="text-[9px] xs:text-[10px] sm:text-xs font-extrabold text-[#3d2712] uppercase tracking-wider group-hover/arch:text-[#c8a165] transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[7px] xs:text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.15em] text-[#8c7a6b]">
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
                      className={`absolute top-4 right-4 z-20 p-2 rounded-full border transition-all duration-300 hover:scale-105 cursor-pointer shadow-sm ${isWish
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
                    className={`absolute top-4 right-4 z-20 p-2 rounded-full border transition-all duration-300 hover:scale-105 cursor-pointer shadow-sm ${isWish
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
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-20 text-center select-none">
          <div className="max-w-xl mx-auto mb-12 sm:mb-16 text-center">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#3d2712] tracking-tight">
              SHOP BY MOMENTS
            </h2>
            {/* Elegant middle flourish separator */}
            <div className="flex items-center justify-center gap-3 mt-3 mb-2">
              <div className="w-12 h-[1px] bg-[#c8a165]/50" />
              <svg className="w-8 h-3 text-[#c8a165]/80" viewBox="0 0 40 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 1 L24 6 L20 11 L16 6 Z" fill="currentColor" />
                <path d="M4 6 H16 M24 6 H36" strokeLinecap="round" />
                <circle cx="10" cy="6" r="1.5" fill="currentColor" />
                <circle cx="30" cy="6" r="1.5" fill="currentColor" />
              </svg>
              <div className="w-12 h-[1px] bg-[#c8a165]/50" />
            </div>
            <p className="text-[10px] sm:text-xs text-[#8c7a6b] font-bold tracking-[0.2em] uppercase mt-2.5 flex items-center justify-center gap-2">
              <span className="text-[#c8a165] text-xs">✦</span>
              Handcrafted gifts for every special moment
              <span className="text-[#c8a165] text-xs">✦</span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-x-2 sm:gap-x-12 gap-y-[4vw] sm:gap-y-16 justify-center max-w-6xl mx-auto">
            {OCCASIONS.map((occ, idx) => (
              <Link
                key={idx}
                to="/shop"
                className="flex flex-col items-center group/occ cursor-pointer"
              >
                {/* Circle Image Container with outer/inner double border */}
                <div className="relative">
                  <div className="w-[26vw] h-[26vw] max-w-[110px] sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-full border border-[#c8a165]/40 p-[0.3vw] sm:p-1 bg-transparent group-hover/occ:border-[#c8a165] group-hover/occ:scale-[1.02] transition-all duration-500">
                    <div className="w-full h-full rounded-full border border-[#c8a165]/60 overflow-hidden bg-[#FAF7F2] p-[0.4vw] sm:p-1.5 shadow-sm group-hover/occ:shadow-md transition-all duration-300">
                      <img
                        src={occ.img}
                        alt={occ.name}
                        className="h-full w-full object-cover rounded-full group-hover/occ:scale-105 transition-transform duration-700"
                      />
                    </div>
                  </div>

                  {/* Overlapping small circular badge with icon */}
                  <div className="absolute -bottom-[0.8vw] sm:-bottom-3 left-1/2 -translate-x-1/2 w-[7vw] h-[7vw] max-w-[44px] min-w-[24px] sm:w-11 sm:h-11 rounded-full bg-white border border-[#c8a165]/70 flex items-center justify-center shadow-md group-hover/occ:border-[#c8a165] group-hover/occ:bg-[#FAF7F2] transition-colors duration-300 z-10">
                    {getOccasionIcon(occ.icon)}
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-serif text-[3vw] sm:text-lg md:text-xl font-bold text-[#3d2712] mt-[2vw] sm:mt-7 group-hover/occ:text-[#c8a165] transition-colors leading-tight text-center">
                  {occ.name}
                </h3>

                {/* Description */}
                <p className="text-[2.2vw] sm:text-xs text-[#8c7a6b] font-medium leading-relaxed max-w-[28vw] sm:max-w-[220px] text-center mt-[0.5vw] sm:mt-1.5">
                  {occ.description}
                </p>
              </Link>
            ))}
          </div>

          {/* Bottom decorative separator */}
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-4 mt-16 sm:mt-24">
            <div className="h-[1px] flex-grow bg-[#ebdcc7]/60" />
            <span className="text-[#c8a165] text-xs">✦</span>
            <div className="h-[1px] flex-grow bg-[#ebdcc7]/60" />
          </div>
        </section>

        {/* 10. Create Your Own Custom Resin Art step banner */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-[#FAF7F2] border border-[#ebdcc7] rounded-[2.5rem] p-8 sm:p-12 md:p-16 flex flex-col lg:flex-row justify-between items-center gap-12 shadow-sm text-left relative overflow-hidden">
            {/* Background design */}
            <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-[#ebdcc7]/10 to-transparent pointer-events-none" />

            <div className="space-y-6 max-w-xl relative z-10">
              <div>
                <span className="inline-flex items-center gap-1 bg-white/80 text-[#3d2712]/80 text-[9px] xs:text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-[#ebdcc7]/60">
                  ♡ Made from your memories, preserved forever
                </span>
                <h3 className="font-display text-3xl sm:text-5xl font-extrabold text-[#3d2712] leading-tight mt-4">
                  Turn Your Memories <br />
                  Into <span className="text-[#c8a165] font-serif italic font-medium">Timeless</span> <br />
                  Resin Art
                </h3>
                <p className="text-xs sm:text-sm text-[#5a4331]/80 leading-relaxed mt-3">
                  We preserve your special moments in premium resin art that lasts a lifetime.
                </p>
              </div>

              {/* Steps stacked vertically */}
              <div className="space-y-4 pt-3 flex flex-col">
                {[
                  {
                    step: "Upload Your Photo",
                    desc: "Share your special photo or idea",
                    icon: (
                      <svg className="h-5 w-5 text-[#3d2712]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    ),
                  },
                  {
                    step: "Choose Style",
                    desc: "Select design, shape & preferences",
                    icon: (
                      <svg className="h-5 w-5 text-[#3d2712]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22C17.52 22 22 17.52 22 12S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10z" />
                        <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" />
                        <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor" />
                        <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor" />
                        <path d="M6 14c.5 1 2 2.5 4 2.5 3 0 5-2 5-5" />
                      </svg>
                    ),
                  },
                  {
                    step: "Select Colors & Details",
                    desc: "Personalize colors and final touches",
                    icon: (
                      <svg className="h-5 w-5 text-[#3d2712]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m2 22 1-1h3l9-9-4-4-9 9v3Zm14-14 4-4" />
                        <path d="M16 3a3 3 0 0 1 5 4" />
                      </svg>
                    ),
                  },
                  {
                    step: "We Craft & Deliver",
                    desc: "We Craft Your Custom Art & Deliver Happiness",
                    icon: (
                      <svg className="h-5 w-5 text-[#3d2712]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 12 20 22 4 22 4 12" />
                        <rect x="2" y="7" width="20" height="5" />
                        <line x1="12" y1="22" x2="12" y2="7" />
                        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                      </svg>
                    ),
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-left">
                    <div className="h-9 w-9 rounded-full bg-white border border-[#ebdcc7]/60 flex items-center justify-center shrink-0 shadow-sm">
                      {item.icon}
                    </div>
                    <div className="leading-tight">
                      <h4 className="text-xs font-extrabold text-[#3d2712]">{item.step}</h4>
                      <p className="text-[10px] text-[#8c7a6b] font-medium mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Button Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4">
                <Link
                  to="/custom-order"
                  className="px-6 py-3.5 rounded-full bg-[#1e4620] hover:bg-[#153317] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:scale-[1.02] flex items-center gap-2 shrink-0"
                >
                  Start Custom Design
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Visual Showcase (Polaroid + Resin Block) */}
            <div className="relative z-10 flex items-center justify-center gap-2 xs:gap-4 w-full lg:w-auto mt-6 lg:mt-0 select-none">
              {/* Polaroid Frame */}
              <div className="flex flex-col items-center rotate-[-3deg] hover:rotate-0 transition-transform duration-300 shrink-0">
                <span className="font-serif italic text-xs text-[#8c7a6b] font-semibold mb-1">
                  From your memories
                </span>
                <div className="bg-white p-2.5 pb-5 border border-[#ebdcc7] shadow-md rounded-md w-24 xs:w-32 sm:w-36">
                  <div className="aspect-square w-full overflow-hidden bg-muted rounded">
                    <img
                      src="https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=300&auto=format&fit=crop&q=80"
                      alt="Fresh Flowers Bouquet"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Green Circle Arrow */}
              <div className="h-7 w-7 xs:h-8 xs:w-8 rounded-full bg-[#1e4620] text-white flex items-center justify-center shadow-md shrink-0 z-10">
                <svg className="h-3.5 w-3.5 xs:h-4 xs:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>

              {/* Custom Resin Art Block */}
              <div className="flex flex-col items-center rotate-[3deg] hover:rotate-0 transition-transform duration-300 shrink-0">
                <span className="font-serif italic text-xs text-[#8c7a6b] font-semibold mb-1">
                  To a timeless keepsake
                </span>
                <div className="bg-white p-2.5 pb-5 border border-[#ebdcc7] shadow-md rounded-md w-24 xs:w-32 sm:w-36">
                  <div className="aspect-square w-full overflow-hidden bg-muted rounded">
                    <img
                      src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80"
                      alt="Preserved Flowers Resin Art"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 11. Trust Ribbon 2 */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 select-none">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-6 md:gap-8">
            {[
              {
                title: "Happy Customers",
                subtitle: "Loved by Thousands",
                desc: "We are grateful to thousands of happy customers who trust us with their most precious memories.",
                badge: "Real People, Real Stories, Real Happiness.",
                badgeIcon: "♡",
                icon: (
                  <svg className="h-5 w-5 text-[#c8a165]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                ),
                img: "https://images.unsplash.com/photo-1597080262677-cfb5ef4f31cc?w=200&auto=format&fit=crop&q=80",
                imgClass: "absolute -right-2 bottom-0 h-[80%] w-auto object-contain pointer-events-none opacity-85 transition-transform duration-500 group-hover:scale-105"
              },
              {
                title: "Secure & Safe Payments",
                subtitle: "Your Security, Our Priority",
                desc: "256-bit SSL encrypted payments through trusted & verified payment gateways.",
                badge: "100% Secure Protected Payments",
                badgeIcon: "✓",
                icon: (
                  <svg className="h-5 w-5 text-[#c8a165]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <rect x="9" y="11" width="6" height="4" rx="1" />
                    <path d="M10.5 11V9.5a1.5 1.5 0 0 1 3 0V11" />
                  </svg>
                ),
                img: "https://images.unsplash.com/photo-1563013544-824ae1d704d3?w=200&auto=format&fit=crop&q=80",
                imgClass: "absolute -right-4 bottom-0 h-[75%] w-auto object-contain pointer-events-none opacity-85 transition-transform duration-500 group-hover:scale-105"
              },
              {
                title: "Pan India Delivery",
                subtitle: "Fast. Reliable. Safe.",
                desc: "We carefully pack and deliver your memories safely to your doorstep, anywhere in India.",
                badge: "Tracked Orders Safe Delivery",
                badgeIcon: "📍",
                icon: (
                  <svg className="h-5 w-5 text-[#c8a165]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                ),
                img: "",
                imgClass: "absolute -right-4 -bottom-4 h-[75%] w-auto object-contain pointer-events-none opacity-85 transition-transform duration-500 group-hover:scale-105"
              },
              {
                title: "Verified Seller & Expert",
                subtitle: "Trusted Hands. Genuine Craft.",
                desc: "All our sellers are carefully verified and experienced in resin art & preservation.",
                badge: "Verified Sellers Quality Assured",
                badgeIcon: "👤",
                icon: (
                  <svg className="h-5 w-5 text-[#c8a165]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="7" />
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                    <polyline points="9.5 7.5 11 9 14.5 5.5" />
                  </svg>
                ),
                img: "",
                imgClass: "absolute -right-4 bottom-0 h-[75%] w-auto object-contain pointer-events-none opacity-85 transition-transform duration-500 group-hover:scale-105"
              },
              {
                title: "Quick Support Team",
                subtitle: "We're Here to Help",
                desc: "Have a question or need help? Our friendly team is always ready to assist you.",
                badge: "Mon - Sat | 10AM - 7PM (IST)",
                badgeIcon: "💬",
                icon: (
                  <svg className="h-5 w-5 text-[#c8a165]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  </svg>
                ),
                img: "",
                imgClass: "absolute -right-4 bottom-0 h-[90%] w-auto object-contain pointer-events-none opacity-90 transition-transform duration-500 group-hover:scale-105"
              },
              {
                title: "Made With Love",
                subtitle: "For Your Precious Memories",
                desc: "Every piece is handcrafted with love, using premium materials to preserve what matters most.",
                badge: "Made with Care Just for You",
                badgeIcon: "🤎",
                icon: (
                  <svg className="h-5 w-5 text-[#c8a165]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 12 20 22 4 22 4 12" />
                    <rect x="2" y="7" width="20" height="5" />
                    <line x1="12" y1="22" x2="12" y2="7" />
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                  </svg>
                ),
                img: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=200&auto=format&fit=crop&q=80",
                imgClass: "absolute -right-2 bottom-0 h-[80%] w-auto object-contain pointer-events-none opacity-85 transition-transform duration-500 group-hover:scale-105"
              }
            ].map((item, idx) => (
              <div
                key={idx}
                className="group relative bg-[#FAF7F2] border border-[#ebdcc7]/60 rounded-[1.25rem] sm:rounded-3xl p-3 sm:p-6 md:p-8 flex justify-between overflow-hidden shadow-sm hover:shadow-md hover:border-[#c8a165]/50 transition-all duration-300 min-h-[110px] sm:min-h-[220px]"
              >
                {/* Left Text Column */}
                <div className="w-full sm:w-2/3 flex flex-col justify-between relative z-10">
                  <div className="space-y-1.5 sm:space-y-3">
                    {/* Circle Icon Container */}
                    <div className="h-8 w-8 sm:h-11 sm:w-11 rounded-full bg-white border border-[#c8a165]/40 flex items-center justify-center shadow-sm p-1.5">
                      {item.icon}
                    </div>

                    <div>
                      <h4 className="font-serif text-[10px] xs:text-xs sm:text-lg font-bold text-[#3d2712] leading-tight">
                        {item.title}
                      </h4>
                      <p className="text-[7px] xs:text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-[#c8a165] mt-0.5 sm:mt-1">
                        {item.subtitle}
                      </p>
                    </div>

                    <div className="w-6 sm:w-12 h-0.5 bg-[#ebdcc7]/60" />

                    <p className="hidden sm:block text-[11px] text-[#5a4331]/80 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>

                  {/* Bottom Mini Badge */}
                  <div className="hidden sm:block mt-4">
                    <span className="inline-flex items-center gap-1 bg-white/90 text-[#3d2712] text-[9px] font-bold px-2.5 py-1 rounded-full border border-[#ebdcc7]/50 shadow-sm">
                      <span className="text-[#c8a165]">{item.badgeIcon}</span> {item.badge}
                    </span>
                  </div>
                </div>

                {/* Right Decorative Image */}
                <img
                  src={item.img}
                  alt=""
                  className={`${item.imgClass} hidden sm:block`}
                />
              </div>
            ))}
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
