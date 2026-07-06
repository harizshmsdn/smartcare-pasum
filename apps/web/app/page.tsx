"use client"; // Used to allow the prototype state toggle

import { useState } from "react";
import { 
  Home, 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  Settings, 
  QrCode, 
  AlertTriangle, 
  TrendingDown, 
  ArrowRight 
} from "lucide-react";

export default function LandingPage() {
  // Temporary state to demonstrate both UI flows for the prototype
  const [hasUpcomingClass, setHasUpcomingClass] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      
      {/* 1. Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col p-6">
        <h1 className="text-2xl font-bold mb-10 tracking-tight">SMART-CARE</h1>
        <nav className="flex flex-col gap-2">
          <a href="#" className="flex items-center gap-3 bg-blue-600/20 text-blue-400 px-4 py-3 rounded-lg font-medium transition-colors">
            <Home size={20} /> Home
          </a>
          <a href="#" className="flex items-center gap-3 hover:bg-slate-800 px-4 py-3 rounded-lg text-slate-300 hover:text-white transition-colors">
            <LayoutDashboard size={20} /> Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 hover:bg-slate-800 px-4 py-3 rounded-lg text-slate-300 hover:text-white transition-colors">
            <Users size={20} /> Classes
          </a>
          <a href="#" className="flex items-center gap-3 hover:bg-slate-800 px-4 py-3 rounded-lg text-slate-300 hover:text-white transition-colors">
            <UserCircle size={20} /> Profile
          </a>
          <a href="#" className="flex items-center gap-3 hover:bg-slate-800 px-4 py-3 rounded-lg text-slate-300 hover:text-white transition-colors mt-auto">
            <Settings size={20} /> Settings
          </a>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        
        {/* Header & Prototype Toggle */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-semibold text-gray-800">Welcome back, Dr. Ahmad</h2>
            <p className="text-gray-500 mt-1">Monday, 6 July 2026</p>
          </div>
          
          {/* PROTOTYPE ONLY: Toggle to view both states */}
          <button 
            onClick={() => setHasUpcomingClass(!hasUpcomingClass)}
            className="text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-4 rounded-full font-medium transition-colors"
          >
            Toggle Schedule State
          </button>
        </header>

        {/* 2. MAIN BLOCK (Conditional) */}
        {hasUpcomingClass ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-blue-100 mb-10 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
              <div>
                <span className="text-xs font-bold tracking-wider text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-full">Upcoming Class • 10:00 AM</span>
                <h3 className="text-2xl font-bold text-gray-900 mt-3">Physics 101 - Mechanics</h3>
                <p className="text-gray-500">Group A • Lecture Hall 3</p>
              </div>
              
              {/* Primary Call to Action */}
              <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl font-semibold shadow-md shadow-blue-200 transition-all active:scale-95">
                <QrCode size={24} />
                Generate Attendance QR
              </button>
            </div>

            {/* Side-by-side Metrics Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-100 pt-6">
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <div className="flex items-center gap-2 text-red-700 mb-2 font-semibold">
                  <AlertTriangle size={18} /> Critical Students
                </div>
                <div className="text-3xl font-bold text-red-700 mb-1">2</div>
                <p className="text-sm text-red-600/80">Requires immediate intervention</p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                <div className="flex items-center gap-2 text-orange-700 mb-2 font-semibold">
                  <TrendingDown size={18} /> At-Risk Students
                </div>
                <div className="text-3xl font-bold text-orange-700 mb-1">5</div>
                <p className="text-sm text-orange-600/80">Declining performance/attendance</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                <div className="flex items-center gap-2 text-green-700 mb-2 font-semibold">
                  Overall Attendance
                </div>
                <div className="text-3xl font-bold text-green-700 mb-1">88%</div>
                <p className="text-sm text-green-600/80">Semester average to date</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 mb-10 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <LayoutDashboard size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Upcoming Classes Today</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">You have completed all scheduled lectures for today. Check your overall metrics to review student progression.</p>
            
            <button className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-medium transition-all active:scale-95">
              View Overall Dashboard <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* 3. Mini Blocks (Other Classes) */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Enrolled Classes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Class Card 1 */}
            <a href="#" className="block bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 hover:ring-1 hover:ring-blue-200 transition-all cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Computer Science 101</h4>
                <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded">Group B</span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Students</span>
                  <span className="font-medium text-gray-800">42</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Avg. Attendance</span>
                  <span className="font-medium text-green-600">94%</span>
                </div>
              </div>
              <div className="text-sm text-blue-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                View Class Details <ArrowRight size={14} />
              </div>
            </a>

            {/* Class Card 2 */}
            <a href="#" className="block bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 hover:ring-1 hover:ring-blue-200 transition-all cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Mathematics 201</h4>
                <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded">Group A</span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Students</span>
                  <span className="font-medium text-gray-800">38</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Avg. Attendance</span>
                  <span className="font-medium text-orange-600">82%</span>
                </div>
              </div>
              <div className="text-sm text-blue-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                View Class Details <ArrowRight size={14} />
              </div>
            </a>

          </div>
        </div>

      </main>
    </div>
  );
}