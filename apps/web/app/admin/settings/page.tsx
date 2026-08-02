// apps/web/app/admin/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  Settings, 
  Database, 
  ShieldCheck, 
  Server, 
  Globe, 
  CheckCircle,
  Save,
  Award,
  Bell,
  Lock,
  GraduationCap,
  AlertTriangle
} from "lucide-react";
import { createClient } from "../../../utils/supabase/client";

interface SystemSettings {
  attendance_threshold: number;
  default_geofence_radius: number;
  grade_drop_threshold: number;
  mandatory_face_id: boolean;
  mandatory_location: boolean;
  max_merit_points_per_claim: number;
  default_merit_points_recommended: number;
  auto_email_absence_alert: boolean;
  auto_escalate_intervention_days: number;
  maintenance_mode: boolean;
  default_user_password: string;
  session_timeout_hours: number;
  enable_audit_logs: boolean;
}

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
  const supabase = createClient();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("http://localhost:8000/api/admin/settings", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (err) {
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("http://localhost:8000/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3500);
      } else {
        const errData = await res.json();
        setErrorMessage(errData.detail || "Failed to save system configuration.");
      }
    } catch (err) {
      console.error("Save settings error:", err);
      setErrorMessage("Network error while saving settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (key: keyof SystemSettings, val: any) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <main className="flex-1 overflow-y-auto bg-transparent p-6 lg:p-10 flex flex-col space-y-8">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin System Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Configure academic policies, attendance verification triggers, merit rules, and security options.</p>
      </div>

      {showSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-xs">
          <CheckCircle size={16} className="text-emerald-500" /> System configuration parameters saved successfully to local PostgreSQL!
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
          <AlertTriangle size={16} className="text-rose-500" /> {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-20 text-slate-500 font-medium">Loading system configurations...</div>
      ) : (
        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Controls - 2 Columns */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Category 1: Academic & Attendance Policy */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-4">
                <GraduationCap size={20} className="text-blue-600" />
                Academic & Attendance Enforcement Rules
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Attendance Minimum Threshold */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Minimum Attendance Threshold (%)</label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={settings.attendance_threshold}
                    onChange={(e) => updateField('attendance_threshold', Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 font-bold"
                  />
                  <p className="text-[11px] text-slate-400">Students below this rate are automatically flagged for barring and critical alerts.</p>
                </div>

                {/* Default Geofence Radius */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Default Geofence Radius (Meters)</label>
                  <input
                    type="number"
                    min={10}
                    max={500}
                    value={settings.default_geofence_radius}
                    onChange={(e) => updateField('default_geofence_radius', Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 font-bold"
                  />
                  <p className="text-[11px] text-slate-400">Maximum allowed GPS distance from class venue for valid student check-ins.</p>
                </div>

                {/* Grade Drop Deviation */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Academic At-Risk Trigger Score Drop (%)</label>
                  <input
                    type="number"
                    min={5}
                    max={50}
                    value={settings.grade_drop_threshold}
                    onChange={(e) => updateField('grade_drop_threshold', Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 font-bold"
                  />
                  <p className="text-[11px] text-slate-400">Flags students when continuous assessment scores drop by this percentage threshold.</p>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Mandatory Face ID Match</span>
                    <span className="text-[11px] text-slate-500">Require facial biometric verification on all student attendance check-ins.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.mandatory_face_id}
                    onChange={(e) => updateField('mandatory_face_id', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Mandatory GPS Radius Check</span>
                    <span className="text-[11px] text-slate-500">Enforce device GPS coordinate verification against class venue coordinates.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.mandatory_location}
                    onChange={(e) => updateField('mandatory_location', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </label>
              </div>

            </div>

            {/* Category 2: Student Merit & Extra-Curricular Policy */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-4">
                <Award size={20} className="text-amber-500" />
                Student Merit & Extra-Curricular Rewards Policy
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Max Merit Points Per Submission</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={settings.max_merit_points_per_claim}
                    onChange={(e) => updateField('max_merit_points_per_claim', Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 font-bold"
                  />
                  <p className="text-[11px] text-slate-400">Maximum merit points a student can apply for in a single claim submission.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Default Evaluator Points Recommendation</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={settings.default_merit_points_recommended}
                    onChange={(e) => updateField('default_merit_points_recommended', Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 font-bold"
                  />
                  <p className="text-[11px] text-slate-400">Pre-filled award points value when an administrator approves a claim.</p>
                </div>
              </div>
            </div>

            {/* Category 3: Automated Notifications & Maintenance */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-4">
                <Bell size={20} className="text-indigo-600" />
                Automated Workflows & Maintenance
              </h3>

              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Auto Absence Alerts</span>
                    <span className="text-[11px] text-slate-500">Send instant alert notifications to faculty when attendance drops below threshold.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.auto_email_absence_alert}
                    onChange={(e) => updateField('auto_email_absence_alert', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </label>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Intervention Case Auto-Escalation (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={settings.auto_escalate_intervention_days}
                    onChange={(e) => updateField('auto_escalate_intervention_days', Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 font-bold"
                  />
                  <p className="text-[11px] text-slate-400">Escalates unresolved intervention cases to senior coordinator after specified days.</p>
                </div>

                <label className="flex items-center justify-between p-4 bg-amber-50/70 border border-amber-200 rounded-2xl cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-amber-900 block flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-amber-600" /> Platform Maintenance Mode
                    </span>
                    <span className="text-[11px] text-amber-800/80">Freeze all student attendance check-ins during exam periods or updates.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.maintenance_mode}
                    onChange={(e) => updateField('maintenance_mode', e.target.checked)}
                    className="w-5 h-5 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Category 4: Security & System Defaults */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-4">
                <Lock size={20} className="text-rose-600" />
                Security & Account Provisioning Defaults
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Default Provisioning Password</label>
                  <input
                    type="text"
                    required
                    value={settings.default_user_password}
                    onChange={(e) => updateField('default_user_password', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 font-bold"
                  />
                  <p className="text-[11px] text-slate-400">Default temporary password assigned when administrators create new accounts.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Active Session Timeout (Hours)</label>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={settings.session_timeout_hours}
                    onChange={(e) => updateField('session_timeout_hours', Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 font-bold"
                  />
                  <p className="text-[11px] text-slate-400">Automatic logout duration for inactivity in browser sessions.</p>
                </div>
              </div>

              <label className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Administrative Audit Trail Logging</span>
                  <span className="text-[11px] text-slate-500">Record all creation, modification, and deletion events in immutable system audit logs.</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enable_audit_logs}
                  onChange={(e) => updateField('enable_audit_logs', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
              </label>

            </div>

            {/* Bottom Save Action Bar */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
              <button
                type="submit"
                disabled={isSaving || isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-24 py-4 rounded-2xl font-extrabold text-base transition-all flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg active:scale-98 disabled:opacity-50 border-none cursor-pointer"
              >
                <Save size={20} /> {isSaving ? "Saving..." : "Save System Config"}
              </button>
            </div>

          </div>

          {/* Right Column: Specifications & Info */}
          <div className="space-y-6">
            <div className="bg-[#FAF9F6] border border-slate-200 rounded-3xl p-6 shadow-inner space-y-6 sticky top-6">
              
              <div className="space-y-4">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">Platform Technical Specifications</h4>
                
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-3">
                    <Server className="text-slate-400 shrink-0" size={18} />
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Engine Stack</span>
                      <p className="text-slate-800 font-bold text-xs">Next.js 15 / FastAPI / Python 3.11</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Database className="text-slate-400 shrink-0" size={18} />
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Database Connection</span>
                      <p className="text-slate-800 font-bold text-xs">PostgreSQL / Supabase (Local Pool)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <ShieldCheck className="text-slate-400 shrink-0" size={18} />
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Authentication Layer</span>
                      <p className="text-slate-800 font-bold text-xs">JWT Role Validation & RLS Enabled</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Globe className="text-slate-400 shrink-0" size={18} />
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Active Domain</span>
                      <p className="text-slate-800 font-bold text-xs">http://localhost:3000</p>
                    </div>
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
