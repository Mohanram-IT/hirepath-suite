import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { stageTone, stageLabel } from "@/lib/pipeline";
import { toast } from "sonner";
import { ArrowLeft, FileText, Mail, Phone, MapPin, Briefcase, Plus } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/candidates/$id")({
  component: CandidateDetail,
});

function CandidateDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: candidate, isLoading } = useQuery({
    queryKey: ["candidate", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("candidates").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["candidate-applications", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_applications")
        .select("*, vacancies(id, role, clients(name))")
        .eq("candidate_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  async function openResume() {
    if (!candidate?.resume_url) return;
    const { data } = await supabase.storage.from("resumes").createSignedUrl(candidate.resume_url, 60 * 5);
    if (data?.signedUrl) {
      setResumeUrl(data.signedUrl);
      window.open(data.signedUrl, "_blank");
    }
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!candidate) return <div className="p-8">Not found. <Link to="/candidates" className="underline">Back</Link></div>;

  return (
    <div>
      <PageHeader
        title={candidate.full_name}
        subtitle={[candidate.current_title, candidate.current_company].filter(Boolean).join(" · ") || "Candidate"}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/candidates" })}><ArrowLeft className="size-4" /> Back</Button>
            <ApplyDialog candidateId={id} userId={user?.id} onDone={() => qc.invalidateQueries({ queryKey: ["candidate-applications", id] })} />
          </div>
        }
      />
      <div className="p-8 grid lg:grid-cols-3 gap-6 max-w-7xl">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {candidate.email && <div className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" /> {candidate.email}</div>}
              {candidate.phone && <div className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" /> {candidate.phone}</div>}
              {candidate.location && <div className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" /> {candidate.location}</div>}
              {candidate.linkedin_url && <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="text-accent underline block">LinkedIn</a>}
              {candidate.resume_url && (
                <Button variant="outline" size="sm" onClick={openResume} className="w-full justify-start"><FileText className="size-4" /> View resume</Button>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Compensation</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1.5">
              <Row label="Experience" value={candidate.total_experience ? `${candidate.total_experience} yrs` : "—"} />
              <Row label="Current CTC" value={candidate.current_ctc ? String(candidate.current_ctc) : "—"} />
              <Row label="Expected CTC" value={candidate.expected_ctc ? String(candidate.expected_ctc) : "—"} />
              <Row label="Notice" value={candidate.notice_period_days != null ? `${candidate.notice_period_days} days` : "—"} />
              <Row label="Source" value={candidate.source ?? "—"} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Skills & notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {(candidate.skills ?? []).length === 0 && <span className="text-muted-foreground text-sm">No skills tagged.</span>}
                {(candidate.skills ?? []).map((s) => <span key={s} className="text-xs bg-secondary px-2 py-0.5 rounded-md">{s}</span>)}
              </div>
              {candidate.notes && <p className="text-sm whitespace-pre-wrap">{candidate.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Briefcase className="size-4" /> Applications</CardTitle>
            </CardHeader>
            <CardContent>
              {applications.length === 0 && <div className="text-sm text-muted-foreground">Not shortlisted for any vacancy yet.</div>}
              <div className="space-y-2">
                {applications.map((a) => (
                  <div key={a.id} className="flex items-center justify-between border rounded-md p-3">
                    <div>
                      <Link to="/vacancies/$id" params={{ id: a.vacancy_id }} className="font-medium hover:underline">
                        {a.vacancies?.role}
                      </Link>
                      <div className="text-xs text-muted-foreground">{a.vacancies?.clients?.name ?? "—"} · added {format(new Date(a.created_at), "PP")}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-md border ${stageTone(a.stage)}`}>{stageLabel(a.stage)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}

function ApplyDialog({ candidateId, userId, onDone }: { candidateId: string; userId: string | undefined; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [vacancyId, setVacancyId] = useState("");

  const { data: vacancies = [] } = useQuery({
    queryKey: ["vacancies-open-list"],
    queryFn: async () => {
      const { data } = await supabase.from("vacancies").select("id, role, clients(name)").in("status", ["open", "in_progress"]).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: open,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!userId || !vacancyId) throw new Error("Pick a vacancy");
      const { error } = await supabase.from("candidate_applications").insert({
        candidate_id: candidateId, vacancy_id: vacancyId, created_by: userId, stage: "sourcing",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Shortlisted"); setOpen(false); setVacancyId(""); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> Shortlist for vacancy</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Shortlist candidate</DialogTitle></DialogHeader>
        <Select value={vacancyId} onValueChange={setVacancyId}>
          <SelectTrigger><SelectValue placeholder="Pick an open vacancy" /></SelectTrigger>
          <SelectContent>
            {vacancies.map((v) => <SelectItem key={v.id} value={v.id}>{v.role} — {v.clients?.name ?? "—"}</SelectItem>)}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => submit.mutate()} disabled={!vacancyId || submit.isPending}>Shortlist</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
