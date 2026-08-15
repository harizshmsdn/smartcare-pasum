CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
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
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone_change,
  phone_change_token,
  email_change_token_current,
  reauthentication_token
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'lecturer@pasum.edu.my',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  current_timestamp,
  '{"provider":"email","providers":["email"],"role":"lecturer"}',
  '{}',
  current_timestamp,
  current_timestamp,
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  ''
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
  'lecturer@pasum.edu.my',
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
  email,
  phone_number,
  office_location,
  affiliation
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'lecturer',
  'Dr. Alan Turing',
  'STF-001',
  'lecturer@pasum.edu.my',
  '+60 3-7967 4321',
  'Block B, Room 2.4, PASUM Main Building',
  'Physics Department, Pusat Asasi Sains Universiti Malaya (PASUM)'
);

-- ==============================================================================
-- 4. INSERT STUDENTS INTO AUTH.USERS & PUBLIC.PROFILES
-- ==============================================================================

-- Student 1: Ahmad Hakimi
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token)
VALUES ('22222222-2222-2222-2222-222222222221', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student1@pasum.edu.my', extensions.crypt('password123', extensions.gen_salt('bf')), current_timestamp, '{"provider":"email","providers":["email"],"role":"student"}', '{}', current_timestamp, current_timestamp, '', '', '', '', '', '', '', '');

INSERT INTO public.profiles (id, role, full_name, institutional_id, email, total_merit_score)
VALUES ('22222222-2222-2222-2222-222222222221', 'student', 'Ahmad Hakimi bin Faisal', '1720441', 'student1@pasum.edu.my', 145);

-- Student 2: Nurul Izzah
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token)
VALUES ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student2@pasum.edu.my', extensions.crypt('password123', extensions.gen_salt('bf')), current_timestamp, '{"provider":"email","providers":["email"],"role":"student"}', '{}', current_timestamp, current_timestamp, '', '', '', '', '', '', '', '');

INSERT INTO public.profiles (id, role, full_name, institutional_id, email, total_merit_score)
VALUES ('22222222-2222-2222-2222-222222222222', 'student', 'Nurul Izzah binti Osman', '1720442', 'student2@pasum.edu.my', 180);

