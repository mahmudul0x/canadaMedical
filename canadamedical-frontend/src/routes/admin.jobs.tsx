import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  CheckCircle2, XCircle, Trash2, Eye, Clock, Search, Filter,
  X, Download, RefreshCw, Briefcase, Building2, MapPin,
  DollarSign, Users, BarChart2, ChevronLeft, ChevronRight,
  Globe, ExternalLink, Calendar, Mail, Award,
  CheckSquare, Square, AlertTriangle, TrendingUp,
  FileText, FileSpreadsheet, ChevronDown, Loader2,
} from "lucide-react";
import { api, apiError } from "@/lib/api";
import { Field, Textarea } from "@/components/site/Form";
import { SPECIALTIES, PROVINCES, JOB_TYPES } from "@/data/jobs";
import { buildExportRows, exportCsv, exportXlsx, exportPdf } from "@/lib/export";

export const Route = createFileRoute("/admin/jobs")({
  component: AdminJobsPage,
});

interface Job {
  id: number;
  title: string;
  specialty?: string;
  specialty_display?: string;
  sub_specialty?: string;
  province?: string;
  province_display?: string;
  city?: string;
  location_display?: string;
  employer_name?: string;
  employer_type?: string;
  employer_website?: string;
  job_type?: string;
  job_type_display?: string;
  practice_setting?: string;
  practice_setting_display?: string;
  required_experience?: string;
  required_experience_display?: string;
  remote_option?: boolean;
  relocation_assistance?: boolean;
  salary_min?: number;
  salary_max?: number;
  salary_display?: string;
  compensation_model?: string;
  description?: string;
  qualifications?: string;
  responsibilities?: string;
  requirements?: string;
  compensation?: string;
  benefits?: string;
  application_deadline?: string;
  contact_person?: string;
  contact_email?: string;
  is_active?: boolean;
  is_approved?: boolean;
  status_label?: string;
  rejection_reason?: string;
  created_at?: string;
  approved_at?: string;
  rejected_at?: string;
  updated_at?: string;
  views_count?: number;
  total_applications?: number;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  data: Job[];
}

const STATUS_META: Record<string, { bg: string; color: string; dot: string }> = {
  Active:   { bg: "bg-emerald-100", color: "text-emerald-800", dot: "bg-emerald-500" },
  Pending:  { bg: "bg-amber-100",   color: "text-amber-800",   dot: "bg-amber-500"   },
  Rejected: { bg: "bg-rose-100",    color: "text-rose-800",    dot: "bg-rose-500"    },
  Inactive: { bg: "bg-slate-100",   color: "text-slate-700",   dot: "bg-slate-400"   },
};

function StatusPill({ label }: { label?: string }) {
  const meta = STATUS_META[label ?? ""] ?? { bg: "bg-secondary", color: "text-muted-foreground", dot: "bg-border" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.bg} ${meta.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {label ?? "—"}
    </span>
  );
}

const PAGE_SIZE = 15;

