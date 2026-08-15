// apps/web/app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BorderGlow from "../../components/BorderGlow";
import {
  TrendingUp,
  Award,
  BookOpen,
  AlertTriangle,
  GraduationCap,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { createClient } from "../../utils/supabase/client";

interface AssignedClassOption {
  id: string;
  code: string;
  name: string;
  group_code: string;
  label: string;
}

interface TrajectoryPoint {
  week: string;
  attendance: number;
  assessment: number;
}

interface ChartItem {
  range: string;
  students: number;
}

interface ExamPerformanceItem {
  subject: string;
  midterm: number;
  finals: number;
}

const sumCharCodes = (str: string) => str ? str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;

export default function DashboardPage() {
  const supabase = createClient();

  const [assignedClasses, setAssignedClasses] = useState<AssignedClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [trajectoryData, setTrajectoryData] = useState<TrajectoryPoint[]>([]);

  const [absenteeismCount, setAbsenteeismCount] = useState(0);
  const [assessmentDropCount, setAssessmentDropCount] = useState(0);

  const [meritRawScores, setMeritRawScores] = useState<ChartItem[]>([
    { range: "0-100", students: 0 },
    { range: "101-200", students: 0 },
    { range: "201-300", students: 0 },
    { range: "301-400", students: 0 },
    { range: "401-500", students: 0 },
  ]);

  const [meritCGPA, setMeritCGPA] = useState<ChartItem[]>([
    { range: "< 2.0", students: 0 },
    { range: "2.0-2.5", students: 0 },
    { range: "2.5-3.0", students: 0 },
    { range: "3.0-3.5", students: 0 },
    { range: "3.5-4.0", students: 0 },
  ]);

  const [examPerformanceData, setExamPerformanceData] = useState<ExamPerformanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Initial Dashboard Load (FastAPI)
  useEffect(() => {
    const fetchDashboardAnalytics = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("No access token available");

        // Call FastAPI Endpoint
        const res = await fetch("http://localhost:8000/api/analytics/dashboard", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setAssignedClasses(data.assigned_classes || []);
          if (data.assigned_classes && data.assigned_classes.length > 0) {
            setSelectedClassId(data.assigned_classes[0].id);
          }
          if (data.risk_clusters) {
            setAbsenteeismCount(data.risk_clusters.absenteeism_count || 0);
            setAssessmentDropCount(data.risk_clusters.assessment_drop_count || 0);
          }
          if (data.merit_raw_scores) setMeritRawScores(data.merit_raw_scores);
          if (data.merit_cgpa) setMeritCGPA(data.merit_cgpa);
          if (data.exam_performance) setExamPerformanceData(data.exam_performance);
        } else {
          console.error("FastAPI returned error:", await res.text());
          // Consider adding a toast or state to show the error
        }
      } catch (err) {
        console.error("Failed to load dashboard analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Fetch Class Trajectory when selectedClassId changes
  useEffect(() => {
    if (!selectedClassId) return;

    const fetchClassTrajectory = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("No access token available");

        const res = await fetch(`http://localhost:8000/api/analytics/trajectory?class_id=${selectedClassId}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setTrajectoryData(data);
        } else {
          console.error("FastAPI trajectory error:", await res.text());
        }
      } catch (err) {
        console.error("Failed to load trajectory:", err);
      }
    };

    fetchClassTrajectory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId]);

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen font-sans">Loading analytics dashboard...</div>;
  }

  return (
    <main className="flex-1 h-screen flex flex-col p-8 bg-[#FAF9F6] overflow-hidden">

      {/* Header (Fixed Height) */}
      <header className="shrink-0 mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Academic Overview</h2>
          <p className="text-slate-500 mt-1">Subject analytics, merit distributions, and exam trajectories</p>
        </div>
        <div className="flex items-center gap-2 bg-transparent text-blue-700 px-4 py-2 rounded-xl font-semibold text-sm">
          <GraduationCap size={18} />
          Semester 1, Year 2025/2026
        </div>
      </header>

      {/* Grid Layout: 3 Columns, 2 Rows */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-6 min-h-0 pb-2">

        {/* ROW 1, COL 1 & 2: Assessment vs Attendance (Subject Specific via Class Select Dropdown) */}
        <BorderGlow
          backgroundColor="#ffffff"
          borderRadius={24}
          glowColor="220 90 60"
          colors={['#3b82f6', '#8b5cf6', '#6366f1']}
          className="md:col-span-2 p-6 shadow-sm flex flex-col min-h-0 relative"
        >
          <div className="shrink-0 mb-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <TrendingUp className="text-blue-600" size={20} />
                Attendance vs. Assessment Trajectory
              </h3>
            </div>

            {/* Dynamic Class Selection Custom Dropdown */}
            <div className="relative z-20">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold rounded-xl px-3.5 py-2 transition-all cursor-pointer font-sans shadow-sm"
              >
                <span className="truncate max-w-[240px] sm:max-w-[320px]">
                  {assignedClasses.find(c => c.id === selectedClassId)?.label || "Select Class"}
                </span>
                <ChevronDown size={16} className={`text-slate-500 transition-transform duration-200 shrink-0 ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 min-w-[220px] max-w-[340px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                  {assignedClasses.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => {
                        setSelectedClassId(cls.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors ${selectedClassId === cls.id ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      {cls.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trajectoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="attendance" name="Avg Attendance %" stroke="#1e3a8a" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="assessment" name="Avg Assessment %" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </BorderGlow>

        {/* ROW 1, COL 3: Condensed Risk Clusters */}
        <BorderGlow
          backgroundColor="#0f172a"
          borderRadius={24}
          glowColor="0 95 60"
          colors={['#ef4444', '#f97316', '#b91c1c']}
          className="p-6 shadow-sm flex flex-col relative overflow-hidden"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-red-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <h3 className="font-bold text-white text-lg flex items-center gap-2 mb-6 z-10 shrink-0">
            <AlertTriangle className="text-red-400" size={20} />
            Active Risk Clusters
          </h3>

          <div className="flex-1 flex flex-col justify-center gap-4 z-10">
            <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Absenteeism</p>
                <p className="text-xs text-slate-500 mt-0.5">Students &lt; 80%</p>
              </div>
              <span className="text-3xl font-black text-white">{absenteeismCount}</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Assessment Drop</p>
                <p className="text-xs text-slate-500 mt-0.5">Sudden Decline</p>
              </div>
              <span className="text-3xl font-black text-red-400">{assessmentDropCount}</span>
            </div>
          </div>

          <Link
            href="/interventions"
            className="mt-4 w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            Review Cases <ChevronRight size={16} />
          </Link>
        </BorderGlow>

        {/* ROW 2, COL 1: Raw Merit Scores (0-500) */}
        <BorderGlow
          backgroundColor="#ffffff"
          borderRadius={24}
          glowColor="38 92 50"
          colors={['#f59e0b', '#d97706', '#fbbf24']}
          className="p-6 shadow-sm flex flex-col min-h-0"
        >
          <div className="shrink-0 mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Award className="text-amber-500" size={18} />
              Merit Scores (Raw)
            </h3>
            <p className="text-[11px] text-slate-500">Distribution of total points</p>
          </div>

          <div className="flex-1 min-h-0 w-full">
            {meritRawScores && meritRawScores.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={meritRawScores} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="range" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="students" name="Students" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <p className="text-sm font-medium">No Data Available</p>
                <p className="text-[10px] mt-1">Waiting for initial scores to be recorded.</p>
              </div>
            )}
          </div>
        </BorderGlow>

        {/* ROW 2, COL 2: Merit CGPA Estimates */}
        <BorderGlow
          backgroundColor="#ffffff"
          borderRadius={24}
          glowColor="142 70 45"
          colors={['#10b981', '#059669', '#34d399']}
          className="p-6 shadow-sm flex flex-col min-h-0"
        >
          <div className="shrink-0 mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <GraduationCap className="text-emerald-500" size={18} />
              Merit Scores (CGPA)
            </h3>
            <p className="text-[11px] text-slate-500">Estimates combining Assessment & Merit Data</p>
          </div>

          <div className="flex-1 min-h-0 w-full">
            {meritCGPA && meritCGPA.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={meritCGPA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCgpa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="range" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="students" name="Students" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCgpa)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <p className="text-sm font-medium">No Data Available</p>
                <p className="text-[10px] mt-1">Waiting for initial CGPA calculations.</p>
              </div>
            )}
          </div>
        </BorderGlow>

        {/* ROW 2, COL 3: Mid-Terms vs Finals Matrix */}
        <BorderGlow
          backgroundColor="#ffffff"
          borderRadius={24}
          glowColor="199 89 48"
          colors={['#38bdf8', '#0ea5e9', '#7dd3fc']}
          className="p-6 shadow-sm flex flex-col min-h-0"
        >
          <div className="shrink-0 mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <BookOpen className="text-sky-500" size={18} />
              Major Exams Matrix
            </h3>
            <p className="text-[11px] text-slate-500">Mid-term actuals vs. Final Exams Average</p>
          </div>

          <div className="flex-1 min-h-0 w-full">
            {examPerformanceData && examPerformanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={examPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="subject" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="midterm" name="Mid-Term" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="finals" name="Finals" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <p className="text-sm font-medium">No Exams Recorded</p>
                <p className="text-[10px] mt-1">Matrix will populate after mid-terms.</p>
              </div>
            )}
          </div>
        </BorderGlow>

      </div>
    </main>
  );
}