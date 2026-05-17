import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, Building2, FilePlus2, Users,
  LayoutDashboard, Eye, Trash2, Pencil, Download,
  LogOut, Home, PanelLeftClose, PanelLeftOpen,
  ChevronDown, ChevronRight, X, FileText, Phone,
  Linkedin, Calendar, Globe, DollarSign, MapPin,
  CheckCircle2, AlertCircle, SlidersHorizontal, ExternalLink,
  Search, Filter, TrendingUp, BarChart2, Star, Clock,
  Award, XCircle, RefreshCw, ChevronUp,
  CreditCard, Zap, AlertTriangle, Loader2, Printer, ArrowUpRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { api, apiError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Field, Input, Select, Textarea, SubmitButton } from "@/components/site/Form";
import { SPECIALTIES, PROVINCES, JOB_TYPES } from "@/data/jobs";
import { useSubSpecialties } from "@/hooks/useSubSpecialties";
import { ErrorState, StatusBadge, InlineSpinner } from "@/components/site/QueryState";
import { Logo } from "@/components/site/Logo";
import { NotificationBell } from "@/components/site/NotificationBell";

export const Route = createFileRoute("/_authenticated/dashboard/employer")({
  head: () => ({ meta: [{ title: "Employer Dashboard — MedConnect Canada" }] }),
  validateSearch: (s: Record<string, unknown>): { subscription?: string } => ({
    subscription: typeof s.subscription === "string" ? s.subscription : undefined,
  }),
  component: EmployerDashboard,
});

type Tab = "overview" | "jobs" | "post" | "applications" | "profile" | "billing";

interface UserSubscription {
  plan_name: string;
  plan_type?: string;
  is_custom?: boolean;
  status: string;
  price_monthly: string;
  current_period_end: string | null;
  days_remaining: number | null;
  job_post_limit: number | null;
  custom_job_limit?: number | null;
  jobs_posted: number;
  jobs_remaining: number | null;
  cancel_at_period_end: boolean;
  has_stripe_subscription?: boolean;
  custom_features?: string[];
  custom_valid_until?: string | null;
  custom_payment_status?: "pending_payment" | "paid" | "free" | null;
  custom_payment_link?: string | null;
  custom_price_monthly?: string | null;
}

interface EnterpriseRequest {
  id: number;
  status: "pending" | "reviewing" | "approved" | "rejected";
  organization_name: string;
  created_at: string;
  rejected_reason?: string;
  custom_job_limit?: number | null;
  custom_price_monthly?: string | null;
  custom_features?: string[];
  approved_at?: string | null;
}

interface ApiPlan {
  id: number;
  name: string;
  price_monthly: string;
  is_free: boolean;
  is_enterprise: boolean;
  is_popular: boolean;
  job_post_limit: number | null;
  features: string[];
  stripe_price_id: string | null;
}

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "jobs", label: "My Jobs", icon: Briefcase },
  { id: "post", label: "Post New Job", icon: FilePlus2 },
  { id: "applications", label: "Applications", icon: Users },
  { id: "profile", label: "Company Profile", icon: Building2 },
  { id: "billing", label: "Billing", icon: CreditCard },
];

const PRACTICE_SETTINGS = [
  { value: "urban", label: "Urban" },
  { value: "suburban", label: "Suburban" },
  { value: "rural", label: "Rural" },
  { value: "northern_remote", label: "Northern / Remote" },
  { value: "academic_teaching", label: "Academic / Teaching" },
  { value: "community_hospital", label: "Community Hospital" },
  { value: "private_clinic", label: "Private Clinic" },
];

const COMPENSATION_MODELS = [
  { value: "salary", label: "Salary" },
  { value: "fee_for_service", label: "Fee for Service" },
  { value: "alternative_payment", label: "Alternative Payment Plan" },
  { value: "blended", label: "Blended Model" },
  { value: "contract_rate", label: "Contract Rate" },
];

const EXPERIENCE_LEVELS = [
  { value: "new_grad", label: "New Graduate" },
  { value: "1_3_years", label: "1–3 Years" },
  { value: "3_5_years", label: "3–5 Years" },
  { value: "5_10_years", label: "5–10 Years" },
  { value: "10_plus", label: "10+ Years" },
];

const APP_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview", label: "Interview" },
  { value: "offered", label: "Offered" },
  { value: "rejected", label: "Rejected" },
];

const APP_STATUS_META: Record<string, { bg: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending:     { bg: "bg-amber-100",   color: "text-amber-800",   icon: Clock },
  reviewed:    { bg: "bg-blue-100",    color: "text-blue-800",    icon: Eye },
  shortlisted: { bg: "bg-violet-100",  color: "text-violet-800",  icon: Star },
  interview:   { bg: "bg-indigo-100",  color: "text-indigo-800",  icon: Calendar },
  offered:     { bg: "bg-emerald-100", color: "text-emerald-800", icon: Award },
  rejected:    { bg: "bg-rose-100",    color: "text-rose-800",    icon: XCircle },
  withdrawn:   { bg: "bg-slate-100",   color: "text-slate-700",   icon: AlertCircle },
};

interface EmpJob {
  id: number;
  title: string;
  specialty?: string;
  specialty_display?: string;
  location_display?: string;
  job_type?: string;
  job_type_display?: string;
  is_active?: boolean;
  is_approved?: boolean;
  applications_count?: number;
  views_count?: number;
  created_at?: string;
  application_deadline?: string | null;
}

interface ReceivedApp {
  id: number | string;
  job_id?: number;
  job_title?: string;
  job_location?: string;
  physician_name?: string;
  physician_email?: string;
  physician_specialty?: string;
  physician_specialty_display?: string;
  physician_cpso?: string;
  physician_certifications?: string;
  cover_letter?: string;
  resume_url?: string;
  profile_resume_url?: string;
  phone?: string;
  years_experience?: number;
  linkedin_url?: string;
  availability_date?: string;
  willing_to_relocate?: boolean;
  status?: string;
  status_display?: string;
  employer_notes?: string;
  applied_at?: string;
  updated_at?: string;
}

function jobStatusInfo(job: EmpJob): { label: string; bg: string; color: string } {
  if (!job.is_active) return { label: "Closed", bg: "bg-slate-100", color: "text-slate-700" };
  if (job.is_approved) return { label: "Active", bg: "bg-emerald-100", color: "text-emerald-800" };
  return { label: "Pending", bg: "bg-amber-100", color: "text-amber-800" };
}

function JobStatusPill({ job }: { job: EmpJob }) {
  const { label, bg, color } = jobStatusInfo(job);
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${bg} ${color}`}>{label}</span>;
}

function AppStatusPill({ status }: { status?: string }) {
  const s = status ?? "pending";
  const meta = APP_STATUS_META[s] ?? APP_STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.bg} ${meta.color}`}>
      <Icon className="h-3 w-3" />{s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

function SubSpecialtySelect({ specialty, value, onChange }: {
  specialty: string; value: string; onChange: (v: string) => void;
}) {
  const { data, isLoading } = useSubSpecialties(specialty || undefined);
  const opts = data ?? [];
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={isLoading}>
      <option value="">{isLoading ? "Loading…" : "Select sub-specialty (optional)"}</option>
      {opts.map((s) => <option key={String(s.id)} value={s.name}>{s.name}</option>)}
    </Select>
  );
}

function EmployerDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { subscription: subParam } = Route.useSearch();
  const toastShown = useRef(false);

  // Handle Stripe redirect-back toasts
  useEffect(() => {
    if (!subParam || toastShown.current) return;
    toastShown.current = true;
    if (subParam === "success") {
      toast.success("🎉 Welcome to Professional Plan! Your subscription is now active.");
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
    } else if (subParam === "cancelled") {
      toast.error("Subscription checkout cancelled. You can try again anytime.");
    }
    navigate({ to: "/dashboard/employer", replace: true } as never);
  }, [subParam, navigate, qc]);

  // Fetch subscription
  const { data: subscription } = useQuery<UserSubscription | null>({
    queryKey: ["my-subscription"],
    queryFn: async () => {
      const r = await api.get("/api/subscriptions/my-subscription/");
      const d = r.data?.data;
      // success_response(data=None) returns {} — treat empty object as null
      if (!d || typeof d !== "object" || !("plan_name" in d)) return null;
      return d as UserSubscription;
    },
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Fetch enterprise request status
  const { data: enterpriseRequest } = useQuery<EnterpriseRequest | null>({
    queryKey: ["my-enterprise-request"],
    queryFn: async () => {
      try {
        const r = await api.get("/api/subscriptions/enterprise/my-request/");
        const d = r.data?.data;
        // success_response(data=None) returns {} — treat empty object as null
        if (!d || typeof d !== "object" || !("id" in d)) return null;
        return d as EnterpriseRequest;
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const currentTab = TABS.find((t) => t.id === tab) ?? TABS[0];

  function handleLogout() {
    logout();
    toast.success("Signed out");
    navigate({ to: "/login" as never }).catch(() => { window.location.href = "/login"; });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className={`flex flex-col border-r border-border bg-card transition-[width] duration-200 shrink-0 ${sidebarOpen ? "w-56" : "w-14"}`}>

        {/* Logo area — only when open */}
        <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
          {sidebarOpen && (
            <div className="[&_a]:text-foreground [&_img]:h-6">
              <Logo />
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto space-y-0.5 p-2">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                title={label}
                className={`flex w-full items-center rounded-xl py-2.5 text-sm font-semibold transition
                  ${sidebarOpen ? "gap-2.5 px-3" : "justify-center px-2"}
                  ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span className="truncate">{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-border p-2">
          <button
            onClick={handleLogout}
            title="Sign Out"
            className={`flex w-full items-center rounded-xl py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition
              ${sidebarOpen ? "gap-2.5 px-3" : "justify-center px-2"}`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4">
          {/* Sidebar toggle — always visible in header */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>

          <h1 className="flex-1 text-sm font-bold text-foreground">{currentTab.label}</h1>
          <div className="flex items-center gap-1.5">
            {/* Home icon — clean, no label */}
            <Link
              to="/"
              title="Go to Homepage"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            >
              <Home className="h-4 w-4" />
            </Link>
            <NotificationBell role="employer" />
            <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {(user?.company_name ?? user?.first_name ?? "E")[0].toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-foreground hidden sm:block">{user?.company_name ?? user?.first_name ?? "Employer"}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-5 lg:p-7">
          {tab === "overview" && <Overview onNavigate={setTab} subscription={subscription ?? null} enterpriseRequest={enterpriseRequest ?? null} />}
          {tab === "jobs" && <MyJobs onNavigate={setTab} />}
          {tab === "post" && <PostJob onPosted={() => setTab("jobs")} subscription={subscription ?? null} onNavigate={setTab} />}
          {tab === "applications" && <Applications />}
          {tab === "profile" && <CompanyProfile />}
          {tab === "billing" && <BillingHistory subscription={subscription ?? null} />}
        </main>
      </div>
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function Overview({ onNavigate, subscription, enterpriseRequest }: { onNavigate: (tab: Tab) => void; subscription: UserSubscription | null; enterpriseRequest: EnterpriseRequest | null }) {
  const user = useAuthStore((s) => s.user);

  const { data: jobs, isLoading: jobsLoading } = useQuery<EmpJob[]>({
    queryKey: ["my-jobs"],
    queryFn: async () => { const r = await api.get("/api/jobs/my-jobs/"); const d = r.data?.data ?? r.data; return Array.isArray(d) ? d : (d?.results ?? []); },
    retry: 1,
    refetchOnWindowFocus: true,
  });
  const { data: allApps, isLoading: appsLoading } = useQuery<ReceivedApp[]>({
    queryKey: ["employer-all-applications"],
    queryFn: async () => { const r = await api.get("/api/jobs/employer-applications/"); const d = r.data?.data ?? r.data; return Array.isArray(d) ? d : (d?.results ?? []); },
    retry: 1,
    refetchOnWindowFocus: true,
  });

  const list = jobs ?? [];
  const apps = allApps ?? [];
  const isLoading = jobsLoading || appsLoading;

  const activeJobs   = list.filter(j => j.is_approved && j.is_active);
  const pendingJobs  = list.filter(j => !j.is_approved && j.is_active);
  const closedJobs   = list.filter(j => !j.is_active);
  const totalViews   = list.reduce((acc, j) => acc + (j.views_count ?? 0), 0);
  const totalApps    = apps.length;
  const convRate     = totalViews > 0 ? ((totalApps / totalViews) * 100).toFixed(1) : "0";

  const appFunnel = APP_STATUSES.map(s => ({
    ...s,
    count: apps.filter(a => a.status === s.value).length,
    meta: APP_STATUS_META[s.value],
  }));

  const topJobs     = [...list].sort((a, b) => (b.applications_count ?? 0) - (a.applications_count ?? 0)).slice(0, 3);
  const recentApps  = [...apps].sort((a, b) => new Date(b.applied_at ?? 0).getTime() - new Date(a.applied_at ?? 0).getTime()).slice(0, 6);

  const today = new Date();
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">

      {/* ── Hero banner ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl shadow-elegant" style={{ background: "var(--gradient-hero)" }}>
        {/* Grid texture overlay */}
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        {/* Glow spots */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full" style={{ background: "radial-gradient(circle, oklch(0.78 0.13 175 / 0.18) 0%, transparent 70%)" }} />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-40 w-40 rounded-full" style={{ background: "radial-gradient(circle, oklch(0.62 0.20 255 / 0.15) 0%, transparent 70%)" }} />

        {/* Top section: greeting + actions */}
        <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "oklch(0.78 0.13 175)" }}>{greeting}</p>
            <h1 className="mt-1 text-2xl font-extrabold text-white">
              {user?.company_name ?? user?.first_name ?? "Welcome back"}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "oklch(0.985 0.004 250 / 0.55)" }}>
              {format(today, "EEEE, MMMM d, yyyy")} · Your hiring snapshot
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <button
              onClick={() => onNavigate("post")}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold shadow-lg transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: "oklch(0.78 0.13 175)", color: "oklch(0.18 0.05 260)" }}
            >
              <FilePlus2 className="h-3.5 w-3.5" /> Post a Job
            </button>
            <button
              onClick={() => onNavigate("applications")}
              className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
              style={{ borderColor: "oklch(1 0 0 / 0.18)", background: "oklch(1 0 0 / 0.06)" }}
            >
              <Users className="h-3.5 w-3.5" /> Applications
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative mx-6" style={{ borderTop: "1px solid oklch(1 0 0 / 0.10)" }} />

        {/* Bottom section: plan info bar */}
        {subscription && (() => {
          const isCustomActive = subscription.is_custom && subscription.custom_payment_status !== "pending_payment";
          const price = isCustomActive && subscription.custom_price_monthly ? parseFloat(subscription.custom_price_monthly) : parseFloat(subscription.price_monthly);
          const limit = isCustomActive ? subscription.custom_job_limit : subscription.job_post_limit;
          const used = subscription.jobs_posted ?? 0;
          const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
          const isActive = subscription.status === "active";
          return (
            <div className="relative flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:gap-6">
              {/* Plan name + status */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "oklch(0.78 0.13 175 / 0.15)", border: "1px solid oklch(0.78 0.13 175 / 0.30)" }}>
                  <CreditCard className="h-3.5 w-3.5" style={{ color: "oklch(0.78 0.13 175)" }} />
                </div>
                <span className="text-sm font-bold text-white">{subscription.plan_name}</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{
                  background: isActive ? "oklch(0.72 0.17 160 / 0.20)" : "oklch(0.78 0.16 75 / 0.20)",
                  color: isActive ? "oklch(0.72 0.17 160)" : "oklch(0.78 0.16 75)",
                }}>
                  {isActive ? "Active" : subscription.status}
                </span>
              </div>

              {/* Vertical rule */}
              <div className="hidden sm:block w-px h-6 shrink-0" style={{ background: "oklch(1 0 0 / 0.12)" }} />

              {/* Price */}
              <div className="shrink-0">
                <span className="text-sm font-semibold text-white">
                  {price > 0 ? `$${price.toLocaleString("en-CA", { minimumFractionDigits: 2 })}/mo` : "Free"}
                </span>
              </div>

              {/* Vertical rule */}
              {limit != null && <div className="hidden sm:block w-px h-6 shrink-0" style={{ background: "oklch(1 0 0 / 0.12)" }} />}

              {/* Job usage bar */}
              {limit != null && (
                <div className="flex flex-1 items-center gap-3 min-w-0">
                  <span className="text-[11px] font-semibold shrink-0" style={{ color: "oklch(0.985 0.004 250 / 0.50)" }}>
                    Job slots
                  </span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 0.12)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: pct > 80 ? "oklch(0.62 0.22 27)" : "oklch(0.78 0.13 175)",
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-bold shrink-0 text-white">{used} / {limit}</span>
                </div>
              )}

              {/* Upgrade nudge for free/low plans */}
              {!isCustomActive && price === 0 && (
                <>
                  <div className="hidden sm:block w-px h-6 shrink-0" style={{ background: "oklch(1 0 0 / 0.12)" }} />
                  <button
                    onClick={() => onNavigate("billing")}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all hover:scale-[1.03]"
                    style={{ background: "oklch(0.78 0.13 175 / 0.20)", color: "oklch(0.78 0.13 175)", border: "1px solid oklch(0.78 0.13 175 / 0.30)" }}
                  >
                    Upgrade Plan
                  </button>
                </>
              )}

              {/* Cancellation notice for paid plans */}
              {price > 0 && subscription.cancel_at_period_end && (
                <>
                  <div className="hidden sm:block w-px h-6 shrink-0" style={{ background: "oklch(1 0 0 / 0.12)" }} />
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold" style={{ color: "oklch(0.85 0.16 75)" }}>
                      Cancels {subscription.current_period_end
                        ? new Date(subscription.current_period_end).toLocaleDateString("en-CA")
                        : "soon"}
                    </span>
                    <button
                      onClick={() => onNavigate("billing")}
                      className="rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all hover:scale-[1.03]"
                      style={{ background: "oklch(0.78 0.13 175 / 0.20)", color: "oklch(0.78 0.13 175)", border: "1px solid oklch(0.78 0.13 175 / 0.30)" }}
                    >
                      Reactivate
                    </button>
                  </div>
                </>
              )}

              {/* Manage plan link for active paid plans */}
              {price > 0 && !subscription.cancel_at_period_end && subscription.has_stripe_subscription && (
                <>
                  <div className="hidden sm:block w-px h-6 shrink-0" style={{ background: "oklch(1 0 0 / 0.12)" }} />
                  <button
                    onClick={() => onNavigate("billing")}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all hover:scale-[1.03]"
                    style={{ background: "oklch(1 0 0 / 0.08)", color: "oklch(0.985 0.004 250 / 0.70)", border: "1px solid oklch(1 0 0 / 0.15)" }}
                  >
                    Manage Plan
                  </button>
                </>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Cancellation warning banner ─────────────────────────────────── */}
      {subscription?.cancel_at_period_end && subscription.current_period_end && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-900">Your subscription is scheduled to cancel</p>
            <p className="text-xs text-amber-700 mt-0.5">
              You'll keep full access until{" "}
              <span className="font-semibold">{format(new Date(subscription.current_period_end), "MMMM d, yyyy")}</span>.
              After that, your account will revert to the free plan.
            </p>
          </div>
          <button
            onClick={() => onNavigate("billing")}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reactivate Plan
          </button>
        </div>
      )}

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-secondary" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Active Jobs",  value: activeJobs.length, sub: `${pendingJobs.length} pending`,      icon: Briefcase,  bg: "bg-emerald-50",  iconColor: "text-emerald-600",  val: "text-emerald-700" },
            { label: "Applications", value: totalApps,          sub: `across ${list.length} postings`,    icon: Users,      bg: "bg-blue-50",     iconColor: "text-blue-600",     val: "text-blue-700"    },
            { label: "Total Views",  value: totalViews,         sub: "all time",                           icon: Eye,        bg: "bg-violet-50",   iconColor: "text-violet-600",   val: "text-violet-700"  },
            { label: "Conv. Rate",   value: `${convRate}%`,     sub: "views → applications",               icon: TrendingUp, bg: "bg-amber-50",    iconColor: "text-amber-600",    val: "text-amber-700"   },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm flex items-center gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
                  <Icon className={`h-5 w-5 ${s.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-xl font-extrabold ${s.val}`}>{s.value}</p>
                  <p className="text-xs font-semibold text-foreground">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{s.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Middle row: Funnel + Pipeline ───────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-5">

        {/* Application pipeline / funnel */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-primary">Pipeline</h2>
              <p className="text-[11px] text-muted-foreground">{totalApps} total candidates</p>
            </div>
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-secondary" />)}</div>
          ) : apps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                <Users className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">No candidates yet</p>
              <p className="text-xs text-muted-foreground/70">Post a job to start receiving applications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appFunnel.map(s => {
                const pct = totalApps > 0 ? Math.round((s.count / totalApps) * 100) : 0;
                const Icon = s.meta.icon;
                return (
                  <div key={s.value} className="group">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Icon className={`h-3.5 w-3.5 ${s.meta.color}`} />
                        {s.label}
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {s.count}
                        <span className="ml-1 font-normal text-muted-foreground">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${s.meta.bg.replace("-100", "-400")}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top jobs */}
        <div className="lg:col-span-3 rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="font-bold text-primary">Top Job Postings</h2>
              <p className="text-[11px] text-muted-foreground">Ranked by applications received</p>
            </div>
            <button
              onClick={() => onNavigate("jobs")}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Manage all →
            </button>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />)}</div>
          ) : topJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                <Briefcase className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">No jobs posted yet</p>
              <button onClick={() => onNavigate("post")} className="mt-2 text-xs font-semibold text-accent hover:underline">
                Post your first job →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {topJobs.map((job, i) => {
                const conv = job.views_count ? Math.round(((job.applications_count ?? 0) / job.views_count) * 100) : 0;
                return (
                  <div key={job.id} className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/30 transition">
                    {/* Rank badge */}
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${
                      i === 0 ? "bg-amber-100 text-amber-700"
                      : i === 1 ? "bg-slate-100 text-slate-600"
                      : "bg-orange-50 text-orange-600"
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{job.title}</p>
                        {job.is_approved
                          ? <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">LIVE</span>
                          : <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">PENDING</span>
                        }
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        {job.location_display && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{job.location_display}</span>}
                        {job.specialty_display && <span>· {job.specialty_display}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-right">
                      <div className="hidden sm:block text-center">
                        <p className="text-sm font-bold text-foreground">{job.applications_count ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground">Apps</p>
                      </div>
                      <div className="hidden sm:block text-center">
                        <p className="text-sm font-bold text-foreground">{job.views_count ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground">Views</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-sm font-bold ${conv >= 10 ? "text-emerald-600" : conv >= 5 ? "text-amber-600" : "text-foreground"}`}>
                          {conv}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">Conv.</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row: Recent apps + Job status ────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Recent applications */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="font-bold text-primary">Recent Applications</h2>
              <p className="text-[11px] text-muted-foreground">Latest candidate activity</p>
            </div>
            <button
              onClick={() => onNavigate("applications")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary" />)}</div>
          ) : recentApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                <Users className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">No applications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentApps.map(a => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/30 transition">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                    {(a.physician_name ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{a.physician_name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.job_title ?? "—"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <AppStatusPill status={a.status} />
                    {a.applied_at && (
                      <span className="hidden sm:block rounded-lg bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {format(new Date(a.applied_at), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: status + quick actions */}
        <div className="flex flex-col gap-4">

          {/* Job status */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-primary">Posting Status</h2>
            <div className="space-y-3">
              {[
                { label: "Live & Active", count: activeJobs.length, color: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
                { label: "Pending Review", count: pendingJobs.length, color: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
                { label: "Closed", count: closedJobs.length, color: "bg-slate-400", bg: "bg-slate-50", text: "text-slate-600" },
              ].map(r => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.color}`} />
                  <span className="flex-1 text-sm text-foreground">{r.label}</span>
                  <span className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${r.bg} ${r.text}`}>{r.count}</span>
                </div>
              ))}
            </div>
            {/* Visual bar */}
            {list.length > 0 && (
              <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-secondary gap-0.5">
                {activeJobs.length > 0 && <div className="bg-emerald-500 rounded-full" style={{ width: `${(activeJobs.length / list.length) * 100}%` }} />}
                {pendingJobs.length > 0 && <div className="bg-amber-500 rounded-full" style={{ width: `${(pendingJobs.length / list.length) * 100}%` }} />}
                {closedJobs.length > 0 && <div className="bg-slate-400 rounded-full" style={{ width: `${(closedJobs.length / list.length) * 100}%` }} />}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-bold text-primary">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: "Post a New Job", icon: FilePlus2, tab: "post" as Tab, accent: true },
                { label: "Review Applications", icon: Users, tab: "applications" as Tab, accent: false },
                { label: "Manage Postings", icon: Briefcase, tab: "jobs" as Tab, accent: false },
                { label: "Billing & Plan", icon: CreditCard, tab: "billing" as Tab, accent: false },
              ].map(a => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.label}
                    onClick={() => onNavigate(a.tab)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      a.accent
                        ? "bg-accent text-primary hover:brightness-110"
                        : "border border-border hover:bg-secondary text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Job Expanded Detail (uses /api/jobs/<pk>/applications/) ──────────────────

interface JobApplicant {
  id: number;
  physician_name: string;
  physician_email?: string;
  status: string;
  applied_at: string;
}

function JobExpandedDetail({ job, convRate, onNavigate }: {
  job: EmpJob;
  convRate: string;
  onNavigate: (tab: Tab) => void;
}) {
  const { data: applicants, isLoading } = useQuery<JobApplicant[]>({
    queryKey: ["job-applications", job.id],
    queryFn: async () => {
      const r = await api.get(`/api/jobs/${job.id}/applications/`);
      const d = r.data?.data ?? r.data;
      return Array.isArray(d) ? d : (d?.results ?? []);
    },
    enabled: true,
  });

  const STATUS_COLOR: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    reviewed: "bg-blue-100 text-blue-700",
    shortlisted: "bg-violet-100 text-violet-700",
    interview: "bg-indigo-100 text-indigo-700",
    offered: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
  };

  return (
    <div className="border-t border-border bg-secondary/30 px-4 py-3 space-y-3">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Applications</p>
          <p className="font-bold text-foreground">{job.applications_count ?? 0}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Views</p>
          <p className="font-bold text-foreground">{job.views_count ?? 0}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Conv. Rate</p>
          <p className="font-bold text-foreground">{convRate}%</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Deadline</p>
          <p className="font-bold text-foreground">
            {job.application_deadline ? format(new Date(job.application_deadline), "MMM d, yyyy") : "—"}
          </p>
        </div>
      </div>

      {/* Recent applicants preview */}
      {(job.applications_count ?? 0) > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recent Applicants</p>
          {isLoading ? (
            <div className="flex gap-2">
              {[1,2,3].map(i => <div key={i} className="h-7 w-32 animate-pulse rounded-lg bg-secondary" />)}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(applicants ?? []).slice(0, 5).map(a => (
                <span key={a.id} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${STATUS_COLOR[a.status] ?? "bg-secondary text-foreground"}`}>
                  {a.physician_name}
                  <span className="opacity-60">· {a.status}</span>
                </span>
              ))}
              {(applicants?.length ?? 0) > 5 && (
                <span className="inline-flex items-center rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  +{(applicants?.length ?? 0) - 5} more
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Link
          to="/jobs/$jobId"
          params={{ jobId: String(job.id) }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary"
        >
          <Eye className="h-3.5 w-3.5" /> View Listing
        </Link>
        {(job.applications_count ?? 0) > 0 && (
          <button
            onClick={() => onNavigate("applications")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary"
          >
            <Users className="h-3.5 w-3.5" /> View All Applications
          </button>
        )}
      </div>
    </div>
  );
}

// ─── My Jobs (with search + filter) ──────────────────────────────────────────

function MyJobs({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<EmpJob | null>(null);
  const [expandedJob, setExpandedJob] = useState<number | null>(null);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p.search = search;
    if (filterSpecialty) p.specialty = filterSpecialty;
    if (filterType) p.job_type = filterType;
    if (filterStatus) p.status = filterStatus;
    return p;
  }, [search, filterSpecialty, filterType, filterStatus]);

  const { data: jobs, isLoading, isFetching } = useQuery<EmpJob[]>({
    queryKey: ["my-jobs", params],
    queryFn: async () => {
      const r = await api.get("/api/jobs/my-jobs/", { params });
      const d = r.data?.data ?? r.data;
      return Array.isArray(d) ? d : (d?.results ?? []);
    },
    refetchOnWindowFocus: true,
  });

  const { data: allJobs } = useQuery<EmpJob[]>({
    queryKey: ["my-jobs-all"],
    queryFn: async () => {
      const r = await api.get("/api/jobs/my-jobs/");
      const d = r.data?.data ?? r.data;
      return Array.isArray(d) ? d : (d?.results ?? []);
    },
    refetchOnWindowFocus: true,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["my-jobs"] });
    qc.invalidateQueries({ queryKey: ["my-jobs-all"] });
  };

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/api/jobs/${id}/`),
    onSuccess: () => { toast.success("Job deleted"); setConfirmDelete(null); invalidate(); },
    onError: (e) => toast.error(apiError(e)),
  });

  const close = useMutation({
    mutationFn: (id: number) => api.post(`/api/jobs/${id}/close/`),
    onSuccess: () => { toast.success("Job closed"); invalidate(); },
    onError: (e) => toast.error(apiError(e)),
  });

  const reopen = useMutation({
    mutationFn: (id: number) => api.post(`/api/jobs/${id}/reopen/`),
    onSuccess: () => { toast.success("Job reopened"); invalidate(); },
    onError: (e) => toast.error(apiError(e)),
  });

  const duplicate = useMutation({
    mutationFn: (id: number) => api.post(`/api/jobs/${id}/duplicate/`),
    onSuccess: () => { toast.success("Job duplicated — pending approval"); invalidate(); },
    onError: (e) => toast.error(apiError(e)),
  });

  const hasFilters = !!(search || filterSpecialty || filterType || (filterStatus && filterStatus !== "active"));
  const clearFilters = () => { setSearch(""); setFilterSpecialty(""); setFilterType(""); setFilterStatus(""); };

  const all = allJobs ?? [];
  const activeCount  = all.filter(j => j.is_active && j.is_approved).length;
  const pendingCount = all.filter(j => j.is_active && !j.is_approved).length;
  const closedCount  = all.filter(j => !j.is_active).length;
  const totalApps    = all.reduce((s, j) => s + (j.applications_count ?? 0), 0);

  const STATUS_TABS = [
    { value: "active",  label: "Active",   count: activeCount  },
    { value: "pending", label: "Pending",  count: pendingCount },
    { value: "closed",  label: "Closed",   count: closedCount  },
    { value: "",        label: "All",      count: all.length   },
  ];

  return (
    <div className="space-y-4">

      {/* ── Summary bar ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Active",       value: activeCount,  color: "text-emerald-600", bg: "bg-emerald-50",  icon: CheckCircle2 },
          { label: "Pending",      value: pendingCount, color: "text-amber-600",   bg: "bg-amber-50",    icon: Clock        },
          { label: "Closed",       value: closedCount,  color: "text-slate-500",   bg: "bg-slate-100",   icon: XCircle      },
          { label: "Total Apps",   value: totalApps,    color: "text-blue-600",    bg: "bg-blue-50",     icon: Users        },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
                <Icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] font-semibold text-muted-foreground">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        {/* Status tab bar */}
        <div className="flex items-center gap-1 border-b border-border px-4 pt-3 pb-0">
          {STATUS_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setFilterStatus(t.value)}
              className={`relative mb-[-1px] px-3.5 pb-3 pt-1 text-sm font-semibold transition-colors ${
                filterStatus === t.value
                  ? "border-b-2 border-accent text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  filterStatus === t.value ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
          {isFetching && <span className="ml-auto mb-2"><InlineSpinner label="" /></span>}
          <button
            onClick={() => onNavigate("post")}
            className="ml-auto mb-2 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90"
            style={{ background: "oklch(0.78 0.13 175)", color: "oklch(0.18 0.05 260)" }}
          >
            <FilePlus2 className="h-3.5 w-3.5" /> Post Job
          </button>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, specialty, city…"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </div>
          <select value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-44">
            <option value="">All specialties</option>
            {SPECIALTIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-40">
            <option value="">All types</option>
            {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-rose-600 transition shrink-0">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Job list ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary" />)}</div>
      ) : !jobs?.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
            <Briefcase className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="mt-4 font-bold text-foreground">{hasFilters ? "No jobs match your filters" : "No job postings yet"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasFilters
              ? <button onClick={clearFilters} className="text-accent hover:underline">Clear filters</button>
              : <button onClick={() => onNavigate("post")} className="text-accent hover:underline">Post your first job →</button>}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => {
            const isExpanded = expandedJob === j.id;
            const isClosed = !j.is_active;
            const isPending = j.is_active && !j.is_approved;
            const isLive = j.is_active && j.is_approved;
            const convRate = (j.views_count ?? 0) > 0
              ? ((j.applications_count ?? 0) / (j.views_count ?? 1) * 100).toFixed(1)
              : "0";
            const isMutating = close.isPending || reopen.isPending || duplicate.isPending;

            return (
              <div key={j.id} className={`rounded-2xl border bg-card shadow-sm transition-all ${isClosed ? "border-border opacity-75" : "border-border hover:border-accent/30 hover:shadow-md"}`}>
                {/* Main row */}
                <div className="flex items-start gap-4 p-4 sm:items-center">
                  {/* Status indicator */}
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:mt-0 ${
                    isLive ? "bg-emerald-50" : isPending ? "bg-amber-50" : "bg-slate-100"
                  }`}>
                    <Briefcase className={`h-4 w-4 ${isLive ? "text-emerald-600" : isPending ? "text-amber-600" : "text-slate-400"}`} />
                  </div>

                  {/* Title + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-primary truncate">{j.title}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isLive    ? "bg-emerald-100 text-emerald-700"
                        : isPending ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500"
                      }`}>
                        {isLive ? "LIVE" : isPending ? "PENDING" : "CLOSED"}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      {j.specialty_display && <span>{j.specialty_display}</span>}
                      {j.location_display && <><span>·</span><span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{j.location_display}</span></>}
                      {j.job_type_display && <><span>·</span><span>{j.job_type_display}</span></>}
                      {j.created_at && <><span>·</span><span>Posted {format(new Date(j.created_at), "MMM d, yyyy")}</span></>}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden items-center gap-5 sm:flex shrink-0">
                    <div className="text-center">
                      <p className="text-base font-extrabold text-foreground">{j.applications_count ?? 0}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">Apps</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-extrabold text-foreground">{j.views_count ?? 0}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">Views</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-extrabold text-foreground">{convRate}%</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">Conv.</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    <Link
                      to="/jobs/$jobId"
                      params={{ jobId: String(j.id) }}
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-primary"
                      title="View public listing"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    {isLive && (
                      <button
                        onClick={() => close.mutate(j.id)}
                        disabled={isMutating}
                        className="rounded-lg p-2 text-amber-500 transition hover:bg-amber-50"
                        title="Close job"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                    {isClosed && (
                      <button
                        onClick={() => reopen.mutate(j.id)}
                        disabled={isMutating}
                        className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50"
                        title="Reopen job"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => duplicate.mutate(j.id)}
                      disabled={isMutating}
                      className="rounded-lg p-2 text-blue-500 transition hover:bg-blue-50"
                      title="Duplicate job"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(j)}
                      className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50"
                      title="Delete job"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setExpandedJob(isExpanded ? null : j.id)}
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail row */}
                {isExpanded && (
                  <JobExpandedDetail
                    job={j}
                    convRate={convRate}
                    onNavigate={onNavigate}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Delete confirm modal ──────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-modal">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 mx-auto">
              <Trash2 className="h-5 w-5 text-rose-600" />
            </div>
            <h3 className="mt-4 text-center text-base font-bold text-primary">Delete Job Posting?</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">"{confirmDelete.title}"</span> will be permanently deleted along with all its applications. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => del.mutate(confirmDelete.id)}
                disabled={del.isPending}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {del.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Professional PostJob form ────────────────────────────────────────────────

type PostJobSection = "basics" | "details" | "compensation" | "requirements" | "contact";

const POST_SECTIONS: { id: PostJobSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "basics", label: "Basics", icon: FilePlus2 },
  { id: "details", label: "Details", icon: SlidersHorizontal },
  { id: "compensation", label: "Compensation", icon: DollarSign },
  { id: "requirements", label: "Requirements", icon: CheckCircle2 },
  { id: "contact", label: "Contact", icon: Phone },
];

interface PostJobForm {
  title: string;
  specialty: string;
  sub_specialty: string;
  province: string;
  city: string;
  job_type: string;
  practice_setting: string;
  required_experience: string;
  remote_option: boolean;
  relocation_assistance: boolean;
  description: string;
  responsibilities: string;
  qualifications: string;
  requirements: string;
  benefits: string;
  compensation: string;
  salary_min: string;
  salary_max: string;
  salary_display: string;
  compensation_model: string;
  application_deadline: string;
  contact_person: string;
  contact_email: string;
}

const INITIAL_FORM: PostJobForm = {
  title: "", specialty: "", sub_specialty: "", province: "", city: "",
  job_type: "full_time", practice_setting: "", required_experience: "",
  remote_option: false, relocation_assistance: false,
  description: "", responsibilities: "", qualifications: "", requirements: "", benefits: "",
  compensation: "", salary_min: "", salary_max: "", salary_display: "", compensation_model: "",
  application_deadline: "", contact_person: "", contact_email: "",
};

function PostJob({ onPosted, subscription, onNavigate }: { onPosted: () => void; subscription: UserSubscription | null; onNavigate: (tab: Tab) => void }) {
  const qc = useQueryClient();
  const [section, setSection] = useState<PostJobSection>("basics");
  const [form, setForm] = useState<PostJobForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const isCustomActive = subscription?.is_custom && subscription?.custom_payment_status !== "pending_payment";
  const effectiveLimit = isCustomActive ? (subscription?.custom_job_limit ?? null) : (subscription?.job_post_limit ?? null);
  const jobsPosted = subscription?.jobs_posted ?? 0;
  const isAtLimit = effectiveLimit !== null && jobsPosted >= effectiveLimit;
  const isFreeUser = !subscription || (!isCustomActive && parseFloat(subscription?.price_monthly ?? "0") === 0);

  async function handleUpgradeCheckout() {
    setCheckingOut(true);
    try {
      const plansRes = await api.get("/api/subscriptions/plans/employer/");
      const plans: ApiPlan[] = plansRes.data?.data ?? plansRes.data ?? [];
      const pro = plans.find((p) => !p.is_free && !p.is_enterprise);
      if (!pro) { toast.error("Professional plan not found."); return; }
      const r = await api.post("/api/subscriptions/create-checkout/", { plan_id: pro.id });
      const url = r.data?.data?.checkout_url ?? r.data?.checkout_url;
      if (url) window.location.href = url;
      else toast.error("Could not start checkout. Please try again.");
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setCheckingOut(false);
    }
  }

  function update<K extends keyof PostJobForm>(k: K, v: PostJobForm[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function sectionComplete(s: PostJobSection): boolean {
    if (s === "basics") return !!(form.title.trim().length >= 5 && form.specialty && form.province && form.city && form.job_type);
    if (s === "details") return true;
    if (s === "compensation") return true;
    if (s === "requirements") return !!(form.description.trim().length >= 50 && form.qualifications.trim());
    if (s === "contact") return !!(form.contact_person && form.contact_email);
    return false;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sectionComplete("basics")) { toast.error("Please complete the Basics section first."); setSection("basics"); return; }
    if (!sectionComplete("requirements")) { toast.error("Description (50+ chars) and qualifications are required."); setSection("requirements"); return; }
    if (!sectionComplete("contact")) { toast.error("Contact person and email are required."); setSection("contact"); return; }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (form.salary_min) payload.salary_min = Number(form.salary_min);
      else delete payload.salary_min;
      if (form.salary_max) payload.salary_max = Number(form.salary_max);
      else delete payload.salary_max;
      if (!form.salary_display) delete payload.salary_display;
      if (!form.practice_setting) delete payload.practice_setting;
      if (!form.compensation_model) delete payload.compensation_model;
      if (!form.required_experience) delete payload.required_experience;
      if (!form.application_deadline) delete payload.application_deadline;
      if (!form.sub_specialty) delete payload.sub_specialty;
      await api.post("/api/jobs/", payload);
      toast.success("Job submitted for approval — it'll go live within 24 hours.");
      qc.invalidateQueries({ queryKey: ["my-jobs"] });
      qc.invalidateQueries({ queryKey: ["my-jobs-all"] });
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
      setForm(INITIAL_FORM);
      onPosted();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr?.response?.status === 403) {
        setShowUpgradeModal(true);
      } else {
        toast.error(apiError(err));
      }
    } finally {
      setLoading(false);
    }
  }

  if (isAtLimit) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl mb-5 ${isFreeUser ? "bg-accent/15" : "bg-amber-100"}`}>
          {isFreeUser
            ? <Zap className="h-8 w-8 text-accent" />
            : <Briefcase className="h-8 w-8 text-amber-600" />}
        </div>

        <h2 className="text-2xl font-extrabold text-primary">
          {isFreeUser ? "Job Posting Limit Reached" : `All ${effectiveLimit} Job Slots Used`}
        </h2>

        <p className="mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
          {isFreeUser
            ? `Your free plan allows 1 active job posting. Upgrade to Professional to post up to 5 jobs and reach more physicians across Canada.`
            : `Your Professional plan includes ${effectiveLimit} active job postings and you've used all of them. To hire at a higher volume, apply for our Enterprise plan — custom job limits, dedicated support, and more.`}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate("jobs")}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition"
          >
            View My Jobs
          </button>

          {isFreeUser ? (
            <button
              type="button"
              onClick={handleUpgradeCheckout}
              disabled={checkingOut}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-primary hover:brightness-110 transition disabled:opacity-60"
            >
              {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Upgrade to Professional
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate("billing")}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-700 transition"
            >
              <ArrowUpRight className="h-4 w-4" />
              Apply for Enterprise
            </button>
          )}
        </div>

        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-left max-w-sm w-full shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">
              {jobsPosted} / {effectiveLimit} slots used
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isFreeUser ? "Upgrade to get 5 slots" : "Enterprise plans start at custom pricing"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentIdx = POST_SECTIONS.findIndex(s => s.id === section);

  return (
    <>
      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} isPro={!isFreeUser} />}
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <nav className="flex flex-row gap-1 lg:flex-col">
        {POST_SECTIONS.map(({ id, label, icon: Icon }) => {
          const done = sectionComplete(id);
          const active = section === id;
          return (
            <button key={id} type="button" onClick={() => setSection(id)}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition text-left ${
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">{label}</span>
              {done && !active && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-500 hidden lg:block" />}
            </button>
          );
        })}
      </nav>

      <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-primary">
              {POST_SECTIONS.find(s => s.id === section)?.label}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {section === "basics" && "Core job information — required to post."}
              {section === "details" && "Work environment and flexibility options."}
              {section === "compensation" && "Salary range and pay model — more detail attracts better candidates."}
              {section === "requirements" && "Job description, qualifications, and responsibilities."}
              {section === "contact" && "Who should candidates and our team contact?"}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">{currentIdx + 1} / {POST_SECTIONS.length}</span>
        </div>

        {section === "basics" && (
          <div className="space-y-4">
            <Field label="Job Title" required>
              <Input required value={form.title} onChange={e => update("title", e.target.value)}
                placeholder="e.g. Emergency Physician – Full Time" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Employment Type" required>
                <Select required value={form.job_type} onChange={e => update("job_type", e.target.value)}>
                  {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </Field>
              <Field label="Specialty" required>
                <Select required value={form.specialty} onChange={e => update("specialty", e.target.value)}>
                  <option value="" disabled>Select specialty…</option>
                  {SPECIALTIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </Field>
              <Field label="Sub-specialty">
                <SubSpecialtySelect specialty={form.specialty} value={form.sub_specialty} onChange={v => update("sub_specialty", v)} />
              </Field>
              <Field label="Province" required>
                <Select required value={form.province} onChange={e => update("province", e.target.value)}>
                  <option value="" disabled>Select province…</option>
                  {PROVINCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </Select>
              </Field>
              <Field label="City" required>
                <Input required value={form.city} onChange={e => update("city", e.target.value)} placeholder="e.g. Toronto" />
              </Field>
              <Field label="Application Deadline">
                <Input type="date" value={form.application_deadline}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={e => update("application_deadline", e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {section === "details" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Practice Setting">
                <Select value={form.practice_setting} onChange={e => update("practice_setting", e.target.value)}>
                  <option value="">Any / not specified</option>
                  {PRACTICE_SETTINGS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </Select>
              </Field>
              <Field label="Required Experience">
                <Select value={form.required_experience} onChange={e => update("required_experience", e.target.value)}>
                  <option value="">Any level</option>
                  {EXPERIENCE_LEVELS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-secondary/40 transition">
                <input type="checkbox" checked={form.remote_option} onChange={e => update("remote_option", e.target.checked)} className="h-4 w-4 rounded accent-accent" />
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Globe className="h-4 w-4 text-accent" /> Remote / telemedicine option</p>
                  <p className="text-xs text-muted-foreground">Position allows some remote work</p>
                </div>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-secondary/40 transition">
                <input type="checkbox" checked={form.relocation_assistance} onChange={e => update("relocation_assistance", e.target.checked)} className="h-4 w-4 rounded accent-accent" />
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5"><MapPin className="h-4 w-4 text-accent" /> Relocation assistance</p>
                  <p className="text-xs text-muted-foreground">We help with relocation costs</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {section === "compensation" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Minimum Salary (CAD/yr)">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input type="number" min={0} step={10000} value={form.salary_min}
                    onChange={e => update("salary_min", e.target.value)}
                    placeholder="e.g. 350000"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" />
                </div>
              </Field>
              <Field label="Maximum Salary (CAD/yr)">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input type="number" min={0} step={10000} value={form.salary_max}
                    onChange={e => update("salary_max", e.target.value)}
                    placeholder="e.g. 500000"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" />
                </div>
              </Field>
              <Field label="Compensation Model">
                <Select value={form.compensation_model} onChange={e => update("compensation_model", e.target.value)}>
                  <option value="">Select model…</option>
                  {COMPENSATION_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </Select>
              </Field>
              <Field label="Salary display text" hint='Shown on job card, e.g. "$350K – $500K + benefits"'>
                <Input value={form.salary_display} onChange={e => update("salary_display", e.target.value)}
                  placeholder="$350K – $500K/yr" />
              </Field>
            </div>
            <Field label="Compensation details" hint="Additional compensation narrative, bonus structure, overhead, etc.">
              <Textarea value={form.compensation} onChange={e => update("compensation", e.target.value)}
                rows={3} placeholder="e.g. Fee-for-service with guaranteed base, CME allowance of $5K/yr…" />
            </Field>
            <Field label="Benefits">
              <Textarea value={form.benefits} onChange={e => update("benefits", e.target.value)}
                rows={4} placeholder="List benefits one per line:&#10;- Comprehensive health &amp; dental&#10;- CMPA coverage&#10;- 6 weeks vacation&#10;- Signing bonus" />
            </Field>
          </div>
        )}

        {section === "requirements" && (
          <div className="space-y-4">
            <Field label="Job Description" required hint="Minimum 50 characters. Describe the role, team, and work environment.">
              <Textarea required value={form.description} onChange={e => update("description", e.target.value)}
                rows={5} placeholder="We are seeking a dedicated physician to join our multidisciplinary team…" />
              <p className={`mt-1 text-xs ${form.description.length < 50 ? "text-amber-500" : "text-muted-foreground"}`}>
                {form.description.length}/50 minimum characters
              </p>
            </Field>
            <Field label="Responsibilities" hint="Day-to-day duties. List one per line with a dash.">
              <Textarea value={form.responsibilities} onChange={e => update("responsibilities", e.target.value)}
                rows={4} placeholder="- Provide comprehensive patient care&#10;- On-call 1:6 rotation&#10;- Mentor residents" />
            </Field>
            <Field label="Qualifications" required hint="Required certifications, licences, and credentials.">
              <Textarea required value={form.qualifications} onChange={e => update("qualifications", e.target.value)}
                rows={4} placeholder="- FRCPC or CCFP certification&#10;- Eligible for provincial licensure&#10;- ACLS certified" />
            </Field>
            <Field label="Additional Requirements" hint="Years of experience, language, skills, etc.">
              <Textarea value={form.requirements} onChange={e => update("requirements", e.target.value)}
                rows={3} placeholder="- 3+ years independent practice&#10;- Bilingual (EN/FR) an asset" />
            </Field>
          </div>
        )}

        {section === "contact" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact Person" required>
                <Input required value={form.contact_person} onChange={e => update("contact_person", e.target.value)}
                  placeholder="Dr. Jane Smith" />
              </Field>
              <Field label="Contact Email" required>
                <Input required type="email" value={form.contact_email} onChange={e => update("contact_email", e.target.value)}
                  placeholder="recruiting@hospital.ca" />
              </Field>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2 text-sm">
              <p className="font-semibold text-foreground">Before you submit</p>
              {[
                { ok: form.title.length >= 5, label: "Job title (5+ characters)" },
                { ok: !!form.specialty, label: "Specialty selected" },
                { ok: !!form.province && !!form.city, label: "Location specified" },
                { ok: form.description.length >= 50, label: "Job description (50+ characters)" },
                { ok: !!form.qualifications.trim(), label: "Qualifications filled in" },
                { ok: !!form.contact_person && !!form.contact_email, label: "Contact details provided" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.ok
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    : <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />}
                  <span className={item.ok ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <button type="button" onClick={() => setSection(POST_SECTIONS[Math.max(0, currentIdx - 1)].id)}
            disabled={currentIdx === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-40">
            ← Previous
          </button>
          {section !== "contact" ? (
            <button type="button" onClick={() => setSection(POST_SECTIONS[Math.min(POST_SECTIONS.length - 1, currentIdx + 1)].id)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary-glow">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <SubmitButton loading={loading}>Submit for Approval</SubmitButton>
          )}
        </div>
      </form>
    </div>
    </>
  );
}

// ─── Applications (all apps, search + filter) ─────────────────────────────────

function Applications() {
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterJob, setFilterJob] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [drawerApp, setDrawerApp] = useState<ReceivedApp | null>(null);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p.search = search;
    if (filterStatus) p.status = filterStatus;
    if (filterJob) p.job_id = filterJob;
    if (filterSpecialty) p.specialty = filterSpecialty;
    return p;
  }, [search, filterStatus, filterJob, filterSpecialty]);

  const { data: jobs } = useQuery<EmpJob[]>({
    queryKey: ["my-jobs"],
    queryFn: async () => { const r = await api.get("/api/jobs/my-jobs/"); const d = r.data?.data ?? r.data; return Array.isArray(d) ? d : (d?.results ?? []); },
    retry: 1,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<ReceivedApp[]>({
    queryKey: ["employer-all-applications", params],
    queryFn: async () => {
      const r = await api.get("/api/jobs/employer-applications/", { params });
      const d = r.data?.data ?? r.data;
      return Array.isArray(d) ? d : (d?.results ?? []);
    },
    retry: 2,
  });

  // All apps unfiltered for pipeline counts
  const { data: allApps } = useQuery<ReceivedApp[]>({
    queryKey: ["employer-all-applications-counts"],
    queryFn: async () => {
      const r = await api.get("/api/jobs/employer-applications/");
      const d = r.data?.data ?? r.data;
      return Array.isArray(d) ? d : (d?.results ?? []);
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, employer_notes }: { id: ReceivedApp["id"]; status?: string; employer_notes?: string }) =>
      api.patch(`/api/jobs/applications/${id}/status/`, { status, employer_notes }),
    onSuccess: (_d, vars) => {
      if (vars.status) toast.success(`Moved to ${vars.status}`);
      else toast.success("Notes saved");
      qc.invalidateQueries({ queryKey: ["employer-all-applications"] });
      qc.invalidateQueries({ queryKey: ["employer-all-applications-counts"] });
      // sync drawer
      if (drawerApp && vars.id === drawerApp.id) {
        setDrawerApp(p => p ? { ...p, ...(vars.status ? { status: vars.status } : {}), ...(vars.employer_notes !== undefined ? { employer_notes: vars.employer_notes } : {}) } : p);
      }
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const hasFilters = !!(search || filterStatus || filterJob || filterSpecialty);
  const clearFilters = () => { setSearch(""); setFilterStatus(""); setFilterJob(""); setFilterSpecialty(""); };

  const countsByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    (allApps ?? []).forEach(a => { const s = a.status ?? "pending"; map[s] = (map[s] ?? 0) + 1; });
    return map;
  }, [allApps]);

  const total = (allApps ?? []).length;

  const STATUS_TABS = [
    { value: "", label: "All", count: total },
    ...APP_STATUSES.map(s => ({ value: s.value, label: s.label, count: countsByStatus[s.value] ?? 0 })),
  ];

  return (
    <div className="space-y-4">

      {/* ── Pipeline summary ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {[
          { value: "pending",     label: "New",         bg: "bg-amber-50",   color: "text-amber-700",   icon: Clock        },
          { value: "reviewed",    label: "Reviewed",    bg: "bg-blue-50",    color: "text-blue-700",    icon: Eye          },
          { value: "shortlisted", label: "Shortlisted", bg: "bg-violet-50",  color: "text-violet-700",  icon: Star         },
          { value: "interview",   label: "Interview",   bg: "bg-indigo-50",  color: "text-indigo-700",  icon: Calendar     },
          { value: "offered",     label: "Offered",     bg: "bg-emerald-50", color: "text-emerald-700", icon: Award        },
          { value: "rejected",    label: "Rejected",    bg: "bg-rose-50",    color: "text-rose-600",    icon: XCircle      },
          { value: "withdrawn",   label: "Withdrawn",   bg: "bg-slate-100",  color: "text-slate-500",   icon: AlertCircle  },
        ].map(s => {
          const Icon = s.icon;
          const count = countsByStatus[s.value] ?? 0;
          return (
            <button
              key={s.value}
              onClick={() => setFilterStatus(filterStatus === s.value ? "" : s.value)}
              className={`flex flex-col items-center gap-1 rounded-2xl border p-3 transition hover:shadow-md ${
                filterStatus === s.value ? "border-accent bg-accent/5 shadow-sm" : "border-border bg-card shadow-sm"
              }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${s.bg}`}>
                <Icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className={`text-lg font-extrabold ${count > 0 ? s.color : "text-muted-foreground/40"}`}>{count}</p>
              <p className="text-[10px] font-semibold text-muted-foreground text-center leading-tight">{s.label}</p>
            </button>
          );
        })}
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        {/* Status tab bar */}
        <div className="flex items-center gap-0.5 overflow-x-auto border-b border-border px-4 pt-3 pb-0 scrollbar-none">
          {STATUS_TABS.filter(t => t.value === "" || (countsByStatus[t.value] ?? 0) > 0 || filterStatus === t.value).map(t => (
            <button
              key={t.value}
              onClick={() => setFilterStatus(t.value)}
              className={`relative mb-[-1px] shrink-0 px-3.5 pb-3 pt-1 text-sm font-semibold transition-colors whitespace-nowrap ${
                filterStatus === t.value
                  ? "border-b-2 border-accent text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  filterStatus === t.value ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground"
                }`}>{t.count}</span>
              )}
            </button>
          ))}
          {isFetching && <span className="ml-auto mb-2 shrink-0"><InlineSpinner label="" /></span>}
        </div>

        {/* Search + filters */}
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by physician name or email…"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </div>
          <select value={filterJob} onChange={e => setFilterJob(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-52">
            <option value="">All job postings</option>
            {(jobs ?? []).map(j => <option key={j.id} value={String(j.id)}>{j.title}</option>)}
          </select>
          <select value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-44">
            <option value="">All specialties</option>
            {SPECIALTIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-rose-600 transition shrink-0">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── List ─────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-secondary" />)}</div>
      ) : isError ? (
        <ErrorState error={error} title="Couldn't load applications" onRetry={() => refetch()} />
      ) : !data?.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
            <Users className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="mt-4 font-bold text-foreground">{hasFilters ? "No applications match your filters" : "No applications yet"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasFilters
              ? <button onClick={clearFilters} className="text-accent hover:underline">Clear filters</button>
              : "We'll notify you the moment a physician applies."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-5 py-3">
            <p className="text-xs font-semibold text-muted-foreground">{data.length} applicant{data.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="divide-y divide-border">
            {data.map(a => {
              const meta = APP_STATUS_META[a.status ?? "pending"] ?? APP_STATUS_META.pending;
              const Icon = meta.icon;
              const initials = (a.physician_name ?? "?").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
              return (
                <div
                  key={a.id}
                  onClick={() => setDrawerApp(a)}
                  className="flex cursor-pointer items-center gap-4 px-5 py-4 transition hover:bg-secondary/30"
                >
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {initials}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{a.physician_name ?? "Unnamed"}</span>
                      {a.willing_to_relocate && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Open to relocate</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {a.physician_specialty_display || a.physician_specialty || "—"}
                      {a.years_experience ? ` · ${a.years_experience}yr exp` : ""}
                    </p>
                    {a.job_title && (
                      <p className="mt-0.5 text-[11px] font-medium text-accent truncate">→ {a.job_title}</p>
                    )}
                  </div>

                  {/* Status + date */}
                  <div className="hidden sm:flex shrink-0 flex-col items-end gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.bg} ${meta.color}`}>
                      <Icon className="h-3 w-3" />
                      {a.status_display ?? a.status ?? "Pending"}
                    </span>
                    {a.applied_at && (
                      <span className="text-[10px] text-muted-foreground">{format(new Date(a.applied_at), "MMM d, yyyy")}</span>
                    )}
                  </div>

                  {/* Status quick-change (desktop) */}
                  <div className="hidden lg:block shrink-0" onClick={e => e.stopPropagation()}>
                    <select
                      value={a.status ?? "pending"}
                      onChange={e => updateStatus.mutate({ id: a.id, status: e.target.value })}
                      disabled={updateStatus.isPending && updateStatus.variables?.id === a.id}
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/20"
                    >
                      {APP_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>

                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Applicant Drawer ──────────────────────────────────────────────── */}
      {drawerApp && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerApp(null)} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-card shadow-modal overflow-hidden">
            {/* Drawer header */}
            <div className="flex items-center gap-4 border-b border-border px-6 py-4 shrink-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
                {(drawerApp.physician_name ?? "?").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-primary truncate">{drawerApp.physician_name ?? "Unnamed"}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {drawerApp.physician_specialty_display || drawerApp.physician_specialty || "—"}
                  {drawerApp.years_experience ? ` · ${drawerApp.years_experience}yr exp` : ""}
                </p>
              </div>
              <button onClick={() => setDrawerApp(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Status control */}
              <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex-1">Application Status</p>
                <select
                  value={drawerApp.status ?? "pending"}
                  onChange={e => updateStatus.mutate({ id: drawerApp.id, status: e.target.value })}
                  disabled={updateStatus.isPending}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  {APP_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {/* Job posting */}
              {drawerApp.job_title && (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Applied to</p>
                  <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3 flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-accent shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{drawerApp.job_title}</p>
                      {drawerApp.job_location && <p className="text-xs text-muted-foreground">{drawerApp.job_location}</p>}
                    </div>
                    {drawerApp.applied_at && (
                      <span className="ml-auto text-xs text-muted-foreground shrink-0">{format(new Date(drawerApp.applied_at), "MMM d, yyyy")}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Candidate details grid */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Candidate Details</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: FileText,    label: "CPSO / Licence",   value: drawerApp.physician_cpso },
                    { icon: Phone,       label: "Phone",             value: drawerApp.phone },
                    { icon: Globe,       label: "Email",             value: drawerApp.physician_email, href: `mailto:${drawerApp.physician_email}` },
                    { icon: Linkedin,    label: "LinkedIn",          value: drawerApp.linkedin_url ? "View Profile" : undefined, href: drawerApp.linkedin_url },
                    { icon: Calendar,    label: "Available from",    value: drawerApp.availability_date ? format(new Date(drawerApp.availability_date), "MMM d, yyyy") : undefined },
                    { icon: Briefcase,   label: "Experience",        value: drawerApp.years_experience != null ? `${drawerApp.years_experience} year${drawerApp.years_experience !== 1 ? "s" : ""}` : undefined },
                    { icon: CheckCircle2,label: "Certifications",    value: drawerApp.physician_certifications },
                    { icon: MapPin,      label: "Willing to relocate", value: drawerApp.willing_to_relocate != null ? (drawerApp.willing_to_relocate ? "Yes" : "No") : undefined },
                  ].filter(f => f.value).map(f => (
                    <div key={f.label} className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</p>
                      {f.href ? (
                        <a href={f.href} target="_blank" rel="noreferrer" className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
                          {f.value} <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <p className="mt-0.5 text-sm font-semibold text-foreground">{f.value}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Cover letter */}
              {drawerApp.cover_letter && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cover Letter</p>
                  <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3 max-h-52 overflow-y-auto">
                    <p className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">{drawerApp.cover_letter}</p>
                  </div>
                </div>
              )}

              {/* Internal notes */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Internal Notes</p>
                <InternalNotes
                  key={String(drawerApp.id)}
                  initial={drawerApp.employer_notes ?? ""}
                  onSave={notes => updateStatus.mutate({ id: drawerApp.id, employer_notes: notes })}
                  saving={updateStatus.isPending && updateStatus.variables?.id === drawerApp.id}
                />
              </div>
            </div>

            {/* Drawer footer actions */}
            <div className="flex gap-3 border-t border-border px-6 py-4 shrink-0">
              {(drawerApp.resume_url || drawerApp.profile_resume_url) && (
                <a
                  href={drawerApp.resume_url || drawerApp.profile_resume_url!}
                  target="_blank" rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/5 py-2.5 text-sm font-bold text-accent hover:bg-accent/10 transition"
                >
                  <Download className="h-4 w-4" /> Download CV
                </a>
              )}
              {drawerApp.physician_email && (
                <a
                  href={`mailto:${drawerApp.physician_email}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/80 transition"
                >
                  <ExternalLink className="h-4 w-4" /> Email Applicant
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InternalNotes({ initial, onSave, saving }: { initial: string; onSave: (v: string) => void; saving: boolean }) {
  const [notes, setNotes] = useState(initial);
  const isDirty = notes !== initial;
  return (
    <div className="space-y-2">
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={3}
        placeholder="Private notes visible only to your team…"
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15 resize-none"
      />
      {isDirty && (
        <button onClick={() => onSave(notes)} disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-glow transition disabled:opacity-60">
          {saving ? <InlineSpinner label="Saving" /> : null}
          Save notes
        </button>
      )}
    </div>
  );
}

// ─── Subscription Card ────────────────────────────────────────────────────────

function CancelConfirmModal({
  type, periodEnd, loading, onConfirm, onClose,
}: {
  type: "cancel" | "reactivate";
  periodEnd: string | null;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const isCancel = type === "cancel";
  const formattedDate = periodEnd
    ? format(new Date(periodEnd), "MMMM d, yyyy")
    : "the end of your billing period";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!loading ? onClose : undefined} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-secondary transition disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>

        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${isCancel ? "bg-rose-50" : "bg-emerald-50"}`}>
          {isCancel
            ? <AlertTriangle className="h-6 w-6 text-rose-500" />
            : <RefreshCw className="h-6 w-6 text-emerald-600" />}
        </div>

        <h3 className="text-lg font-bold text-primary">
          {isCancel ? "Cancel Subscription?" : "Reactivate Subscription?"}
        </h3>

        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {isCancel ? (
            <>Your plan stays active until{" "}
              <span className="font-semibold text-foreground">{formattedDate}</span>.
              After that, your account reverts to the free plan and you won't be charged again.
            </>
          ) : (
            <>Your subscription will be reactivated immediately. Billing will resume on your next renewal date and you'll keep all current plan benefits.</>
          )}
        </p>

        {isCancel && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-xs text-amber-800">
              You can reactivate anytime before <span className="font-semibold">{formattedDate}</span> to avoid losing access.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary transition disabled:opacity-60"
          >
            {isCancel ? "Keep My Plan" : "Never Mind"}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition disabled:opacity-60 ${
              isCancel ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isCancel ? "Yes, Cancel Plan" : "Yes, Reactivate"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubscriptionCard({ subscription, enterpriseRequest, onUpgrade }: { subscription: UserSubscription | null; enterpriseRequest: EnterpriseRequest | null; onUpgrade: () => void }) {
  const qc = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [reactivateModal, setReactivateModal] = useState(false);

  // Defined early so it can be used in both the fallback and normal render path
  async function handleUpgradeCheckout() {
    setCheckingOut(true);
    try {
      const plansRes = await api.get("/api/subscriptions/plans/employer/");
      const plans: ApiPlan[] = plansRes.data?.data ?? plansRes.data ?? [];
      const pro = plans.find((p) => !p.is_free && !p.is_enterprise);
      if (!pro) { toast.error("Professional plan not found."); return; }
      const r = await api.post("/api/subscriptions/create-checkout/", { plan_id: pro.id });
      const url = r.data?.data?.checkout_url ?? r.data?.checkout_url;
      if (url) window.location.href = url;
      else toast.error("Could not start checkout. Please try again.");
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setCheckingOut(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    setCancelModal(false);
    try {
      await api.post("/api/subscriptions/cancel/");
      toast.success("Subscription will cancel at end of billing period.");
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setCancelling(false);
    }
  }

  async function handleReactivate() {
    setReactivating(true);
    setReactivateModal(false);
    try {
      await api.post("/api/subscriptions/reactivate/");
      toast.success("Subscription reactivated! Your plan will continue as normal.");
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setReactivating(false);
    }
  }

  // Show enterprise request status card when there's an active request
  if (enterpriseRequest && enterpriseRequest.status !== "approved") {
    return <EnterpriseRequestStatusCard request={enterpriseRequest} onUpgrade={onUpgrade} />;
  }

  // API returned null (no subscription row yet) — show free-plan fallback card
  if (!subscription) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-bold text-primary">Basic (Free)</p>
              <p className="text-xs font-semibold text-emerald-600">Free plan · always active</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUpgradeCheckout}
            disabled={checkingOut}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-primary hover:brightness-110 transition disabled:opacity-60"
          >
            {checkingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Upgrade to Professional
          </button>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-foreground">Job postings used</span>
            <span className="font-bold text-foreground">— / 1</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-0 rounded-full bg-accent" />
          </div>
        </div>
      </div>
    );
  }

  // Enterprise approved but payment not yet made — show "Pay Now" card
  if (subscription.custom_payment_status === "pending_payment" && subscription.custom_payment_link) {
    return (
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
              <CreditCard className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="font-bold text-violet-900">Enterprise Plan — Payment Required</p>
              <p className="text-xs text-violet-700 mt-0.5">
                Your plan has been approved. Complete payment to activate.
              </p>
            </div>
          </div>
          <a
            href={subscription.custom_payment_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 transition"
          >
            <Zap className="h-3.5 w-3.5" />
            Pay Now — ${subscription.custom_price_monthly}/mo
          </a>
        </div>
        <div className="mt-3 rounded-xl border border-violet-200 bg-violet-100/50 p-3">
          <p className="text-xs text-violet-700">
            <span className="font-semibold">Plan includes:</span>{" "}
            {subscription.custom_job_limit} job postings
            {subscription.custom_features && subscription.custom_features.length > 0
              ? ` · ${subscription.custom_features.slice(0, 2).join(" · ")}`
              : ""}
          </p>
        </div>
      </div>
    );
  }

  const isCustomActive = subscription.is_custom && subscription.custom_payment_status !== "pending_payment";
  // Enterprise plan DB price is always 0 — use custom_price_monthly for real price
  const effectivePrice = isCustomActive && subscription.custom_price_monthly
    ? subscription.custom_price_monthly
    : subscription.price_monthly;
  const isFree =
    !isCustomActive &&
    subscription.plan_type !== "enterprise_custom" &&
    (parseFloat(effectivePrice) === 0 || effectivePrice === "0.00" || effectivePrice === "0");
  const isCancelledAtEnd = subscription.cancel_at_period_end;
  const isActive = subscription.status === "active";
  // For custom plans use custom_job_limit, otherwise plan's job_post_limit
  const effectiveLimit = isCustomActive && subscription.custom_job_limit != null
    ? subscription.custom_job_limit
    : subscription.job_post_limit;
  const hasLimit = effectiveLimit !== null;
  const used = subscription.jobs_posted ?? 0;
  const limit = effectiveLimit ?? 0;
  const pct = hasLimit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${
      isCustomActive
        ? "border-violet-200 bg-violet-50/50"
        : isFree
        ? "border-border bg-card"
        : isCancelledAtEnd
        ? "border-amber-200 bg-amber-50"
        : "border-accent/30 bg-accent/5"
    }`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            isCustomActive ? "bg-violet-100" : isFree ? "bg-secondary" : isCancelledAtEnd ? "bg-amber-100" : "bg-accent/15"
          }`}>
            <CreditCard className={`h-5 w-5 ${isCustomActive ? "text-violet-600" : isFree ? "text-muted-foreground" : isCancelledAtEnd ? "text-amber-600" : "text-accent"}`} />
          </div>
          <div>
            <p className="font-bold text-primary">
              {isCustomActive ? "Enterprise Custom Plan" : subscription.plan_name}
            </p>
            <p className={`text-xs font-semibold ${
              isCustomActive ? "text-violet-700"
              : isCancelledAtEnd ? "text-amber-600"
              : isActive ? "text-emerald-600"
              : "text-rose-600"
            }`}>
              {isCustomActive
                ? `Active · $${subscription.custom_price_monthly}/mo · ${subscription.custom_job_limit} job slots`
                : isCancelledAtEnd
                ? `Cancels ${subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString("en-CA") : "soon"}`
                : isActive
                ? isFree ? "Free plan · always active" : `Active · renews in ${subscription.days_remaining ?? "—"} days`
                : subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isFree && (
            <button
              type="button"
              onClick={handleUpgradeCheckout}
              disabled={checkingOut}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-primary hover:brightness-110 transition disabled:opacity-60"
            >
              {checkingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Upgrade to Professional
            </button>
          )}
          {!isFree && !isCustomActive && subscription.has_stripe_subscription && !isCancelledAtEnd && (
            <button
              type="button"
              onClick={() => setCancelModal(true)}
              disabled={cancelling}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition disabled:opacity-60"
            >
              {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Cancel plan
            </button>
          )}
          {!isFree && !isCustomActive && subscription.has_stripe_subscription && isCancelledAtEnd && (
            <button
              type="button"
              onClick={() => setReactivateModal(true)}
              disabled={reactivating}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-60"
            >
              {reactivating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Reactivate plan
            </button>
          )}
        </div>
      </div>

      {cancelModal && (
        <CancelConfirmModal
          type="cancel"
          periodEnd={subscription.current_period_end ?? null}
          loading={cancelling}
          onConfirm={handleCancel}
          onClose={() => setCancelModal(false)}
        />
      )}
      {reactivateModal && (
        <CancelConfirmModal
          type="reactivate"
          periodEnd={subscription.current_period_end ?? null}
          loading={reactivating}
          onConfirm={handleReactivate}
          onClose={() => setReactivateModal(false)}
        />
      )}

      {/* Custom features list */}
      {isCustomActive && subscription.custom_features && subscription.custom_features.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {subscription.custom_features.map((f) => (
            <span key={f} className="rounded-full border border-violet-200 bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
              {f}
            </span>
          ))}
        </div>
      )}

      {hasLimit && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-foreground">Job postings used</span>
            <span className={`font-bold ${used >= limit ? "text-rose-600" : "text-foreground"}`}>{used} / {limit}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pct >= 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : isCustomActive ? "bg-violet-500" : "bg-accent"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {used >= limit && (
            <p className="mt-2 text-xs text-rose-600 font-semibold flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {isCustomActive ? "Job slot limit reached — contact support to increase your limit" : "Limit reached — upgrade to post more jobs"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Enterprise Request Status Card ──────────────────────────────────────────

function EnterpriseRequestStatusCard({ request, onUpgrade }: { request: EnterpriseRequest; onUpgrade: () => void }) {
  const navigate = useNavigate();

  if (request.status === "pending") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="font-bold text-amber-900">Enterprise Request — Pending</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Submitted {request.created_at ? new Date(request.created_at).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" }) : "recently"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm text-amber-800">
          Your enterprise plan request is being reviewed by our team. We'll contact you within 24–48 hours.
        </p>
      </div>
    );
  }

  if (request.status === "reviewing") {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
            <Search className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-blue-900">Enterprise Request — Under Review</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-blue-800">
          Our team is reviewing your request. Expect a call or email soon.
        </p>
      </div>
    );
  }

  if (request.status === "rejected") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
            <XCircle className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <p className="font-bold text-rose-900">Enterprise Request — Not Approved</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-rose-800">
          Unfortunately we couldn't approve your enterprise request at this time.
          {request.rejected_reason && <span className="block mt-1 italic">"{request.rejected_reason}"</span>}
        </p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => navigate({ to: "/contact" } as never)}
            className="rounded-xl border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition">
            Contact Us
          </button>
          <button onClick={onUpgrade}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-primary hover:brightness-110 transition">
            <Zap className="h-3.5 w-3.5" /> Try Professional Plan
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Upgrade Modal ────────────────────────────────────────────────────────────

function UpgradeModal({ onClose, isPro = false }: { onClose: () => void; isPro?: boolean }) {
  const [loading, setLoading] = useState(false);

  const PRO_FEATURES = [
    "5 active job postings",
    "Specialty-targeted physician matching",
    "Real-time application notifications",
    "Dedicated account manager",
    "Priority listing in search results",
    "Advanced analytics dashboard",
  ];

  const ENTERPRISE_FEATURES = [
    "Custom job posting limits",
    "Dedicated account manager",
    "Bulk hiring & volume discounts",
    "Priority candidate matching",
    "Custom contract & billing",
    "SLA-backed support",
  ];

  async function handleUpgrade() {
    setLoading(true);
    try {
      const plansRes = await api.get("/api/subscriptions/plans/employer/");
      const plans: ApiPlan[] = plansRes.data?.data ?? plansRes.data ?? [];
      const pro = plans.find((p) => !p.is_free && !p.is_enterprise);
      if (!pro) { toast.error("Professional plan not found."); return; }
      const r = await api.post("/api/subscriptions/create-checkout/", { plan_id: pro.id });
      const url = r.data?.data?.checkout_url ?? r.data?.checkout_url;
      if (url) window.location.href = url;
      else toast.error("Could not start checkout. Please try again.");
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleEnterpriseRequest() {
    setLoading(true);
    try {
      await api.post("/api/subscriptions/enterprise/request/", {
        organization_name: "",
        contact_name: "",
        contact_email: "",
        monthly_hiring_volume: "6_10",
        message: "Interested in Enterprise plan — reached Professional job limit.",
      });
      toast.success("Enterprise inquiry submitted. Our team will contact you shortly.");
      onClose();
    } catch {
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isPro ? "bg-amber-100" : "bg-accent/15"}`}>
            {isPro ? <Briefcase className="h-6 w-6 text-amber-600" /> : <Zap className="h-6 w-6 text-accent" />}
          </div>

          <h2 className="mt-4 text-xl font-bold text-primary">
            {isPro ? "All Job Slots Used" : "Upgrade to Professional"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {isPro
              ? "You've reached your Professional plan's 5-job limit. Apply for our Enterprise plan to get custom job posting limits and dedicated support."
              : "You've reached your free plan job posting limit. Upgrade to post up to 5 jobs and access premium features."}
          </p>

          <ul className="mt-5 space-y-2.5">
            {(isPro ? ENTERPRISE_FEATURES : PRO_FEATURES).map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isPro ? "bg-amber-100 text-amber-600" : "bg-accent/15 text-accent"}`}>
                  <CheckCircle2 className="h-3 w-3" />
                </span>
                {f}
              </li>
            ))}
          </ul>

          {!isPro && (
            <div className="mt-6 rounded-xl border border-accent/20 bg-accent/5 p-4 text-center">
              <p className="text-3xl font-extrabold text-primary">$499<span className="text-base font-normal text-muted-foreground">/month</span></p>
              <p className="mt-1 text-xs text-muted-foreground">Cancel anytime · no long-term commitment</p>
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition"
            >
              Maybe later
            </button>
            {isPro ? (
              <button
                type="button"
                onClick={handleEnterpriseRequest}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700 transition disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                Apply for Enterprise
              </button>
            ) : (
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-primary hover:brightness-110 transition disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Upgrade Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanyProfile() {
  const { data, isLoading } = useQuery({
    queryKey: ["employer-profile"],
    queryFn: async () => { const r = await api.get("/api/profile/employer/"); return r.data?.data ?? r.data ?? {}; },
    retry: 1,
  });
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const merged = { ...(data ?? {}), ...form };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/api/profile/employer/", merged);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-secondary" />)}</div>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-bold text-primary">Company Profile</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company Name"><Input value={merged.company_name ?? ""} onChange={e => setForm({ ...form, company_name: e.target.value })} /></Field>
        <Field label="Company Type"><Input value={merged.company_type ?? ""} onChange={e => setForm({ ...form, company_type: e.target.value })} /></Field>
        <Field label="Contact Person"><Input value={merged.contact_person ?? ""} onChange={e => setForm({ ...form, contact_person: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={merged.email ?? ""} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Phone"><Input type="tel" value={merged.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Website"><Input value={merged.website ?? ""} onChange={e => setForm({ ...form, website: e.target.value })} /></Field>
        <Field label="City"><Input value={merged.city ?? ""} onChange={e => setForm({ ...form, city: e.target.value })} /></Field>
        <Field label="Province"><Input value={merged.province ?? ""} onChange={e => setForm({ ...form, province: e.target.value })} /></Field>
      </div>
      <Field label="Address"><Input value={merged.address ?? ""} onChange={e => setForm({ ...form, address: e.target.value })} /></Field>
      <SubmitButton loading={saving}>Save Changes</SubmitButton>
    </form>
  );
}

// ─── Billing History ──────────────────────────────────────────────────────────

interface PaymentRecord {
  id: number;
  amount: string;
  currency: string;
  status: string;
  description: string;
  created_at: string;
}

function BillingHistory({ subscription }: { subscription: UserSubscription | null }) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [reactivateModal, setReactivateModal] = useState(false);

  async function handleCancel() {
    setCancelling(true);
    setCancelModal(false);
    try {
      await api.post("/api/subscriptions/cancel/");
      toast.success("Subscription will cancel at end of billing period.");
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setCancelling(false);
    }
  }

  async function handleReactivate() {
    setReactivating(true);
    setReactivateModal(false);
    try {
      await api.post("/api/subscriptions/reactivate/");
      toast.success("Subscription reactivated! Your plan will continue as normal.");
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setReactivating(false);
    }
  }

  const { data: payments, isLoading } = useQuery<PaymentRecord[]>({
    queryKey: ["my-payments"],
    queryFn: async () => {
      const r = await api.get("/api/subscriptions/payments/");
      const d = r.data?.data ?? r.data;
      return Array.isArray(d) ? d : (d?.results ?? []);
    },
    staleTime: 60_000,
  });

  const totalPaid = (payments ?? [])
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  function handlePrint() {
    const area = document.getElementById("billing-print-area");
    if (!area) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Billing Statement — MedConnect Canada</title>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; padding: 40px; font-size: 13px; }
            h1 { font-size: 22px; font-weight: 800; color: #0f172a; }
            h2 { font-size: 15px; font-weight: 700; margin: 24px 0 10px; color: #0f172a; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
            .header p { color: #64748b; margin-top: 2px; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; font-size: 12px; }
            .meta span { color: #64748b; }
            .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
            .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
            .card .val { font-size: 20px; font-weight: 800; color: #0f172a; margin: 6px 0 2px; }
            .card .lbl { font-size: 11px; font-weight: 600; color: #0f172a; }
            .card .sub { font-size: 10px; color: #94a3b8; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            thead tr { background: #f8fafc; }
            th { padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
            th:last-child, td:last-child { text-align: right; }
            td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
            tfoot td { font-weight: 700; background: #f8fafc; border-top: 2px solid #e2e8f0; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; }
            .badge.succeeded { background: #dcfce7; color: #15803d; }
            .badge.failed { background: #fee2e2; color: #dc2626; }
            .badge.refunded { background: #dbeafe; color: #1d4ed8; }
            .details { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .details .lbl { font-size: 10px; color: #94a3b8; margin-bottom: 2px; }
            .details .val { font-size: 12px; font-weight: 600; }
            .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: center; color: #94a3b8; font-size: 10px; }
            .green { color: #16a34a; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>MedConnect Canada</h1>
            <p>Official Billing Statement</p>
            <div class="meta">
              <div><span>Account: </span><strong>${user?.email ?? ""}</strong></div>
              <div><span>Company: </span><strong>${user?.company_name ?? "—"}</strong></div>
              <div><span>Plan: </span><strong>${planName}</strong></div>
              <div><span>Generated: </span><strong>${format(new Date(), "MMMM d, yyyy")}</strong></div>
            </div>
          </div>

          <div class="cards">
            <div class="card">
              <div class="lbl">Total Paid</div>
              <div class="val green">$${totalPaid.toFixed(2)} CAD</div>
              <div class="sub">All time</div>
            </div>
            <div class="card">
              <div class="lbl">Current Plan</div>
              <div class="val">${planName}</div>
              <div class="sub">${planPrice && parseFloat(planPrice) > 0 ? `$${parseFloat(planPrice).toFixed(2)}/mo` : "Free"}</div>
            </div>
            <div class="card">
              <div class="lbl">Payments</div>
              <div class="val">${(payments ?? []).filter((p) => p.status === "succeeded").length} successful</div>
              <div class="sub">${(payments ?? []).filter((p) => p.status === "failed").length} failed</div>
            </div>
          </div>

          <h2>Payment History</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(payments ?? []).map((p) => `
                <tr>
                  <td>${format(new Date(p.created_at), "MMM d, yyyy")}</td>
                  <td>${p.description || "Subscription Payment"}</td>
                  <td><span class="badge ${p.status}">${p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span></td>
                  <td>${p.currency.toUpperCase()} $${parseFloat(p.amount).toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3">Total Paid</td>
                <td class="green">CAD $${totalPaid.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div class="footer">
            <p>MedConnect Canada &nbsp;·&nbsp; This document serves as an official billing record.</p>
            <p>Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</p>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  }

  const isCustomActive = subscription?.is_custom && subscription?.custom_payment_status !== "pending_payment";
  const planName = isCustomActive ? "Enterprise Custom Plan" : (subscription?.plan_name ?? "Basic (Free)");
  const planPrice = isCustomActive
    ? subscription?.custom_price_monthly
    : subscription?.price_monthly;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary">Billing History</h2>
            <p className="text-sm text-muted-foreground">Your payment records and subscription details</p>
          </div>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary transition"
          >
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
        </div>

        {/* Print area */}
        <div id="billing-print-area">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-3 text-2xl font-extrabold text-primary">
                ${totalPaid.toFixed(2)}
              </p>
              <p className="text-xs font-semibold text-foreground">Total Paid</p>
              <p className="text-[11px] text-muted-foreground">All time (CAD)</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isCustomActive ? "bg-violet-100" : "bg-accent/15"}`}>
                <CreditCard className={`h-4 w-4 ${isCustomActive ? "text-violet-600" : "text-accent"}`} />
              </div>
              <p className="mt-3 text-lg font-extrabold text-primary truncate">{planName}</p>
              <p className="text-xs font-semibold text-foreground">Current Plan</p>
              <p className="text-[11px] text-muted-foreground">
                {planPrice && parseFloat(planPrice) > 0 ? `$${parseFloat(planPrice).toFixed(2)}/mo` : "Free"}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-3 text-2xl font-extrabold text-primary">
                {(payments ?? []).filter((p) => p.status === "succeeded").length}
              </p>
              <p className="text-xs font-semibold text-foreground">Successful Payments</p>
              <p className="text-[11px] text-muted-foreground">
                {(payments ?? []).filter((p) => p.status === "failed").length} failed
              </p>
            </div>
          </div>

          {/* Payment table */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4 print:hidden">
              <h3 className="font-bold text-primary">Payment History</h3>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                {(payments ?? []).length} records
              </span>
            </div>

            {isLoading ? (
              <div className="p-8 flex justify-center">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
              </div>
            ) : !payments?.length ? (
              <div className="py-12 text-center">
                <CreditCard className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-semibold text-muted-foreground">No payment records yet</p>
                <p className="text-xs text-muted-foreground mt-1">Payments will appear here after your first charge</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-secondary/30 transition">
                        <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(p.created_at), "MMM d, yyyy")}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-medium text-foreground">
                          {p.description || "Subscription Payment"}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            p.status === "succeeded"
                              ? "bg-emerald-100 text-emerald-700"
                              : p.status === "failed"
                              ? "bg-rose-100 text-rose-700"
                              : p.status === "refunded"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {p.status === "succeeded" && <CheckCircle2 className="h-3 w-3" />}
                            {p.status === "failed" && <XCircle className="h-3 w-3" />}
                            {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={`text-sm font-bold ${
                            p.status === "succeeded" ? "text-foreground"
                            : p.status === "refunded" ? "text-blue-600"
                            : "text-rose-500"
                          }`}>
                            {p.currency.toUpperCase()} ${parseFloat(p.amount).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-secondary/40">
                      <td colSpan={3} className="px-5 py-3 text-sm font-bold text-foreground">Total Paid</td>
                      <td className="px-5 py-3 text-right text-sm font-extrabold text-emerald-600">
                        CAD ${totalPaid.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Current subscription details */}
          {subscription && (() => {
            const isFree = !isCustomActive && (parseFloat(planPrice ?? "0") === 0);
            const isCancelledAtEnd = subscription.cancel_at_period_end;
            const hasStripe = subscription.has_stripe_subscription;
            return (
              <div className={`rounded-2xl border p-5 shadow-sm ${
                isCancelledAtEnd ? "border-amber-200 bg-amber-50" : "border-border bg-card"
              }`}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h3 className="font-bold text-primary">Subscription Details</h3>
                  <div className="flex items-center gap-2">
                    {/* Cancel at period end notice */}
                    {isCancelledAtEnd && subscription.current_period_end && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        Cancels {format(new Date(subscription.current_period_end), "MMM d, yyyy")}
                      </span>
                    )}
                    {/* Reactivate button */}
                    {!isFree && !isCustomActive && hasStripe && isCancelledAtEnd && (
                      <button
                        onClick={() => setReactivateModal(true)}
                        disabled={reactivating}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-60"
                      >
                        {reactivating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Reactivate Plan
                      </button>
                    )}
                    {/* Cancel button */}
                    {!isFree && !isCustomActive && hasStripe && !isCancelledAtEnd && (
                      <button
                        onClick={() => setCancelModal(true)}
                        disabled={cancelling}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition disabled:opacity-60"
                      >
                        {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Cancel Plan
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Plan</p>
                    <p className="font-semibold text-foreground">{planName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className={`font-semibold ${
                      isCancelledAtEnd ? "text-amber-600"
                      : subscription.status === "active" ? "text-emerald-600"
                      : "text-rose-600"
                    }`}>
                      {isCancelledAtEnd
                        ? "Cancelling at period end"
                        : subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Price</p>
                    <p className="font-semibold text-foreground">
                      {planPrice && parseFloat(planPrice) > 0 ? `$${parseFloat(planPrice).toFixed(2)}/mo` : "Free"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Job Post Limit</p>
                    <p className="font-semibold text-foreground">
                      {isCustomActive ? (subscription.custom_job_limit ?? "Unlimited") : (subscription.job_post_limit ?? "—")}
                    </p>
                  </div>
                  {subscription.current_period_end && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {isCancelledAtEnd ? "Access Until" : "Renews On"}
                      </p>
                      <p className="font-semibold text-foreground">
                        {format(new Date(subscription.current_period_end), "MMMM d, yyyy")}
                      </p>
                    </div>
                  )}
                  {isCustomActive && subscription.custom_valid_until && (
                    <div>
                      <p className="text-xs text-muted-foreground">Custom Plan Valid Until</p>
                      <p className="font-semibold text-foreground">
                        {format(new Date(subscription.custom_valid_until), "MMMM d, yyyy")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

        </div>
      </div>

      {cancelModal && subscription && (
        <CancelConfirmModal
          type="cancel"
          periodEnd={subscription.current_period_end ?? null}
          loading={cancelling}
          onConfirm={handleCancel}
          onClose={() => setCancelModal(false)}
        />
      )}
      {reactivateModal && subscription && (
        <CancelConfirmModal
          type="reactivate"
          periodEnd={subscription.current_period_end ?? null}
          loading={reactivating}
          onConfirm={handleReactivate}
          onClose={() => setReactivateModal(false)}
        />
      )}
    </>
  );
}
