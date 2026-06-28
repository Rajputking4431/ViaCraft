import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { shippingDb, Shipment, VendorPickupAddress, ShippingLog } from "@/api/shipping-db";
import { cancelShipment } from "@/api/shipping.functions";
import { toast } from "sonner";
import { inr } from "@/utils/format";
import {
  Truck,
  Loader2,
  Package,
  MapPin,
  FileText,
  AlertOctagon,
  Eye,
  XCircle,
  RefreshCw,
  Search,
  CheckCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/admin/shipping")({
  component: AdminShippingPage,
});

function AdminShippingPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"shipments" | "warehouses" | "logs">("shipments");
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch all shipments
  const { data: shipments = [], isLoading: loadingShipments } = useQuery({
    queryKey: ["admin-shipments"],
    queryFn: () => shippingDb.shipments.listAll(),
  });

  // Fetch all warehouses
  const { data: warehouses = [], isLoading: loadingWarehouses } = useQuery({
    queryKey: ["admin-warehouses"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("vendor_pickup_addresses" as any).select("*, vendors(store_name)") as any);
      if (error) {
        // Fallback to local storage if relation missing or error
        return shippingDb.pickupAddress.listAll();
      }
      return (data || []) as unknown as VendorPickupAddress[];
    },
  });

  // Fetch all shipping logs
  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["admin-shipping-logs"],
    queryFn: () => shippingDb.logs.listAll(),
  });

  // Cancel Shipment mutation
  const cancelShipmentMutation = useMutation({
    mutationFn: async (shipmentId: string) => {
      return cancelShipment({ data: { shipmentId } });
    },
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success("Shipment successfully cancelled!");
        qc.invalidateQueries({ queryKey: ["admin-shipments"] });
        setSelectedShipment(null);
      } else {
        toast.error(res.error || "Failed to cancel shipment");
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to cancel shipment"),
  });

  // Filtered shipments
  const filteredShipments = shipments.filter((ship) => {
    const matchesSearch = 
      ship.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ship.tracking_number && ship.tracking_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ship.courier_name && ship.courier_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || ship.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 text-slate-100 font-sans">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold text-white flex items-center gap-3">
            <Truck className="h-8 w-8 text-amber-500" />
            Global Logistics & Shipping
          </h1>
          <p className="text-slate-400 mt-2">
            Monitor shipments, audit API communication logs, inspect pickup warehouses, and manage stuck deliveries.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab("shipments")}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "shipments"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All Shipments
          </button>
          <button
            onClick={() => setActiveTab("warehouses")}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "warehouses"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Artisan Warehouses
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "logs"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            System Logs
          </button>
        </div>
      </div>

      {/* VIEW: SHIPMENTS */}
      {activeTab === "shipments" && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by Shipment ID, Courier, AWB..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-amber-500 outline-none transition-colors"
              />
            </div>
            
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 focus:border-amber-500 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="shipment_created">Created</option>
                <option value="pickup_scheduled">Pickup Scheduled</option>
                <option value="picked_up">Picked Up</option>
                <option value="in_transit">In Transit</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <button
                onClick={() => qc.invalidateQueries({ queryKey: ["admin-shipments"] })}
                className="p-3 bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <RefreshCw className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Shipments Grid/Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            {loadingShipments ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : filteredShipments.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-500 italic">
                No shipments found matching the query filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-widest bg-slate-950/40 font-semibold">
                      <th className="py-4 px-6">Shipment ID</th>
                      <th className="py-4 px-6">Courier Name</th>
                      <th className="py-4 px-6">AWB / Tracking No</th>
                      <th className="py-4 px-6">Method</th>
                      <th className="py-4 px-6">Logistics Status</th>
                      <th className="py-4 px-6 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredShipments.map((ship) => (
                      <tr key={ship.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-xs text-amber-500">
                          {ship.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="py-4 px-6 text-white font-medium">
                          {ship.courier_name || "Unassigned"}
                        </td>
                        <td className="py-4 px-6 font-mono text-xs text-slate-400">
                          {ship.tracking_number ? (
                            <a
                              href={ship.tracking_url || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-400 hover:underline inline-flex items-center gap-1"
                            >
                              {ship.tracking_number}
                              <FileText className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="italic text-slate-600">Pending Handover</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${
                            ship.shipping_method === "shiprocket"
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                              : "bg-teal-500/10 text-teal-400 border-teal-500/20"
                          }`}>
                            {ship.shipping_method}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            ship.status === "delivered"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : ship.status === "cancelled"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}>
                            {ship.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => setSelectedShipment(ship)}
                            className="p-1.5 bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Inspect Details"
                          >
                            <Eye className="h-4.5 w-4.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: ARTISAN WAREHOUSES */}
      {activeTab === "warehouses" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          {loadingWarehouses ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : warehouses.length === 0 ? (
            <div className="text-center py-12 text-slate-500 italic text-sm">
              No registered vendor warehouse addresses found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-widest bg-slate-950/40 font-semibold">
                    <th className="py-4 px-6">Artisan Shop</th>
                    <th className="py-4 px-6">Contact Person</th>
                    <th className="py-4 px-6">Phone Number</th>
                    <th className="py-4 px-6">Street Address</th>
                    <th className="py-4 px-6">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {warehouses.map((w: any) => (
                    <tr key={w.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6 font-bold text-white">
                        {w.vendors?.store_name || "MOCK STORE"}
                      </td>
                      <td className="py-4 px-6 font-medium">{w.contact_person}</td>
                      <td className="py-4 px-6 text-slate-400 font-mono text-xs">{w.phone}</td>
                      <td className="py-4 px-6 text-slate-400 max-w-[200px] truncate" title={w.street}>
                        {w.street}
                      </td>
                      <td className="py-4 px-6">
                        {w.city}, {w.state} - <span className="font-mono text-xs">{w.postal_code}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW: LOGISTICS API COMMUNICATIONS LOGS */}
      {activeTab === "logs" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          {loadingLogs ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 italic text-sm">
              No API requests or events logged in the database yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-widest bg-slate-950/40 font-semibold">
                    <th className="py-4 px-6">Timestamp</th>
                    <th className="py-4 px-6">Shipment ID</th>
                    <th className="py-4 px-6">Event</th>
                    <th className="py-4 px-6">Operator</th>
                    <th className="py-4 px-6">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-xs">
                  {logs.map((log: ShippingLog) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6 text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-amber-500 font-bold">
                        {log.shipment_id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="py-4 px-6 text-slate-300 uppercase">
                        {log.new_status ? log.new_status.replace(/_/g, " ") : "UPDATE"}
                      </td>
                      <td className="py-4 px-6 text-indigo-400 uppercase font-bold text-[10px]">
                        {log.action_by_role}
                      </td>
                      <td className="py-4 px-6 text-slate-400 font-sans max-w-sm whitespace-normal leading-relaxed">
                        {log.notes}
                        {log.reason && <span className="text-rose-500 block font-semibold mt-1">Reason: {log.reason}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DETAIL DRAWER / ACTION SHEET */}
      {selectedShipment && (
        <Sheet open={true} onOpenChange={(open) => !open && setSelectedShipment(null)}>
          <SheetContent className="w-full sm:max-w-xl bg-slate-900 border-l border-slate-800 text-slate-100 overflow-y-auto h-full p-6">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-xl font-bold flex items-center gap-2 text-white">
                <Truck className="h-5 w-5 text-amber-500" /> Administrative Shipment Profile
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500 mt-1">
                Security ID: {selectedShipment.id}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6">
              
              {/* Parameters Box */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Courier</span>
                    <p className="font-bold text-sm text-white">{selectedShipment.courier_name || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Status</span>
                    <p className="font-bold text-sm text-amber-500 uppercase">{selectedShipment.status.replace(/_/g, " ")}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-3">
                  <div>
                    <span className="text-slate-500 block">AWB / Tracking Number:</span>
                    <p className="font-mono text-white">{selectedShipment.tracking_number || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Dispatch Mode:</span>
                    <p className="font-semibold text-white uppercase">{selectedShipment.shipping_method}</p>
                  </div>
                </div>
              </div>

              {/* CANCEL SHIPMENT BUTTON (Only if not delivered/cancelled) */}
              {selectedShipment.status !== "delivered" && selectedShipment.status !== "cancelled" && (
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-rose-500 flex items-center gap-1.5">
                    <AlertOctagon className="h-4.5 w-4.5" /> Administrative Overrides
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    As a system administrator, you can void and cancel this shipment in case of courier problems or order refund processes. This will free up the order items.
                  </p>
                  <button
                    onClick={() => cancelShipmentMutation.mutate(selectedShipment.id)}
                    disabled={cancelShipmentMutation.isPending}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {cancelShipmentMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4.5 w-4.5" />
                    )}
                    Void & Cancel Shipment
                  </button>
                </div>
              )}

              {/* Shipment Event Log Timeline */}
              <div className="space-y-4">
                <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                  <CheckCircle className="h-4.5 w-4.5 text-amber-500" />
                  Cargo Logistics Timeline
                </h4>
                
                {logs.filter((l: ShippingLog) => l.shipment_id === selectedShipment.id).length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No events recorded for this shipment.</p>
                ) : (
                  <div className="relative border-l border-slate-800 pl-4 space-y-6">
                    {logs
                      .filter((l: ShippingLog) => l.shipment_id === selectedShipment.id)
                      .map((log: ShippingLog) => (
                        <div key={log.id} className="relative text-xs">
                          {/* Dot indicator */}
                          <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-amber-500 border-2 border-slate-900"></div>
                          <div className="flex justify-between items-start">
                            <p className="font-bold text-white capitalize">
                              {log.new_status ? log.new_status.replace(/_/g, " ") : "Update"}
                            </p>
                            <span className="text-[10px] text-slate-500">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          {log.notes && <p className="text-slate-400 mt-0.5 leading-relaxed">{log.notes}</p>}
                          {log.reason && (
                            <p className="text-rose-400 mt-0.5 font-medium">Reason: {log.reason}</p>
                          )}
                          <p className="text-[9px] text-amber-500/80 mt-1 uppercase font-bold tracking-wider">
                            By: {log.action_by_role}
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
