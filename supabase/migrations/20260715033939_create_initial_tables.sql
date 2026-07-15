-- ==============================================================================
-- 1. ENUMS
-- ==============================================================================

CREATE TYPE public.user_role AS ENUM ('lecturer', 'student', 'admin');
CREATE TYPE public.class_type AS ENUM ('Lecture', 'Tutorial', 'Lab');
CREATE TYPE public.attendance_status AS ENUM ('Present', 'Absent', 'Late', 'Excused');
CREATE TYPE public.assessment_type AS ENUM ('Continuous', 'Midterm', 'Final');
CREATE TYPE public.alert_type AS ENUM ('attendance', 'assessment', 'system', 'merit');
CREATE TYPE public.priority_level AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE public.intervention_status AS ENUM ('needs_review', 'in_progress', 'referred', 'resolved');
CREATE TYPE public.language_preference AS ENUM ('en', 'bm');
CREATE TYPE public.merit_status AS ENUM ('pending', 'approved', 'rejected');

-- ==============================================================================
-- 2. TABLES & FOREIGN KEYS
-- ==============================================================================

-- PROFILES
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    institutional_id VARCHAR(50) UNIQUE, 
    email VARCHAR(255) UNIQUE NOT NULL,
    face_hash VARCHAR(255), 
    device_id VARCHAR(255), 
    total_merit_score NUMERIC DEFAULT 0, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- MERIT CLAIMS
CREATE TABLE public.merit_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    evaluator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, 
    title VARCHAR(255) NOT NULL, 
    proof_file_url VARCHAR(255), 
    status public.merit_status DEFAULT 'pending' NOT NULL,
    awarded_points NUMERIC, 
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE
);

-- SUBJECTS
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, 
    name VARCHAR(255) NOT NULL, 
    credit_hours INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- CLASSES
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    lecturer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_code VARCHAR(50) NOT NULL, 
    type public.class_type NOT NULL,
    semester VARCHAR(50) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ENROLLMENTS
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    current_attendance_rate NUMERIC DEFAULT 0, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE(student_id, class_id) 
);

-- ATTENDANCE SESSIONS
CREATE TABLE public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE, 
    session_pin VARCHAR(255) UNIQUE NOT NULL, 
    geo_lat NUMERIC, 
    geo_lng NUMERIC, 
    geo_radius_meters INT DEFAULT 50, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ATTENDANCE RECORDS
CREATE TABLE public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    face_verified BOOLEAN DEFAULT false, 
    location_verified BOOLEAN DEFAULT false, 
    manual_override BOOLEAN DEFAULT false, 
    status public.attendance_status NOT NULL,
    UNIQUE(session_id, student_id) 
);

-- ASSESSMENTS
CREATE TABLE public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL, 
    type public.assessment_type NOT NULL,
    weightage NUMERIC NOT NULL, 
    total_marks INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- STUDENT SCORES
CREATE TABLE public.student_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    score_achieved NUMERIC NOT NULL,
    date_recorded TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE(assessment_id, student_id)
);

-- ALERTS
CREATE TABLE public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecturer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, 
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, 
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    type public.alert_type NOT NULL,
    priority public.priority_level NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- INTERVENTIONS
CREATE TABLE public.interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    lecturer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    issue_description TEXT NOT NULL,
    status public.intervention_status DEFAULT 'needs_review' NOT NULL,
    priority public.priority_level NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- SETTINGS
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecturer_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    attendance_threshold INT DEFAULT 80 NOT NULL,
    grade_drop_threshold INT DEFAULT 20 NOT NULL,
    language public.language_preference DEFAULT 'en' NOT NULL,
    sync_external_counselling BOOLEAN DEFAULT false NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);


-- ==============================================================================
-- 3. TRIGGERS (Updated At)
-- ==============================================================================


CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profiles_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_interventions_updated
    BEFORE UPDATE ON public.interventions
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_settings_updated
    BEFORE UPDATE ON public.settings
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();


