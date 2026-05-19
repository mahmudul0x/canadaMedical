import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Heart, Brain, Baby, Smile, Scissors, Activity, Syringe, Sun, ScanLine, Stethoscope,
  HeartPulse, Bone,
  MapPin, ArrowRight, ArrowUpRight, CheckCircle2, Star, ShieldCheck, Award, Users,
  Search, Briefcase, Building2, Sparkles, Quote, UserPlus, FileSearch, Handshake,
  ClipboardList, Send, BadgeCheck, DollarSign,
} from "lucide-react";
import { FeaturedRecruiters } from "@/components/site/FeaturedRecruiters";
import { api } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CandianMdJobs — Premier Physician Recruitment Platform" },
      {
        name: "description",
        content:
          "Find your next physician role across Canada. 1,200+ vetted opportunities at hospitals, clinics, and academic centres in every province.",
      },
    ],
  }),
  component: Index,
});

const SPECIALTY_TILES = [
  { name: "Cardiology", icon: Heart, count: 42, color: "from-rose-100 to-rose-50 text-rose-600" },
  { name: "Neurology", icon: Brain, count: 28, color: "from-violet-100 to-violet-50 text-violet-600" },
  { name: "Pediatrics", icon: Baby, count: 36, color: "from-emerald-100 to-emerald-50 text-emerald-600" },
  { name: "Psychiatry", icon: Smile, count: 31, color: "from-blue-100 to-blue-50 text-blue-600" },
  { name: "General Surgery", icon: Scissors, count: 24, color: "from-slate-100 to-slate-50 text-slate-700" },
  { name: "Emergency Medicine", icon: Activity, count: 58, color: "from-amber-100 to-amber-50 text-amber-600" },
  { name: "Anesthesiology", icon: Syringe, count: 19, color: "from-pink-100 to-pink-50 text-pink-600" },
  { name: "Dermatology", icon: Sun, count: 14, color: "from-yellow-100 to-yellow-50 text-yellow-700" },
  { name: "Radiology", icon: ScanLine, count: 22, color: "from-sky-100 to-sky-50 text-sky-600" },
  { name: "Obstetrics", icon: Stethoscope, count: 17, color: "from-fuchsia-100 to-fuchsia-50 text-fuchsia-600" },
  { name: "Family Medicine", icon: HeartPulse, count: 84, color: "from-teal-100 to-teal-50 text-teal-600" },
  { name: "Orthopedics", icon: Bone, count: 21, color: "from-indigo-100 to-indigo-50 text-indigo-600" },
];

const PHYS_STEPS = [
  { icon: UserPlus, title: "Create your profile", desc: "Build a verified physician profile in under five minutes." },
  { icon: FileSearch, title: "Get matched", desc: "Our team curates roles that match your specialty and lifestyle goals." },
  { icon: Handshake, title: "Land your role", desc: "Interview, negotiate, and onboard with white-glove support." },
];
const EMP_STEPS = [
  { icon: ClipboardList, title: "Post your opening", desc: "Publish a vetted job listing with help from our recruitment team." },
  { icon: Send, title: "Receive shortlists", desc: "We deliver pre-screened, qualified physician candidates within days." },
  { icon: BadgeCheck, title: "Hire with confidence", desc: "Average time to offer is 28 days — 4× faster than industry norms." },
];

function useCounter(target: number, duration = 1500, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf: number;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return val;
}

function useInView<T extends HTMLElement>(opts: IntersectionObserverInit = { rootMargin: "-80px" }) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setSeen(true);
        io.disconnect();
      }
    }, opts);
    io.observe(ref.current);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, seen] as const;
}

function Index() {
  return (
    <div className="overflow-x-hidden">
      <Hero />
      <Stats />
      <Specialties />
      <ProvinceCoverage />
      <HowItWorks />
      <FeaturedJobsSection />
      <FeaturedRecruiters />
      <AssessmentBanner />
      <Testimonials />
      <FinalCTA />
    </div>
  );
}

/* ---------- HERO ---------- */
const ROTATING_SPECIALTIES = [
  "Cardiologist", "Neurologist", "Family Physician",
  "Anesthesiologist", "Emergency Physician", "Radiologist", "Psychiatrist",
];

