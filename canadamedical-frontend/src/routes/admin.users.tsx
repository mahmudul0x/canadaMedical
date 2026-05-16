import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  Search, Filter, X, RefreshCw, Users, UserX,
  Building2, Stethoscope, ChevronLeft, ChevronRight,
  Trash2, Eye, Mail, Phone, Calendar,
  ShieldCheck, ShieldOff, Download, FileText,
  FileSpreadsheet, ChevronDown, Loader2, CheckSquare, Square,
  TrendingUp, Briefcase, Globe,
} from "lucide-react";
import { api, apiError } from "@/lib/api";
import { SPECIALTIES } from "@/data/jobs";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

// ── Types ──────────────────────────────────────────────────────────────────────

interface UserProfile {
  specialty?: string;
  sub_specialty?: string;
  cpso_number?: string;
  country?: string;
  work_eligibility?: string;
  profile_complete?: boolean;
  company_name?: string;
  company_type?: string;
  company_phone?: string;
  website?: string;
}

interface User {
  id: number;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  user_type: "physician" | "employer";
  is_active: boolean;
  is_staff: boolean;
  phone?: string;
  date_joined: string;
  specialty?: string;
  company_name?: string;
  // detail only
  profile?: UserProfile;
  total_applications?: number | null;
  total_saved_jobs?: number | null;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  data: User[];
}

const PAGE_SIZE = 15;

// ── UI helpers ─────────────────────────────────────────────────────────────────

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Inactive
    </span>
  );
}

function UserTypeBadge({ type }: { type: string }) {
  const isPhysician = type === "physician";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      isPhysician ? "bg-indigo-100 text-indigo-800" : "bg-amber-100 text-amber-800"
    }`}>
      {isPhysician ? <Stethoscope className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
      {isPhysician ? "Physician" : "Employer"}
    </span>
  );
}

function Avatar({ name, type }: { name: string; type: string }) {
  const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
      type === "physician" ? "bg-indigo-500" : "bg-amber-500"
    }`}>
      {initials}
    </span>
  );
}

// ── Export helpers ─────────────────────────────────────────────────────────────

const USER_EXPORT_HEADERS = [
  { key: "id",        label: "ID" },
  { key: "full_name", label: "Full Name" },
  { key: "email",     label: "Email" },
  { key: "phone",     label: "Phone" },
  { key: "type",      label: "Type" },
  { key: "specialty", label: "Specialty" },
  { key: "company",   label: "Company" },
  { key: "status",    label: "Status" },
  { key: "joined",    label: "Joined Date" },
] as const;

type ExportKey = typeof USER_EXPORT_HEADERS[number]["key"];
type ExportRow = Record<ExportKey, string | number>;

function buildExportRows(rows: User[]): ExportRow[] {
  return rows.map((u) => ({
    id:        u.id,
    full_name: u.full_name,
    email:     u.email,
    phone:     u.phone ?? "",
    type:      u.user_type,
    specialty: u.specialty ?? u.profile?.specialty ?? "",
    company:   u.company_name ?? u.profile?.company_name ?? "",
    status:    u.is_active ? "Active" : "Inactive",
    joined:    u.date_joined ? format(new Date(u.date_joined), "yyyy-MM-dd") : "",
  }));
}

