import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Calendar } from "lucide-react";
import { format, isFuture, isPast } from "date-fns";

export const Route = createFileRoute("/_authenticated/interviews/")({
  component: InterviewsList,
});

function InterviewsList() {
  const { data: interviews = [], isLoading } = useQuery({
    queryKey: ["all-interviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interviews")
        .select(`
          *,
          candidate_applications(
            id, stage,
            candidates(id, full_name, email),
            vacancies(id, role, clients(name))
          )
        `)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const upcoming = interviews.filter((i) => i.status === "scheduled" && isFuture(new Date(i.scheduled_at)));
  const past = interviews.filter((i) => i.status !== "scheduled" || isPast(new Date(i.scheduled_at)));

  return (
    <div>
      <PageHeader title="Interviews" subtitle="All scheduled candidate interviews across vacancies." />
      <div className="p-8 max-w-5xl space-y-8">
        {isLoading && <div className="text-muted-foreground">Loading…</div>}

        <Section title="Upcoming" items={upcoming} empty="No upcoming interviews." />
        <Section title="Past" items={past} empty="No past interviews." muted />
      </div>
    </div>
  );
}

function Section({ title, items, empty, muted }: { title: string; items: any[]; empty: string; muted?: boolean }) {
  return (
    <div>
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
        <Calendar className="size-4" /> {title} ({items.length})
      </h2>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground border rounded-lg p-6">{empty}</div>
      ) : (
        <div className="space-y-2">
          {items.map((iv) => {
            const app = iv.candidate_applications;
            return (
              <Card key={iv.id} className={muted ? "opacity-75" : ""}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {app?.candidates?.full_name ?? "—"} · <span className="text-muted-foreground">{app?.vacancies?.role ?? "—"}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {iv.round_name && `${iv.round_name} · `}
                      {format(new Date(iv.scheduled_at), "PPp")} · {iv.duration_minutes} min · {iv.status}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {app?.candidates?.id && (
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/candidates/$id" params={{ id: app.candidates.id }}>Candidate</Link>
                      </Button>
                    )}
                    {iv.status === "scheduled" && (
                      <Button asChild size="sm">
                        <Link to="/meet/$roomId" params={{ roomId: iv.room_id }}><Video className="size-4" /> Join</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
