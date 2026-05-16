import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Pencil, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { AdminTable, type Column } from "@/components/admin/AdminTable";
import { Modal } from "@/components/admin/Modal";
import { Field, Input, SubmitButton, Textarea } from "@/components/site/Form";

export const Route = createFileRoute("/admin/faq")({
  component: AdminFaqPage,
});

interface Faq {
  id: number;
  question: string;
  answer: string;
  category?: string;
  order?: number;
  is_published?: boolean;
}

const schema = z.object({
  question: z.string().min(5),
  answer: z.string().min(5),
  category: z.string().optional(),
  order: z.coerce.number().optional(),
  is_published: z.boolean().optional(),
});
type Input_ = z.infer<typeof schema>;

function AdminFaqPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Faq | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "faq"],
    queryFn: async () => { const r = await api.get("/api/admin/faqs/"); const d = r.data?.data ?? r.data; return Array.isArray(d) ? d : (d?.results ?? []); },
  });
  const rows: Faq[] = data ?? [];

  const save = useMutation({
    mutationFn: async (input: Input_ & { id?: number }) => {
      if (input.id) return (await api.patch(`/api/admin/faqs/${input.id}/`, input)).data;
      return (await api.post("/api/admin/faqs/", input)).data;
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin", "faq"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/admin/faqs/${id}/`),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "faq"] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const toggle = useMutation({
    mutationFn: async (id: number) => api.patch(`/api/admin/faqs/${id}/toggle/`),
    onSuccess: () => {
      toast.success("Toggled");
      qc.invalidateQueries({ queryKey: ["admin", "faq"] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const columns: Column<Faq>[] = [
    { key: "question", header: "Question", sortable: true, render: (r) => <span className="font-medium text-foreground line-clamp-2 max-w-md">{r.question}</span> },
    { key: "category", header: "Category", sortable: true },
    { key: "order", header: "Order", sortable: true },
    { key: "is_published", header: "Published", render: (r) => (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${r.is_published ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"}`}>
        {r.is_published ? "Yes" : "No"}
      </span>
    ) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => toggle.mutate(r.id)}
            disabled={toggle.isPending}
            className="rounded-md border border-border p-1.5 hover:bg-secondary disabled:opacity-50"
            title={r.is_published ? "Unpublish" : "Publish"}
          >
            {r.is_published ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4 text-zinc-400" />}
          </button>
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
          <h1 className="text-2xl font-bold text-primary">FAQ</h1>
          <p className="text-sm text-muted-foreground">Manage frequently asked questions.</p>
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
        searchKeys={["question", "answer", "category"]}
        exportName="faq.csv"
      />

      <Modal open={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing ? "Edit FAQ" : "New FAQ"} size="lg">
        <FForm key={editing?.id ?? "new"} initial={editing} submitting={save.isPending} onSubmit={(v) => save.mutate({ ...v, id: editing?.id })} />
      </Modal>
    </div>
  );
}

function FForm({ initial, onSubmit, submitting }: { initial: Faq | null; onSubmit: (v: Input_) => void; submitting?: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Input_>({
    resolver: zodResolver(schema),
    defaultValues: {
      question: initial?.question ?? "",
      answer: initial?.answer ?? "",
      category: initial?.category ?? "General",
      order: initial?.order ?? 0,
      is_published: initial?.is_published ?? true,
    },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Question" required><Input {...register("question")} />{errors.question && <p className="mt-1 text-xs text-destructive">{errors.question.message}</p>}</Field>
      <Field label="Answer" required><Textarea {...register("answer")} />{errors.answer && <p className="mt-1 text-xs text-destructive">{errors.answer.message}</p>}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category"><Input {...register("category")} /></Field>
        <Field label="Order"><Input type="number" {...register("order")} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("is_published")} className="h-4 w-4 rounded border-border" />
        Published
      </label>
      <SubmitButton loading={submitting}>{initial ? "Update" : "Create"}</SubmitButton>
    </form>
  );
}