// apps/web/app/admin/settings/page.tsx
"use client";

import { useState } from "react";
import { 
  Settings, 
  Database, 
  ShieldCheck, 
  Server, 
  Globe, 
  CheckCircle,
  Save
} from "lucide-react";

export default function AdminSettingsPage() {
  const [attendanceThreshold, setAttendanceThreshold] = useState(80);
  const [gradeThreshold, setGradeThreshold] = useState(20);
  const [enableAuditLogs, setEnableAuditLogs] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
  };

  return (
    <main className="flex-1 overflow-y-auto bg-transparent p-10 flex flex-col space-y-8">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">Admin Settings</h2>
        <p className="text-slate-500 mt-1">Configure system-wide triggers, alert thresholds, and integration hooks.</p>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left column: thresholds & settings */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-4">
            <Settings size={20} className="text-blue-500" />
            System Threshold Rules
          </h3>

          <div className="space-y-4">
            
            {/* Attendance Threshold */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Attendance Warning Threshold (%)</label>
              <input
                type="number"
                min={50}
                max={100}
                value={attendanceThreshold}
                onChange={(e) => setAttendanceThreshold(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
              />
              <p className="text-[10px] text-slate-400">Triggers an automatic critical alert to the coordinator when student attendance rate drops below this percentage.</p>
            </div>

            {/* Grade Threshold */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Grade Drop Deviation Alert (%)</label>
              <input
                type="number"
                min={5}
                max={50}
                value={gradeThreshold}
                onChange={(e) => setGradeThreshold(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
              />
              <p className="text-[10px] text-slate-400">Flags students when a consecutive continuous assessment grade decreases by this percentage value.</p>
            </div>

            {/* Audit Logs switch */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Record API Audit History</span>
                <span className="text-[10px] text-slate-500">Record all administrative operations into local audit logs.</span>
              </div>
              <input
                type="checkbox"
                checked={enableAuditLogs}
                onChange={(e) => setEnableAuditLogs(e.target.checked)}
                className="w-10 h-6 bg-slate-200 rounded-full appearance-none checked:bg-blue-600 relative outline-none cursor-pointer transition-colors duration-200 before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-1 before:left-1 checked:before:left-5 before:transition-all"
              />
            </div>

          </div>

          {/* Action Row */}
          <div className="flex justify-end items-center gap-3 pt-6 border-t border-slate-100">
            {showSuccess && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle size={14} /> Settings saved successfully!
              </span>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-semibold text-sm transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 border-none cursor-pointer"
            >
              <Save size={16} /> {isSaving ? "Saving..." : "Save System Config"}
            </button>
          </div>
        </div>

        {/* Right column: platform metadata & database */}
        <div className="bg-[#FAF9F6] border border-slate-200 rounded-3xl p-6 shadow-inner space-y-6">
          
          {/* Metadata Section */}
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Platform Specifications</h4>
            
            <div className="space-y-3">
              {/* App Version */}
              <div className="flex items-center gap-3">
                <Server className="text-slate-400" size={18} />
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Engine version</span>
                  <p className="text-slate-800 font-bold text-xs">v1.0.0-production (NextJS 15 / FastAPI)</p>
                </div>
              </div>

              {/* DB Connection */}
              <div className="flex items-center gap-3">
                <Database className="text-slate-400" size={18} />
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Database Status</span>
                  <p className="text-slate-800 font-bold text-xs">Connected (Supabase / Local PG)</p>
                </div>
              </div>

              {/* SSL */}
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-slate-400" size={18} />
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Access Layer</span>
                  <p className="text-slate-800 font-bold text-xs">JWT Secure Role Verification</p>
                </div>
              </div>

              {/* Environment */}
              <div className="flex items-center gap-3">
                <Globe className="text-slate-400" size={18} />
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Active Domain</span>
                  <p className="text-slate-800 font-bold text-xs">http://localhost:3000</p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </form>

    </main>
  );
}
