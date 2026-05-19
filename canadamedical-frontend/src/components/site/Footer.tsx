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
    <footer className="relative mt-20 overflow-hidden bg-primary text-left text-primary-foreground sm:mt-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.05]" />

      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-12 sm:pb-10 sm:pt-16 lg:px-8 lg:pt-20">

        {/* ── Top section: brand + links ── */}
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">

          {/* Brand column */}
          <div className="w-full lg:w-72 lg:shrink-0">
            <div className="[&_a]:text-primary-foreground">
              <Logo inverse />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-primary-foreground/70 sm:mt-5">
              The trusted recruitment platform connecting Canada&rsquo;s exceptional physicians with leading hospitals, clinics and health authorities.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-primary-foreground/80">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 text-accent">
                  <MapPin className="h-3.5 w-3.5" />
                </span>
                <span>100 King St W, Suite 4400<br />Toronto, ON M5X 1A4</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 text-accent">
                  <Phone className="h-3.5 w-3.5" />
                </span>
                <span>+1 (800) 555-0199</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 text-accent">
                  <Mail className="h-3.5 w-3.5" />
                </span>
                <span>hello@candianmdjobs.ca</span>
              </li>
            </ul>

            <div className="mt-6 flex items-center gap-2">
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
          </div>

          {/* Divider on mobile */}
          <div className="h-px w-full bg-primary-foreground/10 lg:hidden" />

          {/* Links grid */}
          <div className="grid flex-1 grid-cols-1 gap-8 min-[400px]:grid-cols-3">
            {sections.map((s) => (
              <div key={s.title}>
                <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{s.title}</h4>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {s.links.map((l) => (
                    <li key={l.to}>
                      <Link
                        to={l.to}
                        className="group inline-flex items-center gap-1 text-primary-foreground/75 transition hover:text-accent"
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
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-12 flex flex-col gap-3 border-t border-primary-foreground/10 pt-6 text-xs text-primary-foreground/50 sm:mt-16 sm:flex-row sm:items-center sm:justify-between">
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
