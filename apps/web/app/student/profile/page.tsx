// apps/web/app/student/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Phone,
  BookOpen,
  Award,
  GraduationCap,
  Edit2,
  Save,
  X,
  ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/client";
import { studentService } from "../../../lib/services/student";

export default function StudentProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editEmergency, setEditEmergency] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const data = await studentService.getDashboard();
      if (data.profile) {
        setProfile(data.profile);
        setEditPhone(data.profile.phone_number || "");
        setEditEmergency(data.profile.emergency_contact || "");
      }
      
      const assigned = data.assigned_classes || [];
      if (assigned.length > 0) {
        const formatted = assigned.map((c: any) => ({
          code: c.subject || "PHY101",
          name: c.title || "Unknown Class",
          group: c.group || "Group A"
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
      <main className="flex-1 p-8 overflow-y-auto bg-[#FAF9F6]">
        <header className="mb-8">
          <div className="w-48 h-8 bg-slate-200 rounded animate-pulse mb-2"></div>
          <div className="w-64 h-4 bg-slate-200 rounded animate-pulse"></div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="bg-slate-200 h-96 rounded-2xl animate-pulse"></div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-200 h-32 rounded-2xl animate-pulse"></div>
            <div className="bg-slate-200 h-64 rounded-2xl animate-pulse"></div>
          </div>
        </div>
      </main>
    );
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

            <div className="border-t border-slate-100 mt-6 pt-6 w-full space-y-3 text-left text-sm text-slate-650 relative">
              <div className="absolute -top-3 right-0 bg-white">
                {!isEditing ? (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Edit Contact Info"
                  >
                    <Edit2 size={16} />
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <X size={16} />
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
                    >
                      <Save size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-slate-400 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
              
              {isEditing ? (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Phone Number</label>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      <input 
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="bg-transparent border-none text-sm w-full focus:outline-none text-slate-700"
                        placeholder="+60 12-345 6789"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Emergency Contact</label>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                      <ShieldAlert size={14} className="text-slate-400 shrink-0" />
                      <input 
                        type="text"
                        value={editEmergency}
                        onChange={(e) => setEditEmergency(e.target.value)}
                        className="bg-transparent border-none text-sm w-full focus:outline-none text-slate-700"
                        placeholder="e.g. +60 19-876 5432 (Mother)"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {profile.phone_number && (
                    <div className="flex items-center gap-3">
                      <Phone size={16} className="text-slate-400 shrink-0" />
                      <span>{profile.phone_number}</span>
                    </div>
                  )}
                  {profile.emergency_contact && (
                    <div className="flex items-center gap-3">
                      <ShieldAlert size={16} className="text-red-400 shrink-0" />
                      <span className="text-slate-700">{profile.emergency_contact}</span>
                    </div>
                  )}
                </>
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
