// apps/web/app/student/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Phone,
  BookOpen,
  Award,
  GraduationCap
} from "lucide-react";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/client";

export default function StudentProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch Student Profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(prof);

      // Fetch Enrolled Courses
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select(`
          classes (
            group_code,
            subjects (
              code,
              name
            )
          )
        `)
        .eq('student_id', user.id);

      if (enrollmentsData) {
        const formatted = enrollmentsData.map((e: any) => {
          const c = e.classes;
          return {
            code: c?.subjects?.code || "PHY101",
            name: c?.subjects?.name || "Unknown Class",
            group: c?.group_code || "Group A"
          };
        });
        setEnrolledCourses(formatted);
      }
    } catch (err) {
      console.error("Error fetching student profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    // Realtime channel listener for profile updates
    const channel = supabase
      .channel('student_profile_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchProfile();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (isLoading || !profile) {
    return <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">Loading profile...</div>;
  }

  const initials = profile.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : "STU";

  // Enrolled science stream fallback
  const scienceStream = profile.affiliation || "Physical Science Stream";

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-[#FAF9F6]">
      {/* Header */}
      <header className="mb-8">
        <h2 className="text-3xl font-semibold text-slate-900">My Profile</h2>
        <p className="text-slate-500 mt-1">Manage your student details and view academic courses</p>
      </header>

      {/* Grid wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Summary Info Card */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center relative overflow-hidden flex flex-col items-center">
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white mb-4 font-bold text-3xl shadow-md shrink-0">
              {initials}
            </div>

            <h3 className="text-xl font-bold text-slate-900">{profile.full_name}</h3>
            <p className="text-sm font-semibold text-blue-600 mt-0.5">Undergraduate Student</p>
            <p className="text-xs text-slate-400 mt-1">Matric ID: {profile.institutional_id}</p>

            <div className="border-t border-slate-100 mt-6 pt-6 w-full space-y-3 text-left text-sm text-slate-650">
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-slate-400 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
              {profile.phone_number && (
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-slate-400 shrink-0" />
                  <span>{profile.phone_number}</span>
                </div>
              )}
            </div>

            {/* Merit Claims Redirect button below details */}
            <div className="w-full border-t border-slate-100 mt-6 pt-6">
              <Link
                href="/student/merit-requests"
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-blue-100 transition-all hover:shadow active:scale-95 text-sm"
              >
                <Award size={18} />
                Merit Requests & Claims
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Science Stream & Courses */}
        <div className="lg:col-span-2 space-y-6">
          {/* Science Stream Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <GraduationCap size={18} className="text-slate-400" /> Enrolled Science Stream
            </h4>
            <p className="text-sm font-bold text-slate-700 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              {scienceStream}
            </p>
          </div>

          {/* Enrolled Courses */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-slate-400" /> Enrolled Course Load (Current Semester)
            </h4>

            <div className="space-y-4">
              {enrolledCourses.length > 0 ? (
                enrolledCourses.map((course, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-blue-200 transition-colors gap-2"
                  >
                    <div>
                      <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                        {course.code}
                      </span>
                      <h5 className="font-semibold text-slate-900 mt-1.5">{course.name}</h5>
                    </div>
                    <span className="text-xs font-medium bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md">
                      {course.group}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm py-4 text-center">No enrolled courses found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
