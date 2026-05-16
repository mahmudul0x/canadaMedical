import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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

export function useNotifications() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const [live, setLive] = useState<AppNotification[]>([]);

  const connect = useCallback(() => {
    if (!isAuthenticated || !accessToken) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = `${WS_BASE}/ws/notifications/?token=${accessToken}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      try {
        const n: AppNotification = JSON.parse(evt.data);
        setLive((prev) => [n, ...prev].slice(0, 50));
        // Invalidate the REST list + unread count so the bell updates
        qc.invalidateQueries({ queryKey: ["notifications"] });
      } catch {/* ignore parse errors */}
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      reconnectTimer.current = setTimeout(connect, 5000);
    };

    ws.onerror = () => ws.close();
  }, [isAuthenticated, accessToken, qc]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { live };
}
