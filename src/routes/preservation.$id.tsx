import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { preservationDb, Quotation, StageLog } from "@/api/preservation-db";
import { PageShell } from "@/layouts/PageShell";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { inr } from "@/utils/format";
import { CloudinaryUpload } from "@/components/ui/CloudinaryUpload";
import {
  sendQuoteReceivedEmail,
  sendPreservationStageUpdateEmail,
} from "@/api/email.functions";
import {
  Loader2,
  Check,
  Calendar,
  Sparkles,
  MessageSquare,
  DollarSign,
  Heart,
  ChevronRight,
  TrendingUp,
  MapPin,
  Clock,
  ArrowRight,
  Upload,
  User,
  Store,
  ShieldCheck,
  ChevronDown,
  Trash2,
  Send,
  Image,
  Award,
  AlertTriangle,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/preservation/$id")({
  head: () => ({
    meta: [{ title: "Preservation Request Details — ViaCraft" }],
  }),
  component: PreservationDetailsPage,
});

// Display stages map (12 stages requested by user)
const DISPLAY_STAGES = [
  { id: "submitted", label: "Request Submitted" },
  { id: "vendor_selected", label: "Vendor Selected" },
  { id: "consultation", label: "Consultation" },
  { id: "item_received", label: "Item Received" },
  { id: "cleaning", label: "Cleaning Process" },
  { id: "drying", label: "Drying Process" },
  { id: "casting", label: "Resin Casting" },
  { id: "finishing", label: "Finishing" },
  { id: "quality_check", label: "Quality Check" },
  { id: "ready_to_ship", label: "Ready To Ship" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
];

function PreservationDetailsPage() {
  const { id } = Route.useParams() as { id: string };
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Selected state for active views
  const [selectedTab, setSelectedTab] = useState<"details" | "quotes" | "timeline" | "chat">(
    "details",
  );
  const [vendorQuoteInput, setVendorQuoteInput] = useState({
    price: "",
    shipping: "",
    deliveryDays: "14",
    message: "",
    terms: "",
    samples: "",
  });

  // Progress log update input (for Vendor)
  const [progressStage, setProgressStage] = useState("consultation");
  const [progressNote, setProgressNote] = useState("");
  const [progressImageUrl, setProgressImageUrl] = useState("");
  const [sendAsChatMessage, setSendAsChatMessage] = useState(true);

  // Chat message input
  const [chatMessageText, setChatMessageText] = useState("");
  const [chatImageInput, setChatImageInput] = useState("");

  // Payment simulation state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedQuoteForPayment, setSelectedQuoteForPayment] = useState<Quotation | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  // Fetch request data
  const { data: request, isLoading: isLoadingRequest } = useQuery({
    queryKey: ["preservation-request", id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("preservation_requests")
          .select("*, vendors(*)")
          .eq("id", id)
          .single();
        if (error) {
          if (
            error.code === "PGRST116" ||
            error.message.includes("does not exist") ||
            error.message.includes("row")
          ) {
            return await getFallbackRequest(id);
          }
          throw error;
        }
        return data;
      } catch (err) {
        console.warn("Using fallback request loader:", err);
        return await getFallbackRequest(id);
      }
    },
  });

  const getFallbackRequest = async (reqId: string) => {
    const stored = localStorage.getItem("fallback_platform_requests");
    if (!stored) return null;
    const list = JSON.parse(stored);
    const req = list.find((r: any) => r.id === reqId) || null;
    if (req && req.vendor_id && !req.vendors) {
      try {
        const { data: vendorData } = await supabase
          .from("vendors")
          .select("*")
          .eq("id", req.vendor_id)
          .maybeSingle();
        if (vendorData) {
          req.vendors = vendorData;
        }
      } catch (e) {
        console.error("Failed to load vendor for fallback request", e);
      }
    }
    return req;
  };
  // Fetch quotes
  const { data: quotations = [], refetch: refetchQuotes } = useQuery({
    queryKey: ["preservation-quotes", id],
    enabled: !!request,
    queryFn: () => preservationDb.getQuotations(id),
  });

  // Fetch stage logs
  const { data: stageLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["preservation-stage-logs", id],
    enabled: !!request,
    queryFn: () => preservationDb.getStageLogs(id),
  });

  // Fetch vendor detail (if user is vendor)
  const { data: currentVendor } = useQuery({
    queryKey: ["vendor-profile-brief", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  // Check roles
  const { data: userRole } = useQuery({
    queryKey: ["my-role-details", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.role || "customer";
    },
  });

  // Chat query
  const targetChatVendorId =
    request?.vendor_id || selectedQuoteForPayment?.vendor_id || quotations[0]?.vendor_id;
  const { data: chatMessages = [], refetch: refetchChat } = useQuery({
    queryKey: ["preservation-chats", id, targetChatVendorId],
    enabled: !!request && !!targetChatVendorId,
    queryFn: () => preservationDb.getChatMessages(targetChatVendorId!, request.user_id),
    refetchInterval: 3000, // Poll every 3 seconds for simulated real-time chats
  });

  const isVendor = currentVendor !== null && currentVendor !== undefined;
  const isAdmin = userRole === "admin";
  const isOwner = user?.id === request?.user_id;

  // Submit quote (for Vendors)
  const submitQuoteMutation = useMutation({
    mutationFn: async () => {
      if (!currentVendor) throw new Error("Only approved vendors can bid");
      return preservationDb.submitQuotation({
        request_id: id,
        vendor_id: currentVendor.id,
        price_cents: Math.round(parseFloat(vendorQuoteInput.price) * 100),
        shipping_cost_cents: Math.round(parseFloat(vendorQuoteInput.shipping || "0") * 100),
        estimated_delivery_days: parseInt(vendorQuoteInput.deliveryDays),
        message: vendorQuoteInput.message,
        terms_conditions: vendorQuoteInput.terms,
        portfolio_samples: vendorQuoteInput.samples
          ? vendorQuoteInput.samples.split(",").map((s) => s.trim())
          : [],
      });
    },
    onSuccess: () => {
      toast.success("Quotation submitted successfully!");
      refetchQuotes();
      setSelectedTab("quotes");

      sendQuoteReceivedEmail({
        data: {
          requestId: id,
          quotePriceCents: Math.round(parseFloat(vendorQuoteInput.price) * 100),
          vendorStoreName: currentVendor?.store_name || "Artisan",
        },
      }).catch((err) => {
        console.error("Quote received email trigger failure", err);
      });
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to submit quote");
    },
  });

  // Accept quotation mutation
  const acceptQuoteMutation = useMutation({
    mutationFn: async (quote: Quotation) => {
      // 1. Update quote status in preservation_quotations
      await preservationDb.updateQuotationStatus(id, quote.vendor_id, "accepted");

      // 2. Reject all other quotes
      const others = quotations.filter((q) => q.vendor_id !== quote.vendor_id);
      for (const other of others) {
        await preservationDb.updateQuotationStatus(id, other.vendor_id, "rejected");
      }

      // 3. Update request vendor_id, quote_cents, quote_accepted, current_stage -> 'vendor_selected'
      try {
        const { error: reqErr } = await supabase
          .from("preservation_requests")
          .update({
            vendor_id: quote.vendor_id,
            quote_cents: quote.price_cents,
            quote_accepted: true,
            current_stage: "vendor_selected" as any,
          })
          .eq("id", id);

        if (reqErr) throw reqErr;
      } catch (err) {
        console.warn(
          "Database request update failed on quote accept, using local fallback update:",
          err,
        );
      }

      // Update in local storage fallback platform requests
      try {
        const stored = localStorage.getItem("fallback_platform_requests");
        if (stored) {
          const list = JSON.parse(stored);
          const idx = list.findIndex((r: any) => r.id === id);
          if (idx !== -1) {
            list[idx].vendor_id = quote.vendor_id;
            list[idx].quote_cents = quote.price_cents;
            list[idx].quote_accepted = true;
            list[idx].current_stage = "vendor_selected";
            list[idx].updated_at = new Date().toISOString();
            localStorage.setItem("fallback_platform_requests", JSON.stringify(list));
          }
        }
      } catch (err) {
        console.error("Failed to update fallback request on quote accept:", err);
      }

      // 4. Log progress stage
      await preservationDb.addStageLog(
        id,
        "vendor_selected",
        `Customer selected quotation from ${quote.vendors?.store_name || "Vendor"}.`,
        [],
      );
    },
    onSuccess: () => {
      toast.success("Quote accepted! Proceeding to advance payment.");
      qc.invalidateQueries({ queryKey: ["preservation-request", id] });
      refetchQuotes();
      refetchLogs();

      sendPreservationStageUpdateEmail({
        data: {
          requestId: id,
          stage: "vendor_selected",
          note: "Customer accepted quotation and selected artisan.",
        },
      }).catch((err) => {
        console.error("Stage update email trigger failure", err);
      });
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to accept quotation");
    },
  });

  // Vendor project update stage log
  const addStageLogMutation = useMutation({
    mutationFn: async () => {
      const imgs = progressImageUrl ? [progressImageUrl] : [];
      const log = await preservationDb.addStageLog(id, progressStage, progressNote, imgs);
      if (sendAsChatMessage && targetChatVendorId) {
        const stageLabelText =
          DISPLAY_STAGES.find((s) => s.id === progressStage)?.label || progressStage;
        const chatText = `[Project Update - ${stageLabelText}]: ${progressNote}`;
        await preservationDb.sendChatMessage(
          targetChatVendorId,
          request!.user_id,
          user!.id,
          chatText,
        );
      }
      return log;
    },
    onSuccess: () => {
      toast.success("Project tracking pipeline updated and customer notified!");

      sendPreservationStageUpdateEmail({
        data: {
          requestId: id,
          stage: progressStage,
          note: progressNote,
        },
      }).catch((err) => {
        console.error("Stage update email trigger failure", err);
      });

      setProgressNote("");
      setProgressImageUrl("");
      qc.invalidateQueries({ queryKey: ["preservation-request", id] });
      qc.invalidateQueries({ queryKey: ["preservation-chats", id, targetChatVendorId] });
      refetchLogs();
      refetchChat();
      setSelectedTab("timeline");
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to update project timeline");
    },
  });

  // Admin manually assign vendor
  const assignVendorMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      const { error } = await supabase
        .from("preservation_requests")
        .update({ vendor_id: vendorId })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vendor assigned manually by administrator.");
      qc.invalidateQueries({ queryKey: ["preservation-request", id] });
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to assign vendor");
    },
  });

  // Chat message send mutation
  const sendChatMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Log in to chat");
      if (!targetChatVendorId) throw new Error("No vendor associated with chat");

      const payloadText = chatImageInput
        ? `${chatMessageText} [Attached Photo: ${chatImageInput}]`
        : chatMessageText;
      return preservationDb.sendChatMessage(
        targetChatVendorId,
        request!.user_id,
        user.id,
        payloadText,
      );
    },
    onSuccess: () => {
      setChatMessageText("");
      setChatImageInput("");
      refetchChat();
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to send chat message");
    },
  });

  // Simulate Payment
  const handlePaymentCheckout = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setShowPaymentModal(false);

      // Update preservation request notes stating 50% advance has been paid
      toast.success("50% Advance Payment Successful! Project is now active.");

      // We update stage to "consultation" to kickstart the workflow
      preservationDb
        .addStageLog(
          id,
          "consultation",
          "Advance payment received. Commencing artisan consultation.",
          [],
        )
        .then(() => {
          qc.invalidateQueries({ queryKey: ["preservation-request", id] });
          refetchLogs();

          sendPreservationStageUpdateEmail({
            data: {
              requestId: id,
              stage: "consultation",
              note: "Advance payment received. Commencing artisan consultation.",
            },
          }).catch((err) => {
            console.error("Stage update email trigger failure", err);
          });
        });
    }, 2500);
  };

  // Convert raw notes payload to object safely
  let notesObj: any = {};
  try {
    notesObj = request?.notes ? JSON.parse(request.notes) : {};
  } catch {
    notesObj = { text: request?.notes || "" };
  }

  // Find current active stage index
  const activeStageIdx = DISPLAY_STAGES.findIndex((s) => s.id === request?.current_stage);

  // Group stage logs by stage for display in progress gallery
  const galleryImages = stageLogs.filter((log) => log.images && log.images.length > 0);

  if (isLoadingRequest) {
    return (
      <PageShell>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Loading preservation pipeline...
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!request) {
    return (
      <PageShell>
        <div className="flex h-[60vh] flex-col items-center justify-center text-center">
          <AlertTriangle className="h-12 w-12 text-rose-500 mb-4" />
          <h2 className="text-2xl font-bold">Request Not Found</h2>
          <p className="text-muted-foreground mt-2">
            The preservation request ID does not exist or you do not have permission.
          </p>
          <Link to="/dashboard" className="mt-6 text-indigo-500 font-semibold hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-6 py-12 space-y-8 animate-in fade-in duration-300">
        {/* Completion Success Banner */}
        {request.current_stage === "delivered" && (
          <div className="p-6 md:p-8 rounded-3xl border border-emerald-500/25 bg-emerald-500/5 backdrop-blur-md text-emerald-600 dark:text-emerald-400 flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-emerald-500/5 animate-in slide-in-from-top-6 duration-300">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl">
              🎉
            </div>
            <div className="flex-1 space-y-1 text-center md:text-left">
              <h3 className="font-display text-xl font-bold">
                Preservation Keepsake Successfully Completed & Delivered!
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                Your custom memory preservation is fully complete. The flowers/keepsakes have been
                treated, dried, cast in premium optical-grade resin, polished, and securely
                delivered. Thank you for preserving your precious milestones with ViaCraft!
              </p>
            </div>
            <div className="shrink-0 flex gap-3">
              <span className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-full font-bold text-[10px] uppercase tracking-wider border border-emerald-500/20">
                Completed & Delivered
              </span>
            </div>
          </div>
        )}

        {/* Page Title & Status Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold tracking-widest bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1 rounded-lg">
                {request.request_number}
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border capitalize ${
                  request.quote_accepted
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                }`}
              >
                {request.quote_accepted ? "Active Project" : "Open For Quotations"}
              </span>
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight mt-3">
              {request.preservation_type} Preservation
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Submitted on {new Date(request.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Customer Advance Payment Button */}
          {isOwner && request.quote_accepted && request.current_stage === "vendor_selected" && (
            <button
              onClick={() => {
                const quote = quotations.find((q) => q.vendor_id === request.vendor_id);
                if (quote) {
                  setSelectedQuoteForPayment(quote);
                  setShowPaymentModal(true);
                }
              }}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-full font-bold text-xs shadow-lg shadow-indigo-600/25 flex items-center gap-2 cursor-pointer"
            >
              <DollarSign className="h-4.5 w-4.5" /> Pay 50% Advance to start
            </button>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-border gap-6">
          {[
            { id: "details", label: "Request details", icon: FileText },
            { id: "quotes", label: `Quotations (${quotations.length})`, icon: Sparkles },
            { id: "timeline", label: "Timeline & tracking", icon: Clock },
            { id: "chat", label: "Vendor chat", icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`pb-3 text-xs md:text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedTab === tab.id
                    ? "border-indigo-500 text-indigo-500"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Panel (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-8">
            {/* VIEW: DETAILS */}
            {selectedTab === "details" && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                  <h3 className="font-display text-xl font-bold">Item Specifications</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Item Name</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {notesObj.item_name || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Occasion Type</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {notesObj.occasion_type || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Casting Mold Shape</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {request.shape || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Casting Size</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {request.size || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">
                        Target Delivery Date
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {notesObj.expected_delivery_date
                          ? new Date(notesObj.expected_delivery_date).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                  </div>
                  {request.description && (
                    <div className="pt-4 border-t border-border">
                      <span className="text-xs text-muted-foreground block">
                        Customer Description
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1.5">
                        {request.description}
                      </p>
                    </div>
                  )}
                  {notesObj.special_instructions && (
                    <div className="pt-4 border-t border-border">
                      <span className="text-xs text-muted-foreground block">
                        Special Instructions
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1.5">
                        {notesObj.special_instructions}
                      </p>
                    </div>
                  )}
                </div>

                {/* Customizations Card */}
                <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                  <h3 className="font-display text-xl font-bold">Customizations</h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {/* Preservation Customizations */}
                    {notesObj.customizations?.nameEngraving && (
                      <span className="bg-indigo-500/10 text-indigo-500 px-3 py-1 rounded-full border border-indigo-500/20">
                        Name Engraved
                      </span>
                    )}
                    {notesObj.customizations?.dateEngraving && (
                      <span className="bg-indigo-500/10 text-indigo-500 px-3 py-1 rounded-full border border-indigo-500/20">
                        Date Engraved
                      </span>
                    )}
                    {notesObj.customizations?.messageEngraving && (
                      <span className="bg-indigo-500/10 text-indigo-500 px-3 py-1 rounded-full border border-indigo-500/20">
                        Message Engraved
                      </span>
                    )}
                    {notesObj.customizations?.goldFlakes && (
                      <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full border border-amber-500/20">
                        Gold Flakes
                      </span>
                    )}
                    {notesObj.customizations?.silverFlakes && (
                      <span className="bg-slate-500/10 text-slate-500 px-3 py-1 rounded-full border border-slate-500/20">
                        Silver Flakes
                      </span>
                    )}
                    {notesObj.customizations?.glitter && (
                      <span className="bg-purple-500/10 text-purple-500 px-3 py-1 rounded-full border border-purple-500/20">
                        Glitter Shimmer
                      </span>
                    )}
                    {notesObj.customizations?.ledBase && (
                      <span className="bg-rose-500/10 text-rose-500 px-3 py-1 rounded-full border border-rose-500/20">
                        LED Lamp Stand Base
                      </span>
                    )}
                    {notesObj.customizations?.photoInclusion && (
                      <span className="bg-teal-500/10 text-teal-500 px-3 py-1 rounded-full border border-teal-500/20">
                        Photo Embedded
                      </span>
                    )}

                    {/* Custom Order Inclusions */}
                    {Array.isArray(notesObj.customizations?.inclusions) &&
                      notesObj.customizations.inclusions.map((inc: string) => (
                        <span
                          key={inc}
                          className="bg-purple-500/10 text-purple-500 px-3 py-1 rounded-full border border-purple-500/20 font-semibold"
                        >
                          {inc}
                        </span>
                      ))}
                  </div>

                  {notesObj.customizations?.styleId && (
                    <div className="pt-2.5 border-t border-border/40 mt-3 text-xs space-y-1">
                      <p className="text-muted-foreground">
                        Selected Base Style:{" "}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {notesObj.customizations.styleId}
                        </strong>
                      </p>
                    </div>
                  )}
                  {notesObj.customizations?.customText && (
                    <div className="text-xs space-y-1">
                      <p className="text-muted-foreground">
                        Custom Inscription:{" "}
                        <strong className="text-slate-800 dark:text-slate-200">
                          "{notesObj.customizations.customText}"
                        </strong>
                      </p>
                    </div>
                  )}
                  {notesObj.customizations?.colorTheme && (
                    <div className="text-xs space-y-1">
                      <p className="text-muted-foreground">
                        Color Theme:{" "}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {notesObj.customizations.colorTheme}
                        </strong>
                      </p>
                    </div>
                  )}
                </div>

                {/* Uploaded References */}
                {request.reference_images && (request.reference_images as string[]).length > 0 && (
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                    <h3 className="font-display text-xl font-bold">Reference Images</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {(request.reference_images as string[]).map((img, idx) => (
                        <div
                          key={idx}
                          className="aspect-square bg-muted rounded-xl border border-border overflow-hidden"
                        >
                          <img
                            src={img}
                            alt="Reference"
                            className="h-full w-full object-cover hover:scale-105 transition-transform"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW: QUOTATIONS (Comparison marketplace) */}
            {selectedTab === "quotes" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display text-xl font-bold">Active Artisan Quotations</h3>
                  <span className="text-xs text-muted-foreground">
                    {quotations.length} bids received
                  </span>
                </div>

                {/* Side-by-side comparison board */}
                <div className="grid md:grid-cols-2 gap-6">
                  {quotations.map((quote) => {
                    const isSelected =
                      request.vendor_id === quote.vendor_id && request.quote_accepted;
                    const isShortlisted = quote.status === "shortlisted";
                    return (
                      <div
                        key={quote.id}
                        className={`bg-card rounded-2xl border p-5 flex flex-col justify-between hover:shadow-xl transition-all relative ${
                          isSelected
                            ? "border-emerald-500 ring-2 ring-emerald-500/20"
                            : isShortlisted
                              ? "border-indigo-500"
                              : "border-border"
                        }`}
                      >
                        {quote.vendors?.user_id === user?.id && (
                          <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded bg-indigo-500 text-white text-[9px] font-bold uppercase tracking-wider">
                            Your Bid
                          </div>
                        )}
                        <div>
                          {/* Vendor info header */}
                          <div className="flex justify-between items-start gap-4 pb-4 border-b border-border">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-500 border border-indigo-200 flex items-center justify-center font-bold">
                                {quote.vendors?.logo_url ? (
                                  <img
                                    src={quote.vendors.logo_url}
                                    alt=""
                                    className="h-full w-full object-cover rounded-xl"
                                  />
                                ) : (
                                  <Store className="h-5 w-5" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                                    {quote.vendors?.store_name || "Artisan Shop"}
                                  </h4>
                                  <span
                                    className="bg-indigo-500/10 text-indigo-500 p-0.5 rounded-full"
                                    title="Verified Artisan"
                                  >
                                    <Award className="h-3 w-3" />
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                                    ★ {quote.vendors?.rating || "5.0"}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground">
                                    32 Projects
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-extrabold text-lg text-indigo-600 dark:text-indigo-400">
                                {inr(quote.price_cents)}
                              </p>
                              <p className="text-[9px] text-muted-foreground">
                                + {inr(quote.shipping_cost_cents)} shipping
                              </p>
                            </div>
                          </div>

                          {/* Message and conditions */}
                          <div className="py-4 space-y-2 text-xs">
                            <p className="text-slate-600 dark:text-slate-400 italic font-medium leading-relaxed">
                              "{quote.message || "No customized proposal message attached."}"
                            </p>
                            {quote.terms_conditions && (
                              <p className="text-[10px] text-slate-500">
                                <strong>Terms:</strong> {quote.terms_conditions}
                              </p>
                            )}
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-2">
                              <span>Estimated Completion:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {quote.estimated_delivery_days} days
                              </span>
                            </div>
                          </div>

                          {/* Portfolio media */}
                          {quote.portfolio_samples && quote.portfolio_samples.length > 0 && (
                            <div className="space-y-1.5 py-2">
                              <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">
                                Artist Samples
                              </span>
                              <div className="flex gap-1.5 overflow-x-auto pb-1">
                                {quote.portfolio_samples.map((url, i) => (
                                  <img
                                    key={i}
                                    src={url}
                                    alt="Sample"
                                    className="h-10 w-10 object-cover rounded-lg border border-border"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Customer Actions */}
                        {isOwner && !request.quote_accepted && (
                          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border">
                            <button
                              onClick={() => {
                                setSelectedQuoteForPayment(quote);
                                acceptQuoteMutation.mutate(quote);
                              }}
                              className="py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-[11px] shadow hover:shadow-md transition-all cursor-pointer text-center"
                            >
                              Accept Quote
                            </button>
                            <button
                              onClick={() => {
                                preservationDb.updateQuotationStatus(
                                  id,
                                  quote.vendor_id,
                                  "rejected",
                                );
                                toast.info("Quotation declined");
                                refetchQuotes();
                              }}
                              className="py-2 rounded-xl border border-border text-muted-foreground hover:bg-rose-500/5 hover:text-rose-500 font-semibold text-[11px] transition-all cursor-pointer text-center"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {quotations.length === 0 && (
                    <div className="col-span-2 py-16 text-center text-muted-foreground italic border border-dashed border-border rounded-3xl bg-muted/5">
                      <Sparkles className="h-10 w-10 text-slate-400 mx-auto mb-4 animate-pulse" />
                      <h4>No bids submitted yet</h4>
                      <p className="text-xs mt-1 text-slate-400">
                        Artisans will review and bid on your request shortly.
                      </p>
                    </div>
                  )}
                </div>

                {/* Vendor Bid Submission Form (Only visible to Vendors matching the expertise tags) */}
                {isVendor && !request.quote_accepted && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitQuoteMutation.mutate();
                    }}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 text-white mt-12 shadow-2xl shadow-indigo-500/5 animate-in slide-in-from-bottom-6 duration-300"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                        Vendor Quotation Panel
                      </span>
                      <h3 className="font-display text-xl font-bold mt-4">
                        Submit Your Artisan Bid
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Pitch your price, timeline, and terms to the customer for this preservation
                        block.
                      </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Casting Cost Quote (₹)
                        </label>
                        <input
                          type="number"
                          required
                          value={vendorQuoteInput.price}
                          onChange={(e) =>
                            setVendorQuoteInput((prev) => ({ ...prev, price: e.target.value }))
                          }
                          placeholder="Ex: 8500"
                          className="mt-1.5 w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Courier Shipping Cost (₹)
                        </label>
                        <input
                          type="number"
                          value={vendorQuoteInput.shipping}
                          onChange={(e) =>
                            setVendorQuoteInput((prev) => ({ ...prev, shipping: e.target.value }))
                          }
                          placeholder="Ex: 450"
                          className="mt-1.5 w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Fulfillment Time (Days)
                        </label>
                        <select
                          value={vendorQuoteInput.deliveryDays}
                          onChange={(e) =>
                            setVendorQuoteInput((prev) => ({
                              ...prev,
                              deliveryDays: e.target.value,
                            }))
                          }
                          className="mt-1.5 w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                        >
                          <option value="7">7 Days</option>
                          <option value="14">14 Days</option>
                          <option value="21">21 Days</option>
                          <option value="30">30 Days</option>
                          <option value="45">45 Days</option>
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Proposal Message To Customer
                        </label>
                        <textarea
                          required
                          rows={3}
                          value={vendorQuoteInput.message}
                          onChange={(e) =>
                            setVendorQuoteInput((prev) => ({ ...prev, message: e.target.value }))
                          }
                          placeholder="Introduce your store, mention your experience with these flowers, and layout ideas..."
                          className="mt-1.5 w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Terms & Conditions
                        </label>
                        <input
                          type="text"
                          value={vendorQuoteInput.terms}
                          onChange={(e) =>
                            setVendorQuoteInput((prev) => ({ ...prev, terms: e.target.value }))
                          }
                          placeholder="e.g. Return shipping charges not included, raw bouquet transit conditions..."
                          className="mt-1.5 w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Portfolio Reference Samples (URLs, Comma separated)
                        </label>
                        <input
                          type="text"
                          value={vendorQuoteInput.samples}
                          onChange={(e) =>
                            setVendorQuoteInput((prev) => ({ ...prev, samples: e.target.value }))
                          }
                          placeholder="https://images.unsplash.com/..., https://..."
                          className="mt-1.5 w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end border-t border-slate-800">
                      <button
                        type="submit"
                        disabled={submitQuoteMutation.isPending}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
                      >
                        {submitQuoteMutation.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Submit Quotation
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* VIEW: TIMELINE & TRACKING */}
            {selectedTab === "timeline" && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                  <h3 className="font-display text-xl font-bold">Fulfillment Timeline Pipeline</h3>

                  {/* Timeline stages chart */}
                  <div className="relative border-l-2 border-border pl-6 ml-3 space-y-8">
                    {DISPLAY_STAGES.map((s, idx) => {
                      const isCompleted = idx < activeStageIdx;
                      const isActive = idx === activeStageIdx;
                      const isFuture = idx > activeStageIdx;

                      return (
                        <div key={s.id} className="relative">
                          {/* Point marker */}
                          <span
                            className={`absolute -left-[32px] top-0.5 h-4 w-4 rounded-full border-2 transition-all flex items-center justify-center ${
                              isCompleted
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : isActive
                                  ? "bg-indigo-600 border-indigo-600 ring-4 ring-indigo-500/25"
                                  : "bg-card border-border"
                            }`}
                          >
                            {isCompleted && <Check className="h-2 w-2" />}
                          </span>

                          <div>
                            <span
                              className={`text-xs font-bold capitalize ${
                                isCompleted
                                  ? "text-emerald-500"
                                  : isActive
                                    ? "text-indigo-600 dark:text-indigo-400"
                                    : "text-slate-400"
                              }`}
                            >
                              {s.label}
                            </span>

                            {/* Check corresponding log description */}
                            {stageLogs
                              .filter((log) => log.stage === s.id)
                              .map((log) => (
                                <div key={log.id} className="mt-1.5 space-y-2">
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {log.note}
                                  </p>
                                  <span className="text-[9px] text-slate-400 block">
                                    {new Date(log.created_at).toLocaleString()}
                                  </span>

                                  {/* Stage images */}
                                  {log.images && log.images.length > 0 && (
                                    <div className="flex gap-2 pt-1">
                                      {log.images.map((img, i) => (
                                        <img
                                          key={i}
                                          src={img}
                                          alt="Stage preview"
                                          className="h-16 w-24 object-cover rounded-lg border border-border"
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Progress Gallery Section */}
                {galleryImages.length > 0 && (
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                    <h3 className="font-display text-xl font-bold">Progress Gallery</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {galleryImages.map((log) =>
                        log.images.map((img, i) => (
                          <div
                            key={`${log.id}-${i}`}
                            className="group relative rounded-xl border border-border overflow-hidden bg-muted aspect-video"
                          >
                            <img
                              src={img}
                              alt=""
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white rounded text-[8px] font-bold uppercase tracking-wider">
                              {DISPLAY_STAGES.find((s) => s.id === log.stage)?.label || log.stage}
                            </div>
                          </div>
                        )),
                      )}
                    </div>
                  </div>
                )}

                {/* Vendor Stage Update Controls (Visible to the assigned vendor) */}
                {isVendor && request.vendor_id === currentVendor?.id && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      addStageLogMutation.mutate();
                    }}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 text-white shadow-xl shadow-indigo-500/5 animate-in slide-in-from-bottom-6 duration-300"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                        Artisan Project Controls
                      </span>
                      <h3 className="font-display text-xl font-bold mt-4">
                        Update Fulfillment Stage
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Upload progress logs, audit notes, and stage photos for the customer
                        tracking feed.
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Transition Pipeline Stage
                        </label>
                        <select
                          value={progressStage}
                          onChange={(e) => setProgressStage(e.target.value)}
                          className="mt-1.5 w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                        >
                          {DISPLAY_STAGES.slice(2).map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <CloudinaryUpload
                        label="Upload Stage Photo"
                        value={progressImageUrl}
                        onChange={(val) => setProgressImageUrl(val as string)}
                      />

                      <div className="md:col-span-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Audit Log Remarks / Description
                        </label>
                        <textarea
                          required
                          rows={3}
                          value={progressNote}
                          onChange={(e) => setProgressNote(e.target.value)}
                          placeholder="Explain what was done in this stage (e.g. flowers dried in silica gel for 10 days...)"
                          className="mt-1.5 w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="md:col-span-2 flex items-center gap-2 mt-1">
                        <input
                          type="checkbox"
                          id="sendAsChatMessage"
                          checked={sendAsChatMessage}
                          onChange={(e) => setSendAsChatMessage(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-800 text-indigo-600 accent-indigo-600 cursor-pointer"
                        />
                        <label
                          htmlFor="sendAsChatMessage"
                          className="text-xs text-slate-400 select-none cursor-pointer"
                        >
                          Send update text note as chat notification to customer
                        </label>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end border-t border-slate-800">
                      <button
                        type="submit"
                        disabled={addStageLogMutation.isPending}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
                      >
                        {addStageLogMutation.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Commit Stage Progress
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* VIEW: CHAT ROOM */}
            {selectedTab === "chat" && (
              <div className="bg-card border border-border rounded-2xl flex flex-col justify-between h-[550px] overflow-hidden shadow-lg animate-in fade-in duration-200">
                {/* Chat header */}
                <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      {request.vendors?.store_name
                        ? request.vendors.store_name.slice(0, 2).toUpperCase()
                        : "CH"}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs">
                        {request.vendors?.store_name || "Artisan Shop"}
                      </h4>
                      <p className="text-[9px] text-muted-foreground">
                        Context: {request.request_number} pipeline channel
                      </p>
                    </div>
                  </div>
                  <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-ping" />
                </div>

                {/* Message stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-muted/5 min-h-[300px]">
                  {chatMessages.map((msg) => {
                    const isMyMessage = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[75%] ${isMyMessage ? "ml-auto items-end" : "items-start"}`}
                      >
                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed ${
                            isMyMessage
                              ? "bg-indigo-600 text-white rounded-tr-none"
                              : "bg-card border border-border rounded-tl-none text-slate-800 dark:text-slate-100"
                          } ${msg.message_text.startsWith("[Project Update") ? "border-l-4 border-amber-500 bg-amber-500/5 dark:bg-amber-950/10" : ""}`}
                        >
                          {msg.message_text.startsWith("[Project Update") ? (
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="h-3 w-3 animate-pulse" /> Official Update
                              </span>
                              <p className="font-semibold">
                                {msg.message_text.replace(/^\[Project Update - [^\]]+\]:\s*/, "")}
                              </p>
                              <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold block mt-1">
                                Stage:{" "}
                                {msg.message_text.match(/^\[Project Update - ([^\]]+)\]/)?.[1] ||
                                  ""}
                              </span>
                            </div>
                          ) : (
                            <p>{msg.message_text}</p>
                          )}
                        </div>
                        <span className="text-[8px] text-muted-foreground mt-1 px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    );
                  })}
                  {chatMessages.length === 0 && (
                    <div className="text-center py-12 text-xs text-muted-foreground italic">
                      Send a message to commence communication streams.
                    </div>
                  )}
                </div>

                {/* Chat inputs */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!chatMessageText.trim()) return;
                    sendChatMutation.mutate();
                  }}
                  className="p-3 border-t border-border bg-card space-y-2"
                >
                  {chatImageInput && (
                    <div className="flex items-center gap-2 p-1.5 bg-muted rounded-lg text-[10px]">
                      <Image className="h-3.5 w-3.5 text-indigo-500" />
                      <span className="truncate flex-1">{chatImageInput}</span>
                      <button
                        type="button"
                        onClick={() => setChatImageInput("")}
                        className="text-rose-500 font-bold hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt("Enter Image URL to attach:");
                        if (url) setChatImageInput(url);
                      }}
                      className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-all cursor-pointer"
                      title="Attach Image URL"
                    >
                      <Image className="h-4.5 w-4.5" />
                    </button>
                    <input
                      type="text"
                      value={chatMessageText}
                      onChange={(e) => setChatMessageText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2.5 rounded-full bg-muted border border-border text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="submit"
                      disabled={sendChatMutation.isPending || !chatMessageText.trim()}
                      className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-40 transition-all cursor-pointer"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Sidebar Info (Right 1 col) */}
          <div className="space-y-6">
            {/* Quick Status / Tracking card */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h4 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                Pipeline Overview
              </h4>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span>Current Stage:</span>
                  <span className="font-bold text-indigo-500 capitalize">
                    {DISPLAY_STAGES.find((s) => s.id === request.current_stage)?.label ||
                      request.current_stage}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span>Vendor Assigned:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {request.vendors?.store_name || "Unassigned"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span>Advance Paid:</span>
                  <span
                    className={`font-bold ${request.quote_accepted ? "text-emerald-500" : "text-slate-400"}`}
                  >
                    {request.quote_accepted ? "50% Paid" : "Unpaid"}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Override Controls */}
            {isAdmin && (
              <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 space-y-4">
                <h4 className="text-xs uppercase tracking-widest font-bold text-amber-500 flex items-center gap-1.5">
                  <ShieldCheck className="h-4.5 w-4.5" /> Admin Controls
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">
                      Manually Assign Vendor
                    </label>
                    <select
                      onChange={(e) => assignVendorMutation.mutate(e.target.value)}
                      value={request.vendor_id || ""}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs outline-none"
                    >
                      <option value="">Unassigned</option>
                      {quotations.map((q) => (
                        <option key={q.vendors?.id} value={q.vendors?.id}>
                          {q.vendors?.store_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      toast.warning("Dispute Ticket opened. Admin notified.");
                    }}
                    className="w-full py-2 bg-amber-500 text-slate-950 text-[10px] font-bold uppercase rounded-lg hover:bg-amber-400 transition-all cursor-pointer"
                  >
                    Open Dispute Ticket
                  </button>

                  <button
                    onClick={() => {
                      toast.success("Vendor suspension status reviewed.");
                    }}
                    className="w-full py-2 bg-rose-600 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-rose-700 transition-all cursor-pointer"
                  >
                    Suspend Vendor Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PAYMENT SIMULATION MODAL */}
      {showPaymentModal && selectedQuoteForPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in duration-200 space-y-6">
            <div className="text-center space-y-2">
              <span className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl inline-block">
                <DollarSign className="h-8 w-8" />
              </span>
              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Secure Advance Payment
              </h3>
              <p className="text-xs text-muted-foreground">
                Commit a 50% advance amount to commission this preservation block.
              </p>
            </div>

            <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendor:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedQuoteForPayment.vendors?.store_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original Bid Amount:</span>
                <span className="font-semibold">{inr(selectedQuoteForPayment.price_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping:</span>
                <span className="font-semibold">
                  {inr(selectedQuoteForPayment.shipping_cost_cents)}
                </span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold text-sm text-indigo-600 dark:text-indigo-400">
                <span>50% Advance Due:</span>
                <span>
                  {inr(
                    selectedQuoteForPayment.price_cents / 2 +
                      selectedQuoteForPayment.shipping_cost_cents,
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handlePaymentCheckout}
                disabled={isProcessingPayment}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow shadow-indigo-600/20"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying gateway response...
                  </>
                ) : (
                  "Simulate ₹ Payment Checkout"
                )}
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-full py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
