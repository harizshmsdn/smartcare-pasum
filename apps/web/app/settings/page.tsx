// apps/web/app/settings/page.tsx
"use client";

import { useState } from "react";
import ExportReportModal from "../../components/ExportReportModal";
import { 
  Bell, 
  Sliders, 
  Shield, 
  Globe, 
  Save, 
  AlertCircle,
  HelpCircle
} from "lucide-react";

export default function SettingsPage() {
  // Mock configuration states matching your SRS requirements
  const [attendanceThreshold, setAttendanceThreshold] = useState(80);
  const [gradeDropThreshold, setGradeDropThreshold] = useState(20);
  const [language, setLanguage] = useState("en"); // Support for EN and BM (Section 4.3)
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-[#FAF9F6]">
      
      {/* Header */}
      <header className="mb-8">
        <h2 className="text-3xl font-semibold text-slate-900">System Settings</h2>
        <p className="text-slate-500 mt-1">Configure your workspace rules, localization preferences, and AI alert parameters</p>
      </header>

      <div className="w-full space-y-6">
        
        {/* SECTION 1: AI & AUTOMATION ALERTS CONFIGURATION (FR-04) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">AI Early-Alert Rules</h3>
              <p className="text-xs text-slate-500">Define the exact baseline parameters that trigger tiered intervention alerts</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Attendance Drift Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  Critical Attendance Breach Limit
                  <span className="text-slate-400 cursor-help" title="Triggers a red tier alert if attendance dips below this mark."><HelpCircle size={14} /></span>
                </label>
                <span className="text-sm bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md">
                  &lt; {attendanceThreshold}%
                </span>
              </div>
              <input 
                type="range" 
                min="60" 
                max="90" 
                value={attendanceThreshold}
                onChange={(e) => setAttendanceThreshold(Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-xs text-slate-400 mt-1.5">Standard PASUM compliance mandates a default evaluation setting of 80%.</p>
            </div>

            {/* Assessment Drop Slider */}
            <div className="border-t border-slate-100 pt-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  Sudden Continuous Assessment Drop
                  <span className="text-slate-400 cursor-help" title="Triggers alert if a student's performance drops by this percentage between assessments."><HelpCircle size={14} /></span>
                </label>
                <span className="text-sm bg-orange-50 text-orange-700 font-bold px-2 py-0.5 rounded-md">
                  {gradeDropThreshold}% Drop
                </span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="40" 
                value={gradeDropThreshold}
                onChange={(e) => setGradeDropThreshold(Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-xs text-slate-400 mt-1.5">Flags sudden performance drops between consecutive continuous tests or lab scores.</p>
            </div>
          </div>
        </div>

        {/* SECTION 2: LOCALIZATION (Section 4.3) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
              <Globe size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Localization & Language</h3>
              <p className="text-xs text-slate-500">Configure language mappings for interfaces and automated early-alert outputs</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Primary Preferred Language</label>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full md:w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            >
              <option value="en">English (UK)</option>
              <option value="bm">Bahasa Melayu</option>
            </select>
            <p className="text-xs text-slate-400 mt-1.5">Automated messages routed to advisors support both English and Bahasa Melayu options.</p>
          </div>
        </div>

        {/* SECTION 3: NOTIFICATIONS ROUTING */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Automated Notifications</h3>
              <p className="text-xs text-slate-500">Control how automated risk alerts are routed outwards</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-semibold text-slate-700 block">External Support Unit Syncing</label>
              <p className="text-xs text-slate-400 mt-0.5">Autonomously sync critical risk alerts down to the UM Counselling Unit.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={emailAlerts} 
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* SAVE TRIGGER BUTTON CONTAINER */}
        <div className="flex justify-end pt-4">
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-md shadow-blue-100 transition-all active:scale-95">
            <Save size={18} />
            Save Configuration Changes
          </button>
        </div>

        {/* Compliance & Data Section */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Compliance & Data</h2>
        <p className="text-gray-600 text-sm mb-4">
          Export course data, attendance records, and assessment correlations for university auditing purposes.
        </p>
        
        <button 
          onClick={() => setIsExportModalOpen(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Export Official Report
        </button>
      </section>

      {/* Render the Modal */}
      <ExportReportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
      />

      </div>
    </main>
  );
}