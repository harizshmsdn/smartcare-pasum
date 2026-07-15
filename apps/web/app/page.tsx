// apps/web/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../utils/supabase/client";
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

  //useEffect block ready for Supabase data fetching
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // Fetch Lecturer Name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        if (profile?.full_name) {
          setLecturerName(profile.full_name);
        }

        // Fetch Classes
        const { data: classesData } = await supabase
          .from('classes')
          .select(`
            id,
            group_code,
            type,
            semester,
            subjects (
              code,
              name
            )
          `)
          .eq('lecturer_id', user.id);

        const processedClasses = await Promise.all((classesData || []).map(async (cls) => {
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('current_attendance_rate')
            .eq('class_id', cls.id);

          const totalEnrollments = enrollments?.length || 0;
          const avgAttendance = totalEnrollments > 0 
            ? Math.round((enrollments || []).reduce((sum, e) => sum + Number(e.current_attendance_rate), 0) / totalEnrollments) 
            : 100;

          const criticalCount = enrollments?.filter(e => Number(e.current_attendance_rate) < 80).length || 0;
          const atRiskCount = enrollments?.filter(e => Number(e.current_attendance_rate) >= 80 && Number(e.current_attendance_rate) < 90).length || 0;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const subjectNode = cls.subjects as any;
          const subjectName = subjectNode?.name || "Unknown Class";
          const subjectCode = subjectNode?.code || "UNK101";

          return {
            id: cls.id,
            title: `${subjectCode} - ${subjectName}`,
            group: cls.group_code,
            time: cls.type === 'Lecture' ? '10:00 AM - 12:00 PM' : cls.type === 'Tutorial' ? '2:00 PM - 3:00 PM' : '4:00 PM - 6:00 PM',
            location: cls.type === 'Lecture' ? 'Lecture Hall 3' : cls.type === 'Tutorial' ? 'Tutorial Room 1' : 'Computer Lab 2',
            status: 'Scheduled',
            critical: criticalCount,
            atRisk: atRiskCount,
            attendance: avgAttendance,
            type: cls.type
          };
        }));

        setScheduleToday(processedClasses.slice(0, 3));
        setAssignedClasses(processedClasses);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextSlide = () => {
    setActiveIndex((prev) => (prev === scheduleToday.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev === 0 ? scheduleToday.length - 1 : prev - 1));
  };

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center">Loading dashboard...</div>;
  }

  return (
    <main className="flex-1 overflow-y-auto bg-transparent flex flex-col">
      
      {/* 3D CAROUSEL */}
      <div className="relative w-full h-[55vh] min-h-[450px] flex items-center justify-center overflow-hidden bg-slate-900/5 rounded-b-[3rem] shadow-inner mb-10 pt-4">
        
        {/* Header Overlay */}
        <div className="absolute top-8 left-10 z-40">
          <h2 className="text-3xl font-semibold text-slate-900">Welcome back, {lecturerName}</h2>
          <p className="text-slate-500 mt-1">{currentDateFormatted}</p>
        </div>

        {/* Carousel Navigation Arrows */}
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

        {/* 3D Track */}
        <div className="relative w-full max-w-4xl h-[350px] flex items-center justify-center perspective-[1200px]">
          {scheduleToday.map((cls, index) => {
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
                      <h3 className="text-3xl font-bold text-slate-900 mt-4">{cls.title}</h3>
                      <p className="text-slate-500 text-lg mt-1">{cls.group} • {cls.location}</p>
                    </div>
                    
                    {isCenter && (
                      <button 
                        onClick={() => handleStartSessionClick(cls)}
                        className="flex flex-col items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-semibold shadow-md shadow-blue-200 transition-all active:scale-95 cursor-pointer border-none"
                      >
                        <QrCode size={28} />
                        <span className="text-sm">Start Session</span>
                      </button>
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
              </div>
            );
          })}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {assignedClasses.map((item) => {
            const Icon = getClassIcon(item.type);
            return (
              <Link 
                href={`/classes?classId=${item.id}`} 
                key={item.id} 
                className="block bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2.5 rounded-xl ${
                    item.type === 'Lecture' ? 'bg-indigo-100 text-indigo-600' :
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
              </Link>
            );
          })}
        </div>
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
                    className={`flex flex-col p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                      !onlineMode 
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
                    className={`flex flex-col p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                      onlineMode 
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
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        faceIdRequired ? "bg-blue-600" : "bg-slate-200"
                      } ${onlineMode ? "cursor-not-allowed" : ""}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          faceIdRequired ? "translate-x-5" : "translate-x-0"
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
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        locationRequired ? "bg-blue-600" : "bg-slate-200"
                      } ${onlineMode ? "cursor-not-allowed" : ""}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          locationRequired ? "translate-x-5" : "translate-x-0"
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
                  const sessionPin = Math.floor(1000 + Math.random() * 9000).toString() + '-X';
                  
                  // Insert active session into Supabase
                  const { data: newSession, error: sessionError } = await supabase
                    .from('attendance_sessions')
                    .insert({
                      class_id: configuringClass.id,
                      opened_at: new Date().toISOString(),
                      session_pin: sessionPin,
                      geo_lat: 3.115,
                      geo_lng: 101.655,
                      geo_radius_meters: 50
                    })
                    .select()
                    .single();

                  if (sessionError) {
                    console.error("Failed to start session:", sessionError);
                    return;
                  }

                  // Save active session settings in localStorage
                  const sessionSettings = {
                    sessionId: newSession.id,
                    classId: configuringClass.id,
                    onlineMode,
                    faceIdRequired: !onlineMode && faceIdRequired,
                    locationRequired: !onlineMode && locationRequired,
                    sessionPin: sessionPin
                  };
                  localStorage.setItem('activeSessionConfig', JSON.stringify(sessionSettings));
                  
                  // Redirect to Active Attendance page with config query params
                  router.push(`/attendance/active?sessionId=${newSession.id}&classId=${configuringClass.id}&onlineMode=${onlineMode}&faceIdRequired=${sessionSettings.faceIdRequired}&locationRequired=${sessionSettings.locationRequired}`);
                  setShowConfigModal(false);
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