-- Student 3: Jason Lee
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token)
VALUES ('22222222-2222-2222-2222-222222222223', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student3@pasum.edu.my', extensions.crypt('password123', extensions.gen_salt('bf')), current_timestamp, '{"provider":"email","providers":["email"],"role":"student"}', '{}', current_timestamp, current_timestamp, '', '', '', '', '', '', '', '');

INSERT INTO public.profiles (id, role, full_name, institutional_id, email, total_merit_score)
VALUES ('22222222-2222-2222-2222-222222222223', 'student', 'Jason Lee Wei Min', '1720445', 'student3@pasum.edu.my', 95);

-- Student 4: Siti Aisyah
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token)
VALUES ('22222222-2222-2222-2222-222222222224', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student4@pasum.edu.my', extensions.crypt('password123', extensions.gen_salt('bf')), current_timestamp, '{"provider":"email","providers":["email"],"role":"student"}', '{}', current_timestamp, current_timestamp, '', '', '', '', '', '', '', '');

INSERT INTO public.profiles (id, role, full_name, institutional_id, email, total_merit_score)
VALUES ('22222222-2222-2222-2222-222222222224', 'student', 'Siti Aisyah binti Rahman', '1720450', 'student4@pasum.edu.my', 210);

-- Student 5: Muhammad Danial
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token)
VALUES ('22222222-2222-2222-2222-222222222225', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student5@pasum.edu.my', extensions.crypt('password123', extensions.gen_salt('bf')), current_timestamp, '{"provider":"email","providers":["email"],"role":"student"}', '{}', current_timestamp, current_timestamp, '', '', '', '', '', '', '', '');

INSERT INTO public.profiles (id, role, full_name, institutional_id, email, total_merit_score)
VALUES ('22222222-2222-2222-2222-222222222225', 'student', 'Muhammad Danial bin Zulkifli', '1720451', 'student5@pasum.edu.my', 60);

-- Student 6: Priya
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token)
VALUES ('22222222-2222-2222-2222-222222222226', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student6@pasum.edu.my', extensions.crypt('password123', extensions.gen_salt('bf')), current_timestamp, '{"provider":"email","providers":["email"],"role":"student"}', '{}', current_timestamp, current_timestamp, '', '', '', '', '', '', '', '');

INSERT INTO public.profiles (id, role, full_name, institutional_id, email, total_merit_score)
VALUES ('22222222-2222-2222-2222-222222222226', 'student', 'Priya a/p Subramaniam', '1720455', 'student6@pasum.edu.my', 130);

-- Student 7: Chong Wei Jie
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token)
VALUES ('22222222-2222-2222-2222-222222222227', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student7@pasum.edu.my', extensions.crypt('password123', extensions.gen_salt('bf')), current_timestamp, '{"provider":"email","providers":["email"],"role":"student"}', '{}', current_timestamp, current_timestamp, '', '', '', '', '', '', '', '');

INSERT INTO public.profiles (id, role, full_name, institutional_id, email, total_merit_score)
VALUES ('22222222-2222-2222-2222-222222222227', 'student', 'Chong Wei Jie', '1720462', 'student7@pasum.edu.my', 105);

-- Identities for Students (Required for Supabase Auth to allow logins)
INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at) VALUES 
(gen_random_uuid(), 'student1@pasum.edu.my', '22222222-2222-2222-2222-222222222221', format('{"sub":"%s","email":"%s"}', '22222222-2222-2222-2222-222222222221', 'student1@pasum.edu.my')::jsonb, 'email', current_timestamp, current_timestamp),
(gen_random_uuid(), 'student2@pasum.edu.my', '22222222-2222-2222-2222-222222222222', format('{"sub":"%s","email":"%s"}', '22222222-2222-2222-2222-222222222222', 'student2@pasum.edu.my')::jsonb, 'email', current_timestamp, current_timestamp),
(gen_random_uuid(), 'student3@pasum.edu.my', '22222222-2222-2222-2222-222222222223', format('{"sub":"%s","email":"%s"}', '22222222-2222-2222-2222-222222222223', 'student3@pasum.edu.my')::jsonb, 'email', current_timestamp, current_timestamp),
(gen_random_uuid(), 'student4@pasum.edu.my', '22222222-2222-2222-2222-222222222224', format('{"sub":"%s","email":"%s"}', '22222222-2222-2222-2222-222222222224', 'student4@pasum.edu.my')::jsonb, 'email', current_timestamp, current_timestamp),
(gen_random_uuid(), 'student5@pasum.edu.my', '22222222-2222-2222-2222-222222222225', format('{"sub":"%s","email":"%s"}', '22222222-2222-2222-2222-222222222225', 'student5@pasum.edu.my')::jsonb, 'email', current_timestamp, current_timestamp),
(gen_random_uuid(), 'student6@pasum.edu.my', '22222222-2222-2222-2222-222222222226', format('{"sub":"%s","email":"%s"}', '22222222-2222-2222-2222-222222222226', 'student6@pasum.edu.my')::jsonb, 'email', current_timestamp, current_timestamp),
(gen_random_uuid(), 'student7@pasum.edu.my', '22222222-2222-2222-2222-222222222227', format('{"sub":"%s","email":"%s"}', '22222222-2222-2222-2222-222222222227', 'student7@pasum.edu.my')::jsonb, 'email', current_timestamp, current_timestamp);


-- ==============================================================================
-- 5. INSERT SUBJECTS & CLASSES
-- ==============================================================================

-- Subjects
INSERT INTO public.subjects (id, code, name, credit_hours) VALUES
('33333333-3333-3333-3333-333333333331', 'PHY101', 'Physics 101 - Mechanics', 4),
('33333333-3333-3333-3333-333333333332', 'MTH201', 'Mathematics 201 - Calculus', 4),
('33333333-3333-3333-3333-333333333333', 'CSE101', 'Computer Science 101', 3),
('33333333-3333-3333-3333-333333333334', 'CHM101', 'Chemistry 101 - Organic', 3);

