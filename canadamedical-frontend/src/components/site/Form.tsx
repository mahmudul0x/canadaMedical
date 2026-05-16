import * as React from "react";

/* ============================================================
 * Floating-label inputs — premium auth/registration aesthetic
 * ============================================================ */

const floatingBase =
  "peer w-full rounded-xl border border-border bg-background/60 px-4 pt-5 pb-2 text-sm text-foreground shadow-sm transition placeholder-transparent focus:border-accent focus:bg-background focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:opacity-60";

const floatingLabel =
  "pointer-events-none absolute left-4 top-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-medium peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:text-muted-foreground/80 peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:uppercase peer-focus:tracking-wide peer-focus:text-accent";

export const FloatingInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; rightSlot?: React.ReactNode }
>(({ label, hint, error, className = "", rightSlot, id, ...props }, ref) => {
  const inputId = id ?? React.useId();
  return (
    <div className="space-y-1">
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          placeholder={label}
          className={`${floatingBase} ${error ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""} ${rightSlot ? "pr-12" : ""} ${className}`}
          {...props}
        />
        <label htmlFor={inputId} className={floatingLabel}>
          {label} {props.required && <span className="text-[var(--maple)]">*</span>}
        </label>
        {rightSlot && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>}
      </div>
      {error ? (
        <p className="px-1 text-xs font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="px-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
});
FloatingInput.displayName = "FloatingInput";

export const FloatingSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string; error?: string; children: React.ReactNode }
>(({ label, hint, error, className = "", children, id, ...props }, ref) => {
  const inputId = id ?? React.useId();
  return (
    <div className="space-y-1">
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          className={`${floatingBase} appearance-none pr-10 ${error ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""} ${className}`}
          {...props}
        >
          {children}
        </select>
        <label htmlFor={inputId} className="pointer-events-none absolute left-4 top-2 text-[11px] font-semibold uppercase tracking-wide text-accent">
          {label} {props.required && <span className="text-[var(--maple)]">*</span>}
        </label>
        <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {error ? (
        <p className="px-1 text-xs font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="px-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
});
FloatingSelect.displayName = "FloatingSelect";

export const FloatingTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string }
>(({ label, hint, error, className = "", id, ...props }, ref) => {
  const inputId = id ?? React.useId();
  return (
    <div className="space-y-1">
      <div className="relative">
        <textarea
          ref={ref}
          id={inputId}
          placeholder={label}
          className={`${floatingBase} min-h-32 pt-6 ${error ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""} ${className}`}
          {...props}
        />
        <label htmlFor={inputId} className={floatingLabel}>
          {label} {props.required && <span className="text-[var(--maple)]">*</span>}
        </label>
      </div>
      {error ? (
        <p className="px-1 text-xs font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="px-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
});
FloatingTextarea.displayName = "FloatingTextarea";

/* ============================================================
 * Step indicator for multi-step registration
 * ============================================================ */
export function StepIndicator({
  steps,
  current,
}: {
  steps: { label: string; description?: string }[];
  current: number;
}) {
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <li key={s.label} className="relative">
            <div
              className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                state === "active"
                  ? "border-accent bg-accent-soft/40 shadow-sm"
                  : state === "done"
                  ? "border-accent/30 bg-background"
                  : "border-border bg-background/60"
              }`}
            >
              <span
                className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-bold ${
                  state === "done"
                    ? "bg-accent text-accent-foreground"
                    : state === "active"
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {state === "done" ? (
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4L8.5 12 15.3 5.3a1 1 0 011.4 0z" /></svg>
                ) : (
                  i + 1
                )}
              </span>
              <div className="min-w-0">
                <div className={`text-sm font-semibold ${state === "todo" ? "text-muted-foreground" : "text-foreground"}`}>
                  {s.label}
                </div>
                {s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ============================================================
 * Legacy components (still used by other pages)
 * ============================================================ */

export function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-foreground">
        {label} {required && <span className="text-[var(--maple)]">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </label>
  );
}

const baseInput =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => <input ref={ref} className={`${baseInput} ${className}`} {...props} />
);
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", children, ...props }, ref) => (
    <select ref={ref} className={`${baseInput} ${className}`} {...props}>{children}</select>
  )
);
Select.displayName = "Select";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => <textarea ref={ref} className={`${baseInput} min-h-32 ${className}`} {...props} />
);
Textarea.displayName = "Textarea";

export function SubmitButton({
  children,
  loading,
  disabled,
}: {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-glow disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
      )}
      {children}
    </button>
  );
}

export function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto -mt-12 max-w-3xl px-4 pb-16 lg:px-8">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-10">{children}</div>
    </div>
  );
}

export function useFormSubmit(message = "Submitted! We'll be in touch shortly.") {
  const [done, setDone] = React.useState(false);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return { done, onSubmit, message };
}

export function SuccessNotice({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-accent bg-accent-soft p-6 text-center">
      <div className="text-lg font-bold text-primary">Thank you!</div>
      <p className="mt-2 text-sm text-foreground/80">{message}</p>
    </div>
  );
}