-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merit_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Helper function to fetch the current user's role securely
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS public.user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles: Users can read all profiles (needed for generic lookups), but only update their own.
CREATE POLICY "Profiles are viewable by all authenticated users" 
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Settings: Only the specific lecturer can view/update their settings
CREATE POLICY "Lecturers can manage their own settings" 
ON public.settings FOR ALL TO authenticated USING (auth.uid() = lecturer_id);

-- Merit Claims: Students can see their own. Lecturers/Admins can see all and update status.
CREATE POLICY "Students can view their own claims" 
ON public.merit_claims FOR SELECT TO authenticated USING (auth.uid() = student_id OR public.get_auth_user_role() IN ('lecturer', 'admin'));

CREATE POLICY "Students can insert their own claims" 
ON public.merit_claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Lecturers and Admins can update claims" 
ON public.merit_claims FOR UPDATE TO authenticated USING (public.get_auth_user_role() IN ('lecturer', 'admin'));

-- Subjects & Classes: Viewable by all authenticated users. Lecturers/Admins manage.
CREATE POLICY "Subjects are viewable by everyone" 
ON public.subjects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Classes are viewable by everyone" 
ON public.classes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lecturers can manage their own classes" 
ON public.classes FOR ALL TO authenticated USING (auth.uid() = lecturer_id OR public.get_auth_user_role() = 'admin');

-- Enrollments: Viewable by the enrolled student and the class lecturer.
CREATE POLICY "Students can view their own enrollments" 
ON public.enrollments FOR SELECT TO authenticated USING (
    auth.uid() = student_id OR 
    EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.lecturer_id = auth.uid())
);

-- Attendance Sessions: Viewable by all (so students can check in), manageable by the class lecturer.
CREATE POLICY "Attendance sessions are viewable by enrolled students and lecturers" 
ON public.attendance_sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lecturers manage sessions for their classes" 
ON public.attendance_sessions FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.lecturer_id = auth.uid())
);

-- Attendance Records: Students can view/insert their own. Lecturers can view/manage for their classes.
CREATE POLICY "Students can manage their own attendance records" 
ON public.attendance_records FOR SELECT TO authenticated USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own attendance records" 
ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Lecturers can view and update records for their sessions" 
ON public.attendance_records FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.attendance_sessions s 
        JOIN public.classes c ON s.class_id = c.id 
        WHERE s.id = session_id AND c.lecturer_id = auth.uid()
    )
);

-- Assessments & Scores
CREATE POLICY "Assessments are viewable by all" 
ON public.assessments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lecturers manage assessments for their classes" 
ON public.assessments FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.lecturer_id = auth.uid())
);

CREATE POLICY "Students can view their own scores" 
ON public.student_scores FOR SELECT TO authenticated USING (auth.uid() = student_id);

CREATE POLICY "Lecturers manage scores for their assessments" 
ON public.student_scores FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.assessments a 
        JOIN public.classes c ON a.class_id = c.id 
        WHERE a.id = assessment_id AND c.lecturer_id = auth.uid()
    )
);

-- Alerts & Interventions: Viewable and manageable only by the relevant lecturer (or admin)
CREATE POLICY "Lecturers manage their own alerts" 
ON public.alerts FOR ALL TO authenticated USING (auth.uid() = lecturer_id);

CREATE POLICY "Lecturers manage their own interventions" 
ON public.interventions FOR ALL TO authenticated USING (auth.uid() = lecturer_id);

-- Automated trigger to award merit points to student profile upon approval of a merit claim
CREATE OR REPLACE FUNCTION public.handle_merit_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
        UPDATE public.profiles
        SET total_merit_score = total_merit_score + COALESCE(NEW.awarded_points, 0)
        WHERE id = NEW.student_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_merit_approved
    AFTER UPDATE ON public.merit_claims
    FOR EACH ROW EXECUTE FUNCTION public.handle_merit_approval();

-- Explicit schema and table grants for roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;