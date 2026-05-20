import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Heart, ShieldCheck, Star, Target, Users, Sparkles,
  ArrowRight, CheckCircle2, MapPin, Award,
  Briefcase, TrendingUp, Globe,
} from "lucide-react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — CandianMdJobs" },
      { name: "description", content: "Canada's dedicated physician recruitment platform — built by healthcare professionals, for healthcare professionals." },
    ],
  }),
  component: AboutPage,
});

function useInView<T extends HTMLElement>(opts: IntersectionObserverInit = { rootMargin: "-80px" }) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); io.disconnect(); }
    }, opts);
    io.observe(ref.current);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, seen] as const;
}

function useCounter(target: number, duration = 1600, start = false) {
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

interface PlatformStats { total_active_jobs?: number; total_active_candidates?: number; }

const CORE_VALUES = [
  { icon: ShieldCheck, title: "Integrity & Trust", desc: "We verify every employer and listing. Physicians can trust that every opportunity is genuine and accurately represented.", color: "bg-blue-50 text-[#1a6fd4]" },
  { icon: Heart, title: "Physician-First", desc: "Physicians are at the heart of everything we do. We advocate for physician well-being, fair compensation, and career fulfillment.", color: "bg-rose-50 text-rose-500" },
  { icon: Star, title: "Excellence", desc: "We hold ourselves to the highest standards in recruitment, communication, and candidate experience.", color: "bg-amber-50 text-amber-500" },
  { icon: Users, title: "Diversity & Inclusion", desc: "We celebrate Canada's diverse medical community and actively support internationally trained physicians.", color: "bg-emerald-50 text-emerald-600" },
];

const TIMELINE = [
  { label: "Founded", title: "CandianMdJobs Launched", desc: "Started with a small team of healthcare recruiters passionate about improving physician placement in Canada." },
  { label: "Year 2", title: "Nationwide Expansion", desc: "Expanded coverage to all 13 provinces and territories, partnering with rural and northern health authorities." },
  { label: "Year 3", title: "200+ Employer Partners", desc: "Reached a milestone of 200+ verified healthcare employer partners from coast to coast." },
  { label: "Year 4", title: "Free Career Assessment", desc: "Introduced our free physician career assessment tool, helping hundreds of physicians find their ideal career path." },
  { label: "Today", title: "1,200+ Physicians Placed", desc: "Proud to have successfully placed over 1,200 physicians across Canada with a 95% satisfaction rate." },
];

const PROVINCES = [
  "Ontario", "British Columbia", "Alberta", "Quebec",
  "Manitoba", "Saskatchewan", "Nova Scotia", "New Brunswick",
  "Newfoundland & Labrador", "Prince Edward Island",
  "Northwest Territories", "Yukon", "Nunavut",
];

function AboutPage() {
  return (
    <div className="overflow-x-hidden">
      <AboutHero />
      <OurStory />
      <MissionVisionSection />
      <CoreValuesSection />
      <TimelineSection />
      <ImpactSection />
      <ProvincesSection />
      <AboutCTA />
    </div>
  );
}

/* ── 1. Hero ── */
function AboutHero() {
  return (
    <section className="relative bg-[#0f1f3d] overflow-hidden">
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-[#1a6fd4]/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-[#1a6fd4]/10 blur-[100px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:py-28 lg:px-8 lg:py-36">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
            <Sparkles className="h-3.5 w-3.5 text-[#1a6fd4]" /> Our Story
          </div>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Built for Canada's<br />
            <span className="text-[#1a6fd4]">Medical Community</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/55">
            We are Canada's dedicated physician recruitment platform — built by healthcare professionals,
            for healthcare professionals. Every feature, every partnership, every decision exists to
            serve one purpose: better careers for Canadian physicians.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            {[
              { icon: ShieldCheck, text: "College-verified employers" },
              { icon: Award, text: "28-day average hire" },
              { icon: Globe, text: "All 13 provinces & territories" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-white/55">
                <Icon className="h-4 w-4 text-[#1a6fd4]" />
                <span className="text-white/70">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-white to-transparent" />
    </section>
  );
}

/* ── 2. Our Story ── */
function OurStory() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1a6fd4]">Our Story</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0f1f3d] sm:text-4xl">
              Connecting Canada's Medical Talent
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-500">
              CandianMdJobs was founded with a singular mission: to simplify physician recruitment
              across Canada and create meaningful connections between talented physicians and outstanding
              healthcare organizations.
            </p>
            <p className="mt-4 text-base leading-relaxed text-slate-500">
              We recognized a gap in the Canadian healthcare recruitment market — physicians and employers
              needed a dedicated, trustworthy platform that truly understood the unique landscape of
              Canadian medicine. From urban academic medical centres to remote northern clinics, every
              region deserves access to exceptional physician talent.
            </p>
            <p className="mt-4 text-base leading-relaxed text-slate-500">
              Today, CandianMdJobs is the go-to destination for physician recruitment across all
              13 provinces and territories, featuring <strong className="font-semibold text-[#0f1f3d]">500+ active positions</strong> and{" "}
              <strong className="font-semibold text-[#0f1f3d]">200+ employer partners</strong> nationwide.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/jobs" className="inline-flex items-center gap-2 rounded-xl bg-[#1a6fd4] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1560be]">
                Browse positions <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/assessment" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#1a6fd4]/40 hover:text-[#1a6fd4]">
                Free career assessment
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-3xl border border-slate-100 bg-[#f0f4ff] shadow-sm">
              <div className="flex h-72 items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[#1a6fd4]/10">
                    <Globe className="h-10 w-10 text-[#1a6fd4]" />
                  </div>
                  <p className="mt-4 text-2xl font-extrabold text-[#0f1f3d]">🍁 Canada</p>
                  <p className="mt-1 text-sm text-slate-400">All 13 provinces & territories</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-lg sm:block">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Nationwide</p>
              <p className="mt-0.5 text-2xl font-extrabold text-[#0f1f3d]">13</p>
              <p className="text-xs text-slate-400">Provinces & Territories</p>
            </div>
            <div className="absolute -right-4 -top-4 hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-lg sm:block">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Satisfaction</p>
              <p className="mt-0.5 text-2xl font-extrabold text-[#0f1f3d]">95%</p>
              <p className="text-xs text-slate-400">Placement success rate</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 3. Mission / Vision / Promise ── */
function MissionVisionSection() {
  const cards = [
    { icon: Target, label: "Our Mission", title: "Connect & Empower", body: "To connect Canada's physician community with exceptional career opportunities, empowering healthcare professionals to build fulfilling careers while strengthening Canada's healthcare system.", iconBg: "bg-[#1a6fd4]/10 text-[#1a6fd4]" },
    { icon: TrendingUp, label: "Our Vision", title: "Most Trusted Platform", body: "To be Canada's most trusted and comprehensive physician recruitment platform — the first destination every Canadian physician and healthcare employer thinks of.", iconBg: "bg-emerald-50 text-emerald-600" },
    { icon: Heart, label: "Our Promise", title: "Genuine Care", body: "We promise transparency, integrity, and genuine care for every physician and employer we serve. We measure our success by the success of the people we connect.", iconBg: "bg-rose-50 text-rose-500" },
  ];

  return (
    <section className="bg-[#f0f4ff]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8 lg:py-24">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1a6fd4]">What Drives Us</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0f1f3d] sm:text-4xl">
            Our Mission, Vision & Values
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500">
            Every decision we make is guided by a clear north star — improving physician careers and Canadian healthcare outcomes.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {cards.map((c, i) => (
            <div key={c.label} className="animate-fade-up rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ animationDelay: `${i * 80}ms` }}>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.iconBg}`}>
                <c.icon className="h-6 w-6" />
              </div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{c.label}</p>
              <h3 className="mt-1 text-lg font-extrabold text-[#0f1f3d]">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 4. Core Values ── */
function CoreValuesSection() {
  return (
    <section className="bg-[#0f1f3d]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-[#1a6fd4]/15 blur-[100px]" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8 lg:py-24">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1a6fd4]">Core Values</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">What We Stand For</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/50">
            Every decision we make is guided by our core values — from how we vet our employer partners to how we support physicians.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CORE_VALUES.map((v, i) => (
            <div key={v.title} className="animate-fade-up rounded-2xl border border-white/8 bg-[#162647] p-6 transition hover:border-[#1a6fd4]/40 hover:bg-[#1a2d55]" style={{ animationDelay: `${i * 80}ms` }}>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${v.color}`}>
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-base font-bold text-white">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 5. Timeline ── */
function TimelineSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8 lg:py-24">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1a6fd4]">Our Journey</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0f1f3d] sm:text-4xl">How We've Grown</h2>
        </div>
        <div className="relative mx-auto mt-14 max-w-3xl">
          <div className="absolute left-[1.6rem] top-0 h-full w-0.5 bg-linear-to-b from-[#1a6fd4] via-[#1a6fd4]/40 to-transparent" />
          <div className="space-y-8">
            {TIMELINE.map((item, i) => (
              <div key={item.label} className="animate-fade-up relative flex gap-6" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="relative z-10 flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#0f1f3d] text-center shadow-lg">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 leading-none">
                    {item.label.includes("Year") ? item.label.split(" ")[0] : ""}
                  </span>
                  <span className="text-xs font-extrabold text-white leading-tight">
                    {item.label.includes("Year") ? item.label.split(" ")[1] : item.label}
                  </span>
                </div>
                <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-[#0f1f3d]">{item.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{item.desc}</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#1a6fd4]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 6. Impact stats ── */
function ImpactSection() {
  const [ref, seen] = useInView<HTMLDivElement>();
  const { data } = useQuery<PlatformStats>({
    queryKey: ["public-stats"],
    queryFn: async () => { const r = await api.get("/api/stats/"); return r.data?.data ?? r.data; },
    staleTime: 5 * 60 * 1000,
  });
  const stats = [
    { value: 1200, suffix: "+", label: "Physicians Placed", icon: Users },
    { value: data?.total_active_jobs ?? 500, suffix: "+", label: "Active Positions", icon: Briefcase },
    { value: 200, suffix: "+", label: "Employer Partners", icon: Award },
    { value: 95, suffix: "%", label: "Satisfaction Rate", icon: Star },
  ];
  return (
    <section ref={ref} className="bg-[#f0f4ff]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8 lg:py-24">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1a6fd4]">Our Impact</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0f1f3d] sm:text-4xl">Across Canada</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">Numbers that reflect our commitment to Canadian healthcare.</p>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s, i) => <ImpactCard key={s.label} {...s} seen={seen} delay={i * 80} />)}
        </div>
      </div>
    </section>
  );
}

function ImpactCard({ value, suffix, label, icon: Icon, seen, delay }: { value: number; suffix: string; label: string; icon: typeof Users; seen: boolean; delay: number }) {
  const v = useCounter(value, 1800, seen);
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${seen ? "animate-fade-up" : "opacity-0"}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a6fd4]/10">
        <Icon className="h-6 w-6 text-[#1a6fd4]" />
      </div>
      <p className="mt-4 text-4xl font-extrabold tracking-tight text-[#0f1f3d]">{seen ? v.toLocaleString() : "0"}{suffix}</p>
      <p className="mt-1 text-sm text-slate-400">{label}</p>
    </div>
  );
}

/* ── 7. Provinces ── */
function ProvincesSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8 lg:py-24">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1a6fd4]">National Coverage</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0f1f3d] sm:text-4xl">
              Physician Opportunities in Every Province
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-500">
              We serve physicians and employers across all of Canada — from major urban centres to remote northern communities.
            </p>
          </div>
          <Link to="/jobs" className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-[#1a6fd4]/40 hover:text-[#1a6fd4]">
            View all jobs <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {PROVINCES.map((province, i) => (
            <Link key={province} to="/jobs"
              className="animate-fade-up group flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-4 py-3.5 transition hover:-translate-y-0.5 hover:border-[#1a6fd4]/30 hover:shadow-md"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <MapPin className="h-4 w-4 shrink-0 text-[#1a6fd4]" />
              <span className="text-sm font-medium text-slate-600 group-hover:text-[#0f1f3d]">{province}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 8. CTA ── */
function AboutCTA() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 pb-14 pt-4 sm:pb-24 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-3xl bg-[#0f1f3d] px-8 py-12 shadow-xl lg:px-14 lg:py-16">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#1a6fd4]/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-[#1a6fd4]/10 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1a6fd4]">Join the CandianMdJobs Community</p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Ready to take the next step?</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55">
                Whether you're a physician seeking new opportunities or an employer looking for top medical talent — we're here to help every step of the way.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                {["Personalized job matches in your specialty", "Compensation benchmarks for every province", "Licensing & relocation guidance"].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-sm text-white/55">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1a6fd4]" /> {t}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <Link to="/jobs" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a6fd4] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#1560be] lg:w-auto">
                Find a Job <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/assessment" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 lg:w-auto">
                Free Career Assessment
              </Link>
              <Link to="/employers" className="text-center text-sm text-white/35 transition hover:text-white/60 lg:text-right">
                Hiring physicians? Learn about employer plans →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
