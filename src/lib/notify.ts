import { supabase } from "@/integrations/supabase/client";

export type NotifyTemplate = "interview_scheduled" | "interview_cancelled" | "application_rejected" | "application_stage_changed";

export async function queueNotification(opts: {
  template: NotifyTemplate;
  recipientEmail: string;
  recipientUserId?: string | null;
  payload: Record<string, unknown>;
}) {
  const { error } = await supabase.from("notifications").insert({
    template: opts.template,
    recipient_email: opts.recipientEmail,
    recipient_user_id: opts.recipientUserId ?? null,
    payload: opts.payload as never,
  });
  if (error) console.warn("notify queue failed", error);
}
