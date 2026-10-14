import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export const Route = {
  component: () => {
    const { user, loading } = useAuth();

    if (loading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-4" />
          <p className="text-sm tracking-wider text-slate-400 uppercase ml-3">
            Loading Secure Area...
          </p>
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/auth" replace />;
    }

    return <Outlet />;
  },
};
