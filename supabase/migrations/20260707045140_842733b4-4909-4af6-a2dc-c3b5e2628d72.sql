
-- Helper: define staff check inline via has_role

-- ===== candidates: restrict SELECT to staff or owner (via user_id or created_by) =====
DROP POLICY IF EXISTS "Authenticated can view candidates" ON public.candidates;
CREATE POLICY "Staff or owner can view candidates" ON public.candidates
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'hr_admin'::app_role)
  OR has_role(auth.uid(), 'recruitment_manager'::app_role)
  OR has_role(auth.uid(), 'recruiter'::app_role)
  OR user_id = auth.uid()
  OR created_by = auth.uid()
);

-- ===== candidate_applications: restrict SELECT to staff or owning candidate =====
DROP POLICY IF EXISTS "Authenticated can view applications" ON public.candidate_applications;
CREATE POLICY "Staff can view applications" ON public.candidate_applications
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'hr_admin'::app_role)
  OR has_role(auth.uid(), 'recruitment_manager'::app_role)
  OR has_role(auth.uid(), 'recruiter'::app_role)
  OR auth.uid() = assigned_recruiter
  OR auth.uid() = created_by
);

-- ===== clients: restrict SELECT to staff (retain public policy for open vacancies) =====
DROP POLICY IF EXISTS "Authenticated view clients" ON public.clients;
CREATE POLICY "Staff view clients" ON public.clients
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'hr_admin'::app_role)
  OR has_role(auth.uid(), 'recruitment_manager'::app_role)
  OR has_role(auth.uid(), 'recruiter'::app_role)
);

-- ===== comments: restrict SELECT to staff or author =====
DROP POLICY IF EXISTS "Authenticated view comments" ON public.comments;
CREATE POLICY "Staff or author view comments" ON public.comments
FOR SELECT TO authenticated
USING (
  auth.uid() = author_id
  OR has_role(auth.uid(), 'hr_admin'::app_role)
  OR has_role(auth.uid(), 'recruitment_manager'::app_role)
  OR has_role(auth.uid(), 'recruiter'::app_role)
);

-- ===== extensions: restrict SELECT to staff =====
DROP POLICY IF EXISTS "Authenticated view extensions" ON public.extensions;
CREATE POLICY "Staff view extensions" ON public.extensions
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'hr_admin'::app_role)
  OR has_role(auth.uid(), 'recruitment_manager'::app_role)
  OR has_role(auth.uid(), 'recruiter'::app_role)
);

-- ===== replacement_employees: restrict SELECT to staff =====
DROP POLICY IF EXISTS "Authenticated view replacements" ON public.replacement_employees;
CREATE POLICY "Staff view replacements" ON public.replacement_employees
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'hr_admin'::app_role)
  OR has_role(auth.uid(), 'recruitment_manager'::app_role)
  OR has_role(auth.uid(), 'recruiter'::app_role)
);

-- ===== stage_history: restrict SELECT to staff =====
DROP POLICY IF EXISTS "Authenticated can view stage history" ON public.stage_history;
CREATE POLICY "Staff can view stage history" ON public.stage_history
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'hr_admin'::app_role)
  OR has_role(auth.uid(), 'recruitment_manager'::app_role)
  OR has_role(auth.uid(), 'recruiter'::app_role)
);

-- ===== profiles: restrict SELECT to self or staff =====
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;
CREATE POLICY "Users view own profile or staff view all" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR has_role(auth.uid(), 'hr_admin'::app_role)
  OR has_role(auth.uid(), 'recruitment_manager'::app_role)
  OR has_role(auth.uid(), 'recruiter'::app_role)
);

-- ===== storage.objects (resumes bucket): ownership-scoped policies =====
DROP POLICY IF EXISTS "Authenticated can read resumes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update resumes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload resumes" ON storage.objects;

-- Read: owner (path starts with their uid) OR staff
CREATE POLICY "Resumes: owner or staff can read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'resumes'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'hr_admin'::app_role)
    OR has_role(auth.uid(), 'recruitment_manager'::app_role)
    OR has_role(auth.uid(), 'recruiter'::app_role)
  )
);

-- Upload: user must upload under their own uid folder
CREATE POLICY "Resumes: users upload to own folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Update: owner OR staff
CREATE POLICY "Resumes: owner or staff can update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'resumes'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'hr_admin'::app_role)
    OR has_role(auth.uid(), 'recruitment_manager'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'resumes'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'hr_admin'::app_role)
    OR has_role(auth.uid(), 'recruitment_manager'::app_role)
  )
);

-- ===== SECURITY DEFINER function exposure: revoke EXECUTE from trigger-only functions =====
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- has_role must remain executable to authenticated (used in RLS + RPC by admin UI)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
