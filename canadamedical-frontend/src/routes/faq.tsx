import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Minus, Search } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { api } from "@/lib/api";

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [{ title: "FAQ — CandianMdJobs" }] }),
  component: FAQPage,
});

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category?: string;
  order?: number;
}

const STATIC_FAQS: FAQItem[] = [
  { id: -1, category: "General", question: "Is CandianMdJobs free for physicians?", answer: "Yes — registration, profile creation, applications and recruiter support are completely free for physicians." },
  { id: -2, category: "General", question: "How are jobs verified?", answer: "Every employer is vetted and every job listing is reviewed by our recruitment team before going live." },
  { id: -3, category: "Physicians", question: "I'm an internationally trained physician. Can you help?", answer: "Absolutely. We work with IMGs through licensing pathways (MCC, Practice Ready Assessment) and immigration support across most provinces." },
  { id: -4, category: "Physicians", question: "Will my profile be visible to my current employer?", answer: "No. Your profile is confidential. Employers only see your details after you apply or you opt-in to be discoverable." },
  { id: -5, category: "Physicians", question: "Do you handle locum work?", answer: "Yes — we offer permanent, contract and locum opportunities across all provinces." },
  { id: -6, category: "Process", question: "How long does the placement process take?", answer: "Most physicians receive a shortlist within 7 days. Time-to-hire averages 28 days, depending on credentialing." },
  { id: -7, category: "Process", question: "What information do employers see?", answer: "Your CV, specialty, licensure and the contact details you choose to share — never anything sensitive without your consent." },
  { id: -8, category: "Employers", question: "How do I become an employer partner?", answer: "Register on the For Employers page or contact our sales team. Onboarding takes 1–2 business days." },
];

function FAQPage() {
  const [open, setOpen] = useState<number | null>(0);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const { data: apiFaqs, isLoading } = useQuery<FAQItem[]>({
    queryKey: ["public-faqs"],
    queryFn: async () => {
      const r = await api.get("/api/faq/");
      const d = r.data?.data ?? r.data;
      return Array.isArray(d) ? d : (d?.results ?? []);
    },
    staleTime: 10 * 60 * 1000,
  });

  const faqs = (apiFaqs && apiFaqs.length > 0) ? apiFaqs : STATIC_FAQS;

  const categories = useMemo(() => {
    const cats = [...new Set(faqs.map((f) => f.category).filter(Boolean))] as string[];
    return ["All", ...cats];
  }, [faqs]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return faqs.filter((f) =>
      (cat === "All" || f.category === cat) &&
      (!needle || f.question.toLowerCase().includes(needle) || f.answer.toLowerCase().includes(needle))
    );
  }, [faqs, q, cat]);

  return (
    <div>
      <PageHeader eyebrow="Help" title="Frequently asked questions" subtitle="Quick answers to the most common questions from physicians and employers." />
      <section className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setOpen(null); }}
              placeholder="Search FAQs..."
              className="w-full rounded-lg border border-border bg-background py-3 pl-9 pr-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              maxLength={120}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => { setCat(c); setOpen(null); }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  cat === c ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground/75 hover:bg-secondary"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-secondary" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No matching questions. Try a different search or category.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((f, i) => {
              const active = open === i;
              return (
                <div key={f.id} className="rounded-2xl border border-border bg-card shadow-sm">
                  <button onClick={() => setOpen(active ? null : i)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
                    <span className="font-semibold text-primary">
                      {f.category && (
                        <span className="mr-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/70">
                          {f.category}
                        </span>
                      )}
                      {f.question}
                    </span>
                    {active ? <Minus className="h-5 w-5 shrink-0 text-accent" /> : <Plus className="h-5 w-5 shrink-0 text-accent" />}
                  </button>
                  {active && <div className="px-5 pb-5 text-sm leading-relaxed text-foreground/80">{f.answer}</div>}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-border bg-secondary/60 p-6 text-center">
          <p className="text-sm text-muted-foreground">Didn't find your answer?</p>
          <Link to="/contact" className="mt-2 inline-block font-semibold text-primary hover:underline">Contact our team →</Link>
        </div>
      </section>
    </div>
  );
}
