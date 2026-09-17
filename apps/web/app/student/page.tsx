// apps/web/app/student/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { studentService } from "../../lib/services/student";
import BorderGlow from "../../components/BorderGlow";
import EmptyState from "../../components/EmptyState";
import { PixelIcon } from "../../components/PixelIcon";
import useSWR from "swr";

interface ScheduleItem {
  id: string;
  title: string;
  group: string;
  time: string;
  location: string;
  status: string;
  attendance: number;
  latestScore: number;
  riskStatus: string;
}

interface AssignedClass {
  id: string;
  title: string;
  type: string;
  time: string;
  attendance: number;
}

export default function StudentHomePage() {
  const router = useRouter();
  const supabase = createClient();
  const [studentName, setStudentName] = useState("Student");
  const [activeIndex, setActiveIndex] = useState(0);
  const [scheduleToday, setScheduleToday] = useState<ScheduleItem[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentDateFormatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const fetchDashboardData = async () => {
    try {
      return await studentService.getDashboard();
    } catch (err) {
      console.warn("FastAPI student dashboard error, falling back to direct Supabase:", err);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          class_id,
          current_attendance_rate,
          classes (
            id,
            group_code,
            type,
            day_of_week,
            start_time,
            end_time,
            location,
            subjects (code, name)
          )
        `)
        .eq('student_id', user.id);

      const assignedClasses = (enrollments || []).map((e: any) => {
        const cls = e.classes;
        const sub = cls?.subjects;
        const hasAtt = e.current_attendance_rate !== null && e.current_attendance_rate !== undefined && e.current_attendance_rate !== "-";
        return {
          id: cls?.id || e.class_id,
          title: sub?.name || "Class",
          group: cls?.group_code || "Group A",
          location: cls?.location || "PASUM Campus",
          attendance: hasAtt ? Number(e.current_attendance_rate) : null,
          latestScore: null,
          riskStatus: hasAtt ? (Number(e.current_attendance_rate) < 80 ? "Critical" : Number(e.current_attendance_rate) < 90 ? "At Risk" : "Good") : "No Data",
          type: cls?.type || "Lecture",
          dayOfWeek: cls?.day_of_week || "Monday",
          startTime: cls?.start_time || "10:00:00",
          endTime: cls?.end_time || "12:00:00"
        };
      });

      return {
        profile,
        assigned_classes: assignedClasses
      };
    }
  };

  const { data: dashboardData, error: swrError, isLoading: isSwrLoading, mutate } = useSWR('studentDashboard', fetchDashboardData);

  useEffect(() => {
    if (swrError) {
      setIsLoading(false);
      return;
    }
    if (!dashboardData) return;

    if (dashboardData.profile?.full_name) {
      setStudentName(dashboardData.profile.full_name);
    }

    const processedClasses: any[] = (dashboardData.assigned_classes || []).map((c: any) => {
      const title = c.title || c.name || "Unknown Class";
      const group = c.group || c.code || "Group A";
      const sTime = c.startTime ? c.startTime.slice(0, 5) : "10:00";
      const eTime = c.endTime ? c.endTime.slice(0, 5) : "12:00";
      return {
        ...c,
        id: c.id,
        title,
        name: title,
        group,
        code: group,
        location: c.location || "PASUM Campus",
        time: c.time || `${sTime} - ${eTime}`,
        status: c.status || "Enrolled",
        attendance: c.attendance !== undefined ? Number(c.attendance) : 85,
        latestScore: c.latestScore !== undefined ? Number(c.latestScore) : 0,
        riskStatus: c.riskStatus || "Good",
        type: c.type || "Lecture",
        dayOfWeek: c.dayOfWeek || "Monday",
        startTime: c.startTime || "10:00:00",
        endTime: c.endTime || "12:00:00"
      };
    });

    // Sort all classes chronologically across the week
    const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const sortedClasses = [...processedClasses].sort((a: any, b: any) => {
      const dayA = dayOrder.indexOf(a.dayOfWeek || "");
      const dayB = dayOrder.indexOf(b.dayOfWeek || "");
      if (dayA !== dayB) return dayA - dayB;
      return (a.startTime || "").localeCompare(b.startTime || "");
    });

    // Auto-focus class closest upcoming according to current day and time
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
    };
    const now = new Date();
    const currentDayIdx = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let minDeltaMinutes = Infinity;
    let closestIndex = 0;

    sortedClasses.forEach((cls: any, idx: number) => {
      const classDayIdx = dayMap[(cls.dayOfWeek || "Monday").toLowerCase()] ?? 1;
      const [startH, startM] = (cls.startTime || "10:00").split(':').map(Number);
      const startMin = (startH || 0) * 60 + (startM || 0);
      const [endH, endM] = (cls.endTime || "12:00").split(':').map(Number);
      const endMin = (endH || 0) * 60 + (endM || 0);

      let deltaDays = (classDayIdx - currentDayIdx + 7) % 7;
      if (deltaDays === 0 && currentMinutes >= startMin && currentMinutes <= endMin) {
        minDeltaMinutes = -1;
        closestIndex = idx;
        return;
      }
      if (deltaDays === 0 && currentMinutes > endMin) {
        deltaDays = 7;
      }
      const totalMinutesUntil = deltaDays * 1440 + (startMin - currentMinutes);
      if (totalMinutesUntil < minDeltaMinutes && minDeltaMinutes !== -1) {
        minDeltaMinutes = totalMinutesUntil;
        closestIndex = idx;
      }
    });

    setScheduleToday(sortedClasses);
    setAssignedClasses(processedClasses);
    setActiveIndex(closestIndex);
    setIsLoading(false);
  }, [dashboardData, swrError]);

  // Realtime subscription for live updates
  useEffect(() => {
    const channel = supabase.channel('student_dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => {
        mutate();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, mutate]);

  const nextSlide = () => {
    setActiveIndex((prev) => (prev === scheduleToday.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev === 0 ? scheduleToday.length - 1 : prev - 1));
  };

  if (isLoading || isSwrLoading) {
    return (
      <main className="flex-1 overflow-y-auto bg-transparent flex flex-col text-white">
        <div className="relative w-full h-[55vh] min-h-[440px] flex items-center justify-center overflow-hidden mb-6 pt-4">
          <div className="absolute top-6 left-8 lg:left-10 z-40">
            <div className="w-64 h-8 bg-white/10 rounded-none animate-pulse mb-2"></div>
            <div className="w-48 h-4 bg-white/10 rounded-none animate-pulse"></div>
          </div>
          <div className="w-full max-w-2xl h-[300px] border border-white/15 bg-white/5 rounded-none animate-pulse"></div>
        </div>
        <div className="px-8 lg:px-10 pb-10">
          <div className="w-48 h-6 bg-white/10 rounded-none animate-pulse mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-white/15 bg-white/5 p-5 rounded-none animate-pulse h-44"></div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-transparent flex flex-col text-white">
      {/* 3D CAROUSEL */}
      <div className="relative w-full h-[55vh] min-h-[440px] flex items-center justify-center overflow-hidden mb-6 pt-4">
        {/* Header Overlay */}
        <div className="absolute top-6 left-8 lg:left-10 z-40">
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white uppercase">Welcome, {studentName}</h2>
          <p className="text-xs text-white/60 mt-0.5">{currentDateFormatted}</p>
        </div>

        {/* Carousel Navigation Arrows */}
        {scheduleToday.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-6 lg:left-10 z-40 border border-white/20 bg-black/70 hover:bg-white/10 p-2.5 rounded-none shadow-xl text-white transition-colors cursor-pointer"
            >
              <span className="text-sm">◀</span>
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-6 lg:right-10 z-40 border border-white/20 bg-black/70 hover:bg-white/10 p-2.5 rounded-none shadow-xl text-white transition-colors cursor-pointer"
            >
              <span className="text-sm">▶</span>
            </button>
          </>
        )}

        {/* 3D Track */}
        <div className="relative w-full max-w-4xl h-[330px] flex items-center justify-center perspective-[1200px]">
          {scheduleToday.length > 0 ? (
            scheduleToday.map((cls, index) => {
              const offset = index - activeIndex;
              const isCenter = offset === 0;
              const isRight = offset > 0 || (activeIndex === scheduleToday.length - 1 && index === 0);
              const isLeft = offset < 0 || (activeIndex === 0 && index === scheduleToday.length - 1);

              let transformClasses = "translate-x-full scale-50 opacity-0 z-0";
              if (isCenter) {
                transformClasses = "translate-x-0 scale-100 opacity-100 z-30 blur-none shadow-2xl cursor-pointer hover:scale-[1.01]";
              } else if (isRight && Math.abs(offset) === 1 || (activeIndex === scheduleToday.length - 1 && index === 0)) {
                transformClasses = "translate-x-[35%] scale-75 opacity-60 z-20 blur-[2px] shadow-lg cursor-pointer hover:opacity-90 hover:blur-none";
              } else if (isLeft && Math.abs(offset) === 1 || (activeIndex === 0 && index === scheduleToday.length - 1)) {
                transformClasses = "-translate-x-[35%] scale-75 opacity-60 z-20 blur-[2px] shadow-lg cursor-pointer hover:opacity-90 hover:blur-none";
              }

              return (
                <BorderGlow
                  key={cls.id}
                  onClick={() => {
                    if (isCenter) {
                      router.push(`/student/classes?classId=${cls.id}`);
                    } else {
                      setActiveIndex(index);
                    }
                  }}
                  backgroundColor="#08090c"
                  borderRadius={0}
                  glowColor="160 84% 39%"
                  colors={['#10b981', '#059669', '#34d399']}
                  animated={isCenter}
                  className={`absolute w-full max-w-2xl p-6 lg:p-8 border border-white/20 bg-[#08090c]/95 backdrop-blur-md rounded-none transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${transformClasses}`}
                >
                  <div className="relative z-10 flex flex-col justify-between h-full gap-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-[11px] uppercase tracking-wider px-2.5 py-1 border rounded-none font-semibold ${isCenter ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300 font-bold' : 'border-white/10 bg-white/5 text-white/50'}`}>
                          {cls.status} • {cls.time}
                        </span>
                        <h3 className="text-2xl lg:text-3xl font-bold text-white mt-3 uppercase">{cls.title}</h3>
                        <p className="text-sm text-white/60 mt-1">{cls.group} • {cls.location}</p>
                      </div>
                    </div>

                    <div className={`grid grid-cols-3 gap-3 border-t border-white/10 pt-5 transition-opacity duration-500 ${isCenter ? 'opacity-100' : 'opacity-40'}`}>
                      <div className="bg-white/5 p-3 rounded-none border border-white/10">
                        <div className="text-white/60 text-[10px] font-bold uppercase mb-1">
                          Attendance
                        </div>
                        <div className={`text-xl font-bold ${cls.attendance !== null ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {cls.attendance !== null ? `${cls.attendance}%` : "—"}
                        </div>
                      </div>

                      <div className="bg-white/5 p-3 rounded-none border border-white/10">
                        <div className="text-white/60 text-[10px] font-bold uppercase mb-1">
                          Latest Score
                        </div>
                        <div className={`text-xl font-bold ${cls.latestScore !== null ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {cls.latestScore !== null ? `${cls.latestScore}%` : "—"}
                        </div>
                      </div>

                      <div className="bg-white/5 p-3 rounded-none border border-white/10">
                        <div className="text-white/60 text-[10px] font-bold uppercase mb-1">
                          Status
                        </div>
                        <div className="text-xl font-bold uppercase text-white">{cls.riskStatus}</div>
                      </div>
                    </div>
                  </div>
                </BorderGlow>
              );
            })
          ) : (
            <div className="relative z-30 w-full px-6">
              <EmptyState 
                title="No Classes Scheduled"
                description="You don't have any enrolled classes scheduled."
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. BOTTOM HALF: ALL ENROLLED CLASSES GRID */}
      <div className="px-8 lg:px-10 pb-10">
        <div className="flex justify-between items-end mb-6 pb-2 border-b border-white/10">
          <div>
            <h3 className="text-xl font-bold text-white uppercase tracking-tight">Enrolled Classes</h3>
            <p className="text-xs text-slate-400 mt-0.5">Semester 1 • Academic Year 2025/2026</p>
          </div>
        </div>

        {assignedClasses.length === 0 ? (
          <EmptyState 
            title="No Enrolled Classes"
            description="You are not enrolled in any classes for this semester. Please contact administration."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {assignedClasses.map((item) => {
              return (
                <Link
                  href={`/student/classes?classId=${item.id}`}
                  key={item.id}
                  className="block group rounded-none"
                >
                  <BorderGlow
                    backgroundColor="#08090c"
                    borderRadius={0}
                    glowColor="160 84% 39%"
                    colors={['#10b981', '#059669', '#34d399']}
                    className="p-5 border border-white/15 bg-[#08090c]/80 rounded-none shadow-sm transition-all duration-300"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 border border-white/15 bg-white/5 text-emerald-300 rounded-none">
                        <PixelIcon name="classes" size={18} />
                      </div>
                      <span className="border border-white/15 bg-white/10 text-emerald-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-none">
                        {item.type}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-base leading-tight mb-2 group-hover:text-emerald-400 transition-colors uppercase">
                      {item.title}
                    </h4>

                    <div className="space-y-2 mt-4 pt-3 border-t border-white/10 text-xs">
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="font-medium">{item.time}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Attendance</span>
                        <span className={`font-bold ${item.attendance === null ? 'text-slate-400' : item.attendance < 80 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {item.attendance !== null ? `${item.attendance}%` : "—"}
                        </span>
                      </div>
                    </div>
                  </BorderGlow>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
