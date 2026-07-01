import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateStaffUser } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "hr_admin",
    });
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AdminUsersPage,
});

function randomPassword(len = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

function AdminUsersPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"recruiter" | "hr_admin">("recruiter");
  const [password, setPassword] = useState(() => randomPassword());
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await adminCreateStaffUser({ data: { email, fullName, role, password } });
      if ("emailWarning" in res && res.emailWarning) {
        toast.warning(`User created, but email failed: ${res.emailWarning}`);
      } else {
        toast.success(`${role === "hr_admin" ? "HR admin" : "Recruiter"} account created and credentials emailed.`);
      }
      setEmail(""); setFullName(""); setPassword(randomPassword());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create user");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Staff accounts</h1>
        <p className="text-sm text-muted-foreground mt-1">Create recruiter or HR admin accounts. Credentials are emailed to the user.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus className="size-5" /> New staff user</CardTitle>
          <CardDescription>They'll sign in with the email and password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "recruiter" | "hr_admin")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recruiter">Recruiter</SelectItem>
                    <SelectItem value="hr_admin">HR admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <div className="flex gap-2">
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                  <Button type="button" variant="outline" onClick={() => setPassword(randomPassword())}>Regenerate</Button>
                </div>
              </div>
            </div>
            <Button type="submit" disabled={busy || !email || !fullName || password.length < 8}>
              {busy ? "Creating…" : "Create account & email credentials"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
