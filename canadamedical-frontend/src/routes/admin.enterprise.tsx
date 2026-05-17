import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  Building2, Check, X, Eye, Clock, Search,
  CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp,
  DollarSign, Users, Calendar, Pencil, RotateCcw, AlertTriangle,
} from "lucide-react";
import { api, apiError } from "@/lib/api";

export const Route = createFileRoute("/admin/enterprise")({
  component: AdminEnterprisePage,
});

type RequestStatus = "pending" | "reviewing" | "approved" | "rejected" | "revoked";

interface EnterpriseRequest {
  id: number;
  organization_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  monthly_hiring_volume: string;
  monthly_hiring_volume_display?: string;
  message?: string;
  status: RequestStatus;
  custom_job_limit?: number | null;
  custom_price_monthly?: string | null;
  custom_features?: string[];
  admin_notes?: string;
  approved_by_email?: string;
  approved_at?: string;
  rejected_reason?: string;
  revoked_by_email?: string;
  revoked_at?: string;
  custom_payment_status?: "pending_payment" | "paid" | "free" | "revoked" | null;
  custom_payment_link?: string | null;
  created_at: string;
}

interface CustomPlan {
  id: number;
  user_email?: string;
  job_post_limit: number | null;
  price_monthly: string;
  features: string[];
  is_active: boolean;
  valid_until: string | null;
  jobs_posted?: number;
  created_at: string;
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "reviewing", label: "Reviewing" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "revoked", label: "Revoked" },
];

const STATUS_META: Record<RequestStatus, { bg: string; color: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending:   { bg: "bg-amber-100",   color: "text-amber-800",   label: "Pending",   icon: Clock },
  reviewing: { bg: "bg-blue-100",    color: "text-blue-800",    label: "Reviewing", icon: Search },
  approved:  { bg: "bg-emerald-100", color: "text-emerald-800", label: "Approved",  icon: CheckCircle2 },
  rejected:  { bg: "bg-rose-100",    color: "text-rose-800",    label: "Rejected",  icon: XCircle },
  revoked:   { bg: "bg-slate-100",   color: "text-slate-700",   label: "Revoked",   icon: RotateCcw },
};

