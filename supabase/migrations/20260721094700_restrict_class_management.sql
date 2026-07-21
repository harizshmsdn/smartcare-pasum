-- Drop the existing policy allowing lecturers to manage their own classes
DROP POLICY IF EXISTS "Lecturers can manage their own classes" ON public.classes;

-- Create a replacement policy allowing only admins to manage (INSERT, UPDATE, DELETE) classes
CREATE POLICY "Admins can manage classes" 
ON public.classes FOR ALL TO authenticated 
USING (public.get_auth_user_role() = 'admin')
WITH CHECK (public.get_auth_user_role() = 'admin');
