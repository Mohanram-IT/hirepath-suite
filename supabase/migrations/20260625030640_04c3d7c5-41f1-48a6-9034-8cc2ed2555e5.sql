
CREATE POLICY "Authenticated can read resumes"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'resumes');

CREATE POLICY "Authenticated can upload resumes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'resumes');

CREATE POLICY "Authenticated can update resumes"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'resumes');

CREATE POLICY "Admins can delete resumes"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'resumes' AND (
    public.has_role(auth.uid(), 'hr_admin')
    OR public.has_role(auth.uid(), 'recruitment_manager')
  )
);
