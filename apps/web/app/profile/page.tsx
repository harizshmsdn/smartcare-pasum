// Lecturer Profile page in dottxt.ai sharp dark style with emerald accents
"use client";

import { useState, useEffect } from "react";
import { PixelIcon } from "../../components/PixelIcon";
import { createClient } from "../../utils/supabase/client";
import { ChangePasswordModal } from "../../components/ChangePasswordModal";

export default function LecturerProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [classesTaught, setClassesTaught] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

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
          const mapped = classesData.map((c: any) => ({
            code: c.subjects?.code || "PASUM",
            title: c.subjects?.name || "Subject",
            group: c.group_code
          }));
          setClassesTaught(mapped);
        }
      } catch (err) {
        console.error("Error fetching lecturer profile:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (isLoading || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent text-white/70 text-sm">
        <span className="animate-pulse">Loading lecturer profile...</span>
      </div>
    );
  }

  const initials = profile.full_name ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : "STF";

  return (
    <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-transparent text-white">
      {/* Header */}
      <header className="mb-6 flex justify-between items-end border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">PASUM // FACULTY PROFILE</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white uppercase">My Profile</h2>
          <p className="text-xs text-white/60 mt-0.5">Manage your academic credentials and professional contact details</p>
        </div>
        <div className="flex items-center gap-2 border border-white/15 bg-white/5 text-emerald-300 px-3.5 py-1.5 text-xs tracking-wider uppercase rounded-none font-medium">
          <PixelIcon name="graduation" size={16} />
          PASUM FACULTY
        </div>
      </header>

      {/* Grid wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Summary Info Card */}
        <div className="space-y-4">
          <div className="border border-white/15 bg-[#08090c]/80 backdrop-blur-md p-6 rounded-none shadow-xl text-center relative flex flex-col items-center">
            <div className="w-20 h-20 border border-emerald-400/30 bg-emerald-500/15 text-emerald-300 rounded-none flex items-center justify-center mb-4 font-bold text-2xl shadow-inner shrink-0">
              {initials}
            </div>

            <h3 className="text-lg font-bold text-white">{profile.full_name}</h3>
            <p className="text-xs text-emerald-300 mt-0.5">Senior Lecturer</p>
            <p className="text-[11px] text-white/50 mt-0.5">Staff ID: {profile.institutional_id}</p>

            <div className="border-t border-white/10 mt-5 pt-5 w-full space-y-3 text-left text-xs">
              <div className="flex items-center gap-2.5 text-white/80">
                <PixelIcon name="mail" size={15} className="text-emerald-400 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-white/80">
                <PixelIcon name="phone" size={15} className="text-emerald-400 shrink-0" />
                <span>{profile.phone_number || "+60 3-7967 4321"}</span>
              </div>
              <div className="flex items-center gap-2.5 text-white/80">
                <PixelIcon name="pin" size={15} className="text-emerald-400 shrink-0" />
                <span className="text-[11px]">{profile.office_location || "PASUM Main Building"}</span>
              </div>
            </div>
          </div>

          {/* Change password button */}
          <button
            type="button"
            onClick={() => setIsPasswordModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 border border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs uppercase font-bold py-3 px-4 rounded-none shadow-lg transition-colors cursor-pointer tracking-wider"
          >
            <PixelIcon name="key" size={16} className="text-emerald-400" />
            <span>Change Password</span>
          </button>
        </div>

        {/* Right Column: Academic Details & Assignments */}
        <div className="lg:col-span-2 space-y-4">

          {/* Department Information - displayed only once here */}
          <div className="border border-white/15 bg-[#08090c]/80 backdrop-blur-md p-5 rounded-none shadow-xl">
            <div className="border-b border-white/10 pb-3 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400">01.</span>
                <span className="text-xs uppercase tracking-wider text-white/90 font-semibold">DEPARTMENT & AFFILIATION</span>
              </div>
              <PixelIcon name="building" size={16} className="text-emerald-400" />
            </div>
            <p className="text-xs text-white/80 leading-relaxed border border-white/10 bg-black/40 p-3.5 rounded-none">
              {profile.affiliation || "Center for Foundation Studies in Science (PASUM)"}
            </p>
          </div>

          {/* Active Course Load Assignments */}
          <div className="border border-white/15 bg-[#08090c]/80 backdrop-blur-md p-5 rounded-none shadow-xl">
            <div className="border-b border-white/10 pb-3 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400">02.</span>
                <span className="text-xs uppercase tracking-wider text-white/90 font-semibold">ASSIGNED COURSE LOAD (CURRENT SEMESTER)</span>
              </div>
              <PixelIcon name="classes" size={16} className="text-emerald-400" />
            </div>

            <div className="space-y-3">
              {classesTaught.length > 0 ? (
                classesTaught.map((course, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 border border-white/10 bg-white/5 hover:border-emerald-400/40 rounded-none transition-colors gap-2">
                    <div>
                      <span className="text-[10px] font-bold border border-emerald-400/40 bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-none">
                        {course.code}
                      </span>
                      <h5 className="font-bold text-white text-sm mt-1.5">{course.title}</h5>
                    </div>
                    <span className="text-[11px] border border-white/20 bg-white/5 text-white/70 px-2.5 py-1 rounded-none font-medium">
                      {course.group}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-white/40 py-6 text-center">No assigned classes found.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </main>
  );
}