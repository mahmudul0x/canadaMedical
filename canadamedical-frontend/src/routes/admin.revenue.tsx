import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  DollarSign, TrendingUp, Users, CreditCard,
  ArrowUpRight, ArrowDownRight, Clock,
  CheckCircle2, XCircle, ChevronRight, BarChart2,
} from "lucide-react";
import { api } from "@/lib/api";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/revenue")({
  component: AdminRevenuePage,
});

interface RevenueOverview {
  total_revenue: number;
  this_month_revenue: number;
  last_month_revenue: number;
  mrr: number;
  active_professional: number;
  active_enterprise: number;
  active_free: number;
  monthly_chart: { month: string; revenue: number; transactions: number }[];
  top_employers: { email: string; name: string; total_paid: number; payment_count: number }[];
  recent_payments: {
    id: number;
    user_id: number;
    email: string;
    name: string;
    amount: number;
    currency: string;
    description: string;
    created_at: string;
  }[];
}

interface UserBilling {
  user: { id: number; email: string; name: string };
  total_paid: number;
  subscription: {
    plan_name: string;
    status: string;
    price_monthly: number;
    is_enterprise: boolean;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
  custom_plan: {
    job_post_limit: number | null;
    price_monthly: number;
    is_active: boolean;
    payment_status: string;
    valid_until: string | null;
    features: string[];
  } | null;
  payments: {
    id: number;
    amount: number;
    currency: string;
    status: string;
    description: string;
    created_at: string;
  }[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency", currency: "CAD", maximumFractionDigits: 0,
  }).format(n);
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ── Billing drawer ────────────────────────────────────────────────────────────
function BillingDrawer({ userId, onClose }: { userId: number; onClose: () => void }) {
  const { data, isLoading } = useQuery<UserBilling>({
    queryKey: ["admin-user-billing", userId],
    queryFn: async () => {
      const r = await api.get(`/api/admin/revenue/user/${userId}/`);
      return r.data?.data ?? r.data;
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="flex w-full max-w-lg flex-col overflow-hidden border-l border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-bold text-primary">Billing History</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition">
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
          </div>
        ) : !data ? null : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* User summary */}
            <div className="rounded-xl border border-border bg-secondary/40 p-4">
              <p className="font-bold text-primary">{data.user.name}</p>
              <p className="text-xs text-muted-foreground">{data.user.email}</p>
              <p className="mt-2 text-2xl font-extrabold text-accent">{fmt(data.total_paid)}</p>
              <p className="text-xs text-muted-foreground">Total paid (all time)</p>
            </div>

            {/* Current subscription */}
            {data.subscription && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Plan</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{data.subscription.plan_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmt(data.subscription.price_monthly)}/mo
                      {data.subscription.current_period_end &&
                        ` · renews ${format(new Date(data.subscription.current_period_end), "MMM d, yyyy")}`}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    data.subscription.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}>
                    {data.subscription.status}
                  </span>
                </div>
              </div>
            )}

