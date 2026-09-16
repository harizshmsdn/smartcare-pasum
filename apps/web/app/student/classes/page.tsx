// Student Enrolled Course Details page in dottxt.ai sharp dark style
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/client";
import { studentService } from "../../../lib/services/student";
import EmptyState from "../../../components/EmptyState";
import PixelIcon from "../../../components/PixelIcon";
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

  // States for Class/Lecturer data
  const [lecturerInfo, setLecturerInfo] = useState<any>(null);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [classScheduleText, setClassScheduleText] = useState("Wednesday • 10:00 AM");
  const [performanceNumeric, setPerformanceNumeric] = useState(0);

  // Detailed lists and pagination
  const [attendanceLog, setAttendanceLog] = useState<AttendanceLogItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
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
    setCurrentPage(1);
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
      <main className="flex-1 p-8 overflow-y-auto bg-transparent text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="w-64 h-8 bg-white/10 rounded-none animate-pulse mb-2 border border-white/10" />
            <div className="w-48 h-4 bg-white/10 rounded-none animate-pulse border border-white/10" />
          </div>
          <div className="w-48 h-10 bg-white/10 rounded-none animate-pulse border border-white/10" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[#08090c]/80 h-28 rounded-none animate-pulse border border-white/15" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-transparent text-white">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-none" />
            <span className="text-xs text-emerald-400 tracking-wider uppercase font-semibold">
              PASUM // ENROLLED COURSE DETAILS
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white uppercase">
            Enrolled Course Details
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Monitor your attendance, assessments, and lecturer assignments
          </p>
        </div>

        {/* Dropdown for selecting classes */}
        {classesList.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 bg-[#08090c]/90 border border-white/20 text-white px-4 py-2.5 rounded-none text-xs shadow-lg hover:border-white/40 transition-colors cursor-pointer font-medium"
            >
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest leading-none mb-1">
                  CURRENT CLASS
                </span>
                <span className="leading-none text-white font-semibold">
                  {selectedClassName || "Select Class..."}
                </span>
              </div>
              <span className="text-slate-400 text-xs ml-2">▼</span>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-1 w-full min-w-[260px] bg-[#08090c] border border-white/20 rounded-none shadow-2xl z-50 overflow-hidden text-xs">
                {classesList.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setSelectedClassId(cls.id);
                      setSelectedClassName(cls.name);
                      setIsDropdownOpen(false);
                      window.history.pushState(null, '', `/student/classes?classId=${cls.id}`);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0 ${
                      selectedClassId === cls.id ? 'bg-emerald-600/20 text-emerald-300 font-semibold' : 'text-slate-300'
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

      {/* Metrics Row (4 equal cards) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        {/* Card 1: Class Performance */}
        <div className="bg-[#08090c]/80 p-5 rounded-none border border-white/15 shadow-xl flex items-center gap-4 relative overflow-hidden backdrop-blur-md">
          <div className="p-3 bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 rounded-none shrink-0">
            <PixelIcon name="trendingUp" size={24} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] text-emerald-400 font-bold">01.</span>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Class Performance</p>
            </div>
            <h4 className={`text-2xl font-bold ${
              performanceNumeric < 80 ? 'text-rose-400' :
              performanceNumeric < 90 ? 'text-amber-400' :
              'text-emerald-400'
            }`}>
              {performanceNumeric}%
            </h4>
          </div>
        </div>

        {/* Card 2: My Attendance Rate */}
        <div className="bg-[#08090c]/80 p-5 rounded-none border border-white/15 shadow-xl flex items-center gap-4 relative overflow-hidden backdrop-blur-md">
          <div className="p-3 bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 rounded-none shrink-0">
            <PixelIcon name="checkCircle" size={24} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] text-emerald-400 font-bold">02.</span>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Attendance Rate</p>
            </div>
            <h4 className={`text-2xl font-bold ${
              attendanceRate < 80 ? 'text-rose-400' :
              attendanceRate < 90 ? 'text-amber-400' :
              'text-emerald-400'
            }`}>
              {attendanceRate}%
            </h4>
          </div>
        </div>

        {/* Card 3: Next Scheduled Lecture */}
        <div className="bg-[#08090c]/80 p-5 rounded-none border border-white/15 shadow-xl flex items-center gap-4 relative overflow-hidden backdrop-blur-md">
          <div className="p-3 bg-purple-500/10 border border-purple-400/20 text-purple-400 rounded-none shrink-0">
            <PixelIcon name="calendar" size={24} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] text-purple-400 font-bold">03.</span>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Next Lecture</p>
            </div>
            <h4 className="text-sm font-bold text-white truncate leading-snug">
              {classScheduleText}
            </h4>
          </div>
        </div>

        {/* Card 4: Support Cases (Disabled) */}
        <div
          className="relative group/disabled bg-[#08090c]/50 border border-white/10 p-5 rounded-none shadow-xl flex items-center gap-4 cursor-not-allowed overflow-hidden backdrop-blur-md"
          title="Disabled Feature"
        >
          <div className="p-3 bg-white/5 border border-white/10 text-slate-500 rounded-none shrink-0">
            <PixelIcon name="cases" size={24} />
          </div>
          <div className="min-w-0 opacity-40 grayscale pointer-events-none select-none">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] text-slate-500 font-bold">04.</span>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Support Cases</p>
            </div>
            <h4 className="text-sm font-bold text-slate-400 leading-none">
              View Cases →
            </h4>
          </div>
          <div className="pointer-events-none absolute -top-8 right-4 hidden group-hover/disabled:flex items-center px-2.5 py-1 text-xs font-semibold text-white bg-black/90 border border-white/20 rounded-none shadow-xl whitespace-nowrap z-50">
            Disabled Feature
          </div>
        </div>
      </div>

      {/* Main Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Assigned Lecturer & Continuous Assessment */}
        <div className="space-y-6 lg:col-span-1">
          {/* Assigned Lecturer Card */}
          <div className="bg-[#08090c]/80 p-6 rounded-none border border-white/15 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <PixelIcon name="profile" size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Assigned Lecturer
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">INFO</span>
            </div>

            {lecturerInfo ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-none flex items-center justify-center font-bold text-white text-xl">
                    {lecturerInfo.full_name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{lecturerInfo.full_name}</h4>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                      Course Instructor
                    </span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 space-y-3 text-slate-300">
                  <div className="flex items-center gap-3">
                    <PixelIcon name="mail" size={16} className="text-slate-400 shrink-0" />
                    <span className="truncate">{lecturerInfo.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <PixelIcon name="pin" size={16} className="text-slate-400 shrink-0" />
                    <span className="truncate">{lecturerInfo.office_location || "Lecturer Suite, PASUM"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <PixelIcon name="clock" size={16} className="text-slate-400 shrink-0" />
                    <span>Office hours: By Appointment</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-xs">No lecturer assigned.</p>
            )}
          </div>

          {/* Continuous Assessment & Exams Marks Card */}
          <div className="bg-[#08090c]/80 p-6 rounded-none border border-white/15 shadow-xl backdrop-blur-md">
            <div className="mb-5 pb-3 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <PixelIcon name="award" size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Assessment & Exams
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">GRADES</span>
            </div>

            <div className="overflow-x-auto w-full border border-white/10">
              <table className="w-full text-left border-collapse bg-black/20 text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3">Assessment</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3 text-center">Weight</th>
                    <th className="py-3 px-3 text-right">Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {assessments.length > 0 ? (
                    assessments.map((a) => (
                      <tr key={a.id} className="text-slate-300 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 font-semibold text-white">{a.title}</td>
                        <td className="py-3 px-3">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wider border ${
                            a.type === 'Final'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-400/30'
                              : 'bg-white/5 text-slate-300 border-white/20'
                          }`}>
                            {a.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400">{a.weightage}%</td>
                        <td className="py-3 px-3 text-right font-bold text-white">
                          <span className="text-emerald-400">{a.score}</span>
                          <span className="text-slate-500"> / </span>
                          {a.totalMarks}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8">
                        <EmptyState 
                          icon="award"
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
          <div className="bg-[#08090c]/80 p-6 rounded-none border border-white/15 shadow-xl backdrop-blur-md flex flex-col h-full">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <PixelIcon name="checkCircle" size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Attendance Log
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {attendanceLog.length} RECORDS
              </span>
            </div>

            {paginatedLogs.length > 0 ? (
              <div className="space-y-3">
                {paginatedLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex justify-between items-center p-3.5 rounded-none border border-white/10 bg-black/20 hover:border-white/25 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-white text-xs">{log.date}</p>
                      <div className="flex gap-2 items-center mt-1 text-[10px]">
                        <span className="bg-white/5 border border-white/10 text-slate-400 px-1.5 py-0.5 rounded-none">
                          PIN: {log.pin}
                        </span>
                        {log.verifiedMethods.map((m, idx) => (
                          <span
                            key={idx}
                            className="bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 px-1.5 py-0.5 rounded-none font-bold uppercase"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-none text-[10px] font-bold uppercase tracking-wider border ${
                      log.status === 'Present'
                        ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300'
                        : log.status === 'Late'
                        ? 'bg-amber-500/10 border-amber-400/30 text-amber-300'
                        : log.status === 'Excused'
                        ? 'bg-blue-500/10 border-blue-400/30 text-blue-300'
                        : 'bg-rose-500/10 border-rose-400/30 text-rose-300'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12">
                <EmptyState 
                  icon="calendar"
                  title="No Attendance Logs"
                  description="No attendance sessions have been registered for this class yet."
                />
              </div>
            )}

            {/* Pagination Controls for Attendance Log */}
            {attendanceLog.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-xs">
                <span className="text-slate-400">
                  Showing <span className="font-bold text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-white">{Math.min(currentPage * itemsPerPage, attendanceLog.length)}</span> of <span className="font-bold text-white">{attendanceLog.length}</span>
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-white/20 rounded-none text-xs text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-transparent font-medium"
                  >
                    PREV
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-white/20 rounded-none text-xs text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-transparent font-medium"
                  >
                    NEXT
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
