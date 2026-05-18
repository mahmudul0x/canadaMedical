import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, Check, CheckCheck, X } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { api } from "@/lib/api";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { useAuthStore } from "@/stores/auth";

const TYPE_ICONS: Record<string, string> = {
  admin_job:                    "💼",
  admin_physician:              "👨‍⚕️",
  admin_employer:               "🏥",
  admin_assessment:             "📋",
  admin_contact:                "✉️",
  admin_enterprise_request:     "🏢",
  employer_application:         "📩",
  employer_job_approved:        "✅",
  employer_job_rejected:        "❌",
  employer_offer_accepted:      "🎉",
  employer_offer_declined:      "❌",
  employer_custom_plan_payment: "💳",
  employer_custom_plan_active:  "🚀",
  physician_app_status:         "🔔",
  physician_assessment_status:  "📋",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

interface Props {
  /** "admin" | "employer" | "physician" */
  role: "admin" | "employer" | "physician";
  /** extra classes for the trigger button */
  className?: string;
}

export function NotificationBell({ role, className = "" }: Props) {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Connect WebSocket — keeps the cache warm in the background
  useNotifications();

  const unreadQ = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const r = await api.get("/api/notifications/unread-count/");
      const d = r.data?.data ?? r.data;
      return (d?.count ?? 0) as number;
    },
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });

  const listQ = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: async () => {
      const r = await api.get("/api/notifications/");
      const d = r.data?.data ?? r.data;
      return (Array.isArray(d) ? d : []) as AppNotification[];
    },
    enabled: isAuthenticated && open,
    staleTime: 5_000,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => api.patch(`/api/notifications/${id}/read/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post("/api/notifications/read-all/"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const unread = unreadQ.data ?? 0;
  const items = listQ.data ?? [];

  function handleClick(n: AppNotification) {
    if (!n.is_read) markRead.mutate(n.id);
    setOpen(false);
    if (!n.link) return;
    const url = new URL(n.link, window.location.origin);
    // External link — open in new tab
    if (url.origin !== window.location.origin) {
      window.open(n.link, "_blank", "noopener,noreferrer");
      return;
    }
    const searchParams = Object.fromEntries(url.searchParams.entries());
    navigate({ to: url.pathname as never, search: Object.keys(searchParams).length ? searchParams : undefined } as never);
  }

  const isEmpty = items.length === 0 && !listQ.isFetching;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className={`relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground transition hover:border-accent hover:text-accent ${className}`}
        aria-label="Notifications"
      >
        {unread > 0 ? (
          <BellRing className="h-4 w-4 animate-[ring_0.5s_ease-in-out]" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-card bg-maple px-0.5 text-[9px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-border bg-card shadow-xl"
          style={{ maxHeight: "480px", display: "flex", flexDirection: "column" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {listQ.isFetching && items.length === 0 ? (
              <div className="flex flex-col gap-2 p-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary" />
                ))}
              </div>
            ) : isEmpty ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground/70">No notifications yet.</p>
              </div>
            ) : (
              <ul className="py-1">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n)}
                      className={`group w-full px-4 py-3 text-left transition hover:bg-secondary ${
                        !n.is_read ? "bg-accent/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 shrink-0 text-base leading-none">
                          {TYPE_ICONS[n.notification_type] ?? "🔔"}
                        </span>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`truncate text-xs font-semibold ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                              {n.title}
                            </p>
                            <span className="shrink-0 text-[10px] text-muted-foreground/60">
                              {formatTime(n.created_at)}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {n.message}
                          </p>
                        </div>
                        {!n.is_read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-border px-4 py-2.5 text-center">
              <p className="text-[11px] text-muted-foreground">
                Showing last {items.length} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
