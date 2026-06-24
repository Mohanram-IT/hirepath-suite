import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/use-auth";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Building2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clients")({
  component: ClientsPage,
});

function ClientsPage() {
  const { user } = useAuth();
  const { isAdmin } = useRoles(user?.id);
  const qc = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-full"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").order("name");
      return data ?? [];
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contact_person: "", contact_email: "", notes: "" });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").insert({ ...form, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Client added"); setOpen(false); setForm({ name: "", contact_person: "", contact_email: "", notes: "" }); qc.invalidateQueries({ queryKey: ["clients-full"] }); qc.invalidateQueries({ queryKey: ["clients"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Companies you recruit for"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4" /> New client</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New client</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Contact person</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
                <div><Label>Contact email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => create.mutate()} disabled={!form.name || create.isPending}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="p-8">
        {clients.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">
            <Building2 className="size-8 mx-auto mb-2 opacity-50" />
            <div>No clients yet.</div>
            {!isAdmin && <div className="text-xs mt-2">Only HR Admin or Recruitment Manager can add clients.</div>}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-5">
                  <div className="font-semibold">{c.name}</div>
                  {c.contact_person && <div className="text-sm text-muted-foreground mt-1">{c.contact_person}</div>}
                  {c.contact_email && <div className="text-sm">{c.contact_email}</div>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
