import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { apiError } from "@/lib/api";

export function ErrorState({
  error,
  onRetry,
  title = "Couldn't load data",
  className = "",
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-sm sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex items-start gap-2.5 text-rose-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-rose-700/80">{apiError(error)}</div>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-card px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      )}
    </div>
  );
}

export function InlineSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> {label}
    </span>
  );
}

export function StatusBadge({ status }: { status?: string }) {
  const v = (status ?? "pending").toLowerCase();
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 ring-amber-200",
    reviewed: "bg-sky-100 text-sky-800 ring-sky-200",
    shortlisted: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    rejected: "bg-rose-100 text-rose-800 ring-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${
        map[v] ?? "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      {v}
    </span>
  );
}