import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  MapPin, Briefcase, Building2, DollarSign, Clock, ArrowLeft,
  Share2, Bookmark, BookmarkCheck, Stethoscope, Lock,
  ChevronRight, AlertCircle, CheckCircle2, Upload, X,
  FileText, Phone, Linkedin, Calendar, Globe, Home,
  ChevronLeft, Send, Eye, Users, Star, Printer, Loader2,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { api, apiError, extractData } from "@/lib/api";

export const Route = createFileRoute("/jobs/$jobId")({
  component: JobDetailPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold text-primary">Job not found</h1>
      <p className="mt-3 text-muted-foreground">This position may have been filled or removed.</p>
      <Link to="/jobs" className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary-glow">
        Browse all jobs
      </Link>
    </div>
  ),
});

interface JobDetail {
  id: number;
  title: string;
  specialty?: string;
  specialty_display?: string;
  sub_specialty?: string;
  province?: string;
  province_display?: string;
  city?: string;
  location_display?: string;
  description?: string;
  qualifications?: string;
  requirements?: string;
  responsibilities?: string;
  compensation?: string;
  benefits?: string;
  application_deadline?: string;
  contact_person?: string;
  contact_email?: string;
  job_type?: string;
  job_type_display?: string;
  practice_setting?: string;
  practice_setting_display?: string;
  required_experience?: string;
  required_experience_display?: string;
  salary_min?: number;
  salary_max?: number;
  salary_display?: string;
  compensation_model?: string;
  compensation_model_display?: string;
  employer_name?: string;
  employer_type?: string;
  employer_website?: string;
  remote_option?: boolean;
  relocation_assistance?: boolean;
  is_featured?: boolean;
  is_active?: boolean;
  views_count?: number;
  total_applications?: number;
  created_at?: string;
  updated_at?: string;
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function formatSalary(min?: number, max?: number, display?: string): string | null {
  if (display) return display;
  const fmt = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n.toLocaleString()}`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}/yr`;
  if (min != null) return `From ${fmt(min)}/yr`;
  if (max != null) return `Up to ${fmt(max)}/yr`;
  return null;
}

function TextBlock({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {text.split("\n").filter(Boolean).map((line, i) => {
        const clean = line.replace(/^[-•*]\s*/, "").trim();
        if (!clean) return null;
        const isBullet = /^[-•*]/.test(line.trim());
        return isBullet ? (
          <div key={i} className="flex items-start gap-2.5 text-sm text-foreground/85">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>{clean}</span>
          </div>
        ) : (
          <p key={i} className="text-sm text-foreground/85 leading-relaxed">{clean}</p>
        );
      })}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function JobDetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-56 bg-primary/80" />
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => <div key={i} className="h-4 rounded bg-secondary" style={{ width: `${70 + (i % 3) * 10}%` }} />)}
          </div>
          <div className="space-y-4">
            <div className="h-48 rounded-2xl bg-secondary" />
            <div className="h-32 rounded-2xl bg-secondary" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Apply Modal ─────────────────────────────────────────────────────────────

type ApplyStep = "profile_check" | "resume" | "details" | "cover_letter" | "review";

interface ApplyFormState {
  resume: File | null;
  useProfileResume: boolean;
  phone: string;
  years_experience: string;
  linkedin_url: string;
  availability_date: string;
  willing_to_relocate: boolean;
  cover_letter: string;
}

const STEP_ORDER: ApplyStep[] = ["profile_check", "resume", "details", "cover_letter", "review"];
const STEP_LABELS: Record<ApplyStep, string> = {
  profile_check: "Profile",
  resume: "Resume",
  details: "Details",
  cover_letter: "Cover Letter",
  review: "Review",
};

