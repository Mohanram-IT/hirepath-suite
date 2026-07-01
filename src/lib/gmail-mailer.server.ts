import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD not configured");
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
  }
  return transporter;
}

export async function sendGmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
}): Promise<{ messageId: string }> {
  const user = process.env.GMAIL_USER!;
  const t = getTransporter();
  const info = await t.sendMail({
    from: `"${opts.fromName ?? "TalentFlow"}" <${user}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  return { messageId: info.messageId };
}
