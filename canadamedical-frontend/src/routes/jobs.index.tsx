import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  Search,
  MapPin,
  Briefcase,
  Building2,
  SlidersHorizontal,
  ArrowRight,
  X,
  Clock,
  Stethoscope,
  BadgeCheck,
  LayoutGrid,
  List,
  ChevronDown,
  Check,
  DollarSign,
} from "lucide-react";
import { api } from "@/lib/api";
import { useDebounce } from "@/hooks/useDebounce";
import { SPECIALTIES as SPECIALTY_OPTIONS, PROVINCES, JOB_TYPES } from "@/data/jobs";

export const Route = createFileRoute("/jobs/")({
  head: () => ({
    meta: [
      { title: "Find a Physician Job in Canada — MedConnect Canada" },
      {
        name: "description",
        content: "Search 1,200+ physician jobs across Canada by specialty, province, and employer type.",
      },
    ],
  }),
  component: JobsPage,
});

interface Job {
  id: number;
  title: string;
  specialty: string;
  specialty_display: string;
  job_type: string;
  job_type_display: string;
  employer_name: string;
  city: string;
  province: string;
  province_display: string;
  location_display: string;
  created_at: string;
  is_featured?: boolean;
  summary?: string;
  salary_display?: string;
  salary_min?: number;
  salary_max?: number;
  practice_setting?: string;
}

interface PracticeSetting {
  value: string;
  label: string;
}

const JOB_TYPE_BADGE: Record<string, string> = {
  fellowship: "bg-[#EDE9FE] text-[#7C3AED]",
};

function formatSalary(amount: number): string {
  if (amount >= 1000) return `${Math.round(amount / 1000)}K`;
  return amount.toLocaleString();
}

function getSalaryLine(job: Job): string | null {
  if (job.salary_display) return job.salary_display;
  if (job.salary_min != null && job.salary_max != null) {
    return `$${formatSalary(job.salary_min)} – $${formatSalary(job.salary_max)}/yr`;
  }
  if (job.salary_min != null) return `From $${formatSalary(job.salary_min)}/yr`;
  if (job.salary_max != null) return `Up to $${formatSalary(job.salary_max)}/yr`;
  return null;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function JobCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-5 w-24 rounded-full bg-secondary" />
          <div className="h-6 w-64 rounded bg-secondary" />
          <div className="flex gap-4">
            <div className="h-4 w-36 rounded bg-secondary" />
            <div className="h-4 w-28 rounded bg-secondary" />
            <div className="h-4 w-20 rounded bg-secondary" />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="h-10 w-32 rounded-lg bg-secondary" />
        </div>
      </div>
    </div>
  );
}

