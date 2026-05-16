import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { downloadCsv } from "@/lib/csv";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  accessor?: (row: T) => unknown;
  sortable?: boolean;
  className?: string;
}

interface Props<T> {
  rows: T[] | undefined;
  columns: Column<T>[];
  loading?: boolean;
  searchKeys?: (keyof T)[];
  pageSize?: number;
  exportName?: string;
  exportRow?: (row: T) => Record<string, unknown>;
  toolbar?: ReactNode;
  emptyMessage?: string;
  rowKey: (row: T) => string | number;
}

export function AdminTable<T>({
  rows,
  columns,
  loading,
  searchKeys,
  pageSize = 10,
  exportName,
  exportRow,
  toolbar,
  emptyMessage = "No records yet.",
  rowKey,
}: Props<T>) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    let data = rows ?? [];
    if (q && searchKeys?.length) {
      const needle = q.toLowerCase();
      data = data.filter((r) =>
        searchKeys.some((k) => String((r as Record<string, unknown>)[k as string] ?? "").toLowerCase().includes(needle)),
      );
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col) {
        data = [...data].sort((a, b) => {
          const av = col.accessor ? col.accessor(a) : (a as Record<string, unknown>)[sortKey];
          const bv = col.accessor ? col.accessor(b) : (b as Record<string, unknown>)[sortKey];
          if (av == null) return 1;
          if (bv == null) return -1;
          if (av < bv) return sortDir === "asc" ? -1 : 1;
          if (av > bv) return sortDir === "asc" ? 1 : -1;
          return 0;
        });
      }
    }
    return data;
  }, [rows, q, searchKeys, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const slice = filtered.slice((current - 1) * pageSize, current * pageSize);

  function toggleSort(k: string) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        {searchKeys?.length ? (
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ) : (
          <div className="flex-1" />
        )}
        {toolbar}
        {exportName && (
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                exportName,
                (filtered as T[]).map((r) =>
                  exportRow ? exportRow(r) : (r as unknown as Record<string, unknown>),
                ),
              )
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-secondary"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-2.5 font-semibold ${c.sortable ? "cursor-pointer select-none" : ""} ${c.className ?? ""}`}
                  onClick={() => c.sortable && toggleSort(c.key)}
                >
                  {c.header}
                  {sortKey === c.key && <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-secondary" />
                    </td>
                  ))}
                </tr>
              ))
            ) : slice.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              slice.map((row) => (
                <tr key={rowKey(row)} className="border-t border-border hover:bg-secondary/30">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 align-middle ${c.className ?? ""}`}>
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border p-3 text-xs text-muted-foreground">
        <span>
          {filtered.length === 0 ? 0 : (current - 1) * pageSize + 1}–
          {Math.min(current * pageSize, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={current <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center rounded-md border border-border px-2 py-1 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2">
            Page {current} / {totalPages}
          </span>
          <button
            disabled={current >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center rounded-md border border-border px-2 py-1 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}