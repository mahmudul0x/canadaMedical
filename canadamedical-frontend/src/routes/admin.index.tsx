import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Briefcase,
  Users,
  ClipboardList,
  Mail,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { format } from "date-fns";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

interface DashboardStats {
  total_physicians: number;
  total_employers: number;
  total_jobs: number;
  pending_jobs: number;
  active_jobs: number;
  total_applications: number;
  total_assessments: number;
  unreviewed_assessments: number;
  unread_contacts: number;
  total_revenue: string;
  monthly_revenue: string;
  active_subscriptions: number;
}

interface RecentJob {
  id: number;
  title: string;
  employer_name?: string;
  specialty?: string;
  is_approved?: boolean;
  is_active?: boolean;
  created_at?: string;
  total_applications?: number;
}

interface RecentUser {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  user_type?: string;
  is_active?: boolean;
  date_joined?: string;
}

interface UserGrowthPoint {
  month: string;
  physicians: number;
  employers: number;
}

interface DashboardData {
  stats: DashboardStats;
  recent_jobs: RecentJob[];
  recent_users: RecentUser[];
  user_growth_chart: UserGrowthPoint[];
  monthly_revenue_chart: { month: string; revenue: number }[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  loading,
  tone,
  toneIcon,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub?: string;
  loading?: boolean;
  tone: string;
  toneIcon: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneIcon}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="mt-3 text-2xl font-bold text-primary">
        {loading ? (
          <span className="inline-block h-7 w-14 animate-pulse rounded bg-secondary" />
        ) : (
          value
        )}
      </p>
      <p className={`text-xs font-semibold ${tone}`}>{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; to: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card shadow-sm ${className}`}>
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
          </span>
          {action && (
            <Link to={action.to as never}
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
              {action.label} <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function AdminDashboard() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, error, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const res = await api.get("/api/admin/dashboard/");
      return (res.data?.data ?? res.data) as DashboardData;
    },
    retry: 1,
    staleTime: 30_000,
  });

  const s = data?.stats;
  const totalUsers = (s?.total_physicians ?? 0) + (s?.total_employers ?? 0);

  const primaryStats = [
    {
      label: "Active Jobs",
      value: s?.active_jobs ?? 0,
      sub: `${s?.pending_jobs ?? 0} pending approval`,
      icon: Briefcase,
      tone: "text-blue-700",
      toneIcon: "bg-gradient-to-br from-blue-500 to-blue-700",
    },
    {
      label: "Total Users",
      value: totalUsers,
      sub: `${s?.total_physicians ?? 0} physicians · ${s?.total_employers ?? 0} employers`,
      icon: Users,
      tone: "text-violet-700",
      toneIcon: "bg-gradient-to-br from-violet-500 to-violet-700",
    },
    {
      label: "Applications",
      value: s?.total_applications ?? 0,
      sub: "across all job postings",
      icon: ClipboardList,
      tone: "text-emerald-700",
      toneIcon: "bg-gradient-to-br from-emerald-500 to-emerald-700",
    },
    {
      label: "Inquiries",
      value: s?.unread_contacts ?? 0,
      sub: `${s?.total_assessments ?? 0} assessments total`,
      icon: Mail,
      tone: "text-amber-700",
      toneIcon: "bg-gradient-to-br from-amber-400 to-amber-600",
    },
  ];

  const secondaryStats = [
    { label: "Pending Jobs", value: s?.pending_jobs ?? 0, icon: Clock, bg: "bg-amber-50", color: "text-amber-700" },
    { label: "Physicians", value: s?.total_physicians ?? 0, icon: Users, bg: "bg-blue-50", color: "text-blue-700" },
    { label: "Employers", value: s?.total_employers ?? 0, icon: Briefcase, bg: "bg-violet-50", color: "text-violet-700" },
    { label: "Unreviewed Assessments", value: s?.unreviewed_assessments ?? 0, icon: ClipboardList, bg: "bg-rose-50", color: "text-rose-700" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-8">
      {/* Welcome banner */}
      <header className="rounded-2xl border border-border bg-linear-to-br from-primary to-primary-glow p-6 text-primary-foreground shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-75">Admin Dashboard</p>
            <h1 className="mt-1 text-2xl font-bold">
              {user?.first_name || user?.email || "Administrator"}
            </h1>
            <p className="mt-1 text-sm opacity-80">
              Real-time overview of jobs, users, applications, and inquiries.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80 backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/80">
              <TrendingUp className="h-3 w-3" /> Live metrics
            </span>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          Failed to load dashboard data: {apiError(error)}
        </div>
      )}

      {/* Primary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {primaryStats.map((s) => (
          <StatCard
            key={s.label}
            icon={s.icon}
            label={s.label}
            value={s.value}
            sub={s.sub}
            loading={isLoading}
            tone={s.tone}
            toneIcon={s.toneIcon}
          />
        ))}
      </div>

      {/* Secondary quick stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {secondaryStats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`flex items-center gap-3 rounded-xl border border-border p-3 ${s.bg}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.bg} ${s.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className={`text-lg font-bold ${s.color}`}>
                  {isLoading ? <span className="inline-block h-5 w-8 animate-pulse rounded bg-white/40" /> : s.value}
                </p>
                <p className={`text-[11px] font-medium ${s.color} opacity-80`}>{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* User growth chart */}
        <SectionCard
          title="User Growth"
          subtitle="Physicians & employers registered per month"
          action={{ label: "Manage users", to: "/admin/users" }}
        >
          <div className="h-64">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <span className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-accent" />
              </div>
            ) : !data?.user_growth_chart?.length ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.user_growth_chart} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                  <defs>
                    <linearGradient id="physGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.62 0.20 255)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.62 0.20 255)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="empGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.78 0.13 175)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.78 0.13 175)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.012 250)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "oklch(0.55 0.025 255)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "oklch(0.55 0.025 255)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 250)", fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                  <Area type="monotone" dataKey="physicians" name="Physicians" stroke="oklch(0.62 0.20 255)" strokeWidth={2} fill="url(#physGrad)" dot={false} />
                  <Area type="monotone" dataKey="employers" name="Employers" stroke="oklch(0.78 0.13 175)" strokeWidth={2} fill="url(#empGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        {/* Jobs status breakdown bar chart */}
        <SectionCard
          title="Job Posting Status"
          subtitle="Active, pending, and total jobs breakdown"
          action={{ label: "Manage jobs", to: "/admin/jobs" }}
        >
          <div className="h-64">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <span className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-accent" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "Active", count: s?.active_jobs ?? 0 },
                    { name: "Pending", count: s?.pending_jobs ?? 0 },
                    { name: "Total", count: s?.total_jobs ?? 0 },
                  ]}
                  margin={{ top: 8, right: 8, left: -16, bottom: 8 }}
                >
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.62 0.20 255)" />
                      <stop offset="100%" stopColor="oklch(0.32 0.10 258)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.012 250)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "oklch(0.55 0.025 255)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "oklch(0.55 0.025 255)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 250)", fontSize: 12 }}
                  />
                  <Bar dataKey="count" name="Jobs" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Recent activity row */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Recent jobs */}
        <SectionCard
          title="Recent Job Postings"
          subtitle="Latest 5 jobs submitted to the platform"
          action={{ label: "View all", to: "/admin/jobs" }}
        >
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-secondary" />)}
            </div>
          ) : !data?.recent_jobs?.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No jobs yet</p>
          ) : (
            <div className="divide-y divide-border">
              {data.recent_jobs.map((job) => (
                <div key={job.id} className="flex items-center gap-3 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Briefcase className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{job.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {job.employer_name ?? "—"} · {job.specialty ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {job.is_approved ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        <Clock className="h-2.5 w-2.5" /> Pending
                      </span>
                    )}
                    {job.created_at && (
                      <span className="hidden text-[10px] text-muted-foreground sm:block">
                        {format(new Date(job.created_at), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recent users */}
        <SectionCard
          title="Recent Registrations"
          subtitle="Latest 5 users who joined the platform"
          action={{ label: "View all", to: "/admin/users" }}
        >
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-secondary" />)}
            </div>
          ) : !data?.recent_users?.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No users yet</p>
          ) : (
            <div className="divide-y divide-border">
              {data.recent_users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {(u.first_name ?? u.email ?? "U")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                      u.user_type === "physician" ? "bg-blue-100 text-blue-800" : "bg-violet-100 text-violet-800"
                    }`}>
                      {u.user_type ?? "—"}
                    </span>
                    {u.is_active ? (
                      <Eye className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-400" />
                    )}
                    {u.date_joined && (
                      <span className="hidden text-[10px] text-muted-foreground sm:block">
                        {format(new Date(u.date_joined), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Quick action links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: "/admin/jobs", label: "Review Pending Jobs", sub: `${s?.pending_jobs ?? 0} awaiting`, icon: Briefcase, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
          { to: "/admin/users", label: "Manage Users", sub: `${totalUsers} registered`, icon: Users, color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
          { to: "/admin/assessments", label: "Career Assessments", sub: `${s?.unreviewed_assessments ?? 0} unreviewed`, icon: ClipboardList, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
          { to: "/admin/contacts", label: "Contact Inquiries", sub: `${s?.unread_contacts ?? 0} unread`, icon: Mail, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to as never}
              className={`flex items-center gap-3 rounded-2xl border p-4 transition hover:shadow-sm ${item.bg}`}>
              <Icon className={`h-6 w-6 shrink-0 ${item.color}`} />
              <div className="min-w-0">
                <p className={`text-sm font-bold ${item.color}`}>{item.label}</p>
                <p className="text-xs text-muted-foreground">{isLoading ? "…" : item.sub}</p>
              </div>
              <ArrowRight className={`ml-auto h-4 w-4 shrink-0 ${item.color} opacity-50`} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
