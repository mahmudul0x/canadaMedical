import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, MapPin, Briefcase, Building2, SlidersHorizontal, ArrowRight,
  X, Clock, Stethoscope, BadgeCheck, LayoutGrid, List,
  ChevronDown, Check, DollarSign,
} from "lucide-react";
import { api } from "@/lib/api";
import { useDebounce } from "@/hooks/useDebounce";
import { SPECIALTIES as FALLBACK_SPECIALTIES, PROVINCES as FALLBACK_PROVINCES, JOB_TYPES } from "@/data/jobs";

export const Route = createFileRoute("/jobs/")({
  head: () => ({
    meta: [
      { title: "Find a Physician Job in Canada — CandianMdJobs" },
      { name: "description", content: "Search 1,200+ physician jobs across Canada by specialty, province, and employer type." },
    ],
  }),
  component: JobsPage,
});

interface Job {
  id: number; title: string; specialty: string; specialty_display: string;
  job_type: string; job_type_display: string; employer_name: string;
  city: string; province: string; province_display: string; location_display: string;
  created_at: string; is_featured?: boolean; summary?: string;
  salary_display?: string; salary_min?: number; salary_max?: number; practice_setting?: string;
}

interface PracticeSetting { value: string; label: string; }

function formatSalary(amount: number): string {
  if (amount >= 1000) return `${Math.round(amount / 1000)}K`;
  return amount.toLocaleString();
}

function getSalaryLine(job: Job): string | null {
  if (job.salary_display) return job.salary_display;
  if (job.salary_min != null && job.salary_max != null)
    return `$${formatSalary(job.salary_min)} – $${formatSalary(job.salary_max)}/yr`;
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
    <div className="animate-pulse rounded-2xl border border-slate-100 bg-white p-5">
      <div className="flex gap-4">
        <div className="h-12 w-12 rounded-xl bg-slate-100 shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-32 rounded-full bg-slate-100" />
          <div className="h-5 w-56 rounded bg-slate-100" />
          <div className="flex gap-3">
            <div className="h-3 w-28 rounded bg-slate-100" />
            <div className="h-3 w-20 rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-8 w-24 rounded-lg bg-slate-100 shrink-0" />
      </div>
    </div>
  );
}

