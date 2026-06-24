import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computeSla, toneClasses } from "@/lib/sla";
import { Plus, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/vacancies/")({
  component: VacancyList,
});

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  on_hold: "On Hold",
  closed: "Closed",
  cancelled: "Cancelled",
};

function VacancyList() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [type, setType] = useState<string>("all");

  const { data: vacancies = [], isLoading } = useQuery({
    queryKey: ["vacancies", status, type],
    queryFn: async () => {
      let query = supabase
        .from("vacancies")
        .select("*, clients(name), replacement_employees(deployment_deadline)")
        .order("created_at", { ascending: false });
      if (status !== "all") query = query.eq("status", status as never);
      if (type !== "all") query = query.eq("vacancy_type", type as never);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = vacancies.filter((v) => {
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    return (
      v.role?.toLowerCase().includes(t) ||
      v.location?.toLowerCase().includes(t) ||
      v.clients?.name?.toLowerCase().includes(t)
    );
  });

  return (
    <div>
      <PageHeader
        title="Vacancies"
        subtitle="All open and historical requirements"
        actions={
          <Button asChild>
            <Link to="/vacancies/new"><Plus className="size-4" /> New vacancy</Link>
          </Button>
        }
      />
      <div className="p-8 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search role, client, location…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="new_requirement">New Requirement</SelectItem>
              <SelectItem value="replacement">Replacement</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Level</th>
                <th className="text-left px-4 py-3">Location</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No vacancies found.</td></tr>
              )}
              {filtered.map((v) => {
                const repl = Array.isArray(v.replacement_employees) ? v.replacement_employees[0] : v.replacement_employees;
                const targetDate = v.target_hiring_date ?? repl?.deployment_deadline ?? null;
                const sla = computeSla(targetDate as string | null);
                return (
                  <tr key={v.id} className="hover:bg-secondary/40 cursor-pointer">
                    <td className="px-4 py-3" colSpan={7}>
                      <Link to="/vacancies/$id" params={{ id: v.id }} className="grid grid-cols-[1fr_1fr_60px_1fr_120px_120px_120px] gap-4 items-center -mx-4 -my-3 px-4 py-3">
                        <span className="font-medium">{v.role}</span>
                        <span className="text-muted-foreground">{v.clients?.name ?? "—"}</span>
                        <span className="text-xs">{v.level}</span>
                        <span className="text-muted-foreground">{v.location ?? "—"}</span>
                        <span className="text-xs">{v.vacancy_type === "replacement" ? "Replacement" : "New"}</span>
                        <span className="text-xs">{STATUS_LABELS[v.status]}</span>
                        <span>{sla ? <span className={`text-xs px-2 py-1 rounded-md border ${toneClasses[sla.tone]}`}>{sla.label}</span> : <span className="text-xs text-muted-foreground">—</span>}</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
