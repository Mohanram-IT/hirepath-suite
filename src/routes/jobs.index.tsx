import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Briefcase, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/jobs/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Open jobs — TalentFlow" },
      { name: "description", content: "Browse live IT openings on TalentFlow and apply in one click." },
    ],
  }),
  component: JobsList,
});

function JobsList() {
  const [q, setQ] = useState("");

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["public-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vacancies")
        .select("id, role, level, location, skills, experience_min, experience_max, created_at, vacancy_type, clients(name)")
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = jobs.filter((j) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      j.role.toLowerCase().includes(s) ||
      (j.location ?? "").toLowerCase().includes(s) ||
      (j.skills ?? []).some((k) => k.toLowerCase().includes(s)) ||
      (j.clients?.name ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">T</div>
            <span className="font-semibold tracking-tight">TalentFlow</span>
          </Link>
          <div className="flex gap-2">
            <Button asChild variant="ghost"><Link to="/auth" search={{ as: "candidate" }}>Candidate sign in</Link></Button>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Open positions</h1>
        <p className="text-muted-foreground mt-1">{jobs.length} live {jobs.length === 1 ? "opening" : "openings"} across all clients.</p>

        <div className="relative mt-6 max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search role, skill, location…" className="pl-9" />
        </div>

        <div className="mt-8 space-y-3">
          {isLoading && <div className="text-muted-foreground">Loading…</div>}
          {!isLoading && filtered.length === 0 && <div className="text-muted-foreground border rounded-lg p-12 text-center">No openings match your search.</div>}
          {filtered.map((j) => (
            <Link key={j.id} to="/jobs/$id" params={{ id: j.id }} className="block border rounded-lg p-5 hover:border-accent hover:shadow-sm transition bg-card group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg group-hover:text-accent transition">{j.role}</h3>
                    {j.vacancy_type === "replacement" && <span className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded">Replacement</span>}
                  </div>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1"><Briefcase className="size-3" /> {j.clients?.name ?? "—"}</span>
                    {j.location && <span className="flex items-center gap-1"><MapPin className="size-3" /> {j.location}</span>}
                    <span>{j.level}</span>
                    {(j.experience_min || j.experience_max) && <span>{j.experience_min ?? "?"}–{j.experience_max ?? "?"} yrs</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(j.skills ?? []).slice(0, 6).map((s) => <span key={s} className="text-xs bg-secondary px-2 py-0.5 rounded-md">{s}</span>)}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  <div>{format(new Date(j.created_at), "PP")}</div>
                  <ArrowRight className="size-4 mt-2 ml-auto group-hover:translate-x-1 transition" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
