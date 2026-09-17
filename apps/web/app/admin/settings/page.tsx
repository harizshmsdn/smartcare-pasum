// Admin System Settings page in dottxt.ai sharp dark style with emerald accents
"use client";

import { useState, useEffect } from "react";
import { PixelIcon } from "../../../components/PixelIcon";
import { adminService, SystemSettings } from "../../../lib/services/admin";

const DEFAULT_SETTINGS: SystemSettings = {
  attendance_threshold: 80,
  default_geofence_radius: 50,
  grade_drop_threshold: 20,
  mandatory_face_id: true,
  mandatory_location: true,
  max_merit_points_per_claim: 50,
  default_merit_points_recommended: 10,
  auto_email_absence_alert: true,
  auto_escalate_intervention_days: 3,
  maintenance_mode: false,
  default_user_password: "password123",
  session_timeout_hours: 12,
  enable_audit_logs: true,
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getSettings();
      if (data?.settings) {
        setSettings(data.settings);
      }
    } catch (err: any) {
      console.error("Error fetching system settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage("");

    try {
      await adminService.updateSettings(settings);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3500);
    } catch (err: any) {
      console.error("Save settings error:", err);
      setErrorMessage(err.message || "Failed to save system configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (key: keyof SystemSettings, val: any) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <main className="flex-1 overflow-y-auto bg-transparent p-6 lg:p-8 flex flex-col space-y-6 text-white text-xs">
      {/* Header */}
      <header className="pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-none" />
          <span className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">
            ADMIN CONTROL PANEL
          </span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight uppercase text-white">
          System Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure academic policies, attendance verification triggers, merit rules, and security preferences
        </p>
      </header>

      {showSuccess && (
        <div className="bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 p-3.5 rounded-none font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-none bg-emerald-400" />
          SYSTEM CONFIGURATION SAVED SUCCESSFULLY
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-500/15 border border-rose-400/40 text-rose-300 p-3.5 rounded-none font-bold flex items-center gap-2">
          <PixelIcon name="warning" size={16} />
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-20 text-slate-400 font-medium">Loading system configurations...</div>
      ) : (
        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Controls - 2 Columns */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Category 1: Academic & Attendance Policy */}
            <div className="bg-[#08090c]/80 border border-white/15 rounded-none p-6 shadow-xl backdrop-blur-md space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 rounded-none">
                    <PixelIcon name="calendar" size={18} />
                  </div>
                  <h3 className="font-bold text-white text-sm uppercase">
                    Academic & Attendance Triggers
                  </h3>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">POLICY</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Attendance Minimum Threshold */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Minimum Attendance Threshold (%)</label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={settings.attendance_threshold}
                    onChange={(e) => updateField('attendance_threshold', Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-none border border-white/20 bg-black/40 text-xs font-bold text-white focus:outline-none focus:border-emerald-400"
                  />
                  <p className="text-[10px] text-slate-500">Students below this rate are automatically flagged for critical alerts.</p>
                </div>

                {/* Default Geofence Radius */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Default Geofence Radius (Meters)</label>
                  <input
                    type="number"
                    min={10}
                    max={500}
                    value={settings.default_geofence_radius}
                    onChange={(e) => updateField('default_geofence_radius', Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-none border border-white/20 bg-black/40 text-xs font-bold text-white focus:outline-none focus:border-emerald-400"
                  />
                  <p className="text-[10px] text-slate-500">Maximum allowed GPS distance from venue for valid student check-ins.</p>
                </div>

                {/* Grade Drop Deviation */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Academic At-Risk Trigger Score Drop (%)</label>
                  <input
                    type="number"
                    min={5}
                    max={50}
                    value={settings.grade_drop_threshold}
                    onChange={(e) => updateField('grade_drop_threshold', Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-none border border-white/20 bg-black/40 text-xs font-bold text-white focus:outline-none focus:border-emerald-400"
                  />
                  <p className="text-[10px] text-slate-500">Flags students when continuous assessment scores drop by this threshold.</p>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3.5 bg-black/20 border border-white/10 rounded-none">
                  <div>
                    <span className="text-xs font-bold text-white block">Mandatory Face ID Match</span>
                    <span className="text-[10px] text-slate-400">Require facial biometric verification on all attendance check-ins.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField('mandatory_face_id', !settings.mandatory_face_id)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-none border transition-colors cursor-pointer ${
                      settings.mandatory_face_id
                        ? "bg-emerald-600/30 border-emerald-400 text-emerald-300"
                        : "bg-white/5 border-white/15 text-slate-500"
                    }`}
                  >
                    {settings.mandatory_face_id ? "ENABLED" : "DISABLED"}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-black/20 border border-white/10 rounded-none">
                  <div>
                    <span className="text-xs font-bold text-white block">Mandatory GPS Radius Check</span>
                    <span className="text-[10px] text-slate-400">Enforce device GPS coordinate verification against class venue coordinates.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField('mandatory_location', !settings.mandatory_location)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-none border transition-colors cursor-pointer ${
                      settings.mandatory_location
                        ? "bg-emerald-600/30 border-emerald-400 text-emerald-300"
                        : "bg-white/5 border-white/15 text-slate-500"
                    }`}
                  >
                    {settings.mandatory_location ? "ENABLED" : "DISABLED"}
                  </button>
                </div>
              </div>
            </div>

            {/* Category 2: Merit Policy (Disabled) */}
            <div className="relative group/disabled cursor-not-allowed" title="Disabled Feature">
              <div className="pointer-events-none absolute -top-8 right-4 hidden group-hover/disabled:flex items-center px-2.5 py-1 text-xs font-mono font-semibold text-white bg-black/90 border border-white/20 rounded-none shadow-xl z-50">
                Disabled Feature
              </div>
              <div className="bg-[#08090c]/40 border border-white/10 rounded-none p-6 shadow-xl space-y-4 opacity-40 grayscale pointer-events-none select-none">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="font-bold text-white text-sm uppercase flex items-center gap-2">
                    <PixelIcon name="award" size={18} />
                    Merit & Extra-Curricular Rewards Policy
                  </h3>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 border border-white/20 bg-white/5 text-slate-400 rounded-none">
                    DISABLED
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Max Merit Points</label>
                    <input disabled value={settings.max_merit_points_per_claim} className="w-full px-3 py-2 bg-black/40 border border-white/10 text-slate-500 rounded-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Default Evaluator Points</label>
                    <input disabled value={settings.default_merit_points_recommended} className="w-full px-3 py-2 bg-black/40 border border-white/10 text-slate-500 rounded-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Category 3: Automated Workflows & Maintenance */}
            <div className="bg-[#08090c]/80 border border-white/15 rounded-none p-6 shadow-xl backdrop-blur-md space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 rounded-none">
                    <PixelIcon name="alerts" size={18} />
                  </div>
                  <h3 className="font-bold text-white text-sm uppercase">
                    Automated Workflows & Maintenance
                  </h3>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">WORKFLOWS</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-black/20 border border-white/10 rounded-none">
                  <div>
                    <span className="text-xs font-bold text-white block">Auto Absence Alerts</span>
                    <span className="text-[10px] text-slate-400">Send instant alert notifications to faculty when attendance drops below threshold.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField('auto_email_absence_alert', !settings.auto_email_absence_alert)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-none border transition-colors cursor-pointer ${
                      settings.auto_email_absence_alert
                        ? "bg-emerald-600/30 border-emerald-400 text-emerald-300"
                        : "bg-white/5 border-white/15 text-slate-500"
                    }`}
                  >
                    {settings.auto_email_absence_alert ? "ENABLED" : "DISABLED"}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Intervention Case Auto-Escalation (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={settings.auto_escalate_intervention_days}
                    onChange={(e) => updateField('auto_escalate_intervention_days', Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-none border border-white/20 bg-black/40 text-xs font-bold text-white focus:outline-none focus:border-emerald-400"
                  />
                  <p className="text-[10px] text-slate-500">Escalates unresolved intervention cases to senior coordinator after specified days.</p>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-amber-500/10 border border-amber-400/30 rounded-none">
                  <div>
                    <span className="text-xs font-bold text-amber-300 block">Platform Maintenance Mode</span>
                    <span className="text-[10px] text-amber-400/80">Freeze student check-ins during exam periods or system upgrades.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField('maintenance_mode', !settings.maintenance_mode)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-none border transition-colors cursor-pointer ${
                      settings.maintenance_mode
                        ? "bg-amber-600/30 border-amber-400 text-amber-300"
                        : "bg-white/5 border-white/15 text-slate-500"
                    }`}
                  >
                    {settings.maintenance_mode ? "ENABLED" : "DISABLED"}
                  </button>
                </div>
              </div>
            </div>

            {/* Category 4: Security & System Defaults */}
            <div className="bg-[#08090c]/80 border border-white/15 rounded-none p-6 shadow-xl backdrop-blur-md space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 rounded-none">
                    <PixelIcon name="key" size={18} />
                  </div>
                  <h3 className="font-bold text-white text-sm uppercase">
                    Security & Account Provisioning Defaults
                  </h3>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">SECURITY</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Default Provisioning Password</label>
                  <input
                    type="text"
                    required
                    value={settings.default_user_password}
                    onChange={(e) => updateField('default_user_password', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-none border border-white/20 bg-black/40 text-xs font-bold text-white focus:outline-none focus:border-emerald-400"
                  />
                  <p className="text-[10px] text-slate-500">Temporary password assigned when administrators provision new accounts.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Active Session Timeout (Hours)</label>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={settings.session_timeout_hours}
                    onChange={(e) => updateField('session_timeout_hours', Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-none border border-white/20 bg-black/40 text-xs font-bold text-white focus:outline-none focus:border-emerald-400"
                  />
                  <p className="text-[10px] text-slate-500">Automatic logout duration for inactivity in browser sessions.</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-black/20 border border-white/10 rounded-none">
                <div>
                  <span className="text-xs font-bold text-white block">Administrative Audit Trail Logging</span>
                  <span className="text-[10px] text-slate-400">Record all database actions in immutable system audit logs.</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateField('enable_audit_logs', !settings.enable_audit_logs)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-none border transition-colors cursor-pointer ${
                    settings.enable_audit_logs
                      ? "bg-emerald-600/30 border-emerald-400 text-emerald-300"
                      : "bg-white/5 border-white/15 text-slate-500"
                  }`}
                >
                  {settings.enable_audit_logs ? "ENABLED" : "DISABLED"}
                </button>
              </div>
            </div>

            {/* Bottom Save Action Bar */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/10">
              <button
                type="submit"
                disabled={isSaving || isLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-none font-bold uppercase text-xs border border-emerald-400 shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <PixelIcon name="check" size={16} />
                <span>{isSaving ? "SAVING..." : "SAVE SYSTEM CONFIG"}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Platform Specifications */}
          <div className="space-y-6">
            <div className="bg-[#08090c]/80 border border-white/15 rounded-none p-6 shadow-xl space-y-5 sticky top-6">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider pb-3 border-b border-white/10">
                Platform Technical Specifications
              </h4>
              
              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <PixelIcon name="server" size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Engine Stack</span>
                    <p className="text-white font-bold text-xs">Next.js 16 / FastAPI / Python 3.11</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <PixelIcon name="building" size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Database Connection</span>
                    <p className="text-white font-bold text-xs">PostgreSQL / Supabase (Local Pool)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <PixelIcon name="shield" size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Authentication Layer</span>
                    <p className="text-white font-bold text-xs">JWT Role Validation & RLS Enabled</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <PixelIcon name="globe" size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Active Domain</span>
                    <p className="text-white font-bold text-xs">http://localhost:3000</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </main>
  );
}
