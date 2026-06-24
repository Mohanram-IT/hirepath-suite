import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    window.location.href = "/dashboard";
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email to confirm — or sign in if confirmation is disabled.");
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) return toast.error(String(result.error));
    if (!result.redirected) window.location.href = "/dashboard";
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-md bg-accent text-accent-foreground grid place-items-center font-bold">T</div>
          <div className="text-lg font-semibold">TalentFlow</div>
        </div>
        <div className="space-y-6 max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Hire faster.<br />Replace seamlessly.
          </h2>
          <p className="text-sidebar-foreground/70">
            End-to-end recruitment, replacement-hiring SLA tracking, candidate pipelines and
            interview orchestration — built for IT staffing teams.
          </p>
          <ul className="space-y-2 text-sm text-sidebar-foreground/80">
            <li className="flex gap-2"><Briefcase className="size-4 mt-0.5 text-accent" /> Auto-calculated deployment deadlines</li>
            <li className="flex gap-2"><Briefcase className="size-4 mt-0.5 text-accent" /> Approval-tracked target extensions</li>
            <li className="flex gap-2"><Briefcase className="size-4 mt-0.5 text-accent" /> Role-based access for HR, RMs, recruiters</li>
          </ul>
        </div>
        <div className="text-xs text-sidebar-foreground/40">© TalentFlow</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="space-y-4 pt-4">
              <form onSubmit={signIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>Sign in</Button>
              </form>
              <Divider />
              <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
            </TabsContent>
            <TabsContent value="signup" className="space-y-4 pt-4">
              <form onSubmit={signUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>Create account</Button>
                <p className="text-xs text-muted-foreground">First account becomes HR Admin automatically.</p>
              </form>
              <Divider />
              <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
            </TabsContent>
          </Tabs>
          <div className="text-center text-xs text-muted-foreground mt-6">
            <Link to="/" className="hover:underline">← Back home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="relative my-2">
      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
      <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">or</span></div>
    </div>
  );
}
