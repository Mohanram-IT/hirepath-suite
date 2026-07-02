-- Let candidates post vacancy requests and maintain only their own requests.
DROP POLICY IF EXISTS "Candidates can create vacancy requests" ON public.vacancies;
CREATE POLICY "Candidates can create vacancy requests"
ON public.vacancies
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND public.has_role(auth.uid(), 'candidate')
);

DROP POLICY IF EXISTS "Candidates update own vacancy requests" ON public.vacancies;
CREATE POLICY "Candidates update own vacancy requests"
ON public.vacancies
FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by
  AND public.has_role(auth.uid(), 'candidate')
)
WITH CHECK (
  auth.uid() = created_by
  AND public.has_role(auth.uid(), 'candidate')
);

-- Candidates may add a new client name while posting a vacancy request.
DROP POLICY IF EXISTS "Candidates can create clients for vacancy requests" ON public.clients;
CREATE POLICY "Candidates can create clients for vacancy requests"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND public.has_role(auth.uid(), 'candidate')
);

-- Candidates may add replacement details for vacancy requests they created.
DROP POLICY IF EXISTS "Candidates can create own replacement details" ON public.replacement_employees;
CREATE POLICY "Candidates can create own replacement details"
ON public.replacement_employees
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.vacancies v
    WHERE v.id = replacement_employees.vacancy_id
      AND v.created_by = auth.uid()
      AND public.has_role(auth.uid(), 'candidate')
  )
);

DROP POLICY IF EXISTS "Candidates update own replacement details" ON public.replacement_employees;
CREATE POLICY "Candidates update own replacement details"
ON public.replacement_employees
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.vacancies v
    WHERE v.id = replacement_employees.vacancy_id
      AND v.created_by = auth.uid()
      AND public.has_role(auth.uid(), 'candidate')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.vacancies v
    WHERE v.id = replacement_employees.vacancy_id
      AND v.created_by = auth.uid()
      AND public.has_role(auth.uid(), 'candidate')
  )
);