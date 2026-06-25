import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { STAGES, type PipelineStage, stageTone } from "@/lib/pipeline";
import { ArrowLeft, GripVertical } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/vacancies/$id/pipeline")({
  component: VacancyPipeline,
});

type AppRow = {
  id: string;
  stage: PipelineStage;
  candidate_id: string;
  candidates: { id: string; full_name: string; current_title: string | null; current_company: string | null } | null;
};

function VacancyPipeline() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [dragId, setDragId] = useState<string | null>(null);

  const { data: vacancy } = useQuery({
    queryKey: ["vacancy", id],
    queryFn: async () => {
      const { data } = await supabase.from("vacancies").select("id, role, clients(name)").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: apps = [] } = useQuery<AppRow[]>({
    queryKey: ["vacancy-pipeline", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_applications")
        .select("id, stage, candidate_id, candidates(id, full_name, current_title, current_company)")
        .eq("vacancy_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AppRow[];
    },
  });

  const moveStage = useMutation({
    mutationFn: async ({ appId, toStage, fromStage }: { appId: string; toStage: PipelineStage; fromStage: PipelineStage }) => {
      if (toStage === fromStage) return;
      const { error } = await supabase.from("candidate_applications").update({ stage: toStage }).eq("id", appId);
      if (error) throw error;
      if (user) {
        await supabase.from("stage_history").insert({
          application_id: appId, from_stage: fromStage, to_stage: toStage, changed_by: user.id,
        });
      }
    },
    onMutate: async ({ appId, toStage }) => {
      await qc.cancelQueries({ queryKey: ["vacancy-pipeline", id] });
      const prev = qc.getQueryData<AppRow[]>(["vacancy-pipeline", id]);
      qc.setQueryData<AppRow[]>(["vacancy-pipeline", id], (cur) =>
        (cur ?? []).map((a) => (a.id === appId ? { ...a, stage: toStage } : a)),
      );
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      qc.setQueryData(["vacancy-pipeline", id], ctx?.prev);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["vacancy-pipeline", id] }),
  });

  function onDrop(toStage: PipelineStage) {
    if (!dragId) return;
    const app = apps.find((a) => a.id === dragId);
    if (!app) return;
    moveStage.mutate({ appId: dragId, toStage, fromStage: app.stage });
    setDragId(null);
  }

  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle={vacancy ? `${vacancy.role} · ${vacancy.clients?.name ?? "—"}` : ""}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/vacancies/$id", params: { id } })}>
              <ArrowLeft className="size-4" /> Back to vacancy
            </Button>
          </div>
        }
      />
      <div className="p-6 overflow-x-auto">
        <div className="flex gap-3 min-w-max pb-4">
          {STAGES.map((s) => {
            const col = apps.filter((a) => a.stage === s.key);
            return (
              <div
                key={s.key}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={() => onDrop(s.key)}
                className="w-72 shrink-0 rounded-lg border bg-card flex flex-col max-h-[calc(100vh-12rem)]"
              >
                <div className="px-3 py-2 border-b flex items-center justify-between sticky top-0 bg-card rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded border ${s.tone}`}>{s.label}</span>
                    <span className="text-xs text-muted-foreground">{col.length}</span>
                  </div>
                </div>
                <div className="p-2 space-y-2 overflow-y-auto">
                  {col.length === 0 && <div className="text-xs text-muted-foreground px-2 py-4 text-center">Drop candidates here</div>}
                  {col.map((a) => (
                    <div
                      key={a.id}
                      draggable
                      onDragStart={() => setDragId(a.id)}
                      onDragEnd={() => setDragId(null)}
                      className={`group rounded-md border bg-background p-3 cursor-grab active:cursor-grabbing hover:border-accent transition ${dragId === a.id ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <Link to="/candidates/$id" params={{ id: a.candidate_id }} className="font-medium text-sm hover:underline block truncate">
                            {a.candidates?.full_name}
                          </Link>
                          <div className="text-xs text-muted-foreground truncate">{a.candidates?.current_title ?? "—"}</div>
                          <div className="text-xs text-muted-foreground truncate">{a.candidates?.current_company ?? ""}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {apps.length === 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            No candidates shortlisted yet. Go to <Link to="/candidates" className="underline">Candidates</Link> and click <em>Shortlist for vacancy</em>.
          </div>
        )}
      </div>
    </div>
  );
}
