-- Add category and description columns to merit_claims table
ALTER TABLE public.merit_claims 
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General',
ADD COLUMN IF NOT EXISTS description TEXT;
