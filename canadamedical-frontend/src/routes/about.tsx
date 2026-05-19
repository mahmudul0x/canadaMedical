import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Heart, ShieldCheck, Star, Target, Users, Sparkles,
  ArrowRight, CheckCircle2, MapPin, Clock, Award,
  Briefcase, TrendingUp, Globe, ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — CanadianMDjobs.com" },
      {
        name: "description",
        content:
          "Canada's dedicated physician recruitment platform — built by healthcare professionals, for healthcare professionals.",
      },
    ],
  }),
  component: AboutPage,
});

/* ── helpers ── */
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

interface PlatformStats {
  total_active_jobs?: number;
  total_active_candidates?: number;
}

/* ── data ── */
const CORE_VALUES = [
  {
    icon: ShieldCheck,
    title: "Integrity & Trust",
    desc: "We verify every employer and listing on our platform. Physicians can trust that every opportunity is genuine and accurately represented.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Heart,
    title: "Physician-First Approach",
    desc: "Physicians are at the heart of everything we do. We advocate for physician well-being, fair compensation, and career fulfillment.",
    color: "bg-rose-50 text-rose-600",
  },
  {
    icon: Star,
    title: "Excellence in Service",
    desc: "We hold ourselves to the highest standards in recruitment, communication, and candidate experience.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Users,
    title: "Diversity & Inclusion",
    desc: "We celebrate Canada's diverse medical community and actively support internationally trained physicians in pursuing Canadian careers.",
    color: "bg-emerald-50 text-emerald-600",
  },
];

const TIMELINE = [
  {
    label: "Founded",
    title: "CanadianMDjobs.com Launched",
    desc: "Started with a small team of healthcare recruiters passionate about improving physician placement in Canada.",
  },
  {
    label: "Year 2",
    title: "Nationwide Expansion",
    desc: "Expanded coverage to all 13 provinces and territories, partnering with rural and northern health authorities.",
  },
  {
    label: "Year 3",
    title: "200+ Employer Partners",
    desc: "Reached a milestone of 200+ verified healthcare employer partners from coast to coast.",
  },
  {
    label: "Year 4",
    title: "Free Career Assessment Launched",
    desc: "Introduced our free physician career assessment tool, helping hundreds of physicians find their ideal career path.",
  },
  {
    label: "Today",
    title: "1,200+ Physicians Placed",
    desc: "Proud to have successfully placed over 1,200 physicians across Canada with a 95% satisfaction rate.",
  },
];

const PROVINCES = [
  "Ontario", "British Columbia", "Alberta", "Quebec",
  "Manitoba", "Saskatchewan", "Nova Scotia", "New Brunswick",
  "Newfoundland & Labrador", "Prince Edward Island",
  "Northwest Territories", "Yukon", "Nunavut",
];

