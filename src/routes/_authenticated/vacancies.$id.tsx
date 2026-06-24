import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/use-auth";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { computeSla, toneClasses } from "@/lib/sla";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, History } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/vacancies/$id")({
  component: VacancyDetail,
});

const STATUS_LABELS: Record<string, string> = {
  open: "Open", in_progress: "In Progress", on_hold: "On Hold", closed: "Closed", cancelled: "Cancelled",
};

function VacancyDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isAdmin } = useRoles(user?.id);

  const { data: vacancy, isLoading } = useQuery({
    queryKey: ["vacancy", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vacancies")
        .select("*, clients(id, name), replacement_employees(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("vacancy_id", id)
        .order("created_at", { ascending: false });
      if (!data) return [];
      const authorIds = [...new Set(data.map((c) => c.author_id))];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", authorIds);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return data.map((c) => ({ ...c, author: map.get(c.author_id) ?? null }));
    },
  });

  const { data: extensions = [] } = useQuery({
    queryKey: ["extensions", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("extensions")
        .select("*")
        .eq("vacancy_id", id)
        .order("approved_at", { ascending: false });
      if (!data) return [];
      const ids = [...new Set(data.map((e) => e.approved_by).filter(Boolean))] as string[];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return data.map((e) => ({ ...e, approver: e.approved_by ? map.get(e.approved_by) : null }));
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("vacancies").update({ status: status as never }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vacancy", id] }); toast.success("Status updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [comment, setComment] = useState("");
  const addComment = useMutation({
    mutationFn: async () => {
      if (!user || !comment.trim()) return;
      const { error } = await supabase.from("comments").insert({
        vacancy_id: id, author_id: user.id, body: comment.trim(), kind: "internal",
      });
      if (error) throw error;
    },
    onSuccess: () => { setComment(""); qc.invalidateQueries({ queryKey: ["comments", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!vacancy) return <div className="p-8">Not found. <Link to="/vacancies" className="underline">Back</Link></div>;

  const repl = Array.isArray(vacancy.replacement_employees) ? vacancy.replacement_employees[0] : vacancy.replacement_employees;
  const targetDate = vacancy.target_hiring_date ?? repl?.deployment_deadline ?? null;
  const sla = computeSla(targetDate as string | null);

  return (
    <div>
      <PageHeader
        title={vacancy.role}
        subtitle={`${vacancy.clients?.name ?? "No client"} · ${vacancy.level} · ${vacancy.location ?? "—"}`}
        actions={
          <div className="flex gap-2 items-center">
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/vacancies" })}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Select value={vacancy.status} onValueChange={(v) => updateStatus.mutate(v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />
      <div className="p-8 grid lg:grid-cols-3 gap-6 max-w-7xl">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Overview</CardTitle>
              {sla && <span className={`text-xs px-2 py-1 rounded-md border ${toneClasses[sla.tone]}`}>{sla.label} · {sla.status}</span>}
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <Info label="Type" value={vacancy.vacancy_type === "replacement" ? "Replacement" : "New Requirement"} />
              <Info label="Openings" value={String(vacancy.openings)} />
              <Info label="Experience" value={vacancy.experience_min || vacancy.experience_max ? `${vacancy.experience_min ?? "?"} – ${vacancy.experience_max ?? "?"} yrs` : "—"} />
              <Info label="Target date" value={targetDate ?? "—"} />
              <Info label="Created" value={format(new Date(vacancy.created_at), "PP")} />
              <Info label="Status" value={STATUS_LABELS[vacancy.status]} />
              <div className="col-span-full">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {(vacancy.skills ?? []).length === 0 && <span className="text-muted-foreground text-sm">—</span>}
                  {(vacancy.skills ?? []).map((s) => <span key={s} className="text-xs bg-secondary px-2 py-0.5 rounded-md">{s}</span>)}
                </div>
              </div>
              {vacancy.description && (
                <div className="col-span-full">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Description</div>
                  <p className="whitespace-pre-wrap">{vacancy.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {repl && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarClock className="size-4" /> Replacement details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                <Info label="Employee" value={repl.employee_name} />
                <Info label="Employee ID" value={repl.employee_code ?? "—"} />
                <Info label="Resignation" value={repl.resignation_date} />
                <Info label="Notice period" value={`${repl.notice_period_days} days`} />
                <Info label="Last working date" value={repl.last_working_date} />
                <Info label="Early relieving" value={repl.early_relieving_date ?? "—"} />
                <div className="col-span-full rounded-md border bg-secondary/50 px-4 py-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Deployment deadline</div>
                  <div className="font-semibold text-lg">{repl.deployment_deadline}</div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Notes & timeline</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add an internal note…" />
                <Button onClick={() => addComment.mutate()} disabled={!comment.trim() || addComment.isPending}>Post</Button>
              </div>
              <div className="space-y-3">
                {comments.length === 0 && <div className="text-sm text-muted-foreground">No notes yet.</div>}
                {comments.map((c) => (
                  <div key={c.id} className="border-l-2 border-accent pl-3">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{c.author?.full_name ?? c.author?.email ?? "Someone"}</span> · {format(new Date(c.created_at), "PPp")}
                    </div>
                    <div className="text-sm mt-0.5 whitespace-pre-wrap">{c.body}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><History className="size-4" /> Target extensions</CardTitle>
              {isAdmin && <ExtendDialog vacancyId={id} currentTarget={targetDate as string | null} onDone={() => { qc.invalidateQueries({ queryKey: ["vacancy", id] }); qc.invalidateQueries({ queryKey: ["extensions", id] }); }} />}
            </CardHeader>
            <CardContent>
              {extensions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No extensions yet.</div>
              ) : (
                <div className="space-y-3">
                  {extensions.map((e) => (
                    <div key={e.id} className="text-sm border rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <div><span className="text-muted-foreground line-through">{e.original_date}</span> → <span className="font-semibold">{e.extended_date}</span></div>
                        <div className="text-xs text-muted-foreground">{format(new Date(e.approved_at), "PP")}</div>
                      </div>
                      <div className="mt-1">{e.reason}</div>
                      {e.approval_notes && <div className="text-xs text-muted-foreground mt-1">{e.approval_notes}</div>}
                      <div className="text-xs text-muted-foreground mt-1">by {e.approver?.full_name ?? e.approver?.email ?? "—"}</div>
                    </div>
                  ))}
                </div>
              )}
              {!isAdmin && <div className="text-xs text-muted-foreground mt-2">Only HR Admin can extend target dates.</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

function ExtendDialog({ vacancyId, currentTarget, onDone }: { vacancyId: string; currentTarget: string | null; onDone: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [extendedDate, setExtendedDate] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      if (!user || !currentTarget) throw new Error("Missing data");
      const { error } = await supabase.from("extensions").insert({
        vacancy_id: vacancyId,
        original_date: currentTarget,
        extended_date: extendedDate,
        reason,
        approval_notes: notes || null,
        approved_by: user.id,
      });
      if (error) throw error;
      // Update vacancy target date (works whether replacement or not — we shadow it)
      const { error: e2 } = await supabase.from("vacancies").update({ target_hiring_date: extendedDate }).eq("id", vacancyId);
      if (e2) throw e2;
    },
    onSuccess: () => { toast.success("Target date extended"); setOpen(false); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Extend</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Extend target date</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>New target date</Label>
            <Input type="date" value={extendedDate} onChange={(e) => setExtendedDate(e.target.value)} />
            <div className="text-xs text-muted-foreground mt-1">Current: {currentTarget ?? "—"}</div>
          </div>
          <div>
            <Label>Reason *</Label>
            <Textarea required value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div>
            <Label>Approval notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => submit.mutate()} disabled={!extendedDate || !reason || submit.isPending}>Approve & extend</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
