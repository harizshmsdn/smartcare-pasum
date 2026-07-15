// apps/web/app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Award,
  BookOpen,
  AlertTriangle,
  GraduationCap,
  ChevronRight
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

// Mock Data 1: Subject-Specific Timelines
const subjectTimelines = {
  "Physics 101": [
    { week: "W1", attendance: 98, assessment: 85 },
    { week: "W2", attendance: 97, assessment: 86 },
    { week: "W3", attendance: 95, assessment: 82 },
    { week: "W4", attendance: 91, assessment: 78 },
    { week: "W5", attendance: 85, assessment: 70 },
    { week: "W6", attendance: 82, assessment: 65 },
    { week: "W7", attendance: 78, assessment: 60 },
    { week: "W8", attendance: 85, assessment: 68 },
  ],
  "Physics 102": [
    { week: "W1", attendance: 100, assessment: 90 },
    { week: "W2", attendance: 98, assessment: 88 },
    { week: "W3", attendance: 98, assessment: 89 },
    { week: "W4", attendance: 95, assessment: 85 },
    { week: "W5", attendance: 92, assessment: 84 },
    { week: "W6", attendance: 90, assessment: 80 },
    { week: "W7", attendance: 88, assessment: 78 },
    { week: "W8", attendance: 90, assessment: 82 },
  ]
};

// Mock Data 4: Mid-Term vs Finals (Major Exams)
const examPerformance = [
  { subject: "Phy 101", midterm: 68, finals: 75 },
  { subject: "Phy 102", midterm: 72, finals: 80 },
  { subject: "Math 201", midterm: 65, finals: 70 },
  { subject: "Comp 101", midterm: 82, finals: 85 },
];

interface ChartItem {
  range: string;
  students: number;
}


export default function DashboardPage() {
  const supabase = createClient();
  const [activeSubject, setActiveSubject] = useState<"Physics 101" | "Physics 102">("Physics 101");
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

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch absenteeism count
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('current_attendance_rate');

        if (enrollments) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const count = enrollments.filter((e: any) => Number(e.current_attendance_rate) < 80).length;
          setAbsenteeismCount(count);
        }

        // 2. Fetch assessment drop count (needs review interventions)
        const { count: dropCount } = await supabase
          .from('interventions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'needs_review');
        setAssessmentDropCount(dropCount || 0);

        // 3. Fetch student merit score distribution
        const { data: profiles } = await supabase
          .from('profiles')
          .select('total_merit_score')
          .eq('role', 'student');

        if (profiles) {
          const raw: [ChartItem, ChartItem, ChartItem, ChartItem, ChartItem] = [
            { range: "0-100", students: 0 },
            { range: "101-200", students: 0 },
            { range: "201-300", students: 0 },
            { range: "301-400", students: 0 },
            { range: "401-500", students: 0 },
          ];
          const cgpa: [ChartItem, ChartItem, ChartItem, ChartItem, ChartItem] = [
            { range: "< 2.0", students: 0 },
            { range: "2.0-2.5", students: 0 },
            { range: "2.5-3.0", students: 0 },
            { range: "3.0-3.5", students: 0 },
            { range: "3.5-4.0", students: 0 },
          ];

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          profiles.forEach((p: any) => {
            const score = Number(p.total_merit_score || 0);

            // Raw distribution
            if (score <= 100) raw[0].students++;
            else if (score <= 200) raw[1].students++;
            else if (score <= 300) raw[2].students++;
            else if (score <= 400) raw[3].students++;
            else raw[4].students++;

            // Placement prediction
            if (score <= 80) cgpa[0].students++;
            else if (score <= 125) cgpa[1].students++;
            else if (score <= 175) cgpa[2].students++;
            else if (score <= 220) cgpa[3].students++;
            else cgpa[4].students++;
          });

          setMeritRawScores(raw);
          setMeritCGPA(cgpa);
        }
      } catch (err) {
        console.error("Error loading analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">Loading analytics dashboard...</div>;
  }

  return (
    <main className="flex-1 h-screen flex flex-col p-8 bg-[#FAF9F6] overflow-hidden">

      {/* Header (Fixed Height) */}
      <header className="shrink-0 mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Academic Overview</h2>
          <p className="text-slate-500 mt-1">Cross-subject analytics, merit distributions, and exam trajectories</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-semibold text-sm">
          <GraduationCap size={18} />
          Semester 1, Year 2025/2026
        </div>
      </header>

      {/* Grid Layout: 3 Columns, 2 Rows */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-6 min-h-0 pb-2">

        {/* ROW 1, COL 1 & 2: Assessment vs Attendance (Subject Specific via Tabs) */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col min-h-0 relative">
          <div className="shrink-0 mb-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <TrendingUp className="text-blue-600" size={20} />
                Attendance vs. Assessment Trajectory
              </h3>
            </div>

            {/* Subject Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveSubject("Physics 101")}
                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeSubject === "Physics 101" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Physics 101
              </button>
              <button
                onClick={() => setActiveSubject("Physics 102")}
                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeSubject === "Physics 102" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Physics 102
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={subjectTimelines[activeSubject]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="attendance" name="Avg Attendance %" stroke="#1e3a8a" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="assessment" name="Avg Assessment %" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROW 1, COL 3: Condensed Risk Clusters */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-sm flex flex-col relative overflow-hidden">
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
        </div>

        {/* ROW 2, COL 1: Raw Merit Scores (0-500) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col min-h-0">
          <div className="shrink-0 mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Award className="text-amber-500" size={18} />
              Merit Scores (Raw)
            </h3>
            <p className="text-[11px] text-slate-500">Distribution of total points (0-500)</p>
          </div>

          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={meritRawScores} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="range" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="students" name="Students" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROW 2, COL 2: Merit CGPA Estimates */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col min-h-0">
          <div className="shrink-0 mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <GraduationCap className="text-emerald-500" size={18} />
              Merit Scores (CGPA)
            </h3>
            <p className="text-[11px] text-slate-500">Estimates for University Placement</p>
          </div>

          <div className="flex-1 min-h-0 w-full">
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
          </div>
        </div>

        {/* ROW 2, COL 3: Mid-Terms vs Finals Matrix */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col min-h-0">
          <div className="shrink-0 mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <BookOpen className="text-sky-500" size={18} />
              Major Exams Matrix
            </h3>
            <p className="text-[11px] text-slate-500">Mid-term actuals vs. Predicted Finals</p>
          </div>

          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={examPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="subject" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="midterm" name="Mid-Term" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="finals" name="Finals" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </main>
  );
}