import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const markLoginSchema = z.object({ userId: z.string().uuid() });

const candidateSignupSchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(128),
});

export const candidateSignUpFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => candidateSignupSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, signup_as: "candidate" },
    });
    if (createErr) throw new Error(createErr.message);
    const userId = created.user?.id;
    if (!userId) throw new Error("Could not create account");

    const { error: profileErr } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: data.fullName,
      email,
    });
    if (profileErr) throw new Error(profileErr.message);

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "candidate" }, { onConflict: "user_id,role" });
    if (roleErr) throw new Error(roleErr.message);

    const { data: existingCandidate, error: existingErr } = await supabaseAdmin
      .from("candidates")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (existingErr) throw new Error(existingErr.message);
    if (!existingCandidate) {
      const { error: candidateErr } = await supabaseAdmin.from("candidates").insert({
        full_name: data.fullName,
        email,
        user_id: userId,
        created_by: userId,
        source: "Candidate signup",
      });
      if (candidateErr) throw new Error(candidateErr.message);
    }

    return { ok: true as const };
  });

const adminCreateSchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(1).max(120),
  role: z.enum(["recruiter", "hr_admin"]),
  password: z.string().min(8).max(128),
});

export const adminCreateStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => adminCreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Ensure caller is hr_admin
    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "hr_admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, signup_as: data.role },
    });
    if (createErr) throw new Error(createErr.message);
    const newId = created.user?.id;
    if (!newId) throw new Error("Failed to create user");

    const { error: profileErr } = await supabaseAdmin.from("profiles").upsert({
      id: newId,
      full_name: data.fullName,
      email,
    });
    if (profileErr) throw new Error(profileErr.message);

    // Overwrite role from trigger default
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    const { error: roleInsertErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newId, role: data.role });
    if (roleInsertErr) throw new Error(roleInsertErr.message);

    // Email credentials
    try {
      const { sendGmail } = await import("./gmail-mailer.server");
      await sendGmail({
        to: email,
        subject: "Your TalentFlow account",
        html: `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:480px;margin:0 auto;padding:40px 20px;">
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
    <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Welcome to TalentFlow</h1>
    <p style="margin:0 0 20px;color:#475569;font-size:14px;">Hi ${escapeHtml(data.fullName)}, your ${data.role === "hr_admin" ? "HR admin" : "recruiter"} account is ready.</p>
    <div style="background:#f1f5f9;border-radius:8px;padding:16px;font-size:14px;color:#0f172a;">
      <div><b>Email:</b> ${escapeHtml(email)}</div>
      <div style="margin-top:6px;"><b>Temporary password:</b> <code style="font-family:'SF Mono',Menlo,monospace;">${escapeHtml(data.password)}</code></div>
    </div>
    <p style="margin:20px 0 0;color:#64748b;font-size:13px;">Sign in and change your password from your profile.</p>
  </div>
</div></body></html>`,
      });
    } catch (e) {
      // Non-fatal: account created, email failed
      return { ok: true as const, emailWarning: e instanceof Error ? e.message : String(e), userId: newId };
    }
    return { ok: true as const, userId: newId };
  });

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
