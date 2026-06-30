
CREATE TABLE public.auth_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX auth_otps_email_idx ON public.auth_otps (email, created_at DESC);
GRANT ALL ON public.auth_otps TO service_role;
ALTER TABLE public.auth_otps ENABLE ROW LEVEL SECURITY;
-- no policies: only service_role (backend) may access
