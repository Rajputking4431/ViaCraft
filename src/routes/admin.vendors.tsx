import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/utils/format";
import { useState } from "react";
import { toast } from "sonner";
import { sendVendorStatusEmail } from "@/api/email.functions";
import {
  Search,
  CheckCircle,
  Ban,
  UserCheck,
  Eye,
  Store,
  DollarSign,
  Package,
  ShoppingBag,
  Star,
  MapPin,
  Loader2,
  ChevronRight,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/admin/vendors")({
  component: AdminVendors,
});

function AdminVendors() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);

  // Fetch all vendors (Safely asks only for vendor data to prevent crashing)
  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["admin-vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "approved" | "suspended" | "pending";
    }) => {
      const { error } = await supabase.from("vendors").update({ status }).eq("id", id);
      if (error) throw error;

      if (status === "approved") {
        const vendor = vendors.find((v) => v.id === id);
        if (vendor) {
          await supabase.from("user_roles").upsert({ user_id: vendor.user_id, role: "vendor" });
        }
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-vendors"] });
      toast.success(`Vendor status set to ${variables.status}`);
      if (selectedVendor && selectedVendor.id === variables.id) {
        setSelectedVendor((prev: any) => ({ ...prev, status: variables.status }));
      }

      if (variables.status === "approved" || variables.status === "suspended") {
        sendVendorStatusEmail({
          data: {
            vendorId: variables.id,
            status: variables.status,
          },
        }).catch((err) => {
          console.error("Vendor status email trigger failure", err);
        });
      }
    },
    onError: (e) => toast.error(e.message),
  });

  // Filter vendors safely
  const filteredVendors = vendors.filter((v) => {
    const searchLower = search.toLowerCase();

    const matchesSearch =
      !searchLower ||
      (v.store_name && v.store_name.toLowerCase().includes(searchLower)) ||
      (v.tagline && v.tagline.toLowerCase().includes(searchLower)) ||
      (v.slug && v.slug.toLowerCase().includes(searchLower));

    const matchesStatus = statusFilter === "all" ? true : v.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-amber-500 mb-2 font-semibold">
          Stores
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Vendor Administration</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search stores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white outline-none"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          {["all", "pending", "approved", "suspended"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                statusFilter === status
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "bg-slate-950 text-slate-400 border border-slate-800"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <Store className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="font-semibold text-lg text-slate-400">No vendors found</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-4 px-6">Store Details</th>
                  <th className="py-4 px-6">Location</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="text-slate-300 hover:bg-slate-800/20">
                    <td className="py-4 px-6">
                      <p className="font-semibold text-white">{vendor.store_name}</p>
                    </td>
                    <td className="py-4 px-6 text-slate-400">{vendor.location || "N/A"}</td>
                    <td className="py-4 px-6">
                      <span className="text-xs font-semibold border px-2 py-0.5 rounded-full">
                        {vendor.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedVendor(vendor)}
                        className="p-2 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {vendor.status === "pending" && (
                        <button
                          onClick={() => updateStatus.mutate({ id: vendor.id, status: "approved" })}
                          className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg cursor-pointer"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedVendor && (
        <VendorDetailsDrawer
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
          onApprove={() => updateStatus.mutate({ id: selectedVendor.id, status: "approved" })}
          onSuspend={() => updateStatus.mutate({ id: selectedVendor.id, status: "suspended" })}
        />
      )}
    </div>
  );
}

interface VendorDrawerProps {
  vendor: any;
  onClose: () => void;
  onApprove: () => void;
  onSuspend: () => void;
}

function VendorDetailsDrawer({ vendor, onClose, onApprove, onSuspend }: VendorDrawerProps) {
  const { data: products = [] } = useQuery({
    queryKey: ["vendor-details-products", vendor.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("vendor_id", vendor.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl bg-slate-950 border-l border-slate-800 text-white overflow-y-auto p-6">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-bold flex items-center gap-2">
            <Store className="h-5 w-5 text-amber-500" /> Store Profile
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-400">ID: {vendor.id}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h4 className="text-xl font-bold">{vendor.store_name}</h4>
            <p className="text-sm text-slate-400">{vendor.tagline}</p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-800">
            {vendor.status === "pending" && (
              <button
                onClick={onApprove}
                className="flex-1 py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl cursor-pointer"
              >
                Approve Application
              </button>
            )}
            {vendor.status === "approved" && (
              <button
                onClick={onSuspend}
                className="w-full py-3 bg-rose-500 text-slate-950 font-bold rounded-xl cursor-pointer"
              >
                Suspend Shop Account
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
