import { supabase } from "@/integrations/supabase/client";

export interface VendorPickupAddress {
  id: string;
  vendor_id: string;
  contact_person: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  order_id: string;
  vendor_id: string;
  shipping_method: "shiprocket" | "manual";
  status: string;
  courier_name?: string;
  tracking_number?: string;
  tracking_url?: string;
  awb_code?: string;
  shiprocket_shipment_id?: string;
  shiprocket_order_id?: string;
  shipping_label_url?: string;
  estimated_delivery?: string;
  notes?: string;
  dispatch_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ShippingLog {
  id: string;
  shipment_id: string;
  action_by?: string;
  action_by_role?: string;
  previous_status?: string;
  new_status?: string;
  courier_name?: string;
  tracking_number?: string;
  reason?: string;
  notes?: string;
  created_at: string;
}

export interface PickupRequest {
  id: string;
  shipment_id: string;
  pickup_date: string;
  pickup_time_slot?: string;
  status: string;
  shiprocket_pickup_status?: string;
  created_at: string;
}

// ----------------------------------------------------
// LOCAL STORAGE KEYS & IMPLEMENTATIONS
// ----------------------------------------------------
const KEYS = {
  ADDRESSES: "shipping_fallback_addresses",
  SHIPMENTS: "shipping_fallback_shipments",
  LOGS: "shipping_fallback_logs",
  PICKUPS: "shipping_fallback_pickups",
};

const getLocal = <T>(key: string, def: T): T => {
  if (typeof window === "undefined") return def;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : def;
};

const setLocal = <T>(key: string, val: T) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(val));
  }
};

