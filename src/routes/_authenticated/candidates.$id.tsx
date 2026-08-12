import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { COL, type CandidateDoc, type ApplicationDoc, type InterviewDoc, type VacancyDoc } from "@/integrations/firebase/schema";
import { createDocIn, getDocById, listDocs, listRecent, listWhereIn, toDate, updateDocIn, where } from "@/integrations/firebase/db";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ResumeUpload } from "@/components/resume-upload";
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
    queryFn: () => getDocById<CandidateDoc>(COL.candidates, id),
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["candidate-applications", id],
    queryFn: () => listRecent<ApplicationDoc>(COL.applications, where("candidate_id", "==", id)),
  });

  const applicationIds = applications.map((a) => a.id);

  const { data: interviews = [] } = useQuery({
    queryKey: ["candidate-interviews", id, applicationIds.join(",")],
    enabled: applicationIds.length > 0,
    queryFn: async () => {
      const rows = await listWhereIn<InterviewDoc>(COL.interviews, "application_id", applicationIds);
      return rows.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
    },
  });

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
            <ApplyDialog
              candidateId={id}
              candidateName={candidate.full_name}
              candidateUserId={candidate.user_id ?? null}
              userId={user?.id}
              onDone={() => qc.invalidateQueries({ queryKey: ["candidate-applications", id] })}
            />
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
                <Button variant="outline" size="sm" asChild className="w-full justify-start">
                  <a href={candidate.resume_url} target="_blank" rel="noreferrer"><FileText className="size-4" /> View resume</a>
                </Button>
              )}
              <ResumeUpload
                value={candidate.resume_url ?? ""}
                label={candidate.resume_url ? "Replace resume" : "Attach resume"}
                onChange={async (url) => {
                  await updateDocIn(COL.candidates, id, { resume_url: url || null });
                  qc.invalidateQueries({ queryKey: ["candidate", id] });
                }}
              />

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
                  const created = toDate(a.created_at);
                  return (
                    <div key={a.id} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <Link to="/vacancies/$id" params={{ id: a.vacancy_id }} className="font-medium hover:underline">{a.vacancy_role ?? "Vacancy"}</Link>
                          <div className="text-xs text-muted-foreground">{created ? `added ${format(created, "PP")}` : "—"}</div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-md border ${stageTone(a.stage)}`}>{stageLabel(a.stage)}</span>
                      </div>
                      <div className="flex gap-2">
                        <ScheduleInterviewDialog
                          applicationId={a.id}
                          vacancyId={a.vacancy_id}
                          candidateEmail={candidate.email ?? ""}
                          candidateUserId={candidate.user_id ?? null}
                          vacancyRole={a.vacancy_role ?? ""}
                          userId={user?.id}
                          onDone={() => { qc.invalidateQueries({ queryKey: ["candidate-interviews", id] }); qc.invalidateQueries({ queryKey: ["candidate-applications", id] }); }}
                        />
                        <RejectDialog
                          applicationId={a.id}
                          candidateEmail={candidate.email ?? ""}
                          candidateUserId={candidate.user_id ?? null}
                          vacancyRole={a.vacancy_role ?? ""}
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

function ApplyDialog({ candidateId, candidateName, candidateUserId, userId, onDone }: {
  candidateId: string; candidateName: string; candidateUserId: string | null; userId: string | undefined; onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [vacancyId, setVacancyId] = useState("");
  const { data: vacancies = [] } = useQuery({
    queryKey: ["vacancies-open-list"],
    enabled: open,
    queryFn: async () => {
      const rows = await listDocs<VacancyDoc>(COL.vacancies, where("status", "in", ["open", "in_progress"]));
      return rows;
    },
  });
  const submit = useMutation({
    mutationFn: async () => {
      if (!userId || !vacancyId) throw new Error("Pick a vacancy");
      const existing = await listDocs<ApplicationDoc>(
        COL.applications,
        where("candidate_id", "==", candidateId),
        where("vacancy_id", "==", vacancyId),
      );
      if (existing.length > 0) throw new Error("This candidate is already on that vacancy's pipeline.");
      const vacancy = vacancies.find((v) => v.id === vacancyId);
      await createDocIn(COL.applications, {
        candidate_id: candidateId,
        candidate_user_id: candidateUserId,
        candidate_name: candidateName,
        vacancy_id: vacancyId,
        vacancy_role: vacancy?.role ?? null,
        stage: "sourcing",
        score: null,
        assigned_recruiter: null,
        hiring_manager_feedback: null,
        rejection_reason: null,
        created_by: userId,
      });
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
            {vacancies.map((v) => <SelectItem key={v.id} value={v.id}>{v.role} — {v.client_name ?? "—"}</SelectItem>)}
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

function ScheduleInterviewDialog({ applicationId, vacancyId, candidateEmail, candidateUserId, vacancyRole, userId, onDone }: {
  applicationId: string; vacancyId: string; candidateEmail: string; candidateUserId: string | null; vacancyRole: string; userId: string | undefined; onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(45);
  const [round, setRound] = useState("Technical round 1");

  const submit = useMutation({
    mutationFn: async () => {
      if (!userId || !scheduledAt) throw new Error("Pick a time");
      const roomId = crypto.randomUUID();
      await createDocIn(COL.interviews, {
        application_id: applicationId,
        candidate_user_id: candidateUserId,
        vacancy_id: vacancyId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: duration,
        round_name: round,
        interviewer_ids: [userId],
        room_id: roomId,
        external_link: null,
        status: "scheduled",
        rating: null,
        feedback: null,
        cancellation_reason: null,
        mode: "in_app",
        created_by: userId,
      });
      await updateDocIn(COL.applications, applicationId, { stage: "interviewing" });
      if (candidateEmail) {
        await queueNotification({
          template: "interview_scheduled",
          recipientEmail: candidateEmail,
          recipientUserId: candidateUserId,
          payload: { vacancyRole, scheduledAt, duration, round, roomUrl: `${window.location.origin}/meet/${roomId}` },
        });
      }
    },
    onSuccess: () => { toast.success("Interview scheduled"); setOpen(false); onDone(); },
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
          <p className="text-xs text-muted-foreground">A built-in video room is created automatically. The candidate gets an email with the join link.</p>
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
      await updateDocIn(COL.applications, applicationId, { stage: "rejected", rejection_reason: reason || null });
      if (candidateEmail) {
        await queueNotification({
          template: "application_rejected",
          recipientEmail: candidateEmail,
          recipientUserId: candidateUserId,
          payload: { vacancyRole, reason },
        });
      }
    },
    onSuccess: () => { toast.success("Application rejected"); setOpen(false); onDone(); },
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
