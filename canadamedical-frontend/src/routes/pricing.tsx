import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X, Star } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — CandianMdJobs" },
      { name: "description", content: "Simple, transparent pricing for Canadian physician recruitment. No hidden fees." },
    ],
  }),
  component: PricingPage,
});

interface Feature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  price: string;
  cadence: string;
  desc: string;
  features: Feature[];
  cta: string;
  ctaLink: "/register/employer" | "/contact";
  highlight?: boolean;
  badge?: string;
}

const PLANS: Plan[] = [
  {
    name: "Basic",
    price: "Free",
    cadence: "/ trial",
    desc: "Perfect for trying the platform with your first posting",
    cta: "Get Started Free",
    ctaLink: "/register/employer",
    features: [
      { text: "1 Job Posting (30 days)", included: true },
      { text: "Standard listing placement", included: true },
      { text: "Application management", included: true },
      { text: "Email notifications", included: true },
      { text: "Featured placement", included: false },
      { text: "Candidate database access", included: false },
      { text: "Dedicated account manager", included: false },
    ],
  },
  {
    name: "Professional",
    price: "$499",
    cadence: "/ month",
    desc: "For healthcare organizations with regular recruitment needs",
    cta: "Start Professional",
    ctaLink: "/register/employer",
    highlight: true,
    badge: "Most Popular",
    features: [
      { text: "5 Active Job Postings", included: true },
      { text: "Featured listing highlights", included: true },
      { text: "Priority in search results", included: true },
      { text: "Candidate database access", included: true },
      { text: "Applicant tracking tools", included: true },
      { text: "Email + SMS notifications", included: true },
      { text: "Dedicated account manager", included: true },
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    desc: "For large health systems and recruitment agencies with high volume needs",
    cta: "Contact Sales",
    ctaLink: "/contact",
    features: [
      { text: "Unlimited Job Postings", included: true },
      { text: "Homepage featured placement", included: true },
      { text: "Top priority in search results", included: true },
      { text: "Full candidate database access", included: true },
      { text: "Advanced analytics & reporting", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "Custom branding options", included: true },
    ],
  },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="py-16 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            No hidden fees. Choose the plan that fits your recruitment needs.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            All plans include access to our verified physician network.
          </p>
        </div>
      </section>

      {/* Plan cards */}
      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
            {PLANS.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      {/* Bottom note */}
      <section className="border-t border-border py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Physicians always use CandianMdJobs for free — no subscription needed.{" "}
          <Link to="/register/physician" className="font-semibold text-primary hover:underline">
            Create a free physician profile →
          </Link>
        </p>
      </section>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border ${
        plan.highlight
          ? "border-primary bg-primary text-primary-foreground shadow-2xl"
          : "border-border bg-card text-foreground shadow-sm"
      }`}
    >
      {/* Popular badge */}
      {plan.badge && (
        <div className="absolute -top-4 left-0 right-0 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-primary shadow-sm">
            <Star className="h-3 w-3 fill-current" /> {plan.badge}
          </span>
        </div>
      )}

      <div className={`flex flex-col flex-1 p-8 ${plan.badge ? "pt-10" : ""}`}>
        {/* Name & price */}
        <div>
          <h2 className={`text-xl font-bold ${plan.highlight ? "text-primary-foreground" : "text-primary"}`}>
            {plan.name}
          </h2>
          <div className="mt-3 flex items-baseline gap-1">
            <span className={`text-4xl font-extrabold tracking-tight ${plan.highlight ? "text-primary-foreground" : "text-primary"}`}>
              {plan.price}
            </span>
            {plan.cadence && (
              <span className={`text-sm ${plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {plan.cadence}
              </span>
            )}
          </div>
          <p className={`mt-3 text-sm leading-relaxed ${plan.highlight ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
            {plan.desc}
          </p>
        </div>

        {/* Divider */}
        <div className={`my-7 h-px w-full ${plan.highlight ? "bg-white/15" : "bg-border"}`} />

        {/* Features */}
        <ul className="flex-1 space-y-3.5">
          {plan.features.map((f) => (
            <li
              key={f.text}
              className={`flex items-center gap-3 text-sm ${
                f.included
                  ? plan.highlight
                    ? "text-primary-foreground/90"
                    : "text-foreground"
                  : plan.highlight
                  ? "text-primary-foreground/30 line-through"
                  : "text-muted-foreground/50 line-through"
              }`}
            >
              {f.included ? (
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  plan.highlight ? "bg-accent/20 text-accent" : "bg-emerald-100 text-emerald-600"
                }`}>
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              ) : (
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  plan.highlight ? "bg-white/10 text-primary-foreground/30" : "bg-zinc-100 text-zinc-400"
                }`}>
                  <X className="h-3 w-3" strokeWidth={2.5} />
                </span>
              )}
              {f.text}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Link
          to={plan.ctaLink}
          className={`mt-8 inline-flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-bold transition ${
            plan.highlight
              ? "bg-accent text-primary hover:brightness-110"
              : plan.name === "Enterprise"
              ? "border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary-glow"
          }`}
        >
          {plan.cta}
        </Link>
      </div>
    </div>
  );
}
