import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

export interface AppNotification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

const WS_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000")
  .replace(/^https?/, (p: string) => (p === "https" ? "wss" : "ws"))
  .replace(/\/$/, "");

// Which React Query keys to invalidate per notification type
const INVALIDATION_MAP: Record<string, string[][]> = {
  // Employer
  employer_job_approved:          [["my-jobs"], ["my-jobs-all"], ["my-subscription"]],
  employer_job_rejected:          [["my-jobs"], ["my-jobs-all"]],
  employer_application:           [["employer-all-applications"], ["employer-all-applications-counts"]],
  employer_offer_accepted:        [["employer-all-applications"], ["my-jobs"], ["my-jobs-all"]],
  employer_offer_declined:        [["employer-all-applications"]],
  employer_custom_plan_payment:   [["my-enterprise-request"], ["my-subscription"]],
  employer_custom_plan_active:    [["my-enterprise-request"], ["my-subscription"]],
  // Physician
  physician_app_status:           [["my-applications"]],
};

export function useNotifications() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const qc = useQueryClient();

  const wsRef          = useRef<WebSocket | null>(null);
  const reconnectRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef     = useRef(true);
  const wsLiveRef      = useRef(false);
  const lastCheckRef   = useRef(new Date().toISOString());
  const isAuthRef      = useRef(isAuthenticated);

  useEffect(() => { isAuthRef.current = isAuthenticated; }, [isAuthenticated]);

  const handleNotification = useCallback((n: AppNotification) => {
    // Refresh the notification bell
    qc.invalidateQueries({ queryKey: ["notifications"] });

    // Invalidate dashboard data based on notification type
    INVALIDATION_MAP[n.notification_type]?.forEach((key) =>
      qc.invalidateQueries({ queryKey: key })
    );

    // Show toast per notification type
    const toastMap: Record<string, () => void> = {
      employer_job_approved:        () => toast.success(n.title, { duration: 5000 }),
      employer_job_rejected:        () => toast.error(n.title, { duration: 5000 }),
      employer_application:         () => toast(n.title, { icon: "📩", duration: 4000 }),
      employer_offer_accepted:      () => toast.success(n.title, { icon: "🎉", duration: 6000 }),
      employer_offer_declined:      () => toast(n.title, { icon: "❌", duration: 5000 }),
      employer_custom_plan_payment: () => toast(n.title, { icon: "💳", duration: 7000 }),
      employer_custom_plan_active:  () => toast.success(n.title, { icon: "🚀", duration: 7000 }),
      physician_app_status:         () => toast(n.title, { icon: "🔔", duration: 5000 }),
    };
    toastMap[n.notification_type]?.();
  }, [qc]);

  // ── HTTP polling (active when WebSocket is not live) ──────────────────────
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      if (!mountedRef.current || !isAuthRef.current || wsLiveRef.current) return;
      try {
        const since = lastCheckRef.current;
        lastCheckRef.current = new Date().toISOString();
        const r = await api.get(`/api/notifications/?since=${encodeURIComponent(since)}`);
        const items: AppNotification[] = r.data?.data ?? r.data ?? [];
        if (Array.isArray(items) && items.length > 0) {
          items.forEach(handleNotification);
        }
      } catch { /* silent — network errors shouldn't crash the hook */ }
    }, 3000);
  }, [handleNotification]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // ── WebSocket (preferred, zero latency when Django Channels is available) ─
  const connect = useCallback(() => {
    if (!isAuthenticated || !accessToken) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_BASE}/ws/notifications/?token=${accessToken}`);
    wsRef.current = ws;

    ws.onopen = () => {
      wsLiveRef.current = true;
      stopPolling(); // WS works — no need to poll
    };

    ws.onmessage = (evt) => {
      try { handleNotification(JSON.parse(evt.data) as AppNotification); }
      catch { /* ignore */ }
    };

    ws.onclose = () => {
      wsLiveRef.current = false;
      if (!mountedRef.current) return;
      startPolling(); // WS down — fall back to polling
      reconnectRef.current = setTimeout(connect, 5000);
    };

    ws.onerror = () => ws.close();
  }, [isAuthenticated, accessToken, handleNotification, startPolling, stopPolling]);

  useEffect(() => {
    mountedRef.current = true;
    startPolling(); // Begin polling immediately (WS may fail)
    connect();      // Try WebSocket in parallel
    return () => {
      mountedRef.current = false;
      stopPolling();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect, startPolling, stopPolling]);

  return {};
}
