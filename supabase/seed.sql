-- 1. Insert the user into the Supabase Auth system
-- We use the pgcrypto extension's crypt() function to hash the password 'password123'
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'lecturer@pasum.edu.my',
  crypt('password123', gen_salt('bf')),
  current_timestamp,
  '{"provider":"email","providers":["email"]}',
  '{}',
  current_timestamp,
  current_timestamp
);

-- 2. Insert the identity (Required for Supabase Auth to allow logins)
INSERT INTO auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  format('{"sub":"%s","email":"%s"}', '11111111-1111-1111-1111-111111111111', 'lecturer@pasum.edu.my')::jsonb,
  'email',
  current_timestamp,
  current_timestamp
);

-- 3. Insert the corresponding record into your public.profiles table
-- This explicitly sets the role to 'lecturer' to pass the Middleware check
INSERT INTO public.profiles (
  id,
  role,
  full_name,
  institutional_id,
  email
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'lecturer',
  'Dr. Alan Turing',
  'STF-001',
  'lecturer@pasum.edu.my'
);