import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  Search, Filter, X, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle2, Trash2, Eye, Mail, Phone, Calendar, MapPin,
  Stethoscope, FileText, FileSpreadsheet, Download, ChevronDown,
  Loader2, CheckSquare, Square, Clock, Star, Users, AlertCircle,
  Globe, Briefcase, DollarSign, StickyNote, ExternalLink,
} from "lucide-react";
import { api, apiError } from "@/lib/api";
import { SPECIALTIES } from "@/data/jobs";

export const Route = createFileRoute("/admin/assessments")({
  component: AdminAssessmentsPage,
});

// ── Types ──────────────────────────────────────────────────────────────────────

type AssessmentStatus = "new" | "under_review" | "contacted" | "in_progress" | "placed" | "closed";

interface Assessment {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  specialty?: string;
  sub_specialty?: string;
  current_location?: string;
  desired_province_in_canada?: string;
  years_of_experience?: number;
  licensure_status?: string;
  licensure_display?: string;
  work_eligibility?: string;
  eligibility_display?: string;
  preferred_job_type?: string;
  preferred_practice_setting?: string;
  salary_expectation?: string;
  availability_date?: string;
  relocation_support_needed?: boolean;
  career_goals?: string;
  additional_notes?: string;
  resume?: string;
  status: AssessmentStatus;
  status_display?: string;
  is_reviewed: boolean;
  admin_notes?: string;
  submitted_at: string;
  updated_at?: string;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  data: Assessment[];
}

const PAGE_SIZE = 15;

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_META: Record<AssessmentStatus, { label: string; bg: string; color: string; dot: string }> = {
  new:          { label: "New",         bg: "bg-blue-100",    color: "text-blue-800",    dot: "bg-blue-500"    },
  under_review: { label: "Under Review",bg: "bg-amber-100",   color: "text-amber-800",   dot: "bg-amber-500"   },
  contacted:    { label: "Contacted",   bg: "bg-indigo-100",  color: "text-indigo-800",  dot: "bg-indigo-500"  },
  in_progress:  { label: "In Progress", bg: "bg-violet-100",  color: "text-violet-800",  dot: "bg-violet-500"  },
  placed:       { label: "Placed",      bg: "bg-emerald-100", color: "text-emerald-800", dot: "bg-emerald-500" },
  closed:       { label: "Closed",      bg: "bg-slate-100",   color: "text-slate-700",   dot: "bg-slate-400"   },
};

function StatusPill({ status }: { status: AssessmentStatus }) {
  const m = STATUS_META[status] ?? { label: status, bg: "bg-secondary", color: "text-muted-foreground", dot: "bg-border" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.bg} ${m.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white">
      {initials}
    </span>
  );
}

// ── Export helpers ─────────────────────────────────────────────────────────────

const EXPORT_HEADERS = [
  { key: "id",           label: "ID" },
  { key: "full_name",    label: "Full Name" },
  { key: "email",        label: "Email" },
  { key: "phone",        label: "Phone" },
  { key: "specialty",    label: "Specialty" },
  { key: "location",     label: "Current Location" },
  { key: "province",     label: "Desired Province" },
  { key: "experience",   label: "Years Experience" },
  { key: "licensure",    label: "Licensure" },
  { key: "eligibility",  label: "Work Eligibility" },
  { key: "job_type",     label: "Job Type" },
  { key: "status",       label: "Status" },
  { key: "reviewed",     label: "Reviewed" },
  { key: "submitted",    label: "Submitted Date" },
] as const;

type ExportKey = typeof EXPORT_HEADERS[number]["key"];
type ExportRow = Record<ExportKey, string | number>;

function buildExportRows(rows: Assessment[]): ExportRow[] {
  return rows.map((a) => ({
    id:          a.id,
    full_name:   a.full_name,
    email:       a.email,
    phone:       a.phone ?? "",
    specialty:   a.specialty ?? "",
    location:    a.current_location ?? "",
    province:    a.desired_province_in_canada ?? "",
    experience:  a.years_of_experience ?? "",
    licensure:   a.licensure_display ?? a.licensure_status ?? "",
    eligibility: a.eligibility_display ?? a.work_eligibility ?? "",
    job_type:    a.preferred_job_type ?? "",
    status:      a.status_display ?? a.status,
    reviewed:    a.is_reviewed ? "Yes" : "No",
    submitted:   a.submitted_at ? format(new Date(a.submitted_at), "yyyy-MM-dd") : "",
  }));
}