function AdminJobsPage() {
  const qc = useQueryClient();

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [filterProvince, setFilterProvince] = useState("");
  const [filterJobType, setFilterJobType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Panels/modals
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Job | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const params = useMemo(() => {
    const p: Record<string, string> = { page: String(page), page_size: String(PAGE_SIZE) };
    if (search)          p.search = search;
    if (filterStatus)    p.status = filterStatus;
    if (filterSpecialty) p.specialty = filterSpecialty;
    if (filterProvince)  p.province = filterProvince;
    if (filterJobType)   p.job_type = filterJobType;
    if (dateFrom)        p.date_from = dateFrom;
    if (dateTo)          p.date_to = dateTo;
    return p;
  }, [search, filterStatus, filterSpecialty, filterProvince, filterJobType, dateFrom, dateTo, page]);

  const { data, isLoading, isFetching, refetch } = useQuery<PaginatedResponse>({
    queryKey: ["admin", "jobs", params],
    queryFn: async () => {
      const r = await api.get("/api/admin/jobs/", { params });
      const d = r.data;
      // handle both paginated and flat responses
      if (d?.count !== undefined) return d as PaginatedResponse;
      const rows = d?.data ?? d;
      return { count: Array.isArray(rows) ? rows.length : 0, next: null, previous: null, data: Array.isArray(rows) ? rows : [] };
    },
    staleTime: 15_000,
  });

  const rows = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const pendingQuery = useQuery<{ count: number }>({
    queryKey: ["admin", "jobs", "pending-count"],
    queryFn: async () => {
      const r = await api.get("/api/admin/jobs/pending/", { params: { page_size: 1 } });
      return { count: r.data?.count ?? 0 };
    },
    staleTime: 30_000,
  });
  const pendingCount = pendingQuery.data?.count ?? 0;

  const hasFilters = !!(search || filterStatus || filterSpecialty || filterProvince || filterJobType || dateFrom || dateTo);

  function clearFilters() {
    setSearch(""); setFilterStatus(""); setFilterSpecialty("");
    setFilterProvince(""); setFilterJobType(""); setDateFrom(""); setDateTo("");
    setPage(1);
  }

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin", "jobs"] });
    setSelected(new Set());
  }

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/api/admin/jobs/${id}/approve/`),
    onSuccess: () => { toast.success("Job approved and published"); invalidate(); },
    onError: (e) => toast.error(apiError(e)),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.patch(`/api/admin/jobs/${id}/reject/`, { reason }),
    onSuccess: () => {
      toast.success("Job rejected");
      setRejectTarget(null);
      setRejectReason("");
      if (detailJob) setDetailJob(null);
      invalidate();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/jobs/${id}/`),
    onSuccess: () => { toast.success("Job deleted"); invalidate(); if (detailJob) setDetailJob(null); },
    onError: (e) => toast.error(apiError(e)),
  });

  // Bulk approve
  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => api.patch(`/api/admin/jobs/${id}/approve/`)));
    },
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} job${ids.length !== 1 ? "s" : ""} approved`);
      invalidate();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  async function openDetail(job: Job) {
    setDetailLoading(true);
    setDetailJob(job);
    try {
      const r = await api.get(`/api/admin/jobs/${job.id}/`);
      const full = r.data?.data ?? r.data;
      setDetailJob(full as Job);
    } catch {
      // keep the list version
    } finally {
      setDetailLoading(false);
    }
  }

  // Selection helpers
  const allPageIds = rows.map((r) => r.id);
  const allPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;
  const pendingSelected = rows.filter((r) => selected.has(r.id) && r.status_label === "Pending").map((r) => r.id);

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) allPageIds.forEach((id) => next.delete(id));
      else allPageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function toggleRow(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Status counts (from current page — for quick summary)
  const statusCounts = useMemo(() => {
    const m: Record<string, number> = { Active: 0, Pending: 0, Rejected: 0, Inactive: 0 };
    rows.forEach((r) => { if (r.status_label) m[r.status_label] = (m[r.status_label] ?? 0) + 1; });
    return m;
  }, [rows]);

  // Export
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | "pdf" | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function fetchAllForExport(): Promise<Job[]> {
    // Fetch all pages matching current filters (up to 2000 rows)
    const exportParams: Record<string, string> = { page_size: "2000" };
    if (search)          exportParams.search = search;
    if (filterStatus)    exportParams.status = filterStatus;
    if (filterSpecialty) exportParams.specialty = filterSpecialty;
    if (filterProvince)  exportParams.province = filterProvince;
    if (filterJobType)   exportParams.job_type = filterJobType;
    if (dateFrom)        exportParams.date_from = dateFrom;
    if (dateTo)          exportParams.date_to = dateTo;
    const r = await api.get("/api/admin/jobs/", { params: exportParams });
    const d = r.data;
    if (d?.data) return d.data as Job[];
    if (Array.isArray(d)) return d as Job[];
    return [];
  }

  function activeFilterDescription() {
    const parts: string[] = [];
    if (search)          parts.push(`Search: "${search}"`);
    if (filterStatus)    parts.push(`Status: ${filterStatus}`);
    if (filterSpecialty) parts.push(`Specialty: ${filterSpecialty}`);
    if (filterProvince)  parts.push(`Province: ${filterProvince}`);
    if (filterJobType)   parts.push(`Type: ${filterJobType}`);
    if (dateFrom)        parts.push(`From: ${dateFrom}`);
    if (dateTo)          parts.push(`To: ${dateTo}`);
    return parts.length ? parts.join(" · ") : "";
  }

  async function handleExport(type: "csv" | "xlsx" | "pdf") {
    setExportOpen(false);
    setExporting(type);
    try {
      const allRows = await fetchAllForExport();
      const exportRows = buildExportRows(allRows);
      const stamp = format(new Date(), "yyyy-MM-dd");
      if (type === "csv") {
        exportCsv(`jobs-export-${stamp}.csv`, exportRows);
        toast.success(`CSV exported — ${exportRows.length} jobs`);
      } else if (type === "xlsx") {
        await exportXlsx(`jobs-export-${stamp}.xlsx`, exportRows);
        toast.success(`Excel exported — ${exportRows.length} jobs`);
      } else {
        await exportPdf(`jobs-export-${stamp}.pdf`, exportRows, {
          total: exportRows.length,
          filters: activeFilterDescription(),
        });
        toast.success(`PDF exported — ${exportRows.length} jobs`);
      }
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Main panel */}
      <div className={`flex flex-1 flex-col overflow-hidden transition-all duration-300 ${detailJob ? "lg:mr-[480px]" : ""}`}>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-5 p-4 lg:p-8">

            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-primary">Job Postings</h1>
                <p className="text-sm text-muted-foreground">
                  Review, approve, and manage all physician job listings.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isFetching && !isLoading && (
                  <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <button
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>

                {/* Export dropdown */}
                <div className="relative" ref={exportRef}>
                  <button
                    onClick={() => setExportOpen((o) => !o)}
                    disabled={!!exporting}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary disabled:opacity-60 transition"
                  >
                    {exporting
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Download className="h-3.5 w-3.5" />}
                    {exporting ? "Exporting…" : "Export"}
                    {!exporting && <ChevronDown className="h-3 w-3 opacity-60" />}
                  </button>

                  {exportOpen && (
                    <div className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                      <div className="border-b border-border px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Export format</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {hasFilters ? "Exports current filter results" : "Exports all jobs"}
                        </p>
                      </div>
                      <div className="p-1">
                        <button
                          onClick={() => handleExport("csv")}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-secondary transition"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                            <FileText className="h-4 w-4 text-emerald-700" />
                          </span>
                          <div className="text-left">
                            <p className="font-semibold text-foreground">CSV</p>
                            <p className="text-[10px] text-muted-foreground">Comma-separated values</p>
                          </div>
                        </button>
                        <button
                          onClick={() => handleExport("xlsx")}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-secondary transition"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                            <FileSpreadsheet className="h-4 w-4 text-blue-700" />
                          </span>
                          <div className="text-left">
                            <p className="font-semibold text-foreground">Excel (XLSX)</p>
                            <p className="text-[10px] text-muted-foreground">Microsoft Excel workbook</p>
                          </div>
                        </button>
                        <button
                          onClick={() => handleExport("pdf")}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-secondary transition"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
                            <Download className="h-4 w-4 text-rose-700" />
                          </span>
                          <div className="text-left">
                            <p className="font-semibold text-foreground">PDF Report</p>
                            <p className="text-[10px] text-muted-foreground">Printable landscape report</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total", value: totalCount, icon: Briefcase, bg: "bg-blue-50", color: "text-blue-700" },
                { label: "Active", value: statusCounts.Active, icon: CheckCircle2, bg: "bg-emerald-50", color: "text-emerald-700" },
                { label: "Pending", value: pendingCount, icon: Clock, bg: "bg-amber-50", color: "text-amber-700" },
                { label: "Rejected", value: statusCounts.Rejected, icon: XCircle, bg: "bg-rose-50", color: "text-rose-700" },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className={`flex items-center gap-3 rounded-2xl border border-border p-4 ${s.bg}`}>
                    <Icon className={`h-5 w-5 shrink-0 ${s.color}`} />
                    <div>
                      <p className={`text-xl font-bold ${s.color}`}>{isLoading ? "…" : s.value}</p>
                      <p className={`text-xs font-medium ${s.color} opacity-75`}>{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Search + filters */}
            <div className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search title or employer…"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {/* Status quick-filter pills */}
                  <div className="hidden items-center gap-1 sm:flex">
                    {["", "pending", "approved", "rejected"].map((s) => (
                      <button key={s} onClick={() => { setFilterStatus(s); setPage(1); }}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${filterStatus === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                        {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setFiltersOpen((o) => !o)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${filtersOpen || hasFilters ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:bg-secondary"}`}
                  >
                    <Filter className="h-4 w-4" /> Filters
                    {hasFilters && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">!</span>}
                  </button>
                </div>
              </div>

              {filtersOpen && (
                <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Specialty</label>
                    <select value={filterSpecialty} onChange={(e) => { setFilterSpecialty(e.target.value); setPage(1); }}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20">
                      <option value="">All specialties</option>
                      {SPECIALTIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Province</label>
                    <select value={filterProvince} onChange={(e) => { setFilterProvince(e.target.value); setPage(1); }}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20">
                      <option value="">All provinces</option>
                      {PROVINCES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Job Type</label>
                    <select value={filterJobType} onChange={(e) => { setFilterJobType(e.target.value); setPage(1); }}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20">
                      <option value="">All types</option>
                      {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Posted from</label>
                    <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Posted to</label>
                    <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" />
                  </div>
                  {hasFilters && (
                    <div className="flex items-end">
                      <button onClick={clearFilters}
                        className="inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-rose-600 transition">
                        <X className="h-3.5 w-3.5" /> Clear all
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bulk action bar */}
            {someSelected && (
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <span className="text-sm font-semibold text-amber-800">{selected.size} selected</span>
                {pendingSelected.length > 0 && (
                  <button
                    onClick={() => bulkApproveMutation.mutate(pendingSelected)}
                    disabled={bulkApproveMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve {pendingSelected.length} pending
                  </button>
                )}
                <button onClick={() => setSelected(new Set())}
                  className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-900">
                  Clear selection
                </button>
              </div>
            )}

            {/* Table */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-lg bg-secondary" />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <div className="py-16 text-center">
                  <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-3 font-semibold text-foreground">{hasFilters ? "No jobs match your filters" : "No jobs yet"}</p>
                  {hasFilters && (
                    <button onClick={clearFilters} className="mt-2 text-sm text-accent hover:underline">Clear filters</button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-secondary/30 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground">
                            {allPageSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                          </button>
                        </th>
                        <th className="px-4 py-3">Title / Employer</th>
                        <th className="px-4 py-3">Specialty</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3 text-center">Apps</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Posted</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((job) => (
                        <tr key={job.id}
                          className={`transition hover:bg-secondary/20 ${selected.has(job.id) ? "bg-primary/5" : ""}`}>
                          <td className="px-4 py-3">
                            <button onClick={() => toggleRow(job.id)} className="text-muted-foreground hover:text-foreground">
                              {selected.has(job.id)
                                ? <CheckSquare className="h-4 w-4 text-primary" />
                                : <Square className="h-4 w-4" />}
                            </button>
                          </td>
                          <td className="px-4 py-3 max-w-56">
                            <button
                              onClick={() => openDetail(job)}
                              className="block text-left font-semibold text-primary hover:underline truncate w-full"
                            >
                              {job.title}
                            </button>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                              <Building2 className="h-3 w-3 shrink-0" />
                              {job.employer_name ?? "—"}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {job.specialty_display || job.specialty || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {job.city && job.province ? `${job.city}, ${job.province}` : job.location_display ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {job.job_type_display || job.job_type || "—"}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-foreground">
                            {job.total_applications ?? 0}
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill label={job.status_label} />
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {job.created_at ? format(new Date(job.created_at), "MMM d, yyyy") : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              {job.status_label === "Pending" && (
                                <>
                                  <button
                                    onClick={() => approveMutation.mutate(job.id)}
                                    disabled={approveMutation.isPending && approveMutation.variables === job.id}
                                    title="Approve"
                                    className="rounded-lg border border-emerald-200 p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => { setRejectTarget(job); setRejectReason(""); }}
                                    title="Reject"
                                    className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50 transition"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => openDetail(job)}
                                title="View details"
                                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary transition"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => { if (confirm(`Delete "${job.title}"?`)) deleteMutation.mutate(job.id); }}
                                title="Delete"
                                className="rounded-lg border border-border p-1.5 text-rose-500 hover:bg-rose-50 transition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {!isLoading && totalCount > 0 && (
                <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
                  <span>
                    Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} jobs
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="inline-flex items-center rounded-lg border border-border px-2.5 py-1.5 disabled:opacity-40 hover:bg-secondary transition"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-3 font-semibold text-foreground">
                      {page} / {totalPages}
                    </span>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="inline-flex items-center rounded-lg border border-border px-2.5 py-1.5 disabled:opacity-40 hover:bg-secondary transition"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail slide-over */}
      {detailJob && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] lg:hidden"
            onClick={() => setDetailJob(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[480px] flex-col border-l border-border bg-card shadow-2xl">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <StatusPill label={detailJob.status_label} />
                <span className="text-xs text-muted-foreground">#{detailJob.id}</span>
                {detailLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
              <button onClick={() => setDetailJob(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Job title + employer */}
              <div className="border-b border-border bg-secondary/30 px-5 py-4">
                <h2 className="text-lg font-bold text-primary leading-tight">{detailJob.title}</h2>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {detailJob.employer_name && (
                    <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{detailJob.employer_name}</span>
                  )}
                  {detailJob.location_display && (
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{detailJob.location_display}</span>
                  )}
                  {detailJob.job_type_display && (
                    <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{detailJob.job_type_display}</span>
                  )}
                </div>
              </div>

              {/* Quick metrics */}
              <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                {[
                  { label: "Applications", value: detailJob.total_applications ?? 0, icon: Users },
                  { label: "Views", value: detailJob.views_count ?? 0, icon: BarChart2 },
                  { label: "Conv. Rate", value: detailJob.views_count ? `${Math.round(((detailJob.total_applications ?? 0) / detailJob.views_count) * 100)}%` : "—", icon: TrendingUp },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="flex flex-col items-center py-3">
                      <Icon className="h-4 w-4 text-accent" />
                      <p className="mt-1 text-lg font-bold text-primary">{m.value}</p>
                      <p className="text-[10px] text-muted-foreground">{m.label}</p>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-5 p-5">
                {/* Core details grid */}
                <section>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Job Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Specialty", value: detailJob.specialty_display || detailJob.specialty },
                      { label: "Sub-specialty", value: detailJob.sub_specialty },
                      { label: "Province", value: detailJob.province_display || detailJob.province },
                      { label: "City", value: detailJob.city },
                      { label: "Job Type", value: detailJob.job_type_display || detailJob.job_type },
                      { label: "Practice Setting", value: detailJob.practice_setting_display || detailJob.practice_setting },
                      { label: "Experience", value: detailJob.required_experience_display || detailJob.required_experience },
                      { label: "Deadline", value: detailJob.application_deadline ? format(new Date(detailJob.application_deadline), "MMM d, yyyy") : undefined },
                    ].filter((f) => f.value).map((f) => (
                      <div key={f.label}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</p>
                        <p className="mt-0.5 text-sm font-medium text-foreground">{f.value}</p>
                      </div>
                    ))}
                    {detailJob.remote_option && (
                      <div className="flex items-center gap-1.5 text-sm text-emerald-700">
                        <Globe className="h-3.5 w-3.5" /> Remote option
                      </div>
                    )}
                    {detailJob.relocation_assistance && (
                      <div className="flex items-center gap-1.5 text-sm text-emerald-700">
                        <MapPin className="h-3.5 w-3.5" /> Relocation assistance
                      </div>
                    )}
                  </div>
                </section>

                {/* Compensation */}
                {(detailJob.salary_display || detailJob.salary_min || detailJob.compensation_model) && (
                  <section className="rounded-xl bg-secondary/30 p-4">
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" /> Compensation
                    </h3>
                    {detailJob.salary_display && <p className="text-sm font-semibold text-foreground">{detailJob.salary_display}</p>}
                    {(detailJob.salary_min || detailJob.salary_max) && (
                      <p className="text-sm text-muted-foreground">
                        {[detailJob.salary_min && `$${Number(detailJob.salary_min).toLocaleString()}`, detailJob.salary_max && `$${Number(detailJob.salary_max).toLocaleString()}`].filter(Boolean).join(" – ")} /yr
                      </p>
                    )}
                    {detailJob.compensation_model && <p className="mt-1 text-xs text-muted-foreground">{detailJob.compensation_model}</p>}
                  </section>
                )}

                {/* Text sections */}
                {[
                  { label: "Description", value: detailJob.description },
                  { label: "Responsibilities", value: detailJob.responsibilities },
                  { label: "Qualifications", value: detailJob.qualifications },
                  { label: "Requirements", value: detailJob.requirements },
                  { label: "Benefits", value: detailJob.benefits },
                  { label: "Compensation Details", value: detailJob.compensation },
                ].filter((s) => s.value).map((s) => (
                  <section key={s.label}>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{s.label}</h3>
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">
                      {s.value}
                    </div>
                  </section>
                ))}

                {/* Employer */}
                <section>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Employer</h3>
                  <div className="rounded-xl border border-border bg-background p-4 space-y-2 text-sm">
                    {detailJob.employer_name && <p className="font-semibold text-foreground">{detailJob.employer_name}</p>}
                    {detailJob.employer_type && <p className="text-muted-foreground">{detailJob.employer_type}</p>}
                    {detailJob.employer_website && (
                      <a href={detailJob.employer_website} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-accent hover:underline text-xs">
                        <ExternalLink className="h-3.5 w-3.5" /> {detailJob.employer_website}
                      </a>
                    )}
                  </div>
                </section>

                {/* Contact */}
                {(detailJob.contact_person || detailJob.contact_email) && (
                  <section>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact</h3>
                    <div className="space-y-1.5 text-sm">
                      {detailJob.contact_person && (
                        <p className="flex items-center gap-2 text-foreground">
                          <Award className="h-4 w-4 text-muted-foreground shrink-0" />{detailJob.contact_person}
                        </p>
                      )}
                      {detailJob.contact_email && (
                        <a href={`mailto:${detailJob.contact_email}`}
                          className="flex items-center gap-2 text-accent hover:underline">
                          <Mail className="h-4 w-4 shrink-0" />{detailJob.contact_email}
                        </a>
                      )}
                    </div>
                  </section>
                )}

                {/* Timeline */}
                <section>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Timeline</h3>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {detailJob.created_at && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        Posted {format(new Date(detailJob.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    )}
                    {detailJob.approved_at && (
                      <div className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        Approved {format(new Date(detailJob.approved_at), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    )}
                    {detailJob.rejected_at && (
                      <div className="flex items-center gap-2 text-rose-700">
                        <XCircle className="h-3.5 w-3.5 shrink-0" />
                        Rejected {format(new Date(detailJob.rejected_at), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    )}
                    {detailJob.updated_at && (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                        Updated {format(new Date(detailJob.updated_at), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    )}
                  </div>
                </section>

                {/* Rejection reason */}
                {detailJob.rejection_reason && (
                  <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-rose-700">
                      <AlertTriangle className="h-3.5 w-3.5" /> Rejection Reason
                    </p>
                    <p className="text-sm text-rose-800">{detailJob.rejection_reason}</p>
                  </section>
                )}
              </div>
            </div>

            {/* Panel action footer */}
            <div className="border-t border-border bg-card p-4">
              {detailJob.status_label === "Pending" ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => { approveMutation.mutate(detailJob.id); setDetailJob(null); }}
                    disabled={approveMutation.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve & Publish
                  </button>
                  <button
                    onClick={() => { setRejectTarget(detailJob); setRejectReason(""); }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100 transition"
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <a
                    href={`/jobs/${detailJob.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition"
                  >
                    <ExternalLink className="h-4 w-4" /> View Live
                  </a>
                  <button
                    onClick={() => { if (confirm(`Delete "${detailJob.title}"?`)) deleteMutation.mutate(detailJob.id); }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRejectTarget(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-primary">Reject Job Posting</h2>
                <p className="text-sm text-muted-foreground">
                  Rejecting: <strong className="text-foreground">{rejectTarget.title}</strong>
                </p>
              </div>
              <button onClick={() => setRejectTarget(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <Field label="Rejection reason" required>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this posting is being rejected so the employer can correct it…"
                rows={4}
              />
            </Field>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setRejectTarget(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-secondary transition"
              >
                Cancel
              </button>
              <button
                onClick={() => rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason })}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition"
              >
                {rejectMutation.isPending
                  ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Rejecting…</>
                  : <><XCircle className="h-4 w-4" /> Confirm Rejection</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
