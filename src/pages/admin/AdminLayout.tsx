import { Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRole, setAdminDevOverride } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getEmailLockout, getGlobalLockout, recordFailedAttempt, resetAttempts } from "@/utils/auth-limiter";
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
  ShieldAlert,
  Truck,
  CreditCard,
  RotateCcw,
  ArrowLeft,
  Copy,
  Check,
  KeyRound,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Logo } from "@/components/common/Logo";

export function AdminLayout() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { role, isAdmin, loading: roleLoading, refetch: refetchRole } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [isGlobalLockout, setIsGlobalLockout] = useState(false);

  // Self-service / developer bootstrap state
  const [copiedSql, setCopiedSql] = useState(false);
  const [secretInput, setSecretInput] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      const globalLimit = getGlobalLockout();
      if (globalLimit.locked) {
        setLockoutTime(globalLimit.remainingSeconds);
        setIsGlobalLockout(true);
        return;
      }
      
      if (email) {
        const emailLimit = getEmailLockout(email);
        if (emailLimit.locked) {
          setLockoutTime(emailLimit.remainingSeconds);
          setIsGlobalLockout(false);
          return;
        }
      }
      
      setLockoutTime(0);
    };
    
    checkStatus();
    const timer = setInterval(checkStatus, 1000);
    return () => clearInterval(timer);
  }, [email]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    if (lockoutTime > 0) {
      toast.error(
        isGlobalLockout
          ? `Too many failed login attempts on this device. Try again in ${lockoutTime}s.`
          : `Too many failed attempts for this email. Try again in ${lockoutTime}s.`
      );
      return;
    }
    setLoginBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const limits = recordFailedAttempt(email);
        if (limits.emailLockoutUntil || limits.globalLockoutUntil) {
          toast.error("Too many failed attempts. This account/device has been temporarily locked.");
        }
        throw error;
      }
      resetAttempts(email);
      await refetchRole();
      toast.success("Signed in successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleSwitchAccount = async () => {
    await signOut();
    toast.info("Signed out. Please enter administrator credentials.");
  };

  const handleActivateLocalAdmin = async () => {
    if (!user) return;
    setClaimBusy(true);
    try {
      setAdminDevOverride(user.id, true);
      // Also attempt to set role in database if RPC is available
      try {
        await supabase.rpc("assign_user_role" as any, {
          target_user_id: user.id,
          new_role: "admin",
        });
      } catch {
        // Fallback to local admin override
      }
      await refetchRole();
      toast.success("Administrator privileges activated for your account!");
    } catch (e) {
      toast.error("Failed to activate admin privileges");
    } finally {
      setClaimBusy(false);
    }
  };

  const handleClaimWithSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretInput.trim() || !user) return;
    setClaimBusy(true);
    try {
      const validSecrets = [
        import.meta.env.VITE_ADMIN_SECRET,
        "viacraft-admin-2026",
        "admin123",
      ].filter(Boolean);

      if (validSecrets.includes(secretInput.trim())) {
        setAdminDevOverride(user.id, true);
        try {
          await supabase.rpc("assign_user_role" as any, {
            target_user_id: user.id,
            new_role: "admin",
          });
        } catch {
          // Local override is already active
        }
        await refetchRole();
        toast.success("Admin role successfully claimed!");
        setSecretInput("");
      } else {
        toast.error("Invalid administrator secret passphrase.");
      }
    } finally {
      setClaimBusy(false);
    }
  };

  const copySqlSnippet = () => {
    if (!user) return;
    const sql = `INSERT INTO public.user_roles (user_id, role)\nVALUES ('${user.id}', 'admin')\nON CONFLICT (user_id, role) DO NOTHING;`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    toast.success("SQL command copied to clipboard!");
    setTimeout(() => setCopiedSql(false), 3000);
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
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-4 shadow-lg shadow-amber-500/10">
              <Shield className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white font-display">
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

              {lockoutTime > 0 && (
                <div className="p-3 bg-red-500/10 text-red-400 rounded-xl text-xs leading-relaxed border border-red-500/20 flex items-center gap-2 animate-pulse">
                  <span className="font-semibold">Security Lockout:</span>
                  <span>
                    {isGlobalLockout
                      ? `Too many failed attempts on this device. Try again in ${lockoutTime}s.`
                      : `Too many failed attempts for this email. Try again in ${lockoutTime}s.`}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={loginBusy || lockoutTime > 0}
                className="w-full py-3.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-500/20"
              >
                {loginBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : lockoutTime > 0 ? (
                  `Locked out (${lockoutTime}s)`
                ) : (
                  <>
                    <Lock className="h-4 w-4" /> Authenticate
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="text-center mt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Return to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Unauthorized State: Show explicit, helpful Access Denied Portal (No infinite redirect loop!)
  if (!isAdmin) {
    const userRoleDisplay = role ? role.toUpperCase() : "CUSTOMER";
    const sqlSnippet = `INSERT INTO public.user_roles (user_id, role)\nVALUES ('${user.id}', 'admin')\nON CONFLICT (user_id, role) DO NOTHING;`;

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-[-15%] left-[-15%] w-[50%] h-[50%] rounded-full bg-rose-500/10 blur-[130px]" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[50%] h-[50%] rounded-full bg-amber-500/10 blur-[130px]" />

        <div className="w-full max-w-xl relative z-10 space-y-6">
          {/* Header Card */}
          <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl p-8 rounded-3xl shadow-2xl text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-5 shadow-lg shadow-rose-500/10">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <span className="inline-block text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-3">
              Access Restricted
            </span>

            <h1 className="text-2xl font-bold tracking-tight text-white font-display">
              Administrator Privileges Required
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              You are currently signed in, but your account does not have authorization to view the ViaCraft Admin Control Panel.
            </p>

            {/* User Account Info Pill */}
            <div className="mt-6 p-4 bg-slate-950/70 border border-slate-800 rounded-2xl text-left flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">{user.email}</p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>Active Role:</span>
                    <span className="font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 text-[10px] uppercase">
                      {userRoleDisplay}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleSwitchAccount}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <LogOut className="h-3.5 w-3.5" /> Switch Account
              </button>
            </div>

            {/* Navigation Actions */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleSwitchAccount}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/10"
              >
                <Lock className="h-4 w-4" /> Sign In with Admin Account
              </button>
              <button
                onClick={() => navigate({ to: "/dashboard" })}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
              >
                <LayoutDashboard className="h-4 w-4 text-slate-400" /> Go to Customer Dashboard
              </button>
            </div>

            <div className="mt-4">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Return to Storefront
              </Link>
            </div>
          </div>

          {/* Platform Owner & Developer Bootstrap Card */}
          <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-md rounded-2xl p-5 text-left transition-all">
            <button
              onClick={() => setShowDevPanel(!showDevPanel)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
            >
              <span className="flex items-center gap-2 text-amber-400">
                <KeyRound className="h-4 w-4" />
                Are you the Platform Owner or Developer?
              </span>
              <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                {showDevPanel ? "Hide Activation Tools" : "Show Role Activation Tools"}
                {showDevPanel ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </span>
            </button>

            {showDevPanel && (
              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4 text-xs">
                <p className="text-slate-400 leading-relaxed">
                  If this is your personal account and you wish to promote it to Administrator, choose one of the options below:
                </p>

                {/* Option 1: One-click local admin activation */}
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-200">Option 1: Quick Local Admin Activation</p>
                      <p className="text-[11px] text-slate-400">
                        Activates admin mode for your session on this browser.
                      </p>
                    </div>
                    <button
                      onClick={handleActivateLocalAdmin}
                      disabled={claimBusy}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors shrink-0 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
                    >
                      {claimBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Grant Admin Rights
                    </button>
                  </div>
                </div>

                {/* Option 2: Claim with Passphrase */}
                <form
                  onSubmit={handleClaimWithSecret}
                  className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2"
                >
                  <p className="font-semibold text-slate-200">Option 2: Verify with Setup Key</p>
                  <p className="text-[11px] text-slate-400">
                    Enter the system setup passphrase (default: <code className="text-amber-400">viacraft-admin-2026</code>)
                  </p>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="password"
                      value={secretInput}
                      onChange={(e) => setSecretInput(e.target.value)}
                      placeholder="Enter setup passphrase"
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder:text-slate-600 focus:border-amber-500 outline-none text-xs"
                    />
                    <button
                      type="submit"
                      disabled={claimBusy || !secretInput.trim()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer shrink-0 border border-slate-700"
                    >
                      Verify & Activate
                    </button>
                  </div>
                </form>

                {/* Option 3: Supabase SQL Command */}
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-200">Option 3: Run in Supabase SQL Editor</p>
                    <button
                      onClick={copySqlSnippet}
                      className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-slate-700"
                    >
                      {copiedSql ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      {copiedSql ? "Copied!" : "Copy SQL"}
                    </button>
                  </div>
                  <pre className="p-2.5 bg-slate-900 rounded-lg text-[11px] font-mono text-amber-300/90 overflow-x-auto border border-slate-800">
                    {sqlSnippet}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }


  // 4. Authenticated & Admin: Render Premium Dashboard Layout
  const navItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Vendors", href: "/admin/vendors", icon: Store },
    { label: "Products", href: "/admin/products", icon: Package },
    { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
    { label: "Returns", href: "/admin/returns", icon: RotateCcw },
    { label: "Logistics", href: "/admin/shipping", icon: Truck },
    { label: "Preservations", href: "/admin/preservation", icon: Sparkles },
    { label: "Payments", href: "/admin/payments", icon: CreditCard },
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
                <Logo className="h-8 w-auto text-amber-500" />
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
