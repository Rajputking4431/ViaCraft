import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldAlert, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-display font-semibold text-white flex items-center gap-3">
          <Users className="h-8 w-8 text-amber-500" />
          User Management
        </h1>
        <p className="text-slate-400 mt-2">Manage system administrators and user permissions.</p>
      </div>

      <CreateAdminForm />
    </div>
  );
}

function CreateAdminForm() {
  const [targetUid, setTargetUid] = useState("");
  const [busy, setBusy] = useState(false);

  const handleMakeAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!targetUid.trim()) {
      toast.error("Please enter a valid User UID");
      return;
    }

    setBusy(true);
    try {
      // "as any" forces TypeScript to stop looking for this new function in your types file
      const { error } = await supabase.rpc("assign_user_role" as any, {
        target_user_id: targetUid.trim(),
        new_role: "admin",
      });

      if (error) throw error;

      toast.success("User successfully promoted to Admin!");
      setTargetUid("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign role");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl max-w-xl">
      <div className="flex items-center gap-3 mb-4 text-amber-500">
        <ShieldAlert className="h-5 w-5" />
        <h3 className="text-lg font-medium text-white">Promote New Administrator</h3>
      </div>

      <p className="text-sm text-slate-400 mb-6">
        Paste the target user's Supabase Auth UID below to grant them full system privileges. They
        must already have a standard account.
      </p>

      <form onSubmit={handleMakeAdmin} className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
            Target User UID
          </label>
          <input
            type="text"
            value={targetUid}
            onChange={(e) => setTargetUid(e.target.value)}
            placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
            className="w-full mt-1.5 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-amber-500 outline-none transition-colors"
            required
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="py-3 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Grant Admin Access"}
        </button>
      </form>
    </div>
  );
}
