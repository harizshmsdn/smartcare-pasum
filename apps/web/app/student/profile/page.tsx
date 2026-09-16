// apps/web/app/student/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { PixelIcon } from "../../../components/PixelIcon";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/client";
import { studentService } from "../../../lib/services/student";
import { ChangePasswordModal } from "../../../components/ChangePasswordModal";

export default function StudentProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editEmergency, setEditEmergency] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      let profileData = null;
      let assignedClasses: any[] = [];

      try {
        const data = await studentService.getDashboard();
        if (data && data.profile) {
          profileData = data.profile;
        }
        assignedClasses = data?.assigned_classes || [];
      } catch (apiErr) {
        console.warn("FastAPI student profile error, falling back to direct Supabase:", apiErr);
      }

      if (!profileData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: directProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (directProfile) {
            profileData = directProfile;
          }
        }
      }

      if (profileData) {
        setProfile(profileData);
        setEditPhone(profileData.phone_number || "");
        setEditEmergency(profileData.emergency_contact || "");
      }

      if (assignedClasses.length > 0) {
        const formatted = assignedClasses.map((c: any) => ({
          code: c.subject || "PHY101",
          name: c.name || c.title || "Unknown Class",
          group: c.code || c.group || "Group A"
        }));
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
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          phone_number: editPhone || null,
          emergency_contact: editEmergency || null
        })
        .eq('id', profile.id);
      
      if (error) throw error;
      
      setProfile({
        ...profile,
        phone_number: editPhone || null,
        emergency_contact: editEmergency || null
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent text-white/70 font-mono text-sm">
        <span className="animate-pulse">Loading student profile...</span>
      </div>
    );
  }

  const initials = profile.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : "STU";

  const scienceStream = profile.affiliation || "Physical Science Stream";

  return (
    <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-transparent text-white">
      {/* Header */}
      <header className="mb-6 flex justify-between items-end border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs uppercase tracking-widest text-blue-400">PASUM // STUDENT PROFILE</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white font-mono">My Profile</h2>
          <p className="font-mono text-xs text-white/60 mt-0.5">Manage your student details and view enrolled academic courses</p>
        </div>
        <div className="flex items-center gap-2 border border-white/15 bg-white/5 text-blue-300 px-3.5 py-1.5 font-mono text-xs tracking-wider uppercase rounded-none">
          <PixelIcon name="graduation" size={16} />
          PASUM STUDENT
        </div>
      </header>

      {/* Grid wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Summary Info Card */}
        <div className="space-y-4">
          <div className="border border-white/15 bg-[#09111e]/80 backdrop-blur-md p-6 rounded-none shadow-xl text-center relative flex flex-col items-center">
            <div className="w-20 h-20 border border-white/20 bg-blue-500/15 text-blue-300 rounded-none flex items-center justify-center mb-4 font-mono font-bold text-2xl shadow-inner shrink-0">
              {initials}
            </div>

            <h3 className="font-mono text-lg font-bold text-white">{profile.full_name}</h3>
            <p className="font-mono text-xs text-blue-300 mt-0.5">Undergraduate Student</p>
            <p className="font-mono text-[11px] text-white/50 mt-0.5">Matric ID: {profile.institutional_id}</p>

            <div className="border-t border-white/10 mt-5 pt-5 w-full space-y-3 text-left text-xs font-mono relative">
              <div className="absolute -top-3 right-0">
                {!isEditing ? (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white p-1 rounded-none transition-colors cursor-pointer text-[10px] uppercase font-mono px-2"
                    title="Edit Contact Info"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="border border-white/15 bg-white/5 hover:bg-red-500/20 text-red-300 p-1 rounded-none transition-colors cursor-pointer text-[10px] font-mono px-2"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="border border-emerald-400/40 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 p-1 rounded-none transition-colors cursor-pointer text-[10px] font-mono px-2 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 text-white/70">
                <PixelIcon name="mail" size={14} className="text-white/40 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
              
              {isEditing ? (
                <div className="space-y-2 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-white/60">Phone Number</label>
                    <div className="flex items-center gap-2 border border-white/20 bg-black/40 px-3 py-1.5 rounded-none">
                      <PixelIcon name="phone" size={12} className="text-white/40 shrink-0" />
                      <input 
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="bg-transparent border-none text-xs w-full focus:outline-none text-white font-mono"
                        placeholder="+60 12-345 6789"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-white/60">Emergency Contact</label>
                    <div className="flex items-center gap-2 border border-white/20 bg-black/40 px-3 py-1.5 rounded-none">
                      <PixelIcon name="warning" size={12} className="text-white/40 shrink-0" />
                      <input 
                        type="text"
                        value={editEmergency}
                        onChange={(e) => setEditEmergency(e.target.value)}
                        className="bg-transparent border-none text-xs w-full focus:outline-none text-white font-mono"
                        placeholder="e.g. +60 19-876 5432 (Mother)"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {profile.phone_number && (
                    <div className="flex items-center gap-2.5 text-white/70">
                      <PixelIcon name="phone" size={14} className="text-white/40 shrink-0" />
                      <span>{profile.phone_number}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-white/70">
                    <PixelIcon name="building" size={14} className="text-white/40 shrink-0" />
                    <span className="truncate">{scienceStream}</span>
                  </div>
                  {profile.emergency_contact && (
                    <div className="flex items-center gap-2.5 text-amber-300">
                      <PixelIcon name="warning" size={14} className="text-amber-400 shrink-0" />
                      <span>{profile.emergency_contact}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Merit Claims Redirect button (Disabled) */}
            <div className="w-full border-t border-white/10 mt-5 pt-4">
              <div className="relative group/disabled w-full cursor-not-allowed" title="Disabled Feature">
                <div className="w-full flex items-center justify-center gap-2 border border-white/10 bg-white/5 text-white/40 font-mono py-2.5 px-3 text-xs uppercase tracking-wider pointer-events-none select-none rounded-none">
                  <PixelIcon name="award" size={14} />
                  Merit Claims [ DISABLED ]
                </div>
                <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover/disabled:flex items-center px-2 py-1 font-mono text-[11px] text-white bg-black border border-white/20 whitespace-nowrap z-50">
                  Disabled Feature
                </div>
              </div>
            </div>
          </div>

          {/* Change password button */}
          <button
            type="button"
            onClick={() => setIsPasswordModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 border border-white/20 bg-white/5 hover:bg-white/10 text-white font-mono text-xs uppercase font-bold py-3 px-4 rounded-none shadow-lg transition-colors cursor-pointer"
          >
            <PixelIcon name="key" size={16} className="text-blue-400" />
            <span>Change Password</span>
          </button>
        </div>

        {/* Right Column: Science Stream & Courses */}
        <div className="lg:col-span-2 space-y-4">
          {/* Science Stream Card */}
          <div className="border border-white/15 bg-[#09111e]/80 backdrop-blur-md p-5 rounded-none shadow-xl">
            <div className="border-b border-white/10 pb-3 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-400">01.</span>
                <span className="font-mono text-xs uppercase tracking-wider text-white/90">ENROLLED SCIENCE STREAM</span>
              </div>
              <PixelIcon name="graduation" size={16} className="text-blue-400" />
            </div>
            <p className="font-mono text-xs text-white/80 leading-relaxed border border-white/10 bg-black/40 p-3.5 rounded-none">
              {scienceStream}
            </p>
          </div>

          {/* Enrolled Courses */}
          <div className="border border-white/15 bg-[#09111e]/80 backdrop-blur-md p-5 rounded-none shadow-xl">
            <div className="border-b border-white/10 pb-3 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-400">02.</span>
                <span className="font-mono text-xs uppercase tracking-wider text-white/90">ENROLLED COURSE LOAD (CURRENT SEMESTER)</span>
              </div>
              <PixelIcon name="classes" size={16} className="text-blue-400" />
            </div>

            <div className="space-y-3">
              {enrolledCourses.length > 0 ? (
                enrolledCourses.map((course, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 border border-white/10 bg-white/5 hover:border-blue-400/40 rounded-none transition-colors gap-2"
                  >
                    <div>
                      <span className="font-mono text-[10px] font-bold border border-blue-400/40 bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-none">
                        {course.code}
                      </span>
                      <h5 className="font-mono font-bold text-white text-sm mt-1.5">{course.name}</h5>
                    </div>
                    <span className="font-mono text-[11px] border border-white/20 bg-white/5 text-white/70 px-2.5 py-1 rounded-none">
                      {course.group}
                    </span>
                  </div>
                ))
              ) : (
                <p className="font-mono text-xs text-white/40 py-6 text-center">No enrolled courses found.</p>
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
