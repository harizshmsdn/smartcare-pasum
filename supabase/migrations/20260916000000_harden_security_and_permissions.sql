-- Revoke public write permissions from anon role
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;

-- Tighten merit claims viewing policy to prevent cross-lecturer IDOR
DROP POLICY IF EXISTS "Students can view their own claims" ON public.merit_claims;

CREATE POLICY "Students and authorized lecturers can view claims" 
ON public.merit_claims FOR SELECT TO authenticated USING (
    auth.uid() = student_id 
    OR public.get_auth_user_role() = 'admin'
    OR EXISTS (
        SELECT 1 FROM public.enrollments e
        JOIN public.classes c ON e.class_id = c.id
        WHERE e.student_id = merit_claims.student_id AND c.lecturer_id = auth.uid()
    )
);

-- Tighten merit claims update policy
DROP POLICY IF EXISTS "Lecturers and Admins can update claims" ON public.merit_claims;

CREATE POLICY "Authorized lecturers and admins can update claims" 
ON public.merit_claims FOR UPDATE TO authenticated USING (
    public.get_auth_user_role() = 'admin'
    OR EXISTS (
        SELECT 1 FROM public.enrollments e
        JOIN public.classes c ON e.class_id = c.id
        WHERE e.student_id = merit_claims.student_id AND c.lecturer_id = auth.uid()
    )
);
