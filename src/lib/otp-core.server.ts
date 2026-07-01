import { createHash, randomInt, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const OTP_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;

export type OtpPurpose = "signup" | "reverify";

function hashCode(email: string, code: string): string {
  return createHash("sha256").update(`${email.toLowerCase()}:${code}`).digest("hex");
}

function safeEqHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

function renderEmail(code: string, purpose: OtpPurpose): string {
  const heading = purpose === "signup" ? "Verify your email" : "Confirm it's you";
  const sub =
    purpose === "signup"
      ? "Enter this 6-digit code to finish creating your TalentFlow account."
      : "It's been a while since you signed in. Enter this 6-digit code to continue.";
  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:480px;margin:0 auto;padding:40px 20px;">
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
    <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">${heading}</h1>
    <p style="margin:0 0 24px;color:#475569;font-size:14px;">${sub} It expires in ${OTP_TTL_MIN} minutes.</p>
    <div style="font-size:36px;font-weight:700;letter-spacing:10px;text-align:center;background:#f1f5f9;border-radius:8px;padding:20px;color:#0f172a;font-family:'SF Mono',Menlo,monospace;">${code}</div>
    <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
  </div>
</div></body></html>`;
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

export async function requestOtp(input: {
  email: string;
  fullName?: string;
  signupAs?: "candidate" | "recruiter";
  purpose?: OtpPurpose;
  password?: string;
}): Promise<{ ok: true }> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email");

  const purpose: OtpPurpose = input.purpose ?? "signup";
  const existingId = await findUserIdByEmail(email);
  if (purpose === "signup" && existingId) {
    throw new Error("An account with this email already exists. Please sign in.");
  }
  if (purpose === "reverify" && !existingId) {
    throw new Error("No account found with this email.");
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const code_hash = hashCode(email, code);
  const expires_at = new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString();

  const { error } = await supabaseAdmin.from("auth_otps").insert({
    email,
    code_hash,
    expires_at,
    purpose,
    metadata: {
      full_name: input.fullName ?? null,
      signup_as: input.signupAs ?? null,
      password: input.password ?? null,
    },
  } as never);
  if (error) throw new Error(error.message);

  const { sendGmail } = await import("./gmail-mailer.server");
  await sendGmail({
    to: email,
    subject: `TalentFlow code: ${code}`,
    html: renderEmail(code, purpose),
    text: `Your TalentFlow code is ${code}. It expires in ${OTP_TTL_MIN} minutes.`,
  });
  return { ok: true };
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
    .select("id, code_hash, expires_at, attempts, consumed_at, metadata, purpose")
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

  const meta = (row.metadata ?? {}) as { full_name?: string | null; signup_as?: string | null; password?: string | null };

  let userId = await findUserIdByEmail(email);
  if (!userId) {
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: meta.password ?? undefined,
      email_confirm: true,
      user_metadata: {
        full_name: meta.full_name ?? undefined,
        signup_as: meta.signup_as ?? undefined,
      },
    });
    if (createErr) throw new Error(createErr.message);
    userId = created.user?.id ?? null;
  }

  // Update last_login_at
  if (userId) {
    await supabaseAdmin
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() } as never)
      .eq("id", userId);
  }

  // Mint a magic-link token the client can exchange for a session
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkErr) throw new Error(linkErr.message);
  const token_hash = linkData.properties?.hashed_token;
  if (!token_hash) throw new Error("Could not mint session token");

  return { token_hash, type: "magiclink" };
}

/** Called after a successful password login to bump last_login_at. */
export async function markPasswordLogin(userId: string): Promise<void> {
  await supabaseAdmin
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() } as never)
    .eq("id", userId);
}

/** Returns true when the user needs OTP re-verification (>24h since last login). */
export async function needsReverify(email: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("last_login_at" as never)
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  const last = (data as { last_login_at?: string | null } | null)?.last_login_at;
  if (!last) return true;
  return Date.now() - new Date(last).getTime() > 24 * 60 * 60 * 1000;
}
