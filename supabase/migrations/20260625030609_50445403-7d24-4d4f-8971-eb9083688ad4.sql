
-- Pipeline stage enum
CREATE TYPE public.pipeline_stage AS ENUM (
  'sourcing','screening','submitted','interviewing','offered','joined','rejected','on_hold'
);

-- Candidates
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  current_company TEXT,
  current_title TEXT,
  location TEXT,
  total_experience NUMERIC(4,1),
  current_ctc NUMERIC(12,2),
  expected_ctc NUMERIC(12,2),
  notice_period_days INT,
  source TEXT,
  resume_url TEXT,
  linkedin_url TEXT,
  skills TEXT[] DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view candidates" ON public.candidates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert candidates" ON public.candidates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator or admin can update candidates" ON public.candidates
  FOR UPDATE TO authenticated USING (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'hr_admin')
    OR public.has_role(auth.uid(), 'recruitment_manager')
  );
CREATE POLICY "Admins can delete candidates" ON public.candidates
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'hr_admin')
    OR public.has_role(auth.uid(), 'recruitment_manager')
  );

CREATE TRIGGER tg_candidates_updated BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Candidate applications (link candidate <-> vacancy)
CREATE TABLE public.candidate_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  vacancy_id UUID NOT NULL REFERENCES public.vacancies(id) ON DELETE CASCADE,
  stage public.pipeline_stage NOT NULL DEFAULT 'sourcing',
  assigned_recruiter UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  hiring_manager_feedback TEXT,
  score INT,
  rejection_reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, vacancy_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_applications TO authenticated;
GRANT ALL ON public.candidate_applications TO service_role;
ALTER TABLE public.candidate_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view applications" ON public.candidate_applications
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert applications" ON public.candidate_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Assignee or admin can update applications" ON public.candidate_applications
  FOR UPDATE TO authenticated USING (
    auth.uid() = assigned_recruiter
    OR auth.uid() = created_by
    OR public.has_role(auth.uid(), 'hr_admin')
    OR public.has_role(auth.uid(), 'recruitment_manager')
  );
CREATE POLICY "Admins can delete applications" ON public.candidate_applications
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'hr_admin')
    OR public.has_role(auth.uid(), 'recruitment_manager')
  );

CREATE TRIGGER tg_applications_updated BEFORE UPDATE ON public.candidate_applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_apps_vacancy ON public.candidate_applications(vacancy_id);
CREATE INDEX idx_apps_candidate ON public.candidate_applications(candidate_id);
CREATE INDEX idx_apps_stage ON public.candidate_applications(stage);

-- Stage history
CREATE TABLE public.stage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.candidate_applications(id) ON DELETE CASCADE,
  from_stage public.pipeline_stage,
  to_stage public.pipeline_stage NOT NULL,
  note TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stage_history TO authenticated;
GRANT ALL ON public.stage_history TO service_role;
ALTER TABLE public.stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view stage history" ON public.stage_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert stage history" ON public.stage_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = changed_by);

CREATE INDEX idx_stage_history_app ON public.stage_history(application_id);
