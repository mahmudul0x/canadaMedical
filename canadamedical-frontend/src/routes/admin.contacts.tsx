import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { Mail, Trash2 } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { AdminTable, type Column } from "@/components/admin/AdminTable";
import { Modal } from "@/components/admin/Modal";

export const Route = createFileRoute("/admin/contacts")({
  component: AdminContactsPage,
});

interface Contact {
  id: number;
  name: string;
  email: string;
  subject?: string;
  message: string;
  status?: "new" | "read" | "replied";
  created_at?: string;
}

const STATUSES = ["new", "read", "replied"] as const;

function AdminContactsPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<Contact | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "contacts"],
    queryFn: async () => { const r = await api.get("/api/admin/contacts/"); const d = r.data?.data ?? r.data; return Array.isArray(d) ? d : (d?.results ?? []); },
  });
  const rows: Contact[] = data ?? [];

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<Contact> }) => {
      // Spec exposes a single status-change endpoint: /respond/.
      if (patch.status === "replied") {
        return (await api.patch(`/api/admin/contacts/${id}/respond/`)).data;
      }
      return (await api.patch(`/api/admin/contacts/${id}/`, patch)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "contacts"] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/admin/contacts/${id}/`),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "contacts"] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const columns: Column<Contact>[] = [
    { key: "name", header: "From", sortable: true, render: (r) => (
      <div>
        <div className="font-medium text-foreground">{r.name}</div>
        <div className="text-xs text-muted-foreground">{r.email}</div>
      </div>
    ) },
    { key: "subject", header: "Subject", sortable: true },
    { key: "created_at", header: "Date", sortable: true, render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "—" },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <select
          value={r.status ?? "new"}
          onChange={(e) => update.mutate({ id: r.id, patch: { status: e.target.value as Contact["status"] } })}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => {
              setView(r);
              if (r.status === "new") update.mutate({ id: r.id, patch: { status: "read" } });
            }}
            className="rounded-md border border-border p-1.5 hover:bg-secondary"
          >
            <Mail className="h-4 w-4" />
          </button>
          <button
            onClick={() => confirm("Delete message?") && del.mutate(r.id)}
            className="rounded-md border border-border p-1.5 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold text-primary">Contact Inquiries</h1>
        <p className="text-sm text-muted-foreground">Messages submitted via the public contact form.</p>
      </header>
      <AdminTable
        rows={rows}
        columns={columns}
        loading={isLoading}
        rowKey={(r) => r.id}
        searchKeys={["name", "email", "subject", "message"]}
        exportName="contacts.csv"
      />

      <Modal open={!!view} onClose={() => setView(null)} title={view?.subject || "Message"} size="lg">
        {view && (
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-foreground">{view.name}</p>
              <p className="text-muted-foreground">{view.email}</p>
            </div>
            <div className="whitespace-pre-wrap rounded-md bg-secondary/50 p-3 text-foreground/90">
              {view.message}
            </div>
            <a
              href={`mailto:${view.email}?subject=Re: ${encodeURIComponent(view.subject ?? "Your inquiry")}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-glow"
            >
              <Mail className="h-4 w-4" /> Reply via email
            </a>
          </div>
        )}
      </Modal>
    </div>
  );
}