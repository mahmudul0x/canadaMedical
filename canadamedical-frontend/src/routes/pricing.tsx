import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Star, ArrowRight, Loader2, Building2, X, CheckCircle2, ChevronRight, LogIn, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { api, apiError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — CandianMdJobs" },
      { name: "description", content: "Simple, transparent pricing for Canadian physician recruitment. No hidden fees." },
    ],
  }),
  component: PricingPage,
});

interface ApiPlan {
  id: number; name: string; price_monthly: string;
  is_free: boolean; is_enterprise: boolean; is_popular: boolean;
  job_post_limit: number | null; features: string[]; stripe_price_id: string | null;
}

interface EnterpriseForm {
  organization_name: string; contact_name: string; contact_email: string;
  contact_phone: string; num_job_posts: string; budget_range: string;
  monthly_hiring_volume: string; message: string;
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#0f1f3d] placeholder-slate-300 outline-none transition focus:border-[#1a6fd4] focus:ring-2 focus:ring-[#1a6fd4]/10";

function EnterpriseModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<EnterpriseForm>({
    organization_name: "", contact_name: "", contact_email: "",
    contact_phone: "", num_job_posts: "", budget_range: "", monthly_hiring_volume: "", message: "",
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
    } catch (err) { toast.error(apiError(err)); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-100 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#1a6fd4]" />
            <h2 className="font-bold text-[#0f1f3d]">Enterprise Plan — Contact Sales</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-5">
          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100"><CheckCircle2 className="h-8 w-8 text-emerald-600" /></div>
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

function AuthPromptModal({ planName, onClose, onLogin, onRegister }: {
  planName: string; onClose: () => void; onLogin: () => void; onRegister: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-100 bg-white shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition"><X className="h-4 w-4" /></button>
        <div className="p-6 pt-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f0f4ff]">
            <LogIn className="h-7 w-7 text-[#1a6fd4]" />
          </div>
          <h2 className="mt-4 text-xl font-extrabold text-[#0f1f3d]">Sign in to continue</h2>
          <p className="mt-2 text-sm text-slate-500">
            You need an employer account to get started with the{" "}
            <span className="font-semibold text-[#0f1f3d]">{planName}</span> plan.
          </p>
        </div>
        <div className="space-y-2.5 px-6 pb-6">
          <button onClick={onLogin} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a6fd4] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1560be]">
            <LogIn className="h-4 w-4" /> Log in to my account
          </button>
          <button onClick={onRegister} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-[#f8faff]">
            <UserPlus className="h-4 w-4" /> Create a free employer account
          </button>
          <p className="pt-1 text-center text-xs text-slate-400">
            Physicians always sign up for free —{" "}
            <Link to="/register/physician" className="font-semibold text-[#1a6fd4] hover:underline">physician registration →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function PricingPage() {
  const { isAuthenticated, userType } = useAuthStore();
  const navigate = useNavigate();
  const [loadingPlanId, setLoadingPlanId] = useState<number | null>(null);
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const [authPromptPlan, setAuthPromptPlan] = useState<ApiPlan | null>(null);

  const { data: plans, isLoading } = useQuery<ApiPlan[]>({
    queryKey: ["employer-plans"],
    queryFn: async () => { const r = await api.get("/api/subscriptions/plans/employer/"); const d = r.data?.data ?? r.data; return Array.isArray(d) ? d : []; },
    staleTime: 5 * 60 * 1000,
  });

  async function handlePlanClick(plan: ApiPlan) {
    if (plan.is_enterprise) { setShowEnterpriseModal(true); return; }
    if (!isAuthenticated || userType !== "employer") { setAuthPromptPlan(plan); return; }
    if (plan.is_free) { navigate({ to: "/dashboard/employer" } as never); return; }
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
    <div className="bg-white">
      {showEnterpriseModal && <EnterpriseModal onClose={() => setShowEnterpriseModal(false)} />}
      {authPromptPlan && (
        <AuthPromptModal
          planName={authPromptPlan.name}
          onClose={() => setAuthPromptPlan(null)}
          onLogin={() => navigate({ to: "/login" } as never)}
          onRegister={() => navigate({ to: "/register/employer" } as never)}
        />
      )}

      {/* ── HERO ── */}
      <section className="bg-[#0f1f3d] py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1a6fd4]">Transparent pricing</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Simple, Transparent Pricing</h1>
          <p className="mt-4 text-lg text-white/55">No hidden fees. Choose the plan that fits your recruitment needs.</p>
          <p className="mt-1 text-sm text-white/35">All plans include access to our verified physician network.</p>
        </div>
      </section>

      {/* ── PLAN CARDS ── */}
      <section className="bg-[#f8faff] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          {isLoading ? (
            <div className="grid gap-6 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-96 animate-pulse rounded-2xl border border-slate-100 bg-white" />)}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
              {(plans ?? []).map((plan) => {
                const isPopular = plan.is_popular;
                const isProcessing = loadingPlanId === plan.id;
                const priceLabel = plan.is_free ? "$0" : plan.is_enterprise ? "Custom" : `$${Number(plan.price_monthly).toFixed(0)}`;
                const priceNote = plan.is_free ? "/ forever" : plan.is_enterprise ? "pricing" : "/ month";

                return (
                  <div key={plan.id} className={`relative flex flex-col rounded-2xl border transition ${
                    isPopular ? "border-[#1a6fd4] bg-[#0f1f3d] shadow-2xl" : "border-slate-100 bg-white shadow-sm hover:shadow-md"
                  }`}>
                    {isPopular && (
                      <div className="absolute -top-4 left-0 right-0 flex justify-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a6fd4] px-4 py-1.5 text-xs font-bold text-white shadow-sm">
                          <Star className="h-3 w-3 fill-current" /> Most Popular
                        </span>
                      </div>
                    )}
                    <div className={`flex flex-1 flex-col p-8 ${isPopular ? "pt-10" : ""}`}>
                      <div>
                        <h2 className={`text-xl font-bold ${isPopular ? "text-white" : "text-[#0f1f3d]"}`}>{plan.name}</h2>
                        <div className="mt-3 flex items-baseline gap-1">
                          <span className={`text-4xl font-extrabold tracking-tight ${isPopular ? "text-white" : "text-[#0f1f3d]"}`}>{priceLabel}</span>
                          <span className={`text-sm ${isPopular ? "text-white/50" : "text-slate-400"}`}>{priceNote}</span>
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
                            : plan.is_enterprise
                            ? "border-2 border-[#0f1f3d] bg-transparent text-[#0f1f3d] hover:bg-[#0f1f3d] hover:text-white"
                            : "bg-[#0f1f3d] text-white hover:bg-[#162647]"
                        }`}>
                        {isProcessing ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : <>{planCta(plan)} <ArrowRight className="h-4 w-4" /></>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── BOTTOM NOTE ── */}
      <section className="border-t border-slate-100 py-10 text-center bg-white">
        <p className="text-sm text-slate-500">
          Physicians always use CandianMdJobs for free — no subscription needed.{" "}
          <Link to="/register/physician" className="font-semibold text-[#1a6fd4] hover:underline">Create a free physician profile →</Link>
        </p>
      </section>
    </div>
  );
}
