// apps/web/app/classes/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  Users,
  Calendar,
  MoreVertical,
  Filter,
  ArrowRight,
  QrCode,
  X,
  ScanFace,
  MapPin,
  Laptop,
  Check,
  BookOpen,
  FileSpreadsheet,
  Plus,
  Save
} from "lucide-react";
import { createClient } from "../../utils/supabase/client";
import { useEffect } from "react";

interface StudentListItem {
  id: string;
  matricId: string;
  name: string;
  status: string;
  attendance: number;
  latestScore: number;
  lastSeen: string;
}

interface ClassItem {
  id: string;
  name: string;
}

export default function ClassesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedClassName, setSelectedClassName] = useState<string>("");
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // States for the configuration modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [onlineMode, setOnlineMode] = useState(false);
  const [faceIdRequired, setFaceIdRequired] = useState(true);
  const [locationRequired, setLocationRequired] = useState(true);
  const [isReplacement, setIsReplacement] = useState(false);
  const [customDateTime, setCustomDateTime] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [hasAnyActiveSession, setHasAnyActiveSession] = useState(false);
  const [nextSessionTime, setNextSessionTime] = useState<string>("Wed, 10:00 AM");

  // States for Assessments & Marks Modal
  const [isAssessmentsModalOpen, setIsAssessmentsModalOpen] = useState(false);
  const [assessmentsTab, setAssessmentsTab] = useState<"matrix" | "list" | "create">("matrix");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [classAssessments, setClassAssessments] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [classRosterScores, setClassRosterScores] = useState<any[]>([]);
  const [editingScores, setEditingScores] = useState<{ [key: string]: number | string }>({});

  // New assessment form
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("Continuous");
  const [newWeightage, setNewWeightage] = useState("10");
  const [newTotalMarks, setNewTotalMarks] = useState("20");
  const [isSavingScore, setIsSavingScore] = useState(false);

  const handleStartSessionClick = () => {
    setOnlineMode(false);
    setFaceIdRequired(true);
    setLocationRequired(true);
    setIsReplacement(false);
    setCustomDateTime("");
    setShowConfigModal(true);
  };


  // Fetch classes taught by this lecturer
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: classesData } = await supabase
          .from('classes')
          .select(`
            id,
            group_code,
            day_of_week,
            start_time,
            subjects (
              code,
              name
            )
          `)
          .eq('lecturer_id', user.id);

        if (classesData && classesData.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const formatted = classesData.map((c: any) => {
            let formattedTime = "";
            if (c.start_time) {
              const [hrs, mins] = c.start_time.split(":");
              const h = parseInt(hrs, 10);
              const ampm = h >= 12 ? "PM" : "AM";
              const h12 = h % 12 || 12;
              formattedTime = `${h12}:${mins} ${ampm}`;
            }
            const dayShort = c.day_of_week ? c.day_of_week.slice(0, 3) : "";
            const scheduleStr = dayShort && formattedTime ? `${dayShort}, ${formattedTime}` : "Schedule TBD";

            return {
              id: c.id,
              name: `${c.subjects?.code} - ${c.subjects?.name} (${c.group_code})`,
              schedule: scheduleStr
            };
          });
          setClassesList(formatted);
          const urlParams = new URLSearchParams(window.location.search);
          const urlClassId = urlParams.get("classId");
          const targetClass = formatted.find((c: any) => c.id === urlClassId) || formatted[0];
          if (targetClass) {
            setSelectedClassId(targetClass.id);
            setSelectedClassName(targetClass.name);
            setNextSessionTime(targetClass.schedule);
          }
        }
      } catch (err) {
        console.error("Error loading lecturer classes:", err);
      }
    };
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch class assessments and gradebook scores from FastAPI
  const fetchClassAssessments = async (classId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`http://localhost:8000/api/classes/${classId}/assessments`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setClassAssessments(data.assessments || []);
        setClassRosterScores(data.roster || []);
      } else {
        await fetchFallbackClassAssessments(classId);
      }
    } catch (err) {
      console.warn("FastAPI offline, using Supabase direct assessment fetch:", err);
      await fetchFallbackClassAssessments(classId);
    }
  };

  const fetchFallbackClassAssessments = async (classId: string) => {
    const { data: assessments } = await supabase
      .from('assessments')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: true });

    setClassAssessments(assessments || []);

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        student_id,
        profiles (
          id,
          full_name,
          institutional_id
        )
      `)
      .eq('class_id', classId);

    if (enrollments) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roster = enrollments.map((e: any) => ({
        student_id: e.student_id,
        student_name: e.profiles?.full_name || "Student",
        matric_id: e.profiles?.institutional_id || "N/A",
        scores: {}
      }));
      setClassRosterScores(roster);
    }
  };

  // Fetch student roster for selected class
  useEffect(() => {
    if (!selectedClassId) return;

    const fetchRoster = async () => {
      // Check for active session (closed_at is null)
      const { data: activeSession } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('class_id', selectedClassId)
        .is('closed_at', null)
        .maybeSingle();

      const { data: anyActive } = await supabase
        .from('attendance_sessions')
        .select('id')
        .is('closed_at', null)
        .limit(1);

      if (activeSession) {
        setActiveSessionId(activeSession.id);
      } else {
        setActiveSessionId(null);
      }
      setHasAnyActiveSession(!!(anyActive && anyActive.length > 0));

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          current_attendance_rate,
          profiles (
            id,
            full_name,
            institutional_id
          )
        `)
        .eq('class_id', selectedClassId);

      if (enrollments) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedStudents = enrollments.map((e: any) => {
          const profile = e.profiles;
          const attendance = Number(e.current_attendance_rate);
          let status = 'good';
          if (attendance < 80) status = 'critical';
          else if (attendance < 90) status = 'at-risk';

          return {
            id: profile?.id || '',
            matricId: profile?.institutional_id || '',
            name: profile?.full_name || 'Unknown Student',
            status,
            attendance,
            latestScore: attendance < 80 ? 45 : attendance < 90 ? 63 : 88,
            lastSeen: attendance < 80 ? '3 days ago' : 'Today'
          };
        });
        setStudents(formattedStudents);
      }
    };
    fetchRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId]);

  //Filter Logic: Applies Tab selection AND Search Query
  const filteredStudents = students.filter((student) => {
    //Tab Filter
    const matchesTab = activeTab === "all" || (activeTab === "alerts" && student.status !== "good");

    //Search Filter (matches name or ID)
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.matricId.includes(searchQuery);

    return matchesTab && matchesSearch;
  });

  //Calculate dynamic alerts count
  const alertsCount = students.filter(s => s.status !== "good").length;
  const classAvg = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + s.attendance, 0) / students.length)
    : 100;

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-[#FAF9F6]">

      {/* Header & Class Selector */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Class Roster</h2>
          <p className="text-slate-500 mt-1">Manage and monitor specific cohorts</p>
        </div>

        {/* Dropdown for selecting classes and Start Session button */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {selectedClassId && (
            activeSessionId ? (
              <button
                onClick={() => router.push(`/attendance/active?sessionId=${activeSessionId}&classId=${selectedClassId}`)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-semibold shadow-md shadow-emerald-200 hover:shadow-lg transition-all active:scale-95 cursor-pointer border-none font-sans animate-pulse"
              >
                <QrCode size={18} />
                <span>Ongoing Session</span>
              </button>
            ) : hasAnyActiveSession ? (
              <button
                disabled
                className="flex items-center gap-2 bg-slate-200 text-slate-400 px-5 py-3 rounded-xl font-semibold cursor-not-allowed border-none font-sans"
              >
                <QrCode size={18} />
                <span>Another session is ongoing</span>
              </button>
            ) : (
              <button
                onClick={handleStartSessionClick}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold shadow-md shadow-blue-200 hover:shadow-lg transition-all active:scale-95 cursor-pointer border-none font-sans"
              >
                <QrCode size={18} />
                <span>Start Session</span>
              </button>
            )
          )}

          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider leading-none mb-1">Current View</span>
                <span className="leading-none">{selectedClassName || "Loading..."}</span>
              </div>
              <ChevronDown size={18} className="text-slate-400 ml-2" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-full min-w-[220px] bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                {classesList.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setSelectedClassId(cls.id);
                      setSelectedClassName(cls.name);
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      if ((cls as any).schedule) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        setNextSessionTime((cls as any).schedule);
                      }
                      setIsDropdownOpen(false);
                      window.history.pushState(null, '', `/classes?classId=${cls.id}`);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition-colors ${selectedClassId === cls.id ? 'bg-blue-50/50 text-blue-700 font-medium' : 'text-slate-700'}`}
                  >
                    {cls.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Top Row: Mini-Bento Class Metrics (5 Columns, 1 Row) */}
      <div className="grid grid-cols-5 gap-5 mb-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>

        {/* Card 1: Enrolled Students */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 min-w-0">
          <div className="bg-blue-50 p-3.5 rounded-2xl text-blue-600 shrink-0">
            <Users size={26} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 truncate mb-1">Enrolled Students</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">{students.length}</p>
          </div>
        </div>

        {/* Card 2: Class Average */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 min-w-0">
          <div className="bg-emerald-50 p-3.5 rounded-2xl text-emerald-600 shrink-0">
            <CheckCircle2 size={26} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 truncate mb-1">Class Average</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">{classAvg}%</p>
          </div>
        </div>

        {/* Card 3: Next Session */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 min-w-0">
          <div className="bg-indigo-50 p-3.5 rounded-2xl text-indigo-600 shrink-0">
            <Calendar size={26} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 truncate mb-1">Next Session</p>
            <p className="text-2xl sm:text-lg font-bold text-slate-900 truncate leading-tight">{nextSessionTime}</p>
          </div>
        </div>

        {/* Card 4: Assessments & Marks CTA Button */}
        <Link
          href={`/classes/assessments?classId=${selectedClassId}`}
          className="bg-[#1e293b] hover:bg-slate-600 p-5 sm:p-6 rounded-3xl shadow-md flex items-center gap-5 sm:gap-6 group transition-all cursor-pointer border-none text-left min-w-0"
          style={{ backgroundColor: '#1e293b' }}
        >
          <div className="bg-white/10 p-3.5 rounded-2xl text-white group-hover:scale-110 group-hover:bg-blue-600 transition-all shrink-0">
            <BookOpen size={26} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">Grading & Exams</p>
            <p className="text-lg sm:text-xl font-bold text-white leading-tight truncate">Assessments & Marks</p>
          </div>
        </Link>

        {/* Card 5: Intervention Board CTA */}
        <Link
          href="/interventions"
          className="bg-slate-900 p-5 sm:p-6 rounded-3xl shadow-md flex items-center gap-5 sm:gap-6 group hover:bg-slate-800 transition-all cursor-pointer min-w-0"
        >
          <div className="bg-white/10 p-3.5 rounded-2xl text-white group-hover:scale-110 group-hover:bg-blue-600 transition-all shrink-0">
            <ArrowRight size={26} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Action Required</p>
            <p className="text-lg sm:text-xl font-bold text-white leading-tight truncate">Intervention Board</p>
          </div>
        </Link>
      </div>

      {/* Roster Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Table Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
          {/* Tabs for filtering students */}
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              All Students
            </button>
            <button
              onClick={() => setActiveTab("alerts")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "alerts" ? "bg-red-50 text-red-700 border border-red-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"}`}
            >
              Alerts Only <span className={`px-1.5 py-0.5 rounded text-xs ${activeTab === "alerts" ? "bg-red-200 text-red-800" : "bg-red-100 text-red-700"}`}>{alertsCount}</span>
            </button>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            {/* FIX 3: Search Input tied to searchQuery state */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search matric ID or name..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            <button className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">AI Risk Status</th>
                <th className="p-4 font-medium">Attendance</th>
                <th className="p-4 font-medium">Latest Score</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* NOW RENDERING filteredStudents instead of mockStudents */}
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} onClick={() => router.push(`/classes/${student.id}?classId=${selectedClassId}`)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{student.name}</p>
                          <p className="text-xs text-slate-500">{student.matricId} • Last seen {student.lastSeen}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {student.status === "critical" && (
                        <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-md text-xs font-semibold">
                          <AlertTriangle size={14} /> Critical
                        </span>
                      )}
                      {student.status === "at-risk" && (
                        <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-md text-xs font-semibold">
                          <TrendingDown size={14} /> At Risk
                        </span>
                      )}
                      {student.status === "good" && (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-semibold">
                          <CheckCircle2 size={14} /> On Track
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${student.attendance < 80 ? "text-red-600" : "text-slate-700"}`}>
                          {student.attendance}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`font-semibold ${student.latestScore < 50 ? "text-red-600" : "text-slate-700"}`}>
                        {student.latestScore}%
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No students found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Session Configuration Modal */}
      {showConfigModal && selectedClassId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 p-6 text-white relative">
              <button
                onClick={() => setShowConfigModal(false)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors border-none cursor-pointer text-white"
              >
                <X size={20} />
              </button>
              <span className="text-xs font-bold tracking-wider uppercase bg-blue-600 text-white px-3 py-1 rounded-full">
                Session Setup
              </span>
              <h2 className="text-2xl font-bold mt-3">{selectedClassName}</h2>
              <p className="text-slate-400 mt-1">Configure attendance tracking rules below.</p>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">

              {/* Choose Attendance Format */}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Choose Attendance Format</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Option 1: In-Person */}
                  <div
                    onClick={() => {
                      setOnlineMode(false);
                      setFaceIdRequired(true);
                      setLocationRequired(true);
                    }}
                    className={`flex flex-col p-5 rounded-2xl border-2 cursor-pointer transition-all ${!onlineMode
                      ? "border-blue-600 bg-blue-50/50"
                      : "border-slate-200 hover:border-slate-300"
                      }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
                        <Users size={22} />
                      </div>
                      {!onlineMode && (
                        <div className="bg-blue-600 text-white rounded-full p-1 flex items-center justify-center">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-slate-900 text-lg">In-Person Class</span>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Requires Face ID scanning and GPS location validation in class.
                    </p>
                  </div>

                  {/* Option 2: Online */}
                  <div
                    onClick={() => {
                      setOnlineMode(true);
                      setFaceIdRequired(false);
                      setLocationRequired(false);
                    }}
                    className={`flex flex-col p-5 rounded-2xl border-2 cursor-pointer transition-all ${onlineMode
                      ? "border-blue-600 bg-blue-50/50"
                      : "border-slate-200 hover:border-slate-300"
                      }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600">
                        <Laptop size={22} />
                      </div>
                      {onlineMode && (
                        <div className="bg-blue-600 text-white rounded-full p-1 flex items-center justify-center">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-slate-900 text-lg">Online Class</span>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Bypasses Face ID and GPS location geofencing checks for all students.
                    </p>
                  </div>
                </div>
              </div>

              {/* Session Timing / Replacement Option */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Session Timing
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div
                    onClick={() => {
                      setIsReplacement(false);
                      setCustomDateTime("");
                    }}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${!isReplacement
                      ? "border-blue-600 bg-blue-50/50"
                      : "border-slate-200 hover:border-slate-300"
                      }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${!isReplacement ? 'border-blue-600' : 'border-slate-300'}`}>
                      {!isReplacement && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">Regular Class (Now)</div>
                      <div className="text-xs text-slate-500">Start check-in immediately</div>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setIsReplacement(true);
                      const localNow = new Date();
                      const offsetMs = localNow.getTimezoneOffset() * 60000;
                      const localISOTime = new Date(localNow.getTime() - offsetMs).toISOString().slice(0, 16);
                      setCustomDateTime(localISOTime);
                    }}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${isReplacement
                      ? "border-blue-600 bg-blue-50/50"
                      : "border-slate-200 hover:border-slate-300"
                      }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isReplacement ? 'border-blue-600' : 'border-slate-300'}`}>
                      {isReplacement && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">Replacement Class</div>
                      <div className="text-xs text-slate-500">Use custom date/time</div>
                    </div>
                  </div>
                </div>

                {isReplacement && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in duration-200">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                      Custom Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={customDateTime}
                      onChange={(e) => setCustomDateTime(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-600 transition-all font-sans"
                    />
                    <p className="text-[11px] text-slate-500 mt-2">
                      The attendance records will be registered under this custom date/time.
                    </p>
                  </div>
                )}
              </div>

              {/* Granular Authentication Overrides */}
              <div className="border-t border-slate-100 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                    Fine-tune Requirements
                  </h3>
                  {onlineMode && (
                    <span className="text-[10.5px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Overridden for Online Mode
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Face ID Switch */}
                  <div className={`flex items-center justify-between p-4 rounded-xl border ${onlineMode ? 'bg-slate-50 border-slate-150 opacity-60' : 'border-slate-200'}`}>
                    <div className="flex gap-3 items-start">
                      <ScanFace className={`mt-0.5 ${faceIdRequired ? 'text-blue-600' : 'text-slate-400'}`} size={20} />
                      <div>
                        <div className="font-bold text-slate-900 text-sm">Face ID verification</div>
                        <div className="text-xs text-slate-500 mt-0.5">Students must match facial features against saved profiles</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={onlineMode}
                      onClick={() => setFaceIdRequired(!faceIdRequired)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${faceIdRequired ? "bg-blue-600" : "bg-slate-200"
                        } ${onlineMode ? "cursor-not-allowed" : ""}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${faceIdRequired ? "translate-x-5" : "translate-x-0"
                          }`}
                      />
                    </button>
                  </div>

                  {/* Location Switch */}
                  <div className={`flex items-center justify-between p-4 rounded-xl border ${onlineMode ? 'bg-slate-50 border-slate-150 opacity-60' : 'border-slate-200'}`}>
                    <div className="flex gap-3 items-start">
                      <MapPin className={`mt-0.5 ${locationRequired ? 'text-blue-600' : 'text-slate-400'}`} size={20} />
                      <div>
                        <div className="font-bold text-slate-900 text-sm">Location / GPS matching</div>
                        <div className="text-xs text-slate-500 mt-0.5">Verify students are physically present in the lecture hall</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={onlineMode}
                      onClick={() => setLocationRequired(!locationRequired)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${locationRequired ? "bg-blue-600" : "bg-slate-200"
                        } ${onlineMode ? "cursor-not-allowed" : ""}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${locationRequired ? "translate-x-5" : "translate-x-0"
                          }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-6 flex justify-end gap-3 border-t border-slate-150">
              <button
                onClick={() => setShowConfigModal(false)}
                className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold px-5 py-3 rounded-xl transition-all cursor-pointer font-sans"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const { data: { session: authSession } } = await supabase.auth.getSession();
                    const token = authSession?.access_token;

                    const openedAtTimestamp = isReplacement && customDateTime
                      ? new Date(customDateTime).toISOString()
                      : new Date().toISOString();

                    const res = await fetch("http://localhost:8000/api/sessions/start", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        class_id: selectedClassId,
                        opened_at: openedAtTimestamp,
                        online_mode: onlineMode,
                        face_id_required: !onlineMode && faceIdRequired,
                        location_required: !onlineMode && locationRequired,
                        geo_lat: 3.115,
                        geo_lng: 101.655,
                        geo_radius_meters: 50
                      })
                    });

                    if (!res.ok) {
                      const errData = await res.json();
                      alert("Error starting session: " + (errData.detail || "Unknown error"));
                      return;
                    }

                    const data = await res.json();

                    if (data.status === "active_exists") {
                      router.push(`/attendance/active?sessionId=${data.session.id}&classId=${selectedClassId}`);
                      setShowConfigModal(false);
                      return;
                    }

                    const newSession = data.session;

                    // Save active session settings in localStorage
                    const sessionSettings = {
                      sessionId: newSession.id,
                      classId: selectedClassId,
                      onlineMode: newSession.online_mode,
                      faceIdRequired: newSession.face_id_required,
                      locationRequired: newSession.location_required,
                      sessionPin: newSession.session_pin,
                      openedAt: openedAtTimestamp
                    };
                    localStorage.setItem('activeSessionConfig', JSON.stringify(sessionSettings));

                    // Redirect to Active Attendance page with config query params
                    router.push(`/attendance/active?sessionId=${newSession.id}&classId=${selectedClassId}&onlineMode=${newSession.online_mode}&faceIdRequired=${newSession.face_id_required}&locationRequired=${newSession.location_required}`);
                    setShowConfigModal(false);
                  } catch (err) {
                    console.error("FastAPI error starting session:", err);
                    alert("Error calling FastAPI server. Make sure it is running on port 8000.");
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300 transition-all cursor-pointer border-none font-sans"
              >
                Start Active Session
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}