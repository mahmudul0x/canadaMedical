import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Linkedin, Twitter, Facebook, Instagram, ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/site/Logo";

const sections = [
  {
    title: "For Physicians",
    links: [
      { to: "/jobs", label: "Find a Job" },
      { to: "/register/physician", label: "Create Profile" },
      { to: "/assessment", label: "Career Assessment" },
      { to: "/login", label: "Log In" },
    ],
  },
  {
    title: "For Employers",
    links: [
      { to: "/employers", label: "Why CandianMdJobs" },
      { to: "/pricing", label: "Pricing" },
      { to: "/register/employer", label: "Post a Job" },
      { to: "/contact", label: "Contact Sales" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/testimonials", label: "Testimonials" },
      { to: "/faq", label: "FAQ" },
      { to: "/contact", label: "Contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-20 overflow-hidden bg-primary text-primary-foreground sm:mt-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.05]" />

      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-12 sm:pb-10 sm:pt-16 lg:px-8 lg:pt-20">

        {/* ── Brand row ── */}
        <div className="flex flex-col gap-2">
          <div className="[&_a]:text-primary-foreground">
            <Logo inverse />
          </div>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-primary-foreground/70">
            The trusted recruitment platform connecting Canada&rsquo;s exceptional physicians with leading hospitals, clinics and health authorities.
          </p>
        </div>

        {/* ── Contact + Social ── */}
        <div className="mt-6 flex flex-col gap-2 text-sm text-primary-foreground/80 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
          <span className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
            100 King St W, Suite 4400, Toronto ON
          </span>
          <span className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0 text-accent" />
            +1 (800) 555-0199
          </span>
          <span className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 shrink-0 text-accent" />
            hello@candianmdjobs.ca
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {[
            { Icon: Linkedin, label: "LinkedIn" },
            { Icon: Twitter, label: "Twitter" },
            { Icon: Facebook, label: "Facebook" },
            { Icon: Instagram, label: "Instagram" },
          ].map(({ Icon, label }) => (
            <a
              key={label}
              href="#"
              aria-label={label}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 text-primary-foreground/80 transition hover:border-accent/40 hover:text-accent"
            >
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </div>

        {/* ── Divider ── */}
        <div className="my-8 h-px w-full bg-primary-foreground/10" />

        {/* ── Nav link columns ── */}
        <div className="grid grid-cols-3 gap-6 sm:gap-10">
          {sections.map((s) => (
            <div key={s.title}>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent sm:text-xs">
                {s.title}
              </h4>
              <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5">
                {s.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="group inline-flex items-center gap-1 text-xs text-primary-foreground/70 transition hover:text-accent sm:text-sm"
                    >
                      {l.label}
                      <ArrowUpRight className="h-3 w-3 opacity-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-10 flex flex-col gap-3 border-t border-primary-foreground/10 pt-6 text-xs text-primary-foreground/50 sm:mt-14 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CandianMdJobs Inc. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link to="/privacy" className="transition hover:text-accent">Privacy Policy</Link>
            <a href="/terms" className="transition hover:text-accent">Terms of Service</a>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/5 px-3 py-1 font-medium text-primary-foreground/70">
              <span className="text-accent">●</span> All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