/* ══════════════════════════════════════════════ */
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
    <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
      <div className="absolute inset-0 bg-gradient-mesh opacity-90" />
      <div className="absolute inset-0 bg-grid opacity-[0.04]" />
      <div className="pointer-events-none absolute -left-48 top-0 h-125 w-125 rounded-full bg-accent/20 blur-[130px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-100 w-100 rounded-full bg-accent-alt/15 blur-[110px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24 lg:px-8 lg:py-40">
        <div className="max-w-3xl">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-accent backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Our Story
          </div>

          <h1
            className="animate-fade-up mt-6 text-4xl font-extrabold leading-[1.04] tracking-tight sm:text-5xl lg:text-[68px]"
            style={{ animationDelay: "60ms" }}
          >
            Built for Canada's
            <span className="mt-2 block text-gradient-accent">Medical Community</span>
          </h1>

          <p
            className="animate-fade-up mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/65"
            style={{ animationDelay: "130ms" }}
          >
            We are Canada's dedicated physician recruitment platform — built by healthcare professionals,
            for healthcare professionals. Every feature, every partnership, every decision exists to
            serve one purpose: better careers for Canadian physicians.
          </p>

          <div
            className="animate-fade-up mt-10 flex flex-wrap items-center gap-5"
            style={{ animationDelay: "200ms" }}
          >
            {[
              { icon: ShieldCheck, text: "College-verified employers" },
              { icon: Award, text: "28-day average hire" },
              { icon: Globe, text: "All 13 provinces & territories" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-primary-foreground/65">
                <Icon className="h-4 w-4 text-accent" />
                <span><strong className="text-primary-foreground">{text.split(" ")[0]}</strong>{" "}{text.split(" ").slice(1).join(" ")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-background to-transparent" />
    </section>
  );
}

/* ── 2. Our Story ── */
function OurStory() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8 lg:py-24">
        <div className="grid items-center gap-8 sm:gap-14 lg:grid-cols-2">
          {/* Text */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Our Story</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl lg:text-5xl">
              Connecting Canada's Medical Talent
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-foreground/70">
              CanadianMDjobs.com was founded with a singular mission: to simplify physician recruitment
              across Canada and create meaningful connections between talented physicians and outstanding
              healthcare organizations.
            </p>
            <p className="mt-4 text-[17px] leading-relaxed text-foreground/70">
              We recognized a gap in the Canadian healthcare recruitment market — physicians and employers
              needed a dedicated, trustworthy platform that truly understood the unique landscape of
              Canadian medicine. From urban academic medical centres to remote northern clinics, every
              region of Canada deserves access to exceptional physician talent.
            </p>
            <p className="mt-4 text-[17px] leading-relaxed text-foreground/70">
              Today, CanadianMDjobs.com is the go-to destination for physician recruitment across all
              13 provinces and territories, featuring <strong className="font-semibold text-primary">500+ active positions</strong> and{" "}
              <strong className="font-semibold text-primary">200+ employer partners</strong> nationwide.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/jobs"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary-glow"
              >
                Browse positions <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/assessment"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-primary transition hover:border-accent/40 hover:text-accent"
              >
                Free career assessment
              </Link>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="overflow-hidden rounded-3xl border border-border bg-linear-to-br from-primary/5 to-accent/5 shadow-elegant">
              {/* Canada map illustration placeholder */}
              <div className="flex h-80 items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                    <Globe className="h-10 w-10 text-primary" />
                  </div>
                  <p className="mt-4 text-2xl font-extrabold text-primary">🍁 Canada</p>
                  <p className="mt-1 text-sm text-muted-foreground">All 13 provinces & territories</p>
                </div>
              </div>
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-border bg-card p-4 shadow-card sm:block">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nationwide</p>
              <p className="mt-0.5 text-2xl font-extrabold text-primary">13</p>
              <p className="text-xs text-muted-foreground">Provinces & Territories</p>
            </div>
            <div className="absolute -right-5 -top-5 hidden rounded-2xl border border-border bg-card p-4 shadow-card sm:block">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Satisfaction</p>
              <p className="mt-0.5 text-2xl font-extrabold text-primary">95%</p>
              <p className="text-xs text-muted-foreground">Placement success rate</p>
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
    {
      icon: Target,
      label: "Our Mission",
      title: "Connect & Empower",
      body: "To connect Canada's physician community with exceptional career opportunities, empowering healthcare professionals to build fulfilling careers while strengthening Canada's healthcare system.",
      color: "from-primary/10 to-primary/5 border-primary/15",
      iconBg: "bg-primary/10 text-primary",
    },
    {
      icon: TrendingUp,
      label: "Our Vision",
      title: "Most Trusted Platform",
      body: "To be Canada's most trusted and comprehensive physician recruitment platform — the first destination every Canadian physician and healthcare employer thinks of when seeking career connections.",
      color: "from-accent/10 to-accent/5 border-accent/15",
      iconBg: "bg-accent/10 text-accent",
    },
    {
      icon: Heart,
      label: "Our Promise",
      title: "Genuine Care",
      body: "We promise transparency, integrity, and genuine care for every physician and employer we serve. We measure our success by the success of the people and organizations we connect.",
      color: "from-rose-50 to-rose-50/50 border-rose-100",
      iconBg: "bg-rose-100 text-rose-600",
    },
  ];

  return (
    <section className="bg-surface-alt">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8 lg:py-24">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">What Drives Us</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl lg:text-5xl">
            Our Mission, Vision & Values
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Every decision we make is guided by a clear north star — improving physician careers
            and Canadian healthcare outcomes.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => (
            <div
              key={c.label}
              className={`animate-fade-up rounded-2xl border bg-linear-to-br p-5 sm:p-7 shadow-card ${c.color}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.iconBg}`}>
                <c.icon className="h-6 w-6" />
              </div>
              <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {c.label}
              </p>
              <h3 className="mt-1 text-xl font-extrabold text-primary">{c.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-foreground/70">{c.body}</p>
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
    <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
      <div className="absolute inset-0 bg-gradient-mesh opacity-80" />
      <div className="absolute inset-0 bg-grid opacity-[0.04]" />
      <div className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-accent/15 blur-[100px]" />
      <div className="pointer-events-none absolute -right-32 top-0 h-80 w-80 rounded-full bg-accent-alt/10 blur-[100px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8 lg:py-24">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Core Values</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">What We Stand For</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/60">
            Every decision we make is guided by our core values — from how we vet our employer
            partners to how we support physicians in their career journey.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CORE_VALUES.map((v, i) => (
            <div
              key={v.title}
              className="animate-fade-up group rounded-2xl border border-primary-foreground/10 bg-primary-foreground/4 p-5 sm:p-7 backdrop-blur transition hover:border-accent/30 hover:bg-primary-foreground/8"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${v.color}`}>
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-primary-foreground/60">{v.desc}</p>
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
    <section className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8 lg:py-24">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Our Journey</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl lg:text-5xl">
            How We've Grown
          </h2>
        </div>

        <div className="relative mx-auto mt-16 max-w-3xl">
          {/* Vertical line */}
          <div className="absolute left-[1.6rem] top-0 h-full w-0.5 bg-linear-to-b from-accent via-accent/50 to-transparent" />

          <div className="space-y-10">
            {TIMELINE.map((item, i) => (
              <div
                key={item.label}
                className="animate-fade-up relative flex gap-6"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Dot */}
                <div className="relative z-10 flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary text-center shadow-elegant">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary-foreground/60 leading-none">
                    {item.label.includes("Year") ? item.label.split(" ")[0] : ""}
                  </span>
                  <span className="text-xs font-extrabold text-primary-foreground leading-tight">
                    {item.label.includes("Year") ? item.label.split(" ")[1] : item.label}
                  </span>
                </div>

                {/* Card */}
                <div className="flex-1 rounded-2xl border border-border bg-card p-5 shadow-card transition hover:shadow-hover">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-primary">{item.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-foreground/70">{item.desc}</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
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

/* ── 6. Impact stats (live from API) ── */
function ImpactSection() {
  const [ref, seen] = useInView<HTMLDivElement>();
  const { data } = useQuery<PlatformStats>({
    queryKey: ["public-stats"],
    queryFn: async () => {
      const r = await api.get("/api/stats/");
      return r.data?.data ?? r.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = [
    { value: 1200, suffix: "+", label: "Physicians Placed", icon: Users },
    { value: data?.total_active_jobs ?? 500, suffix: "+", label: "Active Positions", icon: Briefcase },
    { value: 200, suffix: "+", label: "Employer Partners", icon: Award },
    { value: 95, suffix: "%", label: "Satisfaction Rate", icon: Star },
  ];

  return (
    <section ref={ref} className="bg-surface-alt">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8 lg:py-24">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Our Impact</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl lg:text-5xl">
            Across Canada
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Numbers that reflect our commitment to Canadian healthcare.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {stats.map((s, i) => (
            <ImpactCard key={s.label} {...s} seen={seen} delay={i * 80} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ImpactCard({
  value, suffix, label, icon: Icon, seen, delay,
}: {
  value: number; suffix: string; label: string; icon: typeof Users; seen: boolean; delay: number;
}) {
  const v = useCounter(value, 1800, seen);
  return (
    <div
      className={`rounded-2xl border border-border bg-card p-5 sm:p-7 text-center shadow-card transition hover:-translate-y-0.5 hover:shadow-hover ${seen ? "animate-fade-up" : "opacity-0"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-4 text-4xl font-extrabold tracking-tight text-primary">
        {seen ? v.toLocaleString() : "0"}{suffix}
      </p>
      <p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

/* ── 7. Province coverage ── */
function ProvincesSection() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8 lg:py-24">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">National Coverage</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl lg:text-5xl">
              Physician Opportunities in Every Province & Territory
            </h2>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              We serve physicians and employers across all of Canada — from major urban centres to remote northern communities.
            </p>
          </div>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-primary transition hover:border-accent/40 hover:text-accent"
          >
            View all jobs <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {PROVINCES.map((province, i) => (
            <Link
              key={province}
              to="/jobs"
              className="animate-fade-up group flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-hover"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <MapPin className="h-4 w-4 shrink-0 text-accent" />
              <span className="text-sm font-semibold text-foreground/80 transition group-hover:text-primary">
                {province}
              </span>
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
    <section className="bg-surface-alt">
      <div className="mx-auto max-w-7xl px-4 pb-14 pt-4 sm:pb-24 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-elegant sm:p-10 lg:p-16">
          <div className="absolute inset-0 bg-gradient-mesh opacity-70" />
          <div className="absolute inset-0 bg-grid opacity-[0.04]" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 -bottom-24 h-80 w-80 rounded-full bg-accent-alt/20 blur-3xl" />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
                Join the CanadianMDjobs Community
              </p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                Ready to take the next step?
              </h2>
              <p className="mt-4 max-w-xl text-lg text-primary-foreground/65">
                Whether you're a physician seeking new opportunities or an employer looking for top
                medical talent — we're here to help every step of the way.
              </p>
              <div className="mt-6 flex flex-col gap-2 text-sm text-primary-foreground/55">
                {[
                  "Personalized job matches in your specialty",
                  "Compensation benchmarks for every province",
                  "Licensing & relocation guidance",
                ].map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" /> {t}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <Link
                to="/jobs"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-7 py-4 text-base font-bold text-primary shadow-glow transition hover:scale-[1.02] lg:w-auto"
              >
                Find a Job
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              <Link
                to="/assessment"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary-foreground/20 bg-primary-foreground/6 px-7 py-4 text-base font-semibold text-primary-foreground transition hover:border-primary-foreground/35 hover:bg-primary-foreground/12 lg:w-auto"
              >
                Free Career Assessment
              </Link>
              <Link
                to="/employers"
                className="text-center text-sm font-semibold text-primary-foreground/45 transition hover:text-primary-foreground/75 lg:text-right"
              >
                Hiring physicians? Learn about employer plans →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
