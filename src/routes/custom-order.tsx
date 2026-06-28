import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { PageShell } from "@/layouts/PageShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { uploadToCloudinary } from "@/services/cloudinary";
import {
  Loader2,
  Check,
  Sparkles,
  UploadCloud,
  X,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Layers,
  Heart,
  Palette,
  Truck,
} from "lucide-react";

export const Route = createFileRoute("/custom-order")({
  head: () => ({
    meta: [
      { title: "Design Custom Resin Art — ViaCraft" },
      {
        name: "description",
        content:
          "Submit a custom request for geode trays, coasters, initial keychains, or floral inserts to expert independent artisans.",
      },
    ],
  }),
  component: CustomOrderPage,
});

const CUSTOM_STYLES = [
  {
    id: "Coaster Set",
    label: "Floral Coaster Set",
    desc: "4 or 6 piece premium botanical tea coasters.",
  },
  {
    id: "Serving Tray",
    label: "Luxury Serving Tray",
    desc: "Large geode resin tray with metal handles.",
  },
  {
    id: "Alphabet Keychain",
    label: "Initial Alphabet Locket",
    desc: "A-Z customizable dried flower initial charms.",
  },
  {
    id: "Resin Pyramid",
    label: "Orgonite Pyramid Block",
    desc: "Visual layers of gold foils, crystals, and flowers.",
  },
  {
    id: "Wall Hanging",
    label: "Resin Geode Wall Decor",
    desc: "Stunning wall art geode patterns with crushed glass.",
  },
  {
    id: "Resin Frame Set",
    label: "Custom Arched Frame Set",
    desc: "Arched tabletop resin frames preserving flowers, photographs, pet mementos or memorials.",
  },
];

function CustomOrderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [styleId, setStyleId] = useState("");
  const [inclusions, setInclusions] = useState<string[]>([]);
  const [customText, setCustomText] = useState("");
  const [description, setDescription] = useState("");
  const [colorTheme, setColorTheme] = useState("");

  // Logistics
  const [shippingAddress, setShippingAddress] = useState("");
  const [phone, setPhone] = useState("");

  // Upload refs
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nextStep = () => setStep((s) => Math.min(5, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const toggleInclusion = (inc: string) => {
    if (inclusions.includes(inc)) {
      setInclusions((prev) => prev.filter((i) => i !== inc));
    } else {
      setInclusions((prev) => [...prev, inc]);
    }
  };

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

  const submitCustomRequest = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate({ to: "/auth" });
        throw new Error("Sign in first");
      }

      const randomId = Math.floor(100000 + Math.random() * 900000);
      const reqNumber = `REQ-CUST-${randomId}`;

      const notesPayload = {
        item_name: `Custom ${styleId}`,
        occasion_type: "Custom Order",
        expected_delivery_date: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
        special_instructions:
          inclusions.join(", ") + (customText ? ` | Inscription: ${customText}` : ""),
        customizations: {
          styleId,
          inclusions,
          customText,
          colorTheme,
        },
        shipping: {
          shippingAddress,
          contactNumber: phone,
        },
        quotation_count: 0,
      };

      // Reuse preservation_requests database table for custom requests
      const { data, error } = await supabase
        .from("preservation_requests")
        .insert({
          request_number: reqNumber,
          user_id: user.id,
          preservation_type: "Custom Keepsake",
          description: description,
          shape: styleId,
          size: "Custom Size",
          reference_images: images,
          notes: JSON.stringify(notesPayload),
          current_stage: "submitted",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Custom order inquiry ${data.request_number} submitted!`);
      // Add copy to fallback platform requests for dashboard review
      try {
        const stored = localStorage.getItem("fallback_platform_requests");
        const list = stored ? JSON.parse(stored) : [];
        list.push(data);
        localStorage.setItem("fallback_platform_requests", JSON.stringify(list));
      } catch (e) {
        console.error(e);
      }
      navigate({ to: `/preservation/${data.id}` });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PageShell>
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-12 animate-in fade-in duration-300">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent font-semibold mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        {/* Heading */}
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 fill-current" /> Premium Customizer
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-foreground mt-4">
            Design Your Custom Resin Art
          </h1>
          <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">
            Configure your custom geode boards, coaster set or keychains and receive custom bids.
          </p>
        </div>

        {/* Wizard Steps indicator */}
        <div className="mb-10 max-w-md mx-auto select-none">
          <div className="flex justify-between text-[10px] font-bold text-muted-foreground/60 mb-2 uppercase tracking-wide">
            <span>Step {step} of 5</span>
            <span>
              {step === 1 && "Product Style"}
              {step === 2 && "Decorative Inclusions"}
              {step === 3 && "Reference Images"}
              {step === 4 && "Specifications & Address"}
              {step === 5 && "Review Inquiry"}
            </span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Wizard body container */}
        <div className="bg-card border border-border shadow-luxe rounded-3xl p-6 sm:p-10 mb-8 min-h-[350px]">
          {/* Step 1: Style Selection */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="font-display text-2xl font-bold mb-1.5 flex items-center gap-2">
                  <Layers className="h-5.5 w-5.5 text-accent" /> Select Product Style
                </h2>
                <p className="text-xs text-muted-foreground">
                  Select the physical resin structure base style you would like to design.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {CUSTOM_STYLES.map((style) => {
                  const isSelected = styleId === style.id;
                  return (
                    <button
                      key={style.id}
                      onClick={() => setStyleId(style.id)}
                      className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-36 transition-all cursor-pointer ${
                        isSelected
                          ? "border-accent bg-accent/5 ring-1 ring-accent"
                          : "border-border hover:border-accent/40 bg-card"
                      }`}
                    >
                      {isSelected && (
                        <div className="self-end h-5 w-5 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-[10px] font-bold">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      <div className="mt-auto">
                        <h4 className="font-bold text-xs text-foreground leading-snug">
                          {style.label}
                        </h4>
                        <p className="text-[9px] text-muted-foreground mt-1 leading-snug line-clamp-2">
                          {style.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Decorative inclusions */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="font-display text-2xl font-bold mb-1.5 flex items-center gap-2">
                  <Palette className="h-5.5 w-5.5 text-accent" /> Inclusions & Colors
                </h2>
                <p className="text-xs text-muted-foreground">
                  Select what materials should be cast inside the resin block layers.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  "Gold Foil Flakes",
                  "Silver Foil Flakes",
                  "Crushed Geode Glass",
                  "Dried Red Roses",
                  "Preserved Gypsophila",
                  "Iridescent Shimmer",
                  "Hand-painted Ink",
                  "Natural Wood Logs",
                ].map((inc) => {
                  const isSelected = inclusions.includes(inc);
                  return (
                    <button
                      key={inc}
                      onClick={() => toggleInclusion(inc)}
                      className={`p-4 rounded-xl border text-center transition-all cursor-pointer text-xs font-semibold ${
                        isSelected
                          ? "border-accent bg-accent/10 text-accent font-bold"
                          : "border-border hover:border-accent/30 bg-card"
                      }`}
                    >
                      {inc}
                    </button>
                  );
                })}
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-4 text-xs">
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1.5">
                    Color palette request
                  </label>
                  <input
                    type="text"
                    value={colorTheme}
                    onChange={(e) => setColorTheme(e.target.value)}
                    placeholder="e.g. Navy blue base with gold trails"
                    className="w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1.5">
                    Custom engraved text (if any)
                  </label>
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="e.g. Happy Anniversary Rhea & Sid"
                    className="w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Reference image upload */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="font-display text-2xl font-bold mb-1.5 flex items-center gap-2">
                  Reference Images
                </h2>
                <p className="text-xs text-muted-foreground">
                  Attach reference design screenshots or pictures representing your geode or
                  coasters arrangement theme.
                </p>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-3xl p-10 text-center hover:border-accent bg-background cursor-pointer transition-all"
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
                <p className="text-xs text-muted-foreground mt-1">or click to browse from device</p>
              </div>

              {uploading && (
                <p className="text-xs text-accent font-semibold animate-pulse text-center">
                  Uploading references...
                </p>
              )}

              {images.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Uploaded Photos ({images.length})
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative h-20 w-20 rounded-xl overflow-hidden border border-border shrink-0 bg-muted"
                      >
                        <img src={img} alt="" className="h-full w-full object-cover" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setImages((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1 right-1 p-0.5 bg-black/60 text-white rounded-full hover:bg-rose-500 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Notes and addresses */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="font-display text-2xl font-bold mb-1.5 flex items-center gap-2">
                  Specifications & Shipping
                </h2>
                <p className="text-xs text-muted-foreground">
                  Describe your custom layout requests and set shipping details.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-5 text-xs">
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Custom Order Notes *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Provide detailed dimensions, number of coaster pieces, handle styles, or wood logs placement preferences..."
                    required
                    className="mt-1.5 w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Delivery Destination Address *
                  </label>
                  <input
                    type="text"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Receiver's address to deliver final resin piece"
                    required
                    className="mt-1.5 w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Contact Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    required
                    className="mt-1.5 w-full px-4.5 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review & Submit */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="font-display text-2xl font-bold mb-1.5 flex items-center gap-2">
                  Review Specifications
                </h2>
                <p className="text-xs text-muted-foreground">
                  Confirm details before submitting your custom design inquiry to matching artisans.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 p-5 border border-border bg-muted/10 rounded-2xl text-xs leading-relaxed">
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                      Custom Product Style
                    </span>
                    <span className="text-sm font-bold text-foreground">{styleId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                      Color Theme Theme
                    </span>
                    <span className="text-foreground">{colorTheme || "—"}</span>
                  </div>
                  {customText && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                        Engraved Inscription
                      </span>
                      <span className="text-foreground font-semibold">"{customText}"</span>
                    </div>
                  )}
                  {description && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                        Casting Notes
                      </span>
                      <p className="text-muted-foreground mt-1 leading-relaxed">{description}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                      Selected Inclusions
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {inclusions.map((inc) => (
                        <span
                          key={inc}
                          className="bg-accent/15 border border-accent/25 text-accent px-2 py-0.5 rounded text-[9px] font-bold"
                        >
                          {inc}
                        </span>
                      ))}
                      {inclusions.length === 0 && (
                        <span className="text-slate-400 italic">None selected</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                      Delivery logistics
                    </span>
                    <p className="text-foreground">
                      <strong>Destination:</strong> {shippingAddress}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">Contact Phone: {phone}</p>
                  </div>
                </div>
              </div>

              {!user && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 text-amber-500 text-center text-xs rounded-xl flex items-center justify-center gap-1.5">
                  <ShieldCheck className="h-4.5 w-4.5" />
                  <span>
                    Please{" "}
                    <Link to="/auth" className="underline font-bold">
                      Sign In
                    </Link>{" "}
                    to submit custom order quote inquiries.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="flex justify-between items-center gap-4">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className="px-6 py-2.5 rounded-full border border-border text-xs font-semibold hover:bg-muted disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          {step < 5 ? (
            <button
              onClick={nextStep}
              disabled={
                (step === 1 && !styleId) ||
                (step === 2 && inclusions.length === 0) ||
                (step === 4 && (!description || !shippingAddress || !phone))
              }
              className="px-6 py-2.5 bg-primary text-primary-foreground disabled:opacity-40 hover:bg-foreground transition-all rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => submitCustomRequest.mutate()}
              disabled={submitCustomRequest.isPending || !user}
              className="px-8 py-3 bg-accent hover:bg-foreground text-accent-foreground hover:text-background disabled:opacity-40 transition-all rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {submitCustomRequest.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting Request...
                </>
              ) : (
                <>
                  <Sparkles className="h-4.5 w-4.5 fill-current" /> Submit Custom Request
                </>
              )}
            </button>
          )}
        </div>
      </section>
    </PageShell>
  );
}
