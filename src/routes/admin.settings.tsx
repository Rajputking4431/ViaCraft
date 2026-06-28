import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/utils/format";
import { useState } from "react";
import { toast } from "sonner";
import { CloudinaryUpload } from "@/components/ui/CloudinaryUpload";
import {
  Settings as SettingsIcon,
  Loader2,
  DollarSign,
  Briefcase,
  Percent,
  Download,
  Plus,
  CheckCircle,
  FileSpreadsheet,
  Globe,
  Mail,
  Shield,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("platform");

  // Payout creation form states
  const [showAddPayout, setShowAddPayout] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [payoutStatus, setPayoutStatus] = useState("pending");
  const [payoutBusy, setPayoutBusy] = useState(false);

  // Settings form states
  const [siteName, setSiteName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [commissionPct, setCommissionPct] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [settingsBusy, setSettingsBusy] = useState(false);

  // 1. Fetch platform settings
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["admin-settings-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("id", "default")
        .maybeSingle();

      if (error) throw error;

      const res = data ?? {
        site_name: "ViaCraft",
        logo_url: "",
        support_email: "support@viacraft.com",
        commission_percentage: 10.0,
        contact_info: "",
      };

      // Populate local form states
      setSiteName(res.site_name);
      setLogoUrl(res.logo_url || "");
      setSupportEmail(res.support_email);
      setCommissionPct(String(res.commission_percentage));
      setContactInfo(res.contact_info || "");

      return res;
    },
  });

  // 2. Fetch vendors
  const { data: vendors = [], isLoading: loadingVendors } = useQuery({
    queryKey: ["admin-payouts-vendors"],
    queryFn: async () => (await supabase.from("vendors").select("id, store_name")).data ?? [],
  });

  // 3. Fetch payouts
  const { data: payouts = [], isLoading: loadingPayouts } = useQuery({
    queryKey: ["admin-payouts-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_payouts")
        .select("*, vendors(store_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 4. Fetch orders & order items for financial zipping
  const { data: orderItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ["admin-payouts-order-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("order_items").select("*, orders(status)");
      if (error) throw error;
      return data ?? [];
    },
  });

  const loading = loadingSettings || loadingVendors || loadingPayouts || loadingItems;

  // --- Settings Mutator ---
  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsBusy(true);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .update({
          site_name: siteName,
          logo_url: logoUrl || null,
          support_email: supportEmail,
          commission_percentage: parseFloat(commissionPct || "10"),
          contact_info: contactInfo || null,
        })
        .eq("id", "default");

      if (error) throw error;
      toast.success("Platform settings saved successfully");
      qc.invalidateQueries({ queryKey: ["admin-settings-config"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSettingsBusy(false);
    }
  };

  // --- Payout Mutators ---
  const createPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId || !payoutAmount) {
      toast.error("Please fill in vendor and amount");
      return;
    }
    setPayoutBusy(true);
    try {
      const amountCents = Math.round(parseFloat(payoutAmount) * 100);
      const isPaid = payoutStatus === "paid";

      const { error } = await supabase.from("vendor_payouts").insert({
        vendor_id: selectedVendorId,
        amount_cents: amountCents,
        status: payoutStatus,
        reference_note: payoutNote || null,
        paid_at: isPaid ? new Date().toISOString() : null,
      });

      if (error) throw error;
      toast.success("Payout record created");
      qc.invalidateQueries({ queryKey: ["admin-payouts-list"] });
      setShowAddPayout(false);
      setSelectedVendorId("");
      setPayoutAmount("");
      setPayoutNote("");
      setPayoutStatus("pending");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log payout");
    } finally {
      setPayoutBusy(false);
    }
  };

  const markPayoutPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vendor_payouts")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payouts-list"] });
      toast.success("Payout marked as Paid");
    },
    onError: (e) => toast.error(e.message),
  });

  // --- Financial Calculations ---
  const commissionRate = settings?.commission_percentage ?? 10.0;

  // Calculate earnings for each vendor: subtotal_cents * (1 - rate)
  const vendorEarningsMap: { [key: string]: number } = {};
  orderItems.forEach((item) => {
    const isCompletedOrder = ["paid", "processing", "shipped", "delivered"].includes(
      item.orders?.status || "",
    );
    if (isCompletedOrder) {
      const earnings = Math.round((item.subtotal_cents || 0) * (1 - commissionRate / 100));
      vendorEarningsMap[item.vendor_id] = (vendorEarningsMap[item.vendor_id] || 0) + earnings;
    }
  });

  // Calculate payout totals per vendor
  const vendorPaidMap: { [key: string]: number } = {};
  const vendorPendingMap: { [key: string]: number } = {};

  payouts.forEach((p) => {
    if (p.status === "paid") {
      vendorPaidMap[p.vendor_id] = (vendorPaidMap[p.vendor_id] || 0) + p.amount_cents;
    } else {
      vendorPendingMap[p.vendor_id] = (vendorPendingMap[p.vendor_id] || 0) + p.amount_cents;
    }
  });

  // Calculate Global Balances
  const totalPaid = payouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount_cents, 0);
  const totalPending = payouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount_cents, 0);

  // Vendor Balance = Total Earnings - Paid Amount - Pending Amount (Optionally)
  // Let's define: Balance = Total Earnings - Paid Amount
  let totalBalance = 0;
  vendors.forEach((v) => {
    const earnings = vendorEarningsMap[v.id] || 0;
    const paid = vendorPaidMap[v.id] || 0;
    const bal = Math.max(0, earnings - paid);
    totalBalance += bal;
  });

  // --- CSV Export Utility ---
  const exportPayouts = () => {
    if (payouts.length === 0) {
      toast.error("No payout logs to export");
      return;
    }

    const headers = [
      "Payout ID",
      "Vendor Store",
      "Amount (INR)",
      "Status",
      "Remarks",
      "Date Logged",
      "Date Paid",
    ];
    const rows = payouts.map((p) => [
      p.id,
      p.vendors?.store_name || "N/A",
      (p.amount_cents / 100).toFixed(2),
      p.status,
      p.reference_note || "",
      new Date(p.created_at).toLocaleDateString(),
      p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${val}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `viacraft_payouts_audit_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV report exported successfully");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-amber-500 mb-2 font-semibold">
          Configuration
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white">System Settings</h1>
        <p className="text-sm text-slate-400 mt-2">
          Adjust platform fee parameters, change branding information, and audit seller payout
          histories.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex w-fit gap-1">
          <TabsTrigger
            value="platform"
            className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950"
          >
            Platform Config
          </TabsTrigger>
          <TabsTrigger
            value="payouts"
            className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950"
          >
            Vendor Payouts
          </TabsTrigger>
        </TabsList>

        {/* 1. Platform Config Tab */}
        <TabsContent value="platform">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-3xl">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Globe className="h-5 w-5 text-amber-500" /> Site-Wide Parameters
            </h3>

            <form onSubmit={saveSettings} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Site Name */}
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">
                    Marketplace Name
                  </label>
                  <input
                    type="text"
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none transition-colors"
                  />
                </div>

                {/* Commission Percentage */}
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">
                    Platform Commission (%)
                  </label>
                  <div className="relative">
                    <Percent className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={commissionPct}
                      onChange={(e) => setCommissionPct(e.target.value)}
                      className="w-full pl-4 pr-11 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none transition-colors font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Site Logo */}
                <CloudinaryUpload
                  label="Logo Asset URL"
                  value={logoUrl}
                  onChange={(val) => setLogoUrl(val as string)}
                />

                {/* Support Email */}
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">
                    Support Desk Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className="w-full pl-4 pr-11 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info Text */}
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">
                  Platform Contact Details / Bio
                </label>
                <textarea
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  rows={4}
                  placeholder="Ex: ViaCraft HQ, Sector 5, Bangalore, India. +91 99999 99999"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none transition-colors leading-relaxed"
                />
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Changing commission rates
                  will adjust future orders payouts.
                </p>
                <button
                  type="submit"
                  disabled={settingsBusy}
                  className="px-6 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-amber-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {settingsBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save Configuration"
                  )}
                </button>
              </div>
            </form>
          </div>
        </TabsContent>

        {/* 2. Vendor Payouts Tab */}
        <TabsContent value="payouts" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Total Paid Amount
              </p>
              <h4 className="text-xl font-bold text-emerald-400 mt-1.5 font-display">
                {inr(totalPaid)}
              </h4>
            </div>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Total Pending Payouts
              </p>
              <h4 className="text-xl font-bold text-amber-400 mt-1.5 font-display">
                {inr(totalPending)}
              </h4>
            </div>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Estimated Vendor Balances
              </p>
              <h4 className="text-xl font-bold text-violet-400 mt-1.5 font-display">
                {inr(totalBalance)}
              </h4>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex justify-between items-center bg-slate-900 p-4 border border-slate-800 rounded-2xl">
            <h4 className="text-sm font-semibold text-white">Payout Ledger Logs</h4>
            <div className="flex gap-2">
              <button
                onClick={exportPayouts}
                className="px-4 py-2.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Export CSV
              </button>
              <button
                onClick={() => setShowAddPayout(true)}
                className="px-4 py-2.5 bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Log Payout
              </button>
            </div>
          </div>

          {/* Add Payout Form Box (Collapsible) */}
          {showAddPayout && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl animate-in slide-in-from-top duration-150">
              <h4 className="text-sm font-semibold text-white mb-4">Record Vendor Payout</h4>
              <form onSubmit={createPayout} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Select Vendor */}
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 block">
                      Select Vendor Store
                    </label>
                    <select
                      value={selectedVendorId}
                      onChange={(e) => setSelectedVendorId(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-500 transition-colors"
                    >
                      <option value="">Select Vendor...</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.store_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Payout Amount */}
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 block">
                      Payout Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 5000"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Payout Status */}
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 block">
                      Payout Status
                    </label>
                    <select
                      value={payoutStatus}
                      onChange={(e) => setPayoutStatus(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-500 transition-colors"
                    >
                      <option value="pending">Pending Processing</option>
                      <option value="paid">Paid Out</option>
                    </select>
                  </div>

                  {/* Reference Note */}
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 block">
                      Reference Remarks
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: IMPS Bank Transfer #9929..."
                      value={payoutNote}
                      onChange={(e) => setPayoutNote(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-slate-800/40">
                  <button
                    type="button"
                    onClick={() => setShowAddPayout(false)}
                    className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={payoutBusy}
                    className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-amber-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {payoutBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Record"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Payouts list table */}
          {payouts.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              <DollarSign className="h-10 w-10 mx-auto mb-2 text-slate-600" />
              <p>No payout records logged.</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                      <th className="py-3.5 px-6">Vendor Store</th>
                      <th className="py-3.5 px-6">Amount</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6">Remarks / Note</th>
                      <th className="py-3.5 px-6">Logged Date</th>
                      <th className="py-3.5 px-6">Paid Date</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {payouts.map((p) => (
                      <tr
                        key={p.id}
                        className="text-slate-300 hover:bg-slate-800/10 transition-colors"
                      >
                        <td className="py-3.5 px-6 font-semibold text-white">
                          {p.vendors?.store_name}
                        </td>
                        <td className="py-3.5 px-6 font-mono text-slate-200">
                          {inr(p.amount_cents)}
                        </td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                              p.status === "paid"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-400 text-xs truncate max-w-[150px]">
                          {p.reference_note || "—"}
                        </td>
                        <td className="py-3.5 px-6 text-xs text-slate-500">
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-6 text-xs text-slate-500">
                          {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          {p.status === "pending" && (
                            <button
                              onClick={() => markPayoutPaid.mutate(p.id)}
                              className="p-1 px-2.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                              title="Mark as Paid"
                            >
                              <CheckCircle className="h-3.5 w-3.5 inline mr-1" /> Paid
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
