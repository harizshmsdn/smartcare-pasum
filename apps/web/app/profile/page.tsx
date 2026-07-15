// apps/web/app/profile/page.tsx
"use client";

import { 
  Mail, 
  Phone, 
  MapPin, 
  BookOpen, 
  Award, 
  Building
} from "lucide-react";

export default function LecturerProfilePage() {
  // Mock data for the logged-in lecturer matching PASUM's operational environment
  const lecturerData = {
    name: "Dr. Ahmad bin Mustafa",
    title: "Senior Lecturer",
    staffId: "UM-2026-8841",
    email: "ahmad.mustafa@um.edu.my",
    phone: "+60 3-7967 4321",
    office: "Block B, Room 2.4, PASUM Main Building",
    department: "Physics Domain, Center for Foundation Studies in Science (PASUM)",
    classesTaught: [
      { code: "PAS0112", name: "Physics 101 - Mechanics", group: "Group A & B" },
      { code: "PAS0122", name: "Physics 102 - Waves & Optics", group: "Group A" },
    ]
  };

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-[#FAF9F6]">
      
      {/* Header */}
      <header className="mb-8">
        <h2 className="text-3xl font-semibold text-slate-900">My Profile</h2>
        <p className="text-slate-500 mt-1">Manage your academic profile and professional contact details</p>
      </header>

      {/* Grid wrapper - removed max-w-6xl so it flexes naturally to the screen width */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Summary Info Card */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center relative overflow-hidden">
            
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white mx-auto mb-4 font-bold text-3xl shadow-md">
              AM
            </div>
            
            <h3 className="text-xl font-bold text-slate-900">{lecturerData.name}</h3>
            <p className="text-sm font-medium text-blue-600 mt-0.5">{lecturerData.title}</p>
            <p className="text-xs text-slate-400 mt-1">ID: {lecturerData.staffId}</p>

            <div className="border-t border-slate-100 mt-6 pt-6 space-y-3 text-left text-sm">
              <div className="flex items-center gap-3 text-slate-600">
                <Mail size={16} className="text-slate-400 shrink-0" />
                <span className="truncate">{lecturerData.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Phone size={16} className="text-slate-400 shrink-0" />
                <span>{lecturerData.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <MapPin size={16} className="text-slate-400 shrink-0" />
                <span className="text-xs">{lecturerData.office}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Academic Details & Assignments (Takes 2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Department Information */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building size={18} className="text-slate-400" /> Institutional Affiliation
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              {lecturerData.department}
            </p>
          </div>

          {/* Active Course Load Assignments */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-slate-400" /> Assigned Course Load (Current Semester)
            </h4>
            
            <div className="space-y-4">
              {lecturerData.classesTaught.map((course, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-blue-200 transition-colors gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {course.code}
                    </span>
                    <h5 className="font-semibold text-slate-900 mt-1.5">{course.name}</h5>
                  </div>
                  <span className="text-xs font-medium bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md">
                    {course.group}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Environmental Compliance Metric Callout */}
          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-emerald-900 text-base flex items-center gap-2">
                <Award size={18} /> UI GreenMetric Contributor
              </h4>
              <p className="text-xs text-emerald-700 mt-1 max-w-md">
                By maintaining fully paperless attendance logs and digital AI workflows, your courses have successfully reduced baseline departmental paper consumption by an estimated 15% this semester.
              </p>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap self-end sm:self-center">
              SDG 12 Compliant
            </span>
          </div>

        </div>

      </div>
    </main>
  );
}