// Lecturer Classes and Cohort Roster page in dottxt.ai sharp dark style
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../utils/supabase/client";
import { lecturerService } from "../../lib/services/lecturer";
import { api } from "../../lib/api";
import EmptyState from "../../components/EmptyState";
import PixelIcon from "../../components/PixelIcon";
import useSWR from "swr";

interface StudentListItem {
  id: string;
  matricId: string;
  name: string;
  email?: string;
  status: string;
  attendance: number | string;
  latestScore: number | string;
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
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const handleStartSessionClick = () => {
    setOnlineMode(false);
    setFaceIdRequired(true);
    setLocationRequired(true);
    setIsReplacement(false);
    setCustomDateTime("");
    setShowConfigModal(true);
  };

  // Fetch classes taught by this lecturer using SWR
  const { data: classesDataRaw, isLoading: isSwrLoadingClasses } = useSWR('lecturerClassesList', async () => {
    const response = await lecturerService.getClasses();
    return response.classes || [];
  });

  useEffect(() => {
    if (!classesDataRaw) return;

    const formatted = classesDataRaw.map((c: any) => {
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
        schedule: scheduleStr,
        activeSessionId: c.active_session?.id || null
      };
    });
    setClassesList(formatted);

    // Select class from URL or first class
    const urlParams = new URLSearchParams(window.location.search);
    const urlClassId = urlParams.get("classId");
    const targetClass = formatted.find((c: any) => c.id === urlClassId) || formatted[0];

    if (targetClass) {
      setSelectedClassId(targetClass.id);
      setSelectedClassName(targetClass.name);
      setNextSessionTime(targetClass.schedule);
    }
    setIsLoadingClasses(false);
  }, [classesDataRaw]);

  // Fetch student roster for selected class using SWR
  const { data: rosterEnrollments, mutate: mutateRoster } = useSWR(
    selectedClassId ? `roster_${selectedClassId}` : null,
    async () => {
      const response = await lecturerService.getClassRoster(selectedClassId);
      return response.enrollments || [];
    }
  );

  useEffect(() => {
    if (!selectedClassId) return;

    const currentClass = classesList.find((c: any) => c.id === selectedClassId);
    setActiveSessionId((currentClass as any)?.activeSessionId || null);
    setHasAnyActiveSession(classesList.some((c: any) => !!c.activeSessionId));

    if (rosterEnrollments) {
      const formattedStudents = rosterEnrollments.map((e: any) => {
        const profile = e.profiles;
        const attendanceRaw = e.current_attendance_rate;
        const attendance = attendanceRaw !== "-" ? Number(attendanceRaw) : "-";
        let status = 'good';

        if (attendance === "-") {
          status = 'no-data';
        } else if (attendance < 80) {
          status = 'critical';
        } else if (attendance < 90) {
          status = 'at-risk';
        }

        return {
          id: profile?.id || '',
          matricId: profile?.institutional_id || '',
          name: profile?.full_name || 'Unknown Student',
          email: profile?.email || '',
          status,
          attendance,
          latestScore: typeof e.latest_score === 'number' ? e.latest_score : (e.latest_score !== undefined && e.latest_score !== null && e.latest_score !== "-" ? Number(e.latest_score) : 0),
          lastSeen: attendance === "-" ? "-" : (attendance < 80 ? '3 days ago' : 'Today')
        };
      });
      setStudents(formattedStudents);
    }
  }, [selectedClassId, classesList, rosterEnrollments]);

  // Realtime mutator for roster
  useEffect(() => {
    if (!selectedClassId) return;
    const channel = supabase.channel(`roster_realtime_${selectedClassId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => {
        mutateRoster();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClassId, mutateRoster, supabase]);

  // Filter students based on active tab and search query
  const filteredStudents = students.filter((student) => {
    const matchesTab = activeTab === "all" || (activeTab === "alerts" && student.status !== "good");
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.matricId.includes(searchQuery);
    return matchesTab && matchesSearch;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const alertsCount = students.filter(s => s.status === "critical" || s.status === "at-risk").length;
  const studentsWithData = students.filter(s => s.attendance !== "-");
  const classAvg = studentsWithData.length > 0
    ? Math.round(studentsWithData.reduce((sum, s) => sum + (s.attendance as number), 0) / studentsWithData.length)
    : "-";

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isLoadingClasses || isSwrLoadingClasses) {
    return (
      <main className="flex-1 p-8 overflow-y-auto bg-transparent text-white">
        <div className="w-64 h-8 bg-white/10 rounded-none animate-pulse mb-2 border border-white/10" />
        <div className="w-48 h-4 bg-white/10 rounded-none animate-pulse mb-8 border border-white/10" />
        <div className="grid grid-cols-5 gap-5 mb-8">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-[#08090c]/80 h-28 rounded-none animate-pulse border border-white/15" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-transparent text-white">
      {/* Header & Class Selector */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pb-6 border-b border-white/10">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white uppercase">
            Class Roster
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage and monitor specific cohorts and session verification
          </p>
        </div>

        {/* Dropdown for selecting classes and Start Session button */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {selectedClassId && (
            activeSessionId ? (
              <button
                onClick={() => router.push(`/attendance/active?sessionId=${activeSessionId}&classId=${selectedClassId}`)}
                className="flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 px-4 py-2.5 rounded-none text-xs font-bold transition-all cursor-pointer animate-pulse"
              >
                <PixelIcon name="qrCode" size={16} />
                <span>ONGOING SESSION</span>
              </button>
            ) : hasAnyActiveSession ? (
              <button
                disabled
                className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-500 px-4 py-2.5 rounded-none text-xs cursor-not-allowed font-medium"
              >
                <PixelIcon name="qrCode" size={16} />
                <span>SESSION ONGOING ELSEWHERE</span>
              </button>
            ) : (
              <button
                onClick={handleStartSessionClick}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/60 px-4 py-2.5 rounded-none text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
              >
                <PixelIcon name="qrCode" size={16} />
                <span>START SESSION</span>
              </button>
            )
          )}

          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 bg-[#08090c]/90 border border-white/20 text-white px-4 py-2.5 rounded-none text-xs shadow-lg hover:border-white/40 transition-colors cursor-pointer font-medium"
            >
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest leading-none mb-1">
                  CURRENT VIEW
                </span>
                <span className="leading-none text-white font-semibold">
                  {selectedClassName || "Loading..."}
                </span>
              </div>
              <span className="text-slate-400 text-xs ml-2">▼</span>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-1 w-full min-w-[260px] bg-[#08090c] border border-white/20 rounded-none shadow-2xl z-50 overflow-hidden text-xs">
                {classesList.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setSelectedClassId(cls.id);
                      setSelectedClassName(cls.name);
                      if ((cls as any).schedule) {
                        setNextSessionTime((cls as any).schedule);
                      }
                      setIsDropdownOpen(false);
                      window.history.pushState(null, '', `/classes?classId=${cls.id}`);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0 ${selectedClassId === cls.id ? 'bg-emerald-600/20 text-emerald-300 font-semibold' : 'text-slate-300'
                      }`}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
        {/* Card 1: Enrolled Students */}
        <div className="bg-[#08090c]/80 p-5 rounded-none border border-white/15 shadow-xl flex items-center gap-4 min-w-0 backdrop-blur-md">
          <div className="p-3 bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 rounded-none shrink-0">
            <PixelIcon name="graduation" size={24} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-xs text-slate-400 uppercase tracking-wider truncate font-medium">Enrolled</p>
            </div>
            <p className="text-2xl font-bold text-white leading-tight">{students.length}</p>
          </div>
        </div>

        {/* Card 2: Class Average */}
        <div className="bg-[#08090c]/80 p-5 rounded-none border border-white/15 shadow-xl flex items-center gap-4 min-w-0 backdrop-blur-md">
          <div className="p-3 bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 rounded-none shrink-0">
            <PixelIcon name="checkCircle" size={24} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-xs text-slate-400 uppercase tracking-wider truncate font-medium">Class Average</p>
            </div>
            <p className="text-2xl font-bold text-white leading-tight">
              {classAvg}{classAvg !== "-" ? "%" : ""}
            </p>
          </div>
        </div>

        {/* Card 3: Next Session */}
        <div className="bg-[#08090c]/80 p-5 rounded-none border border-white/15 shadow-xl flex items-center gap-4 min-w-0 backdrop-blur-md">
          <div className="p-3 bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 rounded-none shrink-0">
            <PixelIcon name="clock" size={24} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-xs text-slate-400 uppercase tracking-wider truncate font-medium">Next Session</p>
            </div>
            <p className="text-sm font-bold text-white truncate leading-tight">{nextSessionTime}</p>
          </div>
        </div>

        {/* Card 4: Assessments & Marks CTA Button */}
        <Link
          href={`/classes/assessments?classId=${selectedClassId}`}
          className="bg-[#08090c]/80 p-5 rounded-none border border-white/20 shadow-xl flex items-center gap-4 group hover:border-emerald-400/50 hover:bg-white/5 transition-all cursor-pointer min-w-0 backdrop-blur-md"
        >
          <div className="p-3 bg-white/5 border border-white/15 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0 rounded-none">
            <PixelIcon name="book" size={24} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Grading</p>
            </div>
            <p className="text-sm font-bold text-white leading-tight truncate">Assessments →</p>
          </div>
        </Link>

        {/* Card 5: Intervention Board CTA (Disabled) */}
        <div
          className="relative group/disabled bg-[#08090c]/50 border border-white/10 p-5 rounded-none shadow-xl flex items-center gap-4 cursor-not-allowed min-w-0 backdrop-blur-md"
          title="Disabled Feature"
        >
          <div className="p-3 bg-white/5 border border-white/10 text-slate-500 shrink-0 rounded-none">
            <PixelIcon name="warning" size={24} />
          </div>
          <div className="min-w-0 opacity-40 grayscale">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Board</p>
            </div>
            <p className="text-sm font-bold text-slate-400 leading-tight truncate">Interventions →</p>
          </div>
          <div className="pointer-events-none absolute -top-8 right-4 hidden group-hover/disabled:flex items-center px-2.5 py-1 text-xs font-semibold text-white bg-black/90 border border-white/20 rounded-none shadow-xl whitespace-nowrap z-50">
            Disabled Feature
          </div>
        </div>
      </div>

      {/* Roster Container */}
      <div className="bg-[#08090c]/80 border border-white/15 rounded-none shadow-2xl overflow-hidden backdrop-blur-md">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 bg-black/20">
          {/* Tabs for filtering students */}
          <div className="flex gap-2 w-full md:w-auto text-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-2 rounded-none transition-colors border ${activeTab === "all"
                ? "bg-white/15 border-white/40 text-white font-bold"
                : "bg-transparent border-white/10 text-slate-400 hover:bg-white/5"
                }`}
            >
              ALL STUDENTS ({students.length})
            </button>
            <button
              onClick={() => setActiveTab("alerts")}
              className={`px-3.5 py-2 rounded-none transition-colors flex items-center gap-2 border ${activeTab === "alerts"
                ? "bg-rose-500/20 border-rose-400/50 text-rose-300 font-bold"
                : "bg-transparent border-white/10 text-slate-400 hover:bg-white/5"
                }`}
            >
              ALERTS ONLY
              <span className={`px-1.5 py-0.5 rounded-none text-[10px] font-bold ${activeTab === "alerts" ? "bg-rose-500/30 text-rose-200" : "bg-white/10 text-slate-400"
                }`}>
                {alertsCount}
              </span>
            </button>
          </div>

          <div className="flex gap-3 w-full md:w-auto text-xs">
            {/* Search Input tied to searchQuery state */}
            <div className="relative flex-1 md:w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <PixelIcon name="search" size={14} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID or name..."
                className="w-full pl-9 pr-4 py-2 bg-black/30 border border-white/15 rounded-none text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-white/40"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white/5 text-slate-400 text-[10px] uppercase tracking-wider border-b border-white/10">
                <th className="p-3.5 font-bold">Student</th>
                <th className="p-3.5 font-bold">Risk Status</th>
                <th className="p-3.5 font-bold">Attendance</th>
                <th className="p-3.5 font-bold">Latest Score</th>
                <th className="p-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {paginatedStudents.length > 0 ? (
                paginatedStudents.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => router.push(`/classes/${student.id}?classId=${selectedClassId}`)}
                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-none bg-white/10 border border-white/20 text-white flex items-center justify-center font-bold text-xs">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-emerald-300 transition-colors">
                            {student.name}
                          </p>
                          <p className="text-[10px] text-slate-400">{student.matricId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      {student.status === "critical" && (
                        <span className="inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-300 border border-rose-400/30 px-2 py-0.5 rounded-none text-[10px] font-bold uppercase">
                          <PixelIcon name="warning" size={12} /> CRITICAL
                        </span>
                      )}
                      {student.status === "at-risk" && (
                        <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-none text-[10px] font-bold uppercase">
                          <PixelIcon name="warning" size={12} /> AT RISK
                        </span>
                      )}
                      {student.status === "good" && (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-none text-[10px] font-bold uppercase">
                          <PixelIcon name="check" size={12} /> ON TRACK
                        </span>
                      )}
                      {student.status === "no-data" && (
                        <span className="inline-flex items-center gap-1.5 bg-white/5 text-slate-400 border border-white/10 px-2 py-0.5 rounded-none text-[10px] font-bold uppercase">
                          NO DATA
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className={`font-bold ${typeof student.attendance === 'number' && student.attendance < 80
                        ? "text-rose-400"
                        : "text-white"
                        }`}>
                        {student.attendance}{student.attendance !== "-" ? "%" : ""}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`font-bold ${typeof student.latestScore === 'number' && student.latestScore < 50
                        ? "text-rose-400"
                        : "text-white"
                        }`}>
                        {student.latestScore}{student.latestScore !== "-" ? "%" : ""}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={student.email ? `mailto:${student.email}` : '#'}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!student.email) alert("No email address found for this student.");
                          }}
                          title="Send Email"
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-none border border-transparent hover:border-white/20 transition-all inline-flex items-center justify-center cursor-pointer"
                        >
                          <PixelIcon name="mail" size={14} />
                        </a>
                        <div className="relative group/disabled inline-flex cursor-not-allowed" title="Disabled Feature">
                          <span className="p-1.5 text-slate-600 rounded-none inline-flex items-center justify-center opacity-40 grayscale pointer-events-none">
                            <PixelIcon name="calendar" size={14} />
                          </span>
                          <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover/disabled:flex items-center px-2 py-0.5 text-[10px] font-semibold text-white bg-black/90 border border-white/20 rounded-none shadow-md whitespace-nowrap z-50">
                            Disabled Feature
                          </div>
                        </div>
                        <div className="relative group/disabled inline-flex cursor-not-allowed" title="Disabled Feature">
                          <span className="p-1.5 text-slate-600 rounded-none inline-flex items-center justify-center opacity-40 grayscale pointer-events-none">
                            <PixelIcon name="award" size={14} />
                          </span>
                          <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover/disabled:flex items-center px-2 py-0.5 text-[10px] font-semibold text-white bg-black/90 border border-white/20 rounded-none shadow-md whitespace-nowrap z-50">
                            Disabled Feature
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8">
                    <EmptyState
                      icon="profile"
                      title={students.length === 0 ? "No Students Enrolled" : "No Matches Found"}
                      description={students.length === 0 ? "There are no students currently enrolled in this class." : "No students found matching your filters."}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredStudents.length > 0 && (
          <div className="p-4 border-t border-white/10 flex justify-between items-center bg-black/20 text-xs">
            <span className="text-slate-400">
              Showing <span className="font-bold text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-white">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> of <span className="font-bold text-white">{filteredStudents.length}</span> students
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-1.5 border border-white/20 rounded-none text-xs text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-transparent font-medium"
              >
                PREV
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3.5 py-1.5 border border-white/20 rounded-none text-xs text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-transparent font-medium"
              >
                NEXT
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Session Configuration Modal */}
      {showConfigModal && selectedClassId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-[#08090c] rounded-none shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20 text-white">
            {/* Header */}
            <div className="p-6 border-b border-white/10 relative">
              <button
                onClick={() => setShowConfigModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 border border-white/10 hover:border-white/30 rounded-none transition-colors cursor-pointer"
              >
                ✕
              </button>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-none" />
                <span className="text-xs text-emerald-400 uppercase tracking-wider font-bold">
                  SESSION SETUP // CONFIGURATION
                </span>
              </div>
              <h2 className="text-xl font-bold uppercase">{selectedClassName}</h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure attendance verification parameters prior to activation.
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto text-xs">
              {/* Choose Attendance Format */}
              <div>
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Verification Format
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Option 1: In-Person */}
                  <div
                    onClick={() => {
                      setOnlineMode(false);
                      setFaceIdRequired(true);
                      setLocationRequired(true);
                    }}
                    className={`flex flex-col p-4 rounded-none border cursor-pointer transition-all ${!onlineMode
                      ? "border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-900/20"
                      : "border-white/10 hover:border-white/20 bg-black/20"
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="p-2 bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 rounded-none">
                        <PixelIcon name="profile" size={18} />
                      </div>
                      {!onlineMode && (
                        <span className="text-emerald-400 text-xs font-bold">● ACTIVE</span>
                      )}
                    </div>
                    <span className="font-bold text-white text-sm">IN-PERSON CLASS</span>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Requires Face ID biometric matching and GPS geofence in lecture hall.
                    </p>
                  </div>

                  {/* Option 2: Online */}
                  <div
                    onClick={() => {
                      setOnlineMode(true);
                      setFaceIdRequired(false);
                      setLocationRequired(false);
                    }}
                    className={`flex flex-col p-4 rounded-none border cursor-pointer transition-all ${onlineMode
                      ? "border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-900/20"
                      : "border-white/10 hover:border-white/20 bg-black/20"
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="p-2 bg-purple-500/10 border border-purple-400/30 text-purple-300 rounded-none">
                        <PixelIcon name="cases" size={18} />
                      </div>
                      {onlineMode && (
                        <span className="text-emerald-400 text-xs font-bold">● ACTIVE</span>
                      )}
                    </div>
                    <span className="font-bold text-white text-sm">ONLINE CLASS</span>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Bypasses Face ID and GPS physical geofence verification rules.
                    </p>
                  </div>
                </div>
              </div>

              {/* Session Timing / Replacement Option */}
              <div className="border-t border-white/10 pt-5">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Session Timing
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div
                    onClick={() => {
                      setIsReplacement(false);
                      setCustomDateTime("");
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-none border cursor-pointer transition-all ${!isReplacement
                      ? "border-emerald-400 bg-emerald-500/10"
                      : "border-white/10 hover:border-white/20 bg-black/20"
                      }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-none border flex items-center justify-center ${!isReplacement ? 'border-emerald-400 bg-emerald-400' : 'border-white/30'
                      }`} />
                    <div>
                      <div className="font-bold text-white text-xs">REGULAR CLASS (NOW)</div>
                      <div className="text-[10px] text-slate-400">Start check-in immediately</div>
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
                    className={`flex items-center gap-3 p-3.5 rounded-none border cursor-pointer transition-all ${isReplacement
                      ? "border-emerald-400 bg-emerald-500/10"
                      : "border-white/10 hover:border-white/20 bg-black/20"
                      }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-none border flex items-center justify-center ${isReplacement ? 'border-emerald-400 bg-emerald-400' : 'border-white/30'
                      }`} />
                    <div>
                      <div className="font-bold text-white text-xs">REPLACEMENT CLASS</div>
                      <div className="text-[10px] text-slate-400">Specify timestamp</div>
                    </div>
                  </div>
                </div>

                {isReplacement && (
                  <div className="p-3.5 bg-black/30 rounded-none border border-white/15">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">
                      Custom Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={customDateTime}
                      onChange={(e) => setCustomDateTime(e.target.value)}
                      className="w-full bg-[#08090c] border border-white/20 rounded-none px-3 py-2 text-xs text-white focus:outline-none focus:border-white/40"
                    />
                  </div>
                )}
              </div>

              {/* Granular Authentication Overrides */}
              <div className="border-t border-white/10 pt-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Fine-tune Requirements
                  </h3>
                  {onlineMode && (
                    <span className="text-[9px] font-bold text-amber-300 bg-amber-500/10 border border-amber-400/30 px-2 py-0.5 rounded-none uppercase">
                      Overridden for Online
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Face ID Switch */}
                  <div className={`flex items-center justify-between p-3 rounded-none border ${onlineMode ? 'bg-black/10 border-white/5 opacity-50' : 'border-white/10 bg-black/20'
                    }`}>
                    <div className="flex gap-3 items-center">
                      <PixelIcon name="scan" size={18} className={faceIdRequired ? 'text-emerald-400' : 'text-slate-500'} />
                      <div>
                        <div className="font-bold text-white text-xs">Face ID Biometric Verification</div>
                        <div className="text-[10px] text-slate-400">Match against registered facial embeddings</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={onlineMode}
                      onClick={() => setFaceIdRequired(!faceIdRequired)}
                      className={`px-3 py-1 text-[10px] font-bold rounded-none border transition-colors ${faceIdRequired
                        ? "bg-emerald-600/30 border-emerald-400 text-emerald-300"
                        : "bg-white/5 border-white/15 text-slate-500"
                        }`}
                    >
                      {faceIdRequired ? "ENABLED" : "DISABLED"}
                    </button>
                  </div>

                  {/* Location Switch */}
                  <div className={`flex items-center justify-between p-3 rounded-none border ${onlineMode ? 'bg-black/10 border-white/5 opacity-50' : 'border-white/10 bg-black/20'
                    }`}>
                    <div className="flex gap-3 items-center">
                      <PixelIcon name="pin" size={18} className={locationRequired ? 'text-emerald-400' : 'text-slate-500'} />
                      <div>
                        <div className="font-bold text-white text-xs">GPS Geofence Matching</div>
                        <div className="text-[10px] text-slate-400">Verify physical presence in lecture hall</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={onlineMode}
                      onClick={() => setLocationRequired(!locationRequired)}
                      className={`px-3 py-1 text-[10px] font-bold rounded-none border transition-colors ${locationRequired
                        ? "bg-emerald-600/30 border-emerald-400 text-emerald-300"
                        : "bg-white/5 border-white/15 text-slate-500"
                        }`}
                    >
                      {locationRequired ? "ENABLED" : "DISABLED"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 flex justify-end gap-3 border-t border-white/10 bg-black/20 text-xs">
              <button
                onClick={() => setShowConfigModal(false)}
                className="bg-transparent hover:bg-white/10 border border-white/20 text-slate-300 px-4 py-2.5 rounded-none transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={async () => {
                  try {
                    const openedAtTimestamp = isReplacement && customDateTime
                      ? new Date(customDateTime).toISOString()
                      : new Date().toISOString();

                    const data = await api.post("/api/sessions/start", {
                      class_id: selectedClassId,
                      opened_at: openedAtTimestamp,
                      online_mode: onlineMode,
                      face_id_required: faceIdRequired,
                      location_required: !onlineMode && locationRequired,
                      geo_lat: 3.115,
                      geo_lng: 101.655,
                      geo_radius_meters: 50
                    });

                    if (data.status === "active_exists") {
                      router.push(`/attendance/active?sessionId=${data.session.id}&classId=${selectedClassId}`);
                      setShowConfigModal(false);
                      return;
                    }

                    const newSession = data.session;
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

                    router.push(`/attendance/active?sessionId=${newSession.id}&classId=${selectedClassId}&onlineMode=${newSession.online_mode}&faceIdRequired=${newSession.face_id_required}&locationRequired=${newSession.location_required}`);
                    setShowConfigModal(false);
                  } catch (err: any) {
                    console.error("FastAPI error starting session:", err);
                    alert("Error calling server: " + (err.detail || err.message || "Unknown error"));
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-none border border-emerald-400 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
              >
                ACTIVATE SESSION
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}