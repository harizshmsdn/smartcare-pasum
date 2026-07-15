// apps/web/app/attendance/active/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  QrCode, 
  X, 
  Users, 
  MapPin, 
  ScanFace, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowLeft,
  UserPlus,
  Laptop,
  Check
} from "lucide-react";
import { createClient } from "../../../utils/supabase/client";

interface Attendee {
  id: string;
  name: string;
  time: string;
  faceVerified: boolean;
  locationVerified: boolean;
  manual: boolean;
}

export default function ActiveAttendancePage() {
  const supabase = createClient();
  const [showQrModal, setShowQrModal] = useState(true);

  const [sessionId, setSessionId] = useState<string>("");

  const [onlineMode, setOnlineMode] = useState(false);
  const [faceIdRequired, setFaceIdRequired] = useState(true);
  const [locationRequired, setLocationRequired] = useState(true);
  const [sessionPin, setSessionPin] = useState("8492-X");
  const [className, setClassName] = useState("Physics 101");
  const [classGroup, setClassGroup] = useState("Group A");
  
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [liveAttendees, setLiveAttendees] = useState<Attendee[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [absentStudents, setAbsentStudents] = useState<any[]>([]);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [lecturerId, setLecturerId] = useState<string>("");

  useEffect(() => {
    let activeSessionId = "";
    let activeClassId = "";
    const savedConfig = localStorage.getItem('activeSessionConfig');
    
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        activeSessionId = config.sessionId || "";
        activeClassId = config.classId || "";
        setSessionId(activeSessionId);
        setOnlineMode(!!config.onlineMode);
        setFaceIdRequired(config.faceIdRequired !== false);
        setLocationRequired(config.locationRequired !== false);
        setSessionPin(config.sessionPin || "8492-X");
      } catch (e) {
        console.error(e);
      }
    }

    const loadSessionData = async () => {
      // Get Lecturer UID
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setLecturerId(user.id);

      if (!activeSessionId) return;

      // 1. Fetch Session Info
      const { data: session } = await supabase
        .from('attendance_sessions')
        .select(`
          session_pin,
          classes (
            group_code,
            subjects (
              name
            )
          )
        `)
        .eq('id', activeSessionId)
        .single();

      if (session) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const classNode = session.classes as any;
        if (classNode) {
          setClassName(classNode.subjects?.name || "Physics 101");
          setClassGroup(classNode.group_code || "Group A");
        }
      }

      // 2. Fetch Enrollments count
      if (activeClassId) {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select(`
            student_id,
            profiles (
              id,
              full_name,
              institutional_id
            )
          `)
          .eq('class_id', activeClassId);

        if (enrollments) {
          setTotalStudentsCount(enrollments.length);
          // Store all enrolled students for check-in override dropdown
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAbsentStudents(enrollments.map((e: any) => e.profiles));
        }
      }
    };
    loadSessionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch Check-ins regularly (Polled or Real-time)
  useEffect(() => {
    if (!sessionId) return;

    const fetchCheckins = async () => {
      const { data: records } = await supabase
        .from('attendance_records')
        .select(`
          logged_at,
          face_verified,
          location_verified,
          verified_by_lecturer_id,
          profiles (
            id,
            full_name,
            institutional_id
          )
        `)
        .eq('session_id', sessionId);

      if (records) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formatted = records.map((r: any) => ({
          id: r.profiles?.institutional_id || "",
          name: r.profiles?.full_name || "Unknown Student",
          time: new Date(r.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          faceVerified: !!r.face_verified,
          locationVerified: !!r.location_verified,
          manual: !!r.verified_by_lecturer_id
        }));
        setLiveAttendees(formatted);

        setAbsentStudents(prev => 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          prev.filter(student => !records.some((r: any) => r.profiles?.id === student.id))
        );
      }
    };

    fetchCheckins();
    const interval = setInterval(fetchCheckins, 5000); // Poll every 5s for live simulation
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleManualOverride = async (studentProfile: any) => {
    if (!sessionId || !studentProfile) return;

    try {
      const { error } = await supabase
        .from('attendance_records')
        .insert({
          session_id: sessionId,
          student_id: studentProfile.id,
          face_verified: true,
          location_verified: true,
          status: 'present',
          verified_by_lecturer_id: lecturerId
        });

      if (error) {
        console.error("Failed override insert:", error);
        return;
      }

      setShowOverrideModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-slate-50 relative">
      
      {/* --- QR CODE OVERLAY MODAL --- */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-blue-600 p-6 text-center text-white relative">
              <button 
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="text-2xl font-bold">Physics 101 - Group A</h2>
              <p className="text-blue-100 mt-1">Scan to register attendance via SMART-CARE</p>
            </div>
            
            <div className="p-10 flex flex-col items-center">
              {/* Placeholder for actual generated QR */}
              <div className="w-64 h-64 bg-white border-8 border-slate-900 rounded-xl flex items-center justify-center relative overflow-hidden mb-6 shadow-sm">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-900 to-transparent background-size-[10px_10px]"></div>
                <QrCode size={180} className="text-slate-900 z-10" strokeWidth={1} />
                <div className="absolute center bg-blue-600 rounded-lg p-2 z-20">
                  <span className="text-white font-bold text-xs">PASUM</span>
                </div>
              </div>
              
              <div className="text-center w-full">
                <p className="text-slate-500 font-mono text-sm tracking-widest bg-slate-100 py-3 rounded-xl mb-6">
                  SESSION-PIN: <span className="font-bold text-slate-800 text-lg">{sessionPin}</span>
                </p>
                <button 
                  onClick={() => setShowQrModal(false)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-4 rounded-xl transition-colors"
                >
                  Close QR & View Live Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* --- END QR MODAL --- */}

      {/* --- LIVE DASHBOARD VIEW --- */}
      <div className="mb-6 flex justify-between items-center">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Live Sync Active
        </div>
      </div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">{className} - {classGroup}</h2>
          <div className="flex flex-col gap-2.5 mt-1">
            <p className="text-slate-500 flex items-center gap-2 text-sm">
              <Clock size={16} /> Session PIN: <span className="font-bold text-slate-700">{sessionPin}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {onlineMode ? (
                <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Laptop size={13} /> Online Mode
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Users size={13} /> In-Person Mode
                </span>
              )}
              
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                faceIdRequired 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-250" 
                  : "bg-slate-100 text-slate-500 border-slate-200"
              }`}>
                <ScanFace size={13} /> Face ID: {faceIdRequired ? "Required" : "Bypassed"}
              </span>
              
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                locationRequired 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-250" 
                  : "bg-slate-100 text-slate-500 border-slate-200"
              }`}>
                <MapPin size={13} /> GPS Location: {locationRequired ? "Required" : "Bypassed"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowQrModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition-colors"
          >
            <QrCode size={20} className="text-blue-600" /> Show QR
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-50 text-red-700 border border-red-200 px-5 py-3 rounded-xl font-medium hover:bg-red-100 transition-colors">
            End Session
          </button>
        </div>
      </header>

      {/* Live Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Present Students</p>
            <p className="text-3xl font-bold text-slate-900">
              <span className="text-emerald-600">{liveAttendees.length}</span> <span className="text-lg text-slate-400">/ {totalStudentsCount}</span>
            </p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-full text-emerald-600">
            <Users size={28} />
          </div>
        </div>
        
        {/* Manual Check-in Override / Online Session Banner */}
        {locationRequired ? (
          <div className="md:col-span-2 bg-slate-900 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-white">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <AlertCircle size={20} className="text-blue-400" /> Location/GPS Malfunction?
              </h3>
              <p className="text-slate-400 text-sm mt-1 max-w-md">
                Bypass 3-factor location protocols and manually check-in a student if their device is unable to retrieve GPS coordinates.
              </p>
            </div>
            <button 
              onClick={() => setShowOverrideModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer border-none"
            >
              <UserPlus size={18} /> Manual Override
            </button>
          </div>
        ) : (
          <div className="md:col-span-2 bg-indigo-900 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-white">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Laptop size={20} className="text-indigo-300" /> Remote Session Active
              </h3>
              <p className="text-indigo-200 text-sm mt-1 max-w-md">
                GPS Location validation is disabled for this session. Students can check in online from any location.
              </p>
            </div>
            <div className="bg-indigo-800 text-indigo-100 border border-indigo-700 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap">
              GPS Bypass Enabled
            </div>
          </div>
        )}
      </div>

      {/* Live Feed Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-900">Live Check-in Feed</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Time Logged</th>
                <th className="p-4 font-medium text-center">Face ID</th>
                <th className="p-4 font-medium text-center">GPS Auth</th>
                <th className="p-4 font-medium text-right">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {liveAttendees.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors bg-white">
                  <td className="p-4">
                    <div>
                      <p className="font-semibold text-slate-900">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.id}</p>
                    </div>
                  </td>
                  <td className="p-4 font-medium text-slate-700">{student.time}</td>
                  <td className="p-4 text-center">
                    {!faceIdRequired ? (
                      <span className="inline-flex items-center bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[11px] font-semibold mx-auto border border-slate-200">
                        Bypassed
                      </span>
                    ) : student.faceVerified ? (
                      <CheckCircle2 size={20} className="text-emerald-500 mx-auto" />
                    ) : (
                      <AlertCircle size={20} className="text-slate-300 mx-auto" />
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {!locationRequired ? (
                      <span className="inline-flex items-center bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[11px] font-semibold mx-auto border border-slate-200">
                        Bypassed
                      </span>
                    ) : student.locationVerified ? (
                      <CheckCircle2 size={20} className="text-emerald-500 mx-auto" />
                    ) : (
                      <AlertCircle size={20} className="text-red-500 mx-auto" />
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {student.manual ? (
                      <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-md text-xs font-semibold">
                        Lecturer Override
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md text-xs font-semibold">
                        System Authed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Manual Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <UserPlus size={20} />
                Manual Override Check-in
              </h3>
              <button 
                onClick={() => setShowOverrideModal(false)}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full border-none text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {absentStudents.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500">SELECT ABSENT STUDENT TO CHECK IN:</p>
                  {absentStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => handleManualOverride(student)}
                      className="w-full flex items-center justify-between p-3.5 border border-slate-200 hover:border-blue-500 rounded-xl hover:bg-blue-50/50 transition-all text-left font-sans cursor-pointer group"
                    >
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{student.full_name}</p>
                        <p className="text-xs text-slate-500">{student.institutional_id}</p>
                      </div>
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all flex items-center gap-1">
                        Check In <Check size={12} />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-6">All enrolled students have checked in.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}