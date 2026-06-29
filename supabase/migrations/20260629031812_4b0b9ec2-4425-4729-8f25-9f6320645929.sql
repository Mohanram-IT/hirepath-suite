
CREATE TABLE public.email_send_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_message_id TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_send_log TO authenticated;
GRANT ALL ON public.email_send_log TO service_role;
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view email log" ON public.email_send_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'hr_admin'));
CREATE INDEX email_send_log_created_at_idx ON public.email_send_log (created_at DESC);
