import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, Bookmark, User as UserIcon, Settings as SettingsIcon,
  LayoutDashboard, FileText, CheckCircle2, Clock, Star, Trash2, ExternalLink,
  LogOut, Home, PanelLeftClose, PanelLeftOpen,
  ChevronDown, ChevronUp, MapPin, Building2, Calendar, Phone, Linkedin,
  AlertTriangle, XCircle, Award, Search, Printer, Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { api, apiError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Field, Input, Select, SubmitButton } from "@/components/site/Form";
import { SPECIALTIES, PROVINCES } from "@/data/jobs";
import { Logo } from "@/components/site/Logo";
import { NotificationBell } from "@/components/site/NotificationBell";

export const Route = createFileRoute("/_authenticated/dashboard/physician")({
  head: () => ({ meta: [{ title: "Physician Dashboard — MedConnect Canada" }] }),
  component: PhysicianDashboard,
});

type Tab = "overview" | "applications" | "saved" | "profile" | "settings";

const STATUS_STEPS = ["pending", "reviewed", "shortlisted", "interview", "offered"] as const;
type AppStatus = "pending" | "reviewed" | "shortlisted" | "interview" | "offered" | "rejected" | "withdrawn";

const STATUS_META: Record<AppStatus, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending:     { label: "Pending",     color: "text-amber-700",   bg: "bg-amber-100",   icon: Clock },
  reviewed:    { label: "Reviewed",    color: "text-blue-700",    bg: "bg-blue-100",    icon: Search },
  shortlisted: { label: "Shortlisted", color: "text-violet-700",  bg: "bg-violet-100",  icon: Star },
  interview:   { label: "Interview",   color: "text-indigo-700",  bg: "bg-indigo-100",  icon: Calendar },
  offered:     { label: "Offered",     color: "text-emerald-700", bg: "bg-emerald-100", icon: Award },
  rejected:    { label: "Rejected",    color: "text-rose-700",    bg: "bg-rose-100",    icon: XCircle },
  withdrawn:   { label: "Withdrawn",   color: "text-slate-500",   bg: "bg-slate-100",   icon: AlertTriangle },
};

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "applications", label: "My Applications", icon: FileText },
  { id: "saved", label: "Saved Jobs", icon: Bookmark },
  { id: "profile", label: "My Profile", icon: UserIcon },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

interface Application {
  id: number | string;
  job_id?: number;
  job_title?: string;
  employer_name?: string;
  job_location?: string;
  status?: AppStatus;
  status_display?: string;
  applied_at?: string;
  updated_at?: string;
  cover_letter?: string;
  resume_url?: string;
  profile_resume_url?: string;
  phone?: string;
  years_experience?: number;
  linkedin_url?: string;
  availability_date?: string;
  willing_to_relocate?: boolean;
}
interface SavedJob {
  id: number | string;
  job: number;
  job_detail?: {
    id: number;
    title: string;
    specialty_display?: string;
    specialty?: string;
    employer_name?: string;
    location_display?: string;
  };
  saved_at?: string;
}

