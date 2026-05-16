import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, LayoutDashboard, LogOut, Shield, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/auth";
import { Logo } from "@/components/site/Logo";

const nav = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/jobs", label: "Find Jobs" },
  { to: "/employers", label: "For Employers" },
  { to: "/pricing", label: "Pricing" },
  { to: "/assessment", label: "Assessment" },
  { to: "/faq", label: "FAQ" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, userType, isAdmin, logout } = useAuthStore();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const dashHref = userType === "employer" ? "/dashboard/employer" : "/dashboard/physician";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleLogout() {
    logout();
    toast.success("Signed out");
    setOpen(false);
    navigate({ to: "/" });
  }

  function isActive(to: string) {
    if (to === "/") return pathname === "/";
    return pathname === to || pathname.startsWith(`${to}/`);
  }

  return (
    <header
      className={`flex-none sticky top-0 z-50 w-full transition-[backdrop-filter,background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? "border-b border-border/70 bg-surface/80 shadow-[0_2px_24px_rgba(10,22,40,0.04)] backdrop-blur-xl"
          : "border-b border-transparent bg-surface/60 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-6 px-4 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((n) => {
            const active = isActive(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`group relative rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-primary"
                }`}
              >
                {n.label}
                <span
                  className={`pointer-events-none absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-accent transition-transform duration-300 ${
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  } origin-left`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-primary hover:bg-secondary"
                >
                  <Shield className="h-4 w-4" /> Admin
                </Link>
              )}
              <Link
                to={dashHref as never}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-primary hover:bg-secondary"
              >
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-[13px] font-semibold text-primary transition hover:border-primary/30 hover:bg-secondary"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl px-3 py-2 text-[13px] font-semibold text-muted-foreground transition hover:bg-secondary hover:text-primary"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="group inline-flex items-center gap-1.5 rounded-xl bg-gradient-accent px-4 py-2 text-[13px] font-semibold text-primary shadow-glow transition hover:scale-[1.02] active:scale-[0.98]"
              >
                Get started
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </>
          )}
        </div>

        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-primary lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="animate-fade-in border-t border-border bg-surface lg:hidden">
          <div className="space-y-1 px-4 py-4">
            {nav.map((n, i) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                style={{ animationDelay: `${i * 40}ms` }}
                className={`animate-fade-up block rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  isActive(n.to)
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-primary"
                }`}
              >
                {n.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-3">
              {isAuthenticated ? (
                <>
                  <Link
                    to={dashHref as never}
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-center text-sm font-semibold text-primary"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex-1 rounded-xl bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-center text-sm font-semibold text-primary"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl bg-gradient-accent px-3 py-2.5 text-center text-sm font-semibold text-primary shadow-glow"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
