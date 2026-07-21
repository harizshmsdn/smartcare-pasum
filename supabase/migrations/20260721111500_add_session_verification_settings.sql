-- Add session configuration columns for online mode and authentication overrides
ALTER TABLE public.attendance_sessions 
ADD COLUMN IF NOT EXISTS online_mode BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS face_id_required BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS location_required BOOLEAN DEFAULT true NOT NULL;