// Seed initial mock shipments if localStorage is empty
const seedFallbackShipments = () => {
  if (typeof window === "undefined") return;
  const shipments = getLocal<Shipment[]>(KEYS.SHIPMENTS, []);
  if (shipments.length === 0) {
    // Seed some mock addresses
    const mockAddresses: VendorPickupAddress[] = [
      {
        id: "addr-mock-1",
        vendor_id: "vendor-1", // Will match vendor role if needed, or act as general
        contact_person: "John Artisan",
        phone: "9876543210",
        street: "Artisan Lane, Block C",
        city: "Jaipur",
        state: "Rajasthan",
        postal_code: "302001",
        country: "India",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ];
    setLocal(KEYS.ADDRESSES, mockAddresses);
  }
};

seedFallbackShipments();

// Helper to check if database error is a missing relation
const isMissingRelationError = (err: any): boolean => {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  return (
    msg.includes("relation") ||
    msg.includes("does not exist") ||
    err.code === "P0001" ||
    err.code === "42P01"
  );
};

// ----------------------------------------------------
// DB WRAPPER OBJECT WITH TRANSPARENT FALLBACK
// ----------------------------------------------------
export const shippingDb = {
  // --- 1. VENDOR PICKUP ADDRESS ---
  pickupAddress: {
    get: async (vendorId: string): Promise<VendorPickupAddress | null> => {
      try {
        const { data, error } = await supabase
          .from("vendor_pickup_addresses" as any)
          .select("*")
          .eq("vendor_id", vendorId)
          .maybeSingle();

        if (error) {
          if (isMissingRelationError(error)) throw error;
          console.error("pickupAddress.get DB error:", error);
          throw error;
        }
        return data as unknown as VendorPickupAddress | null;
      } catch (err) {
        console.warn("pickupAddress.get falling back to localStorage", err);
        const addresses = getLocal<VendorPickupAddress[]>(KEYS.ADDRESSES, []);
        return addresses.find((a) => a.vendor_id === vendorId) || null;
      }
    },

    upsert: async (
      vendorId: string,
      address: Omit<VendorPickupAddress, "id" | "vendor_id" | "created_at" | "updated_at">
    ): Promise<VendorPickupAddress> => {
      const now = new Date().toISOString();
      try {
        const existing = await shippingDb.pickupAddress.get(vendorId);
        let resData: any;

        if (existing) {
          const { data, error } = await supabase
            .from("vendor_pickup_addresses" as any)
            .update({
              ...address,
              updated_at: now,
            })
            .eq("vendor_id", vendorId)
            .select()
            .single();

          if (error) throw error;
          resData = data;
        } else {
          const { data, error } = await supabase
            .from("vendor_pickup_addresses" as any)
            .insert({
              vendor_id: vendorId,
              ...address,
              created_at: now,
              updated_at: now,
            })
            .select()
            .single();

          if (error) throw error;
          resData = data;
        }
        return resData as unknown as VendorPickupAddress;
      } catch (err) {
        console.warn("pickupAddress.upsert falling back to localStorage", err);
        const addresses = getLocal<VendorPickupAddress[]>(KEYS.ADDRESSES, []);
        const idx = addresses.findIndex((a) => a.vendor_id === vendorId);
        const updated: VendorPickupAddress = {
          id: addresses[idx]?.id || `addr-${Math.random().toString(36).substr(2, 9)}`,
          vendor_id: vendorId,
          ...address,
          created_at: addresses[idx]?.created_at || now,
          updated_at: now,
        };

        if (idx > -1) {
          addresses[idx] = updated;
        } else {
          addresses.push(updated);
        }
        setLocal(KEYS.ADDRESSES, addresses);
        return updated;
      }
    },

    listAll: async (): Promise<VendorPickupAddress[]> => {
      try {
        const { data, error } = await supabase
          .from("vendor_pickup_addresses" as any)
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data as unknown as VendorPickupAddress[];
      } catch (err) {
        console.warn("pickupAddress.listAll falling back to localStorage", err);
        return getLocal<VendorPickupAddress[]>(KEYS.ADDRESSES, []);
      }
    },
  },

  // --- 2. SHIPMENTS ---
  shipments: {
    listByCustomer: async (userId: string): Promise<Shipment[]> => {
      try {
        const { data: ordersData, error: ordersErr } = await supabase
          .from("orders")
          .select("id")
          .eq("user_id", userId);

        if (ordersErr) throw ordersErr;
        const orderIds = (ordersData || []).map((o) => o.id);
        if (orderIds.length === 0) return [];

        const { data, error } = await supabase
          .from("shipments" as any)
          .select("*")
          .in("order_id", orderIds)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data as unknown as Shipment[];
      } catch (err) {
        console.warn("shipments.listByCustomer falling back to localStorage", err);
        const shipments = getLocal<Shipment[]>(KEYS.SHIPMENTS, []);
        const stored = localStorage.getItem("fallback_orders");
        const fallbackOrders = stored ? JSON.parse(stored) : [];
        const userOrderIds = fallbackOrders
          .filter((fo: any) => fo.user_id === userId)
          .map((fo: any) => fo.id);

        return shipments
          .filter((s) => userOrderIds.includes(s.order_id))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    },

    listByVendor: async (vendorId: string): Promise<Shipment[]> => {
      try {
        const { data, error } = await supabase
          .from("shipments" as any)
          .select("*")
          .eq("vendor_id", vendorId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data as unknown as Shipment[];
      } catch (err) {
        console.warn("shipments.listByVendor falling back to localStorage", err);
        const shipments = getLocal<Shipment[]>(KEYS.SHIPMENTS, []);
        return shipments
          .filter((s) => s.vendor_id === vendorId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    },

    listAll: async (): Promise<Shipment[]> => {
      try {
        const { data, error } = await supabase
          .from("shipments" as any)
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data as unknown as Shipment[];
      } catch (err) {
        console.warn("shipments.listAll falling back to localStorage", err);
        const shipments = getLocal<Shipment[]>(KEYS.SHIPMENTS, []);
        return shipments.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
    },

    get: async (id: string): Promise<Shipment | null> => {
      try {
        const { data, error } = await supabase
          .from("shipments" as any)
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        return data as unknown as Shipment | null;
      } catch (err) {
        console.warn("shipments.get falling back to localStorage", err);
        const shipments = getLocal<Shipment[]>(KEYS.SHIPMENTS, []);
        return shipments.find((s) => s.id === id) || null;
      }
    },

    getByOrder: async (orderId: string): Promise<Shipment[]> => {
      try {
        const { data, error } = await supabase
          .from("shipments" as any)
          .select("*")
          .eq("order_id", orderId);

        if (error) throw error;
        return data as unknown as Shipment[];
      } catch (err) {
        console.warn("shipments.getByOrder falling back to localStorage", err);
        const shipments = getLocal<Shipment[]>(KEYS.SHIPMENTS, []);
        return shipments.filter((s) => s.order_id === orderId);
      }
    },

    create: async (
      shipment: Omit<Shipment, "id" | "created_at" | "updated_at">
    ): Promise<Shipment> => {
      const now = new Date().toISOString();
      try {
        const { data, error } = await supabase
          .from("shipments" as any)
          .insert({
            ...shipment,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();

        if (error) throw error;
        return data as unknown as Shipment;
      } catch (err) {
        console.warn("shipments.create falling back to localStorage", err);
        const shipments = getLocal<Shipment[]>(KEYS.SHIPMENTS, []);
        const newShipment: Shipment = {
          id: `ship-${Math.random().toString(36).substr(2, 9)}`,
          ...shipment,
          created_at: now,
          updated_at: now,
        };
        shipments.push(newShipment);
        setLocal(KEYS.SHIPMENTS, shipments);

        // Auto create initial log
        await shippingDb.logs.create({
          shipment_id: newShipment.id,
          action_by_role: "vendor",
          new_status: shipment.status,
          notes: "Shipment record created in system.",
        });

        return newShipment;
      }
    },

    update: async (id: string, updates: Partial<Shipment>): Promise<Shipment> => {
      const now = new Date().toISOString();
      try {
        const { data, error } = await supabase
          .from("shipments" as any)
          .update({
            ...updates,
            updated_at: now,
          })
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return data as unknown as Shipment;
      } catch (err) {
        console.warn("shipments.update falling back to localStorage", err);
        const shipments = getLocal<Shipment[]>(KEYS.SHIPMENTS, []);
        const idx = shipments.findIndex((s) => s.id === id);
        if (idx === -1) throw new Error("Shipment not found");

        const previousStatus = shipments[idx].status;
        const updatedShipment = {
          ...shipments[idx],
          ...updates,
          updated_at: now,
        };
        shipments[idx] = updatedShipment;
        setLocal(KEYS.SHIPMENTS, shipments);

        // Log the change if status changed
        if (updates.status && updates.status !== previousStatus) {
          await shippingDb.logs.create({
            shipment_id: id,
            action_by_role: updates.status === "cancelled" ? "vendor" : "system",
            previous_status: previousStatus,
            new_status: updates.status,
            courier_name: updates.courier_name || updatedShipment.courier_name,
            tracking_number: updates.tracking_number || updatedShipment.tracking_number,
            notes: `Status updated to ${updates.status}.`,
          });
        }

        return updatedShipment;
      }
    },
  },

  // --- 3. SHIPPING LOGS ---
  logs: {
    listAll: async (): Promise<ShippingLog[]> => {
      try {
        const { data, error } = await supabase
          .from("shipping_logs" as any)
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data as unknown as ShippingLog[];
      } catch (err) {
        console.warn("logs.listAll falling back to localStorage", err);
        const logs = getLocal<ShippingLog[]>(KEYS.LOGS, []);
        return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    },

    listByShipment: async (shipmentId: string): Promise<ShippingLog[]> => {
      try {
        const { data, error } = await supabase
          .from("shipping_logs" as any)
          .select("*")
          .eq("shipment_id", shipmentId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        return data as unknown as ShippingLog[];
      } catch (err) {
        console.warn("logs.listByShipment falling back to localStorage", err);
        const logs = getLocal<ShippingLog[]>(KEYS.LOGS, []);
        return logs
          .filter((l) => l.shipment_id === shipmentId)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    },

    create: async (log: Omit<ShippingLog, "id" | "created_at">): Promise<ShippingLog> => {
      const now = new Date().toISOString();
      try {
        const { data, error } = await supabase
          .from("shipping_logs" as any)
          .insert({
            ...log,
            created_at: now,
          })
          .select()
          .single();

        if (error) throw error;
        return data as unknown as ShippingLog;
      } catch (err) {
        console.warn("logs.create falling back to localStorage", err);
        const logs = getLocal<ShippingLog[]>(KEYS.LOGS, []);
        const newLog: ShippingLog = {
          id: `log-${Math.random().toString(36).substr(2, 9)}`,
          ...log,
          created_at: now,
        };
        logs.push(newLog);
        setLocal(KEYS.LOGS, logs);
        return newLog;
      }
    },
  },

  // --- 4. PICKUP REQUESTS ---
  pickups: {
    listByShipment: async (shipmentId: string): Promise<PickupRequest[]> => {
      try {
        const { data, error } = await supabase
          .from("pickup_requests" as any)
          .select("*")
          .eq("shipment_id", shipmentId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data as unknown as PickupRequest[];
      } catch (err) {
        console.warn("pickups.listByShipment falling back to localStorage", err);
        const pickups = getLocal<PickupRequest[]>(KEYS.PICKUPS, []);
        return pickups
          .filter((p) => p.shipment_id === shipmentId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    },

    create: async (req: Omit<PickupRequest, "id" | "created_at">): Promise<PickupRequest> => {
      const now = new Date().toISOString();
      try {
        const { data, error } = await supabase
          .from("pickup_requests" as any)
          .insert({
            ...req,
            created_at: now,
          })
          .select()
          .single();

        if (error) throw error;
        return data as unknown as PickupRequest;
      } catch (err) {
        console.warn("pickups.create falling back to localStorage", err);
        const pickups = getLocal<PickupRequest[]>(KEYS.PICKUPS, []);
        const newReq: PickupRequest = {
          id: `pickup-${Math.random().toString(36).substr(2, 9)}`,
          ...req,
          created_at: now,
        };
        pickups.push(newReq);
        setLocal(KEYS.PICKUPS, pickups);
        return newReq;
      }
    },

    update: async (id: string, updates: Partial<PickupRequest>): Promise<PickupRequest> => {
      try {
        const { data, error } = await supabase
          .from("pickup_requests" as any)
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return data as unknown as PickupRequest;
      } catch (err) {
        console.warn("pickups.update falling back to localStorage", err);
        const pickups = getLocal<PickupRequest[]>(KEYS.PICKUPS, []);
        const idx = pickups.findIndex((p) => p.id === id);
        if (idx === -1) throw new Error("Pickup request not found");

        const updatedReq = {
          ...pickups[idx],
          ...updates,
        };
        pickups[idx] = updatedReq;
        setLocal(KEYS.PICKUPS, pickups);
        return updatedReq;
      }
    },
  },
};
