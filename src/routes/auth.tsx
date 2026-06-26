import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Briefcase, Users, Mail, KeyRound, ArrowLeft } from "lucide-react";

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

function AuthPage() {
  const { as } = Route.useSearch();
  const navigate = useNavigate();
  const isCandidate = as === "candidate";

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin,
        data: isCandidate ? { signup_as: "candidate", full_name: fullName || undefined } : { full_name: fullName || undefined },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Code sent to ${email}`);
    setStep("otp");
  }

  async function verifyOtp() {
    if (otp.length !== 6) return;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    setBusy(false);
    if (error) { setOtp(""); return toast.error(error.message); }
    toast.success("Signed in");
    window.location.href = isCandidate ? "/portal" : "/dashboard";
  }

  async function resend() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, data: isCandidate ? { signup_as: "candidate" } : {} } });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("New code sent");
  }

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
            <Link
              to="/auth"
              search={{ as: isCandidate ? "recruiter" : "candidate" }}
              className="text-muted-foreground hover:underline"
            >
              Switch to {isCandidate ? "staff" : "candidate"} portal
            </Link>
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isCandidate ? "Candidate portal" : "Staff portal"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {step === "email"
                ? "Enter your email — we'll send you a 6-digit code."
                : `Enter the 6-digit code sent to ${email}.`}
            </p>
          </div>

          {step === "email" ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Full name <span className="text-muted-foreground font-normal">(optional, for new accounts)</span></Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="you@company.com" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={busy || !email}>
                {busy ? "Sending…" : "Send 6-digit code"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                No password needed. We'll email you a one-time code each time you sign in.
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp} onComplete={verifyOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button onClick={verifyOtp} className="w-full" disabled={busy || otp.length !== 6}>
                <KeyRound className="size-4" /> {busy ? "Verifying…" : "Verify & sign in"}
              </Button>
              <div className="flex justify-between text-sm">
                <button type="button" onClick={() => { setStep("email"); setOtp(""); }} className="text-muted-foreground hover:underline">
                  Use a different email
                </button>
                <button type="button" onClick={resend} disabled={busy} className="text-accent hover:underline">
                  Resend code
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
