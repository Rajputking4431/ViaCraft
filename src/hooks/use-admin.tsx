import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type AppRole = "customer" | "vendor" | "admin";

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
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);

      if (error) throw error;
      const roles = (data || []).map((r) => r.role as AppRole);
      
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

  return {
    role: roleData.primaryRole,
    roles: roleData.roles,
    hasRole: (targetRole: AppRole) => roleData.roles.includes(targetRole),
    isVendor: roleData.roles.includes("vendor"),
    isAdmin: roleData.roles.includes("admin"),
    loading: authLoading || roleLoading,
    refetch,
  };
}

export function useAdmin() {
  const { role, roles, loading } = useRole();

  return {
    isAdmin: role === "admin" || roles.includes("admin"),
    loading,
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

