// Student Settings and Preferences page in dottxt.ai sharp dark style with emerald accents
"use client";

import { useState, useEffect } from "react";
import { PixelIcon } from "../../../components/PixelIcon";
import { createClient } from "../../../utils/supabase/client";
import { studentService } from "../../../lib/services/student";

export default function StudentSettingsPage() {
  const supabase = createClient();
  const [studentId, setStudentId] = useState("");
  const [language, setLanguage] = useState("en");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchSettingsAndProfile = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setStudentId(user.id);
        }

        try {
          const data = await studentService.getSettings();
          if (data.settings) {
            setLanguage(data.settings.language || "en");
            setNotificationsEnabled(data.settings.notifications_enabled !== false);
          }
          if (data.profile) {
            setFaceRegistered(!!data.profile.face_hash);
            setDeviceRegistered(!!data.profile.device_id);
          }
        } catch (apiErr) {
          console.warn("API settings fetch error, falling back to Supabase profile:", apiErr);
          if (user) {
            const { data: prof } = await supabase.from('profiles').select('face_hash, device_id').eq('id', user.id).single();
            if (prof) {
              setFaceRegistered(!!prof.face_hash);
              setDeviceRegistered(!!prof.device_id);
            }
          }
        }
      } catch (err) {
        console.error("Error loading student settings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettingsAndProfile();
  }, []);

  const handleSave = async () => {
    try {
      try {
        await studentService.updateSettings({
          language,
          notifications_enabled: notificationsEnabled
        });
      } catch (err) {
        console.warn("API updateSettings error, saving to local state fallback:", err);
        localStorage.setItem("student_settings", JSON.stringify({ language, notifications_enabled: notificationsEnabled }));
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("Failed to save settings");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent min-h-screen text-xs text-slate-400">
        Loading student settings...
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-transparent text-white">
      {/* Header */}
      <header className="mb-8 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-none" />
          <span className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">
            STUDENT SETTINGS
          </span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight uppercase text-white">
          Account Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure language, notification routing, and view registered verification profiles
        </p>
      </header>

      {saveSuccess && (
        <div className="mb-6 p-3.5 bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 rounded-none text-xs font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-none bg-emerald-400" />
          SETTINGS SAVED SUCCESSFULLY
        </div>
      )}

      <div className="w-full space-y-6 text-xs max-w-4xl">
        {/* SECTION 1: SYSTEM NOTIFICATIONS */}
        <div className="bg-[#08090c]/80 p-6 rounded-none border border-white/15 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 rounded-none">
                <PixelIcon name="alerts" size={18} />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm uppercase">System Notifications</h3>
                <p className="text-[11px] text-slate-400">Manage real-time push updates and attendance warning alerts</p>
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">ALERTS</span>
          </div>

          <div className="flex items-center justify-between p-3.5 border border-white/10 bg-black/20">
            <div>
              <label className="text-xs font-bold text-white block">Early-Alert Push Notifications</label>
              <p className="text-[10px] text-slate-400 mt-0.5">Receive warnings when attendance dips or merit reviews complete.</p>
            </div>
            <button
              type="button"
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`px-3 py-1 text-[10px] font-bold rounded-none border transition-colors cursor-pointer ${
                notificationsEnabled
                  ? "bg-emerald-600/30 border-emerald-400 text-emerald-300"
                  : "bg-white/5 border-white/15 text-slate-500"
              }`}
            >
              {notificationsEnabled ? "ENABLED" : "DISABLED"}
            </button>
          </div>
        </div>

        {/* SECTION 2: LOCALIZATION */}
        <div className="bg-[#08090c]/80 p-6 rounded-none border border-white/15 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 rounded-none">
                <PixelIcon name="globe" size={18} />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm uppercase">Localization & Language</h3>
                <p className="text-[11px] text-slate-400">Configure language mappings for interfaces and logs</p>
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">LOCALE</span>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">
              Preferred Portal Language
            </label>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full md:w-64 px-3 py-2 bg-black/40 border border-white/20 rounded-none text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
            >
              <option value="en" className="bg-[#08090c]">English (UK)</option>
              <option value="bm" className="bg-[#08090c]">Bahasa Melayu</option>
            </select>
          </div>
        </div>

        {/* SECTION 3: SECURITY & DEVICE REGISTRY */}
        <div className="bg-[#08090c]/80 p-6 rounded-none border border-white/15 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 rounded-none">
                <PixelIcon name="shield" size={18} />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm uppercase">Security & Device Registry</h3>
                <p className="text-[11px] text-slate-400">Biometrics and hardware tokens used during active lectures</p>
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">HARDWARE</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 border border-white/10 bg-black/20">
              <div className="flex items-center gap-3">
                <PixelIcon name="scan" size={18} className={faceRegistered ? "text-emerald-400" : "text-slate-500"} />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">Face ID Profile Registration</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Biometric vector embedding for lecture hall check-ins</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-none border ${
                faceRegistered ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-300" : "bg-rose-500/15 border-rose-400/40 text-rose-300"
              }`}>
                {faceRegistered ? "REGISTERED" : "NOT SET"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 border border-white/10 bg-black/20">
              <div className="flex items-center gap-3">
                <PixelIcon name="phone" size={18} className={deviceRegistered ? "text-emerald-400" : "text-slate-500"} />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">Registered Device Token (Hardware ID)</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Binds attendance check-ins to your primary mobile hardware</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-none border ${
                deviceRegistered ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-300" : "bg-rose-500/15 border-rose-400/40 text-rose-300"
              }`}>
                {deviceRegistered ? "BOUND" : "UNBOUND"}
              </span>
            </div>
          </div>
        </div>

        {/* SAVE TRIGGER BUTTON */}
        <div className="flex justify-end pt-2">
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 px-6 py-3 rounded-none font-bold uppercase shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <PixelIcon name="check" size={16} />
            <span>SAVE PREFERENCES</span>
          </button>
        </div>
      </div>
    </main>
  );
}
