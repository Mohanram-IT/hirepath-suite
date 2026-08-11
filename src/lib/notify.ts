import { COL } from "@/integrations/firebase/schema";
import { createDocIn } from "@/integrations/firebase/db";

export type NotifyTemplate = "interview_scheduled" | "interview_cancelled" | "application_rejected" | "application_stage_changed";

export async function queueNotification(opts: {
  template: NotifyTemplate;
  recipientEmail: string;
  recipientUserId?: string | null;
  payload: Record<string, unknown>;
}) {
  try {
    await createDocIn(COL.notifications, {
      template: opts.template,
      recipient_email: opts.recipientEmail,
      recipient_user_id: opts.recipientUserId ?? null,
      payload: opts.payload,
      status: "pending",
      error: null,
      sent_at: null,
    });
  } catch (e) {
    console.warn("notify queue failed", e);
  }
}