const LIVE_ACTIVITY = [
  { name: "Dr. Priya Sharma", action: "matched", detail: "Cardiologist · Calgary, AB", initials: "PS" },
  { name: "Dr. James O'Brien", action: "offer accepted", detail: "Emergency MD · Halifax, NS", initials: "JO" },
  { name: "Dr. Mei-Lin Zhang", action: "just applied", detail: "Neurologist · Vancouver, BC", initials: "MZ" },
  { name: "Sunnybrook Health", action: "posted 8 roles", detail: "Toronto, ON", initials: "SH" },
];

function Hero() {
  const [specIdx, setSpecIdx] = useState(0);
  const [actIdx, setActIdx] = useState(0);
  const [actVisible, setActVisible] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setSpecIdx((i) => (i + 1) % ROTATING_SPECIALTIES.length), 2400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setActVisible(false);
      setTimeout(() => {
        setActIdx((i) => (i + 1) % LIVE_ACTIVITY.length);
        setActVisible(true);
      }, 400);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative isolate flex flex-col overflow-hidden bg-primary text-primary-foreground">
      {/* ── Background layers ── */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-95" />
      <div className="absolute inset-0 bg-grid opacity-[0.04]" />
      {/* Aurora blobs */}
      <div className="pointer-events-none absolute -left-48 -top-24 h-[640px] w-[640px] rounded-full bg-accent/20 blur-[140px]" />
      <div className="pointer-events-none absolute -right-48 bottom-0 h-[560px] w-[560px] rounded-full bg-accent-alt/15 blur-[130px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-accent/10 blur-[80px]" />

      {/* ── Main grid ── */}
      <div className="relative mx-auto w-full max-w-7xl flex-1 px-4 pb-12 pt-16 sm:pb-16 sm:pt-24 lg:px-8 lg:pb-20 lg:pt-32">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-10">

          {/* LEFT COLUMN */}
          <div>
            {/* Live badge */}
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 py-1.5 pl-2 pr-3 text-[10px] font-bold uppercase tracking-[0.15em] text-accent backdrop-blur sm:pr-4 sm:text-[11px]">
              <span className="flex items-center gap-1.5 rounded-full bg-accent/20 px-2 py-0.5 sm:px-2.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                Live
              </span>
              Canada's #1 Physician Platform
            </div>

            {/* Headline */}
            <h1
              className="animate-fade-up mt-5 text-4xl font-extrabold leading-[1.06] tracking-tight sm:mt-6 sm:text-5xl lg:text-[62px]"
              style={{ animationDelay: "60ms" }}
            >
              <span className="block text-primary-foreground/90">The smarter way</span>
              <span className="block text-primary-foreground/90">to hire a</span>
              <span
                key={specIdx}
                className="mt-1 block text-gradient-accent"
                style={{ animation: "fadeUp 0.4s ease both" }}
              >
                {ROTATING_SPECIALTIES[specIdx]}
              </span>
            </h1>

            {/* Sub */}
            <p
              className="animate-fade-up mt-5 max-w-lg text-base leading-relaxed text-primary-foreground/65 sm:mt-6 sm:text-[17px]"
              style={{ animationDelay: "130ms" }}
            >
              Permanent, locum, and academic roles at Canada's top hospitals, health authorities, and clinics — matched to your specialty, province, and lifestyle.
            </p>

            {/* Integrated search bar */}
            <div className="animate-fade-up mt-6 sm:mt-8" style={{ animationDelay: "180ms" }}>
              <form
                onSubmit={(e) => e.preventDefault()}
                className="flex gap-1.5 rounded-2xl border border-white/10 bg-white/[0.07] p-1.5 backdrop-blur-md"
              >
                <div className="relative flex-1 min-w-0">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-foreground/35 sm:left-3.5" />
                  <input
                    type="search"
                    placeholder="Specialty or role…"
                    className="w-full rounded-xl bg-transparent py-3 pl-9 pr-2 text-sm text-primary-foreground placeholder:text-primary-foreground/35 focus:outline-none sm:pl-10 sm:pr-3"
                  />
                </div>
                <select className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-primary-foreground/70 focus:outline-none sm:block">
                  <option value="">All provinces</option>
                  {["ON","BC","AB","QC","MB","NS","SK","NB","NL","PE"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <Link
                  to="/jobs"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-primary shadow-glow transition hover:scale-[1.02] active:scale-[0.98] sm:px-5"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Search</span>
                </Link>
              </form>
              <p className="mt-2 text-[11px] text-primary-foreground/35">
                Popular:&nbsp;
                {["Family Medicine", "Emergency Medicine", "Psychiatry"].map((s, i) => (
                  <span key={s}>
                    <Link to="/jobs" className="text-accent/70 transition hover:text-accent">{s}</Link>
                    {i < 2 && <span className="mx-1 text-primary-foreground/20">·</span>}
                  </span>
                ))}
              </p>
            </div>

            {/* CTAs */}
            <div
              className="animate-fade-up mt-6 flex flex-wrap items-center gap-3 sm:mt-7"
              style={{ animationDelay: "230ms" }}
            >
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-5 py-3 text-sm font-bold text-primary transition hover:scale-[1.02] active:scale-[0.98] sm:px-6 sm:py-3.5 sm:text-[15px]"
              >
                Get started free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/employers"
                className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/20 px-5 py-3 text-sm font-semibold text-primary-foreground/80 backdrop-blur transition hover:border-primary-foreground/35 hover:bg-primary-foreground/6 sm:px-6 sm:py-3.5 sm:text-[15px]"
              >
                I'm hiring →
              </Link>
            </div>

            {/* Trust row */}
            <div
              className="animate-fade-up mt-7 flex flex-wrap items-center gap-x-4 gap-y-2.5 sm:gap-x-5 sm:gap-y-3"
              style={{ animationDelay: "290ms" }}
            >
              <div className="flex items-center gap-2 text-sm">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-accent text-accent" />
                  ))}
                </div>
                <span className="text-primary-foreground/55">
                  <strong className="text-primary-foreground">4.9/5</strong> from 2,400+ reviews
                </span>
              </div>
              <span className="hidden h-4 w-px bg-primary-foreground/15 sm:block" />
              <div className="flex items-center gap-1.5 text-sm text-primary-foreground/55">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <strong className="text-primary-foreground">College-verified</strong> employers
              </div>
              <span className="hidden h-4 w-px bg-primary-foreground/15 sm:block" />
              <div className="flex items-center gap-1.5 text-sm text-primary-foreground/55">
                <Award className="h-4 w-4 text-accent" />
                <strong className="text-primary-foreground">28-day</strong> avg. hire
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — UI cards */}
          <div className="relative hidden lg:block">
            <HeroVisual actIdx={actIdx} actVisible={actVisible} />
          </div>
        </div>
      </div>

      {/* ── Trusted-by strip ── */}
      <div className="relative border-t border-white/5 bg-white/[0.025]">
        <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
          <div className="flex flex-wrap items-center gap-4 lg:gap-10">
            <p className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground/25">
              Trusted by
            </p>
            <div className="flex flex-wrap items-center gap-4 lg:gap-8">
              {["Toronto General","Vancouver Coastal Health","Sunnybrook","CHEO","McGill Health","AHS","PHSA"].map((h) => (
                <span
                  key={h}
                  className="whitespace-nowrap text-xs font-semibold text-primary-foreground/20 transition hover:text-primary-foreground/50"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroVisual({ actIdx, actVisible }: { actIdx: number; actVisible: boolean }) {
  const act = LIVE_ACTIVITY[actIdx];
  return (
    <div className="relative h-[580px] select-none">
      {/* Glow behind cards */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-[70px]" />
      <div className="pointer-events-none absolute bottom-16 right-0 h-40 w-40 rounded-full bg-accent-alt/20 blur-[50px]" />

      {/* ── Card 1: Stats (top-right) ── */}
      <div
        className="animate-float absolute right-0 top-0 w-52 rotate-1 rounded-2xl border border-white/10 bg-white/8 p-4 shadow-2xl backdrop-blur-xl"
        style={{ animationDelay: "0.5s" }}
      >
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent">
          <Sparkles className="h-3 w-3" /> This week
        </p>
        <p className="mt-2 text-3xl font-extrabold text-primary-foreground">87</p>
        <p className="text-xs text-primary-foreground/50">new positions posted</p>
        <div className="mt-3 flex h-8 items-end gap-1">
          {[38,62,44,78,52,88,70].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-accent/35 transition-all"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <p className="mt-1.5 text-[10px] font-bold text-accent">↑ 24% vs last week</p>
      </div>

      {/* ── Card 2: Featured job (center-left, main card) ── */}
      <div className="animate-float absolute left-0 top-16 w-80 rounded-2xl border border-white/10 bg-white p-5 shadow-2xl text-foreground">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="inline-flex w-fit items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-600">
              Cardiology
            </span>
            <span className="inline-flex w-fit items-center rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              Permanent
            </span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary-light text-xs font-extrabold text-primary-foreground shadow-sm">
            TGH
          </div>
        </div>
        <h3 className="mt-3 text-base font-bold text-primary">Interventional Cardiologist</h3>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3" /> Toronto General Hospital
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" /> Toronto, ON
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div>
            <p className="text-[10px] text-muted-foreground">Compensation</p>
            <p className="text-sm font-bold text-primary">$420K – $520K / yr</p>
          </div>
          <span className="rounded-lg bg-accent px-3 py-1.5 text-[11px] font-bold text-primary">
            Apply now
          </span>
        </div>
        {/* Match pill */}
        <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-emerald-50 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <div>
            <p className="text-[11px] font-bold text-emerald-700">94% profile match</p>
            <p className="text-[10px] text-emerald-600/80">Based on specialty &amp; location</p>
          </div>
          <span className="ml-auto text-lg font-extrabold text-emerald-600">94%</span>
        </div>
      </div>

      {/* ── Card 3: Offer timeline (bottom-right) ── */}
      <div
        className="animate-float absolute bottom-24 right-2 w-48 rounded-2xl border border-white/10 bg-white/8 p-4 shadow-2xl backdrop-blur-xl"
        style={{ animationDelay: "0.9s" }}
      >
        <div className="flex items-center gap-2 text-primary-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20">
            <BadgeCheck className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-xs font-bold">Offer accepted</p>
            <p className="text-[10px] text-primary-foreground/45">in just 18 days</p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {[
            { label: "Profile created", done: true },
            { label: "Matched & interviewed", done: true },
            { label: "Offer received", done: true },
            { label: "Onboarding", done: false },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.done ? "bg-accent" : "bg-white/20"}`} />
              <p className={`text-[10px] ${s.done ? "text-primary-foreground/75" : "text-primary-foreground/25"}`}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Card 4: Live activity ticker (bottom-left) ── */}
      <div className="absolute bottom-6 left-0 w-[17.5rem] rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 shadow-xl backdrop-blur-xl">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-primary-foreground/35">
          Live activity
        </p>
        <div
          className="flex items-center gap-3 transition-opacity duration-300"
          style={{ opacity: actVisible ? 1 : 0 }}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-accent text-[11px] font-extrabold text-primary">
            {act.initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-primary-foreground">{act.name}</p>
            <p className="truncate text-[10px] text-primary-foreground/45">
              {act.action} · {act.detail}
            </p>
          </div>
          <div className="flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400" />
        </div>
      </div>
    </div>
  );
}

/* ---------- STATS ---------- */
interface PlatformStats {
  total_active_jobs?: number;
  total_active_candidates?: number;
  new_opportunities?: number;
  new_candidates?: number;
}

function Stats() {
  const [ref, seen] = useInView<HTMLDivElement>();
  const { data } = useQuery<PlatformStats>({
    queryKey: ["public-stats"],
    queryFn: async () => {
      const r = await api.get("/api/stats/");
      return r.data?.data ?? r.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const items = [
    { value: data?.total_active_jobs ?? 1284, suffix: "+", label: "Active opportunities", icon: Briefcase },
    { value: data?.total_active_candidates ?? 9420, suffix: "+", label: "Registered physicians", icon: Users },
    { value: 487, suffix: "", label: "Healthcare partners", icon: Building2 },
    { value: 28, suffix: " days", label: "Average time to hire", icon: BadgeCheck },
  ];

  return (
    <section ref={ref} className="relative bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-20 lg:px-8 lg:pt-32">
        <div className="grid divide-y divide-border rounded-2xl border border-border bg-surface shadow-card grid-cols-2 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          {items.map((s, i) => (
            <StatItem key={s.label} {...s} seen={seen} delay={i * 80} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatItem({ value, label, suffix, icon: Icon, seen, delay }: { value: number; label: string; suffix: string; icon: typeof Briefcase; seen: boolean; delay: number }) {
  const v = useCounter(value, 1400, seen);
  return (
    <div
      className={`relative p-5 sm:p-7 ${seen ? "animate-fade-up" : "opacity-0"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="absolute left-0 top-5 hidden h-10 w-1 rounded-r-full bg-gradient-accent sm:top-7 sm:block" />
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent sm:h-11 sm:w-11">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <div className="mt-4 text-2xl font-extrabold tracking-tight text-primary sm:mt-5 sm:text-4xl">
        {v.toLocaleString()}{suffix}
      </div>
      <div className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">{label}</div>
    </div>
  );
}

/* ---------- SPECIALTIES ---------- */
function Specialties() {
  return (
    <section className="bg-surface-alt">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8 lg:py-24">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Browse by specialty</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl lg:text-5xl">
              Explore by specialty
            </h2>
            <p className="mt-3 text-base text-muted-foreground sm:mt-4 sm:text-lg">
              Find opportunities in your field of expertise — from acute care to community practice.
            </p>
          </div>
          <Link to="/jobs" className="group inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-accent shrink-0">
            View all <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {SPECIALTY_TILES.map(({ name, icon: Icon, count, color }, i) => (
            <Link
              key={name}
              to="/jobs"
              style={{ animationDelay: `${i * 40}ms` }}
              className="animate-fade-up group relative overflow-hidden rounded-2xl border border-border bg-surface p-4 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-hover sm:p-5"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${color} transition group-hover:scale-110 sm:h-12 sm:w-12`}>
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="mt-4 text-sm font-bold text-primary sm:mt-5 sm:text-base">{name}</div>
              <div className="mt-0.5 text-xs font-semibold text-accent sm:mt-1 sm:text-sm">{count} positions</div>
              <div className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-accent transition-transform duration-300 group-hover:scale-x-100" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- PROVINCE COVERAGE ---------- */
const PROVINCE_LIST = [
  { code: "ON", label: "Ontario" },
  { code: "BC", label: "British Columbia" },
  { code: "AB", label: "Alberta" },
  { code: "QC", label: "Quebec" },
  { code: "MB", label: "Manitoba" },
  { code: "SK", label: "Saskatchewan" },
  { code: "NS", label: "Nova Scotia" },
  { code: "NB", label: "New Brunswick" },
  { code: "NL", label: "Newfoundland & Labrador" },
  { code: "PE", label: "Prince Edward Island" },
  { code: "NT", label: "Northwest Territories" },
  { code: "YT", label: "Yukon" },
  { code: "NU", label: "Nunavut" },
];

interface ProvinceCount {
  province: string;
  count: number;
}

function ProvinceCoverage() {
  const { data: counts, isLoading } = useQuery<ProvinceCount[]>({
    queryKey: ["province-job-counts"],
    queryFn: async () => {
      const results = await Promise.all(
        PROVINCE_LIST.map(async ({ code }) => {
          const r = await api.get(`/api/jobs/?province=${code}&page_size=1`);
          const d = r.data?.data ?? r.data;
          const count = Array.isArray(d) ? d.length : (d?.count ?? d?.results?.length ?? 0);
          return { province: code, count };
        })
      );
      return results;
    },
    staleTime: 5 * 60 * 1000,
  });

  const countMap: Record<string, number> = {};
  (counts ?? []).forEach(({ province, count }) => { countMap[province] = count; });

  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8 lg:py-24">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Coast to coast</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl lg:text-5xl">
            Opportunities Across Canada
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:mt-4 sm:text-lg">
            From Vancouver to Halifax — coast to coast coverage
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {PROVINCE_LIST.map(({ code, label }, i) => {
            const jobCount = isLoading ? null : (countMap[code] ?? 0);
            const hasJobs = jobCount != null && jobCount > 0;
            return (
              <a
                key={code}
                href={`/jobs?province=${code}`}
                style={{ animationDelay: `${i * 35}ms` }}
                className="animate-fade-up group relative flex flex-col items-center rounded-2xl border border-border bg-surface p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-hover sm:p-5"
              >
                <span className="text-xl sm:text-2xl">🍁</span>
                <div className="mt-2 text-xs font-bold text-primary leading-tight sm:text-sm">{label}</div>
                {isLoading ? (
                  <div className="mt-1.5 h-3.5 w-14 animate-pulse rounded bg-secondary" />
                ) : hasJobs ? (
                  <div className="mt-1.5 text-xs font-semibold text-accent">{jobCount} {jobCount === 1 ? "job" : "jobs"}</div>
                ) : (
                  <span className="mt-1.5 inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[9px] font-semibold text-muted-foreground sm:text-[10px]">
                    Coming Soon
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 rounded-b-2xl bg-gradient-accent transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- HOW IT WORKS ---------- */
function HowItWorks() {
  const [tab, setTab] = useState<"physician" | "employer">("physician");
  const steps = tab === "physician" ? PHYS_STEPS : EMP_STEPS;
  return (
    <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
      <div className="absolute inset-0 bg-gradient-mesh opacity-60" />
      <div className="absolute inset-0 bg-grid opacity-[0.05]" />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-24 lg:px-8 lg:py-32">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">How it works</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">A simple, premium experience</h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-primary-foreground/70 sm:mt-4 sm:text-lg">
            Whether you&rsquo;re hiring or looking — we&rsquo;ve removed the friction.
          </p>

          <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-primary-foreground/15 bg-primary-foreground/5 p-1 backdrop-blur sm:mt-8">
            {(["physician", "employer"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-full px-4 py-2 text-sm font-bold capitalize transition sm:px-5 ${
                  tab === k ? "bg-accent text-primary shadow-glow" : "text-primary-foreground/70 hover:text-primary-foreground"
                }`}
              >
                For {k}s
              </button>
            ))}
          </div>
        </div>

        <div className="relative mt-10 grid gap-4 sm:mt-16 sm:gap-6 lg:grid-cols-3">
          <div className="pointer-events-none absolute left-12 right-12 top-12 hidden h-px bg-linear-to-r from-transparent via-accent/40 to-transparent lg:block" />
          {steps.map((s, i) => (
            <div
              key={s.title}
              style={{ animationDelay: `${i * 100}ms` }}
              className="animate-fade-up group relative rounded-2xl border border-primary-foreground/10 bg-primary-foreground/4 p-5 backdrop-blur transition hover:border-accent/30 hover:bg-primary-foreground/[0.07] sm:p-7"
            >
              <span className="pointer-events-none absolute right-5 top-3 select-none text-6xl font-black text-primary-foreground/5 sm:text-7xl">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent text-primary shadow-glow sm:h-12 sm:w-12">
                <s.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h3 className="relative mt-4 text-lg font-bold sm:mt-5 sm:text-xl">{s.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-primary-foreground/70">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- FEATURED JOBS ---------- */
const SPEC_BADGE: Record<string, string> = {
  Cardiology: "bg-rose-100 text-rose-600",
  Neurology: "bg-violet-100 text-violet-600",
  Pediatrics: "bg-emerald-100 text-emerald-600",
  Psychiatry: "bg-blue-100 text-blue-600",
  "General Surgery": "bg-slate-100 text-slate-700",
  "Emergency Medicine": "bg-amber-100 text-amber-600",
  Anesthesiology: "bg-pink-100 text-pink-600",
  Dermatology: "bg-yellow-100 text-yellow-700",
  Radiology: "bg-sky-100 text-sky-600",
  Obstetrics: "bg-fuchsia-100 text-fuchsia-600",
  "Family Medicine": "bg-teal-100 text-teal-600",
};

interface FeaturedJob {
  id: number;
  title: string;
  specialty_display?: string;
  specialty?: string;
  job_type_display?: string;
  job_type?: string;
  employer_name?: string;
  location_display?: string;
  salary_display?: string;
  salary_min?: number;
  salary_max?: number;
}

function getFeaturedSalaryLine(j: FeaturedJob): string | null {
  if (j.salary_display) return j.salary_display;
  const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}K` : n.toLocaleString();
  if (j.salary_min != null && j.salary_max != null) return `$${fmt(j.salary_min)} – $${fmt(j.salary_max)}/yr`;
  if (j.salary_min != null) return `From $${fmt(j.salary_min)}/yr`;
  if (j.salary_max != null) return `Up to $${fmt(j.salary_max)}/yr`;
  return null;
}

function FeaturedJobsSection() {
  const { data, isLoading } = useQuery<FeaturedJob[]>({
    queryKey: ["featured-jobs"],
    queryFn: async () => {
      const r = await api.get("/api/jobs/?page_size=6");
      const d = r.data?.data ?? r.data;
      return Array.isArray(d) ? d : (d?.results ?? []);
    },
    staleTime: 3 * 60 * 1000,
  });
  const featured = data ?? [];

  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8 lg:py-24">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Latest opportunities</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl lg:text-5xl">
              Hand-picked physician roles
            </h2>
          </div>
          <Link to="/jobs" className="group inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-accent shrink-0">
            View all <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:mt-12 sm:gap-5 lg:grid-cols-2">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-secondary sm:h-52" />
              ))
            : featured.map((j, i) => {
                const specialty = j.specialty_display ?? j.specialty ?? "";
                const initials = (j.employer_name ?? "?").split(" ").map((w) => w[0]).slice(0, 3).join("");
                const badge = SPEC_BADGE[specialty] ?? "bg-slate-100 text-slate-700";
                return (
                  <Link
                    key={j.id}
                    to="/jobs/$jobId"
                    params={{ jobId: String(j.id) }}
                    style={{ animationDelay: `${i * 60}ms` }}
                    className="animate-fade-up group relative flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-hover sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:px-2.5 sm:py-1 ${badge}`}>
                          {specialty}
                        </span>
                        {j.job_type_display && (
                          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary sm:px-2.5 sm:py-1">
                            {j.job_type_display}
                          </span>
                        )}
                      </div>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary-light text-xs font-extrabold text-primary-foreground shadow-card sm:h-12 sm:w-12">
                        {initials}
                      </span>
                    </div>

                    <h3 className="mt-3 text-base font-bold tracking-tight text-primary transition group-hover:text-accent-alt sm:mt-4 sm:text-xl">
                      {j.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground sm:gap-x-5 sm:gap-y-1.5 sm:text-sm">
                      {j.employer_name && <span className="inline-flex items-center gap-1.5"><Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {j.employer_name}</span>}
                      {j.location_display && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {j.location_display}</span>}
                      {getFeaturedSalaryLine(j) && (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                          <DollarSign className="h-3 w-3 text-accent sm:h-3.5 sm:w-3.5" /> {getFeaturedSalaryLine(j)}
                        </span>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-end border-t border-border pt-3 sm:pt-4">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-primary transition group-hover:shadow-glow sm:px-4 sm:py-2">
                        View position <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
        </div>
      </div>
    </section>
  );
}

/* ---------- ASSESSMENT BANNER ---------- */
function AssessmentBanner() {
  return (
    <section className="bg-surface-alt">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8 lg:py-24">
        <div className="relative isolate overflow-hidden rounded-3xl bg-linear-to-br from-accent to-accent-alt p-6 shadow-elegant sm:p-10 lg:p-16">
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 -bottom-24 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:gap-10">
            <div className="text-primary">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary backdrop-blur">
                Free • 5 minutes
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">
                Get matched with the perfect role.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-primary/80 sm:mt-4 sm:text-base">
                Tell us about your specialty, lifestyle goals and practice preferences. Our recruiters will respond within one business day with a personalized career roadmap.
              </p>
              <ul className="mt-5 space-y-2 text-sm font-medium text-primary sm:mt-6">
                {["Personalized job matches", "Compensation benchmarks for your specialty", "Licensing & relocation guidance"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" /> {t}
                  </li>
                ))}
              </ul>
              <Link
                to="/assessment"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary-light hover:shadow-elegant sm:mt-8 sm:px-6 sm:py-3.5"
              >
                Start free assessment <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Floating preview — desktop only */}
            <div className="relative hidden lg:block">
              <div className="rotate-2 rounded-2xl border border-white/40 bg-white/95 p-5 shadow-elegant">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span>Step 1 of 3</span>
                  <span className="text-accent-alt">Personal info</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full w-1/3 rounded-full bg-gradient-accent" />
                </div>
                <div className="mt-5 space-y-3">
                  {["Your specialty", "Years in practice", "Preferred provinces"].map((l, idx) => (
                    <div key={l}>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{l}</div>
                      <div className={`mt-1 h-10 rounded-lg border border-border ${idx === 0 ? "bg-accent-soft" : "bg-secondary/50"}`} />
                    </div>
                  ))}
                </div>
                <button className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground">
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- TESTIMONIALS ---------- */
interface PublicTestimonial {
  id: number;
  physician_name: string;
  specialty?: string;
  location?: string;
  testimonial_text: string;
}

function Testimonials() {
  const { data, isLoading } = useQuery<PublicTestimonial[]>({
    queryKey: ["public-testimonials"],
    queryFn: async () => {
      const r = await api.get("/api/testimonials/");
      const d = r.data?.data ?? r.data;
      return Array.isArray(d) ? d : (d?.results ?? []);
    },
    staleTime: 5 * 60 * 1000,
  });
  const items = data ?? [];

  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Physician stories</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl lg:text-5xl">
            Trusted by Canada&rsquo;s medical community
          </h2>
        </div>

        <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-secondary sm:h-48" />
              ))
            : items.map((t, i) => {
                const initials = t.physician_name.split(" ").map((w) => w[0]).slice(0, 2).join("");
                return (
                  <figure
                    key={t.id}
                    style={{ animationDelay: `${i * 80}ms` }}
                    className="animate-fade-up group relative rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:-translate-y-1 hover:shadow-hover sm:p-7"
                  >
                    <Quote className="absolute right-5 top-5 h-10 w-10 rotate-180 text-accent/15 sm:right-6 sm:top-6 sm:h-12 sm:w-12" />
                    <div className="flex gap-1 text-accent">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star key={idx} className="h-3.5 w-3.5 fill-current sm:h-4 sm:w-4" />
                      ))}
                    </div>
                    <blockquote className="relative mt-3 text-sm italic leading-relaxed text-foreground/85 sm:mt-4 sm:text-base">
                      &ldquo;{t.testimonial_text}&rdquo;
                    </blockquote>
                    <figcaption className="mt-5 flex items-center gap-3 sm:mt-6">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary-light text-sm font-bold text-primary-foreground sm:h-11 sm:w-11">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-primary truncate">{t.physician_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[t.specialty, t.location].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                    </figcaption>
                  </figure>
                );
              })}
        </div>
      </div>
    </section>
  );
}

/* ---------- FINAL CTA ---------- */
function FinalCTA() {
  return (
    <section className="bg-surface-alt">
      <div className="mx-auto max-w-7xl px-4 pb-14 sm:pb-20 lg:px-8 lg:pb-24">
        <div className="relative isolate overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-elegant sm:p-10 lg:p-16">
          <div className="absolute inset-0 bg-gradient-mesh opacity-60" />
          <div className="absolute inset-0 bg-grid opacity-[0.06]" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 -bottom-24 h-80 w-80 rounded-full bg-accent-alt/30 blur-3xl" />

          <div className="relative flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                Ready to take the next step?
              </h2>
              <p className="mt-3 text-base text-primary-foreground/75 sm:mt-4 sm:text-lg">
                Join 9,000+ physicians who&rsquo;ve found their ideal practice through CandianMdJobs.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
              <Link
                to="/register/physician"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-primary shadow-glow transition hover:scale-[1.02] sm:px-6 sm:py-3.5"
              >
                Create physician profile <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/employers"
                className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/25 bg-primary-foreground/6 px-5 py-3 text-sm font-semibold text-primary-foreground backdrop-blur hover:bg-primary-foreground/12 sm:px-6 sm:py-3.5"
              >
                I&rsquo;m hiring
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