function StatusPill({ status }: { status: RequestStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.pending;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.bg} ${m.color}`}>
      <Icon className="h-3 w-3" /> {m.label}
    </span>
  );
}

// ─── Approve Modal ────────────────────────────────────────────────────────────

function ApproveModal({ request, onClose, onDone }: { request: EnterpriseRequest; onClose: () => void; onDone: () => void }) {
  const [jobLimit, setJobLimit] = useState(String(request.custom_job_limit ?? "20"));
  const [price, setPrice] = useState(request.custom_price_monthly ?? "799.00");
  const [featuresText, setFeaturesText] = useState(
    (request.custom_features?.length ? request.custom_features : ["20 Active Job Postings", "Priority support", "Dedicated account manager"]).join("\n")
  );
  const [validUntil, setValidUntil] = useState(request.approved_at ? "" : "");
  const [adminNotes, setAdminNotes] = useState(request.admin_notes ?? "");
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    try {
      await api.patch(`/api/subscriptions/admin/enterprise/requests/${request.id}/approve/`, {
        custom_job_limit: jobLimit ? Number(jobLimit) : null,
        custom_price_monthly: price || "0",
        custom_features: featuresText.split("\n").map(l => l.trim()).filter(Boolean),
        admin_notes: adminNotes,
        ...(validUntil ? { valid_until: validUntil } : {}),
      });
      toast.success("Enterprise request approved and custom plan activated.");
      onDone();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    const reason = prompt("Reason for rejection (optional):");
    if (reason === null) return;
    setLoading(true);
    try {
      await api.patch(`/api/subscriptions/admin/enterprise/requests/${request.id}/reject/`, { rejected_reason: reason });
      toast.success("Request rejected.");
      onDone();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkReviewing() {
    setLoading(true);
    try {
      await api.patch(`/api/subscriptions/admin/enterprise/requests/${request.id}/review/`);
      toast.success("Marked as reviewing.");
      onDone();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    const alreadyPaid = request.custom_payment_status === "paid";
    const confirmMsg = alreadyPaid
      ? "⚠️ This customer has ALREADY PAID. Revoking will issue a full Stripe refund and downgrade them to the free plan.\n\nAre you sure?"
      : "Revoke this approval? The payment link will be deactivated and the customer cannot pay.\n\nAre you sure?";
    if (!window.confirm(confirmMsg)) return;
    setLoading(true);
    try {
      await api.patch(`/api/subscriptions/admin/enterprise/requests/${request.id}/revoke/`);
      toast.success(alreadyPaid ? "Approval revoked and refund issued." : "Approval revoked. Payment link deactivated.");
      onDone();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-bold text-foreground">Enterprise Request — {request.organization_name}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Request details */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2 text-sm">
            {[
              { label: "Organization", value: request.organization_name },
              { label: "Contact", value: request.contact_name },
              { label: "Email", value: request.contact_email },
              { label: "Phone", value: request.contact_phone || "—" },
              { label: "Volume", value: request.monthly_hiring_volume_display || request.monthly_hiring_volume },
              { label: "Submitted", value: format(new Date(request.created_at), "MMM d, yyyy") },
            ].map(row => (
              <div key={row.label} className="flex gap-3">
                <span className="w-24 shrink-0 font-semibold text-muted-foreground">{row.label}</span>
                <span className="text-foreground">{row.value}</span>
              </div>
            ))}
            {request.message && (
              <div className="pt-2 border-t border-border">
                <p className="font-semibold text-muted-foreground text-xs mb-1">Message</p>
                <p className="italic text-foreground/80">"{request.message}"</p>
              </div>
            )}
          </div>

          {/* Admin settings */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Admin Custom Settings</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Custom Job Post Limit <span className="text-muted-foreground/60">(leave empty for unlimited)</span></label>
                <div className="relative">
                  <input type="number" min={1} value={jobLimit} onChange={e => setJobLimit(e.target.value)}
                    placeholder="e.g. 20"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">jobs/month</span>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Custom Monthly Price</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input type="number" min={0} step={0.01} value={price} onChange={e => setPrice(e.target.value)}
                    placeholder="799.00"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Custom Features <span className="text-muted-foreground/60">(one per line)</span></label>
                <textarea value={featuresText} onChange={e => setFeaturesText(e.target.value)} rows={5} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15 resize-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Valid Until <span className="text-muted-foreground/60">(optional)</span></label>
                <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Internal Notes <span className="text-muted-foreground/60">(not shown to user)</span></label>
                <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2} placeholder="e.g. Large health network, negotiated rate..." className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15 resize-none" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {/* ── Revoked state ── */}
            {request.status === "revoked" && (
              <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600">
                <RotateCcw className="h-4 w-4" /> Approval Revoked
                {request.revoked_by_email && (
                  <span className="text-xs font-normal text-slate-400">by {request.revoked_by_email}</span>
                )}
              </span>
            )}

            {/* ── Approved state ── */}
            {request.status === "approved" && (
              <>
                <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {request.custom_payment_status === "paid" ? "Paid & Active" : "Approved — Awaiting Payment"}
                </span>
                {/* Revoke button — not paid yet */}
                {request.custom_payment_status === "pending_payment" && (
                  <button
                    onClick={handleRevoke}
                    disabled={loading}
                    className="ml-auto inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Revoke Approval
                  </button>
                )}
                {/* Revoke + Refund button — already paid */}
                {request.custom_payment_status === "paid" && (
                  <button
                    onClick={handleRevoke}
                    disabled={loading}
                    className="ml-auto inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                    Revoke &amp; Refund
                  </button>
                )}
              </>
            )}

            {/* ── Pending / Reviewing / Rejected states ── */}
            {request.status !== "approved" && request.status !== "revoked" && (
              <>
                {request.status !== "rejected" && (
                  <button onClick={handleReject} disabled={loading} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition disabled:opacity-60">
                    Reject
                  </button>
                )}
                {request.status !== "reviewing" && request.status !== "rejected" && (
                  <button onClick={handleMarkReviewing} disabled={loading} className="rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition disabled:opacity-60">
                    Mark Reviewing
                  </button>
                )}
                <button onClick={handleApprove} disabled={loading} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-60">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Approve Plan
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Custom Plan Modal ───────────────────────────────────────────────────

function EditPlanModal({ plan, onClose, onDone }: { plan: CustomPlan; onClose: () => void; onDone: () => void }) {
  const [jobLimit, setJobLimit] = useState(String(plan.job_post_limit ?? ""));
  const [validUntil, setValidUntil] = useState(plan.valid_until ?? "");
  const [isActive, setIsActive] = useState(plan.is_active);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      await api.patch(`/api/subscriptions/admin/enterprise/custom-plans/${plan.id}/`, {
        job_post_limit: jobLimit ? Number(jobLimit) : null,
        valid_until: validUntil || null,
        is_active: isActive,
      });
      toast.success("Custom plan updated.");
      onDone();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-bold text-foreground">Edit Custom Plan</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted-foreground">{plan.user_email}</p>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Job Post Limit <span className="text-muted-foreground/60">(empty = unlimited)</span></label>
            <input type="number" min={1} value={jobLimit} onChange={e => setJobLimit(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Valid Until</label>
            <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" />
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-3 py-2.5 hover:bg-secondary/40 transition">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 rounded accent-accent" />
            <span className="text-sm font-semibold text-foreground">Plan Active</span>
          </label>
          <div className="flex gap-3 border-t border-border pt-4">
            <button onClick={onClose} className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-glow transition disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function AdminEnterprisePage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [subTab, setSubTab] = useState<"requests" | "plans">("requests");
  const [selectedRequest, setSelectedRequest] = useState<EnterpriseRequest | null>(null);
  const [editPlan, setEditPlan] = useState<CustomPlan | null>(null);

  const { data: requests = [], isLoading } = useQuery<EnterpriseRequest[]>({
    queryKey: ["enterprise-requests", activeTab],
    queryFn: async () => {
      const params = activeTab !== "all" ? { status: activeTab } : {};
      const r = await api.get("/api/subscriptions/admin/enterprise/requests/", { params });
      const d = r.data?.data ?? r.data;
      return Array.isArray(d) ? d : (d?.results ?? []);
    },
  });

  const { data: customPlans = [], isLoading: plansLoading } = useQuery<CustomPlan[]>({
    queryKey: ["enterprise-custom-plans"],
    queryFn: async () => {
      const r = await api.get("/api/subscriptions/admin/enterprise/custom-plans/");
      const d = r.data?.data ?? r.data;
      return Array.isArray(d) ? d : (d?.results ?? []);
    },
    enabled: subTab === "plans",
  });

  const pendingCount = requests.filter(r => r.status === "pending").length;

  async function handleQuickAction(id: number, action: "review" | "reject") {
    try {
      if (action === "review") {
        await api.patch(`/api/subscriptions/admin/enterprise/requests/${id}/review/`);
        toast.success("Marked as reviewing.");
      } else {
        const reason = prompt("Reason for rejection (optional):");
        if (reason === null) return;
        await api.patch(`/api/subscriptions/admin/enterprise/requests/${id}/reject/`, { rejected_reason: reason });
        toast.success("Request rejected.");
      }
      qc.invalidateQueries({ queryKey: ["enterprise-requests"] });
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <div className="p-6 space-y-6">
      {selectedRequest && (
        <ApproveModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onDone={() => { setSelectedRequest(null); qc.invalidateQueries({ queryKey: ["enterprise-requests"] }); qc.invalidateQueries({ queryKey: ["enterprise-custom-plans"] }); }}
        />
      )}
      {editPlan && (
        <EditPlanModal
          plan={editPlan}
          onClose={() => setEditPlan(null)}
          onDone={() => { setEditPlan(null); qc.invalidateQueries({ queryKey: ["enterprise-custom-plans"] }); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Building2 className="h-6 w-6 text-accent" /> Enterprise Requests
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">{pendingCount}</span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage enterprise plan requests and active custom plans</p>
        </div>
      </div>

      {/* Sub-tab toggle */}
      <div className="flex gap-1 rounded-xl border border-border bg-secondary/40 p-1 w-fit">
        {([["requests", "Requests"], ["plans", "Active Custom Plans"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setSubTab(id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${subTab === id ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {subTab === "requests" && (
        <>
          {/* Status tabs */}
          <div className="flex flex-wrap gap-1">
            {STATUS_TABS.map(t => (
              <button key={t.value} onClick={() => setActiveTab(t.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${activeTab === t.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Requests table */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary" />)}</div>
            ) : requests.length === 0 ? (
              <div className="py-16 text-center">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 font-semibold text-foreground">No enterprise requests</p>
                <p className="text-sm text-muted-foreground mt-1">{activeTab !== "all" ? `No ${activeTab} requests` : "Requests will appear here"}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-secondary/30 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Organization</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Volume</th>
                      <th className="px-4 py-3">Submitted</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {requests.map(req => (
                      <tr key={req.id} className="hover:bg-secondary/20 transition">
                        <td className="px-4 py-3 text-muted-foreground">#{req.id}</td>
                        <td className="px-4 py-3 font-semibold text-foreground max-w-48">
                          <p className="truncate">{req.organization_name}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <p className="font-medium text-foreground">{req.contact_name}</p>
                          <p className="text-xs">{req.contact_email}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {req.monthly_hiring_volume_display || req.monthly_hiring_volume}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {format(new Date(req.created_at), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={req.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => setSelectedRequest(req)} title="View & Approve"
                              className="rounded-lg p-1.5 text-primary hover:bg-secondary transition" aria-label="View">
                              <Eye className="h-4 w-4" />
                            </button>
                            {req.status !== "reviewing" && req.status !== "approved" && req.status !== "rejected" && (
                              <button onClick={() => handleQuickAction(req.id, "review")} title="Mark Reviewing"
                                className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 transition" aria-label="Review">
                                <Search className="h-4 w-4" />
                              </button>
                            )}
                            {req.status !== "rejected" && req.status !== "approved" && (
                              <button onClick={() => handleQuickAction(req.id, "reject")} title="Reject"
                                className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 transition" aria-label="Reject">
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {subTab === "plans" && (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {plansLoading ? (
            <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary" />)}</div>
          ) : customPlans.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 font-semibold text-foreground">No active custom plans</p>
              <p className="text-sm text-muted-foreground mt-1">Approved enterprise requests will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-secondary/30 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3 text-center">Job Limit</th>
                    <th className="px-4 py-3 text-center">Price/mo</th>
                    <th className="px-4 py-3 text-center">Valid Until</th>
                    <th className="px-4 py-3 text-center">Active</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customPlans.map(plan => (
                    <tr key={plan.id} className="hover:bg-secondary/20 transition">
                      <td className="px-4 py-3 font-medium text-foreground">{plan.user_email ?? "—"}</td>
                      <td className="px-4 py-3 text-center font-semibold text-foreground">{plan.job_post_limit ?? "∞"}</td>
                      <td className="px-4 py-3 text-center text-foreground">${plan.price_monthly}/mo</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {plan.valid_until ? format(new Date(plan.valid_until), "MMM d, yyyy") : "No expiry"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${plan.is_active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          {plan.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button onClick={() => setEditPlan(plan)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:border-primary/30 hover:text-primary transition">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
