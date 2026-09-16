// apps/web/app/student/classes/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Calendar,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  TrendingUp,
  User,
  Award,
  ShieldAlert,
  ChevronRight
} from "lucide-react";
import { createClient } from "../../../utils/supabase/client";
import { studentService } from "../../../lib/services/student";
import EmptyState from "../../../components/EmptyState";
import useSWR from "swr";

interface ClassItem {
  id: string;
  name: string;
}

interface AttendanceLogItem {
  id: string;
  date: string;
  pin: string;
  status: string;
  verifiedMethods: string[];
}

interface AssessmentItem {
  id: string;
  title: string;
  type: string;
  weightage: number;
  score: number;
  totalMarks: number;
}

export default function StudentClassesPage() {
  const supabase = createClient();

  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedClassName, setSelectedClassName] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // States for Class/Lecturer data
  const [lecturerInfo, setLecturerInfo] = useState<any>(null);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [classScheduleText, setClassScheduleText] = useState("Wednesday • 10:00 AM");
  const [performanceNumeric, setPerformanceNumeric] = useState(0);

  // Detailed lists
  const [attendanceLog, setAttendanceLog] = useState<AttendanceLogItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  // Pagination for attendance log
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch classes list with fallback
  const fetchDashboard = async () => {
    try {
      return await studentService.getDashboard();
    } catch (err) {
      console.warn("FastAPI student dashboard error, falling back to direct Supabase:", err);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          class_id,
          current_attendance_rate,
          classes (
            group_code,
            type,
            day_of_week,
            start_time,
            end_time,
            location,
            subjects (code, name),
            profiles:lecturer_id (full_name)
          )
        `)
        .eq('student_id', user.id);

      const assignedClasses = (enrollments || []).map((e: any) => {
        const subName = e.classes?.subjects?.name || "Unknown Class";
        const grp = e.classes?.group_code || "Group A";
        return {
          id: e.class_id,
          title: subName,
          name: subName,
          group: grp,
          code: grp
        };
      });

      return { assigned_classes: assignedClasses };
    }
  };

  const { data: dashboardData, isLoading: isLoadingClasses } = useSWR('studentDashboard', fetchDashboard);

  useEffect(() => {
    if (!dashboardData) return;
    const assigned = dashboardData.assigned_classes || [];

    if (assigned.length > 0) {
      const formatted = assigned.map((c: any) => {
        const title = c.title || c.name || "Class";
        const group = c.group || c.code || "";
        return {
          id: c.id,
          name: group ? `${title} (${group})` : title
        };
      });
      setClassesList(formatted);

      const urlParams = new URLSearchParams(window.location.search);
      const urlClassId = urlParams.get("classId");
      const targetClass = formatted.find((c: any) => c.id === urlClassId) || formatted[0];

      if (targetClass) {
        setSelectedClassId(targetClass.id);
        setSelectedClassName(targetClass.name);
      }
    }
  }, [dashboardData]);

  // Load detailed information for selected class with fallback
  const fetchClassDetails = async (classId: string) => {
    try {
      return await studentService.getClassDetails(classId);
    } catch (err) {
      console.warn("FastAPI getClassDetails error, falling back to direct Supabase:", err);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: classData } = await supabase
        .from('classes')
        .select(`
          id, group_code, type, semester, day_of_week, start_time, end_time, location,
          subjects (code, name),
          profiles:lecturer_id (full_name, email, phone_number, office_location, affiliation)
        `)
        .eq('id', classId)
        .single();

      const { data: enrollData } = await supabase
        .from('enrollments')
        .select('current_attendance_rate')
        .eq('class_id', classId)
        .eq('student_id', user.id)
        .maybeSingle();

      const fmtTime = (tStr: string | null) => {
        if (!tStr) return "";
        const parts = tStr.split(":");
        const hr = parseInt(parts[0] || "0", 10);
        const ampm = hr >= 12 ? "PM" : "AM";
        const dHr = hr % 12 === 0 ? 12 : hr % 12;
        return `${dHr}:${parts[1] || "00"} ${ampm}`;
      };

      const timeRange = classData?.start_time
        ? `${fmtTime(classData.start_time)} - ${fmtTime(classData.end_time)}`
        : "10:00 AM - 12:00 PM";
      const scheduleText = `${classData?.day_of_week || "Wednesday"} • ${timeRange}`;

      const { data: sessions } = await supabase
        .from('attendance_sessions')
        .select(`
          id, opened_at, session_pin,
          attendance_records (status, timestamp, face_verified, location_verified, manual_override, student_id)
        `)
        .eq('class_id', classId)
        .order('opened_at', { ascending: false });

      let attendedCnt = 0;
      let hasStudentAttRecords = false;
      const attendanceLog = (sessions || []).map((s: any) => {
        const record = (s.attendance_records || []).find((r: any) => r.student_id === user.id);
        if (record) {
          hasStudentAttRecords = true;
          if (["present", "excused"].includes(String(record.status || "").toLowerCase())) {
            attendedCnt++;
          }
        }
        const dateStr = s.opened_at ? new Date(s.opened_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : "N/A";
        const methods: string[] = [];
        if (record?.face_verified) methods.push("Face ID");
        if (record?.location_verified) methods.push("GPS");
        if (record?.manual_override) methods.push("Manual Override");

        return {
          id: s.id,
          date: dateStr,
          pin: s.session_pin || "PIN-OK",
          status: record?.status || "Absent",
          verifiedMethods: methods
        };
      });

      // Calculate attendance rate from real session count and student check-ins
      const totalSessions = sessions?.length || 0;
      const hasAttendance = totalSessions > 0 && hasStudentAttRecords;
      const attRate = hasAttendance ? Math.round((attendedCnt / totalSessions) * 100) : 0;

      const { data: assessList } = await supabase
        .from('assessments')
        .select(`
          id, title, type, weightage, total_marks,
          student_scores (score_achieved, student_id)
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: true });

      let scoreSum = 0;
      let scoreCnt = 0;
      const assessments = (assessList || []).map((a: any) => {
        const userScore = (a.student_scores || []).find((sc: any) => sc.student_id === user.id);
        const hasScore = userScore !== undefined && userScore.score_achieved !== null && userScore.score_achieved !== undefined;
        const scoreAchieved = hasScore ? Number(userScore.score_achieved) : 0;
        const totalMarks = Number(a.total_marks) || 100;
        // Only include in CA average if student has taken and been graded on this assessment
        if (hasScore && totalMarks > 0) {
          scoreSum += (scoreAchieved / totalMarks) * 100;
          scoreCnt++;
        }
        return {
          id: a.id,
          title: a.title,
          type: a.type,
          weightage: Number(a.weightage) || 0,
          score: scoreAchieved,
          totalMarks: totalMarks
        };
      });

      const hasAssessments = scoreCnt > 0;
      let performanceNumeric = 0;
      if (hasAttendance && hasAssessments) {
        const caAvg = scoreSum / scoreCnt;
        performanceNumeric = Math.round((attRate * 0.6) + (caAvg * 0.4));
      } else if (hasAssessments) {
        performanceNumeric = Math.round(scoreSum / scoreCnt);
      } else if (hasAttendance) {
        performanceNumeric = Math.round(attRate);
      } else {
        performanceNumeric = 0;
      }

      const lecturerProfile = classData?.profiles as any;
      const lecturerInfo = lecturerProfile ? {
        full_name: lecturerProfile.full_name,
        email: lecturerProfile.email || "N/A",
        phone_number: lecturerProfile.phone_number || "N/A",
        office_location: lecturerProfile.office_location || "Lecturer Suite, PASUM",
        affiliation: lecturerProfile.affiliation || "Centre for Foundation Studies"
      } : null;

      return {
        lecturerInfo,
        classScheduleText: scheduleText,
        attendanceRate: attRate,
        performanceNumeric,
        attendanceLog,
        assessments
      };
    }
  };

  const { data: classDetails, isLoading: isLoadingDetails, mutate: mutateDetails } = useSWR(
    selectedClassId ? `studentClassDetails_${selectedClassId}` : null,
    () => fetchClassDetails(selectedClassId)
  );

  useEffect(() => {
    if (!classDetails) return;
    setLecturerInfo(classDetails.lecturerInfo);
    setClassScheduleText(classDetails.classScheduleText);
    setAttendanceRate(classDetails.attendanceRate);
    setPerformanceNumeric(classDetails.performanceNumeric);
    setAttendanceLog(classDetails.attendanceLog || []);
    setAssessments(classDetails.assessments || []);
    setCurrentPage(1); // Reset pagination on class change
  }, [classDetails]);

  // Realtime subscription for live updates to attendance log
  useEffect(() => {
    if (!selectedClassId) return;
    const channel = supabase.channel(`student_class_details_${selectedClassId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => {
        mutateDetails();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClassId, supabase, mutateDetails]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(attendanceLog.length / itemsPerPage));
  const paginatedLogs = attendanceLog.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if ((isLoadingClasses || isLoadingDetails) && classesList.length === 0) {
    return (
      <main className="flex-1 p-8 overflow-y-auto bg-[#FAF9F6]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="w-64 h-10 bg-slate-200 rounded-lg animate-pulse mb-2"></div>
            <div className="w-48 h-5 bg-slate-200 rounded-lg animate-pulse"></div>
          </div>
          <div className="w-48 h-10 bg-slate-200 rounded-xl animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-slate-200 h-28 rounded-3xl animate-pulse border border-slate-200"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6 lg:col-span-1">
            <div className="bg-slate-200 h-64 rounded-2xl animate-pulse"></div>
            <div className="bg-slate-200 h-64 rounded-3xl animate-pulse"></div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-200 h-[500px] rounded-3xl animate-pulse flex flex-col h-full"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-[#FAF9F6]">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Enrolled Course Details</h2>
          <p className="text-slate-500 mt-1">Monitor your attendance, assessments, and lecturer assignments</p>
        </div>

        {/* Dropdown for selecting classes */}
        {classesList.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider leading-none mb-1">Current Class</span>
                <span className="leading-none">{selectedClassName || "Select Class..."}</span>
              </div>
              <ChevronDown size={18} className="text-slate-400 ml-2" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-full min-w-[240px] bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                {classesList.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setSelectedClassId(cls.id);
                      setSelectedClassName(cls.name);
                      setIsDropdownOpen(false);
                      window.history.pushState(null, '', `/student/classes?classId=${cls.id}`);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition-colors ${selectedClassId === cls.id ? 'bg-blue-50/50 text-blue-700 font-medium' : 'text-slate-700'
                      }`}
                  >
                    {cls.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Metrics Row (Split into 4 equal cards) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Card 1: Class Performance */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Class Performance</p>
            <h4 className={`text-2xl font-black mt-0.5 ${performanceNumeric < 80 ? 'text-red-600' :
              performanceNumeric < 90 ? 'text-orange-655' :
                'text-emerald-600'
              }`}>
              {performanceNumeric}%
            </h4>
          </div>
        </div>

        {/* Card 2: My Attendance Rate */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">My Attendance Rate</p>
            <h4 className={`text-2xl font-black mt-0.5 ${attendanceRate < 80 ? 'text-red-600' :
              attendanceRate < 90 ? 'text-orange-655' :
                'text-emerald-600'
              }`}>
              {attendanceRate}%
            </h4>
          </div>
        </div>

        {/* Card 3: Next Scheduled Lecture */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-slate-50 p-3 rounded-2xl text-slate-655">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Next Lecture</p>
            <h4 className="text-base font-bold text-slate-900 mt-1 leading-snug">{classScheduleText}</h4>
          </div>
        </div>

        {/* Card 4: Support Cases (Disabled) */}
        <div
          className="relative group/disabled bg-[#0b2240]/60 border border-slate-800 p-5 rounded-3xl shadow-sm flex items-center gap-4 cursor-not-allowed"
          title="Disabled Feature"
        >
          <div className="bg-white/5 p-3 rounded-2xl text-slate-500">
            <ShieldAlert size={24} />
          </div>
          <div className="opacity-50 grayscale pointer-events-none select-none">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Support Cases</p>
            <h4 className="text-base font-bold text-slate-400 mt-1 leading-none flex items-center gap-1">
              View Cases <ChevronRight size={14} />
            </h4>
          </div>
          <div className="pointer-events-none absolute -top-8 right-6 hidden group-hover/disabled:flex items-center px-2.5 py-1 text-xs font-semibold text-white bg-slate-800 rounded-md shadow-lg whitespace-nowrap z-50">
            Disabled Feature
          </div>
        </div>
      </div>

      {/* Main Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Assigned Lecturer & Continuous Assessment */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 text-lg mb-6 flex items-center gap-2">
              <User size={20} className="text-blue-600" />
              Assigned Lecturer
            </h3>

            {lecturerInfo ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-700 text-xl shadow-inner">
                    {lecturerInfo.full_name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{lecturerInfo.full_name}</h4>
                    <p className="text-xs text-blue-600 font-medium">Instructor</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-3 text-sm text-slate-655">
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-slate-400" />
                    <span className="truncate">{lecturerInfo.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin size={16} className="text-slate-400" />
                    <span>{lecturerInfo.office_location || "Lecturer Suite, PASUM"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-slate-400" />
                    <span>Office hours: By Appointment</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No lecturer assigned.</p>
            )}
          </div>

          {/* Continuous Assessment & Exams Marks Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="mb-6 pb-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <Award size={20} className="text-blue-600" />
                  Continuous Assessment & Exams
                </h3>
                <p className="text-xs text-slate-500 mt-1">Review test and assignment scores for the current semester</p>
              </div>
            </div>

            <div className="overflow-x-auto w-full rounded-2xl border border-slate-150">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-4">Assessment Name</th>
                    <th className="py-4 px-4">Type</th>
                    <th className="py-4 px-4 text-center">Weightage</th>
                    <th className="py-4 px-4 text-right">Marks Achieved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {assessments.length > 0 ? (
                    assessments.map((a) => (
                      <tr key={a.id} className="text-sm text-slate-700 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4 font-semibold text-slate-900">{a.title}</td>
                        <td className="py-4 px-4">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border ${a.type === 'Final' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-650 border-slate-200'
                            }`}>
                            {a.type}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-semibold text-slate-600">{a.weightage}%</td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                          <span className="text-blue-600">{a.score}</span> <span className="text-slate-400">/</span> {a.totalMarks}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12">
                        <EmptyState 
                          icon={Award}
                          title="No Assessments Yet"
                          description="There are no continuous assessments or exam marks recorded for this class yet."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Attendance Log List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full">
            <h3 className="font-bold text-slate-900 text-lg mb-6 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-blue-600" />
              Attendance log
            </h3>

            {paginatedLogs.length > 0 ? (
              <div className="space-y-4 pr-1">
                {paginatedLogs.map((log) => (
                  <div key={log.id} className="flex justify-between items-center p-4 rounded-xl border border-slate-100 bg-slate-50/30 hover:border-slate-200 transition-colors">
                    <div>
                      <p className="font-semibold text-slate-800">{log.date}</p>
                      <div className="flex gap-2 items-center mt-1">
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                          Pin: {log.pin}
                        </span>
                        {log.verifiedMethods.map((m, idx) => (
                          <span key={idx} className="text-[9px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded font-bold uppercase">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${log.status === 'Present' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                      log.status === 'Late' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                        log.status === 'Excused' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                          'bg-red-50 border-red-200 text-red-800'
                      }`}>
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12">
                <EmptyState 
                  icon={Calendar}
                  title="No Attendance Logs"
                  description="No attendance sessions have been registered for this class yet."
                />
              </div>
            )}

            {/* Pagination Controls for Attendance Log */}
            {attendanceLog.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-sm text-slate-500 font-medium">
                  Showing <span className="font-bold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, attendanceLog.length)}</span> of <span className="font-bold text-slate-900">{attendanceLog.length}</span>
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