function StatusBadge({ status }: { status?: AppStatus }) {
  const s = (status ?? "pending") as AppStatus;
  const meta = STATUS_META[s] ?? STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.bg} ${meta.color}`}>
      <Icon className="h-3 w-3" /> {meta.label}
    </span>
  );
}

function StatusTimeline({ status }: { status?: AppStatus }) {
  const s = status ?? "pending";
  if (s === "rejected" || s === "withdrawn") {
    const meta = STATUS_META[s as AppStatus];
    const Icon = meta.icon;
    return (
      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${meta.bg} ${meta.color}`}>
        <Icon className="h-4 w-4" />
        Application {meta.label}
      </div>
    );
  }
  const activeIdx = STATUS_STEPS.indexOf(s as typeof STATUS_STEPS[number]);
  return (
    <div className="flex items-center gap-1">
      {STATUS_STEPS.map((step, idx) => {
        const meta = STATUS_META[step];
        const done = idx < activeIdx;
        const current = idx === activeIdx;
        return (
          <div key={step} className="flex items-center">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
              current ? `${meta.bg} ${meta.color} ring-2 ring-offset-1 ring-current` :
              done ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground"
            }`}>
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
            </div>
            {idx < STATUS_STEPS.length - 1 && (
              <div className={`h-0.5 w-6 ${done ? "bg-emerald-400" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PhysicianDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const currentTab = TABS.find((t) => t.id === tab) ?? TABS[0];

  function handleLogout() {
    logout();
    toast.success("Signed out");
    navigate({ to: "/login" });
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-secondary/40">
      {/* Top bar */}
      <header className="z-30 flex-none border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="hidden items-center justify-center rounded-lg border border-border bg-background p-1.5 text-foreground/70 transition hover:border-primary/30 hover:text-primary lg:inline-flex"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
          <Logo />
          <div className="mx-4 hidden h-5 w-px bg-border lg:block" />
          <div className="hidden flex-1 sm:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Physician Portal · {currentTab.label}
            </p>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground/70 transition hover:border-primary/30 hover:text-primary"
            >
              <Home className="h-3.5 w-3.5" /> Home
            </Link>
            <NotificationBell role="physician" />
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-accent text-xs font-bold text-primary">
                {(user?.email ?? "P").slice(0, 1).toUpperCase()}
              </span>
              <div className="hidden text-xs sm:block">
                <div className="font-semibold text-foreground leading-tight">
                  Dr. {user?.first_name || user?.email}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground/70 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="h-3.5 w-3.5" /> Log out
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`hidden flex-none overflow-hidden border-r border-border bg-card shadow-sm transition-[width] duration-300 lg:flex lg:flex-col ${sidebarOpen ? "w-64" : "w-0 border-r-0"}`}>
          <div className={`flex-1 overflow-y-auto transition-opacity duration-300 ${sidebarOpen ? "opacity-100 p-4" : "opacity-0"}`}>
          <div className="mb-5 rounded-xl bg-linear-to-br from-primary/10 to-accent/10 p-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
              <UserIcon className="h-7 w-7" />
            </div>
            <p className="mt-2 text-sm font-bold text-primary">
              Dr. {user?.first_name ?? user?.email}
            </p>
            <p className="text-xs text-muted-foreground">{(user?.specialty as string) ?? "Physician"}</p>
          </div>
          <nav className="space-y-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground/70 hover:bg-secondary hover:text-primary"
                  }`}
                >
                  <Icon className="h-4 w-4 flex-none" /> {t.label}
                </button>
              );
            })}
          </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 py-8 lg:px-8">
          <div className="space-y-6">
          {tab === "overview" && <OverviewTab />}
          {tab === "applications" && <ApplicationsTab />}
          {tab === "saved" && <SavedTab />}
          {tab === "profile" && <ProfileTab />}
          {tab === "settings" && <SettingsTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

function OverviewTab() {
  const user = useAuthStore((s) => s.user);
  const { data: apps } = useQuery<Application[]>({
    queryKey: ["my-applications"],
    queryFn: async () => { const r = await api.get("/api/jobs/my-applications/"); const d = r.data?.data ?? r.data; return Array.isArray(d) ? d : (d?.results ?? []); },
    retry: 1,
  });
  const { data: saved } = useQuery<SavedJob[]>({
    queryKey: ["saved-jobs"],
    queryFn: async () => { const r = await api.get("/api/jobs/saved/"); const d = r.data?.data ?? r.data; return Array.isArray(d) ? d : (d?.results ?? []); },
    retry: 1,
  });

  const list = apps ?? [];
  const inProgress = list.filter((a) => !["rejected", "withdrawn"].includes(a.status ?? "pending")).length;
  const stats = [
    { label: "Total Applications", value: list.length, icon: FileText, tone: "bg-blue-50 text-blue-700" },
    { label: "In Progress", value: inProgress, icon: Clock, tone: "bg-amber-50 text-amber-700" },
    { label: "Shortlisted / Offered", value: list.filter((a) => a.status === "shortlisted" || a.status === "offered").length, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Saved Jobs", value: saved?.length ?? 0, icon: Bookmark, tone: "bg-violet-50 text-violet-700" },
  ];

  return (
    <>
      <header className="rounded-2xl border border-border bg-gradient-to-br from-primary to-primary-glow p-6 text-primary-foreground shadow-sm">
        <p className="text-sm uppercase tracking-wider opacity-80">Welcome back</p>
        <h1 className="mt-1 text-2xl font-bold">Dr. {user?.first_name || user?.email}</h1>
        <p className="mt-1 text-sm opacity-90">Here's what's happening with your career today.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-2xl font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">Recent Applications</h2>
          <Link to="/jobs" className="text-sm font-semibold text-accent hover:underline">
            Browse more jobs →
          </Link>
        </div>
        {list.length === 0 ? (
          <EmptyApplications />
        ) : (
          <ApplicationsTable items={list.slice(0, 5)} />
        )}
      </div>
    </>
  );
}

function ApplicationsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Application[]>({
    queryKey: ["my-applications"],
    queryFn: async () => { const r = await api.get("/api/jobs/my-applications/"); const d = r.data?.data ?? r.data; return Array.isArray(d) ? d : (d?.results ?? []); },
    retry: 1,
  });

  const withdraw = useMutation({
    mutationFn: (appId: number | string) => api.delete(`/api/jobs/applications/${appId}/`),
    onSuccess: () => {
      toast.success("Application withdrawn");
      qc.invalidateQueries({ queryKey: ["my-applications"] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const [expanded, setExpanded] = useState<Set<number | string>>(new Set());
  const [withdrawing, setWithdrawing] = useState<number | string | null>(null);

  function toggleExpand(id: number | string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleWithdraw(app: Application) {
    if (app.status === "offered") {
      toast.error("Cannot withdraw an application with an active offer. Contact the employer.");
      return;
    }
    setWithdrawing(app.id);
    try {
      await withdraw.mutateAsync(app.id);
    } finally {
      setWithdrawing(null);
    }
  }

  const list = data ?? [];
  const active = list.filter((a) => a.status !== "rejected" && a.status !== "withdrawn");
  const closed = list.filter((a) => a.status === "rejected" || a.status === "withdrawn");

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(["pending", "reviewed", "shortlisted", "interview", "offered", "rejected"] as AppStatus[]).map((s) => {
          const count = list.filter((a) => a.status === s || (!a.status && s === "pending")).length;
          const meta = STATUS_META[s];
          const Icon = meta.icon;
          return (
            <div key={s} className={`rounded-xl border border-border p-3 text-center ${meta.bg}`}>
              <Icon className={`mx-auto h-4 w-4 ${meta.color}`} />
              <p className={`mt-1 text-xl font-bold ${meta.color}`}>{count}</p>
              <p className={`text-xs font-medium ${meta.color} opacity-80`}>{meta.label}</p>
            </div>
          );
        })}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm"><SkeletonRows /></div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm"><EmptyApplications /></div>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Active Applications</h2>
              <div className="space-y-3">
                {active.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    expanded={expanded.has(app.id)}
                    onToggle={() => toggleExpand(app.id)}
                    onWithdraw={() => handleWithdraw(app)}
                    withdrawing={withdrawing === app.id}
                  />
                ))}
              </div>
            </section>
          )}
          {closed.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Closed</h2>
              <div className="space-y-3">
                {closed.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    expanded={expanded.has(app.id)}
                    onToggle={() => toggleExpand(app.id)}
                    onWithdraw={() => handleWithdraw(app)}
                    withdrawing={withdrawing === app.id}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ApplicationCard({
  app, expanded, onToggle, onWithdraw, withdrawing,
}: {
  app: Application;
  expanded: boolean;
  onToggle: () => void;
  onWithdraw: () => void;
  withdrawing: boolean;
}) {
  const isClosed = app.status === "rejected" || app.status === "withdrawn";
  const resumeUrl = app.resume_url ?? app.profile_resume_url;
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadPDF() {
    if (!app.job_id) return;
    setDownloading(true);
    try {
      const response = await api.get(`/api/jobs/${app.job_id}/pdf/`, { responseType: "blob" });
      const blob = new Blob([response.data as BlobPart], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const disposition = response.headers["content-disposition"] as string | undefined;
      const filename = disposition
        ? disposition.split("filename=")[1]?.replace(/"/g, "") ?? `MedConnect_Job_${app.job_id}.pdf`
        : `MedConnect_Job_${app.job_id}.pdf`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded!");
    } catch {
      toast.error("Failed to download PDF.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <article className={`rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md ${isClosed ? "border-border opacity-75" : "border-border"}`}>
      {/* Card header — always visible */}
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={app.status} />
            {app.applied_at && (
              <span className="text-xs text-muted-foreground">
                Applied {format(new Date(app.applied_at), "MMM d, yyyy")}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 text-base font-bold text-primary truncate">
            {app.job_title ?? `Application #${app.id}`}
          </h3>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
            {app.employer_name && (
              <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{app.employer_name}</span>
            )}
            {app.job_location && (
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{app.job_location}</span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-2">
          {!isClosed && (
            <button
              onClick={onWithdraw}
              disabled={withdrawing || app.status === "offered"}
              title={app.status === "offered" ? "Cannot withdraw an offered application" : "Withdraw application"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {withdrawing ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-400 border-t-transparent" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              Withdraw
            </button>
          )}
          {app.job_id && (
            <Link
              to="/jobs/$jobId"
              params={{ jobId: String(app.job_id) }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground/70 transition hover:border-primary/30 hover:text-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View Job
            </Link>
          )}
          {app.job_id && (
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              title="Download job PDF"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground/70 transition hover:border-accent/40 hover:text-accent disabled:opacity-50"
            >
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
              PDF
            </button>
          )}
          <button
            onClick={onToggle}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground/70 transition hover:border-primary/30 hover:text-primary"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Less" : "Details"}
          </button>
        </div>
      </div>

      {/* Status timeline (only for active) */}
      {!isClosed && (
        <div className="border-t border-border bg-secondary/30 px-5 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Application Progress</p>
          <StatusTimeline status={app.status} />
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          {/* Application details grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {app.phone && (
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>{app.phone}</span>
              </div>
            )}
            {app.years_experience != null && (
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>{app.years_experience} yr{app.years_experience !== 1 ? "s" : ""} experience</span>
              </div>
            )}
            {app.availability_date && (
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>Available {format(new Date(app.availability_date), "MMM d, yyyy")}</span>
              </div>
            )}
            {app.willing_to_relocate && (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>Willing to relocate</span>
              </div>
            )}
            {app.linkedin_url && (
              <a
                href={app.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <Linkedin className="h-3.5 w-3.5 shrink-0" /> LinkedIn Profile
              </a>
            )}
            {resumeUrl && (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-accent hover:underline"
              >
                <FileText className="h-3.5 w-3.5 shrink-0" /> View Resume
              </a>
            )}
          </div>

          {/* Cover letter */}
          {app.cover_letter && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cover Letter</p>
              <div className="rounded-xl bg-secondary/40 px-4 py-3 text-sm text-foreground/80 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                {app.cover_letter}
              </div>
            </div>
          )}

          {/* Last updated */}
          {app.updated_at && (
            <p className="text-xs text-muted-foreground">
              Last updated {format(new Date(app.updated_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function ApplicationsTable({ items }: { items: Application[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Job</th>
            <th className="px-3 py-2">Company</th>
            <th className="px-3 py-2">Applied</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((a) => (
            <tr key={a.id}>
              <td className="px-3 py-3 font-medium text-primary">{a.job_title ?? `Application #${a.id}`}</td>
              <td className="px-3 py-3 text-foreground/80">{a.employer_name ?? "—"}</td>
              <td className="px-3 py-3 text-muted-foreground">
                {a.applied_at ? format(new Date(a.applied_at), "MMM d, yyyy") : "—"}
              </td>
              <td className="px-3 py-3"><StatusBadge status={a.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SavedTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<SavedJob[]>({
    queryKey: ["saved-jobs"],
    queryFn: async () => { const r = await api.get("/api/jobs/saved/"); const d = r.data?.data ?? r.data; return Array.isArray(d) ? d : (d?.results ?? []); },
    retry: 1,
  });
  const unsave = useMutation({
    mutationFn: (jobPk: number) => api.delete(`/api/jobs/${jobPk}/unsave/`),
    onSuccess: () => {
      toast.success("Removed from saved");
      qc.invalidateQueries({ queryKey: ["saved-jobs"] });
      qc.invalidateQueries({ queryKey: ["saved-jobs-ids"] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-primary">Saved Jobs</h2>
      {isLoading ? (
        <SkeletonRows />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved jobs yet"
          description="Bookmark jobs while browsing to revisit them later."
          action={{ to: "/jobs", label: "Browse jobs" }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((s) => {
            const j = s.job_detail;
            return (
              <article key={s.id} className="rounded-xl border border-border p-4">
                <p className="text-xs font-semibold text-accent">{j?.specialty_display || j?.specialty || "—"}</p>
                <h3 className="mt-1 font-bold text-primary">{j?.title || "Job"}</h3>
                <p className="text-sm text-muted-foreground">{j?.employer_name || "—"} · {j?.location_display || "—"}</p>
                <div className="mt-3 flex gap-2">
                  <Link
                    to="/jobs/$jobId"
                    params={{ jobId: String(s.job) }}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-glow"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View
                  </Link>
                  <button
                    onClick={() => unsave.mutate(s.job)}
                    disabled={unsave.isPending}
                    className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    aria-label="Unsave"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProfileTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["physician-profile"],
    queryFn: async () => { const r = await api.get("/api/profile/physician/"); return r.data?.data ?? r.data ?? {}; },
    retry: 1,
  });
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const merged = { ...(data ?? {}), ...form };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/api/profile/physician/", merged);
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
        <SkeletonRows />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-bold text-primary">My Profile</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First Name"><Input value={merged.first_name ?? ""} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field>
        <Field label="Last Name"><Input value={merged.last_name ?? ""} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={merged.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Phone"><Input type="tel" value={merged.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Specialty">
          <Select value={merged.specialty ?? ""} onChange={(e) => setForm({ ...form, specialty: e.target.value })}>
            <option value="">Select specialty…</option>
            {SPECIALTIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
        <Field label="CPSO Number"><Input value={merged.cpso_number ?? ""} onChange={(e) => setForm({ ...form, cpso_number: e.target.value })} /></Field>
        <Field label="City"><Input value={merged.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
        <Field label="Province">
          <Select value={merged.province ?? ""} onChange={(e) => setForm({ ...form, province: e.target.value })}>
            <option value="">Select province…</option>
            {PROVINCES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Resume / CV (PDF, DOC)">
        <Input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const fd = new FormData();
            fd.append("resume", f);
            try {
              await api.post("/api/profile/physician/resume/", fd, {
                headers: { "Content-Type": "multipart/form-data" },
              });
              toast.success("Resume uploaded");
            } catch (err) {
              toast.error(apiError(err));
            }
          }}
        />
      </Field>
      <SubmitButton loading={saving}>Save Changes</SubmitButton>
    </form>
  );
}

function SettingsTab() {
  const user = useAuthStore((s) => s.user);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    setLoading(true);
    try {
      await api.post("/api/auth/password/reset/", { email: user.email });
      setSent(true);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-bold text-primary">Change Password</h2>
      {sent ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Password reset email sent to <strong>{user?.email}</strong>. Check your inbox and follow the link to set a new password.
        </div>
      ) : (
        <form onSubmit={sendReset} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We'll send a password reset link to <strong className="text-foreground">{user?.email}</strong>.
          </p>
          <SubmitButton loading={loading}>Send Reset Link</SubmitButton>
        </form>
      )}
    </div>
  );
}

function EmptyApplications() {
  return (
    <EmptyState
      icon={Briefcase}
      title="No applications yet"
      description="Start exploring jobs across Canada and apply with one click."
      action={{ to: "/jobs", label: "Browse jobs" }}
    />
  );
}

function EmptyState({
  icon: Icon, title, description, action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: { to: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-3 font-semibold text-primary">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && (
        <Link
          to={action.to as never}
          className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-glow"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-secondary" />
      ))}
    </div>
  );
}

