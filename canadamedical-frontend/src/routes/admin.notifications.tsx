import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { api, apiError } from "@/lib/api";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotificationsPage,
});

interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  notification_type?: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function AdminNotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: async () => {
      const r = await api.get("/api/admin/notifications/");
      const d = r.data?.data ?? r.data;
      return (Array.isArray(d) ? d : (d?.results ?? [])) as Notification[];
    },
  });

  const notifications = data ?? [];

  const markRead = useMutation({
    mutationFn: (id: number) => api.patch(`/api/admin/notifications/${id}/read/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "notifications"] }),
    onError: (e) => toast.error(apiError(e)),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch("/api/admin/notifications/read-all/"),
    onSuccess: () => { toast.success("All marked as read"); qc.invalidateQueries({ queryKey: ["admin", "notifications"] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/notifications/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "notifications"] }),
    onError: (e) => toast.error(apiError(e)),
  });

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-secondary" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-16 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 rounded-xl border p-4 transition ${
                n.is_read ? "border-border bg-card" : "border-accent/30 bg-accent/5"
              }`}
            >
              <div className="mt-0.5 flex-none">
                <div className={`h-2 w-2 rounded-full ${n.is_read ? "bg-transparent" : "bg-accent"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${n.is_read ? "text-foreground" : "text-primary"}`}>
                  {n.title}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground/60">{timeAgo(n.created_at)}</p>
              </div>
              <div className="flex flex-none gap-1">
                {!n.is_read && (
                  <button
                    onClick={() => markRead.mutate(n.id)}
                    className="rounded-md border border-border p-1.5 hover:bg-secondary"
                    title="Mark as read"
                  >
                    <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                  </button>
                )}
                <button
                  onClick={() => del.mutate(n.id)}
                  className="rounded-md border border-border p-1.5 text-destructive hover:bg-destructive/10"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
