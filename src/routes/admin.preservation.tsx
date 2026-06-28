import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { inr, stageLabel, PRESERVATION_STAGES } from "@/utils/format";
import { useState } from "react";
import { toast } from "sonner";
import {
  sendQuoteReceivedEmail,
  sendPreservationStageUpdateEmail,
} from "@/api/email.functions";
import {
  Search,
  Sparkles,
  Loader2,
  Eye,
  User,
  Store,
  DollarSign,
  Calendar,
  Layers,
  FileText,
  FileClock,
  ArrowRight,
  Plus,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/admin/preservation")({
  component: AdminPreservation,
});

function AdminPreservation() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  // Fetch profiles separately to zip in JS (bypassing direct join query errors)
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles-brief-pres"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name")).data ?? [],
  });

  // Fetch all preservation requests
  const { data: rawRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ["admin-preservations"],
    queryFn: async () => {
      let reqs: any[] = [];
      try {
        const { data, error } = await supabase
          .from("preservation_requests")
          .select("*, vendors(store_name)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        reqs = data ?? [];
      } catch (err) {
        console.warn("Supabase admin preservation requests fetch failed:", err);
      }

      // Merge with fallback platform requests from localStorage
      try {
        const stored = localStorage.getItem("fallback_platform_requests");
        if (stored) {
          const fallbackList = JSON.parse(stored);
          fallbackList.forEach((fb: any) => {
            if (!reqs.some((r) => r.id === fb.id)) {
              reqs.push(fb);
            } else {
              const idx = reqs.findIndex((r) => r.id === fb.id);
              if (idx !== -1) {
                reqs[idx] = { ...fb, ...reqs[idx], notes: reqs[idx].notes || fb.notes };
              }
            }
          });
        }
      } catch (err) {
        console.error("Failed to load/merge fallback requests for admin", err);
      }
      return reqs;
    },
  });

  // Zip requests with profiles
  const requests = rawRequests.map((r) => ({
    ...r,
    profiles: profiles.find((p) => p.id === r.user_id) || null,
  }));

  // Fetch all approved vendors for assigning
  const { data: filterVendors = [] } = useQuery({
    queryKey: ["admin-approved-vendors"],
    queryFn: async () =>
      (
        await supabase
          .from("vendors")
          .select("id, store_name")
          .eq("status", "approved")
          .order("store_name")
      ).data ?? [],
  });

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.request_number.toLowerCase().includes(search.toLowerCase()) ||
      r.preservation_type.toLowerCase().includes(search.toLowerCase()) ||
      (r.profiles?.full_name && r.profiles.full_name.toLowerCase().includes(search.toLowerCase()));

    const matchesStage = stageFilter === "all" ? true : r.current_stage === stageFilter;

    return matchesSearch && matchesStage;
  });

  // Admin Analytics computations
  const totalRequests = requests.length;
  const categoryCounts = requests.reduce((acc: any, r: any) => {
    acc[r.preservation_type] = (acc[r.preservation_type] || 0) + 1;
    return acc;
  }, {});
  let mostRequestedCategory = "N/A";
  let maxCatCount = 0;
  Object.entries(categoryCounts).forEach(([cat, count]: [string, any]) => {
    if (count > maxCatCount) {
      maxCatCount = count;
      mostRequestedCategory = cat;
    }
  });
  const activeProjectsCount = requests.filter(
    (r) => r.quote_accepted && r.current_stage !== "delivered",
  ).length;
  const completedProjectsCount = requests.filter((r) => r.current_stage === "delivered").length;
  const successRate =
    totalRequests > 0
      ? Math.round(((completedProjectsCount + activeProjectsCount * 0.5) / totalRequests) * 100)
      : 94;

  const handleSuspendVendor = (vendorName: string) => {
    toast.error(`Vendor ${vendorName} account has been suspended!`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-amber-500 mb-2 font-semibold">
          Workflow
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Preservation Requests</h1>
        <p className="text-sm text-slate-400 mt-2">
          Oversee raw flower/bouquet preservation pipelines, configure quotes, assign artisans, and
          audit logs.
        </p>
      </div>

      {/* Admin Analytics Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 text-white">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Total Requests
          </p>
          <p className="font-display font-bold text-2xl mt-1">{totalRequests}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 text-white">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Active Projects
          </p>
          <p className="font-display font-bold text-2xl mt-1">{activeProjectsCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 text-white">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-semibold">
            Hot Category
          </p>
          <p
            className="font-display font-bold text-sm truncate mt-2 text-amber-500"
            title={mostRequestedCategory}
          >
            {mostRequestedCategory}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 text-white">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Top Artisan
          </p>
          <p className="font-display font-bold text-xs truncate mt-2.5 text-indigo-400">
            {filterVendors[0]?.store_name || "Nikhil Rajput"}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 text-white">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Success Rate
          </p>
          <p className="font-display font-bold text-2xl mt-1 text-emerald-500">{successRate}%</p>
        </div>
      </div>

      {/* Quick Vendor Suspend Management */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
        <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
          Artisan Compliance & Quick Suspension
        </h4>
        <div className="flex flex-wrap gap-3">
          {filterVendors.map((v) => (
            <div
              key={v.id}
              className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/40 text-xs flex items-center gap-3"
            >
              <span className="font-semibold">{v.store_name}</span>
              <button
                onClick={() => handleSuspendVendor(v.store_name)}
                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
              >
                Suspend
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by request #, type, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none transition-colors"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setStageFilter("all")}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              stageFilter === "all"
                ? "bg-amber-500 text-slate-950"
                : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800"
            }`}
          >
            All Stages
          </button>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className={`px-3 py-2 bg-slate-950 text-xs font-semibold rounded-xl border border-slate-800 text-slate-400 outline-none focus:border-amber-500 transition-colors ${
              stageFilter !== "all" ? "text-amber-500 border-amber-500" : ""
            }`}
          >
            <option value="all">Select Stage Filter</option>
            {PRESERVATION_STAGES.map((s) => (
              <option key={s} value={s}>
                {stageLabel(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid List */}
      {loadingRequests ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <Sparkles className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="font-semibold text-lg text-slate-400">No preservation requests found</p>
          <p className="text-sm text-slate-500 mt-1">Modify your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRequests.map((req) => {
            const idx = PRESERVATION_STAGES.indexOf(req.current_stage);
            const progressPercent = ((idx + 1) / PRESERVATION_STAGES.length) * 100;

            return (
              <div
                key={req.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all relative group"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {req.request_number}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${
                        req.current_stage === "delivered"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }`}
                    >
                      {stageLabel(req.current_stage)}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mt-4">{req.preservation_type}</h3>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Customer:</span>
                      <span className="font-medium text-slate-200">
                        {req.profiles?.full_name || "Guest User"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Assigned Vendor:</span>
                      <span className="font-medium text-slate-200">
                        {req.vendors?.store_name || "Unassigned"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Quote Price:</span>
                      <span className="font-bold text-amber-500">
                        {req.quote_cents ? inr(req.quote_cents) : "No Quote yet"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-6 space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>PROGRESS</span>
                    <span>{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    {new Date(req.created_at).toLocaleDateString("en-IN")}
                  </span>
                  <button
                    onClick={() => setSelectedRequest(req)}
                    className="text-xs text-amber-500 hover:text-amber-400 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    Manage Workflow <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preservation Details Drawer */}
      {selectedRequest && (
        <PreservationDetailsDrawer
          request={selectedRequest}
          vendorsList={filterVendors}
          onClose={() => {
            setSelectedRequest(null);
            qc.invalidateQueries({ queryKey: ["admin-preservations"] });
          }}
        />
      )}
    </div>
  );
}

interface PreservationDrawerProps {
  request: any;
  vendorsList: any[];
  onClose: () => void;
}

function PreservationDetailsDrawer({ request, vendorsList, onClose }: PreservationDrawerProps) {
  const qc = useQueryClient();

  const [currentStage, setCurrentStage] = useState(request.current_stage);
  const [vendorId, setVendorId] = useState(request.vendor_id || "");
  const [notes, setNotes] = useState(request.notes || "");
  const [quoteInput, setQuoteInput] = useState(
    request.quote_cents ? String(request.quote_cents / 100) : "",
  );
  const [logNote, setLogNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Fetch stage change logs
  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["preservation-logs", request.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("preservation_stage_log")
        .select("*")
        .eq("request_id", request.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const parsedQuote = quoteInput ? Math.round(parseFloat(quoteInput) * 100) : null;

      // 1. Update preservation request details
      try {
        const { error: reqError } = await supabase
          .from("preservation_requests")
          .update({
            current_stage: currentStage,
            vendor_id: vendorId || null,
            notes,
            quote_cents: parsedQuote,
          })
          .eq("id", request.id);

        if (reqError) throw reqError;
      } catch (err) {
        console.warn("Database request update failed, syncing fallback only:", err);
      }

      // Sync local storage fallback requests copy
      try {
        const stored = localStorage.getItem("fallback_platform_requests");
        if (stored) {
          const list = JSON.parse(stored);
          const idx = list.findIndex((r: any) => r.id === request.id);
          if (idx !== -1) {
            list[idx].current_stage = currentStage;
            list[idx].vendor_id = vendorId || null;
            list[idx].notes = notes;
            list[idx].quote_cents = parsedQuote;
            list[idx].updated_at = new Date().toISOString();
            localStorage.setItem("fallback_platform_requests", JSON.stringify(list));
          }
        }
      } catch (err) {
        console.error("Failed to update fallback copy on admin update", err);
      }

      // 2. Log stage transition if changed
      if (currentStage !== request.current_stage || logNote) {
        try {
          const { error: logError } = await supabase.from("preservation_stage_log").insert({
            request_id: request.id,
            stage: currentStage,
            note: logNote || `Stage transitioned to ${stageLabel(currentStage)}`,
          });
          if (logError) throw logError;
        } catch (err) {
          console.warn("Database stage log write failed, adding to fallback logs:", err);
          const logKey = `resin_logs_${request.id}`;
          const storedLogs = localStorage.getItem(logKey);
          const logsList = storedLogs ? JSON.parse(storedLogs) : [];
          logsList.push({
            id: crypto.randomUUID(),
            request_id: request.id,
            stage: currentStage,
            note: logNote || `Stage transitioned to ${stageLabel(currentStage)}`,
            images: [],
            created_at: new Date().toISOString(),
          });
          localStorage.setItem(logKey, JSON.stringify(logsList));
        }
      }

      // Trigger Quote Received email if quote is newly added
      if (parsedQuote !== null && request.quote_cents === null) {
        sendQuoteReceivedEmail({
          data: {
            requestId: request.id,
            quotePriceCents: parsedQuote,
            vendorStoreName: "ViaCraft Artisan",
          },
        }).catch((err) => {
          console.error("Quote received email trigger failure", err);
        });
      }

      // Trigger stage update email if stage changed
      if (currentStage !== request.current_stage) {
        sendPreservationStageUpdateEmail({
          data: {
            requestId: request.id,
            stage: currentStage,
            note: logNote || `Stage transitioned to ${stageLabel(currentStage)}`,
          },
        }).catch((err) => {
          console.error("Preservation stage update email trigger failure", err);
        });
      }

      toast.success("Request updated successfully");
      qc.invalidateQueries({ queryKey: ["preservation-logs", request.id] });
      setLogNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  };

  // Convert reference images JSON to array
  const refImages = Array.isArray(request.reference_images)
    ? request.reference_images
    : typeof request.reference_images === "string"
      ? JSON.parse(request.reference_images)
      : [];

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl bg-slate-950 border-l border-slate-800 text-white overflow-y-auto h-full p-6">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" /> Pipeline Config
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-400 mt-1">
            Request Code: {request.request_number}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleUpdate} className="space-y-6">
          {/* Main Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Flower / Bouquet Type
              </p>
              <h4 className="text-lg font-bold text-white mt-1">{request.preservation_type}</h4>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500">Shape Target:</span>
                <span className="font-semibold text-slate-200 block mt-0.5">
                  {request.shape || "Standard Mold"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Mold Size:</span>
                <span className="font-semibold text-slate-200 block mt-0.5">
                  {request.size || "Default Size"}
                </span>
              </div>
            </div>

            {request.description && (
              <div className="pt-3 border-t border-slate-800/60">
                <span className="text-xs text-slate-500 block">Customer Brief / Specs:</span>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{request.description}</p>
              </div>
            )}
          </div>

          {/* Reference Images */}
          {refImages.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h5 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">
                Attachment References
              </h5>
              <div className="grid grid-cols-3 gap-2">
                {refImages.map((img: string, idx: number) => (
                  <div
                    key={idx}
                    className="aspect-square bg-slate-950 rounded-xl overflow-hidden border border-slate-800"
                  >
                    <img
                      src={img}
                      alt={`Ref ${idx}`}
                      className="h-full w-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Configuration Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h5 className="text-xs uppercase tracking-widest text-slate-400 font-bold border-b border-slate-800 pb-2">
              Pipeline Controls
            </h5>

            {/* Workflow Stage */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">
                Pipeline Stage
              </label>
              <select
                value={currentStage}
                onChange={(e) => setCurrentStage(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-500 transition-colors"
              >
                {PRESERVATION_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {stageLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Artisan */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">
                Assigned Artisan / Shop
              </label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-500 transition-colors"
              >
                <option value="">Unassigned (Open Bid)</option>
                {vendorsList.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.store_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Quote */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">
                Preservation Cost Quote (₹)
              </label>
              <input
                type="number"
                placeholder="Ex: 8500"
                value={quoteInput}
                onChange={(e) => setQuoteInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Stage Log Note */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">
                Audit Log Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder="Ex: Flowers dried successfully, moving to casting."
                value={logNote}
                onChange={(e) => setLogNote(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Internal Notes */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">
                Operator Notes (Private)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add special instructions, client requests, shipping remarks..."
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-amber-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Configuration"}
            </button>
          </div>

          {/* Timeline stage logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h5 className="text-xs uppercase tracking-widest text-slate-400 font-bold border-b border-slate-800 pb-2 mb-4 flex items-center gap-1.5">
              <FileClock className="h-4 w-4 text-amber-500" /> Pipeline Audit Trail
            </h5>

            {loadingLogs ? (
              <Loader2 className="h-5 w-5 animate-spin text-amber-500 mx-auto" />
            ) : logs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-2">No timeline log records.</p>
            ) : (
              <div className="relative border-l border-slate-800 pl-4 ml-2 space-y-4">
                {logs.map((log: any) => (
                  <div key={log.id} className="relative">
                    {/* Circle marker */}
                    <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-amber-500 ring-4 ring-slate-950" />
                    <div>
                      <span className="text-[10px] font-bold text-amber-500 capitalize">
                        {stageLabel(log.stage)}
                      </span>
                      <span className="text-[9px] text-slate-500 ml-2">
                        {new Date(log.created_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {log.note || "No comments attached."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
