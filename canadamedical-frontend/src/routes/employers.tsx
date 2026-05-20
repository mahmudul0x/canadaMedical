import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users, Target, ShieldCheck, Clock, BarChart3, Headphones,
  ArrowRight, Check, Quote, Star, Loader2, X, Building2,
  Phone, ChevronRight, CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
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
  id: number; name: string; price_monthly: string;
  is_free: boolean; is_enterprise: boolean; is_popular: boolean;
  job_post_limit: number | null; features: string[]; stripe_price_id: string | null;
}

interface EmployerTestimonial {
  id: number; physician_name: string; testimonial_text: string;
  rating?: number; organization?: string;
}

const STATIC_EMPLOYER_TESTIMONIALS: EmployerTestimonial[] = [
  { id: -1, physician_name: "Chief of Medicine", organization: "Major Ontario Health System", testimonial_text: "We filled a critical vacancy within 3 weeks. The quality of applicants was exceptional — every candidate was already verified and licensure-checked.", rating: 5 },
  { id: -2, physician_name: "VP Medical Affairs", organization: "Vancouver Coastal Health Authority", testimonial_text: "CandianMdJobs cut our time-to-hire from four months to under 30 days. The dedicated account manager understood exactly what we needed.", rating: 5 },
];

function EmployersPage() {
  const { subscription } = Route.useSearch();
  const navigate = useNavigate();
  const toastShown = useRef(false);

  useEffect(() => {
    if (!subscription || toastShown.current) return;
    toastShown.current = true;
    if (subscription === "cancelled") toast.error("Subscription cancelled. You can try again anytime.");
    navigate({ to: "/employers", replace: true } as never);
  }, [subscription, navigate]);

  return (
    <div className="bg-white">

      {/* ── HERO ── */}
      <section className="bg-[#0f1f3d]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20 lg:px-14">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1a6fd4]">For Employers</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Hire exceptional physicians, faster
            </h1>
            <p className="mt-4 text-lg text-white/60">
              Hospitals, clinics, and health authorities partner with CandianMdJobs to fill critical roles across Canada.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register/employer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#1a6fd4] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1560be]">
                Register as Employer <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/8 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/15">
                Talk to Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="bg-[#f8faff] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-14">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1a6fd4]">Why CandianMdJobs</p>
            <h2 className="mt-3 text-3xl font-extrabold text-[#0f1f3d] sm:text-4xl">Everything you need to hire smarter</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a6fd4]/10">
                  <Icon className="h-6 w-6 text-[#1a6fd4]" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#0f1f3d]">{title}</h3>
                <p className="mt-2 text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-[#0f1f3d] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-14">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1a6fd4]">Process</p>
            <h2 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">How it works</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              { n: "01", t: "Create your employer account", d: "Tell us about your facility and the roles you need to fill." },
              { n: "02", t: "Get matched candidates",        d: "Our team curates a shortlist of pre-screened physicians." },
              { n: "03", t: "Interview & hire",              d: "Coordinate interviews and onboarding through one dashboard." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-white/8 bg-[#162647] p-8">
                <div className="text-3xl font-extrabold text-[#1a6fd4]">{s.n}</div>
                <h3 className="mt-3 text-lg font-bold text-white">{s.t}</h3>
                <p className="mt-2 text-sm text-white/50">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <PricingSection />

      {/* ── TESTIMONIALS ── */}
      <EmployerTestimonialsSection />

      {/* ── CTA ── */}
      <section className="bg-[#f8faff] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-14">
          <div className="rounded-3xl bg-[#0f1f3d] px-8 py-14 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1a6fd4]">Get started</p>
            <h2 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">Start hiring physicians today</h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/55">
              Create your free employer account and post your first role in minutes.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/register/employer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#1a6fd4] px-7 py-3 text-sm font-bold text-white transition hover:bg-[#1560be]">
                Register as Employer <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/8 px-7 py-3 text-sm font-bold text-white transition hover:bg-white/15">
                Talk to Sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Enterprise Modal ─────────────────────────────────────────────────────────

interface EnterpriseForm {
  organization_name: string; contact_name: string; contact_email: string;
  contact_phone: string; num_job_posts: string; budget_range: string;
  monthly_hiring_volume: string; message: string;
}

function EnterpriseModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<EnterpriseForm>({
    organization_name: "", contact_name: "", contact_email: "",
    contact_phone: "", num_job_posts: "", budget_range: "",
    monthly_hiring_volume: "", message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ request_id: number } | null>(null);

  function update(k: keyof EnterpriseForm, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, num_job_posts: form.num_job_posts ? parseInt(form.num_job_posts) : null };
      const r = await api.post("/api/subscriptions/enterprise/request/", payload);
      const data = r.data?.data ?? r.data;
      setSubmitted({ request_id: data?.request_id ?? data?.id ?? 1 });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#0f1f3d] placeholder-slate-300 outline-none transition focus:border-[#1a6fd4] focus:ring-2 focus:ring-[#1a6fd4]/10";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-100 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#1a6fd4]" />
            <h2 className="font-bold text-[#0f1f3d]">Enterprise Plan — Contact Sales</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">
          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#0f1f3d]">Request Submitted!</h3>
                <p className="mt-2 text-sm text-slate-500 max-w-xs">Our team will review your request and contact you within 24–48 hours with a custom plan.</p>
                <p className="mt-3 text-xs font-semibold text-slate-400">Request ID: #{submitted.request_id}</p>
              </div>
              <button onClick={onClose} className="mt-2 rounded-xl bg-[#1a6fd4] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#1560be] transition">Close</button>
            </div>
          ) : (
            <>
              <p className="mb-5 text-sm text-slate-500">Tell us about your organization and we'll create a custom plan for you.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Organization Name <span className="text-rose-500 normal-case">*</span></label>
                    <input required value={form.organization_name} onChange={e => update("organization_name", e.target.value)} placeholder="e.g. Toronto Health Network" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Contact Name <span className="text-rose-500 normal-case">*</span></label>
                    <input required value={form.contact_name} onChange={e => update("contact_name", e.target.value)} placeholder="Dr. Jane Smith" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Phone</label>
                    <input type="tel" value={form.contact_phone} onChange={e => update("contact_phone", e.target.value)} placeholder="+1-416-555-0100" className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Contact Email <span className="text-rose-500 normal-case">*</span></label>
                    <input required type="email" value={form.contact_email} onChange={e => update("contact_email", e.target.value)} placeholder="contact@organization.ca" className={inputCls} />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-[#f8faff] p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Hiring Requirements</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Job Posts Needed</label>
                      <input type="number" min="1" value={form.num_job_posts} onChange={e => update("num_job_posts", e.target.value)} placeholder="e.g. 20" className={inputCls} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Volume</label>
                      <input value={form.monthly_hiring_volume} onChange={e => update("monthly_hiring_volume", e.target.value)} placeholder="e.g. 5–10/month" className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Budget Range</label>
                      <input value={form.budget_range} onChange={e => update("budget_range", e.target.value)} placeholder="e.g. $500–1,000/month" className={inputCls} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Additional Notes</label>
                  <textarea value={form.message} onChange={e => update("message", e.target.value)} rows={3}
                    placeholder="Specialty requirements, preferred locations, timeline…"
                    className={`${inputCls} resize-none`} />
                </div>
                <div className="flex gap-3 border-t border-slate-100 pt-4">
                  <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a6fd4] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1560be] transition disabled:opacity-60">
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
  const [loadingPlanId, setLoadingPlanId] = useState<number | null>(null);
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);

  const { data: plans, isLoading } = useQuery<ApiPlan[]>({
    queryKey: ["employer-plans"],
    queryFn: async () => { const r = await api.get("/api/subscriptions/plans/employer/"); const d = r.data?.data ?? r.data; return Array.isArray(d) ? d : []; },
    staleTime: 5 * 60 * 1000,
  });

  async function handlePlanClick(plan: ApiPlan) {
    if (plan.is_free) { navigate({ to: "/register/employer" } as never); return; }
    if (plan.is_enterprise) { setShowEnterpriseModal(true); return; }
    if (!isAuthenticated || userType !== "employer") { navigate({ to: "/register/employer" } as never); return; }
    setLoadingPlanId(plan.id);
    try {
      const r = await api.post("/api/subscriptions/create-checkout/", { plan_id: plan.id });
      const url = r.data?.data?.checkout_url ?? r.data?.checkout_url;
      if (url) window.location.href = url;
      else toast.error("Could not start checkout. Please try again.");
    } catch (err) { toast.error(apiError(err)); }
    finally { setLoadingPlanId(null); }
  }

  function planCta(plan: ApiPlan) {
    if (plan.is_free) return "Get Started Free";
    if (plan.is_enterprise) return "Contact Sales";
    if (isAuthenticated && userType === "employer") return "Upgrade Now";
    return "Start Professional";
  }

  return (
    <>
      {showEnterpriseModal && <EnterpriseModal onClose={() => setShowEnterpriseModal(false)} />}
      <section className="bg-[#f8faff] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-14">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1a6fd4]">Transparent pricing</p>
            <h2 className="mt-3 text-3xl font-extrabold text-[#0f1f3d] sm:text-4xl">Simple, flexible plans</h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-slate-500">Start free and scale as you grow. No hidden fees, no long-term commitments.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {isLoading
              ? [...Array(3)].map((_, i) => <div key={i} className="h-96 animate-pulse rounded-2xl border border-slate-100 bg-white" />)
              : (plans ?? []).map((plan) => {
                  const isPopular = plan.is_popular;
                  const isProcessing = loadingPlanId === plan.id;
                  const priceLabel = plan.is_free ? "$0" : plan.is_enterprise ? "Custom" : `$${Number(plan.price_monthly).toFixed(0)}`;
                  const priceNote = plan.is_free ? "forever" : plan.is_enterprise ? "pricing" : "/month";
                  return (
                    <div key={plan.id} className={`relative flex flex-col rounded-2xl border p-8 transition ${
                      isPopular ? "border-[#1a6fd4] bg-[#0f1f3d] shadow-xl" : "border-slate-100 bg-white shadow-sm hover:shadow-md"
                    }`}>
                      {isPopular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#1a6fd4] px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow">
                            <Star className="h-3 w-3 fill-current" /> Most Popular
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className={`text-xl font-bold ${isPopular ? "text-white" : "text-[#0f1f3d]"}`}>{plan.name}</h3>
                        <div className="mt-4 flex items-end gap-1">
                          <span className={`text-4xl font-extrabold tracking-tight ${isPopular ? "text-white" : "text-[#0f1f3d]"}`}>{priceLabel}</span>
                          <span className={`mb-1 text-sm ${isPopular ? "text-white/50" : "text-slate-400"}`}>{priceNote}</span>
                        </div>
                      </div>
                      <div className={`my-6 h-px w-full ${isPopular ? "bg-white/10" : "bg-slate-100"}`} />
                      <ul className="flex-1 space-y-3">
                        {plan.features.map((f) => (
                          <li key={f} className={`flex items-start gap-3 text-sm ${isPopular ? "text-white/80" : "text-slate-600"}`}>
                            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isPopular ? "bg-[#1a6fd4]/20" : "bg-emerald-50"}`}>
                              <Check className={`h-3 w-3 ${isPopular ? "text-[#1a6fd4]" : "text-emerald-600"}`} strokeWidth={3} />
                            </span>
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button type="button" onClick={() => handlePlanClick(plan)} disabled={isProcessing}
                        className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition disabled:opacity-60 ${
                          isPopular
                            ? "bg-[#1a6fd4] text-white hover:bg-[#1560be]"
                            : "bg-[#0f1f3d] text-white hover:bg-[#162647]"
                        }`}>
                        {isProcessing ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : <>{planCta(plan)} <ArrowRight className="h-4 w-4" /></>}
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
    queryFn: async () => { const r = await api.get("/api/testimonials/?type=employer"); const d = r.data?.data ?? r.data; return Array.isArray(d) ? d : (d?.results ?? []); },
    staleTime: 5 * 60 * 1000,
  });
  const items = (data && data.length > 0) ? data : STATIC_EMPLOYER_TESTIMONIALS;

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-14">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1a6fd4]">Employer stories</p>
          <h2 className="mt-3 text-3xl font-extrabold text-[#0f1f3d] sm:text-4xl">What employers say</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {isLoading
            ? Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-56 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />)
            : items.map((t) => (
                <figure key={t.id} className="relative flex flex-col rounded-2xl border border-slate-100 bg-white p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <Quote className="absolute right-6 top-6 h-10 w-10 rotate-180 text-[#1a6fd4]/10" />
                  {t.rating != null && (
                    <div className="flex gap-1">
                      {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                    </div>
                  )}
                  <blockquote className="relative mt-4 flex-1 text-base italic leading-relaxed text-slate-600">
                    &ldquo;{t.testimonial_text}&rdquo;
                  </blockquote>
                  <figcaption className="mt-6 border-t border-slate-100 pt-4">
                    <div className="text-sm font-bold text-[#0f1f3d]">— {t.physician_name}</div>
                    {t.organization && <div className="mt-0.5 text-xs text-slate-400">{t.organization}</div>}
                  </figcaption>
                </figure>
              ))}
        </div>
      </div>
    </section>
  );
}
