// apps/web/app/attendance/active/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  QrCode, 
  X, 
  Users, 
  MapPin, 
  ScanFace, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowLeft,
  UserPlus
} from "lucide-react";

// Mock Live Data: Demonstrating the 3-Factor Auth status
const liveAttendees = [
  { id: "1720450", name: "Siti Aisyah binti Rahman", time: "10:01 AM", faceVerified: true, locationVerified: true, manual: false },
  { id: "1720442", name: "Nurul Izzah binti Osman", time: "10:02 AM", faceVerified: true, locationVerified: true, manual: false },
  { id: "1720455", name: "Priya a/p Subramaniam", time: "10:04 AM", faceVerified: true, locationVerified: false, manual: true }, // GPS malfunction case
  { id: "1720462", name: "Chong Wei Jie", time: "10:05 AM", faceVerified: true, locationVerified: true, manual: false },
];

export default function ActiveAttendancePage() {
  // Opens automatically when the page loads
  const [showQrModal, setShowQrModal] = useState(true);

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-slate-50 relative">
      
      {/* --- QR CODE OVERLAY MODAL --- */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-blue-600 p-6 text-center text-white relative">
              <button 
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="text-2xl font-bold">Physics 101 - Group A</h2>
              <p className="text-blue-100 mt-1">Scan to register attendance via SMART-CARE</p>
            </div>
            
            <div className="p-10 flex flex-col items-center">
              {/* Placeholder for actual generated QR */}
              <div className="w-64 h-64 bg-white border-8 border-slate-900 rounded-xl flex items-center justify-center relative overflow-hidden mb-6 shadow-sm">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-900 to-transparent background-size-[10px_10px]"></div>
                <QrCode size={180} className="text-slate-900 z-10" strokeWidth={1} />
                <div className="absolute center bg-blue-600 rounded-lg p-2 z-20">
                  <span className="text-white font-bold text-xs">PASUM</span>
                </div>
              </div>
              
              <div className="text-center w-full">
                <p className="text-slate-500 font-mono text-sm tracking-widest bg-slate-100 py-3 rounded-xl mb-6">
                  SESSION-PIN: <span className="font-bold text-slate-800 text-lg">8492-X</span>
                </p>
                <button 
                  onClick={() => setShowQrModal(false)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-4 rounded-xl transition-colors"
                >
                  Close QR & View Live Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* --- END QR MODAL --- */}

      {/* --- LIVE DASHBOARD VIEW --- */}
      <div className="mb-6 flex justify-between items-center">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Live Sync Active
        </div>
      </div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Physics 101 - Group A</h2>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <Clock size={16} /> Session started at 10:00 AM
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowQrModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition-colors"
          >
            <QrCode size={20} className="text-blue-600" /> Show QR
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-50 text-red-700 border border-red-200 px-5 py-3 rounded-xl font-medium hover:bg-red-100 transition-colors">
            End Session
          </button>
        </div>
      </header>

      {/* Live Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Present Students</p>
            <p className="text-3xl font-bold text-slate-900">
              <span className="text-emerald-600">24</span> <span className="text-lg text-slate-400">/ 42</span>
            </p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-full text-emerald-600">
            <Users size={28} />
          </div>
        </div>
        
        {/* Manual Check-in Override (FR-01 GPS Malfunction) */}
        <div className="md:col-span-2 bg-slate-900 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-white">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <AlertCircle size={20} className="text-blue-400" /> Location/GPS Malfunction?
            </h3>
            <p className="text-slate-400 text-sm mt-1 max-w-md">
              Bypass 3-factor location protocols and manually check-in a student if their device is unable to retrieve GPS coordinates.
            </p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 whitespace-nowrap">
            <UserPlus size={18} /> Manual Override
          </button>
        </div>
      </div>

      {/* Live Feed Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-900">Live Check-in Feed</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Time Logged</th>
                <th className="p-4 font-medium text-center">Face ID</th>
                <th className="p-4 font-medium text-center">GPS Auth</th>
                <th className="p-4 font-medium text-right">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {liveAttendees.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors bg-white">
                  <td className="p-4">
                    <div>
                      <p className="font-semibold text-slate-900">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.id}</p>
                    </div>
                  </td>
                  <td className="p-4 font-medium text-slate-700">{student.time}</td>
                  <td className="p-4 text-center">
                    {student.faceVerified ? (
                      <CheckCircle2 size={20} className="text-emerald-500 mx-auto" />
                    ) : (
                      <AlertCircle size={20} className="text-slate-300 mx-auto" />
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {student.locationVerified ? (
                      <CheckCircle2 size={20} className="text-emerald-500 mx-auto" />
                    ) : (
                      <AlertCircle size={20} className="text-red-500 mx-auto" />
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {student.manual ? (
                      <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-md text-xs font-semibold">
                        Lecturer Override
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md text-xs font-semibold">
                        System Authed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}