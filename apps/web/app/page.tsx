// apps/web/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../utils/supabase/client";
import { lecturerService } from "../lib/services/lecturer";
import { api } from "../lib/api";
import { PixelIcon } from "../components/PixelIcon";
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
  critical: number | string;
  atRisk: number | string;
  attendance: number | string;
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
  attendance: number | string;
}

// Helper function to map class type to PixelIcon name
const getClassIconName = (type: string) => {
  switch (type.toLowerCase()) {
    case "lecture":
      return "classes";
    case "tutorial":
      return "book";
    case "lab":
      return "chart";
    default:
      return "classes";
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
        critical: cls.stats?.critical_count !== undefined ? cls.stats.critical_count : "-",
        atRisk: cls.stats?.at_risk_count !== undefined ? cls.stats.at_risk_count : "-",
        attendance: cls.stats?.average_attendance !== undefined ? cls.stats.average_attendance : "-",
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
      <main className="flex-1 overflow-y-auto bg-transparent flex flex-col p-6 lg:p-8 text-white">
        <div className="w-64 h-8 bg-white/10 rounded-none animate-pulse mb-2"></div>
        <div className="w-48 h-4 bg-white/10 rounded-none animate-pulse mb-8"></div>
        <div className="w-full h-[400px] border border-white/15 bg-white/5 rounded-none animate-pulse mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-white/15 bg-white/5 p-5 rounded-none animate-pulse h-44"></div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-transparent flex flex-col text-white">
      {/* 3D CAROUSEL SECTION */}
      <div className="relative w-full h-[55vh] min-h-[440px] flex items-center justify-center overflow-hidden bg-transparent mb-6 pt-4">

        {/* Header Overlay */}
        <div className="absolute top-6 left-8 lg:left-10 z-40">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">PASUM</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">Welcome back, {lecturerName}</h2>
          <p className="text-xs text-white/60 mt-0.5">{currentDateFormatted}</p>
        </div>

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
          {scheduleToday.length === 0 ? (
            <div className="relative z-30 w-full px-6">
              <EmptyState
                icon={() => <PixelIcon name="classes" size={36} className="text-white/40" />}
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
              } else if ((isRight && Math.abs(offset) === 1) || (activeIndex === scheduleToday.length - 1 && index === 0)) {
                transformClasses = "translate-x-[35%] scale-75 opacity-60 z-20 blur-[2px] shadow-lg cursor-pointer hover:opacity-90 hover:blur-none";
              } else if ((isLeft && Math.abs(offset) === 1) || (activeIndex === 0 && index === scheduleToday.length - 1)) {
                transformClasses = "-translate-x-[35%] scale-75 opacity-60 z-20 blur-[2px] shadow-lg cursor-pointer hover:opacity-90 hover:blur-none";
              }

              return (
                <div
                  key={cls.id}
                  onClick={() => !isCenter && setActiveIndex(index)}
                  className={`absolute w-full max-w-2xl p-6 lg:p-8 border border-white/20 bg-[#08090c]/90 backdrop-blur-md rounded-none transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${transformClasses}`}
                >
                  <div className="relative z-10 flex flex-col justify-between h-full gap-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-[11px] uppercase tracking-wider px-2.5 py-1 border rounded-none font-semibold ${isCenter
                          ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300 font-bold'
                          : 'border-white/10 bg-white/5 text-white/50'
                          }`}>
                          {cls.status} • {cls.time}
                        </span>
                        <h3 className="text-2xl lg:text-3xl font-bold text-white mt-3">{cls.title}</h3>
                        <p className="text-sm text-white/60 mt-1">{cls.group} • {cls.location}</p>
                      </div>

                      {isCenter && (
                        cls.activeSessionId ? (
                          <button
                            onClick={() => router.push(`/attendance/active?sessionId=${cls.activeSessionId}&classId=${cls.id}&onlineMode=${cls.activeOnlineMode}&faceIdRequired=${cls.activeFaceIdRequired}&locationRequired=${cls.activeLocationRequired}`)}
                            className="flex flex-col items-center justify-center gap-1.5 border border-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-5 py-3 rounded-none text-xs uppercase tracking-wider transition-all cursor-pointer animate-pulse font-medium"
                          >
                            <PixelIcon name="qrCode" size={24} />
                            <span>Ongoing Session</span>
                          </button>
                        ) : hasAnyActiveSession ? (
                          <button
                            disabled
                            className="flex flex-col items-center justify-center gap-1.5 border border-white/10 bg-white/5 text-white/30 px-5 py-3 rounded-none text-xs uppercase tracking-wider cursor-not-allowed text-center font-medium"
                          >
                            <PixelIcon name="qrCode" size={24} />
                            <span>Session In Progress</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartSessionClick(cls)}
                            className="flex flex-col items-center justify-center gap-1.5 border border-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-5 py-3 rounded-none text-xs uppercase tracking-wider transition-all cursor-pointer font-medium"
                          >
                            <PixelIcon name="qrCode" size={24} />
                            <span>Start Session</span>
                          </button>
                        )
                      )}
                    </div>

                    <div className={`grid grid-cols-3 gap-3 border-t border-white/10 pt-4 transition-opacity duration-500 ${isCenter ? 'opacity-100' : 'opacity-40'}`}>
                      <div className="border border-red-500/30 bg-red-500/10 p-3 rounded-none">
                        <div className="flex items-center gap-1.5 text-red-300 text-[10px] font-bold uppercase mb-1">
                          <PixelIcon name="warning" size={12} className="text-red-400" /> Critical
                        </div>
                        <div className="text-2xl font-black text-red-400">{cls.critical}</div>
                      </div>

                      <div className="border border-amber-500/30 bg-amber-500/10 p-3 rounded-none">
                        <div className="flex items-center gap-1.5 text-amber-300 text-[10px] font-bold uppercase mb-1">
                          <PixelIcon name="warning" size={12} className="text-amber-400" /> At-Risk
                        </div>
                        <div className="text-2xl font-black text-amber-400">{cls.atRisk}</div>
                      </div>

                      <div className="border border-emerald-500/30 bg-emerald-500/10 p-3 rounded-none">
                        <div className="flex items-center gap-1.5 text-emerald-300 text-[10px] font-bold uppercase mb-1">
                          <PixelIcon name="check" size={12} className="text-emerald-400" /> Attendance
                        </div>
                        <div className="text-2xl font-black text-emerald-400">{cls.attendance}{cls.attendance !== "-" ? "%" : ""}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. BOTTOM HALF: ALL ASSIGNED CLASSES GRID */}
      <div className="px-6 lg:px-10 pb-10">
        <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs uppercase tracking-wider text-white/90 font-semibold">ALL ASSIGNED CLASSES</span>
            </div>
            <p className="text-xs text-white/50">Semester 1 • Academic Year 2025/2026</p>
          </div>
        </div>

        {assignedClasses.length === 0 ? (
          <EmptyState
            icon={() => <PixelIcon name="classes" size={36} className="text-white/40" />}
            title="No Assigned Classes"
            description="You have no classes assigned for this semester. Please contact administration."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {assignedClasses.map((item) => {
              const iconName = getClassIconName(item.type);
              return (
                <Link
                  href={`/classes?classId=${item.id}`}
                  key={item.id}
                  className="block group rounded-none"
                >
                  <div className="border border-white/15 bg-[#08090c]/80 hover:border-emerald-400/50 backdrop-blur-md p-5 rounded-none shadow-lg transition-colors flex flex-col justify-between h-full">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="border border-white/15 bg-white/5 p-2 rounded-none text-emerald-400">
                          <PixelIcon name={iconName} size={18} />
                        </div>
                        <span className="border border-white/10 bg-white/5 text-[10px] text-white/60 font-bold uppercase tracking-wider px-2 py-0.5 rounded-none">
                          {item.type}
                        </span>
                      </div>

                      <h4 className="font-bold text-white text-base leading-tight mb-2 group-hover:text-emerald-300 transition-colors">
                        {item.title}
                      </h4>
                    </div>

                    <div className="space-y-1.5 mt-4 pt-3 border-t border-white/10 text-xs">
                      <div className="flex items-center gap-2 text-white/60">
                        <PixelIcon name="clock" size={13} className="text-white/40" />
                        <span>{item.time}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-white/50">Attendance</span>
                        <span className={`font-bold ${typeof item.attendance === 'number' && item.attendance < 90 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {item.attendance}{item.attendance !== "-" ? "%" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Session Configuration Modal */}
      {showConfigModal && configuringClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#08090c] rounded-none shadow-2xl w-full max-w-xl overflow-hidden border border-white/20 text-white animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="border-b border-white/15 p-5 relative">
              <button
                onClick={() => setShowConfigModal(false)}
                className="absolute top-4 right-4 border border-white/15 bg-white/5 hover:bg-white/15 p-1.5 rounded-none transition-colors cursor-pointer text-white"
              >
                ✕
              </button>
              <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-400">
                01 // SESSION SETUP
              </span>
              <h2 className="text-xl font-bold mt-1 text-white">{configuringClass.title}</h2>
              <p className="text-xs text-white/60 mt-0.5">{configuringClass.group} • {configuringClass.location} • {configuringClass.time}</p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-xs uppercase tracking-wider text-white/60 mb-2 font-semibold">Choose Attendance Format</h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Option 1: In-Person */}
                  <div
                    onClick={() => {
                      setOnlineMode(false);
                      setFaceIdRequired(true);
                      setLocationRequired(true);
                    }}
                    className={`flex flex-col p-4 border rounded-none cursor-pointer transition-all ${!onlineMode
                      ? "border-emerald-400 bg-emerald-500/15"
                      : "border-white/15 bg-white/5 hover:border-white/30"
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="border border-white/15 bg-white/5 p-2 rounded-none text-emerald-400">
                        <PixelIcon name="users" size={18} />
                      </div>
                      {!onlineMode && (
                        <span className="text-[10px] text-emerald-300 font-bold uppercase border border-emerald-400/40 px-1.5 py-0.5">
                          SELECTED
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-white text-sm">In-Person Class</span>
                    <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
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
                    className={`flex flex-col p-4 border rounded-none cursor-pointer transition-all ${onlineMode
                      ? "border-emerald-400 bg-emerald-500/15"
                      : "border-white/15 bg-white/5 hover:border-white/30"
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="border border-white/15 bg-white/5 p-2 rounded-none text-indigo-400">
                        <PixelIcon name="classes" size={18} />
                      </div>
                      {onlineMode && (
                        <span className="text-[10px] text-emerald-300 font-bold uppercase border border-emerald-400/40 px-1.5 py-0.5">
                          SELECTED
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-white text-sm">Online Class</span>
                    <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
                      Bypasses Face ID and GPS location geofencing checks.
                    </p>
                  </div>
                </div>
              </div>

              {/* Granular Authentication Overrides */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs uppercase tracking-wider text-white/60 font-semibold">
                    Fine-tune Requirements
                  </h3>
                  {onlineMode && (
                    <span className="text-[10px] font-bold text-amber-300 border border-amber-400/30 px-2 py-0.5 uppercase tracking-wider">
                      Overridden for Online Mode
                    </span>
                  )}
                </div>

                <div className="space-y-2.5">
                  {/* Face ID Switch */}
                  <div className={`flex items-center justify-between p-3 border rounded-none ${onlineMode ? 'border-white/10 bg-white/5 opacity-50' : 'border-white/15 bg-white/5'
                    }`}>
                    <div className="flex gap-2.5 items-start">
                      <PixelIcon name="profile" size={16} className={`mt-0.5 ${faceIdRequired ? 'text-emerald-400' : 'text-white/40'}`} />
                      <div>
                        <div className="font-bold text-white text-xs">Face ID verification</div>
                        <div className="text-[10px] text-white/50">Verify facial features against student profiles</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={onlineMode}
                      onClick={() => setFaceIdRequired(!faceIdRequired)}
                      className={`text-[10px] uppercase font-bold px-2.5 py-1 border transition-colors cursor-pointer rounded-none ${faceIdRequired
                        ? "border-emerald-400 bg-emerald-500/30 text-emerald-300"
                        : "border-white/20 bg-black/40 text-white/50"
                        } ${onlineMode ? "cursor-not-allowed" : ""}`}
                    >
                      {faceIdRequired ? "ENABLED" : "DISABLED"}
                    </button>
                  </div>

                  {/* Location Switch */}
                  <div className={`flex items-center justify-between p-3 border rounded-none ${onlineMode ? 'border-white/10 bg-white/5 opacity-50' : 'border-white/15 bg-white/5'
                    }`}>
                    <div className="flex gap-2.5 items-start">
                      <PixelIcon name="pin" size={16} className={`mt-0.5 ${locationRequired ? 'text-emerald-400' : 'text-white/40'}`} />
                      <div>
                        <div className="font-bold text-white text-xs">Location / GPS matching</div>
                        <div className="text-[10px] text-white/50">Verify students are inside lecture hall radius</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={onlineMode}
                      onClick={() => setLocationRequired(!locationRequired)}
                      className={`text-[10px] uppercase font-bold px-2.5 py-1 border transition-colors cursor-pointer rounded-none ${locationRequired
                        ? "border-emerald-400 bg-emerald-500/30 text-emerald-300"
                        : "border-white/20 bg-black/40 text-white/50"
                        } ${onlineMode ? "cursor-not-allowed" : ""}`}
                    >
                      {locationRequired ? "ENABLED" : "DISABLED"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-white/15 p-4 flex justify-end gap-2 bg-black/40 text-xs">
              <button
                onClick={() => setShowConfigModal(false)}
                className="border border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs uppercase px-4 py-2 rounded-none transition-colors cursor-pointer font-medium"
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
                className="border border-emerald-400 bg-emerald-600 hover:bg-emerald-500 text-white text-xs uppercase font-bold px-5 py-2 rounded-none shadow-lg transition-colors cursor-pointer tracking-wider"
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