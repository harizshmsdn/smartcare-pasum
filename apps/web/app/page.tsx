// apps/web/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../utils/supabase/client";
import { lecturerService } from "../lib/services/lecturer";
import { api } from "../lib/api";
import BorderGlow from "../components/BorderGlow";
import {
  QrCode,
  AlertTriangle,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  MonitorPlay,
  Beaker,
  Clock,
  X,
  ScanFace,
  MapPin,
  Laptop,
  Users,
  Check
} from "lucide-react";
import EmptyState from "../components/EmptyState";
import useSWR from "swr";

//TypeScript interfaces to match Supabase schema
interface ScheduleItem {
  id: number | string;
  title: string;
  group: string;
  time: string;
  location: string;
  status: string;
  critical: number;
  atRisk: number;
  attendance: number;
  activeSessionId?: string | null;
  activeSessionPin?: string | null;
  activeOnlineMode?: boolean;
  activeFaceIdRequired?: boolean;
  activeLocationRequired?: boolean;
}

interface AssignedClass {
  id: number | string;
  title: string;
  type: "Lecture" | "Tutorial" | "Lab" | string;
  time: string;
  attendance: number;
}

//Helper function to dynamically map database strings to icons
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

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();
  const [lecturerName, setLecturerName] = useState("Dr. Alan Turing");

  //Setup state to handle dynamic data fetching
  const [activeIndex, setActiveIndex] = useState(0);
  const [scheduleToday, setScheduleToday] = useState<ScheduleItem[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAnyActiveSession, setHasAnyActiveSession] = useState(false);

  // States for the configuration modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configuringClass, setConfiguringClass] = useState<ScheduleItem | null>(null);
  const [onlineMode, setOnlineMode] = useState(false);
  const [faceIdRequired, setFaceIdRequired] = useState(true);
  const [locationRequired, setLocationRequired] = useState(true);

  const handleStartSessionClick = (cls: ScheduleItem) => {
    setConfiguringClass(cls);
    // Reset configurations to default
    setOnlineMode(false);
    setFaceIdRequired(true);
    setLocationRequired(true);
    setShowConfigModal(true);
  };

  //Dynamic date formatting
  const currentDateFormatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const fetchDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      throw new Error("Not authenticated");
    }

    // Fetch Lecturer Name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Fetch Classes via FastAPI
    const response = await lecturerService.getClasses();
    return {
      profile,
      classes: response.classes || []
    };
  };

  const { data: dashboardData, isLoading: isSwrLoading, mutate } = useSWR('lecturerDashboard', fetchDashboardData, {
    revalidateOnFocus: true,
  });

  useEffect(() => {
    if (!dashboardData) return;

    if (dashboardData.profile?.full_name) {
      setLecturerName(dashboardData.profile.full_name);
    }

    const classesData = dashboardData.classes;

        const processedClasses = classesData.map((cls: any) => {
          const subjectName = cls.subjects?.name || "Unknown Class";
          const subjectCode = cls.subjects?.code || "UNK101";

          // Format start_time and end_time
          const formatTimeStr = (timeStr: string | null) => {
            if (!timeStr) return "";
            const parts = timeStr.split(':');
            if (!parts[0] || !parts[1]) return timeStr;
            const hr = parseInt(parts[0], 10);
            const ampm = hr >= 12 ? 'PM' : 'AM';
            const displayHr = hr % 12 === 0 ? 12 : hr % 12;
            return `${displayHr}:${parts[1]} ${ampm}`;
          };

          const formattedTimeRange = cls.start_time && cls.end_time
            ? `${formatTimeStr(cls.start_time)} - ${formatTimeStr(cls.end_time)}`
            : (cls.type === 'Lecture' ? '10:00 AM - 12:00 PM' : '2:00 PM - 3:00 PM');

          const formattedDayTime = cls.day_of_week
            ? `${cls.day_of_week} • ${formattedTimeRange}`
            : formattedTimeRange;

          return {
            id: cls.id,
            title: `${subjectCode} - ${subjectName}`,
            group: cls.group_code,
            time: formattedDayTime,
            location: cls.location || (cls.type === 'Lecture' ? 'Lecture Hall 3' : 'Computer Lab 2'),
            status: cls.active_session ? 'Ongoing' : 'Scheduled',
            critical: cls.stats?.critical_count || 0,
            atRisk: cls.stats?.at_risk_count || 0,
            attendance: cls.stats?.average_attendance || 100,
            type: cls.type,
            dayOfWeek: cls.day_of_week,
            startTime: cls.start_time,
            endTime: cls.end_time,
            activeSessionId: cls.active_session?.id || null,
            activeSessionPin: cls.active_session?.session_pin || null,
            activeOnlineMode: cls.active_session?.online_mode || false,
            activeFaceIdRequired: cls.active_session?.face_id_required || false,
            activeLocationRequired: cls.active_session?.location_required || false
          };
        });

        // Dynamic schedule filtering by current day
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const todayDayOfWeek = days[new Date().getDay()];

        const todayClasses = processedClasses.filter((cls: any) => cls.dayOfWeek === todayDayOfWeek);
        todayClasses.sort((a: any, b: any) => (a.startTime || "").localeCompare(b.startTime || ""));

        // Fallback: sort all classes by day-of-week index & starting time
        const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const fallbackClasses = [...processedClasses].sort((a: any, b: any) => {
          const dayA = dayOrder.indexOf(a.dayOfWeek || "");
          const dayB = dayOrder.indexOf(b.dayOfWeek || "");
          if (dayA !== dayB) return dayA - dayB;
          return (a.startTime || "").localeCompare(b.startTime || "");
        });

        const displaySchedule = todayClasses.length > 0 ? todayClasses : fallbackClasses;
        const slicedSchedule = displaySchedule.slice(0, 3);

        // Find index of ongoing or closest upcoming class in the today list
        const currentTime = new Date().toLocaleTimeString('en-GB', { hour12: false });
        let activeIdx = 0;

        if (todayClasses.length > 0) {
          const firstUpcomingOrOngoing = todayClasses.findIndex((cls: any) => {
            const start = cls.startTime || "00:00:00";
            let end = cls.endTime || "";
            if (!end) {
              const startHr = parseInt(start.split(':')[0] || "0", 10);
              end = `${String((startHr + 2) % 24).padStart(2, '0')}:${start.split(':')[1] || "00"}:00`;
            }
            const isOngoing = currentTime >= start && currentTime <= end;
            const isUpcoming = currentTime < start;
            return isOngoing || isUpcoming;
          });

          if (firstUpcomingOrOngoing !== -1) {
            activeIdx = firstUpcomingOrOngoing;
          } else {
            activeIdx = todayClasses.length - 1; 
          }
        }

        const finalActiveIdx = Math.min(activeIdx, Math.max(0, slicedSchedule.length - 1));

        setScheduleToday(slicedSchedule);
        setActiveIndex(finalActiveIdx);
        setAssignedClasses(processedClasses);
        setHasAnyActiveSession(processedClasses.some((c: any) => !!c.activeSessionId));
        setIsLoading(false);
  }, [dashboardData]);

  // Realtime subscription to invalidate SWR cache instantly on DB changes
  useEffect(() => {
    const channel = supabase.channel('lecturer_dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => {
        mutate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
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

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto bg-[#FAF9F6] flex flex-col p-8">
        <div className="w-64 h-10 bg-slate-200 rounded-lg animate-pulse mb-2"></div>
        <div className="w-48 h-5 bg-slate-200 rounded-lg animate-pulse mb-8"></div>
        
        <div className="w-full h-[450px] bg-slate-200 rounded-3xl animate-pulse mb-10"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm animate-pulse h-48 flex flex-col justify-between">
              <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
              <div className="w-3/4 h-6 bg-slate-200 rounded-lg"></div>
              <div className="w-full h-12 bg-slate-50 rounded-xl mt-4"></div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-transparent flex flex-col">

      {/* 3D CAROUSEL */}
      <div className="relative w-full h-[55vh] min-h-[450px] flex items-center justify-center overflow-hidden bg-transparent rounded-b-[3rem] mb-10 pt-4">

        {/* Header Overlay */}
        <div className="absolute top-8 left-10 z-40">
          <h2 className="text-3xl font-semibold text-slate-900">Welcome back, {lecturerName}</h2>
          <p className="text-slate-500 mt-1">{currentDateFormatted}</p>
        </div>

        {scheduleToday.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-10 z-40 bg-white/80 backdrop-blur border border-slate-200 p-3 rounded-full shadow-lg text-slate-700 hover:bg-white hover:scale-110 transition-all"
            >
              <ChevronLeft size={24} />
            </button>

            <button
              onClick={nextSlide}
              className="absolute right-10 z-40 bg-white/80 backdrop-blur border border-slate-200 p-3 rounded-full shadow-lg text-slate-700 hover:bg-white hover:scale-110 transition-all"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* 3D Track */}
        <div className="relative w-full max-w-4xl h-[350px] flex items-center justify-center perspective-[1200px]">
          {scheduleToday.length === 0 ? (
            <div className="relative z-30">
              <EmptyState 
                icon={BookOpen}
                title="No Classes Today"
                description="You don't have any classes scheduled. Enjoy your day off!"
              />
            </div>
          ) : (
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
              <BorderGlow
                key={cls.id}
                onClick={() => !isCenter && setActiveIndex(index)}
                backgroundColor="#ffffff"
                borderRadius={24}
                glowColor="220 90 60"
                colors={['#3b82f6', '#8b5cf6', '#6366f1']}
                animated={isCenter}
                className={`absolute w-full max-w-2xl p-8 transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${transformClasses}`}
              >
                <div className="relative z-10 flex flex-col justify-between h-full gap-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full ${isCenter ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                        {cls.status} • {cls.time}
                      </span>
                      <h3 className="text-3xl font-bold text-slate-900 mt-4">{cls.title}</h3>
                      <p className="text-slate-500 text-lg mt-1">{cls.group} • {cls.location}</p>
                    </div>

                    {isCenter && (
                      cls.activeSessionId ? (
                        <button
                          onClick={() => router.push(`/attendance/active?sessionId=${cls.activeSessionId}&classId=${cls.id}&onlineMode=${cls.activeOnlineMode}&faceIdRequired=${cls.activeFaceIdRequired}&locationRequired=${cls.activeLocationRequired}`)}
                          className="flex flex-col items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-2xl font-semibold shadow-md shadow-emerald-200 transition-all active:scale-95 cursor-pointer border-none animate-pulse"
                        >
                          <QrCode size={28} />
                          <span className="text-sm">Ongoing Session</span>
                        </button>
                      ) : hasAnyActiveSession ? (
                        <button
                          disabled
                          className="flex flex-col items-center justify-center gap-2 bg-slate-200 text-slate-400 px-6 py-4 rounded-2xl font-semibold cursor-not-allowed border-none shadow-none text-center"
                        >
                          <QrCode size={28} />
                          <span className="text-sm">Another session is ongoing</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartSessionClick(cls)}
                          className="flex flex-col items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-semibold shadow-md shadow-blue-200 transition-all active:scale-95 cursor-pointer border-none"
                        >
                          <QrCode size={28} />
                          <span className="text-sm">Start Session</span>
                        </button>
                      )
                    )}
                  </div>

                  <div className={`grid grid-cols-3 gap-4 border-t border-slate-100 pt-6 transition-opacity duration-500 ${isCenter ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                      <div className="flex items-center gap-1.5 text-red-700 text-xs font-bold uppercase mb-1">
                        <AlertTriangle size={14} /> Critical
                      </div>
                      <div className="text-2xl font-black text-red-700">{cls.critical}</div>
                    </div>

                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                      <div className="flex items-center gap-1.5 text-orange-700 text-xs font-bold uppercase mb-1">
                        <TrendingDown size={14} /> At-Risk
                      </div>
                      <div className="text-2xl font-black text-orange-700">{cls.atRisk}</div>
                    </div>

                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold uppercase mb-1">
                        Attendance
                      </div>
                      <div className="text-2xl font-black text-emerald-700">{cls.attendance}%</div>
                    </div>
                  </div>
                </div>
              </BorderGlow>
            );
          })
          )}
        </div>
      </div>

      {/* 2. BOTTOM HALF: ALL ASSIGNED CLASSES GRID */}
      <div className="px-10 pb-10">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">All Assigned Classes</h3>
            <p className="text-sm text-slate-500 mt-1">Semester 1 • Academic Year 2025/2026</p>
          </div>
        </div>

        {assignedClasses.length === 0 ? (
          <EmptyState 
            icon={BookOpen}
            title="No Assigned Classes"
            description="You have no classes assigned for this semester. Please contact administration."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {assignedClasses.map((item) => {
              const Icon = getClassIcon(item.type);
              return (
                <Link
                  href={`/classes?classId=${item.id}`}
                  key={item.id}
                  className="block group rounded-2xl"
                >
                  <BorderGlow
                    backgroundColor="#ffffff"
                    borderRadius={16}
                    glowColor="220 90 60"
                    colors={['#3b82f6', '#8b5cf6', '#6366f1']}
                    className="p-5 shadow-sm transition-all duration-300"
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
                        <span className="text-slate-500">Overall Attendance</span>
                        <span className={`font-bold ${item.attendance < 90 ? 'text-orange-600' : 'text-emerald-600'}`}>
                          {item.attendance}%
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

      {/* Session Configuration Modal */}
      {showConfigModal && configuringClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 p-6 text-white relative">
              <button
                onClick={() => setShowConfigModal(false)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors border-none cursor-pointer"
              >
                <X size={20} />
              </button>
              <span className="text-xs font-bold tracking-wider uppercase bg-blue-600 text-white px-3 py-1 rounded-full">
                Session Setup
              </span>
              <h2 className="text-2xl font-bold mt-3">{configuringClass.title}</h2>
              <p className="text-slate-400 mt-1">{configuringClass.group} • {configuringClass.location} • {configuringClass.time}</p>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6">
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
                    const data = await api.post("/api/sessions/start", {
                      class_id: configuringClass.id,
                      opened_at: new Date().toISOString(),
                      online_mode: onlineMode,
                      face_id_required: faceIdRequired,
                      location_required: !onlineMode && locationRequired,
                      geo_lat: 3.115,
                      geo_lng: 101.655,
                      geo_radius_meters: 50
                    });

                    if (data.status === "active_exists") {
                      router.push(`/attendance/active?sessionId=${data.session.id}&classId=${configuringClass.id}`);
                      setShowConfigModal(false);
                      return;
                    }

                    const newSession = data.session;

                    // Save active session settings in localStorage
                    const sessionSettings = {
                      sessionId: newSession.id,
                      classId: configuringClass.id,
                      onlineMode: newSession.online_mode,
                      faceIdRequired: newSession.face_id_required,
                      locationRequired: newSession.location_required,
                      sessionPin: newSession.session_pin
                    };
                    localStorage.setItem('activeSessionConfig', JSON.stringify(sessionSettings));

                    // Redirect to Active Attendance page with config query params
                    router.push(`/attendance/active?sessionId=${newSession.id}&classId=${configuringClass.id}&onlineMode=${newSession.online_mode}&faceIdRequired=${newSession.face_id_required}&locationRequired=${newSession.location_required}`);
                    setShowConfigModal(false);
                  } catch (err: any) {
                    console.error("FastAPI error starting session:", err);
                    alert("Error calling server: " + (err.detail || err.message || "Unknown error"));
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