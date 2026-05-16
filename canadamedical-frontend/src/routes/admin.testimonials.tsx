import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Pencil, Plus, Trash2, Check, X } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { AdminTable, type Column } from "@/components/admin/AdminTable";
import { Modal } from "@/components/admin/Modal";
import { Field, Input, SubmitButton, Textarea } from "@/components/site/Form";

export const Route = createFileRoute("/admin/testimonials")({
  component: AdminTestimonialsPage,
});

interface Testimonial {
  id: number;
  name: string;
  role?: string;
  location?: string;
  quote: string;
  rating?: number;
  is_published?: boolean;
}

const schema = z.object({
  name: z.string().min(2),
  role: z.string().optional(),
  location: z.string().optional(),
  quote: z.string().min(10),
  rating: z.coerce.number().min(1).max(5).optional(),
  is_published: z.boolean().optional(),
});
type Input_ = z.infer<typeof schema>;

function AdminTestimonialsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "testimonials"],
    queryFn: async () => { const r = await api.get("/api/admin/testimonials/"); const d = r.data?.data ?? r.data; return Array.isArray(d) ? d : (d?.results ?? []); },
  });
  const rows: Testimonial[] = data ?? [];

  const save = useMutation({
    mutationFn: async (input: Input_ & { id?: number }) => {
      if (input.id) return (await api.patch(`/api/admin/testimonials/${input.id}/`, input)).data;
      return (await api.post("/api/admin/testimonials/", input)).data;
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin", "testimonials"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const togglePub = useMutation({
    mutationFn: async (r: Testimonial) =>
      (await api.patch(`/api/admin/testimonials/${r.id}/toggle/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "testimonials"] }),
    onError: (e) => toast.error(apiError(e)),
  });

  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/admin/testimonials/${id}/`),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "testimonials"] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const columns: Column<Testimonial>[] = [
    { key: "name", header: "Name", sortable: true, render: (r) => (
      <div>
        <div className="font-medium text-foreground">{r.name}</div>
        <div className="text-xs text-muted-foreground">{r.role}{r.location ? ` · ${r.location}` : ""}</div>
      </div>
    ) },
    { key: "quote", header: "Quote", render: (r) => <span className="line-clamp-2 max-w-md text-foreground/80">{r.quote}</span> },
    { key: "rating", header: "★", sortable: true, render: (r) => r.rating ?? "—" },
    {
      key: "is_published",
      header: "Published",
      render: (r) => (
        <button
          onClick={() => togglePub.mutate(r)}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            r.is_published ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"
          }`}
        >
          {r.is_published ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          {r.is_published ? "Yes" : "No"}
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => { setEditing(r); setOpen(true); }} className="rounded-md border border-border p-1.5 hover:bg-secondary">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => confirm("Delete?") && del.mutate(r.id)} className="rounded-md border border-border p-1.5 text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Testimonials</h1>
          <p className="text-sm text-muted-foreground">Approve and manage public testimonials.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setOpen(true); }}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-glow"
        >
          <Plus className="h-4 w-4" /> New
        </button>
      </div>

      <AdminTable
        rows={rows}
        columns={columns}
        loading={isLoading}
        rowKey={(r) => r.id}
        searchKeys={["name", "role", "location", "quote"]}
        exportName="testimonials.csv"
      />

      <Modal open={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing ? "Edit Testimonial" : "New Testimonial"}>
        <TForm key={editing?.id ?? "new"} initial={editing} submitting={save.isPending} onSubmit={(v) => save.mutate({ ...v, id: editing?.id })} />
      </Modal>
    </div>
  );
}

function TForm({ initial, onSubmit, submitting }: { initial: Testimonial | null; onSubmit: (v: Input_) => void; submitting?: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Input_>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      role: initial?.role ?? "",
      location: initial?.location ?? "",
      quote: initial?.quote ?? "",
      rating: initial?.rating ?? 5,
      is_published: initial?.is_published ?? false,
    },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Name" required><Input {...register("name")} />{errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role"><Input {...register("role")} /></Field>
        <Field label="Location"><Input {...register("location")} /></Field>
      </div>
      <Field label="Quote" required><Textarea {...register("quote")} />{errors.quote && <p className="mt-1 text-xs text-destructive">{errors.quote.message}</p>}</Field>
      <Field label="Rating (1–5)"><Input type="number" min={1} max={5} {...register("rating")} /></Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("is_published")} className="h-4 w-4 rounded border-border" />
        Published
      </label>
      <SubmitButton loading={submitting}>{initial ? "Update" : "Create"}</SubmitButton>
    </form>
  );
}