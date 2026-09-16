// Active Attendance Live Session Tracking in dottxt.ai sharp dark style
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../utils/supabase/client";
import PixelIcon from "../../../components/PixelIcon";

interface Attendee {
  id: string;
  name: string;
  time: string;
  faceVerified: boolean;
  locationVerified: boolean;
  manual: boolean;
}

export default function ActiveAttendancePage() {
  const router = useRouter();
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
  const [absentStudents, setAbsentStudents] = useState<any[]>([]);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get("sessionId") || "";
    const urlClassId = urlParams.get("classId") || "";

    let activeSessionId = urlSessionId;
    let activeClassId = urlClassId;

    if (!activeSessionId) {
      const stored = localStorage.getItem('activeSessionConfig');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          activeSessionId = parsed.sessionId || "";
          activeClassId = activeClassId || parsed.classId || "";
        } catch (e) {
          console.error("Failed to parse activeSessionConfig", e);
        }
      }
    }

    if (!activeSessionId) {
      router.push('/');
      return;
    }

    setSessionId(activeSessionId);

    const loadSessionData = async () => {
      const { data: session } = await supabase
        .from('attendance_sessions')
        .select(`
          id,
          session_pin,
          online_mode,
          face_id_required,
          location_required,
          class_id,
          classes (
            group_code,
            subjects (name)
          )
        `)
        .eq('id', activeSessionId)
        .single();

      if (session) {
        setSessionPin(session.session_pin || "8492-X");
        setOnlineMode(!!session.online_mode);
        setFaceIdRequired(!!session.face_id_required);
        setLocationRequired(!!session.location_required);
        setClassName((session.classes as any)?.subjects?.name || "PASUM Course");
        setClassGroup((session.classes as any)?.group_code || "Group A");

        const targetClassId = session.class_id || activeClassId;
        if (targetClassId) {
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('profiles(id, full_name, institutional_id)')
            .eq('class_id', targetClassId);

          if (enrollments) {
            setTotalStudentsCount(enrollments.length);
            const absentList = enrollments.map((e: any) => e.profiles).filter(Boolean);
            setAbsentStudents(absentList);
          }
        }
      }
    };
    loadSessionData();
  }, []);

  // Poll live check-in feed
  useEffect(() => {
    if (!sessionId) return;

    const fetchCheckins = async () => {
      const { data: records } = await supabase
        .from('attendance_records')
        .select(`
          timestamp,
          face_verified,
          location_verified,
          manual_override,
          profiles (
            id,
            full_name,
            institutional_id
          )
        `)
        .eq('session_id', sessionId);

      if (records) {
        const formatted = records.map((r: any) => ({
          id: r.profiles?.institutional_id || "",
          name: r.profiles?.full_name || "Unknown Student",
          time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          faceVerified: !!r.face_verified,
          locationVerified: !!r.location_verified,
          manual: !!r.manual_override
        }));
        setLiveAttendees(formatted);

        setAbsentStudents(prev =>
          prev.filter(student => !records.some((r: any) => r.profiles?.id === student.id))
        );
      }
    };

    fetchCheckins();
    const interval = setInterval(fetchCheckins, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const handleManualOverride = async (studentProfile: any) => {
    if (!sessionId || !studentProfile) return;

    try {
      const { error } = await supabase
        .from('attendance_records')
        .insert({
          session_id: sessionId,
          student_id: studentProfile.id,
          timestamp: new Date().toISOString(),
          status: 'present',
          face_verified: false,
          location_verified: false,
          manual_override: true
        });

      if (error) {
        alert("Manual Override Failed: " + error.message);
        return;
      }

      setLiveAttendees(prev => [
        {
          id: studentProfile.institutional_id,
          name: studentProfile.full_name,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          faceVerified: false,
          locationVerified: false,
          manual: true
        },
        ...prev
      ]);
      setAbsentStudents(prev => prev.filter(s => s.id !== studentProfile.id));
      setShowOverrideModal(false);
    } catch (err) {
      console.error("Override error:", err);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    try {
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ closed_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) {
        console.error("Failed to end session:", error);
        alert("Error ending session: " + error.message);
        return;
      }

      localStorage.removeItem('activeSessionConfig');
      router.push('/');
    } catch (err) {
      console.error("End session error:", err);
    }
  };

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-transparent text-white relative">
      {/* QR Code Overlay Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-[#09111e] rounded-none shadow-2xl w-full max-w-md overflow-hidden border border-white/20 text-white font-mono text-xs">
            <div className="p-6 border-b border-white/10 text-center relative">
              <button
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 border border-white/10 hover:border-white/30 rounded-none cursor-pointer"
              >
                ✕
              </button>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-none" />
                <span className="text-[10px] text-blue-400 uppercase tracking-wider font-bold">
                  ACTIVE SESSION QR
                </span>
              </div>
              <h2 className="text-xl font-bold uppercase">{className} - {classGroup}</h2>
              <p className="text-[11px] text-slate-400 mt-1">Scan to register attendance via SMART-CARE</p>
            </div>

            <div className="p-8 flex flex-col items-center">
              <div className="w-60 h-60 bg-white border-4 border-white p-2 rounded-none flex items-center justify-center mb-6">
                {sessionPin ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(sessionPin)}`}
                    alt={`QR Code for PIN ${sessionPin}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <PixelIcon name="qrCode" size={140} className="text-black" />
                )}
              </div>

              <div className="text-center w-full">
                <p className="text-slate-300 font-mono text-xs bg-black/40 border border-white/15 py-2.5 rounded-none mb-6">
                  SESSION-PIN: <span className="font-bold text-white text-base tracking-widest">{sessionPin}</span>
                </p>
                <button
                  onClick={() => setShowQrModal(false)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-none border border-blue-400 shadow-lg shadow-blue-900/30 transition-colors uppercase cursor-pointer"
                >
                  Close QR & View Live Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Controls Bar */}
      <div className="mb-6 flex justify-between items-center font-mono text-xs">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          ← BACK TO HOME
        </Link>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 px-3 py-1 rounded-none text-[10px] font-bold uppercase tracking-wider animate-pulse">
          <span className="w-1.5 h-1.5 rounded-none bg-emerald-400" /> LIVE SYNC ACTIVE
        </div>
      </div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-none" />
            <span className="font-mono text-xs text-blue-400 uppercase tracking-wider font-semibold">
              PASUM // LIVE SESSION
            </span>
          </div>
          <h2 className="text-3xl font-bold font-mono tracking-tight uppercase text-white">
            {className} - {classGroup}
          </h2>
          <div className="flex flex-col gap-2 mt-2 font-mono text-xs">
            <p className="text-slate-400 flex items-center gap-2">
              <PixelIcon name="clock" size={14} /> SESSION PIN: <span className="font-bold text-white">{sessionPin}</span>
            </p>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase">
              {onlineMode ? (
                <span className="bg-purple-500/10 text-purple-300 border border-purple-400/30 px-2.5 py-1 rounded-none">
                  ONLINE MODE
                </span>
              ) : (
                <span className="bg-blue-500/10 text-blue-300 border border-blue-400/30 px-2.5 py-1 rounded-none">
                  IN-PERSON MODE
                </span>
              )}

              <span className={`px-2.5 py-1 rounded-none border ${
                faceIdRequired
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-400/30"
                  : "bg-white/5 text-slate-400 border-white/10"
              }`}>
                FACE ID: {faceIdRequired ? "REQUIRED" : "BYPASSED"}
              </span>

              <span className={`px-2.5 py-1 rounded-none border ${
                locationRequired
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-400/30"
                  : "bg-white/5 text-slate-400 border-white/10"
              }`}>
                GPS: {locationRequired ? "REQUIRED" : "BYPASSED"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto font-mono text-xs">
          <button
            onClick={() => setShowQrModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-transparent border border-white/20 text-white px-4 py-2.5 rounded-none hover:bg-white/10 transition-colors cursor-pointer"
          >
            <PixelIcon name="qrCode" size={16} /> SHOW QR
          </button>
          <button
            onClick={handleEndSession}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-400/40 px-4 py-2.5 rounded-none font-bold transition-colors cursor-pointer"
          >
            END SESSION
          </button>
        </div>
      </header>

      {/* Live Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 font-mono">
        <div className="bg-[#09111e]/80 p-6 rounded-none border border-white/15 shadow-xl flex justify-between items-center backdrop-blur-md">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] text-emerald-400 font-bold">01.</span>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Present Students</p>
            </div>
            <p className="text-3xl font-bold text-white mt-1">
              <span className="text-emerald-400">{liveAttendees.length}</span>
              <span className="text-base text-slate-500"> / {totalStudentsCount}</span>
            </p>
          </div>
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 rounded-none">
            <PixelIcon name="profile" size={24} />
          </div>
        </div>

        {/* Manual Check-in Override Banner */}
        <div className="md:col-span-2 bg-[#09111e]/80 p-6 rounded-none border border-white/15 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 backdrop-blur-md">
          <div>
            <h3 className="font-bold text-sm text-white uppercase flex items-center gap-2">
              <PixelIcon name="warning" size={16} className="text-blue-400" />
              Manual Override Check-in
            </h3>
            <p className="text-slate-400 text-xs mt-1 max-w-md">
              Bypass automated multi-factor protocols and manually check-in a student if needed.
            </p>
          </div>
          <button
            onClick={() => setShowOverrideModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-none font-bold text-xs border border-blue-400 shadow-lg shadow-blue-900/30 transition-colors uppercase whitespace-nowrap cursor-pointer"
          >
            + MANUAL OVERRIDE
          </button>
        </div>
      </div>

      {/* Live Feed Table */}
      <div className="bg-[#09111e]/80 border border-white/15 rounded-none shadow-2xl overflow-hidden backdrop-blur-md font-mono text-xs">
        <div className="p-4 border-b border-white/10 bg-black/20 flex justify-between items-center">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">Live Check-in Feed</h3>
          <span className="text-[10px] text-slate-400">{liveAttendees.length} CHECKED IN</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-slate-400 text-[10px] uppercase tracking-wider border-b border-white/10">
                <th className="p-3.5 font-bold">Student</th>
                <th className="p-3.5 font-bold">Time Logged</th>
                <th className="p-3.5 font-bold text-center">Face ID</th>
                <th className="p-3.5 font-bold text-center">GPS Auth</th>
                <th className="p-3.5 font-bold text-right">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {liveAttendees.map((student) => (
                <tr key={student.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3.5">
                    <div>
                      <p className="font-bold text-white">{student.name}</p>
                      <p className="text-[10px] text-slate-400">{student.id}</p>
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-300">{student.time}</td>
                  <td className="p-3.5 text-center">
                    {!faceIdRequired ? (
                      <span className="text-[9px] text-slate-400 uppercase bg-white/5 border border-white/10 px-2 py-0.5 rounded-none">
                        BYPASSED
                      </span>
                    ) : student.faceVerified ? (
                      <span className="text-emerald-400 font-bold text-xs">✓ MATCH</span>
                    ) : (
                      <span className="text-slate-500 text-xs">✕</span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    {!locationRequired ? (
                      <span className="text-[9px] text-slate-400 uppercase bg-white/5 border border-white/10 px-2 py-0.5 rounded-none">
                        BYPASSED
                      </span>
                    ) : student.locationVerified ? (
                      <span className="text-emerald-400 font-bold text-xs">✓ MATCH</span>
                    ) : (
                      <span className="text-rose-400 text-xs">✕</span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    {student.manual ? (
                      <span className="text-[9px] font-bold uppercase bg-amber-500/10 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-none">
                        OVERRIDE
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase bg-white/5 text-slate-300 border border-white/15 px-2 py-0.5 rounded-none">
                        SYSTEM AUTH
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-[#09111e] rounded-none w-full max-w-md shadow-2xl overflow-hidden border border-white/20 font-mono text-xs text-white">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase text-white flex items-center gap-2">
                <PixelIcon name="profile" size={14} />
                Manual Override Check-in
              </h3>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="text-slate-400 hover:text-white p-1 border border-white/10 hover:border-white/30 rounded-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {absentStudents.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                    Select Absent Student to Check-in:
                  </p>
                  {absentStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => handleManualOverride(student)}
                      className="w-full flex items-center justify-between p-3 border border-white/10 hover:border-white/30 bg-black/20 hover:bg-white/5 transition-all text-left font-mono cursor-pointer rounded-none"
                    >
                      <div>
                        <p className="font-bold text-white text-xs">{student.full_name}</p>
                        <p className="text-[10px] text-slate-400">{student.institutional_id}</p>
                      </div>
                      <span className="text-[10px] font-bold text-blue-300 bg-blue-600/20 border border-blue-400/30 px-2 py-1 rounded-none">
                        CHECK IN →
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-6 text-xs">All enrolled students have checked in.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}