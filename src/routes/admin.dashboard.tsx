import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/utils/format";
import {
  Users,
  Store,
  Package,
  ShoppingBag,
  IndianRupee,
  Sparkles,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  // Query all essential data for metrics compiling
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["admin-dashboard-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("id, created_at")).data ?? [],
  });

  const { data: vendors = [], isLoading: loadingVendors } = useQuery({
    queryKey: ["admin-dashboard-vendors"],
    queryFn: async () =>
      (await supabase.from("vendors").select("id, status, created_at, store_name")).data ?? [],
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["admin-dashboard-products"],
    queryFn: async () =>
      (await supabase.from("products").select("id, price_cents, category_id")).data ?? [],
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["admin-dashboard-orders"],
    queryFn: async () =>
      (
        await supabase
          .from("orders")
          .select("id, total_cents, status, created_at, user_id, order_number")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const { data: preservations = [], isLoading: loadingPreservations } = useQuery({
    queryKey: ["admin-dashboard-preservations"],
    queryFn: async () =>
      (await supabase.from("preservation_requests").select("id, current_stage, created_at")).data ??
      [],
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ["admin-dashboard-categories"],
    queryFn: async () => (await supabase.from("categories").select("id, name")).data ?? [],
  });

  const loading =
    loadingProfiles ||
    loadingVendors ||
    loadingProducts ||
    loadingOrders ||
    loadingPreservations ||
    loadingCategories;

  // KPI Calculations
  const totalUsers = profiles.length;
  const totalVendors = vendors.length;
  const pendingVendors = vendors.filter((v) => v.status === "pending").length;
  const totalProducts = products.length;
  const totalOrders = orders.length;

  const validRevenueOrders = orders.filter((o) =>
    ["paid", "processing", "shipped", "delivered"].includes(o.status),
  );
  const totalRevenue = validRevenueOrders.reduce((sum, o) => sum + o.total_cents, 0);

  const activePreservations = preservations.filter((p) => p.current_stage !== "delivered").length;

  // Current Month Sales
  const now = new Date();
  const currentMonthSales = validRevenueOrders
    .filter((o) => {
      const orderDate = new Date(o.created_at);
      return (
        orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, o) => sum + o.total_cents, 0);

  // --- Charts Formatting ---

  // 1. Revenue & Orders Trend (Last 6 Months)
  const getMonthlyTrend = () => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const trendData: {
      [key: string]: { month: string; revenue: number; orders: number; timestamp: number };
    } = {};

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      trendData[key] = {
        month: `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`,
        revenue: 0,
        orders: 0,
        timestamp: d.getTime(),
      };
    }

    // Populate from orders
    orders.forEach((o) => {
      const orderDate = new Date(o.created_at);
      const key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}`;
      if (trendData[key]) {
        trendData[key].orders += 1;
        if (["paid", "processing", "shipped", "delivered"].includes(o.status)) {
          trendData[key].revenue += o.total_cents / 100; // in INR
        }
      }
    });

    return Object.values(trendData).sort((a, b) => a.timestamp - b.timestamp);
  };

  const monthlyTrend = getMonthlyTrend();

  // 2. Vendor Growth Trend
  const getVendorGrowth = () => {
    const growthData: { [key: string]: { month: string; count: number; timestamp: number } } = {};
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      growthData[key] = {
        month: `${months[d.getMonth()]}`,
        count: 0,
        timestamp: d.getTime(),
      };
    }

    // Distribute vendors
    vendors.forEach((v) => {
      const regDate = new Date(v.created_at);
      const key = `${regDate.getFullYear()}-${String(regDate.getMonth() + 1).padStart(2, "0")}`;
      if (growthData[key]) {
        growthData[key].count += 1;
      }
    });

    // Accumulate growth
    let accumulator = vendors.filter((v) => {
      const regDate = new Date(v.created_at);
      const oldestMonth = new Date();
      oldestMonth.setMonth(oldestMonth.getMonth() - 5);
      oldestMonth.setDate(1);
      return regDate < oldestMonth;
    }).length;

    const list = Object.values(growthData).sort((a, b) => a.timestamp - b.timestamp);
    return list.map((item) => {
      accumulator += item.count;
      return {
        month: item.month,
        "Total Vendors": accumulator,
      };
    });
  };

  const vendorGrowth = getVendorGrowth();

  // 3. Top Categories distribution
  const getCategoryDistribution = () => {
    const catMap: { [key: string]: number } = {};
    products.forEach((p) => {
      if (p.category_id) {
        catMap[p.category_id] = (catMap[p.category_id] || 0) + 1;
      }
    });

    const COLORS = ["#f59e0b", "#8b5cf6", "#10b981", "#ec4899", "#3b82f6", "#64748b"];

    return categories
      .map((c) => ({
        name: c.name,
        value: catMap[c.id] || 0,
      }))
      .filter((item) => item.value > 0)
      .slice(0, 5)
      .map((item, idx) => ({
        ...item,
        color: COLORS[idx % COLORS.length],
      }));
  };

  const categoryData = getCategoryDistribution();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
          <div className="h-5 w-24 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          <div className="h-80 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-amber-500 mb-2 font-semibold">
            Overview
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">Platform Control Board</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          Live Metrics
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Users}
          label="Total Users"
          value={totalUsers}
          color="amber"
          description="Registered collectors & vendors"
        />
        <KpiCard
          icon={Store}
          label="Total Vendors"
          value={totalVendors}
          color="violet"
          description={`${pendingVendors} pending registrations`}
          badge={pendingVendors > 0 ? `${pendingVendors} Pending` : undefined}
          badgeLink="/admin/vendors"
        />
        <KpiCard
          icon={Package}
          label="Total Products"
          value={totalProducts}
          color="emerald"
          description="Items active on marketplace"
        />
        <KpiCard
          icon={ShoppingBag}
          label="Total Orders"
          value={totalOrders}
          color="blue"
          description="All-time transactions count"
        />
        <KpiCard
          icon={IndianRupee}
          label="Total Revenue"
          value={inr(totalRevenue)}
          color="yellow"
          description="Gross merchandise value"
        />
        <KpiCard
          icon={TrendingUp}
          label="Monthly Sales"
          value={inr(currentMonthSales)}
          color="pink"
          description="Sales in current calendar month"
        />
        <KpiCard
          icon={Sparkles}
          label="Active Preservations"
          value={activePreservations}
          color="teal"
          description="Requests in workflow stage"
          badgeLink="/admin/preservation"
        />
        <KpiCard
          icon={AlertCircle}
          label="Vendor Approvals"
          value={pendingVendors}
          color="rose"
          description="Stores awaiting review"
          badge={pendingVendors > 0 ? "Action Required" : "Clean"}
          badgeLink="/admin/vendors"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Orders Trend Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Revenue & Transaction Volume</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                  }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue (₹)"
                  stroke="#f59e0b"
                  fillOpacity={1}
                  fill="url(#revenueGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Categories Pie Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-6">Category Distribution</h3>
          {categoryData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm">
              No categories mapped yet.
            </div>
          ) : (
            <div className="flex-1 flex flex-col sm:flex-row lg:flex-col items-center gap-6">
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "#fff" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 space-y-2 w-full">
                {categoryData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-400">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="font-semibold text-slate-200">{item.value} items</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Second Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vendor Growth */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Vendor Registrations</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendorGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Bar dataKey="Total Vendors" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Orders List */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
            <Link
              to="/admin/orders"
              className="text-xs text-amber-500 hover:text-amber-400 font-semibold flex items-center gap-1 hover:underline"
            >
              All Orders <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Order No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.id} className="text-slate-300 hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-white text-xs">
                      {o.order_number}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(o.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-semibold">{inr(o.total_cents)}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          o.status === "delivered"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : o.status === "cancelled" || o.status === "refunded"
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No transactions recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

interface KpiCardProps {
  icon: React.ComponentType<any>;
  label: string;
  value: string | number;
  color: "amber" | "violet" | "emerald" | "blue" | "yellow" | "pink" | "teal" | "rose";
  description: string;
  badge?: string;
  badgeLink?: string;
}

function KpiCard({ icon: Icon, label, value, color, description, badge, badgeLink }: KpiCardProps) {
  const colorClasses = {
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/25",
    violet: "bg-violet-500/10 text-violet-500 border-violet-500/25",
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/25",
    yellow: "bg-yellow-500/10 text-yellow-500 border-yellow-500/25",
    pink: "bg-pink-500/10 text-pink-500 border-pink-500/25",
    teal: "bg-teal-500/10 text-teal-500 border-teal-500/25",
    rose: "bg-rose-500/10 text-rose-500 border-rose-500/25",
  };

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between relative group hover:border-slate-700 transition-all">
      <div className="flex items-start justify-between">
        <div
          className={`h-11 w-11 rounded-xl flex items-center justify-center border ${colorClasses[color]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        {badge &&
          (badgeLink ? (
            <Link
              to={badgeLink}
              className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-slate-950 transition-colors"
            >
              {badge}
            </Link>
          ) : (
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {badge}
            </span>
          ))}
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        <h4 className="text-2xl font-bold text-white mt-1 font-display tracking-tight">{value}</h4>
        <p className="text-xs text-slate-500 mt-1.5">{description}</p>
      </div>
    </div>
  );
}
