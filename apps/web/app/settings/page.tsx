// apps/web/app/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import ExportReportModal from "../../components/ExportReportModal";
import { 
  Bell, 
  Sliders, 
  Globe, 
  Save, 
  HelpCircle
} from "lucide-react";
import { createClient } from "../../utils/supabase/client";

export default function SettingsPage() {
  const supabase = createClient();
  const [lecturerId, setLecturerId] = useState("");
  const [attendanceThreshold, setAttendanceThreshold] = useState(80);
  const [gradeDropThreshold, setGradeDropThreshold] = useState(20);
  const [language, setLanguage] = useState("en");
  const [syncExternal, setSyncExternal] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setLecturerId(user.id);

        const { data } = await supabase
          .from('settings')
          .select('*')
          .eq('lecturer_id', user.id)
          .maybeSingle();

        if (data) {
          setAttendanceThreshold(data.attendance_threshold || 80);
          setGradeDropThreshold(data.grade_drop_threshold || 20);
          setLanguage(data.language || "en");
          setSyncExternal(!!data.sync_external_counselling);
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!lecturerId) return;

    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          lecturer_id: lecturerId,
          attendance_threshold: attendanceThreshold,
          grade_drop_threshold: gradeDropThreshold,
          language: language,
          sync_external_counselling: syncExternal,
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
    return <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">Loading settings...</div>;
  }

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-[#FAF9F6]">
      
      {/* Header */}
      <header className="mb-8">
        <h2 className="text-3xl font-semibold text-slate-900">System Settings</h2>
        <p className="text-slate-500 mt-1">Configure your workspace rules, localization preferences, and AI alert parameters</p>
      </header>

      {saveSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl text-sm font-semibold flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          Settings saved successfully!
        </div>
      )}

      <div className="w-full space-y-6">
        
        {/* SECTION 1: AI & AUTOMATION ALERTS CONFIGURATION */}
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

        {/* SECTION 2: LOCALIZATION */}
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
                checked={syncExternal} 
                onChange={(e) => setSyncExternal(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* SAVE TRIGGER BUTTON CONTAINER */}
        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-md shadow-blue-100 transition-all active:scale-95 border-none cursor-pointer"
          >
            <Save size={18} />
            Save Configuration Changes
          </button>
        </div>

        {/* Compliance & Data Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-bold mb-2">Compliance & Data</h2>
          <p className="text-slate-500 text-sm mb-4">
            Export course data, attendance records, and assessment correlations for university auditing purposes.
          </p>
          
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors border-none cursor-pointer"
          >
            Export Official Report
          </button>
        </section>

        {/* Render the Export Report Modal */}
        <ExportReportModal 
          isOpen={isExportModalOpen} 
          onClose={() => setIsExportModalOpen(false)} 
        />

      </div>
    </main>
  );
}