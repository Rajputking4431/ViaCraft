import { Navigate } from "react-router-dom";

export const Route = {
  component: () => {
    return <Navigate to="/admin/dashboard" replace />;
  },
};