function ApplyModal({ job, onClose, onSuccess }: { job: JobDetail; onClose: () => void; onSuccess: () => void }) {
  const { isAuthenticated, userType } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ApplyStep>("profile_check");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ApplyFormState>({
    resume: null,
    useProfileResume: true,
    phone: "",
    years_experience: "",
    linkedin_url: "",
    availability_date: "",
    willing_to_relocate: false,
    cover_letter: "",
  });

  const { data: profile } = useQuery({
    queryKey: ["physician-profile"],
    queryFn: async () => {
      const r = await api.get("/api/profile/physician/");
      return r.data?.data ?? r.data;
    },
    enabled: isAuthenticated && userType === "physician",
  });

  const hasProfileResume = !!profile?.resume;
  const currentStepIndex = STEP_ORDER.indexOf(step);

  function update<K extends keyof ApplyFormState>(k: K, v: ApplyFormState[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext ?? '')) {
      toast.error('Only PDF, DOC, or DOCX files are accepted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5 MB.');
      return;
    }
    update('resume', file);
    update('useProfileResume', false);
  }

  function canProceed(): boolean {
    if (step === "resume") {
      return form.useProfileResume ? hasProfileResume : !!form.resume;
    }
    return true;
  }

  function next() {
    if (!canProceed()) {
      toast.error("Please upload a resume to continue.");
      return;
    }
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  }

  function back() {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (!form.useProfileResume && form.resume) fd.append("resume", form.resume);
      if (form.cover_letter) fd.append("cover_letter", form.cover_letter);
      if (form.phone) fd.append("phone", form.phone);
      if (form.years_experience) fd.append("years_experience", form.years_experience);
      if (form.linkedin_url) fd.append("linkedin_url", form.linkedin_url);
      if (form.availability_date) fd.append("availability_date", form.availability_date);
      fd.append("willing_to_relocate", String(form.willing_to_relocate));

      await api.post(`/api/jobs/${job.id}/apply/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      qc.invalidateQueries({ queryKey: ["saved-jobs-ids"] });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
      onSuccess();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <ModalShell onClose={onClose} title="Apply for this position">
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <Lock className="h-12 w-12 text-primary/30" />
          <h3 className="text-lg font-bold text-primary">Sign in to apply</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Create a free physician account or sign in to apply for <strong>{job.title}</strong>.
          </p>
          <div className="flex gap-2 pt-2">
            <button onClick={() => { onClose(); navigate({ to: "/login", search: { redirect: `/jobs/${job.id}` } as never }); }}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition">
              Sign In
            </button>
            <Link to="/register/physician" onClick={onClose}
              className="rounded-xl border border-primary px-6 py-2.5 text-sm font-semibold text-primary hover:bg-secondary transition">
              Register Free
            </Link>
          </div>
        </div>
      </ModalShell>
    );
  }

  if (userType !== "physician") {
    return (
      <ModalShell onClose={onClose} title="Apply for this position">
        <div className="py-8 text-center text-sm text-muted-foreground">
          Employer accounts cannot apply to jobs. Switch to a physician account.
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} title={`Apply — ${job.title}`}>
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-0">
        {STEP_ORDER.map((s, i) => (
          <div key={s} className="flex flex-1 items-center">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
              i < currentStepIndex ? "bg-accent text-primary" :
              i === currentStepIndex ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
              "bg-secondary text-muted-foreground"
            }`}>
              {i < currentStepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            {i < STEP_ORDER.length - 1 && (
              <div className={`h-0.5 flex-1 transition-all ${i < currentStepIndex ? "bg-accent" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>
      <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-accent">
        Step {currentStepIndex + 1} of {STEP_ORDER.length} — {STEP_LABELS[step]}
      </p>

      {/* Step content */}
      <div className="min-h-65">
        {step === "profile_check" && (
          <ProfileCheckStep profile={profile} />
        )}
        {step === "resume" && (
          <ResumeStep form={form} update={update} hasProfileResume={hasProfileResume}
            profile={profile} fileInputRef={fileInputRef} handleFileSelect={handleFileSelect} />
        )}
        {step === "details" && (
          <DetailsStep form={form} update={update} />
        )}
        {step === "cover_letter" && (
          <CoverLetterStep form={form} update={update} jobTitle={job.title} />
        )}
        {step === "review" && (
          <ReviewStep form={form} job={job} profile={profile} />
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
        <button onClick={back} disabled={currentStepIndex === 0}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        {step !== "review" ? (
          <button onClick={next}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary-glow">
            Continue <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-primary shadow-glow transition hover:brightness-110 disabled:opacity-60">
            {submitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" /> : <Send className="h-4 w-4" />}
            {submitting ? "Submitting…" : "Submit Application"}
          </button>
        )}
      </div>
    </ModalShell>
  );
}

function ModalShell({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-card shadow-2xl border border-border flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-bold text-foreground line-clamp-1">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ProfileCheckStep({ profile }: { profile: Record<string, string> | undefined }) {
  const fields = [
    { label: "Name", value: profile?.full_name, ok: !!profile?.full_name },
    { label: "Specialty", value: profile?.specialty_display || profile?.specialty, ok: !!profile?.specialty },
    { label: "CPSO / Licence #", value: profile?.cpso_number, ok: !!profile?.cpso_number },
    { label: "Resume on file", value: profile?.resume ? "Uploaded" : "None", ok: !!profile?.resume },
  ];

  const complete = fields.filter(f => f.ok).length;
  const pct = Math.round((complete / fields.length) * 100);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">Your profile information will be shared with the employer. A complete profile increases your chance of being shortlisted.</p>
      </div>
      <div className="rounded-xl border border-border bg-secondary/30 p-4">
        <div className="mb-3 flex items-center justify-between text-xs font-semibold">
          <span className="text-muted-foreground">Profile completeness</span>
          <span className={pct === 100 ? "text-emerald-600" : "text-amber-600"}>{pct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-border">
          <div className="h-1.5 rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ul className="space-y-2">
        {fields.map(f => (
          <li key={f.label} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5">
            <span className="text-sm text-muted-foreground">{f.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{f.value || "—"}</span>
              {f.ok
                ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                : <AlertCircle className="h-4 w-4 text-amber-500" />}
            </div>
          </li>
        ))}
      </ul>
      {pct < 100 && (
        <p className="text-xs text-muted-foreground">
          <Link to="/dashboard/physician" className="font-semibold text-primary hover:underline">Complete your profile →</Link>
          {" "}before applying for best results.
        </p>
      )}
    </div>
  );
}

function ResumeStep({ form, update, hasProfileResume, profile, fileInputRef, handleFileSelect }: {
  form: ApplyFormState;
  update: <K extends keyof ApplyFormState>(k: K, v: ApplyFormState[K]) => void;
  hasProfileResume: boolean;
  profile: Record<string, string> | undefined;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Choose which resume to submit with your application.</p>

      {hasProfileResume && (
        <button
          type="button"
          onClick={() => { update("useProfileResume", true); update("resume", null); }}
          className={`w-full rounded-xl border-2 p-4 text-left transition ${
            form.useProfileResume ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${form.useProfileResume ? "bg-accent/15" : "bg-secondary"}`}>
              <FileText className={`h-5 w-5 ${form.useProfileResume ? "text-accent" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Use resume from my profile</p>
              <p className="text-xs text-muted-foreground mt-0.5">Previously uploaded document</p>
            </div>
            {form.useProfileResume && <CheckCircle2 className="ml-auto h-5 w-5 text-accent" />}
          </div>
        </button>
      )}

      <button
        type="button"
        onClick={() => { update("useProfileResume", false); fileInputRef.current?.click(); }}
        className={`w-full rounded-xl border-2 p-4 text-left transition ${
          !form.useProfileResume ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${!form.useProfileResume && form.resume ? "bg-accent/15" : "bg-secondary"}`}>
            <Upload className={`h-5 w-5 ${!form.useProfileResume && form.resume ? "text-accent" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">
              {form.resume ? form.resume.name : "Upload a new resume"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">PDF, DOC, DOCX · max 5 MB</p>
          </div>
          {!form.useProfileResume && form.resume && <CheckCircle2 className="ml-auto h-5 w-5 text-accent" />}
        </div>
      </button>

      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileSelect} />

      {!hasProfileResume && !form.resume && (
        <p className="text-xs text-amber-600 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" /> A resume is required to apply.
        </p>
      )}
    </div>
  );
}

function DetailsStep({ form, update }: {
  form: ApplyFormState;
  update: <K extends keyof ApplyFormState>(k: K, v: ApplyFormState[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Optional details to strengthen your application.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="tel" value={form.phone} onChange={e => update("phone", e.target.value)}
              placeholder="+1 (416) 555-0100"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Years of Experience</label>
          <select value={form.years_experience} onChange={e => update("years_experience", e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15">
            <option value="">Select…</option>
            {["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20+"].map(y => (
              <option key={y} value={y}>{y} {y === "20+" ? "" : y === "1" ? "year" : "years"}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">LinkedIn Profile</label>
          <div className="relative">
            <Linkedin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="url" value={form.linkedin_url} onChange={e => update("linkedin_url", e.target.value)}
              placeholder="linkedin.com/in/yourprofile"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Earliest Start Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="date" value={form.availability_date} onChange={e => update("availability_date", e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </div>
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-secondary/40 transition">
        <input type="checkbox" checked={form.willing_to_relocate}
          onChange={e => update("willing_to_relocate", e.target.checked)}
          className="h-4 w-4 rounded accent-accent" />
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Home className="h-4 w-4 text-accent" /> Willing to relocate
          </p>
          <p className="text-xs text-muted-foreground">I am open to relocating for this position</p>
        </div>
      </label>
    </div>
  );
}

function CoverLetterStep({ form, update, jobTitle }: {
  form: ApplyFormState;
  update: <K extends keyof ApplyFormState>(k: K, v: ApplyFormState[K]) => void;
  jobTitle: string;
}) {
  const remaining = 2000 - form.cover_letter.length;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Write a tailored cover letter for <strong>{jobTitle}</strong>. A strong letter explains why you're the right fit for this specific role.
        </p>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Cover Letter <span className="text-muted-foreground/60">(optional)</span></label>
          <span className={`text-xs ${remaining < 100 ? "text-amber-500" : "text-muted-foreground"}`}>{remaining} chars remaining</span>
        </div>
        <textarea
          value={form.cover_letter}
          onChange={e => update("cover_letter", e.target.value)}
          maxLength={2000}
          rows={10}
          placeholder={`Dear Hiring Manager,\n\nI am writing to express my strong interest in the ${jobTitle} position...`}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15 resize-none"
        />
      </div>
    </div>
  );
}

function ReviewStep({ form, job, profile }: { form: ApplyFormState; job: JobDetail; profile: Record<string, string> | undefined }) {
  const resumeName = form.useProfileResume ? "Profile resume" : form.resume?.name ?? "None";
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Review your application before submitting. Once submitted you cannot edit it.</p>

      <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Applying for</h4>
        <p className="font-semibold text-primary">{job.title}</p>
        <p className="text-sm text-muted-foreground">{job.employer_name} · {job.location_display}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Submission details</h4>
        {[
          { icon: FileText, label: "Resume", value: resumeName },
          form.phone && { icon: Phone, label: "Phone", value: form.phone },
          form.years_experience && { icon: Briefcase, label: "Experience", value: `${form.years_experience} year${form.years_experience === "1" ? "" : "s"}` },
          form.linkedin_url && { icon: Linkedin, label: "LinkedIn", value: form.linkedin_url },
          form.availability_date && { icon: Calendar, label: "Available from", value: new Date(form.availability_date).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }) },
          { icon: Home, label: "Willing to relocate", value: form.willing_to_relocate ? "Yes" : "No" },
        ].filter(Boolean).map((item: unknown) => {
          const it = item as { icon: React.ComponentType<{ className?: string }>; label: string; value: string };
          return (
            <div key={it.label} className="flex items-center gap-3 text-sm">
              <it.icon className="h-4 w-4 shrink-0 text-accent" />
              <span className="text-muted-foreground w-32">{it.label}</span>
              <span className="font-medium text-foreground truncate">{it.value}</span>
            </div>
          );
        })}
      </div>

      {form.cover_letter && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Cover Letter preview</h4>
          <p className="text-sm text-foreground/80 line-clamp-4 whitespace-pre-wrap">{form.cover_letter}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function JobDetailPage() {
  const { jobId } = Route.useParams();
  const { isAuthenticated, userType } = useAuthStore();
  const qc = useQueryClient();
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applied, setApplied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);

  async function handleDownloadPDF() {
    if (!isAuthenticated) {
      toast.error("Please login to download job details.");
      return;
    }
    setDownloading(true);
    try {
      const response = await api.get(`/api/jobs/${jobId}/pdf/`, { responseType: "blob" });
      const blob = new Blob([response.data as BlobPart], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const disposition = response.headers["content-disposition"] as string | undefined;
      const filename = disposition
        ? disposition.split("filename=")[1]?.replace(/"/g, "") ?? `CandianMdJobs_Job_${jobId}.pdf`
        : `CandianMdJobs_Job_${jobId}.pdf`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded!");
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 2500);
    } catch {
      toast.error("Failed to download PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  const { data: job, isLoading, isError } = useQuery<JobDetail>({
    queryKey: ["job-detail", jobId],
    queryFn: async () => {
      const r = await api.get(`/api/jobs/${jobId}/`);
      return extractData<JobDetail>(r);
    },
    retry: 1,
  });

  const { data: savedJobs } = useQuery<{ id: number; job: number }[]>({
    queryKey: ["saved-jobs-ids"],
    queryFn: async () => {
      const r = await api.get("/api/jobs/saved/");
      const d = r.data?.data ?? r.data;
      return Array.isArray(d) ? d : (d?.results ?? []);
    },
    enabled: isAuthenticated && userType === "physician",
    staleTime: 60_000,
  });

  const savedEntry = savedJobs?.find(s => String(s.job) === String(jobId));
  const isSaved = !!savedEntry;

  const saveMutation = useMutation({
    mutationFn: () => api.post(`/api/jobs/${jobId}/save/`),
    onSuccess: () => { toast.success("Job saved"); qc.invalidateQueries({ queryKey: ["saved-jobs-ids"] }); },
    onError: e => toast.error(apiError(e)),
  });

  const unsaveMutation = useMutation({
    mutationFn: () => api.delete(`/api/jobs/${jobId}/unsave/`),
    onSuccess: () => { toast.success("Job removed from saved"); qc.invalidateQueries({ queryKey: ["saved-jobs-ids"] }); },
    onError: e => toast.error(apiError(e)),
  });

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => toast.success("Link copied")).catch(() => {});
  }

  if (isLoading) return <JobDetailSkeleton />;

  if (isError || !job) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h1 className="mt-4 text-2xl font-bold text-primary">Job not found</h1>
        <p className="mt-2 text-muted-foreground">This position may have been filled or removed.</p>
        <Link to="/jobs" className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary-glow">
          Browse all jobs
        </Link>
      </div>
    );
  }

  const salaryLine = formatSalary(job.salary_min, job.salary_max, job.salary_display);

  return (
    <>
      {showApplyModal && !applied && (
        <ApplyModal
          job={job}
          onClose={() => setShowApplyModal(false)}
          onSuccess={() => { setApplied(true); setShowApplyModal(false); toast.success("Application submitted! We'll notify you of any updates."); }}
        />
      )}

      {/* Hero */}
      <section className="bg-linear-to-br from-primary to-primary-glow text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 lg:px-8 lg:py-16">
          <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-foreground/75 hover:text-accent transition">
            <ArrowLeft className="h-4 w-4" /> Back to all jobs
          </Link>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {job.is_featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-900">
                    <Star className="h-3 w-3 fill-current" /> Featured
                  </span>
                )}
                {(job.specialty_display || job.specialty) && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                    <Stethoscope className="h-3.5 w-3.5" /> {job.specialty_display || job.specialty}
                  </span>
                )}
                {(job.job_type_display || job.job_type) && (
                  <span className="inline-flex items-center rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-xs font-semibold text-primary-foreground/85">
                    {job.job_type_display || job.job_type}
                  </span>
                )}
                {job.remote_option && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-xs font-semibold text-primary-foreground/85">
                    <Globe className="h-3 w-3" /> Remote
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{job.title}</h1>

              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-primary-foreground/80">
                {job.employer_name && <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-accent" /> {job.employer_name}</span>}
                {job.location_display && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-accent" /> {job.location_display}</span>}
                {(job.job_type_display || job.job_type) && <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-accent" /> {job.job_type_display || job.job_type}</span>}
                {salaryLine && <span className="flex items-center gap-1.5"><DollarSign className="h-4 w-4 text-accent" /> {salaryLine}</span>}
                {job.created_at && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-accent" /> Posted {timeAgo(job.created_at)}</span>}
                {job.total_applications != null && <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-accent" /> {job.total_applications} applicants</span>}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col lg:min-w-50">
              {applied ? (
                <div className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white">
                  <CheckCircle2 className="h-4 w-4" /> Applied
                </div>
              ) : (
                <button onClick={() => setShowApplyModal(true)}
                  className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-bold text-primary shadow-glow transition hover:brightness-110">
                  Apply Now <ChevronRight className="ml-1 h-4 w-4" />
                </button>
              )}
              <div className="flex gap-2">
                {isAuthenticated && userType === "physician" && (
                  <button onClick={() => isSaved ? unsaveMutation.mutate() : saveMutation.mutate()}
                    disabled={saveMutation.isPending || unsaveMutation.isPending}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-foreground/20 disabled:opacity-60">
                    {isSaved ? <BookmarkCheck className="h-4 w-4 text-accent" /> : <Bookmark className="h-4 w-4" />}
                    {isSaved ? "Saved" : "Save"}
                  </button>
                )}
                <button onClick={handleShare}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-foreground/20">
                  <Share2 className="h-4 w-4" /> Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:py-12 lg:grid-cols-[1fr_320px] lg:gap-10 lg:px-8">
        <article className="space-y-10">
          {job.description && (
            <div>
              <h2 className="text-xl font-bold text-primary">Position overview</h2>
              <div className="mt-3"><TextBlock text={job.description} /></div>
            </div>
          )}
          {job.responsibilities && (
            <div>
              <h2 className="text-xl font-bold text-primary">Responsibilities</h2>
              <div className="mt-3"><TextBlock text={job.responsibilities} /></div>
            </div>
          )}
          {job.qualifications && (
            <div>
              <h2 className="text-xl font-bold text-primary">Qualifications</h2>
              <div className="mt-3"><TextBlock text={job.qualifications} /></div>
            </div>
          )}
          {job.requirements && (
            <div>
              <h2 className="text-xl font-bold text-primary">Requirements</h2>
              <div className="mt-3"><TextBlock text={job.requirements} /></div>
            </div>
          )}
          {job.benefits && (
            <div>
              <h2 className="text-xl font-bold text-primary">What&apos;s offered</h2>
              <div className="mt-3"><TextBlock text={job.benefits} /></div>
            </div>
          )}
          {job.compensation && (
            <div>
              <h2 className="text-xl font-bold text-primary">Compensation details</h2>
              <p className="mt-3 text-sm text-foreground/85">{job.compensation}</p>
            </div>
          )}

          {/* CTA banner */}
          {!applied && (
            <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-primary">Interested in this role?</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">A recruiter reviews applications within 1 business day.</p>
              </div>
              <button onClick={() => setShowApplyModal(true)}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-elegant transition hover:bg-primary-glow">
                Apply Now <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </article>

        {/* Sidebar */}
        <aside className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Quick facts</h3>
            <dl className="mt-4 space-y-3">
              {job.specialty_display && <Row label="Specialty" value={job.specialty_display} />}
              {job.sub_specialty && <Row label="Sub-specialty" value={job.sub_specialty} />}
              {(job.job_type_display || job.job_type) && <Row label="Type" value={job.job_type_display || job.job_type || ""} />}
              {job.practice_setting_display && <Row label="Setting" value={job.practice_setting_display} />}
              {job.required_experience_display && <Row label="Experience" value={job.required_experience_display} />}
              {salaryLine && <Row label="Compensation" value={salaryLine} />}
              {job.compensation_model_display && <Row label="Pay model" value={job.compensation_model_display} />}
              {job.location_display && <Row label="Location" value={job.location_display} />}
              {job.relocation_assistance && <Row label="Relocation" value="Assistance available" />}
              {job.remote_option && <Row label="Remote" value="Option available" />}
              {job.application_deadline && <Row label="Deadline" value={new Date(job.application_deadline).toLocaleDateString("en-CA")} />}
              {job.views_count != null && <Row label="Views" value={String(job.views_count)} />}
            </dl>
          </div>

          <div className="rounded-2xl border border-border bg-secondary/60 p-6">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
              <Building2 className="h-4 w-4 text-accent" /> About the employer
            </h3>
            <p className="mt-3 font-semibold text-foreground">{job.employer_name}</p>
            {job.employer_type && <p className="mt-1 text-xs capitalize text-muted-foreground">{job.employer_type.replace(/_/g, " ")}</p>}
            {job.employer_website && (
              <a href={job.employer_website} target="_blank" rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                Visit website <ChevronRight className="h-3 w-3" />
              </a>
            )}
            {job.contact_person && (
              <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                <p>Contact: <span className="font-medium text-foreground">{job.contact_person}</span></p>
                {job.contact_email && <p className="mt-1">{job.contact_email}</p>}
              </div>
            )}
          </div>

          {/* PDF Download */}
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/60 py-3 text-sm font-semibold text-foreground transition hover:border-accent/40 hover:bg-accent/5 disabled:opacity-60"
          >
            {downloading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating PDF…</>
            ) : downloadDone ? (
              <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Downloaded!</>
            ) : (
              <><Printer className="h-4 w-4 text-accent" /> Download as PDF</>
            )}
          </button>

          {!applied && (
            <button onClick={() => setShowApplyModal(true)}
              className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition hover:bg-primary-glow">
              Apply for this Position
            </button>
          )}
        </aside>
      </section>
    </>
  );
}
