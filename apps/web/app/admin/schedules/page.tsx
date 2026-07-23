// apps/web/app/admin/schedules/page.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  UserMinus, 
  GraduationCap, 
  Calendar, 
  MapPin, 
  Clock, 
  Search,
  BookOpen
} from "lucide-react";
import { createClient } from "../../../utils/supabase/client";

interface Enrollment {
  enrollment_id: string;
  current_attendance_rate: number;
  class_id: string;
  group_code: string;
  subject_code: string;
  subject_name: string;
  student_name: string;
  student_id: string;
  student_inst_id: string;
}

interface ClassItem {
  id: string;
  group_code: string;
  subject_code: string;
  subject_name: string;
  lecturer_name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  location: string;
  type: string;
}

interface StudentProfile {
  id: string;
  full_name: string;
  institutional_id: string;
  role: string;
}

export default function AdminSchedulesPage() {
  const supabase = createClient();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Form enrollment state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [targetClassId, setTargetClassId] = useState("");
  const [targetStudentId, setTargetStudentId] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Fetch enrollments
      const enrollRes = await fetch("http://localhost:8000/api/admin/enrollments", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (enrollRes.ok) {
        const d = await enrollRes.json();
        setEnrollments(d.enrollments);
      }

      // 2. Fetch classes
      const classesRes = await fetch("http://localhost:8000/api/admin/classes", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (classesRes.ok) {
        const d = await classesRes.json();
        setClasses(d.classes);
        if (d.classes.length > 0 && !selectedClassId) {
          setSelectedClassId(d.classes[0].id);
        }
      }

      // 3. Fetch students
      const usersRes = await fetch("http://localhost:8000/api/admin/users", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (usersRes.ok) {
        const d = await usersRes.json();
        const studs = d.users.filter((u: any) => u.role === "student");
        setStudents(studs);
      }

    } catch (err) {
      console.error("Error fetching scheduling data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentId || !targetClassId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("http://localhost:8000/api/admin/enrollments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          student_id: targetStudentId,
          class_id: targetClassId
        })
      });

      if (res.ok) {
        setShowEnrollModal(false);
        setTargetStudentId("");
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.detail || "Failed to enroll student.");
      }
    } catch (err) {
      console.error("Enroll student error:", err);
    }
  };

  const handleUnenrollStudent = async (enrollmentId: string) => {
    if (!confirm("Are you sure you want to remove this student from the class roster?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`http://localhost:8000/api/admin/enrollments/${enrollmentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        fetchData();
      } else {
        alert("Failed to unenroll student.");
      }
    } catch (err) {
      console.error("Unenroll error:", err);
    }
  };

  // Filter enrollments for the selected class
  const classEnrollments = enrollments.filter(e => e.class_id === selectedClassId);
  const activeClass = classes.find(c => c.id === selectedClassId);

  // Search filter
  const query = searchQuery.toLowerCase();
  const filteredEnrollments = classEnrollments.filter(e => 
    e.student_name?.toLowerCase().includes(query) ||
    e.student_inst_id?.toLowerCase().includes(query)
  );

  return (
    <main className="flex-1 overflow-y-auto bg-transparent p-10 flex flex-col space-y-8">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Schedule & Enrollment</h2>
          <p className="text-slate-500 mt-1">Enroll students into classes, manage schedules, and review active rosters.</p>
        </div>
        {classes.length > 0 && (
          <button
            onClick={() => {
              setTargetClassId(selectedClassId);
              const firstStudent = students[0];
              if (firstStudent) {
                setTargetStudentId(firstStudent.id);
              }
              setShowEnrollModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-semibold text-sm transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} /> Enroll Student in Class
          </button>
        )}
      </div>

      {/* Main layout split */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-500 font-medium">Loading enrollments...</div>
      ) : classes.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Class Navigation Menu Side List */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Classes list</h3>
            <div className="space-y-1">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => {
                    setSelectedClassId(cls.id);
                    setSearchQuery("");
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl transition-all border-none cursor-pointer flex flex-col space-y-1 ${
                    selectedClassId === cls.id 
                      ? "bg-slate-100 text-slate-900 font-bold" 
                      : "bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{cls.subject_code}</span>
                  <span className="text-sm font-semibold truncate">{cls.subject_name}</span>
                  <span className="text-[10px] font-semibold text-slate-500">{cls.group_code} • {cls.type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Class Roster View */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Active Class Schedule Card */}
            {activeClass && (
              <div className="bg-[#0b2240] rounded-3xl border border-slate-800 p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center relative overflow-hidden text-white gap-4">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>
                <div className="space-y-1 z-10">
                  <span className="text-blue-300 text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 px-2 py-0.5 rounded-md">{activeClass.type}</span>
                  <h3 className="text-xl font-bold mt-1.5">{activeClass.subject_code} - {activeClass.subject_name}</h3>
                  <p className="text-xs text-slate-400 font-medium">Instructor: {activeClass.lecturer_name}</p>
                </div>
                
                {/* Meta details list */}
                <div className="flex flex-wrap gap-4 text-xs text-slate-300 z-10 border-t sm:border-t-0 sm:border-l border-slate-700/50 pt-4 sm:pt-0 sm:pl-6">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-400" />
                    <span>{activeClass.day_of_week}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-400" />
                    <span>{activeClass.start_time.slice(0, 5)} - {activeClass.end_time.slice(0, 5)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-blue-400" />
                    <span className="max-w-[120px] truncate">{activeClass.location}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Roster Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <span className="font-bold text-slate-900 text-sm pl-2">Enrolled Students ({filteredEnrollments.length})</span>
              
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter student roster..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-xs text-slate-800 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Roster table */}
            {filteredEnrollments.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
                      <th className="px-6 py-4">Student Name</th>
                      <th className="px-6 py-4">Institutional ID</th>
                      <th className="px-6 py-4">Avg Attendance Rate</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredEnrollments.map((e) => (
                      <tr key={e.enrollment_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{e.student_name}</td>
                        <td className="px-6 py-4 font-mono font-semibold">{e.student_inst_id || "Unassigned"}</td>
                        <td className="px-6 py-4 font-bold">
                          <span className={`px-2.5 py-1 rounded-full ${
                            e.current_attendance_rate >= 90 ? 'bg-emerald-100 text-emerald-800' :
                            e.current_attendance_rate >= 80 ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {Math.round(e.current_attendance_rate)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleUnenrollStudent(e.enrollment_id)}
                            className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer font-bold inline-flex items-center gap-1"
                            title="Unenroll student"
                          >
                            <UserMinus size={14} /> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
                <p className="text-slate-500 font-medium">No students enrolled in this class session yet.</p>
              </div>
            )}

          </div>

        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <p className="text-slate-500 font-medium">Please create a class session first in the Classes menu.</p>
        </div>
      )}

      {/* ================= ENROLL STUDENT MODAL ================= */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 p-8 shadow-2xl space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Enroll Student</h3>
              <p className="text-xs text-slate-500 mt-1">Select a student from the active directory load to assign to the roster.</p>
            </div>

            <form onSubmit={handleEnrollStudent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Target Class</label>
                <select
                  disabled
                  value={targetClassId}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none text-slate-500 bg-slate-50"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.subject_code} - {cls.subject_name} ({cls.group_code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Select Student</label>
                <select
                  value={targetStudentId}
                  onChange={(e) => setTargetStudentId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 bg-white"
                >
                  {students.map((stud) => (
                    <option key={stud.id} value={stud.id}>{stud.full_name} ({stud.institutional_id || "No ID"})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors border-none cursor-pointer"
                >
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
