import { WorkerMailer } from "worker-mailer";

export async function sendGmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
}): Promise<{ messageId: string }> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD not configured");

  const mailer = await WorkerMailer.connect({
    credentials: { username: user, password: pass },
    authType: "plain",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
  });

  try {
    await mailer.send({
      from: { name: opts.fromName ?? "TalentFlow", email: user },
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return { messageId: `<${Date.now()}.${Math.random().toString(36).slice(2)}@gmail>` };
  } finally {
    try { await mailer.close(); } catch { /* noop */ }
  }
}
