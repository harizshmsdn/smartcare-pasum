-- Add update policy for students on alerts
CREATE POLICY "Students can update their own alerts" 
ON public.alerts FOR UPDATE TO authenticated 
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);
