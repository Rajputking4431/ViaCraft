import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type AppRole = "customer" | "vendor" | "admin";

export function useRole() {
  const { user, loading: authLoading } = useAuth();

  const {
    data: role = null,
    isLoading: roleLoading,
    refetch,
  } = useQuery({
    queryKey: ["user-role", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return (data?.role as AppRole) ?? null;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: false,
  });

  return {
    role,
    loading: authLoading || roleLoading,
    refetch,
  };
}

export function useAdmin() {
  const { role, loading } = useRole();

  return {
    isAdmin: role === "admin",
    loading,
  };
}

export function usePermissions() {
  const { role, loading } = useRole();
  const isAdmin = role === "admin";

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
