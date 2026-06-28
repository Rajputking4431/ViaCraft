import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/utils/format";
import { useState } from "react";
import { toast } from "sonner";
import {
  Search,
  CheckCircle,
  Eye,
  EyeOff,
  Star,
  StarOff,
  Trash2,
  Package,
  Loader2,
  ChevronDown,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

function AdminProducts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // all, published, hidden, featured
  const [sortField, setSortField] = useState("created_at"); // created_at, price_cents, stock
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch products
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, vendors(store_name), categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch vendors for filters
  const { data: filterVendors = [] } = useQuery({
    queryKey: ["admin-filter-vendors"],
    queryFn: async () => (await supabase.from("vendors").select("id, store_name")).data ?? [],
  });

  // Fetch categories for filters
  const { data: filterCategories = [] } = useQuery({
    queryKey: ["admin-filter-categories"],
    queryFn: async () => (await supabase.from("categories").select("id, name")).data ?? [],
  });

  // Individual Actions
  const updateProduct = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from("products").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard-products"] });
      toast.success("Product updated successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard-products"] });
      toast.success("Product deleted");
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    },
    onError: (e) => toast.error(e.message),
  });

  // Bulk Actions
  const bulkUpdate = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: any }) => {
      const { error } = await supabase.from("products").update(updates).in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard-products"] });
      toast.success(`Bulk updated ${variables.ids.length} products`);
      setSelectedIds([]);
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard-products"] });
      toast.success(`Bulk deleted ${variables.length} products`);
      setSelectedIds([]);
    },
    onError: (e) => toast.error(e.message),
  });

  // Handle row selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = (filteredIds: string[]) => {
    if (selectedIds.length === filteredIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredIds);
    }
  };

  // Filter & Sort Logic
  const filteredProducts = products
    .filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.slug.toLowerCase().includes(search.toLowerCase()) ||
        (p.vendors?.store_name &&
          p.vendors.store_name.toLowerCase().includes(search.toLowerCase()));

      const matchesVendor = vendorFilter === "all" ? true : p.vendor_id === vendorFilter;
      const matchesCategory = categoryFilter === "all" ? true : p.category_id === categoryFilter;

      let matchesStatus = true;
      if (statusFilter === "published") matchesStatus = p.is_published;
      else if (statusFilter === "hidden") matchesStatus = !p.is_published;
      else if (statusFilter === "featured") matchesStatus = p.is_featured;

      return matchesSearch && matchesVendor && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortField === "price_cents") return b.price_cents - a.price_cents;
      if (sortField === "stock") return b.stock - a.stock;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const filteredIds = filteredProducts.map((p) => p.id);

  return (
    <div className="space-y-8 relative pb-20">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-amber-500 mb-2 font-semibold">
          Catalog
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Product Moderation</h1>
        <p className="text-sm text-slate-400 mt-2">
          Manage marketplace listings, approve/hide vendor creations, and highlight featured works.
        </p>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search products by title, vendor, or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:border-amber-500 outline-none transition-colors"
            />
          </div>

          {/* Sort */}
          <div>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-500 transition-colors"
            >
              <option value="created_at">Sort: Newest</option>
              <option value="price_cents">Sort: Price (High-Low)</option>
              <option value="stock">Sort: Stock Level</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-500 transition-colors"
            >
              <option value="all">Status: All</option>
              <option value="published">Status: Published</option>
              <option value="hidden">Status: Hidden</option>
              <option value="featured">Status: Featured</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/50">
          {/* Vendor Filter */}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 block">
              Filter by Store
            </label>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full px-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-500 transition-colors"
            >
              <option value="all">All Vendors</option>
              {filterVendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.store_name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 block">
              Filter by Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-500 transition-colors"
            >
              <option value="all">All Categories</option>
              {filterCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      {loadingProducts ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <Package className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="font-semibold text-lg text-slate-400">No products cataloged</p>
          <p className="text-sm text-slate-500 mt-1">
            Change your search queries or filter attributes.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-4 px-6 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredIds.length && filteredIds.length > 0}
                      onChange={() => toggleSelectAll(filteredIds)}
                      className="accent-amber-500 h-4 w-4 rounded border-slate-700 bg-slate-950"
                    />
                  </th>
                  <th className="py-4 px-6">Product details</th>
                  <th className="py-4 px-6">Vendor / Store</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Stock</th>
                  <th className="py-4 px-6">Price</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredProducts.map((p) => (
                  <tr
                    key={p.id}
                    className={`text-slate-300 hover:bg-slate-800/20 transition-colors ${
                      selectedIds.includes(p.id) ? "bg-amber-500/5" : ""
                    }`}
                  >
                    {/* Selection Checkbox */}
                    <td className="py-4 px-6 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="accent-amber-500 h-4 w-4 rounded border-slate-700 bg-slate-950"
                      />
                    </td>

                    {/* Image + Title */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 shrink-0 flex items-center justify-center">
                          {p.cover_image ? (
                            <img
                              src={p.cover_image}
                              alt={p.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-white truncate max-w-[200px]">
                            {p.title}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">{p.slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* Vendor */}
                    <td className="py-4 px-6 text-slate-400 font-medium text-xs">
                      {p.vendors?.store_name || "Unknown Shop"}
                    </td>

                    {/* Category */}
                    <td className="py-4 px-6 text-slate-400 text-xs">
                      {p.categories?.name || "Uncategorized"}
                    </td>

                    {/* Stock */}
                    <td className="py-4 px-6 text-xs">
                      <span
                        className={`font-semibold ${
                          p.stock === 0
                            ? "text-rose-400"
                            : p.stock < 5
                              ? "text-amber-400"
                              : "text-slate-300"
                        }`}
                      >
                        {p.stock} units
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-4 px-6 font-semibold text-slate-200">{inr(p.price_cents)}</td>

                    {/* Status badges */}
                    <td className="py-4 px-6 space-y-1">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                            p.is_published
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {p.is_published ? "Published" : "Hidden"}
                        </span>
                        {p.is_featured && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Sparkles className="h-2.5 w-2.5" /> Featured
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                      {/* Publish / Hide toggle */}
                      {p.is_published ? (
                        <button
                          onClick={() =>
                            updateProduct.mutate({ id: p.id, updates: { is_published: false } })
                          }
                          className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Hide Listing"
                        >
                          <EyeOff className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            updateProduct.mutate({ id: p.id, updates: { is_published: true } })
                          }
                          className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 rounded-lg transition-colors cursor-pointer"
                          title="Publish Listing"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}

                      {/* Feature toggle */}
                      {p.is_featured ? (
                        <button
                          onClick={() =>
                            updateProduct.mutate({ id: p.id, updates: { is_featured: false } })
                          }
                          className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-amber-500 hover:text-slate-400 rounded-lg transition-colors cursor-pointer"
                          title="Remove Feature"
                        >
                          <StarOff className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            updateProduct.mutate({ id: p.id, updates: { is_featured: true } })
                          }
                          className="p-2 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 border border-amber-500/20 rounded-lg transition-colors cursor-pointer"
                          title="Feature Listing"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => {
                          if (confirm("Delete this product permanently? This cannot be undone.")) {
                            deleteProduct.mutate(p.id);
                          }
                        }}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-slate-950 border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-800 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom duration-250">
          <span className="text-xs font-semibold text-slate-300">
            {selectedIds.length} items selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() =>
                bulkUpdate.mutate({ ids: selectedIds, updates: { is_published: true } })
              }
              className="px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-colors cursor-pointer"
            >
              Approve Selected
            </button>
            <button
              onClick={() =>
                bulkUpdate.mutate({ ids: selectedIds, updates: { is_published: false } })
              }
              className="px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Hide Selected
            </button>
            <button
              onClick={() => {
                if (confirm(`Permanently delete all ${selectedIds.length} selected products?`)) {
                  bulkDelete.mutate(selectedIds);
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
