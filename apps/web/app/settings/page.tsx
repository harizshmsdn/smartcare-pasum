// Lecturer Settings page in dottxt.ai sharp dark style with emerald accents
"use client";

import { useState, useEffect } from "react";
import ExportReportModal from "../../components/ExportReportModal";
import { PixelIcon } from "../../components/PixelIcon";
import { createClient } from "../../utils/supabase/client";

export default function SettingsPage() {
  const supabase = createClient();
  const [attendanceThreshold, setAttendanceThreshold] = useState(80);
  const [gradeDropThreshold, setGradeDropThreshold] = useState(20);
  const [language, setLanguage] = useState("en");
  const [checkinGracePeriod, setCheckinGracePeriod] = useState(15);
  const [defaultAttendanceMode, setDefaultAttendanceMode] = useState("qr");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('settings')
          .select('*')
          .eq('lecturer_id', user.id)
          .maybeSingle();

        if (data) {
          setAttendanceThreshold(data.attendance_threshold || 80);
          setGradeDropThreshold(data.grade_drop_threshold || 20);
          setLanguage(data.language || "en");
          setCheckinGracePeriod(data.checkin_grace_period || 15);
          setDefaultAttendanceMode(data.default_attendance_mode || "qr");
          setNotificationsEnabled(data.notifications_enabled !== false);
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        alert("Session expired. Please log in again.");
        return;
      }

      const { error } = await supabase
        .from('settings')
        .upsert({
          lecturer_id: user.id,
          attendance_threshold: attendanceThreshold,
          grade_drop_threshold: gradeDropThreshold,
          language: language,
          checkin_grace_period: checkinGracePeriod,
          default_attendance_mode: defaultAttendanceMode,
          notifications_enabled: notificationsEnabled,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error("Error saving settings:", error);
        alert("Failed to save settings: " + error.message);
        return;
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent min-h-screen text-xs text-slate-400">
        Loading settings...
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-transparent text-white">
      {/* Header */}
      <header className="mb-8 pb-4 border-b border-white/10">
        <h2 className="text-3xl font-bold tracking-tight uppercase text-white">
          System Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure workspace thresholds, class policies, notifications, and localization
        </p>
      </header>

      {saveSuccess && (
        <div className="mb-6 p-3.5 bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 rounded-none text-xs font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-none bg-emerald-400" />
          SETTINGS SAVED SUCCESSFULLY
        </div>
      )}

      <div className="w-full space-y-6 text-xs max-w-4xl">
        {/* SECTION 1: EARLY-ALERT THRESHOLDS */}
        <div className="bg-[#08090c]/80 p-6 rounded-none border border-white/15 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 rounded-none">
                <PixelIcon name="sliders" size={18} />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm uppercase">Early-Alert Thresholds</h3>
                <p className="text-[11px] text-slate-400">Parameters triggering student support warning flags</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Attendance Drift Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase">
                  Critical Attendance Breach Limit
                </label>
                <span className="text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 font-bold px-2 py-0.5 rounded-none">
                  &lt; {attendanceThreshold}%
                </span>
              </div>
              <input
                type="range"
                min="60"
                max="90"
                value={attendanceThreshold}
                onChange={(e) => setAttendanceThreshold(Number(e.target.value))}
                className="w-full h-1.5 bg-black/40 rounded-none appearance-none cursor-pointer accent-[#34d399] border border-white/15"
              />
              <p className="text-[10px] text-slate-500 mt-1">Standard PASUM compliance mandates a default evaluation setting of 80%.</p>
            </div>

            {/* Assessment Drop Slider */}
            <div className="border-t border-white/10 pt-5">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase">
                  Continuous Assessment Drop Threshold
                </label>
                <span className="text-xs bg-amber-500/15 text-amber-300 border border-amber-400/30 font-bold px-2 py-0.5 rounded-none">
                  {gradeDropThreshold}% Drop
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                value={gradeDropThreshold}
                onChange={(e) => setGradeDropThreshold(Number(e.target.value))}
                className="w-full h-1.5 bg-black/40 rounded-none appearance-none cursor-pointer accent-[#fbbf24] border border-white/15"
              />
              <p className="text-[10px] text-slate-500 mt-1">Flags sudden performance drops between consecutive tests or lab reports.</p>
            </div>
          </div>
        </div>

        {/* SECTION 2: CLASSROOM CHECK-IN POLICIES */}
        <div className="bg-[#08090c]/80 p-6 rounded-none border border-white/15 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 rounded-none">
                <PixelIcon name="clock" size={18} />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm uppercase">Classroom Check-In Policies</h3>
                <p className="text-[11px] text-slate-400">Configure grace periods and default verification methods</p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">
                Student Check-In Grace Period
              </label>
              <select
                value={checkinGracePeriod}
                onChange={(e) => setCheckinGracePeriod(Number(e.target.value))}
                className="w-full md:w-64 px-3 py-2 bg-black/40 border border-white/20 rounded-none text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                <option value={5} className="bg-[#08090c]">5 minutes</option>
                <option value={10} className="bg-[#08090c]">10 minutes</option>
                <option value={15} className="bg-[#08090c]">15 minutes</option>
                <option value={30} className="bg-[#08090c]">30 minutes</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Students must submit check-in within this timeframe after session launch.</p>
            </div>

            <div className="border-t border-white/10 pt-5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">
                Default Attendance Mode
              </label>
              <select
                value={defaultAttendanceMode}
                onChange={(e) => setDefaultAttendanceMode(e.target.value)}
                className="w-full md:w-64 px-3 py-2 bg-black/40 border border-white/20 rounded-none text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                <option value="qr" className="bg-[#08090c]">QR Code Check-in</option>
                <option value="manual" className="bg-[#08090c]">Manual Roll Call</option>
                <option value="biometric" className="bg-[#08090c]">Face ID / Biometric Verification</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Default verification method when launching a new class session.</p>
            </div>
          </div>
        </div>

        {/* SECTION 3: SYSTEM NOTIFICATIONS */}
        <div className="bg-[#08090c]/80 p-6 rounded-none border border-white/15 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 rounded-none">
                <PixelIcon name="alerts" size={18} />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm uppercase">Alerts & Notifications</h3>
                <p className="text-[11px] text-slate-400">Control in-app notifications for course tracking</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 border border-white/10 bg-black/20">
            <div>
              <label className="text-xs font-bold text-white block">In-App Critical Alerts</label>
              <p className="text-[10px] text-slate-400 mt-0.5">Receive warning notifications when student thresholds are breached.</p>
            </div>
            <button
              type="button"
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`px-3 py-1 text-[10px] font-bold rounded-none border transition-colors cursor-pointer ${notificationsEnabled
                ? "bg-emerald-600/30 border-emerald-400 text-emerald-300"
                : "bg-white/5 border-white/15 text-slate-500"
                }`}
            >
              {notificationsEnabled ? "ENABLED" : "DISABLED"}
            </button>
          </div>
        </div>

        {/* SECTION 4: LOCALIZATION */}
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
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">
              Primary Preferred Language
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

        {/* SAVE TRIGGER BUTTON */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 px-6 py-3 rounded-none font-bold uppercase shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <PixelIcon name="check" size={16} />
            <span>SAVE CONFIGURATION</span>
          </button>
        </div>

        {/* Compliance & Data Export Section */}
        <div className="border border-white/15 bg-[#08090c]/60 p-6 rounded-none shadow-xl">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-1">Compliance & Audit Export</h4>
          <p className="text-slate-400 text-[11px] mb-4">
            Export official course data, attendance archives, and assessment records for university auditing.
          </p>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="bg-transparent hover:bg-white/10 text-slate-200 border border-white/20 px-4 py-2.5 rounded-none font-bold uppercase text-xs transition-colors cursor-pointer"
          >
            EXPORT OFFICIAL REPORT →
          </button>
        </div>

        <ExportReportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
      </div>
    </main>
  );
}