
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('hr_admin', 'recruitment_manager', 'recruiter', 'hiring_manager');
CREATE TYPE public.vacancy_status AS ENUM ('open', 'in_progress', 'on_hold', 'closed', 'cancelled');
CREATE TYPE public.vacancy_type AS ENUM ('new_requirement', 'replacement');
CREATE TYPE public.vacancy_level AS ENUM ('L1', 'L2', 'L3', 'L4');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'hr_admin'));
CREATE POLICY "HR Admin manages roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'hr_admin')) WITH CHECK (public.has_role(auth.uid(), 'hr_admin'));

-- ============ AUTO PROFILE + FIRST USER = ADMIN ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );

  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'hr_admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'recruiter');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ CLIENTS ============
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  contact_email TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR Admin manages clients" ON public.clients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hr_admin') OR public.has_role(auth.uid(), 'recruitment_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'hr_admin') OR public.has_role(auth.uid(), 'recruitment_manager'));
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ VACANCIES ============
CREATE TABLE public.vacancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  level public.vacancy_level NOT NULL DEFAULT 'L2',
  location TEXT,
  experience_min NUMERIC(4,1),
  experience_max NUMERIC(4,1),
  skills TEXT[] NOT NULL DEFAULT '{}',
  openings INT NOT NULL DEFAULT 1,
  recruitment_manager_id UUID REFERENCES auth.users(id),
  hiring_manager_id UUID REFERENCES auth.users(id),
  vacancy_type public.vacancy_type NOT NULL DEFAULT 'new_requirement',
  status public.vacancy_status NOT NULL DEFAULT 'open',
  target_hiring_date DATE,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacancies TO authenticated;
GRANT ALL ON public.vacancies TO service_role;
ALTER TABLE public.vacancies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view vacancies" ON public.vacancies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers create vacancies" ON public.vacancies FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'hr_admin') OR public.has_role(auth.uid(), 'recruitment_manager'));
CREATE POLICY "Managers update vacancies" ON public.vacancies FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'hr_admin') OR public.has_role(auth.uid(), 'recruitment_manager') OR recruitment_manager_id = auth.uid());
CREATE POLICY "HR Admin delete vacancies" ON public.vacancies FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'hr_admin'));
CREATE TRIGGER trg_vacancies_updated BEFORE UPDATE ON public.vacancies FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_vacancies_status ON public.vacancies(status);
CREATE INDEX idx_vacancies_type ON public.vacancies(vacancy_type);
CREATE INDEX idx_vacancies_target ON public.vacancies(target_hiring_date);

-- ============ REPLACEMENT EMPLOYEES ============
CREATE TABLE public.replacement_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id UUID NOT NULL UNIQUE REFERENCES public.vacancies(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_code TEXT,
  resignation_date DATE NOT NULL,
  notice_period_days INT NOT NULL DEFAULT 30,
  last_working_date DATE NOT NULL,
  early_relieving_date DATE,
  deployment_deadline DATE GENERATED ALWAYS AS (COALESCE(early_relieving_date, last_working_date) + 1) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.replacement_employees TO authenticated;
GRANT ALL ON public.replacement_employees TO service_role;
ALTER TABLE public.replacement_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view replacements" ON public.replacement_employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage replacements" ON public.replacement_employees FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hr_admin') OR public.has_role(auth.uid(), 'recruitment_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'hr_admin') OR public.has_role(auth.uid(), 'recruitment_manager'));
CREATE TRIGGER trg_replacements_updated BEFORE UPDATE ON public.replacement_employees FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ EXTENSIONS ============
CREATE TABLE public.extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id UUID NOT NULL REFERENCES public.vacancies(id) ON DELETE CASCADE,
  original_date DATE NOT NULL,
  extended_date DATE NOT NULL,
  reason TEXT NOT NULL,
  approval_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.extensions TO authenticated;
GRANT ALL ON public.extensions TO service_role;
ALTER TABLE public.extensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view extensions" ON public.extensions FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR Admin creates extensions" ON public.extensions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'hr_admin'));

-- ============ COMMENTS ============
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id UUID NOT NULL REFERENCES public.vacancies(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'internal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view comments" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated add comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Author delete comment" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'hr_admin'));

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  entity TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR Admin view audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'hr_admin'));
CREATE POLICY "Authenticated insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);
