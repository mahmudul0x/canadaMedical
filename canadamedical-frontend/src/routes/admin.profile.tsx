import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  User as UserIcon, Mail, Phone, Lock,
  CheckCircle2, AlertTriangle, Eye, EyeOff,
  ShieldCheck, Loader2, KeyRound,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { api, apiError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/admin/profile")({
  component: AdminProfilePage,
});

interface AdminProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  date_joined: string;
}

// ── Section header helper ──────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 pb-1">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 shrink-0">
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

function AdminProfilePage() {
  const qc = useQueryClient();
  const { user, setUser } = useAuthStore();

  const { data: profile, isLoading } = useQuery<AdminProfile>({
    queryKey: ["admin", "profile"],
    queryFn: async () => {
      const r = await api.get("/api/admin/profile/");
      return r.data?.data ?? r.data;
    },
    staleTime: 60_000,
  });

  const profileMutation = useMutation({
    mutationFn: (body: Partial<AdminProfile>) => api.put("/api/admin/profile/", body),
    onSuccess: (res) => {
      const d = res.data?.data ?? res.data;
      if (d) setUser({ ...user!, ...d });
      qc.invalidateQueries({ queryKey: ["admin", "profile"] });
      toast.success("Profile updated successfully.");
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const passwordMutation = useMutation({
    mutationFn: (body: { current_password: string; new_password: string; confirm_password: string }) =>
      api.post("/api/admin/profile/change-password/", body),
    onSuccess: () => toast.success("Password changed. You may need to log in again."),
    onError: (e) => toast.error(apiError(e)),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6 lg:p-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl border border-border bg-card shadow-sm" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your admin account details and security settings.</p>
      </div>

      <AccountForm
        profile={profile ?? null}
        submitting={profileMutation.isPending}
        onSubmit={(v) => profileMutation.mutate(v)}
      />

      <PasswordForm
        submitting={passwordMutation.isPending}
        onSubmit={(v) => passwordMutation.mutate(v)}
      />
    </div>
  );
}

// ── Account form ───────────────────────────────────────────────────────────────

function AccountForm({
  profile,
  submitting,
  onSubmit,
}: {
  profile: AdminProfile | null;
  submitting?: boolean;
  onSubmit: (v: Partial<AdminProfile>) => void;
}) {
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
      });
    }
  }, [profile]);

  const isDirty = profile
    ? Object.keys(form).some(
        k => (form as Record<string, string>)[k] !== ((profile as unknown as Record<string, string>)[k] ?? "")
      )
    : false;

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.first_name.trim()) errs.first_name = "First name is required";
    if (!form.last_name.trim()) errs.last_name = "Last name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email address";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  }

  const initials = [form.first_name, form.last_name]
    .filter(Boolean).map(s => s![0]).join("").toUpperCase() || "AD";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Avatar + header card ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-5 flex-wrap">
          {/* Avatar with hover pencil */}
          <div className="relative group shrink-0">
            <div className="h-20 w-20 rounded-full bg-linear-to-br from-primary/80 to-accent flex items-center justify-center shadow-md overflow-hidden">
              <span className="text-2xl font-extrabold text-white">{initials}</span>
            </div>
            {/* Hidden file input — no avatar on User model yet, kept for future */}
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-lg">
              {[form.first_name, form.last_name].filter(Boolean).join(" ") || "Admin User"}
            </p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <ShieldCheck className="h-3 w-3" /> Administrator
              </span>
              {profile?.date_joined && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  <Calendar className="h-3 w-3" /> Joined {format(new Date(profile.date_joined), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>

          {isDirty && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 shrink-0">
              <AlertTriangle className="h-3.5 w-3.5" /> Unsaved changes
            </div>
          )}
        </div>
      </div>

      {/* ── Personal information ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <SectionHeader icon={UserIcon} title="Personal Information" subtitle="Your name and contact details" />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              First Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.first_name}
              onChange={e => set("first_name", e.target.value)}
              placeholder="John"
              className={`w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${errors.first_name ? "border-rose-400 focus:border-rose-400 focus:ring-rose-200" : "border-border focus:border-accent focus:ring-accent/15"}`}
            />
            {errors.first_name && <p className="mt-1 text-xs text-rose-500">{errors.first_name}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Last Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.last_name}
              onChange={e => set("last_name", e.target.value)}
              placeholder="Smith"
              className={`w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${errors.last_name ? "border-rose-400 focus:border-rose-400 focus:ring-rose-200" : "border-border focus:border-accent focus:ring-accent/15"}`}
            />
            {errors.last_name && <p className="mt-1 text-xs text-rose-500">{errors.last_name}</p>}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Email Address <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="email"
              value={form.email}
              onChange={e => set("email", e.target.value)}
              className={`w-full rounded-xl border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:ring-2 ${errors.email ? "border-rose-400 focus:border-rose-400 focus:ring-rose-200" : "border-border focus:border-accent focus:ring-accent/15"}`}
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Phone Number <span className="text-muted-foreground/50 font-normal">(optional)</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="tel"
              value={form.phone}
              onChange={e => set("phone", e.target.value)}
              placeholder="+1 (416) 555-0000"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </div>
        </div>
      </div>

      {/* ── Save bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-6 py-4 shadow-sm">
        <p className="text-xs text-muted-foreground">
          {isDirty
            ? <span className="font-semibold text-amber-600">You have unsaved changes</span>
            : "All changes saved"}
        </p>
        <button
          type="submit"
          disabled={submitting || !isDirty}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting ? "Saving…" : "Save Changes"}
        </button>
      </div>

    </form>
  );
}

// ── Password form ──────────────────────────────────────────────────────────────

function PasswordForm({
  submitting,
  onSubmit,
}: {
  submitting?: boolean;
  onSubmit: (v: { current_password: string; new_password: string; confirm_password: string }) => void;
}) {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [show, setShow] = useState({ current: false, newPwd: false, confirm: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.current_password) errs.current_password = "Required";
    if (!form.new_password) errs.new_password = "Required";
    else if (form.new_password.length < 8) errs.new_password = "At least 8 characters";
    if (!form.confirm_password) errs.confirm_password = "Required";
    else if (form.new_password !== form.confirm_password) errs.confirm_password = "Passwords don't match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
    setForm({ current_password: "", new_password: "", confirm_password: "" });
    setDone(true);
    setTimeout(() => setDone(false), 6000);
  }

  const fields: { key: keyof typeof form; label: string; showKey: keyof typeof show }[] = [
    { key: "current_password", label: "Current Password",     showKey: "current" },
    { key: "new_password",     label: "New Password",         showKey: "newPwd"  },
    { key: "confirm_password", label: "Confirm New Password", showKey: "confirm" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <SectionHeader icon={KeyRound} title="Change Password" subtitle="Update your login credentials" />

      {done && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Password changed successfully.
        </div>
      )}

      <div className="space-y-4">
        {fields.map(({ key, label, showKey }) => (
          <div key={key}>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              {label} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type={show[showKey] ? "text" : "password"}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                className={`w-full rounded-xl border bg-background py-2.5 pl-9 pr-10 text-sm outline-none transition focus:ring-2 ${errors[key] ? "border-rose-400 focus:border-rose-400 focus:ring-rose-200" : "border-border focus:border-accent focus:ring-accent/15"}`}
              />
              <button
                type="button"
                onClick={() => setShow(s => ({ ...s, [showKey]: !s[showKey] }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                tabIndex={-1}
              >
                {show[showKey] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors[key] && <p className="mt-1 text-xs text-rose-500">{errors[key]}</p>}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
        Password must be at least 8 characters. Changing your password will log you out of other sessions.
      </div>

      <div className="flex items-center justify-between gap-4 pt-1">
        <span />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {submitting ? "Updating…" : "Update Password"}
        </button>
      </div>
    </form>
  );
}
