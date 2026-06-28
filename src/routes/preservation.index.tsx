import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/layouts/PageShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { uploadToCloudinary } from "@/services/cloudinary";
import {
  Loader2,
  Check,
  Flower,
  Heart,
  Baby,
  Activity,
  Bookmark,
  Sparkles,
  Award,
  UploadCloud,
  X,
  FileText,
  MapPin,
  Calendar,
  Smartphone,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Circle,
  Square,
  Box,
  Hexagon,
  Flame,
  UserCheck,
  Star,
  Truck,
  ShieldCheck,
  Sparkle,
  Clock,
  Smile,
  Lock,
  Globe,
  HelpCircle,
  Play,
  Compass,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import heroImg from "@/assets/hero-resin.jpg";
import preservationImg from "@/assets/cat-preservation.jpg";

export const Route = createFileRoute("/preservation/")({
  head: () => ({
    meta: [
      { title: "Artisan Resin Preservation Request — ViaCraft" },
      {
        name: "description",
        content:
          "Submit wedding bouquets, floral memories, pet keepsakes, and baby memories for custom museum-grade resin preservation.",
      },
    ],
  }),
  component: PreservationPage,
});

const CATEGORIES = [
  {
    id: "Wedding Bouquet",
    label: "Wedding Bouquet Preservation",
    desc: "Preserve wedding flowers in deep-pour premium blocks.",
    icon: Heart,
  },
  {
    id: "Flowers",
    label: "Flower Preservation",
    desc: "General flora keepsakes, garden pickings, and gift blooms.",
    icon: Flower,
  },
  {
    id: "Pet Memory",
    label: "Pet Memory Preservation",
    desc: "Tributes for beloved companions, fur lockets, collars.",
    icon: Activity,
  },
  {
    id: "Baby Memory",
    label: "Baby Memory Preservation",
    desc: "First pacifier, hospital bands, tiny boots preserved.",
    icon: Baby,
  },
  {
    id: "Memorial",
    label: "Memorial Preservation",
    desc: "Dignified keepsakes for family heirlooms and mementos.",
    icon: Bookmark,
  },
  {
    id: "Ash",
    label: "Ash Preservation",
    desc: "Vitreous casting of ashes in spiritual shapes and weights.",
    icon: Flame,
  },
  {
    id: "Custom Keepsake",
    label: "Custom Keepsake Preservation",
    desc: "Artistic combinations and customized objects in resin.",
    icon: Sparkles,
  },
];

const SHAPES = [
  { id: "Circle", label: "Circle Mold", desc: "Sleek, timeless spherical flow", icon: Circle },
  { id: "Square", label: "Square Block", desc: "Sharp borders, solid look", icon: Square },
  { id: "Rectangle", label: "Rectangle Block", desc: "Perfect for full stems", icon: Box },
  { id: "Hexagon", label: "Hexagon Prism", desc: "Modern geometric elegance", icon: Hexagon },
  { id: "Heart", label: "Heart Shape", desc: "Romantic sentiment flow", icon: Heart },
  { id: "Custom", label: "Custom Mold", desc: "Freeform shapes or custom frames", icon: Sparkles },
];

const SIZES = [
  { id: "Small", label: "Small (4-6 inches)", desc: "Ideal for lockets, rings, small petals" },
  { id: "Medium", label: "Medium (6-9 inches)", desc: "Perfect for single flowers, coasters" },
  { id: "Large", label: "Large (9-12 inches)", desc: "Fits mini bouquets, multiple stems" },
  { id: "XL", label: "Extra Large (12+ inches)", desc: "Holds full bridal bouquets & collections" },
  { id: "Custom", label: "Custom Dimensions", desc: "Specify custom size in description" },
];

const OCCASIONS = ["Wedding", "Anniversary", "Memorial", "Pet Tribute", "Baby Milestone", "Other"];

function PreservationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Toggle landing page vs. wizard questionnaire
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [beforeAfterSplit, setBeforeAfterSplit] = useState(50);

  // Custom states for landing page carousels
  const popularScrollRef = useRef<HTMLDivElement>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);

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

  // Form State
  const [category, setCategory] = useState("");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [occasionType, setOccasionType] = useState("Wedding");
  const [expectedDate, setExpectedDate] = useState("");
  const [shape, setShape] = useState("");
  const [size, setSize] = useState("");

  // Customizations
  const [nameEngraving, setNameEngraving] = useState(false);
  const [dateEngraving, setDateEngraving] = useState(false);
  const [messageEngraving, setMessageEngraving] = useState(false);
  const [goldFlakes, setGoldFlakes] = useState(false);
  const [silverFlakes, setSilverFlakes] = useState(false);
  const [glitter, setGlitter] = useState(false);
  const [ledBase, setLedBase] = useState(false);
  const [photoInclusion, setPhotoInclusion] = useState(false);
  const [colorTheme, setColorTheme] = useState("");

  // Shipping
  const [pickupAddress, setPickupAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  // File Upload State
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Submit Mutation
  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate({ to: "/auth" });
        throw new Error("Sign in required");
      }

      const randomId = Math.floor(100000 + Math.random() * 900000);
      const reqNumber = `REQ-2026-${randomId}`;

      const notesPayload = {
        item_name: itemName,
        occasion_type: occasionType,
        expected_delivery_date: expectedDate,
        special_instructions: specialInstructions,
        customizations: {
          nameEngraving,
          dateEngraving,
          messageEngraving,
          goldFlakes,
          silverFlakes,
          glitter,
          ledBase,
          photoInclusion,
          colorTheme,
        },
        shipping: {
          pickupAddress,
          shippingAddress,
          contactNumber,
          emergencyContact,
        },
        quotation_count: 0,
      };

      try {
        const { data, error } = await supabase
          .from("preservation_requests")
          .insert({
            request_number: reqNumber,
            user_id: user.id,
            preservation_type: category,
            description: description,
            shape: shape,
            size: size,
            reference_images: images,
            notes: JSON.stringify(notesPayload),
            current_stage: "submitted",
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        console.warn("Supabase preservation request insert failed, using fallback:", err);
        const fallbackData = {
          id: crypto.randomUUID(),
          request_number: reqNumber,
          user_id: user.id,
          preservation_type: category,
          description: description,
          shape: shape,
          size: size,
          reference_images: images,
          notes: JSON.stringify(notesPayload),
          current_stage: "submitted",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          vendor_id: null,
        };
        const stored = localStorage.getItem("fallback_platform_requests");
        const list = stored ? JSON.parse(stored) : [];
        list.push(fallbackData);
        localStorage.setItem("fallback_platform_requests", JSON.stringify(list));
        return fallbackData;
      }
    },
    onSuccess: (data) => {
      toast.success(`Preservation request ${data.request_number} submitted!`);
      try {
        const stored = localStorage.getItem("fallback_platform_requests");
        const list = stored ? JSON.parse(stored) : [];
        if (!list.some((r: any) => r.id === data.id)) {
          list.push(data);
          localStorage.setItem("fallback_platform_requests", JSON.stringify(list));
        }
      } catch (err) {
        console.error("Failed to save to fallback_platform_requests:", err);
      }
      navigate({ to: `/preservation/${data.id}` });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit request");
    },
  });

  const nextStep = () => setStep((s) => Math.min(8, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  // Cloudinary File Upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);

    const filesArray = Array.from(files);
    const uploadedUrls: string[] = [];
    let hasError = false;

    for (const file of filesArray) {
      try {
        const url = await uploadToCloudinary(file);
        uploadedUrls.push(url);
      } catch (err: any) {
        toast.error(err.message || `Failed to upload ${file.name}`);
        hasError = true;
      }
    }

    if (uploadedUrls.length > 0) {
      setImages((prev) => [...prev, ...uploadedUrls]);
      if (!hasError) {
        toast.success("Images uploaded successfully!");
      }
    }
    setUploading(false);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    toast.info("Image removed");
  };

  return (
    <PageShell>
      {!showWizard ? (
        /* ================================================= */
        /* PREMIUM SERVICES LANDING PAGE */
        /* ================================================= */
        <div className="animate-in fade-in duration-300 text-left">
          {/* Landing Hero */}
          <section className="bg-gradient-to-b from-[#fdfcfb] to-[#fbf9f6] py-8 sm:py-12 lg:py-20 border-b border-[#ebdcc7] relative overflow-hidden select-none animate-in fade-in duration-300">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
              {/* Outer Content Container */}
              <div className="relative w-full overflow-hidden rounded-[2rem] border border-[#ebdcc7]/60 shadow-lg bg-[#FAF7F2] lg:bg-transparent lg:border-0 lg:shadow-none">
                {/* Mobile/Tablet Banner layout (hidden on desktop lg) */}
                <div className="lg:hidden relative w-full aspect-[16/10] sm:aspect-[21/9] overflow-hidden flex items-center">
                  <img
                    src="https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=800&auto=format&fit=crop"
                    alt="Preservation Artwork"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Dark overlay for readability */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-transparent z-[5]" />

                  <div className="relative z-10 p-6 sm:p-10 text-left text-white max-w-md space-y-3">
                    <span className="inline-flex items-center gap-1.5 text-[8px] sm:text-[10px] font-bold tracking-[0.25em] uppercase text-[#c8a165]">
                      ✨ PRESERVE WHAT MATTERS MOST
                    </span>
                    <h1 className="font-display text-xl sm:text-3xl font-extrabold leading-tight text-white">
                      Cherish Today, <br />
                      Preserved{" "}
                      <span className="text-[#c8a165] font-serif italic font-medium">Forever</span>
                    </h1>
                    <p className="text-[10px] sm:text-xs text-white/80 max-w-xs line-clamp-2 leading-relaxed">
                      We preserve your precious flowers, memories and emotions in timeless resin
                      art.
                    </p>

                    <div className="flex gap-2.5 pt-1">
                      <button
                        onClick={() => setShowWizard(true)}
                        className="px-5 py-2 rounded-full bg-[#c8a165] text-[#3d2712] hover:bg-[#c8a165]/90 text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Start Preservation
                      </button>
                      <a
                        href="#process"
                        className="px-5 py-2 rounded-full border border-white/80 text-white hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider transition-all text-center"
                      >
                        How It Works
                      </a>
                    </div>
                  </div>
                </div>

                {/* Desktop Split Layout (hidden on mobile/tablet) */}
                <div className="hidden lg:grid lg:grid-cols-12 gap-12 items-center min-h-[400px]">
                  {/* Hero Left Content */}
                  <div className="lg:col-span-6 space-y-6 sm:space-y-8 text-left">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.2em] uppercase text-[#c8a165]">
                      <Sparkle className="h-4.5 w-4.5 text-[#c8a165] fill-current animate-pulse" />
                      PRESERVE WHAT MATTERS MOST
                    </span>
                    <h1 className="font-display text-5xl lg:text-6xl font-extrabold text-[#3d2712] leading-[1.15] tracking-tight">
                      Cherish Today, <br />
                      Preserved{" "}
                      <span className="text-[#c8a165] font-serif italic font-medium">Forever</span>
                    </h1>
                    <p className="text-base text-[#5c4a3b] max-w-lg leading-relaxed">
                      We preserve your precious flowers, memories and emotions in timeless resin
                      art, so you can cherish them forever.
                    </p>

                    {/* Badges Grid (Circle icons with border) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl">
                      {[
                        { text: "Real Flower Preservation", emoji: "🌸" },
                        { text: "100% Handmade With Love", emoji: "❤️" },
                        { text: "Premium Quality Materials", emoji: "💎" },
                        { text: "Lifetime Keepsake", emoji: "⏳" },
                      ].map((badge, idx) => (
                        <div key={idx} className="flex flex-col items-center text-center space-y-2">
                          <div className="h-12 w-12 rounded-full bg-white border border-[#e8ded2] shadow-sm flex items-center justify-center text-lg">
                            {badge.emoji}
                          </div>
                          <span className="text-[10px] font-bold tracking-tight text-[#4c3b2e] leading-tight w-20">
                            {badge.text}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-4 pt-4">
                      <button
                        onClick={() => setShowWizard(true)}
                        className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#3d2712] hover:bg-[#2c1a0c] text-white transition-all text-xs font-bold tracking-wider uppercase shadow-md hover:scale-[1.02] cursor-pointer"
                      >
                        Start Preservation
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                      <a
                        href="#process"
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-[#3d2712] hover:bg-[#3d2712]/5 text-[#3d2712] bg-transparent transition-all text-xs font-bold tracking-wider uppercase"
                      >
                        <div className="h-5 w-5 rounded-full border border-current flex items-center justify-center">
                          <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                        </div>
                        How It Works
                      </a>
                    </div>
                  </div>

                  {/* Hero Right Column: Golden Framed Bouquet Showcase */}
                  <div className="lg:col-span-6 relative flex justify-center">
                    <div className="relative w-full max-w-[480px] aspect-[4/5] rounded-[2.5rem] bg-white border-[16px] border-[#ecdac2] shadow-[0_25px_60px_-15px_rgba(61,39,18,0.25)] overflow-hidden flex items-center justify-center p-1">
                      <img
                        src="https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=600&auto=format&fit=crop"
                        alt="Gold Framed Bouquet Artwork"
                        className="w-full h-full object-cover rounded-[1.5rem]"
                      />

                      {/* 10,000+ Memories Badge overlay */}
                      <div className="absolute top-6 right-6 h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-[#3d2712] text-white flex flex-col items-center justify-center text-center p-2.5 border-4 border-[#c8a165] shadow-lg">
                        <span className="text-xs sm:text-sm font-extrabold tracking-tight">
                          10,000+
                        </span>
                        <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[#c8a165] font-bold mt-0.5">
                          Precious
                        </span>
                        <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[#c8a165] font-bold">
                          Memories
                        </span>
                        <span className="text-[7px] sm:text-[8px] text-white/80 mt-0.5">
                          Preserved
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Key Trust Stats Highlights row below hero */}
          <section className="bg-white border-b border-[#e2d8ca] py-8 shadow-sm select-none">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#eddcc8]">
                {[
                  {
                    label: "Completion Time",
                    text: "4-6 Weeks",
                    sub: "Delivery & curing",
                    icon: Clock,
                  },
                  {
                    label: "Secure Packaging",
                    text: "Safe & Sturdy",
                    sub: "Damage-free transit",
                    icon: ShieldCheck,
                  },
                  {
                    label: "Live Order Tracking",
                    text: "Stay Updated",
                    sub: "Check progress live",
                    icon: Compass,
                  },
                  {
                    label: "24/7 Support",
                    text: "We're Here to Help",
                    sub: "Friendly assistance",
                    icon: HelpCircle,
                  },
                ].map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-4 p-3 ${idx >= 2 ? "pt-6 md:pt-3" : ""} ${idx % 2 === 1 ? "pl-4 sm:pl-8" : ""} ${idx >= 2 && idx % 2 === 0 ? "pl-0 md:pl-8" : ""} ${idx === 0 ? "" : "md:pl-8"}`}
                    >
                      <div className="h-10 w-10 rounded-xl bg-[#FAF7F2] border border-[#ecdac2] text-[#c8a165] flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#c8a165] uppercase tracking-wider">
                          {stat.text}
                        </p>
                        <p className="text-sm font-extrabold text-[#3d2712] mt-0.5">{stat.label}</p>
                        <p className="text-[11px] text-[#8c7a6b] mt-0.5">{stat.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* What Can We Preserve For You? Section */}
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 border-b border-[#ebdcc7]">
            <div className="text-center max-w-xl mx-auto mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#3d2712] relative inline-block">
                What Can We Preserve For You?
                <span className="absolute -bottom-2.5 left-1/4 right-1/4 h-0.5 bg-[#c8a165]/35 rounded-full" />
              </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-8">
              {[
                {
                  title: "Wedding Bouquet",
                  desc: "Preserve your bridal bouquet beautifully forever.",
                  img: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=400&auto=format&fit=crop&q=80",
                },
                {
                  title: "Engagement Flowers",
                  desc: "Keep your engagement flowers as a timeless memory.",
                  img: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&auto=format&fit=crop&q=80",
                },
                {
                  title: "Anniversary Flowers",
                  desc: "Celebrate your love, preserve your memories.",
                  img: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&auto=format&fit=crop&q=80",
                },
                {
                  title: "Baby Memories",
                  desc: "Preserve your baby's special moments and milestones.",
                  img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&auto=format&fit=crop&q=80",
                },
                {
                  title: "Pet Memories",
                  desc: "Cherish your pet's memories forever in resin.",
                  img: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&auto=format&fit=crop&q=80",
                },
                {
                  title: "Memorial Keepsakes",
                  desc: "Honor & remember your loved ones with beautiful keepsakes.",
                  img: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&auto=format&fit=crop&q=80",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setCategory(item.title);
                    setShowWizard(true);
                  }}
                  className="group bg-white border border-[#ebdcc7] rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:border-[#c8a165]/40 transition-all flex flex-col justify-between cursor-pointer text-left"
                >
                  <div>
                    <div className="aspect-[4/3] w-full overflow-hidden bg-muted relative">
                      <img
                        src={item.img}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-3.5 sm:p-6">
                      <h3 className="font-display text-sm sm:text-xl font-bold text-[#3d2712] line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-[#5c4a3b] mt-1 sm:mt-2 leading-relaxed line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  <div className="px-6 pb-6 pt-0 hidden sm:block">
                    <span className="w-full py-2.5 rounded-full border border-[#ecdac2] hover:border-[#c8a165] hover:bg-[#c8a165]/5 transition-colors text-center text-xs font-bold text-[#8a6d4d] block uppercase tracking-wider">
                      Start Now
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Custom Preservation Banner Card with Arched Presets */}
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-[#FAF7F2] border border-[#e8dfd2] rounded-[2.5rem] overflow-hidden grid lg:grid-cols-12 shadow-sm">
              {/* Left green panel */}
              <div className="lg:col-span-4 bg-[#3d2712] text-white p-8 sm:p-12 flex flex-col justify-between space-y-8">
                <div className="space-y-4">
                  <span className="inline-block bg-[#c8a165] text-[#3d2712] text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                    NEW
                  </span>
                  <h3 className="font-display text-3xl sm:text-4xl font-bold leading-tight">
                    Custom Preservation
                  </h3>
                  <p className="text-xs text-[#e8ded2] font-semibold uppercase tracking-wider">
                    Made Just For You
                  </p>

                  {/* List items with ticks */}
                  <div className="space-y-3.5 pt-4 text-xs">
                    {[
                      "Choose Shape & Size",
                      "Personalized Add-ons",
                      "Special Themes",
                      "Collaborate With Our Artists",
                    ].map((bullet, index) => (
                      <div key={index} className="flex items-center gap-2.5">
                        <div className="h-4 w-4 rounded-full bg-[#c8a165]/20 text-[#c8a165] flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3" />
                        </div>
                        <span className="text-[11px] font-medium text-[#e8ded2]">{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => setShowWizard(true)}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#c8a165] hover:bg-[#d8b175] text-[#3d2712] text-xs font-bold uppercase tracking-wider transition-all shadow hover:scale-[1.02] text-center cursor-pointer font-semibold"
                  >
                    Create Your Custom Piece
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Middle panel with Arches */}
              <div className="lg:col-span-5 p-4 sm:p-8 flex items-center justify-center">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-3 w-full">
                  {[
                    {
                      label: "Initial Art",
                      img: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=300&auto=format&fit=crop&q=80",
                    },
                    {
                      label: "Name Art",
                      img: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80",
                    },
                    {
                      label: "Theme Art",
                      img: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&auto=format&fit=crop&q=80",
                    },
                    {
                      label: "Photo Art",
                      img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&auto=format&fit=crop&q=80",
                    },
                  ].map((arch, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center bg-white border border-[#ebdcc7]/60 rounded-3xl p-2.5 sm:p-3 shadow-sm hover:shadow-md hover:border-[#c8a165]/50 transition-all duration-300 group/arch"
                    >
                      <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-[0.15em] text-[#c8a165] mb-2 select-none">
                        Preset
                      </span>
                      <div className="aspect-[2/3] w-full rounded-t-full border-[3px] border-white ring-1 ring-[#ebdcc7] overflow-hidden bg-[#FAF7F2] shadow-inner group-hover/arch:scale-[1.02] transition-transform duration-300">
                        <img
                          src={arch.img}
                          alt={arch.label}
                          className="w-full h-full object-cover rounded-t-full"
                        />
                      </div>
                      <div className="text-center leading-tight mt-2.5 space-y-0.5">
                        <span className="text-[9px] sm:text-[10px] font-extrabold text-[#3d2712] uppercase tracking-wider block select-none">
                          {arch.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Panel */}
              <div className="lg:col-span-3 bg-white p-8 sm:p-12 flex flex-col justify-center items-center text-center border-t lg:border-t-0 lg:border-l border-[#e8dfd2] space-y-5">
                <div className="h-14 w-14 rounded-full bg-[#FAF7F2] border border-[#ecdac2] text-[#c8a165] flex items-center justify-center">
                  <Lightbulb className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-display text-xl font-bold text-[#3d2712]">
                    Your Idea, Our Creation
                  </h4>
                  <p className="text-xs text-[#8c7a6b] leading-relaxed">
                    Let's create a one-of-a-kind keepsake that's uniquely yours.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCategory("Custom Keepsake");
                    setShowWizard(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#8a6d4d] hover:text-[#c8a165] hover:underline uppercase tracking-wider pt-2 cursor-pointer"
                >
                  Start Custom Order →
                </button>
              </div>
            </div>
          </section>

          {/* Our Preservation Process Timeline */}
          <section
            id="process"
            className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 border-b border-[#ebdcc7] select-none text-center"
          >
            <div className="text-center max-w-xl mx-auto mb-16">
              <span className="text-[#c8a165] text-xs font-bold uppercase tracking-[0.2em] block mb-2">
                How It Works
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#3d2712] relative inline-block">
                Our Preservation Process
                <span className="absolute -bottom-2.5 left-1/4 right-1/4 h-0.5 bg-[#c8a165]/35 rounded-full" />
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative">
              {[
                {
                  step: "1. Place Your Order",
                  desc: "Choose your product & place the order.",
                  emoji: "🛒",
                },
                {
                  step: "2. Send Your Material ",
                  desc: "We'll share easy instructions to send us your Material you want to preserve.",
                  emoji: "🌸",
                },
                {
                  step: "3. We Preserve With Care",
                  desc: "Our experts preserve your flowers with love & premium materials.",
                  emoji: "✨",
                },
                {
                  step: "4. Handmade Creation",
                  desc: "Your unique piece is handmade beautifully.",
                  emoji: "🎨",
                },
                {
                  step: "5. Safe Delivery",
                  desc: "Carefully packed & delivered to your doorstep.",
                  emoji: "🚚",
                },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center text-center space-y-4 relative group"
                >
                  {/* Connecting arrow/dots for desktop */}
                  {idx < 4 && (
                    <div className="hidden md:block absolute top-10 left-[60%] right-[-40%] h-0.5 border-t-2 border-dashed border-[#ecdac2] z-0" />
                  )}

                  <div className="h-16 w-16 rounded-full bg-white border-2 border-[#ecdac2] text-[#c8a165] flex items-center justify-center text-2xl font-bold shadow-sm relative z-10 hover:border-[#c8a165] transition-colors">
                    {step.emoji}
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-extrabold text-[#3d2712] tracking-tight">
                      {step.step}
                    </h4>
                    <p className="text-[11px] text-[#8c7a6b] leading-relaxed max-w-[160px] mx-auto font-medium">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Popular Preservation Creations */}
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 relative group select-none">
            <div className="flex items-end justify-between mb-12">
              <div className="text-left">
                <span className="text-[#c8a165] text-xs font-bold uppercase tracking-[0.2em] block mb-2">
                  Collector's Favourites
                </span>
                <h2 className="font-display text-3xl font-extrabold text-[#3d2712]">
                  Popular Preservation Creations
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to="/shop"
                  className="text-xs font-bold text-[#c8a165] hover:underline flex items-center gap-1 mr-4"
                >
                  View All Creations <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="flex gap-2">
                  <button
                    onClick={() => scrollElement(popularScrollRef, "left", 320)}
                    className="h-9 w-9 rounded-full bg-white border border-[#e8dfd2] text-[#5c4a3b] hover:text-[#c8a165] flex items-center justify-center shadow-sm cursor-pointer hover:border-[#c8a165] transition-all"
                    aria-label="Previous items"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => scrollElement(popularScrollRef, "right", 320)}
                    className="h-9 w-9 rounded-full bg-white border border-[#e8dfd2] text-[#5c4a3b] hover:text-[#c8a165] flex items-center justify-center shadow-sm cursor-pointer hover:border-[#c8a165] transition-all"
                    aria-label="Next items"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Carousel viewport */}
            <div
              ref={popularScrollRef}
              className="flex gap-6 overflow-x-auto pb-8 scrollbar-none scroll-smooth px-1"
            >
              {[
                {
                  id: "p1",
                  title: "Preserved Wedding Bouquet Frame",
                  tag: "Bestseller",
                  rating: 4.9,
                  reviews: 120,
                  price: "₹4,499",
                  originalPrice: "₹5,499",
                  discount: "21% OFF",
                  img: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=400&auto=format&fit=crop&q=80",
                },
                {
                  id: "p2",
                  title: "Floral Preservation Clock",
                  tag: "Top Rated",
                  rating: 4.8,
                  reviews: 95,
                  price: "₹3,499",
                  originalPrice: "₹4,999",
                  discount: "30% OFF",
                  img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80",
                },
                {
                  id: "p3",
                  title: "Preserved Floral Initial",
                  tag: "New",
                  rating: 4.9,
                  reviews: 76,
                  price: "₹2,299",
                  originalPrice: "₹3,199",
                  discount: "28% OFF",
                  img: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&auto=format&fit=crop&q=80",
                },
                {
                  id: "p4",
                  title: "Heart Bouquet Preservation",
                  tag: "Bestseller",
                  rating: 4.8,
                  reviews: 112,
                  price: "₹3,299",
                  originalPrice: "₹4,699",
                  discount: "26% OFF",
                  img: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&auto=format&fit=crop&q=80",
                },
                {
                  id: "p5",
                  title: "Preserved Floral Jewelry Box",
                  tag: "New",
                  rating: 4.9,
                  reviews: 88,
                  price: "₹2,999",
                  originalPrice: "₹4,299",
                  discount: "30% OFF",
                  img: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&auto=format&fit=crop&q=80",
                },
              ].map((creation) => {
                const isWish = wishlist.includes(creation.id);
                return (
                  <div
                    key={creation.id}
                    className="min-w-[220px] sm:min-w-[280px] max-w-[220px] sm:max-w-[280px] bg-white border border-[#e8dfd2] rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between shrink-0 text-left relative"
                  >
                    {/* Entire card click target (excluding interactive items) */}
                    <div
                      onClick={() => {
                        setCategory(creation.title);
                        setShowWizard(true);
                      }}
                      className="absolute inset-0 z-0 rounded-3xl cursor-pointer"
                    />

                    <div className="relative z-10 pointer-events-none w-full h-full flex flex-col justify-between flex-1">
                      <div>
                        {/* Image with Tag */}
                        <div className="aspect-square w-full relative bg-muted overflow-hidden rounded-t-3xl">
                          <img
                            src={creation.img}
                            alt={creation.title}
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                          />

                          {/* Floating Label */}
                          <span className="absolute top-4 left-4 bg-white/95 text-[#2c1a0c] text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                            {creation.tag}
                          </span>
                        </div>

                        <div className="p-4 sm:p-5 space-y-1 sm:space-y-1.5">
                          {/* Rating Badge */}
                          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                            <span className="bg-amber-500 text-white font-extrabold text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm shrink-0">
                              {creation.rating}
                              <Star className="h-2.5 w-2.5 fill-current text-white inline" />
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-[#8c7a6b] font-semibold">
                              ({creation.reviews} reviews)
                            </span>
                          </div>

                          <h3 className="font-display text-sm sm:text-base font-bold text-[#3d2712] line-clamp-1">
                            {creation.title}
                          </h3>

                          {/* Price with Discount */}
                          <div className="flex flex-wrap items-baseline gap-1 sm:gap-1.5 pt-1">
                            <span className="text-[#3d2712] font-extrabold text-sm sm:text-base">
                              {creation.price}
                            </span>
                            <span className="text-[10px] sm:text-xs text-[#8c7a6b] line-through">
                              {creation.originalPrice}
                            </span>
                            <span className="text-[8px] sm:text-[9px] font-bold text-green-600 bg-green-50 px-1.5 sm:px-2 py-0.5 rounded-full">
                              {creation.discount}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Wishlist Heart - positioned above card click overlay */}
                    <button
                      onClick={(e) => handleWishlistToggle(creation.id, e)}
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
                      <button
                        onClick={() => {
                          setCategory(creation.title);
                          setShowWizard(true);
                        }}
                        className="w-full py-1.5 sm:py-2 rounded-full bg-[#3d2712] hover:bg-[#2c1a0c] text-white text-[10px] sm:text-xs font-bold text-center block uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Start Preservation Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Trust Highlights Row */}
          <section className="bg-[#FAF7F2] border-t border-b border-[#ebdcc7] py-8 select-none text-center">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center text-xs">
                {[
                  { title: "100% Handmade", desc: "Crafted with Love", emoji: "⭐" },
                  { title: "Premium Quality", desc: "Best Materials Used", emoji: "💎" },
                  { title: "Safe & Secure", desc: "Secure Packaging", emoji: "🔒" },
                  { title: "Trusted by Thousands", desc: "10,000+ Happy Customers", emoji: "👥" },
                  { title: "Made in India", desc: "Proudly Indian Brand", emoji: "🇮🇳" },
                ].map((badge, idx) => (
                  <div key={idx} className="flex flex-col items-center space-y-1">
                    <span className="text-xl">{badge.emoji}</span>
                    <h4 className="font-bold text-[#3d2712]">{badge.title}</h4>
                    <p className="text-[10px] text-[#8c7a6b] font-medium">{badge.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Bottom CTA Banners */}
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-left">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Card */}
              <div className="bg-[#FAF7F2] border border-[#e8dfd2] rounded-3xl p-8 sm:p-10 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#3d2712] leading-snug">
                    Your Memories Deserve To Be Preserved Beautifully
                  </h3>
                  <p className="text-xs text-[#5c4a3b] leading-relaxed font-medium">
                    Let us turn your special moments into timeless keepsakes. We preserve your
                    flowers and heirlooms with museum-grade clear epoxy resin.
                  </p>

                  {/* List items with checklist ticks */}
                  <div className="space-y-2.5 pt-2 text-xs">
                    {["Easy Process", "Expert Artisans", "Made with Love"].map((bullet, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="h-4.5 w-4.5 rounded-full bg-[#c8a165]/15 text-[#c8a165] flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3" />
                        </div>
                        <span className="font-bold text-[#3d2712]/90">{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="w-full h-px bg-[#e8dfd2] my-2" />
                <div className="text-xs text-[#8c7a6b] flex items-center gap-1.5 font-bold">
                  <Info className="h-4 w-4 shrink-0 text-[#c8a165]" />
                  Submit requests digitally to get artisan bids instantly.
                </div>
              </div>

              {/* Right Card */}
              <div className="bg-[#3d2712] text-white rounded-3xl p-8 sm:p-10 flex flex-col justify-between items-center text-center space-y-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#5a4331] via-[#3d2712] to-[#2c1a0c] opacity-60 z-0" />

                <div className="space-y-4 relative z-10">
                  <span className="inline-block bg-[#c8a165] text-[#3d2712] text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                    Get Started
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl font-extrabold leading-snug">
                    Ready to Preserve Your Precious Moments?
                  </h3>
                  <p className="text-xs text-[#ebdcc7] max-w-sm mx-auto leading-relaxed font-semibold">
                    Book your bouquet slots or custom keepsakes orders with our expert artisans
                    today.
                  </p>
                </div>

                <div className="w-full relative z-10 pt-4">
                  <button
                    onClick={() => setShowWizard(true)}
                    className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-full bg-[#c8a165] hover:bg-[#d8b175] text-[#3d2712] text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    Start Preservation Now
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : (
        /* ================================================= */
        /* WIZARD BUILDER PAGE */
        /* ================================================= */
        <section className="mx-auto max-w-4xl px-4 sm:px-6 py-12 animate-in fade-in duration-300">
          {/* Back to landing */}
          <button
            onClick={() => {
              setShowWizard(false);
              setStep(1);
            }}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent font-semibold mb-8 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Portal Overview
          </button>

          {/* Heading */}
          <div className="mb-10 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5">
              Artisan Quote Builder
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-foreground mt-4">
              Preservation Inquiry Wizard
            </h1>
          </div>

          {/* Progress bar */}
          <div className="mb-12 max-w-2xl mx-auto">
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground/60 mb-2 uppercase tracking-wide">
              <span>Step {step} of 8</span>
              <span>
                {step === 1 && "Preservation Guide & Inspiration"}
                {step === 2 && "Category Select"}
                {step === 3 && "Item Specifications"}
                {step === 4 && "Reference Images"}
                {step === 5 && "Mold Geometry"}
                {step === 6 && "Decorative Customizations"}
                {step === 7 && "Logistics Addresses"}
                {step === 8 && "Final Review"}
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${(step / 8) * 100}%` }}
              />
            </div>
          </div>

          {/* Card Body */}
          <div className="bg-card rounded-3xl border border-border shadow-luxe p-6 sm:p-10 mb-8 min-h-[400px]">
            {/* Step 1: Inspiration & Examples */}
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in duration-200 text-left">
                <div>
                  <h2 className="font-display text-2xl font-bold mb-1.5 text-foreground">
                    How & Which Products Can You Preserve?
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Explore our preservation standards, techniques, and design inspirations before placing your custom keepsake order.
                  </p>
                </div>

                {/* Preservation Techniques & How It Works */}
                <div className="grid md:grid-cols-3 gap-5">
                  {[
                    {
                      title: "1. Botanical Dehydration",
                      desc: "We extract moisture from flowers using special desiccant compounds, retaining 100% of their organic form, vivid color saturation, and shape.",
                      icon: Flower,
                      badge: "Expert Curing"
                    },
                    {
                      title: "2. Precision Deep-Pour",
                      desc: "Artisans cast crystal-clear optical-grade UV-resistant epoxy resin in thin layers, preventing overheating, shrinkage, and bubble build-ups.",
                      icon: Sparkles,
                      badge: "Bubble-Free"
                    },
                    {
                      title: "3. Diamond Gloss Finish",
                      desc: "Every block goes through five stages of hand-sanding, polishing, and buffing to achieve a glass-like reflective sheen.",
                      icon: Award,
                      badge: "Luxe Shine"
                    }
                  ].map((tech, idx) => {
                    const Icon = tech.icon;
                    return (
                      <div key={idx} className="bg-muted/40 border border-border/60 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="p-2 bg-accent/10 text-accent rounded-xl">
                              <Icon className="h-4.5 w-4.5" />
                            </div>
                            <span className="text-[9px] uppercase tracking-wider bg-background px-2.5 py-0.5 rounded-full border border-border text-muted-foreground font-semibold">
                              {tech.badge}
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-foreground mt-2">{tech.title}</h4>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            {tech.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Examples of what can be preserved */}
                <div className="space-y-4 pt-2">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-accent">
                    Preservation Reference Catalog
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      {
                        name: "Wedding Bouquets",
                        useCase: "Bridal flowers, roses, boutonnieres",
                        tip: "Keep stems in water until shipping",
                        img: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=300&auto=format&fit=crop&q=80"
                      },
                      {
                        name: "Milestone Keepsakes",
                        useCase: "Baby booties, pacifiers, hospital bands",
                        tip: "Metal, fabric, or plastic inclusions",
                        img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&auto=format&fit=crop&q=80"
                      },
                      {
                        name: "Memorial Tributes",
                        useCase: "Condolence flowers, photos, medals",
                        tip: "Dignified archival resin pours",
                        img: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80"
                      },
                      {
                        name: "Pet Memory Lockets",
                        useCase: "Fur locks, custom collars, name tags",
                        tip: "Sealed tightly in glass-like molds",
                        img: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&auto=format&fit=crop&q=80"
                      }
                    ].map((refEx, i) => (
                      <div key={i} className="bg-background border border-border/80 rounded-2xl overflow-hidden hover:border-accent/40 transition-colors shadow-sm flex flex-col justify-between">
                        <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                          <img src={refEx.img} alt={refEx.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-3.5 space-y-1">
                          <h4 className="font-bold text-xs text-foreground">{refEx.name}</h4>
                          <p className="text-[9px] text-muted-foreground leading-snug">
                            <strong>Includes:</strong> {refEx.useCase}
                          </p>
                          <p className="text-[8px] text-amber-500 font-semibold bg-amber-500/5 py-0.5 px-1.5 rounded inline-block">
                            💡 {refEx.tip}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Direct Action Redirect Button Below Examples */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/60 bg-muted/20 p-5 rounded-2xl">
                  <div className="text-left space-y-1">
                    <h4 className="font-bold text-xs text-foreground">Ready to start preserving your milestones?</h4>
                    <p className="text-[10px] text-muted-foreground">Continue to customize your keepsake shape, sizes, decorative foils, and delivery details.</p>
                  </div>
                  <button
                    onClick={nextStep}
                    className="w-full sm:w-auto px-8 py-3 bg-[#c8a165] hover:bg-[#d8b175] text-[#3d2712] rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.01] transition-all cursor-pointer font-semibold"
                  >
                    Continue to Place Order
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Category */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="font-display text-2xl font-bold mb-1.5 text-foreground">
                    Select Preservation Category
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Choose the keepsake target category you would like to preserve in epoxy blocks.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-40 transition-all cursor-pointer ${isSelected
                            ? "border-accent bg-accent/5 ring-1 ring-accent"
                            : "border-border hover:border-accent/40 bg-card"
                          }`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <div
                            className={`p-2.5 rounded-xl ${isSelected ? "bg-accent text-accent-foreground shadow-sm" : "bg-muted text-muted-foreground"}`}
                          >
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          {isSelected && (
                            <div className="h-5 w-5 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-[10px] font-bold">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-foreground">{cat.label}</h4>
                          <p className="text-[10px] text-muted-foreground mt-1 leading-snug line-clamp-2">
                            {cat.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Item details */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="font-display text-2xl font-bold mb-1.5 text-foreground">
                    Item Particulars
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Describe your keepsake, its occasion and drying/inclusions specifications.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-5 text-xs">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g. Wedding Bridal Roses, Rocky's collar"
                      required
                      className="mt-1.5 w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Occasion Type
                    </label>
                    <select
                      value={occasionType}
                      onChange={(e) => setOccasionType(e.target.value)}
                      className="mt-1.5 w-full px-4.5 py-3 rounded-xl bg-background border border-border outline-none text-xs cursor-pointer"
                    >
                      {OCCASIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Expected Date of Event / Delivery
                    </label>
                    <input
                      type="date"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                      className="mt-1.5 w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Detailed Description *
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Describe raw flower colors, freshness, and keepsakes layout arrangement goals..."
                      required
                      className="mt-1.5 w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Special Instructions
                    </label>
                    <textarea
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      rows={3}
                      placeholder="e.g. Please preserve the ribbons, or keep the stems intact..."
                      className="mt-1.5 w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Reference image uploads */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="font-display text-2xl font-bold mb-1.5 text-foreground">
                    Upload Reference Photos
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Attach reference images, bouquet arrangement styles, or raw keepsakes photos.
                    Supported format: JPG, PNG, WEBP.
                  </p>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer ${dragActive
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent bg-background"
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                  <UploadCloud className="h-10 w-10 text-accent mx-auto mb-3 animate-bounce" />
                  <h4 className="text-sm font-semibold">Drag & Drop references here</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse files from device
                  </p>
                </div>

                {uploading && (
                  <p className="text-xs text-accent font-semibold animate-pulse text-center">
                    Processing uploads...
                  </p>
                )}

                {images.length > 0 && (
                  <div className="space-y-3 pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Uploaded References ({images.length})
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                      {images.map((img, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-square rounded-2xl overflow-hidden border border-border group bg-muted"
                        >
                          <img src={img} alt="" className="h-full w-full object-cover" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(idx);
                            }}
                            className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-rose-500 rounded-full text-white cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Product Design mold shape */}
            {step === 5 && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <div>
                  <h2 className="font-display text-2xl font-bold mb-1.5 text-foreground">
                    Mold Geometry & Dimensions
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Select the physical casting borders parameters for the optical block.
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-accent mb-3">
                      Target Shape Select
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {SHAPES.map((s) => {
                        const Icon = s.icon;
                        const isSelected = shape === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setShape(s.id)}
                            className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer ${isSelected
                                ? "border-accent bg-accent/5 ring-1 ring-accent font-bold"
                                : "border-border hover:border-accent/40 bg-card"
                              }`}
                          >
                            <Icon
                              className={`h-5 w-5 mb-2 ${isSelected ? "text-accent" : "text-muted-foreground"}`}
                            />
                            <span className="text-xs text-foreground font-semibold">{s.label}</span>
                            <span className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1">
                              {s.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-accent mb-3">
                      Target Size Select
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {SIZES.map((sz) => (
                        <button
                          key={sz.id}
                          onClick={() => setSize(sz.id)}
                          className={`p-3 rounded-xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${size === sz.id
                              ? "border-accent bg-accent/5 ring-1 ring-accent font-bold"
                              : "border-border hover:border-accent/40 bg-card"
                            }`}
                        >
                          <span className="text-xs text-foreground font-semibold leading-tight">
                            {sz.label}
                          </span>
                          <span className="text-[8px] text-muted-foreground leading-snug line-clamp-2 mt-2">
                            {sz.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Customizations */}
            {step === 6 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="font-display text-2xl font-bold mb-1.5 text-foreground">
                    Customization Elements
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Select premium inclusions and lamps bases to match your theme.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {[
                    {
                      state: nameEngraving,
                      setter: setNameEngraving,
                      label: "Name Inscription",
                      desc: "Embed customized client names prints.",
                    },
                    {
                      state: dateEngraving,
                      setter: setDateEngraving,
                      label: "Date Inscription",
                      desc: "Add wedding/anniversary dates.",
                    },
                    {
                      state: messageEngraving,
                      setter: setMessageEngraving,
                      label: "Short Message",
                      desc: "Engrave short memory remarks.",
                    },
                    {
                      state: goldFlakes,
                      setter: setGoldFlakes,
                      label: "Gold Foil Flakes",
                      desc: "Embed golden reflective foils.",
                    },
                    {
                      state: silverFlakes,
                      setter: setSilverFlakes,
                      label: "Silver Foil Flakes",
                      desc: "Embed silver metallic flakes.",
                    },
                    {
                      state: glitter,
                      setter: setGlitter,
                      label: "Glitter Shimmer",
                      desc: "Include subtle shimmer layers.",
                    },
                    {
                      state: ledBase,
                      setter: setLedBase,
                      label: "LED Lamp Stand",
                      desc: "Illuminating wood lamp base.",
                    },
                    {
                      state: photoInclusion,
                      setter: setPhotoInclusion,
                      label: "Photo inclusion",
                      desc: "Embed physical photo print.",
                    },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => item.setter((prev) => !prev)}
                      className={`p-4 rounded-2xl border text-left flex gap-2.5 items-start transition-all cursor-pointer ${item.state
                          ? "border-accent bg-accent/5 ring-1 ring-accent"
                          : "border-border hover:border-accent/40 bg-card"
                        }`}
                    >
                      <div
                        className={`h-4 w-4 rounded border shrink-0 mt-0.5 flex items-center justify-center text-white text-[9px] ${item.state ? "bg-accent border-accent" : "border-muted-foreground/60"
                          }`}
                      >
                        {item.state && <Check className="h-3.5 w-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-foreground leading-snug">
                          {item.label}
                        </h4>
                        <p className="text-[9px] text-muted-foreground mt-0.5 leading-snug">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-3 text-xs">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1.5">
                    Color theme request
                  </label>
                  <input
                    type="text"
                    value={colorTheme}
                    onChange={(e) => setColorTheme(e.target.value)}
                    placeholder="e.g. Pastels, Warm gold inclusions, Emerald and White background"
                    className="w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                  />
                </div>
              </div>
            )}

            {/* Step 7: Shipping Logistics */}
            {step === 7 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="font-display text-2xl font-bold mb-1.5 text-foreground">
                    Logistics Addresses
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Select pickup address for raw material and delivery destination for casting
                    block.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-5 text-xs">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Pickup Address *
                    </label>
                    <input
                      type="text"
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      placeholder="Receiver's address to collect raw flowers"
                      required
                      className="mt-1.5 w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Destination Delivery Address *
                    </label>
                    <input
                      type="text"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Shipping destination for finished block"
                      required
                      className="mt-1.5 w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Primary Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                      required
                      className="mt-1.5 w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Alternative Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder="Emergency contact"
                      required
                      className="mt-1.5 w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 8: Final Review */}
            {step === 8 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="font-display text-2xl font-bold mb-1.5 text-foreground">
                    Review & Submit
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Verify your specifications before sending inquiry to matching global artisans.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6 p-5 border border-border bg-muted/10 rounded-2xl text-xs leading-relaxed">
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                        Preservation category
                      </span>
                      <span className="text-sm font-bold text-foreground">{category}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                        Keepsake Name
                      </span>
                      <span className="text-sm font-semibold text-foreground">{itemName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                        Target Mold & Dimension
                      </span>
                      <span className="text-foreground">
                        {shape} Mold · Size: {size}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                        Occasion Details
                      </span>
                      <span className="text-foreground">
                        {occasionType} Occasion {expectedDate && `· Delivery Date: ${expectedDate}`}
                      </span>
                    </div>
                    {description && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                          Description Particulars
                        </span>
                        <p className="text-muted-foreground leading-relaxed mt-1">{description}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                        Custom Add-on Options
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {nameEngraving && (
                          <span className="bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded text-[9px] font-bold">
                            Names Inscribed
                          </span>
                        )}
                        {dateEngraving && (
                          <span className="bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded text-[9px] font-bold">
                            Dates Inscribed
                          </span>
                        )}
                        {messageEngraving && (
                          <span className="bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded text-[9px] font-bold">
                            Msg Inscribed
                          </span>
                        )}
                        {goldFlakes && (
                          <span className="bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded text-[9px] font-bold">
                            Gold Foils
                          </span>
                        )}
                        {silverFlakes && (
                          <span className="bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded text-[9px] font-bold">
                            Silver Foils
                          </span>
                        )}
                        {glitter && (
                          <span className="bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded text-[9px] font-bold">
                            Glitter
                          </span>
                        )}
                        {ledBase && (
                          <span className="bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded text-[9px] font-bold">
                            LED Lamp Stand
                          </span>
                        )}
                        {photoInclusion && (
                          <span className="bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded text-[9px] font-bold">
                            Photo Included
                          </span>
                        )}
                      </div>
                      {colorTheme && (
                        <p className="text-[9px] mt-2 text-muted-foreground">
                          Color Palette: <strong>{colorTheme}</strong>
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                        Logistics Addresses
                      </span>
                      <p className="text-foreground">
                        <strong>Pickup:</strong> {pickupAddress}
                      </p>
                      <p className="text-foreground">
                        <strong>Shipping:</strong> {shippingAddress}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Primary: {contactNumber} · Alt: {emergencyContact}
                      </p>
                    </div>
                  </div>
                </div>

                {!user && (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 text-amber-500 text-center text-xs rounded-xl flex items-center justify-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>
                      Please{" "}
                      <Link to="/auth" className="underline font-bold">
                        Sign In
                      </Link>{" "}
                      to submit your request inquiry.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex justify-between items-center gap-4">
            <button
              onClick={prevStep}
              disabled={step === 1}
              className="px-6 py-2.5 rounded-full border border-border text-xs font-semibold hover:bg-muted disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            {step < 8 ? (
              <button
                onClick={nextStep}
                disabled={
                  (step === 2 && !category) ||
                  (step === 3 && (!itemName || !description)) ||
                  (step === 5 && (!shape || !size)) ||
                  (step === 7 &&
                    (!pickupAddress || !shippingAddress || !contactNumber || !emergencyContact))
                }
                className="px-6 py-2.5 bg-primary text-primary-foreground disabled:opacity-40 hover:bg-foreground transition-all rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => submitRequest.mutate()}
                disabled={submitRequest.isPending || !user}
                className="px-8 py-3 bg-accent hover:bg-foreground text-accent-foreground hover:text-background disabled:opacity-40 transition-all rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {submitRequest.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin animate-pulse" /> Submitting Request...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4.5 w-4.5 fill-current" /> Submit Quote Inquiry
                  </>
                )}
              </button>
            )}
          </div>
        </section>
      )}
    </PageShell>
  );
}
