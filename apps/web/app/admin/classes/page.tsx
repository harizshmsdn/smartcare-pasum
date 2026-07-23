// apps/web/app/admin/classes/page.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  BookOpen, 
  User, 
  MapPin, 
  Clock, 
  Award,
  BookMarked
} from "lucide-react";
import { createClient } from "../../../utils/supabase/client";

interface Subject {
  id: string;
  code: string;
  name: string;
  credit_hours: number;
}

interface ClassItem {
  id: string;
  subject_id: string;
  subject_code: string;
  subject_name: string;
  lecturer_id: string;
  lecturer_name: string;
  group_code: string;
  type: string;
  semester: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  location: string;
}

interface LecturerProfile {
  id: string;
  full_name: string;
  role: string;
}

export default function AdminClassesPage() {
  const supabase = createClient();
  
  // Data lists
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lecturers, setLecturers] = useState<LecturerProfile[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"classes" | "subjects">("classes");

  // Show forms modals
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);

  // Subject Form State
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [creditHours, setCreditHours] = useState(3);

  // Class Form State
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedLecturerId, setSelectedLecturerId] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [classType, setClassType] = useState("Lecture");
  const [semester, setSemester] = useState("Semester 1");
  const [dayOfWeek, setDayOfWeek] = useState("Monday");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [location, setLocation] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Fetch classes
      const classesRes = await fetch("http://localhost:8000/api/admin/classes", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (classesRes.ok) {
        const d = await classesRes.json();
        setClasses(d.classes);
      }

      // 2. Fetch subjects
      const subjectsRes = await fetch("http://localhost:8000/api/admin/subjects", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (subjectsRes.ok) {
        const d = await subjectsRes.json();
        setSubjects(d.subjects);
      }

      // 3. Fetch lecturers (via admin users list endpoint)
      const usersRes = await fetch("http://localhost:8000/api/admin/users", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (usersRes.ok) {
        const d = await usersRes.json();
        const lects = d.users.filter((u: any) => u.role === "lecturer" || u.role === "admin");
        setLecturers(lects);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("http://localhost:8000/api/admin/subjects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          code: subjectCode.toUpperCase(),
          name: subjectName,
          credit_hours: Number(creditHours)
        })
      });

      if (res.ok) {
        setShowAddSubject(false);
        setSubjectCode("");
        setSubjectName("");
        setCreditHours(3);
        fetchData();
      } else {
        alert("Failed to create subject.");
      }
    } catch (err) {
      console.error("Create subject error:", err);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !selectedLecturerId) {
      alert("Please select a subject and a lecturer.");
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Format times to HH:MM:SS
      const formattedStart = startTime.includes(":") && startTime.split(":").length === 2 ? `${startTime}:00` : startTime;
      const formattedEnd = endTime.includes(":") && endTime.split(":").length === 2 ? `${endTime}:00` : endTime;

      const res = await fetch("http://localhost:8000/api/admin/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subject_id: selectedSubjectId,
          lecturer_id: selectedLecturerId,
          group_code: groupCode,
          type: classType,
          semester,
          day_of_week: dayOfWeek,
          start_time: formattedStart,
          end_time: formattedEnd,
          location
        })
      });

      if (res.ok) {
        setShowAddClass(false);
        // Reset class form
        setGroupCode("");
        setLocation("");
        fetchData();
      } else {
        alert("Failed to create class.");
      }
    } catch (err) {
      console.error("Create class error:", err);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm("Are you sure you want to delete this class? All attendance logs, student scores, and sessions will be deleted.")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`http://localhost:8000/api/admin/classes/${classId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        fetchData();
      } else {
        alert("Failed to delete class.");
      }
    } catch (err) {
      console.error("Delete class error:", err);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-transparent p-10 flex flex-col space-y-8">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Class & Subject Management</h2>
          <p className="text-slate-500 mt-1">Configure subjects, allocate lecture classes, and assign faculty coordinators.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddSubject(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-2xl font-semibold text-sm transition-all border border-slate-200"
          >
            Create Subject
          </button>
          <button
            onClick={() => {
              const firstSub = subjects[0];
              const firstLec = lecturers[0];
              if (!firstSub) {
                alert("Please create a subject first before creating a class.");
                return;
              }
              if (!firstLec) {
                alert("Please add a lecturer profile first.");
                return;
              }
              setSelectedSubjectId(firstSub.id);
              setSelectedLecturerId(firstLec.id);
              setShowAddClass(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-semibold text-sm transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} /> Create Class Session
          </button>
        </div>
      </div>

      {/* Grid Tabs Selection */}
      <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-80 shadow-sm border border-slate-200">
        <button
          onClick={() => setActiveTab("classes")}
          className={`flex-1 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "classes" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Classes ({classes.length})
        </button>
        <button
          onClick={() => setActiveTab("subjects")}
          className={`flex-1 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "subjects" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Subjects ({subjects.length})
        </button>
      </div>

      {/* Data tables list */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-500 font-medium">Fetching roster information...</div>
      ) : activeTab === "classes" ? (
        classes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <div key={cls.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
                
                <div className="space-y-4">
                  {/* Subject Title */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 pr-2">
                      <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">{cls.type} • {cls.group_code}</span>
                      <h4 className="font-bold text-slate-900 text-base leading-tight mt-1">{cls.subject_code} - {cls.subject_name}</h4>
                    </div>
                  </div>

                  {/* Class Meta Details */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">Lecturer: {cls.lecturer_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-slate-400 shrink-0" />
                      <span>{cls.day_of_week} • {cls.start_time.slice(0, 5)} - {cls.end_time.slice(0, 5)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">Venue: {cls.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookMarked size={14} className="text-slate-400 shrink-0" />
                      <span>Term: {cls.semester}</span>
                    </div>
                  </div>
                </div>

                {/* Actions bottom row */}
                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleDeleteClass(cls.id)}
                    className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all border-none bg-transparent cursor-pointer font-semibold"
                    title="Remove Class"
                  >
                    <Trash2 size={16} /> Remove Class
                  </button>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
            <p className="text-slate-500 font-medium">No class sessions configured yet.</p>
          </div>
        )
      ) : (
        subjects.length > 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4">Subject Code</th>
                  <th className="px-6 py-4">Subject Name</th>
                  <th className="px-6 py-4">Credit Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {subjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{sub.code}</td>
                    <td className="px-6 py-4 font-semibold">{sub.name}</td>
                    <td className="px-6 py-4">{sub.credit_hours} Credits</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
            <p className="text-slate-500 font-medium">No subjects configured yet.</p>
          </div>
        )
      )}

      {/* ================= CREATE SUBJECT MODAL ================= */}
      {showAddSubject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 p-8 shadow-2xl space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Configure New Subject</h3>
              <p className="text-xs text-slate-500 mt-1">Specify syllabus identifiers and credit hour weight.</p>
            </div>

            <form onSubmit={handleAddSubject} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Subject Code</label>
                <input
                  type="text"
                  required
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 font-mono uppercase"
                  placeholder="E.g. PHY101"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Subject Name</label>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
                  placeholder="E.g. Physics 101 - Mechanics"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Credit Hours</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={6}
                  value={creditHours}
                  onChange={(e) => setCreditHours(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddSubject(false)}
                  className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors border-none cursor-pointer"
                >
                  Create Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CREATE CLASS SESSION MODAL ================= */}
      {showAddClass && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 p-8 shadow-2xl space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Create New Class Session</h3>
              <p className="text-xs text-slate-500 mt-1">Assign a subject syllabus to an academic coordinator and set the weekly schedule.</p>
            </div>

            <form onSubmit={handleAddClass} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Select Subject</label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 bg-white"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.code} - {sub.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Select Coordinator</label>
                  <select
                    value={selectedLecturerId}
                    onChange={(e) => setSelectedLecturerId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 bg-white"
                  >
                    {lecturers.map((lec) => (
                      <option key={lec.id} value={lec.id}>{lec.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Group Code</label>
                  <input
                    type="text"
                    required
                    value={groupCode}
                    onChange={(e) => setGroupCode(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
                    placeholder="E.g. Group A"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Type</label>
                  <select
                    value={classType}
                    onChange={(e) => setClassType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 bg-white"
                  >
                    <option value="Lecture">Lecture</option>
                    <option value="Tutorial">Tutorial</option>
                    <option value="Lab">Lab</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Semester</label>
                  <input
                    type="text"
                    required
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Day of Week</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 bg-white"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Location / Room Venue</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
                  placeholder="E.g. Lecture Hall 3 or Tutorial Room 1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddClass(false)}
                  className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors border-none cursor-pointer"
                >
                  Configure Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
