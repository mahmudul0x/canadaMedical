import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users, Target, ShieldCheck, Clock, BarChart3, Headphones,
  ArrowRight, Check, Quote, Star, Loader2, X, Building2,
  Phone, ChevronRight, CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/site/PageHeader";
import { api, apiError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/employers")({
  head: () => ({
    meta: [
      { title: "For Employers — Hire Physicians in Canada | CandianMdJobs" },
      { name: "description", content: "Reach 9,000+ verified Canadian physicians. Post roles, screen candidates, and hire faster with CandianMdJobs." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { subscription?: string } => ({
    subscription: typeof s.subscription === "string" ? s.subscription : undefined,
  }),
  component: EmployersPage,
});

const benefits = [
  { icon: Users,       title: "9,000+ verified physicians",  desc: "Tap into Canada's largest active physician network." },
  { icon: Target,      title: "Specialty-targeted reach",    desc: "Match by sub-specialty, certification, and province." },
  { icon: ShieldCheck, title: "CPSO-verified profiles",      desc: "Every candidate is licensure-checked before contact." },
  { icon: Clock,       title: "Fill 4× faster",              desc: "Average time-to-hire of 28 days vs. industry 4 months." },
  { icon: BarChart3,   title: "Real-time analytics",         desc: "Dashboard tracks views, applications, and pipeline." },
  { icon: Headphones,  title: "Dedicated recruiter",         desc: "A named partner shepherds every search." },
];

interface ApiPlan {
  id: number;
  name: string;
  price_monthly: string;
  is_free: boolean;
  is_enterprise: boolean;
  is_popular: boolean;
  job_post_limit: number | null;
  features: string[];
  stripe_price_id: string | null;
}

interface EmployerTestimonial {
  id: number;
  physician_name: string;
  testimonial_text: string;
  rating?: number;
  organization?: string;
}

const STATIC_EMPLOYER_TESTIMONIALS: EmployerTestimonial[] = [
  {
    id: -1,
    physician_name: "Chief of Medicine",
    organization: "Major Ontario Health System",
    testimonial_text: "We filled a critical vacancy within 3 weeks. The quality of applicants was exceptional — every candidate was already verified and licensure-checked.",
    rating: 5,
  },
  {
    id: -2,
    physician_name: "VP Medical Affairs",
    organization: "Vancouver Coastal Health Authority",
    testimonial_text: "CandianMdJobs cut our time-to-hire from four months to under 30 days. The dedicated account manager understood exactly what we needed.",
    rating: 5,
  },
];

function EmployersPage() {
  const { subscription } = Route.useSearch();
  const navigate = useNavigate();
  const toastShown = useRef(false);

  useEffect(() => {
    if (!subscription || toastShown.current) return;
    toastShown.current = true;
    if (subscription === "cancelled") {
      toast.error("Subscription cancelled. You can try again anytime.");
    }
    navigate({ to: "/employers", replace: true } as never);
  }, [subscription, navigate]);

  return (
    <div>
      <PageHeader
        eyebrow="For Employers"
        title="Hire exceptional physicians, faster"
        subtitle="Hospitals, clinics, and health authorities partner with CandianMdJobs to fill critical roles across Canada."
      />

      {/* Benefits */}
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 transition hover:border-accent hover:shadow-(--shadow-card)">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-primary">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8">
        <div className="grid gap-6 rounded-3xl border border-border bg-secondary/60 p-8 lg:grid-cols-3 lg:p-12">
          {[
            { n: "01", t: "Create your employer account", d: "Tell us about your facility and the roles you need to fill." },
            { n: "02", t: "Get matched candidates",        d: "Our team curates a shortlist of pre-screened physicians." },
            { n: "03", t: "Interview & hire",              d: "Coordinate interviews and onboarding through one dashboard." },
          ].map((s) => (
            <div key={s.n}>
              <div className="text-3xl font-bold text-accent">{s.n}</div>
              <h3 className="mt-2 text-xl font-bold text-primary">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Plans — live from API */}
      <PricingSection />

      {/* Employer Testimonials */}
      <EmployerTestimonialsSection />

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 lg:px-8">
        <div className="rounded-3xl bg-linear-to-br from-primary to-primary-glow p-10 text-center text-primary-foreground shadow-(--shadow-elegant) lg:p-14">
          <h2 className="text-3xl font-bold sm:text-4xl">Start hiring physicians today</h2>
          <p className="mx-auto mt-3 max-w-2xl text-primary-foreground/80">
            Create your free employer account and post your first role in minutes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/register/employer" className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-semibold text-accent-foreground hover:brightness-110">
              Register as Employer <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/contact" className="rounded-lg border border-primary-foreground/40 bg-primary-foreground/10 px-6 py-3 font-semibold text-primary-foreground hover:bg-primary-foreground/20">
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Enterprise Request Modal ─────────────────────────────────────────────────

interface EnterpriseForm {
  organization_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  num_job_posts: string;
  budget_range: string;
  monthly_hiring_volume: string;
  message: string;
}

function EnterpriseModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<EnterpriseForm>({
    organization_name: "", contact_name: "", contact_email: "",
    contact_phone: "", num_job_posts: "", budget_range: "",
    monthly_hiring_volume: "", message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ request_id: number } | null>(null);

  function update(k: keyof EnterpriseForm, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        num_job_posts: form.num_job_posts ? parseInt(form.num_job_posts) : null,
      };
      const r = await api.post("/api/subscriptions/enterprise/request/", payload);
      const data = r.data?.data ?? r.data;
      setSubmitted({ request_id: data?.request_id ?? data?.id ?? 1 });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-accent" />
            <h2 className="font-bold text-foreground">Enterprise Plan — Contact Sales</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary">Request Submitted!</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                  Our team will review your request and contact you within 24–48 hours with a custom plan tailored to your organization's needs.
                </p>
                <p className="mt-3 text-xs font-semibold text-muted-foreground">Request ID: #{submitted.request_id}</p>
              </div>
              <button onClick={onClose} className="mt-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-glow transition">
                Close
              </button>
            </div>
          ) : (
            <>
              <p className="mb-5 text-sm text-muted-foreground">Tell us about your organization and we'll create a custom plan for you.</p>
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Contact info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Organization Name <span className="text-rose-500">*</span></label>
                    <input required value={form.organization_name} onChange={e => update("organization_name", e.target.value)}
                      placeholder="e.g. Toronto Health Network"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Contact Name <span className="text-rose-500">*</span></label>
                    <input required value={form.contact_name} onChange={e => update("contact_name", e.target.value)}
                      placeholder="Dr. Jane Smith"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Phone</label>
                    <input type="tel" value={form.contact_phone} onChange={e => update("contact_phone", e.target.value)}
                      placeholder="+1-416-555-0100"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Contact Email <span className="text-rose-500">*</span></label>
                    <input required type="email" value={form.contact_email} onChange={e => update("contact_email", e.target.value)}
                      placeholder="contact@organization.ca"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" />
                  </div>
                </div>

                {/* Hiring requirements */}
                <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wide">Hiring Requirements</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Job Posts Needed</label>
                      <input type="number" min="1" value={form.num_job_posts} onChange={e => update("num_job_posts", e.target.value)}
                        placeholder="e.g. 20"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Monthly Hiring Volume</label>
                      <input value={form.monthly_hiring_volume} onChange={e => update("monthly_hiring_volume", e.target.value)}
                        placeholder="e.g. 5–10 physicians/month"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Budget Range</label>
                      <input value={form.budget_range} onChange={e => update("budget_range", e.target.value)}
                        placeholder="e.g. $500–1,000/month or flexible"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" />
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Additional Notes</label>
                  <textarea value={form.message} onChange={e => update("message", e.target.value)} rows={3}
                    placeholder="Specialty requirements, preferred locations, timeline, or anything else…"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15 resize-none" />
                </div>

                <div className="flex gap-3 border-t border-border pt-4">
                  <button type="button" onClick={onClose}
                    className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-primary hover:brightness-110 transition disabled:opacity-60">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                    Submit Request
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PricingSection() {
  const { isAuthenticated, userType } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loadingPlanId, setLoadingPlanId] = useState<number | null>(null);
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);

  const { data: plans, isLoading } = useQuery<ApiPlan[]>({
    queryKey: ["employer-plans"],
    queryFn: async () => {
      const r = await api.get("/api/subscriptions/plans/employer/");
      const d = r.data?.data ?? r.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  async function handlePlanClick(plan: ApiPlan) {
    // Free plan → register
    if (plan.is_free) {
      navigate({ to: "/register/employer" } as never);
      return;
    }
    // Enterprise → open modal
    if (plan.is_enterprise) {
      setShowEnterpriseModal(true);
      return;
    }
    // Paid plan
    if (!isAuthenticated || userType !== "employer") {
      navigate({ to: "/register/employer" } as never);
      return;
    }
    setLoadingPlanId(plan.id);
    try {
      const r = await api.post("/api/subscriptions/create-checkout/", { plan_id: plan.id });
      const url = r.data?.data?.checkout_url ?? r.data?.checkout_url;
      if (url) {
        window.location.href = url;
      } else {
        toast.error("Could not start checkout. Please try again.");
      }
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoadingPlanId(null);
    }
  }

  function planCta(plan: ApiPlan): string {
    if (plan.is_free) return "Get Started Free";
    if (plan.is_enterprise) return "Contact Sales";
    if (isAuthenticated && userType === "employer") return "Upgrade Now";
    return "Start Professional";
  }

  return (
    <>
      {showEnterpriseModal && <EnterpriseModal onClose={() => setShowEnterpriseModal(false)} />}
    <section className="bg-secondary/40 py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Transparent pricing</p>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
            Simple, flexible plans
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Start free and scale as you grow. No hidden fees, no long-term commitments.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {isLoading
            ? [...Array(3)].map((_, i) => (
                <div key={i} className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
              ))
            : (plans ?? []).map((plan) => {
                const isPopular = plan.is_popular;
                const isProcessing = loadingPlanId === plan.id;

                const priceLabel = plan.is_free
                  ? "$0"
                  : plan.is_enterprise
                  ? "Custom"
                  : `$${Number(plan.price_monthly).toFixed(0)}`;

                const priceNote = plan.is_free
                  ? "forever"
                  : plan.is_enterprise
                  ? "pricing"
                  : "/month";

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl border p-8 transition ${
                      isPopular
                        ? "border-accent bg-card ring-1 ring-accent shadow-lg"
                        : "border-border bg-card hover:border-accent/40 hover:shadow-md"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center rounded-full bg-accent px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-primary shadow">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div>
                      <h3 className="text-xl font-bold text-primary">{plan.name}</h3>
                      <div className="mt-4 flex items-end gap-1">
                        <span className="text-4xl font-extrabold tracking-tight text-primary">{priceLabel}</span>
                        <span className="mb-1 text-sm text-muted-foreground">{priceNote}</span>
                      </div>
                    </div>

                    <ul className="mt-8 flex-1 space-y-3">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm text-foreground">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                            <Check className="h-3 w-3" />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => handlePlanClick(plan)}
                      disabled={isProcessing}
                      className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isPopular
                          ? "bg-accent text-primary hover:brightness-110 shadow-sm"
                          : "border border-border bg-secondary text-foreground hover:border-accent/50 hover:bg-accent/5"
                      }`}
                    >
                      {isProcessing ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                      ) : (
                        <>{planCta(plan)} <ArrowRight className="h-4 w-4" /></>
                      )}
                    </button>
                  </div>
                );
              })}
        </div>
      </div>
    </section>
    </>
  );
}

function EmployerTestimonialsSection() {
  const { data, isLoading } = useQuery<EmployerTestimonial[]>({
    queryKey: ["employer-testimonials"],
    queryFn: async () => {
      const r = await api.get("/api/testimonials/?type=employer");
      const d = r.data?.data ?? r.data;
      return Array.isArray(d) ? d : (d?.results ?? []);
    },
    staleTime: 5 * 60 * 1000,
  });

  const items = (data && data.length > 0) ? data : STATIC_EMPLOYER_TESTIMONIALS;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 lg:px-8">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Employer stories</p>
        <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
          What employers say
        </h2>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl border border-border bg-secondary" />
            ))
          : items.map((t) => (
              <figure
                key={t.id}
                className="relative flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <Quote className="absolute right-6 top-6 h-10 w-10 rotate-180 text-accent/15" />
                {t.rating != null && (
                  <div className="flex gap-1 text-accent">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                )}
                <blockquote className="relative mt-4 flex-1 text-base italic leading-relaxed text-foreground/85">
                  &ldquo;{t.testimonial_text}&rdquo;
                </blockquote>
                <figcaption className="mt-6 border-t border-border pt-4">
                  <div className="text-sm font-bold text-primary">— {t.physician_name}</div>
                  {t.organization && (
                    <div className="mt-0.5 text-xs text-muted-foreground">{t.organization}</div>
                  )}
                </figcaption>
              </figure>
            ))}
      </div>
    </section>
  );
}
