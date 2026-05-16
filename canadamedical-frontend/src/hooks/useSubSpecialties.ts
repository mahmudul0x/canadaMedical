import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { api, apiError } from "@/lib/api";

export interface SubSpecialty {
  id: number | string;
  name: string;
  specialty?: string;
}

export function useSubSpecialties(specialty?: string) {
  const q = useQuery({
    queryKey: ["sub-specialties", specialty ?? "all"],
    queryFn: async () => {
      const res = await api.get<SubSpecialty[] | { results: SubSpecialty[] }>(
        "/api/jobs/sub-specialties/",
        { params: specialty ? { specialty } : undefined },
      );
      const data = res.data as SubSpecialty[] | { results: SubSpecialty[] };
      return Array.isArray(data) ? data : data.results ?? [];
    },
    staleTime: 1000 * 60 * 10,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
  });
  useEffect(() => {
    if (q.isError) toast.error(`Sub-specialties: ${apiError(q.error)}`, { id: "sub-spec-err" });
  }, [q.isError, q.error]);
  return q;
}