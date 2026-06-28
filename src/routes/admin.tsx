import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Store,
  ShoppingBag,
  Package,
  Sparkles,
  Users,
  FolderOpen,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  Lock,
  Mail,
  Loader2,
  Shield,
  Truck,
} from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  // Auto redirect if logged in but not admin
  useEffect(() => {
    if (!authLoading && !roleLoading && user && role !== "admin") {
      toast.error("Access denied. Administrators only.");
      navigate({ to: "/dashboard" });
    }
  }, [user, role, authLoading, roleLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoginBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Signed in successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoginBusy(false);
    }
  };

  // 1. Loading State
  if (authLoading || (user && roleLoading)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-4" />
        <p className="text-sm tracking-wider text-slate-400 uppercase">
          Loading secure admin portal...
        </p>
      </div>
    );
  }

  // 2. Unauthenticated State: Show Premium Admin Login Form
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Background Gradients */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[120px]" />

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-4">
              <Shield className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Admin Control Panel
            </h1>
            <p className="text-sm text-slate-400 mt-2">ViaCraft System Administration</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl p-8 rounded-3xl shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-400 font-medium">
                  Administrator Email
                </label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@viacraft.com"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:border-amber-500 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-slate-400 font-medium">
                  Security Password
                </label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:border-amber-500 outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginBusy}
                className="w-full py-3.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loginBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Lock className="h-4 w-4" /> Authenticate
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center mt-6 text-xs text-slate-500">
            Authorized access only. All actions are logged.
          </p>
        </div>
      </div>
    );
  }

  // 3. Unauthorized State (Authenticated but not Admin)
  if (role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-2" />
        <p className="text-slate-400">Verifying authorization...</p>
      </div>
    );
  }

  // 4. Authenticated & Admin: Render Premium Dashboard Layout
  const navItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Vendors", href: "/admin/vendors", icon: Store },
    { label: "Products", href: "/admin/products", icon: Package },
    { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
    { label: "Logistics", href: "/admin/shipping", icon: Truck },
    { label: "Preservations", href: "/admin/preservation", icon: Sparkles },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Categories", href: "/admin/categories", icon: FolderOpen },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "Settings", href: "/admin/settings", icon: SettingsIcon },
  ];

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate({ to: "/admin" });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      {/* Desktop Sidebar (Fixed) */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 shrink-0 sticky top-0 h-screen">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <Link to="/">
            <Logo className="h-8 w-auto text-amber-500" />
          </Link>
          <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            Admin
          </span>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-amber-500 text-slate-950 font-semibold shadow-lg shadow-amber-500/10"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar User Footer */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-3 rounded-xl bg-slate-950/40 border border-slate-800 mb-2">
            <div className="h-9 w-9 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-500 font-display flex items-center justify-center font-bold">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.email}</p>
              <p className="text-[10px] text-slate-500 truncate">System Operator</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5 text-sm transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            {/* Hamburger Button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Quick Search */}
            <div className="relative max-w-xs hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search resources..."
                className="w-64 pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:border-amber-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Area */}
            <button className="p-2.5 bg-slate-950/60 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all relative cursor-pointer">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-4 ring-slate-900" />
            </button>

            {/* User Dropdown Profile Icon */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="h-9 w-9 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center font-bold text-amber-500">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-200">{user.email?.split("@")[0]}</p>
                <p className="text-[9px] font-bold text-amber-500 tracking-wider uppercase">
                  Operator
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* View Outlet */}
        <main className="flex-1 p-6 md:p-8 bg-slate-950 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Drawer Navigation overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm lg:hidden">
          <div className="fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-8">
                <Logo className="h-8 w-auto" />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? "bg-amber-500 text-slate-950 font-semibold"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div>
              <div className="flex items-center gap-3 px-2 py-3 bg-slate-950/40 border border-slate-800 rounded-xl mb-4">
                <div className="h-9 w-9 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center font-bold">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-200 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/5 text-sm transition-all"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
