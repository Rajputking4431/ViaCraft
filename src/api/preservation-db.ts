import { supabase } from "@/integrations/supabase/client";

export interface Quotation {
  id: string;
  request_id: string;
  vendor_id: string;
  price_cents: number;
  shipping_cost_cents: number;
  estimated_delivery_days: number;
  message: string;
  terms_conditions: string;
  portfolio_samples: string[];
  status: "pending" | "accepted" | "rejected" | "shortlisted" | "saved";
  created_at: string;
  updated_at: string;
  vendors?: {
    id: string;
    store_name: string;
    logo_url: string | null;
    rating: number;
    user_id: string;
  } | null;
}

export interface StageLog {
  id: string;
  request_id: string;
  stage: string;
  note: string | null;
  images: string[];
  created_at: string;
}

export interface ChatMessage {
  id: string;
  vendor_id: string;
  customer_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
}

// Key format for localStorage fallback
const QUOTES_KEY_PREFIX = "resin_quotes_";
const LOGS_KEY_PREFIX = "resin_logs_";
const CHATS_KEY_PREFIX = "resin_chats_";

export const preservationDb = {
  /**
   * Load quotations for a given preservation request.
   * Leverages Supabase and falls back to LocalStorage if tables don't exist.
   */
  async getQuotations(requestId: string): Promise<Quotation[]> {
    let dbQuotes: Quotation[] = [];
    try {
      const { data, error } = await (supabase.from("preservation_quotations" as any) as any)
        .select("*, vendors(id, store_name, logo_url, rating, user_id)")
        .eq("request_id", requestId);

      if (error) {
        // If table doesn't exist, we trigger the fallback
        if (error.code === "PGRST116" || error.message.includes("does not exist")) {
          return this.getQuotationsFallback(requestId);
        }
        throw error;
      }
      dbQuotes = (data || []).map((q: any) => ({
        ...q,
        portfolio_samples: Array.isArray(q.portfolio_samples)
          ? q.portfolio_samples
          : typeof q.portfolio_samples === "string"
            ? JSON.parse(q.portfolio_samples)
            : [],
      }));
    } catch (err) {
      console.warn("Supabase quotations fetch failed, using fallback:", err);
      return this.getQuotationsFallback(requestId);
    }

    // Merge database quotes with local storage fallback quotes to ensure no bids are lost!
    const fallbackQuotes = await this.getQuotationsFallback(requestId);
    const mergedQuotes = [...dbQuotes];
    fallbackQuotes.forEach((fb: any) => {
      if (!mergedQuotes.some((q) => q.vendor_id === fb.vendor_id)) {
        mergedQuotes.push(fb);
      } else {
        const idx = mergedQuotes.findIndex((q) => q.vendor_id === fb.vendor_id);
        if (idx !== -1) {
          mergedQuotes[idx] = { ...fb, ...mergedQuotes[idx] };
        }
      }
    });

    return mergedQuotes;
  },

  async getQuotationsFallback(requestId: string): Promise<Quotation[]> {
    const key = `${QUOTES_KEY_PREFIX}${requestId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return [];

    // Parse quotes and fetch actual vendor profiles to match
    const quotes: Quotation[] = JSON.parse(stored);

    try {
      const vendorIds = quotes.map((q) => q.vendor_id);
      if (vendorIds.length > 0) {
        const { data: vendors } = await supabase
          .from("vendors")
          .select("id, store_name, logo_url, rating, user_id")
          .in("id", vendorIds);

        if (vendors) {
          quotes.forEach((q) => {
            q.vendors = vendors.find((v) => v.id === q.vendor_id) || null;
          });
        }
      }
    } catch (e) {
      console.error("Failed to load vendor profiles for fallback quotes", e);
    }

    return quotes;
  },

  /**
   * Submit a new quotation.
   */
  async submitQuotation(
    quote: Omit<Quotation, "id" | "created_at" | "updated_at" | "status">,
  ): Promise<Quotation> {
    const newQuote = {
      ...quote,
      id: crypto.randomUUID(),
      status: "pending" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      const { data, error } = await (supabase.from("preservation_quotations" as any) as any)
        .insert({
          request_id: quote.request_id,
          vendor_id: quote.vendor_id,
          price_cents: quote.price_cents,
          shipping_cost_cents: quote.shipping_cost_cents,
          estimated_delivery_days: quote.estimated_delivery_days,
          message: quote.message,
          terms_conditions: quote.terms_conditions,
          portfolio_samples: quote.portfolio_samples,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn("Supabase quotation submit failed, using fallback:", err);
      const key = `${QUOTES_KEY_PREFIX}${quote.request_id}`;
      const quotes = await this.getQuotationsFallback(quote.request_id);

      // Remove previous quote by same vendor
      const filtered = quotes.filter((q) => q.vendor_id !== quote.vendor_id);
      filtered.push(newQuote);
      localStorage.setItem(key, JSON.stringify(filtered));

      // Update quotation count in request notes to sync state
      await this.syncQuotationCount(quote.request_id, filtered.length);

      return newQuote;
    }
  },

  /**
   * Update quotation status.
   */
  async updateQuotationStatus(
    requestId: string,
    vendorId: string,
    status: Quotation["status"],
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("preservation_quotations" as any)
        .update({ status })
        .eq("request_id", requestId)
        .eq("vendor_id", vendorId);

      if (error) throw error;
    } catch (err) {
      console.warn("Supabase quotation update failed, using fallback:", err);
    }

    // Sync status to local storage anyway to maintain database-fallback alignment
    try {
      const key = `${QUOTES_KEY_PREFIX}${requestId}`;
      const quotes = await this.getQuotationsFallback(requestId);
      const updated = quotes.map((q) => {
        if (q.vendor_id === vendorId) {
          return { ...q, status, updated_at: new Date().toISOString() };
        }
        if (status === "accepted" && q.vendor_id !== vendorId) {
          return { ...q, status: "rejected" as const, updated_at: new Date().toISOString() };
        }
        return q;
      });
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to sync quote status update to local storage", e);
    }
  },

  /**
   * Retrieve stage logs for a preservation request.
   */
  async getStageLogs(requestId: string): Promise<StageLog[]> {
    try {
      const { data, error } = await supabase
        .from("preservation_stage_log")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []).map((log) => ({
        id: log.id,
        request_id: log.request_id,
        stage: log.stage,
        note: log.note,
        images: Array.isArray((log as any).images)
          ? (log as any).images
          : typeof (log as any).images === "string"
            ? JSON.parse((log as any).images)
            : [],
        created_at: log.created_at,
      }));
    } catch (err) {
      console.warn("Supabase stage logs fetch failed, using fallback:", err);
      const key = `${LOGS_KEY_PREFIX}${requestId}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    }
  },
  async updateFallbackRequestStage(requestId: string, stage: string): Promise<void> {
    try {
      const stored = localStorage.getItem("fallback_platform_requests");
      if (stored) {
        const list = JSON.parse(stored);
        const idx = list.findIndex((r: any) => r.id === requestId);
        if (idx !== -1) {
          list[idx].current_stage = stage;
          list[idx].updated_at = new Date().toISOString();
          localStorage.setItem("fallback_platform_requests", JSON.stringify(list));
        }
      }
    } catch (e) {
      console.error("Failed to update fallback request stage", e);
    }
  },

  /**
   * Add a new workflow stage progress log.
   */
  async addStageLog(
    requestId: string,
    stage: string,
    note: string,
    images: string[],
  ): Promise<StageLog> {
    const newLog: StageLog = {
      id: crypto.randomUUID(),
      request_id: requestId,
      stage,
      note,
      images,
      created_at: new Date().toISOString(),
    };

    // Update fallback request stage locally anyway to keep in sync
    await this.updateFallbackRequestStage(requestId, stage);

    try {
      // 1. Update the request current stage
      const { error: requestErr } = await supabase
        .from("preservation_requests")
        .update({ current_stage: stage as any })
        .eq("id", requestId);
      if (requestErr) throw requestErr;

      // 2. Insert the stage log
      const { data, error } = await supabase
        .from("preservation_stage_log")
        .insert({
          request_id: requestId,
          stage: stage as any,
          note: note,
          images: images,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return {
        id: data.id,
        request_id: data.request_id,
        stage: data.stage,
        note: data.note,
        images: Array.isArray((data as any).images)
          ? (data as any).images
          : typeof (data as any).images === "string"
            ? JSON.parse((data as any).images)
            : [],
        created_at: data.created_at,
      };
    } catch (err) {
      console.warn("Supabase stage log insert failed, saving to fallback:", err);

      // Update request table anyway since columns exist
      await supabase
        .from("preservation_requests")
        .update({ current_stage: stage as any })
        .eq("id", requestId);

      const key = `${LOGS_KEY_PREFIX}${requestId}`;
      const logs = await this.getStageLogs(requestId);
      logs.push(newLog);
      localStorage.setItem(key, JSON.stringify(logs));
      return newLog;
    }
  },
  /**
   * Synchronize the quotation counter on the request itself (stored in structured format or fallback).
   */
  async syncQuotationCount(requestId: string, count: number): Promise<void> {
    try {
      // We read the request, update notes if we need to store metadata
      const { data } = await supabase
        .from("preservation_requests")
        .select("notes")
        .eq("id", requestId)
        .single();

      let noteObj: any = {};
      try {
        noteObj = JSON.parse(data?.notes || "{}");
      } catch {
        noteObj = { text: data?.notes || "" };
      }

      noteObj.quotation_count = count;

      await supabase
        .from("preservation_requests")
        .update({ notes: JSON.stringify(noteObj) })
        .eq("id", requestId);
    } catch (e) {
      console.error("Failed to sync quotation count to notes", e);
    }
  },

  /**
   * Fetch chat messages.
   */
  async getChatMessages(vendorId: string, customerId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await (supabase.from("vendor_messages" as any) as any)
        .select("*")
        .eq("vendor_id", vendorId)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn("Supabase chat fetch failed, using fallback:", err);
      const key = `${CHATS_KEY_PREFIX}${vendorId}_${customerId}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    }
  },

  /**
   * Send a chat message.
   */
  async sendChatMessage(
    vendorId: string,
    customerId: string,
    senderId: string,
    text: string,
  ): Promise<ChatMessage> {
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      vendor_id: vendorId,
      customer_id: customerId,
      sender_id: senderId,
      message_text: text,
      created_at: new Date().toISOString(),
    };
    try {
      const { data, error } = await (supabase.from("vendor_messages" as any) as any)
        .insert({
          vendor_id: vendorId,
          customer_id: customerId,
          sender_id: senderId,
          message_text: text,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn("Supabase chat send failed, saving to fallback:", err);
      const key = `${CHATS_KEY_PREFIX}${vendorId}_${customerId}`;
      const msgs = await this.getChatMessages(vendorId, customerId);
      msgs.push(newMsg);
      localStorage.setItem(key, JSON.stringify(msgs));
      return newMsg;
    }
  },
};
