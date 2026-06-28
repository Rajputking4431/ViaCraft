import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { shippingDb, VendorPickupAddress, Shipment } from "@/api/shipping-db";
import { createShipment, schedulePickup, updateShipmentStatus } from "@/api/shipping.functions";
import { inr } from "@/utils/format";
import { toast } from "sonner";
import {
  MapPin,
  Truck,
  Loader2,
  Package,
  Calendar,
  Eye,
  Info,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Clipboard,
  Download,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function VendorShippingView({ vendor }: { vendor: any }) {
  const qc = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "pickup-address" | "new-shipment">("dashboard");
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<any | null>(null); // holds order item details
  const [shippingMethod, setShippingMethod] = useState<"shiprocket" | "manual">("shiprocket");
  
  // Create shipment form state
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [length, setLength] = useState(10);
  const [width, setWidth] = useState(10);
  const [height, setHeight] = useState(10);
  const [weight, setWeight] = useState(0.5);
  const [notes, setNotes] = useState("");

  // Pickup scheduling state
  const [pickupDate, setPickupDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0] // tomorrow
  );

  // Status updating state (for simulation/testing)
  const [simulatedStatus, setSimulatedStatus] = useState("in_transit");
  const [simulatedReason, setSimulatedReason] = useState("");

  // Warehouse pickup address query
  const { data: pickupAddress, isLoading: loadingAddress } = useQuery({
    queryKey: ["vendor-pickup-address", vendor.id],
    queryFn: () => shippingDb.pickupAddress.get(vendor.id),
  });

  // Shipments query
  const { data: shipments = [], isLoading: loadingShipments } = useQuery({
    queryKey: ["vendor-shipments", vendor.id],
    queryFn: () => shippingDb.shipments.listByVendor(vendor.id),
  });

  // Vendor order items (to find orders that need shipping)
  const { data: orderItems = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["vendor-order-items-shipping", vendor.id],
    queryFn: async () => {
      // Import/fetch logic matching orders tab
      const { data, error } = await supabase
        .from("order_items")
        .select("*, orders(*, profiles(*))")
        .eq("vendor_id", vendor.id)
        .order("id", { ascending: false });

      if (error) throw error;
      let items = data || [];

      // Merge with fallback orders
      const stored = localStorage.getItem("fallback_orders");
      const fallbackOrders = stored ? JSON.parse(stored) : [];
      items = items.map((item: any) => {
        if (!item.orders) {
          const matchedOrder = fallbackOrders.find((fo: any) => fo.id === item.order_id);
          if (matchedOrder) return { ...item, orders: matchedOrder };
        }
        return item;
      });

      return items;
    },
  });

  // Address Save mutation
  const saveAddress = useMutation({
    mutationFn: async (addr: Omit<VendorPickupAddress, "id" | "vendor_id" | "created_at" | "updated_at">) => {
      return shippingDb.pickupAddress.upsert(vendor.id, addr);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor-pickup-address", vendor.id] });
      toast.success("Pickup warehouse address saved successfully!");
      setActiveSubTab("dashboard");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save address"),
  });

  // Create Shipment mutation
  const createShipmentMutation = useMutation({
    mutationFn: async (params: any) => {
      return createShipment({ data: params });
    },
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success(`Shipment created successfully! Courier: ${res.shipment.courier_name}`);
        qc.invalidateQueries({ queryKey: ["vendor-shipments", vendor.id] });
        setShowCreateModal(null);
        setActiveSubTab("dashboard");
      } else {
        toast.error(res.error || "Failed to create shipment");
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to create shipment"),
  });

  // Schedule Pickup mutation
  const schedulePickupMutation = useMutation({
    mutationFn: async (params: { shipmentId: string; pickupDate: string }) => {
      return schedulePickup({ data: params });
    },
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success("Carrier pickup scheduled successfully!");
        qc.invalidateQueries({ queryKey: ["vendor-shipments", vendor.id] });
        setSelectedShipment(null);
      } else {
        toast.error(res.error || "Failed to schedule pickup");
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to schedule pickup"),
  });

  // Simulated status update mutation
  const updateShipmentMutation = useMutation({
    mutationFn: async (params: {
      shipmentId: string;
      status: string;
      reason?: string;
      actionByRole: "vendor";
    }) => {
      return updateShipmentStatus({ data: params });
    },
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success(`Shipment status updated to ${res.shipment.status.replace(/_/g, " ")}`);
        qc.invalidateQueries({ queryKey: ["vendor-shipments", vendor.id] });
        setSelectedShipment(res.shipment);
      } else {
        toast.error(res.error || "Failed to update status");
      }
    },
  });

  // Fetch shipment tracking logs
  const { data: logs = [] } = useQuery({
    queryKey: ["shipment-logs", selectedShipment?.id],
    enabled: !!selectedShipment,
    queryFn: () => shippingDb.logs.listByShipment(selectedShipment!.id),
  });

  // Filter orders needing shipping (paid/processing status and doesn't have a shipment yet)
  const pendingShippingOrders = orderItems.filter((item: any) => {
    const orderStatus = item.orders?.status;
    const isPaidOrProcessing = orderStatus === "paid" || orderStatus === "processing";
    const hasShipment = shipments.some((s) => s.order_id === item.order_id);
    return isPaidOrProcessing && !hasShipment;
  });

  // Handle warehouse address form submission
  const handleAddressSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    saveAddress.mutate({
      contact_person: formData.get("contact_person") as string,
      phone: formData.get("phone") as string,
      street: formData.get("street") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      postal_code: formData.get("postal_code") as string,
      country: "India",
    });
  };

  // Handle create shipment submission
  const handleCreateShipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupAddress) {
      toast.error("Please configure your Pickup Warehouse Address first.");
      setActiveSubTab("pickup-address");
      setShowCreateModal(null);
      return;
    }

    createShipmentMutation.mutate({
      orderId: showCreateModal.order_id,
      vendorId: vendor.id,
      shippingMethod,
      courierName: shippingMethod === "manual" ? courierName : undefined,
      trackingNumber: shippingMethod === "manual" ? trackingNumber : undefined,
      length,
      width,
      height,
      weight,
      notes,
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-500 mb-1 font-semibold">
            Logistics & Shipping
          </p>
          <h1 className="text-3xl font-display font-bold tracking-tight">Shipping Management</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Configure warehouse locations, assign couriers via Shiprocket, generate tracking AWBs, and monitor deliveries.
          </p>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={() => setActiveSubTab("dashboard")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === "dashboard"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Logistics Dashboard
          </button>
          <button
            onClick={() => setActiveSubTab("pickup-address")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "pickup-address"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapPin className="h-4 w-4" />
            {pickupAddress ? "Pickup Warehouse" : "Setup Pickup"}
          </button>
        </div>
      </div>

      {/* Warning if no pickup address set */}
      {!pickupAddress && !loadingAddress && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-4 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold text-sm">Action Required: Setup Pickup Address</h5>
            <p className="text-xs leading-relaxed opacity-90">
              Before you can dispatch orders or generate Shiprocket logistics, you must declare your pickup warehouse address. Couriers will arrive at this address to pick up parcels.
            </p>
            <button
              onClick={() => setActiveSubTab("pickup-address")}
              className="text-xs font-bold underline mt-2 hover:opacity-85 cursor-pointer block"
            >
              Configure Pickup Address now &rarr;
            </button>
          </div>
        </div>
      )}

      {/* VIEW: PICKUP ADDRESS */}
      {activeSubTab === "pickup-address" && (
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 max-w-2xl">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
            <MapPin className="h-5 w-5 text-indigo-500" />
            Pickup Warehouse Address
          </h2>
          <form onSubmit={handleAddressSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Contact Person</label>
                <input
                  type="text"
                  name="contact_person"
                  required
                  defaultValue={pickupAddress?.contact_person || ""}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Contact Phone</label>
                <input
                  type="text"
                  name="phone"
                  required
                  defaultValue={pickupAddress?.phone || ""}
                  placeholder="10-digit number"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Street Details</label>
              <input
                type="text"
                name="street"
                required
                defaultValue={pickupAddress?.street || ""}
                placeholder="Building, street, locality details..."
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-muted-foreground">City</label>
                <input
                  type="text"
                  name="city"
                  required
                  defaultValue={pickupAddress?.city || ""}
                  placeholder="City"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">State</label>
                <input
                  type="text"
                  name="state"
                  required
                  defaultValue={pickupAddress?.state || ""}
                  placeholder="State"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2 col-span-3 sm:col-span-1">
                <label className="text-xs font-semibold text-muted-foreground">Postal Pin Code</label>
                <input
                  type="text"
                  name="postal_code"
                  required
                  defaultValue={pickupAddress?.postal_code || ""}
                  placeholder="6-digit PIN"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveSubTab("dashboard")}
                className="px-5 py-2.5 bg-transparent border border-border rounded-xl hover:bg-muted text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveAddress.isPending}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saveAddress.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Address
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: LOGISTICS DASHBOARD */}
      {activeSubTab === "dashboard" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Section: Pending Shipments */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-indigo-500" />
              Pending Dispatches ({pendingShippingOrders.length})
            </h3>
            {loadingOrders || loadingShipments ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : pendingShippingOrders.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                All paid order items have been dispatched. No pending shipments!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Order Number</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Item Details</th>
                      <th className="py-3 px-4">Delivery Address</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {pendingShippingOrders.map((item: any) => {
                      const addr = item.orders?.shipping_address || {};
                      const formattedAddr = typeof addr === "string" 
                        ? addr 
                        : `${addr.street || ""}, ${addr.city || ""}, ${addr.state || ""} - ${addr.zip || addr.postal_code || ""}`;

                      return (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-xs">
                            {item.orders?.order_number || "RV-MOCK"}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-xs">{item.orders?.profiles?.full_name || "Guest Buyer"}</p>
                            <p className="text-[10px] text-muted-foreground">{item.orders?.profiles?.phone || "N/A"}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-xs truncate max-w-[200px]">{item.title}</p>
                            <p className="text-[10px] text-indigo-500">Qty: {item.quantity} &bull; {inr(item.subtotal_cents)}</p>
                          </td>
                          <td className="py-3 px-4 text-xs max-w-[220px] truncate" title={formattedAddr}>
                            {formattedAddr}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                if (!pickupAddress) {
                                  toast.error("Please configure your Pickup Address first.");
                                  setActiveSubTab("pickup-address");
                                } else {
                                  setShowCreateModal(item);
                                }
                              }}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              <Truck className="h-3.5 w-3.5" />
                              Ship Order
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: active shipments */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Truck className="h-5 w-5 text-indigo-500" />
              Logistics & Courier Shipments ({shipments.length})
            </h3>
            {loadingShipments ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : shipments.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                No active shipments registered in your control panel.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Shipment ID</th>
                      <th className="py-3 px-4">Order No</th>
                      <th className="py-3 px-4">Courier Name</th>
                      <th className="py-3 px-4">AWB / Tracking</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {shipments.map((ship: Shipment) => {
                      // Match order number
                      const matchedItem = orderItems.find((oi: any) => oi.order_id === ship.order_id);
                      const orderNum = matchedItem?.orders?.order_number || `RV-ORD-${ship.order_id.slice(0, 8).toUpperCase()}`;

                      return (
                        <tr key={ship.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-xs text-muted-foreground">
                            {ship.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-foreground">
                            {orderNum}
                          </td>
                          <td className="py-3 px-4 text-xs font-medium">
                            {ship.courier_name || "N/A"}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">
                            {ship.tracking_number ? (
                              <a
                                href={ship.tracking_url || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-500 hover:underline flex items-center gap-1"
                              >
                                {ship.tracking_number}
                                <ArrowRight className="h-3 w-3 shrink-0" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground">Pending</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border ${
                              ship.shipping_method === "shiprocket" 
                                ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" 
                                : "bg-teal-500/10 text-teal-500 border-teal-500/20"
                            }`}>
                              {ship.shipping_method}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                              ship.status === "delivered"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : ship.status === "cancelled"
                                  ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            }`}>
                              {ship.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedShipment(ship)}
                              className="p-1.5 bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                              title="View Logistics Timeline & Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE SHIPMENT FLOW */}
      {showCreateModal && (
        <Sheet open={true} onOpenChange={(open) => !open && setShowCreateModal(null)}>
          <SheetContent className="w-full sm:max-w-xl bg-card border-l border-border text-card-foreground overflow-y-auto h-full p-6">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-xl font-bold flex items-center gap-2">
                <Truck className="h-5 w-5 text-indigo-500" /> Generate Shipment
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1">
                Configure parcel parameters and courier details for order #{showCreateModal.orders?.order_number}.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleCreateShipment} className="space-y-6">
              {/* Shipping Method Selector */}
              <div className="bg-muted/40 p-4 rounded-xl space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Logistics Integration Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShippingMethod("shiprocket")}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                      shippingMethod === "shiprocket"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <RefreshCw className="h-4.5 w-4.5" />
                    Automated (Shiprocket)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShippingMethod("manual")}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                      shippingMethod === "manual"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Clipboard className="h-4.5 w-4.5" />
                    Manual Logistics
                  </button>
                </div>
              </div>

              {/* Conditionally Render Parcel Dimensions for Shiprocket */}
              {shippingMethod === "shiprocket" ? (
                <div className="space-y-4">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    Parcel Dimensions & Weight
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-muted-foreground">L (cm)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={length}
                        onChange={(e) => setLength(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-muted-foreground">W (cm)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={width}
                        onChange={(e) => setWidth(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-muted-foreground">H (cm)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={height}
                        onChange={(e) => setHeight(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-muted-foreground">Wt (kg)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.05"
                        required
                        value={weight}
                        onChange={(e) => setWeight(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    Shiprocket automatically rates the best local carrier based on dimensions and pickup warehouse location.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    Courier Tracking Info
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Courier Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Delhivery, BlueDart"
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Tracking Number</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 1234567890"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Notes / Handover Instructions</label>
                <textarea
                  placeholder="e.g. Fragile resin art glass, handle with care."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl text-sm outline-none h-20 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(null)}
                  className="px-4 py-2 bg-transparent border border-border rounded-xl hover:bg-muted text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createShipmentMutation.isPending}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {createShipmentMutation.isPending && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
                  Assign Logistics & Ship
                </button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      )}

      {/* DRAWER: SHIPMENT TIMELINE & DETAILED STATUS CONTROL */}
      {selectedShipment && (
        <Sheet open={true} onOpenChange={(open) => !open && setSelectedShipment(null)}>
          <SheetContent className="w-full sm:max-w-xl bg-card border-l border-border text-card-foreground overflow-y-auto h-full p-6">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-xl font-bold flex items-center gap-2">
                <Truck className="h-5 w-5 text-indigo-500" /> Shipment Logistics Profile
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1">
                Shipment Record ID: {selectedShipment.id}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6">
              
              {/* Quick Details Card */}
              <div className="bg-muted/40 p-5 rounded-2xl border border-border/60 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Courier Carrier</p>
                    <p className="font-bold text-sm text-foreground">{selectedShipment.courier_name || "Unassigned"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Status</p>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-600/10 text-indigo-500 border border-indigo-500/20">
                      {selectedShipment.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40 text-xs">
                  <div>
                    <span className="text-muted-foreground block">AWB / Tracking Number:</span>
                    <p className="font-mono font-semibold text-foreground">
                      {selectedShipment.tracking_number || "Pending"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Method:</span>
                    <p className="font-semibold text-foreground uppercase">{selectedShipment.shipping_method}</p>
                  </div>
                </div>

                {selectedShipment.shipping_label_url && (
                  <div className="pt-3 border-t border-border/40">
                    <a
                      href={selectedShipment.shipping_label_url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer text-center"
                    >
                      <Download className="h-4 w-4" /> Download Shipping Label (AWB)
                    </a>
                  </div>
                )}
              </div>

              {/* ACTION: SCHEDULE PICKUP (Only visible if status is shipment_created) */}
              {selectedShipment.status === "shipment_created" && (
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-indigo-500 flex items-center gap-1.5">
                    <Calendar className="h-4.5 w-4.5" /> Schedule Carrier Pickup
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Select a date for the courier truck to arrive at your pickup address and collect this package.
                  </p>
                  <div className="flex gap-3">
                    <input
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none"
                    />
                    <button
                      onClick={() =>
                        schedulePickupMutation.mutate({
                          shipmentId: selectedShipment.id,
                          pickupDate,
                        })
                      }
                      disabled={schedulePickupMutation.isPending}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {schedulePickupMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Confirm Pickup
                    </button>
                  </div>
                </div>
              )}

              {/* SIMULATION CONTROLS FOR SELLER TESTING */}
              <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs uppercase tracking-wider font-bold text-rose-500 flex items-center gap-1.5">
                  <RefreshCw className="h-4.5 w-4.5" /> Simulated Logistics Updates (Developer Test Panel)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Simulate cargo movement tracking updates. Triggering these will automatically update the tracking logs and dispatch customer email alerts.
                </p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={simulatedStatus}
                      onChange={(e) => setSimulatedStatus(e.target.value)}
                      className="px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none"
                    >
                      <option value="picked_up">Picked Up (Dispatched)</option>
                      <option value="in_transit">In Transit</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered Successfully</option>
                      <option value="pickup_failed">Pickup Failed</option>
                      <option value="delivery_failed">Delivery Failed (Transit Delay)</option>
                    </select>

                    <button
                      onClick={() =>
                        updateShipmentMutation.mutate({
                          shipmentId: selectedShipment.id,
                          status: simulatedStatus,
                          reason: simulatedReason || undefined,
                          actionByRole: "vendor",
                        })
                      }
                      disabled={updateShipmentMutation.isPending}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Trigger Status Change
                    </button>
                  </div>

                  {simulatedStatus === "delivery_failed" && (
                    <input
                      type="text"
                      placeholder="Reason for delay (e.g. heavy rain, flight delay)"
                      value={simulatedReason}
                      onChange={(e) => setSimulatedReason(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Shipment Logistics Transit Event Log (Timeline) */}
              <div className="space-y-4">
                <h4 className="text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle className="h-4.5 w-4.5 text-indigo-500" />
                  Cargo Transit Events History
                </h4>
                {logs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No logistics events recorded yet.</p>
                ) : (
                  <div className="relative border-l border-border pl-4 space-y-6">
                    {logs.map((log: any) => (
                      <div key={log.id} className="relative text-xs">
                        {/* Dot indicator */}
                        <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-600 border-2 border-background"></div>
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-foreground capitalize">
                            {log.new_status ? log.new_status.replace(/_/g, " ") : "Update"}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        {log.notes && <p className="text-muted-foreground mt-0.5 leading-relaxed">{log.notes}</p>}
                        {log.reason && (
                          <p className="text-rose-500 mt-0.5 font-medium">Reason: {log.reason}</p>
                        )}
                        <p className="text-[10px] text-indigo-500 mt-1 uppercase font-bold tracking-wider">
                          Logged by: {log.action_by_role}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </SheetContent>
        </Sheet>
      )}

    </div>
  );
}