function JobCard({ job, view }: { job: Job; view: "list" | "grid" }) {
  const salaryLine = getSalaryLine(job);
  const initials = job.employer_name.split(" ").map((w) => w[0]).slice(0, 2).join("");

  if (view === "grid") {
    return (
      <article className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1a6fd4]/20 hover:shadow-lg">
        {job.is_featured && (
          <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-amber-50 border border-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
            <BadgeCheck className="h-3 w-3" /> Featured
          </span>
        )}
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f1f3d] text-xs font-extrabold text-white shadow-sm">
            {initials || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 rounded-md bg-[#1a6fd4]/8 px-2 py-0.5 text-[11px] font-semibold text-[#1a6fd4]">
              <Stethoscope className="h-3 w-3" /> {job.specialty_display || job.specialty}
            </span>
            <h3 className="mt-1.5 text-sm font-bold text-[#0f1f3d] group-hover:text-[#1a6fd4] transition-colors line-clamp-2">{job.title}</h3>
          </div>
        </div>
        <div className="mt-3 space-y-1.5 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-slate-300" /> {job.employer_name}</span>
          <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-300" /> {job.location_display}</span>
          <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-slate-300" /> {job.job_type_display || job.job_type}</span>
          {salaryLine && (
            <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
              <DollarSign className="h-3.5 w-3.5" /> {salaryLine}
            </span>
          )}
        </div>
        {job.summary && <p className="mt-2 text-xs text-slate-400 line-clamp-2">{job.summary}</p>}
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="flex items-center gap-1 text-[11px] text-slate-300">
            <Clock className="h-3 w-3" /> {timeAgo(job.created_at)}
          </span>
          <Link to="/jobs/$jobId" params={{ jobId: String(job.id) }}
            className="inline-flex items-center gap-1 rounded-lg bg-[#1a6fd4] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1560be]">
            View <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className="group rounded-2xl border border-slate-100 bg-white px-5 py-4 transition-all duration-200 hover:border-[#1a6fd4]/20 hover:shadow-md">
      <div className="flex items-center gap-4">
        {/* Employer initials */}
        <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0f1f3d] text-sm font-extrabold text-white shadow-sm">
          {initials || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-[#1a6fd4]/8 px-2 py-0.5 text-[11px] font-semibold text-[#1a6fd4]">
              <Stethoscope className="h-3 w-3" /> {job.specialty_display || job.specialty}
            </span>
            {job.is_featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                <BadgeCheck className="h-3 w-3" /> Featured
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              {job.job_type_display || job.job_type}
            </span>
            <span className="ml-auto text-[11px] text-slate-300 sm:hidden">
              {timeAgo(job.created_at)}
            </span>
          </div>
          <h3 className="mt-1.5 text-sm font-bold text-[#0f1f3d] group-hover:text-[#1a6fd4] transition-colors">{job.title}</h3>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-slate-300" /> {job.employer_name}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-300" /> {job.location_display}</span>
            {salaryLine && (
              <span className="flex items-center gap-1 font-semibold text-emerald-600">
                <DollarSign className="h-3.5 w-3.5" /> {salaryLine}
              </span>
            )}
          </div>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
          <span className="flex items-center gap-1 text-[11px] text-slate-300">
            <Clock className="h-3 w-3" /> {timeAgo(job.created_at)}
          </span>
          <Link to="/jobs/$jobId" params={{ jobId: String(job.id) }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a6fd4] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1560be]">
            View position <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <Link to="/jobs/$jobId" params={{ jobId: String(job.id) }}
          className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-[#1a6fd4] px-3 py-2 text-xs font-semibold text-white sm:hidden">
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const debouncedQ = useDebounce(q, 400);
  const debouncedSalaryMin = useDebounce(salaryMin, 600);
  const debouncedSalaryMax = useDebounce(salaryMax, 600);

  const { data: practiceSettings } = useQuery<PracticeSetting[]>({
    queryKey: ["practice-settings"],
    queryFn: async () => { const r = await api.get("/api/jobs/practice-settings/"); const d = r.data?.data ?? r.data; return Array.isArray(d) ? d : []; },
    staleTime: 60 * 60 * 1000,
  });

  const { data: apiSpecialties } = useQuery<{ value: string; label: string }[]>({
    queryKey: ["job-specialties"],
    queryFn: async () => { const r = await api.get("/api/jobs/specialties/"); const d = r.data?.data ?? r.data; return Array.isArray(d) ? d : []; },
    staleTime: 5 * 60 * 1000,
  });

  const { data: apiProvinces } = useQuery<{ value: string; label: string }[]>({
    queryKey: ["job-provinces"],
    queryFn: async () => { const r = await api.get("/api/jobs/provinces/"); const d = r.data?.data ?? r.data; return Array.isArray(d) ? d : []; },
    staleTime: 5 * 60 * 1000,
  });

  const SPECIALTY_OPTIONS = (apiSpecialties && apiSpecialties.length > 0) ? apiSpecialties : FALLBACK_SPECIALTIES;
  const PROVINCES = (apiProvinces && apiProvinces.length > 0) ? apiProvinces : FALLBACK_PROVINCES;

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
    jobType: false, specialty: false, province: false, practiceSetting: false, salary: false,
  });

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function FilterDropdown({ id, label, value, placeholder, options, onChange }: {
    id: string; label: string; value: string; placeholder: string;
    options: { value: string; label: string }[]; onChange: (v: string) => void;
  }) {
    const isOpen = openSections[id];
    const selected = options.find((o) => o.value === value);
    function select(val: string) { onChange(val); setOpenSections((prev) => ({ ...prev, [id]: false })); }
    return (
      <div className="px-4 py-1">
        <button type="button" onClick={() => toggleSection(id)}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:bg-[#f0f4ff] transition">
          <span className="flex items-center gap-2">
            {label}
            {value && (
              <span className="rounded-full bg-[#1a6fd4] px-2 py-0.5 text-[10px] font-bold text-white normal-case tracking-normal">
                {selected?.label}
              </span>
            )}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-slate-300 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && (
          <div className="mt-1 mb-2 rounded-xl border border-slate-100 bg-[#f8faff] overflow-hidden">
            <button onClick={() => select("")}
              className={`flex w-full items-center justify-between px-3 py-2 text-xs transition hover:bg-white ${value === "" ? "text-[#1a6fd4] font-semibold bg-white" : "text-slate-400"}`}>
              {placeholder}
              {value === "" && <Check className="h-3 w-3 text-[#1a6fd4]" />}
            </button>
            {options.map((opt) => (
              <button key={opt.value} onClick={() => select(opt.value)}
                className={`flex w-full items-center justify-between border-t border-slate-100 px-3 py-2 text-xs transition hover:bg-white ${value === opt.value ? "text-[#1a6fd4] font-semibold bg-white" : "text-slate-500"}`}>
                {opt.label}
                {value === opt.value && <Check className="h-3 w-3 text-[#1a6fd4]" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function SalaryRangeFilter() {
    const isOpen = openSections["salary"];
    const hasValue = !!(salaryMin || salaryMax);
    return (
      <div className="px-4 py-1">
        <button type="button" onClick={() => toggleSection("salary")}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:bg-[#f0f4ff] transition">
          <span className="flex items-center gap-2">
            Salary Range
            {hasValue && <span className="rounded-full bg-[#1a6fd4] px-2 py-0.5 text-[10px] font-bold text-white normal-case tracking-normal">Set</span>}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-slate-300 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && (
          <div className="mt-1 mb-2 rounded-xl border border-slate-100 bg-[#f8faff] p-3 space-y-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Min (CAD/yr)</label>
              <input type="number" min={0} step={10000} placeholder="e.g. 200000" value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-[#0f1f3d] placeholder-slate-300 outline-none transition focus:border-[#1a6fd4] focus:ring-2 focus:ring-[#1a6fd4]/10" />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Max (CAD/yr)</label>
              <input type="number" min={0} step={10000} placeholder="e.g. 500000" value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-[#0f1f3d] placeholder-slate-300 outline-none transition focus:border-[#1a6fd4] focus:ring-2 focus:ring-[#1a6fd4]/10" />
            </div>
            {hasValue && (
              <button onClick={() => { setSalaryMin(""); setSalaryMax(""); }}
                className="text-[10px] text-slate-400 hover:text-red-500 transition">
                ✕ Clear salary filter
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const FilterPanel = () => (
    <div className="py-2">
      <FilterDropdown id="jobType" label="Employment Type" value={jobType} placeholder="Any type" options={JOB_TYPES} onChange={setJobType} />
      <FilterDropdown id="specialty" label="Specialty" value={specialty} placeholder="All specialties" options={SPECIALTY_OPTIONS} onChange={setSpecialty} />
      <FilterDropdown id="province" label="Province" value={province} placeholder="All provinces" options={PROVINCES} onChange={setProvince} />
      <FilterDropdown id="practiceSetting" label="Practice Setting" value={practiceSetting} placeholder="Any setting" options={practiceSettings ?? []} onChange={setPracticeSetting} />
      <SalaryRangeFilter />
      {activeFilterCount > 0 && (
        <div className="px-4 pt-2 pb-3">
          <button onClick={clearAll}
            className="w-full rounded-xl border border-red-100 bg-red-50 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-100 hover:text-red-600">
            ✕ Clear all filters
          </button>
        </div>
      )}
    </div>
  );

  /* Navbar height is 72px, so sticky top = 72px */
  const HEADER_H = 72;

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── PAGE HERO (full, non-sticky) ── */}
      <div className="bg-[#0f1f3d] px-4 py-10 sm:px-6 lg:px-14">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1a6fd4]">CandianMdJobs</p>
          <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">Physician Job Board</h1>
          <p className="mt-2 text-sm text-white/50">Browse verified opportunities across every province and specialty.</p>
        </div>
      </div>

      {/* ── STICKY SEARCH BAR ── */}
      <div
        className={`sticky z-30 bg-[#0f1f3d] px-4 py-3 sm:px-6 lg:px-14 transition-shadow duration-300 ${
          scrolled ? "shadow-[0_4px_24px_rgba(0,0,0,0.3)]" : ""
        }`}
        style={{ top: HEADER_H }}
      >
        <div className="mx-auto max-w-7xl flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, specialty, or employer…"
              className="w-full rounded-xl border border-white/10 bg-white/8 py-2.5 pl-10 pr-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#1a6fd4]/60 focus:bg-white/12" />
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl bg-[#1a6fd4] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1560be]">
            <Search className="h-4 w-4" /> Search
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex flex-1 bg-[#f8faff] gap-4 px-3 py-4 sm:px-6 lg:gap-5 lg:px-14 lg:py-6 items-start">

        {/* ── LEFT SIDEBAR ── sticky */}
        <aside
          className="hidden w-72 flex-none rounded-2xl border border-slate-100 bg-white shadow-sm lg:block sticky overflow-y-auto"
          style={{ top: HEADER_H + 56, maxHeight: `calc(100vh - ${HEADER_H + 72}px)` }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#0f1f3d]">
              <SlidersHorizontal className="h-4 w-4 text-[#1a6fd4]" /> Filters
            </h2>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1a6fd4] text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </div>
          <FilterPanel />
        </aside>

        {/* ── RIGHT: toolbar + job cards ── */}
        <div className="flex flex-1 flex-col rounded-2xl border border-slate-100 bg-white shadow-sm">

          {/* Toolbar */}
          <div className="flex-none border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setMobileFilterOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#1a6fd4]/40 lg:hidden">
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                  {activeFilterCount > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1a6fd4] text-[9px] font-bold text-white">{activeFilterCount}</span>
                  )}
                </button>

                <p className="text-sm text-slate-400">
                  {isLoading
                    ? <span className="inline-block h-4 w-24 animate-pulse rounded bg-slate-100" />
                    : <><span className="font-bold text-[#0f1f3d]">{jobs.length}</span> opportunities found</>}
                </p>

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
                      className="inline-flex items-center gap-1 rounded-full border border-[#1a6fd4]/20 bg-[#1a6fd4]/8 px-2.5 py-0.5 text-xs font-medium text-[#1a6fd4] hover:bg-[#1a6fd4]/15 transition">
                      {t.label} <X className="h-3 w-3" />
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                <button onClick={() => setView("list")}
                  className={`rounded-lg border p-2 transition ${view === "list" ? "border-[#1a6fd4] bg-[#1a6fd4]/10 text-[#1a6fd4]" : "border-slate-200 text-slate-400 hover:text-slate-600"}`}>
                  <List className="h-4 w-4" />
                </button>
                <button onClick={() => setView("grid")}
                  className={`rounded-lg border p-2 transition ${view === "grid" ? "border-[#1a6fd4] bg-[#1a6fd4]/10 text-[#1a6fd4]" : "border-slate-200 text-slate-400 hover:text-slate-600"}`}>
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Job cards */}
          <div className="px-3 py-3 sm:px-4 sm:py-4">
            <div className={view === "grid" ? "grid gap-3 sm:grid-cols-2" : "space-y-2.5"}>
              {isLoading && Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}
              {!isLoading && jobs.map((j) => <JobCard key={j.id} job={j} view={view} />)}
              {!isLoading && jobs.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-14 text-center">
                  <Search className="mx-auto h-10 w-10 text-slate-200" />
                  <p className="mt-4 font-semibold text-[#0f1f3d]">No jobs match your filters</p>
                  <p className="mt-1 text-sm text-slate-400">Try broadening your search or clearing some filters.</p>
                  <button onClick={clearAll}
                    className="mt-4 rounded-lg bg-[#1a6fd4] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1560be]">
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
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileFilterOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white shadow-2xl lg:hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-[#0f1f3d]">Filters</h2>
              <button onClick={() => setMobileFilterOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#1a6fd4] focus:ring-2 focus:ring-[#1a6fd4]/10" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto"><FilterPanel /></div>
            <div className="border-t border-slate-100 p-4">
              <button onClick={() => setMobileFilterOpen(false)}
                className="w-full rounded-xl bg-[#1a6fd4] py-3 text-sm font-bold text-white transition hover:bg-[#1560be]">
                Show {jobs.length} results
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
