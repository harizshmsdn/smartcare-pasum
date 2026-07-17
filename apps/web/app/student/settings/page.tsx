// apps/web/app/student/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  Bell, 
  Globe, 
  Save, 
  ShieldAlert,
  Smartphone,
  ScanFace
} from "lucide-react";
import { createClient } from "../../../utils/supabase/client";

export default function StudentSettingsPage() {
  const supabase = createClient();
  const [studentId, setStudentId] = useState("");
  const [language, setLanguage] = useState("en");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Security stats retrieved from profiles
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchSettingsAndProfile = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setStudentId(user.id);

        // Fetch settings row
        const { data: settingsData } = await supabase
          .from('settings')
          .select('*')
          .eq('lecturer_id', user.id) // DB has lecturer_id as user identifier in settings table
          .maybeSingle();

        if (settingsData) {
          setLanguage(settingsData.language || "en");
          setNotificationsEnabled(settingsData.notifications_enabled !== false);
        }

        // Fetch profile to verify Face ID and Device registration
        const { data: profile } = await supabase
          .from('profiles')
          .select('face_hash, device_id')
          .eq('id', user.id)
          .single();

        if (profile) {
          setFaceRegistered(!!profile.face_hash);
          setDeviceRegistered(!!profile.device_id);
        }
      } catch (err) {
        console.error("Error loading student settings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettingsAndProfile();
  }, [supabase]);

  const handleSave = async () => {
    if (!studentId) return;

    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          lecturer_id: studentId,
          language: language,
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
    return <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">Loading settings...</div>;
  }

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-[#FAF9F6]">
      {/* Header */}
      <header className="mb-8">
        <h2 className="text-3xl font-semibold text-slate-900">Account Settings</h2>
        <p className="text-slate-500 mt-1">Configure language, notification routing, and view security profiles</p>
      </header>

      {saveSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          Settings saved successfully!
        </div>
      )}

      <div className="w-full space-y-6 max-w-4xl">
        {/* SECTION 1: SYSTEM NOTIFICATIONS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">System Notifications</h3>
              <p className="text-xs text-slate-500">Manage real-time updates and push warning notifications</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-semibold text-slate-700 block">Enable Early-Alert Push Notifications</label>
              <p className="text-xs text-slate-400 mt-0.5">Receive warnings when attendance drops or merit reviews complete.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={notificationsEnabled} 
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
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
              <p className="text-xs text-slate-500">Configure language mappings for interfaces and logs</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Preferred Portal Language</label>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full md:w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            >
              <option value="en">English (UK)</option>
              <option value="bm">Bahasa Melayu</option>
            </select>
          </div>
        </div>

        {/* SECTION 3: SECURITY & GEOGRAPHIC DEVICE PROFILE */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Security & Device Registry</h3>
              <p className="text-xs text-slate-500">Verify biometrics and hardware tokens used during active lectures</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/30">
              <div className="flex items-center gap-3">
                <ScanFace className={faceRegistered ? "text-emerald-500" : "text-slate-450"} size={20} />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Face ID Profile Registration</h4>
                  <p className="text-xs text-slate-450 mt-0.5">Biometric hash for identity matching during check-in</p>
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                faceRegistered ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
              }`}>
                {faceRegistered ? "Face Profile Registered" : "Not Set"}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/30">
              <div className="flex items-center gap-3">
                <Smartphone className={deviceRegistered ? "text-emerald-500" : "text-slate-450"} size={20} />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Registered Hardware Token (Device ID)</h4>
                  <p className="text-xs text-slate-450 mt-0.5">Ensures checks are done on student's registered mobile device</p>
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                deviceRegistered ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
              }`}>
                {deviceRegistered ? "Primary Device Bound" : "No Associated Device"}
              </span>
            </div>
          </div>
        </div>

        {/* SAVE TRIGGER BUTTON */}
        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-md shadow-blue-100 transition-all active:scale-95 border-none cursor-pointer"
          >
            <Save size={18} />
            Save Preferences
          </button>
        </div>
      </div>
    </main>
  );
}
