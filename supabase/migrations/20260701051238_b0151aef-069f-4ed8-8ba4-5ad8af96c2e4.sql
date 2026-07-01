ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE public.auth_otps ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'signup';