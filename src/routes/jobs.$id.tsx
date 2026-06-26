import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Briefcase, Send, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/jobs/$id")({
  ssr: false,
  component: JobDetail,
});

function JobDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { data: job, isLoading } = useQuery({
    queryKey: ["public-job", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vacancies")
        .select("id, role, level, location, skills, description, experience_min, experience_max, vacancy_type, created_at, clients(name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: userInfo } = useQuery({
    queryKey: ["public-job-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { user: null, candidate: null, alreadyApplied: false };
      const { data: c } = await supabase.from("candidates").select("id").eq("user_id", user.id).maybeSingle();
      let alreadyApplied = false;
      if (c) {
        const { data: app } = await supabase.from("candidate_applications").select("id").eq("candidate_id", c.id).eq("vacancy_id", id).maybeSingle();
        alreadyApplied = !!app;
      }
      return { user, candidate: c, alreadyApplied };
    },
  });

  if (isLoading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;
  if (!job) return <div className="p-12 text-center"><Link to="/jobs" className="underline">← Back to jobs</Link><div className="mt-2">Position no longer available.</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/jobs" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="size-4" /> All jobs</Link>
          {!userInfo?.user && <Button asChild size="sm"><Link to="/auth" search={{ as: "candidate" }}>Candidate sign in</Link></Button>}
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{job.role}</h1>
          <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm">
            <span className="flex items-center gap-1"><Briefcase className="size-3.5" /> {job.clients?.name ?? "—"}</span>
            {job.location && <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {job.location}</span>}
            <span>{job.level}</span>
            {(job.experience_min || job.experience_max) && <span>{job.experience_min ?? "?"}–{job.experience_max ?? "?"} yrs</span>}
          </div>
        </div>

        {(job.skills ?? []).length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Required skills</div>
            <div className="flex flex-wrap gap-1.5">
              {(job.skills ?? []).map((s) => <span key={s} className="text-xs bg-secondary px-2.5 py-1 rounded-md border">{s}</span>)}
            </div>
          </div>
        )}

        {job.description && (
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">About the role</div>
            <p className="whitespace-pre-wrap leading-relaxed">{job.description}</p>
          </div>
        )}

        <div className="border-t pt-6">
          {!userInfo?.user ? (
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-secondary/40 rounded-xl p-5">
              <div>
                <div className="font-medium">Sign in to apply</div>
                <div className="text-sm text-muted-foreground">Create a free candidate account in 30 seconds.</div>
              </div>
              <Button onClick={() => navigate({ to: "/auth", search: { as: "candidate" } })}>Sign in / Sign up</Button>
            </div>
          ) : userInfo.alreadyApplied ? (
            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900 rounded-xl p-5 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="size-5" />
              <div>
                <div className="font-medium">You've already applied to this role.</div>
                <Link to="/portal" className="text-sm underline">Track status in your portal →</Link>
              </div>
            </div>
          ) : (
            <ApplyDialog vacancyId={id} candidateId={userInfo.candidate?.id} userId={userInfo.user.id} />
          )}
        </div>
      </article>
    </div>
  );
}

function ApplyDialog({ vacancyId, candidateId, userId }: { vacancyId: string; candidateId: string | undefined; userId: string }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const apply = useMutation({
    mutationFn: async () => {
      let cid = candidateId;
      if (!cid) throw new Error("Candidate profile missing — please sign out and back in.");

      if (resumeFile) {
        const path = `${userId}/${Date.now()}-${resumeFile.name}`;
        const { error: upErr } = await supabase.storage.from("resumes").upload(path, resumeFile);
        if (upErr) throw upErr;
        await supabase.from("candidates").update({ resume_url: path }).eq("id", cid);
      }

      const { error } = await supabase.from("candidate_applications").insert({
        candidate_id: cid, vacancy_id: vacancyId, created_by: userId, stage: "screening",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Application submitted!"); setOpen(false); window.location.href = "/portal"; },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full"><Send className="size-4" /> Apply for this position</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Submit your application</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Resume (PDF, optional)</Label>
            <Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <Label>Cover note (optional)</Label>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why are you a great fit?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => apply.mutate()} disabled={apply.isPending}>{apply.isPending ? "Submitting…" : "Submit application"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
