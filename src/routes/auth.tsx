import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Briefcase, Users, Mail, KeyRound, ArrowLeft, Lock } from "lucide-react";
import { requestEmailOtp, verifyEmailOtp, checkNeedsReverify } from "@/lib/otp.functions";
import { markPasswordLoginFn } from "@/lib/auth.functions";

const searchSchema = z.object({ as: z.enum(["candidate", "recruiter"]).default("recruiter") });

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

type Mode = "signin" | "signup" | "reverify";

function AuthPage() {
  const { as } = Route.useSearch();
  const isCandidate = as === "candidate";
  const [mode, setMode] = useState<Mode>("signin");

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className={`hidden lg:flex flex-col justify-between p-12 ${isCandidate ? "bg-accent text-accent-foreground" : "bg-sidebar text-sidebar-foreground"}`}>
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-md bg-background text-foreground grid place-items-center font-bold">T</div>
          <div className="text-lg font-semibold">TalentFlow</div>
        </div>
        <div className="space-y-6 max-w-md">
          {isCandidate ? <Users className="size-10" /> : <Briefcase className="size-10" />}
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            {isCandidate ? <>Find your next role.<br />Track every step.</> : <>Hire faster.<br />Replace seamlessly.</>}
          </h2>
          <p className="opacity-80">
            {isCandidate
              ? "Apply to open IT positions, track your application status, and join interviews — all in one place."
              : "End-to-end recruitment, replacement-hiring SLA tracking, candidate pipelines, and in-app interview orchestration."}
          </p>
        </div>
        <div className="text-xs opacity-50">© TalentFlow</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-2 text-xs">
            <Link to="/" className="text-muted-foreground hover:underline flex items-center gap-1"><ArrowLeft className="size-3" /> Home</Link>
            <span className="text-muted-foreground">·</span>
            <Link to="/auth" search={{ as: isCandidate ? "recruiter" : "candidate" }} className="text-muted-foreground hover:underline">
              Switch to {isCandidate ? "staff" : "candidate"} portal
            </Link>
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isCandidate ? "Candidate portal" : "Staff portal"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin" && "Sign in with your email and password."}
              {mode === "signup" && "Create your account. We'll verify your email with a 6-digit code."}
              {mode === "reverify" && "It's been over 24 hours. Verify your email to continue."}
            </p>
          </div>

          {mode === "reverify" ? (
            <ReverifyPanel isCandidate={isCandidate} onDone={() => setMode("signin")} onBack={() => setMode("signin")} />
          ) : isCandidate ? (
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="mt-4">
                <SignInPanel isCandidate onNeedReverify={() => setMode("reverify")} />
              </TabsContent>
              <TabsContent value="signup" className="mt-4">
                <SignUpPanel />
              </TabsContent>
            </Tabs>
          ) : (
            <SignInPanel isCandidate={false} onNeedReverify={() => setMode("reverify")} />
          )}

          {!isCandidate && (
            <p className="text-xs text-muted-foreground text-center">
              Staff accounts are created by an admin. Contact your HR admin if you need access.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SignInPanel({ isCandidate, onNeedReverify }: { isCandidate: boolean; onNeedReverify: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // Check if we need OTP re-verification first (>24h since last login)
      const { needsReverify } = await checkNeedsReverify({ data: { email } });
      if (needsReverify) {
        toast.info("It's been over 24 hours — please verify your email.");
        // stash password in sessionStorage so we can complete the login after OTP
        sessionStorage.setItem("pending_password", password);
        sessionStorage.setItem("pending_email", email);
        onNeedReverify();
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        try { await markPasswordLoginFn({ data: { userId: data.user.id } }); } catch { /* noop */ }
      }
      toast.success("Signed in");
      window.location.href = isCandidate ? "/portal" : "/dashboard";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Email</Label>
        <div className="relative">
          <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="you@company.com" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Password</Label>
        <div className="relative">
          <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" placeholder="••••••••" />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={busy || !email || !password}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function SignUpPanel() {
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setBusy(true);
    try {
      await requestEmailOtp({
        data: { email, fullName, password, signupAs: "candidate", purpose: "signup" },
      });
      toast.success(`Code sent to ${email}`);
      setStep("otp");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (otp.length !== 6) return;
    setBusy(true);
    try {
      const { token_hash, type } = await verifyEmailOtp({ data: { email, code: otp } });
      const { error } = await supabase.auth.verifyOtp({ token_hash, type });
      if (error) throw error;
      toast.success("Account created");
      window.location.href = "/portal";
    } catch (err) {
      setOtp("");
      toast.error(err instanceof Error ? err.message : "Could not verify code");
    } finally {
      setBusy(false);
    }
  }

  if (step === "form") {
    return (
      <form onSubmit={sendCode} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Full name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" required />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <div className="relative">
            <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Password <span className="text-muted-foreground font-normal">(min 8 chars)</span></Label>
          <div className="relative">
            <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={busy || !email || !fullName || password.length < 8}>
          {busy ? "Sending…" : "Send verification code"}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">Enter the 6-digit code sent to {email}</p>
      <div className="flex justify-center">
        <InputOTP maxLength={6} value={otp} onChange={setOtp} onComplete={verify}>
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <Button onClick={verify} className="w-full" disabled={busy || otp.length !== 6}>
        <KeyRound className="size-4" /> {busy ? "Verifying…" : "Create account"}
      </Button>
      <button type="button" onClick={() => { setStep("form"); setOtp(""); }} className="text-sm text-muted-foreground hover:underline w-full text-center">
        Back
      </button>
    </div>
  );
}

function ReverifyPanel({ isCandidate, onDone, onBack }: { isCandidate: boolean; onDone: () => void; onBack: () => void }) {
  const [email, setEmail] = useState(() => sessionStorage.getItem("pending_email") ?? "");
  const [step, setStep] = useState<"send" | "otp">(email ? "send" : "send");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    if (!email) { toast.error("Enter your email"); return; }
    setBusy(true);
    try {
      await requestEmailOtp({ data: { email, purpose: "reverify" } });
      toast.success(`Code sent to ${email}`);
      setStep("otp");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (otp.length !== 6) return;
    setBusy(true);
    try {
      const { token_hash, type } = await verifyEmailOtp({ data: { email, code: otp } });
      const { error } = await supabase.auth.verifyOtp({ token_hash, type });
      if (error) throw error;
      const pw = sessionStorage.getItem("pending_password");
      sessionStorage.removeItem("pending_password");
      sessionStorage.removeItem("pending_email");
      if (pw) {
        // Session is already established via magiclink verification — good to go
      }
      toast.success("Verified");
      window.location.href = isCandidate ? "/portal" : "/dashboard";
      onDone();
    } catch (err) {
      setOtp("");
      toast.error(err instanceof Error ? err.message : "Could not verify code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {step === "send" ? (
        <>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
            </div>
          </div>
          <Button onClick={sendCode} className="w-full" disabled={busy || !email}>
            {busy ? "Sending…" : "Send verification code"}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground text-center">Enter the code sent to {email}</p>
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp} onComplete={verify}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button onClick={verify} className="w-full" disabled={busy || otp.length !== 6}>
            {busy ? "Verifying…" : "Verify"}
          </Button>
        </>
      )}
      <button type="button" onClick={onBack} className="text-sm text-muted-foreground hover:underline w-full text-center">
        Back to sign in
      </button>
    </div>
  );
}
