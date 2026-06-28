import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { CloudinaryUpload } from "@/components/ui/CloudinaryUpload";
import {
  FolderOpen,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  Image as ImageIcon,
  Tag,
  Hash,
} from "lucide-react";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

function AdminCategories() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [busy, setBusy] = useState(false);

  // Fetch all categories sorted by sort_order
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Handle auto slug completion from name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingId) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      );
    }
  };

  // Mutator for creating/updating category
  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) {
      toast.error("Name and slug are required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name,
        slug,
        description: description || null,
        image_url: imageUrl || null,
        sort_order: parseInt(sortOrder || "0"),
      };

      if (editingId) {
        const { error } = await supabase.from("categories").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Category updated successfully");
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
        toast.success("Category created successfully");
      }

      resetForm();
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setBusy(false);
    }
  };

  // Mutator for deleting category
  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category deleted successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  // Mutator for sorting categories
  const swapOrder = useMutation({
    mutationFn: async ({ catA, catB }: { catA: any; catB: any }) => {
      const { error: errA } = await supabase
        .from("categories")
        .update({ sort_order: catB.sort_order })
        .eq("id", catA.id);
      if (errA) throw errA;

      const { error: errB } = await supabase
        .from("categories")
        .update({ sort_order: catA.sort_order })
        .eq("id", catB.id);
      if (errB) throw errB;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category order adjusted");
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setSlug("");
    setDescription("");
    setImageUrl("");
    setSortOrder("0");
  };

  const startEdit = (cat: any) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || "");
    setImageUrl(cat.image_url || "");
    setSortOrder(String(cat.sort_order));
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const catA = categories[index];
    const catB = direction === "up" ? categories[index - 1] : categories[index + 1];
    if (catA && catB) {
      // If their sort orders are the same, give B +1 or B -1 so they differ before swapping
      if (catA.sort_order === catB.sort_order) {
        catB.sort_order = direction === "up" ? catA.sort_order - 1 : catA.sort_order + 1;
      }
      swapOrder.mutate({ catA, catB });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-amber-500 mb-2 font-semibold font-sans">
          Settings
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Category Management</h1>
        <p className="text-sm text-slate-400 mt-2">
          Create product categories, set routing slugs, upload images, and control sorting indices.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side: Category List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Registered Categories</h3>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FolderOpen className="h-10 w-10 mx-auto mb-2 text-slate-600" />
                <p>No categories created yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4 w-12">Index</th>
                      <th className="py-3 px-4">Category Details</th>
                      <th className="py-3 px-4">Slug</th>
                      <th className="py-3 px-4 text-center">Move</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {categories.map((cat, idx) => (
                      <tr
                        key={cat.id}
                        className="text-slate-300 hover:bg-slate-800/10 transition-colors"
                      >
                        {/* Sort Order Index */}
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-xs">
                          {cat.sort_order}
                        </td>

                        {/* Image + Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded bg-slate-950 border border-slate-850 overflow-hidden shrink-0 flex items-center justify-center">
                              {cat.image_url ? (
                                <img
                                  src={cat.image_url}
                                  alt={cat.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <FolderOpen className="h-4 w-4 text-slate-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-white text-sm">{cat.name}</p>
                              {cat.description && (
                                <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
                                  {cat.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Slug */}
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-400">{cat.slug}</td>

                        {/* Order movement buttons */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex gap-1">
                            <button
                              onClick={() => handleMove(idx, "up")}
                              disabled={idx === 0 || swapOrder.isPending}
                              className="p-1 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded disabled:opacity-30 cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleMove(idx, "down")}
                              disabled={idx === categories.length - 1 || swapOrder.isPending}
                              className="p-1 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded disabled:opacity-30 cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => startEdit(cat)}
                            className="p-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-amber-500 rounded transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  "Are you sure you want to delete this category? Products linked to it will be set to uncategorized.",
                                )
                              ) {
                                deleteCategory.mutate(cat.id);
                              }
                            }}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-slate-950 border border-rose-500/20 rounded transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

        {/* Right Side: CRUD Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">
            {editingId ? "Edit Category" : "Create Category"}
          </h3>

          <form onSubmit={saveCategory} className="space-y-4">
            {/* Category Name */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 block">
                Category Name *
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Ex: Floral Preservation"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:border-amber-500 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Slug */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 block">
                Routing Slug *
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Ex: floral-preservation"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:border-amber-500 outline-none transition-colors font-mono"
                />
              </div>
            </div>

            {/* Image URL */}
            <CloudinaryUpload
              label="Category Image"
              value={imageUrl}
              onChange={(val) => setImageUrl(val as string)}
            />

            {/* Sort Order */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 block">
                Sort Order Index
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="number"
                  placeholder="Ex: 0"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:border-amber-500 outline-none transition-colors font-mono"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 block">
                Description
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Write a brief overview of what this category contains..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:border-amber-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2.5 border border-slate-850 text-slate-400 hover:text-white rounded-xl text-xs uppercase tracking-wider font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={busy}
                className="flex-1 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-amber-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingId ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