function doExportCsv(rows: ExportRow[]) {
  const esc = (v: unknown) => { const s = v == null ? "" : String(v); return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = [EXPORT_HEADERS.map((h) => esc(h.label)).join(","), ...rows.map((r) => EXPORT_HEADERS.map((h) => esc(r[h.key])).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `assessments-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
  URL.revokeObjectURL(url);
}

async function doExportXlsx(rows: ExportRow[]) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS.map((h) => h.label), ...rows.map((r) => EXPORT_HEADERS.map((h) => r[h.key] ?? ""))]);
  ws["!cols"] = EXPORT_HEADERS.map((h) => (["full_name", "email"].includes(h.key) ? { wch: 30 } : { wch: 16 }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Assessments");
  XLSX.writeFile(wb, `assessments-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}

async function doExportPdf(rows: ExportRow[], meta: { total: number; filters: string }) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const now = format(new Date(), "MMMM d, yyyy 'at' h:mm a");
  doc.setFillColor(79, 70, 229); doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text("Canadian Medical Staffing", 12, 10);
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.text("Career Assessments Export Report", 12, 16);
  doc.setFontSize(8); doc.text(`Generated: ${now}`, pageW - 12, 10, { align: "right" }); doc.text(`Total records: ${meta.total}`, pageW - 12, 16, { align: "right" });
  doc.setFillColor(241, 245, 249); doc.rect(0, 22, pageW, 10, "F");
  doc.setTextColor(71, 85, 105); doc.setFontSize(8); doc.setFont("helvetica", "italic");
  doc.text(meta.filters || "No filters applied", 12, 28);
  const pdfCols = [
    { key: "id",        label: "ID",       width: 10 },
    { key: "full_name", label: "Name",     width: 38 },
    { key: "email",     label: "Email",    width: 48 },
    { key: "specialty", label: "Specialty",width: 30 },
    { key: "province",  label: "Province", width: 22 },
    { key: "experience",label: "Exp (yrs)",width: 18 },
    { key: "licensure", label: "Licensure",width: 30 },
    { key: "status",    label: "Status",   width: 22 },
    { key: "reviewed",  label: "Reviewed", width: 16 },
    { key: "submitted", label: "Submitted",width: 22 },
  ] as const;
  const statusColors: Record<string, [number, number, number]> = {
    New: [219, 234, 254], "Under Review": [254, 243, 199], Contacted: [224, 231, 255],
    "In Progress": [237, 233, 254], Placed: [209, 250, 229], Closed: [241, 245, 249],
  };
  autoTable(doc, {
    startY: 34,
    head: [pdfCols.map((c) => c.label)],
    body: rows.map((r) => pdfCols.map((c) => String(r[c.key as ExportKey] ?? ""))),
    columnStyles: Object.fromEntries(pdfCols.map((c, i) => [i, { cellWidth: c.width }])),
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8, halign: "left" },
    bodyStyles: { fontSize: 7.5, cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 7) {
        const color = statusColors[String(data.cell.text[0] || "")];
        if (color) data.cell.styles.fillColor = color;
      }
    },
    margin: { left: 10, right: 10 },
    styles: { overflow: "ellipsize" },
    didDrawPage(pageData) {
      const count = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(7); doc.setTextColor(148, 163, 184);
      doc.text(`Page ${pageData.pageNumber} of ${count} · canadamedicalstaffing.com`, pageW / 2, h - 5, { align: "center" });
    },
  });
  doc.save(`assessments-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

// ── Main component ─────────────────────────────────────────────────────────────

function AdminAssessmentsPage() {
  const qc = useQueryClient();

  const [search, setSearch]               = useState("");
  const [filterStatus, setFilterStatus]   = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [filterReviewed, setFilterReviewed]   = useState("");
  const [dateFrom, setDateFrom]           = useState("");
  const [filtersOpen, setFiltersOpen]     = useState(false);
  const [page, setPage]                   = useState(1);

  const [selected, setSelected]           = useState<Set<number>>(new Set());
  const [detailItem, setDetailItem]       = useState<Assessment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Admin notes editing state
  const [editingNotes, setEditingNotes]   = useState(false);
  const [notesValue, setNotesValue]       = useState("");

  const [exportOpen, setExportOpen]       = useState(false);
  const [exporting, setExporting]         = useState<"csv" | "xlsx" | "pdf" | null>(null);
  const exportRef                          = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const params = useMemo(() => {
    const p: Record<string, string> = { page: String(page), page_size: String(PAGE_SIZE) };
    if (search)          p.search      = search;
    if (filterStatus)    p.status      = filterStatus;
    if (filterSpecialty) p.specialty   = filterSpecialty;
    if (filterReviewed === "yes") p.is_reviewed = "true";
    if (filterReviewed === "no")  p.is_reviewed = "false";
    if (dateFrom)        p.date_from   = dateFrom;
    return p;
  }, [search, filterStatus, filterSpecialty, filterReviewed, dateFrom, page]);

  const { data, isLoading, isFetching, refetch } = useQuery<PaginatedResponse>({
    queryKey: ["admin", "assessments", params],
    queryFn: async () => {
      const r = await api.get("/api/admin/assessments/", { params });
      const d = r.data;
      if (d?.count !== undefined) return d as PaginatedResponse;
      const rows = d?.data ?? d;
      return { count: Array.isArray(rows) ? rows.length : 0, next: null, previous: null, data: Array.isArray(rows) ? rows : [] };
    },
    staleTime: 15_000,
  });

  const rows       = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Status summary counts
  const summaryQuery = useQuery<Record<AssessmentStatus | "total" | "unreviewed", number>>({
    queryKey: ["admin", "assessments", "summary"],
    queryFn: async () => {
      const [total, unreviewed, ...statusCounts] = await Promise.all([
        api.get("/api/admin/assessments/", { params: { page_size: 1 } }),
        api.get("/api/admin/assessments/", { params: { page_size: 1, is_reviewed: "false" } }),
        ...Object.keys(STATUS_META).map((s) =>
          api.get("/api/admin/assessments/", { params: { page_size: 1, status: s } })
        ),
      ]);
      const result: Record<string, number> = {
        total: total.data?.count ?? 0,
        unreviewed: unreviewed.data?.count ?? 0,
      };
      Object.keys(STATUS_META).forEach((s, i) => {
        result[s] = statusCounts[i].data?.count ?? 0;
      });
      return result as Record<AssessmentStatus | "total" | "unreviewed", number>;
    },
    staleTime: 60_000,
  });

  const summary = summaryQuery.data;
  const hasFilters = !!(search || filterStatus || filterSpecialty || filterReviewed || dateFrom);

  function clearFilters() {
    setSearch(""); setFilterStatus(""); setFilterSpecialty(""); setFilterReviewed(""); setDateFrom(""); setPage(1);
  }

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin", "assessments"] });
    setSelected(new Set());
  }

  // Mutations
  const reviewMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/api/admin/assessments/${id}/review/`, { is_reviewed: true }),
    onSuccess: () => { toast.success("Marked as reviewed"); invalidate(); },
    onError: (e) => toast.error(apiError(e)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, admin_notes }: { id: number; status?: string; admin_notes?: string }) =>
      api.patch(`/api/assessments/${id}/status/`, { status, admin_notes }),
    onSuccess: (res) => {
      toast.success("Status updated");
      const updated = res.data?.data ?? res.data;
      if (detailItem) setDetailItem(updated as Assessment);
      invalidate();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/assessments/${id}/`),
    onSuccess: () => { toast.success("Assessment deleted"); invalidate(); if (detailItem) setDetailItem(null); },
    onError: (e) => toast.error(apiError(e)),
  });

  async function openDetail(item: Assessment) {
    setDetailItem(item);
    setNotesValue(item.admin_notes ?? "");
    setEditingNotes(false);
    setDetailLoading(true);
    try {
      const r = await api.get(`/api/admin/assessments/${item.id}/`);
      const full = r.data?.data ?? r.data;
      setDetailItem(full as Assessment);
      setNotesValue((full as Assessment).admin_notes ?? "");
    } catch { /* keep list version */ }
    finally { setDetailLoading(false); }
  }

  // Selection
  const allPageIds      = rows.map((r) => r.id);
  const allPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selected.has(id));
  const someSelected    = selected.size > 0;

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) allPageIds.forEach((id) => next.delete(id));
      else allPageIds.forEach((id) => next.add(id));
      return next;
    });
  }
  function toggleRow(id: number) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  const bulkReviewMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => api.patch(`/api/admin/assessments/${id}/review/`, { is_reviewed: true })));
    },
    onSuccess: (_, ids) => { toast.success(`${ids.length} marked as reviewed`); invalidate(); },
    onError: (e) => toast.error(apiError(e)),
  });

  // Export
  async function fetchAllForExport(): Promise<Assessment[]> {
    const p: Record<string, string> = { page_size: "2000" };
    if (search)          p.search      = search;
    if (filterStatus)    p.status      = filterStatus;
    if (filterSpecialty) p.specialty   = filterSpecialty;
    if (filterReviewed === "yes") p.is_reviewed = "true";
    if (filterReviewed === "no")  p.is_reviewed = "false";
    if (dateFrom)        p.date_from   = dateFrom;
    const r = await api.get("/api/admin/assessments/", { params: p });
    const d = r.data; return (d?.data ?? (Array.isArray(d) ? d : [])) as Assessment[];
  }

  function filterDescription() {
    const parts: string[] = [];
    if (search)          parts.push(`Search: "${search}"`);
    if (filterStatus)    parts.push(`Status: ${STATUS_META[filterStatus as AssessmentStatus]?.label ?? filterStatus}`);
    if (filterSpecialty) parts.push(`Specialty: ${filterSpecialty}`);
    if (filterReviewed)  parts.push(`Reviewed: ${filterReviewed}`);
    if (dateFrom)        parts.push(`From: ${dateFrom}`);
    return parts.join(" · ");
  }

  async function handleExport(type: "csv" | "xlsx" | "pdf") {
    setExportOpen(false); setExporting(type);
    try {
      const allRows    = await fetchAllForExport();
      const exportRows = buildExportRows(allRows);
      if (type === "csv") { doExportCsv(exportRows); toast.success(`CSV exported — ${exportRows.length} assessments`); }
      else if (type === "xlsx") { await doExportXlsx(exportRows); toast.success(`Excel exported — ${exportRows.length} assessments`); }
      else { await doExportPdf(exportRows, { total: exportRows.length, filters: filterDescription() }); toast.success(`PDF exported — ${exportRows.length} assessments`); }
    } catch (e) { toast.error(apiError(e)); }
    finally { setExporting(null); }
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className={`flex flex-1 flex-col overflow-hidden transition-all duration-300 ${detailItem ? "lg:mr-[520px]" : ""}`}>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-5 p-4 lg:p-8">

            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-primary">Career Assessments</h1>
                <p className="text-sm text-muted-foreground">Review and manage physician career assessment submissions.</p>
              </div>
              <div className="flex items-center gap-2">
                {isFetching && !isLoading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
                <button onClick={() => refetch()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary transition">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
                <div className="relative" ref={exportRef}>
                  <button onClick={() => setExportOpen((o) => !o)} disabled={!!exporting}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary disabled:opacity-60 transition">
                    {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    {exporting ? "Exporting…" : "Export"}
                    {!exporting && <ChevronDown className="h-3 w-3 opacity-60" />}
                  </button>
                  {exportOpen && (
                    <div className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                      <div className="border-b border-border px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Export format</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{hasFilters ? "Exports filter results" : "Exports all assessments"}</p>
                      </div>
                      <div className="p-1">
                        {[
                          { type: "csv"  as const, Icon: FileText,        label: "CSV",          desc: "Comma-separated values",  iconBg: "bg-emerald-100", iconColor: "text-emerald-700" },
                          { type: "xlsx" as const, Icon: FileSpreadsheet, label: "Excel (XLSX)", desc: "Microsoft Excel workbook", iconBg: "bg-blue-100",    iconColor: "text-blue-700"    },
                          { type: "pdf"  as const, Icon: Download,        label: "PDF Report",   desc: "Printable landscape PDF", iconBg: "bg-rose-100",    iconColor: "text-rose-700"    },
                        ].map(({ type, Icon, label, desc, iconBg, iconColor }) => (
                          <button key={type} onClick={() => handleExport(type)}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-secondary transition">
                            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}><Icon className={`h-4 w-4 ${iconColor}`} /></span>
                            <div className="text-left"><p className="font-semibold text-foreground">{label}</p><p className="text-[10px] text-muted-foreground">{desc}</p></div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total",      value: summary?.total ?? 0,      Icon: Users,        bg: "bg-blue-50",    color: "text-blue-700"    },
                { label: "Unreviewed", value: summary?.unreviewed ?? 0,  Icon: AlertCircle,  bg: "bg-amber-50",   color: "text-amber-700"   },
                { label: "In Progress",value: summary?.in_progress ?? 0, Icon: Clock,        bg: "bg-violet-50",  color: "text-violet-700"  },
                { label: "Placed",     value: summary?.placed ?? 0,      Icon: Star,         bg: "bg-emerald-50", color: "text-emerald-700" },
              ].map(({ label, value, Icon, bg, color }) => (
                <div key={label} className={`flex items-center gap-3 rounded-2xl border border-border p-4 ${bg}`}>
                  <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                  <div>
                    <p className={`text-xl font-bold ${color}`}>{summaryQuery.isLoading ? "…" : value}</p>
                    <p className={`text-xs font-medium ${color} opacity-75`}>{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Search + filters */}
            <div className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search by name or email…"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" />
                </div>
                <div className="flex items-center gap-2">
                  {/* Status quick pills */}
                  <div className="hidden items-center gap-1 sm:flex">
                    {[
                      { value: "",       label: "All" },
                      { value: "new",    label: "New" },
                      { value: "contacted", label: "Contacted" },
                      { value: "placed", label: "Placed" },
                    ].map((t) => (
                      <button key={t.value} onClick={() => { setFilterStatus(t.value); setPage(1); }}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          filterStatus === t.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}>{t.label}</button>
                    ))}
                  </div>
                  <button onClick={() => setFiltersOpen((o) => !o)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      filtersOpen || hasFilters ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:bg-secondary"
                    }`}>
                    <Filter className="h-4 w-4" /> Filters
                    {hasFilters && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">!</span>}
                  </button>
                </div>
              </div>

              {filtersOpen && (
                <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Status</label>
                    <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20">
                      <option value="">All statuses</option>
                      {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Specialty</label>
                    <select value={filterSpecialty} onChange={(e) => { setFilterSpecialty(e.target.value); setPage(1); }}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20">
                      <option value="">All specialties</option>
                      {SPECIALTIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Reviewed</label>
                    <select value={filterReviewed} onChange={(e) => { setFilterReviewed(e.target.value); setPage(1); }}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20">
                      <option value="">Any</option>
                      <option value="no">Unreviewed</option>
                      <option value="yes">Reviewed</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Submitted from</label>
                    <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" />
                  </div>
                  {hasFilters && (
                    <div className="flex items-end lg:col-span-4">
                      <button onClick={clearFilters} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-rose-600 transition">
                        <X className="h-3.5 w-3.5" /> Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bulk bar */}
            {someSelected && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <span className="text-sm font-semibold text-amber-800">{selected.size} selected</span>
                <button onClick={() => bulkReviewMutation.mutate([...selected])} disabled={bulkReviewMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark all reviewed
                </button>
                <button onClick={() => setSelected(new Set())} className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-900">Clear</button>
              </div>
            )}

            {/* Table */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="p-6 space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-secondary" />)}</div>
              ) : rows.length === 0 ? (
                <div className="py-16 text-center">
                  <Stethoscope className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-3 font-semibold text-foreground">{hasFilters ? "No assessments match your filters" : "No assessments yet"}</p>
                  {hasFilters && <button onClick={clearFilters} className="mt-2 text-sm text-accent hover:underline">Clear filters</button>}
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
                        <th className="px-4 py-3">Candidate</th>
                        <th className="px-4 py-3">Specialty</th>
                        <th className="px-4 py-3">Location → Province</th>
                        <th className="px-4 py-3">Experience</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Reviewed</th>
                        <th className="px-4 py-3">Submitted</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((item) => (
                        <tr key={item.id} className={`transition hover:bg-secondary/20 ${selected.has(item.id) ? "bg-primary/5" : ""}`}>
                          <td className="px-4 py-3">
                            <button onClick={() => toggleRow(item.id)} className="text-muted-foreground hover:text-foreground">
                              {selected.has(item.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => openDetail(item)} className="flex items-center gap-3 text-left hover:opacity-80 transition">
                              <Avatar name={item.full_name} />
                              <div>
                                <p className="font-semibold text-primary hover:underline leading-tight">{item.full_name}</p>
                                <p className="text-xs text-muted-foreground">{item.email}</p>
                              </div>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground max-w-[130px] truncate">
                            {item.specialty || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {item.current_location || "—"}
                            </span>
                            {item.desired_province_in_canada && (
                              <span className="mt-0.5 flex items-center gap-1 text-accent">
                                → {item.desired_province_in_canada}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {item.years_of_experience != null ? `${item.years_of_experience} yrs` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill status={item.status} />
                          </td>
                          <td className="px-4 py-3">
                            {item.is_reviewed ? (
                              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                                <Clock className="h-3.5 w-3.5" /> Pending
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {item.submitted_at ? format(new Date(item.submitted_at), "MMM d, yyyy") : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              {!item.is_reviewed && (
                                <button onClick={() => reviewMutation.mutate(item.id)}
                                  disabled={reviewMutation.isPending && reviewMutation.variables === item.id}
                                  title="Mark reviewed"
                                  className="rounded-lg border border-border p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition">
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                              )}
                              <button onClick={() => openDetail(item)} title="View details"
                                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary transition">
                                <Eye className="h-4 w-4" />
                              </button>
                              <button onClick={() => { if (confirm(`Delete assessment for "${item.full_name}"?`)) deleteMutation.mutate(item.id); }}
                                title="Delete"
                                className="rounded-lg border border-border p-1.5 text-rose-500 hover:bg-rose-50 transition">
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
                  <span>Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} assessments</span>
                  <div className="flex items-center gap-1">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                      className="inline-flex items-center rounded-lg border border-border px-2.5 py-1.5 disabled:opacity-40 hover:bg-secondary transition">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-3 font-semibold text-foreground">{page} / {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                      className="inline-flex items-center rounded-lg border border-border px-2.5 py-1.5 disabled:opacity-40 hover:bg-secondary transition">
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
      {detailItem && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] lg:hidden" onClick={() => setDetailItem(null)} />
          <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[520px] flex-col border-l border-border bg-card shadow-2xl">

            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <Avatar name={detailItem.full_name} />
                <div>
                  <p className="font-bold text-primary leading-tight">{detailItem.full_name}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <StatusPill status={detailItem.status} />
                    {detailItem.is_reviewed
                      ? <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Reviewed</span>
                      : <span className="text-xs font-semibold text-amber-600 flex items-center gap-1"><Clock className="h-3 w-3" /> Unreviewed</span>}
                  </div>
                </div>
                {detailLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
              <button onClick={() => setDetailItem(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="space-y-5 p-5">

                {/* Status changer */}
                <section className="rounded-xl border border-border bg-background p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Update Pipeline Status</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(STATUS_META) as [AssessmentStatus, typeof STATUS_META[AssessmentStatus]][]).map(([val, m]) => (
                      <button key={val}
                        onClick={() => statusMutation.mutate({ id: detailItem.id, status: val })}
                        disabled={statusMutation.isPending || detailItem.status === val}
                        className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                          detailItem.status === val
                            ? `${m.bg} ${m.color} border-transparent`
                            : "border-border text-muted-foreground hover:border-accent/40 hover:bg-secondary"
                        } disabled:cursor-not-allowed`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Contact */}
                <section>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact</h3>
                  <div className="space-y-2 rounded-xl border border-border bg-background p-4 text-sm">
                    <div className="flex items-center gap-2.5">
                      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <a href={`mailto:${detailItem.email}`} className="text-accent hover:underline truncate">{detailItem.email}</a>
                    </div>
                    {detailItem.phone && (
                      <div className="flex items-center gap-2.5">
                        <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <a href={`tel:${detailItem.phone}`} className="text-foreground hover:underline">{detailItem.phone}</a>
                      </div>
                    )}
                    {detailItem.current_location && (
                      <div className="flex items-center gap-2.5">
                        <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-muted-foreground">{detailItem.current_location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2.5">
                      <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">Submitted {detailItem.submitted_at ? format(new Date(detailItem.submitted_at), "MMMM d, yyyy") : "—"}</span>
                    </div>
                  </div>
                </section>

                {/* Professional */}
                <section>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Professional Background</h3>
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-background p-4">
                    {[
                      { label: "Specialty",    value: detailItem.specialty },
                      { label: "Sub-specialty",value: detailItem.sub_specialty },
                      { label: "Experience",   value: detailItem.years_of_experience != null ? `${detailItem.years_of_experience} years` : undefined },
                      { label: "Licensure",    value: detailItem.licensure_display },
                      { label: "Work Eligibility", value: detailItem.eligibility_display },
                    ].filter((f) => f.value).map((f) => (
                      <div key={f.label}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</p>
                        <p className="mt-0.5 text-sm font-medium text-foreground">{f.value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Preferences */}
                <section>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Preferences</h3>
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-background p-4">
                    {[
                      { label: "Target Province",       value: detailItem.desired_province_in_canada },
                      { label: "Job Type",              value: detailItem.preferred_job_type },
                      { label: "Practice Setting",      value: detailItem.preferred_practice_setting },
                      { label: "Salary Expectation",    value: detailItem.salary_expectation },
                      { label: "Available From",        value: detailItem.availability_date ? format(new Date(detailItem.availability_date), "MMM d, yyyy") : undefined },
                      { label: "Relocation Support",    value: detailItem.relocation_support_needed ? "Needed" : "Not needed" },
                    ].filter((f) => f.value).map((f) => (
                      <div key={f.label}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</p>
                        <p className="mt-0.5 text-sm font-medium text-foreground">{f.value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Career goals */}
                {detailItem.career_goals && (
                  <section>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Career Goals</h3>
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">
                      {detailItem.career_goals}
                    </div>
                  </section>
                )}

                {/* Additional notes */}
                {detailItem.additional_notes && (
                  <section>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Candidate Notes</h3>
                    <div className="max-h-32 overflow-y-auto rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">
                      {detailItem.additional_notes}
                    </div>
                  </section>
                )}

                {/* Resume */}
                {detailItem.resume && (
                  <section>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Resume / CV</h3>
                    <a href={detailItem.resume} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 text-sm hover:bg-secondary transition">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100">
                        <FileText className="h-4 w-4 text-indigo-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">View Resume</p>
                        <p className="text-xs text-muted-foreground">Click to open in new tab</p>
                      </div>
                      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </a>
                  </section>
                )}

                {/* Admin notes */}
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Admin Notes</h3>
                    {!editingNotes && (
                      <button onClick={() => { setEditingNotes(true); setNotesValue(detailItem.admin_notes ?? ""); }}
                        className="text-xs font-semibold text-accent hover:underline">Edit</button>
                    )}
                  </div>
                  {editingNotes ? (
                    <div className="space-y-2">
                      <textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)} rows={4}
                        placeholder="Internal notes about this candidate…"
                        className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15" />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            statusMutation.mutate({ id: detailItem.id, admin_notes: notesValue });
                            setEditingNotes(false);
                          }}
                          disabled={statusMutation.isPending}
                          className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition">
                          Save Notes
                        </button>
                        <button onClick={() => setEditingNotes(false)}
                          className="rounded-lg border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary transition">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`min-h-[60px] rounded-xl border border-border bg-background px-4 py-3 text-sm ${detailItem.admin_notes ? "text-foreground/85 whitespace-pre-wrap" : "text-muted-foreground/50 italic"}`}>
                      {detailItem.admin_notes || "No admin notes yet. Click Edit to add."}
                    </div>
                  )}
                </section>

              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border bg-card p-4">
              <div className="flex gap-3">
                {!detailItem.is_reviewed && (
                  <button
                    onClick={() => { reviewMutation.mutate(detailItem.id); setDetailItem((d) => d ? { ...d, is_reviewed: true } : null); }}
                    disabled={reviewMutation.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition">
                    <CheckCircle2 className="h-4 w-4" /> Mark Reviewed
                  </button>
                )}
                <a href={`mailto:${detailItem.email}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition">
                  <Mail className="h-4 w-4" /> Email Candidate
                </a>
                <button
                  onClick={() => { if (confirm(`Delete assessment for "${detailItem.full_name}"?`)) deleteMutation.mutate(detailItem.id); }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
