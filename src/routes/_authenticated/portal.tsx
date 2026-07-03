import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { stageLabel, stageTone } from "@/lib/pipeline";
import { Briefcase, Video, Search } from "lucide-react";
import { format, isFuture } from "date-fns";

export const Route = createFileRoute("/_authenticated/portal")({
  component: CandidatePortal,
});

function CandidatePortal() {
  const { user } = useAuth();

  const { data: candidate } = useQuery({
    queryKey: ["my-candidate", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("candidates").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["my-applications", candidate?.id],
    enabled: !!candidate,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_applications")
        .select("id, stage, created_at, vacancy_id, vacancies(id, role, level, location, clients(name))")
        .eq("candidate_id", candidate!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: interviews = [] } = useQuery({
    queryKey: ["my-interviews", candidate?.id],
    enabled: !!candidate && applications.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("interviews")
        .select("*, candidate_applications(vacancy_id, vacancies(role))")
        .in("application_id", applications.map((a) => a.id))
        .order("scheduled_at", { ascending: true });
      return data ?? [];
    },
  });

  const upcoming = interviews.filter((i) => i.status === "scheduled" && isFuture(new Date(i.scheduled_at)));

  return (
    <div>
      <PageHeader
        title={`Welcome${candidate?.full_name ? `, ${candidate.full_name.split(" ")[0]}` : ""}`}
        subtitle="Track your job applications and upcoming interviews."
        actions={<Button asChild><Link to="/jobs"><Search className="size-4" /> Browse jobs</Link></Button>}
      />


      <div className="p-8 max-w-5xl space-y-8">
        {upcoming.length > 0 && (
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-3">Upcoming interviews</h2>
            <div className="space-y-2">
              {upcoming.map((iv) => (
                <Card key={iv.id} className="border-accent/50">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{iv.candidate_applications?.vacancies?.role ?? "Interview"}</div>
                      <div className="text-sm text-muted-foreground">
                        {iv.round_name && `${iv.round_name} · `}
                        {format(new Date(iv.scheduled_at), "PPp")} · {iv.duration_minutes} min
                      </div>
                    </div>
                    <Button asChild>
                      <Link to="/meet/$roomId" params={{ roomId: iv.room_id }}>
                        <Video className="size-4" /> Join interview
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-3">My applications ({applications.length})</h2>
          {applications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Briefcase className="size-10 mx-auto text-muted-foreground mb-3" />
                <div className="font-medium">No applications yet</div>
                <div className="text-sm text-muted-foreground mb-4">Browse open positions and apply in one click.</div>
                <Button asChild><Link to="/jobs">Browse jobs</Link></Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {applications.map((a) => {
                const repl = Array.isArray(a.vacancies?.replacement_employees)
                  ? a.vacancies?.replacement_employees[0]
                  : a.vacancies?.replacement_employees;
                const targetDate = a.vacancies?.target_hiring_date ?? repl?.deployment_deadline ?? null;
                return (
                  <Card key={a.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium">{a.vacancies?.role ?? "—"}</div>
                          <div className="text-sm text-muted-foreground">
                            {a.vacancies?.clients?.name ?? "—"}
                            {a.vacancies?.location && ` · ${a.vacancies.location}`}
                            {` · applied ${format(new Date(a.created_at), "PP")}`}
                          </div>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-md border ${stageTone(a.stage)}`}>{stageLabel(a.stage)}</span>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3 text-sm border-t pt-3">
                        <Detail label="Type" value={a.vacancies?.vacancy_type === "replacement" ? "Replacement" : "New requirement"} />
                        <Detail label="Level" value={a.vacancies?.level ?? "—"} />
                        <Detail label="Deployment/target" value={targetDate ? format(new Date(targetDate), "PP") : "—"} />
                        {repl && (
                          <>
                            <Detail label="Replacing" value={repl.employee_name} />
                            <Detail label="Employee ID" value={repl.employee_code ?? "—"} />
                            <Detail label="Last working day" value={format(new Date(repl.last_working_date), "PP")} />
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
