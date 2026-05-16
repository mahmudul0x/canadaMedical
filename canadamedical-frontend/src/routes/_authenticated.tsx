import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/auth";
import { LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { user, userType, logout } = useAuthStore();
  const navigate = useNavigate();

  const dashHref = userType === "employer" ? "/dashboard/employer" : "/dashboard/physician";

  return <Outlet />;
}