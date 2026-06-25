import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/candidates/new")({
  component: NewCandidate,
});

function NewCandidate() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    current_company: "",
    current_title: "",
    location: "",
    total_experience: "",
    current_ctc: "",
    expected_ctc: "",
    notice_period_days: "",
    source: "",
    linkedin_url: "",
    skills: "",
    notes: "",
  });
  const [resume, setResume] = useState<File | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");

      let resumeUrl: string | null = null;
      if (resume) {
        const ext = resume.name.split(".").pop() ?? "pdf";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("resumes").upload(path, resume, { upsert: false });
        if (upErr) throw upErr;
        resumeUrl = path;
      }

      const { data, error } = await supabase
        .from("candidates")
        .insert({
          full_name: form.full_name,
          email: form.email || null,
          phone: form.phone || null,
          current_company: form.current_company || null,
          current_title: form.current_title || null,
          location: form.location || null,
          total_experience: form.total_experience ? Number(form.total_experience) : null,
          current_ctc: form.current_ctc ? Number(form.current_ctc) : null,
          expected_ctc: form.expected_ctc ? Number(form.expected_ctc) : null,
          notice_period_days: form.notice_period_days ? Number(form.notice_period_days) : null,
          source: form.source || null,
          linkedin_url: form.linkedin_url || null,
          skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
          notes: form.notes || null,
          resume_url: resumeUrl,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate added");
      navigate({ to: "/candidates/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Add candidate" subtitle="Create a candidate profile and optionally upload a resume" />
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="p-8 max-w-4xl space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <Field label="Full name *"><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
            <Field label="Current title"><Input value={form.current_title} onChange={(e) => setForm({ ...form, current_title: e.target.value })} /></Field>
            <Field label="Current company"><Input value={form.current_company} onChange={(e) => setForm({ ...form, current_company: e.target.value })} /></Field>
            <Field label="Total experience (yrs)"><Input type="number" step={0.5} min={0} value={form.total_experience} onChange={(e) => setForm({ ...form, total_experience: e.target.value })} /></Field>
            <Field label="Notice period (days)"><Input type="number" min={0} value={form.notice_period_days} onChange={(e) => setForm({ ...form, notice_period_days: e.target.value })} /></Field>
            <Field label="Current CTC"><Input type="number" min={0} value={form.current_ctc} onChange={(e) => setForm({ ...form, current_ctc: e.target.value })} /></Field>
            <Field label="Expected CTC"><Input type="number" min={0} value={form.expected_ctc} onChange={(e) => setForm({ ...form, expected_ctc: e.target.value })} /></Field>
            <Field label="Source"><Input placeholder="LinkedIn, Naukri, Referral…" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></Field>
            <Field label="LinkedIn URL"><Input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} /></Field>
            <Field label="Skills (comma-separated)" full><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="React, Node, AWS" /></Field>
            <Field label="Internal notes" full><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Resume</CardTitle></CardHeader>
          <CardContent>
            <label className="flex items-center gap-3 border-2 border-dashed rounded-md px-4 py-6 cursor-pointer hover:bg-secondary/40">
              <Upload className="size-5 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-sm font-medium">{resume?.name ?? "Click to upload PDF or DOCX"}</div>
                <div className="text-xs text-muted-foreground">Max 10 MB</div>
              </div>
              <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setResume(e.target.files?.[0] ?? null)} />
            </label>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="ghost" onClick={() => navigate({ to: "/candidates" })}>Cancel</Button>
          <Button type="submit" disabled={create.isPending}>{create.isPending ? "Saving…" : "Save candidate"}</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={`space-y-1.5 ${full ? "md:col-span-2" : ""}`}><Label>{label}</Label>{children}</div>;
}