-- Classes taught by Dr. Alan Turing ('11111111-1111-1111-1111-111111111111')
INSERT INTO public.classes (id, subject_id, lecturer_id, group_code, type, semester, day_of_week, start_time, end_time, location) VALUES
('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Group A', 'Lecture', 'Semester 1', 'Wednesday', '10:00:00', '12:00:00', 'Lecture Hall 3'),
('44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Group B', 'Tutorial', 'Semester 1', 'Wednesday', '14:00:00', '15:00:00', 'Tutorial Room 1'),
('44444444-4444-4444-4444-444444444443', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Group A', 'Lab', 'Semester 1', 'Wednesday', '16:00:00', '18:00:00', 'Computer Lab 2'),
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Group B', 'Lecture', 'Semester 1', 'Thursday', '09:00:00', '11:00:00', 'Lecture Hall 1'),
('44444444-4444-4444-4444-444444444445', '33333333-3333-3333-3333-333333333334', '11111111-1111-1111-1111-111111111111', 'Group A', 'Lab', 'Semester 1', 'Friday', '10:00:00', '12:00:00', 'Physics Lab 1');


-- ==============================================================================
-- 6. ENROLLMENTS (Student registration in classes with attendance rates)
-- ==============================================================================

INSERT INTO public.enrollments (student_id, class_id, current_attendance_rate) VALUES
('22222222-2222-2222-2222-222222222221', '44444444-4444-4444-4444-444444444441', 75), -- Ahmad Hakimi
('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444441', 96), -- Nurul Izzah
('22222222-2222-2222-2222-222222222223', '44444444-4444-4444-4444-444444444441', 82), -- Jason Lee
('22222222-2222-2222-2222-222222222224', '44444444-4444-4444-4444-444444444441', 100), -- Siti Aisyah
('22222222-2222-2222-2222-222222222225', '44444444-4444-4444-4444-444444444441', 68), -- Muhammad Danial
('22222222-2222-2222-2222-222222222226', '44444444-4444-4444-4444-444444444441', 92), -- Priya
('22222222-2222-2222-2222-222222222227', '44444444-4444-4444-4444-444444444441', 85); -- Chong Wei Jie


-- ==============================================================================
-- 7. MERIT CLAIMS
-- ==============================================================================

INSERT INTO public.merit_claims (id, student_id, evaluator_id, title, proof_file_url, status, awarded_points, submitted_at) VALUES
('55555555-5555-5555-5555-555555555551', '22222222-2222-2222-2222-222222222221', NULL, 'Sukan Asasi Malaysia - Badminton Singles Gold', 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=80', 'pending', 25, current_timestamp - interval '5 days'),
('55555555-5555-5555-5555-555555555552', '22222222-2222-2222-2222-222222222221', NULL, 'Dean''s List Award Ceremony Coordinator', '/assets/proof_deans_list.pdf', 'pending', 15, current_timestamp - interval '7 days'),
('55555555-5555-5555-5555-555555555553', '22222222-2222-2222-2222-222222222221', NULL, 'PASUM Charity Run Volunteer', 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop&q=80', 'pending', 10, current_timestamp - interval '10 days');


-- ==============================================================================
-- 8. ALERTS
-- ==============================================================================

INSERT INTO public.alerts (id, lecturer_id, student_id, class_id, type, priority, message, is_read, created_at) VALUES
('66666666-6666-6666-6666-666666666661', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', '44444444-4444-4444-4444-444444444441', 'attendance', 'critical', 'Attendance dropped below the 80% threshold (Current: 75%). Immediate intervention recommended.', false, current_timestamp - interval '10 minutes'),
('66666666-6666-6666-6666-666666666662', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222225', '44444444-4444-4444-4444-444444444441', 'assessment', 'high', 'Sudden continuous assessment drop detected. Quiz 2 score is 25% lower than Quiz 1.', false, current_timestamp - interval '2 hours'),
('66666666-6666-6666-6666-666666666663', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222223', '44444444-4444-4444-4444-444444444441', 'system', 'medium', 'GPS Verification failed during the last 2 check-ins. Device diagnostic suggested.', true, current_timestamp - interval '1 day'),
('66666666-6666-6666-6666-666666666664', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222227', '44444444-4444-4444-4444-444444444441', 'attendance', 'high', 'Consecutive absences flagged. Missed 3 classes in a row.', true, current_timestamp - interval '2 days');


-- ==============================================================================
-- 9. INTERVENTIONS
-- ==============================================================================

INSERT INTO public.interventions (student_id, class_id, lecturer_id, issue_description, status, priority) VALUES
('22222222-2222-2222-2222-222222222221', '44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'Critical: 60% Attendance', 'needs_review', 'high'),
('22222222-2222-2222-2222-222222222225', '44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'Assessment Drop: -25%', 'needs_review', 'medium'),
('22222222-2222-2222-2222-222222222223', '44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'Academic Advising Scheduled', 'in_progress', 'medium'),
('22222222-2222-2222-2222-222222222227', '44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'UM Counselling Unit Sync', 'referred', 'high'),
('22222222-2222-2222-2222-222222222224', '44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'Back on track (>80%)', 'resolved', 'low');


-- ==============================================================================
-- 9b. ANALYTICS & SCORE SEEDS (Moved from migrations to seed.sql to prevent FK dependency issues)
-- ==============================================================================

-- Seed Enrollments for other classes to provide full data across all classes taught by Dr. Alan Turing
INSERT INTO public.enrollments (student_id, class_id, current_attendance_rate) VALUES
-- MTH201 Group B
('22222222-2222-2222-2222-222222222221', '44444444-4444-4444-4444-444444444442', 88),
('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444442', 98),
('22222222-2222-2222-2222-222222222224', '44444444-4444-4444-4444-444444444442', 95),
('22222222-2222-2222-2222-222222222226', '44444444-4444-4444-4444-444444444442', 90),
-- CSE101 Group A
('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444443', 94),
('22222222-2222-2222-2222-222222222223', '44444444-4444-4444-4444-444444444443', 78),
('22222222-2222-2222-2222-222222222225', '44444444-4444-4444-4444-444444444443', 72),
('22222222-2222-2222-2222-222222222227', '44444444-4444-4444-4444-444444444443', 89),
-- PHY101 Group B
('22222222-2222-2222-2222-222222222223', '44444444-4444-4444-4444-444444444444', 85),
('22222222-2222-2222-2222-222222222225', '44444444-4444-4444-4444-444444444444', 65),
('22222222-2222-2222-2222-222222222226', '44444444-4444-4444-4444-444444444444', 91),
-- CHM101 Group A
('22222222-2222-2222-2222-222222222221', '44444444-4444-4444-4444-444444444445', 82),
('22222222-2222-2222-2222-222222222224', '44444444-4444-4444-4444-444444444445', 97)
ON CONFLICT (student_id, class_id) DO NOTHING;

-- Seed Assessments for PHY101 Group A ('44444444-4444-4444-4444-444444444441')
INSERT INTO public.assessments (id, class_id, title, type, weightage, total_marks, created_at) VALUES
('77777777-7777-7777-7777-777777777711', '44444444-4444-4444-4444-444444444441', 'Week 1 Quiz', 'Continuous', 5, 20, current_timestamp - interval '7 weeks'),
('77777777-7777-7777-7777-777777777712', '44444444-4444-4444-4444-444444444441', 'Week 3 Lab 1', 'Continuous', 10, 50, current_timestamp - interval '5 weeks'),
('77777777-7777-7777-7777-777777777713', '44444444-4444-4444-4444-444444444441', 'Mid-Term Exam', 'Midterm', 30, 100, current_timestamp - interval '3 weeks'),
('77777777-7777-7777-7777-777777777714', '44444444-4444-4444-4444-444444444441', 'Final Exam', 'Final', 50, 100, current_timestamp - interval '1 week')
ON CONFLICT (id) DO NOTHING;

-- Seed Assessments for MTH201 Group B ('44444444-4444-4444-4444-444444444442')
INSERT INTO public.assessments (id, class_id, title, type, weightage, total_marks, created_at) VALUES
('77777777-7777-7777-7777-777777777721', '44444444-4444-4444-4444-444444444442', 'Quiz 1 Calculus', 'Continuous', 10, 30, current_timestamp - interval '6 weeks'),
('77777777-7777-7777-7777-777777777722', '44444444-4444-4444-4444-444444444442', 'Mid-Term Calculus', 'Midterm', 30, 100, current_timestamp - interval '3 weeks'),
('77777777-7777-7777-7777-777777777723', '44444444-4444-4444-4444-444444444442', 'Final Exam Calculus', 'Final', 60, 100, current_timestamp - interval '1 week')
ON CONFLICT (id) DO NOTHING;

-- Seed Assessments for CSE101 Group A ('44444444-4444-4444-4444-444444444443')
INSERT INTO public.assessments (id, class_id, title, type, weightage, total_marks, created_at) VALUES
('77777777-7777-7777-7777-777777777731', '44444444-4444-4444-4444-444444444443', 'Coding Quiz 1', 'Continuous', 15, 40, current_timestamp - interval '6 weeks'),
('77777777-7777-7777-7777-777777777732', '44444444-4444-4444-4444-444444444443', 'Mid-Term Coding', 'Midterm', 35, 100, current_timestamp - interval '3 weeks'),
('77777777-7777-7777-7777-777777777733', '44444444-4444-4444-4444-444444444443', 'Final Project', 'Final', 50, 100, current_timestamp - interval '1 week')
ON CONFLICT (id) DO NOTHING;

-- Seed Assessments for CHM101 Group A ('44444444-4444-4444-4444-444444444445')
INSERT INTO public.assessments (id, class_id, title, type, weightage, total_marks, created_at) VALUES
('77777777-7777-7777-7777-777777777751', '44444444-4444-4444-4444-444444444445', 'Chemistry Quiz 1', 'Continuous', 10, 30, current_timestamp - interval '6 weeks'),
('77777777-7777-7777-7777-777777777752', '44444444-4444-4444-4444-444444444445', 'Mid-Term Organic', 'Midterm', 30, 100, current_timestamp - interval '3 weeks'),
('77777777-7777-7777-7777-777777777753', '44444444-4444-4444-4444-444444444445', 'Final Chemistry Exam', 'Final', 60, 100, current_timestamp - interval '1 week')
ON CONFLICT (id) DO NOTHING;

-- Seed Student Scores for PHY101 Group A
INSERT INTO public.student_scores (assessment_id, student_id, score_achieved, date_recorded) VALUES
-- Quiz 1 (out of 20)
('77777777-7777-7777-7777-777777777711', '22222222-2222-2222-2222-222222222221', 14, current_timestamp - interval '7 weeks'),
('77777777-7777-7777-7777-777777777711', '22222222-2222-2222-2222-222222222222', 19, current_timestamp - interval '7 weeks'),
('77777777-7777-7777-7777-777777777711', '22222222-2222-2222-2222-222222222223', 15, current_timestamp - interval '7 weeks'),
('77777777-7777-7777-7777-777777777711', '22222222-2222-2222-2222-222222222224', 20, current_timestamp - interval '7 weeks'),
('77777777-7777-7777-7777-777777777711', '22222222-2222-2222-2222-222222222225', 10, current_timestamp - interval '7 weeks'),
('77777777-7777-7777-7777-777777777711', '22222222-2222-2222-2222-222222222226', 17, current_timestamp - interval '7 weeks'),
('77777777-7777-7777-7777-777777777711', '22222222-2222-2222-2222-222222222227', 16, current_timestamp - interval '7 weeks'),
-- Lab 1 (out of 50)
('77777777-7777-7777-7777-777777777712', '22222222-2222-2222-2222-222222222221', 35, current_timestamp - interval '5 weeks'),
('77777777-7777-7777-7777-777777777712', '22222222-2222-2222-2222-222222222222', 48, current_timestamp - interval '5 weeks'),
('77777777-7777-7777-7777-777777777712', '22222222-2222-2222-2222-222222222223', 38, current_timestamp - interval '5 weeks'),
('77777777-7777-7777-7777-777777777712', '22222222-2222-2222-2222-222222222224', 50, current_timestamp - interval '5 weeks'),
('77777777-7777-7777-7777-777777777712', '22222222-2222-2222-2222-222222222225', 25, current_timestamp - interval '5 weeks'),
('77777777-7777-7777-7777-777777777712', '22222222-2222-2222-2222-222222222226', 42, current_timestamp - interval '5 weeks'),
('77777777-7777-7777-7777-777777777712', '22222222-2222-2222-2222-222222222227', 40, current_timestamp - interval '5 weeks'),
-- Mid-Term Exam (out of 100)
('77777777-7777-7777-7777-777777777713', '22222222-2222-2222-2222-222222222221', 62, current_timestamp - interval '3 weeks'),
('77777777-7777-7777-7777-777777777713', '22222222-2222-2222-2222-222222222222', 92, current_timestamp - interval '3 weeks'),
('77777777-7777-7777-7777-777777777713', '22222222-2222-2222-2222-222222222223', 70, current_timestamp - interval '3 weeks'),
('77777777-7777-7777-7777-777777777713', '22222222-2222-2222-2222-222222222224', 96, current_timestamp - interval '3 weeks'),
('77777777-7777-7777-7777-777777777713', '22222222-2222-2222-2222-222222222225', 45, current_timestamp - interval '3 weeks'),
('77777777-7777-7777-7777-777777777713', '22222222-2222-2222-2222-222222222226', 85, current_timestamp - interval '3 weeks'),
('77777777-7777-7777-7777-777777777713', '22222222-2222-2222-2222-222222222227', 78, current_timestamp - interval '3 weeks'),
-- Final Exam (out of 100)
('77777777-7777-7777-7777-777777777714', '22222222-2222-2222-2222-222222222221', 68, current_timestamp - interval '1 week'),
('77777777-7777-7777-7777-777777777714', '22222222-2222-2222-2222-222222222222', 95, current_timestamp - interval '1 week'),
('77777777-7777-7777-7777-777777777714', '22222222-2222-2222-2222-222222222223', 75, current_timestamp - interval '1 week'),
('77777777-7777-7777-7777-777777777714', '22222222-2222-2222-2222-222222222224', 98, current_timestamp - interval '1 week'),
('77777777-7777-7777-7777-777777777714', '22222222-2222-2222-2222-222222222225', 52, current_timestamp - interval '1 week'),
('77777777-7777-7777-7777-777777777714', '22222222-2222-2222-2222-222222222226', 88, current_timestamp - interval '1 week'),
('77777777-7777-7777-7777-777777777714', '22222222-2222-2222-2222-222222222227', 82, current_timestamp - interval '1 week')
ON CONFLICT (assessment_id, student_id) DO NOTHING;

-- Seed Scores for MTH201 Group B
INSERT INTO public.student_scores (assessment_id, student_id, score_achieved, date_recorded) VALUES
('77777777-7777-7777-7777-777777777722', '22222222-2222-2222-2222-222222222221', 70, current_timestamp - interval '3 weeks'),
('77777777-7777-7777-7777-777777777722', '22222222-2222-2222-2222-222222222222', 88, current_timestamp - interval '3 weeks'),
('77777777-7777-7777-7777-777777777722', '22222222-2222-2222-2222-222222222224', 92, current_timestamp - interval '3 weeks'),
('77777777-7777-7777-7777-777777777722', '22222222-2222-2222-2222-222222222226', 80, current_timestamp - interval '3 weeks'),
('77777777-7777-7777-7777-777777777723', '22222222-2222-2222-2222-222222222221', 76, current_timestamp - interval '1 week'),
('77777777-7777-7777-7777-777777777723', '22222222-2222-2222-2222-222222222222', 91, current_timestamp - interval '1 week'),
('77777777-7777-7777-7777-777777777723', '22222222-2222-2222-2222-222222222224', 94, current_timestamp - interval '1 week'),
('77777777-7777-7777-7777-777777777723', '22222222-2222-2222-2222-222222222226', 85, current_timestamp - interval '1 week')
ON CONFLICT (assessment_id, student_id) DO NOTHING;

-- Seed Scores for CSE101 Group A
INSERT INTO public.student_scores (assessment_id, student_id, score_achieved, date_recorded) VALUES
('77777777-7777-7777-7777-777777777732', '22222222-2222-2222-2222-222222222222', 90, current_timestamp - interval '3 weeks'),
('77777777-7777-7777-7777-777777777732', '22222222-2222-2222-2222-222222222223', 72, current_timestamp - interval '3 weeks'),
('77777777-7777-7777-7777-777777777732', '22222222-2222-2222-2222-222222222225', 60, current_timestamp - interval '3 weeks'),
('77777777-7777-7777-7777-777777777732', '22222222-2222-2222-2222-222222222227', 82, current_timestamp - interval '3 weeks'),
('77777777-7777-7777-7777-777777777733', '22222222-2222-2222-2222-222222222222', 96, current_timestamp - interval '1 week'),
('77777777-7777-7777-7777-777777777733', '22222222-2222-2222-2222-222222222223', 78, current_timestamp - interval '1 week'),
('77777777-7777-7777-7777-777777777733', '22222222-2222-2222-2222-222222222225', 68, current_timestamp - interval '1 week'),
('77777777-7777-7777-7777-777777777733', '22222222-2222-2222-2222-222222222227', 85, current_timestamp - interval '1 week')
ON CONFLICT (assessment_id, student_id) DO NOTHING;

-- ==============================================================================
-- 10. SETTINGS
-- ==============================================================================

INSERT INTO public.settings (lecturer_id, attendance_threshold, grade_drop_threshold, language, sync_external_counselling)
VALUES ('11111111-1111-1111-1111-111111111111', 80, 20, 'en', false);