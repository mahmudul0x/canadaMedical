import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { Link } from "@tanstack/react-router";
import { Building2, MapPin, Briefcase, ArrowRight } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { ErrorState } from "@/components/site/QueryState";

interface FeaturedRecruiter {
  id: number | string;
  name: string;
  logo?: string;
  location?: string;
  province?: string;
  open_jobs?: number;
  jobs_count?: number;
  description?: string;
  specialties?: string[];
}

function useFeaturedRecruiters() {
  return useQuery({
    queryKey: ["featured-recruiters"],
    queryFn: async () => {
      const res = await api.get<FeaturedRecruiter[] | { results: FeaturedRecruiter[] }>(
        "/api/jobs/featured-recruiters/",
      );
      const data = res.data;
      return Array.isArray(data) ? data : data.results ?? [];
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    staleTime: 1000 * 60 * 5,
  });
}

const FALLBACK: FeaturedRecruiter[] = [
  { id: "tgh", name: "Toronto General Hospital", location: "Toronto, ON", open_jobs: 24, description: "One of Canada's premier academic health centres." },
  { id: "stp", name: "St. Paul's Hospital", location: "Vancouver, BC", open_jobs: 18, description: "Level 1 trauma centre in downtown Vancouver." },
  { id: "csj", name: "CHU Sainte-Justine", location: "Montreal, QC", open_jobs: 14, description: "Renowned mother-and-child university hospital." },
  { id: "ral", name: "Royal Alexandra Hospital", location: "Edmonton, AB", open_jobs: 11, description: "Large urban teaching hospital with broad case mix." },
];

export function FeaturedRecruiters() {
  const { data, isLoading, isError, error, refetch, isFetching } = useFeaturedRecruiters();
  useEffect(() => {
    if (isError) toast.error(`Featured employers: ${apiError(error)}`, { id: "feat-rec-err" });
  }, [isError, error]);
  const recruiters = (!isError && data && data.length > 0 ? data : FALLBACK).slice(0, 8);

  return (
    <section className="bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Featured Employers</p>
            <h2 className="mt-2 text-3xl font-bold text-primary sm:text-4xl">Hospitals &amp; clinics hiring now</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Canada's leading health systems and private practices actively recruiting through CandianMdJobs.
            </p>
          </div>
          <Link to="/jobs" className="text-sm font-semibold text-primary hover:text-primary-glow">
            View all employers →
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-card" />
              ))
            : recruiters.map((r) => (
                <article
                  key={r.id}
                  className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-accent"
                >
                  <div className="flex items-start gap-3">
                    {r.logo ? (
                      <img src={r.logo} alt={r.name} loading="lazy" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-soft text-primary">
                        <Building2 className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-primary">{r.name}</h3>
                      {r.location && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" /> {r.location}
                        </p>
                      )}
                    </div>
                  </div>
                  {r.description && (
                    <p className="mt-3 line-clamp-3 flex-1 text-sm text-foreground/75">{r.description}</p>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                      <Briefcase className="h-3.5 w-3.5" />
                      {(r.open_jobs ?? r.jobs_count ?? 0)} open roles
                    </span>
                    <Link
                      to="/jobs"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-glow"
                    >
                      View <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              ))}
        </div>
        {isError && (
          <div className="mt-6">
            <ErrorState
              error={error}
              title="Couldn't load featured employers"
              onRetry={() => refetch()}
            />
            {isFetching && (
              <p className="mt-2 text-xs text-muted-foreground">Retrying…</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}