// apps/web/app/student/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import {
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  MonitorPlay,
  Beaker,
  Clock,
  AlertTriangle,
  GraduationCap
} from "lucide-react";

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

const getClassIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "lecture":
      return MonitorPlay;
    case "tutorial":
      return BookOpen;
    case "lab":
      return Beaker;
    default:
      return BookOpen;
  }
};

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

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // Fetch Student Name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        if (profile?.full_name) {
          setStudentName(profile.full_name);
        }

        // Fetch Student Enrollments and Class details
        const { data: enrollmentsData } = await supabase
          .from('enrollments')
          .select(`
            current_attendance_rate,
            classes (
              id,
              group_code,
              type,
              semester,
              day_of_week,
              start_time,
              end_time,
              location,
              subjects (
                code,
                name
              )
            )
          `)
          .eq('student_id', user.id);

        const processedClasses = (enrollmentsData || []).map((enroll: any) => {
          const cls = enroll.classes;
          const attendance = Math.round(Number(enroll.current_attendance_rate || 0));
          const subjectNode = cls?.subjects;
          const subjectName = subjectNode?.name || "Unknown Class";
          const subjectCode = subjectNode?.code || "UNK101";

          let riskStatus = "good";
          if (attendance < 80) riskStatus = "critical";
          else if (attendance < 90) riskStatus = "at-risk";

          // Fetch or calculate a simulated latest score based on attendance as fallback
          const latestScore = attendance < 80 ? 45 : attendance < 90 ? 63 : 88;

          const formatTimeStr = (timeStr: string | null) => {
            if (!timeStr) return "";
            const parts = timeStr.split(':');
            const p0 = parts[0];
            const p1 = parts[1];
            if (!p0 || !p1) return timeStr;
            const hr = parseInt(p0, 10);
            const min = p1;
            const ampm = hr >= 12 ? 'PM' : 'AM';
            const displayHr = hr % 12 === 0 ? 12 : hr % 12;
            return `${displayHr}:${min} ${ampm}`;
          };

          const formattedTimeRange = cls?.start_time && cls?.end_time
            ? `${formatTimeStr(cls.start_time)} - ${formatTimeStr(cls.end_time)}`
            : "10:00 AM - 12:00 PM";

          const formattedDayTime = cls?.day_of_week
            ? `${cls.day_of_week} • ${formattedTimeRange}`
            : formattedTimeRange;

          return {
            id: cls?.id || '',
            title: `${subjectCode} - ${subjectName}`,
            group: cls?.group_code || 'Group A',
            time: formattedDayTime,
            location: cls?.location || 'Lecture Hall 1',
            status: 'Enrolled',
            attendance,
            latestScore,
            riskStatus,
            type: cls?.type || 'Lecture',
            dayOfWeek: cls?.day_of_week || 'Monday',
            startTime: cls?.start_time || '10:00:00',
            endTime: cls?.end_time || '12:00:00'
          };
        }).filter(item => item.id !== '');

        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const todayDayOfWeek = days[new Date().getDay()];

        const todayClasses = processedClasses.filter(cls => cls.dayOfWeek === todayDayOfWeek);
        todayClasses.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

        const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const fallbackClasses = [...processedClasses].sort((a, b) => {
          const dayA = dayOrder.indexOf(a.dayOfWeek || "");
          const dayB = dayOrder.indexOf(b.dayOfWeek || "");
          if (dayA !== dayB) return dayA - dayB;
          return (a.startTime || "").localeCompare(b.startTime || "");
        });

        const displaySchedule = todayClasses.length > 0 ? todayClasses : fallbackClasses;
        const slicedSchedule = displaySchedule.slice(0, 3);

        setScheduleToday(slicedSchedule);
        setAssignedClasses(processedClasses);
        setActiveIndex(0);
      } catch (error) {
        console.error("Error fetching student dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [router, supabase]);

  const nextSlide = () => {
    setActiveIndex((prev) => (prev === scheduleToday.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev === 0 ? scheduleToday.length - 1 : prev - 1));
  };

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">Loading student portal...</div>;
  }

  return (
    <main className="flex-1 overflow-y-auto bg-transparent flex flex-col">
      {/* 3D CAROUSEL */}
      <div className="relative w-full h-[55vh] min-h-[450px] flex items-center justify-center overflow-hidden bg-slate-900/5 rounded-b-[3rem] shadow-inner mb-10 pt-4">
        {/* Header Overlay */}
        <div className="absolute top-8 left-10 z-40">
          <h2 className="text-3xl font-semibold text-slate-900">Welcome, {studentName}</h2>
          <p className="text-slate-500 mt-1">{currentDateFormatted}</p>
        </div>

        {/* Carousel Navigation Arrows */}
        {scheduleToday.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-10 z-40 bg-white/80 backdrop-blur border border-slate-200 p-3 rounded-full shadow-lg text-slate-700 hover:bg-white hover:scale-110 transition-all cursor-pointer"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-10 z-40 bg-white/80 backdrop-blur border border-slate-200 p-3 rounded-full shadow-lg text-slate-700 hover:bg-white hover:scale-110 transition-all cursor-pointer"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* 3D Track */}
        <div className="relative w-full max-w-4xl h-[350px] flex items-center justify-center perspective-[1200px]">
          {scheduleToday.length > 0 ? (
            scheduleToday.map((cls, index) => {
              const offset = index - activeIndex;
              const isCenter = offset === 0;
              const isRight = offset > 0 || (activeIndex === scheduleToday.length - 1 && index === 0);
              const isLeft = offset < 0 || (activeIndex === 0 && index === scheduleToday.length - 1);

              let transformClasses = "translate-x-full scale-50 opacity-0 z-0";
              if (isCenter) {
                transformClasses = "translate-x-0 scale-100 opacity-100 z-30 blur-none shadow-2xl";
              } else if (isRight && Math.abs(offset) === 1 || (activeIndex === scheduleToday.length - 1 && index === 0)) {
                transformClasses = "translate-x-[35%] scale-75 opacity-70 z-20 blur-[4px] shadow-lg cursor-pointer hover:blur-none";
              } else if (isLeft && Math.abs(offset) === 1 || (activeIndex === 0 && index === scheduleToday.length - 1)) {
                transformClasses = "-translate-x-[35%] scale-75 opacity-70 z-20 blur-[4px] shadow-lg cursor-pointer hover:blur-none";
              }

              return (
                <div
                  key={cls.id}
                  onClick={() => !isCenter && setActiveIndex(index)}
                  className={`absolute w-full max-w-2xl bg-white rounded-3xl border border-slate-200 p-8 transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${transformClasses}`}
                >
                  <div className="relative z-10 flex flex-col justify-between h-full gap-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full ${isCenter ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                          {cls.status} • {cls.time}
                        </span>
                        <h3 className="text-3xl font-bold text-slate-900 mt-4 leading-tight">{cls.title}</h3>
                        <p className="text-slate-500 text-lg mt-1">{cls.group} • {cls.location}</p>
                      </div>
                    </div>

                    <div className={`grid grid-cols-3 gap-4 border-t border-slate-100 pt-6 transition-opacity duration-500 ${isCenter ? 'opacity-100' : 'opacity-40'}`}>
                      <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-1.5 text-blue-700 text-xs font-bold uppercase mb-1">
                          Attendance
                        </div>
                        <div className="text-2xl font-black text-blue-700">{cls.attendance}%</div>
                      </div>

                      <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold uppercase mb-1">
                          Latest Score
                        </div>
                        <div className="text-2xl font-black text-emerald-700">{cls.latestScore}%</div>
                      </div>

                      <div className={`p-3 rounded-xl border ${
                        cls.riskStatus === 'critical' ? 'bg-red-50 border-red-100 text-red-700' :
                        cls.riskStatus === 'at-risk' ? 'bg-orange-50 border-orange-100 text-orange-700' :
                        'bg-emerald-50 border-emerald-100 text-emerald-700'
                      }`}>
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase mb-1">
                          {cls.riskStatus === 'critical' && <AlertTriangle size={14} />}
                          {cls.riskStatus === 'at-risk' && <TrendingDown size={14} />}
                          Risk Status
                        </div>
                        <div className="text-2xl font-black uppercase">{cls.riskStatus}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-slate-500 text-lg">No classes assigned for this semester.</div>
          )}
        </div>
      </div>

      {/* 2. BOTTOM HALF: ALL ENROLLED CLASSES GRID */}
      <div className="px-10 pb-10">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Enrolled Classes</h3>
            <p className="text-sm text-slate-500 mt-1">Semester 1 • Academic Year 2025/2026</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {assignedClasses.map((item) => {
            const Icon = getClassIcon(item.type);
            return (
              <Link
                href={`/student/classes?classId=${item.id}`}
                key={item.id}
                className="block bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2.5 rounded-xl ${item.type === 'Lecture' ? 'bg-indigo-100 text-indigo-600' :
                      item.type === 'Tutorial' ? 'bg-emerald-100 text-emerald-600' :
                        'bg-amber-100 text-amber-600'
                    }`}>
                    <Icon size={20} />
                  </div>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                    {item.type}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-lg leading-tight mb-2 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h4>

                <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock size={16} className="text-slate-400" />
                    <span className="font-medium">{item.time}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">My Attendance</span>
                    <span className={`font-bold ${item.attendance < 80 ? 'text-red-600' : item.attendance < 90 ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {item.attendance}%
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