function doExportCsv(rows: ExportRow[]) {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    USER_EXPORT_HEADERS.map((h) => esc(h.label)).join(","),
    ...rows.map((r) => USER_EXPORT_HEADERS.map((h) => esc(r[h.key])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `users-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function doExportXlsx(rows: ExportRow[]) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([
    USER_EXPORT_HEADERS.map((h) => h.label),
    ...rows.map((r) => USER_EXPORT_HEADERS.map((h) => r[h.key] ?? "")),
  ]);
  ws["!cols"] = USER_EXPORT_HEADERS.map((h) =>
    ["full_name", "email"].includes(h.key) ? { wch: 32 } : { wch: 16 }
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Users");
  XLSX.writeFile(wb, `users-export-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}

async function doExportPdf(rows: ExportRow[], meta: { total: number; filters: string }) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const now = format(new Date(), "MMMM d, yyyy 'at' h:mm a");

  // Header strip
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text("Canadian Medical Staffing", 12, 10);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text("User Management Export Report", 12, 16);
  doc.setFontSize(8);
  doc.text(`Generated: ${now}`, pageW - 12, 10, { align: "right" });
  doc.text(`Total records: ${meta.total}`, pageW - 12, 16, { align: "right" });

  // Sub-header
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 22, pageW, 10, "F");
  doc.setTextColor(71, 85, 105); doc.setFontSize(8); doc.setFont("helvetica", "italic");
  doc.text(meta.filters || "No filters applied", 12, 28);

  const pdfCols = [
    { key: "id",        label: "ID",       width: 10 },
    { key: "full_name", label: "Full Name", width: 42 },
    { key: "email",     label: "Email",    width: 52 },
    { key: "phone",     label: "Phone",    width: 26 },
    { key: "type",      label: "Type",     width: 20 },
    { key: "specialty", label: "Specialty", width: 32 },
    { key: "company",   label: "Company",  width: 32 },
    { key: "status",    label: "Status",   width: 18 },
    { key: "joined",    label: "Joined",   width: 22 },
  ] as const;

  autoTable(doc, {
    startY: 34,
    head: [pdfCols.map((c) => c.label)],
    body: rows.map((r) => pdfCols.map((c) => String(r[c.key as ExportKey] ?? ""))),
    columnStyles: Object.fromEntries(pdfCols.map((c, i) => [i, { cellWidth: c.width }])),
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    bodyStyles: { fontSize: 7.5, cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 7) {
        const s = String(data.cell.text[0] || "");
        data.cell.styles.fillColor = s === "Active" ? [209, 250, 229] : [254, 226, 226];
      }
    },
    margin: { left: 10, right: 10 },
    styles: { overflow: "ellipsize" },
    didDrawPage(pageData) {
      const count = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(7); doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${pageData.pageNumber} of ${count} · canadamedicalstaffing.com`,
        pageW / 2, h - 5, { align: "center" }
      );
    },
  });

  doc.save(`users-export-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

// ── Main component ─────────────────────────────────────────────────────────────

function AdminUsersPage() {
  const qc = useQueryClient();

  const [search, setSearch]                   = useState("");
  const [filterType, setFilterType]           = useState("");
  const [filterStatus, setFilterStatus]       = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [dateFrom, setDateFrom]               = useState("");
  const [dateTo, setDateTo]                   = useState("");
  const [filtersOpen, setFiltersOpen]         = useState(false);
  const [page, setPage]                       = useState(1);

  const [selected, setSelected]               = useState<Set<number>>(new Set());
  const [detailUser, setDetailUser]           = useState<User | null>(null);
  const [detailLoading, setDetailLoading]     = useState(false);

  const [exportOpen, setExportOpen]           = useState(false);
  const [exporting, setExporting]             = useState<"csv" | "xlsx" | "pdf" | null>(null);
  const exportRef                              = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node))
        setExportOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const params = useMemo(() => {
    const p: Record<string, string> = { page: String(page), page_size: String(PAGE_SIZE) };
    if (search)                          p.search    = search;
    if (filterType)                      p.user_type = filterType;
    if (filterStatus === "active")       p.is_active = "true";
    if (filterStatus === "inactive")     p.is_active = "false";
    if (filterSpecialty)                 p.specialty = filterSpecialty;
    if (dateFrom)                        p.date_from = dateFrom;
    if (dateTo)                          p.date_to   = dateTo;
    return p;
  }, [search, filterType, filterStatus, filterSpecialty, dateFrom, dateTo, page]);

  const { data, isLoading, isFetching, refetch } = useQuery<PaginatedResponse>({
    queryKey: ["admin", "users", params],
    queryFn: async () => {
      const r = await api.get("/api/admin/users/", { params });
      const d = r.data;
      if (d?.count !== undefined) return d as PaginatedResponse;
      const rows = d?.data ?? d;
      return {
        count: Array.isArray(rows) ? rows.length : 0,
        next: null, previous: null,
        data: Array.isArray(rows) ? rows : [],
      };
    },
    staleTime: 15_000,
  });

  const rows       = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Summary stats (physicians / employers / inactive counts)
  const summaryQuery = useQuery<{ physicians: number; employers: number; inactive: number }>({
    queryKey: ["admin", "users", "summary"],
    queryFn: async () => {
      const [phys, emp, inact] = await Promise.all([
        api.get("/api/admin/users/physicians/", { params: { page_size: 1 } }),
        api.get("/api/admin/users/employers/",  { params: { page_size: 1 } }),
        api.get("/api/admin/users/",            { params: { page_size: 1, is_active: "false" } }),
      ]);
      return {
        physicians: phys.data?.count ?? 0,
        employers:  emp.data?.count  ?? 0,
        inactive:   inact.data?.count ?? 0,
      };
    },
    staleTime: 60_000,
  });

  const hasFilters = !!(search || filterType || filterStatus || filterSpecialty || dateFrom || dateTo);

  function clearFilters() {
    setSearch(""); setFilterType(""); setFilterStatus("");
    setFilterSpecialty(""); setDateFrom(""); setDateTo(""); setPage(1);
  }

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin", "users"] });
    setSelected(new Set());
  }

  // Mutations
  const activateMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/api/admin/users/${id}/activate/`),
    onSuccess: () => { toast.success("User activated"); invalidate(); },
    onError: (e) => toast.error(apiError(e)),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/api/admin/users/${id}/deactivate/`),
    onSuccess: () => { toast.success("User deactivated"); invalidate(); },
    onError: (e) => toast.error(apiError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/users/${id}/`),
    onSuccess: () => {
      toast.success("User deleted");
      invalidate();
      if (detailUser) setDetailUser(null);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const bulkActivateMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => api.patch(`/api/admin/users/${id}/activate/`)));
    },
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} user${ids.length !== 1 ? "s" : ""} activated`);
      invalidate();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const bulkDeactivateMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => api.patch(`/api/admin/users/${id}/deactivate/`)));
    },
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} user${ids.length !== 1 ? "s" : ""} deactivated`);
      invalidate();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  async function openDetail(user: User) {
    setDetailUser(user);
    setDetailLoading(true);
    try {
      const r = await api.get(`/api/admin/users/${user.id}/`);
      const full = r.data?.data ?? r.data;
      setDetailUser(full as User);
    } catch {
      // keep list version
    } finally {
      setDetailLoading(false);
    }
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
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Export
  async function fetchAllForExport(): Promise<User[]> {
    const p: Record<string, string> = { page_size: "2000" };
    if (search)                      p.search    = search;
    if (filterType)                  p.user_type = filterType;
    if (filterStatus === "active")   p.is_active = "true";
    if (filterStatus === "inactive") p.is_active = "false";
    if (filterSpecialty)             p.specialty = filterSpecialty;
    if (dateFrom)                    p.date_from = dateFrom;
    if (dateTo)                      p.date_to   = dateTo;
    const r = await api.get("/api/admin/users/", { params: p });
    const d = r.data;
    return (d?.data ?? (Array.isArray(d) ? d : [])) as User[];
  }

  function filterDescription() {
    const parts: string[] = [];
    if (search)          parts.push(`Search: "${search}"`);
    if (filterType)      parts.push(`Type: ${filterType}`);
    if (filterStatus)    parts.push(`Status: ${filterStatus}`);
    if (filterSpecialty) parts.push(`Specialty: ${filterSpecialty}`);
    if (dateFrom)        parts.push(`From: ${dateFrom}`);
    if (dateTo)          parts.push(`To: ${dateTo}`);
    return parts.join(" · ");
  }

  async function handleExport(type: "csv" | "xlsx" | "pdf") {
    setExportOpen(false);
    setExporting(type);
    try {
      const allRows    = await fetchAllForExport();
      const exportRows = buildExportRows(allRows);
      if (type === "csv") {
        doExportCsv(exportRows);
        toast.success(`CSV exported — ${exportRows.length} users`);
      } else if (type === "xlsx") {
        await doExportXlsx(exportRows);
        toast.success(`Excel exported — ${exportRows.length} users`);
      } else {
        await doExportPdf(exportRows, { total: exportRows.length, filters: filterDescription() });
        toast.success(`PDF exported — ${exportRows.length} users`);
      }
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setExporting(null);
    }
  }

  const summary = summaryQuery.data;

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Main panel */}
      <div className={`flex flex-1 flex-col overflow-hidden transition-all duration-300 ${detailUser ? "lg:mr-[480px]" : ""}`}>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-5 p-4 lg:p-8">

            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-primary">User Management</h1>
                <p className="text-sm text-muted-foreground">
                  Manage physician and employer accounts across the platform.
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
                          {hasFilters ? "Exports current filter results" : "Exports all users"}
                        </p>
                      </div>
                      <div className="p-1">
                        {[
                          { type: "csv"  as const, Icon: FileText,        label: "CSV",          desc: "Comma-separated values",  iconBg: "bg-emerald-100", iconColor: "text-emerald-700" },
                          { type: "xlsx" as const, Icon: FileSpreadsheet, label: "Excel (XLSX)", desc: "Microsoft Excel workbook", iconBg: "bg-blue-100",    iconColor: "text-blue-700"    },
                          { type: "pdf"  as const, Icon: Download,        label: "PDF Report",   desc: "Printable landscape PDF", iconBg: "bg-rose-100",    iconColor: "text-rose-700"    },
                        ].map(({ type, Icon, label, desc, iconBg, iconColor }) => (
                          <button key={type} onClick={() => handleExport(type)}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-secondary transition">
                            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
                              <Icon className={`h-4 w-4 ${iconColor}`} />
                            </span>
                            <div className="text-left">
                              <p className="font-semibold text-foreground">{label}</p>
                              <p className="text-[10px] text-muted-foreground">{desc}</p>
                            </div>
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
                { label: "Total Users", value: (summary?.physicians ?? 0) + (summary?.employers ?? 0), Icon: Users,       bg: "bg-blue-50",   color: "text-blue-700"   },
                { label: "Physicians",  value: summary?.physicians ?? 0,                                Icon: Stethoscope, bg: "bg-indigo-50", color: "text-indigo-700" },
                { label: "Employers",   value: summary?.employers  ?? 0,                                Icon: Building2,   bg: "bg-amber-50",  color: "text-amber-700"  },
                { label: "Inactive",    value: summary?.inactive   ?? 0,                                Icon: UserX,       bg: "bg-rose-50",   color: "text-rose-700"   },
              ].map(({ label, value, Icon, bg, color }) => (
                <div key={label} className={`flex items-center gap-3 rounded-2xl border border-border p-4 ${bg}`}>
                  <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                  <div>
                    <p className={`text-xl font-bold ${color}`}>
                      {summaryQuery.isLoading ? "…" : value}
                    </p>
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
                  <input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search by name or email…"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {/* Type quick pills */}
                  <div className="hidden items-center gap-1 sm:flex">
                    {[
                      { value: "",           label: "All" },
                      { value: "physician",  label: "Physicians" },
                      { value: "employer",   label: "Employers" },
                    ].map((t) => (
                      <button key={t.value}
                        onClick={() => { setFilterType(t.value); setPage(1); }}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          filterType === t.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setFiltersOpen((o) => !o)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      filtersOpen || hasFilters
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <Filter className="h-4 w-4" /> Filters
                    {hasFilters && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">!</span>
                    )}
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
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Specialty (physicians)</label>
                    <select value={filterSpecialty} onChange={(e) => { setFilterSpecialty(e.target.value); setPage(1); }}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20">
                      <option value="">All specialties</option>
                      {SPECIALTIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Joined from</label>
                    <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Joined to</label>
                    <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" />
                  </div>
                  {hasFilters && (
                    <div className="flex items-end lg:col-span-4">
                      <button onClick={clearFilters}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-rose-600 transition">
                        <X className="h-3.5 w-3.5" /> Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bulk action bar */}
            {someSelected && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <span className="text-sm font-semibold text-amber-800">{selected.size} selected</span>
                <button
                  onClick={() => bulkActivateMutation.mutate([...selected])}
                  disabled={bulkActivateMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Activate all
                </button>
                <button
                  onClick={() => bulkDeactivateMutation.mutate([...selected])}
                  disabled={bulkDeactivateMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-200 disabled:opacity-60 transition"
                >
                  <ShieldOff className="h-3.5 w-3.5" /> Deactivate all
                </button>
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
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-secondary" />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-3 font-semibold text-foreground">
                    {hasFilters ? "No users match your filters" : "No users yet"}
                  </p>
                  {hasFilters && (
                    <button onClick={clearFilters} className="mt-2 text-sm text-accent hover:underline">
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-secondary/30 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground">
                            {allPageSelected
                              ? <CheckSquare className="h-4 w-4 text-primary" />
                              : <Square className="h-4 w-4" />}
                          </button>
                        </th>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Specialty / Company</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Joined</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((user) => (
                        <tr key={user.id}
                          className={`transition hover:bg-secondary/20 ${selected.has(user.id) ? "bg-primary/5" : ""}`}>
                          <td className="px-4 py-3">
                            <button onClick={() => toggleRow(user.id)} className="text-muted-foreground hover:text-foreground">
                              {selected.has(user.id)
                                ? <CheckSquare className="h-4 w-4 text-primary" />
                                : <Square className="h-4 w-4" />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => openDetail(user)}
                              className="flex items-center gap-3 text-left hover:opacity-80 transition"
                            >
                              <Avatar name={user.full_name} type={user.user_type} />
                              <div>
                                <p className="font-semibold text-primary hover:underline leading-tight">{user.full_name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <UserTypeBadge type={user.user_type} />
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px] truncate">
                            {user.user_type === "physician"
                              ? (user.specialty || "—")
                              : (user.company_name || "—")}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {user.phone
                              ? <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" />{user.phone}</span>
                              : <span className="text-border">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <ActiveBadge active={user.is_active} />
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {user.date_joined ? format(new Date(user.date_joined), "MMM d, yyyy") : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              {user.is_active ? (
                                <button
                                  onClick={() => deactivateMutation.mutate(user.id)}
                                  disabled={deactivateMutation.isPending && deactivateMutation.variables === user.id}
                                  title="Deactivate"
                                  className="rounded-lg border border-border p-1.5 text-amber-600 hover:bg-amber-50 disabled:opacity-50 transition"
                                >
                                  <ShieldOff className="h-4 w-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => activateMutation.mutate(user.id)}
                                  disabled={activateMutation.isPending && activateMutation.variables === user.id}
                                  title="Activate"
                                  className="rounded-lg border border-border p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition"
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => openDetail(user)}
                                title="View details"
                                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary transition"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => { if (confirm(`Delete "${user.full_name}"? This is permanent.`)) deleteMutation.mutate(user.id); }}
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
                    Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} users
                  </span>
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
      {detailUser && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] lg:hidden"
            onClick={() => setDetailUser(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[480px] flex-col border-l border-border bg-card shadow-2xl">

            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <Avatar name={detailUser.full_name} type={detailUser.user_type} />
                <div>
                  <p className="font-bold text-primary leading-tight">{detailUser.full_name}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <UserTypeBadge type={detailUser.user_type} />
                    <ActiveBadge active={detailUser.is_active} />
                  </div>
                </div>
                {detailLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
              <button onClick={() => setDetailUser(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Quick metrics — physicians only */}
              {detailUser.user_type === "physician" && (
                <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                  {[
                    { label: "Applications", value: detailUser.total_applications ?? "—", Icon: Briefcase },
                    { label: "Saved Jobs",   value: detailUser.total_saved_jobs   ?? "—", Icon: TrendingUp },
                  ].map(({ label, value, Icon }) => (
                    <div key={label} className="flex flex-col items-center py-4">
                      <Icon className="h-4 w-4 text-accent" />
                      <p className="mt-1 text-xl font-bold text-primary">{value}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-5 p-5">
                {/* Contact info */}
                <section>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact</h3>
                  <div className="space-y-2 rounded-xl border border-border bg-background p-4 text-sm">
                    <div className="flex items-center gap-2.5">
                      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <a href={`mailto:${detailUser.email}`} className="text-accent hover:underline truncate">
                        {detailUser.email}
                      </a>
                    </div>
                    {detailUser.phone && (
                      <div className="flex items-center gap-2.5">
                        <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span>{detailUser.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2.5">
                      <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Joined {detailUser.date_joined
                          ? format(new Date(detailUser.date_joined), "MMMM d, yyyy")
                          : "—"}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Profile section */}
                {detailUser.profile && Object.keys(detailUser.profile).length > 0 && (
                  <section>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {detailUser.user_type === "physician" ? "Physician Profile" : "Employer Profile"}
                    </h3>
                    <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-background p-4">
                      {detailUser.user_type === "physician" ? (
                        <>
                          {[
                            { label: "Specialty",        value: detailUser.profile.specialty },
                            { label: "Sub-specialty",    value: detailUser.profile.sub_specialty },
                            { label: "CPSO Number",      value: detailUser.profile.cpso_number },
                            { label: "Country",          value: detailUser.profile.country },
                            { label: "Work Eligibility", value: detailUser.profile.work_eligibility },
                          ].filter((f) => f.value).map((f) => (
                            <div key={f.label}>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</p>
                              <p className="mt-0.5 text-sm font-medium text-foreground">{f.value}</p>
                            </div>
                          ))}
                          <div className="col-span-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Profile Complete</p>
                            <p className={`mt-0.5 text-sm font-semibold ${detailUser.profile.profile_complete ? "text-emerald-700" : "text-amber-700"}`}>
                              {detailUser.profile.profile_complete ? "Yes" : "Incomplete"}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          {[
                            { label: "Company",  value: detailUser.profile.company_name },
                            { label: "Type",     value: detailUser.profile.company_type },
                            { label: "Phone",    value: detailUser.profile.company_phone },
                            { label: "Country",  value: detailUser.profile.country },
                          ].filter((f) => f.value).map((f) => (
                            <div key={f.label}>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</p>
                              <p className="mt-0.5 text-sm font-medium text-foreground">{f.value}</p>
                            </div>
                          ))}
                          {detailUser.profile.website && (
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Website</p>
                              <a href={detailUser.profile.website} target="_blank" rel="noreferrer"
                                className="mt-0.5 flex items-center gap-1.5 text-sm text-accent hover:underline">
                                <Globe className="h-3.5 w-3.5" />{detailUser.profile.website}
                              </a>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </section>
                )}

                {/* Account meta */}
                <section>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Account</h3>
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-background p-4 text-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">User ID</p>
                      <p className="mt-0.5 font-mono text-xs text-foreground">#{detailUser.id}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Role</p>
                      <p className="mt-0.5 text-sm font-medium capitalize text-foreground">{detailUser.user_type}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                      <ActiveBadge active={detailUser.is_active} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Staff Access</p>
                      <p className={`mt-0.5 text-sm font-semibold ${detailUser.is_staff ? "text-indigo-700" : "text-muted-foreground"}`}>
                        {detailUser.is_staff ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* Footer actions */}
            <div className="border-t border-border bg-card p-4">
              <div className="flex gap-3">
                {detailUser.is_active ? (
                  <button
                    onClick={() => {
                      deactivateMutation.mutate(detailUser.id);
                      setDetailUser((u) => u ? { ...u, is_active: false } : null);
                    }}
                    disabled={deactivateMutation.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-60 transition"
                  >
                    <ShieldOff className="h-4 w-4" /> Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      activateMutation.mutate(detailUser.id);
                      setDetailUser((u) => u ? { ...u, is_active: true } : null);
                    }}
                    disabled={activateMutation.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
                  >
                    <ShieldCheck className="h-4 w-4" /> Activate
                  </button>
                )}
                <a
                  href={`mailto:${detailUser.email}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition"
                  title="Send email"
                >
                  <Mail className="h-4 w-4" />
                </a>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${detailUser.full_name}"? This is permanent.`))
                      deleteMutation.mutate(detailUser.id);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
                  title="Delete user"
                >
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
