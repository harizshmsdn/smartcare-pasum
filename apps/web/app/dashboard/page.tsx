// apps/web/app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PixelIcon } from "../../components/PixelIcon";
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
import { api } from "../../lib/api";

interface AssignedClassOption {
  id: string;
  code: string;
  name: string;
  group_code: string;
  label: string;
}

interface TrajectoryPoint {
  week: string;
  attendance?: number | null;
  assessment?: number | null;
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

        // Call FastAPI Endpoint via api client
        try {
          const data = await api.get("/api/analytics/dashboard");
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
        } catch (err: any) {
          console.error("FastAPI returned error:", err);
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

        try {
          const data = await api.get(`/api/analytics/trajectory?class_id=${selectedClassId}`);
          setTrajectoryData(data);
        } catch (err: any) {
          console.error("FastAPI trajectory error:", err);
        }
      } catch (err) {
        console.error("Failed to load trajectory:", err);
      }
    };

    fetchClassTrajectory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent text-white/70 text-sm">
        <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-none animate-spin mr-3" />
        Loading dashboard telemetry...
      </div>
    );
  }

  return (
    <main className="flex-1 h-screen flex flex-col p-6 lg:p-8 bg-transparent overflow-hidden text-white">
      {/* Header */}
      <header className="shrink-0 mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">Academic Overview</h2>
          <p className="text-xs lg:text-sm text-white/60 mt-0.5">Subject analytics, merit distributions, and exam trajectories</p>
        </div>
        <div className="flex items-center gap-2 border border-white/15 bg-white/5 text-emerald-300 px-3.5 py-1.5 text-xs tracking-wider uppercase rounded-none">
          <PixelIcon name="graduation" size={16} />
          Semester 1 • 2025/2026
        </div>
      </header>

      {/* Grid Layout: 3 Columns, 2 Rows (04 Products Style) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-4 lg:gap-5 min-h-0 pb-2">

        {/* ROW 1, COL 1 & 2: Trajectory */}
        <div className="md:col-span-2 border border-white/15 bg-[#08090c]/80 backdrop-blur-md rounded-none shadow-xl flex flex-col min-h-0 relative">
          <div className="shrink-0 border-b border-white/10 px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-white/90">ATTENDANCE VS. ASSESSMENT TRAJECTORY</span>
            </div>

            {/* Dynamic Class Selection Custom Dropdown */}
            <div className="relative z-20">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs px-3 py-1.5 transition-colors cursor-pointer rounded-none"
              >
                <span className="truncate max-w-[200px] sm:max-w-[280px]">
                  {assignedClasses.find(c => c.id === selectedClassId)?.label || "Select Class"}
                </span>
                <span className="text-white/40 text-[10px]">▼</span>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-1 min-w-[220px] max-w-[340px] bg-[#08090c] border border-white/20 shadow-2xl z-50 overflow-hidden py-1 rounded-none">
                  {assignedClasses.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => {
                        setSelectedClassId(cls.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs transition-colors rounded-none ${selectedClassId === cls.id
                        ? "bg-white/15 text-emerald-300 font-bold"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                        }`}
                    >
                      {cls.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full p-4 overflow-x-auto overflow-y-hidden">
            {trajectoryData && trajectoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trajectoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                  <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#08090c',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: 0,
                      color: '#fff',
                      fontSize: '11px'
                    }}
                  />
                  <Legend verticalAlign="top" height={32} iconType="rect" wrapperStyle={{ fontSize: '11px' }} />
                  <Line connectNulls type="monotone" dataKey="attendance" name="Avg Attendance %" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3, fill: '#60a5fa' }} activeDot={{ r: 5 }} />
                  <Line connectNulls type="monotone" dataKey="assessment" name="Avg Assessment %" stroke="#f87171" strokeWidth={2} dot={{ r: 3, fill: '#f87171' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-white/40">
                <PixelIcon name="trendingUp" size={36} className="text-white/20 mb-2" />
                <p className="text-xs uppercase tracking-wider text-white/70">No Trajectory Data Available</p>
                <p className="text-[11px] text-white/40 mt-1">Trends will populate once attendance sessions and assessments are recorded.</p>
              </div>
            )}
          </div>
        </div>

        {/* ROW 1, COL 3: Condensed Risk Clusters */}
        <div className="border border-white/15 bg-[#08090c]/80 backdrop-blur-md rounded-none shadow-xl p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="shrink-0 border-b border-white/10 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-white/90">ACTIVE RISK CLUSTERS</span>
            </div>
            <PixelIcon name="warning" size={18} className="text-red-400" />
          </div>

          <div className="flex-1 flex flex-col justify-center gap-3 py-4">
            <div className="border border-white/10 bg-white/5 p-3.5 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Absenteeism</p>
                <p className="text-[11px] text-white/40 mt-0.5">Students &lt; 80%</p>
              </div>
              <span className="text-3xl font-black text-white">{absenteeismCount}</span>
            </div>

            <div className="border border-white/10 bg-white/5 p-3.5 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-red-300 font-bold uppercase tracking-wider">Assessment Drop</p>
                <p className="text-[11px] text-white/40 mt-0.5">Sudden Decline</p>
              </div>
              <span className="text-3xl font-black text-red-400">{assessmentDropCount}</span>
            </div>
          </div>

          <div className="relative group/disabled w-full cursor-not-allowed" title="Disabled Feature">
            <div className="w-full border border-white/10 bg-white/5 text-white/40 py-2.5 text-xs uppercase tracking-wider flex items-center justify-center gap-2 pointer-events-none select-none rounded-none">
              Review Cases [ DISABLED ]
            </div>
            <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover/disabled:flex items-center px-2.5 py-1 text-[11px] text-white bg-black border border-white/20 whitespace-nowrap z-50">
              Disabled Feature
            </div>
          </div>
        </div>

        {/* ROW 2, COL 1: Raw Merit Scores */}
        <div className="border border-white/15 bg-[#08090c]/80 backdrop-blur-md rounded-none shadow-xl flex flex-col min-h-0">
          <div className="shrink-0 border-b border-white/10 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-white/90">MERIT SCORES (RAW)</span>
            </div>
            <PixelIcon name="award" size={16} className="text-amber-400" />
          </div>

          <div className="flex-1 min-h-0 w-full p-4 overflow-x-auto overflow-y-hidden">
            {meritRawScores && meritRawScores.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={meritRawScores} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                  <XAxis dataKey="range" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#08090c',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: 0,
                      color: '#fff',
                      fontSize: '11px'
                    }}
                  />
                  <Bar dataKey="students" name="Students" fill="#f59e0b" radius={0} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-white/40">
                <p className="text-xs uppercase tracking-wider text-white/70">No Data Available</p>
                <p className="text-[10px] mt-1 text-white/40">Waiting for initial scores to be recorded.</p>
              </div>
            )}
          </div>
        </div>

        {/* ROW 2, COL 2: Merit CGPA Estimates */}
        <div className="border border-white/15 bg-[#08090c]/80 backdrop-blur-md rounded-none shadow-xl flex flex-col min-h-0">
          <div className="shrink-0 border-b border-white/10 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-white/90">MERIT SCORES (CGPA)</span>
            </div>
            <PixelIcon name="graduation" size={16} className="text-emerald-400" />
          </div>

          <div className="flex-1 min-h-0 w-full p-4 overflow-x-auto overflow-y-hidden">
            {meritCGPA && meritCGPA.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={meritCGPA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCgpa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                  <XAxis dataKey="range" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#08090c',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: 0,
                      color: '#fff',
                      fontSize: '11px'
                    }}
                  />
                  <Area type="monotone" dataKey="students" name="Students" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCgpa)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-white/40">
                <p className="text-xs uppercase tracking-wider text-white/70">No Data Available</p>
                <p className="text-[10px] mt-1 text-white/40">Waiting for initial CGPA calculations.</p>
              </div>
            )}
          </div>
        </div>

        {/* ROW 2, COL 3: Mid-Terms vs Finals Matrix */}
        <div className="border border-white/15 bg-[#08090c]/80 backdrop-blur-md rounded-none shadow-xl flex flex-col min-h-0">
          <div className="shrink-0 border-b border-white/10 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-white/90">MAJOR EXAMS MATRIX</span>
            </div>
            <PixelIcon name="book" size={16} className="text-sky-400" />
          </div>

          <div className="flex-1 min-h-0 w-full p-4 overflow-x-auto overflow-y-hidden">
            {examPerformanceData && examPerformanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={examPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                  <XAxis dataKey="subject" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#08090c',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: 0,
                      color: '#fff',
                      fontSize: '11px'
                    }}
                  />
                  <Bar dataKey="midterm" name="Mid-Term" fill="#64748b" radius={0} />
                  <Bar dataKey="finals" name="Finals" fill="#38bdf8" radius={0} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-white/40">
                <PixelIcon name="book" size={32} className="text-white/20 mb-2" />
                <p className="text-xs uppercase tracking-wider text-white/70">No Exams Recorded</p>
                <p className="text-[10px] mt-1 text-white/40">Matrix will populate after mid-term or final exams are recorded.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}