import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/site/Logo";
import { ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import * as React from "react";

const TRUST = [
  { icon: ShieldCheck, text: "PHIPA & PIPEDA compliant. Bank-grade encryption." },
  { icon: Stethoscope, text: "Trusted by 4,200+ physicians and 380+ employers." },
  { icon: Sparkles, text: "Curated matches. No spam, no cold-calls." },
];

export function AuthLayout({
  eyebrow,
  title,
  subtitle,
  bullets,
  children,
  footerNote,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  bullets?: string[];
  children: React.ReactNode;
  footerNote?: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_1fr]">
        {/* Brand panel */}
        <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:block">
          <div className="absolute inset-0 bg-gradient-hero opacity-95" />
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-[28rem] w-[28rem] rounded-full bg-accent-alt/20 blur-3xl" />

          <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
            <div>
              <Logo inverse />
              <div className="mt-16 max-w-md animate-fade-up">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5" /> {eyebrow}
                </span>
                <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight xl:text-5xl">
                  {title}
                </h1>
                <p className="mt-5 max-w-md text-base leading-relaxed text-primary-foreground/80">{subtitle}</p>
                {bullets && bullets.length > 0 && (
                  <ul className="mt-8 space-y-3">
                    {bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3 text-sm text-primary-foreground/85">
                        <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-none rounded-full bg-accent shadow-glow" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="relative space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
              {TRUST.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3 text-xs text-primary-foreground/85">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-accent/15 text-accent">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="leading-relaxed">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Form panel */}
        <main className="relative flex flex-col">
          <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 lg:hidden">
            <Logo />
            <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-primary">
              ← Back home
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:py-16">
            <div className="w-full max-w-xl animate-fade-up">{children}</div>
          </div>
          {footerNote && (
            <div className="border-t border-border/60 px-6 py-5 text-center text-xs text-muted-foreground sm:px-10">
              {footerNote}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