function JobCard({ job, view }: { job: Job; view: "list" | "grid" }) {
  const salaryLine = getSalaryLine(job);
  const jobTypeLower = (job.job_type ?? "").toLowerCase();
  const fellowshipBadge = JOB_TYPE_BADGE[jobTypeLower] ?? "";

  if (view === "grid") {
    return (
      <article className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-accent/50 hover:shadow-md">
        {job.is_featured && (
          <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
            <BadgeCheck className="h-3 w-3" /> Featured
          </span>
        )}
        <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary">
          <Stethoscope className="h-3 w-3" /> {job.specialty_display || job.specialty}
        </span>
        <h3 className="mt-3 text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">{job.title}</h3>
        <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 flex-none" /> {job.employer_name}</span>
          <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 flex-none" /> {job.location_display}</span>
          <span className={`flex items-center gap-1.5 ${fellowshipBadge ? "w-fit rounded px-1.5 py-0.5 text-[10px] font-bold " + fellowshipBadge : ""}`}>
            {!fellowshipBadge && <Briefcase className="h-3.5 w-3.5 flex-none" />}
            {job.job_type_display || job.job_type}
          </span>
          {salaryLine && (
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <DollarSign className="h-3.5 w-3.5 flex-none text-accent" /> {salaryLine}
            </span>
          )}
        </div>
        {job.summary && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{job.summary}</p>}
        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" /> {timeAgo(job.created_at)}
          </span>
          <Link to="/jobs/$jobId" params={{ jobId: String(job.id) }}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-glow transition">
            View <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className="group rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm transition hover:border-accent/40 hover:shadow-md">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/8 px-2 py-0.5 text-[11px] font-semibold text-primary">
              <Stethoscope className="h-3 w-3" /> {job.specialty_display || job.specialty}
            </span>
            {job.is_featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                <BadgeCheck className="h-3 w-3" /> Featured
              </span>
            )}
            {fellowshipBadge ? (
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${fellowshipBadge}`}>
                {job.job_type_display || job.job_type}
              </span>
            ) : null}
            <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground sm:hidden">
              <Clock className="h-3 w-3" /> {timeAgo(job.created_at)}
            </span>
          </div>
          <h3 className="mt-1.5 text-sm font-bold text-foreground group-hover:text-primary transition-colors">{job.title}</h3>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5 flex-none" /> {job.employer_name}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 flex-none" /> {job.location_display}</span>
            {!fellowshipBadge && (
              <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5 flex-none" /> {job.job_type_display || job.job_type}</span>
            )}
            {salaryLine && (
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <DollarSign className="h-3.5 w-3.5 flex-none text-accent" /> {salaryLine}
              </span>
            )}
          </div>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" /> {timeAgo(job.created_at)}
          </span>
          <Link to="/jobs/$jobId" params={{ jobId: String(job.id) }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-glow transition">
            View <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {/* Mobile CTA */}
        <Link to="/jobs/$jobId" params={{ jobId: String(job.id) }}
          className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-glow transition sm:hidden">
          View <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

function JobsPage() {
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [province, setProvince] = useState("");
  const [jobType, setJobType] = useState("");
  const [practiceSetting, setPracticeSetting] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const debouncedQ = useDebounce(q, 400);
  const debouncedSalaryMin = useDebounce(salaryMin, 600);
  const debouncedSalaryMax = useDebounce(salaryMax, 600);

  const { data: practiceSettings } = useQuery<PracticeSetting[]>({
    queryKey: ["practice-settings"],
    queryFn: async () => {
      const r = await api.get("/api/jobs/practice-settings/");
      const d = r.data?.data ?? r.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 60 * 60 * 1000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["jobs", debouncedQ, specialty, province, jobType, practiceSetting, debouncedSalaryMin, debouncedSalaryMax],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page_size", "50");
      if (debouncedQ) params.set("search", debouncedQ);
      if (specialty) params.set("specialty", specialty);
      if (province) params.set("province", province);
      if (jobType) params.set("job_type", jobType);
      if (practiceSetting) params.set("practice_setting", practiceSetting);
      if (debouncedSalaryMin) params.set("salary_min", debouncedSalaryMin);
      if (debouncedSalaryMax) params.set("salary_max", debouncedSalaryMax);
      const r = await api.get(`/api/jobs/?${params}`);
      const d = r.data?.data ?? r.data;
      return (Array.isArray(d) ? d : (d?.results ?? [])) as Job[];
    },
    staleTime: 60_000,
  });

  const jobs: Job[] = data ?? [];
  const activeFilterCount = [specialty, province, jobType, practiceSetting, salaryMin || salaryMax].filter(Boolean).length;

  function clearAll() {
    setQ(""); setSpecialty(""); setProvince(""); setJobType("");
    setPracticeSetting(""); setSalaryMin(""); setSalaryMax("");
  }

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    jobType: false,
    specialty: false,
    province: false,
    practiceSetting: false,
    salary: false,
  });

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function FilterDropdown({
    id, label, value, placeholder, options, onChange,
  }: {
    id: string;
    label: string;
    value: string;
    placeholder: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
  }) {
    const isOpen = openSections[id];
    const selected = options.find((o) => o.value === value);

    function select(val: string) {
      onChange(val);
      setOpenSections((prev) => ({ ...prev, [id]: false }));
    }

    return (
      <div className="border-b border-border last:border-0">
        <button
          type="button"
          onClick={() => toggleSection(id)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-secondary/40 transition"
        >
          <span className="flex items-center gap-2">
            {label}
            {value && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                {selected?.label}
              </span>
            )}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="px-3 pb-3">
            <div className="rounded-xl border border-border bg-background overflow-hidden">
              <button
                onClick={() => select("")}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-sm transition hover:bg-secondary/40 ${value === "" ? "text-primary font-semibold" : "text-muted-foreground"}`}
              >
                {placeholder}
                {value === "" && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => select(opt.value)}
                  className={`flex w-full items-center justify-between border-t border-border px-3 py-2.5 text-sm transition hover:bg-secondary/40 ${value === opt.value ? "text-primary font-semibold bg-primary/5" : "text-muted-foreground"}`}
                >
                  {opt.label}
                  {value === opt.value && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function SalaryRangeFilter() {
    const isOpen = openSections["salary"];
    const hasValue = !!(salaryMin || salaryMax);

    return (
      <div className="border-b border-border last:border-0">
        <button
          type="button"
          onClick={() => toggleSection("salary")}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-secondary/40 transition"
        >
          <span className="flex items-center gap-2">
            Salary Range
            {hasValue && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                Set
              </span>
            )}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Min (CAD/yr)</label>
              <input
                type="number"
                min={0}
                step={10000}
                placeholder="e.g. 200000"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Max (CAD/yr)</label>
              <input
                type="number"
                min={0}
                step={10000}
                placeholder="e.g. 500000"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
            </div>
            {hasValue && (
              <button
                onClick={() => { setSalaryMin(""); setSalaryMax(""); }}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-destructive transition"
              >
                Clear salary filter
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const FilterPanel = () => (
    <div>
      <FilterDropdown
        id="jobType"
        label="Employment Type"
        value={jobType}
        placeholder="Any type"
        options={JOB_TYPES}
        onChange={setJobType}
      />
      <FilterDropdown
        id="specialty"
        label="Specialty"
        value={specialty}
        placeholder="All specialties"
        options={SPECIALTY_OPTIONS}
        onChange={setSpecialty}
      />
      <FilterDropdown
        id="province"
        label="Province"
        value={province}
        placeholder="All provinces"
        options={PROVINCES}
        onChange={setProvince}
      />
      <FilterDropdown
        id="practiceSetting"
        label="Practice Setting"
        value={practiceSetting}
        placeholder="Any setting"
        options={practiceSettings ?? []}
        onChange={setPracticeSetting}
      />
      <SalaryRangeFilter />
      {activeFilterCount > 0 && (
        <div className="px-4 py-3">
          <button onClick={clearAll}
            className="w-full rounded-xl border border-border py-2 text-xs font-semibold text-muted-foreground transition hover:border-destructive/40 hover:text-destructive">
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* ── PAGE HEADER ── */}
      <div className="flex-none border-b border-border bg-linear-to-r from-primary to-primary-glow px-6 py-5 lg:px-14">
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">MedConnect Canada</p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-white">Physician Job Board</h1>
          <p className="mt-1 text-sm text-white/60">Browse verified opportunities across every province and specialty.</p>
        </div>
      </div>

      {/* ── BODY: sidebar + job list ── flex-1, both columns independent */}
      <div className="flex flex-1 overflow-hidden bg-secondary/40 px-6 py-5 lg:px-14 lg:py-6 gap-5">

        {/* ── LEFT SIDEBAR — always visible, scrolls independently ── */}
        <aside className="hidden w-72 flex-none overflow-y-auto rounded-xl border border-border bg-card scrollbar-none shadow-sm lg:block">

          {/* Search inside sidebar */}
          <div className="border-b border-border px-4 py-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search jobs…"
                className="w-full rounded-xl border border-border bg-secondary/50 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
            </div>
          </div>

          {/* Filters header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <SlidersHorizontal className="h-4 w-4 text-accent" /> Filters
            </h2>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-primary">
                {activeFilterCount}
              </span>
            )}
          </div>
          <FilterPanel />
        </aside>

        {/* ── RIGHT: toolbar + job cards, scrolls independently ── */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">

          {/* Toolbar — fixed inside right column */}
          <div className="flex-none border-b border-border bg-card px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Mobile filter button */}
                <button onClick={() => setMobileFilterOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:border-accent/50 lg:hidden">
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                  {activeFilterCount > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-primary">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <p className="text-sm text-muted-foreground">
                  {isLoading
                    ? <span className="inline-block h-4 w-24 animate-pulse rounded bg-secondary" />
                    : <><span className="font-bold text-foreground">{jobs.length}</span> opportunities</>}
                </p>

                {/* Active filter chips */}
                {[
                  specialty && { label: specialty, clear: () => setSpecialty("") },
                  province && { label: PROVINCES.find((p) => p.value === province)?.label ?? province, clear: () => setProvince("") },
                  jobType && { label: JOB_TYPES.find((t) => t.value === jobType)?.label ?? jobType, clear: () => setJobType("") },
                  practiceSetting && { label: (practiceSettings ?? []).find((s) => s.value === practiceSetting)?.label ?? practiceSetting, clear: () => setPracticeSetting("") },
                  (salaryMin || salaryMax) && { label: `$${salaryMin || "0"} – $${salaryMax || "∞"}`, clear: () => { setSalaryMin(""); setSalaryMax(""); } },
                ].filter(Boolean).map((tag) => {
                  const t = tag as { label: string; clear: () => void };
                  return (
                    <button key={t.label} onClick={t.clear}
                      className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/8 px-2.5 py-0.5 text-xs font-medium text-accent hover:bg-accent/15 transition">
                      {t.label} <X className="h-3 w-3" />
                    </button>
                  );
                })}
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-1.5">
                <button onClick={() => setView("list")}
                  className={`rounded-lg border p-2 transition ${view === "list" ? "border-accent bg-accent/10 text-accent" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
                  <List className="h-4 w-4" />
                </button>
                <button onClick={() => setView("grid")}
                  className={`rounded-lg border p-2 transition ${view === "grid" ? "border-accent bg-accent/10 text-accent" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Job cards — only this div scrolls */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className={view === "grid" ? "grid gap-3 sm:grid-cols-2" : "space-y-2.5"}>
              {isLoading && Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}
              {!isLoading && jobs.map((j) => <JobCard key={j.id} job={j} view={view} />)}
              {!isLoading && jobs.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center">
                  <Search className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-4 font-semibold text-foreground">No jobs match your filters</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try broadening your search or clearing some filters.</p>
                  <button onClick={clearAll}
                    className="mt-4 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition">
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE FILTER DRAWER ── */}
      {mobileFilterOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileFilterOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-card shadow-2xl lg:hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-bold text-foreground">Filters</h2>
              <button onClick={() => setMobileFilterOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="border-b border-border px-4 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search jobs…"
                  className="w-full rounded-xl border border-border bg-secondary/50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <FilterPanel />
            </div>
            <div className="border-t border-border p-4">
              <button onClick={() => setMobileFilterOpen(false)}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary-glow transition">
                Show {jobs.length} results
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
