-- Add notifications_enabled to settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;

-- Add explicit policies for students on alerts and interventions
CREATE POLICY "Students can view their own alerts" 
ON public.alerts FOR SELECT TO authenticated USING (auth.uid() = student_id);

CREATE POLICY "Students can view their own interventions" 
ON public.interventions FOR SELECT TO authenticated USING (auth.uid() = student_id);