            {/* Custom enterprise plan */}
            {data.custom_plan && (
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-violet-600">Enterprise Custom Plan</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Job Limit</p>
                    <p className="font-bold text-foreground">{data.custom_plan.job_post_limit ?? "Unlimited"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Monthly Price</p>
                    <p className="font-bold text-foreground">{fmt(data.custom_plan.price_monthly)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className={`font-bold ${data.custom_plan.is_active ? "text-emerald-600" : "text-amber-600"}`}>
                      {data.custom_plan.is_active ? "Active" : "Pending Payment"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valid Until</p>
                    <p className="font-bold text-foreground">
                      {data.custom_plan.valid_until
                        ? format(new Date(data.custom_plan.valid_until), "MMM d, yyyy")
                        : "No expiry"}
                    </p>
                  </div>
                </div>
                {data.custom_plan.features.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {data.custom_plan.features.map((f) => (
                      <span key={f} className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Payment history */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment History</p>
              {data.payments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No payments yet</p>
              ) : (
                <div className="space-y-2">
                  {data.payments.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        p.status === "succeeded" ? "bg-emerald-100"
                        : p.status === "failed" ? "bg-rose-100"
                        : "bg-amber-100"
                      }`}>
                        {p.status === "succeeded"
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          : p.status === "failed"
                          ? <XCircle className="h-3.5 w-3.5 text-rose-600" />
                          : <Clock className="h-3.5 w-3.5 text-amber-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{p.description || "Payment"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(p.created_at), "MMM d, yyyy · h:mm a")}
                        </p>
                      </div>
                      <p className={`text-sm font-bold shrink-0 ${
                        p.status === "succeeded" ? "text-emerald-600" : "text-rose-500"
                      }`}>
                        {p.status === "succeeded" ? "+" : ""}{fmt(p.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function AdminRevenuePage() {
  const navigate = useNavigate();
  const [drawerUserId, setDrawerUserId] = useState(0);

  const { data, isLoading } = useQuery<RevenueOverview>({
    queryKey: ["admin-revenue"],
    queryFn: async () => {
      const r = await api.get("/api/admin/revenue/");
      return r.data?.data ?? r.data;
    },
    staleTime: 60_000,
  });

  const monthlyMax = Math.max(...(data?.monthly_chart.map((m) => m.revenue) ?? [1]), 1);
  const pct = pctChange(data?.this_month_revenue ?? 0, data?.last_month_revenue ?? 0);

  return (
    <div className="space-y-6">
      {drawerUserId > 0 && (
        <BillingDrawer userId={drawerUserId} onClose={() => setDrawerUserId(0)} />
      )}

      <div>
        <h1 className="text-xl font-bold text-primary">Revenue & Billing</h1>
        <p className="text-sm text-muted-foreground">Platform income overview and per-employer billing history</p>
      </div>

      {/* KPI cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-secondary" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {([
            {
              label: "Total Revenue",
              value: fmt(data?.total_revenue ?? 0),
              sub: "All time",
              icon: DollarSign,
              gradient: "from-emerald-500 to-emerald-600",
              up: undefined as boolean | undefined,
            },
            {
              label: "This Month",
              value: fmt(data?.this_month_revenue ?? 0),
              sub: `${pct >= 0 ? "+" : ""}${pct}% vs last month`,
              icon: TrendingUp,
              gradient: "from-blue-500 to-blue-600",
              up: pct >= 0,
            },
            {
              label: "MRR",
              value: fmt(data?.mrr ?? 0),
              sub: "Monthly recurring revenue",
              icon: BarChart2,
              gradient: "from-violet-500 to-violet-600",
              up: undefined,
            },
            {
              label: "Paid Subscribers",
              value: String((data?.active_professional ?? 0) + (data?.active_enterprise ?? 0)),
              sub: `${data?.active_professional ?? 0} Pro · ${data?.active_enterprise ?? 0} Enterprise`,
              icon: Users,
              gradient: "from-amber-500 to-amber-600",
              up: undefined,
            },
          ] as const).map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${card.gradient} shadow-sm`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <p className="mt-3 text-2xl font-extrabold text-primary">{card.value}</p>
                <p className="text-xs font-semibold text-foreground">{card.label}</p>
                <p className={`flex items-center gap-0.5 text-[11px] font-medium ${
                  card.up === true ? "text-emerald-600"
                  : card.up === false ? "text-rose-500"
                  : "text-muted-foreground"
                }`}>
                  {card.up === true && <ArrowUpRight className="h-3 w-3" />}
                  {card.up === false && <ArrowDownRight className="h-3 w-3" />}
                  {card.sub}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Monthly chart + Top employers */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Bar chart */}
        <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-primary">Monthly Revenue (Last 12 Months)</h2>
          {isLoading ? (
            <div className="h-40 animate-pulse rounded-xl bg-secondary" />
          ) : !data?.monthly_chart.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No revenue data yet</p>
          ) : (
            <div className="flex items-end gap-1.5" style={{ height: "140px" }}>
              {data.monthly_chart.map((m) => {
                const barPct = (m.revenue / monthlyMax) * 100;
                return (
                  <div key={m.month} className="group relative flex flex-1 flex-col items-center justify-end gap-1" style={{ height: "140px" }}>
                    <div
                      className="w-full rounded-t-md bg-accent transition-all duration-300 hover:bg-accent/70 cursor-default"
                      style={{ height: `${Math.max(barPct, 2)}%` }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 pointer-events-none">
                      <div className="rounded-lg bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground whitespace-nowrap shadow">
                        {fmt(m.revenue)}<br />
                        <span className="opacity-70">{m.transactions} payment{m.transactions !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-muted-foreground">{m.month.split(" ")[0]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top employers */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-primary">Top Employers by Revenue</h2>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-secondary" />)}</div>
          ) : !data?.top_employers.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No payments yet</p>
          ) : (
            <div className="space-y-1.5">
              {data.top_employers.map((e, i) => (
                <button
                  key={e.email}
                  onClick={() => {
                    const match = data.recent_payments.find((p) => p.email === e.email);
                    if (match) setDrawerUserId(match.user_id);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl p-2.5 hover:bg-secondary transition text-left"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-xs font-bold text-accent">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{e.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{e.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-emerald-600">{fmt(e.total_paid)}</p>
                    <p className="text-[10px] text-muted-foreground">{e.payment_count} payment{e.payment_count !== 1 ? "s" : ""}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent payments table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-bold text-primary">Recent Payments</h2>
          <CreditCard className="h-4 w-4 text-accent" />
        </div>
        {isLoading ? (
          <div className="p-5 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded bg-secondary" />)}</div>
        ) : !data?.recent_payments.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No payments yet</p>
        ) : (
          <div className="divide-y divide-border">
            {data.recent_payments.map((p) => (
              <button
                key={p.id}
                onClick={() => setDrawerUserId(p.user_id)}
                className="flex w-full items-center gap-4 px-5 py-3.5 hover:bg-secondary/50 transition text-left"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-emerald-600">+{fmt(p.amount)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(p.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Subscription breakdown */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-primary">Subscription Breakdown</h2>
            <p className="text-xs text-muted-foreground">Active employers by plan type</p>
          </div>
          <button
            onClick={() => navigate({ to: "/admin/users" as never })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition"
          >
            <Users className="h-3.5 w-3.5" /> All Users <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Free (Basic)", count: data?.active_free ?? 0, bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400", border: "border-slate-200" },
            { label: "Professional", count: data?.active_professional ?? 0, bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", border: "border-blue-200" },
            { label: "Enterprise", count: data?.active_enterprise ?? 0, bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500", border: "border-violet-200" },
          ].map((item) => (
            <div key={item.label} className={`rounded-xl border ${item.border} ${item.bg} p-4`}>
              <div className="mb-1 flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                <span className={`text-xs font-semibold ${item.text}`}>{item.label}</span>
              </div>
              <p className={`text-3xl font-extrabold ${item.text}`}>{isLoading ? "—" : item.count}</p>
              <p className={`text-[11px] opacity-60 ${item.text}`}>active employers</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
