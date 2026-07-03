import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { stageTone, stageLabel } from "@/lib/pipeline";
import { queueNotification } from "@/lib/notify";
import { toast } from "sonner";
import { ArrowLeft, FileText, Mail, Phone, MapPin, Briefcase, Plus, Calendar, Video, XCircle } from "lucide-react";
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

  const { data: interviews = [] } = useQuery({
    queryKey: ["candidate-interviews", id, applications.map((a) => a.id).join(",")],
    enabled: applications.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("interviews")
        .select("*")
        .in("application_id", applications.map((a) => a.id))
        .order("scheduled_at", { ascending: false });
      return data ?? [];
    },
  });

  async function openResume() {
    if (!candidate?.resume_url) return;
    const { data } = await supabase.storage.from("resumes").createSignedUrl(candidate.resume_url, 60 * 5);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
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
                {applications.map((a) => {
                  const appInterviews = interviews.filter((i) => i.application_id === a.id);
                  return (
                    <div key={a.id} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <Link to="/vacancies/$id" params={{ id: a.vacancy_id }} className="font-medium hover:underline">{a.vacancies?.role}</Link>
                          <div className="text-xs text-muted-foreground">{a.vacancies?.clients?.name ?? "—"} · added {format(new Date(a.created_at), "PP")}</div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-md border ${stageTone(a.stage)}`}>{stageLabel(a.stage)}</span>
                      </div>
                      <div className="flex gap-2">
                        <ScheduleInterviewDialog
                          applicationId={a.id}
                          candidateEmail={candidate.email ?? ""}
                          candidateUserId={candidate.user_id}
                          vacancyRole={a.vacancies?.role ?? ""}
                          userId={user?.id}
                          onDone={() => { qc.invalidateQueries({ queryKey: ["candidate-interviews", id] }); qc.invalidateQueries({ queryKey: ["candidate-applications", id] }); }}
                        />
                        <RejectDialog
                          applicationId={a.id}
                          candidateEmail={candidate.email ?? ""}
                          candidateUserId={candidate.user_id}
                          vacancyRole={a.vacancies?.role ?? ""}
                          onDone={() => qc.invalidateQueries({ queryKey: ["candidate-applications", id] })}
                        />
                      </div>
                      {appInterviews.length > 0 && (
                        <div className="border-t pt-2 mt-2 space-y-1">
                          {appInterviews.map((iv) => (
                            <div key={iv.id} className="text-xs flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="size-3" />
                                {format(new Date(iv.scheduled_at), "PPp")} · {iv.round_name ?? "Interview"} · {iv.status}
                              </span>
                              {iv.status === "scheduled" && (
                                <Link to="/meet/$roomId" params={{ roomId: iv.room_id }} className="text-accent hover:underline flex items-center gap-1">
                                  <Video className="size-3" /> Join
                                </Link>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("vacancies").select("id, role, clients(name)").in("status", ["open", "in_progress"]).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const submit = useMutation({
    mutationFn: async () => {
      if (!userId || !vacancyId) throw new Error("Pick a vacancy");
      const { data: existing } = await supabase
        .from("candidate_applications")
        .select("id")
        .eq("candidate_id", candidateId)
        .eq("vacancy_id", vacancyId)
        .maybeSingle();
      if (existing) throw new Error("This candidate is already on that vacancy's pipeline.");
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

function ScheduleInterviewDialog({ applicationId, candidateEmail, candidateUserId, vacancyRole, userId, onDone }: {
  applicationId: string; candidateEmail: string; candidateUserId: string | null; vacancyRole: string; userId: string | undefined; onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(45);
  const [round, setRound] = useState("Technical round 1");

  const submit = useMutation({
    mutationFn: async () => {
      if (!userId || !scheduledAt) throw new Error("Pick a time");
      const { data, error } = await supabase.from("interviews").insert({
        application_id: applicationId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: duration,
        round_name: round,
        interviewer_ids: [userId],
        created_by: userId,
        mode: "in_app",
      }).select("room_id").single();
      if (error) throw error;
      await supabase.from("candidate_applications").update({ stage: "interviewing" }).eq("id", applicationId);
      if (candidateEmail) {
        await queueNotification({
          template: "interview_scheduled",
          recipientEmail: candidateEmail,
          recipientUserId: candidateUserId,
          payload: { vacancyRole, scheduledAt, duration, round, roomUrl: `${window.location.origin}/meet/${data.room_id}` },
        });
      }
    },
    onSuccess: () => { toast.success("Interview scheduled — candidate notified"); setOpen(false); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Calendar className="size-4" /> Schedule interview</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Schedule interview · {vacancyRole}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Round</Label><Input value={round} onChange={(e) => setRound(e.target.value)} /></div>
          <div><Label>Date & time</Label><Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></div>
          <div><Label>Duration (minutes)</Label><Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></div>
          <p className="text-xs text-muted-foreground">A built-in video room will be created automatically. The candidate gets an email with the join link.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => submit.mutate()} disabled={!scheduledAt || submit.isPending}>Schedule & notify</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ applicationId, candidateEmail, candidateUserId, vacancyRole, onDone }: {
  applicationId: string; candidateEmail: string; candidateUserId: string | null; vacancyRole: string; onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("candidate_applications").update({ stage: "rejected", rejection_reason: reason || null }).eq("id", applicationId);
      if (error) throw error;
      if (candidateEmail) {
        await queueNotification({
          template: "application_rejected",
          recipientEmail: candidateEmail,
          recipientUserId: candidateUserId,
          payload: { vacancyRole, reason },
        });
      }
    },
    onSuccess: () => { toast.success("Application rejected — candidate notified"); setOpen(false); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700"><XCircle className="size-4" /> Reject</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Reject application</DialogTitle></DialogHeader>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (shared in email to candidate, optional)" />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => submit.mutate()} disabled={submit.isPending}>Reject & notify</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
