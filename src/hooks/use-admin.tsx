import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type AppRole = "customer" | "vendor" | "admin";

// List of fallback admin emails (from env or defaults)
export const DEFAULT_ADMIN_EMAILS = [
  "admin@viacraft.com",
  "admin@resinverse.com",
  "support@viacraft.com",
];

export function getAdminEmails(): string[] {
  const envEmails = import.meta.env.VITE_ADMIN_EMAILS || "";
  const list = envEmails
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase()), ...list])];
}

export function isUserAdminByMetadataOrEmail(user: any): boolean {
  if (!user) return false;

  // 1. Check email match
  const userEmail = (user.email || "").toLowerCase();
  const adminEmails = getAdminEmails();
  if (userEmail && adminEmails.includes(userEmail)) {
    return true;
  }

  // 2. Check app_metadata
  const appRole = user.app_metadata?.role;
  const appRoles = user.app_metadata?.roles;
  if (
    appRole === "admin" ||
    (Array.isArray(appRoles) && appRoles.includes("admin")) ||
    user.app_metadata?.is_admin === true
  ) {
    return true;
  }

  // 3. Check user_metadata
  const userRole = user.user_metadata?.role;
  const userRoles = user.user_metadata?.roles;
  if (
    userRole === "admin" ||
    (Array.isArray(userRoles) && userRoles.includes("admin")) ||
    user.user_metadata?.is_admin === true
  ) {
    return true;
  }

  // 4. Check local development / owner override
  if (typeof window !== "undefined") {
    try {
      const devOverride = localStorage.getItem("viacraft_admin_override");
      if (devOverride === "true" || (user.id && devOverride === user.id)) {
        return true;
      }
    } catch {
      // ignore localStorage errors
    }
  }

  return false;
}

export function setAdminDevOverride(userId?: string, enabled = true) {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      localStorage.setItem("viacraft_admin_override", userId || "true");
    } else {
      localStorage.removeItem("viacraft_admin_override");
    }
  } catch {
    // ignore
  }
}

export function useRole() {
  const { user, loading: authLoading } = useAuth();

  const {
    data: roleData = { primaryRole: null as AppRole | null, roles: [] as AppRole[] },
    isLoading: roleLoading,
    refetch,
  } = useQuery({
    queryKey: ["user-roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      let dbRoles: AppRole[] = [];
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user!.id);

        if (!error && data) {
          dbRoles = data.map((r) => r.role as AppRole);
        } else if (error) {
          console.warn("[useRole] Note on user_roles fetch:", error.message);
        }
      } catch (err) {
        console.warn("[useRole] Exception fetching user_roles:", err);
      }

      // Check if user is recognized as admin via metadata, email, or dev override
      const isAdminByRule = isUserAdminByMetadataOrEmail(user);
      const rolesSet = new Set<AppRole>(dbRoles);
      if (isAdminByRule) {
        rolesSet.add("admin");
      }

      const roles = Array.from(rolesSet);

      // Compute highest privilege: admin > vendor > customer
      let primaryRole: AppRole | null = null;
      if (roles.includes("admin")) {
        primaryRole = "admin";
      } else if (roles.includes("vendor")) {
        primaryRole = "vendor";
      } else if (roles.includes("customer")) {
        primaryRole = "customer";
      } else if (roles.length > 0) {
        primaryRole = roles[0];
      }

      return { primaryRole, roles };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: false,
  });

  const isAdmin =
    roleData.primaryRole === "admin" ||
    roleData.roles.includes("admin") ||
    isUserAdminByMetadataOrEmail(user);

  return {
    role: isAdmin ? ("admin" as AppRole) : roleData.primaryRole,
    roles: roleData.roles,
    hasRole: (targetRole: AppRole) =>
      roleData.roles.includes(targetRole) || (targetRole === "admin" && isAdmin),
    isVendor: roleData.roles.includes("vendor"),
    isAdmin,
    loading: authLoading || roleLoading,
    refetch,
  };
}

export function useAdmin() {
  const { role, roles, isAdmin, loading, refetch } = useRole();

  return {
    isAdmin: isAdmin || role === "admin" || roles.includes("admin"),
    loading,
    refetch,
  };
}

export function usePermissions() {
  const { isAdmin, loading } = useAdmin();

  return {
    permissions: {
      canManageSettings: isAdmin,
      canModerateProducts: isAdmin,
      canManageVendors: isAdmin,
      canManageOrders: isAdmin,
      canManageCategories: isAdmin,
      canManageUsers: isAdmin,
      canViewAnalytics: isAdmin,
    },
    loading,
  };
}


