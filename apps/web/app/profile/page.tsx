// apps/web/app/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  Mail, 
  Phone, 
  MapPin, 
  BookOpen, 
  Building
} from "lucide-react";
import { createClient } from "../../utils/supabase/client";

export default function LecturerProfilePage() {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [classesTaught, setClassesTaught] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch Lecturer Profile
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(prof);

        // Fetch Classes
        const { data: classesData } = await supabase
          .from('classes')
          .select(`
            group_code,
            subjects (
              code,
              name
            )
          `)
          .eq('lecturer_id', user.id);

        if (classesData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const formatted = classesData.map((c: any) => ({
            code: c.subjects?.code || "PHY101",
            name: c.subjects?.name || "Unknown Class",
            group: c.group_code || "Group A"
          }));
          setClassesTaught(formatted);
        }
      } catch (err) {
        console.error("Error fetching lecturer profile:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading || !profile) {
    return <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">Loading profile...</div>;
  }

  const initials = profile.full_name ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : "STF";

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-[#FAF9F6]">
      
      {/* Header */}
      <header className="mb-8">
        <h2 className="text-3xl font-semibold text-slate-900">My Profile</h2>
        <p className="text-slate-500 mt-1">Manage your academic profile and professional contact details</p>
      </header>

      {/* Grid wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Summary Info Card */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center relative overflow-hidden">
            
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white mx-auto mb-4 font-bold text-3xl shadow-md animate-pulse">
              {initials}
            </div>
            
            <h3 className="text-xl font-bold text-slate-900">{profile.full_name}</h3>
            <p className="text-sm font-medium text-blue-600 mt-0.5">Senior Lecturer</p>
            <p className="text-xs text-slate-400 mt-1">Staff ID: {profile.institutional_id}</p>

            <div className="border-t border-slate-100 mt-6 pt-6 space-y-3 text-left text-sm">
              <div className="flex items-center gap-3 text-slate-600">
                <Mail size={16} className="text-slate-400 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Phone size={16} className="text-slate-400 shrink-0" />
                <span>+60 3-7967 4321</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <MapPin size={16} className="text-slate-400 shrink-0" />
                <span className="text-xs">Block B, Room 2.4, PASUM Main Building</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Academic Details & Assignments (Takes 2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Department Information */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building size={18} className="text-slate-400" /> Institutional Affiliation
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              Physics Domain, Center for Foundation Studies in Science (PASUM)
            </p>
          </div>

          {/* Active Course Load Assignments */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-slate-400" /> Assigned Course Load (Current Semester)
            </h4>
            
            <div className="space-y-4">
              {classesTaught.length > 0 ? (
                classesTaught.map((course, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-blue-200 transition-colors gap-2">
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
                <p className="text-slate-500 text-sm py-4 text-center">No assigned classes found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}