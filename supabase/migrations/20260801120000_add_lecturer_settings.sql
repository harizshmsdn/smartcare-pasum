-- Add checkin_grace_period and default_attendance_mode to settings
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS checkin_grace_period INT DEFAULT 15 NOT NULL,
ADD COLUMN IF NOT EXISTS default_attendance_mode VARCHAR DEFAULT 'qr' NOT NULL;
