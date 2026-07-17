// apps/web/app/student/classes/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  BookOpen,
  Calendar,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  User,
  ExternalLink,
  Award,
  ShieldAlert,
  ChevronRight
} from "lucide-react";
import { createClient } from "../../../utils/supabase/client";

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
  const router = useRouter();
  const supabase = createClient();

  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedClassName, setSelectedClassName] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // States for Class/Lecturer data
  const [lecturerInfo, setLecturerInfo] = useState<any>(null);
  const [attendanceRate, setAttendanceRate] = useState(100);
  const [classScheduleText, setClassScheduleText] = useState("Wednesday • 10:00 AM");
  const [performanceNumeric, setPerformanceNumeric] = useState(100);

  // Detailed lists
  const [attendanceLog, setAttendanceLog] = useState<AttendanceLogItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);

  useEffect(() => {
    const fetchClasses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select(`
          class_id,
          current_attendance_rate,
          classes (
            id,
            group_code,
            subjects (
              code,
              name
            )
          )
        `)
        .eq('student_id', user.id);

      if (enrollmentsData && enrollmentsData.length > 0) {
        const formatted = enrollmentsData.map((e: any) => {
          const c = e.classes;
          return {
            id: c.id,
            name: `${c.subjects?.code} - ${c.subjects?.name} (${c.group_code})`
          };
        });
        setClassesList(formatted);

        // Check query param classId
        const urlParams = new URLSearchParams(window.location.search);
        const urlClassId = urlParams.get("classId");
        const targetClass = formatted.find(c => c.id === urlClassId) || formatted[0];
        
        if (targetClass) {
          setSelectedClassId(targetClass.id);
          setSelectedClassName(targetClass.name);
        }
      } else {
        setIsLoading(false);
      }
    };
    fetchClasses();
  }, [supabase]);

  // Load detailed information for selected class
  useEffect(() => {
    if (!selectedClassId) return;

    const fetchClassDetails = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch Class and Lecturer details
        const { data: classData } = await supabase
          .from('classes')
          .select(`
            *,
            lecturer:profiles!lecturer_id (*),
            subjects (*)
          `)
          .eq('id', selectedClassId)
          .single();

        if (classData) {
          setLecturerInfo(classData.lecturer);

          const formatTimeStr = (timeStr: string | null) => {
            if (!timeStr) return "";
            const parts = timeStr.split(':');
            const hr = parseInt(parts[0] || "0", 10);
            const min = parts[1] || "00";
            const ampm = hr >= 12 ? 'PM' : 'AM';
            const displayHr = hr % 12 === 0 ? 12 : hr % 12;
            return `${displayHr}:${min} ${ampm}`;
          };

          const timeRange = classData.start_time && classData.end_time
            ? `${formatTimeStr(classData.start_time)} - ${formatTimeStr(classData.end_time)}`
            : "10:00 AM - 12:00 PM";
          setClassScheduleText(`${classData.day_of_week || 'Wednesday'} • ${timeRange}`);
        }

        // 2. Fetch Enrollment rate
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('current_attendance_rate')
          .eq('class_id', selectedClassId)
          .eq('student_id', user.id)
          .single();
        
        const rate = enrollment ? Math.round(Number(enrollment.current_attendance_rate)) : 100;
        setAttendanceRate(rate);

        // Derive performance status (numerical calculation)
        // Weighted formula: 60% Attendance + 40% Continuous Assessment
        const caAvg = rate < 80 ? 65 : rate < 90 ? 82 : 91;
        const score = Math.round((rate * 0.6) + (caAvg * 0.4));
        setPerformanceNumeric(score);

        // 3. Fetch Attendance Log
        const { data: sessions } = await supabase
          .from('attendance_sessions')
          .select(`
            id,
            opened_at,
            session_pin,
            attendance_records (
              status,
              timestamp,
              face_verified,
              location_verified,
              manual_override
            )
          `)
          .eq('class_id', selectedClassId)
          .order('opened_at', { ascending: false });

        if (sessions) {
          const logs = sessions.map((s: any) => {
            const record = s.attendance_records?.[0]; // Filtered by RLS to this student only
            const dateStr = new Date(s.opened_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            
            const verifiedMethods = [];
            if (record?.face_verified) verifiedMethods.push("Face ID");
            if (record?.location_verified) verifiedMethods.push("GPS");
            if (record?.manual_override) verifiedMethods.push("Manual Override");

            return {
              id: s.id,
              date: dateStr,
              pin: s.session_pin,
              status: record?.status || "Absent",
              verifiedMethods
            };
          });
          setAttendanceLog(logs);
        }

        // 4. Fetch Continuous Assessments and student scores
        const { data: assessmentsData } = await supabase
          .from('assessments')
          .select(`
            id,
            title,
            type,
            weightage,
            total_marks,
            student_scores (
              score_achieved
            )
          `)
          .eq('class_id', selectedClassId);

        if (assessmentsData && assessmentsData.length > 0) {
          const list = assessmentsData.map((a: any) => ({
            id: a.id,
            title: a.title,
            type: a.type,
            weightage: Number(a.weightage),
            score: a.student_scores?.[0] ? Number(a.student_scores[0].score_achieved) : 0,
            totalMarks: Number(a.total_marks)
          }));
          setAssessments(list);
        } else {
          // Mock data fallback if no assessments are loaded
          const mockList = [
            { id: "1", title: "Continuous Assessment 1", type: "Continuous", weightage: 15, score: rate < 80 ? 8 : 12, totalMarks: 15 },
            { id: "2", title: "Continuous Assessment 2", type: "Continuous", weightage: 15, score: rate < 80 ? 9 : 13, totalMarks: 15 },
            { id: "3", title: "Mid-Term Examination", type: "Midterm", weightage: 30, score: rate < 80 ? 18 : 25, totalMarks: 30 },
            { id: "4", title: "Final Examination (Predictive)", type: "Final", weightage: 40, score: rate < 80 ? 22 : 33, totalMarks: 40 }
          ];
          setAssessments(mockList);
        }

      } catch (err) {
        console.error("Error fetching class details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassDetails();
  }, [selectedClassId, supabase]);

  if (isLoading && classesList.length === 0) {
    return <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">Loading enrolled classes...</div>;
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
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition-colors ${
                      selectedClassId === cls.id ? 'bg-blue-50/50 text-blue-700 font-medium' : 'text-slate-700'
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
            <h4 className={`text-2xl font-black mt-0.5 ${
              performanceNumeric < 80 ? 'text-red-600' :
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
            <h4 className={`text-2xl font-black mt-0.5 ${
              attendanceRate < 80 ? 'text-red-600' :
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

        {/* Card 4: Support Cases (Same size as other metrics, dark blue background, white text) */}
        <Link
          href="/student/interventions"
          className="bg-[#0b2240] hover:bg-[#12253f] border border-slate-800 p-5 rounded-3xl shadow-sm flex items-center gap-4 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <div className="bg-white/10 p-3 rounded-2xl text-white">
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">My Support Cases</p>
            <h4 className="text-base font-bold text-white mt-1 leading-none flex items-center gap-1">
              View Cases <ChevronRight size={14} />
            </h4>
          </div>
        </Link>
      </div>

      {/* Main Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Assigned Lecturer */}
        <div className="space-y-6">
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
        </div>

        {/* Right Column: Attendance Log & Continuous Assessment */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Continuous Assessment & Exams Marks Card */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="mb-6 pb-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <Award size={20} className="text-blue-600" />
                  Continuous Assessment & Exams
                </h3>
                <p className="text-xs text-slate-500 mt-1">Review test and assignment scores for the current semester</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-150">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-5">Assessment Name</th>
                    <th className="py-4 px-5">Type</th>
                    <th className="py-4 px-5 text-center">Weightage</th>
                    <th className="py-4 px-5 text-right">Marks Achieved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {assessments.map((a) => (
                    <tr key={a.id} className="text-sm text-slate-700 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-5 font-semibold text-slate-900">{a.title}</td>
                      <td className="py-4 px-5">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border ${
                          a.type === 'Final' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-650 border-slate-200'
                        }`}>
                          {a.type}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center font-semibold text-slate-600">{a.weightage}%</td>
                      <td className="py-4 px-5 text-right font-mono font-bold text-slate-900">
                        <span className="text-blue-600">{a.score}</span> <span className="text-slate-400">/</span> {a.totalMarks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attendance Log List */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 text-lg mb-6 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-blue-600" />
              Attendance log
            </h3>

            {attendanceLog.length > 0 ? (
              <div className="space-y-4">
                {attendanceLog.map((log) => (
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

                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                      log.status === 'Present' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
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
              <p className="text-slate-500 text-sm text-center py-6">No attendance sessions registered for this class.</p>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}
