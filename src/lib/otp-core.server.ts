import { createHash, randomInt, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const OTP_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;

function hashCode(email: string, code: string): string {
  return createHash("sha256").update(`${email.toLowerCase()}:${code}`).digest("hex");
}

function safeEqHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

function renderEmail(code: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:480px;margin:0 auto;padding:40px 20px;">
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
    <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Your TalentFlow sign-in code</h1>
    <p style="margin:0 0 24px;color:#475569;font-size:14px;">Enter this 6-digit code in the app. It expires in ${OTP_TTL_MIN} minutes.</p>
    <div style="font-size:36px;font-weight:700;letter-spacing:10px;text-align:center;background:#f1f5f9;border-radius:8px;padding:20px;color:#0f172a;font-family:'SF Mono',Menlo,monospace;">${code}</div>
    <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
  </div>
</div></body></html>`;
}

export async function requestOtp(input: {
  email: string;
  fullName?: string;
  signupAs?: "candidate" | "recruiter";
}): Promise<{ ok: true }> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email");

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("Email service not configured");

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const code_hash = hashCode(email, code);
  const expires_at = new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString();

  const { error } = await supabaseAdmin.from("auth_otps").insert({
    email,
    code_hash,
    expires_at,
    metadata: { full_name: input.fullName ?? null, signup_as: input.signupAs ?? null },
  });
  if (error) throw new Error(error.message);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: "TalentFlow <onboarding@resend.dev>",
      to: [email],
      subject: `Your TalentFlow code: ${code}`,
      html: renderEmail(code),
      text: `Your TalentFlow code is ${code}. It expires in ${OTP_TTL_MIN} minutes.`,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string })?.message ?? `Email send failed (${res.status})`);
  }
  return { ok: true };
}

async function findUserByEmail(email: string) {
  // listUsers doesn't support direct email filter universally; iterate first page.
  // Practical user volumes for this app are small; for scale use a profiles lookup.
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

export async function verifyOtp(input: {
  email: string;
  code: string;
}): Promise<{ token_hash: string; type: "magiclink" }> {
  const email = input.email.trim().toLowerCase();
  const code = input.code.trim();
  if (!/^\d{6}$/.test(code)) throw new Error("Invalid code");

  const { data: row, error } = await supabaseAdmin
    .from("auth_otps")
    .select("id, code_hash, expires_at, attempts, consumed_at, metadata")
    .eq("email", email)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("No code requested. Send a new code.");

  if (row.attempts >= MAX_ATTEMPTS) throw new Error("Too many attempts. Send a new code.");
  if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("Code expired. Send a new code.");

  const expected = hashCode(email, code);
  if (!safeEqHex(expected, row.code_hash)) {
    await supabaseAdmin.from("auth_otps").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    throw new Error("Incorrect code");
  }

  await supabaseAdmin.from("auth_otps").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

  // Ensure user exists; handle_new_user trigger creates profile + role.
  let userId = await findUserByEmail(email);
  if (!userId) {
    const meta = (row.metadata ?? {}) as { full_name?: string | null; signup_as?: string | null };
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: meta.full_name ?? undefined,
        signup_as: meta.signup_as ?? undefined,
      },
    });
    if (createErr) throw new Error(createErr.message);
    userId = created.user?.id ?? null;
  }

  // Mint a magic-link token the client can exchange for a session.
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkErr) throw new Error(linkErr.message);
  const token_hash = linkData.properties?.hashed_token;
  if (!token_hash) throw new Error("Could not mint session token");

  return { token_hash, type: "magiclink" };
}
