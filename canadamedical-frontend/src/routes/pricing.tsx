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

function AuthPromptModal({ planName, onClose, onLogin, onRegister }: {
  planName: string;
  onClose: () => void;
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 pt-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <LogIn className="h-7 w-7 text-primary" />
          </div>
          <h2 className="mt-4 text-xl font-extrabold text-primary">Sign in to continue</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You need an employer account to get started with the{" "}
            <span className="font-semibold text-foreground">{planName}</span> plan.
          </p>
        </div>

        <div className="space-y-2.5 px-6 pb-6">
          <button
            onClick={onLogin}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary-glow"
          >
            <LogIn className="h-4 w-4" /> Log in to my account
          </button>
          <button
            onClick={onRegister}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary/60 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/40 hover:bg-accent/5"
          >
            <UserPlus className="h-4 w-4" /> Create a free employer account
          </button>
          <p className="pt-1 text-center text-xs text-muted-foreground">
            Physicians always sign up for free —{" "}
            <Link to="/register/physician" className="font-semibold text-primary hover:underline">
              physician registration →
            </Link>
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
    queryFn: async () => {
      const r = await api.get("/api/subscriptions/plans/employer/");
      const d = r.data?.data ?? r.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  async function handlePlanClick(plan: ApiPlan) {
    if (plan.is_enterprise) {
      setShowEnterpriseModal(true);
      return;
    }
    // Not logged in or not an employer — show auth prompt
    if (!isAuthenticated || userType !== "employer") {
      setAuthPromptPlan(plan);
      return;
    }
    // Free plan for authenticated employer → register (they already have an account, go to dashboard)
    if (plan.is_free) {
      navigate({ to: "/dashboard/employer" } as never);
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
    <div className="min-h-screen bg-background">
      {showEnterpriseModal && <EnterpriseModal onClose={() => setShowEnterpriseModal(false)} />}
      {authPromptPlan && (
        <AuthPromptModal
          planName={authPromptPlan.name}
          onClose={() => setAuthPromptPlan(null)}
          onLogin={() => navigate({ to: "/login" } as never)}
          onRegister={() => navigate({ to: "/register/employer" } as never)}
        />
      )}

      {/* Header */}
      <section className="py-10 text-center sm:py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl lg:text-5xl">
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
      <section className="pb-16 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          {isLoading ? (
            <div className="grid gap-6 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
              {(plans ?? []).map((plan) => {
                const isPopular = plan.is_popular;
                const isProcessing = loadingPlanId === plan.id;

                const priceLabel = plan.is_free
                  ? "$0"
                  : plan.is_enterprise
                  ? "Custom"
                  : `$${Number(plan.price_monthly).toFixed(0)}`;

                const priceNote = plan.is_free
                  ? "/ forever"
                  : plan.is_enterprise
                  ? "pricing"
                  : "/ month";

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl border transition ${
                      isPopular
                        ? "border-primary bg-primary text-primary-foreground shadow-2xl"
                        : "border-border bg-card text-foreground shadow-sm hover:border-accent/40 hover:shadow-md"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-0 right-0 flex justify-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-primary shadow-sm">
                          <Star className="h-3 w-3 fill-current" /> Most Popular
                        </span>
                      </div>
                    )}

                    <div className={`flex flex-1 flex-col p-5 sm:p-8 ${isPopular ? "pt-8 sm:pt-10" : ""}`}>
                      {/* Name & price */}
                      <div>
                        <h2 className={`text-xl font-bold ${isPopular ? "text-primary-foreground" : "text-primary"}`}>
                          {plan.name}
                        </h2>
                        <div className="mt-3 flex items-baseline gap-1">
                          <span className={`text-4xl font-extrabold tracking-tight ${isPopular ? "text-primary-foreground" : "text-primary"}`}>
                            {priceLabel}
                          </span>
                          <span className={`text-sm ${isPopular ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {priceNote}
                          </span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className={`my-6 h-px w-full ${isPopular ? "bg-white/15" : "bg-border"}`} />

                      {/* Features */}
                      <ul className="flex-1 space-y-3">
                        {plan.features.map((f) => (
                          <li key={f} className={`flex items-start gap-3 text-sm ${isPopular ? "text-primary-foreground/90" : "text-foreground"}`}>
                            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                              isPopular ? "bg-accent/20 text-accent" : "bg-emerald-100 text-emerald-600"
                            }`}>
                              <Check className="h-3 w-3" strokeWidth={3} />
                            </span>
                            {f}
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      <button
                        type="button"
                        onClick={() => handlePlanClick(plan)}
                        disabled={isProcessing}
                        className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          isPopular
                            ? "bg-accent text-primary hover:brightness-110"
                            : plan.is_enterprise
                            ? "border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground"
                            : "bg-primary text-primary-foreground hover:bg-primary-glow"
                        }`}
                      >
                        {isProcessing ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                        ) : (
                          <>{planCta(plan)} <ArrowRight className="h-4 w-4" /></>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
