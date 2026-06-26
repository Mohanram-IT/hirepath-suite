
-- 1) Extend roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'candidate';

-- 2) Candidates: link to auth user
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_candidates_user_id ON public.candidates(user_id);

-- 3) Updated handle_new_user: respect signup_as metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_count INT;
  signup_role TEXT;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );

  signup_role := NEW.raw_user_meta_data->>'signup_as';
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  IF user_count = 1 THEN
    assigned_role := 'hr_admin';
  ELSIF signup_role = 'candidate' THEN
    assigned_role := 'candidate';
    -- auto-create candidate row
    INSERT INTO public.candidates (full_name, email, user_id, created_by)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.email,
      NEW.id,
      NEW.id
    )
    ON CONFLICT DO NOTHING;
  ELSE
    assigned_role := 'recruiter';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) Public vacancy browsing (anon + candidate read of open vacancies)
GRANT SELECT ON public.vacancies TO anon;
GRANT SELECT ON public.clients TO anon;

DROP POLICY IF EXISTS "public can view open vacancies" ON public.vacancies;
CREATE POLICY "public can view open vacancies" ON public.vacancies
FOR SELECT TO anon, authenticated
USING (status IN ('open','in_progress'));

DROP POLICY IF EXISTS "public can view clients of open vacancies" ON public.clients;
CREATE POLICY "public can view clients of open vacancies" ON public.clients
FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.vacancies v WHERE v.client_id = clients.id AND v.status IN ('open','in_progress')));

-- 5) Candidates can read & update their own candidate row
DROP POLICY IF EXISTS "candidates can view own row" ON public.candidates;
CREATE POLICY "candidates can view own row" ON public.candidates
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "candidates can update own row" ON public.candidates
;
CREATE POLICY "candidates can update own row" ON public.candidates
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 6) Candidates can create their own applications and read them
DROP POLICY IF EXISTS "candidate can self-apply" ON public.candidate_applications;
CREATE POLICY "candidate can self-apply" ON public.candidate_applications
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "candidate can view own applications" ON public.candidate_applications;
CREATE POLICY "candidate can view own applications" ON public.candidate_applications
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_id AND c.user_id = auth.uid())
);

-- 7) Interviews
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.candidate_applications(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 45,
  round_name TEXT,
  interviewer_ids UUID[] NOT NULL DEFAULT '{}',
  mode TEXT NOT NULL DEFAULT 'in_app' CHECK (mode IN ('in_app','external')),
  room_id TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text,'-',''),
  external_link TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  feedback TEXT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  cancellation_reason TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_interviews_application ON public.interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_at ON public.interviews(scheduled_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO authenticated;
GRANT ALL ON public.interviews TO service_role;

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage interviews" ON public.interviews
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'hr_admin') OR public.has_role(auth.uid(),'recruitment_manager')
  OR public.has_role(auth.uid(),'recruiter') OR public.has_role(auth.uid(),'hiring_manager')
  OR auth.uid() = ANY(interviewer_ids)
)
WITH CHECK (
  public.has_role(auth.uid(),'hr_admin') OR public.has_role(auth.uid(),'recruitment_manager')
  OR public.has_role(auth.uid(),'recruiter') OR public.has_role(auth.uid(),'hiring_manager')
);

CREATE POLICY "candidate views own interviews" ON public.interviews
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.candidate_applications a
    JOIN public.candidates c ON c.id = a.candidate_id
    WHERE a.id = application_id AND c.user_id = auth.uid()
  )
);

CREATE TRIGGER trg_interviews_updated_at BEFORE UPDATE ON public.interviews
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 8) Notifications queue (status changes / interview scheduled)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id),
  template TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff view notifications" ON public.notifications
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'hr_admin') OR public.has_role(auth.uid(),'recruitment_manager') OR public.has_role(auth.uid(),'recruiter'));

CREATE POLICY "staff create notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'hr_admin') OR public.has_role(auth.uid(),'recruitment_manager') OR public.has_role(auth.uid(),'recruiter') OR public.has_role(auth.uid(),'hiring_manager'));
